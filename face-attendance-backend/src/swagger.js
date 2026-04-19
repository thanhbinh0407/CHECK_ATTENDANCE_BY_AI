export const swaggerDoc = {
  openapi: "3.0.0",
  info: {
    title: "Face Attendance API",
    version: "1.0.0"
  },
  paths: {
    "/api/enroll": {
      post: {
        summary: "Register user and optionally enroll face descriptor",
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
                required: ["name", "email", "employeeCode"]
              }
            }
          }
        },
        responses: {
          200: { description: "Enroll success" }
        }
      }
    },
    "/api/enroll/face": {
      put: {
        summary: "Update or create face profile for existing employee",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  employeeCode: { type: "string" },
                  userId: { type: "number" },
                  descriptor: { type: "array", items: { type: "number" } }
                },
                required: ["descriptor"]
              }
            }
          }
        },
        responses: {
          200: { description: "Face profile updated" }
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



