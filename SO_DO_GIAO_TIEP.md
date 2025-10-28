# 🔗 SƠ ĐỒ GIAO TIẾP (Communication Diagram / Collaboration Diagram)

> **Hệ thống QLBH - Phân tích sơ đồ giao tiếp**
> 
> **Cập nhật:** 24/10/2025

---

## 📚 ĐỊNH NGHĨA

### **Sơ đồ Giao tiếp là gì?**

**Communication Diagram** (hay còn gọi là **Collaboration Diagram**) là một loại sơ đồ UML mô tả **tương tác giữa các objects** trong hệ thống, tập trung vào:
- ✅ **Cấu trúc tổ chức** của các objects
- ✅ **Mối quan hệ** giữa các objects
- ✅ **Messages** được trao đổi (đánh số thứ tự)
- ✅ **Layout tự do** (không theo timeline)

---

## 🆚 SO SÁNH: SEQUENCE vs COMMUNICATION DIAGRAM

| Đặc điểm | Sequence Diagram | Communication Diagram |
|----------|------------------|----------------------|
| **Focus** | Timeline, thứ tự thời gian | Cấu trúc, mối quan hệ |
| **Layout** | Dọc (theo thời gian) | Tự do, linh hoạt |
| **Messages** | Theo trục thời gian | Đánh số (1, 2, 3...) |
| **Dễ đọc** | Dễ hiểu flow | Dễ thấy structure |
| **Khi nào dùng** | Hiểu quy trình | Hiểu kiến trúc |
| **Phức tạp** | Tốt cho flow dài | Tốt cho nhiều objects |

### **Ví dụ:**

**Sequence Diagram:**
```
User → UI → Controller → Service → Database
     (theo trục thời gian từ trên xuống)
```

**Communication Diagram:**
```
      User
       |
       ↓ 1: login()
      UI ←--→ Controller
          2: authenticate()  ↓
                         Service
                            ↓ 3: query()
                        Database
(layout tự do, messages đánh số)
```

---

## 🎯 CHỨC NĂNG PHÙ HỢP VỚI COMMUNICATION DIAGRAM

### **✅ Khi nào NÊN dùng Communication Diagram:**

1. **Hệ thống có nhiều components tương tác phức tạp**
   - Microservices architecture
   - Event-driven systems
   - Distributed systems

2. **Muốn nhấn mạnh kiến trúc hơn là flow**
   - System design documentation
   - Architecture review
   - Technical specifications

3. **Có nhiều objects tương tác song song**
   - Real-time systems
   - Multi-threaded operations
   - Concurrent processes

4. **Cần hiển thị relationships rõ ràng**
   - Dependencies giữa modules
   - Communication patterns
   - Integration points

---

## 🏗️ CÁC CHỨC NĂNG PHỨC TẠP TRONG HỆ THỐNG QLBH

### **🔥 Top 10 chức năng phù hợp:**

---

### **1. Hệ thống Xử lý Đơn hàng (Order Processing System)** 🔥🔥🔥

**Lý do:** Nhiều components tương tác phức tạp

**Components/Objects:**
```
┌─────────────┐
│   User      │
│  Interface  │
└──────┬──────┘
       │ 1: createOrder()
       ↓
┌─────────────────┐     2: validateStock()     ┌──────────────┐
│ Order Manager   │ ←─────────────────────────→ │  Inventory   │
│                 │                              │   System     │
└────────┬────────┘                              └──────────────┘
         │ 3: calculatePrice()
         ↓
    ┌────────────┐
    │  Pricing   │
    │   Engine   │
    └─────┬──────┘
          │ 4: applyDiscount()
          ↓
    ┌──────────────┐
    │  Promotion   │
    │   Service    │
    └──────────────┘
          ↓ 5: processPayment()
    ┌──────────────┐      6: authorize()      ┌─────────────┐
    │   Payment    │ ←────────────────────────→│  Payment    │
    │  Controller  │                            │  Gateway    │
    └──────┬───────┘                            └─────────────┘
           │ 7: createShipping()
           ↓
    ┌──────────────┐      8: assignDriver()   ┌─────────────┐
    │   Shipping   │ ←────────────────────────→│  Logistics  │
    │   Manager    │                            │   System    │
    └──────┬───────┘                            └─────────────┘
           │ 9: sendNotification()
           ↓
    ┌──────────────┐
    │ Notification │
    │   Service    │
    └──────────────┘
           │ 10: sendEmail() & 11: sendSMS()
           ↓                    ↓
    ┌──────────┐          ┌──────────┐
    │  Email   │          │   SMS    │
    │ Service  │          │ Service  │
    └──────────┘          └──────────┘
```

