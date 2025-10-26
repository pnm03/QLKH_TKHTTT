# 🚀 HƯỚNG DẪN DEPLOY DỰ ÁN QLBH

> **Cập nhật:** 24/10/2025

---

## 📋 CHUẨN BỊ TRƯỚC KHI DEPLOY

### ✅ **Checklist:**

- [ ] Database đã setup xong trên Supabase
- [ ] Đã chạy `FULL_DATABASE_SETUP.sql`
- [ ] Đã chạy `FIX_TABLE_NAMES_LOWERCASE.sql`
- [ ] Đã chạy `ALL_TRIGGERS_COMPLETE.sql`
- [ ] Đã chạy `FIX_RLS_POLICIES.sql`
- [ ] Đã có Supabase URL và Keys
- [ ] Code chạy OK trên localhost

---

## 🎯 KHUYẾN NGHỊ: DEPLOY LÊN VERCEL

**Lý do:** 
- ✅ Miễn phí
- ✅ Dễ nhất
- ✅ Tích hợp tốt với Next.js
- ✅ Tự động deploy khi push code

---

## 🚀 CÁCH 1: DEPLOY LÊN VERCEL (Khuyến nghị)

### **Bước 1: Chuẩn bị Git Repository**

```bash
cd E:\APP_KY2_NAM2\QLBH_TKHTTTQL\qlbh-system

# Khởi tạo git (nếu chưa có)
git init

# Thêm tất cả files
git add .

# Commit
git commit -m "Ready for deployment"
```

### **Bước 2: Đẩy code lên GitHub**

1. **Tạo repository trên GitHub:**
   - Vào https://github.com/new
   - Tên repo: `qlbh-system`
   - Public hoặc Private đều được
   - **KHÔNG** tick "Initialize with README"
   - Click **"Create repository"**

2. **Push code lên GitHub:**
   ```bash
   # Thay YOUR_USERNAME bằng username GitHub của bạn
   git remote add origin https://github.com/YOUR_USERNAME/qlbh-system.git
   git branch -M main
   git push -u origin main
   ```

### **Bước 3: Deploy lên Vercel**

1. **Vào https://vercel.com**
2. Click **"Sign Up"** hoặc **"Log In"** (dùng GitHub account)
3. Click **"Add New Project"**
4. **Import** repository `qlbh-system` vừa tạo
5. **Configure Project:**
   - Framework Preset: **Next.js** (tự động detect)
   - Root Directory: `./` (giữ nguyên)
   - Build Command: `npm run build` (tự động)
   - Output Directory: `.next` (tự động)

6. **Environment Variables** (QUAN TRỌNG!):
   Click **"Environment Variables"** và thêm:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://fbljfwcfipruuuvyyxuz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibGpmd2NmaXBydXV1dnl5eHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTI0MjAsImV4cCI6MjA3Njc4ODQyMH0.kTedJ0ROkZ4913v_ENvem_8gXsREtpbEfxSX6i3P0yk
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
   ```

   ⚠️ **Lưu ý:** 
   - Thay `your_service_role_key_here` bằng key thật từ Supabase
   - `NEXT_PUBLIC_SITE_URL` sẽ update sau khi deploy

7. Click **"Deploy"**
8. Đợi ~3-5 phút
9. ✅ **Xong!** Bạn sẽ có link: `https://qlbh-system-xxx.vercel.app`

### **Bước 4: Cập nhật SITE_URL**

1. Copy URL vừa được: `https://qlbh-system-xxx.vercel.app`
2. Vào **Vercel Dashboard** → **Settings** → **Environment Variables**
3. Sửa `NEXT_PUBLIC_SITE_URL` thành URL vừa copy
4. **Redeploy:** Deployments → ... → Redeploy

### **Bước 5: Cấu hình Supabase**

1. Vào **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Thêm vào **Redirect URLs:**
   ```
   https://qlbh-system-xxx.vercel.app/auth/callback
   https://qlbh-system-xxx.vercel.app
   ```
3. Thêm vào **Site URL:**
   ```
   https://qlbh-system-xxx.vercel.app
   ```

---

## 🌐 CÁCH 2: DEPLOY LÊN NETLIFY

### **Bước 1-2:** Giống Vercel (push code lên GitHub)

### **Bước 3: Deploy lên Netlify**

