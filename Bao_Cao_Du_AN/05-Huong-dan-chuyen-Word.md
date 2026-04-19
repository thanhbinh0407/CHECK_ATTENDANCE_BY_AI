# 5. Huong dan ghep tai lieu va chuyen sang file Word



Muc tieu: ban co **mot ban Word hoan chinh** (co muc luc, chuong, bang) tu cac file `.md` trong thu muc `Bao_Cao_Du_AN`.



---



## 5.1. Thu tu ghep noi dung (de bao cao mach lac)



1. **Trang bia + tom tat** (tu viet trong Word: ten de tai, sinh vien, giao vien huong dan).

2. **Muc luc tu dong** (Word: Tham chieu > Muc luc — sau khi gan style Heading).

3. **Chuong 1 — Cong nghe:** noi dung file `01-Cong-nghe-su-dung.md`.

4. **Chuong 2 — Cau truc & mo hinh:** file `02-Cau-truc-va-mo-hinh-he-thong.md`.

5. **Chuong 3 — Client, backend, luong:** file `03-Client-Backend-va-Luong.md`.

6. **Chuong 4 — Co so du lieu:** file `04-Database-models.md` (phan dai; co the tach thanh 4A tong quan + 4B bang chi tiet).

7. **Phu luc (tuy chon):** anh chup man hinh he thong, Swagger, so do trien khai.



---



## 5.2. Cach 1: Copy truc tiep vao Word (don gian nhat)



1. Mo file `.md` bang **Notepad**, **VS Code**, hoac Cursor.

2. **Ctrl+A** > **Ctrl+C**.

3. Trong Word: **Dan (Paste)** > chon **Giu dinh dang van ban** hoac **Chi van ban** de tranh font la.

4. Voi moi cap **#** trong Markdown:

   - `# Tieu de` -> trong Word gan style **Tieu de 1** (Heading 1).

   - `##` -> **Tieu de 2** (Heading 2).

   - `###` -> **Tieu de 3** (Heading 3).

5. **Bang** (`|...|`): Word doi khi khong nhan dang; co the:

   - Dan bang vao Word roi dung **Chen > Bang > Chuyen van ban thanh bang**, hoac

   - Tao bang thu cong theo so cot trong file `.md`.

6. **Ma nguon / duong dan** (vi du `src/index.js`): dung font **Courier New** hoac **Consolas**, co the giam co chu.

7. **So do Mermaid** trong `.md`: Word **khong** hien thi Mermaid. Cach xu ly:

   - Dung [Mermaid Live Editor](https://mermaid.live) dan code, xuat **PNG/SVG**, chen vao Word; hoac

   - Ve lai bang **SmartArt** / hinh trong Word theo mo ta trong tai lieu.



---



## 5.3. Cach 2: Dung Pandoc (neu da cai san)



Lenh vi du (chay trong thu muc `Bao_Cao_Du_AN`, can cai [Pandoc](https://pandoc.org)):



```text

pandoc 01-Cong-nghe-su-dung.md 02-Cau-truc-va-mo-hinh-he-thong.md 03-Client-Backend-va-Luong.md 04-Database-models.md -o Bao-cao-gop.docx

```



Sau do mo `.docx` de chinh Heading, chen bia, muc luc Word.



**Luu y:** Mermaid trong Pandoc thuong khong render; van can xuat hinh rieng nhu muc 5.2.



---



## 5.4. Goi y dinh dang Word chuyen nghiep



- Font chinh: **Times New Roman** hoac **Arial**, co chu 13–14 cho van ban, tieu de lon hon.

- **Canh deu** (justified) cho doan van; **canh trai** cho bang.

- Moi **chuong** bat dau **trang moi** (Ctrl+Enter).

- **Bang:** lap lai hang tieu de khi bang qua dai (Word: Bang > Lap lai hang tieu de).

- **Phu luc:** dat bang chu thich (vi du ki hieu ENUM, viet tat API, JWT).



---



## 5.5. Tu khoa tieng Anh thuong giu nguyen trong Word



REST, API, JWT, JSON, PostgreSQL, Sequelize, Express, React, Vite, WebSocket, Socket.io, ORM, RBAC, SPA, CORS, HTTPS, PK, FK, ENUM, JSONB, …



Neu giao vien yeu cau giai thich: them cot **"Giai thich tieng Viet"** canh bang thuat ngu.


