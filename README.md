# Project KY-9 - Unified Setup

Dự án này bao gồm nhiều service được gộp lại để dễ dàng khởi động.

## Cấu trúc dự án

- **login-portal**: Cổng đăng nhập thống nhất (Port 3000) - **Bắt đầu từ đây!**
- **face-attendance-backend**: Backend server (Port 5000)
- **face-attendance-frontend**: Frontend chính cho Admin (Port 5173)
- **face-attendance-employee**: Ứng dụng chấm công cho nhân viên (Port 5176)
- **employee-portal**: Cổng thông tin nhân viên (Port 5175)
- **accountant-client**: Client cho kế toán (Port 5174)
- **payroll-frontend**: Frontend quản lý lương (Port 5177)

## Cách sử dụng

### Lần đầu tiên hoặc sau khi clone project:

```bash
npm i
```

Lệnh này sẽ tự động:
1. Cài đặt dependencies cho root project
2. Cài đặt dependencies cho tất cả các service con

### Chạy tất cả các service:

```bash
npm run dev
```

Lệnh này sẽ khởi động tất cả 7 service cùng lúc:
- **Login Portal** (Port 3000) - Cổng đăng nhập thống nhất
- Backend server (Port 5000)
- Face Attendance Frontend (Port 5173) - Cho Admin
- Employee App (Port 5176) - Chấm công
- Employee Portal (Port 5175) - Thông tin nhân viên
- Accountant Client (Port 5174) - Cho kế toán
- Payroll Frontend (Port 5177) - Quản lý lương

Các service sẽ chạy với màu sắc khác nhau để dễ phân biệt trong console.

### Đăng nhập hệ thống:

1. Mở trình duyệt và truy cập: **http://localhost:3000**
2. Chọn vai trò đăng nhập từ dropdown:
   - **Quản trị viên (Quản lý nhân sự)** → Chuyển đến Port 5173 (Face Attendance Frontend)
     - Chỉ dành cho `admin@company.com`
     - Quản lý toàn bộ hệ thống, nhân viên, phòng ban, chức vụ, duyệt yêu cầu
   - **Kế toán (Quản lý lương)** → Chuyển đến Port 5174 (Accountant Client)
     - Dành cho `admin@company.com` và `accountant@company.com`
     - Quản lý và phê duyệt bảng lương, tính lương
   - **Nhân viên** → Chuyển đến Port 5175 (Employee Portal)
   - **Quản lý lương** → Chuyển đến Port 5177 (Payroll Frontend)
3. Nhập email và mật khẩu
4. Hệ thống sẽ tự động chuyển hướng đến ứng dụng tương ứng với vai trò đã chọn

**Lưu ý đặc biệt:**
- `admin@company.com` có thể đăng nhập với cả 2 vai trò: "Quản trị viên" và "Kế toán"
- `accountant@company.com` chỉ có thể đăng nhập với vai trò "Kế toán"
- Khi chọn "Quản trị viên", admin sẽ vào giao diện quản lý nhân sự (Port 5173)
- Khi chọn "Kế toán", admin hoặc accountant sẽ vào giao diện quản lý lương (Port 5174)

## Chạy từng service riêng lẻ

Nếu bạn chỉ muốn chạy một service cụ thể:

```bash
npm run dev:login        # Chỉ chạy login portal (Port 3000)
npm run dev:backend      # Chỉ chạy backend (Port 5000)
npm run dev:frontend     # Chỉ chạy face-attendance-frontend (Port 5173)
npm run dev:employee     # Chỉ chạy face-attendance-employee (Port 5176)
npm run dev:portal       # Chỉ chạy employee-portal (Port 5175)
npm run dev:accountant   # Chỉ chạy accountant-client (Port 5174)
npm run dev:payroll      # Chỉ chạy payroll-frontend (Port 5177)
```

## Cài đặt lại dependencies

Nếu cần cài đặt lại dependencies cho tất cả các service:

```bash
npm run install:all
```

Hoặc cài đặt cho từng service:

```bash
npm run install:login
npm run install:backend
npm run install:frontend
npm run install:employee
npm run install:portal
npm run install:accountant
npm run install:payroll
```

## Lưu ý

- **Luôn bắt đầu từ Login Portal** (http://localhost:3000) để đăng nhập và chọn vai trò
- Mỗi vai trò sẽ được chuyển hướng đến ứng dụng tương ứng
- Đảm bảo backend (Port 5000) đang chạy trước khi đăng nhập
- Token đăng nhập sẽ được lưu trong localStorage và tự động gửi kèm các request API

