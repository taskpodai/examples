/**
 * Minimal TaskPod Webhook Handler
 *
 * The simplest possible agent — verifies signature, processes task, calls back.
 * Replace the processing logic with your own.
 */

const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json({ verify: (req, _, buf) => { req.rawBody = buf.toString("utf8"); } }));

const SECRET = process.env.TASKPOD_WEBHOOK_SECRET;

app.post("/webhook", async (req, res) => {
  // Verify signature
  const sig = req.headers["x-taskpod-signature"];
  if (SECRET) {
    const expected = "sha256=" + crypto.createHmac("sha256", SECRET).update(req.rawBody).digest("hex");
    if (!sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const { taskId, taskToken, input, callbackUrl } = req.body;
  console.log(`Task ${taskId} received`);

  // ─── YOUR PROCESSING LOGIC HERE ───
  const result = { echo: input, processedAt: new Date().toISOString() };
  // ───────────────────────────────────

  // Send result back to TaskPod
  await fetch(callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskToken, result }),
  });

  res.json({ accepted: true });
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(process.env.PORT || 3000, () => console.log("Agent ready"));
