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
        touchAfter: 24 * 3600 // 24小时内不重复更新session
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7天
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' // 生产环境使用HTTPS
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
        // 获取最高分前10名，按分数降序排列
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

const GAME_DURATION = 3 * 60 * 1000; // 3分钟
let gameEndTime = Date.now() + GAME_DURATION;
let isIntermission = false;
let intermissionEndTime = 0;

// 游戏循环：更新计时器和排行榜
setInterval(() => {
    if (isIntermission) {
        if (Date.now() > intermissionEndTime) {
            // 间歇结束，重置游戏
            isIntermission = false;
            gameEndTime = Date.now() + GAME_DURATION;

            Object.keys(players).forEach(id => {
                players[id].score = 0;
                players[id].health = 100;
                players[id].weaponLevel = 1;
                players[id].x = Math.floor(Math.random() * 700) + 50;
                players[id].y = Math.floor(Math.random() * 500) + 50;
                io.emit('playerRespawn', players[id]);
            });
            // 清除能量球
            Object.keys(powerUps).forEach(key => delete powerUps[key]);
            io.emit('currentPowerUps', powerUps);

            // 清除所有宝箱
            Object.keys(chests).forEach(key => {
                io.emit('chestBroken', key);
                delete chests[key];
            });
            chestIdCounter = 0;
        }
        return; // 间歇期不发送更新
    }

    const timeLeft = Math.max(0, Math.ceil((gameEndTime - Date.now()) / 1000));

    // 发送排行榜
    const leaderboard = Object.values(players)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(p => ({ name: p.name, score: p.score, id: p.playerId }));

    io.emit('gameUpdate', { timeLeft, leaderboard });

    if (timeLeft <= 0) {
        // 游戏结束
        const winner = leaderboard[0];
        io.emit('gameOver', { winnerName: winner ? winner.name : "无人" });

        // 更新数据库中的分数和统计
        Object.values(players).forEach(async (player) => {
            if (player.userId) {
                try {
                    const updates = { $inc: { totalGames: 1 } };

                    // 检查是否打破纪录
                    if (player.score > player.dbHighestScore) {
                        updates.highestScore = player.score;
                        // 更新内存中的最高分
                        player.dbHighestScore = player.score;
                    }

                    // 增加胜场（如果是第一名且有分数）
                    if (winner && winner.id === player.playerId && player.score > 0) {
                        updates.$inc.totalWins = 1;
                    }

                    await User.findByIdAndUpdate(player.userId, updates);
                } catch (err) {
                    console.error('游戏结束更新分数失败:', err);
                }
            }
        });

        // 进入间歇期
        isIntermission = true;
        intermissionEndTime = Date.now() + 8000;
    }
}, 1000);

const players = {};
const powerUps = {};
let powerUpIdCounter = 0;

// 宝箱逻辑 - 全局作用域
const chests = {};
let chestIdCounter = 0;
const MAX_CHESTS_PER_GAME = 4; // 每局最多4个宝箱

// 定时生成宝箱 - 全局定时器
setInterval(() => {
    if (Object.keys(chests).length < MAX_CHESTS_PER_GAME) { // Check current number of chests
        const chestId = `chest_${chestIdCounter++}`;
        chests[chestId] = {
            id: chestId,
            x: Math.floor(Math.random() * 400) + 600, // 地图中间区域 (假设地图宽1600，取中间600-1000)
            y: Math.floor(Math.random() * 800) + 200, // 地图中间区域 (假设地图高1200，取中间200-1000)
            health: 30, // 宝箱血量
            maxHealth: 30
        };
        io.emit('chestSpawned', chests[chestId]);
    }
}, 30000); // 每30秒生成一个

