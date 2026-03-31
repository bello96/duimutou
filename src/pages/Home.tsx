import { useState } from "react";
import { getHttpBase } from "../api";
import type { SpeedLevel } from "../utils/stack";
import { SPEED_LABELS } from "../utils/stack";

type Mode = "single" | "multi";

interface Props {
  onEnterRoom: (code: string, name: string) => void;
  onSinglePlayer: () => void;
  onCreateMultiplayer: (name: string) => Promise<void>;
  urlError: string;
  createLoading: boolean;
}

export default function Home({
  onEnterRoom,
  onSinglePlayer,
  onCreateMultiplayer,
  urlError,
  createLoading,
}: Props) {
  const [mode, setMode] = useState<Mode>("single");
  const [_speed, setSpeed] = useState<SpeedLevel>("normal");
  const [nickname, setNickname] = useState(() => {
    try {
      const s = sessionStorage.getItem("stack_session");
      return s ? (JSON.parse(s) as { nickname?: string }).nickname || "" : "";
    } catch {
      return "";
    }
  });
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  async function handleJoin() {
    if (!joinCode || joinCode.length !== 6 || !nickname.trim()) {
      return;
    }
    setJoinError("");
    setJoinLoading(true);
    try {
      const res = await fetch(`${getHttpBase()}/api/rooms/${joinCode}`);
      if (!res.ok) {
        throw new Error("房间不存在");
      }
      const info = (await res.json()) as { closed?: boolean; playerCount?: number };
      if (info.closed) {
        throw new Error("房间已关闭");
      }
      if (info.playerCount && info.playerCount >= 2) {
        throw new Error("房间已满");
      }
      onEnterRoom(joinCode, nickname.trim());
    } catch (e) {
      setJoinError((e as Error).message);
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* 标题 */}
        <div className="text-center mb-6">
          <div className="text-4xl font-black text-amber-700 mb-1">
            <span className="mr-2">🪵</span>堆木头
          </div>
          <p className="text-gray-400 text-sm mt-1">精准堆叠，挑战极限</p>
        </div>

        {(urlError || joinError) && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
            {urlError || joinError}
          </div>
        )}

        {/* 模式选择 */}
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-2">模式</div>
          <div className="flex gap-3">
            <button
              onClick={() => setMode("single")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition border-2 ${
                mode === "single"
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              🎯 单人挑战
            </button>
            <button
              onClick={() => setMode("multi")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition border-2 ${
                mode === "multi"
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              ⚔️ 双人PK
            </button>
          </div>
        </div>

        {/* 速度选择 */}
        <div className="mb-6">
          <div className="text-sm text-gray-500 mb-2">速度</div>
          <div className="flex gap-3">
            {(["slow", "normal", "fast"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition border-2 ${
                  _speed === s
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                {SPEED_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* 单人模式 */}
        {mode === "single" && (
          <button
            onClick={onSinglePlayer}
            className="w-full py-3.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition text-base"
          >
            开始挑战
          </button>
        )}

        {/* 双人模式 */}
        {mode === "multi" && (
          <div className="space-y-4">
            {/* 昵称 */}
            <div>
              <div className="text-sm text-gray-500 mb-2">昵称</div>
              <input
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                placeholder="输入你的昵称"
                maxLength={12}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>

            {/* 创建房间 */}
            <button
              onClick={() => {
                if (nickname.trim()) {
                  onCreateMultiplayer(nickname.trim());
                }
              }}
              disabled={!nickname.trim() || createLoading}
              className="w-full py-3.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition text-base disabled:opacity-50"
            >
              {createLoading ? "创建中..." : "创建房间"}
            </button>

            {/* 加入房间 */}
            {!showJoin ? (
              <button
                onClick={() => setShowJoin(true)}
                className="w-full py-3.5 bg-white text-amber-700 font-bold rounded-xl border-2 border-amber-600 hover:bg-amber-50 transition text-base"
              >
                加入房间
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  placeholder="输入6位房间号"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleJoin();
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={handleJoin}
                  disabled={joinCode.length !== 6 || !nickname.trim() || joinLoading}
                  className="px-5 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {joinLoading ? "..." : "加入"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
