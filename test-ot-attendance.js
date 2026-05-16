/**
 * test-ot-attendance.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Test script to verify OT attendance flow
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { execSync } from 'child_process';

const API_BASE = 'http://localhost:5000/api';

// Test credentials
const EMPLOYEE = { email: 'emp001@company.com', password: 'Password123!', role: 'employee' };
const SUPERVISOR = { email: 'supervisor@company.com', password: 'Supervisor@12345', role: 'supervisor' };

function runCurl(command) {
  try {
    const result = execSync(command, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    console.error(`Curl command failed: ${error.message}`);
    return null;
  }
}

async function login(email, password) {
  const command = `curl -s -X POST "${API_BASE}/auth/login" -H "Content-Type: application/json" -d "{\\"email\\": \\"${email}\\", \\"password\\": \\"${password}\\"}"`;
  const response = runCurl(command);

  if (!response || response.status !== 'success') {
    throw new Error(response.message || 'Login failed');
  }

  return response.token;
}

async function createOTRequest(token, date, startTime, endTime, reason) {
  const command = `curl -s -X POST "${API_BASE}/overtime/request" -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -d "{\\"date\\": \\"${date}\\", \\"startTime\\": \\"${startTime}\\", \\"endTime\\": \\"${endTime}\\", \\"reason\\": \\"${reason}\\"}"`;
  const response = runCurl(command);

  if (!response || response.status !== 'success') {
    throw new Error(response.message || 'Create OT request failed');
  }

  return response.request;
}

async function approveOTRequest(token, requestId) {
  const command = `curl -s -X PUT "${API_BASE}/overtime/approve/${requestId}" -H "Authorization: Bearer ${token}"`;
  const response = runCurl(command);

  if (!response || response.status !== 'success') {
    throw new Error(response.message || 'Approve OT request failed');
  }

  return response.request;
}

async function getTodayAttendance(token) {
  const command = `curl -s "${API_BASE}/attendance/today" -H "Authorization: Bearer ${token}"`;
  const response = runCurl(command);

  if (!response || response.status !== 'success') {
    throw new Error(response.message || 'Get today attendance failed');
  }

  return response;
}

async function logAttendance(token, type) {
  const command = `curl -s -X POST "${API_BASE}/attendance/log" -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -d "{\\"type\\": \\"${type}\\"}"`;
  const response = runCurl(command);

  if (!response || response.status !== 'success') {
    throw new Error(response.message || 'Log attendance failed');
  }

  return response;
}

async function testOTFlow() {
  try {
    console.log('🚀 Starting OT Attendance Flow Test...\n');

    // Step 1: Login as employee
    console.log('1. Logging in as employee...');
    const employeeToken = await login(EMPLOYEE.email, EMPLOYEE.password);
    console.log('✅ Employee login successful\n');

    // Step 2: Create OT request for today
    const today = new Date().toISOString().split('T')[0];
    console.log(`2. Creating OT request for ${today}...`);
    const otRequest = await createOTRequest(employeeToken, today, '18:00', '20:00', 'Test OT request');
    console.log('✅ OT request created:', otRequest.id, '\n');

    // Step 3: Check attendance before approval - should not show OT
    console.log('3. Checking attendance before approval...');
    let attendance = await getTodayAttendance(employeeToken);
    console.log('Expected logs per day:', attendance.expectedLogsPerDay);
    console.log('Shift groups:', attendance.shiftLogs.length);
    console.log('✅ Should be 2 (main shift only)\n');

    // Step 4: Login as supervisor and approve OT
    console.log('4. Logging in as supervisor...');
    const supervisorToken = await login(SUPERVISOR.email, SUPERVISOR.password);
    console.log('✅ Supervisor login successful\n');

    console.log('5. Approving OT request...');
    const approvedRequest = await approveOTRequest(supervisorToken, otRequest.id);
    console.log('✅ OT request approved\n');

    // Step 5: Check attendance after approval - should show OT
    console.log('6. Checking attendance after approval...');
    attendance = await getTodayAttendance(employeeToken);
    console.log('Expected logs per day:', attendance.expectedLogsPerDay);
    console.log('Shift groups:', attendance.shiftLogs.length);
    console.log('✅ Should be 4 (main shift + OT)\n');

    // Step 6: Log main shift IN
    console.log('7. Logging main shift IN...');
    await logAttendance(employeeToken, 'IN');
    console.log('✅ Main shift IN logged\n');

    // Step 7: Check attendance - should still show OUT option for main shift
    console.log('8. Checking attendance after main IN...');
    attendance = await getTodayAttendance(employeeToken);
    console.log('Expected logs per day:', attendance.expectedLogsPerDay);
    console.log('Current logs count:', attendance.todayLogs.length);
    console.log('✅ Should show OUT option for main shift\n');

    // Step 8: Log main shift OUT
    console.log('9. Logging main shift OUT...');
    await logAttendance(employeeToken, 'OUT');
    console.log('✅ Main shift OUT logged\n');

    // Step 9: Check attendance - should show OT IN option
    console.log('10. Checking attendance after main OUT...');
    attendance = await getTodayAttendance(employeeToken);
    console.log('Expected logs per day:', attendance.expectedLogsPerDay);
    console.log('Current logs count:', attendance.todayLogs.length);
    console.log('✅ Should show OT IN option\n');

    // Step 10: Log OT IN
    console.log('11. Logging OT IN...');
    await logAttendance(employeeToken, 'IN');
    console.log('✅ OT IN logged\n');

    // Step 11: Check attendance - should show OT OUT option
    console.log('12. Checking attendance after OT IN...');
    attendance = await getTodayAttendance(employeeToken);
    console.log('Expected logs per day:', attendance.expectedLogsPerDay);
    console.log('Current logs count:', attendance.todayLogs.length);
    console.log('✅ Should show OT OUT option\n');

    // Step 12: Log OT OUT
    console.log('13. Logging OT OUT...');
    await logAttendance(employeeToken, 'OUT');
    console.log('✅ OT OUT logged\n');

    // Step 13: Final check - should be complete
    console.log('14. Final attendance check...');
    attendance = await getTodayAttendance(employeeToken);
    console.log('Expected logs per day:', attendance.expectedLogsPerDay);
    console.log('Current logs count:', attendance.todayLogs.length);
    console.log('✅ Should be 4 logs total, all complete\n');

    console.log('🎉 OT Attendance Flow Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testOTFlow();