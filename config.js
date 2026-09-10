/* ============================================================
   CẤU HÌNH — file DUY NHẤT bạn cần sửa để bật đồng bộ nhiều máy
   ============================================================
   Để trống url/anonKey  -> web chạy chế độ "máy lẻ" (lưu trên
   chính thiết bị đó, không đồng bộ) — giống bản cũ.
   Điền đầy đủ           -> 3 người nhập chung, realtime.
   Xem hướng dẫn lấy 2 giá trị này trong README (mục Supabase).
   ============================================================ */
window.SUPABASE = {
    url: "https://swwosluqkrjojarodroi.supabase.co/rest/v1/"",            // VD: "https://swwosluqkrjojarodroi.supabase.co/rest/v1/"
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3d29zbHVxa3Jqb2phcm9kcm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5ODYzNjAsImV4cCI6MjEwNDU2MjM2MH0.f_AYb9h8waH4Me0SQH1c44GTCgznnBIlr7Hg3XX4VLI",        // VD: "eyJhbGciOi...."  (khoá "anon public", KHÔNG dùng service_role)
  table: "results",   // giữ nguyên nếu bạn chạy đúng câu SQL trong README
  event: "hanoi-2026" // đổi thành "haiphong-2026" nếu dùng lại web cho khu vực khác
};

/* Mật khẩu để mở quyền nhập điểm. Ai không có mật khẩu chỉ xem được.
   Lưu ý: đây là khoá "mềm" phía trình duyệt — đủ để tránh VĐV sửa điểm
   linh tinh, không phải bảo mật thật. Đừng dùng mật khẩu quan trọng. */
window.EDIT_PASSWORD = "ap24";
