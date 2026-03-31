import { useCallback, useEffect, useRef, useState } from "react";
import { getHttpBase, getWsBase } from "../api";
import StackCanvas from "../components/StackCanvas";
import type { StackBlock, StackCanvasHandle } from "../components/StackCanvas";
import PlayerBar from "../components/PlayerBar";

import CountdownOverlay from "../components/CountdownOverlay";
import GameResultModal from "../components/GameResultModal";
import Confetti from "../components/Confetti";
import { useWebSocket } from "../hooks/useWebSocket";
import { useStackGame } from "../hooks/useStackGame";
import type { GameStats } from "../hooks/useStackGame";
import { useSound } from "../hooks/useSound";
import type {
  GamePhase,
  PlayerInfo,
  ServerMessage,
} from "../types/protocol";

interface Props {
  roomCode: string;
  nickname: string;
  playerId: string;
  onLeave: () => void;
}

const CANVAS_W = 280;
const CANVAS_H = 400;

export default function Room({ roomCode, nickname, playerId, onLeave }: Props) {
  const [myId, setMyId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [gameStartsAt, setGameStartsAt] = useState(0);
  const [countdownDone, setCountdownDone] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [winReason, setWinReason] = useState("");
  const [scores, setScores] = useState<Record<string, { score: number; layer: number }>>({});

  const [opponentBlocks, setOpponentBlocks] = useState<StackBlock[]>([]);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentCombo, setOpponentCombo] = useState(0);
  const [opponentLayer, setOpponentLayer] = useState(0);
  const opponentCanvasRef = useRef<StackCanvasHandle>(null);

  const myCanvasRef = useRef<StackCanvasHandle>(null);
  const { play, ensure } = useSound();

  const wsUrl = `${getWsBase()}/api/rooms/${roomCode}/ws`;
  const { connected, send, addListener, leave: wsLeave } = useWebSocket(wsUrl);

  const joinedRef = useRef(false);
  useEffect(() => {
    if (connected && !joinedRef.current) {
      joinedRef.current = true;
      send({ type: "join", playerName: nickname, playerId });
    }
  }, [connected, send, nickname, playerId]);

  const handleDrop = useCallback(
    (stats: GameStats) => {
      if (stats.perfect) {
        play("perfect");
      } else {
        play("drop");
      }
      if (stats.layer % 10 === 0 && stats.layer > 0) {
        play("levelUp");
      }
      send({
        type: "drop",
        layer: stats.layer,
        score: stats.score,
        combo: stats.combo,
        blockWidth: stats.blockWidth,
        blockLeft: stats.blockLeft,
        perfect: stats.perfect,
      });
    },
    [play, send],
  );

  const handleGameOver = useCallback(
    (stats: GameStats) => {
      play("gameOver");
      send({
        type: "gameOver",
        score: stats.score,
        layer: stats.layer,
        combo: stats.combo,
      });
    },
    [play, send],
  );

  const game = useStackGame({
    canvasWidth: CANVAS_W,
    canvasRef: myCanvasRef,
    onDrop: handleDrop,
    onGameOver: handleGameOver,
    paused: phase === "playing" && !countdownDone,
  });

  useEffect(() => {
    return addListener((msg: ServerMessage) => {
      switch (msg.type) {
        case "roomState":
          setMyId(msg.yourId);
          setPlayers(msg.players);
          setOwnerId(msg.ownerId);
          setPhase(msg.phase);
          if (msg.gameStartsAt) {
            setGameStartsAt(msg.gameStartsAt);
          }
          break;

        case "playerJoined":
          setPlayers((prev) => {
            const idx = prev.findIndex((p) => p.id === msg.player.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = msg.player;
              return next;
            }
            return [...prev, msg.player];
          });
          break;

        case "playerLeft":
          setPlayers((prev) => prev.filter((p) => p.id !== msg.playerId));
          break;

        case "phaseChange":
          setPhase(msg.phase);
          if (msg.phase === "readying") {
            setShowResult(false);
            setShowConfetti(false);
            setCountdownDone(false);
            setOpponentBlocks([]);
          }
          break;

        case "readyChanged":
          setPlayers((prev) =>
            prev.map((p) => (p.id === msg.playerId ? { ...p, ready: msg.ready } : p)),
          );
          break;

        case "gameStart": {
          setGameStartsAt(msg.gameStartsAt);
          setCountdownDone(false);
          setShowResult(false);
          setShowConfetti(false);
          // 初始化对手的底座木块（与自己相同的初始宽度和位置）
          const initialWidth = Math.floor(CANVAS_W * 0.7);
          const initialLeft = Math.floor((CANVAS_W - initialWidth) / 2);
          setOpponentBlocks([{ left: initialLeft, width: initialWidth, layer: 0 }]);
          setOpponentScore(0);
          setOpponentCombo(0);
          setOpponentLayer(0);
          ensure();
          break;
        }

        case "playerDropped":
          if (msg.playerId !== myId) {
            setOpponentBlocks((prev) => [
              ...prev,
              { left: msg.blockLeft, width: msg.blockWidth, layer: msg.layer },
            ]);
            setOpponentScore(msg.score);
            setOpponentCombo(msg.combo);
            setOpponentLayer(msg.layer);
            if (msg.perfect) {
              opponentCanvasRef.current?.addFlash(msg.layer);
            }
          }
          break;

        case "playerGameOver":
          if (msg.playerId !== myId) {
            opponentCanvasRef.current?.collapseAll();
          }
          break;

        case "gameEnd":
          setWinnerId(msg.winnerId);
          setWinReason(msg.reason);
          setScores(msg.scores);
          if (msg.winnerId === myId) {
            play("win");
            setShowConfetti(true);
          } else {
            play("lose");
          }
          setTimeout(() => setShowResult(true), 600);
          break;

        case "roomClosed":
          onLeave();
          break;

        case "error":
          break;
      }
    });
  }, [addListener, myId, play, ensure, onLeave]);

  const handleCountdownDone = useCallback(() => {
    setCountdownDone(true);
    game.start();
  }, [game]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (phase === "playing" && countdownDone) {
          game.drop();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [game, phase, countdownDone]);

  useEffect(() => {
    function onBeforeUnload() {
      const url = `${getHttpBase()}/api/rooms/${roomCode}/quickleave`;
      navigator.sendBeacon(url, JSON.stringify({ playerId }));
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [roomCode, playerId]);

  function handleLeave() {
    wsLeave();
    onLeave();
  }

  const isOwner = myId === ownerId;
  const opponent = players.find((p) => p.id !== myId);
  const opponentReady = opponent?.ready ?? false;

  const myScoreData = myId ? scores[myId] : undefined;
  const opponentId = opponent?.id;
  const opponentScoreData = opponentId ? scores[opponentId] : undefined;

  return (
    <div className="min-h-screen bg-[#f5f0eb] flex flex-col">
      <PlayerBar
        roomCode={roomCode}
        players={players}
        ownerId={ownerId}
        myId={myId}
        phase={phase}
        onPlayAgain={() => send({ type: "playAgain" })}
        onTransferOwner={() => send({ type: "transferOwner" })}
        onLeave={handleLeave}
      />

      <div className="flex-1 flex flex-col items-center">
        {(phase === "waiting" || phase === "readying") && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              {phase === "waiting" && (
                <>
                  <div className="text-2xl text-amber-700 font-bold mb-4 animate-pulse">
                    等待对手加入...
                  </div>
                  <div className="text-gray-500 text-sm">
                    分享房间号 <span className="text-amber-700 font-mono">{roomCode}</span> 给好友
                  </div>
                </>
              )}
              {phase === "readying" && (
                <div className="space-y-4">
                  {isOwner ? (
                    <button
                      onClick={() => send({ type: "startGame" })}
                      disabled={!opponentReady}
                      className="px-8 py-3 bg-amber-700 text-white font-bold rounded-lg hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                      开始游戏
                    </button>
                  ) : (
                    <button
                      onClick={() => send({ type: "ready" })}
                      className={`px-8 py-3 font-bold rounded-lg transition text-lg ${
                        players.find((p) => p.id === myId)?.ready
                          ? "bg-green-700 text-white hover:bg-green-600"
                          : "bg-gray-600 text-white hover:bg-gray-500"
                      }`}
                    >
                      {players.find((p) => p.id === myId)?.ready ? "已准备 ✓" : "准备"}
                    </button>
                  )}
                  {isOwner && !opponentReady && (
                    <div className="text-sm text-gray-500">等待对手准备...</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {(phase === "playing" || phase === "ended") && (
          <>
            <div className="w-full max-w-[600px] flex justify-between px-4 py-2 text-sm text-gray-800">
              <div className="flex gap-3">
                <span className="text-amber-700 font-bold">我</span>
                <span>得分: {game.score}</span>
                <span>连击: {game.combo}</span>
                <span>等级: {game.level}</span>
              </div>
              {opponent && (
                <div className="flex gap-3">
                  <span className="text-red-600 font-bold">{opponent.name}</span>
                  <span>得分: {opponentScore}</span>
                  <span>连击: {opponentCombo}</span>
                  <span>等级: {Math.floor(opponentLayer / 10) + 1}</span>
                </div>
              )}
            </div>

            <div className="flex gap-4 items-start">
              <div className="relative">
                <StackCanvas
                  ref={myCanvasRef}
                  blocks={game.blocks}
                  movingBlock={game.movingBlock}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  onClick={() => {
                    if (phase === "playing" && countdownDone) {
                      game.drop();
                    }
                  }}
                />
                <div className="text-center text-xs text-amber-700 mt-1">我</div>
              </div>

              <div className="relative">
                <StackCanvas
                  ref={opponentCanvasRef}
                  blocks={opponentBlocks}
                  movingBlock={null}
                  spectator
                  width={CANVAS_W}
                  height={CANVAS_H}
                />
                <div className="text-center text-xs text-red-600 mt-1">
                  {opponent?.name || "对手"}
                </div>
              </div>
            </div>

            {phase === "playing" && countdownDone && (
              <button
                onClick={() => {
                  if (confirm("确定要投降吗？")) {
                    send({ type: "surrender" });
                  }
                }}
                className="mt-3 px-4 py-1.5 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
              >
                投降
              </button>
            )}
          </>
        )}
      </div>

      {phase === "playing" && gameStartsAt > 0 && !countdownDone && (
        <CountdownOverlay
          startsAt={gameStartsAt}
          onDone={handleCountdownDone}
          playTick={() => play("tick")}
          playGo={() => play("go")}
        />
      )}

      {showResult && (
        <GameResultModal
          isWinner={winnerId === myId}
          reason={winReason}
          myScore={myScoreData ? myScoreData.score : game.score}
          myLayer={myScoreData ? myScoreData.layer : game.layer}
          opponentScore={opponentScoreData?.score}
          opponentLayer={opponentScoreData?.layer}
          isOwner={isOwner}
          onPlayAgain={() => send({ type: "playAgain" })}
          onLeave={handleLeave}
        />
      )}

      {showConfetti && <Confetti />}
    </div>
  );
}
