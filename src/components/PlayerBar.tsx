import type { GamePhase, PlayerInfo } from "../types/protocol";

interface Props {
  roomCode: string;
  players: PlayerInfo[];
  ownerId: string | null;
  myId: string | null;
  phase: GamePhase;
  onPlayAgain?: () => void;
  onTransferOwner: () => void;
  onLeave: () => void;
}

const PHASE_LABELS: Record<GamePhase, string> = {
  waiting: "等待中",
  readying: "准备中",
  playing: "游戏中",
  ended: "已结束",
};

const PHASE_COLORS: Record<GamePhase, string> = {
  waiting: "bg-yellow-100 text-yellow-700",
  readying: "bg-blue-100 text-blue-700",
  playing: "bg-green-100 text-green-700",
  ended: "bg-purple-100 text-purple-700",
};

export default function PlayerBar({
  roomCode,
  players,
  ownerId,
  myId,
  phase,
  onPlayAgain,
  onTransferOwner,
  onLeave,
}: Props) {
  const isOwner = myId === ownerId;

  function copyLink() {
    const url = `${window.location.origin}/${roomCode}`;
    navigator.clipboard.writeText(url);
  }

  return (
    <div className="flex items-center p-3 bg-[#3d2317] text-white gap-3 text-sm">
      <div className="flex items-center gap-2 flex-1">
        <span className="font-mono text-amber-300">#{roomCode}</span>
        <button
          onClick={copyLink}
          className="px-2 py-0.5 text-xs bg-amber-700/50 rounded hover:bg-amber-700 transition"
          title="复制邀请链接"
        >
          分享
        </button>
        <span className={`px-2 py-0.5 text-xs rounded ${PHASE_COLORS[phase]}`}>
          {PHASE_LABELS[phase]}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-[2] justify-center">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${p.online ? "bg-green-500" : "bg-gray-400"}`}
            />
            <span className={p.id === myId ? "text-amber-300 font-bold" : ""}>
              {p.name}
              {p.id === ownerId && (
                <span className="ml-1 text-xs text-amber-500">房主</span>
              )}
              {p.id === myId && <span className="text-xs text-gray-400">（我）</span>}
            </span>
            {phase === "readying" && p.id !== ownerId && (
              <span
                className={`text-xs ${p.ready ? "text-green-400" : "text-gray-500"}`}
              >
                {p.ready ? "✓ 已准备" : "未准备"}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-1 justify-end">
        {phase === "ended" && isOwner && onPlayAgain && (
          <button
            onClick={onPlayAgain}
            className="px-3 py-1 text-xs bg-amber-600 rounded-lg hover:bg-amber-700 transition"
          >
            再来一局
          </button>
        )}
        {isOwner && players.length === 2 && (
          <button
            onClick={onTransferOwner}
            className="px-2 py-1 text-xs bg-gray-600 rounded hover:bg-gray-500 transition"
          >
            转让房主
          </button>
        )}
        <button
          onClick={onLeave}
          className="px-3 py-1 text-xs bg-red-800/60 rounded-lg hover:bg-red-700 transition"
        >
          离开
        </button>
      </div>
    </div>
  );
}
