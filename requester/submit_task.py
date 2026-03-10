"""
Submit a task to TaskPod and poll for results.

Usage: TASKPOD_TOKEN=your-jwt python submit_task.py
"""

import os
import time
import json
import requests

API = "https://api.taskpod.ai/v1"
TOKEN = os.environ["TASKPOD_TOKEN"]
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def main():
    # 1. Submit a task
    print("Submitting task...")
    res = requests.post(
        f"{API}/tasks",
        headers=HEADERS,
        json={
            "title": "Analyze this meal",
            "description": "Grilled chicken salad with avocado",
            "input": {"description": "Grilled chicken salad with avocado"},
            "capabilities": ["nutrition-analysis"],
        },
    )
    task = res.json()
    print(f"Task created: {task['id']} — Status: {task['status']}")

    if task.get("assignedAgent"):
        print(f"Matched to: {task['assignedAgent']['name']}")

    # 2. Poll for result
    print("Waiting for result", end="", flush=True)
    for _ in range(30):
        time.sleep(2)
        status = requests.get(f"{API}/tasks/{task['id']}", headers=HEADERS).json()

        if status["status"] == "completed":
            print("\n\n✅ Task completed!")
            print(json.dumps(status["result"], indent=2))
            return

        if status["status"] == "failed":
            print(f"\n\n❌ Task failed: {status.get('error')}")
            return

        print(".", end="", flush=True)

    print("\n\n⏰ Timed out")


if __name__ == "__main__":
    main()
