# 📚 THƯ MỤC TÀI LIỆU SQL - DỰ ÁN QLBH

> **Cập nhật:** 24/10/2025

---

## 🎯 BẠN Ở ĐÂU?

### ✅ **Mới bắt đầu / Mất database cũ**
👉 **ĐỌC FILE:** `START_HERE.md`

### ✅ **Đã setup xong, đang gặp vấn đề**
👉 **ĐỌC FILE:** `CHECK_TRIGGER_HIEN_TAI.sql` (chạy để kiểm tra)

### ✅ **User không tự động đồng bộ**
👉 **CHẠY FILE:** `FIX_USER_SYNC_TRIGGER.sql`

---

## 📂 DANH SÁCH FILE

### **🚀 SETUP DATABASE**

| File | Mô tả | Khi nào dùng |
|------|-------|--------------|
| **START_HERE.md** | 🎯 **BẮT ĐẦU TẠI ĐÂY** | Setup lần đầu hoặc setup lại |
| **FULL_DATABASE_SETUP.sql** | File SQL tạo toàn bộ database | Chạy đầu tiên (bước 1) |
| **FIX_TABLE_NAMES_LOWERCASE.sql** | 🔧 Đổi tên bảng về chữ thường | Chạy sau bước 1 (bước 2) ⭐ |
| **ALL_TRIGGERS_COMPLETE.sql** | ⚡ 12 triggers hoàn chỉnh | Chạy sau bước 2 (bước 3) |
| **HUONG_DAN_SETUP_DATABASE.md** | Hướng dẫn chi tiết từng bước | Đọc để hiểu rõ hơn |

### **🔧 FIX & TROUBLESHOOT**

| File | Mô tả | Khi nào dùng |
|------|-------|--------------|
| **CHECK_TRIGGER_HIEN_TAI.sql** | Kiểm tra trigger có hoạt động không | Khi nghi ngờ trigger bị lỗi |
| **FIX_USER_SYNC_TRIGGER.sql** | Sửa trigger đồng bộ user | Khi user không tự động vào Users/Accounts |
| **HUONG_DAN_FIX_SYNC.md** | Hướng dẫn fix đồng bộ user | Đọc trước khi chạy FIX |

### **📖 TÀI LIỆU THAM KHẢO**

| File | Mô tả |
|------|-------|
| **00_README_SETUP.md** | Tổng quan toàn bộ dự án |
| **SETUP_ENV.md** | Hướng dẫn cấu hình .env.local |
| **CHECK_SETUP.md** | Checklist kiểm tra setup |
| **database.txt** | Mô tả cấu trúc database |
| **tao_sql.sql** | File SQL backup (cũ) |

---

## 🔄 QUY TRÌNH SETUP CHUẨN

```
1. Đọc START_HERE.md
   ↓
2. Tạo project Supabase
   ↓
3. Cập nhật .env.local
   ↓
4. Chạy FULL_DATABASE_SETUP.sql (tạo bảng, indexes)
   ↓
5. Chạy FIX_TABLE_NAMES_LOWERCASE.sql 🔧 (đổi tên về chữ thường)
   ↓
6. Chạy ALL_TRIGGERS_COMPLETE.sql ⚡ (12 triggers)
   ↓
7. Test tìm kiếm user (phải hiển thị được danh sách)
   ↓
8. Done! 🎉
   
   Nếu lỗi → Chạy CHECK_TRIGGER_HIEN_TAI.sql để kiểm tra
```

---

## ⚡ QUICK COMMANDS

### **Tạo database lần đầu:**
```
Bước 1: Tạo cấu trúc
1. Copy FULL_DATABASE_SETUP.sql
2. Paste vào Supabase SQL Editor
3. Run (đợi 1-2 phút)

Bước 2: Đổi tên bảng 🔧
1. Copy FIX_TABLE_NAMES_LOWERCASE.sql
2. Paste vào SQL Editor (query mới)
3. Run (đợi 10 giây)

Bước 3: Thêm triggers ⚡
1. Copy ALL_TRIGGERS_COMPLETE.sql
2. Paste vào SQL Editor (query mới)
3. Run (đợi 30 giây)
```

### **Kiểm tra trigger:**
```sql
-- Copy và chạy CHECK_TRIGGER_HIEN_TAI.sql
```

### **Fix đồng bộ user:**
```sql
-- Copy và chạy FIX_USER_SYNC_TRIGGER.sql
```

---

## 🗄️ CẤU TRÚC DATABASE

### **Bảng chính (12 bảng):**
- ✅ Branches (Chi nhánh)
- ✅ Users (Người dùng)
- ✅ Accounts (Tài khoản)
- ✅ Customers (Khách hàng)
- ✅ Staff (Nhân viên)
- ✅ Category (Danh mục)
- ✅ Products (Sản phẩm)
- ✅ Payments (Thanh toán)
- ✅ Orders (Đơn hàng)
- ✅ Orderdetails (Chi tiết đơn)
- ✅ Shippings (Vận chuyển)
- ✅ Returns (Đổi/trả)

### **Bảng chat (4 bảng):**
- ✅ chat_conversations
- ✅ chat_participants
- ✅ chat_messages
- ✅ chat_message_status

### **Triggers quan trọng:**
- ✅ `on_auth_user_created` - Tự động tạo Users/Accounts khi đăng ký
- ✅ `trg_calculate_orderdetail_subtotal` - Tự động tính tổng tiền
- ✅ `trg_update_product_stock` - Tự động cập nhật tồn kho

### **Functions hữu ích:**
- ✅ `get_top_shipped_products_v2(limit)` - Top sản phẩm bán chạy
- ✅ `admin_delete_user(uuid)` - Xóa user (admin)
- ✅ `handle_new_user()` - Đồng bộ user mới

---

## 🐛 TROUBLESHOOTING NHANH

| Vấn đề | Giải pháp |
|--------|-----------|
| User không tự động vào Users/Accounts | Chạy `FIX_USER_SYNC_TRIGGER.sql` |
| Lỗi "relation does not exist" | Chạy lại `FULL_DATABASE_SETUP.sql` |
| Lỗi "permission denied" | Kiểm tra RLS policies |
| Không kết nối được Supabase | Kiểm tra `.env.local` |

---

## 📞 CẦN TRỢ GIÚP?

1. **Đọc lại START_HERE.md** - Hướng dẫn rõ nhất
2. **Check logs** trong Supabase Dashboard → Logs
3. **Xem HUONG_DAN_SETUP_DATABASE.md** - Chi tiết đầy đủ

---

## 🎓 LINK THAM KHẢO

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)

---

**🚀 Bắt đầu với START_HERE.md ngay!**

