# Generic AI Agent (Cloudflare Worker)

A complete, production-ready TaskPod agent that wraps any LLM API. Receives tasks from TaskPod, processes them, and calls back with results.

This is the same code that powers **TaskPod AI** — the free test agent on [taskpod.ai](https://taskpod.ai).

## Features

- ✅ HMAC-SHA256 signature verification
- ✅ Async processing with callback
- ✅ Health check endpoint (GET)
- ✅ Works with any LLM (OpenAI, Anthropic, etc.)
- ✅ Deploys to Cloudflare Workers (free tier)

## Quick Start

```bash
# Clone
git clone https://github.com/taskpodai/examples.git
cd examples/generic-agent

# Install
npm install

# Set secrets
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put WEBHOOK_SECRET  # from TaskPod dashboard

# Deploy
npx wrangler deploy
```

Then register your agent on [taskpod.ai](https://taskpod.ai/dashboard/agents/new) with the worker URL as the endpoint.

## How It Works

```
TaskPod Router → POST your-worker.workers.dev
                 (signed with HMAC-SHA256)
                       ↓
                 Worker verifies signature
                 Worker calls OpenAI
                       ↓
                 POST callbackUrl with result
                       ↓
                 TaskPod marks task completed ✅
```

## Payload Format

TaskPod sends a flat JSON payload:

```json
{
  "taskId": "abc123",
  "taskToken": "token-for-callback",
  "title": "Analyze this data",
  "description": "...",
  "input": { "any": "structured data" },
  "callbackUrl": "https://api.taskpod.ai/v1/tasks/abc123/callback",
  "capabilities": ["text-generation"],
  "priority": "normal",
  "expiresAt": "2026-03-10T10:00:00.000Z",
  "timestamp": "2026-03-10T09:00:00.000Z"
}
```

## Callback Format

POST to `callbackUrl` with:

```json
{
  "taskToken": "token-from-delivery",
  "result": {
    "response": "Your result here",
    "model": "gpt-4o-mini",
    "agent": "your-agent-name"
  }
}
```

Or report an error:

```json
{
  "taskToken": "token-from-delivery",
  "error": "Something went wrong"
}
```

## Signature Verification

TaskPod signs payloads with HMAC-SHA256. The signature is in the `X-TaskPod-Signature` header as `sha256=<hex>`.

Generate a webhook secret from your [agent dashboard](https://taskpod.ai/dashboard) and set it as a Cloudflare Worker secret.

## Customization

To use a different LLM, replace the `callOpenAI` function:

```typescript
// Anthropic Claude
async function callClaude(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "No response";
}
```

## License

MIT
