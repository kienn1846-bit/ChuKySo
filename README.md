# SignWCert - Hệ Thống Ký Số Văn Bản Điện Tử Hệ Mật ElGamal & Chứng Thực PKI
> **Đề tài Bài Tập Lớn / Đồ Án Cuối Kỳ Môn An Toàn Thông Tin & Mật Mã Học**

---

## 🌟 Giới Thiệu Tổng Quan
**SignWCert** là ứng dụng hoàn chỉnh phục vụ báo cáo bài tập lớn đại học, triển khai lược đồ chữ ký số **ElGamal** trên trường hữu hạn $\mathbb{Z}_p^*$ kết hợp mô hình quản lý **Chứng thư số điện tử (PKI)** và đóng dấu điện tử trực quan trên tài liệu PDF.

Sản phẩm được thiết kế với tiêu chí:
1. **Toán học chính xác 100%**: Sử dụng số học số nguyên lớn `BigInt` tự phát triển, triển khai thuật toán Miller-Rabin, sinh số nguyên tố an toàn $p = 2q + 1$, tìm căn nguyên thuỷ $\alpha$, giải thuật Euclid mở rộng và luỹ thừa modulo nhị phân.
2. **Thực tiễn & Đầy đủ Tính năng**: Hỗ trợ ký PDF (với con dấu điện tử tuỳ chỉnh vị trí), ký file bất kỳ, thẩm định 3 lớp (Toàn vẹn - Băm SHA-256, Xác thực toán học $v_1 \equiv v_2 \pmod p$, và Thẩm định chứng thư số CA).
3. **Phục vụ Thuyết trình BTL**: Tích hợp phòng thí nghiệm toán học tương tác (Interactive Lab), mô phỏng lỗ hổng kinh điển khi tái sử dụng số ngẫu nhiên $k$ (Reused $k$ Attack), và xuất Biên bản kiểm tra chữ ký PDF chính quy.

---

## ⚙️ Cài Đặt & Chạy Ứng Dụng

### Yêu cầu môi trường
- Node.js >= 18.x
- npm >= 9.x

### Các bước khởi chạy
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev

