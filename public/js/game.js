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
    // 加载资源
    this.load.image('ship', 'assets/ship.png');
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('powerup', 'assets/powerup.png');
    this.load.image('bg', 'assets/bg.png');

    // 新增资源
    this.load.image('treasure_chest', 'assets/treasure_chest.png');
    this.load.image('health_orb', 'assets/health_orb.png');
    this.load.image('shield_orb', 'assets/shield_orb.png');
    this.load.image('shield_effect', 'assets/shield_effect.png');
    this.load.image('tracking_missile', 'assets/trackmissiles.png');
    this.load.image('tracking_orb', 'assets/trackmissiles.png'); // 掉落物图标

    // 加载表情包
    for (let i = 1; i <= 8; i++) {
        this.load.image(`emote_${i}`, `assets/${i}.png`);
    }

    // 加载音频
    this.load.audio('bgm', 'assets/bgm.mp3');
    this.load.audio('collect', 'assets/collect.mp3');

    // 新增音效
    // this.load.audio('kill', 'assets/kill.mp3'); // 移除旧的
    for (let i = 1; i <= 5; i++) {
        this.load.audio(`kill${i}`, `assets/kill${i}.mp3`);
    }
    this.load.audio('chest', 'assets/chest.mp3');
    this.load.audio('missile', 'assets/missile.mp3');

    // 游戏结束音乐
    for (let i = 1; i <= 3; i++) {
        this.load.audio(`over${i}`, `assets/over${i}.mp3`);
    }
}

