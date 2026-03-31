import { useCallback, useEffect, useRef, useState } from "react";
import StackCanvas from "../components/StackCanvas";
import type { StackCanvasHandle } from "../components/StackCanvas";
import GameResultModal from "../components/GameResultModal";
import { useStackGame } from "../hooks/useStackGame";
import { useSound } from "../hooks/useSound";
import type { SpeedLevel } from "../utils/stack";
import { getLevel, SPEED_LABELS } from "../utils/stack";

interface Props {
  onLeave: () => void;
}

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 450;

export default function SinglePlayer({ onLeave }: Props) {
  const canvasRef = useRef<StackCanvasHandle>(null);
  const { play, ensure } = useSound();
  const [showResult, setShowResult] = useState(false);
  const [speed, setSpeed] = useState<SpeedLevel>("normal");
  const [bestScore, setBestScore] = useState(() => {
    const stored = localStorage.getItem("stack_best");
    return stored ? parseInt(stored, 10) : 0;
  });

  const handleDrop = useCallback(
    (stats: { perfect: boolean; level: number; layer: number }) => {
      if (stats.perfect) {
        play("perfect");
      } else {
        play("drop");
      }
      if (stats.layer % 10 === 0 && stats.layer > 0) {
        play("levelUp");
      }
    },
    [play],
  );

  const handleGameOver = useCallback(
    (stats: { score: number }) => {
      play("gameOver");
      if (stats.score > bestScore) {
        setBestScore(stats.score);
        localStorage.setItem("stack_best", String(stats.score));
      }
      setTimeout(() => setShowResult(true), 800);
    },
    [play, bestScore],
  );

  const game = useStackGame({
    canvasWidth: CANVAS_WIDTH,
    canvasRef,
    onDrop: handleDrop,
    onGameOver: handleGameOver,
    speed,
  });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (!game.started) {
          ensure();
          game.start();
        } else {
          game.drop();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [game, ensure]);

  function handleCanvasClick() {
    if (!game.started) {
      ensure();
      game.start();
    } else {
      game.drop();
    }
  }

  function handleRestart() {
    setShowResult(false);
    game.start();
  }

  return (
    <div className="min-h-screen bg-[#f5f0eb] flex flex-col items-center">
      <div className="w-full max-w-[320px] flex items-center justify-between p-3 text-gray-800 text-sm">
        <button
          onClick={onLeave}
          className="px-3 py-1 bg-gray-700 rounded-lg hover:bg-gray-600 transition text-xs"
        >
          返回
        </button>
        <div className="flex gap-4">
          <span>
            得分: <span className="text-amber-700 font-bold">{game.score}</span>
          </span>
          <span>
            等级: <span className="text-amber-700">{game.level}</span>
          </span>
          <span>
            连击: <span className="text-amber-700">{game.combo}</span>
          </span>
        </div>
      </div>

      {bestScore > 0 && (
        <div className="text-xs text-gray-600 mb-1">
          最高分: <span className="text-amber-600">{bestScore}</span>
        </div>
      )}

      <div className="relative">
        <StackCanvas
          ref={canvasRef}
          blocks={game.blocks}
          movingBlock={game.movingBlock}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
        />
        {!game.started && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="text-center">
              <div className="text-2xl font-black text-amber-800 mb-2">堆木头</div>
              <div className="text-sm text-gray-600 mb-4">点击屏幕或按空格键开始</div>
              <div className="text-xs text-gray-500 mb-4">
                在木头移动到正上方时点击放下
                <br />
                尽可能对齐，越准分越高
              </div>
              <div className="flex gap-2 justify-center">
                {(["slow", "normal", "fast"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpeed(s);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      speed === s
                        ? "bg-amber-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {SPEED_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {game.started && (
        <div className="text-xs text-gray-500 mt-2">
          第 {game.layer} 层 | 等级 {getLevel(game.layer)}
        </div>
      )}

      {showResult && (
        <GameResultModal
          isWinner={null}
          reason="game_over"
          myScore={game.score}
          myLayer={game.layer}
          isOwner={false}
          onLeave={onLeave}
          singlePlayer
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
