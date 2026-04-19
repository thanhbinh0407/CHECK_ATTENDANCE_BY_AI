# 1. Cong nghe su dung trong project (ban mo rong cho bao cao / Word)



Tai lieu nay liet ke **cong nghe theo lop**, kem **vai tro trong du an**, **phien ban tieu bieu** (lay tu `package.json` thoi diem bien soan), va **goi y cach giai thich bang mieng**. Phien ban co the thay doi khi chay `npm update`; khi bao cao chinh thuc nen ghi ro: "Theo package.json ngay ...".



---



## 1.0. Tom tat mot cau



**He thong la ung dung web:** frontend nhieu SPA **React** + **Vite**, backend **Node.js** + **Express**, luu tru **PostgreSQL** qua **Sequelize**, xac thuc **JWT**, realtime **Socket.io**, tai lieu API **Swagger**.



---



## 1.1. Ngon ngu va nen tang chung



| Cong nghe | Phien ban (tham khao) | Vai tro trong du an | Giai thich them (cho Word / thuyet minh) |

|-------------|----------------------|---------------------|------------------------------------------|

| **JavaScript** | ES202x (module) | Ngon ngu lap trinh chung FE/BE | Khong dung TypeScript trong toan monorepo; code backend dang `import/export`. |

| **Node.js** | 20.x (CI GitHub Actions) | Chay server API va cong cu build | Cung moi truong voi npm; tren may dev co the dung 18+ neu tuong thich. |

| **npm** | kem Node | Cai dat thu vien, script `dev`, `build` | Thu muc goc co `package.json` dieu phoi `concurrently` de mo nhieu cua so dev. |



**Tu khoa:** *runtime* (Node), *package manager* (npm), *ES Module* (import/export thay vi require — tru mot so file legacy payroll).



---



## 1.2. Frontend — hop phan chung (tat ca hoac hau het SPA)



| Cong nghe | Phien ban (tham khao) | Vai tro | Chi tiet |

|-----------|----------------------|---------|----------|

| **React** | 18.x hoac 19.x | Tao giao dien theo component | `payroll-frontend` va `face-attendance-employee` dung React 18; nhieu app khac React 19. |

| **Vite** | 5.x – 7.x | Dev server + dong goi production | Moi app co `vite.config.js`; port co dinh de khong xung dot khi chay song song. |

| **@vitejs/plugin-react** | Tuong ung Vite | Bien dich JSX | Bat buoc cho du an `.jsx`. |

| **ESLint** | 8.x / 9.x | Kiem tra code | Mot so goi co `npm run lint`; co the bo qua trong CI voi `continue-on-error`. |



**Vi sao chon Vite thay Create React App:** khoi dong dev nhanh, cau hinh gon, phu hop nhieu entry (nhieu SPA trong cung repo).



---



## 1.3. Frontend — `face-attendance-frontend` (quan tri / manager — port5174)



Day la app **lon nhat** ve so luong man hinh: dashboard, quan ly nguoi dung, ca lam viec, luong, bao hiem, bao cao, ...



| Thu vien | Phien ban (tham khao) | Muc dich su dung cu the |

|----------|----------------------|-------------------------|

| **react-router-dom** | 7.x | Chuyen trang trong SPA khong tai lai full trang. |

| **@reduxjs/toolkit** + **react-redux** | 2.x / 9.x | State tap trung: dashboard, filter, du lieu dung nhieu noi. |

| **face-api.js** | 0.22.x | Tai model nhan dien khuon mat tren trinh duyet, tra ve **embedding** (vector dac trung). |

| **@tensorflow/tfjs** | 3.21.x | May hoc chay tren CPU/GPU trinh duyet; face-api phu thuoc. |

| **socket.io-client** | 4.x | Nhan cap nhat realtime (thong bao, dong bo trang thai neu co). |

| **recharts** | 3.x | Ve bieu do cot/duong/tron tren dashboard. |

| **react-toastify** | 11.x | Thong bao ngan o goc man hinh. |

| **jspdf** + **jspdf-autotable** | 3.x / 5.x | Xuat bang PDF co dinh dang cot. |

| **html2canvas** | 1.x | "Chup" DOM thanh canvas/anh — ho tro in hoac nhung vao PDF. |

| **docx** | 8.x | Tao file Word `.docx` tu du lieu. |

| **file-saver** | 2.x | Luu file xuong o dia nguoi dung. |

