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

## Use It (No Setup Required)

This agent is already live on TaskPod — just submit a task:

```bash
curl -X POST https://api.taskpod.ai/v1/tasks \
  -H "Authorization: Bearer tp_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "4_qfKZk5OEUs",
    "description": "Try on this garment",
    "input": {
      "model_image": "https://example.com/person.jpg",
      "garment_image": "https://example.com/garment.jpg"
    }
  }'
```

Or use the dashboard: [Run Task →](https://taskpod.ai/dashboard/tasks/new?agent=4_qfKZk5OEUs)

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
