import requests
import time

API_URL = "http://localhost:8000/trigger-task"
TOTAL_TASKS = 50

print(f"🚀 Sending {TOTAL_TASKS} tasks to the Orchestrator...")

for i in range(TOTAL_TASKS):
    payload = {"data": f"Stress test message number {i+1}"}
    response = requests.post(API_URL, params=payload)
    if response.status_code == 200:
        print(f"✅ Task {i+1} queued: {response.json()['task_id']}")
    else:
        print(f"❌ Failed to queue task {i+1}")

print("\n🔥 All tasks sent! Now go check Flower or Swagger.")