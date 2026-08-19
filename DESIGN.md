# Design System & Visual Identity

<!-- impeccable:design-schema 1 -->

## Style Archetype: Enterprise Cryptographic Authority (Trust Studio 2.0)

Hệ thống thiết kế của **SignWCert** được định hình theo phong cách **Bảo mật Doanh nghiệp & Thẩm định Pháp lý (Enterprise Trust & Legal Authority)**, lấy cảm hứng từ các nền tảng mật mã học và ký số hàng đầu thế giới (*DocuSign, Adobe Acrobat Sign, Cloudflare Security, HashiCorp Vault*).

---

## 1. Bảng Màu Thương Hiệu (Color System & Semantic Tokens)

### Nền & Mặt phẳng giao diện (Surfaces & Layers)
* **Canvas Base (Nền chính)**: `--bg-primary: #0B132B` (Dark) / `#F4F7FB` (Light) - Nền tối sâu thẳm mang lại độ tập trung cao.
* **Elevated Surface (Card chính)**: `--bg-secondary: #111D38` (Dark) / `#FFFFFF` (Light) - Bề mặt thẻ tài liệu trang trọng.
* **Interactive Surface (Thẻ con/Input)**: `--bg-input: #0E172E` (Dark) / `#F8FAFC` (Light) - Vùng nhập liệu phân định rõ nét.
* **Viền tinh tế (Borders)**: `--border-subtle: #1E2E52` / `--border-light: #2C3F6D`.

### Màu Định Danh & Hành Động (Action & Accent Tokens)
* **Signature Green (Hành động Ký & Hợp Lệ)**: `--accent-sign: #16A34A` / Hover: `#15803D`
  * Dùng cho nút chính *"KÝ VÀ PHÁT HÀNH TÀI LIỆU"*, huy hiệu *"Chữ ký hợp lệ & toàn vẹn"*.
* **Corporate Royal Blue (Thương hiệu & CA)**: `--brand-blue: #2563EB` / `--brand-navy: #1E3A5F`
  * Dùng cho Root CA Banner, các nút điều hướng, và biểu tượng liên kết.
* **Official Seal Red (Mực con dấu & Cảnh báo)**: `--accent-seal: #DC2626`
  * Dùng cho con dấu tròn công vụ và cảnh báo văn bản bị can thiệp/giả mạo.
* **Compliance Gold (Chờ xử lý / Lưu ý)**: `--accent-gold: #D97706`

---

## 2. Hệ Thống Typography (Typographic Hierarchy)

| Cấp bậc | Font chữ | Trọng số (Weight) | Ứng dụng |
| :--- | :--- | :--- | :--- |
| **Brand & Title** | `Plus Jakarta Sans` | 800 (Extra Bold) | Logo `SignWCert`, Tiêu đề phân hệ chính (H1, H2). |
| **UI Labels & Body** | `Plus Jakarta Sans` | 500, 600, 700 | Tên trường form, nhãn nút, mô tả quy trình. |
| **Mã Băm & Số BigInt** | `JetBrains Mono` | 400, 500, 600 | Chuỗi SHA-256 Hex, Khóa công khai $(p, g, y)$, Chữ ký $(r, s)$, Bảng vết Euclid. |
| **Văn bản Hợp đồng** | `EB Garamond` | 400, 500 (Italic) | Nội dung soạn thảo văn bản, điều khoản thỏa thuận. |
| **Ký hiệu Toán học** | `KaTeX / AMS Math` | Regular | Công thức đồng dư: $s = k^{-1}(m - xr) \pmod{p-1}$, $v_1 \equiv v_2 \pmod p$. |

---

## 3. Cấu Trúc Bố Cục & Tương Tác (Layout & Micro-Interactions)

### Quy chuẩn Bố cục (Layout Standards)
* **Khung chứa ứng dụng**: Độ rộng tối đa `1400px`, căn giữa cân đối, khoảng đệm tiêu chuẩn `24px - 28px`.
* **Bố cục 2 cột đối xứng (`grid-2`)**: 
  * Cột trái: Bảng điều khiển cấu hình chứng thư số / tài liệu đầu vào.
  * Cột phải: Khung duyệt tài liệu trực quan, tùy biến con dấu và báo cáo thẩm định.

### Tương tác & Phản hồi (Micro-Interactions)
* **Thời gian chuyển động (Timing)**: `150ms - 250ms ease` cho tất cả các nút bấm, hiệu ứng hover thẻ card và chuyển tab.
* **Trạng thái Ký số (Signing Feedback)**: Hiển thị thanh tiến trình băm SHA-256 $\to$ Tính toán ElGamal $\to$ Nhúng PDF và nổ pháo giấy ăn mừng (*Canvas Confetti*) khi xác thực thành công.
* **Tính thích ứng (Responsiveness)**: Tự động chuyển về dạng 1 cột trên màn hình điện thoại/tablet nhỏ hơn `1024px`.
