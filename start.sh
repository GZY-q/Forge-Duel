#!/bin/bash

echo "🚀 正在启动宇宙海盗大战服务器..."
echo ""

# 检查MongoDB是否运行
echo "📦 检查MongoDB状态..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB未运行！"
    echo ""
    echo "请选择一个选项："
    echo "1. 使用本地MongoDB（需要先安装并启动）"
    echo "2. 使用MongoDB Atlas（云数据库）"
    echo ""
    echo "本地MongoDB启动命令："
    echo "  brew services start mongodb-community@7.0"
    echo ""
    echo "MongoDB Atlas配置："
    echo "  1. 访问 https://www.mongodb.com/cloud/atlas"
    echo "  2. 创建免费集群"
    echo "  3. 获取连接字符串"
    echo "  4. 更新 .env 文件中的 MONGODB_URI"
    echo ""
    read -p "MongoDB已准备好？按回车继续... " 
fi

echo ""
echo "✅ 启动服务器..."
npm start
