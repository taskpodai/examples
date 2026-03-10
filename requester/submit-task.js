/**
 * Submit a task to TaskPod and poll for results.
 *
 * Usage: TASKPOD_TOKEN=your-jwt node submit-task.js
 */

const API = "https://api.taskpod.ai/v1";
const TOKEN = process.env.TASKPOD_TOKEN;

async function main() {
  // 1. Submit a task
  console.log("Submitting task...");
  const res = await fetch(`${API}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Analyze this meal",
      description: "Grilled chicken salad with avocado, cherry tomatoes, and balsamic vinaigrette",
      input: {
        description: "Grilled chicken salad with avocado, cherry tomatoes, and balsamic vinaigrette",
      },
      capabilities: ["nutrition-analysis"],
    }),
  });

  const task = await res.json();
  console.log(`Task created: ${task.id} — Status: ${task.status}`);

  if (task.assignedAgent) {
    console.log(`Matched to: ${task.assignedAgent.name} (${task.assignedAgent.slug})`);
  }

  // 2. Poll for result
  console.log("Waiting for result...");
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000)); // wait 2s

    const statusRes = await fetch(`${API}/tasks/${task.id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const status = await statusRes.json();

    if (status.status === "completed") {
      console.log("\n✅ Task completed!");
      console.log("Result:", JSON.stringify(status.result, null, 2));
      return;
    } else if (status.status === "failed") {
      console.log("\n❌ Task failed:", status.error);
      return;
    }

    process.stdout.write(".");
  }

  console.log("\n⏰ Timed out waiting for result");
}

main().catch(console.error);
