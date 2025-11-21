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
    }
}, 1000);

const players = {};
const powerUps = {};
let powerUpIdCounter = 0;

io.on('connection', (socket) => {
    console.log('a user connected: ' + socket.id);

    // 向新玩家发送当前的能量球
    socket.emit('currentPowerUps', powerUps);

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

    socket.on('playerHit', (damage) => {
        if (players[socket.id]) {
            players[socket.id].health -= damage;
            io.emit('updateHealth', { playerId: socket.id, health: players[socket.id].health });

            if (players[socket.id].health <= 0) {
                // 掉落包含分数的能量球
                const powerUpId = `powerup_${powerUpIdCounter++}`;
                // 值为当前分数 + 1（基础值）
                const scoreValue = players[socket.id].score + 1;

                powerUps[powerUpId] = {
                    id: powerUpId,
                    x: players[socket.id].x,
                    y: players[socket.id].y,
                    value: scoreValue
                };
                io.emit('powerUpDropped', powerUps[powerUpId]);

                // 重置玩家
                players[socket.id].score = 0; // 死亡时丢失分数
                players[socket.id].health = 100;
                players[socket.id].weaponLevel = 1;
                players[socket.id].x = Math.floor(Math.random() * 700) + 50;
                players[socket.id].y = Math.floor(Math.random() * 500) + 50;
                io.emit('playerRespawn', players[socket.id]);
            }
        }
    });

    socket.on('playerCollectPowerUp', (powerUpId) => {
        if (powerUps[powerUpId]) {
            const value = powerUps[powerUpId].value || 1;
            delete powerUps[powerUpId];
            io.emit('powerUpCollected', powerUpId);

            if (players[socket.id]) {
                players[socket.id].weaponLevel = Math.min(players[socket.id].weaponLevel + 1, 3);
                players[socket.id].score += value; // 添加收集到的分数
                io.emit('updateWeaponLevel', { playerId: socket.id, weaponLevel: players[socket.id].weaponLevel });
            }
        }
    });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
