# Hướng dẫn Reset và Seed Database

## ⚠️ LƯU Ý QUAN TRỌNG
**Script này sẽ XÓA TẤT CẢ dữ liệu hiện có trong database!**

## Các bước thực hiện:

### 1. Chạy Migration để thêm các cột mới (nếu chưa chạy)
```bash
npm run db:migrate:job
```

### 2. Drop và Seed lại với 20 nhân viên
```bash
npm run db:seed:20
```

Script này sẽ:
- ✅ Drop tất cả dữ liệu cũ
- ✅ Tạo lại schema với các cột mới (jobTitle, educationLevel, certificates, dependents)
- ✅ Tạo 1 tài khoản admin: `admin@company.com` / `Admin@12345`
- ✅ Tạo 20 nhân viên mẫu với:
  - Chức vụ khác nhau (10 loại chức vụ)
  - Trình độ khác nhau
  - Một số có chứng chỉ CCASP
  - Số người phụ thuộc ngẫu nhiên (0-2)
  - Lương 12 tháng (Jan 2024 - Dec 2024)
  - Face profiles cho tất cả nhân viên
- ✅ Tất cả mật khẩu nhân viên: `Password123!`

### 3. Reset mật khẩu admin (nếu cần)
```bash
npm run admin:reset
```

## Sau khi seed xong:
- Đăng nhập với: `admin@company.com` / `Admin@12345`
- Có 20 nhân viên với lương 12 tháng đã được tạo
- Tất cả dữ liệu cũ đã bị xóa

