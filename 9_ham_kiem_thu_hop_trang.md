# 9 HÀM KIỂM THỬ HỘP TRẮNG

---

## Bán hàng POS & Tồn kho

### Hàm 1: `validateStockBeforeCheckout()` — Kiểm tra tồn kho trước thanh toán
- **File:** `app/dashboard/sales/create/page.tsx` — Dòng 848–904 (57 dòng)
- **V(G) = 7** | Cấu trúc: Vòng lặp lồng `for ← for` + `Map` + `if`

```typescript
const validateStockBeforeCheckout = () => {
  // Tạo một Map để theo dõi tổng số lượng cần mua cho mỗi sản phẩm
  const productQuantities = new Map();

  // Tính tổng số lượng cần mua cho mỗi sản phẩm
  for (const invoice of invoices) {
    for (const product of invoice.products) {
      const productId = product.product_id;
      const quantity = product.quantity || 1;

      if (productQuantities.has(productId)) {
        productQuantities.set(productId, productQuantities.get(productId) + quantity);
      } else {
        productQuantities.set(productId, quantity);
      }
    }
  }

  // Kiểm tra tồn kho cho từng sản phẩm
  let hasStockError = false;
  const stockErrors = [];

  for (const invoice of invoices) {
    for (const product of invoice.products) {
      const productId = product.product_id;
      const totalQuantity = productQuantities.get(productId);
      const stockQuantity = product.stock_quantity || 0;

      if (totalQuantity > stockQuantity) {
        hasStockError = true;
        stockErrors.push({
          productId,
          productName: product.product_name,
          required: totalQuantity,
          available: stockQuantity
        });
      }
    }
  }

  // Hiển thị thông báo lỗi nếu có sản phẩm vượt quá tồn kho
  if (hasStockError) {
    let errorMessage = 'Không đủ tồn kho cho các sản phẩm sau:\n\n';

    stockErrors.forEach(error => {
      errorMessage += `- ${error.productName}: Cần ${error.required}, chỉ còn ${error.available} trong kho\n`;
    });

    errorMessage += '\nVui lòng điều chỉnh số lượng hoặc chọn sản phẩm khác.';

    alert(errorMessage);
    return false;
  }

  return true;
};
```

---

### Hàm 2: `handleInputChange()` — Xử lý nhập giá & kho sản phẩm
- **File:** `app/dashboard/products/add/page.tsx` — Dòng 190–225 (36 dòng)
- **V(G) = 5** | Cấu trúc: `if` phân loại trường → `if - else if - else` (price/cost_price/stock)

```typescript
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target

  // Xử lý riêng cho các trường số
  if (name === 'price' || name === 'stock_quantity' || name === 'cost_price') {
    // Loại bỏ dấu phân cách nếu có
    const cleanValue = value.replace(/\./g, '')
    // Chỉ cho phép nhập số
    const numericValue = cleanValue.replace(/[^0-9]/g, '')
    const numberValue = numericValue ? parseInt(numericValue) : 0
    
    if (name === 'price') {
      setFormData(prev => ({
        ...prev,
        price: numberValue,
        formattedPrice: formatNumber(numberValue)
      }))
    } else if (name === 'cost_price') {
      setFormData(prev => ({
        ...prev,
        cost_price: numberValue,
        formattedCostPrice: formatNumber(numberValue)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: numberValue
      }))
    }
  } else {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
}
```

---

### Hàm 3: `deleteInvoice()` — Xóa hóa đơn bán hàng
- **File:** `app/dashboard/sales/create/page.tsx` — Dòng 744–771 (28 dòng)
- **V(G) = 4** | Cấu trúc: Guard clause `if (≤1)` + `if - else if` tính lại index

