# Client Kế toán - Hệ thống Quản lý Lương

Ứng dụng dành cho kế toán để quản lý và tính lương nhân viên.

## Cài đặt

```bash
npm install
```

## Chạy development server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại http://localhost:5174

## Các chức năng chính

- Đăng nhập
- Xem danh sách bảng lương
- Tính lương nhân viên
- Cập nhật trạng thái lương (Chờ duyệt, Đã duyệt, Đã thanh toán)
- Xuất bảng lương (Excel/PDF)
- Xem chi tiết lương từng nhân viên

## API Base URL

Mặc định: `http://localhost:5000`

Có thể cấu hình qua biến môi trường `VITE_API_BASE`