**Interactions:**
- Order Manager ↔ Inventory System (check stock)
- Order Manager → Pricing Engine (calculate)
- Pricing Engine → Promotion Service (discount)
- Payment Controller ↔ Payment Gateway (authorize)
- Shipping Manager ↔ Logistics System (assign)
- Notification Service → Email/SMS (notify)

---

### **2. Hệ thống Đăng ký & Xác thực (Auth System)** 🔥🔥

**Components/Objects:**
```
    ┌──────────┐
    │  Browser │
    └────┬─────┘
         │ 1: signup()
         ↓
    ┌──────────────┐    2: validateInput()    ┌────────────┐
    │  Auth API    │ ←──────────────────────→ │ Validator  │
    └──────┬───────┘                           └────────────┘
           │ 3: createUser()
           ↓
    ┌──────────────┐    4: hash()    ┌─────────────┐
    │  Supabase    │ ←──────────────→│  Bcrypt     │
    │    Auth      │                  │  Service    │
    └──────┬───────┘                  └─────────────┘
           │ 5: insertUser()
           ↓
    ┌──────────────┐    6: trigger    ┌──────────────┐
    │   Database   │ ←───────────────→│ DB Trigger:  │
    │  auth.users  │                   │ on_user_     │
    └──────────────┘                   │ created      │
           ↑                            └──────┬───────┘
           │ 7: createProfile()                │
           │                                   │
           └───────────────────────────────────┘
           │ 8: createAccount()
           ↓
    ┌──────────────┐
    │   Database   │
    │ public.users │
    └──────┬───────┘
           │ 9: generateToken()
           ↓
    ┌──────────────┐    10: sendEmail()   ┌─────────────┐
    │  Token Gen   │ ────────────────────→ │   Email     │
    └──────────────┘                        │  Service    │
                                            └─────────────┘
```

---

### **3. Dashboard Analytics System** 🔥

**Components/Objects:**
```
    ┌──────────────┐
    │  Dashboard   │
    │     UI       │
    └──────┬───────┘
           │ 1: loadDashboard()
           ↓
    ┌──────────────────────────────────────┐
    │      Dashboard Controller            │
    └──┬──────┬──────┬──────┬──────┬───────┘
       │      │      │      │      │
       │ 2    │ 3    │ 4    │ 5    │ 6
       ↓      ↓      ↓      ↓      ↓
┌──────────┐ │  ┌───────┐ │  ┌──────────┐
│ Orders   │ │  │Product│ │  │Customer  │
│ Service  │ │  │Service│ │  │ Service  │
└────┬─────┘ │  └───┬───┘ │  └────┬─────┘
     │       ↓      │     ↓       │
     │  ┌──────┐    │ ┌──────┐   │
     │  │Sales │    │ │Invent│   │
     │  │Serv. │    │ │ory   │   │
     │  └───┬──┘    │ └───┬──┘   │
     │      │       │     │       │
     └──────┴───────┴─────┴───────┘
           │ 7: aggregateData()
           ↓
    ┌──────────────┐    8: query    ┌──────────────┐
    │  Analytics   │ ←──────────────→│  Database    │
    │   Engine     │                  └──────────────┘
    └──────┬───────┘
           │ 9: formatChartData()
           ↓
    ┌──────────────┐
    │  Chart.js    │
    │   Renderer   │
    └──────────────┘
```

---

### **4. Real-time Chat System** 🔥

