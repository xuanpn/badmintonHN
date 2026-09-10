# 🏸 Web quản lý Giải Cầu lông Nội bộ APH 2026

Web tĩnh (không cần backend, không cần build) — mở trên điện thoại rất gọn, deploy Vercel trong 2 phút.

## Tính năng

| Tab | Nội dung |
|---|---|
| **Bảng đấu** | Chọn nội dung (Đôi Nam / Đôi Nam Nữ / Đôi Nữ) → xem từng bảng có những đôi nào, kèm **mã đội + tên 2 VĐV**, tiến độ trận đã đấu |
| **Nhập KQ** | Danh sách trận theo giờ/sân, bấm 1 trận → nhập tỷ số (có nút tỷ số nhanh 25-20, 27-25, 31-30, 25-0 xử thua…). Có **kiểm tra hợp lệ theo điều lệ**: 1 séc chạm 25, cách biệt ≥2, chạm 31 là thắng. Lọc: Tất cả / Chưa có KQ / Đã xong / theo bảng |
| **Xếp hạng** | BXH từng bảng cập nhật **ngay sau mỗi trận**: Trận – Thắng – Thua – Điểm ghi – Điểm mất – Hiệu số – Điểm. Tự áp thứ tự ưu tiên **Điểm → Đối đầu trực tiếp → Hiệu số điểm → Bốc thăm**, có ghi chú khi phải bốc thăm |
| **Nhì XS** | Bảng phân tích tìm **đội Nhì xuất sắc nhất**, đã áp đúng luật đặc biệt của điều lệ (xem dưới), và hiển thị cặp **play-off** với nội dung Đôi Nam Nữ |
| **Loại TT** | Sơ đồ Play-off → Bán kết → Chung kết. Đội **tự điền** từ BXH vòng bảng (Nhất A/B/C/D, Nhì XSN, Thắng BK1/BK2); nhập **3 séc 21 điểm** (thắng 2 séc), có kiểm tra hợp lệ (20-20 đánh lợi thế, tối đa 31-30, không cho séc 3 khi đã 2-0). Cuối tab hiện **Vô địch / Á quân** |

Mỗi bảng ở tab **Xếp hạng** và bảng so sánh ở tab **Nhì XS** đều có nút **🔍 Xem diễn giải**: liệt kê từng trận của từng đội kèm tỷ số, cách phân định khi bằng điểm (đối đầu trực tiếp → hiệu số), và với bảng có luật đặc thù thì nói rõ **đội Nhì là ai, đội cuối bảng là ai, trận nào bị loại, tỷ số bao nhiêu, trừ bao nhiêu quả ghi/mất và hiệu số trước–sau khi trừ**.

Nút **⋯** góc trên phải: Copy để dán trực tiếp vào **Google Sheet**, tải **CSV**, sao lưu/nạp **JSON**, xoá kết quả.

## Luật đã cài theo điều lệ (khu vực Hà Nội)

- Vòng bảng: vòng tròn 1 lượt, **01 séc chạm 25** (cách biệt ≥ 2, chạm 31 là thắng). Thắng 1 điểm / Thua 0.
- Bằng điểm: **(1) đối đầu trực tiếp → (2) hiệu số điểm toàn vòng bảng → (3) bốc thăm**.
- **Đôi Nam** (4 bảng): 4 đội Nhất bảng vào Bán kết.
- **Đôi Nữ** (3 bảng): 3 Nhất bảng + **1 Nhì xuất sắc nhất**. Bảng B nhiều đội hơn nên **thành tích trận của Nhì bảng B với đội cuối bảng B KHÔNG được tính** khi so sánh — web tự nhận diện trận đó và trừ ra (có nhãn "đã trừ 1 trận").
- **Đôi Nam Nữ** (4 bảng): bảng D ít đội hơn → **play-off giữa Nhất bảng D và Nhì xuất sắc nhất của 3 bảng A/B/C**; đội thắng play-off vào **Bán kết gặp Nhất bảng C**. **Giải không có vòng tứ kết** — sau vòng bảng (và play-off) là vào thẳng Bán kết, đúng theo lịch thi đấu #64/#70 (chữ "tứ kết" trong điều lệ là lỗi diễn đạt).
- **Vòng loại trực tiếp**: 03 séc thắng 02, mỗi séc chạm 21; hoà 20-20 đánh lợi thế đến cách biệt 2 điểm hoặc tối đa 31.
- So sánh các đội Nhì: **Điểm → Hiệu số điểm → Điểm ghi được**, nếu bằng tuyệt đối thì báo **phải bốc thăm**.

> Muốn đổi luật (VD dùng cho khu vực Hải Phòng): sửa duy nhất object `ADVANCE` ở đầu file `rules.js` — mọi màn hình tự cập nhật theo.

## Lưu kết quả — 2 chế độ

Mọi thứ cấu hình trong **`config.js`** (file duy nhất cần sửa).

**a) Chế độ "máy lẻ"** (để trống `url`/`anonKey`): kết quả lưu trong `localStorage` của chính thiết bị đang nhập, không đồng bộ. Thanh xám trên đầu web ghi rõ điều này. Chuyển máy bằng **⋯ → Tải JSON / Nạp JSON**.

