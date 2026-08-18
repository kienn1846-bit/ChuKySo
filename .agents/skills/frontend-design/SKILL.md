---
name: frontend-design
description: Hướng dẫn thiết kế giao diện UI/UX trực quan, hiện đại, phong cách Enterprise Security & Cryptography Studio, không rơi vào các khuôn mẫu cơ bản hay template sáo rỗng.
---

# Frontend Design Guide for Cryptographic Security Systems

## 1. Aesthetic Direction: Modern Cryptographic Trust Studio
- **Tone & Feeling**: High-trust, mathematical precision, modern enterprise security (như Cloudflare, HashiCorp Vault, YubiKey, Proton).
- **Color Hierarchy**:
  - Primary Base: Deep Slate / Obsidian Slate (`#0B0F19`, `#111827`, `#1E293B`) kết hợp cùng các mảng màu card kính (`backdrop-blur`, glassmorphism nhẹ).
  - Accent / Trust Color: Emerald / Cyan Glow (`#10B981`, `#06B6D4`) cho trạng thái Verified / Hợp lệ.
  - Warning / Alert: Amber & Crimson (`#F59E0B`, `#EF4444`) cho giả mạo / hash không khớp.
  - Mathematical Highlighting: Indigo / Violet subtle badges cho các công thức $\alpha, p, k, r, s, v_1, v_2$.
- **Typography**:
  - Code/Numbers: `JetBrains Mono`, `Fira Code`, hoặc `SF Mono` với tracking chuẩn, font-feature tabular-nums để các số nguyên lớn BigInt và chuỗi Hex không bị nhảy layout.
  - Heading & UI: Inter / Plus Jakarta Sans / Be Vietnam Pro sạch sẽ, sắc sảo.

## 2. Interactive Components
- **Drag & Drop Zone**: Vùng thả file mượt mà với micro-interaction, hiển thị icon loại file và size.
- **Document & PDF Viewer**: Tích hợp Canvas preview, cho phép kéo thả con dấu điện tử (Visual Digital Seal).
- **Step-by-step Mathematical Visualizer**: Hiển thị bảng tính Euclid mở rộng, luỹ thừa nhanh và so sánh $v_1 \stackrel{?}{=} v_2$ với visual progress.
- **Real-time Integrity Indicator**: Đổi trạng thái tức thì khi sửa 1 ký tự trong văn bản.
