export const swaggerDoc = {
  openapi: "3.0.0",
  info: {
    title: "Face Attendance API",
    version: "1.0.0"
  },
  paths: {
    "/api/enroll": {
      post: {
        summary: "Enroll a user with face descriptor",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  employeeCode: { type: "string" },
                  descriptor: { type: "array", items: { type: "number" } },
                  imageBase64: { type: "string" },
                  modelVersion: { type: "string" }
                },
                required: ["name", "email", "descriptor"]
              }
            }
          }
        },
        responses: {
          200: { description: "Enroll success" }
        }
      }
    },
    "/api/attendance/log": {
      post: {
        summary: "Log attendance via face descriptor",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  descriptor: { type: "array", items: { type: "number" } },
                  confidence: { type: "number" },
                  timestamp: { type: "string" },
                  deviceId: { type: "string" },
                  imageBase64: { type: "string" }
                },
                required: ["descriptor"]
              }
            }
          }
        },
        responses: {
          200: { description: "Attendance logged" }
        }
      }
    },
    "/api/admin/users": {
      get: {
        summary: "List users",
        responses: { 200: { description: "OK" } }
      }
    },
    "/api/admin/logs": {
      get: {
        summary: "List attendance logs",
        responses: { 200: { description: "OK" } }
      }
    }
  }
};



