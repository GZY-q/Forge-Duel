require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forge-duel')
    .then(() => console.log('MongoDB连接成功'))
    .catch(err => console.error('MongoDB连接失败:', err));

// Session配置
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/forge-duel',
        touchAfter: 24 * 3600
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// 认证路由
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 引入User模型
const User = require('./models/User');

// 排行榜API
app.get('/api/leaderboard', async (req, res) => {
    try {
        const topPlayers = await User.find({}, 'nickname highestScore')
            .sort({ highestScore: -1 })
            .limit(10);
        res.json({ success: true, leaderboard: topPlayers });
    } catch (error) {
        console.error('获取排行榜失败:', error);
        res.status(500).json({ success: false, message: '获取排行榜失败' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// ============= 游戏逻辑模块 =============

// 游戏状态
const GAME_DURATION = 3 * 60 * 1000;
let gameEndTime = Date.now() + GAME_DURATION;
let isIntermission = false;
let intermissionEndTime = 0;

// 游戏实体
const players = {};
const powerUps = {};
const chests = {};
let powerUpIdCounter = 0;
let chestIdCounter = 0;
let botIdCounter = 0;

// 游戏配置
const MAX_CHESTS_PER_GAME = 4;
const BOT_COUNT = 3;
const CHEST_SPAWN_INTERVAL = 30000;
const BOT_UPDATE_INTERVAL = 50;
const BUFF_CHECK_INTERVAL = 1000;
const GAME_UPDATE_INTERVAL = 1000;

// 全局定时器引用（防止泄漏）
let chestSpawnTimer = null;
let botUpdateTimer = null;
let buffCheckTimer = null;
let gameUpdateTimer = null;

// ============= 工具函数 =============

// 创建玩家数据结构
function createPlayerData(socketId, playerName, username = null, userId = null, dbHighestScore = 0) {
    return {
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: socketId,
        health: 100,
        score: 0,
        name: playerName,
        weaponLevel: 1,
        username: username,
        userId: userId,
        dbHighestScore: dbHighestScore,
        hasVampire: false,
        hasShield: false,
        shieldHealth: 0,
        hasGoldenBody: false,
        isInvulnerable: false,
        isImmobile: false,
        isBot: false
    };
}

// 重生玩家（统一重生逻辑）
function respawnPlayer(playerId) {
    if (!players[playerId]) return;

    const player = players[playerId];
    player.score = 0;
    player.health = 100;
    player.weaponLevel = 1;
    player.hasVampire = false;
    player.hasShield = false;
    player.shieldHealth = 0;
    player.hasGoldenBody = false;
    player.isInvulnerable = false;
    player.isImmobile = false;
    player.x = Math.floor(Math.random() * 700) + 50;
    player.y = Math.floor(Math.random() * 500) + 50;

    io.emit('playerRespawn', player);
}

// 处理玩家死亡（统一死亡逻辑）
function handlePlayerDeath(victimId, killerId = null) {
    const victim = players[victimId];
    if (!victim || victim.health > 0) return;

    victim.health = 0;
    io.emit('updateHealth', { playerId: victimId, health: 0 });

    // 击杀者加分
    if (killerId && players[killerId]) {
        players[killerId].score += 100;
        io.emit('updateScore', { playerId: killerId, score: players[killerId].score });
    }

    // 掉落分数球
    const powerUpId = `powerup_${powerUpIdCounter++}`;
    const scoreValue = victim.score + 1;
    powerUps[powerUpId] = {
        id: powerUpId,
        x: victim.x,
        y: victim.y,
        type: 'score',
        value: scoreValue
    };
    io.emit('powerUpDropped', powerUps[powerUpId]);

    // 广播击杀事件
    if (killerId) {
        io.emit('playerKilled', { killerId: killerId, victimId: victimId });
    }

    // 延迟重生
    setTimeout(() => respawnPlayer(victimId), 100);
}

// 保存玩家分数到数据库（统一保存逻辑）
async function savePlayerScore(player, isWinner = false) {
    if (!player || !player.userId) return;

    try {
        const updates = { $inc: { totalGames: 1 } };

        // 检查是否打破纪录
        if (player.score > player.dbHighestScore) {
            updates.highestScore = player.score;
            player.dbHighestScore = player.score;
        }

        // 增加胜场
        if (isWinner && player.score > 0) {
            updates.$inc.totalWins = 1;
        }

        await User.findByIdAndUpdate(player.userId, updates);
        console.log(`保存了用户 ${player.username} 的分数`);
    } catch (err) {
        console.error('保存分数失败:', err);
    }
}

// 创建Bot
function createBot() {
    const id = `bot_${botIdCounter++}`;
    players[id] = {
        ...createPlayerData(id, `AI-Bot-${botIdCounter}`, null, null, 0),
        isBot: true,
        targetX: Math.random() * 1600,
        targetY: Math.random() * 1200,
        lastShot: 0,
        moveTimer: 0,
        lastDamageTime: 0
    };
    io.emit('newPlayer', players[id]);
}

// ============= 全局定时器（只创建一次） =============

// 游戏计时器
gameUpdateTimer = setInterval(() => {
    if (isIntermission) {
        if (Date.now() > intermissionEndTime) {
            // 重置游戏
            isIntermission = false;
            gameEndTime = Date.now() + GAME_DURATION;

            Object.keys(players).forEach(id => respawnPlayer(id));
            Object.keys(powerUps).forEach(key => delete powerUps[key]);
            io.emit('currentPowerUps', powerUps);
            Object.keys(chests).forEach(key => {
                io.emit('chestBroken', key);
                delete chests[key];
            });
            chestIdCounter = 0;
        }
        return;
    }

    const timeLeft = Math.max(0, Math.ceil((gameEndTime - Date.now()) / 1000));
    const leaderboard = Object.values(players)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(p => ({ name: p.name, score: p.score, id: p.playerId }));

    io.emit('gameUpdate', { timeLeft, leaderboard });

    if (timeLeft <= 0) {
        const winner = leaderboard[0];
        io.emit('gameOver', { winnerName: winner ? winner.name : "无人" });

        // 保存所有玩家分数
        Object.values(players).forEach(async (player) => {
            const isWinner = winner && winner.id === player.playerId;
            await savePlayerScore(player, isWinner);
        });

        isIntermission = true;
        intermissionEndTime = Date.now() + 8000;
    }
}, GAME_UPDATE_INTERVAL);

// 宝箱生成定时器
chestSpawnTimer = setInterval(() => {
    // 间歇期不生成宝箱
    if (isIntermission) return;

    if (Object.keys(chests).length < MAX_CHESTS_PER_GAME) {
        const chestId = `chest_${chestIdCounter++}`;
        chests[chestId] = {
            id: chestId,
            x: Math.floor(Math.random() * 400) + 600,
            y: Math.floor(Math.random() * 800) + 200,
            health: 30,
            maxHealth: 30
        };
        io.emit('chestSpawned', chests[chestId]);
    }
}, CHEST_SPAWN_INTERVAL);

// Bot更新定时器（节流优化）
botUpdateTimer = setInterval(() => {
    // 间歇期不更新Bot
    if (isIntermission) return;

    // 确保Bot数量
    const currentBots = Object.values(players).filter(p => p.isBot);
    if (currentBots.length < BOT_COUNT) {
        createBot();
    }

    // 更新Bot行为
    const now = Date.now();
    Object.values(players).forEach(bot => {
        if (!bot.isBot) return;

        // 移动逻辑
        if (now > bot.moveTimer) {
            bot.targetX = Math.floor(Math.random() * 1400) + 100;
            bot.targetY = Math.floor(Math.random() * 1000) + 100;
            bot.moveTimer = now + 2000 + Math.random() * 2000;
        }

        const dx = bot.targetX - bot.x;
        const dy = bot.targetY - bot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 10;

        if (dist > 10) {
            bot.x += (dx / dist) * speed;
            bot.y += (dy / dist) * speed;
            bot.rotation = Math.atan2(dy, dx) + 1.57;
            io.emit('playerMoved', bot);
        }

        // 激光圈攻击
        const ATTACK_RADIUS = 120;
        const DAMAGE_INTERVAL = 500;
        const DAMAGE = 15;

        if (!bot.lastDamageTime) bot.lastDamageTime = 0;

        if (now - bot.lastDamageTime > DAMAGE_INTERVAL) {
            Object.values(players).forEach(player => {
                if (player.isBot || player.health <= 0) return;

                const pdx = player.x - bot.x;
                const pdy = player.y - bot.y;
                const pDist = Math.sqrt(pdx * pdx + pdy * pdy);

                if (pDist < ATTACK_RADIUS) {
                    if (player.isInvulnerable) return;

                    let actualDamage = DAMAGE;

                    // 护盾逻辑
                    if (player.hasShield) {
                        if (player.shieldHealth >= actualDamage) {
                            player.shieldHealth -= actualDamage;
                            actualDamage = 0;
                        } else {
                            actualDamage -= player.shieldHealth;
                            player.shieldHealth = 0;
                            player.hasShield = false;
                            io.emit('playerPowerUpExpired', { playerId: player.playerId, type: 'shield' });
                        }
                        io.emit('playerShieldUpdate', { playerId: player.playerId, shieldHealth: player.shieldHealth });
                    }

                    if (actualDamage > 0) {
                        player.health -= actualDamage;
                        if (player.health < 0) player.health = 0;
                        io.emit('updateHealth', { playerId: player.playerId, health: player.health });

                        if (player.health <= 0) {
                            handlePlayerDeath(player.playerId, bot.playerId);
                        }
                    }
                }
            });
            bot.lastDamageTime = now;
        }
    });
}, BOT_UPDATE_INTERVAL);

// Buff检查定时器（全局，不是每个连接一个）
buffCheckTimer = setInterval(() => {
    const now = Date.now();
    Object.keys(players).forEach(id => {
        if (!players[id]) return;

        // 检查吸血过期
        if (players[id].hasVampire && players[id].vampireExpires && now > players[id].vampireExpires) {
            players[id].hasVampire = false;
            io.emit('playerPowerUpExpired', { playerId: id, type: 'vampire' });
        }

        // 检查护盾过期
        if (players[id].hasShield && players[id].shieldExpires && now > players[id].shieldExpires) {
            players[id].hasShield = false;
            players[id].shieldHealth = 0;
            io.emit('playerPowerUpExpired', { playerId: id, type: 'shield' });
        }
    });
}, BUFF_CHECK_INTERVAL);

// ============= Socket.IO 事件处理 =============

io.on('connection', (socket) => {
    console.log('用户连接: ' + socket.id);

    // 发送当前游戏状态
    socket.emit('currentPowerUps', powerUps);
    socket.emit('currentChests', chests);

    // 加入游戏
    socket.on('joinGame', async (data) => {
        const playerName = typeof data === 'object' ? data.playerName : data;
        const username = typeof data === 'object' ? data.username : null;

        let userId = null;
        let dbHighestScore = 0;

        if (username) {
            try {
                const user = await User.findOne({ username });
                if (user) {
                    userId = user._id;
                    dbHighestScore = user.highestScore || 0;
                }
            } catch (err) {
                console.error('查找用户失败:', err);
            }
        }

        players[socket.id] = createPlayerData(socket.id, playerName, username, userId, dbHighestScore);
        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    // 玩家断开（清理工作）
    socket.on('disconnect', async () => {
        console.log('用户断开: ' + socket.id);

        const player = players[socket.id];
        if (player) {
            // 保存分数
            await savePlayerScore(player, false);

            // 清理玩家数据
            delete players[socket.id];
            io.emit('playerDisconnected', socket.id);
        }
    });

    // 玩家移动
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            if (players[socket.id].isImmobile) return;

            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].rotation = movementData.rotation;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // 玩家射击
    socket.on('playerShoot', () => {
        if (players[socket.id]) {
            socket.broadcast.emit('playerFired', players[socket.id]);
        }
    });

    // 玩家受击
    socket.on('playerHit', (damage, attackerId) => {
        if (!players[socket.id] || players[socket.id].health <= 0 || players[socket.id].isInvulnerable) return;

        let actualDamage = damage;

        // 护盾逻辑
        if (players[socket.id].hasShield) {
            if (players[socket.id].shieldHealth >= actualDamage) {
                players[socket.id].shieldHealth -= actualDamage;
                actualDamage = 0;
            } else {
                actualDamage -= players[socket.id].shieldHealth;
                players[socket.id].shieldHealth = 0;
                players[socket.id].hasShield = false;
                io.emit('playerPowerUpExpired', { playerId: socket.id, type: 'shield' });
            }

            if (players[socket.id].hasShield) {
                io.emit('playerShieldUpdate', { playerId: socket.id, shieldHealth: players[socket.id].shieldHealth });
            }
        }

        players[socket.id].health -= actualDamage;

        // 吸血逻辑
        if (attackerId && players[attackerId] && players[attackerId].hasVampire && !players[attackerId].isBot) {
            const healAmount = damage * 0.5;
            players[attackerId].health += healAmount;
            if (players[attackerId].health > 200) players[attackerId].health = 200;
            io.emit('updateHealth', { playerId: attackerId, health: players[attackerId].health });
        }

        if (players[socket.id].health <= 0) {
            handlePlayerDeath(socket.id, attackerId);
        } else {
            io.emit('updateHealth', { playerId: socket.id, health: players[socket.id].health });
        }
    });

    // 宝箱受击
    socket.on('chestHit', (chestId, damage) => {
        if (!chests[chestId]) return;

        chests[chestId].health -= damage;
        io.emit('chestDamaged', { id: chestId, health: chests[chestId].health });

        if (chests[chestId].health <= 0) {
            const chest = chests[chestId];
            delete chests[chestId];
            io.emit('chestBroken', chest.id);

            // 掉落装备
            const powerUpId = `powerup_${powerUpIdCounter++}`;
            const rand = Math.random();
            let type;
            if (rand < 0.33) type = 'vampire';
            else if (rand < 0.66) type = 'shield';
            else if (rand < 0.85) type = 'tracking';
            else type = 'golden_body';

            powerUps[powerUpId] = {
                id: powerUpId,
                x: chest.x,
                y: chest.y,
                type: type,
                value: 0
            };
            io.emit('powerUpDropped', powerUps[powerUpId]);
        }
    });

    // 玩家拾取道具
    socket.on('playerCollectPowerUp', (powerUpId) => {
        if (!powerUps[powerUpId] || !players[socket.id]) return;

        const powerUp = powerUps[powerUpId];
        delete powerUps[powerUpId];
        io.emit('powerUpCollected', powerUpId);

        if (powerUp.type === 'vampire') {
            players[socket.id].hasVampire = true;
            players[socket.id].vampireExpires = Date.now() + 20000;
            io.emit('playerPowerUpActive', { playerId: socket.id, type: 'vampire', duration: 20000 });
        } else if (powerUp.type === 'shield') {
            players[socket.id].hasShield = true;
            players[socket.id].shieldHealth = 100;
            players[socket.id].shieldExpires = Date.now() + 30000;
            io.emit('playerPowerUpActive', { playerId: socket.id, type: 'shield', value: 100, duration: 30000 });
        } else if (powerUp.type === 'tracking') {
            // 优先追踪真人玩家
            let otherPlayerIds = Object.keys(players).filter(id => id !== socket.id && !players[id].isBot);
            if (otherPlayerIds.length === 0) {
                otherPlayerIds = Object.keys(players).filter(id => id !== socket.id && players[id].isBot);
            }
            if (otherPlayerIds.length > 0) {
                const targetId = otherPlayerIds[Math.floor(Math.random() * otherPlayerIds.length)];
                io.emit('playerPowerUpActive', { playerId: socket.id, type: 'tracking', targetId: targetId });
            }
        } else if (powerUp.type === 'score' || !powerUp.type) {
            const value = powerUp.value || 1;
            players[socket.id].weaponLevel = Math.min(players[socket.id].weaponLevel + 1, 3);
            players[socket.id].score += value;
            io.emit('updateWeaponLevel', { playerId: socket.id, weaponLevel: players[socket.id].weaponLevel });
        } else if (powerUp.type === 'golden_body') {
            players[socket.id].hasGoldenBody = true;
            io.emit('playerObtainSkill', { playerId: socket.id, skill: 'golden_body' });
        }
    });

    // 使用技能
    socket.on('playerUseSkill', (skillName) => {
        if (!players[socket.id]) return;

        if (skillName === 'golden_body' && players[socket.id].hasGoldenBody) {
            players[socket.id].hasGoldenBody = false;
            players[socket.id].isInvulnerable = true;
            players[socket.id].isImmobile = true;

            io.emit('playerUseSkill', { playerId: socket.id, skill: 'golden_body', duration: 3000 });

            setTimeout(() => {
                if (players[socket.id]) {
                    players[socket.id].isInvulnerable = false;
                    players[socket.id].isImmobile = false;
                    io.emit('playerSkillEnd', { playerId: socket.id, skill: 'golden_body' });
                }
            }, 3000);
        }
    });

    // 发送表情
    socket.on('sendEmote', (emoteId) => {
        if (players[socket.id]) {
            io.emit('playerEmote', { playerId: socket.id, emoteId: emoteId });
        }
    });

    // 追踪导弹命中
    socket.on('trackingMissileHit', (targetId) => {
        if (!players[targetId] || players[targetId].health <= 0 || players[targetId].isInvulnerable) return;

        let damage = 45;

        // 护盾逻辑
        if (players[targetId].hasShield) {
            if (players[targetId].shieldHealth >= damage) {
                players[targetId].shieldHealth -= damage;
                damage = 0;
            } else {
                damage -= players[targetId].shieldHealth;
                players[targetId].shieldHealth = 0;
                players[targetId].hasShield = false;
                io.emit('playerPowerUpExpired', { playerId: targetId, type: 'shield' });
            }

            if (players[targetId].hasShield) {
                io.emit('playerShieldUpdate', { playerId: targetId, shieldHealth: players[targetId].shieldHealth });
            }
        }

        players[targetId].health -= damage;

        // 吸血逻辑
        if (players[socket.id] && players[socket.id].hasVampire && !players[socket.id].isBot) {
            const healAmount = damage * 0.5;
            players[socket.id].health += healAmount;
            if (players[socket.id].health > 200) players[socket.id].health = 200;
            io.emit('updateHealth', { playerId: socket.id, health: players[socket.id].health });
        }

        if (players[targetId].health <= 0) {
            handlePlayerDeath(targetId, socket.id);
        } else {
            io.emit('updateHealth', { playerId: targetId, health: players[targetId].health });
        }
    });

    // Bot受击
    socket.on('botHit', (botId, damage) => {
        const bot = players[botId];
        if (!bot || !bot.isBot || bot.health <= 0) return;

        bot.health -= damage;
        io.emit('updateHealth', { playerId: botId, health: bot.health });

        // 吸血逻辑
        if (players[socket.id] && players[socket.id].hasVampire) {
            const healAmount = damage * 0.5;
            players[socket.id].health += healAmount;
            if (players[socket.id].health > 200) players[socket.id].health = 200;
            io.emit('updateHealth', { playerId: socket.id, health: players[socket.id].health });
        }

        if (bot.health <= 0) {
            handlePlayerDeath(botId, socket.id);

            // 掉落强力道具
            const powerUpId = `powerup_${powerUpIdCounter++}`;
            const rand = Math.random();
            let type;
            if (rand < 0.33) type = 'vampire';
            else if (rand < 0.66) type = 'shield';
            else if (rand < 0.85) type = 'tracking';
            else type = 'golden_body';

            powerUps[powerUpId] = {
                id: powerUpId,
                x: bot.x,
                y: bot.y,
                type: type,
                value: 0
            };
            io.emit('powerUpDropped', powerUps[powerUpId]);

            // 移除Bot
            delete players[botId];
            io.emit('playerDisconnected', botId);
        }
    });
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在优雅关闭...');
    clearInterval(gameUpdateTimer);
    clearInterval(chestSpawnTimer);
    clearInterval(botUpdateTimer);
    clearInterval(buffCheckTimer);
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

server.listen(8080, () => {
    console.log('Server is running on port 8080');
});
