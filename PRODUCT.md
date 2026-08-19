# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Người dùng chính**: Sinh viên, học viên và giảng viên đại học chuyên ngành An toàn thông tin / Mật mã học / Khoa học máy tính (sử dụng để thực hành, nghiên cứu số học và báo cáo bài tập lớn).
- **Người dùng doanh nghiệp / hành chính**: Cán bộ, nhân viên cần một công cụ ký số văn bản điện tử (PDF, văn bản hợp đồng) kèm con dấu điện tử xác thực toàn vẹn.

## Product Purpose

SignWCert là hệ thống Ký số Văn bản Điện tử & Quản lý Chứng thực PKI dựa trên Hệ mật khóa công khai ElGamal và chuẩn chứng thư số X.509. Ứng dụng cung cấp trọn vẹn quy trình: Phát hành chứng thư số bởi Root CA $\to$ Soạn thảo/Tải tệp PDF và ký số $\to$ Đóng con dấu điện tử $\to$ Thẩm định tính toàn vẹn và kiểm toán toán học 3 lớp.

## Positioning

Khác với các hệ thống chữ ký số thương mại sử dụng thư viện mật mã đóng gói (black-box), SignWCert tự hiện thực hóa 100% thuật toán số học số nguyên lớn BigInt (Lũy thừa nhị phân nhanh Square-and-Multiply, Euclid mở rộng tìm nghịch đảo, Kiểm tra nguyên tố Miller-Rabin, Tìm phần tử sinh) kết hợp với trải nghiệm người dùng thương mại cao cấp (Signing Ceremony, Visual Stamp, Certificate of Completion).

## Operating Context

- Môi trường trình duyệt Web hiện đại (Chrome, Edge, Firefox, Safari).
- Thao tác trực quan: Kéo thả tệp PDF, chọn mẫu con dấu (dấu đỏ công vụ, dấu chữ ký tay xanh, mã QR), điều chỉnh vị trí trang ký, tải xuống tệp PDF đã ký và biên bản xác thực.
- Môi trường phòng thí nghiệm (Laboratory): Quan sát bảng vết toán học chi tiết từng bước $q, r, x, y$ và chứng minh phương trình đồng dư $v_1 \equiv v_2 \pmod p$.

## Capabilities and Constraints

- **Hệ mật**: ElGamal Digital Signature Algorithm trên trường hữu hạn $\mathbb{Z}_p^*$.
- **Cỡ khóa hỗ trợ**: 16, 32, 64, 128, 256, 512, 1024, 2048-bit (Áp dụng Safe Prime RFC 3526 cho 1024/2048-bit để đảm bảo an toàn và tối ưu hiệu năng).
- **Hàm băm**: SHA-256 (Web Crypto API).
- **Xử lý PDF**: `pdf-lib` kết hợp `pdfjs-dist` để hiển thị và nhúng con dấu trực quan.
- **Lưu trữ**: LocalStorage được mã hóa cấu trúc X.509 chuẩn.

## Brand Commitments

- Tên sản phẩm: **SignWCert • Enterprise eSign** (ElGamal PKI Standard).
- Tinh thần thương hiệu: **Enterprise Trust, Mathematical Precision & Legal Authority** (Tin cậy doanh nghiệp, Độ chính xác toán học, và Giá trị pháp lý minh bạch).

## Evidence on Hand

- Toàn bộ mã nguồn mật mã tự viết trong `src/crypto/` (`bigint-utils.ts`, `elgamal.ts`, `hash.ts`, `pki.ts`).
- 7 bài kiểm thử đơn vị tự động (Crypto Self-Test Suite) trong `src/crypto/crypto.test.ts`.
- Giao diện người dùng 4 phân hệ hoàn chỉnh trong `src/components/`.

## Product Principles

1. **Minh bạch số học tuyệt đối (Absolute Mathematical Transparency)**: Mọi kết quả ký số và xác thực đều có thể truy vết và kiểm toán toán học tường minh.
2. **Trải nghiệm ký số không rào cản (Frictionless Signing Ceremony)**: Quy trình ký tài liệu PDF 1-chạm rõ ràng, mượt mà và trực quan.
3. **Tuân thủ chuẩn mực an toàn (Cryptographic & Legal Compliance)**: Bắt buộc kiểm tra 3 lớp (Tính toàn vẹn mã băm $\to$ Chữ ký số ElGamal $\to$ Chuỗi chứng thư Root CA).
