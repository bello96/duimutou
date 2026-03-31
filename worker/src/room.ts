interface Env {}

type GamePhase = "waiting" | "readying" | "playing" | "ended";
type SpeedLevel = "slow" | "normal" | "fast";

interface PlayerEntry {
  id: string;
  name: string;
  online: boolean;
  ready: boolean;
  ws: WebSocket | null;
  score: number;
  layer: number;
  combo: number;
  blockWidth: number;
  blockLeft: number;
  alive: boolean;
}

interface ChatMsg {
  id: string;
  playerId: string | null;
  playerName: string;
  text: string;
  ts: number;
}

const GRACE_PERIOD = 30_000;
const INACTIVE_TIMEOUT = 5 * 60_000;
const MAX_LAYERS = 50;

export class StackRoom implements DurableObject {
  private state: DurableObjectState;
  private roomCode = "";
  private phase: GamePhase = "waiting";
  private ownerId: string | null = null;
  private players = new Map<string, PlayerEntry>();
  private chat: ChatMsg[] = [];
  private speed: SpeedLevel = "slow";
  private gameStartsAt = 0;
  private winnerId: string | null = null;
  private closed = false;
  private graceTimers = new Map<string, number>();
  private lastActivity = Date.now();

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/setup" && request.method === "POST") {
      const body = (await request.json()) as { roomCode: string };
      this.roomCode = body.roomCode;
      return new Response("ok");
    }

    if (url.pathname === "/info") {
      const ps = Array.from(this.players.values());
      return Response.json({
        roomCode: this.roomCode,
        playerCount: ps.length,
        closed: this.closed,
        ownerName: ps.find((p) => p.id === this.ownerId)?.name || null,
      });
    }

    if (url.pathname === "/quickleave" && request.method === "POST") {
      try {
        const body = (await request.json()) as { playerId: string };
        if (body.playerId) {
          this.startGracePeriod(body.playerId, 5000);
        }
      } catch { /* ignore */ }
      return new Response("ok");
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.state.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    this.lastActivity = Date.now();
    try {
      const msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
      await this.handleMessage(ws, msg);
    } catch { /* ignore */ }
  }

  async webSocketClose(ws: WebSocket) {
    const player = this.findPlayerByWs(ws);
    if (player) {
      this.startGracePeriod(player.id, GRACE_PERIOD);
    }
  }

  async webSocketError(ws: WebSocket) {
    const player = this.findPlayerByWs(ws);
    if (player) {
      this.startGracePeriod(player.id, GRACE_PERIOD);
    }
  }

  async alarm() {
    const now = Date.now();

    for (const [pid, deadline] of this.graceTimers) {
      if (now >= deadline) {
        this.graceTimers.delete(pid);
        this.handlePlayerRemoved(pid);
      }
    }

    if (now - this.lastActivity > INACTIVE_TIMEOUT && this.players.size === 0) {
      this.closed = true;
      return;
    }

    this.scheduleNextAlarm();
  }

  private scheduleNextAlarm() {
    let next = Infinity;
    for (const deadline of this.graceTimers.values()) {
      next = Math.min(next, deadline);
    }
    if (this.players.size > 0) {
      next = Math.min(next, this.lastActivity + INACTIVE_TIMEOUT);
    }
    if (next < Infinity) {
      this.state.storage.setAlarm(next);
    }
  }

  private findPlayerByWs(ws: WebSocket): PlayerEntry | undefined {
    for (const p of this.players.values()) {
      if (p.ws === ws) {
        return p;
      }
    }
    return undefined;
  }

  private async handleMessage(ws: WebSocket, msg: Record<string, unknown>) {
    switch (msg.type) {
      case "join":
        this.handleJoin(ws, msg as { type: "join"; playerName: string; playerId?: string });
        break;
      case "ready":
        this.handleReady(ws);
        break;
      case "startGame":
        this.handleStartGame(ws);
        break;
      case "setSpeed":
        this.handleSetSpeed(ws, msg as { type: "setSpeed"; speed: SpeedLevel });
        break;
      case "drop":
        this.handleDrop(ws, msg as {
          type: "drop"; layer: number; score: number; combo: number;
          blockWidth: number; blockLeft: number; perfect: boolean;
        });
        break;
      case "gameOver":
        this.handleGameOver(ws, msg as {
          type: "gameOver"; score: number; layer: number; combo: number;
        });
        break;
      case "surrender":
        this.handleSurrender(ws);
        break;
      case "chat":
        this.handleChat(ws, msg as { type: "chat"; text: string });
        break;
      case "playAgain":
        this.handlePlayAgain(ws);
        break;
      case "transferOwner":
        this.handleTransferOwner(ws);
        break;
      case "leave":
        this.handleLeave(ws);
        break;
      case "ping":
        break;
    }
  }

  private handleJoin(ws: WebSocket, msg: { playerName: string; playerId?: string }) {
    if (this.closed) {
      this.sendTo(ws, { type: "error", message: "房间已关闭" });
      return;
    }

    if (msg.playerId && this.players.has(msg.playerId)) {
      const p = this.players.get(msg.playerId)!;
      p.ws = ws;
      p.online = true;
      p.name = msg.playerName;
      this.graceTimers.delete(msg.playerId);

      this.sendTo(ws, this.buildRoomState(msg.playerId));
      this.broadcast({ type: "playerJoined", player: this.toPlayerInfo(p) }, msg.playerId);
      this.addSystemChat(`${p.name} 重新连接`);
      this.scheduleNextAlarm();
      return;
    }

    if (this.players.size >= 2) {
      this.sendTo(ws, { type: "error", message: "房间已满" });
      return;
    }

    const id = msg.playerId || crypto.randomUUID();
    const entry: PlayerEntry = {
      id, name: msg.playerName, online: true, ready: false, ws,
      score: 0, layer: 0, combo: 0, blockWidth: 0, blockLeft: 0, alive: true,
    };
    this.players.set(id, entry);

    if (!this.ownerId) {
      this.ownerId = id;
    }

    this.sendTo(ws, this.buildRoomState(id));
    this.broadcast({ type: "playerJoined", player: this.toPlayerInfo(entry) }, id);
    this.addSystemChat(`${entry.name} 加入了房间`);

    if (this.players.size === 2 && this.phase === "waiting") {
      this.phase = "readying";
      this.broadcast({ type: "phaseChange", phase: "readying" });
    }

    this.scheduleNextAlarm();
  }

  private handleReady(ws: WebSocket) {
    const player = this.findPlayerByWs(ws);
    if (!player || player.id === this.ownerId || this.phase !== "readying") {
      return;
    }
    player.ready = !player.ready;
    this.broadcast({ type: "readyChanged", playerId: player.id, ready: player.ready });
  }

  private handleSetSpeed(ws: WebSocket, msg: { speed: SpeedLevel }) {
    const player = this.findPlayerByWs(ws);
    if (!player || player.id !== this.ownerId || this.phase !== "readying") {
      return;
    }
    if (msg.speed !== "slow" && msg.speed !== "normal" && msg.speed !== "fast") {
      return;
    }
    this.speed = msg.speed;
    this.broadcast({ type: "speedChanged", speed: this.speed });
  }

  private handleStartGame(ws: WebSocket) {
    const player = this.findPlayerByWs(ws);
    if (!player || player.id !== this.ownerId || this.phase !== "readying") {
      return;
    }
    for (const p of this.players.values()) {
      if (p.id !== this.ownerId && !p.ready) {
        this.sendTo(ws, { type: "error", message: "对手尚未准备" });
        return;
      }
    }

    this.phase = "playing";
    this.gameStartsAt = Date.now() + 4000;
    this.winnerId = null;

    for (const p of this.players.values()) {
      p.score = 0;
      p.layer = 0;
      p.combo = 0;
      p.blockWidth = 0;
      p.blockLeft = 0;
      p.alive = true;
    }

    this.broadcast({
      type: "gameStart",
      gameStartsAt: this.gameStartsAt,
      speed: this.speed,
    });
    this.broadcast({ type: "phaseChange", phase: "playing" });
  }

  private handleDrop(ws: WebSocket, msg: {
    layer: number; score: number; combo: number;
    blockWidth: number; blockLeft: number; perfect: boolean;
  }) {
    const player = this.findPlayerByWs(ws);
    if (!player || this.phase !== "playing") {
      return;
    }

    player.score = msg.score;
    player.layer = msg.layer;
    player.combo = msg.combo;
    player.blockWidth = msg.blockWidth;
    player.blockLeft = msg.blockLeft;

    this.broadcast({
      type: "playerDropped",
      playerId: player.id,
      layer: msg.layer,
      score: msg.score,
      combo: msg.combo,
      blockWidth: msg.blockWidth,
      blockLeft: msg.blockLeft,
      perfect: msg.perfect,
    }, player.id);

    this.checkMaxLayers();
  }

  private handleGameOver(ws: WebSocket, msg: { score: number; layer: number; combo: number }) {
    const player = this.findPlayerByWs(ws);
    if (!player || this.phase !== "playing") {
      return;
    }

    player.alive = false;
    player.score = msg.score;
    player.layer = msg.layer;
    player.combo = msg.combo;

    this.broadcast({
      type: "playerGameOver",
      playerId: player.id,
      finalScore: msg.score,
      finalLayer: msg.layer,
    });

    const alivePlayers = Array.from(this.players.values()).filter((p) => p.alive);
    if (alivePlayers.length <= 1) {
      const winner = alivePlayers[0];
      this.endGame(
        winner?.id || null,
        winner?.name || "",
        alivePlayers.length === 0 ? "score" : "opponent_failed",
      );
    }
  }

  private handleSurrender(ws: WebSocket) {
    const player = this.findPlayerByWs(ws);
    if (!player || this.phase !== "playing") {
      return;
    }

    const opponent = Array.from(this.players.values()).find((p) => p.id !== player.id);
    this.endGame(opponent?.id || null, opponent?.name || "", "surrender");
  }

  private handleChat(ws: WebSocket, msg: { text: string }) {
    const player = this.findPlayerByWs(ws);
    if (!player || !msg.text?.trim()) {
      return;
    }
    const chatMsg: ChatMsg = {
      id: crypto.randomUUID(),
      playerId: player.id,
      playerName: player.name,
      text: msg.text.trim().slice(0, 200),
      ts: Date.now(),
    };
    this.chat.push(chatMsg);
    if (this.chat.length > 200) {
      this.chat = this.chat.slice(-200);
    }
    this.broadcast({ type: "chat", ...chatMsg });
  }

  private handlePlayAgain(ws: WebSocket) {
    const player = this.findPlayerByWs(ws);
    if (!player || player.id !== this.ownerId || this.phase !== "ended") {
      return;
    }
    this.phase = "readying";
    this.winnerId = null;
    for (const p of this.players.values()) {
      p.ready = p.id === this.ownerId;
      p.score = 0;
      p.layer = 0;
      p.combo = 0;
      p.alive = true;
    }
    this.broadcast({ type: "phaseChange", phase: "readying" });
    for (const p of this.players.values()) {
      this.broadcast({ type: "readyChanged", playerId: p.id, ready: p.ready });
    }
    this.addSystemChat("房主发起了新一局");
  }

  private handleTransferOwner(ws: WebSocket) {
    const player = this.findPlayerByWs(ws);
    if (!player || player.id !== this.ownerId) {
      return;
    }
    const other = Array.from(this.players.values()).find((p) => p.id !== player.id);
    if (!other) {
      return;
    }
    this.ownerId = other.id;
    for (const p of this.players.values()) {
      p.ready = p.id === this.ownerId;
    }
    for (const p of this.players.values()) {
      if (p.ws) {
        this.sendTo(p.ws, this.buildRoomState(p.id));
      }
    }
    this.addSystemChat(`${other.name} 成为了新房主`);
  }

  private handleLeave(ws: WebSocket) {
    const player = this.findPlayerByWs(ws);
    if (!player) {
      return;
    }
    ws.close();
    this.handlePlayerRemoved(player.id);
  }

  private handlePlayerRemoved(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) {
      return;
    }

    this.players.delete(playerId);
    this.broadcast({ type: "playerLeft", playerId });
    this.addSystemChat(`${player.name} 离开了房间`);

    if (this.phase === "playing") {
      const remaining = Array.from(this.players.values());
      if (remaining.length === 1) {
        this.endGame(remaining[0]!.id, remaining[0]!.name, "disconnect");
      } else {
        this.phase = "ended";
        this.broadcast({ type: "phaseChange", phase: "ended" });
      }
    }

    if (playerId === this.ownerId) {
      const next = Array.from(this.players.values())[0];
      this.ownerId = next?.id || null;
    }

    if (this.players.size < 2 && (this.phase === "readying" || this.phase === "ended")) {
      this.phase = "waiting";
      this.broadcast({ type: "phaseChange", phase: "waiting" });
    }

    if (this.players.size === 0) {
      this.closed = true;
    }
  }

  private checkMaxLayers() {
    const allAboveMax = Array.from(this.players.values()).every(
      (p) => p.alive && p.layer >= MAX_LAYERS,
    );
    if (allAboveMax) {
      const sorted = Array.from(this.players.values()).sort((a, b) => b.score - a.score);
      this.endGame(sorted[0]!.id, sorted[0]!.name, "score");
    }
  }

  private endGame(wId: string | null, wName: string, reason: string) {
    this.phase = "ended";
    this.winnerId = wId;
    const scores: Record<string, { score: number; layer: number }> = {};
    for (const p of this.players.values()) {
      scores[p.id] = { score: p.score, layer: p.layer };
    }
    this.broadcast({
      type: "gameEnd",
      winnerId: wId,
      winnerName: wName,
      reason,
      scores,
    });
    this.broadcast({ type: "phaseChange", phase: "ended" });
  }

  private startGracePeriod(playerId: string, duration: number) {
    const player = this.players.get(playerId);
    if (!player) {
      return;
    }
    player.online = false;
    player.ws = null;
    this.broadcast({
      type: "playerJoined",
      player: this.toPlayerInfo(player),
    });
    this.graceTimers.set(playerId, Date.now() + duration);
    this.scheduleNextAlarm();
  }

  private buildRoomState(yourId: string) {
    const stacks: Record<string, {
      score: number; layer: number; combo: number; blockWidth: number; blockLeft: number; alive: boolean;
    }> = {};
    if (this.phase === "playing" || this.phase === "ended") {
      for (const p of this.players.values()) {
        stacks[p.id] = {
          score: p.score, layer: p.layer, combo: p.combo,
          blockWidth: p.blockWidth, blockLeft: p.blockLeft, alive: p.alive,
        };
      }
    }
    return {
      type: "roomState" as const,
      yourId,
      roomCode: this.roomCode,
      phase: this.phase,
      players: Array.from(this.players.values()).map((p) => this.toPlayerInfo(p)),
      ownerId: this.ownerId,
      chat: this.chat.slice(-50),
      stacks: Object.keys(stacks).length > 0 ? stacks : undefined,
      gameStartsAt: this.phase === "playing" ? this.gameStartsAt : undefined,
      speed: this.speed,
    };
  }

  private toPlayerInfo(p: PlayerEntry) {
    return { id: p.id, name: p.name, online: p.online, ready: p.ready };
  }

  private broadcast(msg: Record<string, unknown>, excludeId?: string) {
    const data = JSON.stringify(msg);
    for (const p of this.players.values()) {
      if (p.id !== excludeId && p.ws) {
        try {
          p.ws.send(data);
        } catch { /* ignore */ }
      }
    }
  }

  private sendTo(ws: WebSocket, msg: Record<string, unknown>) {
    try {
      ws.send(JSON.stringify(msg));
    } catch { /* ignore */ }
  }

  private addSystemChat(text: string) {
    const msg: ChatMsg = {
      id: crypto.randomUUID(),
      playerId: null,
      playerName: "系统",
      text,
      ts: Date.now(),
    };
    this.chat.push(msg);
    if (this.chat.length > 200) {
      this.chat = this.chat.slice(-200);
    }
    this.broadcast({ type: "chat", ...msg });
  }
}
