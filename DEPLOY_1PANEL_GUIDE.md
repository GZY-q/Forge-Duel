# 🚀 在1Panel面板部署到Ubuntu服务器

## 📋 部署前准备

### 1. 服务器要求
- Ubuntu 18.04 / 20.04 / 22.04
- 至少 1GB 内存
- 已安装1Panel面板
- 服务器已开放端口：80, 443, 8080（或您设置的端口）

### 2. 本地准备
确保您的项目已经测试通过，包含以下文件：
- [x] package.json
- [x] server.js
- [x] models/
- [x] routes/
- [x] public/
- [x] .env.example

---

## 🎯 部署步骤

## 第一步：准备项目文件

### 1.1 创建生产环境配置文件

在本地项目创建 `.env.production` 文件：

```bash
# 生产环境配置
MONGODB_URI=mongodb://localhost:27017/forge-duel
SESSION_SECRET=请改成超级复杂的随机字符串-至少32位
PORT=8080
NODE_ENV=production
```

### 1.2 打包项目

在本地终端执行：

```bash
# 1. 确保所有依赖都在 package.json 中
npm install

# 2. 创建部署包（排除 node_modules）
# 方法A：使用 tar 打包
tar -czf forge-duel.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  .

# 方法B：使用 zip 打包（如果服务器只支持zip）
zip -r forge-duel.zip . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "*.log" \
  -x ".DS_Store"
```

---

## 第二步：在1Panel中安装MongoDB

### 2.1 进入1Panel面板

1. 浏览器打开：`http://你的服务器IP:端口`
2. 登录1Panel管理面板

### 2.2 安装MongoDB

1. 点击左侧菜单 **"应用商店"** 或 **"容器"**
2. 搜索 **"MongoDB"**
3. 点击 **"安装"**
4. 配置参数：
   ```
   容器名称：mongodb
   端口映射：27017:27017（默认）
   用户名：admin（可选，如需要认证）
   密码：设置一个强密码
   数据库名：forge-duel
   ```
5. 点击 **"确认安装"**
6. 等待安装完成

### 2.3 验证MongoDB安装

在1Panel的 **"终端"** 中执行：

```bash
docker ps | grep mongodb
# 应该能看到mongodb容器正在运行
```

---

## 第三步：上传项目到服务器

### 3.1 创建项目目录

1. 在1Panel中，点击 **"文件管理"**
2. 导航到 `/opt` 或 `/www/wwwroot`
3. 创建新文件夹：`forge-duel`
4. 进入该文件夹

### 3.2 上传项目文件

**方法A：通过1Panel文件管理**
1. 点击 **"上传"** 按钮
2. 选择之前打包的 `forge-duel.tar.gz` 或 `forge-duel.zip`
3. 上传完成后，点击文件 → **"解压"**

**方法B：通过SCP（推荐）**

在本地终端执行：
```bash
scp forge-duel.tar.gz root@你的服务器IP:/opt/forge-duel/
```

然后在1Panel终端中解压：
```bash
cd /opt/forge-duel
tar -xzf forge-duel.tar.gz
rm forge-duel.tar.gz  # 删除压缩包
```

### 3.3 配置环境变量

在1Panel文件管理中，进入项目目录：

1. 找到 `.env.example` 文件
2. 复制它并重命名为 `.env`
3. 点击 `.env` → **"编辑"**
4. 修改内容：

```bash
# 生产环境配置
MONGODB_URI=mongodb://localhost:27017/forge-duel
# 或如果MongoDB设置了认证：
# MONGODB_URI=mongodb://admin:你的密码@localhost:27017/forge-duel?authSource=admin

SESSION_SECRET=生成一个复杂的随机字符串
PORT=8080
NODE_ENV=production
```

