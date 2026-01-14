import React from "react";
import CameraScan from "../src/components/CameraScan.jsx";

export default function Home() {
  return (
    <div style={{ 
      padding: "40px 20px",
      minHeight: "100vh",
      backgroundColor: "#f5f5f5"
    }}>
      <div style={{ 
        textAlign: "center", 
        marginBottom: "40px"
      }}>
        <h1 style={{ 
          color: "#1a1a1a", 
          fontSize: "36px",
          fontWeight: "700",
          margin: "0 0 12px 0"
        }}>
          Face Recognition System
        </h1>
        <p style={{ 
          color: "#666", 
          fontSize: "16px",
          margin: "0"
        }}>
          Professional Attendance Management Solution
        </p>
      </div>
      <CameraScan />
    </div>
  );
}
