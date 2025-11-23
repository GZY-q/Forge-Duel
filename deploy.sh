#!/bin/bash

# 部署脚本 - 用于打包和准备部署

echo "🚀 准备部署包..."

# 创建部署目录
rm -rf deploy
mkdir -p deploy

# 复制必要文件
echo "📦 复制文件..."
cp -r models deploy/
cp -r routes deploy/
cp -r public deploy/
cp server.js deploy/
cp package.json deploy/
cp ecosystem.config.js deploy/
cp .env.example deploy/

# 创建日志目录
mkdir -p deploy/logs

# 打包
echo "📦 打包项目..."
cd deploy
tar -czf ../forge-duel-deploy.tar.gz .
cd ..

# 清理
rm -rf deploy

echo "✅ 部署包已创建: forge-duel-deploy.tar.gz"
echo ""
echo "📤 上传到服务器："
echo "   scp forge-duel-deploy.tar.gz root@你的服务器IP:/opt/forge-duel/"
echo ""
echo "📝 在服务器上解压并运行："
echo "   cd /opt/forge-duel"
echo "   tar -xzf forge-duel-deploy.tar.gz"
echo "   npm install --production"
echo "   pm2 start ecosystem.config.js --env production"
