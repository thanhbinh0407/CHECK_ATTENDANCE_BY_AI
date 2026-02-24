# 🔍 Hướng Dẫn Debug Đăng Nhập Admin

## ✅ Kết Quả Test

Script test cho thấy:
- ✅ Backend đang chạy tại `http://localhost:5000`
- ✅ CORS được cấu hình đúng
- ✅ Login Portal đang chạy tại `http://localhost:3000`
- ✅ API đăng nhập hoạt động tốt
- ✅ Admin account tồn tại: `admin@company.com` / `Admin@12345`

## 🐛 Các Vấn Đề Có Thể Xảy Ra

### 1. **Chưa chọn vai trò trước khi đăng nhập**

**Triệu chứng:** Click "Đăng nhập" nhưng không có gì xảy ra hoặc hiện lỗi "Vui lòng chọn vai trò đăng nhập"

**Giải pháp:**
- Phải chọn "Quản trị viên (Quản lý nhân sự)" trong dropdown trước khi nhập email/password
- Sau đó mới click "Đăng nhập"

### 2. **Admin Portal (port 5174) không chạy**

**Triệu chứng:** Đăng nhập thành công nhưng redirect không hoạt động

**Giải pháp:**
```bash
# Mở terminal mới và chạy:
cd face-attendance-frontend
npm run dev
```

Kiểm tra xem port 5174 có đang chạy không:
- Mở browser: `http://localhost:5174`
- Nếu không chạy, kiểm tra `vite.config.js` trong `face-attendance-frontend`

### 3. **Lỗi JavaScript trong Browser Console**

**Cách kiểm tra:**
1. Mở DevTools (F12)
2. Vào tab **Console**
3. Thử đăng nhập và xem có lỗi gì không

**Các lỗi thường gặp:**
- `CORS error`: Backend không cho phép request từ origin này
- `Network error`: Backend không chạy hoặc không thể kết nối
- `Syntax error`: Code JavaScript có lỗi

### 4. **LocalStorage bị lỗi hoặc đầy**

**Cách kiểm tra:**
1. Mở DevTools (F12)
2. Vào tab **Application** > **Local Storage** > `http://localhost:3000`
3. Xem có key `authToken` và `user` không

**Giải pháp:**
```javascript
// Chạy trong Console:
localStorage.clear()
// Sau đó thử đăng nhập lại
```

### 5. **Port bị conflict**

**Kiểm tra:**
```bash
# Windows PowerShell:
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :5174

# Nếu port bị chiếm, kill process:
# taskkill /PID <PID> /F
```

## 🛠️ Các Công Cụ Debug

### 1. **Script Test (Node.js)**
```bash
# Test backend và API
node test-admin-login-simple.js
```

### 2. **HTML Debug Tool**
Mở file `debug-login.html` trong browser để:
- Test backend connection
- Test login API
- Kiểm tra CORS
- Kiểm tra LocalStorage
- Test redirect

### 3. **Browser DevTools**

**Network Tab:**
1. Mở DevTools (F12) > **Network**
2. Thử đăng nhập
3. Tìm request `POST /api/auth/login`
4. Kiểm tra:
   - **Request Headers**: Có `Content-Type: application/json` không?
   - **Request Payload**: Email và password có đúng không?
   - **Response**: Status code và body response là gì?

**Console Tab:**
- Xem có lỗi JavaScript không
- Xem log messages từ code

**Application Tab:**
- **Local Storage**: Kiểm tra `authToken` và `user`
- **Session Storage**: Kiểm tra có data gì không

## 📋 Checklist Debug

- [ ] Backend đang chạy tại `http://localhost:5000`
- [ ] Login Portal đang chạy tại `http://localhost:3000`
- [ ] Admin Portal đang chạy tại `http://localhost:5174`
- [ ] Đã chọn vai trò "Quản trị viên" trước khi đăng nhập
- [ ] Email: `admin@company.com`
- [ ] Password: `Admin@12345`
- [ ] Không có lỗi trong Browser Console
- [ ] Network request `/api/auth/login` trả về status 200
- [ ] Response có `status: "success"` và có `token`
- [ ] LocalStorage có `authToken` và `user` sau khi đăng nhập
- [ ] Redirect URL đúng: `http://localhost:5174?token=...&user=...`

## 🔧 Các Lệnh Khắc Phục

### Tạo lại Admin Account
```bash
cd face-attendance-backend
node reset-admin.js
```

### Khởi động lại Backend
```bash
cd face-attendance-backend
npm start
```

### Khởi động lại Login Portal
```bash
cd login-portal
npm run dev
```

### Khởi động lại Admin Portal
```bash
cd face-attendance-frontend
npm run dev
```

### Clear Browser Cache
1. **Chrome/Edge**: Ctrl+Shift+Delete > Chọn "Cached images and files" > Clear
2. **Firefox**: Ctrl+Shift+Delete > Chọn "Cache" > Clear
3. **Hard Refresh**: Ctrl+Shift+R (Windows) hoặc Cmd+Shift+R (Mac)

### Clear LocalStorage trong Console
```javascript
localStorage.clear()
location.reload()
```

## 🎯 Test Case

### Test Case 1: Đăng nhập thành công
1. Mở `http://localhost:3000`
2. Chọn "Quản trị viên (Quản lý nhân sự)"
3. Nhập email: `admin@company.com`
4. Nhập password: `Admin@12345`
5. Click "Đăng nhập"
6. **Kỳ vọng**: Redirect đến `http://localhost:5174` và hiển thị admin dashboard

### Test Case 2: Đăng nhập với role sai
1. Mở `http://localhost:3000`
2. Chọn "Nhân viên" (thay vì "Quản trị viên")
3. Nhập email: `admin@company.com`
4. Nhập password: `Admin@12345`
5. Click "Đăng nhập"
6. **Kỳ vọng**: Hiện lỗi "Tài khoản này không có quyền đăng nhập với vai trò Nhân viên"

### Test Case 3: Đăng nhập với password sai
1. Mở `http://localhost:3000`
2. Chọn "Quản trị viên"
3. Nhập email: `admin@company.com`
4. Nhập password: `wrongpassword`
5. Click "Đăng nhập"
6. **Kỳ vọng**: Hiện lỗi "Invalid credentials"

## 📞 Nếu Vẫn Không Được

1. **Chạy script test:**
   ```bash
   node test-admin-login-simple.js
   ```

2. **Mở file debug-login.html** trong browser và test từng bước

3. **Kiểm tra logs:**
   - Backend console logs
   - Browser console logs
   - Network tab trong DevTools

4. **Kiểm tra cấu hình:**
   - `login-portal/src/App.jsx`: Port mapping
   - `face-attendance-backend/src/index.js`: CORS config
   - `.env` files: Database connection

5. **Thử với tài khoản khác:**
   - Tạo employee account và thử đăng nhập với role "Nhân viên"
   - Xem có hoạt động không

## 💡 Tips

- Luôn mở DevTools (F12) khi debug
- Kiểm tra Network tab để xem request/response
- Sử dụng `debug-login.html` để test từng bước
- Clear cache và localStorage nếu có vấn đề lạ
- Kiểm tra cả backend và frontend logs

