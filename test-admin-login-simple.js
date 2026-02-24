/**
 * Script test đăng nhập admin (Simple version - không cần dependencies)
 * Chạy: node test-admin-login-simple.js
 */

import http from 'http';

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

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testBackendConnection() {
  log('\n🔍 Bước 1: Kiểm tra kết nối Backend...', 'cyan');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const result = await makeRequest(options);
    
    log(`✅ Backend đang chạy tại ${API_BASE}`, 'green');
    log(`   Status: ${result.status}`, 'blue');
    return true;
  } catch (error) {
    log(`❌ Không thể kết nối đến Backend tại ${API_BASE}`, 'red');
    log(`   Lỗi: ${error.message}`, 'red');
    if (error.code === 'ECONNREFUSED') {
      log(`   💡 Backend không chạy! Hãy chạy: cd face-attendance-backend && npm start`, 'yellow');
    }
    return false;
  }
}

async function testAdminLogin() {
  log('\n🔍 Bước 2: Kiểm tra đăng nhập Admin...', 'cyan');
  try {
    log(`   Email: ${ADMIN_EMAIL}`, 'blue');
    log(`   Password: ${ADMIN_PASSWORD}`, 'blue');
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const result = await makeRequest(options, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (result.status === 200 && result.data.status === 'success') {
      log(`✅ Đăng nhập thành công!`, 'green');
      log(`   User ID: ${result.data.user.id}`, 'blue');
      log(`   Name: ${result.data.user.name}`, 'blue');
      log(`   Email: ${result.data.user.email}`, 'blue');
      log(`   Role: ${result.data.user.role}`, 'blue');
      log(`   Employee Code: ${result.data.user.employeeCode || 'N/A'}`, 'blue');
      log(`   Token: ${result.data.token ? result.data.token.substring(0, 20) + '...' : 'N/A'}`, 'blue');
      return { success: true, data: result.data };
    } else {
      log(`❌ Đăng nhập thất bại!`, 'red');
      log(`   Status Code: ${result.status}`, 'red');
      log(`   Message: ${result.data.message || 'Unknown error'}`, 'red');
      log(`   Response: ${JSON.stringify(result.data, null, 2)}`, 'red');
      return { success: false, data: result.data };
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
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    };

    const result = await makeRequest(options);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': result.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': result.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': result.headers['access-control-allow-headers']
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

async function testLoginPortalConnection() {
  log('\n🔍 Bước 4: Kiểm tra Login Portal (localhost:3000)...', 'cyan');
  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    };

    const result = await makeRequest(options);
    
    if (result.status === 200) {
      log(`✅ Login Portal đang chạy tại http://localhost:3000`, 'green');
      return true;
    } else {
      log(`⚠️  Login Portal trả về status: ${result.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Không thể kết nối đến Login Portal tại http://localhost:3000`, 'red');
    log(`   Lỗi: ${error.message}`, 'red');
    if (error.code === 'ECONNREFUSED') {
      log(`   💡 Login Portal không chạy! Hãy chạy: cd login-portal && npm run dev`, 'yellow');
    }
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
    log('\n💡 Các bước khắc phục:', 'yellow');
    log('   1. Kiểm tra backend có đang chạy: cd face-attendance-backend && npm start', 'yellow');
    log('   2. Kiểm tra port 5000 có bị chiếm không', 'yellow');
    log('   3. Kiểm tra file .env có đúng cấu hình database không', 'yellow');
    process.exit(1);
  }
  
  // Test 2: CORS
  await testCORS();
  
  // Test 3: Login Portal
  await testLoginPortalConnection();
  
  // Test 4: Admin login
  const loginResult = await testAdminLogin();
  
  // Summary
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('📊 TÓM TẮT KẾT QUẢ', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  
  if (loginResult.success) {
    log('✅ TẤT CẢ TEST ĐỀU PASS!', 'green');
    log('\n💡 Nếu vẫn không đăng nhập được ở browser:', 'yellow');
    log('   1. Mở DevTools (F12) và kiểm tra Console tab', 'yellow');
    log('   2. Kiểm tra Network tab xem request có được gửi không', 'yellow');
    log('   3. Kiểm tra Response trong Network tab xem có lỗi gì không', 'yellow');
    log('   4. Thử clear cache và localStorage:', 'yellow');
    log('      - localStorage.clear()', 'yellow');
    log('      - Hard refresh: Ctrl+Shift+R (Windows) hoặc Cmd+Shift+R (Mac)', 'yellow');
    log('   5. Kiểm tra CORS headers trong Network tab', 'yellow');
    log('   6. Thử đăng nhập với email/password khác nếu có', 'yellow');
  } else {
    log('❌ CÓ LỖI XẢY RA!', 'red');
    log('\n💡 Các bước khắc phục:', 'yellow');
    
    if (loginResult.data?.message?.includes('not found') || loginResult.data?.message?.includes('Invalid credentials')) {
      log('   🔑 Vấn đề: Tài khoản admin không tồn tại hoặc password sai', 'yellow');
      log('   ✅ Giải pháp: Tạo lại admin account', 'yellow');
      log('      cd face-attendance-backend && node reset-admin.js', 'yellow');
    } else if (loginResult.data?.message?.includes('inactive')) {
      log('   🔑 Vấn đề: Tài khoản admin bị vô hiệu hóa', 'yellow');
      log('   ✅ Giải pháp: Kích hoạt lại account trong database', 'yellow');
    } else {
      log('   1. Đảm bảo backend đang chạy: cd face-attendance-backend && npm start', 'yellow');
      log('   2. Tạo lại admin account: cd face-attendance-backend && node reset-admin.js', 'yellow');
      log('   3. Kiểm tra database connection trong .env', 'yellow');
      log('   4. Kiểm tra CORS configuration trong backend/src/index.js', 'yellow');
    }
  }
  
  log('\n', 'reset');
}

main().catch(console.error);

