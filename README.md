# 🎥 Face Attendance System

Hệ thống chấm công bằng nhận diện khuôn mặt với AI face recognition.

## 📋 Features

- Real-time face detection & recognition
- Liveness detection (blink & head turn)
- Attendance logging
- User enrollment with face profile
- Face matching with Euclidean distance
- REST API backend

## 🚀 Quick Start

### Backend Setup

```bash
cd face-attendance-backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`

**API Endpoints:**
- `POST /api/attendance/log` - Log attendance with face descriptor
- `POST /api/enroll/` - Enroll new face profile
- `GET /api/admin/users` - Get all users
- `GET /api/admin/logs` - Get attendance logs

### Frontend Setup

```bash
cd face-attendance-frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## 🎯 Usage

1. **Open Frontend**: `http://localhost:5173/`
2. **Start Camera**: Click "Start Camera" button
3. **Position Face**: Center your face in the video
4. **Scan**: Click "Scan & Attendance" button
5. **Liveness Check**: Follow on-screen instructions (blink or turn head)
6. **Log**: System will send face descriptor to backend and log attendance

## 📁 Project Structure

```
.
├── face-attendance-backend/
│   ├── src/
│   │   ├── controllers/      # API handlers
│   │   ├── routes/           # API routes
│   │   ├── models/mongo/     # Mongoose schemas
│   │   ├── db/               # Database connection
│   │   └── index.js          # Entry point
│   └── package.json
│
├── face-attendance-frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── pages/
│   │   └── Home.jsx
│   ├── public/models/        # Face-API models
│   └── package.json
│
└── docker-compose.yml        # Docker setup
```

## 🔧 Technologies

**Backend:**
- Node.js + Express
- MongoDB (Mongoose)
- Face recognition algorithm (Euclidean distance)

**Frontend:**
- React + Vite
- face-api.js (face detection & recognition)
- TensorFlow.js

## 🗄️ Database

MongoDB is used to store:
- Users (name, email, employee code)
- Face profiles (face descriptors, model version)
- Attendance logs (timestamp, detected name, confidence)

## 📊 Face Matching Algorithm

The system uses **Euclidean distance** to match incoming face descriptor with stored profiles:

```
distance = sqrt(sum((descriptor[i] - profile[i])^2))
```

If distance < THRESHOLD (default: 0.6), face is considered matched.

## ⚙️ Environment Variables

**Backend (.env):**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/facedb
MATCH_THRESHOLD=0.6
```

**Frontend (.env):**
```
VITE_API_BASE=http://localhost:5000
```

## 🚢 Docker Deployment

```bash
docker-compose up -d
```

This will start:
- MongoDB on port 27017
- PostgreSQL on port 5432
- Backend on port 5000
- Frontend on port 5173

## API Examples

### Log Attendance

```bash
curl -X POST http://localhost:5000/api/attendance/log \
  -H "Content-Type: application/json" \
  -d '{
    "descriptor": [0.1, 0.2, ...],
    "confidence": 0.95,
    "timestamp": "2025-12-08T10:30:00Z",
    "deviceId": "web-kiosk-1",
    "imageBase64": "data:image/jpeg;base64,..."
  }'
```

Response:
```json
{
  "status": "success",
  "matched": true,
  "userId": "user_id",
  "detectedName": "John Doe",
  "distance": 0.45,
  "confidence": 0.95
}
```

## 🐛 Troubleshooting

### "Models not loaded"
- Check if `/public/models/` contains face-api model files
- Clear browser cache (Ctrl+Shift+R)

### "No face detected"
- Ensure camera permissions are granted
- Position face clearly in front of camera
- Improve lighting

### "Backend connection failed"
- Verify backend is running: `http://localhost:5000`
- Check VITE_API_BASE environment variable

### "MongoDB connection error"
- Install MongoDB locally or use Docker
- Verify MongoDB is running on port 27017

## 🔐 Security Notes

- Store face descriptors securely
- Use HTTPS in production
- Implement authentication/authorization
- Add rate limiting to API
- Consider encrypted storage for sensitive data

## 📖 Documentation

For detailed API documentation, see `API.md`

## 📄 License

MIT

## 👥 Contributing

Pull requests welcome!

---

**Happy Scanning!**
