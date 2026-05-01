# 运行时资源来源说明

本项目使用 `assets/` 作为运行时资源的唯一来源。

## 实时运行时路径
- 玩家精灵: `assets/sprites/player/*`
- 敌人精灵: `assets/sprites/enemies/*`
- 武器精灵/图标: `assets/sprites/weapons/*`
- 船只环境精灵: `assets/sprites/environment/ship/*`
- UI 精灵: `assets/sprites/ui/*`
- 音效: `assets/audio/sfx/*`
- 音乐: `assets/audio/music/*`
- 图集: `assets/atlas/*`
- 第三方原始包: `assets/vendor/*`

## 构建行为
- `scripts/build.mjs` 将 `assets/` 复制到 `dist/assets/`。
- 运行时从场景代码中声明的 `assets/...` 路径加载资源。

## 注意事项
- `assets/` 是唯一的运行时资源来源。
- 请将所有生产资源放在此目录下，以确保构建输出一致。
- 将第三方原始/源包放在 `assets/vendor/` 下，只将运行时选定的文件提升到对应的分类文件夹中。