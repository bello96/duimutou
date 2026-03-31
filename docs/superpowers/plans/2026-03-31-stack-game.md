# 堆木头（Stack）游戏实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个支持单人挑战和双人在线对战的堆木头小游戏，技术栈与交互完全复用 my-game 项目群通用架构。

**Architecture:** React 前端用 Canvas 渲染堆叠木块动画，useStackGame hook 封装核心游戏逻辑。Cloudflare Workers + Durable Objects 处理双人房间管理和事件同步。双人模式下只同步 drop 事件（非实时位置），对手画面按结果渲染。

**Tech Stack:** React 18 + TypeScript + Vite + Twind CSS + Cloudflare Workers + Durable Objects + Canvas 2D + WebSocket

---

## 文件结构

```
duimutou/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── .env.development
├── src/
│   ├── main.tsx                    # 入口，Twind 木头主题色
│   ├── App.tsx                     # 路由与会话管理
│   ├── api.ts                      # HTTP/WS 基址
│   ├── types/
│   │   └── protocol.ts             # 通信协议类型
│   ├── utils/
│   │   └── stack.ts                # 游戏核心计算
│   ├── hooks/
│   │   ├── useWebSocket.ts         # WebSocket 管理
│   │   ├── useSound.ts             # 音效合成
│   │   └── useStackGame.ts         # 堆木头游戏逻辑 hook
│   ├── components/
│   │   ├── StackCanvas.tsx         # Canvas 渲染引擎
│   │   ├── PlayerBar.tsx           # 房间信息栏
│   │   ├── ChatPanel.tsx           # 聊天面板
│   │   ├── CountdownOverlay.tsx    # 倒计时
│   │   ├── GameResultModal.tsx     # 游戏结果弹窗
│   │   └── Confetti.tsx            # 胜利纸屑
│   └── pages/
│       ├── Home.tsx                # 首页
│       ├── SinglePlayer.tsx        # 单人模式
│       └── Room.tsx                # 双人对战
├── worker/
│   ├── package.json
│   ├── tsconfig.json
│   ├── wrangler.toml
│   └── src/
│       ├── index.ts                # Worker HTTP 路由
│       └── room.ts                 # StackRoom Durable Object
└── public/
    └── favicon.svg
```

---

### Task 1: 项目脚手架

创建所有配置文件和入口文件。

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `.env.development`
- Create: `public/favicon.svg`
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/wrangler.toml`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "duimutou",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:worker": "cd worker && npx wrangler dev",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@twind/core": "^1.1.3",
    "@twind/preset-autoprefix": "^1.0.7",
    "@twind/preset-tailwind": "^1.1.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://duimutou.dengjiabei.cn",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 3: 创建 TypeScript 配置文件**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: 创建 index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>堆木头</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 创建 .env.development 和 favicon**

`.env.development`:
```
VITE_API_BASE=https://duimutou.dengjiabei.cn
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="10" y="70" width="80" height="12" rx="3" fill="#b5854b"/>
  <rect x="15" y="56" width="70" height="12" rx="3" fill="#8B6914"/>
  <rect x="20" y="42" width="60" height="12" rx="3" fill="#A0522D"/>
  <rect x="25" y="28" width="50" height="12" rx="3" fill="#CD853F"/>
  <rect x="30" y="14" width="40" height="12" rx="3" fill="#b5854b"/>
</svg>
```

- [ ] **Step 6: 创建 Worker 配置文件**

`worker/package.json`:
```json
{
  "name": "duimutou-worker",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241205.0",
    "typescript": "^5.6.3",
    "wrangler": "^4.0.0"
  }
}
```

`worker/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src"]
}
```

`worker/wrangler.toml`:
```toml
name = "duimutou-worker"
main = "src/index.ts"
compatibility_date = "2024-12-05"
workers_dev = true

routes = [
  { pattern = "duimutou.dengjiabei.cn/api/*", zone_name = "dengjiabei.cn" }
]

[durable_objects]
bindings = [
  { name = "STACK_ROOM", class_name = "StackRoom" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["StackRoom"]
```

- [ ] **Step 7: 安装依赖**

```bash
cd D:/code/demo/my-game/duimutou && npm install
cd D:/code/demo/my-game/duimutou/worker && npm install
```

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: 项目脚手架初始化"
```

---

### Task 2: 通信协议类型与 API 工具

**Files:**
- Create: `src/types/protocol.ts`
- Create: `src/api.ts`

- [ ] **Step 1: 创建 protocol.ts**

```typescript
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

/** 玩家的堆叠状态（对手画面渲染用） */
export interface PlayerStackState {
  score: number;
  layer: number;
  combo: number;
  blockWidth: number;
  blockLeft: number;
  alive: boolean;
}

/* ── 服务端 → 客户端 ── */

export interface S_RoomState {
  type: "roomState";
  yourId: string;
  roomCode: string;
  phase: GamePhase;
  players: PlayerInfo[];
  ownerId: string | null;
  chat: ChatMessage[];
  /** playing 阶段时携带各玩家的堆叠状态 */
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

/* ── 客户端 → 服务端 ── */

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
```

- [ ] **Step 2: 创建 api.ts**

```typescript
/// <reference types="vite/client" />
const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;

export function getHttpBase(): string {
  if (API_BASE) {
    return API_BASE;
  }
  return window.location.origin;
}

export function getWsBase(): string {
  const http = getHttpBase();
  return http.replace(/^http/, "ws");
}
```

- [ ] **Step 3: 提交**

```bash
git add src/types/protocol.ts src/api.ts
git commit -m "feat: 添加通信协议类型和 API 工具"
```

---

### Task 3: 入口文件与 App 路由

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: 创建 main.tsx**

```tsx
import { install } from "@twind/core";
import presetAutoprefix from "@twind/preset-autoprefix";
import presetTailwind from "@twind/preset-tailwind";
import { createRoot } from "react-dom/client";
import App from "./App";

install({
  presets: [presetAutoprefix(), presetTailwind()],
  theme: {
    extend: {
      colors: {
        primary: "#b5854b",
        "primary-dark": "#8B6914",
        "game-bg": "#2c1810",
        "game-dark": "#1a0e08",
        "game-panel": "#3d2317",
        "player-a": "#4cc9f0",
        "player-b": "#f72585",
        gold: "#ffd700",
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 2: 创建 App.tsx**

```tsx
import { useCallback, useEffect, useState } from "react";
import { getHttpBase } from "./api";
import Home from "./pages/Home";
import Room from "./pages/Room";
import SinglePlayer from "./pages/SinglePlayer";

interface RoomSession {
  roomCode: string;
  nickname: string;
  playerId: string;
}

const SESSION_KEY = "stack_session";

function loadSession(): RoomSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as RoomSession) : null;
  } catch {
    return null;
  }
}

