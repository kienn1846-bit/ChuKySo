# ChuKySo

<div align="center">

<img src="public/favicon.svg" alt="ChuKySo Logo" width="96" height="96" />

### Hệ Thống Chữ Ký Số ElGamal & Hạ Tầng Khóa Công Khai (PKI) 

Một bộ giải pháp mật mã học toàn diện triển khai **Chữ ký số ElGamal**, tích hợp quản lý **Hạ tầng khóa công khai (PKI)**, ký số trực tiếp trên tài liệu PDF với con dấu điện tử tùy biến, thẩm định chữ ký 3 lớp, phòng thí nghiệm mật mã tương tác và mô phỏng các lỗ hổng bảo mật kinh điển.

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%2F%206.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Cryptography](https://img.shields.io/badge/Crypto-ElGamal%20%7C%20SHA--256%20%7C%20PKI-16A34A)](https://en.wikipedia.org/wiki/ElGamal_signature_scheme)

</div>

---

## 🌟 Giới Thiệu Tổng Quan
**ChuKySo** là ứng dụng hoàn chỉnh phục vụ báo cáo bài tập lớn đại học, triển khai lược đồ chữ ký số **ElGamal** trên trường hữu hạn $\mathbb{Z}_p^*$ kết hợp mô hình quản lý **Chứng thư số điện tử (PKI)** và đóng dấu điện tử trực quan trên tài liệu PDF.

**ChuKySo** cung cấp một môi trường mật mã học mạnh mẽ, chính xác tuyệt đối về mặt toán học và hoàn toàn độc lập. Ứng dụng minh họa trực quan việc áp dụng mật mã học bất đối xứng, số học modulo với số nguyên lớn, quản lý chứng thư số (PKI) và thẩm định tính toàn vẹn của văn bản điện tử.

### Tính Năng Cốt Lõi

- **Cơ sở toán học thuần thuý**: Triển khai trực tiếp bằng `BigInt` cho thuật toán sinh số nguyên tố an toàn ($p = 2q + 1$), kiểm tra số nguyên tố Miller-Rabin, tìm căn nguyên thủy ($\alpha$), thuật toán Euclid mở rộng tính nghịch đảo modulo ($k^{-1} \pmod{p-1}$), và lũy thừa nhanh modulo theo phương pháp bình phương và nhân.
- **Mô hình quản lý phân cấp**: Quản trị Cơ quan Chứng thực Gốc (Root CA), cấp phát chứng thư số người dùng, tính toán vân tay chứng thư SHA-256, kiểm tra thời hạn hiệu lực và Danh sách thu hồi chứng thư (CRL).
- **Ký số PDF kèm con dấu ký điện tử**: Thao tác xử lý PDF trực tiếp trên trình duyệt thông qua thư viện `pdf-lib`, áp dụng con dấu điện tử linh hoạt (con dấu tròn đỏ công vụ, chữ ký vẽ tay trên Canvas, huy hiệu QR xác thực và thẻ dấu thời gian) đồng thời bảo đảm tính toàn vẹn mật mã.
- **Xác minh chữ ký qua 3 lớp**: Xác thực 3 tầng độc lập gồm: Tính toàn vẹn văn bản (SHA-256), Tính xác thực toán học ($v_1 \equiv v_2 \pmod p$), và Chuỗi tin cậy chứng thư số PKI.
- **Chạy thử, chứng minh cơ sở toán học**: Truy vết từng bước tính toán toán học, bảng phân tích thương số - số dư của thuật toán Euclid, cùng mô đun mô phỏng các bước ký số.

---

## Kiến Trúc Hệ Thống & Cơ Sở Toán Học

### 1. Hệ mật ElGamal

```
+-----------------------------------------------------------------------------------+
| 1. SINH KHÓA (KEY GENERATION)                                                     |
|   • Sinh số nguyên tố an toàn p = 2q + 1 (với q là số nguyên tố qua Miller-Rabin) |
|   • Tìm căn nguyên thủy α ∈ Z_p*                                                  |
|   • Chọn khóa bí mật ngẫu nhiên x ∈ [2, p-2]                                      |
|   • Tính khóa công khai y = α^x mod p                                             |
|   => Khóa công khai: (p, α, y) | Khóa bí mật: x                                   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 2. QUY TRÌNH KÝ SỐ (SIGNING PROCESS)                                              |
|   • Tính mã băm thông điệp: m = SHA-256(Tài liệu) mod (p-1)                       |
|   • Chọn số ngẫu nhiên dùng một lần k ∈ [2, p-2] sao cho gcd(k, p-1) = 1          |
|   • Tính thành phần chữ ký thứ nhất: r = α^k mod p                                |
|   • Tính nghịch đảo modulo k^(-1) mod (p-1) bằng thuật toán Euclid mở rộng        |
|   • Tính thành phần chữ ký thứ hai: s = k^(-1) · (m - x · r) mod (p-1)            |
|   => Chữ ký số: (r, s)                                                            |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 3. QUY TRÌNH XÁC THỰC (VERIFICATION PROCESS)                                      |
|   • Kiểm tra điều kiện biên: 0 < r < p  và  0 < s < p-1                           |
|   • Tính vế trái: v1 = α^m mod p                                                  |
|   • Tính vế phải: v2 = (y^r · r^s) mod p                                          |
|   • Chữ ký HỢP LỆ khi và chỉ khi: v1 ≡ v2 (mod p)                                 |
+-----------------------------------------------------------------------------------+
```

> [!NOTE]
> **Chứng minh tính đúng đắn toán học:**
> $$v_2 \equiv y^r \cdot r^s \equiv (\alpha^x)^r \cdot (\alpha^k)^s \equiv \alpha^{xr + ks} \pmod p$$
> Do $s \equiv k^{-1}(m - xr) \pmod{p-1}$, ta có $ks \equiv m - xr \pmod{p-1} \implies xr + ks \equiv m \pmod{p-1}$.
> Theo định lý Fermat nhỏ, $\alpha^{xr + ks} \equiv \alpha^m \equiv v_1 \pmod p$.

---

## Mô Hình Thẩm Định Chữ Ký 3 Lớp

ChuKySo kiểm tra và xác thực chữ ký số thông qua ba lớp ranh giới bảo mật độc lập:

```
                    ┌────────────────────────────────────────┐
                    │      Tài Liệu Đã Ký & Gói Chữ Ký       │
                    └───────────────────┬────────────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
┌─────────────────────────┐                             ┌──────────────────────┐
│  Lớp 1: Tính Toàn Vẹn   │                             │ Lớp 3: Chuỗi Tin Cậy │
│  SHA-256(file) == hash  │                             │ Chữ ký Root CA hợp lệ│
│  Phát hiện chỉnh sửa    │                             │ Chưa bị thu hồi/CRL  │
└────────────┬────────────┘                             └──────────┬───────────┘
             │                                                     │
             └──────────────────────────┬──────────────────────────┘
                                        ▼
                         ┌─────────────────────────────┐
                         │  Lớp 2: Xác Thực Toán Học   │
                         │  v1 ≡ v2 (mod p)            │
                         │  Xác nhận định danh người ký│
                         └──────────────┬──────────────┘
                                        ▼
                         ┌─────────────────────────────┐
                         │   Thẩm Định Đạt Tiêu Chuẩn  │
                         │   Xuất Biên Bản Kiểm Tra PDF│
                         └─────────────────────────────┘
```

1. **Lớp 1 (Tính toàn vẹn)**: Tính toán mã băm SHA-256 của tài liệu tải lên theo thời gian thực và đối chiếu với mã băm lưu trong chữ ký. Bất kỳ sự thay đổi dù chỉ 1 bit đều sẽ bị phát hiện ngay lập tức.
2. **Lớp 2 (Tính xác thực toán học)**: Thực thi phép kiểm tra đồng dư ElGamal dựa trên khóa công khai $(p, \alpha, y)$ của người ký.
3. **Lớp 3 (Chuỗi tin cậy PKI)**: Thẩm tra chữ ký của Cơ quan Chứng thực Gốc (Root CA) trên chứng thư số của người ký, đồng thời rà soát số serial, thời hạn hiệu lực và trạng thái thu hồi.

---

## Tính năng nổi bật

### 📄 Phân hệ ký số văn bản
- **Ký trực tiếp trên file PDF**: Chọn tọa độ trực quan trên trang tài liệu, áp dụng mẫu con dấu tùy chỉnh và nhúng siêu dữ liệu chữ ký.
- **Mẫu dấu điện tử đa dạng**:
  - *Con dấu tròn công vụ*: Dấu đỏ doanh nghiệp/tổ chức chuẩn pháp lý với ngôi sao và viền chữ trang trọng.
  - *Chữ ký tay*: Bảng vẽ Canvas HTML5 hỗ trợ ký trực tiếp hoặc tải lên ảnh chữ ký nền trong suốt.
  - *Huy hiệu hiện đại & Thẻ tối giản*: Phong cách thẻ phê duyệt doanh nghiệp hiện đại.
- **Đóng gói chữ ký độc lập**: Cho phép xuất chữ ký số dưới định dạng `.ChuKySo.json` dành cho các loại tệp tin bất kỳ (hình ảnh, tệp nén, phần mềm, văn bản thuần).

### 🏛️ Quản lý hạ tầng PKI & Cơ quan chứng thực
- Bảng điều khiển quản lý Cơ quan Chứng thực Gốc (Root CA), theo dõi trạng thái hoạt động/thu hồi.
- Cấp phát chứng thư số người dùng với thông tin Subject DN chi tiết (`CN`, `O`, `OU`, `Email`, `ID`).
- Tự động tính toán vân tay chứng thư số SHA-256 và ký duyệt chứng thư bằng khóa bí mật của Root CA.
- Xuất/nhập chứng thư số dưới định dạng JSON chuẩn cấu trúc.

### 🔬 Tính toán cơ sở toán học trực quan
- **Truy vết từng bước tính toán**: Quan sát chi tiết các tham số nội bộ ($p, \alpha, x, y, k, r, s, k^{-1}$) được kết xuất trực quan bằng KaTeX LaTeX.
- **Bảng vết thuật toán Euclid mở rộng**: Bảng tính thương số - số dư từng bước chi tiết giải thích cách tìm phần tử nghịch đảo $k^{-1} \pmod{p-1}$.
- **Mã hóa & Giải mã bất đối xứng**: Minh họa lược đồ mật mã ElGamal hoàn chỉnh ($c_1 = \alpha^k \bmod p, c_2 = M \cdot y^k \bmod p$).
---

## Cấu trúc dự án

```
ChuKySo/
├── public/
│   ├── favicon.svg             # Biểu tượng vector của ứng dụng
│   └── icons.svg               # Định nghĩa các sprite SVG
├── src/
│   ├── crypto/                 # Động cơ thuật toán mật mã học thuần túy
│   │   ├── bigint-utils.ts     # Số học BigInt: modPow, extGCD, modInverse, safePrime
│   │   ├── elgamal.ts          # Sinh khóa, Ký số, Xác thực, Mã hóa, Ghi vết toán học
│   │   ├── hash.ts             # Tiện ích băm SHA-256/512 qua Web Crypto API
│   │   ├── pki.ts              # Quản lý Chứng thư số & Cơ quan Chứng thực Gốc (Root CA)
│   │   └── crypto.test.ts      # Bộ kiểm thử tự động thuật toán mật mã
│   ├── services/               # Xử lý nghiệp vụ ứng dụng
│   │   ├── pdf-service.ts      # Xử lý PDF, vẽ con dấu điện tử, xuất biên bản kiểm tra
│   │   ├── storage-service.ts  # Lưu trữ LocalStorage & nạp dữ liệu mẫu ban đầu
│   │   ├── crypto-logger.ts    # Nhật ký kiểm toán các bước tính toán mật mã
│   │   └── attack-sim-service.ts # Mô phỏng tấn công toán học (k-reuse, phân tích DLP)
│   ├── components/             # Các thành phần giao diện người dùng (UI)
│   │   ├── layout/             # Thanh điều hướng header & chuyển đổi giao diện sáng/tối
│   │   ├── dashboard/          # Thống kê tổng quan, kiểm tra trạng thái & lối tắt
│   │   ├── sign/               # Giao diện ký tài liệu & Bảng vẽ chữ ký Canvas
│   │   ├── verify/             # Bảng thẩm định chữ ký 3 lớp & xuất biên bản
│   │   ├── pki/                # Quản trị chứng thư số & Modal cấp phát chứng thư
│   │   ├── lab/                # Phòng thí nghiệm toán học, bảng vết Euclid & mô phỏng tấn công
│   │   ├── logs/               # Nhật ký kiểm toán mật mã học chi tiết
│   │   └── common/             # Khung hiển thị công thức KaTeX & thông báo Toast
│   ├── styles/
│   │   └── index.css           # Hệ thống thiết kế Enterprise Security (Hỗ trợ Dark/Light)
│   ├── types/
│   │   └── index.ts            # Định nghĩa toàn bộ kiểu dữ liệu TypeScript
│   ├── App.tsx                 # Bộ điều phối trung tâm & điều hướng tab
│   └── main.tsx                # Điểm khởi chạy ứng dụng React
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Hướng dẫn cài đặt & chạy ứng dụng

### Yêu cầu môi trường

- **Node.js**: Phiên bản `v18.0.0` trở lên
- **Trình quản lý gói**: `npm` (v9+) hoặc `pnpm` / `yarn`

### Các bước cài đặt

1. Sao chép kho mã nguồn (Clone repository):
   ```bash
   git clone https://github.com/kienn1846-bit/ChuKySo.git
   cd ChuKySo
   ```

2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```

3. Khởi chạy máy chủ phát triển (Development Server):
   ```bash
   npm run dev
   ```

4. Mở trình duyệt web và truy cập địa chỉ: `http://localhost:5173`.

### Đóng gói ứng dụng 

Để tạo bản dựng tối ưu phục vụ triển khai môi trường sản phẩm:

```bash
npm run build
npm run preview
```

---

## Công nghệ sử dụng

| Tầng công nghệ | Công nghệ | Mục đích |
| :--- | :--- | :--- |
| **Giao diện (Framework)** | [React 19](https://react.dev/) | Kiến trúc thành phần và quản lý trạng thái giao diện |
| **Ngôn ngữ** | [TypeScript 5/6](https://www.typescriptlang.org/) | Đảm bảo an toàn kiểu dữ liệu và định nghĩa dữ liệu mật mã |
| **Công cụ đóng gói** | [Vite 8](https://vitejs.dev/) | Môi trường HMR tốc độ cao và tối ưu hóa đóng gói |
| **Định kiểu (Styling)** | Vanilla CSS (CSS Variables) | Hệ thống thiết kế chuẩn Enterprise Trust, hỗ trợ Dark/Light mode |
| **Xử lý PDF** | [pdf-lib](https://pdf-lib.js.org/) | Vẽ con dấu vector và nhúng chữ ký trực tiếp trên trình duyệt |
| **Hiển thị Toán học** | [KaTeX](https://katex.org/) | Kết xuất công thức toán học LaTeX tốc độ cao |


---

## Lưu ý!

> [!WARNING]
> **Khuyến cáo học thuật & minh họa:**
> - Triển khai toán học của lược đồ ElGamal trong dự án này tuân thủ nghiêm ngặt chuẩn đại số trên $\mathbb{Z}_p^*$. Tuy nhiên, môi trường JavaScript trên trình duyệt không đảm bảo tính toán thời gian thực không đổi (*constant-time execution*), do đó có thể chịu rủi ro tấn công kênh kề (*side-channel timing attacks*) nếu áp dụng trong các hệ thống đòi hỏi cấp độ an ninh tối cao.
> - Để đảm bảo trải nghiệm phản hồi tức thì trên trình duyệt khi demo, độ dài khóa mặc định được thiết lập từ **64-bit đến 512-bit**. Đối với các ứng dụng thương mại thực tế, khuyến nghị sử dụng kích thước khóa tối thiểu **2048-bit đến 3072-bit** hoặc chuyển đổi sang hệ mật đường cong Elliptic.
> - Tuyệt đối không bao giờ tái sử dụng số ngẫu nhiên $k$ khi sinh nhiều chữ ký số với cùng một khóa bí mật.
