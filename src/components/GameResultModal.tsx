interface Props {
  isWinner: boolean | null;
  reason: string;
  myScore: number;
  myLayer: number;
  opponentScore?: number;
  opponentLayer?: number;
  isOwner: boolean;
  onPlayAgain?: () => void;
  onLeave: () => void;
  singlePlayer?: boolean;
  onRestart?: () => void;
}

export default function GameResultModal({
  isWinner,
  reason,
  myScore,
  myLayer,
  opponentScore,
  opponentLayer,
  isOwner,
  onPlayAgain,
  onLeave,
  singlePlayer = false,
  onRestart,
}: Props) {
  const reasonText: Record<string, string> = {
    opponent_failed: "对方失误",
    score: "得分比拼",
    disconnect: "对方断线",
    surrender: "对方投降",
    game_over: "游戏结束",
  };

  const title = singlePlayer
    ? "游戏结束"
    : isWinner === null
      ? "平局!"
      : isWinner
        ? "你赢了!"
        : "你输了";

  const titleColor = singlePlayer
    ? "text-amber-600"
    : isWinner === null
      ? "text-gray-500"
      : isWinner
        ? "text-amber-600"
        : "text-red-500";

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 text-center">
        <h2 className={`text-3xl font-black mb-2 ${titleColor}`}>{title}</h2>
        {!singlePlayer && (
          <div className="text-sm text-gray-400 mb-4">{reasonText[reason] || reason}</div>
        )}

        <div className="flex justify-center gap-8 mb-6">
          <div>
            <div className="text-gray-400 text-xs mb-1">{singlePlayer ? "得分" : "我的得分"}</div>
            <div className="text-2xl font-bold text-amber-600">{myScore}</div>
            <div className="text-xs text-gray-400">第 {myLayer} 层</div>
          </div>
          {opponentScore !== undefined && (
            <div>
              <div className="text-gray-400 text-xs mb-1">对手得分</div>
              <div className="text-2xl font-bold text-gray-600">{opponentScore}</div>
              <div className="text-xs text-gray-400">第 {opponentLayer} 层</div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          {singlePlayer && onRestart && (
            <button
              onClick={onRestart}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-bold"
            >
              再来一次
            </button>
          )}
          {!singlePlayer && isOwner && onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-bold"
            >
              再来一局
            </button>
          )}
          <button
            onClick={onLeave}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {singlePlayer ? "返回" : "离开"}
          </button>
        </div>
      </div>
    </div>
  );
}