**Components/Objects:**
```
┌──────────┐                              ┌──────────┐
│Customer  │                              │ Support  │
│ Browser  │                              │ Browser  │
└────┬─────┘                              └────┬─────┘
     │ 1: sendMessage()                        │
     ↓                                         │
┌──────────────┐    2: authenticate()   ┌─────────────┐
│  WebSocket   │ ←─────────────────────→│  Auth       │
│   Client     │                         │  Middleware │
└──────┬───────┘                         └─────────────┘
       │ 3: publish()
       ↓
┌──────────────────────────────────────────────┐
│       Supabase Realtime Channel              │
└──────┬──────────────────────┬────────────────┘
       │ 4: persist()          │ 5: broadcast()
       ↓                       ↓
┌──────────────┐        ┌──────────────┐
│   Database   │        │  WebSocket   │
│ chat_messages│        │   Server     │
└──────────────┘        └──────┬───────┘
                               │ 6: notify()
                               ↓
                        ┌──────────────┐
                        │  Support     │
                        │  Browser     │
                        └──────────────┘
```

---

### **5. Payment Processing System** 🔥

**Components/Objects:**
```
    ┌──────────────┐
    │   Checkout   │
    │      UI      │
    └──────┬───────┘
           │ 1: initiatePayment()
           ↓
    ┌──────────────────────────────────┐
    │    Payment Controller            │
    └──┬─────────┬─────────┬───────────┘
       │         │         │
       │ 2       │ 3       │ 4
       ↓         ↓         ↓
┌──────────┐ ┌──────┐ ┌──────────┐
│ Validate │ │Fraud │ │ Currency │
│ Service  │ │Check │ │Converter │
└────┬─────┘ └───┬──┘ └────┬─────┘
     │           │         │
     └───────────┴─────────┘
           │ 5: processPayment()
           ↓
    ┌────────────────────────────────┐
    │    Payment Gateway Adapter     │
    └──┬──────────┬──────────┬───────┘
       │          │          │
       │ 6a       │ 6b       │ 6c
       ↓          ↓          ↓
┌──────────┐ ┌──────┐ ┌──────────┐
│  VNPay   │ │ Momo │ │  Stripe  │
│ Gateway  │ │  API │ │   API    │
└────┬─────┘ └───┬──┘ └────┬─────┘
     │           │         │
     └───────────┴─────────┘
           │ 7: handleResponse()
           ↓
    ┌──────────────┐    8: updateStatus    ┌──────────────┐
    │   Callback   │ ────────────────────→  │   Database   │
    │   Handler    │                        │   payments   │
    └──────┬───────┘                        └──────────────┘
           │ 9: notify()
           ↓
    ┌──────────────┐
    │ Notification │
    └──────────────┘
```

---

### **6. Search & Filter System** 🔥

**Components/Objects:**
```
    ┌──────────────┐
    │  Search UI   │
    └──────┬───────┘
           │ 1: search(query, filters)
           ↓
    ┌────────────────────────────────┐
    │    Search Controller           │
    └──┬──────────┬──────────┬───────┘
       │          │          │
       │ 2        │ 3        │ 4
       ↓          ↓          ↓
┌──────────┐ ┌──────┐ ┌──────────┐
│  Query   │ │Filter│ │  Sort    │
│ Builder  │ │Logic │ │ Manager  │
└────┬─────┘ └───┬──┘ └────┬─────┘
     │           │         │
     └───────────┴─────────┘
           │ 5: buildQuery()
           ↓
    ┌──────────────┐    6: execute    ┌──────────────┐
    │   Database   │ ←────────────────│   Cache      │
    │    Query     │                   │   Manager    │
    └──────┬───────┘    7: cache       └──────────────┘
           │                ↑
           │ 8: results     │
           ↓                │
    ┌──────────────┐        │
    │  Formatter   │────────┘
    │   Service    │ 9: format
    └──────┬───────┘
           │ 10: return
           ↓
    ┌──────────────┐
    │   Search UI  │
    └──────────────┘
```

---

### **7. Inventory Management System**