| **xlsx** | 0.18.x | Doc/ghi Excel `.xlsx`. |

| **rolldown-vite** (override) | 7.x | Thay engine bundle Vite theo cau hinh `package.json` (toi uu build). |



**Luong face (tom tat):** Camera hoac anh -> model tra embedding -> gui len API -> backend so sanh voi `face_profiles.embeddings` -> ghi nhan dien vao `attendance_logs`.



---



## 1.4. Frontend — `face-attendance-employee` (kiosk — port 5176)



| Thu vien | Phien ban (tham khao) | Muc dich |

|----------|----------------------|----------|

| **React** | 18.x | Giao dien don gian, fullscreen kiosk. |

| **@vladmandic/face-api** | 1.7.x | Fork/duy tri face-api, tuong thich TensorFlow; dung cho cham cong tai may kiosk. |



**Khac biet voi app 5174:** kiosk tap trung **mot luong** (cham diem danh), it phu thuoc hon (khong Redux trong package).



---



## 1.5. Frontend — `login-portal` (port 3000)



| Thu vien | Ghi chu |

|----------|---------|

| **React** + **Vite** | Ung dung nhe: form dang nhap, luu token (localStorage/sessionStorage tuy code), redirect URL den app vai tro. |



**Y nghia:** Mot **cua dang nhap** (SSO don gian cap ung dung): giam lap lai form login tren tung app.



---



## 1.6. Frontend — `hr-client` (5172), `supervisor-client` (5173), `employee-portal` (5178)



| Thu vien | Muc dich |

|----------|----------|

| **React** + **Vite** | UI theo tung vai tro: HR, giam sat, nhan vien. |

| **socket.io-client** | Co trong `package.json` cua cac app nay — dung khi can realtime. |

| **ESLint** | Chat luong code. |



**Giai thich nghiep vu:** HR nhieu thao tac ho so; supervisor xem team; employee-portal xem ca nhan, don tu, thong bao.



---



## 1.7. Frontend — `accountant-client` (5175)



| Thu vien | Muc dich |

|----------|----------|

| **recharts** | Bieu do tai chinh / tong hop. |

| **xlsx, jspdf, jspdf-autotable, html2canvas, docx, file-saver** | Bao cao xuat file cho ke toan. |

| **@fontsource/roboto** | Font on dinh tren nhieu may. |

| **socket.io-client** | Realtime neu tich hop. |



---



## 1.8. Frontend — `payroll-frontend` (5177)



| Thu vien | Phien ban (tham khao) | Muc dich |

|----------|----------------------|----------|

| **React** + **react-router-dom** | 18 + v6 | Dieu huong trang payroll. |

| **Tailwind CSS** | 3.x | Styling utility-first, giao dien bang lop CSS. |

| **@headlessui/react** | 1.x | Dialog, menu khong style san — tu do giao dien. |

| **@heroicons/react** | 2.x | Icon SVG. |

| **axios** | 1.x | HTTP client (Promise). |

| **@tanstack/react-query** | 4.x | Cache, refetch, trang thai loading/error khi goi API. |

| **react-query** (v3) |3.x | Dong goi cu — co trong package song song (co the thua ke tu template). |

| **react-hook-form** | 7.x | Form hieu nang cao, it re-render. |

| **zustand** | 4.x | Store nhe, thay the Redux cho app nay. |

| **date-fns** | 2.x | Xu ly ngay (format, cong tru). |

| **clsx** | 2.x | Ghep class Tailwind dieu kien. |

| **react-hot-toast** | 2.x | Thong bao. |

| **recharts** | 2.x | Bieu do (phien ban khac app 5174). |

| **Jest** + **Testing Library** | Test don vi / tich hop UI. |



---



## 1.9. Backend — `face-attendance-backend`



| Thu vien | Phien ban (tham khao) | Vai tro chi tiet |

|----------|----------------------|------------------|

| **express** | 4.x | Tao `app`, dinh nghia route, middleware, `listen` port. |

| **cors** | 2.x | Cho phep frontend o origin khac (localhost:3000, 517x) goi API. |

| **body-parser** | (kem Express ecosystem) | `app.use(bodyParser.json({ limit: "15mb" }))` — body lon cho anh/base64. |

| **dotenv** | 16.x | Doc `JWT_SECRET`, `PORT`, chuoi ket noi DB tu `.env`. |

