#!/usr/bin/env node

/**
 * Script để start tất cả services với error handling tốt hơn
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const services = [
  { name: 'LOGIN', dir: 'login-portal', port: 3000, color: 'white' },
  { name: 'BACKEND', dir: 'face-attendance-backend', port: 5000, color: 'blue' },
  { name: 'FRONTEND', dir: 'face-attendance-frontend', port: 5174, color: 'green' },
  { name: 'EMPLOYEE', dir: 'face-attendance-employee', port: 5176, color: 'yellow' },
  { name: 'PORTAL', dir: 'employee-portal', port: 5176, color: 'cyan' },
  { name: 'ACCOUNTANT', dir: 'accountant-client', port: 5175, color: 'magenta' },
  { name: 'PAYROLL', dir: 'payroll-frontend', port: 5177, color: 'red' }
];

console.log('🚀 Starting all services...\n');

const processes = [];

services.forEach((service, index) => {
  // Delay mỗi service 500ms để tránh conflict
  setTimeout(() => {
    console.log(`[${service.name}] Starting on port ${service.port}...`);
    
    const proc = spawn('npm', ['run', 'dev'], {
      cwd: join(__dirname, service.dir),
      shell: true,
      stdio: 'inherit'
    });

    proc.on('error', (error) => {
      console.error(`[${service.name}] ❌ Error:`, error.message);
    });

    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[${service.name}] ❌ Exited with code ${code}`);
      }
    });

    processes.push({ name: service.name, process: proc });
  }, index * 500);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down all services...');
  processes.forEach(({ name, process }) => {
    console.log(`[${name}] Stopping...`);
    process.kill('SIGTERM');
  });
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down all services...');
  processes.forEach(({ name, process }) => {
    process.kill('SIGTERM');
  });
  process.exit(0);
});

