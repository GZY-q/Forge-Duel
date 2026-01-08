# Forge Duel - 功能模块说明文档

## 1. 系统概览

本项目是一个基于 Web 的多人在线对战游戏（IO 类），采用前后端分离架构。
- **前端**: HTML5 + JavaScript, 使用 Phaser 3 游戏引擎负责渲染和交互。
- **后端**: Node.js + Express, 使用 Socket.IO 实现实时通信, MongoDB 存储玩家数据。

---

## 2. 核心功能模块详细说明

### 2.1 用户认证与账户模块 (User Authentication Module)
负责玩家的身份验证和账户数据管理。

- **主要功能**:
    - **注册/登录**: 支持用户名/密码注册和登录，防重名检测。
    - **会话管理**: 基于 `express-session` 和 `connect-mongo` 的持久化会话。
    - **数据存储**: 使用 MongoDB (`User` 模型) 存储用户基础信息（用户名、密码哈希）及游戏数据（最高分、总杀敌数等）。
    - **API 接口**: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`。

- **相关文件**:
    - `server.js` (路由配置)
    - `routes/auth.js` (认证逻辑)
    - `models/User.js` (数据库模型)

### 2.2 游戏服务端核心模块 (Server Game Core Module)
负责维护权威的游戏状态，处理游戏逻辑循环。

- **主要功能**:
    - **心跳循环**: 固定频率 (`GAME_UPDATE_INTERVAL`) 更新游戏状态。
    - **状态同步**: 实时广播所有实体（玩家、Bot、宝箱、子弹）的状态变化。
    - **实体管理**:
        - **玩家/Bot**: 创建、更新位置、销毁、重生逻辑 (Respawn)。
        - **宝箱 (Chests)**: 定时生成 (`chestSpawnTimer`)、生命值管理、掉落逻辑。
        - **道具 (Buffs)**: 掉落物生成、拾取判定、效果过期检查 (`buffCheckTimer`)。
    - **游戏阶段 (Game States)**: 处理 "战斗阶段" 与 "间歇/选择阶段" 的流转。

- **相关文件**:
    - `server.js`

### 2.3 实时通信与网络模块 (Networking Module)
基于 Socket.IO 的双向实时通信系统。

- **主要功能**:
    - **连接处理**: 处理玩家 `connection`/`disconnect`，分配 `socketId`。
    - **事件协议**:
        - **客户端 -> 服务端**: `playerInput` (移动), `shoot` (射击), `collectPowerUp` (拾取), `emoji` (表情), `ping` (延迟检测)。
        - **服务端 -> 客户端**: `currentPlayers` (初始快照), `newPlayer`, `playerMoved`, `chestSpawned`, `updateLeaderboard`, `missileFired` 等。
    - **延迟优化**: 实现简单的客户端预测和插值逻辑的基础支持。

### 2.4 客户端游戏引擎模块 (Client Game Engine Module)
基于 Phaser 3 的前端渲染与逻辑处理。

- **主要功能**:
    - **资源加载 (Preload)**: 加载图片 (飞船, 子弹, 背景), 音频 (BGM, 音效), 图集。
    - **场景管理 (Scenes)**:
        - `Preload`: 资源预加载与进度条。
        - `Create`: 初始化游戏对象、UI层、事件监听器。
        - `Update`: 每一帧的逻辑调用 (输入轮询, 物理更新)。
    - **物理与碰撞**: 使用 Arcade Physics 进行客户端的预判碰撞检测（如子弹击中、拾取道具）。
    - **渲染层**: 动态渲染飞船、粒子特效 (尾焰, 爆炸)、UI 元素。

- **相关文件**:
    - `public/js/game.js`

### 2.5 战斗系统模块 (Combat System Module)
定义游戏内的战斗交互规则。

- **主要功能**:
    - **武器系统**:
        - **普通子弹**: 直线飞行，固定伤害。
        - **追踪导弹**: `fireTrackingMissile`，自动锁定最近敌人进行追踪 (Lerp 插值)。
    - **生命值与护盾**:
        - 血量扣除与死亡判定。
        - 护盾系统 (Shield): 抵挡伤害，具有独立的护盾值和可视化效果。
    - **击杀奖励**: 击杀玩家/Bot 后掉落能量/分数，更新排行榜。

### 2.6 AI 智能体模块 (AI Bot Module)
用于填充游戏世界的 NPC。

- **主要功能**:
    - **自动生成**: 只要数量不足 (`BOT_COUNT`) 自动补充 Bot。
    - **行为逻辑**:
        - 随机游荡移动 (`targetX`, `targetY`)。
        - 范围检测索敌。
        - **特殊攻击**: 激光圈攻击 (AOE 伤害检测)。
    
- **相关文件**:
    - `server.js` (Bot 创建与更新逻辑)

### 2.7 UI 与交互模块 (UI & Interaction Module)
负责用户界面展示及操作响应，包含移动端适配。

- **主要功能**:
    - **登录界面**: HTML/CSS 表单，包含昵称输入、服务器消息提示。
    - **HUD (平视显示器)**:
        - 排行榜 (Leaderboard): 实时显示前几名玩家分数。
        - 状态栏: 血条、护盾条、CD 冷却指示。
        - 小地图/雷达 (如有)。
        - 系统通知: 击杀提示、游戏阶段倒计时。
    - **输入控制**:
        - **PC**: 键盘 (WASD/箭头) + 鼠标 (瞄准/射击) + 快捷键 (M 发表情)。
        - **Mobile**: 虚拟摇杆 (Joystick) 控制移动，触摸按钮控制射击/加速。

- **相关文件**:
    - `public/index.html`
    - `public/js/game.js` (UI 绘制部分)

### 2.8 音频管理模块 (Audio Management Module)
增强游戏沉浸感的音效系统。

- **主要功能**:
    - **背景音乐 (BGM)**: 登录页与游戏内无缝切换，音量控制。
    - **音效 (SFX)**: 射击 (`shoot`), 命中, 爆炸, 拾取道具 (`collect`), 升级, 胜利/失败音效。
    - **空间音效**: (部分支持) 根据距离调整音量大小。

---

## 3. 目录结构说明

```
Forge-Duel/
├── server.js                # 后端入口与主逻辑
├── models/                  # 数据库模型
│   └── User.js              # 用户数据结构
├── routes/                  # API 路由
│   └── auth.js              # 认证相关接口
├── public/                  # 静态资源与前端代码
│   ├── index.html           # 游戏入口页面
│   ├── assets/              # 图片、音频资源
│   └── js/
│       └── game.js          # 前端游戏核心逻辑
└── .env                     # 环境变量配置
```
