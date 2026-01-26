# Client Kế toán - Hướng dẫn Setup

## Cài đặt dependencies

```bash
cd accountant-client
npm install
```

## Chạy development server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại http://localhost:5174

## Cấu hình API

Mặc định API base URL: `http://localhost:5000`

Có thể cấu hình qua file `.env`:
```
VITE_API_BASE=http://localhost:5000
```

## Chức năng chính

1. **Đăng nhập**: Đăng nhập với tài khoản admin hoặc kế toán
2. **Xem bảng lương**: Xem danh sách lương theo tháng/năm
3. **Tính lương**: Tính lại lương cho từng nhân viên
4. **Cập nhật trạng thái**: Duyệt và thanh toán lương
5. **Xuất báo cáo**: Xuất bảng lương ra Excel hoặc PDF

## Lưu ý

- Cần có tài khoản admin để truy cập
- Backend API phải đang chạy
- Các API endpoints được sử dụng:
  - `/api/auth/login` - Đăng nhập
  - `/api/salary` - Lấy danh sách lương
  - `/api/salary/calculate` - Tính lương
  - `/api/salary/:id/status` - Cập nhật trạng thái
  - `/api/admin/employees` - Lấy danh sách nhân viên

