const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 注册路由
router.post('/register', async (req, res) => {
    try {
        const { username, password, nickname } = req.body;

        // 验证输入
        if (!username || !password || !nickname) {
            return res.status(400).json({
                success: false,
                message: '请填写所有字段'
            });
        }

        // 验证用户名长度
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                success: false,
                message: '用户名长度必须在3-20个字符之间'
            });
        }

        // 验证密码长度
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '密码长度至少为6个字符'
            });
        }

        // 验证昵称长度
        if (nickname.length === 0 || nickname.length > 15) {
            return res.status(400).json({
                success: false,
                message: '昵称长度必须在1-15个字符之间'
            });
        }

        // 检查用户名是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用户名已存在'
            });
        }

        // 创建新用户
        const newUser = new User({
            username,
            password,
            nickname
        });

        await newUser.save();

        // 自动登录
        req.session.userId = newUser._id;
        req.session.username = newUser.username;
        req.session.nickname = newUser.nickname;

        res.json({
            success: true,
            message: '注册成功',
            user: {
                username: newUser.username,
                nickname: newUser.nickname
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后重试'
        });
    }
});

// 登录路由
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '请填写用户名和密码'
            });
        }

        // 查找用户
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 验证密码
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 设置session
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.nickname = user.nickname;

        res.json({
            success: true,
            message: '登录成功',
            user: {
                username: user.username,
                nickname: user.nickname
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后重试'
        });
    }
});

// 登出路由
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: '登出失败'
            });
        }
        res.json({
            success: true,
            message: '登出成功'
        });
    });
});

// 检查登录状态
router.get('/check', (req, res) => {
    if (req.session.userId) {
        res.json({
            success: true,
            loggedIn: true,
            user: {
                username: req.session.username,
                nickname: req.session.nickname
            }
        });
    } else {
        res.json({
            success: true,
            loggedIn: false
        });
    }
});

module.exports = router;
