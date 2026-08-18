---
name: crypto-system-design
description: Hướng dẫn chi tiết về nền tảng toán học hệ mật ElGamal, số học số nguyên lớn BigInt, kiểm tra số nguyên tố, phần tử sinh, nghịch đảo modulo và kiến trúc PKI/Certificate.
---

# ElGamal Cryptographic Signature & PKI Architecture

## 1. Cơ sở Toán học của Chữ ký ElGamal

### 1.1 Khởi tạo Nhóm và Cặp khoá (Key Generation)
1. Chọn số nguyên tố an toàn $p = 2q + 1$ (với $q$ là số nguyên tố Sophie Germain).
2. Tìm phần tử sinh (Generator / Primitive Root) $\alpha \in \mathbb{Z}_p^*$:
   - $\alpha$ là căn nguyên thuỷ nếu $\alpha^{(p-1)/q} \not\equiv 1 \pmod p$ và $\alpha^2 \not\equiv 1 \pmod p$.
3. Chọn khoá bí mật (Private Key) $x \in_R [2, p-2]$.
4. Tính khoá công khai (Public Key) $y = \alpha^x \pmod p$.
5. **Cặp khoá**:
   - Khoá công khai: $\text{PublicKey} = (p, \alpha, y)$.
   - Khoá bí mật: $\text{PrivateKey} = x$.

### 1.2 Quá trình Ký (Signing)
1. Tính giá trị băm thông điệp: $m = H(M) \pmod{p-1}$ (dùng SHA-256 / SHA-512).
2. Chọn số ngẫu nhiên bí mật $k \in [2, p-2]$ thoả mãn $\gcd(k, p-1) = 1$.
3. Tính thành phần chữ ký thứ nhất:
   $$r = \alpha^k \pmod p$$
4. Tính nghịch đảo modulo $k^{-1} \pmod{p-1}$ bằng giải thuật Euclid mở rộng.
5. Tính thành phần chữ ký thứ hai:
   $$s = k^{-1} \cdot (m - x \cdot r) \pmod{p-1}$$
6. Nếu $s = 0$, chọn lại $k$ khác.
7. **Chữ ký số** là cặp $(r, s)$.

### 1.3 Quá trình Xác thực (Verification)
1. Kiểm tra điều kiện biên: $0 < r < p$ và $0 < s < p-1$.
2. Tính $v_1 = \alpha^m \pmod p$.
3. Tính $v_2 = (y^r \cdot r^s) \pmod p$.
4. **Kết luận**:
   $$\text{Chữ ký Hợp lệ} \iff v_1 \equiv v_2 \pmod p$$

*Chứng minh tính đúng đắn*:
$$v_2 \equiv y^r \cdot r^s \equiv (\alpha^x)^r \cdot (\alpha^k)^s \equiv \alpha^{xr + ks} \pmod p$$
Do $s \equiv k^{-1}(m - xr) \pmod{p-1} \implies ks \equiv m - xr \pmod{p-1} \implies xr + ks \equiv m \pmod{p-1}$.
Theo Định lý Fermat nhỏ: $\alpha^{xr+ks} \equiv \alpha^m \pmod p \equiv v_1$.

## 2. Kiến trúc PKI & Chứng thư số
- **Cấu trúc Chứng thư số**:
  - `Version`: 1.0 (X.509-inspired)
  - `SerialNumber`: Chuỗi hex duy nhất
  - `Subject`: Tên người dùng, Tổ chức, Email, MSSV
  - `Issuer`: Cơ quan cấp phát (Root CA)
  - `Validity`: NotBefore - NotAfter
  - `PublicKey`: $(p, \alpha, y)$
  - `KeyUsage`: Digital Signature, Document Verification
  - `Signature`: Chữ ký ElGamal $(r_{ca}, s_{ca})$ của Root CA trên hash nội dung chứng thư.
- **Xác thực Chứng thư**:
  - Kiểm tra thời gian hiện tại nằm trong khoảng Validity.
  - Xác thực chữ ký $(r_{ca}, s_{ca})$ bằng Public Key của Root CA.
