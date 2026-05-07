#!/bin/bash

# ============================================================
# ForgeDuel 武器音效生成脚本
# 
# 功能：使用 FFmpeg 生成简单的占位音效
# 说明：这些是临时的占位音效，建议后续替换为高质量的音效
# ============================================================

# 检查 FFmpeg 是否安装
if ! command -v ffmpeg &> /dev/null; then
    echo "错误：需要安装 FFmpeg"
    echo "macOS 安装命令: brew install ffmpeg"
    echo "Ubuntu 安装命令: sudo apt-get install ffmpeg"
    exit 1
fi

# 进入脚本所在目录
cd "$(dirname "$0")"

# 武器音效配置：名称 + 频率 + 时长
declare -A WEAPON_SOUNDS=(
    ["weapon_fireball"]="800:0.1"
    ["weapon_dagger"]="600:0.08"
    ["weapon_lightning"]="400:0.12"
    ["weapon_meteor"]="1000:0.15"
    ["weapon_orbit_blades"]="700:0.1"
    ["weapon_scatter_shot"]="900:0.1"
    ["weapon_homing_missile"]="850:0.12"
    ["weapon_laser"]="750:0.1"
    ["weapon_thunderstorm"]="350:0.15"
    ["weapon_gatling"]="950:0.05"
    ["weapon_mega_missile"]="1100:0.15"
    ["weapon_prismatic_laser"]="650:0.1"
    ["weapon_boomerang"]="550:0.1"
    ["weapon_slash"]="500:0.08"
    ["weapon_garlic_aura"]="300:0.1"
    ["weapon_molotov"]="450:0.12"
    ["weapon_gravity_well"]="250:0.15"
    ["weapon_death_spiral"]="150:0.15"
)

echo "开始生成武器占位音效..."
echo ""

# 生成每个武器音效
for weapon in "${!WEAPON_SOUNDS[@]}"; do
    IFS=':' read -r freq duration <<< "${WEAPON_SOUNDS[$weapon]}"
    output_file="${weapon}.wav"
    
    if [ -f "$output_file" ]; then
        echo "跳过 $output_file (已存在)"
        continue
    fi
    
    # 生成带包络的音调（避免突然的开始和结束）
    ffmpeg -y -f lavfi -i "sine=frequency=${freq}:duration=${duration}" \
        -af "afade=t=in:st=0:d=0.01,afade=t=out:st=$(echo "$duration - 0.01" | bc):d=0.01,volume=0.8" \
        -ar 44100 -ac 1 -acodec pcm_s16le "$output_file" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✓ 生成 $output_file (频率: ${freq}Hz, 时长: ${duration}s)"
    else
        echo "✗ 生成 $output_file 失败"
    fi
done

echo ""
echo "完成！生成了武器占位音效。"
echo ""
echo "建议："
echo "1. 尽快替换这些占位音效为高质量的武器音效"
echo "2. 可以从 freesound.org 等网站下载免费音效"
echo "3. 建议音效长度：0.05-0.3 秒"
echo "4. 推荐格式：WAV, 44100Hz, 16位, 单声道"
