# Employee Portal

Portal dành cho nhân viên để xem lịch sử điểm danh và lương.

## Cấu trúc Project

```
employee-portal/
├── src/
│   ├── components/
│   │   ├── LoginForm.jsx       # Form đăng nhập
│   │   ├── AttendanceHistory.jsx  # Lịch sử điểm danh
│   │   └── SalaryHistory.jsx      # Lịch sử lương
│   ├── App.jsx                  # Component chính
│   ├── main.jsx                 # Entry point
│   ├── index.css                # Global styles
│   └── App.css                  # App styles
├── index.html
├── package.json
└── vite.config.js
```

## Cài đặt và Chạy

```bash
# Cài đặt dependencies
npm install

# Chạy development server (port 5175)
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

## Tính năng

- ✅ Đăng nhập với email/password
- ✅ Xem lịch sử điểm danh theo tháng/năm
- ✅ Xem lịch sử lương (12 tháng gần nhất)
- ✅ Hiển thị trạng thái điểm danh (muộn, về sớm, tăng ca)
- ✅ Format tiền tệ VND

## API Endpoints

Project này sử dụng các API endpoints từ backend:

- `POST /api/auth/login` - Đăng nhập
- `GET /api/employee/attendance` - Lấy lịch sử điểm danh
- `GET /api/employee/salary` - Lấy lịch sử lương

## Environment Variables

Tạo file `.env` (optional):

```env
VITE_API_BASE=http://localhost:5000
```

Nếu không có, mặc định sẽ dùng `http://localhost:5000`.

## Port

- Development: `http://localhost:5175`
- Được config trong `vite.config.js`

## Lưu ý

- Project này là riêng biệt, ngang cấp với `face-attendance-frontend` và `face-attendance-employee`
- Chỉ dành cho nhân viên (không phải admin)
- Cần backend đang chạy để sử dụng

