# Hướng dẫn Setup và Chạy

## 1. Chạy Migration để thêm các cột mới

```bash
npm run db:migrate:job
```

Hoặc nếu muốn sync toàn bộ schema:
```bash
npm run db:migrate
```

## 2. Reset và Seed dữ liệu mẫu

**Lưu ý: Script này sẽ XÓA TẤT CẢ dữ liệu hiện có!**

```bash
npm run db:seed:10
```

Script này sẽ:
- Xóa toàn bộ dữ liệu hiện có
- Tạo 1 tài khoản admin: `admin@company.com` / `Admin@12345`
- Tạo 10 nhân viên mẫu với:
  - Chức vụ khác nhau (Nhân viên CNTT, Chuyên viên, Phó phòng, Trưởng phòng, ...)
  - Trình độ khác nhau (Trung cấp, Cao đẳng, Đại học, Sau đại học)
  - Một số có chứng chỉ CCASP
  - Số người phụ thuộc ngẫu nhiên (0-2)
  - Lương 12 tháng (Jan 2024 - Dec 2024)
- Tất cả mật khẩu nhân viên: `Password123!`

## 3. Reset mật khẩu admin

```bash
npm run admin:reset
```

## 4. Cấu trúc dữ liệu mới

### User Model - Các trường mới:
- `jobTitle`: Chức vụ (Nhân viên CNTT, Chuyên viên CNTT, ...)
- `educationLevel`: Trình độ (Trung cấp, Cao đẳng, Đại học, Sau đại học)
- `certificates`: Mảng chứng chỉ (ví dụ: ["CCASP"])
- `dependents`: Số người phụ thuộc (INTEGER)
- `baseSalary`: Lương cơ sở (mặc định: 1,800,000 VNĐ)

### Tính lương theo hệ số:
- Tổng hệ số = Hệ số chức vụ + Hệ số bằng cấp + Hệ số chứng chỉ
- Lương gộp = Lương cơ sở × Tổng hệ số
- Áp dụng quy định 2026 (giảm trừ mới, biểu thuế mới)

## 5. Frontend - EnrollmentForm

Form đăng ký nhân viên mới đã được cập nhật với các trường:
- Chức vụ (dropdown)
- Trình độ (dropdown)
- Chứng chỉ (checkbox - có thể chọn nhiều)
- Số người phụ thuộc (number input)
- Lương cơ sở (number input, mặc định: 1,800,000)

## 6. Next Steps

- [ ] Tạo client MVC cho kế toán
- [ ] Hoàn thiện các chức năng còn lại
- [ ] Test toàn bộ hệ thống

