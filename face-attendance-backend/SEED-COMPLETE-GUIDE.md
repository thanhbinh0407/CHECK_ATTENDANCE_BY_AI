# Hướng dẫn Reset và Seed Database HOÀN CHỈNH

## ⚠️ LƯU Ý QUAN TRỌNG
**Script này sẽ XÓA TẤT CẢ dữ liệu hiện có trong database!**

## Chạy Script Hoàn Chỉnh

### Một lệnh duy nhất để reset toàn bộ:
```bash
npm run db:seed:complete
```

Script này sẽ thực hiện:
1. ✅ **Drop tất cả dữ liệu cũ**
2. ✅ **Tạo lại schema database**
3. ✅ **Tạo tài khoản Admin & Kế toán**
4. ✅ **Tạo 20 nhân viên** với:
   - Chức vụ đa dạng (Nhân viên CNTT → Phó giám đốc)
   - Trình độ học vấn khác nhau
   - Chứng chỉ CCASP cho một số người
   - Người phụ thuộc (0-2 người)
   - Face profiles đầy đủ
5. ✅ **Tạo ca làm việc (Shifts)** cho 3 tháng gần nhất:
   - 08:00 - 17:00
   - Grace period: 10 phút
   - Overtime threshold: 30 phút
6. ✅ **Tạo Attendance Logs** cho 3 tháng gần nhất:
   - ~2,400 bản ghi chấm công
   - Check-in và Check-out đầy đủ
   - Tính toán đi trễ, về sớm, tăng ca
7. ✅ **Tạo bản ghi Lương** cho tháng hiện tại:
   - Tính toán dựa trên attendance
   - Có bonus và deduction
   - Phụ cấp cho chứng chỉ và người phụ thuộc

## Kết quả

### 📊 Dữ liệu được tạo:
- **Accounts**: 1 Admin + 1 Accountant + 20 Employees = 22 tài khoản
- **Face Profiles**: 20 profiles
- **Shift Settings**: 3 shifts (3 tháng gần nhất)
- **Attendance Logs**: ~2,400 records (3 tháng × 20 nhân viên × ~20 ngày × 2 lần/ngày)
- **Salary Records**: 20 records (tháng hiện tại)

### 🔐 Thông tin đăng nhập:
```
Admin:      admin@company.com / Admin@12345
Accountant: accountant@company.com / Accountant@12345
Employees:  employee1@company.com - employee20@company.com / Password123!
```

### 💼 Thông tin nhân viên:
| STT | Tên | Chức vụ | Lương cơ bản |
|-----|-----|---------|--------------|
| 1 | Nguyễn Văn An | Nhân viên CNTT | 6.000.000 VNĐ |
| 2 | Trần Thị Bình | Chuyên viên CNTT | 7.000.000 VNĐ |
| 3 | Lê Minh Cường | Chuyên viên chính | 8.000.000 VNĐ |
| 4 | Phạm Thị Dung | Phó phòng CNTT | 10.000.000 VNĐ |
| 5 | Hoàng Văn Đức | Trưởng phòng CNTT | 12.000.000 VNĐ |
| ... | ... | ... | ... |

## Công thức tính lương

```
Lương thực nhận = Lương cơ bản × (Số ngày công / 22) 
                  + Thưởng hiệu suất
                  + Phụ cấp chứng chỉ (1.000.000 VNĐ nếu có CCASP)
                  + Phụ cấp người phụ thuộc (500.000 VNĐ/người)
                  - Phạt vắng mặt
```

## Kiểm tra dữ liệu

### 1. Kiểm tra số lượng bản ghi:
```bash
# Trong PostgreSQL
SELECT 
  (SELECT COUNT(*) FROM users WHERE role='employee') as employees,
  (SELECT COUNT(*) FROM face_profiles) as face_profiles,
  (SELECT COUNT(*) FROM shift_settings) as shifts,
  (SELECT COUNT(*) FROM attendance_logs) as attendance_logs,
  (SELECT COUNT(*) FROM salaries) as salaries;
```

### 2. Xem attendance của một nhân viên:
```bash
SELECT 
  u.name,
  DATE(al.timestamp) as date,
  al.type,
  TO_CHAR(al.timestamp, 'HH24:MI') as time,
  al.is_late,
  al.is_early_leave,
  al.is_overtime
FROM attendance_logs al
JOIN users u ON al.user_id = u.id
WHERE u.email = 'employee1@company.com'
ORDER BY al.timestamp DESC
LIMIT 20;
```

### 3. Xem lương của nhân viên:
```bash
SELECT 
  u.name,
  s.month,
  s.year,
  s.base_salary,
  s.bonus,
  s.deduction,
  s.total_salary,
  s.actual_days || '/' || s.working_days as attendance,
  s.status
FROM salaries s
JOIN users u ON s.user_id = u.id
WHERE s.year = 2026 AND s.month = 1
ORDER BY s.total_salary DESC;
```

## Các lệnh khác

### Reset lại mật khẩu admin:
```bash
npm run admin:reset
```

### Tạo thêm tài khoản kế toán:
```bash
npm run accountant:create
```

### Seed cũ (20 nhân viên + lương 12 tháng, KHÔNG có attendance):
```bash
npm run db:seed:20
```

## Troubleshooting

### Lỗi "syntax error at or near USING"
- Đây là lỗi migration thông thường, bỏ qua và chạy trực tiếp `npm run db:seed:complete`

### Database connection error
- Kiểm tra file `.env` có đúng thông tin database
- Đảm bảo PostgreSQL đang chạy
- Kiểm tra credentials: username, password, database name

### Script chạy chậm
- Bình thường vì đang tạo hàng nghìn bản ghi
- Thời gian chạy: ~30-60 giây

## Thứ tự khuyến nghị

1. **Lần đầu setup**: `npm run db:seed:complete`
2. **Reset toàn bộ**: `npm run db:seed:complete`
3. **Reset mật khẩu admin**: `npm run admin:reset`

---

💡 **Tip**: Script `seed-complete.js` tạo dữ liệu đầy đủ và chính xác nhất, phù hợp để test tính năng tính lương của kế toán!
