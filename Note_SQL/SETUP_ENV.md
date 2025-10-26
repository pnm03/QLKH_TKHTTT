# 🔐 HƯỚNG DẪN SETUP BIẾN MÔI TRƯỜNG

## Tạo file `.env.local`

Tạo file `.env.local` trong thư mục root của dự án (`qlbh-system/`) với nội dung sau:

```env
# ============================================================================
# SUPABASE CONFIGURATION
# ============================================================================

# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://fbljfwcfipruuuvyyxuz.supabase.co

# Supabase Anon (Public) Key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibGpmd2NmaXBydXV1dnl5eHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTI0MjAsImV4cCI6MjA3Njc4ODQyMH0.kTedJ0ROkZ4913v_ENvem_8gXsREtpbEfxSX6i3P0yk

# ⚠️ QUAN TRỌNG: Service Role Key (chỉ dùng server-side)
# Lấy từ: Supabase Dashboard > Settings > API > service_role key
# KHÔNG BAO GIỜ để lộ key này ra client-side!
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Site URL (dùng cho authentication callbacks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ============================================================================
# PRODUCTION SETTINGS (khi deploy)
# ============================================================================
# Khi deploy lên production, thay đổi NEXT_PUBLIC_SITE_URL thành domain thật:
# NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## 📝 Các bước thực hiện:

### Bước 1: Lấy Service Role Key

1. Đăng nhập [Supabase Dashboard](https://app.supabase.com)
2. Chọn project: `fbljfwcfipruuuvyyxuz`
3. Vào **Settings** (biểu tượng bánh răng) → **API**
4. Scroll xuống phần **Project API keys**
5. Copy giá trị của **`service_role`** key (⚠️ Giữ bí mật!)
6. Thay `YOUR_SERVICE_ROLE_KEY_HERE` trong file `.env.local`

### Bước 2: Tạo file `.env.local`

```bash
# Trong thư mục qlbh-system/
# Tạo file mới
New-Item -ItemType File -Path ".env.local"

# Hoặc dùng notepad
notepad .env.local
```

Paste nội dung ở trên vào và **LƯU LẠI**.

### Bước 3: Restart Dev Server

```bash
# Dừng server hiện tại (Ctrl+C)
# Chạy lại
npm run dev
```

## ✅ Kiểm tra cấu hình

Tạo file test: `app/test-connection/page.tsx`

```typescript
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function TestConnection() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Test kết nối với database
  const { data: categories, error } = await supabase
    .from('Category')
    .select('*')
    .limit(5);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 Test Kết Nối Supabase</h1>
      
      <h2>✅ Thông tin cấu hình:</h2>
      <pre>{JSON.stringify({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      }, null, 2)}</pre>

      <h2>📊 Kết quả truy vấn Category:</h2>
      {error ? (
        <div style={{ color: 'red' }}>
          <strong>❌ Lỗi:</strong>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      ) : (
        <div style={{ color: 'green' }}>
          <strong>✅ Thành công!</strong>
          <pre>{JSON.stringify(categories, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

Truy cập: `http://localhost:3000/test-connection`

## 🔒 Bảo mật

### ⚠️ CẨN THẬN:

1. **KHÔNG** commit file `.env.local` lên Git
2. **KHÔNG** share Service Role Key với ai
3. **CHỈ** sử dụng Service Role Key ở server-side (API routes, Server Components)
4. **Anon Key** có thể dùng ở client-side (an toàn)

### File `.gitignore` cần có:

```gitignore
# Biến môi trường
.env
.env.local
.env*.local
.env.development.local
.env.test.local
.env.production.local
```

## 🚀 Production Deployment

Khi deploy lên Vercel/Netlify/Railway:

1. Thêm các biến môi trường trong dashboard của platform
2. **KHÔNG** để `.env.local` trong source code
3. Cập nhật `NEXT_PUBLIC_SITE_URL` thành domain thật

### Vercel:

```bash
Settings > Environment Variables > Add
```

### Netlify:

```bash
Site settings > Build & deploy > Environment > Environment variables
```

---

**✅ Hoàn tất! Bây giờ dự án đã sẵn sàng kết nối với Supabase.**

