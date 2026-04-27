# 🎮 宇宙海盗大战 - 用户系统快速开始指南

## ⚡ 快速开始（推荐新手）

### 方案A: MongoDB Atlas（云数据库 - 推荐）

这是最简单的方案，不需要安装任何数据库！

#### 步骤：

1. **注册MongoDB Atlas免费账号**
   - 访问：https://www.mongodb.com/cloud/atlas/register
   - 点击"Start Free"注册账号

2. **创建集群**
   - 登录后，点击"Build a Database"
   - 选择"FREE"免费方案
   - 选择离您最近的区域（如Singapore）
   - 点击"Create"

3. **配置数据库访问**
   - **设置用户名和密码**（记住这个密码！）
   - **网络访问**：点击"Add IP Address" → 选择"Allow Access from Anywhere" → 确认

4. **获取连接字符串**
   - 点击"Connect" → "Connect your application"
   - 复制连接字符串（类似：mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/）
   - 将 `<password>` 替换为您设置的密码
   - 在URL末尾添加数据库名：`/forge-duel`

5. **更新环境变量**
   
   创建或编辑项目根目录的 `.env` 文件：
   ```bash
   MONGODB_URI=mongodb+srv://你的用户名:你的密码@cluster0.xxxxx.mongodb.net/forge-duel?retryWrites=true&w=majority
   SESSION_SECRET=任意随机字符串-请改成复杂的
   PORT=8080
   NODE_ENV=development
   ```

6. **启动服务器**
   ```bash
   npm start
   ```

7. **访问游戏**
   
   打开浏览器：http://localhost:8080

---

### 方案B: 本地MongoDB（适合熟悉命令行的用户）

#### macOS安装：

```bash
# 1. 使用Homebrew安装MongoDB
brew tap mongodb/brew
brew install mongodb-community@7.0

# 2. 启动MongoDB服务
brew services start mongodb-community@7.0

# 3. 验证MongoDB是否运行
mongosh
# 看到提示符后输入 exit 退出

# 4. 启动游戏服务器
npm start
```

#### Windows安装：

1. 下载MongoDB：https://www.mongodb.com/try/download/community
2. 运行安装程序，选择"Complete"安装
3. 确保勾选"Install MongoDB as a Service"
4. 完成后MongoDB会自动启动
5. 运行 `npm start` 启动游戏服务器

#### Linux安装：

```bash
# Ubuntu/Debian
sudo apt-get install -y mongodb

# 启动服务
sudo systemctl start mongodb
sudo systemctl enable mongodb

# 启动游戏服务器
npm start
```

---

## 🔧 故障排除

### 问题1: "MongoDB连接失败"

**解决方案**：
- 检查MongoDB是否正在运行
  ```bash
  # macOS/Linux
  ps aux | grep mongod
  
  # 如果没有运行，启动它：
  brew services start mongodb-community@7.0  # macOS
  sudo systemctl start mongodb              # Linux
  ```

- 如果使用Atlas，检查：
  - 连接字符串是否正确
  - 密码是否包含特殊字符（需要URL编码）
  - IP地址是否在白名单中

### 问题2: "端口8080已被占用"

**解决方案**：
修改 `.env` 文件中的端口：
```
PORT=3000
```

### 问题3: Session不工作

**解决方案**：
1. 确保 `.env` 文件存在且包含 `SESSION_SECRET`
2. 清除浏览器缓存和Cookie
3. 检查浏览器是否允许Cookie

---

## 📊 数据库管理工具（可选）

### MongoDB Compass（图形界面）

1. 下载：https://www.mongodb.com/try/download/compass
2. 安装后打开
3. 连接字符串：
   - 本地：`mongodb://localhost:27017`
   - Atlas：使用您的Atlas连接字符串
4. 可以查看、编辑用户数据

---

## ✅ 验证安装

启动服务器后，应该看到：
```
MongoDB连接成功
Server is running on port 8080
```

如果看到这些消息，说明一切正常！🎉

---

## 🎯 推荐配置

**初学者/快速测试**：使用MongoDB Atlas（方案A）
**开发环境**：使用本地MongoDB（方案B）
**生产环境**：使用MongoDB Atlas专业版或自建服务器

---

## 📞 需要帮助？

1. 查看控制台错误信息
2. 检查 `.env` 文件配置
3. 确保所有依赖已安装（`npm install`）
4. 查看 `AUTH_README.md` 了解更多技术细节

---

祝您游戏愉快！🚀✨
