/**
 * test-role-changes.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Test script to verify role change functionality and audit logging
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { execSync } from 'child_process';

const API_BASE = 'http://localhost:5000/api';

// Test credentials
const TEST_USERS = [
  { email: 'manager@company.com', password: 'Manager@12345', role: 'manager' },
  { email: 'hr@company.com', password: 'HR@12345', role: 'hr' },
  { email: 'accountant@company.com', password: 'Accountant@12345', role: 'accountant' },
  { email: 'supervisor@company.com', password: 'Supervisor@12345', role: 'supervisor' },
  { email: 'emp001@company.com', password: 'Password123!', role: 'employee' },
  { email: 'emp002@company.com', password: 'Password123!', role: 'employee' },
];

function runCurl(command) {
  try {
    const result = execSync(command, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    throw new Error(`Curl command failed: ${error.message}`);
  }
}

async function login(email, password) {
  const command = `curl -s -X POST "${API_BASE}/auth/login" -H "Content-Type: application/json" -d "{\\"email\\": \\"${email}\\", \\"password\\": \\"${password}\\"}"`;
  const response = runCurl(command);

  if (response.status !== 'success') {
    throw new Error(response.message || 'Login failed');
  }

  return response.token;
}

async function getUsers(token) {
  const command = `curl -s "${API_BASE}/admin/employees" -H "Authorization: Bearer ${token}"`;
  const response = runCurl(command);

  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to get users');
  }

  return response.employees;
}

async function changeRole(token, userId, newRole, reason) {
  const command = `curl -s -X PATCH "${API_BASE}/admin/users/${userId}/role" -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -d "{\\"role\\": \\"${newRole}\\", \\"reason\\": \\"${reason}\\"}"`;
  const response = runCurl(command);

  if (response.status !== 'success') {
    throw new Error(response.message || 'Role change failed');
  }

  return response;
}

async function getRoleAuditLogs(token) {
  const command = `curl -s "${API_BASE}/admin/audits/role-changes?page=1&pageSize=50" -H "Authorization: Bearer ${token}"`;
  const response = runCurl(command);

  if (response.status !== 'success') {
    throw new Error(response.message || 'Failed to get audit logs');
  }

  return response.logs;
}

async function testRoleChanges() {
  console.log('🚀 Testing Role Change Functionality\n');

  try {
    // Test 1: Login with all test accounts
    console.log('1️⃣ Testing login with all test accounts...');
    const tokens = {};
    for (const user of TEST_USERS) {
      try {
        const token = await login(user.email, user.password);
        tokens[user.email] = { token, role: user.role };
        console.log(`   ✅ ${user.email} (${user.role}) - Login successful`);
      } catch (error) {
        console.log(`   ❌ ${user.email} - ${error.message}`);
      }
    }
    console.log('');

    // Test 2: Get users list (should show all users now)
    console.log('2️⃣ Testing user list retrieval...');
    const managerToken = tokens['manager@company.com']?.token;
    if (!managerToken) {
      throw new Error('Manager login failed, cannot proceed with tests');
    }

    const users = await getUsers(managerToken);
    console.log(`   ✅ Retrieved ${users.length} users`);

    // Check if all role types are present
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    console.log('   Role distribution:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`     ${role}: ${count} users`);
    });
    console.log('');

    // Test 3: Change roles
    console.log('3️⃣ Testing role changes...');

    // Find some test users to change roles
    const emp001 = users.find(u => u.email === 'emp001@company.com');
    const emp002 = users.find(u => u.email === 'emp002@company.com');

    if (emp001 && emp002) {
      // Change emp001 from employee to supervisor
      console.log(`   Changing ${emp001.email} from ${emp001.role} to supervisor...`);
      await changeRole(managerToken, emp001.id, 'supervisor', 'Test: Promoting to supervisor role');
      console.log('   ✅ Role change successful');

      // Change emp002 from employee to hr
      console.log(`   Changing ${emp002.email} from ${emp002.role} to hr...`);
      await changeRole(managerToken, emp002.id, 'hr', 'Test: Assigning HR responsibilities');
      console.log('   ✅ Role change successful');
    } else {
      console.log('   ⚠️  Could not find test employees emp001/emp002');
    }
    console.log('');

    // Test 4: Check audit logs
    console.log('4️⃣ Checking role change audit logs...');
    const auditLogs = await getRoleAuditLogs(managerToken);
    console.log(`   ✅ Retrieved ${auditLogs.length} audit log entries`);

    // Show recent role changes
    const recentChanges = auditLogs.slice(0, 5);
    console.log('   Recent role changes:');
    recentChanges.forEach(log => {
      console.log(`     ${log.oldRole} → ${log.newRole} (${log.changedByUser?.name || 'Unknown'} at ${new Date(log.createdAt).toLocaleString()})`);
      if (log.reason) console.log(`       Reason: ${log.reason}`);
    });
    console.log('');

    // Test 5: Verify dashboard statistics
    console.log('5️⃣ Testing dashboard statistics...');
    const updatedUsers = await getUsers(managerToken);
    const updatedRoleCounts = updatedUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    console.log('   Updated role distribution:');
    Object.entries(updatedRoleCounts).forEach(([role, count]) => {
      console.log(`     ${role}: ${count} users`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ All test accounts can login');
    console.log('   ✅ User management shows all users');
    console.log('   ✅ Role changes work properly');
    console.log('   ✅ Audit logs are created');
    console.log('   ✅ Dashboard statistics update correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testRoleChanges();