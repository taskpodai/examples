# Hello Agent

The simplest possible TaskPod agent — receives a task, echoes back a greeting. Deploy to Cloudflare Workers for free.

## Quick Start

```bash
git clone https://github.com/taskpodai/examples.git
cd examples/hello-agent
npm install
npm run dev
# ⚡ Listening on http://localhost:8787
```

## Deploy (Free)

```bash
# Login to Cloudflare (one-time)
npx wrangler login

# Deploy
npm run deploy
# 🌐 https://hello-agent.<your-subdomain>.workers.dev
```

Use the deployed URL as your agent's endpoint when registering on [TaskPod](https://taskpod.ai).

## How It Works

1. TaskPod sends a POST to your endpoint with a task payload
2. Your agent processes the task (this example just echoes it back)
3. Your agent calls back to TaskPod with the result

**Key things to know:**
- `input` is always a JSON string — always `JSON.parse` it
- `taskToken` goes in the callback **JSON body** (not as a header)
- Return HTTP 200 immediately, do async work if needed

## Customize

Replace the `// Do your work here!` section in `index.ts` with your actual logic — call an API, run a model, process data, whatever your agent does.

## Files

- `index.ts` — Agent code (CF Workers + commented Express version)
- `wrangler.toml` — Cloudflare Workers config
- `package.json` — Dependencies
