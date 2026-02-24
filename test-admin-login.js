/**
 * Script test đăng nhập admin
 * Chạy: node test-admin-login.js
 * 
 * Lưu ý: Cần cài node-fetch nếu chưa có:
 * npm install node-fetch
 */

// Try to use native fetch (Node 18+) or node-fetch
let fetch;
try {
  // Try native fetch first (Node 18+)
  if (globalThis.fetch) {
    fetch = globalThis.fetch;
  } else {
    // Fallback to node-fetch
    const nodeFetch = await import('node-fetch');
    fetch = nodeFetch.default;
  }
} catch (e) {
  console.error('❌ Cần cài node-fetch: npm install node-fetch');
  process.exit(1);
}

const API_BASE = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@company.com';
const ADMIN_PASSWORD = 'Admin@12345';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testBackendConnection() {
  log('\n🔍 Bước 1: Kiểm tra kết nối Backend...', 'cyan');
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Không quan trọng response code, chỉ cần server phản hồi
    log(`✅ Backend đang chạy tại ${API_BASE}`, 'green');
    log(`   Status: ${response.status}`, 'blue');
    return true;
  } catch (error) {
    log(`❌ Không thể kết nối đến Backend tại ${API_BASE}`, 'red');
    log(`   Lỗi: ${error.message}`, 'red');
    log(`   💡 Hãy đảm bảo backend đang chạy: cd face-attendance-backend && npm start`, 'yellow');
    return false;
  }
}

async function testAdminLogin() {
  log('\n🔍 Bước 2: Kiểm tra đăng nhập Admin...', 'cyan');
  try {
    log(`   Email: ${ADMIN_EMAIL}`, 'blue');
    log(`   Password: ${ADMIN_PASSWORD}`, 'blue');
    
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    const data = await response.json();
    
    if (response.ok && data.status === 'success') {
      log(`✅ Đăng nhập thành công!`, 'green');
      log(`   User ID: ${data.user.id}`, 'blue');
      log(`   Name: ${data.user.name}`, 'blue');
      log(`   Email: ${data.user.email}`, 'blue');
      log(`   Role: ${data.user.role}`, 'blue');
      log(`   Employee Code: ${data.user.employeeCode || 'N/A'}`, 'blue');
      log(`   Token: ${data.token.substring(0, 20)}...`, 'blue');
      return { success: true, data };
    } else {
      log(`❌ Đăng nhập thất bại!`, 'red');
      log(`   Status Code: ${response.status}`, 'red');
      log(`   Message: ${data.message || 'Unknown error'}`, 'red');
      log(`   Response: ${JSON.stringify(data, null, 2)}`, 'red');
      return { success: false, data };
    }
  } catch (error) {
    log(`❌ Lỗi khi gọi API đăng nhập:`, 'red');
    log(`   ${error.message}`, 'red');
    if (error.code === 'ECONNREFUSED') {
      log(`   💡 Backend không chạy hoặc không thể kết nối`, 'yellow');
    }
    return { success: false, error: error.message };
  }
}

async function testCORS() {
  log('\n🔍 Bước 3: Kiểm tra CORS...', 'cyan');
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
      'Access-Control-Allow-Methods': response.headers.get('access-control-allow-methods'),
      'Access-Control-Allow-Headers': response.headers.get('access-control-allow-headers')
    };
    
    log(`   CORS Headers:`, 'blue');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value) {
        log(`   ✅ ${key}: ${value}`, 'green');
      } else {
        log(`   ⚠️  ${key}: Không có`, 'yellow');
      }
    });
    
    return true;
  } catch (error) {
    log(`   ⚠️  Không thể kiểm tra CORS: ${error.message}`, 'yellow');
    return false;
  }
}

async function checkAdminAccount() {
  log('\n🔍 Bước 4: Kiểm tra tài khoản Admin trong database...', 'cyan');
  log(`   💡 Chạy script reset-admin.js để tạo/tạo lại admin account:`, 'yellow');
  log(`   cd face-attendance-backend && node reset-admin.js`, 'yellow');
}

async function testLoginPortalConnection() {
  log('\n🔍 Bước 5: Kiểm tra Login Portal (localhost:3000)...', 'cyan');
  try {
    const response = await fetch('http://localhost:3000', {
      method: 'GET'
    });
    
    if (response.ok) {
      log(`✅ Login Portal đang chạy tại http://localhost:3000`, 'green');
      return true;
    } else {
      log(`⚠️  Login Portal trả về status: ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Không thể kết nối đến Login Portal tại http://localhost:3000`, 'red');
    log(`   Lỗi: ${error.message}`, 'red');
    log(`   💡 Hãy đảm bảo login-portal đang chạy: cd login-portal && npm run dev`, 'yellow');
    return false;
  }
}

async function main() {
  log('═══════════════════════════════════════════════════════', 'cyan');
  log('🧪 TEST ĐĂNG NHẬP ADMIN', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  
  // Test 1: Backend connection
  const backendOk = await testBackendConnection();
  if (!backendOk) {
    log('\n❌ Backend không chạy. Dừng test.', 'red');
    process.exit(1);
  }
  
  // Test 2: CORS
  await testCORS();
  
  // Test 3: Login Portal
  await testLoginPortalConnection();
  
  // Test 4: Admin login
  const loginResult = await testAdminLogin();
  
  // Test 5: Check admin account
  if (!loginResult.success) {
    await checkAdminAccount();
  }
  
  // Summary
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('📊 TÓM TẮT KẾT QUẢ', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  
  if (loginResult.success) {
    log('✅ TẤT CẢ TEST ĐỀU PASS!', 'green');
    log('\n💡 Nếu vẫn không đăng nhập được ở browser:', 'yellow');
    log('   1. Kiểm tra console browser (F12) xem có lỗi gì không', 'yellow');
    log('   2. Kiểm tra Network tab xem request có được gửi không', 'yellow');
    log('   3. Kiểm tra CORS headers trong response', 'yellow');
    log('   4. Thử clear cache và localStorage', 'yellow');
  } else {
    log('❌ CÓ LỖI XẢY RA!', 'red');
    log('\n💡 Các bước khắc phục:', 'yellow');
    log('   1. Đảm bảo backend đang chạy: cd face-attendance-backend && npm start', 'yellow');
    log('   2. Tạo lại admin account: cd face-attendance-backend && node reset-admin.js', 'yellow');
    log('   3. Kiểm tra database connection', 'yellow');
    log('   4. Kiểm tra CORS configuration trong backend', 'yellow');
  }
  
  log('\n', 'reset');
}

main().catch(console.error);

