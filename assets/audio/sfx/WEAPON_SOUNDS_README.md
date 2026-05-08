# 武器音效文件 - 占位说明

## 概述

本目录包含游戏 **ForgeDuel** 中各种武器的打击音效。

## 需要创建的音效文件

以下是需要创建的武器音效文件（位置：`/Users/gzy/mycode/Forge-Duel/assets/audio/sfx/`）：

### 近战武器
1. `weapon_dagger.wav` - 匕首/飞刀音效
2. `weapon_slash.wav` - 斩击音效
3. `weapon_orbit_blades.wav` - 轨道刀片音效

### 投射武器
4. `weapon_fireball.wav` - 火球音效
5. `weapon_meteor.wav` - 流星音效
6. `weapon_scatter_shot.wav` - 散射音效
7. `weapon_homing_missile.wav` - 追踪导弹音效
8. `weapon_gatling.wav` - 加特林音效
9. `weapon_mega_missile.wav` - 超级导弹音效
10. `weapon_boomerang.wav` - 回旋镖音效

### 能量武器
11. `weapon_lightning.wav` - 闪电音效
12. `weapon_laser.wav` - 激光音效
13. `weapon_thunderstorm.wav` - 雷暴音效
14. `weapon_prismatic_laser.wav` - 棱镜激光音效

### 特殊武器
15. `weapon_garlic_aura.wav` - 大蒜光环音效
16. `weapon_molotov.wav` - 燃烧弹音效
17. `weapon_gravity_well.wav` - 重力井音效
18. `weapon_death_spiral.wav` - 死亡螺旋音效

## 音效建议

### 声音特点
- **长度**：建议 0.05-0.3 秒
- **格式**：WAV 格式，44100Hz，16位，单声道
- **风格**：像素游戏风格，简洁有力

### 各武器音效建议

| 武器 | 建议音效特点 |
|------|-------------|
| dagger | 快速的"嗖"声，金属质感 |
| slash | 锋利的斩击声，有力 |
| orbit_blades | 持续的旋转金属声 |
| fireball | 火焰喷射/爆炸声 |
| meteor | 沉重的陨石坠落声 |
| scatter_shot | 多个弹丸射击声 |
| homing_missile | 导弹发射+追踪音效 |
| gatling | 连续的机关枪射击声 |
| mega_missile | 更大更重的导弹声 |
| boomerang | 飞镖旋转+返回声 |
| lightning | 电击/雷鸣声 |
| laser | 激光发射的"滋滋"声 |
| thunderstorm | 持续的雷鸣+闪电声 |
| prismatic_laser | 多彩激光的嗡鸣声 |
| garlic_aura | 持续的气场/光环声 |
| molotov | 玻璃破碎+火焰燃烧声 |
| gravity_well | 引力扭曲的嗡嗡声 |
| death_spiral | 黑暗旋转的呼啸声 |

## 快速生成占位音效（使用 FFmpeg）

如果你安装了 FFmpeg，可以使用以下命令快速生成简单的占位音效：

```bash
# 安装 ffmpeg (macOS)
brew install ffmpeg

# 进入音频目录
cd /Users/gzy/mycode/Forge-Duel/assets/audio/sfx

# 为所有武器生成占位音效（不同频率的音调）
ffmpeg -f lavfi -i "sine=frequency=800:duration=0.1" -ar 44100 -ac 1 weapon_fireball.wav
ffmpeg -f lavfi -i "sine=frequency=600:duration=0.1" -ar 44100 -ac 1 weapon_dagger.wav
ffmpeg -f lavfi -i "sine=frequency=400:duration=0.1" -ar 44100 -ac 1 weapon_lightning.wav
ffmpeg -f lavfi -i "sine=frequency=1000:duration=0.15" -ar 44100 -ac 1 weapon_meteor.wav
ffmpeg -f lavfi -i "sine=frequency=700:duration=0.1" -ar 44100 -ac 1 weapon_orbit_blades.wav
# ... 为其他武器生成类似命令
```

## 推荐音效资源网站

1. **Freesound** (freesound.org) - 免费音效库
2. **ZapSplat** (zapsplat.com) - 游戏音效
3. **Kenney.nl** (kenney.nl/assets) - 开源游戏资源
4. **GameDev Market** (gamedevmarket.net) - 付费高质量音效

## 代码中使用

音效已在 `src/config/audio.js` 中配置好，可以这样使用：

```javascript
// 在 WeaponSystem 或 AudioManager 中
this.audioManager.playSfx(`weapon_${weaponType}`);
```

例如：
- `this.audioManager.playSfx("weapon_fireball")`
- `this.audioManager.playSfx("weapon_dagger")`
- `this.audioManager.playSfx("weapon_lightning")`

## 注意事项

- 占位音效应该尽快替换为真实的高质量音效
- 确保音效与武器的视觉效果匹配
- 测试不同武器同时攻击时的音效混叠效果
- 根据实际音效调整音量（可在 audio.js 中修改 SFX_VOLUME）
