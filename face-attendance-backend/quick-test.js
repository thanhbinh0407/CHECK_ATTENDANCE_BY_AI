// Quick test of updated matchFace endpoint
const API_BASE = "http://localhost:5000";

async function testMatch() {
  try {
    console.log("Testing /api/attendance/match endpoint...\n");
    
    // Create a dummy descriptor (128 random values)
    const descriptor = Array.from({length: 128}, () => Math.random() * 0.5);
    
    const res = await fetch(`${API_BASE}/api/attendance/match`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({descriptor})
    });
    
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
    console.log("\nKey fields:");
    console.log("  - matched:", data.matched);
    console.log("  - detectedName:", data.detectedName);
    console.log("  - logsToday:", data.logsToday ? `${data.logsToday.length} logs` : "missing");
    console.log("  - finished:", data.finished);
    
    if (data.logsToday && data.finished !== undefined) {
      console.log("\n✅ SUCCESS: matchFace now returns logsToday and finished!");
    } else {
      console.log("\n❌ ERROR: Missing logsToday or finished field");
    }
  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

testMatch();
