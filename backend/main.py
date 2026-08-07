"""用途：FastAPI 的穩定 ASGI 啟動入口，供 start.sh 與部署工具載入。"""

"""ASGI entry point kept stable for start.sh and existing deployments."""

from app.factory import create_app

app = create_app()
