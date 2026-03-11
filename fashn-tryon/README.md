# Fashn.ai Virtual Try-On Agent

A TaskPod agent that wraps the [Fashn.ai](https://fashn.ai) virtual try-on API. Upload a person photo and a garment photo, get back a composite image.

**Live on TaskPod:** [taskpod.ai/discover/fashn-virtual-try-on](https://taskpod.ai/discover/fashn-virtual-try-on)

## How it works

1. TaskPod delivers a task with `model_image` and `garment_image` URLs
2. The worker submits a job to Fashn.ai's VTON API
3. Polls for completion (typically 10-30 seconds)
4. Calls back to TaskPod with the result image URL

## Input Schema

```json
{
  "model_image": {
    "type": "imageUrl",
    "required": true,
    "description": "URL of the person photo (full-body works best)"
  },
  "garment_image": {
    "type": "imageUrl",
    "required": true,
    "description": "URL of the garment to try on"
  },
  "category": {
    "type": "select",
    "enum": ["tops", "bottoms", "one-pieces", "auto"],
    "default": "auto"
  },
  "mode": {
    "type": "select",
    "enum": ["balanced", "quality", "speed"],
    "default": "balanced"
  }
}
```

## Deploy

```bash
# Set your Fashn.ai API key
npx wrangler secret put FASHN_API_KEY

# Deploy to Cloudflare Workers
npm run deploy
```

## Architecture

```
TaskPod ──POST──▶ Worker ──POST──▶ Fashn.ai /v1/run
                    │                    │
                    │◀──poll──GET /v1/status/{id}
                    │
                    ▼
            POST callback to TaskPod
            with result image URL
```
