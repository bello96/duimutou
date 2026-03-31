import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types/protocol";

interface Props {
  messages: ChatMessage[];
  myId: string | null;
  onSend: (text: string) => void;
}

const PLAYER_COLORS = ["#4cc9f0", "#f72585", "#ffd700", "#06d6a0", "#ff6b6b", "#a29bfe"];

export default function ChatPanel({ messages, myId, onSend }: Props) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const colorMap = useRef<Record<string, string>>({});
  let colorIdx = 0;

  function getColor(pid: string): string {
    if (!colorMap.current[pid]) {
      colorMap.current[pid] = PLAYER_COLORS[colorIdx % PLAYER_COLORS.length]!;
      colorIdx++;
    }
    return colorMap.current[pid];
  }

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages.length]);

  function handleSend() {
    const text = input.trim();
    if (!text) {
      return;
    }
    onSend(text);
    setInput("");
  }

  return (
    <div className="flex flex-col h-full bg-[#2c1810] border-t border-amber-900/30">
      <div className="px-4 py-2 text-sm font-bold text-amber-300 border-b border-amber-900/30">
        聊天
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 text-sm">
        {messages.map((m) =>
          m.playerId === null ? (
            <div key={m.id} className="text-center text-xs text-gray-500 py-0.5">
              {m.text}
            </div>
          ) : (
            <div key={m.id}>
              <span
                style={{ color: m.playerId === myId ? "#b5854b" : getColor(m.playerId) }}
                className="font-bold"
              >
                {m.playerName}:
              </span>{" "}
              <span className="text-gray-300">{m.text}</span>
            </div>
          ),
        )}
      </div>
      <div className="flex px-3 py-2 gap-2 border-t border-amber-900/30">
        <input
          className="flex-1 px-3 py-1.5 bg-[#1a0e08] text-white text-sm rounded-lg border border-amber-900/30 outline-none focus:border-amber-600"
          placeholder="输入消息..."
          maxLength={200}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          className="px-3 py-1.5 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-600 transition"
        >
          发送
        </button>
      </div>
    </div>
  );
}
