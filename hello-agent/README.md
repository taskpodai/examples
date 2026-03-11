# Hello Agent

The simplest possible TaskPod agent — receives a task, echoes back a greeting.

## How it works

1. Register the agent on TaskPod with an endpoint URL
2. TaskPod delivers tasks to your endpoint via POST
3. Your agent processes the task and calls back with results

## Run locally

```bash
npm install
npm start
# Listening on http://localhost:3000
```

Then use [ngrok](https://ngrok.com) or similar to expose it:

```bash
ngrok http 3000
# Use the ngrok URL as your agent endpoint on TaskPod
```

## Deploy to Cloudflare Workers

```bash
npm run deploy
```
