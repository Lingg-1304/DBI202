# DBI202 EXAM MASTER - HỆ THỐNG ÔN TẬP & THI THỬ TRẮC NGHIỆM

Hệ thống web ôn thi và thi thử trắc nghiệm môn **DBI202 (Introduction to Databases)** của **FPT University**, được xây dựng dựa trên dữ liệu đề và đáp án chi tiết từ thư mục `DBI202_FE`.

---

## 🚀 Cách khởi động và sử dụng nhanh

1. Nhấp đúp chuột vào file **`start_web.bat`** trong thư mục này.
2. Trình duyệt web sẽ tự động mở trang web tại địa chỉ: **[http://localhost:5050](http://localhost:5050)**.
3. Nếu máy chủ đã đang chạy ngầm, bạn chỉ cần mở trình duyệt và truy cập: **[http://localhost:5050](http://localhost:5050)**.

---

## 🎯 Các tính năng chính

### 1. 📖 Chế độ Ôn tập theo dạng (Flashcards & Practice)
- **Tách ảnh thông minh**: Phần câu hỏi được cắt sạch sẽ (không bị lộ đáp án ở dưới đáy). Đáp án và lời giải chỉ xuất hiện khi bạn chọn hoặc bấm xem.
- **Chọn đáp án tương tác**:
  - Hỗ trợ câu hỏi 1 đáp án (`A`, `B`, `C`, `D`) và câu hỏi nhiều đáp án (`BC`, `AB`, `ACD`).
  - Hỗ trợ câu hỏi True / False.
  - Phản hồi tức thì: tô xanh đáp án đúng, tô đỏ đáp án bạn chọn sai.
- **Lời giải & Ghi chú nguyên gốc**:
  - Hiển thị văn bản giải thích chi tiết bằng tiếng Việt.
  - Hiển thị ảnh chụp phần ghi chú viết tay/đáp án của người ra đề.
  - Nút **"Xem slide gốc đầy đủ"** để phóng to ảnh chụp màn hình 1920x1080 ban đầu.
- **Phím tắt tiện dụng**:
  - Phím `1`, `2`, `3`, `4` hoặc `A`, `B`, `C`, `D`: Chọn đáp án nhanh.
  - Phím mũi tên `←` / `→`: Chuyển qua lại giữa các câu hỏi.
  - Phím `Space`: Xem nhanh đáp án & giải thích.
  - Phím `S`: Đánh dấu sao (Bookmark) câu hỏi cần chú ý.
  - Phím `R`: Nhảy ngẫu nhiên đến một câu hỏi.
- **Bảng điều hướng câu hỏi**:
  - Cột bên phải hiển thị danh sách toàn bộ câu hỏi.
  - Mã màu trực quan: Xanh (Đã làm đúng), Đỏ (Làm sai), Xám (Chưa làm), Chấm vàng (Đã gắn sao).
- **Bộ lọc mạnh mẽ**:
  - Lọc theo từng dạng bài (Dạng bài tập, Liệt kê, Câu ngắn, Câu trung bình, Câu dài, NOT & True/False, SP2026 FE).
  - Lọc theo trạng thái: Chưa làm, Đã làm đúng, Làm sai, Đã đánh dấu sao ⭐.
  - Tìm kiếm nhanh theo nội dung câu hỏi hoặc `#số_thứ_tự`.

### 2. ⏱️ Chế độ Thi thử (Mock Exam)
- **Các gói đề thi có sẵn**:
  - 🎯 **Chuẩn FE DBI202**: 50 câu / 60 phút (Trộn ngẫu nhiên mọi dạng theo chuẩn FPT).
  - ⚡ **Thi nhanh (Quick Quiz)**: 20 câu / 25 phút.
  - 🏆 **Đề mới nhất SP2026 FE**: 24 câu / 30 phút.
  - 🛠️ **Tùy biến (Custom)**: Tự chọn số lượng câu (10, 20, 30, 50, 100, Tất cả), thời lượng thi, danh mục dạng bài.
- **Giao diện phòng thi chân thực**:
  - Đồng hồ đếm ngược thời gian (đổi màu đỏ cảnh báo khi còn dưới 5 phút).
  - Nút **"Đặt cờ xem lại"** cho các câu còn phân vân.
  - Thanh tiến độ hiển thị số câu đã chọn.
  - Bảng câu hỏi số (Question Palette) nhảy nhanh đến câu bất kỳ.
- **Chấm điểm & Phân tích kết quả**:
  - Chấm điểm hệ 10 chuẩn xác (thang điểm qua môn FPT ≥ 5.0).
  - Báo cáo chi tiết: Số câu đúng, sai, bỏ trống, tỷ lệ chính xác, thời gian làm bài.
  - **Xem lại bài thi (Review)**: So sánh đáp án bạn chọn với đáp án chuẩn và lời giải của từng câu.
  - Nút **"Luyện lại các câu làm sai"**: Tạo ngay bài thi mới chỉ gồm các câu bạn vừa làm sai để khắc sâu kiến thức.
  - Tự động lưu lịch sử các lần thi thử vào trình duyệt.

### 3. 🔍 Ngân hàng đề (Question Explorer)
- Danh sách tổng hợp toàn bộ 346 câu hỏi có thể cuộn, tìm kiếm và lọc.
- Bấm **"Luyện tập"** để chuyển ngay sang chế độ ôn luyện cho câu hỏi đó.

### 4. 📊 Thống kê & Tiến độ (Analytics)
- Bảng tổng kết số câu đã làm, số câu đúng/sai, độ chính xác tổng thể.
- Thanh tiến độ hoàn thành theo từng dạng bài riêng biệt.
- Nút đặt lại tiến độ khi muốn ôn tập lại từ đầu.

---

## 📂 Cơ cấu dữ liệu
- `web/public/questions_data.json`: Bộ dữ liệu 346 câu hỏi đã chuẩn hóa (ID, Dạng bài, Ảnh câu hỏi, Ảnh đáp án, Đáp án đúng, Giải thích, Thuộc tính).
- `web/public/questions/`: Ảnh đề thi đã cắt bỏ phần đáp án (độ phân giải cao, rõ nét).
- `web/public/answers/`: Ảnh chụp ghi chú đáp án và lời giải gốc.
- `web/public/DBI202_FE/`: Liên kết trực tiếp đến kho ảnh gốc ban đầu.
"# DBI202" 
