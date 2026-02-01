# Tóm tắt thay đổi UI – Client Kế toán & Admin

Tài liệu này ghi lại **tất cả thay đổi đã làm** để giữ và tham chiếu sau này.

---

## 1. Định dạng tiền (số trước, ₫ sau)

- **SalaryManagement.jsx**: `formatCurrency` → số + " ₫" (vd: 20.000.000 ₫).
- **SalaryApprovalDashboard.jsx**, **SalaryCalculation.jsx**, **SalaryBreakdownModal.jsx**, **EmployeeDetailView.jsx**, **EmployeeManagement.jsx**: Các cột/số tiền đều dùng **số ₫** hoặc **số M₫**.
- **exportUtils.js** (PDF): Cột lương xuất theo format số + " ₫".

---

## 2. Thông báo & Popup

- **SalaryManagement.jsx**, **SalaryCalculation.jsx**: Thông báo thành công (vd: "Tính lương thành công") hiển thị dạng **popup 5 giây** (fixed top-center, nền xanh), không còn banner xanh inline.
- **SalaryCalculation.jsx**: Chỉ hiển thị banner đỏ cho lỗi; thành công chỉ dùng popup.

---

## 3. Mã NV in đậm

- **SalaryManagement.jsx**, **SalaryCalculation.jsx**, **SalaryApprovalDashboard.jsx**, **EmployeeManagement.jsx**, **ApprovalManagement.jsx**, **EmployeeDetailView.jsx**: Cột/cell **Mã NV** đều dùng `<strong>`.

---

## 4. Nút & Icon

- **Tính lương**: Nút "Tính lương" → xanh đậm `#047857`; "Xem quy tắc" → xám `#6b7280`.
- **SalaryApprovalDashboard.jsx**, **ApprovalManagement.jsx**: Bỏ icon (✅/❌) trên nút "Phê duyệt", "Từ chối".
- **EmployeeManagement.jsx**: Bỏ icon (👁️, ✏️) trên "Chi Tiết", "Sửa", "Cập Nhật Thông Tin Nhân Viên".
- **SalaryBreakdownModal.jsx**: Bỏ icon ✏️ trên "Điều Chỉnh Lương", "Điều Chỉnh".

---

## 5. Thông tin nhân viên – Không dùng popup

- **EmployeeDetailView.jsx**: Khi bấm xem chi tiết nhân viên:
  - **Không mở popup**: Chi tiết hiển thị trong **panel bên phải** (layout 2 cột).
  - **Tô đậm dòng được chọn**: Dòng nhân viên đang chọn có nền primary, chữ trắng, font-weight 700, viền trái.
  - Gọi `viewEmployeeDetails(emp.id)` thay cho `openEmployeeModal`; bỏ modal, dùng `employeeDetails` trong panel phải.

---

## 6. Khung trang (giống Tính lương)

- **SalaryManagement.jsx**, **SalaryApprovalDashboard.jsx**: Ngoài cùng padding 20px, nền `theme.colors.light`; bên trong **khung trắng** (card) có tiêu đề + nội dung.
- **ApprovalManagement.jsx**: Cùng kiểu: nền trang #f9fafb, card trắng, tiêu đề H1 + mô tả.

---

## 7. Khung bảng (header tối, giống ảnh)

- **SalaryManagement.jsx**, **SalaryApprovalDashboard.jsx**, **ApprovalManagement.jsx**, **SalaryCalculation.jsx**:
  - **Header bảng**: Nền `#1e293b`, chữ trắng, padding 12px 16px, `borderBottom: 2px solid rgba(255,255,255,0.2)`.
  - **Khung bảng**: Bo góc 8px, `boxShadow`, `border: 1px solid #e5e7eb`.
  - **Dòng**: Nền xanh nhạt `#f0fdf4` (hoặc theo trạng thái paid).
  - **Cột Thưởng**: Chữ xanh `#16a34a`.
  - **Cột Khấu trừ**: Chữ đỏ `#dc2626`.
  - **Badge trạng thái**: Dạng pill `borderRadius: 20px`.
  - **Nút**: Bo góc 6px hoặc 4px, màu đồng bộ.

---

## 8. Sắp xếp danh sách – Tính lương

- **SalaryCalculation.jsx**: Bảng lương sắp theo trạng thái: **Đã thanh toán** → **Đã duyệt** → **Chưa duyệt** (paid → approved → pending).

---

## 9. Màu nút/badge – Quản lý lương giống Tính lương

- **SalaryManagement.jsx**:
  - **Badge**: Đã thanh toán = nền `#d4edda`, chữ `#155724`; Đã duyệt = `#cfe2ff`, `#084298`; Chờ duyệt = `#fff3cd`, `#997404`.
  - **Nút**: Duyệt & Thanh toán = `#28a745`; Tính lại = `theme.colors.secondary` (#3b82f6), borderRadius 4px.

---

## 10. Face-attendance-frontend (Admin UI)

- **OverviewDashboard.jsx**: Trang Tổng quan (stats + thao tác nhanh), gọi `/api/analytics/overview`.
- **App.jsx**: Tab mặc định "overview"; sidebar nhóm theo section (Tổng quan, Nhân sự, Điểm danh, Lương & phép, Cài đặt, Phân tích); render OverviewDashboard với `onNavigate`.
- **theme.js**: Thêm `primary.accent`, `primary.accentDark`.
- **LoginForm.jsx**: Subtitle "Đăng nhập quản trị — Chào mừng bạn quay trở lại".

---

## Cách giữ thay đổi (Git)

Chạy trong thư mục gốc dự án:

```bash
git add .
git status
git commit -m "feat(ui): accountant & admin - currency format, popups, badges, table frame, employee detail panel, button colors"
```

Nếu đã có branch:

```bash
git checkout dev
git add .
git commit -m "feat(ui): keep all accountant & admin UI changes (see CHANGELOG-UI-ACCOUNTANT.md)"
git push origin dev
```

---

*File này tạo để lưu lại toàn bộ thay đổi đã làm. Cập nhật khi có chỉnh sửa thêm.*
