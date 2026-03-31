import { useState } from "react";
import { getHttpBase } from "../api";

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
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-amber-800 mb-1">堆木头</h1>
          <p className="text-gray-500 text-sm">考验反应速度的堆叠游戏</p>
        </div>

        {(urlError || joinError) && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
            {urlError || joinError}
          </div>
        )}

        <input
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition mb-4"
          placeholder="你的昵称"
          maxLength={12}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />

        <button
          onClick={onSinglePlayer}
          className="w-full py-3 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 transition mb-4"
        >
          单人模式
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">或者双人对战</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={() => {
            if (nickname.trim()) {
              onCreateMultiplayer(nickname.trim());
            }
          }}
          disabled={!nickname.trim() || createLoading}
          className="w-full py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition mb-3 disabled:opacity-50"
        >
          {createLoading ? "创建中..." : "创建房间"}
        </button>

        <div className="flex gap-2">
          <input
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
            placeholder="输入6位房间号"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleJoin();
              }
            }}
          />
          <button
            onClick={handleJoin}
            disabled={joinCode.length !== 6 || !nickname.trim() || joinLoading}
            className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {joinLoading ? "加入中..." : "加入"}
          </button>
        </div>
      </div>
    </div>
  );
}
