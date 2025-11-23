# 🚀 1Panel部署指南 - 快速开始

## 📖 文档导航

欢迎使用1Panel部署宇宙海盗大战游戏！以下是完整的部署文档：

### 📚 必读文档
1. **DEPLOY_1PANEL_GUIDE.md** - 详细部署教程（强烈推荐先读这个）
2. **DEPLOYMENT_CHECKLIST.md** - 部署清单（按步骤打勾）
3. **AUTH_README.md** - 用户系统功能说明

### 🛠️ 配置文件
- **ecosystem.config.js** - PM2配置文件
- **nginx.conf.example** - Nginx配置示例
- **.env.production** - 生产环境配置模板

### 🎯 快速开始（5分钟）

#### 本地准备
```bash
# 1. 生成部署包
./deploy.sh

# 2. 上传到服务器
scp forge-duel-deploy.tar.gz root@你的服务器IP:/opt/forge-duel/
```

#### 服务器部署
```bash
# 1. 解压
cd /opt/forge-duel
tar -xzf forge-duel-deploy.tar.gz

# 2. 配置环境变量
cp .env.production .env
nano .env  # 修改 SESSION_SECRET 和其他配置

# 3. 安装依赖
npm install --production
npm install -g pm2

# 4. 启动应用
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 1Panel配置
1. 应用商店 → 安装MongoDB
2. 网站 → 创建网站 → 配置反向代理到端口8080
3. SSL → 申请Let's Encrypt证书

### ✅ 验证部署成功

访问 `http://你的域名` 应该能看到登录界面！

---

## 📋 部署架构

```
用户浏览器
    ↓ HTTPS (443)
Nginx反向代理
    ↓ 转发到
PM2进程管理器
    ↓ 运行
Node.js应用 (8080端口)
    ↓ 连接
MongoDB数据库 (Docker容器)
```

---

## 🔧 常用维护命令

### PM2应用管理
```bash
pm2 list              # 查看所有应用
pm2 logs forge-duel   # 实时日志
pm2 restart all       # 重启应用
pm2 monit             # 监控面板
```

### 更新代码流程
```bash
# 本地
./deploy.sh
scp forge-duel-deploy.tar.gz root@服务器IP:/opt/forge-duel/

# 服务器
cd /opt/forge-duel
pm2 stop forge-duel
tar -xzf forge-duel-deploy.tar.gz --overwrite
npm install --production
pm2 restart forge-duel
```

### 数据库管理
```bash
# 进入MongoDB
docker exec -it mongodb mongosh

# 备份数据库
docker exec mongodb mongodump --out /backup/$(date +%Y%m%d)
```

---

## ❓ 常见问题

### Q: MongoDB连接失败？
```bash
docker ps | grep mongodb    # 检查是否运行
docker start mongodb        # 启动
```

### Q: 应用无法访问？
1. 检查PM2：`pm2 status`
2. 检查防火墙：`sudo ufw status`
3. 检查Nginx：`nginx -t && systemctl status nginx`

### Q: WebSocket连接失败？
确保Nginx配置包含WebSocket支持：
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

---

## 🔐 安全建议

- ✅ 使用强密码（MongoDB、SESSION_SECRET）
- ✅ 启用HTTPS（Let's Encrypt免费证书）
- ✅ 配置防火墙（只开放必要端口）
- ✅ 定期备份数据库和代码
- ✅ 定期更新依赖：`npm audit fix`

---

## 📞 获取帮助

### 查看日志
```bash
# PM2日志
pm2 logs forge-duel

# Nginx日志
tail -f /var/log/nginx/error.log

# MongoDB日志
docker logs mongodb
```

### 系统监控
```bash
# 资源使用
pm2 monit

# 磁盘空间
df -h

# 内存使用
free -h
```

---

## 🎉 部署成功标志

当你看到：
- ✅ PM2显示 `forge-duel` 状态为 `online`
- ✅ 日志显示 `MongoDB连接成功`
- ✅ 日志显示 `Server is running on port 8080`
- ✅ 浏览器能正常访问登录界面
- ✅ 注册登录功能正常工作

恭喜！你已经成功部署了！🎮✨

---

## 📚 更多资源

- [1Panel官方文档](https://1panel.cn/docs/)
- [PM2文档](https://pm2.keymetrics.io/)
- [MongoDB文档](https://www.mongodb.com/docs/)
- [Nginx文档](https://nginx.org/en/docs/)

---

祝部署顺利！有问题随时查阅 `DEPLOY_1PANEL_GUIDE.md` 获取详细说明。
