import sys
import logging
from fastapi.testclient import TestClient
from app.main import app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify")

def verify_system():
    logger.info("Initializing Test Client on pure MVC Backend...")
    try:
        client = TestClient(app)
    except Exception as e:
        logger.error(f"Failed to mount FastApi app: {e}")
        sys.exit(1)
        
    logger.info("Test Client Mounted. Verifying core paths...")

    # Route 1: Docs
    try:
        res = client.get("/openapi.json")
        if res.status_code == 200:
            routes = len(res.json().get("paths", {}))
            logger.info(f"[SUCCESS] OpenAPI Schema generated successfully. Total abstract API paths available: {routes}")
        else:
            logger.error(f"[FAILED] OpenAPI Schema returning {res.status_code}")
    except Exception as e:
        logger.error(f"[ERROR] while fetching openapi.json: {e}")

    # Route 2: Healthcheck (if exists) or root
    try:
        res = client.get("/api/health")
        if res.status_code == 200:
            logger.info(f"[SUCCESS] /api/health returned OK: {res.json()}")
        elif res.status_code == 404:
             logger.info(f"[SKIP] No dedicated /api/health endpoint found.")
        else:
            logger.info(f"[WARNING] /api/health HTTP {res.status_code}")
    except Exception as e:
        logger.error(f"[ERROR] while hitting health: {e}")

if __name__ == "__main__":
    verify_system()