```typescript
const deleteInvoice = (index: number, event: React.MouseEvent) => {
  // Ngăn chặn sự kiện click lan sang button hóa đơn
  event.stopPropagation()

  // Không cho phép xóa nếu chỉ còn 1 hóa đơn
  if (invoices.length <= 1) {
    alert('Không thể xóa hóa đơn cuối cùng')
    return
  }

  // Xóa hóa đơn
  const updatedInvoices = [...invoices]
  updatedInvoices.splice(index, 1)
  setInvoices(updatedInvoices)

  // Điều chỉnh active index nếu cần
  if (index === activeInvoiceIndex) {
    // Nếu xóa hóa đơn đang active, chuyển active về hóa đơn đầu tiên
    setActiveInvoiceIndex(0)
  } else if (index < activeInvoiceIndex) {
    // Nếu xóa hóa đơn trước hóa đơn active, giảm index xuống 1
    setActiveInvoiceIndex(activeInvoiceIndex - 1)
  }

  // Xóa các lỗi khi chuyển hóa đơn
  setQuantityErrors({})
}
```

---

## 👩‍💻 2: Thanh toán & Khách hàng

### Hàm 4: `handleQuickSale()` — Bấm nút thanh toán nhanh POS
- **File:** `app/dashboard/sales/create/page.tsx` — Dòng 1017–1051 (35 dòng)
- **V(G) = 5** | Cấu trúc: 3 guard clauses tuần tự + tính toán tổng tiền/tiền thừa

```typescript
const handleQuickSale = () => {
  if (!selectedPaymentMethod) {
    alert('Vui lòng chọn phương thức thanh toán');
    return;
  }

  // Kiểm tra tồn kho trước khi thanh toán
  if (!validateStockBeforeCheckout()) {
    return;
  }

  const totalAmountToPay = calculateTotalAllInvoices().amountToPay;
  const paid = parseInt(customerPaid) || 0;

  if (paid < totalAmountToPay) {
    alert('Số tiền khách trả không đủ');
    return;
  }

  // Lấy thông tin phương thức thanh toán đã chọn
  const selectedMethod = paymentMethods.find(method => method.payment_id === selectedPaymentMethod);

  // Chuẩn bị dữ liệu thanh toán để hiển thị trong popup xác nhận
  setPaymentData({
    invoice: invoices[activeInvoiceIndex],
    totalAmount: totalAmountToPay,
    customerPaid: paid,
    change: calculateChange(),
    paymentMethod: selectedMethod
  });

  // Hiển thị popup xác nhận thanh toán và ẩn popup thanh toán nhanh
  setShowConfirmPaymentPopup(true);
  setShowQuickSalePopup(false);
};
```

---

### Hàm 5: `validateNewCustomerForm()` — Xác thực form khách hàng mới
- **File:** `app/dashboard/sales/create/page.tsx` — Dòng 608–632 (25 dòng)
- **V(G) = 6** | Cấu trúc: 3 khối `if` tuần tự, mỗi khối chứa `if - else if` với Regex

```typescript
const validateNewCustomerForm = () => {
  const errors: Record<string, string> = {}

  // Kiểm tra tên
  if (!newCustomer.full_name?.trim()) {
    errors.full_name = 'Họ tên không được để trống'
  }

  // Kiểm tra số điện thoại
  if (!newCustomer.phone?.trim()) {
    errors.phone = 'Số điện thoại không được để trống'
  } else if (!/^0\d{9,10}$/.test(newCustomer.phone)) {
    errors.phone = 'Số điện thoại phải bắt đầu bằng số 0 và có 10-11 số'
  }

  // Kiểm tra email
  if (!newCustomer.email?.trim()) {
    errors.email = 'Email không được để trống'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) {
    errors.email = 'Email không hợp lệ'
  }

  setAddCustomerErrors(errors)
  return Object.keys(errors).length === 0
}
```

---

### Hàm 6: `addNewCustomer()` — Thêm khách hàng mới khi bán hàng
- **File:** `app/dashboard/sales/create/page.tsx` — Dòng 635–716 (82 dòng)
- **V(G) = 7** | Cấu trúc: `try-catch-finally` → kiểm tra trùng (phone/email) → `catch` phân loại mã lỗi DB `23505`

