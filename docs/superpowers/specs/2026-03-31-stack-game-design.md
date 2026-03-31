# 堆木头（Stack）游戏设计文档

## 概述

一款基于 Canvas 渲染的堆木头反应速度小游戏，支持单人挑战和双人在线对战。技术栈与交互模式完全复用 `my-game` 项目群的通用架构（React + TypeScript + Vite + Twind + Cloudflare Workers + Durable Objects）。

## 游戏核心玩法

玩家点击/按键释放一个水平移动的木块，使其尽可能对齐下方的木块堆。未对齐的部分被切掉，木块逐渐变窄。完全没对齐则游戏结束。

## 游戏模式

### 单人模式

- 纯客户端运行，无网络通信
- 挑战最高分，本地 localStorage 记录历史最高分
- 可选难度：简单（速度慢）、普通（标准速度）、困难（速度快）

### 双人模式

- 左右分屏同屏比赛，各自独立操作
- 生存制：谁先掉落（木块宽度 ≤ 0）谁输，另一方获胜
- 若双方都存活超过 50 层，则比较总分，高分者获胜
- 若双方同时掉落（同一轮），比较当前总分

## 游戏机制

| 项目 | 规则 |
|------|------|
| 木块初始宽度 | Canvas 宽度的 70% |
| 移动速度 | `2 + Math.log(layer + 1) * 1.5` px/帧（60fps），随层数递增 |
| 完美判定 | 偏差 < 3px 视为完美对齐，不切割，得分翻倍，combo+1 |
| 得分公式 | `floor(blockWidth / 10 * log(layer + 1))`，完美则 ×2 |
| 切割动画 | 切掉的部分向下掉落并渐隐（0.5 秒） |
| 完美提示 | 闪光效果 + "完美!" 文字浮动上升 |
| 游戏结束 | 木块宽度 ≤ 0（完全没对齐） |
| 等级 | 每 10 层升一级，显示当前等级 |
| 视角滚动 | 超过 10 层后，画面自动上移，保持当前操作区域可见 |

## 操作方式

- 点击屏幕 / 按空格键：释放当前移动中的木块
- 移动端：触摸屏幕任意位置

## Canvas 渲染设计

### 木块渲染

- 每个木块用纯色矩形绘制，带轻微渐变效果
- 4 种颜色循环（暖木色系）：`#b5854b`、`#8B6914`、`#A0522D`、`#CD853F`
- 每个木块带底部阴影（2px 深色偏移）
- 当前移动中的木块有轻微高亮

### 动画

- 木块水平来回移动：线性移动，碰到边界反弹
- 放下木块：短暂下落到目标位置（100ms ease-out）
- 切割部分：掉落 + 渐隐（500ms）
- 完美对齐：白色闪光 + 文字上浮（400ms）
- 视角滚动：平滑上移（300ms ease-out）
- 游戏结束：剩余木块依次掉落

### 布局

#### 单人模式

```
┌───────────────────────────────────┐
│   得分: 120  等级: 3  连击: 5     │
│                                   │
│   ┌───────────────────────────┐   │
│   │                           │   │
│   │      Canvas 游戏区域      │   │
│   │    （居中，最大 400px）    │   │
│   │                           │   │
│   └───────────────────────────┘   │
│                                   │
│         [点击屏幕放下木头]         │
└───────────────────────────────────┘
```

#### 双人模式

```
┌─────────────────────────────────────────────┐
│  PlayerBar: 房间号 | 玩家列表 | 操作按钮    │
├────────────────────┬────────────────────────┤
│  玩家A 得分/等级   │  玩家B 得分/等级       │
│  ┌──────────────┐  │  ┌──────────────────┐  │
│  │              │  │  │                  │  │
│  │  Canvas A    │  │  │   Canvas B       │  │
│  │              │  │  │                  │  │
│  └──────────────┘  │  └──────────────────┘  │
├────────────────────┴────────────────────────┤
│  ChatPanel                                  │
└─────────────────────────────────────────────┘
```

## 技术架构

### 前端

- React 18.3.1 + TypeScript 5.6.3
- Vite 6.0.0 构建
- Twind（运行时 Tailwind CSS）
- Canvas 2D 渲染游戏画面

### 后端

- Cloudflare Workers + Durable Objects
- WebSocket 实时通信

### 复用组件（来自通用模式）

| 组件/Hook | 用途 |
|-----------|------|
| `PlayerBar` | 房间信息栏（房间号、玩家列表、操作按钮） |
| `ChatPanel` | 游戏内聊天 |
| `Confetti` | 胜利纸屑特效 |
| `CountdownOverlay` | 倒计时动画（3-2-1-GO） |
| `useWebSocket` | WebSocket 连接管理（心跳 + 自动重连） |
| `useSound` | 合成音效 |

### 新建组件

| 组件 | 用途 |
|------|------|
| `StackCanvas` | Canvas 游戏渲染引擎，接收游戏状态，渲染木块堆叠 |

### 项目结构

