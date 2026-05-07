# 武器音效系统实现总结

## 完成的工作

### 1. 音效配置 ([src/config/audio.js](file:///Users/gzy/mycode/Forge-Duel/src/config/audio.js))

为 **18种武器** 添加了音效配置：

```javascript
export const SFX_AUDIO_FILES = {
  // 现有音效...
  weapon_fireball: "assets/audio/sfx/weapon_fireball.wav",
  weapon_dagger: "assets/audio/sfx/weapon_dagger.wav",
  weapon_lightning: "assets/audio/sfx/weapon_lightning.wav",
  weapon_meteor: "assets/audio/sfx/weapon_meteor.wav",
  weapon_orbit_blades: "assets/audio/sfx/weapon_orbit_blades.wav",
  weapon_scatter_shot: "assets/audio/sfx/weapon_scatter_shot.wav",
  weapon_homing_missile: "assets/audio/sfx/weapon_homing_missile.wav",
  weapon_laser: "assets/audio/sfx/weapon_laser.wav",
  weapon_thunderstorm: "assets/audio/sfx/weapon_thunderstorm.wav",
  weapon_gatling: "assets/audio/sfx/weapon_gatling.wav",
  weapon_mega_missile: "assets/audio/sfx/weapon_mega_missile.wav",
  weapon_prismatic_laser: "assets/audio/sfx/weapon_prismatic_laser.wav",
  weapon_boomerang: "assets/audio/sfx/weapon_boomerang.wav",
  weapon_slash: "assets/audio/sfx/weapon_slash.wav",
  weapon_garlic_aura: "assets/audio/sfx/weapon_garlic_aura.wav",
  weapon_molotov: "assets/audio/sfx/weapon_molotov.wav",
  weapon_gravity_well: "assets/audio/sfx/weapon_gravity_well.wav",
  weapon_death_spiral: "assets/audio/sfx/weapon_death_spiral.wav"
};
```

### 2. 音效参数配置

为每种武器配置了：
- **音量** (SFX_VOLUME): 0.06 - 0.12
- **节流时间** (SFX_THROTTLE_MS): 30 - 250ms

### 3. 音效播放逻辑 ([src/Systems/WeaponSystem.js](file:///Users/gzy/mycode/Forge-Duel/src/Systems/WeaponSystem.js))

在 `fireWeapon` 方法中添加了自动播放音效：

```javascript
if (fired && this.ctx.audio?.playSfx) {
  const weaponSfxKey = `weapon_${weapon.type}`;
  this.ctx.audio.playSfx(weaponSfxKey);
}
```

### 4. 音效文件加载

GameScene 的 preload 方法会自动加载所有 SFX_AUDIO_FILES 中定义的音频文件。

## 创建的文件

### 文档文件
1. **[WEAPON_SOUNDS_README.md](file:///Users/gzy/mycode/Forge-Duel/assets/audio/sfx/WEAPON_SOUNDS_README.md)** - 详细的音效说明和生成指南
2. **[WEAPON_SOUNDS_LIST.txt](file:///Users/gzy/mycode/Forge-Duel/assets/audio/sfx/WEAPON_SOUNDS_LIST.txt)** - 文件清单和快速参考
3. **[generate_placeholder_sounds.sh](file:///Users/gzy/mycode/Forge-Duel/assets/audio/sfx/generate_placeholder_sounds.sh)** - FFmpeg 生成脚本

## 需要创建的音效文件 (18个)

所有文件路径：`/Users/gzy/mycode/Forge-Duel/assets/audio/sfx/`

| 武器类型 | 文件名 | 建议音效特点 |
|---------|--------|-------------|
| dagger | weapon_dagger.wav | 快速"嗖"声 |
| slash | weapon_slash.wav | 锋利斩击声 |
| orbit_blades | weapon_orbit_blades.wav | 旋转金属声 |
| fireball | weapon_fireball.wav | 火焰喷射声 |
| meteor | weapon_meteor.wav | 沉重陨石声 |
| scatter_shot | weapon_scatter_shot.wav | 多弹射击声 |
| homing_missile | weapon_homing_missile.wav | 导弹发射声 |
| gatling | weapon_gatling.wav | 机关枪连射声 |
| mega_missile | weapon_mega_missile.wav | 大型导弹声 |
| boomerang | weapon_boomerang.wav | 飞镖旋转声 |
| lightning | weapon_lightning.wav | 电击/雷鸣声 |
| laser | weapon_laser.wav | 激光"滋滋"声 |
| thunderstorm | weapon_thunderstorm.wav | 持续雷鸣声 |
| prismatic_laser | weapon_prismatic_laser.wav | 多彩激光声 |
| garlic_aura | weapon_garlic_aura.wav | 气场嗡嗡声 |
| molotov | weapon_molotov.wav | 玻璃+火焰声 |
| gravity_well | weapon_gravity_well.wav | 引力扭曲声 |
| death_spiral | weapon_death_spiral.wav | 黑暗旋转声 |

## 快速生成占位音效

### 方法1：使用 FFmpeg 脚本
```bash
cd /Users/gzy/mycode/Forge-Duel/assets/audio/sfx
chmod +x generate_placeholder_sounds.sh
./generate_placeholder_sounds.sh
```

### 方法2：手动生成单个音效
```bash
# 安装 ffmpeg (macOS)
brew install ffmpeg

# 生成火球音效
ffmpeg -f lavfi -i "sine=frequency=800:duration=0.1" \
  -af "afade=t=in:st=0:d=0.01,afade=t=out:st=0.09:d=0.01" \
  -ar 44100 -ac 1 weapon_fireball.wav
```

## 音效推荐来源

1. **Freesound** (freesound.org) - 免费音效库
2. **ZapSplat** (zapsplat.com) - 游戏音效
3. **Kenney.nl** (kenney.nl/assets) - 开源游戏资源

## 测试音效

音效会在以下情况自动播放：
- 玩家使用任何武器攻击时
- 每个武器都有独特的声音

## 调整音效

如果需要调整某个武器的音量或节流时间，修改 `src/config/audio.js`：

```javascript
// 调整音量
export const SFX_VOLUME = {
  // ...
  weapon_fireball: 0.12,  // 增大音量
  weapon_dagger: 0.05,    // 减小音量
};

// 调整节流时间
export const SFX_THROTTLE_MS = {
  // ...
  weapon_gatling: 20,  // 更快的连射
};
```

## 注意事项

1. **占位音效**：当前使用简单的音调，建议尽快替换
2. **音效长度**：建议 0.05-0.3 秒
3. **文件格式**：必须是 WAV, 44100Hz, 16位
4. **性能考虑**：自动加载，无需额外配置