function saveSession(s: RoomSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function App() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [pendingError, setPendingError] = useState("");
  const [pendingJoining, setPendingJoining] = useState(false);
  const [pendingOwnerName, setPendingOwnerName] = useState<string | null>(null);
  const [pendingInfoLoading, setPendingInfoLoading] = useState(false);
  const [pendingInfoFailed, setPendingInfoFailed] = useState(false);
  const [singlePlayer, setSinglePlayer] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    const urlMatch = window.location.pathname.match(/^\/(\d{6})$/);
    const session = loadSession();

    if (urlMatch?.[1]) {
      const code = urlMatch[1];
      if (session && session.roomCode === code) {
        setNickname(session.nickname);
        setPlayerId(session.playerId);
        setRoomCode(code);
        return;
      }
      setNicknameInput(session?.nickname || "");
      setPendingCode(code);
      setPendingInfoLoading(true);
      setPendingInfoFailed(false);
      fetch(`${getHttpBase()}/api/rooms/${code}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("房间不存在");
          }
          return res.json();
        })
        .then((info: { ownerName?: string; closed?: boolean }) => {
          if (info.closed) {
            throw new Error("房间已关闭");
          }
          if (info.ownerName) {
            setPendingOwnerName(info.ownerName);
          }
          setPendingInfoLoading(false);
        })
        .catch((e: Error) => {
          setPendingInfoLoading(false);
          setPendingInfoFailed(true);
          setPendingError(e.message || "无法获取房间信息");
          setTimeout(() => {
            setPendingCode(null);
            setPendingError("");
            setPendingInfoFailed(false);
            setUrlError(e.message || "房间不存在或已关闭");
            window.history.replaceState(null, "", "/");
            setTimeout(() => setUrlError(""), 3000);
          }, 1500);
        });
    }
  }, []);

  function enterRoom(code: string, name: string, pid: string) {
    saveSession({ roomCode: code, nickname: name, playerId: pid });
    setNickname(name);
    setPlayerId(pid);
    setRoomCode(code);
    window.history.replaceState(null, "", `/${code}`);
  }

  async function confirmPendingJoin(code: string, name: string) {
    setPendingError("");
    setPendingJoining(true);
    try {
      const res = await fetch(`${getHttpBase()}/api/rooms/${code}`);
      if (!res.ok) {
        throw new Error("房间不存在");
      }
      const info = (await res.json()) as {
        roomCode: string;
        playerCount: number;
        closed: boolean;
      };
      if (info.closed) {
        throw new Error("房间已关闭");
      }
      if (info.playerCount >= 2) {
        throw new Error("房间已满，无法加入");
      }
      enterRoom(code, name, genId());
      setPendingCode(null);
    } catch (e) {
      setPendingJoining(false);
      setPendingError((e as Error).message);
      setTimeout(() => {
        setPendingCode(null);
        setPendingError("");
        setUrlError((e as Error).message);
        window.history.replaceState(null, "", "/");
        setTimeout(() => setUrlError(""), 3000);
      }, 1500);
    }
  }

  const handleEnterRoom = useCallback((code: string, name: string) => {
    enterRoom(code, name, genId());
  }, []);

  const handleSinglePlayer = useCallback(() => {
    setSinglePlayer(true);
  }, []);

  const handleCreateMultiplayer = useCallback(async (name: string) => {
    setCreateLoading(true);
    try {
      const res = await fetch(`${getHttpBase()}/api/rooms`, { method: "POST" });
      if (!res.ok) {
        throw new Error("创建房间失败");
      }
      const data = (await res.json()) as { roomCode: string };
      enterRoom(data.roomCode, name, genId());
    } catch {
      /* Home will show error */
    } finally {
      setCreateLoading(false);
    }
  }, []);

  const handleLeaveSinglePlayer = useCallback(() => {
    setSinglePlayer(false);
    window.history.replaceState(null, "", "/");
  }, []);

  const handleLeaveRoom = useCallback(() => {
    clearSession();
    setRoomCode(null);
    setNickname("");
    setPlayerId("");
    window.history.replaceState(null, "", "/");
  }, []);

  if (pendingCode) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          {pendingInfoLoading ? (
            <div className="text-center mb-4 text-gray-400">正在获取房间信息...</div>
          ) : pendingOwnerName ? (
            <div className="text-center mb-4">
              <span className="text-amber-700 font-bold">{pendingOwnerName}</span>
              <span className="text-gray-600"> 邀请你一起堆木头</span>
            </div>
          ) : null}
          <h3 className="text-lg font-bold text-gray-700 mb-4">输入昵称加入房间</h3>
          {pendingError && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
              {pendingError}
            </div>
          )}
          <input
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition mb-4"
            placeholder="你的昵称"
            maxLength={12}
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                nicknameInput.trim() &&
                !pendingInfoLoading &&
                !pendingInfoFailed &&
                !pendingJoining
              ) {
                confirmPendingJoin(pendingCode, nicknameInput.trim());
              }
            }}
            autoFocus
          />
          <button
            className="w-full py-3 px-4 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              !nicknameInput.trim() ||
              !!pendingError ||
              pendingJoining ||
              pendingInfoLoading ||
              pendingInfoFailed
            }
            onClick={() => confirmPendingJoin(pendingCode, nicknameInput.trim())}
          >
            {pendingJoining ? "加入中..." : "加入"}
          </button>
        </div>
      </div>
    );
  }

  if (singlePlayer) {
    return <SinglePlayer onLeave={handleLeaveSinglePlayer} />;
  }

  if (roomCode && nickname && playerId) {
    return (
      <Room
        roomCode={roomCode}
        nickname={nickname}
        playerId={playerId}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <Home
      onEnterRoom={handleEnterRoom}
      onSinglePlayer={handleSinglePlayer}
      onCreateMultiplayer={handleCreateMultiplayer}
      urlError={urlError}
      createLoading={createLoading}
    />
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: 添加入口文件和 App 路由"
```

---

### Task 4: 游戏核心计算工具

封装堆木头的核心计算逻辑：切割、得分、碰撞检测。

**Files:**
- Create: `src/utils/stack.ts`

- [ ] **Step 1: 创建 stack.ts**

```typescript
/** 木块颜色循环（暖木色系） */
export const BLOCK_COLORS = ["#b5854b", "#8B6914", "#A0522D", "#CD853F"];

/** 木块高度 */
export const BLOCK_HEIGHT = 24;

/** 初始宽度占 canvas 宽度的比例 */
export const INITIAL_WIDTH_RATIO = 0.7;

/** 完美对齐判定阈值 (px) */
export const PERFECT_THRESHOLD = 3;

/** 双人模式最大层数（超过后比分数） */
export const MAX_LAYERS = 50;

/** 计算木块移动速度 (px/帧, 60fps) */
export function getSpeed(layer: number): number {
  return 2 + Math.log(layer + 1) * 1.5;
}

/** 计算当前等级 */
export function getLevel(layer: number): number {
  return Math.floor(layer / 10) + 1;
}

export interface Block {
  left: number;
  width: number;
  color: string;
  layer: number;
}

export interface DropResult {
  /** 保留在堆上的部分，width<=0 表示完全失败 */
  stayed: { left: number; width: number };
  /** 切掉掉落的部分，null 表示完美对齐或完全失败 */
  cut: { left: number; width: number } | null;
  /** 切割方向 */
  cutSide: "left" | "right" | "none" | "all";
  /** 是否完美 */
  perfect: boolean;
  /** 本次得分 */
  score: number;
}

/**
 * 计算放下木块后的切割结果
 * @param current 当前移动木块的 left 和 width
 * @param previous 上一层木块的 left 和 width
 * @param layer 当前层数（用于得分计算）
 * @param combo 当前连击数（完美时+1）
 */
export function calculateDrop(
  current: { left: number; width: number },
  previous: { left: number; width: number },
  layer: number,
  combo: number,
): DropResult {
  const cLeft = current.left;
  const cRight = cLeft + current.width;
  const pLeft = previous.left;
  const pRight = pLeft + previous.width;

  // 计算重叠区域
  const overlapLeft = Math.max(cLeft, pLeft);
  const overlapRight = Math.min(cRight, pRight);
  const overlapWidth = overlapRight - overlapLeft;

  // 完全没对齐
  if (overlapWidth <= 0) {
    return {
      stayed: { left: cLeft, width: 0 },
      cut: null,
      cutSide: "all",
      perfect: false,
      score: 0,
    };
  }

  // 偏差量
  const diff = Math.abs(current.width - overlapWidth);

  // 完美对齐
  if (diff < PERFECT_THRESHOLD) {
    const baseScore = Math.floor(
      (previous.width / 10) * Math.log(layer + 1),
    );
    return {
      stayed: { left: previous.left, width: previous.width },
      cut: null,
      cutSide: "none",
      perfect: true,
      score: baseScore * 2 + combo * 5,
    };
  }

  // 普通切割
  const stayed = { left: overlapLeft, width: overlapWidth };
  let cutBlock: { left: number; width: number };
  let cutSide: "left" | "right";

  if (cLeft < pLeft) {
    // 左边超出
    cutBlock = { left: cLeft, width: pLeft - cLeft };
    cutSide = "left";
  } else {
    // 右边超出
    cutBlock = { left: overlapRight, width: cRight - overlapRight };
    cutSide = "right";
  }

  const baseScore = Math.floor(
    (overlapWidth / 10) * Math.log(layer + 1),
  );

  return {
    stayed,
    cut: cutBlock,
    cutSide,
    perfect: false,
    score: baseScore,
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/stack.ts
git commit -m "feat: 添加堆木头核心计算工具"
```

---

### Task 5: useSound 音效 hook

**Files:**
- Create: `src/hooks/useSound.ts`

- [ ] **Step 1: 创建 useSound.ts**

```typescript
import { useCallback, useRef } from "react";

type SoundName =
  | "drop"
  | "perfect"
  | "cut"
  | "levelUp"
  | "gameOver"
  | "win"
  | "lose"
  | "tick"
  | "go";

function renderBuffer(
  ctx: AudioContext,
  duration: number,
  fn: (t: number, i: number, sampleRate: number) => number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * duration);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = fn(i / sr, i, sr);
  }
  return buf;
}

function buildSounds(ctx: AudioContext): Record<SoundName, AudioBuffer> {
  const sin = (f: number, t: number) => Math.sin(2 * Math.PI * f * t);
  const env = (t: number, d: number) => Math.max(0, 1 - t / d);
  const tri = (f: number, t: number) => {
    const p = (t * f) % 1;
    return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  };

  return {
    drop: renderBuffer(ctx, 0.15, (t) => sin(600, t) * env(t, 0.15) * 0.3),

    perfect: renderBuffer(ctx, 0.4, (t) => {
      const f = t < 0.1 ? 880 : t < 0.2 ? 1108 : t < 0.3 ? 1318 : 1760;
      return sin(f, t) * env(t, 0.4) * 0.25;
    }),

    cut: renderBuffer(ctx, 0.2, (t) => {
      const f = 300 - t * 800;
      return tri(Math.max(f, 80), t) * env(t, 0.2) * 0.3;
    }),

    levelUp: renderBuffer(ctx, 0.5, (t) => {
      const f = t < 0.12 ? 523 : t < 0.24 ? 659 : t < 0.36 ? 784 : 1046;
      return (sin(f, t) + sin(f * 2, t) * 0.3) * env(t, 0.5) * 0.2;
    }),

    gameOver: renderBuffer(ctx, 0.6, (t) => {
      const f = t < 0.15 ? 330 : t < 0.3 ? 277 : t < 0.45 ? 233 : 196;
      return (sin(f, t) + tri(f * 0.5, t) * 0.5) * env(t, 0.6) * 0.25;
    }),

    win: renderBuffer(ctx, 0.6, (t) => {
      const f = t < 0.1 ? 523 : t < 0.2 ? 659 : t < 0.3 ? 784 : t < 0.4 ? 1046 : 1318;
      return (sin(f, t) + sin(f * 2, t) * 0.3) * env(t, 0.6) * 0.2;
    }),

    lose: renderBuffer(ctx, 0.6, (t) => {
      const f = t < 0.15 ? 330 : t < 0.3 ? 277 : t < 0.45 ? 233 : 196;
      return (sin(f, t) + tri(f * 0.5, t) * 0.5) * env(t, 0.6) * 0.25;
    }),

    tick: renderBuffer(ctx, 0.08, (t) => sin(1800, t) * env(t, 0.08) * 0.2),

    go: renderBuffer(ctx, 0.3, (t) => {
      const f = t < 0.15 ? 784 : 1046;
      return sin(f, t) * env(t, 0.3) * 0.25;
    }),
  };
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufRef = useRef<Record<SoundName, AudioBuffer> | null>(null);
  const compRef = useRef<DynamicsCompressorNode | null>(null);

  const ensure = useCallback(() => {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      compRef.current = comp;
      bufRef.current = buildSounds(ctx);
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
  }, []);

  const play = useCallback((name: SoundName) => {
    ensure();
    const ctx = ctxRef.current!;
    const buf = bufRef.current![name];
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    src.connect(gain).connect(compRef.current!);
    src.start();
  }, [ensure]);

  return { play, ensure };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/hooks/useSound.ts
git commit -m "feat: 添加音效合成 hook"
```

---

### Task 6: useWebSocket hook

**Files:**
- Create: `src/hooks/useWebSocket.ts`

- [ ] **Step 1: 创建 useWebSocket.ts**

从 panning 项目完整复用，只修改类型导入路径。

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, ServerMessage } from "../types/protocol";

const HEARTBEAT_INTERVAL = 25_000;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000];

type Listener = (msg: ServerMessage) => void;

export function useWebSocket(url: string | null) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<Listener>>(new Set());
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const retriesRef = useRef(0);
  const closedIntentionallyRef = useRef(false);
  const urlRef = useRef(url);
  urlRef.current = url;

  const cleanup = useCallback(() => {
    clearInterval(heartbeatRef.current);
    clearTimeout(reconnectRef.current);
  }, []);

  const connect = useCallback(() => {
    const wsUrl = urlRef.current;
    if (!wsUrl) {
      return;
    }
    cleanup();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retriesRef.current = 0;
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = (evt) => {
      try {
        const raw = typeof evt.data === "string" ? evt.data : new TextDecoder().decode(evt.data);
        const msg = JSON.parse(raw) as ServerMessage;
        listenersRef.current.forEach((fn) => fn(msg));
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      setConnected(false);
      cleanup();
      if (!closedIntentionallyRef.current && urlRef.current) {
        const delay = RECONNECT_DELAYS[Math.min(retriesRef.current, RECONNECT_DELAYS.length - 1)];
        retriesRef.current++;
        reconnectRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [cleanup]);

  useEffect(() => {
    closedIntentionallyRef.current = false;
    connect();
    return () => {
      closedIntentionallyRef.current = true;
      cleanup();
      wsRef.current?.close();
    };
  }, [url, connect, cleanup]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const addListener = useCallback((fn: Listener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  const leave = useCallback(() => {
    closedIntentionallyRef.current = true;
    cleanup();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "leave" }));
    }
    wsRef.current?.close();
  }, [cleanup]);

  return { connected, send, addListener, leave };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/hooks/useWebSocket.ts
git commit -m "feat: 添加 WebSocket 管理 hook"
```

---

### Task 7: StackCanvas 渲染组件

Canvas 渲染堆叠木块、移动动画、切割掉落动画。

**Files:**
- Create: `src/components/StackCanvas.tsx`

- [ ] **Step 1: 创建 StackCanvas.tsx**

```tsx
import { useCallback, useEffect, useRef } from "react";
import { BLOCK_COLORS, BLOCK_HEIGHT } from "../utils/stack";

export interface StackBlock {
  left: number;
  width: number;
  layer: number;
}

interface FallingPiece {
  left: number;
  width: number;
  layer: number;
  startTime: number;
  velocityY: number;
  opacity: number;
}

interface PerfectFlash {
  layer: number;
  startTime: number;
}

interface Props {
  /** 已堆叠的木块列表 */
  blocks: StackBlock[];
  /** 当前移动中的木块（null 表示没有在移动的） */
  movingBlock: { left: number; width: number; layer: number } | null;
  /** 是否显示为观战视角（对手画面，不显示移动木块） */
  spectator?: boolean;
  /** canvas 宽度 */
  width?: number;
  /** canvas 高度 */
  height?: number;
  /** 点击回调 */
  onClick?: () => void;
}

export default function StackCanvas({
  blocks,
  movingBlock,
  spectator = false,
  width = 320,
  height = 400,
  onClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallingRef = useRef<FallingPiece[]>([]);
  const flashRef = useRef<PerfectFlash[]>([]);
  const animFrameRef = useRef<number>(0);
  const scrollOffsetRef = useRef(0);
  const scrollTargetRef = useRef(0);

  /** 添加掉落碎片动画 */
  const addFalling = useCallback(
    (left: number, w: number, layer: number) => {
      fallingRef.current.push({
        left,
        width: w,
        layer,
        startTime: performance.now(),
        velocityY: 0,
        opacity: 1,
      });
    },
    [],
  );

  /** 添加完美闪光 */
  const addFlash = useCallback((layer: number) => {
    flashRef.current.push({ layer, startTime: performance.now() });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const baseY = height - 40; // 底部留出地面区域

    function getBlockColor(layer: number): string {
      return BLOCK_COLORS[layer % BLOCK_COLORS.length]!;
    }

    function drawBlock(
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
      alpha: number = 1,
    ) {
      ctx.globalAlpha = alpha;
      // 主体
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      // 高光（顶部）
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x, y, w, 3);
      // 阴影（底部）
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x, y + h - 2, w, 2);
      ctx.globalAlpha = 1;
    }

    function render() {
      const now = performance.now();
      ctx.clearRect(0, 0, width, height);

      // 背景渐变
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#1a0e08");
      grad.addColorStop(1, "#2c1810");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 地面
      ctx.fillStyle = "#4a3728";
      ctx.fillRect(0, baseY + BLOCK_HEIGHT, width, height - baseY - BLOCK_HEIGHT);
      ctx.fillStyle = "#5c4a3a";
      ctx.fillRect(0, baseY + BLOCK_HEIGHT, width, 3);

      // 计算滚动
      const topLayer = blocks.length + (movingBlock ? 1 : 0);
      if (topLayer > 12) {
        scrollTargetRef.current = (topLayer - 12) * (BLOCK_HEIGHT - 2);
      }
      const diff = scrollTargetRef.current - scrollOffsetRef.current;
      if (Math.abs(diff) > 0.5) {
        scrollOffsetRef.current += diff * 0.1;
      } else {
        scrollOffsetRef.current = scrollTargetRef.current;
      }
      const scroll = scrollOffsetRef.current;

      // 绘制已堆叠木块
      for (const block of blocks) {
        const y = baseY - (block.layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
        if (y > height + BLOCK_HEIGHT || y < -BLOCK_HEIGHT) {
          continue;
        }
        drawBlock(block.left, y, block.width, BLOCK_HEIGHT, getBlockColor(block.layer));
      }

      // 绘制移动中的木块
      if (movingBlock && !spectator) {
        const y = baseY - (movingBlock.layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
        const color = getBlockColor(movingBlock.layer);
        drawBlock(movingBlock.left, y, movingBlock.width, BLOCK_HEIGHT, color);
        // 高亮边框
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(movingBlock.left, y, movingBlock.width, BLOCK_HEIGHT);
      }

      // 绘制掉落碎片
      fallingRef.current = fallingRef.current.filter((p) => {
        const elapsed = (now - p.startTime) / 1000;
        if (elapsed > 1) {
          return false;
        }
        p.velocityY += 600 * (1 / 60); // gravity
        const dy = p.velocityY * elapsed;
        const y = baseY - (p.layer + 1) * (BLOCK_HEIGHT - 2) + scroll + dy;
        p.opacity = Math.max(0, 1 - elapsed * 2);
        drawBlock(p.left, y, p.width, BLOCK_HEIGHT, getBlockColor(p.layer), p.opacity);
        return true;
      });

      // 绘制完美闪光
      flashRef.current = flashRef.current.filter((f) => {
        const elapsed = (now - f.startTime) / 1000;
        if (elapsed > 0.5) {
          return false;
        }
        const y = baseY - (f.layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
        const alpha = Math.max(0, 1 - elapsed * 2);
        ctx.fillStyle = `rgba(255, 255, 200, ${alpha * 0.4})`;
        ctx.fillRect(0, y - 5, width, BLOCK_HEIGHT + 10);

        // 文字
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("完美!", width / 2, y - 10 - elapsed * 30);
        ctx.globalAlpha = 1;
        return true;
      });

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [blocks, movingBlock, spectator, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
      onTouchStart={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    />
  );
}

/** 暴露给父组件的命令式接口 */
export type StackCanvasHandle = {
  addFalling: (left: number, width: number, layer: number) => void;
  addFlash: (layer: number) => void;
};

export { type Props as StackCanvasProps };
```

**注意：** 上面的 `addFalling` 和 `addFlash` 需要通过 `useImperativeHandle` 暴露。将在 Task 8 集成时用 ref 回调的方式代替，由父组件直接管理 falling/flash 列表并通过 props 传入。我们改为在 StackCanvas 中接受这些动画数据作为 props：

更新：将 `fallingRef` 和 `flashRef` 改为 props 驱动。在上面的代码中已经通过 ref 内部管理，父组件通过调用返回的函数触发。为简化实现，我们让父组件持有动画列表，通过 props 传入。

**最终方案：** StackCanvas 内部管理动画 ref，通过 `useImperativeHandle` 暴露 `addFalling` 和 `addFlash`。用 `forwardRef` 包装。

替换为以下最终版本：

```tsx
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { BLOCK_COLORS, BLOCK_HEIGHT } from "../utils/stack";

export interface StackBlock {
  left: number;
  width: number;
  layer: number;
}

export interface StackCanvasHandle {
  addFalling: (left: number, width: number, layer: number) => void;
  addFlash: (layer: number) => void;
  /** 游戏结束动画：所有木块依次掉落 */
  collapseAll: () => void;
}

interface FallingPiece {
  left: number;
  width: number;
  layer: number;
  y0: number;
  startTime: number;
}

interface PerfectFlash {
  layer: number;
  startTime: number;
}

interface Props {
  blocks: StackBlock[];
  movingBlock: { left: number; width: number; layer: number } | null;
  spectator?: boolean;
  width?: number;
  height?: number;
  onClick?: () => void;
}

const StackCanvas = forwardRef<StackCanvasHandle, Props>(function StackCanvas(
  { blocks, movingBlock, spectator = false, width = 320, height = 400, onClick },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallingRef = useRef<FallingPiece[]>([]);
  const flashRef = useRef<PerfectFlash[]>([]);
  const animFrameRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const scrollTargetRef = useRef(0);
  const collapsedRef = useRef(false);
  const collapseStartRef = useRef(0);

  useImperativeHandle(ref, () => ({
    addFalling(left: number, w: number, layer: number) {
      const baseY = height - 40;
      const scroll = scrollOffsetRef.current;
      const y0 = baseY - (layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
      fallingRef.current.push({ left, width: w, layer, y0, startTime: performance.now() });
    },
    addFlash(layer: number) {
      flashRef.current.push({ layer, startTime: performance.now() });
    },
    collapseAll() {
      collapsedRef.current = true;
      collapseStartRef.current = performance.now();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const baseY = height - 40;

    function getColor(layer: number): string {
      return BLOCK_COLORS[layer % BLOCK_COLORS.length]!;
    }

    function drawBlock(x: number, y: number, w: number, h: number, color: string, alpha = 1) {
      if (w <= 0) {
        return;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x, y + h - 2, w, 2);
      ctx.globalAlpha = 1;
    }

    function render() {
      const now = performance.now();
      ctx.clearRect(0, 0, width, height);

      // 背景
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#1a0e08");
      grad.addColorStop(1, "#2c1810");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 地面
      ctx.fillStyle = "#4a3728";
      ctx.fillRect(0, baseY + BLOCK_HEIGHT, width, height - baseY - BLOCK_HEIGHT);
      ctx.fillStyle = "#5c4a3a";
      ctx.fillRect(0, baseY + BLOCK_HEIGHT, width, 3);

      // 滚动
      const topLayer = blocks.length + (movingBlock ? 1 : 0);
      if (topLayer > 12) {
        scrollTargetRef.current = (topLayer - 12) * (BLOCK_HEIGHT - 2);
      } else {
        scrollTargetRef.current = 0;
      }
      const sdiff = scrollTargetRef.current - scrollOffsetRef.current;
      if (Math.abs(sdiff) > 0.5) {
        scrollOffsetRef.current += sdiff * 0.1;
      } else {
        scrollOffsetRef.current = scrollTargetRef.current;
      }
      const scroll = scrollOffsetRef.current;

      // 崩塌动画
      const collapsed = collapsedRef.current;
      const collapseElapsed = collapsed ? (now - collapseStartRef.current) / 1000 : 0;

      // 堆叠木块
      for (const block of blocks) {
        let y = baseY - (block.layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
        let alpha = 1;
        if (collapsed) {
          const delay = (blocks.length - 1 - block.layer) * 0.05;
          const t = Math.max(0, collapseElapsed - delay);
          if (t > 0) {
            y += t * t * 500;
            alpha = Math.max(0, 1 - t);
          }
        }
        if (y > height + BLOCK_HEIGHT || y < -BLOCK_HEIGHT) {
          continue;
        }
        drawBlock(block.left, y, block.width, BLOCK_HEIGHT, getColor(block.layer), alpha);
      }

      // 移动中的木块
      if (movingBlock && !spectator && !collapsed) {
        const y = baseY - (movingBlock.layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
        drawBlock(movingBlock.left, y, movingBlock.width, BLOCK_HEIGHT, getColor(movingBlock.layer));
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(movingBlock.left, y, movingBlock.width, BLOCK_HEIGHT);
      }

      // 掉落碎片
      fallingRef.current = fallingRef.current.filter((p) => {
        const elapsed = (now - p.startTime) / 1000;
        if (elapsed > 1) {
          return false;
        }
        const y = p.y0 + elapsed * elapsed * 500;
        const alpha = Math.max(0, 1 - elapsed * 2);
        drawBlock(p.left, y, p.width, BLOCK_HEIGHT, getColor(p.layer), alpha);
        return true;
      });

      // 完美闪光
      flashRef.current = flashRef.current.filter((f) => {
        const elapsed = (now - f.startTime) / 1000;
        if (elapsed > 0.5) {
          return false;
        }
        const y = baseY - (f.layer + 1) * (BLOCK_HEIGHT - 2) + scroll;
        const alpha = Math.max(0, 1 - elapsed * 2);
        ctx.fillStyle = `rgba(255,255,200,${alpha * 0.4})`;
        ctx.fillRect(0, y - 5, width, BLOCK_HEIGHT + 10);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("完美!", width / 2, y - 10 - elapsed * 30);
        ctx.globalAlpha = 1;
        return true;
      });

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [blocks, movingBlock, spectator, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, cursor: onClick ? "pointer" : "default", display: "block" }}
      onClick={onClick}
      onTouchStart={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    />
  );
});

export default StackCanvas;
```

- [ ] **Step 2: 提交**

```bash
git add src/components/StackCanvas.tsx
git commit -m "feat: 添加 StackCanvas 渲染组件"
```

---

### Task 8: useStackGame 游戏逻辑 hook

封装单局堆木头的完整状态管理：木块移动、放下、切割、得分、游戏结束。

**Files:**
- Create: `src/hooks/useStackGame.ts`

- [ ] **Step 1: 创建 useStackGame.ts**

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import type { StackBlock, StackCanvasHandle } from "../components/StackCanvas";
import {
  BLOCK_HEIGHT,
  calculateDrop,
  getLevel,
  getSpeed,
  INITIAL_WIDTH_RATIO,
} from "../utils/stack";

export interface GameStats {
  score: number;
  layer: number;
  combo: number;
  level: number;
  blockWidth: number;
  blockLeft: number;
  perfect: boolean;
}

interface UseStackGameOptions {
  canvasWidth: number;
  canvasRef: React.RefObject<StackCanvasHandle | null>;
  onDrop?: (stats: GameStats) => void;
  onGameOver?: (stats: GameStats) => void;
  /** 外部控制是否暂停（如倒计时阶段） */
  paused?: boolean;
}

export function useStackGame({
  canvasWidth,
  canvasRef,
  onDrop,
  onGameOver,
  paused = false,
}: UseStackGameOptions) {
  const [blocks, setBlocks] = useState<StackBlock[]>([]);
  const [movingBlock, setMovingBlock] = useState<{
    left: number;
    width: number;
    layer: number;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [layer, setLayer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const dirRef = useRef(1);
  const animRef = useRef(0);
  const droppingRef = useRef(false);
  const gameOverRef = useRef(false);
  const blocksRef = useRef<StackBlock[]>([]);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const layerRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  /** 启动游戏 */
  const start = useCallback(() => {
    const initialWidth = Math.floor(canvasWidth * INITIAL_WIDTH_RATIO);
    const initialLeft = Math.floor((canvasWidth - initialWidth) / 2);
    const baseBlock: StackBlock = { left: initialLeft, width: initialWidth, layer: 0 };

    blocksRef.current = [baseBlock];
    comboRef.current = 0;
    scoreRef.current = 0;
    layerRef.current = 0;
    gameOverRef.current = false;
    droppingRef.current = false;
    dirRef.current = 1;

    setBlocks([baseBlock]);
    setScore(0);
    setCombo(0);
    setLayer(0);
    setGameOver(false);
    setStarted(true);

    // 启动第一个移动木块
    const nextLayer = 1;
    const nextWidth = initialWidth;
    setMovingBlock({ left: 0, width: nextWidth, layer: nextLayer });
    layerRef.current = nextLayer;
    setLayer(nextLayer);
  }, [canvasWidth]);

  /** 木块移动动画 */
  useEffect(() => {
    if (!started || gameOver || !movingBlock) {
      return;
    }

    let lastTime = performance.now();

    function tick(now: number) {
      if (gameOverRef.current || droppingRef.current || pausedRef.current) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }
      const dt = (now - lastTime) / 16.67; // 归一化到 60fps
      lastTime = now;

      setMovingBlock((prev) => {
        if (!prev) {
          return prev;
        }
        const speed = getSpeed(prev.layer) * dt;
        let newLeft = prev.left + speed * dirRef.current;
        if (newLeft + prev.width > canvasWidth) {
          newLeft = canvasWidth - prev.width;
          dirRef.current = -1;
        } else if (newLeft < 0) {
          newLeft = 0;
          dirRef.current = 1;
        }
        return { ...prev, left: newLeft };
      });

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started, gameOver, movingBlock, canvasWidth]);

  /** 放下木块 */
  const drop = useCallback(() => {
    if (!movingBlock || droppingRef.current || gameOverRef.current || pausedRef.current) {
      return;
    }
    droppingRef.current = true;

    const currentBlocks = blocksRef.current;
    const prevBlock = currentBlocks[currentBlocks.length - 1]!;
    const result = calculateDrop(
      { left: movingBlock.left, width: movingBlock.width },
      { left: prevBlock.left, width: prevBlock.width },
      movingBlock.layer,
      comboRef.current,
    );

    if (result.stayed.width <= 0) {
      // 游戏结束
      gameOverRef.current = true;
      setGameOver(true);
      setMovingBlock(null);
      canvasRef.current?.collapseAll();
      const stats: GameStats = {
        score: scoreRef.current,
        layer: layerRef.current - 1,
        combo: comboRef.current,
        level: getLevel(layerRef.current - 1),
        blockWidth: 0,
        blockLeft: 0,
        perfect: false,
      };
      onGameOver?.(stats);
      return;
    }

    // 添加切割动画
    if (result.cut) {
      canvasRef.current?.addFalling(result.cut.left, result.cut.width, movingBlock.layer);
    }
    if (result.perfect) {
      canvasRef.current?.addFlash(movingBlock.layer);
    }

    // 更新状态
    const newBlock: StackBlock = {
      left: result.stayed.left,
      width: result.stayed.width,
      layer: movingBlock.layer,
    };
    const newBlocks = [...currentBlocks, newBlock];
    blocksRef.current = newBlocks;
    setBlocks(newBlocks);

    const newCombo = result.perfect ? comboRef.current + 1 : 0;
    comboRef.current = newCombo;
    setCombo(newCombo);

    const newScore = scoreRef.current + result.score;
    scoreRef.current = newScore;
    setScore(newScore);

    const stats: GameStats = {
      score: newScore,
      layer: movingBlock.layer,
      combo: newCombo,
      level: getLevel(movingBlock.layer),
      blockWidth: result.stayed.width,
      blockLeft: result.stayed.left,
      perfect: result.perfect,
    };
    onDrop?.(stats);

    // 启动下一个木块
    const nextLayer = movingBlock.layer + 1;
    layerRef.current = nextLayer;
    setLayer(nextLayer);
    dirRef.current = dirRef.current * -1; // 交替方向
    const startLeft = dirRef.current > 0 ? 0 : canvasWidth - result.stayed.width;
    setMovingBlock({ left: startLeft, width: result.stayed.width, layer: nextLayer });

    droppingRef.current = false;
  }, [movingBlock, canvasWidth, canvasRef, onDrop, onGameOver]);

  return {
    blocks,
    movingBlock,
    score,
    combo,
    layer,
    level: getLevel(layer),
    gameOver,
    started,
    start,
    drop,
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/hooks/useStackGame.ts
git commit -m "feat: 添加 useStackGame 游戏逻辑 hook"
```

---

### Task 9: 通用 UI 组件

PlayerBar、ChatPanel、Confetti、CountdownOverlay、GameResultModal。

**Files:**
- Create: `src/components/PlayerBar.tsx`
- Create: `src/components/ChatPanel.tsx`
- Create: `src/components/Confetti.tsx`
- Create: `src/components/CountdownOverlay.tsx`
- Create: `src/components/GameResultModal.tsx`

- [ ] **Step 1: 创建 PlayerBar.tsx**

```tsx
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
      {/* 左：房间号 */}
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

      {/* 中：玩家列表 */}
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

      {/* 右：操作按钮 */}
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
```

- [ ] **Step 2: 创建 ChatPanel.tsx**

```tsx
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
```

- [ ] **Step 3: 创建 Confetti.tsx**

```tsx
import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  shape: "circle" | "rect" | "strip";
  delay: number;
  duration: number;
  angle: number;
  spread: number;
}

const COLORS = ["#ffd700", "#ff6b6b", "#4cc9f0", "#06d6a0", "#f72585", "#b5854b", "#ff9f43"];

export default function Confetti() {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 10,
      y: 50 + (Math.random() - 0.5) * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      size: 4 + Math.random() * 8,
      shape: (["circle", "rect", "strip"] as const)[Math.floor(Math.random() * 3)]!,
      delay: Math.random() * 0.6,
      duration: 1.8 + Math.random() * 1.5,
      angle: Math.random() * 360,
      spread: 30 + Math.random() * 70,
    })),
  );

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.spread;
        const ty = Math.sin(rad) * p.spread - 40;
        const kf = `confetti-${p.id}`;
        const w = p.shape === "strip" ? p.size * 0.3 : p.size;
        const h = p.shape === "strip" ? p.size * 1.5 : p.size;
        const br = p.shape === "circle" ? "50%" : p.shape === "strip" ? "2px" : "1px";
        return (
          <div key={p.id}>
            <style>{`@keyframes ${kf}{0%{transform:translate(0,0) rotate(0deg);opacity:1}100%{transform:translate(${tx}vw,${ty}vh) rotate(${720 + Math.random() * 720}deg);opacity:0}}`}</style>
            <div
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: w,
                height: h,
                backgroundColor: p.color,
                borderRadius: br,
                animation: `${kf} ${p.duration}s ease-out ${p.delay}s forwards`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: 创建 CountdownOverlay.tsx**

```tsx
import { useEffect, useRef, useState } from "react";

interface Props {
  startsAt: number;
  onDone: () => void;
  playTick?: () => void;
  playGo?: () => void;
}

export default function CountdownOverlay({ startsAt, onDone, playTick, playGo }: Props) {
  const [display, setDisplay] = useState<string | null>(null);
  const doneRef = useRef(false);
  const lastNumRef = useRef(0);

  useEffect(() => {
    function tick() {
      const remaining = startsAt - Date.now();
      if (remaining <= 0) {
        if (!doneRef.current) {
          doneRef.current = true;
          setDisplay("GO!");
          playGo?.();
          setTimeout(() => {
            setDisplay(null);
            onDone();
          }, 400);
        }
        return;
      }
      const sec = Math.ceil(remaining / 1000);
      if (sec !== lastNumRef.current && sec <= 3 && sec >= 1) {
        lastNumRef.current = sec;
        playTick?.();
      }
      setDisplay(sec <= 3 ? String(sec) : null);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [startsAt, onDone, playTick, playGo]);

  if (!display) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div
        className="text-8xl font-black text-amber-400 drop-shadow-lg"
        style={{
          animation: "countdown-pop 0.4s ease-out",
        }}
        key={display}
      >
        {display}
        <style>{`@keyframes countdown-pop{0%{transform:scale(2);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 创建 GameResultModal.tsx**

```tsx
interface Props {
  isWinner: boolean | null; // null = 平局
  reason: string;
  myScore: number;
  myLayer: number;
  opponentScore?: number;
  opponentLayer?: number;
  isOwner: boolean;
  onPlayAgain?: () => void;
  onLeave: () => void;
  /** 单人模式用 */
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
    ? "text-amber-400"
    : isWinner === null
      ? "text-gray-300"
      : isWinner
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70">
      <div className="bg-[#2c1810] rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-amber-900/30 text-center">
        <h2 className={`text-3xl font-black mb-2 ${titleColor}`}>{title}</h2>
        {!singlePlayer && (
          <div className="text-sm text-gray-400 mb-4">{reasonText[reason] || reason}</div>
        )}

        <div className="flex justify-center gap-8 mb-6">
          <div>
            <div className="text-gray-400 text-xs mb-1">{singlePlayer ? "得分" : "我的得分"}</div>
            <div className="text-2xl font-bold text-amber-300">{myScore}</div>
            <div className="text-xs text-gray-500">第 {myLayer} 层</div>
          </div>
          {opponentScore !== undefined && (
            <div>
              <div className="text-gray-400 text-xs mb-1">对手得分</div>
              <div className="text-2xl font-bold text-gray-300">{opponentScore}</div>
              <div className="text-xs text-gray-500">第 {opponentLayer} 层</div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          {singlePlayer && onRestart && (
            <button
              onClick={onRestart}
              className="px-6 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-600 transition font-bold"
            >
              再来一次
            </button>
          )}
          {!singlePlayer && isOwner && onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="px-6 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-600 transition font-bold"
            >
              再来一局
            </button>
          )}
          <button
            onClick={onLeave}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
          >
            {singlePlayer ? "返回" : "离开"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 提交**

```bash
git add src/components/PlayerBar.tsx src/components/ChatPanel.tsx src/components/Confetti.tsx src/components/CountdownOverlay.tsx src/components/GameResultModal.tsx
git commit -m "feat: 添加通用 UI 组件"
```

---

### Task 10: Home 首页

**Files:**
- Create: `src/pages/Home.tsx`

- [ ] **Step 1: 创建 Home.tsx**

```tsx
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
    <div className="min-h-screen bg-[#1a0e08] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-amber-800 mb-1">堆木头</h1>
          <p className="text-gray-500 text-sm">考验反应速度的堆叠游戏</p>
        </div>

        {(urlError || joinError) && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
            {urlError || joinError}
          </div>
        )}

        {/* 昵称 */}
        <input
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition mb-4"
          placeholder="你的昵称"
          maxLength={12}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />

        {/* 单人模式 */}
        <button
          onClick={onSinglePlayer}
          className="w-full py-3 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 transition mb-4"
        >
          单人模式
        </button>

        {/* 分隔线 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">或者双人对战</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* 创建房间 */}
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

        {/* 加入房间 */}
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
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/Home.tsx
git commit -m "feat: 添加首页"
```

---

### Task 11: SinglePlayer 单人模式页面

**Files:**
- Create: `src/pages/SinglePlayer.tsx`

- [ ] **Step 1: 创建 SinglePlayer.tsx**

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import StackCanvas from "../components/StackCanvas";
import type { StackCanvasHandle } from "../components/StackCanvas";
import GameResultModal from "../components/GameResultModal";
import { useStackGame } from "../hooks/useStackGame";
import { useSound } from "../hooks/useSound";
import { getLevel } from "../utils/stack";

interface Props {
  onLeave: () => void;
}

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 450;

export default function SinglePlayer({ onLeave }: Props) {
  const canvasRef = useRef<StackCanvasHandle>(null);
  const { play, ensure } = useSound();
  const [showResult, setShowResult] = useState(false);
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
  });

  // 键盘监听
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
    <div className="min-h-screen bg-[#1a0e08] flex flex-col items-center">
      {/* 顶部信息 */}
      <div className="w-full max-w-[320px] flex items-center justify-between p-3 text-white text-sm">
        <button
          onClick={onLeave}
          className="px-3 py-1 bg-gray-700 rounded-lg hover:bg-gray-600 transition text-xs"
        >
          返回
        </button>
        <div className="flex gap-4">
          <span>
            得分: <span className="text-amber-300 font-bold">{game.score}</span>
          </span>
          <span>
            等级: <span className="text-amber-300">{game.level}</span>
          </span>
          <span>
            连击: <span className="text-amber-300">{game.combo}</span>
          </span>
        </div>
      </div>

      {/* 最高分 */}
      {bestScore > 0 && (
        <div className="text-xs text-gray-500 mb-1">
          最高分: <span className="text-amber-600">{bestScore}</span>
        </div>
      )}

      {/* Canvas */}
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="text-2xl font-black text-amber-400 mb-2">堆木头</div>
              <div className="text-sm text-gray-300 mb-4">点击屏幕或按空格键开始</div>
              <div className="text-xs text-gray-500">
                在木头移动到正上方时点击放下
                <br />
                尽可能对齐，越准分越高
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 等级信息 */}
      {game.started && (
        <div className="text-xs text-gray-500 mt-2">
          第 {game.layer} 层 | 等级 {getLevel(game.layer)}
        </div>
      )}

      {/* 结果弹窗 */}
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
```

- [ ] **Step 2: 验证单人模式可运行**

```bash
cd D:/code/demo/my-game/duimutou && npm run dev
```

打开浏览器访问 http://localhost:5173，点击"单人模式"，确认：
- 看到堆木头游戏画面
- 木块来回移动
- 点击/空格可放下木块
- 切割动画和完美提示正常
- 游戏结束弹窗显示

- [ ] **Step 3: 提交**

```bash
git add src/pages/SinglePlayer.tsx
git commit -m "feat: 添加单人模式页面"
```

---

### Task 12: Worker HTTP 路由

**Files:**
- Create: `worker/src/index.ts`

- [ ] **Step 1: 创建 worker/src/index.ts**

```typescript
export { StackRoom } from "./room";

interface Env {
  STACK_ROOM: DurableObjectNamespace;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // POST /api/rooms - 创建房间
    if (path === "/api/rooms" && request.method === "POST") {
      const roomCode = generateRoomCode();
      const id = env.STACK_ROOM.idFromName(roomCode);
      const stub = env.STACK_ROOM.get(id);
      await stub.fetch(new Request("https://do/setup", {
        method: "POST",
        body: JSON.stringify({ roomCode }),
      }));
      return json({ roomCode });
    }

    // /api/rooms/:code 系列
    const roomMatch = path.match(/^\/api\/rooms\/(\d{6})(\/.*)?$/);
    if (roomMatch) {
      const roomCode = roomMatch[1]!;
      const sub = roomMatch[2] || "";
      const id = env.STACK_ROOM.idFromName(roomCode);
      const stub = env.STACK_ROOM.get(id);

      // GET /api/rooms/:code - 获取房间信息
      if (!sub && request.method === "GET") {
        return stub.fetch(new Request("https://do/info"));
      }

      // POST /api/rooms/:code/quickleave - 快速离开
      if (sub === "/quickleave" && request.method === "POST") {
        return stub.fetch(new Request("https://do/quickleave", {
          method: "POST",
          body: request.body,
        }));
      }

      // GET /api/rooms/:code/ws - WebSocket 升级
      if (sub === "/ws" && request.headers.get("Upgrade") === "websocket") {
        return stub.fetch(request);
      }
    }

    return json({ error: "Not found" }, 404);
  },
};
```

- [ ] **Step 2: 提交**

```bash
git add worker/src/index.ts
git commit -m "feat: 添加 Worker HTTP 路由"
```

---

### Task 13: StackRoom Durable Object

**Files:**
- Create: `worker/src/room.ts`

- [ ] **Step 1: 创建 worker/src/room.ts**

```typescript
interface Env {}

type GamePhase = "waiting" | "readying" | "playing" | "ended";

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

    // WebSocket 升级
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

    // 检查 grace period
    for (const [pid, deadline] of this.graceTimers) {
      if (now >= deadline) {
        this.graceTimers.delete(pid);
        this.handlePlayerRemoved(pid);
      }
    }

    // 不活跃超时
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

    // 重连
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

    // 新玩家
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

  private handleStartGame(ws: WebSocket) {
    const player = this.findPlayerByWs(ws);
    if (!player || player.id !== this.ownerId || this.phase !== "readying") {
      return;
    }
    // 检查所有非房主玩家是否已准备
    for (const p of this.players.values()) {
      if (p.id !== this.ownerId && !p.ready) {
        this.sendTo(ws, { type: "error", message: "对手尚未准备" });
        return;
      }
    }

    this.phase = "playing";
    this.gameStartsAt = Date.now() + 4000;
    this.winnerId = null;

    // 重置玩家游戏状态
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

    // 检查是否超过 MAX_LAYERS
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

    // 判定胜负
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
    // 重置准备状态
    for (const p of this.players.values()) {
      p.ready = p.id === this.ownerId;
    }
    // 发送完整房间状态给所有人
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

    // 游戏中对手获胜
    if (this.phase === "playing") {
      const remaining = Array.from(this.players.values());
      if (remaining.length === 1) {
        this.endGame(remaining[0]!.id, remaining[0]!.name, "disconnect");
      } else {
        this.phase = "ended";
        this.broadcast({ type: "phaseChange", phase: "ended" });
      }
    }

    // 转移房主
    if (playerId === this.ownerId) {
      const next = Array.from(this.players.values())[0];
      this.ownerId = next?.id || null;
    }

    // 回到等待
    if (this.players.size < 2 && (this.phase === "readying" || this.phase === "ended")) {
      this.phase = this.players.size === 0 ? "waiting" : "waiting";
      this.broadcast({ type: "phaseChange", phase: "waiting" });
    }

    // 关闭空房间
    if (this.players.size === 0) {
      this.closed = true;
    }
  }

  private checkMaxLayers() {
    const allAboveMax = Array.from(this.players.values()).every(
      (p) => p.alive && p.layer >= MAX_LAYERS,
    );
    if (allAboveMax) {
      // 比较分数
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
      reason: reason as "opponent_failed" | "score" | "disconnect" | "surrender",
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
```

- [ ] **Step 2: 提交**

```bash
git add worker/src/room.ts
git commit -m "feat: 添加 StackRoom Durable Object"
```

---

### Task 14: Room 双人对战页面

**Files:**
- Create: `src/pages/Room.tsx`

- [ ] **Step 1: 创建 Room.tsx**

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { getHttpBase, getWsBase } from "../api";
import StackCanvas from "../components/StackCanvas";
import type { StackBlock, StackCanvasHandle } from "../components/StackCanvas";
import PlayerBar from "../components/PlayerBar";
import ChatPanel from "../components/ChatPanel";
import CountdownOverlay from "../components/CountdownOverlay";
import GameResultModal from "../components/GameResultModal";
import Confetti from "../components/Confetti";
import { useWebSocket } from "../hooks/useWebSocket";
import { useStackGame } from "../hooks/useStackGame";
import type { GameStats } from "../hooks/useStackGame";
import { useSound } from "../hooks/useSound";
import type {
  ChatMessage,
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
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [gameStartsAt, setGameStartsAt] = useState(0);
  const [countdownDone, setCountdownDone] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [winReason, setWinReason] = useState("");
  const [scores, setScores] = useState<Record<string, { score: number; layer: number }>>({});

  // 对手状态
  const [opponentBlocks, setOpponentBlocks] = useState<StackBlock[]>([]);
  const opponentCanvasRef = useRef<StackCanvasHandle>(null);

  const myCanvasRef = useRef<StackCanvasHandle>(null);
  const { play, ensure } = useSound();

  const wsUrl = `${getWsBase()}/api/rooms/${roomCode}/ws`;
  const { connected, send, addListener, leave: wsLeave } = useWebSocket(wsUrl);

  // 发送 join
  const joinedRef = useRef(false);
  useEffect(() => {
    if (connected && !joinedRef.current) {
      joinedRef.current = true;
      send({ type: "join", playerName: nickname, playerId });
    }
  }, [connected, send, nickname, playerId]);

  // 堆木头游戏 hook
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

  // 监听服务端消息
  useEffect(() => {
    return addListener((msg: ServerMessage) => {
      switch (msg.type) {
        case "roomState":
          setMyId(msg.yourId);
          setPlayers(msg.players);
          setOwnerId(msg.ownerId);
          setPhase(msg.phase);
          setChat(msg.chat);
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

        case "gameStart":
          setGameStartsAt(msg.gameStartsAt);
          setCountdownDone(false);
          setShowResult(false);
          setShowConfetti(false);
          setOpponentBlocks([]);
          ensure();
          break;

        case "playerDropped":
          // 对手放下了木块
          if (msg.playerId !== myId) {
            setOpponentBlocks((prev) => [
              ...prev,
              { left: msg.blockLeft, width: msg.blockWidth, layer: msg.layer },
            ]);
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

        case "chat":
          setChat((prev) => [
            ...prev,
            { id: msg.id, playerId: msg.playerId, playerName: msg.playerName, text: msg.text, ts: msg.ts },
          ]);
          break;

        case "roomClosed":
          onLeave();
          break;

        case "error":
          break;
      }
    });
  }, [addListener, myId, play, ensure, onLeave]);

  // 倒计时结束后启动游戏
  const handleCountdownDone = useCallback(() => {
    setCountdownDone(true);
    game.start();
  }, [game]);

  // 键盘监听
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

  // 页面离开时 beacon
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

  const myScoreData = myId && scores[myId];
  const opponentId = opponent?.id;
  const opponentScoreData = opponentId ? scores[opponentId] : undefined;

  return (
    <div className="min-h-screen bg-[#1a0e08] flex flex-col">
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

      {/* 游戏区域 */}
      <div className="flex-1 flex flex-col items-center">
        {/* 等待/准备阶段 */}
        {(phase === "waiting" || phase === "readying") && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              {phase === "waiting" && (
                <>
                  <div className="text-2xl text-amber-400 font-bold mb-4 animate-pulse">
                    等待对手加入...
                  </div>
                  <div className="text-gray-500 text-sm">
                    分享房间号 <span className="text-amber-300 font-mono">{roomCode}</span> 给好友
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

        {/* 游戏阶段 */}
        {(phase === "playing" || phase === "ended") && (
          <>
            {/* 分数栏 */}
            <div className="w-full max-w-[600px] flex justify-between px-4 py-2 text-sm text-white">
              <div className="flex gap-3">
                <span className="text-amber-300 font-bold">我</span>
                <span>得分: {game.score}</span>
                <span>连击: {game.combo}</span>
                <span>等级: {game.level}</span>
              </div>
              {opponent && opponentBlocks.length > 0 && (
                <div className="flex gap-3">
                  <span className="text-player-b font-bold">{opponent.name}</span>
                  <span>第 {opponentBlocks[opponentBlocks.length - 1]?.layer ?? 0} 层</span>
                </div>
              )}
            </div>

            {/* 双画布 */}
            <div className="flex gap-4 items-start">
              {/* 我的画布 */}
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
                <div className="text-center text-xs text-amber-300 mt-1">我</div>
              </div>

              {/* 对手画布 */}
              <div className="relative">
                <StackCanvas
                  ref={opponentCanvasRef}
                  blocks={opponentBlocks}
                  movingBlock={null}
                  spectator
                  width={CANVAS_W}
                  height={CANVAS_H}
                />
                <div className="text-center text-xs text-player-b mt-1">
                  {opponent?.name || "对手"}
                </div>
              </div>
            </div>

            {/* 投降按钮 */}
            {phase === "playing" && countdownDone && (
              <button
                onClick={() => {
                  if (confirm("确定要投降吗？")) {
                    send({ type: "surrender" });
                  }
                }}
                className="mt-3 px-4 py-1.5 text-xs bg-red-900/50 text-red-300 rounded-lg hover:bg-red-800/50 transition"
              >
                投降
              </button>
            )}
          </>
        )}
      </div>

      {/* 聊天面板 */}
      <div className="h-48">
        <ChatPanel
          messages={chat}
          myId={myId}
          onSend={(text) => send({ type: "chat", text })}
        />
      </div>

      {/* 倒计时 */}
      {phase === "playing" && gameStartsAt > 0 && !countdownDone && (
        <CountdownOverlay
          startsAt={gameStartsAt}
          onDone={handleCountdownDone}
          playTick={() => play("tick")}
          playGo={() => play("go")}
        />
      )}

      {/* 结果弹窗 */}
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

      {/* 胜利纸屑 */}
      {showConfetti && <Confetti />}
    </div>
  );
}
```

- [ ] **Step 2: 验证双人模式编译通过**

```bash
cd D:/code/demo/my-game/duimutou && npx vue-tsc --noEmit 2>/dev/null; npx tsc -b
```

- [ ] **Step 3: 提交**

```bash
git add src/pages/Room.tsx
git commit -m "feat: 添加双人对战页面"
```

---

### Task 15: 集成验证与修复

确保整个项目编译、运行正常。

- [ ] **Step 1: TypeScript 类型检查**

```bash
cd D:/code/demo/my-game/duimutou && npx tsc -b
```

修复所有类型错误。

- [ ] **Step 2: 开发服务器验证**

```bash
cd D:/code/demo/my-game/duimutou && npm run dev
```

验证：
1. 首页显示正常（标题、昵称输入、单人/双人按钮）
2. 单人模式：点击开始 → 木块移动 → 点击放下 → 切割动画 → 得分 → 游戏结束弹窗
3. 主题色为暖棕色系

- [ ] **Step 3: Worker 本地验证**

```bash
cd D:/code/demo/my-game/duimutou/worker && npx tsc --noEmit
```

确认 worker 代码无类型错误。

- [ ] **Step 4: 提交最终修复**

```bash
git add -A
git commit -m "fix: 集成修复与类型错误修正"
```
