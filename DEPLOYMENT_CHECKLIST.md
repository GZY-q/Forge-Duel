# 1Panel部署快速清单

## ✅ 部署前检查

- [ ] 服务器已安装1Panel
- [ ] 服务器Ubuntu版本：18.04/20.04/22.04
- [ ] 服务器内存至少1GB
- [ ] 已有域名（可选）
- [ ] 本地项目测试通过

## 📦 准备工作（本地）

- [ ] 运行 `./deploy.sh` 生成部署包
- [ ] 检查 `forge-duel-deploy.tar.gz` 已生成
- [ ] 准备好 `.env.production` 配置

## 🚀 服务器部署步骤

### 1. MongoDB安装
- [ ] 1Panel → 应用商店 → 搜索MongoDB
- [ ] 安装MongoDB（端口27017）
- [ ] 验证运行：`docker ps | grep mongodb`

### 2. 上传项目
- [ ] 创建目录：`/opt/forge-duel`
- [ ] 上传 `forge-duel-deploy.tar.gz`
- [ ] 解压文件
- [ ] 复制 `.env.production` 为 `.env`
- [ ] 修改 `.env` 中的配置（特别是SESSION_SECRET）

### 3. 安装依赖
- [ ] 安装Node.js（版本18.x或20.x）
- [ ] `cd /opt/forge-duel`
- [ ] `npm install --production`
- [ ] `npm install -g pm2`

### 4. 启动应用
- [ ] `pm2 start ecosystem.config.js --env production`
- [ ] `pm2 save`
- [ ] `pm2 startup`
- [ ] 验证：`pm2 status`
- [ ] 查看日志：`pm2 logs forge-duel`

### 5. Nginx配置
- [ ] 1Panel → 网站 → 创建网站
- [ ] 填写域名（或使用IP）
- [ ] 配置反向代理到 `http://127.0.0.1:8080`
- [ ] 添加WebSocket支持
- [ ] 保存并重启Nginx

### 6. SSL证书（推荐）
- [ ] 网站 → SSL → Let's Encrypt
- [ ] 输入邮箱申请证书
- [ ] 启用强制HTTPS

### 7. 防火墙配置
- [ ] 开放端口80（HTTP）
- [ ] 开放端口443（HTTPS）
- [ ] 云服务器安全组配置

## 🧪 测试验证

- [ ] 访问 `http://你的域名` 能看到登录界面
- [ ] 注册新账号测试
- [ ] 登录测试
- [ ] 游戏功能正常
- [ ] WebSocket连接正常（游戏实时功能）
- [ ] HTTPS访问正常（如已配置）

## 🔧 后续维护

- [ ] 设置数据库备份
- [ ] 设置代码备份
- [ ] 配置监控告警
- [ ] 定期更新依赖：`npm audit fix`

## 📝 常用命令（记得收藏）

```bash
# PM2管理
pm2 list                    # 查看所有应用
pm2 logs forge-duel         # 查看日志
pm2 restart forge-duel      # 重启应用
pm2 stop forge-duel         # 停止应用
pm2 monit                   # 监控资源

# MongoDB管理
docker ps | grep mongodb    # 查看MongoDB状态
docker exec -it mongodb mongosh   # 进入MongoDB

# 更新代码
pm2 stop forge-duel
# 上传新代码...
npm install --production
pm2 restart forge-duel

# 查看日志
tail -f logs/out.log        # 输出日志
tail -f logs/err.log        # 错误日志
```

## ❓ 遇到问题？

### MongoDB连接失败
```bash
docker ps | grep mongodb    # 检查是否运行
docker start mongodb        # 启动MongoDB
```

### 应用启动失败
```bash
pm2 logs forge-duel         # 查看错误日志
cat .env                    # 检查环境配置
```

### 无法访问
- 检查防火墙：`sudo ufw status`
- 检查Nginx：`nginx -t`
- 检查应用：`pm2 status`

## ✅ 部署完成标志

看到以下信息说明部署成功：
- PM2显示应用 `online`
- 日志显示 `MongoDB连接成功`
- 日志显示 `Server is running on port 8080`
- 浏览器能访问登录界面
- 注册登录功能正常

---

🎉 恭喜！部署成功！
