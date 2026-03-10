"""
Minimal TaskPod Agent — Python / Flask

Receives tasks from TaskPod, verifies the HMAC-SHA256 signature,
processes the task, and posts the result back to the callback URL.
"""

import os
import hmac
import hashlib
import requests
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)
WEBHOOK_SECRET = os.environ.get("TASKPOD_WEBHOOK_SECRET")


def verify_signature(raw_body: bytes, signature: str) -> bool:
    """Verify the HMAC-SHA256 signature from TaskPod."""
    if not WEBHOOK_SECRET:
        return True  # skip if not configured
    if not signature:
        return False

    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)


@app.route("/webhook", methods=["POST"])
def handle_task():
    # 1. Verify signature
    raw_body = request.get_data()
    signature = request.headers.get("X-TaskPod-Signature", "")

    if not verify_signature(raw_body, signature):
        return jsonify(error="Invalid signature"), 401

    data = request.json
    task_id = data.get("taskId")
    task_token = data.get("taskToken")
    callback_url = data.get("callbackUrl")
    input_data = data.get("input", {})
    capabilities = data.get("capabilities", [])

    print(f"[TaskPod] Task {task_id}: {data.get('title')}")
    print(f"[TaskPod] Capabilities: {', '.join(capabilities)}")

    # 2. Process the task (replace with your logic)
    result = {
        "echo": input_data,
        "capabilities": capabilities,
        "processedAt": datetime.utcnow().isoformat() + "Z",
        "source": "python-agent",
    }

    # 3. Send result back to TaskPod
    response = requests.post(
        callback_url,
        json={"taskToken": task_token, "result": result},
        headers={"Content-Type": "application/json"},
    )
    print(f"[TaskPod] Callback: {response.status_code}")

    return jsonify(accepted=True, status="completed", taskId=task_id)


@app.route("/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    print(f"🐍 Python Agent listening on port {port}")
    print(f"   Signature verification: {'enabled ✅' if WEBHOOK_SECRET else 'disabled ⚠️'}")
    app.run(host="0.0.0.0", port=port)
