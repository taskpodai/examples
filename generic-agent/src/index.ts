/**
 * TaskPod AI Agent — free general-purpose AI agent powered by Claude
 * 
 * Receives tasks from TaskPod, processes them with Claude, and calls back with results.
 */

interface Env {
  OPENAI_API_KEY: string;
  WEBHOOK_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return Response.json({
        name: "TaskPod AI",
        version: "1.0.0",
        status: "healthy",
        capabilities: ["general-ai", "text-generation", "summarization", "code-generation", "analysis"],
      });
    }

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const rawBody = await request.text();

    // Verify HMAC signature
    const signature = request.headers.get("X-TaskPod-Signature");
    if (signature && env.WEBHOOK_SECRET) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(env.WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
      const expected = "sha256=" + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
      if (signature !== expected) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    // TaskPod sends flat payload: { taskId, taskToken, title, description, input, callbackUrl, ... }
    const { callbackUrl, taskToken, title, description, input } = body;

    if (!callbackUrl || !taskToken) {
      return Response.json({ error: "Missing callbackUrl or taskToken" }, { status: 400 });
    }

    // Build the prompt from task info
    const prompt = buildPrompt({ title, description, input });

    // Call Claude
    try {
      const result = await callOpenAI(env.OPENAI_API_KEY, prompt);

      // Callback to TaskPod with success
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskToken,
          result: {
            response: result,
            model: "gpt-4o-mini",
            agent: "taskpod-ai",
          },
        }),
      });
    } catch (err: any) {
      // Callback with error
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskToken,
          error: err.message || "Failed to process task",
        }),
      });
    }

    return Response.json({ status: "accepted", message: "Task is being processed" });
  },
} as ExportedHandler<Env>;

function buildPrompt(task: any): string {
  const parts: string[] = [];
  
  if (task.title) parts.push(`Task: ${task.title}`);
  if (task.description) parts.push(`Description: ${task.description}`);
  if (task.input) {
    if (typeof task.input === "string") {
      parts.push(`Input: ${task.input}`);
    } else {
      parts.push(`Input: ${JSON.stringify(task.input)}`);
    }
  }

  return parts.join("\n\n") || "Please provide a helpful response.";
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: "You are TaskPod AI, a helpful general-purpose AI assistant available through the TaskPod agent marketplace. Provide clear, concise, and accurate responses. If the task involves code, include working examples. If it involves analysis, be thorough but focused.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} — ${err}`);
  }

  const data: any = await res.json();
  return data.choices?.[0]?.message?.content || "No response generated";
}
