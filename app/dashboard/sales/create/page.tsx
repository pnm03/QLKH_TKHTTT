'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PlusIcon, XMarkIcon, MagnifyingGlassIcon, UserIcon, EnvelopeIcon, PhoneIcon, HomeIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/app/context/ThemeContext'
// Đã loại bỏ việc import các hàm cập nhật tồn kho vì sử dụng trigger trong cơ sở dữ liệu

interface ProductInOrder {
  product_id: string
  product_name: string
  price: number
  quantity: number
  discount: number
  total: number
  stock_quantity?: number
  color?: string
  size?: string
}

interface Customer {
  customer_id?: string
  full_name: string
  phone: string
  email: string
  hometown?: string
  created_at?: string
  updated_at?: string
}

interface Invoice {
  id: string
  name: string
  products: ProductInOrder[]
  note: string
  totalAmount: number
  totalDiscount: number
  amountToPay: number
  customer?: Customer | null
}

export default function CreateOrderPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProductInOrder[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      name: 'Hóa đơn 1',
      products: [],
      note: '',
      totalAmount: 0,
      totalDiscount: 0,
      amountToPay: 0,
      customer: null
    }
  ])
  const [activeInvoiceIndex, setActiveInvoiceIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [quantityErrors, setQuantityErrors] = useState<{[key: number]: boolean}>({})
  const [successMessage, setSuccessMessage] = useState('')

  // State cho popup bán hàng nhanh và gửi đơn hàng
  const [showQuickSalePopup, setShowQuickSalePopup] = useState(false)
  const [showShippingPopup, setShowShippingPopup] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<{payment_id: number, payment_method_name: string, description?: string, image?: string}[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null)
  const [customerPaid, setCustomerPaid] = useState<string>('')
  const [discount, setDiscount] = useState<string>('0')

  // State cho thông tin gửi hàng
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [recipientDistrict, setRecipientDistrict] = useState('')
  const [recipientWard, setRecipientWard] = useState('')
  const [shippingWeight, setShippingWeight] = useState('500')
  const [shippingUnit, setShippingUnit] = useState('g')
  const [packageLength, setPackageLength] = useState('10')
  const [packageWidth, setPackageWidth] = useState('10')
  const [packageHeight, setPackageHeight] = useState('10')
  const [dimensionUnit, setDimensionUnit] = useState('cm')
  const [codAmount, setCodAmount] = useState(true)
  const [customerPrepaid, setCustomerPrepaid] = useState('0') // Số tiền khách trả trước
  const [currentUser, setCurrentUser] = useState<any>(null) // Thông tin người tạo đơn hàng
  const [orderCreationTime, setOrderCreationTime] = useState(new Date()) // Thời gian tạo đơn hàng

  // State cho tìm kiếm khách hàng
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([])
  const [showCustomerSearchResults, setShowCustomerSearchResults] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // State cho modal thêm khách hàng mới
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    full_name: '',
    phone: '',
    email: '',
    hometown: ''
  })
  const [addCustomerLoading, setAddCustomerLoading] = useState(false)
  const [addCustomerErrors, setAddCustomerErrors] = useState<Record<string, string>>({})

  // Đã loại bỏ việc cập nhật tồn kho thủ công vì sử dụng trigger trong cơ sở dữ liệu

  const { currentTheme } = useTheme()
  const supabase = createClient()

  // Hàm tính toán tổng tiền cho hóa đơn hiện tại
  const calculateTotals = useCallback(() => {
    const invoice = invoices[activeInvoiceIndex]
    if (invoice && invoice.products) {
      const subtotal = invoice.products.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const discount = invoice.products.reduce((sum, item) => sum + item.discount, 0)

      invoice.totalAmount = subtotal
      invoice.totalDiscount = discount
      invoice.amountToPay = subtotal - discount
    }
  }, [invoices, activeInvoiceIndex])

  // Lấy hóa đơn hiện tại
  const currentInvoice = invoices[activeInvoiceIndex]

  // Mỗi khi hóa đơn hiện tại thay đổi, tính lại tổng tiền
  useEffect(() => {
    if (currentInvoice) {
      calculateTotals()
    }
  }, [currentInvoice, calculateTotals])

  // Đã loại bỏ việc xóa danh sách sản phẩm cần cập nhật tồn kho vì sử dụng trigger trong cơ sở dữ liệu

  // Lấy 5 sản phẩm mặc định để hiển thị
  const fetchDefaultProducts = useCallback(async () => {
    try {
      if (!supabase) {
        console.error('Supabase client chưa được khởi tạo')
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(5)

      if (error) {
        console.error('Lỗi khi lấy sản phẩm mặc định:', error.message)
        return
      }

      console.log('Sản phẩm mặc định:', data)
      setSearchResults(data || [])
    } catch (error) {
      console.error('Lỗi khi lấy sản phẩm mặc định:', error)
    }
  }, [supabase])

  // Lấy danh sách phương thức thanh toán
  const fetchPaymentMethods = useCallback(async () => {
    try {
      if (!supabase) {
        console.error('Supabase client chưa được khởi tạo')
        return
      }

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_method_name', { ascending: true })

      if (error) {
        console.error('Lỗi khi lấy phương thức thanh toán:', error.message)
        return
      }

      setPaymentMethods(data || [])
    } catch (error) {
      console.error('Lỗi khi lấy phương thức thanh toán:', error)
    }
  }, [supabase])

  // Tìm kiếm sản phẩm mặc định và phương thức thanh toán khi trang load
  useEffect(() => {
    fetchDefaultProducts()
    fetchPaymentMethods()
    fetchCurrentUser()
  }, [fetchDefaultProducts, fetchPaymentMethods])

  // Lấy thông tin người dùng hiện tại hoặc sử dụng giá trị mặc định
  const fetchCurrentUser = async () => {
    try {
      // Tạo một đối tượng người dùng mặc định
      // Sử dụng giá trị mặc định cho user_id
      const defaultUser = {
        user_id: '00000000-0000-0000-0000-000000000000', // UUID mặc định
        email: 'default@example.com',
        full_name: 'Người dùng mặc định',
        auth_id: '00000000-0000-0000-0000-000000000000'
      }

      // Thử lấy thông tin người dùng hiện tại
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          console.log('Thông tin người dùng từ auth:', user)

          // Lấy thông tin chi tiết từ bảng users
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', user.id)
            .maybeSingle()

          if (userError) {
            console.log('Không tìm thấy trong bảng users, sử dụng thông tin từ auth')
          }

          // Nếu tìm thấy trong bảng users, sử dụng dữ liệu từ đó
          // Nếu không, sử dụng thông tin từ auth
          const userInfo = userData || {
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            auth_id: user.id
          }

          console.log('Thông tin người dùng để sử dụng:', userInfo)

          // Cập nhật state và trả về dữ liệu
          setCurrentUser(userInfo)
          return userInfo
        }
      } catch (authError) {
        console.log('Lỗi khi lấy thông tin người dùng từ auth:', authError)
      }

      // Nếu không thể lấy thông tin người dùng, sử dụng giá trị mặc định
      console.log('Sử dụng thông tin người dùng mặc định')
      setCurrentUser(defaultUser)
      return defaultUser
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng:', error)

      // Trả về giá trị mặc định trong trường hợp có lỗi
      const defaultUser = {
        user_id: '00000000-0000-0000-0000-000000000000',
        email: 'default@example.com',
        full_name: 'Người dùng mặc định',
        auth_id: '00000000-0000-0000-0000-000000000000'
      }

      setCurrentUser(defaultUser)
      return defaultUser
    }
  }


  // Hàm tìm kiếm sản phẩm
  const searchProducts = useCallback(async () => {
    try {
      // Kiểm tra xem đã khởi tạo client Supabase chưa
      if (!supabase) {
        console.error('Supabase client chưa được khởi tạo')
        return
      }

      console.log('Đang tìm kiếm với từ khóa:', searchTerm)

      let query = supabase
        .from('products')
        .select('*')

      // Nếu có từ khóa tìm kiếm, thêm điều kiện tìm kiếm
      if (searchTerm) {
        query = query.ilike('product_name', `%${searchTerm}%`)
      }

      // Giới hạn kết quả
      query = query.limit(5)

      const { data, error } = await query

      if (error) {
        console.error('Lỗi Supabase:', error.message, error.details, error.hint)
        throw error
      }

      console.log('Kết quả tìm kiếm:', data)
      setSearchResults(data || [])
    } catch (error) {
      console.error('Lỗi khi tìm kiếm sản phẩm:', error)
      // Không hiển thị thông báo lỗi lên UI, chỉ log ra console
      setSearchResults([])
    }
  }, [searchTerm, supabase])


  // Theo dõi thay đổi ở ô tìm kiếm - phản hồi nhanh hơn
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      searchProducts()
    }, 100) // Giảm delay xuống 100ms để phản hồi nhanh hơn

    return () => clearTimeout(delaySearch)
  }, [searchTerm, searchProducts])

  // Xử lý đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // Kiểm tra xem click có phải là bên ngoài khu vực tìm kiếm khách hàng không
      if (showCustomerSearchResults && !target.closest('.customer-search-container')) {
        setShowCustomerSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCustomerSearchResults])

  // Thêm sản phẩm vào đơn hàng hiện tại
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

  // Sử dụng hàm addToStockUpdateList từ stockUpdateHelper.js

  // Cập nhật số lượng sản phẩm
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return

    const updatedInvoices = [...invoices]
    const currentInvoice = updatedInvoices[activeInvoiceIndex]
    const stockQuantity = currentInvoice.products[index].stock_quantity || 0

    // Kiểm tra nếu số lượng vượt quá tồn kho
    if (newQuantity > stockQuantity) {
      // Cập nhật state lỗi
      setQuantityErrors({...quantityErrors, [index]: true})
    } else {
      // Xóa lỗi nếu số lượng hợp lệ
      const updatedErrors = {...quantityErrors}
      delete updatedErrors[index]
      setQuantityErrors(updatedErrors)
    }

    // Đã loại bỏ việc cập nhật tồn kho thủ công vì sử dụng trigger trong cơ sở dữ liệu

    currentInvoice.products[index].quantity = newQuantity
    currentInvoice.products[index].total =
      currentInvoice.products[index].price * newQuantity -
      currentInvoice.products[index].discount

    // Tính lại tổng tiền ngay sau khi cập nhật số lượng
    const subtotal = currentInvoice.products.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const discount = currentInvoice.products.reduce((sum, item) => sum + item.discount, 0)

    currentInvoice.totalAmount = subtotal
    currentInvoice.totalDiscount = discount
    currentInvoice.amountToPay = subtotal - discount

    setInvoices(updatedInvoices)
  }

  // Cập nhật giảm giá
  const updateDiscount = (index: number, discount: number) => {
    if (isNaN(discount)) discount = 0
    if (discount < 0) discount = 0

    const updatedInvoices = [...invoices]
    const currentInvoice = updatedInvoices[activeInvoiceIndex]

    currentInvoice.products[index].discount = discount
    currentInvoice.products[index].total =
      currentInvoice.products[index].price *
      currentInvoice.products[index].quantity - discount

    // Tính lại tổng tiền ngay sau khi cập nhật giảm giá
    const subtotal = currentInvoice.products.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const totalDiscount = currentInvoice.products.reduce((sum, item) => sum + item.discount, 0)

    currentInvoice.totalAmount = subtotal
    currentInvoice.totalDiscount = totalDiscount
    currentInvoice.amountToPay = subtotal - totalDiscount

    setInvoices(updatedInvoices)
  }

  // Xóa sản phẩm khỏi đơn hàng
  const removeProduct = (index: number) => {
    const updatedInvoices = [...invoices]
    const currentInvoice = updatedInvoices[activeInvoiceIndex]

    // Đã loại bỏ việc lấy thông tin sản phẩm trước khi xóa vì không cần cập nhật tồn kho thủ công nữa

    // Đã loại bỏ việc cập nhật tồn kho thủ công vì sử dụng trigger trong cơ sở dữ liệu

    currentInvoice.products.splice(index, 1)

    // Tính lại tổng tiền ngay sau khi xóa sản phẩm
    const subtotal = currentInvoice.products.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const discount = currentInvoice.products.reduce((sum, item) => sum + item.discount, 0)

    currentInvoice.totalAmount = subtotal
    currentInvoice.totalDiscount = discount
    currentInvoice.amountToPay = subtotal - discount

    setInvoices(updatedInvoices)
  }

  // Cập nhật ghi chú cho hóa đơn hiện tại
  const updateNote = (note: string) => {
    const updatedInvoices = [...invoices]
    updatedInvoices[activeInvoiceIndex].note = note
    setInvoices(updatedInvoices)
  }

  // Lấy 2 khách hàng bất kỳ
  const fetchRandomCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2)

      if (error) throw error

      setCustomerSearchResults(data || [])
      setShowCustomerSearchResults(true)
    } catch (error) {
      console.error('Lỗi khi lấy khách hàng ngẫu nhiên:', error)
    }
  }

  // Tìm kiếm khách hàng
  const searchCustomers = async (term = customerSearchTerm) => {
    if (!term.trim()) {
      // Nếu ô tìm kiếm trống, hiển thị 2 khách hàng gần đây
      fetchRandomCustomers()
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`full_name.ilike.%${term}%, phone.ilike.%${term}%, email.ilike.%${term}%`)
        .order('full_name', { ascending: true })
        .limit(5)

      if (error) throw error

      setCustomerSearchResults(data || [])
      setShowCustomerSearchResults(true)
    } catch (error) {
      console.error('Lỗi khi tìm kiếm khách hàng:', error)
    }
  }

  // Chọn khách hàng từ kết quả tìm kiếm
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)

    // Cập nhật thông tin khách hàng vào đơn hàng
    const updatedInvoices = [...invoices]
    updatedInvoices[activeInvoiceIndex].customer = customer
    setInvoices(updatedInvoices)

    // Đóng kết quả tìm kiếm
    setShowCustomerSearchResults(false)
    setCustomerSearchTerm('')

    // Cập nhật thông tin người nhận trong form gửi hàng
    setRecipientName(customer.full_name)
    setRecipientPhone(customer.phone)
    if (customer.hometown) {
      setRecipientAddress(customer.hometown)
    }
  }

  // Xóa khách hàng đã chọn
  const clearSelectedCustomer = () => {
    setSelectedCustomer(null)

    // Cập nhật thông tin khách hàng vào đơn hàng
    const updatedInvoices = [...invoices]
    updatedInvoices[activeInvoiceIndex].customer = null
    setInvoices(updatedInvoices)
  }

  // Mở modal thêm khách hàng mới
  const openAddCustomerModal = () => {
    setShowAddCustomerModal(true)
    setNewCustomer({
      full_name: '',
      phone: '',
      email: '',
      hometown: ''
    })
    setAddCustomerErrors({})
  }

  // Đóng modal thêm khách hàng mới
  const closeAddCustomerModal = () => {
    setShowAddCustomerModal(false)
  }

  // Xử lý thay đổi form thêm khách hàng mới
  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewCustomer({
      ...newCustomer,
      [name]: value
    })

    // Xóa lỗi khi người dùng nhập
    if (addCustomerErrors[name]) {
      setAddCustomerErrors({
        ...addCustomerErrors,
        [name]: ''
      })
    }
  }

  // Kiểm tra form thêm khách hàng mới
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

  // Thêm khách hàng mới
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

  // Tạo đơn hàng mới
  const createNewInvoice = () => {
    // Tìm ID lớn nhất hiện tại và tăng lên 1 để tạo ID mới
    const maxId = invoices.reduce((max, invoice) => {
      const currentId = parseInt(invoice.id)
      return currentId > max ? currentId : max
    }, 0)

    const newId = (maxId + 1).toString()
    const newInvoice: Invoice = {
      id: newId,
      name: `Hóa đơn ${newId}`,
      products: [],
      note: '',
      totalAmount: 0,
      totalDiscount: 0,
      amountToPay: 0,
      customer: null
    }

    setInvoices([...invoices, newInvoice])
    setActiveInvoiceIndex(invoices.length)
    // Xóa các lỗi khi chuyển hóa đơn
    setQuantityErrors({})
  }

  // Xóa hóa đơn
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

  // Định dạng tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Thêm hàm formatProductName để định dạng tên sản phẩm với màu và size
  const formatProductName = (product: ProductInOrder) => {
    let formattedName = product.product_name || '';

    // Nếu có thông tin màu hoặc size, thêm vào trong ngoặc
    if (product.color || product.size) {
      const details = [];
      if (product.color) details.push(product.color);
      if (product.size) details.push(product.size);

      formattedName += ` (${details.join(', ')})`;
    }

    return formattedName;
  };

  // Thêm validation trước khi tạo đơn hàng
  const validateOrder = () => {
    // Kiểm tra nếu có sản phẩm nào vượt quá tồn kho
    if (Object.keys(quantityErrors).length > 0) {
      alert('Vui lòng kiểm tra lại số lượng sản phẩm. Một số sản phẩm có số lượng vượt quá tồn kho.');
      return false;
    }

    if (currentInvoice.products.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng');
      return false;
    }

    return true;
  };

  // Mở popup bán hàng nhanh
  const openQuickSalePopup = () => {
    // Kiểm tra tồn kho trước khi mở popup
    if (!validateStockBeforeCheckout()) {
      return;
    }

    if (!validateOrder()) return;

    // Tính lại tổng tiền cho tất cả các hóa đơn để đảm bảo dữ liệu mới nhất
    const updatedInvoices = [...invoices];

    // Cập nhật tổng tiền cho từng hóa đơn
    updatedInvoices.forEach(invoice => {
      const subtotal = invoice.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDiscount = invoice.products.reduce((sum, item) => sum + item.discount, 0);

      invoice.totalAmount = subtotal;
      invoice.totalDiscount = totalDiscount;
      invoice.amountToPay = subtotal - totalDiscount;
    });

    setInvoices(updatedInvoices);

    // Đặt giá trị mặc định cho số tiền khách trả bằng tổng tiền cần thanh toán của tất cả hóa đơn
    const totalAmountToPay = calculateTotalAllInvoices().amountToPay;
    setCustomerPaid(totalAmountToPay.toString());
    setSelectedPaymentMethod(null);
    setDiscount('0');
    setShowQuickSalePopup(true);
  };

  // Kiểm tra tồn kho trước khi thanh toán
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

  // Đóng popup bán hàng nhanh
  const closeQuickSalePopup = () => {
    setShowQuickSalePopup(false);
  };

  // Xử lý khi thay đổi giảm giá - hiện tại không sử dụng
  // const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = e.target.value;
  //   // Chỉ cho phép nhập số
  //   if (/^\d*$/.test(value)) {
  //     setDiscount(value);
  //   }
  // };

  // Xử lý khi thay đổi số tiền khách trả
  const handleCustomerPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Loại bỏ tất cả các ký tự không phải số
    const numericValue = value.replace(/\D/g, '');

    if (numericValue) {
      // Định dạng số với dấu chấm phân cách hàng nghìn
      // Không cần lưu giá trị định dạng vì chúng ta sử dụng giá trị gốc
      new Intl.NumberFormat('vi-VN', {
        style: 'decimal',
        useGrouping: true,
        maximumFractionDigits: 0
      }).format(parseInt(numericValue));

      setCustomerPaid(numericValue); // Lưu giá trị số nguyên không có dấu chấm
    } else {
      setCustomerPaid('');
    }
  };

  // Tính số tiền cần trả lại khách
  const calculateChange = () => {
    const amountToPay = calculateTotalAllInvoices().amountToPay;
    const paid = parseInt(customerPaid) || 0;
    return Math.max(0, paid - amountToPay);
  };

  // Tính tổng tiền của tất cả các hóa đơn
  const calculateTotalAllInvoices = () => {
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const totalDiscount = invoices.reduce((sum, invoice) => sum + invoice.totalDiscount, 0);
    const amountToPay = totalAmount - totalDiscount;

    return {
      totalAmount,
      totalDiscount,
      amountToPay
    };
  };

  // Xử lý thanh toán nhanh
  const handleQuickSale = async () => {
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

    // Đã loại bỏ việc cập nhật tồn kho thủ công vì sử dụng trigger trong cơ sở dữ liệu

    setLoading(true);

    try {
      // Tạo đơn hàng mới trong cơ sở dữ liệu
      // Lấy thông tin người dùng hiện tại (người tạo đơn hàng) từ hàm fetchCurrentUser
      const currentUserData = await fetchCurrentUser();

      if (!currentUserData) {
        console.error('Không thể lấy thông tin người dùng hiện tại');
        throw new Error('Không thể lấy thông tin người dùng hiện tại');
      }

      console.log('Thông tin người dùng hiện tại:', currentUserData);
      const orderUserId = currentUserData.user_id;
      console.log('Đã tìm thấy user_id từ người dùng hiện tại:', orderUserId);

      // Sử dụng customer_id từ khách hàng đã chọn hoặc null nếu không có khách hàng
      let customerId = null;

      // Nếu có khách hàng được chọn trong đơn hàng hiện tại
      if (currentInvoice.customer && currentInvoice.customer.customer_id) {
        customerId = currentInvoice.customer.customer_id;
        console.log('Sử dụng customer_id từ khách hàng đã chọn:', customerId);
      } else {
        console.log('Không có khách hàng được chọn, customer_id sẽ là null')
      }

      // Tạo order_id ngẫu nhiên
      const generateOrderId = () => {
        // Tạo mã đơn hàng với định dạng: ORD-YYYYMMDD-XXXXX
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        // Tạo 5 ký tự ngẫu nhiên
        const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();

        return `ORD-${dateStr}-${randomChars}`;
      };

      // Tạo order_id mới
      const orderId = generateOrderId();
      console.log('Đã tạo order_id mới:', orderId);

      // Tạo đơn hàng với customer_id hợp lệ và order_id ngẫu nhiên
      console.log('Đang tạo đơn hàng với customer_id:', customerId);

      // Tính tổng giá trị đơn hàng từ tất cả các hóa đơn
      const totalOrderAmount = calculateTotalAllInvoices().amountToPay;
      console.log('Tổng giá trị đơn hàng:', totalOrderAmount);

      const orderData = {
        order_id: orderId,
        customer_id: customerId,
        user_id: orderUserId, // Thêm user_id là người tạo đơn hàng
        order_date: new Date().toISOString(),
        price: totalOrderAmount, // Lưu tổng giá trị đơn hàng
        status: 'Đã thanh toán', // Sử dụng giá trị enum chính xác: Đã thanh toán
        is_shipping: false, // Đơn hàng bán nhanh không có vận chuyển
        payment_method: selectedPaymentMethod
      };

      console.log('Dữ liệu đơn hàng:', orderData);

      // Tạo đơn hàng mới với order_id đã tạo
      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) {
        console.error('Lỗi khi tạo đơn hàng:', orderError);
        throw new Error(`Không thể tạo đơn hàng: ${orderError.message}`);
      }

      console.log('Đơn hàng đã được tạo với ID:', orderId);

      // Tạo chi tiết đơn hàng cho từng sản phẩm trong tất cả các hóa đơn
      console.log('Bắt đầu tạo chi tiết đơn hàng...');

      try {
        // Đã loại bỏ việc cập nhật tồn kho thủ công vì sử dụng trigger trong cơ sở dữ liệu

        // Theo thông tin mới nhất, tên bảng là orderdetails (chữ thường)
        console.log('Sử dụng bảng orderdetails (chữ thường)');
        await processOrderDetails('orderdetails');

        // Đã loại bỏ việc cập nhật tồn kho thủ công vì sử dụng trigger trong cơ sở dữ liệu
      } catch (error) {
        console.error('Lỗi khi xử lý chi tiết đơn hàng:', error);
        alert('Đã xảy ra lỗi khi tạo chi tiết đơn hàng, nhưng đơn hàng đã được tạo. Vui lòng kiểm tra lại.');
      }

      // Hàm xử lý chi tiết đơn hàng
      async function processOrderDetails(tableName: string) {
        console.log(`Bắt đầu xử lý chi tiết đơn hàng cho bảng ${tableName}`);

        // Kiểm tra tồn kho trước khi xử lý
        if (!validateStockBeforeCheckout()) {
          console.error('Không đủ tồn kho cho một số sản phẩm');
          return false;
        }

        // Mảng để lưu các chi tiết đơn hàng đã thêm thành công
        const successfulDetails = [];

        // Xử lý từng hóa đơn
        for (const invoice of invoices) {
          console.log(`Xử lý hóa đơn: ${invoice.name} với ${invoice.products.length} sản phẩm`);

          // Xử lý từng sản phẩm trong hóa đơn
          for (const product of invoice.products) {
            if (!product.product_id) {
              console.error('Sản phẩm không có product_id:', product);
              continue;
            }

            try {
              console.log(`Thêm sản phẩm: ${product.product_name} (ID: ${product.product_id}), SL: ${product.quantity}, Hóa đơn: ${invoice.name}`);

              // Tính subtotal đúng cách
              const quantity = product.quantity || 1;
              const price = product.price || 0;

              // Tạo ID ngẫu nhiên cho chi tiết đơn hàng
              const generateOrderDetailId = () => {
                // Tạo UUID ngẫu nhiên
                const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                  const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                  return v.toString(16);
                });
                return uuid;
              };

              // Tính subtotal
              const subtotal = quantity * price;

              // Tạo chi tiết đơn hàng mới
              const orderDetail = {
                orderdetail_id: generateOrderDetailId(), // Tạo ID ngẫu nhiên
                order_id: orderId,
                product_id: parseInt(product.product_id),
                name_product: product.product_name || 'Không có tên',
                name_check: invoice.name || 'Hóa đơn không tên',
                quantity: quantity,
                unit_price: price,
                subtotal: subtotal // Thêm subtotal
              };

              // Thêm chi tiết đơn hàng vào cơ sở dữ liệu
              try {
                console.log(`Thêm chi tiết đơn hàng với ID: ${orderDetail.orderdetail_id}`);

                // Thêm chi tiết đơn hàng mới
                const { error: insertError } = await supabase
                  .from(tableName)
                  .insert(orderDetail);

                if (insertError) {
                  console.error(`Lỗi khi thêm chi tiết đơn hàng:`, insertError);
                  console.error('Chi tiết lỗi:', JSON.stringify(insertError));
                } else {
                  console.log(`Đã thêm chi tiết đơn hàng thành công với ID: ${orderDetail.orderdetail_id}`);

                  // Thêm vào danh sách chi tiết thành công
                  successfulDetails.push(orderDetail);
                }
              } catch (error) {
                console.error(`Lỗi khi thêm chi tiết đơn hàng:`, error);
              }

              // Ghi nhận sản phẩm cần cập nhật tồn kho sau khi thêm chi tiết đơn hàng thành công
              console.log(`Ghi nhận sản phẩm ID: ${product.product_id} cần cập nhật tồn kho, Số lượng: ${quantity}`);

              // Thông tin sản phẩm đã được lưu khi thêm vào đơn hàng
              // Không cần thực hiện thêm hành động nào ở đây
            } catch (error) {
              console.error(`Lỗi không xác định khi xử lý sản phẩm ${product.product_id}:`, error);
            }
          }
        }

        // Tồn kho sẽ được cập nhật sau khi thêm chi tiết đơn hàng thành công
        console.log('Chi tiết đơn hàng đã được thêm, chuẩn bị cập nhật tồn kho...');

        console.log(`Đã thêm thành công ${successfulDetails.length} chi tiết đơn hàng`);
        console.log('Đã hoàn thành việc thêm tất cả chi tiết đơn hàng và cập nhật tồn kho');
        return true;
      }

      // Hàm cập nhật số lượng tồn kho - không sử dụng vì đã cập nhật trực tiếp
      /*
      async function updateProductStock(productId: number, quantity: number) {
        try {
          console.log(`Cập nhật tồn kho cho sản phẩm ID: ${productId}, Số lượng cần giảm: ${quantity}`);

          // Lấy số lượng tồn kho hiện tại
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('stock_quantity, product_name')
            .eq('product_id', productId)
            .single();

          if (productError) {
            console.error('Lỗi khi lấy thông tin sản phẩm:', productError);
            return false;
          }

          if (!productData) {
            console.error(`Không tìm thấy sản phẩm với ID: ${productId}`);
            return false;
          }

          // Tính toán số lượng tồn kho mới - đảm bảo là số
          const currentStock = Number(productData.stock_quantity) || 0;
          const quantityToReduce = Number(quantity) || 0;

          // Đảm bảo không giảm quá số lượng hiện có
          const newStockQuantity = Math.max(0, currentStock - quantityToReduce);

          console.log(`Sản phẩm: ${productData.product_name} (ID: ${productId})`);
          console.log(`Tồn kho hiện tại: ${currentStock}`);
          console.log(`Số lượng mua: ${quantity}`);
          console.log(`Số lượng giảm: ${quantityToReduce}`);
          console.log(`Tồn kho mới: ${newStockQuantity}`);

          // Cập nhật số lượng tồn kho - sử dụng cách tiếp cận khác
          console.log(`Cập nhật tồn kho cho sản phẩm ID: ${productId} thành ${newStockQuantity}`);

          // Sử dụng SQL trực tiếp để cập nhật
          const updateQuery = `
            UPDATE products
            SET stock_quantity = ${newStockQuantity},
                updated_at = '${new Date().toISOString()}'
            WHERE product_id = ${productId}
          `;

          console.log(`SQL Query: ${updateQuery}`);

          // Thực hiện cập nhật
          const { error: updateError } = await supabase
            .from('products')
            .update({
              stock_quantity: newStockQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', productId);

          if (updateError) {
            console.error('Lỗi khi cập nhật tồn kho:', updateError);
            return false;
          } else {
            console.log(`Đã cập nhật tồn kho thành công cho sản phẩm ID: ${productId}`);
            console.log(`Tồn kho mới: ${newStockQuantity}`);

            // Kiểm tra lại tồn kho sau khi cập nhật
            const { data: updatedProduct, error: checkError } = await supabase
              .from('products')
              .select('stock_quantity, product_name')
              .eq('product_id', productId)
              .single();

            if (checkError) {
              console.error('Lỗi khi kiểm tra tồn kho sau cập nhật:', checkError);
            } else if (updatedProduct) {
              console.log(`Tồn kho sau khi cập nhật: ${updatedProduct.stock_quantity}`);

              // Kiểm tra xem tồn kho có thực sự được cập nhật không
              const updatedStock = updatedProduct.stock_quantity !== undefined ? Number(updatedProduct.stock_quantity) : null;
              console.log(`Kiểm tra tồn kho sau cập nhật: Mong đợi: ${newStockQuantity}, Thực tế: ${updatedStock}`);

              if (updatedStock === null || updatedStock !== newStockQuantity) {
                console.log(`Tồn kho cần được cập nhật lại. Mong đợi: ${newStockQuantity}, Thực tế: ${updatedStock}`);

                // Thử cập nhật lại một lần nữa với cách khác
                console.log('Thử cập nhật lại tồn kho với cách khác...');

                // Sử dụng cách cập nhật khác
                const { error: retryError } = await supabase
                  .from('products')
                  .update({
                    stock_quantity: newStockQuantity,
                    updated_at: new Date().toISOString()
                  })
                  .eq('product_id', productId)
                  .select();

                if (retryError) {
                  console.error('Lỗi khi cập nhật lại tồn kho:', retryError);
                } else {
                  console.log(`Đã cập nhật lại tồn kho thành công cho sản phẩm ID: ${productId}`);
                }
              }
            }

            return true;
          }
        } catch (error) {
          console.error('Lỗi khi xử lý cập nhật tồn kho:', error);
          return false;
        }
      }
      */

      console.log('Đã hoàn thành quá trình tạo chi tiết đơn hàng');

      // Tồn kho đã được cập nhật sau khi thêm chi tiết đơn hàng
      console.log('Đã hoàn thành cập nhật số lượng tồn kho');

      // Hiển thị thông báo thành công
      setSuccessMessage('Thanh toán thành công!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 2000); // Tự động ẩn sau 2 giây

      setShowQuickSalePopup(false);
      setLoading(false);

      // Reset tất cả các hóa đơn sau khi thanh toán
      const resetInvoices = invoices.map(invoice => ({
        ...invoice,
        products: [],
        note: '',
        totalAmount: 0,
        totalDiscount: 0,
        amountToPay: 0,
        customer: null
      }));

      // Chỉ giữ lại hóa đơn đầu tiên và đặt nó làm active
      setInvoices([resetInvoices[0]]);
      setActiveInvoiceIndex(0);

      // Tải lại dữ liệu sản phẩm để cập nhật thông tin tồn kho mới nhất
      console.log('Tải lại dữ liệu sản phẩm để cập nhật thông tin tồn kho mới nhất');
      fetchDefaultProducts();

      // Danh sách sản phẩm cần cập nhật tồn kho đã được xóa trong hàm updateStockQuantities
      // Không cần xóa lại ở đây
    } catch (error) {
      console.error('Lỗi khi thanh toán:', error);
      alert('Có lỗi xảy ra khi thanh toán: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
      setLoading(false);
    }
  };

  // Mở popup gửi đơn hàng
  const openShippingPopup = () => {
    // Kiểm tra tồn kho trước khi mở popup
    if (!validateStockBeforeCheckout()) {
      return;
    }

    if (!validateOrder()) return;

    // Tính lại tổng tiền cho tất cả các hóa đơn để đảm bảo dữ liệu mới nhất
    const updatedInvoices = [...invoices];

    // Cập nhật tổng tiền cho từng hóa đơn
    updatedInvoices.forEach(invoice => {
      const subtotal = invoice.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDiscount = invoice.products.reduce((sum, item) => sum + item.discount, 0);

      invoice.totalAmount = subtotal;
      invoice.totalDiscount = totalDiscount;
      invoice.amountToPay = subtotal - totalDiscount;
    });

    setInvoices(updatedInvoices);

    // Đặt giá trị mặc định cho các trường
    const totalAmountToPay = calculateTotalAllInvoices().amountToPay;

    // Nếu có phương thức thanh toán được chọn, bỏ tích thu tiền hộ
    if (selectedPaymentMethod) {
      setCodAmount(false);
    } else {
      setCodAmount(true);
    }

    // Nếu có khách hàng được chọn, điền thông tin khách hàng vào form
    if (currentInvoice.customer) {
      setRecipientName(currentInvoice.customer.full_name || '');
      setRecipientPhone(currentInvoice.customer.phone || '');
      setRecipientAddress(currentInvoice.customer.hometown || '');
    } else {
      // Reset các trường nếu không có khách hàng
      setRecipientName('');
      setRecipientPhone('');
      setRecipientAddress('');
    }

    setShowShippingPopup(true);
  };

  // Đóng popup gửi đơn hàng
  const closeShippingPopup = () => {
    setShowShippingPopup(false);
    setSelectedPaymentMethod(null); // Reset phương thức thanh toán khi đóng popup
  };

  // Xử lý tạo đơn hàng
  const handleCreateOrder = async () => {
    // Mở popup gửi đơn hàng thay vì xử lý trực tiếp
    openShippingPopup();
  }

  // Tạo ID đơn hàng ngẫu nhiên
  const generateOrderId = () => {
    // Tạo mã đơn hàng với định dạng: ORD-YYYYMMDD-XXXXX
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Tạo 5 ký tự ngẫu nhiên
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();

    return `ORD-${dateStr}-${randomChars}`;
  };

  // Tạo ID vận chuyển ngẫu nhiên
  const generateShippingId = () => {
    // Tạo mã vận chuyển với định dạng: SHP-YYYYMMDD-XXXXX
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Tạo 5 ký tự ngẫu nhiên
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();

    return `SHP-${dateStr}-${randomChars}`;
  };

  // Tạo ID chi tiết đơn hàng ngẫu nhiên
  const generateOrderDetailId = () => {
    // Tạo UUID ngẫu nhiên
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    return uuid;
  };

  // Xử lý gửi đơn hàng
  const handleShipOrder = async () => {
    if (!validateOrder()) return;

    setLoading(true);

    try {
      const supabase = createClient();

      // Lấy thông tin người dùng trực tiếp từ hàm fetchCurrentUser
      const userData = await fetchCurrentUser();

      if (!userData) {
        throw new Error('Không tìm thấy thông tin người dùng');
      }

      // Sử dụng user_id từ userData
      const userId = userData.user_id;
      if (!userId) {
        throw new Error('Không tìm thấy ID người dùng');
      }

      console.log('Thông tin người dùng:', userData);

      // 1. Tạo ID đơn hàng và ID vận chuyển mới
      const orderId = generateOrderId();
      const shippingId = generateShippingId();

      console.log('ID đơn hàng mới:', orderId);
      console.log('ID vận chuyển mới:', shippingId);

      // Tính tổng giá trị đơn hàng từ tất cả các hóa đơn
      const totalOrderAmount = calculateTotalAllInvoices().amountToPay;

      // Tính toán số tiền khách trả trước và số tiền còn lại
      const prepaidAmount = parseFloat(customerPrepaid) || 0;
      const remainingAmount = Math.max(0, totalOrderAmount - prepaidAmount);

      // Xác định trạng thái thanh toán
      const paymentStatus = prepaidAmount >= totalOrderAmount || selectedPaymentMethod ? 'Đã thanh toán' : 'Chưa thanh toán';

      // 2. Tạo đơn hàng trước
      console.log('Bắt đầu tạo đơn hàng...');

      // Sử dụng customer_id từ khách hàng đã chọn hoặc null nếu không có khách hàng
      let customerId = null;

      // Nếu có khách hàng được chọn trong đơn hàng hiện tại
      if (currentInvoice.customer && currentInvoice.customer.customer_id) {
        customerId = currentInvoice.customer.customer_id;
        console.log('Sử dụng customer_id từ khách hàng đã chọn:', customerId);
      } else {
        console.log('Không có khách hàng được chọn, customer_id sẽ là null')
      }

      // Lấy thông tin người dùng hiện tại (người tạo đơn hàng) từ hàm fetchCurrentUser
      const currentUserData = await fetchCurrentUser();

      if (!currentUserData) {
        console.error('Không thể lấy thông tin người dùng hiện tại');
        throw new Error('Không thể lấy thông tin người dùng hiện tại');
      }

      console.log('Thông tin người dùng hiện tại:', currentUserData);
      const creatorUserId = currentUserData.user_id;
      console.log('Đã tìm thấy user_id từ người dùng hiện tại:', creatorUserId);

      // Tạo đối tượng đơn hàng phù hợp với cấu trúc bảng orders
      const orderObject = {
        order_id: orderId,
        customer_id: customerId, // Sử dụng customerId từ khách hàng đã chọn hoặc null
        user_id: creatorUserId, // Thêm user_id là người tạo đơn hàng
        order_date: new Date().toISOString(),
        price: totalOrderAmount,
        status: paymentStatus, // Trạng thái dựa trên số tiền đã trả
        is_shipping: true, // Đây là đơn vận chuyển
        payment_method: selectedPaymentMethod // Phương thức thanh toán đã chọn hoặc null
      };

      console.log('Thông tin đơn hàng:', orderObject);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderObject);

      if (orderError) {
        throw new Error('Không thể tạo đơn hàng: ' + orderError.message);
      }

      console.log('Đơn hàng đã được tạo thành công!');

      // 3. Tạo chi tiết đơn hàng cho từng sản phẩm
      console.log('Bắt đầu tạo chi tiết đơn hàng...');

      const orderDetails = [];

      // Lặp qua tất cả các hóa đơn và sản phẩm
      for (const invoice of invoices) {
        for (const product of invoice.products) {
          // Tạo ID ngẫu nhiên cho chi tiết đơn hàng
          const orderDetailId = generateOrderDetailId();

          // Tạo đối tượng chi tiết đơn hàng phù hợp với cấu trúc bảng orderdetails
          orderDetails.push({
            orderdetail_id: orderDetailId, // Thêm trường orderdetail_id
            order_id: orderId,
            product_id: product.product_id,
            name_product: product.product_name,
            name_check: invoice.name,
            quantity: product.quantity,
            unit_price: product.price,
            subtotal: product.price * product.quantity - product.discount
          });
        }
      }

      console.log('Chi tiết đơn hàng:', orderDetails);

      // Thêm chi tiết đơn hàng vào cơ sở dữ liệu
      console.log('Gửi dữ liệu chi tiết đơn hàng lên server:', JSON.stringify(orderDetails, null, 2));

      // Kiểm tra xem có sản phẩm nào trong đơn hàng không
      if (orderDetails.length === 0) {
        throw new Error('Không có sản phẩm nào trong đơn hàng');
      }

      // Kiểm tra từng sản phẩm trong đơn hàng
      for (const detail of orderDetails) {
        console.log('Kiểm tra chi tiết sản phẩm:', detail);
        if (!detail.order_id || !detail.product_id) {
          throw new Error('Thiếu thông tin order_id hoặc product_id trong chi tiết đơn hàng');
        }
      }

      // Sử dụng bảng orderdetails (chữ thường) thay vì order_details
      console.log('Sử dụng bảng orderdetails (chữ thường)');
      const { data: detailsData, error: detailsError } = await supabase
        .from('orderdetails')
        .insert(orderDetails)
        .select();

      console.log('Kết quả tạo chi tiết đơn hàng:', { detailsData, detailsError });

      if (detailsError) {
        throw new Error('Không thể tạo chi tiết đơn hàng: ' + detailsError.message);
      }

      console.log('Chi tiết đơn hàng đã được tạo thành công!');

      // 4. Cuối cùng, tạo thông tin vận chuyển
      console.log('Bắt đầu tạo thông tin vận chuyển...');

      // Tạo đối tượng vận chuyển
      const shippingObject = {
        shipping_id: shippingId, // Sử dụng ID vận chuyển đã tạo
        order_id: orderId, // Liên kết với đơn hàng đã tạo
        carrier: 'Giao hàng tiêu chuẩn',
        tracking_number: `TRK-${Date.now()}`,
        shipping_address: `${recipientAddress}, ${recipientWard}, ${recipientDistrict}`,
        shipping_cost: 0, // Có thể tính phí vận chuyển sau
        actual_delivery_date: null,
        delivery_date: null,
        status: 'Chưa giao hàng', // Trạng thái mặc định khi tạo đơn hàng
        created_at: new Date().toISOString(),
        // Thêm các trường mới
        name_customer: recipientName,
        phone_customer: recipientPhone,
        weight: parseFloat(shippingWeight) || 0,
        unit_weight: shippingUnit,
        long: parseFloat(packageLength) || 0,
        wide: parseFloat(packageWidth) || 0,
        hight: parseFloat(packageHeight) || 0,
        unit_size: dimensionUnit,
        cod_shipping: codAmount
      };

      console.log('Thông tin vận chuyển:', shippingObject);

      const { error: shippingError } = await supabase
        .from('shippings')
        .insert(shippingObject);

      if (shippingError) {
        throw new Error('Không thể tạo thông tin vận chuyển: ' + shippingError.message);
      }

      console.log('Thông tin vận chuyển đã được tạo thành công!');
      console.log('Hoàn tất quá trình tạo đơn hàng vận chuyển!');

      // Hiển thị thông báo thành công
      setSuccessMessage('Đơn hàng đã được tạo thành công!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 2000); // Tự động ẩn sau 2 giây

      setShowShippingPopup(false);

      // Reset thông tin hóa đơn hiện tại
      let updatedInvoices = [...invoices]
      updatedInvoices[activeInvoiceIndex] = {
        ...updatedInvoices[activeInvoiceIndex],
        products: [],
        note: '',
        totalAmount: 0,
        totalDiscount: 0,
        amountToPay: 0
      }
      setInvoices(updatedInvoices)

      // Tải lại dữ liệu sản phẩm để cập nhật thông tin tồn kho mới nhất
      console.log('Tải lại dữ liệu sản phẩm để cập nhật thông tin tồn kho mới nhất');
      fetchDefaultProducts();

      // Đóng popup và reset form
      setShowShippingPopup(false);

      // Reset thông tin hóa đơn hiện tại
      let resetInvoices = [...invoices];
      resetInvoices[activeInvoiceIndex] = {
        ...resetInvoices[activeInvoiceIndex],
        products: [],
        note: '',
        totalAmount: 0,
        totalDiscount: 0,
        amountToPay: 0,
        customer: null
      };
      setInvoices(resetInvoices);
    } catch (error) {
      console.error('Lỗi khi tạo đơn hàng:', error);
      alert('Có lỗi xảy ra khi tạo đơn hàng: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  }

  // Chuyển sang hóa đơn khác
  const switchInvoice = (index: number) => {
    setActiveInvoiceIndex(index)
    // Xóa các lỗi khi chuyển hóa đơn
    setQuantityErrors({})
  }

  return (
    <div className="container mx-auto p-4">
      {/* Thông báo thành công */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        {/* Header - tìm kiếm và chọn hóa đơn */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="w-full md:w-1/3">
            <div className="relative flex">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tìm hàng hóa"
                onFocus={() => {
                  setSearchFocused(true)
                  if (searchResults.length === 0) fetchDefaultProducts()
                }}
                onBlur={() => {
                  // Delay để người dùng có thể click vào kết quả tìm kiếm trước khi nó biến mất
                  setTimeout(() => setSearchFocused(false), 200)
                }}
              />
              <button
                onClick={() => {
                  // Tải lại dữ liệu sản phẩm để cập nhật thông tin tồn kho mới nhất
                  console.log('Tải lại dữ liệu sản phẩm');
                  fetchDefaultProducts();
                  setSuccessMessage('Tải lại dữ liệu thành công!');
                  setTimeout(() => setSuccessMessage(''), 2000);
                }}
                className={`p-2 border border-l-0 border-gray-300 rounded-r-md ${currentTheme?.buttonBg || 'bg-blue-600'} text-white`}
                title="Tải lại dữ liệu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              {searchFocused && searchResults.length > 0 && (
                <div
                  className="absolute z-10 w-full bg-white shadow-lg border border-gray-200 rounded-md mt-1 max-h-80 overflow-auto"
                  onMouseDown={(e) => {
                    // Ngăn sự kiện onBlur của input kích hoạt trước khi click được xử lý
                    e.preventDefault();
                  }}
                >
                  {searchResults.map((product) => (
                    <div
                      key={product.product_id}
                      className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 flex justify-between"
                      onMouseDown={() => {
                        addProductToOrder(product);
                        setSearchFocused(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{product.product_name}</span>
                        <span className="text-xs text-gray-500">
                          {product.color && `Màu: ${product.color}`}{product.size && `, Size: ${product.size}`}
                        </span>
                      </div>
                      <span className="text-gray-600">{formatCurrency(product.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {invoices.map((invoice, index) => (
              <div key={invoice.id} className="relative group">
                <button
                  onClick={() => switchInvoice(index)}
                  className={`px-3 py-1 text-sm ${
                    index === activeInvoiceIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  } rounded flex items-center`}
                >
                  {invoice.name}
                  <span
                    onClick={(e) => deleteInvoice(index, e)}
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </span>
                </button>
              </div>
            ))}
            <button
              onClick={createNewInvoice}
              className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Danh sách sản phẩm */}
          <div className="md:col-span-2">
            <div className="overflow-x-auto">
              {currentInvoice.products.length > 0 ? (
                currentInvoice.products.map((item, index) => (
                  <div
                    key={index}
                    className="mb-4 border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white"
                  >
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-blue-50">
                          <th className="py-2 px-3 text-left text-sm font-medium text-blue-800">Mã sản phẩm</th>
                          <th className="py-2 px-3 text-left text-sm font-medium text-blue-800">Tên sản phẩm</th>
                          <th className="py-2 px-3 text-left text-sm font-medium text-blue-800">Tồn kho</th>
                          <th className="py-2 px-3 text-center text-sm font-medium text-blue-800">
                            <button
                              onClick={() => removeProduct(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 px-3 text-sm text-gray-700">{item.product_id}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{formatProductName(item)}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{item.stock_quantity || 0}</td>
                          <td className="py-2 px-3 text-center"></td>
                        </tr>
                        <tr className="border-t border-gray-100">
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <div className="flex items-center">
                              <span className="mr-2">Số lượng:</span>
                              <input
                                type="number"
                                value={item.quantity || 0}
                                onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                                className={`w-16 p-1 text-center border ${quantityErrors[index] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded`}
                                min="1"
                                max={item.stock_quantity || 999}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <div className="flex items-center">
                              <span className="mr-2">Giảm giá:</span>
                              <input
                                type="number"
                                value={item.discount || 0}
                                onChange={(e) => updateDiscount(index, parseInt(e.target.value) || 0)}
                                className="w-16 p-1 text-center border border-gray-300 rounded bg-gray-100"
                                min="0"
                                disabled
                              />
                            </div>
                          </td>
                          <td colSpan={2} className="py-2 px-3 text-sm text-gray-700">
                            <div className="flex items-center">
                              <span className="mr-2">Thành tiền:</span>
                              <span className="font-medium">{formatCurrency(item.price * item.quantity - (item.discount || 0))}</span>
                            </div>
                          </td>
                        </tr>
                        {quantityErrors[index] && (
                          <tr className="border-t border-gray-100">
                            <td colSpan={4} className="py-2 px-3 text-sm text-red-500">
                              Vượt quá tồn kho ({item.stock_quantity})
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Chưa có sản phẩm nào được thêm vào đơn hàng</p>
                  <p className="text-sm text-gray-400 mt-1">Tìm kiếm và thêm sản phẩm từ ô tìm kiếm</p>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin thanh toán và ghi chú */}
          <div className="md:col-span-1">
            {/* Thông tin khách hàng và ghi chú */}
            <div className="bg-gray-50 p-4 rounded-lg mb-3">
              {/* Tìm kiếm khách hàng */}
              <h3 className="text-lg font-medium mb-2">Thông tin khách hàng</h3>

              {selectedCustomer ? (
                <div className="mb-3 p-3 border border-gray-200 rounded-md bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <UserIcon className="h-6 w-6 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{selectedCustomer.full_name}</div>
                        <div className="text-sm text-gray-500 flex flex-col">
                          <span className="flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-1" /> {selectedCustomer.phone}
                          </span>
                          {selectedCustomer.email && (
                            <span className="flex items-center">
                              <EnvelopeIcon className="h-4 w-4 mr-1" /> {selectedCustomer.email}
                            </span>
                          )}
                          {selectedCustomer.hometown && (
                            <span className="flex items-center">
                              <HomeIcon className="h-4 w-4 mr-1" /> {selectedCustomer.hometown}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedCustomer}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative mb-3 customer-search-container">
                  <input
                    type="text"
                    placeholder="Tìm kiếm khách hàng..."
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value)
                      // Tìm kiếm liên tục khi gõ
                      searchCustomers(e.target.value)
                    }}
                    onFocus={() => {
                      // Khi focus vào ô tìm kiếm, hiển thị 2 khách hàng gần đây
                      if (!customerSearchTerm.trim()) {
                        fetchRandomCustomers()
                      }
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-10 pl-10 pr-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => searchCustomers()}
                      className="text-indigo-600 hover:text-indigo-800 focus:outline-none"
                    >
                      <span className="sr-only">Tìm kiếm</span>
                      <MagnifyingGlassIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={openAddCustomerModal}
                      className="ml-2 text-green-600 hover:text-green-800 focus:outline-none"
                    >
                      <span className="sr-only">Thêm khách hàng mới</span>
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Kết quả tìm kiếm khách hàng */}
                  {showCustomerSearchResults && customerSearchResults.length > 0 && (
                    <div className="absolute mt-1 w-full bg-white shadow-lg rounded-md z-10 max-h-60 overflow-y-auto customer-search-container">
                      {customerSearchResults.map((customer) => (
                        <div
                          key={customer.customer_id}
                          className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                          onClick={() => selectCustomer(customer)}
                        >
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{customer.full_name}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <PhoneIcon className="h-3 w-3 mr-1" /> {customer.phone}
                              {customer.email && (
                                <span className="ml-2 flex items-center">
                                  <EnvelopeIcon className="h-3 w-3 mr-1" /> {customer.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Ghi chú đơn hàng */}
              <br></br>
              <h3 className="text-lg font-medium mb-2">Ghi chú đơn hàng</h3>
              <textarea
                value={currentInvoice.note}
                onChange={(e) => updateNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
              ></textarea>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mt-2">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Tổng tiền</span>
                  <span className="font-medium">{formatCurrency(currentInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giảm giá</span>
                  <span className="font-medium">{formatCurrency(currentInvoice.totalDiscount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Khách cần trả</span>
                  <span>{formatCurrency(currentInvoice.amountToPay)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCreateOrder}
                  disabled={currentInvoice.products.length === 0 || loading}
                  className="w-full py-2 px-4 bg-green-600 text-white text-center rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  Tạo đơn gửi đi
                </button>

                <button
                  onClick={openQuickSalePopup}
                  disabled={currentInvoice.products.length === 0 || loading}
                  className="w-full py-2 px-4 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Bán hàng nhanh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popup thanh toán nhanh */}
      {showQuickSalePopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-10" onClick={closeQuickSalePopup}></div>
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 border-2 ${currentTheme?.borderColor || 'border-blue-500'} relative max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Thanh toán nhanh</h3>
              <button
                onClick={closeQuickSalePopup}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 mb-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Hiển thị thông tin từng hóa đơn */}
                {invoices.map((invoice, index) => (
                  <div key={invoice.id} className={`mb-4 pb-3 ${index < invoices.length - 1 ? 'border-b border-gray-200' : ''}`}>
                    <div className="flex items-center mb-2">
                      <div className={`w-2 h-2 rounded-full mr-2 ${currentTheme?.textColor || 'bg-blue-500'}`}></div>
                      <h4 className="font-semibold text-gray-800">{invoice.name}</h4>
                      <div className="ml-2 text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                        {invoice.products.length} sản phẩm
                      </div>
                    </div>

                    <div className="ml-4">
                      <div className="flex justify-between mb-1 text-sm">
                        <span className="text-gray-600">Tổng tiền hàng:</span>
                        <span>{formatCurrency(invoice.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span className="text-gray-600">Giảm giá sản phẩm:</span>
                        <span>{formatCurrency(invoice.totalDiscount)}</span>
                      </div>
                      <div className="flex justify-between mb-1 text-sm font-medium">
                        <span className="text-gray-700">Tổng tiền:</span>
                        <span className={`font-semibold ${currentTheme?.textColor || 'text-blue-600'}`}>
                          {formatCurrency(invoice.amountToPay)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Hiển thị tổng của tất cả hóa đơn */}
                <div className={`mt-4 pt-3 border-t-2 ${currentTheme?.borderColor || 'border-blue-500'}`}>
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <h4 className="font-bold text-gray-900">Tổng hóa đơn ({invoices.length})</h4>
                  </div>

                  <div className="ml-4">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">Tổng tiền hàng:</span>
                      <span>{formatCurrency(calculateTotalAllInvoices().totalAmount)}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">Giảm giá sản phẩm:</span>
                      <span>{formatCurrency(calculateTotalAllInvoices().totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between mb-2 text-lg font-bold">
                      <span>Tổng tiền:</span>
                      <span className={currentTheme?.textColor || 'text-blue-600'}>
                        {formatCurrency(calculateTotalAllInvoices().amountToPay)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                {/* Hiển thị thông tin khách hàng nếu có */}
                {currentInvoice.customer && (
                  <div className="mb-4 p-3 border border-gray-200 rounded-md bg-gray-50">
                    <h4 className="font-medium text-gray-700 mb-2">Thông tin khách hàng:</h4>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-gray-800">{currentInvoice.customer.full_name}</span>
                      </div>
                      <div className="flex items-center">
                        <PhoneIcon className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-gray-800">{currentInvoice.customer.phone}</span>
                      </div>
                      {currentInvoice.customer.email && (
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-gray-800">{currentInvoice.customer.email}</span>
                        </div>
                      )}
                      {currentInvoice.customer.hometown && (
                        <div className="flex items-center">
                          <HomeIcon className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-gray-800">{currentInvoice.customer.hometown}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giảm giá thêm:
                  </label>
                  <input
                    type="text"
                    value={discount}
                    disabled
                    className="w-full p-2 border border-gray-200 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                    placeholder="Tính năng đang phát triển"
                  />
                </div>

                <div className="flex justify-between mb-2 mt-4 text-lg font-bold">
                  <span>Khách cần trả:</span>
                  <span>{formatCurrency(calculateTotalAllInvoices().amountToPay)}</span>
                </div>
              </div>

              {/* Phần thanh toán và tiền thừa đã được xóa */}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phương thức thanh toán:
              </label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((method) => (
                    <div
                      key={method.payment_id}
                      onClick={() => setSelectedPaymentMethod(method.payment_id)}
                      className={`border rounded-md p-2 cursor-pointer transition-all duration-200 ${
                        selectedPaymentMethod === method.payment_id
                          ? `${currentTheme?.borderColor || 'border-blue-500'} bg-blue-50`
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center">
                        {method.image ? (
                          <img
                            src={method.image}
                            alt={method.payment_method_name}
                            className="w-6 h-6 mr-2 object-contain"
                          />
                        ) : (
                          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        )}
                        <div className="text-sm font-medium">{method.payment_method_name}</div>
                      </div>
                      {method.description && (
                        <div className="text-xs text-gray-500 mt-1 ml-8">{method.description}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-4 text-gray-500">
                    Không có phương thức thanh toán nào. Vui lòng thêm phương thức thanh toán trong phần cài đặt.
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Khách thanh toán:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={new Intl.NumberFormat('vi-VN').format(parseInt(customerPaid) || 0)}
                  onChange={handleCustomerPaidChange}
                  className={`w-full p-2 border ${currentTheme?.borderColor || 'border-blue-500'} rounded-md pl-8 focus:ring-2 focus:ring-opacity-50 focus:ring-blue-300 outline-none`}
                  placeholder="0"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₫</span>
                </div>
              </div>
            </div>

            {parseInt(customerPaid) > 0 && (
              <div className="flex justify-between items-center mb-4 p-3 bg-green-50 border border-green-100 rounded-md">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Tiền thừa trả khách:</span>
                </div>
                <span className="font-bold text-green-600 text-lg">{formatCurrency(calculateChange())}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeQuickSalePopup}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Hủy
              </button>
              <button
                onClick={handleQuickSale}
                disabled={loading || !selectedPaymentMethod || parseInt(customerPaid) < calculateTotalAllInvoices().amountToPay}
                className={`px-5 py-2 text-white rounded-md disabled:bg-gray-400 transition-colors duration-200 flex items-center ${currentTheme?.buttonBg || 'bg-blue-600'} ${currentTheme?.buttonHoverBg || 'hover:bg-blue-700'}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Thanh toán
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup gửi đơn hàng */}
      {showShippingPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-10" onClick={closeShippingPopup}></div>
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 border-2 ${currentTheme?.borderColor || 'border-blue-500'} relative max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold">Tạo đơn gửi đi</h3>
                {currentUser && (
                  <div className="text-sm text-gray-500 mt-1">
                    <p>Người tạo: {currentUser.fullname || currentUser.email}</p>
                    <p>Thời gian: {new Date().toLocaleString('vi-VN')}</p>
                  </div>
                )}
              </div>
              <button
                onClick={closeShippingPopup}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-lg">Thông tin người nhận</h4>
                  {currentInvoice.customer && (
                    <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                      Đã chọn khách hàng
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên người nhận:
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${currentInvoice.customer ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Nhập tên người nhận"
                    disabled={currentInvoice.customer !== null}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại:
                  </label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${currentInvoice.customer ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Nhập số điện thoại"
                    disabled={currentInvoice.customer !== null}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ chi tiết (Số nhà, ngõ, đường):
                  </label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${currentInvoice.customer ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Nhập địa chỉ chi tiết"
                    disabled={currentInvoice.customer !== null}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tỉnh/TP - Quận/Huyện:
                    </label>
                    <input
                      type="text"
                      value={recipientDistrict}
                      onChange={(e) => setRecipientDistrict(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập quận/huyện"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phường/Xã:
                    </label>
                    <input
                      type="text"
                      value={recipientWard}
                      onChange={(e) => setRecipientWard(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập phường/xã"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-lg mb-3">Thông tin gói hàng</h4>

                <div className="flex items-center mb-4">
                  <div className="flex-grow mr-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trọng lượng:
                    </label>
                    <input
                      type="text"
                      value={shippingWeight}
                      onChange={(e) => setShippingWeight(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập trọng lượng"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đơn vị:
                    </label>
                    <select
                      value={shippingUnit}
                      onChange={(e) => setShippingUnit(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="g">gram</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dài:
                    </label>
                    <input
                      type="text"
                      value={packageLength}
                      onChange={(e) => setPackageLength(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rộng:
                    </label>
                    <input
                      type="text"
                      value={packageWidth}
                      onChange={(e) => setPackageWidth(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cao:
                    </label>
                    <input
                      type="text"
                      value={packageHeight}
                      onChange={(e) => setPackageHeight(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị kích thước:
                  </label>
                  <select
                    value={dimensionUnit}
                    onChange={(e) => setDimensionUnit(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                    <option value="inch">inch</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khách trả trước:
                  </label>
                  <input
                    type="number"
                    value={customerPrepaid}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomerPrepaid(value);

                      // Tự động bỏ tích thu tiền hộ nếu khách trả đủ hoặc hơn
                      const prepaidAmount = parseFloat(value) || 0;
                      const totalAmount = calculateTotalAllInvoices().amountToPay;

                      if (prepaidAmount >= totalAmount || selectedPaymentMethod) {
                        setCodAmount(false);
                      } else {
                        setCodAmount(true);
                      }
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập số tiền khách trả trước"
                  />
                </div>

                <div className="flex justify-between mb-2 mt-4 text-lg font-bold">
                  <span>Khách cần trả:</span>
                  <span>
                    {formatCurrency(Math.max(0, calculateTotalAllInvoices().amountToPay - (parseFloat(customerPrepaid) || 0)))}
                  </span>
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={codAmount}
                      onChange={(e) => setCodAmount(e.target.checked)}
                      disabled={parseFloat(customerPrepaid) >= calculateTotalAllInvoices().amountToPay || selectedPaymentMethod !== null}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Thu hộ tiền (COD)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div className="mt-6 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phương thức thanh toán:
              </label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((method) => (
                    <div
                      key={method.payment_id}
                      onClick={() => {
                        // Nếu phương thức này đã được chọn, bỏ chọn nó
                        if (selectedPaymentMethod === method.payment_id) {
                          setSelectedPaymentMethod(null);
                          // Khi bỏ chọn phương thức thanh toán, mặc định là thu tiền hộ
                          setCodAmount(true);
                        } else {
                          // Nếu chưa chọn, chọn phương thức này
                          setSelectedPaymentMethod(method.payment_id);
                          // Tự động bỏ tích thu tiền hộ khi chọn phương thức thanh toán
                          setCodAmount(false);
                        }
                      }}
                      className={`border rounded-md p-2 cursor-pointer transition-all duration-200 ${
                        selectedPaymentMethod === method.payment_id
                          ? `${currentTheme?.borderColor || 'border-blue-500'} bg-blue-50`
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center">
                        {method.image ? (
                          <img
                            src={method.image}
                            alt={method.payment_method_name}
                            className="w-6 h-6 mr-2 object-contain"
                          />
                        ) : (
                          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        )}
                        <div className="text-sm font-medium">{method.payment_method_name}</div>
                      </div>
                      {method.description && (
                        <div className="text-xs text-gray-500 mt-1 ml-8">{method.description}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-4 text-gray-500">
                    Không có phương thức thanh toán nào. Vui lòng thêm phương thức thanh toán trong phần cài đặt.
                  </div>
                )}
              </div>

              <div className="mt-2 text-sm text-gray-600">
                {selectedPaymentMethod ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    <span>Đơn hàng sẽ được đánh dấu là "Đã thanh toán" - Nhấn vào phương thức đã chọn để bỏ chọn</span>
                  </div>
                ) : (
                  <div className="flex items-center text-gray-500">
                    <InformationCircleIcon className="h-4 w-4 mr-1" />
                    <span>Nếu không chọn phương thức thanh toán, đơn hàng sẽ ở trạng thái "Chưa thanh toán"</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeShippingPopup}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Hủy
              </button>
              <button
                onClick={handleShipOrder}
                disabled={loading || !recipientName || !recipientPhone || !recipientAddress}
                className={`px-5 py-2 text-white rounded-md disabled:bg-gray-400 transition-colors duration-200 flex items-center ${currentTheme?.buttonBg || 'bg-blue-600'} ${currentTheme?.buttonHoverBg || 'hover:bg-blue-700'}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  'Gửi đơn hàng'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal thêm khách hàng mới */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 backdrop-blur-[2px]" onClick={closeAddCustomerModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-middle backdrop-filter backdrop-blur-sm bg-white bg-opacity-50 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-xl sm:w-full relative z-50 border border-blue-500">
              <form onSubmit={(e) => { e.preventDefault(); addNewCustomer(); }}>
                <div className="bg-white bg-opacity-90 backdrop-filter backdrop-blur-sm px-6 pt-6 pb-6 sm:p-8">
                  <div className="mb-6">
                    <h3 className="text-xl leading-6 font-medium text-gray-900">
                      Thêm khách hàng mới
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Vui lòng điền đầy đủ thông tin bên dưới
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        id="full_name"
                        value={newCustomer.full_name || ''}
                        onChange={handleNewCustomerChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 ${addCustomerErrors.full_name ? 'border-red-300' : ''}`}
                        placeholder="Nhập họ và tên"
                      />
                      {addCustomerErrors.full_name && (
                        <p className="mt-1 text-sm text-red-600">{addCustomerErrors.full_name}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Số điện thoại <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="phone"
                          id="phone"
                          value={newCustomer.phone || ''}
                          onChange={handleNewCustomerChange}
                          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 ${addCustomerErrors.phone ? 'border-red-300' : ''}`}
                          placeholder="Nhập số điện thoại"
                        />
                      </div>
                      {addCustomerErrors.phone && (
                        <p className="mt-1 text-sm text-red-600">{addCustomerErrors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={newCustomer.email || ''}
                        onChange={handleNewCustomerChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 ${addCustomerErrors.email ? 'border-red-300' : ''}`}
                        placeholder="Nhập email"
                      />
                      {addCustomerErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{addCustomerErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="hometown" className="block text-sm font-medium text-gray-700">
                        Địa chỉ
                      </label>
                      <input
                        type="text"
                        name="hometown"
                        id="hometown"
                        value={newCustomer.hometown || ''}
                        onChange={handleNewCustomerChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 ${addCustomerErrors.hometown ? 'border-red-300' : ''}`}
                        placeholder="Nhập địa chỉ"
                      />
                      {addCustomerErrors.hometown && (
                        <p className="mt-1 text-sm text-red-600">{addCustomerErrors.hometown}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 bg-opacity-90 backdrop-filter backdrop-blur-sm px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={addCustomerLoading}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm ${addCustomerLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {addCustomerLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang lưu...
                      </>
                    ) : 'Thêm khách hàng'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={closeAddCustomerModal}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}