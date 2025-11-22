const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const GAME_DURATION = 3 * 60 * 1000; // 3分钟
let gameEndTime = Date.now() + GAME_DURATION;

// 游戏循环：更新计时器和排行榜
setInterval(() => {
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

        // 重置游戏
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

    socket.on('joinGame', (playerName) => {
        players[socket.id] = {
            x: Math.floor(Math.random() * 700) + 50,
            y: Math.floor(Math.random() * 500) + 50,
            playerId: socket.id,
            health: 100,
            score: 0,
            name: playerName,
            weaponLevel: 1
        };

        // 向新玩家发送玩家对象
        socket.emit('currentPlayers', players);

        // 向其他玩家更新新玩家信息
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected: ' + socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
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

            // 吸血逻辑 (如果攻击者存在且开启了吸血)
            if (attackerId && players[attackerId] && players[attackerId].hasVampire) {
                players[attackerId].health = Math.min(100, players[attackerId].health + damage * 0.5); // 吸血50%
                io.emit('updateHealth', { playerId: attackerId, health: players[attackerId].health });
            }

            if (players[socket.id].health <= 0) {
                players[socket.id].health = 0; // 确保血量不为负数
                // 先发送血量归零的消息
                io.emit('updateHealth', { playerId: socket.id, health: 0 });

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

                // 重置玩家
                players[socket.id].score = 0; // 死亡时丢失分数
                players[socket.id].health = 100;
                players[socket.id].weaponLevel = 1;
                players[socket.id].hasVampire = false;
                players[socket.id].hasShield = false;
                players[socket.id].shieldHealth = 0;
                players[socket.id].x = Math.floor(Math.random() * 700) + 50;
                players[socket.id].y = Math.floor(Math.random() * 500) + 50;

                // 延迟100ms发送重生消息，确保血量归零先被看到
                setTimeout(() => {
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
                } else {
                    type = 'tracking';
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
                    // 这里简单处理：获得后持续10秒
                    players[socket.id].vampireExpires = Date.now() + 10000;
                    io.emit('playerPowerUpActive', { playerId: socket.id, type: 'vampire', duration: 10000 });
                } else if (powerUp.type === 'shield') {
                    players[socket.id].hasShield = true;
                    players[socket.id].shieldHealth = 50; // 护盾值
                    players[socket.id].shieldExpires = Date.now() + 10000; // 护盾持续10秒
                    io.emit('playerPowerUpActive', { playerId: socket.id, type: 'shield', value: 50, duration: 10000 });
                } else if (powerUp.type === 'tracking') {
                    // 追踪导弹 - 随机选择一个敌人
                    const otherPlayerIds = Object.keys(players).filter(id => id !== socket.id);
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
                }
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
            let damage = 50; // 追踪导弹造50点伤害

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

            // 吸血逻辑 (如果攻击者存在且开启了吸血)
            if (players[socket.id] && players[socket.id].hasVampire) {
                players[socket.id].health = Math.min(100, players[socket.id].health + damage * 0.5); // 吸血50%
                io.emit('updateHealth', { playerId: socket.id, health: players[socket.id].health });
            }

            if (players[targetId].health <= 0) {
                players[targetId].health = 0;
                io.emit('updateHealth', { playerId: targetId, health: 0 });

                // 掉落包含分数的能量球
                const powerUpId = `powerup_${powerUpIdCounter++}`;
                const scoreValue = players[targetId].score + 1;

                powerUps[powerUpId] = {
                    id: powerUpId,
                    x: players[targetId].x,
                    y: players[targetId].y,
                    type: 'score',
                    value: scoreValue
                };
                io.emit('powerUpDropped', powerUps[powerUpId]);

                // 重置玩家
                players[targetId].score = 0;
                players[targetId].health = 100;
                players[targetId].weaponLevel = 1;
                players[targetId].hasVampire = false;
                players[targetId].hasShield = false;
                players[targetId].shieldHealth = 0;
                players[targetId].x = Math.floor(Math.random() * 700) + 50;
                players[targetId].y = Math.floor(Math.random() * 500) + 50;

                setTimeout(() => {
                    io.emit('playerRespawn', players[targetId]);
                }, 100);
            } else {
                io.emit('updateHealth', { playerId: targetId, health: players[targetId].health });
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

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
