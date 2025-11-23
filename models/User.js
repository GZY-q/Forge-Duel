const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    nickname: {
        type: String,
        required: true,
        trim: true,
        maxlength: 15
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    totalGames: {
        type: Number,
        default: 0
    },
    totalWins: {
        type: Number,
        default: 0
    },
    highestScore: {
        type: Number,
        default: 0
    }
});

// 在保存前加密密码
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 验证密码的方法
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

module.exports = mongoose.model('User', userSchema);