```
duimutou/
├── src/
│   ├── main.tsx                # 入口，Twind 初始化
│   ├── App.tsx                 # 路由与会话管理
│   ├── api.ts                  # HTTP/WS 基址
│   ├── pages/
│   │   ├── Home.tsx            # 首页（模式选择、房间创建/加入）
│   │   ├── Room.tsx            # 双人对战页面
│   │   └── SinglePlayer.tsx    # 单人模式页面
│   ├── components/
│   │   ├── StackCanvas.tsx     # Canvas 游戏渲染
│   │   ├── PlayerBar.tsx       # 房间信息栏
│   │   ├── ChatPanel.tsx       # 聊天面板
│   │   ├── CountdownOverlay.tsx # 倒计时
│   │   ├── GameResultModal.tsx # 游戏结果弹窗
│   │   └── Confetti.tsx        # 胜利特效
│   ├── hooks/
│   │   ├── useWebSocket.ts     # WebSocket 管理
│   │   ├── useSound.ts         # 音效
│   │   └── useStackGame.ts     # 堆木头游戏核心逻辑 hook
│   ├── types/
│   │   └── protocol.ts         # 通信协议类型
│   └── utils/
│       └── stack.ts            # 游戏核心计算（切割、得分等）
├── worker/
│   ├── src/
│   │   ├── index.ts            # Worker HTTP 路由
│   │   └── room.ts             # StackRoom Durable Object
│   ├── wrangler.toml
│   └── package.json
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.node.json
```

## 通信协议

### 客户端 → 服务端

| 消息 | 字段 | 说明 |
|------|------|------|
| `join` | `playerName`, `playerId?` | 加入/重连房间 |
| `ready` | — | 标记已准备 |
| `startGame` | — | 房主开始游戏 |
| `drop` | — | 放下木块（服务端根据时间戳计算当前位置） |
| `gameOver` | `score`, `layer`, `combo` | 通知自己游戏结束 |
| `chat` | `text` | 聊天消息 |
| `playAgain` | — | 再来一局 |
| `transferOwner` | — | 转让房主 |
| `leave` | — | 离开房间 |
| `ping` | — | 心跳 |

### 服务端 → 客户端

| 消息 | 字段 | 说明 |
|------|------|------|
| `roomState` | 完整房间状态 | 连接/重连时发送 |
| `playerJoined` | 玩家信息 | 新玩家加入 |
| `playerLeft` | `playerId` | 玩家离开 |
| `phaseChange` | `phase` | 阶段变更 |
| `gameStart` | `gameStartsAt` | 游戏开始（含倒计时时间戳） |
| `playerDropped` | `playerId`, `score`, `layer`, `combo`, `blockWidth` | 玩家放下木块的结果 |
| `playerGameOver` | `playerId`, `finalScore`, `finalLayer` | 某玩家游戏结束 |
| `gameEnd` | `winnerId`, `winnerName`, `reason`, `scores` | 整局结束 |
| `readyChanged` | `playerId`, `ready` | 准备状态变更 |
| `chat` | `playerId`, `playerName`, `text` | 聊天 |
| `roomClosed` | — | 房间关闭 |
| `error` | `message` | 错误 |

## 双人同步机制

### 核心原则

木块的水平移动动画是**纯客户端本地驱动**的，不需要通过 WebSocket 同步位置。同步的是**事件**而非**状态**。

### 同步流程

1. 游戏开始时，服务端广播 `gameStart`，包含 `gameStartsAt` 时间戳
2. 两个客户端各自独立启动木块移动动画
3. 玩家点击放下木块 → 客户端计算切割结果（乐观更新本地画面）→ 发送 `drop` 消息
4. 服务端收到 `drop` → 信任客户端计算结果 → 广播 `playerDropped` 给对手
5. 对手客户端收到 `playerDropped` → 更新对方的 Canvas 显示（添加新木块，播放切割动画）
6. 某方 gameOver → 发送 `gameOver` → 服务端判定胜负 → 广播 `gameEnd`

### 对手画面渲染

对手的 Canvas 不需要实时显示移动动画，只需显示已堆叠的木块结果。每收到一个 `playerDropped` 消息，就在对手画面上添加一层新木块。

## 游戏阶段

| 阶段 | 说明 |
|------|------|
| `waiting` | 等待第二个玩家加入 |
| `readying` | 两人都在，等待准备和开始 |
| `playing` | 游戏进行中（3秒倒计时后开始） |
| `ended` | 游戏结束，显示结果 |

## 音效设计

复用 `useSound` hook 的合成音效模式：

| 音效 | 触发时机 |
|------|---------|
| `drop` | 放下木块 |
| `perfect` | 完美对齐 |
| `cut` | 切割木块 |
| `levelUp` | 升级 |
| `gameOver` | 游戏结束 |
| `win` | 胜利 |
| `lose` | 失败 |
| `tick` | 倒计时 |
| `go` | 开始 |

## 胜负判定

| 场景 | 结果 |
|------|------|
| A 掉落，B 存活 | B 获胜（reason: `opponent_failed`） |
| A 和 B 同一轮都掉落 | 比较总分，高者胜（reason: `score`） |
| 双方都超过 50 层 | 比较总分，高者胜（reason: `score`） |
| 一方断线超过 30 秒 | 另一方获胜（reason: `disconnect`） |
| 一方投降 | 另一方获胜（reason: `surrender`） |

## 主题色

使用暖色调木头主题色：
- primary: `#b5854b`（木头棕）
- primary-dark: `#8B6914`（深木棕）
- game-bg: `#2c1810`（深棕背景）
- game-panel: `#3d2317`（面板棕）
