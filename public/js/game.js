const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    fps: {
        target: 120,
        min: 30
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    // 加载资源作为纹理以便处理
    this.load.image('ship_raw', 'assets/ship.png');
    this.load.image('bullet_raw', 'assets/bullet.png');
    this.load.image('powerup_raw', 'assets/powerup.png');
    this.load.image('bg', 'assets/bg.png');
}

function create() {
    const self = this;

    // 处理图像以移除黑色背景
    processImage(this, 'ship_raw', 'ship');
    processImage(this, 'bullet_raw', 'bullet');
    processImage(this, 'powerup_raw', 'powerup');

    this.add.tileSprite(0, 0, 1600, 1200, 'bg').setOrigin(0);
    this.physics.world.setBounds(0, 0, 1600, 1200);
    this.cameras.main.setBounds(0, 0, 1600, 1200);

    this.socket = io();

    // 使用全局变量中的名字发送加入游戏事件
    this.socket.emit('joinGame', window.playerName || 'Pilot');

    this.otherPlayers = this.physics.add.group();
    this.powerUps = this.physics.add.group();

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

    this.socket.on('currentPowerUps', function (powerUps) {
        Object.keys(powerUps).forEach(function (id) {
            addPowerUp(self, powerUps[id]);
        });
    });

    this.socket.on('powerUpDropped', function (powerUp) {
        addPowerUp(self, powerUp);
    });

    this.socket.on('powerUpCollected', function (powerUpId) {
        self.powerUps.getChildren().forEach(function (powerUp) {
            if (powerUp.id === powerUpId) {
                powerUp.destroy();
            }
        });
    });

    this.socket.on('updateWeaponLevel', function (info) {
        if (self.ship && info.playerId === self.socket.id) {
            self.ship.weaponLevel = info.weaponLevel;
        } else {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
                if (info.playerId === otherPlayer.playerId) {
                    otherPlayer.weaponLevel = info.weaponLevel;
                }
            });
        }
    });

    this.socket.on('playerDisconnected', function (playerId) {
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
            // 仅在服务器值显著不同时更新（重新同步）
            // 或者我们死亡时（血量 <= 0）
            if (Math.abs(self.health - info.health) > 20 || info.health <= 0) {
                self.health = info.health;
                updateHealthBar(self, self.ship, self.health);
            }
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
            self.ship.weaponLevel = 1;
            updateHealthBar(self, self.ship, 100);
            if (self.ship.nameText) self.ship.nameText.setPosition(self.ship.x, self.ship.y - 40);
        } else {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
                if (playerInfo.playerId === otherPlayer.playerId) {
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                    otherPlayer.health = 100;
                    otherPlayer.weaponLevel = 1;
                    updateHealthBar(self, otherPlayer, 100);
                    if (otherPlayer.nameText) otherPlayer.nameText.setPosition(otherPlayer.x, otherPlayer.y - 40);
                }
            });
        }
    });

    this.socket.on('gameUpdate', function (data) {
        // 更新计时器
        const minutes = Math.floor(data.timeLeft / 60);
        const seconds = data.timeLeft % 60;
        document.getElementById('game-timer').innerText =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // 更新排行榜
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '';
        data.leaderboard.forEach((player, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-item' + (player.id === self.socket.id ? ' me' : '');
            div.innerHTML = `<span>${index + 1}. ${player.name}</span><span>${player.score}</span>`;
            list.appendChild(div);
        });
    });

    this.socket.on('gameOver', function (info) {
        const gameOverScreen = document.getElementById('game-over-screen');
        const winnerText = document.getElementById('winner-text');
        winnerText.innerText = info.winnerName + " 胜利!";
        gameOverScreen.style.display = 'flex';

        // 游戏自动重置后3秒自动隐藏
        setTimeout(() => {
            gameOverScreen.style.display = 'none';
        }, 3000);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // 移动端检测
    this.isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS || this.sys.game.device.os.iPad || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.lastFired = 0;

    // 通过在物理步骤后更新位置来修复UI重影问题
    this.events.on('postupdate', postUpdate, this);
}

function update(time, delta) {
    if (this.ship) {
        if (this.isMobile) {
            // 移动端控制
            const pointer = this.input.activePointer;

            if (pointer.isDown) {
                // 计算指向指针的角度
                const angle = Phaser.Math.Angle.Between(this.ship.x, this.ship.y, pointer.worldX, pointer.worldY);

                // 调整旋转因为精灵默认朝下（1.57弧度）
                this.ship.setRotation(angle - 1.57);

                // 按指针方向向前移动
                this.physics.velocityFromRotation(this.ship.rotation + 1.57, 200, this.ship.body.acceleration);
            } else {
                this.ship.setAcceleration(0);
            }

            // 自动射击
            if (time > this.lastFired) {
                fireBullet(this, { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation, weaponLevel: this.ship.weaponLevel }, true);
                this.socket.emit('playerShoot');
                this.lastFired = time + 300; // 每300毫秒射击一次
            }

        } else {
            // 桌面端控制
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
                fireBullet(this, { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation, weaponLevel: this.ship.weaponLevel }, true);
                this.socket.emit('playerShoot');
            }
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

        // 检查能量球收集
        this.physics.overlap(this.ship, this.powerUps, function (ship, powerUp) {
            this.socket.emit('playerCollectPowerUp', powerUp.id);
            powerUp.destroy();
        }, null, this);
    }
}

function postUpdate(time, delta) {
    // 在物理步骤后更新UI元素以防止重影
    if (this.ship) {
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

        // 黑色背景的简单阈值
        if (r < 20 && g < 20 && b < 20) {
            data[i + 3] = 0; // 设置透明度为0
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
    self.ship.weaponLevel = playerInfo.weaponLevel || 1;

    // 添加名字文本
    self.ship.nameText = self.add.text(playerInfo.x, playerInfo.y - 40, playerInfo.name || '飞行员', {
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
    otherPlayer.weaponLevel = playerInfo.weaponLevel || 1;
    otherPlayer.setTint(0xff0000); // 将敌方飞船染为红色
    self.otherPlayers.add(otherPlayer);

    // 添加名字文本
    otherPlayer.nameText = self.add.text(playerInfo.x, playerInfo.y - 40, playerInfo.name || '敌人', {
        fontSize: '14px',
        fill: '#ff0000',
        align: 'center'
    }).setOrigin(0.5);
}

function addPowerUp(self, powerUpInfo) {
    const powerUp = self.physics.add.sprite(powerUpInfo.x, powerUpInfo.y, 'powerup');
    powerUp.id = powerUpInfo.id;
    powerUp.setDisplaySize(30, 30);
    self.powerUps.add(powerUp);
}

function fireBullet(scene, playerInfo, isOwner) {
    const weaponLevel = playerInfo.weaponLevel || 1;

    const createBullet = (offsetX, offsetY, angleOffset) => {
        const bullet = scene.physics.add.sprite(playerInfo.x + offsetX, playerInfo.y + offsetY, 'bullet');
        bullet.setDisplaySize(20, 20);

        const angle = playerInfo.rotation + 1.57 + angleOffset; // 1.57是90度修正
        scene.physics.velocityFromRotation(angle, 600, bullet.body.velocity);
        bullet.rotation = playerInfo.rotation + angleOffset;

        setTimeout(() => {
            if (bullet.active) bullet.destroy();
        }, 2000);

        if (isOwner) {
            // 射手端：检查我的子弹是否命中敌人
            // 交换参数：子弹在前，组在后。回调：(子弹, 敌人)
            scene.physics.add.overlap(bullet, scene.otherPlayers, (b, enemySprite) => {
                if (b.active) {
                    b.destroy();
                    // 敌人血量的乐观视觉更新
                    if (enemySprite.health !== undefined) {
                        enemySprite.health -= 10;
                        updateHealthBar(scene, enemySprite, enemySprite.health);
                    }
                }
            });
        } else {
            // 受害者端：检查敌人子弹是否命中我
            scene.physics.add.overlap(bullet, scene.ship, (b, ship) => {
                if (b.active) {
                    b.destroy();
                    // 自身血量的乐观更新
                    scene.health -= 10;
                    updateHealthBar(scene, scene.ship, scene.health);
                    scene.socket.emit('playerHit', 10);
                }
            });
        }
    };

    if (weaponLevel === 1) {
        createBullet(0, 0, 0);
    } else if (weaponLevel === 2) {
        createBullet(10, 0, 0);
        createBullet(-10, 0, 0);
    } else if (weaponLevel >= 3) {
        createBullet(0, 0, 0);
        createBullet(0, 0, 0.2);
        createBullet(0, 0, -0.2);
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