**Components/Objects:**
```
    ┌──────────────┐
    │  Product     │
    │  Manager     │
    └──────┬───────┘
           │ 1: checkStock()
           ↓
    ┌────────────────────────────────┐
    │   Inventory Controller         │
    └──┬──────────┬──────────┬───────┘
       │          │          │
       │ 2        │ 3        │ 4
       ↓          ↓          ↓
┌──────────┐ ┌──────┐ ┌──────────┐
│ Stock    │ │Reorder│ │ Warehouse│
│ Checker  │ │Alert │ │  Locator │
└────┬─────┘ └───┬──┘ └────┬─────┘
     │           │         │
     └───────────┴─────────┘
           │ 5: queryStock()
           ↓
    ┌──────────────┐    6: checkTrigger   ┌──────────────┐
    │   Database   │ ←────────────────────│  DB Trigger  │
    │   products   │                       │update_stock  │
    └──────┬───────┘                       └──────────────┘
           │ 7: notifyLowStock()
           ↓
    ┌──────────────┐
    │ Notification │
    └──────────────┘
```

---

### **8. Report Generation System**

**Components/Objects:**
```
    ┌──────────────┐
    │  Report UI   │
    └──────┬───────┘
           │ 1: generateReport(type, dateRange)
           ↓
    ┌────────────────────────────────────┐
    │     Report Generator               │
    └──┬──────────┬──────────┬───────────┘
       │          │          │
       │ 2        │ 3        │ 4
       ↓          ↓          ↓
┌──────────┐ ┌──────┐ ┌──────────┐
│ Data     │ │Filter│ │Aggregator│
│ Fetcher  │ │Engine│ │  Service │
└────┬─────┘ └───┬──┘ └────┬─────┘
     │           │         │
     └───────────┴─────────┘
           │ 5: fetchData()
           ↓
    ┌──────────────┐
    │   Database   │
    └──────┬───────┘
           │ 6: calculate()
           ↓
    ┌──────────────┐    7: render    ┌──────────────┐
    │  Chart       │ ←────────────────│  Template    │
    │  Generator   │                  │   Engine     │
    └──────┬───────┘                  └──────────────┘
           │ 8: export()
           ↓
    ┌──────────────┐
    │   jsPDF /    │
    │   Excel      │
    └──────────────┘
```

---

### **9. Multi-branch Management System**

**Components/Objects:**
```
    ┌──────────────┐
    │  Branch      │
    │  Manager UI  │
    └──────┬───────┘
           │ 1: manageBranch(action)
           ↓
    ┌────────────────────────────────────┐
    │    Branch Controller               │
    └──┬──────────┬──────────┬───────────┘
       │          │          │
       │ 2        │ 3        │ 4
       ↓          ↓          ↓
┌──────────┐ ┌──────┐ ┌──────────┐
│ Branch   │ │Staff │ │Inventory │
│ Service  │ │Mgmt  │ │ Manager  │
└────┬─────┘ └───┬──┘ └────┬─────┘
     │           │         │
     └───────────┴─────────┘
           │ 5: sync()
           ↓
    ┌──────────────┐    6: updateMap   ┌──────────────┐
    │   Database   │ ←─────────────────│   Leaflet    │
    │   branches   │                    │   Maps API   │
    └──────┬───────┘                    └──────────────┘
           │ 7: notifyChanges()
           ↓
    ┌──────────────┐
    │ Notification │
    │   Service    │
    └──────────────┘
```

---

### **10. User Permission System**

**Components/Objects:**
```
    ┌──────────────┐
    │  Admin UI    │
    └──────┬───────┘
           │ 1: assignPermission(user, role)
           ↓
    ┌────────────────────────────────────┐
    │   Permission Controller            │
    └──┬──────────┬──────────┬───────────┘
       │          │          │
       │ 2        │ 3        │ 4
       ↓          ↓          ↓
┌──────────┐ ┌──────┐ ┌──────────┐
│  Role    │ │Auth  │ │  Policy  │
│ Manager  │ │Check │ │  Engine  │
└────┬─────┘ └───┬──┘ └────┬─────┘
     │           │         │
     └───────────┴─────────┘
           │ 5: updatePermission()
           ↓
    ┌──────────────┐    6: checkRLS    ┌──────────────┐
    │   Database   │ ←─────────────────│  Supabase    │
    │   accounts   │                    │   RLS        │
    └──────┬───────┘                    └──────────────┘
           │ 7: logChange()
           ↓
    ┌──────────────┐
    │  Audit Log   │
    └──────────────┘
```

