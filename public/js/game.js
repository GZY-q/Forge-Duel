const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    // Load assets as textures to be processed
    this.load.image('ship_raw', 'assets/ship.png');
    this.load.image('bullet_raw', 'assets/bullet.png');
    this.load.image('bg', 'assets/bg.png');
}

function create() {
    const self = this;

    // Process images to remove black background
    processImage(this, 'ship_raw', 'ship');
    processImage(this, 'bullet_raw', 'bullet');

    this.add.tileSprite(0, 0, 1600, 1200, 'bg').setOrigin(0);
    this.physics.world.setBounds(0, 0, 1600, 1200);
    this.cameras.main.setBounds(0, 0, 1600, 1200);

    this.socket = io();

    // Emit joinGame event with the name from the global variable
    this.socket.emit('joinGame', window.playerName || 'Pilot');

    this.otherPlayers = this.physics.add.group();

    this.socket.on('currentPlayers', function (players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });

    this.socket.on('newPlayer', function (playerInfo) {
        addOtherPlayers(self, playerInfo);
    });

    this.socket.on('disconnect', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                if (otherPlayer.nameText) otherPlayer.nameText.destroy();
                otherPlayer.destroy();
            }
        });
    });

    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                otherPlayer.setRotation(playerInfo.rotation);
                if (otherPlayer.nameText) {
                    otherPlayer.nameText.setPosition(otherPlayer.x, otherPlayer.y - 40);
                }
            }
        });
    });

    this.socket.on('playerFired', function (playerInfo) {
        fireBullet(self, playerInfo, false);
    });

    this.socket.on('updateHealth', function (info) {
        if (self.ship && info.playerId === self.socket.id) {
            self.health = info.health;
            updateHealthBar(self, self.ship, self.health);
        } else {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
                if (info.playerId === otherPlayer.playerId) {
                    otherPlayer.health = info.health;
                    updateHealthBar(self, otherPlayer, otherPlayer.health);
                }
            });
        }
    });

    this.socket.on('playerRespawn', function (playerInfo) {
        if (self.ship && playerInfo.playerId === self.socket.id) {
            self.ship.setPosition(playerInfo.x, playerInfo.y);
            self.health = 100;
            updateHealthBar(self, self.ship, 100);
            if (self.ship.nameText) self.ship.nameText.setPosition(self.ship.x, self.ship.y - 40);
        } else {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
                if (playerInfo.playerId === otherPlayer.playerId) {
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                    otherPlayer.health = 100;
                    updateHealthBar(self, otherPlayer, 100);
                    if (otherPlayer.nameText) otherPlayer.nameText.setPosition(otherPlayer.x, otherPlayer.y - 40);
                }
            });
        }
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
}

function update() {
    if (this.ship) {
        if (this.cursors.left.isDown) {
            this.ship.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown) {
            this.ship.setAngularVelocity(150);
        } else {
            this.ship.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
            this.physics.velocityFromRotation(this.ship.rotation + 1.57, 200, this.ship.body.acceleration);
        } else {
            this.ship.setAcceleration(0);
        }

        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            fireBullet(this, { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation }, true);
            this.socket.emit('playerShoot');
        }

        const x = this.ship.x;
        const y = this.ship.y;
        const r = this.ship.rotation;
        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
            this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
        }

        this.ship.oldPosition = {
            x: this.ship.x,
            y: this.ship.y,
            rotation: this.ship.rotation
        };

        updateHealthBar(this, this.ship, this.health);

        if (this.ship.nameText) {
            this.ship.nameText.setPosition(this.ship.x, this.ship.y - 40);
        }
    }

    this.otherPlayers.getChildren().forEach(otherPlayer => {
        updateHealthBar(this, otherPlayer, otherPlayer.health || 100);
        if (otherPlayer.nameText) {
            otherPlayer.nameText.setPosition(otherPlayer.x, otherPlayer.y - 40);
        }
    });
}

function processImage(scene, key, newKey) {
    const texture = scene.textures.get(key);
    const canvas = scene.textures.createCanvas(newKey, texture.getSourceImage().width, texture.getSourceImage().height);
    const context = canvas.context;

    context.drawImage(texture.getSourceImage(), 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Simple threshold for black background
        if (r < 20 && g < 20 && b < 20) {
            data[i + 3] = 0; // Set alpha to 0
        }
    }

    context.putImageData(imageData, 0, 0);
    canvas.refresh();
}

function addPlayer(self, playerInfo) {
    self.ship = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'ship');
    self.ship.setOrigin(0.5, 0.5);
    self.ship.setDisplaySize(50, 50);
    self.ship.setCollideWorldBounds(true);
    self.ship.setDrag(100);
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(200);
    self.cameras.main.startFollow(self.ship);
    self.health = playerInfo.health || 100;

    // Add name text
    self.ship.nameText = self.add.text(playerInfo.x, playerInfo.y - 40, playerInfo.name || 'Pilot', {
        fontSize: '14px',
        fill: '#00ff00',
        align: 'center'
    }).setOrigin(0.5);
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'ship');
    otherPlayer.setOrigin(0.5, 0.5);
    otherPlayer.setDisplaySize(50, 50);
    otherPlayer.playerId = playerInfo.playerId;
    otherPlayer.health = playerInfo.health || 100;
    otherPlayer.setTint(0xff0000); // Tint enemy ships red
    self.otherPlayers.add(otherPlayer);

    // Add name text
    otherPlayer.nameText = self.add.text(playerInfo.x, playerInfo.y - 40, playerInfo.name || 'Enemy', {
        fontSize: '14px',
        fill: '#ff0000',
        align: 'center'
    }).setOrigin(0.5);
}

function fireBullet(scene, playerInfo, isOwner) {
    const bullet = scene.physics.add.sprite(playerInfo.x, playerInfo.y, 'bullet');
    bullet.setDisplaySize(20, 20);

    // Rotation + 1.57 (90 degrees) because sprites usually point up, but 0 rotation in Phaser is right.
    // Assuming the ship sprite points UP.
    scene.physics.velocityFromRotation(playerInfo.rotation + 1.57, 600, bullet.body.velocity);
    bullet.rotation = playerInfo.rotation;

    setTimeout(() => {
        if (bullet.active) bullet.destroy();
    }, 2000);

    if (!isOwner) {
        scene.physics.add.overlap(scene.ship, bullet, () => {
            bullet.destroy();
            scene.socket.emit('playerHit', 10);
        }, null, scene);
    }
}

function updateHealthBar(scene, player, health) {
    if (!player.healthBar) {
        player.healthBar = scene.add.rectangle(player.x, player.y - 30, 40, 5, 0x00ff00);
    }
    player.healthBar.x = player.x;
    player.healthBar.y = player.y - 30;
    player.healthBar.width = 40 * (health / 100);

    if (health < 30) {
        player.healthBar.fillColor = 0xff0000;
    } else {
        player.healthBar.fillColor = 0x00ff00;
    }
}
