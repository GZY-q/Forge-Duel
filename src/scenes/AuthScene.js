const API_BASE = window.location.origin;

export class AuthScene extends Phaser.Scene {
  constructor() {
    super("AuthScene");
  }

  create() {
    const camera = this.cameras.main;
    const cx = camera.width * 0.5;
    const cy = camera.height * 0.5;

    this.add.rectangle(cx, cy, camera.width, camera.height, 0x071120, 1);
    for (let y = 0; y < camera.height; y += 32) {
      const color = Math.floor(y / 32) % 2 === 0 ? 0x0d1a31 : 0x11213d;
      this.add.rectangle(cx, y + 16, camera.width, 30, color, 1).setOrigin(0.5);
    }

    this.add.rectangle(cx, cy, 420, 400, 0x10203a, 0.96).setStrokeStyle(3, 0x5ca7ff, 0.96);
    this.add.rectangle(cx, cy, 400, 380, 0x0b1830, 0.94).setStrokeStyle(1, 0x3a7abf, 0.88);

    this.add.text(cx, cy - 155, "ForgeDuel", {
      fontFamily: "Arial", fontSize: "36px", color: "#f8fbff",
      stroke: "#102640", strokeThickness: 6
    }).setOrigin(0.5);

    this.isLogin = true;
    this.errorText = this.add.text(cx, cy - 105, "", {
      fontFamily: "Arial", fontSize: "14px", color: "#ff6666"
    }).setOrigin(0.5);

    this.tabLogin = this._createTab(cx - 60, cy - 78, "登录", true);
    this.tabRegister = this._createTab(cx + 60, cy - 78, "注册", false);

    this.usernameInput = this._createInput(cx, cy - 30, "用户名 (3-20字符)");
    this.passwordInput = this._createInput(cx, cy + 20, "密码 (6位以上)", true);

    this.submitBtn = this._createButton(cx, cy + 80, "登录", () => this._handleSubmit());

    this._createLink(cx, cy + 130, "游客模式（仅单机）", () => {
      this._cleanupDom();
      this.scene.start("MainMenuScene");
    });

    this._createLink(cx, cy + 160, "返回主菜单", () => {
      this._cleanupDom();
      this.scene.start("MainMenuScene");
    });
  }

  _createTab(x, y, label, isActive) {
    const bg = this.add.rectangle(x, y, 100, 30, isActive ? 0x1a324f : 0x0b1830, 1)
      .setStrokeStyle(1, isActive ? 0x6ab8ff : 0x3a5a7f, 1)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "Arial", fontSize: "16px", color: isActive ? "#ffffff" : "#7a9abf"
    }).setOrigin(0.5);

    bg.on("pointerdown", () => {
      this.isLogin = label === "登录";
      this.tabLogin.bg.setStrokeStyle(1, this.isLogin ? 0x6ab8ff : 0x3a5a7f, 1);
      this.tabLogin.text.setColor(this.isLogin ? "#ffffff" : "#7a9abf");
      this.tabRegister.bg.setStrokeStyle(1, !this.isLogin ? 0x6ab8ff : 0x3a5a7f, 1);
      this.tabRegister.text.setColor(!this.isLogin ? "#ffffff" : "#7a9abf");
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
    Object.assign(input.style, {
      position: "absolute",
      left: "50%",
      top: `${(y / 720) * 100}%`,
      transform: "translate(-50%, -50%)",
      width: "280px",
      padding: "10px 14px",
      fontSize: "16px",
      fontFamily: "Arial",
      background: "#0b1830",
      color: "#ffffff",
      border: "2px solid #3a7abf",
      borderRadius: "6px",
      outline: "none",
      zIndex: "200",
      boxSizing: "border-box"
    });
    input.addEventListener("focus", () => { input.style.borderColor = "#6ab8ff"; });
    input.addEventListener("blur", () => { input.style.borderColor = "#3a7abf"; });
    document.body.appendChild(input);
    return input;
  }

  _createButton(x, y, label, onClick) {
    const bg = this.add.rectangle(x, y, 280, 46, 0x1a324f, 1)
      .setStrokeStyle(2, 0x6ab8ff, 1)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "Arial", fontSize: "20px", color: "#ffffff",
      stroke: "#0f1c2f", strokeThickness: 4
    }).setOrigin(0.5);

    bg.on("pointerdown", onClick);
    text.on("pointerdown", onClick);
    bg.on("pointerover", () => bg.setStrokeStyle(3, 0x9bd3ff, 1));
    bg.on("pointerout", () => bg.setStrokeStyle(2, 0x6ab8ff, 1));

    return { bg, text };
  }

  _createLink(x, y, label, onClick) {
    const text = this.add.text(x, y, label, {
      fontFamily: "Arial", fontSize: "14px", color: "#7ab8e0"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    text.on("pointerdown", onClick);
    text.on("pointerover", () => text.setColor("#ffffff"));
    text.on("pointerout", () => text.setColor("#7ab8e0"));
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
    this.submitBtn.bg.disableInteractive();

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
        this.submitBtn.bg.setInteractive({ useHandCursor: true });
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
      this.submitBtn.bg.setInteractive({ useHandCursor: true });
    }
  }

  _cleanupDom() {
    this.usernameInput?.remove();
    this.passwordInput?.remove();
  }

  shutdown() {
    this._cleanupDom();
  }
}
