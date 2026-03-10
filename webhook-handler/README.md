# Minimal Webhook Handler

The simplest possible TaskPod agent — receives tasks, verifies the signature, and echoes back a result.

Use this as a starting point for your own agent.

## Usage

```bash
npm install
TASKPOD_WEBHOOK_SECRET=your-secret node index.js
```

## What It Does

1. Verifies the HMAC-SHA256 signature on every request
2. Logs the task details
3. Echoes the input back as the result
4. Calls the TaskPod callback URL

Replace the echo logic with your actual processing.