---

## 📊 BẢNG TỔNG KẾT

| # | Chức năng | Số Components | Complexity | Priority |
|---|-----------|---------------|------------|----------|
| 1 | Order Processing | 10+ | ⭐⭐⭐⭐⭐ | 🔥🔥🔥 |
| 2 | Auth System | 8 | ⭐⭐⭐⭐ | 🔥🔥 |
| 3 | Dashboard Analytics | 9 | ⭐⭐⭐⭐ | 🔥 |
| 4 | Real-time Chat | 6 | ⭐⭐⭐⭐ | 🔥 |
| 5 | Payment Processing | 9 | ⭐⭐⭐⭐⭐ | 🔥🔥🔥 |
| 6 | Search & Filter | 7 | ⭐⭐⭐ | ⭐ |
| 7 | Inventory Management | 7 | ⭐⭐⭐ | ⭐ |
| 8 | Report Generation | 8 | ⭐⭐⭐⭐ | ⭐⭐ |
| 9 | Multi-branch | 7 | ⭐⭐⭐ | ⭐ |
| 10 | Permission System | 7 | ⭐⭐⭐⭐ | ⭐⭐ |

---

## 🎯 KHUYẾN NGHỊ

### **Top 5 nên vẽ Communication Diagram:**

1. 🔥🔥🔥 **Order Processing System**
   - Lý do: Nhiều components phức tạp nhất
   - Components: 10+
   - Interactions: Bidirectional, complex

2. 🔥🔥🔥 **Payment Processing System**
   - Lý do: Multiple payment gateways
   - Components: 9
   - Patterns: Adapter pattern, callbacks

3. 🔥🔥 **Auth & Registration System**
   - Lý do: Database triggers, email service
   - Components: 8
   - Patterns: Event-driven

4. 🔥 **Dashboard Analytics System**
   - Lý do: Multiple data sources
   - Components: 9
   - Patterns: Aggregation, parallel queries

5. 🔥 **Real-time Chat System**
   - Lý do: WebSocket, real-time broadcast
   - Components: 6
   - Patterns: Pub/Sub, event-driven

---

## 💡 KHI NÀO DÙNG LOẠI NÀO?

| Mục đích | Dùng sơ đồ | Lý do |
|----------|-----------|-------|
| Hiểu flow step-by-step | Sequence Diagram | Dễ theo dõi timeline |
| Hiểu architecture | Communication Diagram | Thấy rõ structure |
| Thiết kế API | Sequence Diagram | Rõ request/response |
| Review system design | Communication Diagram | Thấy dependencies |
| Onboarding developers | Sequence Diagram | Dễ hiểu hơn |
| Technical documentation | Communication Diagram | Professional |
| Debug flow issues | Sequence Diagram | Trace execution |
| Refactor architecture | Communication Diagram | See big picture |

---

## ✅ TÓM TẮT

**Communication Diagram phù hợp với hệ thống QLBH vì:**
- ✅ Có nhiều components tương tác phức tạp
- ✅ Cần hiểu kiến trúc và dependencies
- ✅ Có distributed systems (Supabase, Payment gateways)
- ✅ Có real-time features (Chat, Notifications)
- ✅ Có event-driven patterns (Triggers, Webhooks)

**Khuyến nghị:**
- Dùng **Sequence Diagram** cho: Authentication flow, CRUD operations
- Dùng **Communication Diagram** cho: Order processing, Payment, Complex features

---

**🎉 Kết luận:** Hệ thống QLBH có **10 chức năng chính** rất phù hợp để vẽ Communication Diagram!