1. Vào https://netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Chọn **GitHub** → Authorize → Chọn repo `qlbh-system`
4. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`
5. **Environment variables:** (giống Vercel)
6. Click **"Deploy site"**
7. ✅ Xong! URL: `https://qlbh-system-xxx.netlify.app`

---

## 🐳 CÁCH 3: DEPLOY LÊN RENDER (Free tier)

### **Bước 1: Tạo `render.yaml`**

File đã có sẵn template, hoặc tạo mới:

```yaml
services:
  - type: web
    name: qlbh-system
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NEXT_PUBLIC_SUPABASE_URL
        value: https://fbljfwcfipruuuvyyxuz.supabase.co
      - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
        value: your_anon_key
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: NEXT_PUBLIC_SITE_URL
        sync: false
```

### **Bước 2: Deploy**

1. Vào https://render.com
2. **New** → **Web Service**
3. Connect GitHub repo
4. Render sẽ auto-detect `render.yaml`
5. Click **"Create Web Service"**

---

## 🔧 XỬ LÝ LỖI SAU KHI DEPLOY

### **Lỗi 1: "Failed to load data"**

**Nguyên nhân:** Environment variables chưa đúng

**Giải pháp:**
1. Check lại ENV vars trong dashboard
2. Đảm bảo không có khoảng trắng thừa
3. Redeploy

### **Lỗi 2: "Authentication error"**

**Nguyên nhân:** Chưa config Redirect URLs trong Supabase

**Giải pháp:**
1. Supabase Dashboard → Authentication → URL Configuration
2. Thêm production URL vào Redirect URLs
3. Refresh app

### **Lỗi 3: "Build failed"**

**Nguyên nhân:** Lỗi compile hoặc dependencies

**Giải pháp:**
```bash
# Test build local trước
npm run build

# Nếu OK → Push lại
git add .
git commit -m "Fix build"
git push
```

### **Lỗi 4: "Database connection failed"**

**Nguyên nhân:** RLS policies chặn

**Giải pháp:**
- Chạy lại `FIX_RLS_POLICIES.sql` trên Supabase
- Đảm bảo policies cho phép authenticated users

---

## 📊 SO SÁNH CÁC NỀN TẢNG

| Tính năng | Vercel | Netlify | Render |
|-----------|--------|---------|--------|
| Giá | ✅ Free | ✅ Free | ✅ Free |
| Dễ dùng | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Next.js | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Build time | ~3 phút | ~4 phút | ~5 phút |
| Auto deploy | ✅ | ✅ | ✅ |
| Custom domain | ✅ Free | ✅ Free | ✅ Free |

**Khuyến nghị:** **Vercel** - Tốt nhất cho Next.js

---

## 🎯 CHECKLIST SAU KHI DEPLOY

- [ ] Website accessible (vào được link)
- [ ] Login/Signup hoạt động
- [ ] Dashboard hiển thị dữ liệu
- [ ] Tìm kiếm users hoạt động
- [ ] Tạo đơn hàng hoạt động
- [ ] Thêm sản phẩm hoạt động
- [ ] Email verification hoạt động (nếu có)

---

## 🔐 BẢO MẬT

### **Những gì KHÔNG nên commit lên Git:**

✅ **Đã có trong `.gitignore`:**
- `.env.local`
- `.env`
- `node_modules/`
- `.next/`

⚠️ **Kiểm tra kỹ:**
```bash
# Xem file nào sẽ được commit
git status

# Nếu thấy .env.local → XÓA NGAY
git rm --cached .env.local
```

---

## 📝 AUTO DEPLOY KHI CẬP NHẬT CODE

Sau khi deploy lần đầu, mỗi lần push code mới:

```bash
git add .
git commit -m "Update feature XYZ"
git push
```

→ Vercel/Netlify/Render sẽ **tự động deploy** lại! 🚀

---

## 🆘 ROLLBACK NẾU LỖI

### **Trên Vercel:**
1. Dashboard → Deployments
2. Tìm deployment trước đó (working)
3. Click ... → **Promote to Production**

### **Trên Netlify:**
1. Deploys
2. Tìm deploy cũ
3. Click **Publish deploy**

---

## 📞 HỖ TRỢ

- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**🎉 Chúc bạn deploy thành công!**

