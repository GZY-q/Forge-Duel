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

io.on('connection', (socket) => {
    console.log('a user connected: ' + socket.id);

    socket.on('joinGame', (playerName) => {
        players[socket.id] = {
            x: Math.floor(Math.random() * 700) + 50,
            y: Math.floor(Math.random() * 500) + 50,
            playerId: socket.id,
            health: 100,
            score: 0,
            name: playerName
        };

        // Send the players object to the new player
        socket.emit('currentPlayers', players);

        // Update all other players of the new player
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected: ' + socket.id);
        delete players[socket.id];
        io.emit('disconnect', socket.id);
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
                // Reset player or handle death
                players[socket.id].health = 100;
                players[socket.id].x = Math.floor(Math.random() * 700) + 50;
                players[socket.id].y = Math.floor(Math.random() * 500) + 50;
                io.emit('playerRespawn', players[socket.id]);
            }
        }
    });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
