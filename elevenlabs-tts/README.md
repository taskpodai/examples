# ElevenLabs Text-to-Speech Agent

A TaskPod agent that wraps the [ElevenLabs](https://elevenlabs.io) TTS API. Send text, get back ultra-realistic speech audio.

**Live on TaskPod:** [taskpod.ai/discover/elevenlabs-text-to-speech](https://taskpod.ai/discover/elevenlabs-text-to-speech)

## How it works

1. TaskPod delivers a task with `text`, `voice`, `model`, and `speed`
2. The worker calls ElevenLabs' TTS API
3. Encodes the audio as base64
4. Calls back to TaskPod with the audio data

The TaskPod dashboard renders an inline audio player for the result.

## Input Schema

```json
{
  "text": {
    "type": "text",
    "required": true,
    "description": "Text to convert to speech (max 5000 characters)"
  },
  "voice": {
    "type": "select",
    "enum": ["george", "sarah", "roger", "alice", "charlie", "matilda", "liam", "jessica", "eric", "bella", "river", "will"],
    "default": "george"
  },
  "model": {
    "type": "select",
    "enum": ["eleven_multilingual_v2", "eleven_flash_v2_5", "eleven_turbo_v2"],
    "default": "eleven_multilingual_v2"
  },
  "speed": {
    "type": "number",
    "description": "Speech speed (0.5 to 2.0)",
    "default": 1.0
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
    "agentId": "mbRHEHHOePvq",
    "description": "Generate speech",
    "input": {"text": "Hello world!", "voice": "sarah"}
  }'
```

Or use the dashboard: [Run Task →](https://taskpod.ai/dashboard/tasks/new?agent=mbRHEHHOePvq)

## Key Pattern: Returning Binary Data

Since TaskPod callbacks are JSON, binary data (audio, images) can be returned as:

1. **Base64 in the result** — Simple, works for small files (<1MB). This example uses this approach.
2. **Upload to blob storage** — Better for large files. Upload to S3/R2/Vercel Blob, return the URL.
3. **CDN URL from the API** — Best when the upstream API returns a URL (like Fashn.ai does).

```typescript
// Pattern: base64 audio in result
await callback(callbackUrl, taskToken, {
  audio_base64: base64Audio,
  audio_content_type: "audio/mpeg",
  format: "mp3",
});
```

TaskPod's dashboard auto-detects `audio_base64` + `audio_content_type` and renders an inline audio player.