# 3. Mở trình duyệt tại:
http://localhost:5173/
```

### Đóng gói ứng dụng (Production Build)
```bash
npm run build
npm run preview
```

---

## 📐 Kiến Trúc Toán Học & Lược Đồ ElGamal

### 1. Sinh Khoá (Key Generation)
- Chọn số nguyên tố an toàn $p = 2q + 1$ (với $q$ là số nguyên tố Sophie Germain).
- Tìm căn nguyên thuỷ $\alpha \in \mathbb{Z}_p^*$.
- Chọn khoá bí mật $x \in_R [2, p-2]$.
- Tính khoá công khai $y = \alpha^x \pmod p$.
- **Cặp khoá**: $\text{PublicKey} = (p, \alpha, y)$, $\text{PrivateKey} = x$.

### 2. Ký Số (Signing)
- Tính mã băm thông điệp: $m = H(M) \pmod{p-1}$ bằng SHA-256.
- Chọn số ngẫu nhiên bí mật $k \in [2, p-2]$ thoả mãn $\gcd(k, p-1) = 1$.
- Tính thành phần thứ nhất: $r = \alpha^k \pmod p$.
- Tính nghịch đảo modulo $k^{-1} \pmod{p-1}$ bằng giải thuật Euclid mở rộng.
- Tính thành phần thứ hai: $s = k^{-1} \cdot (m - x \cdot r) \pmod{p-1}$.
- **Chữ ký số**: Bộ đôi $(r, s)$.

### 3. Xác Thực (Verification)
- Kiểm tra điều kiện biên: $0 < r < p$ và $0 < s < p-1$.
- Tính vế trái: $v_1 = \alpha^m \pmod p$.
- Tính vế phải: $v_2 = (y^r \cdot r^s) \pmod p$.
- **Kết luận**: Chữ ký hợp lệ khi và chỉ khi $v_1 \equiv v_2 \pmod p$.

$$\text{Chứng minh: } v_2 \equiv y^r \cdot r^s \equiv (\alpha^x)^r \cdot (\alpha^k)^s \equiv \alpha^{xr + ks} \equiv \alpha^m \equiv v_1 \pmod p$$

---

## 🛡️ 3 Lớp Bảo Vệ Của SignWCert
1. **Lớp 1 - Tính Toàn Vẹn (Document Integrity)**: Băm SHA-256 của file tải lên được đối chiếu với mã băm trong chữ ký. Sai lệch dù 1 bit sẽ cảnh báo ngay lập tức.
2. **Lớp 2 - Tính Xác Thực Toán Học (ElGamal Equation)**: Kiểm tra phương trình đồng dư $v_1 \equiv v_2 \pmod p$ với Public Key của người ký.
3. **Lớp 3 - Độ Tin Cậy Chứng Thư Số (PKI Trust Chain)**: Xác thực chữ ký số của Cơ quan Chứng thực Gốc (Root CA) trên chứng thư số người ký, kiểm tra ngày hết hạn và danh sách thu hồi (CRL).

---

## 📂 Cấu Trúc Mã Nguồn

```
signwcert/
├── src/
│   ├── crypto/
│   │   ├── bigint-utils.ts         # Số học BigInt: modPow, extendedGCD, modInverse, millerRabin, safePrime
│   │   ├── elgamal.ts              # Sinh khoá, Ký số, Xác thực và Ghi vết toán học
│   │   ├── hash.ts                 # SHA-256/512, Digest to BigInt mapping
│   │   ├── pki.ts                  # Chứng thư số X.509, Root CA, Ký duyệt chứng thư
│   │   └── crypto.test.ts          # Bộ kiểm thử tự động thuật toán (Self-Test Suite)
│   ├── services/
│   │   ├── pdf-service.ts          # Đóng dấu điện tử visual e-Seal, nhúng chữ ký & xuất biên bản PDF
│   │   ├── storage-service.ts      # Quản lý kho lưu trữ LocalStorage, nạp sẵn dữ liệu mẫu giảng viên/sinh viên
│   │   └── attack-sim-service.ts   # Mô phỏng bẻ khoá khi dùng lại k & phân tích độ phức tạp DLP
│   ├── components/
│   │   ├── layout/Header.tsx       # Thanh điều hướng, thông tin chứng thư & chuyển theme
│   │   ├── dashboard/DashboardView.tsx # Tổng quan hệ thống, Self-Test trực tiếp
│   │   ├── sign/SignDocumentView.tsx   # Ký PDF (Visual Stamp), Ký File & Ký Văn bản
│   │   ├── verify/VerifySignatureView.tsx # Xác thực chữ ký 3 lớp & Xuất biên bản kiểm tra
│   │   ├── pki/CertificateManagerView.tsx # Quản lý hạ tầng PKI, cấp phát & thu hồi chứng thư
│   │   ├── lab/ElGamalLabView.tsx  # Phòng thí nghiệm toán học, bảng Euclid, demo tấn công
│   │   ├── docs/AcademicDocsView.tsx # Báo cáo học thuật, chứng minh & câu hỏi bảo vệ BTL
│   │   └── common/Toast.tsx        # Hệ thống thông báo trạng thái
│   ├── styles/
│   │   └── index.css               # Design System Vanilla CSS chuẩn Enterprise Security
│   ├── types/index.ts              # Định nghĩa cấu trúc dữ liệu TypeScript
│   ├── App.tsx                     # Điều phối toàn bộ ứng dụng
│   └── main.tsx                    # Điểm khởi chạy React
└── README.md
```

---

## 🎓 Câu Hỏi Phản Biện Hội Đồng Chấm Thi
Trong tab **"Tài Liệu Báo Cáo BTL"** của ứng dụng, hệ thống đã tích hợp sẵn 4 chủ đề phản biện cốt lõi:
- *Tại sao cần số nguyên tố an toàn để chống tấn công Pohlig-Hellman?*
- *Phân tích lỗ hổng tái sử dụng số ngẫu nhiên $k$ (Vụ tấn công kinh điển Sony PlayStation 3).*
- *So sánh chi phí tính toán và kích thước chữ ký giữa ElGamal và RSA.*
- *Hiệu ứng tuyết lở (Avalanche Effect) của hàm băm SHA-256 trong chống giả mạo.*

---

## 👨‍💻 Tác Giả & Bản Quyền
- **Đề tài**: Ứng dụng Hệ mật ElGamal trong Ký số Văn bản & Quản lý Chứng thư số.
- **Môn học**: An Toàn Thông Tin & Mật Mã Học.
- **Năm thực hiện**: 2026.
