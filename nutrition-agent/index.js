/**
 * TaskPod Nutrition Analysis Agent
 *
 * Receives meal descriptions from TaskPod, analyzes them with OpenAI,
 * and posts nutritional data back to the callback URL.
 *
 * Based on the Habit AI integration — the first agent on TaskPod.
 */

const express = require("express");
const crypto = require("crypto");
const OpenAI = require("openai");

const app = express();

// Store raw body for signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const WEBHOOK_SECRET = process.env.TASKPOD_WEBHOOK_SECRET;
const PORT = process.env.PORT || 3000;

// ─── Signature Verification ───────────────────────────────────

function verifySignature(rawBody, signatureHeader) {
  if (!WEBHOOK_SECRET) return true; // skip if no secret configured
  if (!signatureHeader) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected)
  );
}

// ─── Health Check ─────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", agent: "nutrition-analysis", version: "1.0.0" });
});

// ─── TaskPod Webhook ──────────────────────────────────────────

app.post("/webhook", async (req, res) => {
  // 1. Verify signature
  const signature = req.headers["x-taskpod-signature"];
  if (!verifySignature(req.rawBody, signature)) {
    console.error("[TaskPod] Invalid signature — rejecting request");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { taskId, taskToken, title, description, input, callbackUrl, capabilities = [] } =
    req.body;

  if (!taskId || !taskToken || !callbackUrl) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  console.log(`[TaskPod] Task ${taskId}: ${title}`);
  console.log(`[TaskPod] Capabilities: ${capabilities.join(", ")}`);

  try {
    let result;

    // 2. Route to the right handler based on capability
    if (
      capabilities.includes("nutrition-analysis") ||
      capabilities.includes("meal-tracking")
    ) {
      result = await analyzeNutrition(input, description, title);
    } else if (capabilities.includes("meditation-guidance")) {
      result = await generateMeditation(input, description);
    } else {
      // Unsupported capability — send error callback
      await sendCallback(callbackUrl, taskToken, null, {
        error: `Unsupported capabilities: ${capabilities.join(", ")}. Supported: nutrition-analysis, meal-tracking, meditation-guidance`,
      });
      return res.json({ accepted: true, status: "unsupported_capability" });
    }

    // 3. Send result back to TaskPod
    await sendCallback(callbackUrl, taskToken, result);
    console.log(`[TaskPod] Task ${taskId} completed ✅`);

    res.json({ accepted: true, status: "completed", taskId });
  } catch (error) {
    console.error(`[TaskPod] Task ${taskId} failed:`, error.message);

    // Try to report failure back to TaskPod
    try {
      await sendCallback(callbackUrl, taskToken, null, {
        error: `Processing failed: ${error.message}`,
      });
    } catch (_) {}

    res.status(500).json({ error: "Task processing failed" });
  }
});

// ─── Handlers ─────────────────────────────────────────────────

async function analyzeNutrition(input, description, title) {
  const foodDescription = input?.description || input?.text || description || title;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a nutrition analysis AI. Given a food description, estimate the nutritional content. Return a JSON object with: name (string), calories (number), protein_g (number), carbs_g (number), fat_g (number), fiber_g (number), serving_size (string), confidence (string: "high", "medium", "low"). Be realistic and accurate.`,
      },
      {
        role: "user",
        content: `Analyze this food: ${foodDescription}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const analysis = JSON.parse(completion.choices[0]?.message?.content || "{}");

  return {
    type: "nutrition-analysis",
    analysis,
    source: "Nutrition Agent",
    model: "gpt-4o-mini",
    processedAt: new Date().toISOString(),
  };
}

async function generateMeditation(input, description) {
  const topic = input?.topic || input?.text || description || "general mindfulness";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a meditation and mindfulness guide. Create a brief guided meditation. Return JSON with: title (string), duration_minutes (number), instructions (string[]), benefits (string[]).`,
      },
      {
        role: "user",
        content: `Create a meditation for: ${topic}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const meditation = JSON.parse(completion.choices[0]?.message?.content || "{}");

  return {
    type: "meditation-guidance",
    meditation,
    source: "Nutrition Agent",
    model: "gpt-4o-mini",
    processedAt: new Date().toISOString(),
  };
}

// ─── Callback ─────────────────────────────────────────────────

async function sendCallback(callbackUrl, taskToken, result, error) {
  const body = error ? { taskToken, error: error.error } : { taskToken, result };

  const res = await fetch(callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Callback failed with status ${res.status}`);
  }
}

// ─── Start ────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🍎 Nutrition Agent listening on port ${PORT}`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook`);
  console.log(`   Health:  http://localhost:${PORT}/health`);
  console.log(`   Signature verification: ${WEBHOOK_SECRET ? "enabled ✅" : "disabled ⚠️"}`);
});
