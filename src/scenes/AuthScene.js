import { createMainMenuBackground, createVSPanel, createVSButton } from "../ui/vsUI.js";
import { createBackButton } from "../ui/createBackButton.js";

const API_BASE = window.location.origin;

export class AuthScene extends Phaser.Scene {
  constructor() {
    super("AuthScene");
  }

  preload() {
    if (!this.textures.exists("main_menu_bg")) {
      this.load.image("main_menu_bg", "assets/sprites/ui/Home Page Background.png");
    }
  }

  create() {
    const camera = this.cameras.main;
    const cx = camera.width * 0.5;
    const cy = camera.height * 0.5;

    // ── Main Menu Background ──
    createMainMenuBackground(this);

    // ── Panel ──
    createVSPanel(this, cx, cy, 420, 400);

    // ── Title ──
    this.add.text(cx, cy - 155, "ForgeDuel", {
      fontFamily: "ZpixOne", fontSize: "36px", color: "#f8fbff",
      stroke: "#2a2a3a", strokeThickness: 6
    }).setOrigin(0.5);

    this.isLogin = true;
    this.errorText = this.add.text(cx, cy - 105, "", {
      fontFamily: "ZpixOne", fontSize: "14px", color: "#ff6666"
    }).setOrigin(0.5);

    this.tabLogin = this._createTab(cx - 60, cy - 78, "登录", true);
    this.tabRegister = this._createTab(cx + 60, cy - 78, "注册", false);

    this.usernameInput = this._createInput(cx, cy - 30, "用户名 (3-20字符)", false);
    this.passwordInput = this._createInput(cx, cy + 20, "密码 (6位以上)", true);

    this._onResize = () => this._positionAllDomInputs();
    window.addEventListener("resize", this._onResize);
    this.scale.on("resize", this._onResize);
    this._positionAllDomInputs();

    this.submitBtn = this._createButton(cx, cy + 80, "登录", () => this._handleSubmit());

    this._createLink(cx, cy + 130, "游客模式（仅单机）", () => {
      this._cleanupDom();
      this.scene.start("MainMenuScene");
    });

    createBackButton(this, () => {
      this._cleanupDom();
      this.scene.start("MainMenuScene");
    });

    if (this.input?.keyboard) {
      this.input.keyboard.on("keydown-ESC", () => {
        this._cleanupDom();
        this.scene.start("MainMenuScene");
      });
    }
  }

  _createTab(x, y, label, isActive) {
    const bg = this.add.rectangle(x, y, 100, 30, isActive ? 0x2a2a4a : 0x1a1a2a, 1)
      .setStrokeStyle(2, isActive ? 0xc4a040 : 0x4a4a5a, 1)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "ZpixOne", fontSize: "16px", color: isActive ? "#ffffff" : "#888888"
    }).setOrigin(0.5);

    bg.on("pointerdown", () => {
      this.isLogin = label === "登录";
      this.tabLogin.bg.setStrokeStyle(2, this.isLogin ? 0xc4a040 : 0x4a4a5a, 1);
      this.tabLogin.text.setColor(this.isLogin ? "#ffffff" : "#888888");
      this.tabRegister.bg.setStrokeStyle(2, !this.isLogin ? 0xc4a040 : 0x4a4a5a, 1);
      this.tabRegister.text.setColor(!this.isLogin ? "#ffffff" : "#888888");
      this.submitBtn.text.setText(this.isLogin ? "登录" : "注册");
      this.errorText.setText("");
    });

    return { bg, text };
  }

  _createInput(x, y, placeholder, isPassword) {
    if (typeof document === "undefined") return null;

    const input = document.createElement("input");
    input.type = isPassword ? "password" : "text";
    input.placeholder = placeholder;
    input.maxLength = 20;
    input._gameY = y;
    Object.assign(input.style, {
      position: "absolute",
      transform: "translate(-50%, -50%)",
      fontFamily: "ZpixOne",
      background: "#1a1a2a",
      color: "#ffffff",
      border: "2px solid #c4a040",
      borderRadius: "4px",
      outline: "none",
      zIndex: "200",
      boxSizing: "border-box",
      textAlign: "center"
    });
    input.addEventListener("focus", () => { input.style.borderColor = "#fef08a"; });
    input.addEventListener("blur", () => { input.style.borderColor = "#c4a040"; });
    document.body.appendChild(input);
    this._positionDomInput(input);
    return input;
  }

  _positionDomInput(input) {
    if (!input || typeof document === "undefined") return;
    const canvas = this.game.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const gameY = input._gameY ?? 0;

    // Scale factor: canvas CSS pixels vs design resolution (1280x720)
    const scaleX = rect.width / 1280;
    const scaleY = rect.height / 720;

    const screenY = rect.top + gameY * scaleY;
    const centerX = rect.left + rect.width * 0.5;

    // Scale input size proportionally, but cap so it never overflows the panel (≈420 game px)
    const designInputWidth = 260;
    const maxWidth = rect.width * 0.72; // leave side margin
    const inputWidth = Math.min(designInputWidth * scaleX, maxWidth);
    const fontSize = Math.max(12, Math.round(14 * Math.min(scaleX, scaleY)));
    const padH = Math.max(6, Math.round(8 * scaleX));
    const padV = Math.max(6, Math.round(8 * scaleY));

    input.style.top = `${screenY}px`;
    input.style.left = `${centerX}px`;
    input.style.width = `${Math.round(inputWidth)}px`;
    input.style.fontSize = `${fontSize}px`;
    input.style.padding = `${padV}px ${padH}px`;
  }

  _positionAllDomInputs() {
    this._positionDomInput(this.usernameInput);
    this._positionDomInput(this.passwordInput);
  }

  _createButton(x, y, label, onClick) {
    return createVSButton(this, x, y, label, {
      width: 100, fontSize: "16px", onClick
    });
  }

  _createLink(x, y, label, onClick) {
    const text = this.add.text(x, y, label, {
      fontFamily: "ZpixOne", fontSize: "14px", color: "#c4a040"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    text.on("pointerdown", onClick);
    text.on("pointerover", () => text.setColor("#fef08a"));
    text.on("pointerout", () => text.setColor("#c4a040"));
    return text;
  }

  async _handleSubmit() {
    const username = this.usernameInput?.value?.trim();
    const password = this.passwordInput?.value;

    if (!username || username.length < 3) {
      this.errorText.setText("用户名至少3个字符");
      return;
    }
    if (!password || password.length < 6) {
      this.errorText.setText("密码至少6位");
      return;
    }

    this.errorText.setText("请稍候...");
    this.submitBtn.plate.disableInteractive();

    try {
      const endpoint = this.isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        this.errorText.setText(data.error || "请求失败");
        this.submitBtn.plate.setInteractive({ useHandCursor: true });
        return;
      }

      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("forgeduel_token", data.token);
        window.localStorage.setItem("forgeduel_user", JSON.stringify(data.user));
      }

      this._cleanupDom();
      this.scene.start("MainMenuScene", { authUser: data.user, authToken: data.token });
    } catch (err) {
      this.errorText.setText("网络错误，请检查服务器是否运行");
      this.submitBtn.plate.setInteractive({ useHandCursor: true });
    }
  }

  _cleanupDom() {
    if (this._onResize) {
      window.removeEventListener("resize", this._onResize);
      this.scale.off("resize", this._onResize);
      this._onResize = null;
    }
    this.usernameInput?.remove();
    this.passwordInput?.remove();
  }

  shutdown() {
    this._cleanupDom();
  }
}
