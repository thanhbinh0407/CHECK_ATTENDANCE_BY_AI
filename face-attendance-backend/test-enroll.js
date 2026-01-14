const test = async () => {
  try {
    // First, login to get a token
    console.log("🔐 Logging in as admin...");
    const loginRes = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@test.com",
        password: "admin123"
      })
    });

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Login successful, token:", token.substring(0, 20) + "...");

    // Now test enrollment
    console.log("\nTesting enrollment...");
    const enrollRes = await fetch(
      "http://localhost:5000/api/enroll/register",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Test Employee",
          email: "test@example.com",
          employeeCode: "EMP001",
          descriptor: new Array(128).fill(0.5) // Mock face descriptor (128 dims)
        })
      }
    );

    const enrollData = await enrollRes.json();
    console.log("Status:", enrollRes.status);
    console.log("Enrollment response:", enrollData);
  } catch (err) {
    console.error("Error:", err.message);
  }
};

test();