**b) Chế độ đồng bộ nhiều máy (Supabase)** — dùng khi 3 người cùng giám sát nhập:
- Ai nhập xong, 2 máy còn lại **tự cập nhật trong ~1 giây**, không cần F5.
- Thanh trạng thái trên đầu: 🟢 *Đang đồng bộ chung* / 🟡 *Mất mạng — đã lưu tạm N thay đổi* / 🔴 *Không kết nối được*. Mất mạng vẫn nhập được, có mạng lại thì **tự đẩy hàng đợi lên**.
- Nút **🔒/🔓** góc trên: phải nhập mật khẩu (`EDIT_PASSWORD` trong `config.js`) mới sửa được kết quả; người khác mở link chỉ xem lịch/bảng đấu/xếp hạng. Đây là **khoá mềm phía trình duyệt** — đủ ngăn VĐV sửa nhầm, không phải bảo mật thật (ai biết `anonKey` vẫn có thể ghi qua API). Đừng dùng mật khẩu quan trọng.
- Vẫn giữ bản sao localStorage nên đóng/mở lại máy không mất gì.

### Bật Supabase (làm 1 lần, ~7 phút)

1. Vào https://supabase.com → **Sign in with GitHub** → **New project**. Đặt tên (VD `cau-long-aph`), chọn region **Singapore**, đặt database password (không dùng cho web, cứ lưu lại), **Create**. Chờ ~2 phút.
2. Menu trái → **SQL Editor** → **New query** → dán nguyên khối dưới đây → **Run**:

```sql
create table if not exists public.results (
  event      text not null,
  match_id   text not null,
  a          int,
  b          int,
  sets       jsonb,
  updated_at timestamptz default now(),
  primary key (event, match_id)
);

alter table public.results enable row level security;

-- cho phép đọc/ghi bằng khoá anon (giải nội bộ, khoá thật nằm ở mật khẩu trên web)
drop policy if exists results_read  on public.results;
drop policy if exists results_write on public.results;
create policy results_read  on public.results for select using (true);
create policy results_write on public.results for all    using (true) with check (true);

-- bật realtime
alter publication supabase_realtime add table public.results;
```

3. Menu trái → **Project Settings → API**. Copy:
   - **Project URL** → dán vào `url` trong `config.js`
   - **anon public** key → dán vào `anonKey` (⚠️ KHÔNG dùng `service_role`)
4. Sửa `EDIT_PASSWORD` thành mật khẩu bạn muốn, commit `config.js` lên GitHub → Vercel tự deploy.
5. Mở link trên 3 máy, mỗi máy bấm **🔒** nhập mật khẩu 1 lần. Xong — nhập ở máy nào cũng thấy ở máy khác.

Xem/tổng hợp dữ liệu: bảng `results` trong Supabase → **Table Editor**, hoặc trên web bấm **⋯ → Copy để dán vào Google Sheet** / **Tải CSV**.

Muốn dùng lại web cho khu vực khác mà không lẫn số liệu: đổi `event` trong `config.js` (VD `"haiphong-2026"`).

## Deploy lên Vercel

**Cách 1 – kéo thả (nhanh nhất, không cần Git):**
1. Vào https://vercel.com/new
2. Kéo **toàn bộ file trong thư mục này** vào khung upload
3. Xong — có link dạng `https://ten-du-an.vercel.app`

**Cách 2 – qua GitHub (khuyến nghị, để sửa dễ):**
```bash
git init && git add . && git commit -m "web giai cau long APH 2026"
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```
Rồi ở Vercel: **Add New → Project → Import repo** → **để mặc định toàn bộ** (Framework Preset: *Other*, Build Command để trống, Root Directory `./`) → Deploy. Vì `index.html` nằm ở gốc repo nên Vercel tự nhận, không cần cấu hình Output Directory.

**Cách 3 – CLI:**
```bash
npm i -g vercel
vercel --prod
```

Chạy thử ở máy: `python3 -m http.server 8080` (trong thư mục này) → mở http://localhost:8080

## Cập nhật dữ liệu khi có lịch thi đấu đầy đủ

```bash
python3 tools/build_data.py "Lich thi dau full.xlsx"      # hoặc .pdf
python3 tools/build_data.py "file.pdf" --region "Hải Phòng" --date 13/09/2026
```
Script ghi lại `data.js`. Nếu lịch chưa liệt kê hết các cặp vòng tròn, script **tự sinh thêm** các trận còn thiếu (để trống giờ/sân, web hiện dấu `—`).

Dữ liệu hiện tại: **63 trận vòng bảng (đủ vòng tròn) + 10 trận loại trực tiếp**, 42 đội — trích từ file `Cau long Ha noi.pdf` (73 dòng, Hà Nội 12/9). Script đọc được cả dòng vòng bảng và dòng Play-off / Bán kết / Chung kết (nhãn `Nhất A`, `Nhì XSN`, `Thắng BK1`…).

*Lưu ý: nhánh đọc file `.xlsx` hiện chỉ lấy dòng vòng bảng, chưa lấy dòng loại trực tiếp — dùng PDF sẽ đầy đủ hơn.*

## Cấu trúc

```
index.html    khung + 3 modal
config.js     ⭐ CẤU HÌNH: Supabase + mật khẩu nhập điểm
sync.js       đồng bộ realtime, hàng đợi khi mất mạng
styles.css    mobile-first, tự đổi sáng/tối theo máy
rules.js      engine tính điểm/xếp hạng/nhì xuất sắc (chỉnh luật ở đây)
app.js        UI 5 tab, nhập điểm, export
data.js       DỮ LIỆU GIẢI (sinh tự động)
tools/build_data.py
vercel.json
```
Tất cả file web nằm ở **gốc repo** để Vercel deploy tĩnh không cần cấu hình.