function create() {
    const self = this;



    this.add.tileSprite(0, 0, 1600, 1200, 'bg').setOrigin(0);
    this.physics.world.setBounds(0, 0, 1600, 1200);
    this.cameras.main.setBounds(0, 0, 1600, 1200);

    this.socket = io();

    // 使用全局变量中的名字发送加入游戏事件
    this.socket.emit('joinGame', {
        playerName: window.playerName || 'Pilot',
        username: window.username || null
    });

    this.otherPlayers = this.physics.add.group();
    this.powerUps = this.physics.add.group();
    this.chests = this.physics.add.group(); // 宝箱组

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

    // 宝箱事件
    this.socket.on('currentChests', function (chests) {
        Object.keys(chests).forEach(function (id) {
            addChest(self, chests[id]);
        });
    });

    this.socket.on('chestSpawned', function (chest) {
        addChest(self, chest);
    });

    this.socket.on('chestDamaged', function (data) {
        self.chests.getChildren().forEach(function (chest) {
            if (chest.id === data.id) {
                // 简单的受击反馈，比如闪烁
                chest.setTint(0xff0000);
                setTimeout(() => chest.clearTint(), 100);
            }
        });
    });

    this.socket.on('chestBroken', function (chestId) {
        self.chests.getChildren().forEach(function (chest) {
            if (chest.id === chestId) {
                // 播放爆炸或消失动画
                chest.destroy();
                // 可以添加粒子效果
                if (self.playSound) self.playSound('chest');
            }
        });
    });

    // 玩家Buff效果
    this.socket.on('playerPowerUpActive', function (data) {
        // 找到发射者（shooter）
        let shooter = null;
        if (data.playerId === self.socket.id) {
            shooter = self.ship;
        } else {
            shooter = self.otherPlayers.getChildren().find(p => p.playerId === data.playerId);
        }

        if (shooter) {
            if (data.type === 'shield') {
                if (!shooter.shieldSprite) {
                    shooter.shieldSprite = self.add.sprite(shooter.x, shooter.y, 'shield_effect');
                    shooter.shieldSprite.setDisplaySize(60, 60); // 设置为60x60，刚好覆盖飞船
                    shooter.shieldSprite.setAlpha(0.5);
                }
            } else if (data.type === 'vampire') {
                // 吸血视觉效果，例如红色光环
                shooter.setTint(0xffaaaa);
            } else if (data.type === 'tracking') {
                // 追踪导弹 - 所有客户端都显示
                if (data.targetId) {
                    const isOwner = data.playerId === self.socket.id;
                    fireTrackingMissile(self, shooter, data.targetId, isOwner);
                }
            }
        }
    });

    this.socket.on('playerPowerUpExpired', function (data) {
        const target = (data.playerId === self.socket.id) ? self.ship : self.otherPlayers.getChildren().find(p => p.playerId === data.playerId);
        if (target) {
            if (data.type === 'shield') {
                if (target.shieldSprite) {
                    target.shieldSprite.destroy();
                    target.shieldSprite = null;
                }
            } else if (data.type === 'vampire') {
                target.clearTint();
                if (target !== self.ship) target.setTint(0xff0000); // 恢复敌人红色
            }
        }
    });

    this.socket.on('playerShieldUpdate', function (data) {
        // 护盾受击反馈?
    });

    // 连杀计数
    self.killStreak = 0;

    this.socket.on('playerKilled', function (data) {
        if (data.killerId === self.socket.id) {
            self.killStreak++;
            const soundId = Math.min(self.killStreak, 5);
            if (self.playSound) self.playSound(`kill${soundId}`);
        }
        if (data.victimId === self.socket.id) {
            self.killStreak = 0;
        }
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
                if (otherPlayer.healthBar) otherPlayer.healthBar.destroy(); // 修复：销毁血条
                if (otherPlayer.shieldSprite) otherPlayer.shieldSprite.destroy(); // 销毁护盾
                if (otherPlayer.emote) otherPlayer.emote.destroy(); // 销毁表情
                if (otherPlayer.laserContainer) otherPlayer.laserContainer.destroy(); // 销毁激光圈容器
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
            // 或者服务器报告的血量更低（说明受到了客户端未预测到的伤害，如激光圈）
            if (Math.abs(self.health - info.health) > 2 || info.health < self.health || info.health <= 0) {
                self.health = info.health;
                updateHealthBar(self, self.ship, self.health);
            }
        } else {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
                if (info.playerId === otherPlayer.playerId) {
                    // 优化：添加阈值检查，防止网络延迟导致的血条跳变（Rubber banding）
                    // 只有当服务器数据与本地差异较大（>20），或者目标死亡，或者服务器血量更低（确认了更多伤害）时才更新
                    // 注意：如果是回血（吃血包），差异通常会大于20（假设血包回血量较大）或者由专门的事件处理
                    // 这里主要防止：本地预测扣血了(90)，服务器延迟包发来(100)，导致血条跳回100

                    const diff = Math.abs(otherPlayer.health - info.health);

                    // 1. 强制同步：差异过大或死亡
                    if (diff > 20 || info.health <= 0) {
                        otherPlayer.health = info.health;
                        updateHealthBar(self, otherPlayer, otherPlayer.health);
                    }
                    // 2. 确认伤害：服务器血量比本地低，说明服务器确认了伤害，更新
                    else if (info.health < otherPlayer.health) {
                        otherPlayer.health = info.health;
                        updateHealthBar(self, otherPlayer, otherPlayer.health);
                    }
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
        self.killStreak = 0; // 重置连杀
        const gameOverScreen = document.getElementById('game-over-screen');
        const winnerText = document.getElementById('winner-text');
        winnerText.innerText = info.winnerName + "胜利!";
        gameOverScreen.style.display = 'flex';

        // 暂停背景音乐
        if (self.bgm) self.bgm.pause();

        // 随机播放结束音乐
        const overId = Math.floor(Math.random() * 3) + 1;
        let overMusic = null;
        if (self.cache.audio.exists(`over${overId}`)) {
            overMusic = self.sound.add(`over${overId}`, { volume: 0.5 });
            overMusic.play();
        }

        // 8秒后恢复
        setTimeout(() => {
            gameOverScreen.style.display = 'none';
            if (overMusic) {
                overMusic.stop();
                overMusic.destroy(); // 销毁实例
            }
            if (self.bgm) self.bgm.resume();
        }, 8000);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // 移动端检测
    this.isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS || this.sys.game.device.os.iPad || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.lastFired = 0;

    // 表情包按钮事件
    const emoteBtn = document.getElementById('emote-btn');
    if (emoteBtn) {
        emoteBtn.onclick = (e) => {
            e.stopPropagation(); // 防止触发游戏点击
            const emoteId = Math.floor(Math.random() * 8) + 1;
            this.socket.emit('sendEmote', emoteId);

            // 按钮冷却效果
            emoteBtn.disabled = true;
            emoteBtn.innerText = "冷却";
            setTimeout(() => {
                emoteBtn.disabled = false;
                emoteBtn.innerText = "表情";
            }, 3000);
        };

        // 防止按钮上的触摸事件触发游戏控制
        emoteBtn.addEventListener('touchstart', (e) => e.stopPropagation());
        emoteBtn.addEventListener('touchend', (e) => e.stopPropagation());

        // 添加键盘快捷键 'M' 发送表情
        this.input.keyboard.on('keydown-M', () => {
            if (!emoteBtn.disabled) {
                emoteBtn.click();
            }
        });
    }

    // 播放背景音乐
    if (this.sound.get('bgm') || this.cache.audio.exists('bgm')) {
        try {
            this.bgm = this.sound.add('bgm', { loop: true, volume: 0.1 });
            this.bgm.play();
        } catch (e) {
            console.warn('Audio play failed', e);
        }
    }

    // 音效播放辅助函数
    this.playSound = (key) => {
        if (this.cache.audio.exists(key)) {
            this.sound.play(key);
        }
    };

    // 监听表情包事件
    this.socket.on('playerEmote', function (data) {
        const target = (data.playerId === self.socket.id) ? self.ship : self.otherPlayers.getChildren().find(p => p.playerId === data.playerId);
        if (target) {
            showEmote(self, target, data.emoteId);
        }
    });

    // 通过在物理步骤后更新位置来修复UI重影问题
    this.events.on('postupdate', postUpdate, this);

    // --- 设置相关逻辑 ---
    this.controlMode = localStorage.getItem('forge_duel_control_mode') || 'tap';
    this.joystickPosition = localStorage.getItem('forge_duel_joystick_pos') || 'left';

    // 设置按钮事件
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const radioInputs = document.getElementsByName('control-mode');
    const posInputs = document.getElementsByName('joystick-pos');
    const joystickSettingsDiv = document.getElementById('joystick-settings');

    // 切换控制模式时显示/隐藏轮盘位置设置
    const updateSettingsUI = () => {
        let isJoystick = false;
        for (let input of radioInputs) {
            if (input.checked && input.value === 'joystick') {
                isJoystick = true;
                break;
            }
        }
        if (joystickSettingsDiv) {
            joystickSettingsDiv.style.display = isJoystick ? 'block' : 'none';
        }
    };

    // 监听单选框变化
    for (let input of radioInputs) {
        input.addEventListener('change', updateSettingsUI);
    }

    if (settingsBtn) {
        settingsBtn.onclick = (e) => {
            e.stopPropagation();
            // 设置当前选中的选项
            for (let input of radioInputs) {
                if (input.value === this.controlMode) {
                    input.checked = true;
                }
            }
            for (let input of posInputs) {
                if (input.value === this.joystickPosition) {
                    input.checked = true;
                }
            }
            updateSettingsUI();
            settingsModal.style.display = 'flex';
        };

        // 防止触摸穿透
        settingsBtn.addEventListener('touchstart', (e) => e.stopPropagation());
        settingsBtn.addEventListener('touchend', (e) => e.stopPropagation());
    }

    if (closeSettings) {
        closeSettings.onclick = () => {
            settingsModal.style.display = 'none';
        };
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.onclick = () => {
            for (let input of radioInputs) {
                if (input.checked) {
                    this.controlMode = input.value;
                    localStorage.setItem('forge_duel_control_mode', this.controlMode);
                    break;
                }
            }
            for (let input of posInputs) {
                if (input.checked) {
                    this.joystickPosition = input.value;
                    localStorage.setItem('forge_duel_joystick_pos', this.joystickPosition);
                    break;
                }
            }
            settingsModal.style.display = 'none';

            // 应用更改
            if (this.isMobile) {
                // 先销毁旧的
                if (this.joystick) destroyJoystick(this);

                // 如果是摇杆模式，重新创建
                if (this.controlMode === 'joystick') {
                    createJoystick(this);
                }
            }
        };
    }

    // 初始化摇杆 (如果是移动端且模式为joystick)
    if (this.isMobile && this.controlMode === 'joystick') {
        createJoystick(this);
    }
}

function update(time, delta) {
    if (this.ship) {
        if (this.isMobile) {
            // 移动端控制
            if (this.controlMode === 'joystick' && this.joystick) {
                // --- 摇杆模式 ---
                if (this.joystick.active) {
                    const force = Math.min(this.joystick.distance / this.joystick.radius, 1); // 0-1
                    const angle = this.joystick.angle;

                    // 只有推杆超过一定程度才移动
                    if (force > 0.1) {
                        this.ship.setRotation(angle - 1.57);
                        this.physics.velocityFromRotation(angle, 200 * force, this.ship.body.velocity);

                        // 移动时自动射击 (可选，或者保留自动射击逻辑)
                    } else {
                        this.ship.setVelocity(0);
                        this.ship.setAngularVelocity(0);
                    }
                } else {
                    this.ship.setVelocity(0);
                    this.ship.setAngularVelocity(0);
                }
            } else {
                // --- 点击模式 (Tap to Move) ---
                // 这种模式下，点击屏幕设置目标点，飞船会自动飞向该点，直到到达或设置新目标
                const pointer = this.input.activePointer;

                if (pointer.isDown) {
                    // 排除摇杆区域 (虽然在点击模式下不显示摇杆，但为了逻辑统一)
                    // 更新移动目标点
                    this.moveTarget = { x: pointer.worldX, y: pointer.worldY };
                }

                if (this.moveTarget) {
                    // 计算距离
                    const dist = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, this.moveTarget.x, this.moveTarget.y);

                    // 到达判定 (20px)
                    if (dist > 20) {
                        // 计算角度
                        const angle = Phaser.Math.Angle.Between(this.ship.x, this.ship.y, this.moveTarget.x, this.moveTarget.y);

                        // 旋转飞船
                        this.ship.setRotation(angle - 1.57);

                        // 移动
                        this.physics.velocityFromRotation(angle, 200, this.ship.body.velocity);
                    } else {
                        // 到达目标，清除目标点并停止
                        this.moveTarget = null;
                        this.ship.setVelocity(0);
                        this.ship.setAngularVelocity(0);
                    }
                } else {
                    // 没有目标点，停止 (依靠阻力自然减速，或者强制停止)
                    // 为了防止漂移，这里强制停止，或者保留一点惯性
                    if (this.ship.body.speed > 10) {
                        this.ship.setDrag(300); // 增加阻力快速停下
                    } else {
                        this.ship.setVelocity(0);
                        this.ship.setAngularVelocity(0);
                    }
                }
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
            // 防止刚掉落的能量球立即被收集
            if (powerUp.spawnTime && Date.now() - powerUp.spawnTime < 500) {
                return; // 0.5秒保护期
            }
            this.socket.emit('playerCollectPowerUp', powerUp.id);
            powerUp.destroy();
            if (this.playSound) this.playSound('collect'); // 仅自己收集时播放
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

        // 更新攻击方向指示箭头
        if (this.ship.directionArrow) {
            const offset = 40; // 距离飞船中心的距离
            const angle = this.ship.rotation + 1.41; // 修正角度（飞船朝向）

            this.ship.directionArrow.setPosition(
                this.ship.x + Math.cos(angle) * offset,
                this.ship.y + Math.sin(angle) * offset
            );
            this.ship.directionArrow.setRotation(this.ship.rotation);
        }
    }

    this.otherPlayers.getChildren().forEach(otherPlayer => {
        updateHealthBar(this, otherPlayer, otherPlayer.health || 100);
        if (otherPlayer.nameText) {
            otherPlayer.nameText.setPosition(otherPlayer.x, otherPlayer.y - 40);
        }
        if (otherPlayer.shieldSprite) {
            otherPlayer.shieldSprite.setPosition(otherPlayer.x, otherPlayer.y);
        }
        if (otherPlayer.emote) {
            otherPlayer.emote.setPosition(otherPlayer.x, otherPlayer.y - 50);
        }
        if (otherPlayer.laserContainer) {
            otherPlayer.laserContainer.setPosition(otherPlayer.x, otherPlayer.y);
            // 旋转动画
            if (otherPlayer.laserOuter) otherPlayer.laserOuter.rotation += 0.02;
            if (otherPlayer.laserInner) otherPlayer.laserInner.rotation -= 0.05;
        }
    });

    if (this.ship && this.ship.shieldSprite) {
        this.ship.shieldSprite.setPosition(this.ship.x, this.ship.y);
    }

    // 更新表情包位置
    if (this.ship && this.ship.emote) {
        this.ship.emote.setPosition(this.ship.x, this.ship.y - 50);
    }
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
        fill: '#ffffffff',
        align: 'center'
    }).setOrigin(0.5);

    // 添加攻击方向指示箭头 (荧光绿)
    // 创建一个指向下方的三角形: 尖端(0, 10), 左底(-6, -8), 右底(6, -8)
    // 这样与飞船默认朝下一致，箭头就会指向外侧
    self.ship.directionArrow = self.add.triangle(0, 0, 0, 10, -6, -8, 6, -8, 0x39ff14);
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'ship');
    otherPlayer.setOrigin(0.5, 0.5);
    otherPlayer.setDisplaySize(50, 50);
    otherPlayer.playerId = playerInfo.playerId;
    otherPlayer.health = playerInfo.health || 100;
    otherPlayer.weaponLevel = playerInfo.weaponLevel || 1;
    otherPlayer.isBot = playerInfo.isBot;
    if (otherPlayer.isBot) {
        otherPlayer.setTint(0xff00ff); // 机器人染为紫色
        otherPlayer.setDepth(10); // 确保飞船在光环之上

        // 创建容器
        const container = self.add.container(playerInfo.x, playerInfo.y);
        container.setDepth(5); // 光环在飞船之下

        // 1. 危险区域填充 (脉冲效果)
        const dangerZone = self.add.graphics();
        dangerZone.fillStyle(0xff0000, 0.1);
        dangerZone.fillCircle(0, 0, 120);
        container.add(dangerZone);

        // 2. 旋转的外圈 (科技感断开圆环)
        const outerRing = self.add.graphics();
        outerRing.lineStyle(3, 0xff0000, 0.8);
        // 绘制三个弧段
        outerRing.beginPath();
        outerRing.arc(0, 0, 120, 0, 1.5, false);
        outerRing.strokePath();
        outerRing.beginPath();
        outerRing.arc(0, 0, 120, 2.1, 3.6, false);
        outerRing.strokePath();
        outerRing.beginPath();
        outerRing.arc(0, 0, 120, 4.2, 5.7, false);
        outerRing.strokePath();
        container.add(outerRing);

        // 3. 内圈扫描线
        const innerRing = self.add.graphics();
        innerRing.lineStyle(1, 0xff4444, 0.5);
        innerRing.strokeCircle(0, 0, 100);
        innerRing.beginPath();
        innerRing.moveTo(0, 0);
        innerRing.lineTo(100, 0); // 扫描针
        innerRing.strokePath();
        container.add(innerRing);

        otherPlayer.laserContainer = container;
        otherPlayer.laserOuter = outerRing;
        otherPlayer.laserInner = innerRing;

        // 简单的脉冲动画
        self.tweens.add({
            targets: dangerZone,
            alpha: 0.25,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    } else {
        otherPlayer.setTint(0x3370d2ff); // 玩家染为蓝色
    }
    self.otherPlayers.add(otherPlayer);

    // 添加名字文本
    otherPlayer.nameText = self.add.text(playerInfo.x, playerInfo.y - 40, playerInfo.name || '敌人', {
        fontSize: '14px',
        fill: '#ffffffff',
        align: 'center'
    }).setOrigin(0.5);
}

function addPowerUp(self, powerUpInfo) {
    let key = 'powerup';
    if (powerUpInfo.type === 'vampire') key = 'health_orb';
    else if (powerUpInfo.type === 'shield') key = 'shield_orb';
    else if (powerUpInfo.type === 'tracking') key = 'tracking_orb';

    const powerUp = self.physics.add.sprite(powerUpInfo.x, powerUpInfo.y, key);
    powerUp.id = powerUpInfo.id;
    powerUp.setDisplaySize(30, 30);
    powerUp.spawnTime = Date.now(); // 记录生成时间，用于保护期
    self.powerUps.add(powerUp);
}

function addChest(self, chestInfo) {
    const chest = self.physics.add.sprite(chestInfo.x, chestInfo.y, 'treasure_chest');
    chest.id = chestInfo.id;
    chest.setDisplaySize(40, 40);
    chest.setImmovable(true); // 宝箱不动
    self.chests.add(chest);
}

function fireBullet(scene, playerInfo, isOwner) {
    const weaponLevel = playerInfo.weaponLevel || 1;


    const createBullet = (offsetX, offsetY, angleOffset) => {
        const bullet = scene.physics.add.sprite(playerInfo.x + offsetX, playerInfo.y + offsetY, 'bullet');
        bullet.setDisplaySize(20, 20);
        bullet.ownerId = playerInfo.playerId || scene.socket.id; // 记录发射者ID

        const angle = playerInfo.rotation + 1.57 + angleOffset; // 1.57是90度修正
        scene.physics.velocityFromRotation(angle, 600, bullet.body.velocity);
        bullet.rotation = playerInfo.rotation + angleOffset;

        setTimeout(() => {
            if (bullet.active) bullet.destroy();
        }, 2000);

        if (isOwner) {
            // 射手端：检查我的子弹是否命中敌人
            scene.physics.add.overlap(bullet, scene.otherPlayers, (b, enemySprite) => {
                if (b.active) {
                    b.destroy();
                    // 敌人血量的乐观视觉更新
                    if (enemySprite.health !== undefined) {
                        enemySprite.health -= 10;
                        updateHealthBar(scene, enemySprite, enemySprite.health);
                    }

                    // 如果是机器人，由射手端发送命中事件
                    if (enemySprite.isBot) {
                        scene.socket.emit('botHit', enemySprite.playerId, 10);
                    }
                }
            });

            // 射手端：检查子弹是否命中宝箱
            scene.physics.add.overlap(bullet, scene.chests, (b, chest) => {
                if (b.active) {
                    b.destroy();
                    scene.socket.emit('chestHit', chest.id, 10);
                }
            });
        } else {
            // 受害者端：检查敌人子弹是否命中我
            scene.physics.add.overlap(bullet, scene.ship, (b, ship) => {
                if (b.active) {
                    b.destroy();
                    // 自身血量的乐观更新
                    const damage = 10;
                    // 简单的客户端护盾预测
                    if (scene.ship.shieldSprite) {
                        // 视觉上不做扣血，等待服务器同步? 或者乐观扣除护盾?
                        // 简单起见，这里只发包，血量由服务器同步
                    } else {
                        scene.health -= damage;
                        updateHealthBar(scene, scene.ship, scene.health);
                    }
                    scene.socket.emit('playerHit', damage, b.ownerId);
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

function showEmote(scene, player, emoteId) {
    // 如果已有表情，先移除
    if (player.emote) {
        player.emote.destroy();
    }

    // 创建新表情
    const key = `emote_${emoteId}`;
    const emote = scene.add.sprite(player.x, player.y - 50, key);
    emote.setDisplaySize(60, 60); // 比飞船(50)稍大
    emote.setDepth(100); // 确保显示在最上层
    player.emote = emote;

    // 3秒后自动销毁
    setTimeout(() => {
        if (player.emote === emote) { // 确保销毁的是当前的表情
            emote.destroy();
            player.emote = null;
        }
    }, 3000);
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

// 追踪导弹发射函数
function fireTrackingMissile(scene, shooter, targetId, isOwner) {
    const missile = scene.physics.add.sprite(shooter.x, shooter.y, 'tracking_missile');
    missile.setDisplaySize(25, 25);
    missile.targetId = targetId;
    missile.speed = 200; // 比普通子弹慢
    missile.destroyed = false; // 标记是否已销毁
    missile.isOwner = isOwner; // 是否是发射者

    // 每帧更新追踪逻辑
    missile.updateTracking = function () {
        // 安全检查：如果导弹已被标记为销毁，立即返回
        if (missile.destroyed || !missile.active) {
            return;
        }

        // 查找目标：可能是自己或其他玩家
        let target = null;
        if (scene.ship && scene.socket.id === targetId) {
            // 目标是当前玩家自己
            target = scene.ship;
        } else {
            // 目标是其他玩家
            target = scene.otherPlayers.getChildren().find(p => p.playerId === targetId);
        }

        if (target && target.active) {
            // 计算朝向目标的角度
            const angle = Phaser.Math.Angle.Between(missile.x, missile.y, target.x, target.y);
            missile.rotation = angle;

            // 朝目标移动
            scene.physics.velocityFromRotation(angle, missile.speed, missile.body.velocity);

            // 检测碰撞（所有客户端都进行视觉销毁）
            if (Phaser.Math.Distance.Between(missile.x, missile.y, target.x, target.y) < 30) {
                // 标记为已销毁
                missile.destroyed = true;
                // 移除事件监听器
                scene.events.off('update', missile.updateTracking, missile);

                // 只有发射者通知服务器命中
                if (missile.isOwner) {
                    scene.socket.emit('trackingMissileHit', targetId);
                    // 播放爆炸音效 (仅自己)
                    if (scene.playSound) scene.playSound('missile');
                }

                // 销毁导弹
                missile.destroy();
            }
        } else {
            // 目标不存在，导弹消失
            missile.destroyed = true;
            scene.events.off('update', missile.updateTracking, missile);
            missile.destroy();
        }
    };

    // 添加到场景更新
    scene.events.on('update', missile.updateTracking, missile);

    // 10秒后自动销毁
    setTimeout(() => {
        if (missile.active && !missile.destroyed) {
            missile.destroyed = true;
            scene.events.off('update', missile.updateTracking, missile);
            missile.destroy();
        }
    }, 10000);
}

// --- 虚拟摇杆实现 ---
function createJoystick(scene) {
    if (scene.joystick) return;

    const radius = 60;
    let x = 100;
    const y = scene.scale.height - 100;

    // 根据设置调整位置
    if (scene.joystickPosition === 'center') {
        x = scene.scale.width / 2;
    } else if (scene.joystickPosition === 'right') {
        x = scene.scale.width - 100;
    } else {
        // default left
        x = 100;
    }

    // 摇杆底座
    const base = scene.add.circle(x, y, radius, 0x888888, 0.5)
        .setScrollFactor(0)
        .setDepth(1000)
        .setInteractive();

    // 摇杆头部
    const thumb = scene.add.circle(x, y, 30, 0xcccccc, 0.8)
        .setScrollFactor(0)
        .setDepth(1001);

    scene.joystick = {
        base: base,
        thumb: thumb,
        active: false,
        angle: 0,
        distance: 0,
        radius: radius,
        originX: x,
        originY: y,
        pointerId: null
    };

    // 触摸事件处理
    scene.input.on('pointerdown', (pointer) => {
        // 检查是否点击在摇杆区域附近
        // 直接检查距离摇杆中心的距离，不再限制象限，从而支持左/中/右所有位置
        const d = Phaser.Math.Distance.Between(pointer.x, pointer.y, scene.joystick.originX, scene.joystick.originY);
        // 扩大一点判定范围 (2.5倍半径)，方便手指粗的玩家
        if (d < radius * 2.5) {
            scene.joystick.active = true;
            scene.joystick.pointerId = pointer.id;
            updateJoystickVisuals(scene, pointer);
        }
    });

    scene.input.on('pointermove', (pointer) => {
        if (scene.joystick.active && pointer.id === scene.joystick.pointerId) {
            updateJoystickVisuals(scene, pointer);
        }
    });

    scene.input.on('pointerup', (pointer) => {
        if (scene.joystick.active && pointer.id === scene.joystick.pointerId) {
            scene.joystick.active = false;
            scene.joystick.pointerId = null;
            // 复位
            scene.joystick.thumb.setPosition(scene.joystick.originX, scene.joystick.originY);
            scene.joystick.distance = 0;
        }
    });
}

function updateJoystickVisuals(scene, pointer) {
    const joy = scene.joystick;
    const angle = Phaser.Math.Angle.Between(joy.originX, joy.originY, pointer.x, pointer.y);
    const dist = Phaser.Math.Distance.Between(joy.originX, joy.originY, pointer.x, pointer.y);

    // 限制摇杆头部在底座范围内
    const clampDist = Math.min(dist, joy.radius);

    joy.thumb.x = joy.originX + Math.cos(angle) * clampDist;
    joy.thumb.y = joy.originY + Math.sin(angle) * clampDist;

    joy.angle = angle;
    joy.distance = clampDist;
}

function destroyJoystick(scene) {
    if (scene.joystick) {
        scene.joystick.base.destroy();
        scene.joystick.thumb.destroy();
        scene.joystick = null;
    }
}
// End of file