| **sequelize** | 6.x | ORM: Model, `sync`, migration, quan he `belongsTo` / `hasMany`. |

| **pg** | 8.x | Driver ket noi PostgreSQL. |

| **pg-hstore** | 2.x | Ho tro kieu HSTORE neu Sequelize can. |

| **bcryptjs** | 3.x | Bam mat khau (salt rounds trong code register/login). |

| **jsonwebtoken** | 9.x | Ky va xac minh JWT; payload thuong co `userId`, `role`, `tokenVersion`. |

| **multer** | 1.4.x | Upload multipart; luu thu muc `uploads`. |

| **jimp** | 0.22.x | Xu ly anh (resize, ...) neu pipeline can. |

| **mongoose** | 7.x | Schema MongoDB — **trong du an chi la lop phu / mau**, khong phai luong chinh. |

| **socket.io** | 4.x | Gan voi `http.Server` cung port; CORS origin trong `socket.js`. |

| **swagger-ui-express** | 5.x | Phuc vu file OpenAPI tai `/docs`. |

| **nodemailer** | 7.x | Gui email khi cau hinh SMTP. |

| **xlsx** | 0.18.x | Excel server-side. |

| **jspdf** + **jspdf-autotable** | 3.x / 5.x | PDF server-side. |

| **nodemon** | 3.x (dev) | Tu restart khi sua file. |



**Cac tac vu dinh ky trong `index.js` (y nghia):**



- Moi **1 gio:** kiem tra di muon (`checkLateArrivals`).

- Moi **24 gio:** het han hop dong (`checkContractExpiration`); sinh nhat / ky niem lam viec (`notifyBirthdays`, `notifyWorkAnniversaries`).



---



## 1.10. Co so du lieu va ha tang



| Thanh phan | Ghi chi tiet |

|------------|--------------|

| **PostgreSQL** | Luu toan bo nghiep vu: user, cham cong, don tu, luong, payroll, bao hiem, ... |

| **MongoDB** | Xuat hien trong CI (service `mongo:7`); ket noi qua `src/db/mongo.js` neu co `MONGO_URI` — **khong bat buoc** de chay luong HR chinh. |

| **Thu muc uploads** | Express `static` tai `/uploads` — file nguoi dung tai len. |



---



## 1.11. DevOps — CI/CD (GitHub Actions)



| Buoc | Noi dung |

|------|----------|

| **Trigger** | Push / PR len nhanh `main`, `dev`. |

| **Frontend matrix** | `npm ci`, lint, test (neu co), build — tung app: face-attendance-frontend, employee-portal, accountant-client, payroll-frontend, login-portal, face-attendance-employee. |

| **Backend** | Test voi Postgres 15 + Mongo 7 lam service; bien moi truong test. |



**Y nghia:** Dam bao **build khong loi co ban** khi doi tac dong gop code.



---



## 1.12. Bang anh xa "Cong nghe — Chuc nang nghiep vu"



| Nhom chuc nang | Cong nghe noi bat |

|----------------|-------------------|

| Dang nhap, phan quyen | JWT, bcryptjs, middleware RBAC, `permissionMatrix` |

| Cham cong khuon mat | face-api (FE), embedding, Sequelize `FaceProfile`, `AttendanceLog` |

| Don tu (nghi, OT, cong tac, tam ung) | REST API, `ApprovalWorkflow`, controllers + services |

| Luong / payroll | `Salary`, `Payroll`, services tinh luong, thue, bao hiem |

| Bao cao / xuat file | xlsx, jspdf, excelExport (BE + FE) |

| Thong bao | `Notification`, Socket.io, `notificationService` |



---



## 1.13. Phu luc: Viet tat thuong gap trong tai lieu



| Viet tat | Y nghia |

|--------|---------|

| API | Application Programming Interface — giao dien goi ham qua HTTP. |

| REST | Phong cach API dung method GET/POST/PUT/DELETE + URL tai nguyen. |

| JWT | JSON Web Token — chuoi ky dien tu, chua thong tin nguoi dung, het han. |

| ORM | Object-Relational Mapping — anh xa bang SQL sang class/object trong code. |

| RBAC | Role-Based Access Control — phan quyen theo vai tro. |

| SPA | Single Page Application — mot trang, JS doi noi dung. |

| CORS | Co che trinh duyet cho phep domain A goi API domain B. |

| FK / PK | Foreign key / Primary key trong quan he CSDL. |


