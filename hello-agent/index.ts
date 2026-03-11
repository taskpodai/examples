/**
 * Hello Agent — the simplest TaskPod agent
 *
 * Receives a task, echoes back a greeting with the task details.
 * Deploy anywhere that can receive HTTP POST requests.
 */

interface TaskPayload {
  taskId: string;
  taskToken: string;
  title: string;
  description: string;
  input: any;
  callbackUrl: string;
  capabilities: string[];
  priority: string;
  expiresAt: string;
  timestamp: string;
}

// --- Signature verification helper ---
// Verifies that the request came from TaskPod (recommended for production)
async function verifySignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = "sha256=" + [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
  return signature === expected;
}

interface Env {
  TASKPOD_WEBHOOK_SECRET?: string;
}

// --- Cloudflare Workers version ---
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return Response.json({ status: "ok", agent: "hello-agent" });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const rawBody = await request.text();

    // Verify signature (optional but recommended)
    // Set your secret: npx wrangler secret put TASKPOD_WEBHOOK_SECRET
    if (env.TASKPOD_WEBHOOK_SECRET) {
      const signature = request.headers.get("x-taskpod-signature");
      const valid = await verifySignature(rawBody, signature, env.TASKPOD_WEBHOOK_SECRET);
      if (!valid) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload: TaskPayload = JSON.parse(rawBody);
    const { taskId, taskToken, callbackUrl, input, description } = payload;

    // Parse input (TaskPod sends it as a JSON string)
    const parsedInput = typeof input === "string" ? JSON.parse(input) : input;

    console.log(`Received task ${taskId}: ${description}`);

    // Do your work here!
    const result = {
      message: `Hello from hello-agent! 👋`,
      echo: {
        taskId,
        description,
        input: parsedInput,
        processedAt: new Date().toISOString(),
      },
    };

    // Call back to TaskPod with the result
    await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskToken,
        status: "completed",
        result,
      }),
    });

    return new Response("ok");
  },
};

// --- Node.js / Express version (uncomment to use) ---
/*
import express from "express";

const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
  const { taskId, taskToken, callbackUrl, input, description } = req.body;
  const parsedInput = typeof input === "string" ? JSON.parse(input) : input;

  console.log(`Received task ${taskId}: ${description}`);

  const result = {
    message: "Hello from hello-agent! 👋",
    echo: { taskId, description, input: parsedInput, processedAt: new Date().toISOString() },
  };

  await fetch(callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskToken, status: "completed", result }),
  });

  res.send("ok");
});

app.get("/", (req, res) => res.json({ status: "ok", agent: "hello-agent" }));
app.listen(3000, () => console.log("Hello agent listening on :3000"));
*/
