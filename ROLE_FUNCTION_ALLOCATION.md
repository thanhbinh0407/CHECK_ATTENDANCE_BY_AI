# Phân bổ chức năng theo vai trò & client (HRMS / Face Attendance)

Tài liệu này map **toàn bộ module backend + bề mặt UI** trong monorepo sang **5 role** chuẩn. Quy ước: chức năng **không rõ owner nghiệp vụ** → **Manager** (và/hoặc chỉ triển khai trên **face-attendance-frontend :5174**).

---

## 1. Bảng module API (`face-attendance-backend`)

| Module API | Mô tả nghiệp vụ | Manager | HR | Accountant | Supervisor | Employee |
|------------|-----------------|--------|-----|------------|------------|----------|
| `/api/auth` | Đăng nhập, `/me`, đổi mật khẩu | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/enroll` | Đăng ký khuôn mặt / enrollment | ✅ | ✅ | ❌ | ❌ | 🔸 chỉ bản thân (theo policy API) |
| `/api/attendance` | Check-in/out, lịch sử chấm công | ✅ | ✅ | 👁 | 👁 team | 🔸 của tôi |
| `/api/admin` | Nhân viên CRUD, role, audit, logs public | ✅ | 🔸 CRUD (trừ xóa cứng / role / mật khẩu) | 👁 | 👁 team | ❌ |
| `/api/anti-spoof` | Chống giả mạo khuôn mặt | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/shifts` | Cấu hình ca làm việc | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/salary` | Bảng lương, tính lương, duyệt lương | ✅ | 👁 | ✅ | 🔸 duyệt/👁 | 👁 của tôi |
| `/api/employee` | Hồ sơ NV (profile, lịch sử…) | ✅ | ✅ | 👁 | 👁 team | 🔸 của tôi |
| `/api/leave` | Đơn nghỉ, duyệt | ✅ | ✅ | ❌ | ✅ | 🔸 tạo/xem của tôi |
| `/api/analytics` | Thống kê / analytics | ✅ | ✅ | 👁 | 👁 | ❌ |
| `/api/notifications` | Thông báo | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/departments` | Phòng ban | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/job-titles` | Chức danh | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/qualifications` | Bằng cấp / chứng chỉ | ✅ | ✅ | ❌ | ❌ | 🔸 của tôi |
| `/api/dependents` | Người phụ thuộc | ✅ | ✅ | ❌ | ❌ | 🔸 của tôi |
| `/api/work-experiences` | Kinh nghiệm làm việc | ✅ | ✅ | ❌ | ❌ | 🔸 của tôi |
| `/api/documents` | Tài liệu nhân sự | ✅ | ✅ | 👁 | 👁 | 🔸 của tôi |
| `/api/overtime-requests` | Tăng ca | ✅ | 👁 | ❌ | ✅ | 🔸 của tôi |
| `/api/business-trip-requests` | Công tác | ✅ | 👁 | ❌ | ✅ | 🔸 của tôi |
| `/api/salary-advances` | Tạm ứng lương | ✅ | 👁 | ✅ | ✅ | 🔸 của tôi |
| `/api/salary-grades` | Cấp bậc lương | ✅ | ❌ | ✅ | ❌ | ❌ |
| `/api/seniority-salary` | Lương thâm niên / quy tắc | ✅ | ❌ | ✅ | ❌ | ❌ |
| `/api/insurance-configs` | Cấu hình BHXH/BHYT | ✅ | ❌ | ✅ | ❌ | ❌ |
| `/api/insurance` | Bảo hiểm (dữ liệu liên quan) | ✅ | 🔸 | ✅ | ❌ | ❌ |
| `/api/reports` | Báo cáo tổng hợp | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/api/tax` | Thuế | ✅ | ❌ | ✅ | ❌ | ❌ |
| `/api/export` | Xuất Excel / export | ✅ | ✅ | ✅ | 🔸 | ❌ |
| `/api/insurance-forms` | Form D02-LT, TK1-TS… | ✅ | ❌ | ✅ | ❌ | ❌ |
| `/api/payroll` (nếu mount) | Payroll tích hợp | ✅ | 👁 | ✅ | 👁 | 👁 |
| `/api` debug / cron / health | Vận hành & debug | ✅ | ❌ | ❌ | ❌ | ❌ |

**Chú thích:** ✅ toàn quyền theo API; 👁 chủ yếu xem; 🔸 quyền hẹp (own/team); ❌ không thuộc nghiệp vụ role đó.

---

## 2. Bề mặt UI theo client (đã có trong repo)

### Manager — `face-attendance-frontend` (:5174)

| Chức năng (component / route) | Ghi chú |
|------------------------------|---------|
| `/dashboard` | **Tổng quan** (KPI, phân bổ role, feed) + lối tắt theo nhóm |
| `/employees` | Hồ sơ NV (trước đây `/admin`) |
| `/users` | Quản lý tài khoản, đổi role, audit |
| `/camera` | Kiosk chấm công nhận diện (`/` redirect → `/dashboard`) |
| `/departments`, `/job-titles`, `/shifts` | Tổ chức & ca |
| `/attendance-logs` | Nhật ký chấm công |
| `/leave`, `/overtime`, `/business-trips`, `/salary-advances`, `/approvals` | Đơn từ & luồng duyệt |
| `/salary`, `/salary-admin`, `/salary-calc`, `/salary-grades` | Lương |
| `/insurance-config`, `/insurance-d02`, `/insurance-tk1` | Bảo hiểm / form |
| `/reports`, `/analytics` | Báo cáo & phân tích |
| `/documents`, `/dependents`, `/qualifications`, `/enrollment` | Hồ sơ & đăng ký khuôn mặt |

→ **Mọi chức năng “không gắn rõ HR vs Kế toán vs Supervisor”** mặc định **Manager dùng trên client này**.

### HR — `hr-client` (:5172)

| Tab | Chức năng |
|-----|-----------|
| **Dashboard** | Tổng quan (số NV, phòng ban, đơn chờ duyệt…) |
| Nhân viên | CRUD hồ sơ (theo quyền API) |
| Phòng ban | CRUD |
| Chức danh | CRUD |
| Chấm công | Xem log / tổng quan chấm công |
| Duyệt nghỉ phép | Danh sách đơn + duyệt/từ chối (HR, cùng middleware Supervisor) |
| Phân tích | `GET /api/analytics/dashboard` |
| Báo cáo HR | Các endpoint `GET /api/reports/…` (cơ cấu, chấm công, nghỉ phép, …) |

### Supervisor — `supervisor-client` (:5173)

| Tab | Chức năng |
|-----|-----------|
| **Tổng quan** | Dashboard đơn chờ duyệt |
| Duyệt nghỉ / tăng ca / công tác / tạm ứng / lương | Phê duyệt |
| Báo cáo | Xem báo cáo (phạm vi team theo backend) |

### Accountant — `accountant-client` (:5175)

| Màn | Chức năng |
|-----|-----------|
| **Dashboard** | Tổng quan lương / chờ xử lý |
| Tính lương, quản lý lương, duyệt payroll | ✅ |
| D02-LT, TK1-TS, BH, nhân viên (xem) | ✅ |
| *(Menu “admin” cũ nếu còn role `admin` — nên đồng bộ `accountant`/`manager`)* | |

### Employee — `employee-portal` (:5178)

| Tab | Chức năng |
|-----|-----------|
| **Dashboard** | Tóm tắt cá nhân, trạng thái đơn |
| Attendance, Salary, Job history | Xem của tôi |
| Leave, OT, Business trip, Salary advance | Gửi & theo dõi |
| Qualifications, Dependents | Hồ sơ cá nhân |
| Account | Đổi mật khẩu |

### Ứng dụng khác (không gắn 1 role đăng nhập riêng trong portal hiện tại)

| App | Port | Gợi ý phân quyền |
|-----|------|------------------|
| `face-attendance-employee` | 5176 | **Thiết bị chấm công** / kiosk — thường dùng chung; có thể hạn chế IP hoặc coi là **Manager cấu hình + Employee sử dụng tại quầy** |
| `payroll-frontend` | 5177 | **Manager + Accountant** (hoặc gộp dần vào accountant-client) |
| `login-portal` | 3000 | Điểm vào chung |

---

## 3. Ma trận rút gọn: “Ai làm gì?”

| Nhóm nghiệp vụ | Manager | HR | Accountant | Supervisor | Employee |
|----------------|---------|-----|------------|------------|----------|
| Cấu trúc tổ chức (PB, chức danh, ca, cấp bậc lương) | ✅ | PB+CV+Ca | Cấp bậc | ❌ | ❌ |
| Hồ sơ NV & tài liệu & phụ thuộc | ✅ | ✅ | Xem | Xem team | Cá nhân |
| Tài khoản & role & audit | ✅ | ❌ | ❌ | ❌ | ❌ |
| Chấm công & enrollment & anti-spoof | ✅ | ✅ | Xem | Xem team | Xem cá nhân / kiosk |
| Nghỉ phép | ✅ | Duyệt | ❌ | Duyệt | Tạo/xem |
| Tăng ca / công tác / tạm ứng | ✅ | Xem | Tạm ứng+lương | Duyệt | Tạo/xem |
| Lương & thuế & BH & báo cáo tài chính | ✅ | Xem một phần | ✅ | Xem/duyệt một phần | Xem payslip |
| Analytics & export & báo cáo HR | ✅ | ✅ | Một phần | Một phần | ❌ |
| Hệ thống / debug / cron | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Dashboard — trạng thái triển khai

| Client | Port | Màn tổng quan |
|--------|------|----------------|
| Manager (`face-attendance-frontend`) | 5174 | `/dashboard` — KPI + `ManagerOverview` + lối tắt |
| HR (`hr-client`) | 5172 | Tab **Tổng quan** đầu tiên (`HrDashboard`) |
| Supervisor (`supervisor-client`) | 5173 | Tab **Tổng quan** (sẵn có) |
| Accountant (`accountant-client`) | 5175 | Mục **Tổng quan** đầu tiên (`AccountantDashboard`) |
| Employee (`employee-portal`) | 5178 | Tab **Dashboard** đầu tiên (`EmployeeDashboard`) |

Sau đăng nhập từ `login-portal`, **Manager** được chuyển tới `http://localhost:5174/dashboard`.

---

## 5. Việc cần làm tiếp (kiến trúc)

1. **Đồng bộ permission backend** với bảng mục 1–3 (middleware theo từng route).
2. **Gom UI trùng lặp** (ví dụ `payroll-frontend` vs `accountant-client`) theo lộ trình.
3. **Employee kiosk** `face-attendance-employee` (:5176): quyết định policy (thiết bị chung vs đăng nhập).
4. Chuẩn hóa URL API phía client (một số chỗ còn alias `/overtime` vs `/overtime-requests`).

---

*Tài liệu theo cấu trúc repo; cập nhật khi thêm route hoặc app mới.*