io.on('connection', (socket) => {
    console.log('a user connected: ' + socket.id);

    // 向新玩家发送当前的能量球
    socket.emit('currentPowerUps', powerUps);

    // 向新玩家发送当前的宝箱
    socket.emit('currentChests', chests);

    socket.on('joinGame', async (data) => {
        // 兼容旧代码：如果data是字符串，则是playerName；如果是对象，则包含playerName和username
        const playerName = typeof data === 'object' ? data.playerName : data;
        const username = typeof data === 'object' ? data.username : null;

        let userId = null;
        let dbHighestScore = 0;

        // 如果提供了用户名，查找数据库中的用户ID和历史最高分
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

        players[socket.id] = {
            x: Math.floor(Math.random() * 700) + 50,
            y: Math.floor(Math.random() * 500) + 50,
            playerId: socket.id,
            health: 100,
            score: 0,
            name: playerName,
            weaponLevel: 1,
            // 存储数据库相关信息
            username: username,
            userId: userId,
            dbHighestScore: dbHighestScore,
            // 技能状态
            hasGoldenBody: false,
            isInvulnerable: false,
            isImmobile: false
        };

        // 向新玩家发送玩家对象
        socket.emit('currentPlayers', players);

        // 向其他玩家更新新玩家信息
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    socket.on('disconnect', async () => {
        console.log('user disconnected: ' + socket.id);

        // 保存分数逻辑
        const player = players[socket.id];
        if (player && player.userId && player.score > player.dbHighestScore) {
            try {
                await User.findByIdAndUpdate(player.userId, {
                    highestScore: player.score,
                    $inc: { totalGames: 1 } // 增加游戏场次
                });
                console.log(`更新了用户 ${player.username} 的最高分: ${player.score}`);
            } catch (err) {
                console.error('更新分数失败:', err);
            }
        } else if (player && player.userId) {
            // 即使没破纪录，也增加场次
            try {
                await User.findByIdAndUpdate(player.userId, { $inc: { totalGames: 1 } });
            } catch (err) { }
        }

        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            // 如果处于定身状态，忽略移动请求
            if (players[socket.id].isImmobile) return;

            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].rotation = movementData.rotation;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('playerShoot', () => {
        if (players[socket.id]) {
            socket.broadcast.emit('playerFired', players[socket.id]);
        }
    });

    socket.on('playerHit', (damage, attackerId) => {
        if (players[socket.id]) {
            if (players[socket.id].health <= 0) return;
            // 金身无敌状态
            if (players[socket.id].isInvulnerable) return;

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
                // 通知护盾变化
                if (players[socket.id].hasShield) {
                    io.emit('playerShieldUpdate', { playerId: socket.id, shieldHealth: players[socket.id].shieldHealth });
                }
            }

            players[socket.id].health -= actualDamage;

            // 吸血逻辑 (攻击真人玩家可突破血量上限)
            if (attackerId && players[attackerId] && players[attackerId].hasVampire && !players[attackerId].isBot) {
                const healAmount = damage * 0.5;
                players[attackerId].health += healAmount;
                // 设置最大血量上限为200
                if (players[attackerId].health > 200) {
                    players[attackerId].health = 200;
                }
                io.emit('updateHealth', { playerId: attackerId, health: players[attackerId].health });
            }

            if (players[socket.id].health <= 0) {
                players[socket.id].health = 0; // 确保血量不为负数
                // 先发送血量归零的消息
                io.emit('updateHealth', { playerId: socket.id, health: 0 });

                // 击杀者加分 (击杀 +100)
                if (attackerId && players[attackerId]) {
                    players[attackerId].score += 100;
                    io.emit('updateScore', { playerId: attackerId, score: players[attackerId].score });
                }

                // 掉落包含分数的能量球
                const powerUpId = `powerup_${powerUpIdCounter++}`;
                // 值为当前分数 + 1（基础值）
                const scoreValue = players[socket.id].score + 1;

                powerUps[powerUpId] = {
                    id: powerUpId,
                    x: players[socket.id].x,
                    y: players[socket.id].y,
                    type: 'score', // 普通分数球
                    value: scoreValue
                };
                io.emit('powerUpDropped', powerUps[powerUpId]);

                // 广播击杀事件
                if (attackerId) {
                    io.emit('playerKilled', { killerId: attackerId, victimId: socket.id });
                }

                // 延迟100ms发送重生消息，确保血量归零先被看到
                setTimeout(() => {
                    // 重置玩家
                    players[socket.id].score = 0; // 死亡时丢失分数
                    players[socket.id].health = 100;
                    players[socket.id].weaponLevel = 1;
                    players[socket.id].hasVampire = false;
                    players[socket.id].hasShield = false;
                    players[socket.id].shieldHealth = 0;
                    players[socket.id].hasGoldenBody = false;
                    players[socket.id].isInvulnerable = false;
                    players[socket.id].isImmobile = false;
                    players[socket.id].x = Math.floor(Math.random() * 700) + 50;
                    players[socket.id].y = Math.floor(Math.random() * 500) + 50;

                    io.emit('playerRespawn', players[socket.id]);
                }, 100);
            } else {
                // 正常血量更新
                io.emit('updateHealth', { playerId: socket.id, health: players[socket.id].health });
            }
        }
    });

    socket.on('chestHit', (chestId, damage) => {
        if (chests[chestId]) {
            chests[chestId].health -= damage;
            io.emit('chestDamaged', { id: chestId, health: chests[chestId].health });

            if (chests[chestId].health <= 0) {
                // 宝箱破碎
                const chest = chests[chestId];
                delete chests[chestId];
                io.emit('chestBroken', chest.id);

                // 掉落装备 (吸血弹、防护罩、追踪导弹)
                const powerUpId = `powerup_${powerUpIdCounter++}`;
                const rand = Math.random();
                let type;
                if (rand < 0.33) {
                    type = 'vampire';
                } else if (rand < 0.66) {
                    type = 'shield';
                } else if (rand < 0.85) {
                    type = 'tracking';
                } else {
                    type = 'golden_body';
                }

                powerUps[powerUpId] = {
                    id: powerUpId,
                    x: chest.x,
                    y: chest.y,
                    type: type,
                    value: 0 // 装备类道具不直接加分
                };
                io.emit('powerUpDropped', powerUps[powerUpId]);
            }
        }
    });

    socket.on('playerCollectPowerUp', (powerUpId) => {
        if (powerUps[powerUpId]) {
            const powerUp = powerUps[powerUpId];
            delete powerUps[powerUpId];
            io.emit('powerUpCollected', powerUpId);

            if (players[socket.id]) {
                if (powerUp.type === 'vampire') {
                    players[socket.id].hasVampire = true;
                    // 这里简单处理：获得后持续20秒
                    players[socket.id].vampireExpires = Date.now() + 20000;
                    io.emit('playerPowerUpActive', { playerId: socket.id, type: 'vampire', duration: 20000 });
                } else if (powerUp.type === 'shield') {
                    players[socket.id].hasShield = true;
                    players[socket.id].shieldHealth = 100; // 护盾值
                    players[socket.id].shieldExpires = Date.now() + 30000; // 护盾持续30秒
                    io.emit('playerPowerUpActive', { playerId: socket.id, type: 'shield', value: 100, duration: 30000 });
                } else if (powerUp.type === 'tracking') {
                    // 追踪导弹 - 优先选择真人玩家
                    let otherPlayerIds = Object.keys(players).filter(id => id !== socket.id && !players[id].isBot);

                    // 如果没有真人玩家，才选择机器人
                    if (otherPlayerIds.length === 0) {
                        otherPlayerIds = Object.keys(players).filter(id => id !== socket.id && players[id].isBot);
                    }

                    if (otherPlayerIds.length > 0) {
                        const targetId = otherPlayerIds[Math.floor(Math.random() * otherPlayerIds.length)];
                        io.emit('playerPowerUpActive', { playerId: socket.id, type: 'tracking', targetId: targetId });
                    }
                } else if (powerUp.type === 'score' || !powerUp.type) {
                    // 普通分数球（玩家死亡掉落）
                    const value = powerUp.value || 1;
                    players[socket.id].weaponLevel = Math.min(players[socket.id].weaponLevel + 1, 3);
                    players[socket.id].score += value;
                    io.emit('updateWeaponLevel', { playerId: socket.id, weaponLevel: players[socket.id].weaponLevel });
                } else if (powerUp.type === 'golden_body') {
                    players[socket.id].hasGoldenBody = true;
                    io.emit('playerObtainSkill', { playerId: socket.id, skill: 'golden_body' });
                }
            }
        }
    });

    // 使用技能
    socket.on('playerUseSkill', (skillName) => {
        if (players[socket.id]) {
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
        }
    });

    socket.on('sendEmote', (emoteId) => {
        if (players[socket.id]) {
            io.emit('playerEmote', { playerId: socket.id, emoteId: emoteId });
        }
    });

    // 追踪导弹命中
    socket.on('trackingMissileHit', (targetId) => {
        if (players[targetId]) {
            if (players[targetId].health <= 0) return;
            // 金身无敌状态
            if (players[targetId].isInvulnerable) return;

            let damage = 45; // 追踪导弹造45点伤害

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
                // 通知护盾变化
                if (players[targetId].hasShield) {
                    io.emit('playerShieldUpdate', { playerId: targetId, shieldHealth: players[targetId].shieldHealth });
                }
            }

            players[targetId].health -= damage;

            // 吸血逻辑 (攻击真人玩家可突破血量上限)
            if (players[socket.id] && players[socket.id].hasVampire && !players[socket.id].isBot) {
                const healAmount = damage * 0.5;
                players[socket.id].health += healAmount;
                // 设置最大血量上限为200
                if (players[socket.id].health > 200) {
                    players[socket.id].health = 200;
                }
                io.emit('updateHealth', { playerId: socket.id, health: players[socket.id].health });
            }

            if (players[targetId].health <= 0) {
                players[targetId].health = 0;
                io.emit('updateHealth', { playerId: targetId, health: 0 });

                // 击杀者加分 (击杀 +100)
                if (players[socket.id]) {
                    players[socket.id].score += 100;
                    io.emit('updateScore', { playerId: socket.id, score: players[socket.id].score });
                }

                // 掉落包含分数的能量球
                const powerUpId = `powerup_${powerUpIdCounter++}`;
                const scoreValue = players[targetId].score + 1; // Victim's score + 1



                powerUps[powerUpId] = {
                    id: powerUpId,
                    x: players[targetId].x,
                    y: players[targetId].y,
                    type: 'score',
                    value: scoreValue
                };
                io.emit('powerUpDropped', powerUps[powerUpId]);

                // 广播击杀事件
                io.emit('playerKilled', { killerId: socket.id, victimId: targetId });

                setTimeout(() => {
                    // 重置玩家
                    players[targetId].score = 0;
                    players[targetId].health = 100;
                    players[targetId].weaponLevel = 1;
                    players[targetId].hasVampire = false;
                    players[targetId].hasShield = false;
                    players[targetId].shieldHealth = 0;
                    players[targetId].hasGoldenBody = false;
                    players[targetId].isInvulnerable = false;
                    players[targetId].isImmobile = false;
                    players[targetId].x = Math.floor(Math.random() * 700) + 50;
                    players[targetId].y = Math.floor(Math.random() * 500) + 50;

                    io.emit('playerRespawn', players[targetId]);
                }, 100);
            } else {
                io.emit('updateHealth', { playerId: targetId, health: players[targetId].health });
            }
        }
    });

    socket.on('botHit', (botId, damage) => {
        const bot = players[botId];
        if (bot && bot.isBot) {
            if (bot.health <= 0) return;

            bot.health -= damage;
            io.emit('updateHealth', { playerId: botId, health: bot.health });

            // 吸血逻辑 (玩家攻击机器人也能吸血，保持已有的超额血量)
            if (players[socket.id] && players[socket.id].hasVampire) {
                const healAmount = damage * 0.5;
                players[socket.id].health += healAmount;
                // 设置最大血量上限为200
                if (players[socket.id].health > 200) {
                    players[socket.id].health = 200;
                }
                io.emit('updateHealth', { playerId: socket.id, health: players[socket.id].health });
            }

            if (bot.health <= 0) {
                bot.health = 0;

                // 击杀者加分
                if (players[socket.id]) {
                    players[socket.id].score += 100;
                    io.emit('updateScore', { playerId: socket.id, score: players[socket.id].score });
                }

                // 掉落强力道具 (随机一种: 吸血、护盾、追踪导弹)
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

                // 广播击杀
                io.emit('playerKilled', { killerId: socket.id, victimId: botId });

                // 移除Bot (稍后由ensureBots重生)
                delete players[botId];
                io.emit('playerDisconnected', botId);
            }
        }
    });

    // 检查buff过期
    setInterval(() => {
        const now = Date.now();
        Object.keys(players).forEach(id => {
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
    }, 1000);
});

// AI Bot 逻辑
const BOT_COUNT = 3;
let botIdCounter = 0;

function createBot() {
    const id = `bot_${botIdCounter++}`;
    players[id] = {
        x: Math.floor(Math.random() * 1400) + 100,
        y: Math.floor(Math.random() * 1000) + 100,
        playerId: id,
        health: 100,
        score: 0,
        name: `AI-Bot-${botIdCounter}`,
        weaponLevel: 1,
        isBot: true,
        // AI 状态
        targetX: Math.random() * 1600,
        targetY: Math.random() * 1200,
        lastShot: 0,
        moveTimer: 0
    };
    io.emit('newPlayer', players[id]);
}

// Bot 更新循环
setInterval(() => {
    // 1. 确保Bot数量
    const currentBots = Object.values(players).filter(p => p.isBot);
    if (currentBots.length < BOT_COUNT) {
        createBot();
    }

    // 2. 更新Bot行为
    const now = Date.now();
    Object.values(players).forEach(bot => {
        if (bot.isBot) {
            // 移动逻辑
            if (now > bot.moveTimer) {
                // 每2-4秒更换目标点
                bot.targetX = Math.floor(Math.random() * 1400) + 100;
                bot.targetY = Math.floor(Math.random() * 1000) + 100;
                bot.moveTimer = now + 2000 + Math.random() * 2000;
            }

            // 简单的向目标移动
            const dx = bot.targetX - bot.x;
            const dy = bot.targetY - bot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 10; // 10px per 50ms = 200px/s (更平滑)

            if (dist > 10) {
                bot.x += (dx / dist) * speed;
                bot.y += (dy / dist) * speed;
                // 计算角度
                bot.rotation = Math.atan2(dy, dx) + 1.57; // +90度修正

                io.emit('playerMoved', bot);
            }

            // 激光圈攻击逻辑 (替代射击)
            // 检查周围玩家
            const ATTACK_RADIUS = 120;
            const DAMAGE_INTERVAL = 500; // 每0.5秒造成一次伤害
            const DAMAGE = 15;

            if (!bot.lastDamageTime) bot.lastDamageTime = 0;

            if (now - bot.lastDamageTime > DAMAGE_INTERVAL) {
                let hitPlayer = false;
                Object.values(players).forEach(player => {
                    if (!player.isBot && player.health > 0) {
                        const pdx = player.x - bot.x;
                        const pdy = player.y - bot.y;
                        const pDist = Math.sqrt(pdx * pdx + pdy * pdy);

                        if (pDist < ATTACK_RADIUS) {
                            // 金身无敌状态检查
                            if (player.isInvulnerable) {
                                // 跳过这个玩家，不造成伤害
                                return;
                            }

                            // 造成伤害
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

                                // 如果击杀
                                if (player.health <= 0) {
                                    io.emit('playerKilled', { killerId: bot.playerId, victimId: player.playerId });
                                    // Bot加分? 暂时不需要

                                    // 玩家死亡逻辑 (复用之前的逻辑，这里简化处理，客户端会处理死亡画面，服务端重置在gameUpdate或客户端请求)
                                    // 这里我们需要手动处理玩家死亡掉落

                                    const powerUpId = `powerup_${powerUpIdCounter++}`;
                                    const scoreValue = player.score + 1;
                                    powerUps[powerUpId] = {
                                        id: powerUpId,
                                        x: player.x,
                                        y: player.y,
                                        type: 'score',
                                        value: scoreValue
                                    };
                                    io.emit('powerUpDropped', powerUps[powerUpId]);

                                    setTimeout(() => {
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
                                    }, 100);
                                }
                            }
                            hitPlayer = true;
                        }
                    }
                });

                if (hitPlayer) {
                    bot.lastDamageTime = now;
                }
            }
        }
    });
}, 50);

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
