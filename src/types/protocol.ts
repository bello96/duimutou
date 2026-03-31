export type GamePhase = "waiting" | "readying" | "playing" | "ended";

export interface PlayerInfo {
  id: string;
  name: string;
  online: boolean;
  ready: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string | null;
  playerName: string;
  text: string;
  ts: number;
}

export interface PlayerStackState {
  score: number;
  layer: number;
  combo: number;
  blockWidth: number;
  blockLeft: number;
  alive: boolean;
}

export interface S_RoomState {
  type: "roomState";
  yourId: string;
  roomCode: string;
  phase: GamePhase;
  players: PlayerInfo[];
  ownerId: string | null;
  chat: ChatMessage[];
  stacks?: Record<string, PlayerStackState>;
  gameStartsAt?: number;
}

export interface S_PlayerJoined {
  type: "playerJoined";
  player: PlayerInfo;
}

export interface S_PlayerLeft {
  type: "playerLeft";
  playerId: string;
}

export interface S_PhaseChange {
  type: "phaseChange";
  phase: GamePhase;
}

export interface S_ReadyChanged {
  type: "readyChanged";
  playerId: string;
  ready: boolean;
}

export interface S_GameStart {
  type: "gameStart";
  gameStartsAt: number;
}

export interface S_PlayerDropped {
  type: "playerDropped";
  playerId: string;
  layer: number;
  score: number;
  combo: number;
  blockWidth: number;
  blockLeft: number;
  perfect: boolean;
}

export interface S_PlayerGameOver {
  type: "playerGameOver";
  playerId: string;
  finalScore: number;
  finalLayer: number;
}

export interface S_GameEnd {
  type: "gameEnd";
  winnerId: string | null;
  winnerName: string;
  reason: "opponent_failed" | "score" | "disconnect" | "surrender";
  scores: Record<string, { score: number; layer: number }>;
}

export interface S_Chat {
  type: "chat";
  id: string;
  playerId: string | null;
  playerName: string;
  text: string;
  ts: number;
}

export interface S_RoomClosed {
  type: "roomClosed";
}

export interface S_Error {
  type: "error";
  message: string;
}

export type ServerMessage =
  | S_RoomState
  | S_PlayerJoined
  | S_PlayerLeft
  | S_PhaseChange
  | S_ReadyChanged
  | S_GameStart
  | S_PlayerDropped
  | S_PlayerGameOver
  | S_GameEnd
  | S_Chat
  | S_RoomClosed
  | S_Error;

export interface C_Join {
  type: "join";
  playerName: string;
  playerId?: string;
}

export interface C_Ready {
  type: "ready";
}

export interface C_StartGame {
  type: "startGame";
}

export interface C_Drop {
  type: "drop";
  layer: number;
  score: number;
  combo: number;
  blockWidth: number;
  blockLeft: number;
  perfect: boolean;
}

export interface C_GameOver {
  type: "gameOver";
  score: number;
  layer: number;
  combo: number;
}

export interface C_Surrender {
  type: "surrender";
}

export interface C_Chat {
  type: "chat";
  text: string;
}

export interface C_PlayAgain {
  type: "playAgain";
}

export interface C_TransferOwner {
  type: "transferOwner";
}

export interface C_Leave {
  type: "leave";
}

export interface C_Ping {
  type: "ping";
}

export type ClientMessage =
  | C_Join
  | C_Ready
  | C_StartGame
  | C_Drop
  | C_GameOver
  | C_Surrender
  | C_Chat
  | C_PlayAgain
  | C_TransferOwner
  | C_Leave
  | C_Ping;