```typescript
const addNewCustomer = async () => {
  if (!validateNewCustomerForm()) {
    return
  }

  setAddCustomerLoading(true)

  try {
    // Kiểm tra khách hàng đã tồn tại
    const { data: existingCustomer, error: checkError } = await supabase
      .from('customers')
      .select('*')
      .or(`phone.eq.${newCustomer.phone},email.eq.${newCustomer.email}`)
      .maybeSingle()

    if (checkError) throw checkError

    if (existingCustomer) {
      if (existingCustomer.phone === newCustomer.phone) {
        setAddCustomerErrors({
          ...addCustomerErrors,
          phone: 'Số điện thoại này đã được sử dụng bởi khách hàng khác'
        })
        return
      }

      if (existingCustomer.email === newCustomer.email) {
        setAddCustomerErrors({
          ...addCustomerErrors,
          email: 'Email này đã được sử dụng bởi khách hàng khác'
        })
        return
      }
    }

    // Thêm khách hàng mới
    const { data: insertedCustomer, error: insertError } = await supabase
      .from('customers')
      .insert([newCustomer])
      .select()
      .single()

    if (insertError) throw insertError

    // Chọn khách hàng vừa thêm
    if (insertedCustomer) {
      selectCustomer(insertedCustomer)
      setSuccessMessage('Thêm khách hàng mới thành công!')

      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)

      // Đóng modal
      closeAddCustomerModal()
    }
  } catch (error: any) {
    console.error('Lỗi khi thêm khách hàng mới:', error)

    // Xử lý lỗi trùng lặp từ Supabase
    if (error.code === '23505') {
      if (error.message.includes('customers_email_key')) {
        setAddCustomerErrors({
          ...addCustomerErrors,
          email: 'Email này đã được sử dụng bởi khách hàng khác'
        })
      } else if (error.message.includes('customers_phone_key')) {
        setAddCustomerErrors({
          ...addCustomerErrors,
          phone: 'Số điện thoại này đã được sử dụng bởi khách hàng khác'
        })
      } else {
        setSuccessMessage('Có lỗi xảy ra khi thêm khách hàng mới')
      }
    } else {
      setSuccessMessage('Có lỗi xảy ra khi thêm khách hàng mới')
    }
  } finally {
    setAddCustomerLoading(false)
  }
}
```

---

## 👨‍💻 3: Giỏ hàng, Nhập hàng & Nhân viên

### Hàm 7: `addProductToOrder()` — Thêm sản phẩm vào đơn hàng POS
- **File:** `app/dashboard/sales/create/page.tsx` — Dòng 333–377 (45 dòng)
- **V(G) = 4** | Cấu trúc: `if-else` (SP đã tồn tại → cộng SL, chưa có → tạo mới) + `reduce` tính tổng

```typescript
const addProductToOrder = (product: ProductInOrder) => {
  const updatedInvoices = [...invoices]
  const currentInvoice = updatedInvoices[activeInvoiceIndex]

  const existingProductIndex = currentInvoice.products.findIndex(p => p.product_id === product.product_id)

  if (existingProductIndex >= 0) {
    // Nếu sản phẩm đã tồn tại, tăng số lượng
    currentInvoice.products[existingProductIndex].quantity += 1
    currentInvoice.products[existingProductIndex].total =
      currentInvoice.products[existingProductIndex].price *
      currentInvoice.products[existingProductIndex].quantity -
      currentInvoice.products[existingProductIndex].discount

    // Đã loại bỏ việc cập nhật tồn kho thủ công vì sử dụng trigger trong cơ sở dữ liệu
  } else {
    // Nếu sản phẩm chưa có, thêm mới
    const newProduct: ProductInOrder = {
      product_id: product.product_id || '',
      product_name: product.product_name || '',
      price: parseFloat(product.price) || 0,
      quantity: 1,
      discount: 0,
      total: parseFloat(product.price) || 0,
      stock_quantity: product.stock_quantity || 0,
      color: product.color || '',
      size: product.size || ''
    }
    currentInvoice.products.push(newProduct)

    // Đã loại bỏ việc cập nhật tồn kho thủ công vì sử dụng trigger trong cơ sở dữ liệu
  }

  // Tính lại tổng tiền ngay sau khi thêm sản phẩm
  const subtotal = currentInvoice.products.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const discount = currentInvoice.products.reduce((sum, item) => sum + item.discount, 0)

  currentInvoice.totalAmount = subtotal
  currentInvoice.totalDiscount = discount
  currentInvoice.amountToPay = subtotal - discount

  setInvoices(updatedInvoices)
  // Xóa kết quả tìm kiếm và reset ô tìm kiếm
  setSearchTerm('')
}
```

