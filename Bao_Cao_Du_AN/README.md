# Bao cao du an: He thong HR + cham cong khuon mat



Tai lieu mo ta du an **monorepo**: nhieu ung dung React (theo vai tro), **mot backend Node.js (Express)**, **PostgreSQL** lam CSDL chinh, **Socket.io** cho realtime, **JWT** cho xac thuc.



---



## Muc dich tai lieu



- Lam **tai lieu bao cao** truoc hoi dong / giao vien.

- Lam **ban nhap** de **chuyen sang Microsoft Word** (chinh sua them, dinh dang, chen hinh).

- Giu **tieng Viet khong dau** + ten ky thuat tieng Anh de tranh loi font khi copy; ban co the **Tim va thay** trong Word de them dau neu can.



---



## Muc luc file (doc theo thu tu nay khi ghep bao cao)



| Thu tu | File | Noi dung tom tat |

|--------|------|------------------|

| 0 | [05-Huong-dan-chuyen-Word.md](./05-Huong-dan-chuyen-Word.md) | Cach ghep file, chuyen Word, goi y dinh dang |

| 1 | [01-Cong-nghe-su-dung.md](./01-Cong-nghe-su-dung.md) | Cong nghe chi tiet: phien ban, vai tro, vi du dung trong du an |

| 2 | [02-Cau-truc-va-mo-hinh-he-thong.md](./02-Cau-truc-va-mo-hinh-he-thong.md) | Cau truc thu muc, mo hinh, luong nghiep vu, tac vu dinh ky |

| 3 | [03-Client-Backend-va-Luong.md](./03-Client-Backend-va-Luong.md) | Tung client + port, API, danh muc module, luong lop, vi du |

| 4 | [04-Database-models.md](./04-Database-models.md) | 30 bang; **muc 4.1.6–4.1.9: backend + hai khoi luong (salaries vs payrolls)**; cot chi tiet |



**File thu nghiem:** `test-vn.md` (co the bo qua hoac xoa).



---



## So luoc pham vi he thong



1. **Dang nhap tap trung** (`login-portal`, port 3000) — sau do dieu huong sang app phu hop vai tro.

2. **Cham cong bang khuon mat** — kiosk (`face-attendance-employee`, 5176) hoac luong tuong tu tren app quan tri; embedding so khop voi `face_profiles`.

3. **Quan tri / HR / ke toan** — nhieu SPA tren cac port 5172–5178, cung goi API backend port **5000**.

4. **Du lieu** — chu yeu **PostgreSQL**; Sequelize dinh nghia model va quan he; co thu muc MongoDB trong repo nhung **khong phai nguon chinh** cua luong hien tai.



---



## Ghi chu khi nop bai / trinh bay



- Co the **in Swagger** tai `http://localhost:5000/docs` (khi backend chay) lam phu luc API.

- Neu thay hoi ve **payroll API rieng**: trong code co `payrollRoutes.js` (CommonJS) **chua mount** trong `index.js` ESM — chi tiet o file `03`.


