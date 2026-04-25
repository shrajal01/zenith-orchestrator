from fastapi import FastAPI, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect, Header, HTTPException
import redis
import os
import uuid
import docker 
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func

from .core.database import engine, Base, get_db
from .models.task import TaskModel
from .workers import celery_app
from .tasks import process_heavy_data

load_dotenv()

# --- 1. APP INITIALIZATION ---
app = FastAPI(title="Star Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. EXTERNAL SERVICES SETUP ---
Base.metadata.create_all(bind=engine)
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))

try:
    client = docker.from_env()
except Exception as e:
    print(f"Docker connection failed: {e}")
    client = None

API_KEY_CREDENTIAL = os.getenv("ZENITH_API_KEY", "pro_level_key_123")

async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY_CREDENTIAL:
        raise HTTPException(status_code=403, detail="VALID API IS MISSING?")
    return x_api_key

# --- 3. WEBSOCKET CONNECTION MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f" WS: New Client Connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(" WS: Client Disconnected")

    async def broadcast(self, message: str):
        print(f"📡 WS: Broadcasting message: {message}")
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f" WS: Broadcast failed for a client: {e}")

manager = ConnectionManager()

# --- 4. WEBSOCKET ENDPOINT ---
@app.websocket("/ws/tasks")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep-alive via ping-pong
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f" WS Error: {e}")
        manager.disconnect(websocket)

# --- 5. CORE API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "Welcome to Star Orchestrator API - Realtime Engine Active"}

@app.get("/health")
def health_check():
    try:
        redis_ready = redis_client.ping()
    except Exception:
        redis_ready = False
    return {"status": "active", "redis_connected": redis_ready}

# --- 6. TASK ORCHESTRATION LOGIC ---

@app.post("/tasks/trigger", dependencies=[Depends(verify_api_key)])
async def trigger_bulk_tasks(db: Session = Depends(get_db)):

    # Rate limit check
    current_usage = redis_client.get("user_rate_limit")
    if current_usage and int(current_usage) >= 5:
        raise HTTPException(status_code=429, detail="Sabar karo bhai! Limit khatam (5 tasks/min)")
    
    # Increment counter with 60s expiry
    redis_client.incr("user_rate_limit")
    if not current_usage:
        redis_client.expire("user_rate_limit", 60)
        
    created_tasks = []
    try:
        for _ in range(10):
            unique_id = str(uuid.uuid4())
            sample_data = "Zenith Engine Bulk Process"
            
            new_task = TaskModel(
                task_id=unique_id,
                task_type="heavy_data",
                status="PENDING",
                data={"input": sample_data}
            )
            db.add(new_task)
            
            process_heavy_data.apply_async(args=[sample_data, unique_id], task_id=unique_id)
            created_tasks.append(unique_id)
        
        db.commit()

        # Notify frontend to refresh task list
        await manager.broadcast("REFRESH_TASKS")
        
        return {"status": "Success", "triggered": len(created_tasks), "ids": created_tasks}
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

@app.get("/tasks/all")
def get_all_tasks(db: Session = Depends(get_db)):
    return db.query(TaskModel).all()

@app.get("/task-status/{task_id}")
async def get_status(task_id: str, db: Session = Depends(get_db)):
    db_task = db.query(TaskModel).filter(TaskModel.task_id == task_id).first()
    if not db_task:
        return {"error": "Task ID not found"}
    return {
        "task_id": db_task.task_id,
        "status": db_task.status,
        "result": db_task.result
    }

# --- 7. INFRASTRUCTURE & INVENTORY ENDPOINTS ---

@app.post("/deploy")
async def deploy_node(data: dict):
    if not client:
        return {"status": "ERROR", "message": "Docker Engine not available"}
        
    node_name = data.get("name", "Unknown-Worker")
    region = data.get("region", "India-North-1")
    
    try:
        container = client.containers.run(
            "alpine",
            "sleep 3600",
            name=f"zenith-{node_name}-{uuid.uuid4().hex[:4]}",
            detach=True,
            labels={"region": region, "managed_by": "zenith-engine"}
        )
        return {
            "status": "SUCCESS", 
            "node_id": container.short_id,
            "message": f"Worker {node_name} is now LIVE in {region}"
        }
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}

@app.get("/api/inventory")
async def get_inventory():
    return [
        {"id": 1, "name": "Storage-Unit-A", "type": "Volume", "status": "Attached", "size": "50GB"},
        {"id": 2, "name": "Main-DB-Cluster", "type": "Database", "status": "Healthy", "size": "100GB"},
        {"id": 3, "name": "Config-Map-V1", "type": "Config", "status": "Active", "size": "12KB"},
        {"id": 4, "name": "Backup-Disk-01", "type": "Backup", "status": "Idle", "size": "500GB"},
    ]

@app.get("/api/network")
async def get_network_status():
    if not client:
        return [{"id": "error", "name": "Docker Offline", "ip": "0.0.0.0", "status": "error"}]
    
    try:
        containers = client.containers.list(all=True)
        network_data = []
        for c in containers:
            networks = c.attrs.get('NetworkSettings', {}).get('Networks', {})
            ip = "Internal"
            if networks:
                first_network = list(networks.values())[0]
                ip = first_network.get('IPAddress', 'No IP')

            network_data.append({
                "id": c.short_id,
                "name": c.name,
                "ip": ip if ip else "Host",
                "status": c.status,
                "uptime": c.attrs.get('State', {}).get('StartedAt', 'N/A')
            })
        return network_data
    except Exception as e:
        return [{"id": "error", "name": str(e), "ip": "0.0.0.0", "status": "error"}]
    


@app.post("/ws-internal/notify/{task_id}")
async def internal_notification(task_id: str, status: str = "COMPLETED"):
    # Broadcast task status update to all connected clients
    await manager.broadcast(f"TASK_UPDATE:{task_id}:{status}")
    return {"status": "Notified"}

@app.get("/analytics/stats")
async def get_stats(db: Session = Depends(get_db)):
    try:
        total = db.query(TaskModel).count()
        success = db.query(TaskModel).filter(TaskModel.status == "SUCCESS").count()
        rate = (success / total * 100) if total > 0 else 0
        
        avg_time = db.query(func.avg(TaskModel.processing_time)).filter(
            TaskModel.status == "SUCCESS"
        ).scalar()
        
        total_words = db.query(func.sum(TaskModel.word_count)).scalar()
        
        return {
            "avg_processing_time": round(avg_time or 0, 2),
            "total_words_processed": total_words or 0,
            "success_rate": round(rate, 1),
            "total_tasks": total
        }
    except Exception as e:
        return {"error": str(e), "total_tasks": total}