💡 **生成安全的SESSION_SECRET**：
```bash
# 在1Panel终端执行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 第四步：安装Node.js和依赖

### 4.1 安装Node.js

在1Panel中：

**方法A：通过应用商店安装**
1. 点击 **"应用商店"**
2. 搜索 **"Node.js"** 或 **"运行环境"**
3. 安装 Node.js（建议版本 18.x 或 20.x）

**方法B：通过终端安装**

在1Panel终端执行：

```bash
# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node -v
npm -v
```

### 4.2 安装项目依赖

在1Panel终端中：

```bash
cd /opt/forge-duel
npm install --production
```

---

## 第五步：使用PM2运行应用

### 5.1 安装PM2

```bash
npm install -g pm2
```

### 5.2 创建PM2配置文件

在项目根目录创建 `ecosystem.config.js`：

1. 在1Panel文件管理中，点击 **"新建文件"**
2. 文件名：`ecosystem.config.js`
3. 内容：

```javascript
module.exports = {
  apps: [{
    name: 'forge-duel',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 5.3 创建日志目录

```bash
cd /opt/forge-duel
mkdir logs
```

### 5.4 启动应用

```bash
cd /opt/forge-duel
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5.5 验证运行状态

```bash
pm2 status
pm2 logs forge-duel
```

您应该看到：
- `MongoDB连接成功`
- `Server is running on port 8080`

---

## 第六步：配置Nginx反向代理

### 6.1 在1Panel中配置网站

1. 点击 **"网站"** → **"创建网站"**
2. 填写信息：
   ```
   网站名称：forge-duel
   域名：你的域名.com（或使用IP）
   端口：80, 443
   ```
3. 点击 **"确认"**

### 6.2 配置反向代理

1. 找到刚创建的网站 → 点击 **"配置"**
2. 找到 **"反向代理"** 或直接编辑Nginx配置
3. 添加以下配置：

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Socket.IO 支持
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

4. 保存并重启Nginx

### 6.3 测试访问

浏览器访问：
- `http://你的域名.com` 或
- `http://你的服务器IP`

应该能看到登录界面！

---

## 第七步：配置SSL证书（推荐）

### 7.1 申请免费SSL证书

在1Panel中：

1. 进入 **"网站"** → 找到您的网站
2. 点击 **"SSL"** 或 **"证书"**
3. 选择 **"Let's Encrypt"**（免费）
4. 输入邮箱
5. 点击 **"申请"**
6. 等待自动配置完成

### 7.2 强制HTTPS

在网站配置中启用 **"强制HTTPS"**

现在可以通过 `https://你的域名.com` 访问！

---

## 第八步：配置防火墙

### 8.1 开放必要端口

在1Panel终端或服务器SSH中：

```bash
# 如果使用ufw
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp  # Node.js端口（可选，建议只允许本地访问）
sudo ufw enable

# 检查状态
sudo ufw status
```

### 8.2 云服务器安全组

如果使用阿里云、腾讯云等：
1. 登录云服务器控制台
2. 找到 **"安全组"** 设置
3. 添加规则：
   - 允许 TCP 80 端口（HTTP）
   - 允许 TCP 443 端口（HTTPS）

---

## 🔧 常用维护命令

### PM2 管理

```bash
# 查看所有应用
pm2 list

# 查看日志
pm2 logs forge-duel

# 重启应用
pm2 restart forge-duel

# 停止应用
pm2 stop forge-duel

# 删除应用
pm2 delete forge-duel

# 查看资源使用
pm2 monit
```

### 更新代码

```bash
# 1. 停止应用
pm2 stop forge-duel

# 2. 备份旧代码
cd /opt
cp -r forge-duel forge-duel-backup

# 3. 上传新代码并解压（通过1Panel文件管理）

# 4. 安装新依赖
cd /opt/forge-duel
npm install --production

# 5. 重启应用
pm2 restart forge-duel
```

### MongoDB 管理

```bash
# 进入MongoDB容器
docker exec -it mongodb mongosh

# 查看数据库
show dbs

# 使用数据库
use forge-duel

# 查看用户
db.users.find().pretty()

# 退出
exit
```

---

## 📊 监控和日志

### 查看应用日志

```bash
# PM2日志
pm2 logs forge-duel --lines 100

# 错误日志
tail -f /opt/forge-duel/logs/err.log

# 输出日志
tail -f /opt/forge-duel/logs/out.log
```

### Nginx日志

在1Panel中：
1. 点击 **"网站"** → 找到您的网站
2. 点击 **"日志"**
3. 查看访问日志和错误日志

---

## 🔐 安全建议

### 1. 修改默认端口

编辑 `.env`：
```bash
PORT=自定义端口如3000
```

### 2. 设置强密码

- MongoDB密码
- SESSION_SECRET
- 服务器root密码

### 3. 定期备份

在1Panel中设置 **"定时任务"**：

```bash
#!/bin/bash
# 备份数据库
docker exec mongodb mongodump --out /backup/$(date +%Y%m%d)

# 备份代码
tar -czf /backup/forge-duel-$(date +%Y%m%d).tar.gz /opt/forge-duel
```

### 4. 更新依赖

```bash
cd /opt/forge-duel
npm audit fix
pm2 restart forge-duel
```

---

## ❓ 常见问题

### Q1: MongoDB连接失败？

**解决方案**：
```bash
# 检查MongoDB容器状态
docker ps | grep mongodb

# 如果未运行，启动它
docker start mongodb

# 检查连接
docker exec -it mongodb mongosh
```

### Q2: 应用无法访问？

**检查清单**：
- [ ] PM2应用是否运行？`pm2 status`
- [ ] 防火墙端口是否开放？`sudo ufw status`
- [ ] Nginx配置是否正确？
- [ ] 云服务器安全组是否配置？

### Q3: WebSocket连接失败？

**解决方案**：确保Nginx配置中包含WebSocket支持：
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

---

## 🎯 部署检查清单

完成以下所有步骤：

- [ ] MongoDB已安装并运行
- [ ] 项目文件已上传
- [ ] .env配置正确
- [ ] npm依赖已安装
- [ ] PM2应用运行正常
- [ ] Nginx反向代理配置完成
- [ ] 防火墙端口已开放
- [ ] SSL证书已配置（推荐）
- [ ] 应用可以正常访问

---

## 🎉 部署完成！

现在您的游戏已经在生产服务器上运行了！

访问地址：
- HTTP: `http://你的域名.com` 或 `http://服务器IP`
- HTTPS: `https://你的域名.com`

---

## 📞 需要帮助？

- 查看PM2日志：`pm2 logs forge-duel`
- 查看1Panel日志：面板 → 日志
- MongoDB日志：`docker logs mongodb`

祝部署顺利！🚀✨