---

### Hàm 8: `handleSubmit()` — Thêm sản phẩm mới vào hệ thống
- **File:** `app/dashboard/products/add/page.tsx` — Dòng 266–338 (72 dòng)
- **V(G) = 5** | Cấu trúc: `try-catch-finally` → kiểm tra ảnh → kiểm tra danh mục → insert DB → phân loại lỗi (`instanceof Error` vs object)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError(null)

  try {
    // Sử dụng base64 đã lưu trong previewUrl nếu có ảnh
    let imageUrl = null
    if (formData.image && previewUrl) {
      // Sử dụng trực tiếp chuỗi base64 đã được tạo trong handleImageChange
      imageUrl = previewUrl
      console.log('Sử dụng ảnh base64')
    }

    // Insert product data into database
    if (!formData.category_id) {
      throw new Error('Vui lòng chọn danh mục sản phẩm')
    }

    const { error: insertError } = await supabase
      .from('products')
      .insert([
        {
          product_name: formData.product_name,
          description: formData.description,
          color: formData.color,
          size: formData.size,
          price: formData.price,
          cost_price: formData.cost_price,
          stock_quantity: formData.stock_quantity,
          image: imageUrl,
          category_id: formData.category_id
        }
      ])

    if (insertError) throw insertError

    // Hiển thị thông báo thành công
    showNotification('Thêm sản phẩm thành công!', 'success')

    // Làm mới các ô thông tin để tiếp tục thêm sản phẩm mới
    setFormData({
      product_name: '',
      description: '',
      color: '',
      size: '',
      price: 0,
      cost_price: 0,
      stock_quantity: 0,
      image: null,
      category_id: null,
      formattedPrice: '0',
      formattedCostPrice: '0'
    })

    // Xóa ảnh xem trước
    setPreviewUrl(null)
  } catch (err) {
    console.error('Chi tiết lỗi khi thêm sản phẩm:', err)
    let errorMessage = 'Có lỗi xảy ra khi thêm sản phẩm. Vui lòng kiểm tra console để biết chi tiết.'

    if (err instanceof Error) {
      errorMessage = `Lỗi: ${err.message}`
    } else if (typeof err === 'object' && err !== null && 'message' in err) {
      errorMessage = `Lỗi từ Supabase: ${(err as any).message}`
    }

    setError(errorMessage)
    showNotification(errorMessage, 'error')
  } finally {
    setLoading(false)
  }
}
```

---

### Hàm 9: `handleDelete()` — Vô hiệu hóa nhân viên (Soft Delete + Auth Revoke)
- **File:** `app/dashboard/business/staff/page.tsx` — Dòng 505–560 (56 dòng)
- **V(G) = 5** | Cấu trúc: Guard → REST API `fetch('/api/delete-user')` → `if (!response.ok)` throw → Supabase update `terminated` → catch

```typescript
const handleDelete = async () => {
  if (!selectedStaff) return

  try {
    // Lấy ngày hiện tại ở định dạng ISO
    const currentDate = new Date().toISOString().split('T')[0];

    // Gọi API để xóa tài khoản từ bảng accounts
    const response = await fetch('/api/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: selectedStaff.user_id
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Không thể xóa tài khoản');
    }

    // Cập nhật trạng thái nhân viên thành "terminated" và ngày kết thúc thành ngày hiện tại
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        employment_status: 'terminated',
        end_date: currentDate
      })
      .eq('staff_id', selectedStaff.staff_id);

    if (updateError) throw updateError;

    // Cập nhật state
    setStaffList(prev => prev.map(staff =>
      staff.staff_id === selectedStaff.staff_id
        ? {
            ...staff,
            employment_status: 'terminated',
            end_date: currentDate
          }
        : staff
    ));

    showNotification('Đã vô hiệu hóa tài khoản nhân viên thành công!', 'success');

    // Đóng popup
    setShowDeleteConfirm(false);
    setSelectedStaff(null);
  } catch (error: any) {
    console.error('Lỗi khi vô hiệu hóa nhân viên:', error);
    showNotification(`Lỗi: ${error.message || 'Không thể vô hiệu hóa nhân viên'}`, 'error');
  }
}
```