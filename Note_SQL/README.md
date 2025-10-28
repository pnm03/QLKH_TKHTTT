# 📚 THƯ MỤC TÀI LIỆU SQL - DỰ ÁN QLBH

> **Cập nhật:** 28/10/2025  
> **Trạng thái:** Database đã được tạo lại theo schema gốc ổn định

---

## 🎯 QUICK START

### ✅ **Tạo lại database từ đầu**
👉 **CHẠY FILE:** `RECREATE_DATABASE_FROM_ORIGINAL.sql`  
👉 **ĐỌC HƯỚNG DẪN:** `HUONG_DAN_TAO_LAI_DATABASE.md`

### ✅ **Đồng bộ user từ auth.users**
👉 **CHẠY FILE:** `DONG_BO_USER.sql`

### ✅ **Kiểm tra database**
👉 **CHẠY FILE:** `CHECK_DATABASE.sql` hoặc `CHECK_TRIGGER_HIEN_TAI.sql`

---

## 📂 DANH SÁCH FILE (ĐÃ DỌN DẸP)

### **🚀 SETUP DATABASE**

| File | Mô tả | Khi nào dùng |
|------|-------|--------------|
| **RECREATE_DATABASE_FROM_ORIGINAL.sql** | 🎯 **FILE CHÍNH** - Tạo lại toàn bộ database | Setup lần đầu hoặc reset database |
| **DISABLE_RLS.sql** | 🔓 **TẮT RLS** - Tắt hết Row Level Security | Khi gặp lỗi permission trong dev |
| **HUONG_DAN_TAO_LAI_DATABASE.md** | 📖 Hướng dẫn chi tiết từng bước | Đọc trước khi chạy SQL |
| **DONG_BO_USER.sql** | 👥 Đồng bộ user từ auth.users | Khi cần sync lại users |
| **database.txt** | 📋 Schema gốc đã hoạt động ổn định | Tham khảo cấu trúc database |
| **tao_sql.sql** | 💾 Backup schema cũ | Tham khảo |

### **🔧 KIỂM TRA & DEBUG**

| File | Mô tả | Khi nào dùng |
|------|-------|--------------|
| **CHECK_DATABASE.sql** | Kiểm tra số lượng users, tables | Khi cần xem tổng quan database |
| **CHECK_TRIGGER_HIEN_TAI.sql** | Kiểm tra triggers có hoạt động không | Khi nghi ngờ trigger bị lỗi |

### **📖 TÀI LIỆU**

| File | Mô tả |
|------|-------|
| **SETUP_ENV.md** | Hướng dẫn cấu hình .env.local |
| **README.md** | File này - Tổng quan thư mục |

---

## 🚀 QUY TRÌNH SETUP ĐƠN GIẢN

```
1. Tạo project Supabase mới
   ↓
2. Cập nhật .env.local (xem SETUP_ENV.md)
   ↓
3. Chạy RECREATE_DATABASE_FROM_ORIGINAL.sql
   ↓
4. Chạy DONG_BO_USER.sql (nếu đã có users trong auth)
   ↓
5. Restart dev server: npm run dev
   ↓
6. Done! 🎉
```

**Thời gian:** ~5 phút

---

## 🗄️ CẤU TRÚC DATABASE

### **Bảng chính (12 bảng):**
- ✅ **branches** - Chi nhánh
- ✅ **users** - Người dùng
- ✅ **accounts** - Tài khoản
- ✅ **customers** - Khách hàng
- ✅ **staff** - Nhân viên
- ✅ **category** - Danh mục
- ✅ **products** - Sản phẩm
- ✅ **payments** - Thanh toán
- ✅ **orders** - Đơn hàng
- ✅ **orderdetails** - Chi tiết đơn
- ✅ **shippings** - Vận chuyển
- ✅ **returns** - Đổi/trả

### **Triggers tự động (theo database.txt gốc):**
1. ✅ **trigger_calculate_subtotal** - Tự động tính `subtotal = quantity × unit_price`
2. ✅ **trigger_update_stock** - Tự động giảm tồn kho khi bán
3. ✅ **CASCADE DELETE** - Tự động xóa orderdetails khi xóa order

### **RLS Policies:**
- ✅ Authenticated users có thể xem/thêm dữ liệu
- ✅ Admin có quyền cao hơn

---

## 🐛 TROUBLESHOOTING

| Vấn đề | Giải pháp |
|--------|-----------|
| Lỗi "relation does not exist" | Chạy `RECREATE_DATABASE_FROM_ORIGINAL.sql` |
| User không có trong users/accounts | Chạy `DONG_BO_USER.sql` |
| Lỗi permission/RLS khi insert/update | Chạy `DISABLE_RLS.sql` 🔥 |
| Lỗi "hight column not found" | Schema đã đúng (`hight` không phải `height`) |
| Không kết nối được Supabase | Kiểm tra `.env.local` (xem `SETUP_ENV.md`) |

---

## 📊 THỐNG KÊ

- **Total files:** 8 files (đã dọn dẹp từ 20+ files)
- **Tables:** 12 bảng chính
- **Triggers:** 2 triggers + cascade delete
- **RLS Policies:** Đầy đủ cho tất cả tables

---

## 🎓 LƯU Ý QUAN TRỌNG

1. ⚠️ **Schema GỐC** trong `database.txt` sử dụng `hight` (không phải `height`)
2. ⚠️ Bảng `shippings` **KHÔNG CÓ** các cột: `name_customer`, `phone_customer`, `unit_size`, `cod_shipping`
3. ⚠️ Tất cả tables dùng **chữ thường** (lowercase)
4. ✅ File `RECREATE_DATABASE_FROM_ORIGINAL.sql` đã bao gồm:
   - Drop all tables
   - Tạo lại theo schema gốc
   - Triggers
   - RLS policies

---

## 📞 CẦN TRỢ GIÚP?

1. **Đọc `HUONG_DAN_TAO_LAI_DATABASE.md`** - Hướng dẫn chi tiết
2. **Check logs** trong Supabase Dashboard → Logs
3. **Chạy `CHECK_DATABASE.sql`** - Xem tổng quan database

---

**🚀 Bắt đầu với `RECREATE_DATABASE_FROM_ORIGINAL.sql` ngay!**

