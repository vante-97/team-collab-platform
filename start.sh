#!/bin/bash
set -e

echo "========================================"
echo "  Team Collab Platform 一键启动"
echo "========================================"
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未找到 Python，请先安装 Python 3.10+"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

# 后端依赖
echo "[1/3] 检查后端依赖..."
cd "$PROJECT_DIR/backend"
if [ ! -f ".deps_installed" ]; then
    echo "正在安装 Python 依赖..."
    pip3 install -r requirements.txt -q
    touch .deps_installed
    echo "[完成] 后端依赖安装完成"
else
    echo "[跳过] 后端依赖已安装"
fi
echo ""

# 启动后端
echo "[2/3] 启动 Flask 后端 (端口 5000)..."
python3 app.py &
BACKEND_PID=$!
echo "[启动] 后端 PID: $BACKEND_PID"
sleep 3
echo ""

# 前端依赖
echo "[3/3] 启动 Next.js 前端 (端口 3000)..."
cd "$PROJECT_DIR"
npm run dev &
FRONTEND_PID=$!
echo "[启动] 前端 PID: $FRONTEND_PID"
echo ""

echo "========================================"
echo "  启动完成！"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:5000"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务..."

# 捕获退出信号
trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
