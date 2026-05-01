import { GameScene } from "./scenes/GameScene.js";
import { RunSummaryScene } from "./scenes/RunSummaryScene.js";
import { UpgradeScene } from "./scenes/UpgradeScene.js";
import { MainMenuScene } from "./scenes/MainMenuScene.js";
import { AuthScene } from "./scenes/AuthScene.js";
import { LobbyScene } from "./scenes/LobbyScene.js";
import { LeaderboardScene } from "./scenes/LeaderboardScene.js";
import { ShipSelectionScene } from "./scenes/ShipSelectionScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: 1280,
  height: 720,
  backgroundColor: "#0c1424",
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  render: {
    powerPreference: "high-performance",
    antialias: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  input: {
    activePointers: 3,
    touch: {
      capture: true
    }
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
    width: 1280,
    height: 720,
    fullscreenTarget: "game-root"
  },
  scene: [MainMenuScene, ShipSelectionScene, GameScene, RunSummaryScene, UpgradeScene, AuthScene, LobbyScene, LeaderboardScene]
};

new Phaser.Game(config);
