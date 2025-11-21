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

const players = {};
const powerUps = {};
let powerUpIdCounter = 0;

io.on('connection', (socket) => {
    console.log('a user connected: ' + socket.id);

    // Send current power-ups to new player
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

        // Send the players object to the new player
        socket.emit('currentPlayers', players);

        // Update all other players of the new player
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
                // Drop power-up
                const powerUpId = `powerup_${powerUpIdCounter++}`;
                powerUps[powerUpId] = {
                    id: powerUpId,
                    x: players[socket.id].x,
                    y: players[socket.id].y
                };
                io.emit('powerUpDropped', powerUps[powerUpId]);

                // Reset player
                players[socket.id].health = 100;
                players[socket.id].weaponLevel = 1; // Reset weapon level on death
                players[socket.id].x = Math.floor(Math.random() * 700) + 50;
                players[socket.id].y = Math.floor(Math.random() * 500) + 50;
                io.emit('playerRespawn', players[socket.id]);
            }
        }
    });

    socket.on('playerCollectPowerUp', (powerUpId) => {
        if (powerUps[powerUpId]) {
            delete powerUps[powerUpId];
            io.emit('powerUpCollected', powerUpId);

            if (players[socket.id]) {
                players[socket.id].weaponLevel = Math.min(players[socket.id].weaponLevel + 1, 3);
                io.emit('updateWeaponLevel', { playerId: socket.id, weaponLevel: players[socket.id].weaponLevel });
            }
        }
    });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
