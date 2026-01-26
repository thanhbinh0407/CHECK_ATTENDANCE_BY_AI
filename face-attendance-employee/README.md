# Employee Attendance Kiosk

Kiosk để nhân viên quét khuôn mặt và điểm danh (check-in/check-out).

## Mục đích

- **face-attendance-employee**: Kiosk quét mặt để chấm công (KHÔNG CẦN LOGIN)
- **employee-portal**: Portal để nhân viên xem thông tin (CẦN LOGIN)

## Chức năng

- Quét khuôn mặt tự động để điểm danh
- Check-in / Check-out
- Hiển thị lịch sử điểm danh hôm nay
- Anti-spoofing detection
- Chạy trên màn hình kiosk tại văn phòng

## Cài đặt và Chạy

```bash
# Cài đặt dependencies
npm install

# Chạy development server (port 5176)
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

## Sử dụng

1. Mở ứng dụng trên màn hình kiosk
2. Camera tự động bắt đầu quét
3. Nhân viên đưa khuôn mặt vào khung
4. Hệ thống nhận diện và hiển thị xác nhận
5. Click "Xác nhận" để điểm danh

## Port

- Development: `http://localhost:5176`

## Lưu ý

- Không cần đăng nhập - app này chạy công khai trên kiosk
- Cần camera để hoạt động
- Cần backend đang chạy để kết nối API

