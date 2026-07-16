"""启动入口"""
from app import create_app

app = create_app()

if __name__ == "__main__":
    print("[Server] http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
