import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5178,  // Fixed port for employee portal (5176 is used by face-attendance-employee)
    host: '0.0.0.0'
  }
})

