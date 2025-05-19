'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import Link from 'next/link'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { createClient } from '@/utils/supabase/client'
import AccessDenied from '@/components/AccessDenied'
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  ReceiptRefundIcon
} from '@heroicons/react/24/outline'

// Định nghĩa các interface
interface FinancialTransaction {
  id: string
  date: string
  type: 'income' | 'expense'
  amount: number
  capital?: number
  source: string
  description: string
  order_id?: string
  return_id?: string
  reference_id?: string
  payment_method?: string
}

interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  totalCapital: number
  netCashflow: number
  incomeCount: number
  expenseCount: number
}

interface ChartData {
  labels: string[]
  incomeValues: number[]
  expenseValues: number[]
}

type TimeGrouping = 'day' | 'week' | 'month' | 'year'

interface PaymentMethodSummary {
  method_name: string
  income_amount: number
  expense_amount: number
  transaction_count: number
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
  type: string;
  date: string;
  frozen: boolean; // Thêm trạng thái đóng băng
}

export default function FinancialReportsPage() {
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  // Hàm xử lý chuyển tab và lọc giao dịch
  const handleFilterAndSwitchTab = (transactionType: 'income' | 'expense') => {
    // Đặt bộ lọc trước
    setTypeFilter(transactionType);
    // Chuyển tab
    setActiveTab('details');
    // Đặt lại các bộ lọc khác về mặc định
    setDateRange({ from: '', to: '' });
    setMinAmount('');
    setMaxAmount('');
    // Gọi API để lấy dữ liệu sau khi React đã cập nhật UI
    setTimeout(() => {
      fetchFinancialData();
    }, 100);
  }

  // Refs cho xuất PDF
  const reportRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // State cho bộ lọc
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>('day')

  // State cho dữ liệu
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpense: 0,
    totalCapital: 0,
    netCashflow: 0,
    incomeCount: 0,
    expenseCount: 0
  })
  // State cho phân trang
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [cashflowByDay, setCashflowByDay] = useState<ChartData>({
    labels: [],
    incomeValues: [],
    expenseValues: []
  })
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSummary[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  // State để quản lý tooltip
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
    type: '',
    date: '',
    frozen: false
  })

  // Tham chiếu đến timer xử lý ẩn tooltip
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Hàm xử lý ẩn tooltip có độ trễ
  const handleHideTooltip = () => {
    // Nếu tooltip đang bị đóng băng, không ẩn
    if (tooltipState.frozen) return;
    
    // Tạo độ trễ trước khi ẩn tooltip
    tooltipTimerRef.current = setTimeout(() => {
      setTooltipState(prev => ({ ...prev, visible: false }));
    }, 1000); // Độ trễ 1 giây
  };
  
  // Hàm xử lý khi click vào cột để đóng băng/bỏ đóng băng tooltip
  const toggleFreezeTooltip = (e) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
    setTooltipState(prev => ({ ...prev, frozen: !prev.frozen }));
  };

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Kiểm tra vai trò người dùng hiện tại có phải admin không
  useEffect(() => {
    if (mounted) {
      const checkUserRole = async () => {
        try {
          const client = createClient()
          const { data: { session }, error: sessionError } = await client.auth.getSession()

          if (sessionError || !session) {
            console.error('Không có phiên đăng nhập:', sessionError?.message)
            setIsAdmin(false)
            setAuthLoading(false)
            return
          }

          const { data: accountData, error: accountError } = await client
            .from('accounts')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle()

          if (accountError || !accountData) {
            console.error('Lỗi khi lấy thông tin tài khoản:', accountError)
            setIsAdmin(false)
            setAuthLoading(false)
            return
          }

          setIsAdmin(accountData.role === 'admin')
          setAuthLoading(false)
        } catch (error) {
          console.error('Lỗi khi kiểm tra vai trò:', error)
          setIsAdmin(false)
          setAuthLoading(false)
        }
      }

      checkUserRole()
    }
  }, [mounted])

  // Hàm lấy dữ liệu báo cáo tài chính
  const fetchFinancialData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Tự động chọn chế độ xem dựa trên khoảng thời gian tìm kiếm
      if (dateRange.from && dateRange.to) {
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Nếu khoảng thời gian > 60 ngày, chuyển sang xem theo tháng
        if (diffDays > 60) {
          setTimeGrouping('month');
        }
        // Nếu khoảng thời gian > 30 ngày, chuyển sang xem theo tuần
        else if (diffDays > 30) {
          setTimeGrouping('week');
        } else {
          setTimeGrouping('day');
        }
      } else if (!dateRange.from && !dateRange.to) {
        // Nếu không có khoảng thời gian, mặc định xem theo ngày trong tuần hiện tại
        setTimeGrouping('day');
      }

      // Lấy dữ liệu đơn hàng (thu)
      let ordersQuery = supabase
        .from('orders')
        .select(`
          order_id,
          order_date,
          price,
          status,
          payment_method,
          payments(payment_method_name)
        `)
        .eq('status', 'Đã thanh toán')
        .order('order_date', { ascending: false })

      // Áp dụng bộ lọc theo ngày
      if (dateRange.from) {
        ordersQuery = ordersQuery.gte('order_date', `${dateRange.from}T00:00:00.000Z`)
      }
      if (dateRange.to) {
        ordersQuery = ordersQuery.lte('order_date', `${dateRange.to}T23:59:59.999Z`)
      }

      const { data: ordersData, error: ordersError } = await ordersQuery

      if (ordersError) {
        throw ordersError
      }

      // Lấy dữ liệu chi tiết đơn hàng để tính tổng vốn (chi phí nhập hàng)
      let orderDetailsQuery = supabase
        .from('orderdetails')
        .select(`
          orderdetail_id,
          order_id,
          quantity,
          cost_price_at_sale
        `)

      // Lọc theo danh sách order_id từ ordersData
      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(order => order.order_id)
        orderDetailsQuery = orderDetailsQuery.in('order_id', orderIds)
      }

      const { data: orderDetailsData, error: orderDetailsError } = await orderDetailsQuery

      if (orderDetailsError) {
        console.error('Lỗi khi lấy chi tiết đơn hàng:', orderDetailsError)
      }

      // Tính tổng vốn cho mỗi đơn hàng
      const orderCapitalMap = new Map()
      
      if (orderDetailsData) {
        orderDetailsData.forEach(detail => {
          const orderId = detail.order_id
          const detailCapital = (detail.cost_price_at_sale || 0) * (detail.quantity || 0)
          
          if (orderCapitalMap.has(orderId)) {
            orderCapitalMap.set(orderId, orderCapitalMap.get(orderId) + detailCapital)
          } else {
            orderCapitalMap.set(orderId, detailCapital)
          }
        })
      }

      // Lấy dữ liệu trả hàng (chi)
      let returnsQuery = supabase
        .from('returns')
        .select(`
          return_id,
          name_return,
          order_id,
          return_date,
          return_reason,
          refund_amount,
          status,
          orders(payment_method, payments(payment_method_name))
        `)
        .eq('status', 'đã chấp nhận')
        .order('return_date', { ascending: false })

      // Áp dụng bộ lọc theo ngày
      if (dateRange.from) {
        returnsQuery = returnsQuery.gte('return_date', `${dateRange.from}T00:00:00.000Z`)
      }
      if (dateRange.to) {
        returnsQuery = returnsQuery.lte('return_date', `${dateRange.to}T23:59:59.999Z`)
      }

      const { data: returnsData, error: returnsError } = await returnsQuery

      if (returnsError) {
        throw returnsError
      }

      // Chuyển đổi dữ liệu đơn hàng thành giao dịch tài chính
      const incomeTransactions: FinancialTransaction[] = (ordersData || []).map(order => {
        // Lấy tổng vốn của đơn hàng này
        const orderCapital = orderCapitalMap.get(order.order_id) || 0
        
        // Lấy tên phương thức thanh toán, xử lý an toàn hơn
        let paymentMethodName = 'Không xác định';
        if (order.payments && typeof order.payments === 'object') {
          paymentMethodName = order.payments.payment_method_name || 'Không xác định';
        }
        
        return {
          id: `order-${order.order_id}`,
          date: order.order_date,
          type: 'income',
          amount: order.price || 0,
          capital: orderCapital, // Thêm thông tin vốn
          source: 'Bán hàng',
          description: `Đơn hàng #${order.order_id}`,
          order_id: order.order_id,
          payment_method: paymentMethodName
        }
      })

      // Chuyển đổi dữ liệu trả hàng thành giao dịch tài chính
      const expenseTransactions: FinancialTransaction[] = (returnsData || []).map(returnItem => {
        // Lấy tên phương thức thanh toán, xử lý an toàn hơn
        let paymentMethodName = 'Không xác định';
        if (returnItem.orders && typeof returnItem.orders === 'object' && 
            returnItem.orders.payments && typeof returnItem.orders.payments === 'object') {
          paymentMethodName = returnItem.orders.payments.payment_method_name || 'Không xác định';
        }
        
        return {
          id: `return-${returnItem.return_id}`,
          date: returnItem.return_date,
          type: 'expense',
          amount: returnItem.refund_amount || 0,
          capital: 0, // Trả hàng không tính vốn
          source: 'Trả hàng',
          description: `${returnItem.name_return || 'Trả hàng'} #${returnItem.return_id} - ${returnItem.return_reason || ''}`,
          order_id: returnItem.order_id,
          return_id: returnItem.return_id.toString(),
          payment_method: paymentMethodName
        }
      })

      // Kết hợp và lọc giao dịch
      let allTransactions = [...incomeTransactions, ...expenseTransactions]

      // Lọc theo loại giao dịch nếu có
      if (typeFilter !== 'all') {
        allTransactions = allTransactions.filter(transaction => transaction.type === typeFilter)
      }

      // Lọc theo giá trị giao dịch nếu có
      if (minAmount && !isNaN(parseFloat(minAmount))) {
        allTransactions = allTransactions.filter(transaction => transaction.amount >= parseFloat(minAmount))
      }
      if (maxAmount && !isNaN(parseFloat(maxAmount))) {
        allTransactions = allTransactions.filter(transaction => transaction.amount <= parseFloat(maxAmount))
      }

      // Sắp xếp theo ngày mới nhất
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setTransactions(allTransactions)
      calculateFinancialSummary(allTransactions)
      calculateCashflowByDay(allTransactions)
      calculatePaymentMethodSummary(allTransactions)
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu báo cáo tài chính:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : (typeof error === 'object' && error !== null && 'details' in error
            ? String(error.details)
            : String(error)) || 'Không xác định';
      setError(`Lỗi khi lấy dữ liệu: ${errorMessage}`)
      setTransactions([])
      setFinancialSummary({
        totalIncome: 0,
        totalExpense: 0,
        totalCapital: 0,
        netCashflow: 0,
        incomeCount: 0,
        expenseCount: 0
      })
      setCashflowByDay({ labels: [], incomeValues: [], expenseValues: [] })
      setPaymentMethods([])
    } finally {
      setLoading(false)
    }
  }, [dateRange, typeFilter, minAmount, maxAmount, supabase, timeGrouping])

  // Cập nhật themeState từ context
  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme || themeColors.indigo
      })

      // Tải dữ liệu báo cáo khi component đã mounted
      fetchFinancialData()
    }
  }, [mounted, themeContext.currentTheme, fetchFinancialData])

  // Tính toán tổng kết tài chính
  const calculateFinancialSummary = (transactionsData: FinancialTransaction[]) => {
    const totalIncome = transactionsData
      .filter(transaction => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    const totalExpense = transactionsData
      .filter(transaction => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    
    // Tính tổng vốn từ tất cả các giao dịch thu nhập
    const totalCapital = transactionsData
      .filter(transaction => transaction.type === 'income')
      .reduce((sum, transaction) => sum + (transaction.capital || 0), 0)

    const incomeCount = transactionsData.filter(transaction => transaction.type === 'income').length
    const expenseCount = transactionsData.filter(transaction => transaction.type === 'expense').length

    setFinancialSummary({
      totalIncome,
      totalExpense,
      totalCapital,
      netCashflow: totalIncome - totalExpense - totalCapital,
      incomeCount,
      expenseCount
    })
  }

  // Tính toán dòng tiền theo thời gian (ngày, tuần, tháng, năm)
  const calculateCashflowByDay = (transactionsData: FinancialTransaction[]) => {
    // Nhóm giao dịch theo thời gian
    const cashflowMap = new Map<string, { income: number, expense: number }>()

    transactionsData.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      let timeKey = '';

      // Tạo key dựa trên chế độ xem
      switch (timeGrouping) {
        case 'day':
          // Format: YYYY-MM-DD
          timeKey = transactionDate.toISOString().split('T')[0];
          break;
        case 'week':
          // Lấy ngày đầu tuần (thứ 2)
          const day = transactionDate.getDay(); // 0 = CN, 1 = T2, ...
          const diff = transactionDate.getDate() - day + (day === 0 ? -6 : 1); // Điều chỉnh nếu là CN
          const monday = new Date(transactionDate);
          monday.setDate(diff);
          timeKey = monday.toISOString().split('T')[0];
          break;
        case 'month':
          // Format: YYYY-MM
          timeKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          // Format: YYYY
          timeKey = `${transactionDate.getFullYear()}`;
          break;
      }

      const currentCashflow = cashflowMap.get(timeKey) || { income: 0, expense: 0 }

      if (transaction.type === 'income') {
        currentCashflow.income += transaction.amount
      } else {
        currentCashflow.expense += transaction.amount
      }

      cashflowMap.set(timeKey, currentCashflow)
    })

    // Sắp xếp theo thời gian
    const sortedEntries = Array.from(cashflowMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    // Xác định số lượng mục cần hiển thị dựa trên chế độ xem
    let displayCount = 7; // Mặc định hiển thị 7 mục

    if (timeGrouping === 'month') {
      displayCount = 12; // Hiển thị tối đa 12 tháng
    } else if (timeGrouping === 'day') {
      // Nếu có khoảng thời gian tìm kiếm, hiển thị tất cả các ngày trong khoảng đó
      if (dateRange.from && dateRange.to) {
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        displayCount = Math.min(diffDays + 1, 31); // Giới hạn tối đa 31 ngày
      } else {
        // Nếu không có khoảng thời gian, hiển thị 7 ngày gần nhất
        displayCount = 7;
      }
    }

    // Lấy các mục cần hiển thị
    const limitedEntries = sortedEntries.slice(-displayCount)

    // Định dạng nhãn hiển thị dựa trên chế độ xem
    const labels = limitedEntries.map(([timeKey]) => {
      switch (timeGrouping) {
        case 'day':
          const [, month, day] = timeKey.split('-'); // YYYY-MM-DD
          return `${day}/${month}`;
        case 'week':
          const weekDate = new Date(timeKey);
          const endDate = new Date(weekDate);
          endDate.setDate(endDate.getDate() + 6);
          return `${weekDate.getDate()}/${weekDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`;
        case 'month':
          const [year, month2] = timeKey.split('-'); // YYYY-MM
          const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
          return `${monthNames[parseInt(month2) - 1]}/${year.slice(2)}`;
        case 'year':
          return timeKey; // YYYY
        default:
          return timeKey;
      }
    })

    const incomeValues = limitedEntries.map(([, cashflow]) => cashflow.income)
    const expenseValues = limitedEntries.map(([, cashflow]) => cashflow.expense)

    setCashflowByDay({
      labels,
      incomeValues,
      expenseValues
    })
  }

  // Tính toán tổng kết theo phương thức thanh toán
  const calculatePaymentMethodSummary = (transactionsData: FinancialTransaction[]) => {
    const methodMap = new Map<string, { income: number, expense: number, count: number }>()

    transactionsData.forEach(transaction => {
      const methodName = transaction.payment_method || 'Không xác định'
      const current = methodMap.get(methodName) || { income: 0, expense: 0, count: 0 }

      if (transaction.type === 'income') {
        current.income += transaction.amount
      } else {
        current.expense += transaction.amount
      }

      current.count += 1
      methodMap.set(methodName, current)
    })

    const paymentMethodSummary: PaymentMethodSummary[] = Array.from(methodMap.entries()).map(([method, stats]) => ({
      method_name: method,
      income_amount: stats.income,
      expense_amount: stats.expense,
      transaction_count: stats.count
    }))

    // Sắp xếp theo tổng giao dịch
    paymentMethodSummary.sort((a, b) =>
      (b.income_amount + b.expense_amount) - (a.income_amount + a.expense_amount)
    )

    setPaymentMethods(paymentMethodSummary)
  }


  // Hàm reset bộ lọc
  const resetFilters = () => {
    setDateRange({ from: '', to: '' })
    setTypeFilter('all')
    setMinAmount('')
    setMaxAmount('')

    // Gọi lại API để lấy dữ liệu không lọc
    fetchFinancialData()
  }

  // Hàm xuất báo cáo PDF
  const exportToPDF = async () => {
    if (!reportRef.current) return

    try {
      setExportingPdf(true)

      const reportElement = reportRef.current
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        logging: false,
        useCORS: true
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`bao-cao-tai-chinh-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error)
    } finally {
      setExportingPdf(false)
    }
  }

  // Xuất dữ liệu sang CSV
  const exportToCSV = () => {
    // Tạo tiêu đề
    let csvContent = 'ID,Ngày,Loại giao dịch,Nguồn,Mô tả,Giá trị,Vốn,Phương thức thanh toán\n'

    // Thêm dữ liệu từng giao dịch
    transactions.forEach(transaction => {
      // Định dạng ngày
      const date = new Date(transaction.date)
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`

      // Thêm dòng dữ liệu
      csvContent += `"${transaction.id}","${formattedDate}","${
        transaction.type === 'income' ? 'Thu' : 'Chi'
      }","${transaction.source}","${transaction.description}","${
        transaction.amount
      }","${transaction.capital || 0}","${transaction.payment_method || 'Không xác định'}"\n`
    })

    // Tính tổng
    csvContent += `\n"TỔNG","","","","","${financialSummary.totalIncome}","${financialSummary.totalCapital}"\n`
    csvContent += `"TỔNG CHI","","","","","${financialSummary.totalExpense}",""\n`
    csvContent += `"DÒNG TIỀN RÒNG","","","","","${financialSummary.netCashflow}",""\n`

    // Tạo đối tượng Blob và URL tải xuống
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `bao-cao-tai-chinh-${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Format số tiền
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  // Hiển thị loading khi đang kiểm tra quyền
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        <p className="ml-2 text-gray-500">Đang tải...</p>
      </div>
    )
  }

  // Hiển thị thông báo từ chối truy cập nếu không phải admin
  if (!isAdmin) {
    return <AccessDenied message="Truy cập bị từ chối. Bạn không có quyền truy cập chức năng báo cáo tài chính. Chỉ có admin mới truy cập được." />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href="/dashboard/reports" className="mr-4">
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Báo cáo tài chính</h1>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={exportToPDF}
            disabled={loading || exportingPdf}
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 disabled:opacity-50`}
          >
            {exportingPdf ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-0.5 mr-2 h-4 w-4" />
                Đang xuất...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="-ml-0.5 mr-2 h-4 w-4" />
                Xuất PDF
              </>
            )}
          </button>

          <button
            onClick={exportToCSV}
            disabled={loading || transactions.length === 0}
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 disabled:opacity-50`}
          >
            <ArrowDownTrayIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Xuất CSV
          </button>

          <button
            onClick={() => fetchFinancialData()}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? (
              <ArrowPathIcon className="animate-spin h-4 w-4" />
            ) : (
              <ArrowPathIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white shadow rounded-lg mb-6 p-2">
        <div className="flex flex-col md:flex-row md:items-end space-y-2 md:space-y-0 md:space-x-2">
          <div className="flex-1">
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-0.5">
              Từ ngày
            </label>
            <input
              type="date"
              id="date-from"
              value={dateRange.from}
              onChange={(e) => {
                setDateRange({ ...dateRange, from: e.target.value });
                // Tự động tìm kiếm khi thay đổi giá trị
                if (e.target.value !== dateRange.from) {
                  setTimeout(() => fetchFinancialData(), 300);
                }
              }}
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-9 px-2"
            />
          </div>

          <div className="flex-1">
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-0.5">
              Đến ngày
            </label>
            <input
              type="date"
              id="date-to"
              value={dateRange.to}
              onChange={(e) => {
                setDateRange({ ...dateRange, to: e.target.value });
                // Tự động tìm kiếm khi thay đổi giá trị
                if (e.target.value !== dateRange.to) {
                  setTimeout(() => fetchFinancialData(), 300);
                }
              }}
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-9 px-2"
            />
          </div>

          <div className="flex-1">
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-0.5">
              Loại giao dịch
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as 'all' | 'income' | 'expense');
                // Tự động tìm kiếm khi thay đổi giá trị
                setTimeout(() => fetchFinancialData(), 300);
              }}
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-9 px-2"
            >
              <option value="all">Tất cả</option>
              <option value="income">Thu</option>
              <option value="expense">Chi</option>
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="min-amount" className="block text-sm font-medium text-gray-700 mb-0.5">
              Số tiền từ
            </label>
            <input
              type="number"
              id="min-amount"
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                // Tự động tìm kiếm khi thay đổi giá trị sau một khoảng thời gian ngắn
                setTimeout(() => fetchFinancialData(), 500);
              }}
              placeholder="0"
              min="0"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-9 px-2"
            />
          </div>

          <div className="flex-1">
            <label htmlFor="max-amount" className="block text-sm font-medium text-gray-700 mb-0.5">
              Đến
            </label>
            <input
              type="number"
              id="max-amount"
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value);
                // Tự động tìm kiếm khi thay đổi giá trị sau một khoảng thời gian ngắn
                setTimeout(() => fetchFinancialData(), 500);
              }}
              placeholder="Không giới hạn"
              min="0"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-9 px-2"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={resetFilters}
              disabled={loading}
              className="inline-flex items-center px-2 py-1 border border-gray-200 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 h-9"
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? `border-${themeColor}-500 text-${themeColor}-600`
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Tổng quan
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`${
              activeTab === 'details'
                ? `border-${themeColor}-500 text-${themeColor}-600`
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Chi tiết giao dịch
          </button>
        </nav>
      </div>

      {/* Nội dung báo cáo */}
      <div ref={reportRef}>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <ArrowPathIcon className="animate-spin h-8 w-8 text-gray-400" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div>
                {/* Thẻ tổng quan */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-lg overflow-hidden border-l-4 border-green-500">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-500">
                          Tổng thu
                        </div>
                        <div>
                          <ArrowUpIcon className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div className="mt-1">
                        <div className="text-xl font-semibold">
                          {formatCurrency(financialSummary.totalIncome)}
                        </div>
                      </div>
                      <div
                        className="mt-2 text-sm font-medium text-green-600 cursor-pointer hover:underline"
                        onClick={() => handleFilterAndSwitchTab('income')}
                      >
                        {financialSummary.incomeCount} giao dịch
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg overflow-hidden border-l-4 border-red-500">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-500">
                          Tổng chi
                        </div>
                        <div>
                          <ArrowDownIcon className="h-5 w-5 text-red-600" />
                        </div>
                      </div>
                      <div className="mt-1">
                        <div className="text-xl font-semibold">
                          {formatCurrency(financialSummary.totalExpense)}
                        </div>
                      </div>
                      <div
                        className="mt-2 text-sm font-medium text-red-600 cursor-pointer hover:underline"
                        onClick={() => handleFilterAndSwitchTab('expense')}
                      >
                        {financialSummary.expenseCount} giao dịch
                      </div>
                    </div>
                  </div>

                  {/* Thêm ô mới: Tổng vốn */}
                  <div className="bg-white rounded-lg overflow-hidden border-l-4 border-yellow-500">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-500">
                          Tổng vốn
                        </div>
                        <div>
                          <ReceiptRefundIcon className="h-5 w-5 text-yellow-600" />
                        </div>
                      </div>
                      <div className="mt-1">
                        <div className="text-xl font-semibold">
                          {formatCurrency(financialSummary.totalCapital)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm font-medium text-yellow-600">
                        Giá nhập của hàng bán
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg overflow-hidden border-l-4 border-blue-500">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-500">
                          Dòng tiền ròng
                        </div>
                        <div>
                          <BanknotesIcon className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="mt-1">
                        <div className={`text-xl font-semibold ${financialSummary.netCashflow >= 0 ? 'text-blue-600' : 'text-yellow-600'}`}>
                          {formatCurrency(financialSummary.netCashflow)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm font-medium text-blue-600">
                        Lợi nhuận của doanh nghiệp
                      </div>
                    </div>
                  </div>
                </div>

                {/* Biểu đồ dòng tiền */}
                <div className="bg-white shadow rounded-lg mb-6 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Doanh thu theo {timeGrouping === 'day' ? 'ngày' : timeGrouping === 'month' ? 'tháng' : 'tuần'}</h3>

                    {/* Bộ chọn chế độ xem */}
                    <div className="flex items-center space-x-2">
                      <label htmlFor="time-grouping" className="text-sm font-medium text-gray-700">
                        Xem theo:
                      </label>
                      <select
                        id="time-grouping"
                        value={timeGrouping}
                        onChange={(e) => {
                          setTimeGrouping(e.target.value as TimeGrouping);
                          // Tính toán lại dữ liệu biểu đồ
                          calculateCashflowByDay(transactions);
                        }}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-9 px-2"
                      >
                        <option value="day">Ngày</option>
                        <option value="week">Tuần</option>
                        <option value="month">Tháng</option>
                      </select>
                    </div>
                  </div>

                  {cashflowByDay.labels.length > 0 ? (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Doanh thu theo {timeGrouping === 'day' ? 'ngày' : timeGrouping === 'month' ? 'tháng' : 'tuần'}</h3>
                      
                      <div className="relative h-80 mt-4 mb-8">
                        {/* Tính toán giá trị trước để sử dụng cho cả biểu đồ và thông báo */}
                        {(() => {
                          // Tìm giá trị lớn nhất
                          const maxIncome = Math.max(...cashflowByDay.incomeValues);
                          const maxExpense = Math.max(...cashflowByDay.expenseValues);
                          const maxValue = Math.max(maxIncome, maxExpense, 1); // Đảm bảo không bị chia cho 0
                          
                          // Điều chỉnh tỷ lệ để các giá trị thấp vẫn có thể nhìn thấy được
                          // Ước tính giá trị trung bình để làm cơ sở
                          const avgIncome = cashflowByDay.incomeValues.reduce((sum, val) => sum + val, 0) / cashflowByDay.incomeValues.length;
                          
                          // Nếu giá trị max > 10 lần giá trị trung bình (không tính max), thì điều chỉnh tỷ lệ
                          let roundedMax = Math.ceil(maxValue / 1000000) * 1000000;
                          
                          // Nếu sử dụng biểu đồ cột kết hợp, các giá trị nhỏ vẫn hiển thị tốt
                          // Nên chỉ điều chỉnh nếu giá trị lớn nhất > 20 lần giá trị trung bình
                          if (maxValue > avgIncome * 20) {
                            roundedMax = Math.ceil(avgIncome * 5 / 1000000) * 1000000;
                          }
                          
                          // Đảm bảo có giá trị tối thiểu cho roundedMax
                          roundedMax = Math.max(roundedMax, 1000000); // Ít nhất 1 triệu
                          
                          // Tạo mảng các ngày của tuần để hiển thị tất cả điểm dữ liệu
                          const availableDates = cashflowByDay.labels.map((label, index) => ({
                            label,
                            incomeValue: cashflowByDay.incomeValues[index] || 0,
                            expenseValue: cashflowByDay.expenseValues[index] || 0,
                            // Đánh dấu giá trị vượt quá tỷ lệ
                            isIncomeExceeded: cashflowByDay.incomeValues[index] > roundedMax,
                            isExpenseExceeded: cashflowByDay.expenseValues[index] > roundedMax,
                            // Lưu giá trị hiển thị (bị cắt ngọn nếu cần)
                            displayIncomeValue: Math.min(cashflowByDay.incomeValues[index] || 0, roundedMax),
                            displayExpenseValue: Math.min(cashflowByDay.expenseValues[index] || 0, roundedMax)
                          }));
                          
                          // Tính số triệu đồng để hiển thị
                          const formatToMillions = (value) => {
                            return `${(value / 1000000).toFixed(1)} tr`;
                          };
                          
                          // Tính khoảng cách giữa các mức grid line
                          const yAxisSteps = 6; // 6 steps
                          const stepValue = roundedMax / (yAxisSteps - 1);
                          
                          // Tính chiều rộng của mỗi cột
                          const barWidth = 4; // Cột nhỏ hơn, giảm từ 6px xuống 4px
                          const columnCount = availableDates.length;
                          
                          // Format giá trị tiền tệ ngắn gọn
                          const formatCurrency = (value) => {
                            if (value >= 1000000000) {
                              return `${(value / 1000000000).toFixed(1)}tỷ`;
                            } else if (value >= 1000000) {
                              return `${(value / 1000000).toFixed(1)}tr`;
                            } else if (value >= 1000) {
                              return `${(value / 1000).toFixed(0)}k`;
                            }
                            return `${value}đ`;
                          };

                          return (
                            <>
                              {/* Tiêu đề đơn vị */}
                              <div className="flex justify-center mb-4">
                                <div className="flex items-center px-3 py-1 rounded-full bg-blue-100 border border-blue-200">
                                  <div className="w-4 h-4 bg-blue-500 rounded-sm mr-2"></div>
                                  <span className="text-sm font-medium">Doanh số (triệu VNĐ)</span>
                                </div>
                              </div>
                            
                              {/* Vùng grid lines */}
                              <div className="absolute inset-0 right-0 bottom-10 border border-gray-200 bg-white">
                                {/* Đường kẻ dọc */}
                                {Array.from({ length: availableDates.length }).map((_, i) => (
                                  <div 
                                    key={`vgrid-${i}`} 
                                    className="absolute bottom-0 top-0 border-l border-gray-100"
                                    style={{ 
                                      left: `${14 + (i * (100 - 14) / (columnCount - 1))}%`,
                                      borderLeftWidth: i === 0 ? 0 : '1px'
                                    }}
                                  />
                                ))}
                                
                                {/* Đường kẻ ngang và giá trị */}
                                {Array.from({ length: yAxisSteps }).map((_, i) => {
                                  const yPos = i * (100 / (yAxisSteps - 1));
                                  const value = roundedMax - (i * stepValue);
                                  return (
                                    <div 
                                      key={`hgrid-${i}`}
                                      className="absolute left-0 right-0 flex items-center"
                                      style={{ top: `${yPos}%` }}
                                    >
                                      <span className="text-xs text-gray-500 w-14 text-right pr-2">
                                        {formatToMillions(value)}
                                      </span>
                                      <div className="flex-1 border-b border-gray-100"></div>
                                    </div>
                                  );
                                })}
                                
                                {/* Biểu đồ */}
                                <div className="absolute top-0 left-14 right-4 bottom-0">
                                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    {/* Biểu đồ cột cho Thu */}
                                    {availableDates.map((item, index) => {
                                      const x = index * (100 / (columnCount - 1));
                                      const barHeight = (item.displayIncomeValue / roundedMax) * 100;
                                      const barX = x - (barWidth / 2);
                                      
                                      return (
                                        <g 
                                          key={`bar-income-${index}`} 
                                          className="cursor-pointer"
                                          onMouseEnter={(e) => {
                                            // Hủy timer ẩn nếu có
                                            if (tooltipTimerRef.current) {
                                              clearTimeout(tooltipTimerRef.current);
                                              tooltipTimerRef.current = null;
                                            }
                                            
                                            // Lấy vị trí của sự kiện chuột
                                            const svg = e.currentTarget.closest('svg');
                                            const pt = svg.createSVGPoint();
                                            pt.x = e.clientX;
                                            pt.y = e.clientY;
                                            const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
                                            
                                            // Hiển thị tooltip với nội dung là giá trị thu
                                            setTooltipState({
                                              visible: true,
                                              x: svgP.x,
                                              y: Math.max(svgP.y - 5, 10), // Đảm bảo tooltip không bị cắt phía trên
                                              content: formatCurrency(item.incomeValue),
                                              type: 'income',
                                              date: item.label,
                                              frozen: tooltipState.frozen // Giữ nguyên trạng thái đóng băng
                                            });
                                          }}
                                                                                    onMouseLeave={handleHideTooltip}                                          onClick={toggleFreezeTooltip}
                                        >
                                          {/* Cột thu */}
                                          <rect 
                                            x={barX} 
                                            y={100 - barHeight} 
                                            width={barWidth} 
                                            height={barHeight}
                                            fill="rgba(79, 129, 255, 0.5)"
                                            rx="1"
                                            className="transition-opacity duration-150"
                                            opacity={tooltipState.visible && tooltipState.type === 'income' && tooltipState.date === item.label ? "0.9" : "0.5"}
                                          />
                                          
                                          {/* Thêm điểm tròn ở đỉnh cột */}
                                          <circle 
                                            cx={x}
                                            cy={100 - barHeight}
                                            r="1.5"
                                            fill="#4F81FF"
                                            opacity={barHeight > 0 ? "1" : "0"}
                                          />
                                          
                                          {/* Hiển thị dấu ^ nếu giá trị vượt quá */}
                                          {item.isIncomeExceeded && (
                                            <text 
                                              x={x}
                                              y={5}
                                              textAnchor="middle"
                                              fontSize="6"
                                              fill="#4F81FF"
                                              fontWeight="bold"
                                            >
                                              ↑
                                            </text>
                                          )}
                                        </g>
                                      );
                                    })}
                                    
                                    {/* Đường kết nối cho biểu đồ cột Thu */}
                                    <path 
                                      d={`M${availableDates.map((item, index) => {
                                        const x = index * (100 / (columnCount - 1));
                                        const y = 100 - (item.displayIncomeValue / roundedMax * 100);
                                        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
                                      }).join(' ')}`}
                                      fill="none"
                                      stroke="#4F81FF" 
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeDasharray={timeGrouping === 'month' ? "0" : "1,1"}
                                    />
                                    
                                    {/* Biểu đồ cột cho Chi */}
                                    {availableDates.map((item, index) => {
                                      const x = index * (100 / (columnCount - 1));
                                      const barHeight = (item.displayExpenseValue / roundedMax) * 100;
                                      const barX = x - (barWidth / 2);
                                      
                                      return (
                                        <g 
                                          key={`bar-expense-${index}`} 
                                          className="cursor-pointer"
                                          onMouseEnter={(e) => {
                                            // Lấy vị trí của sự kiện chuột
                                            const svg = e.currentTarget.closest('svg');
                                            const pt = svg.createSVGPoint();
                                            pt.x = e.clientX;
                                            pt.y = e.clientY;
                                            const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
                                            
                                            // Hiển thị tooltip với nội dung là giá trị chi
                                            setTooltipState({
                                              visible: true,
                                              x: svgP.x,
                                              y: Math.max(svgP.y - 5, 10), // Đảm bảo tooltip không bị cắt phía trên
                                              content: formatCurrency(item.expenseValue),
                                              type: 'expense',
                                              date: item.label,
                                              frozen: false
                                            });
                                          }}
                                                                                    onMouseLeave={handleHideTooltip}                                          onClick={toggleFreezeTooltip}
                                        >
                                          {/* Cột chi */}
                                          <rect 
                                            x={barX} 
                                            y={100 - barHeight} 
                                            width={barWidth} 
                                            height={barHeight}
                                            fill="rgba(255, 77, 79, 0.3)"
                                            rx="1"
                                            className="transition-opacity duration-150"
                                            opacity={tooltipState.visible && tooltipState.type === 'expense' && tooltipState.date === item.label ? "0.8" : "0.3"}
                                          />
                                          
                                          {/* Thêm điểm tròn ở đỉnh cột */}
                                          <circle 
                                            cx={x}
                                            cy={100 - barHeight}
                                            r="1.5"
                                            fill="#FF4D4F"
                                            opacity={barHeight > 0 ? "1" : "0"}
                                          />
                                          
                                          {/* Hiển thị dấu ^ nếu giá trị vượt quá */}
                                          {item.isExpenseExceeded && (
                                            <text 
                                              x={x}
                                              y={10}
                                              textAnchor="middle"
                                              fontSize="6"
                                              fill="#FF4D4F"
                                              fontWeight="bold"
                                            >
                                              ↑
                                            </text>
                                          )}
                                        </g>
                                      );
                                    })}
                                    
                                    {/* Đường kết nối cho biểu đồ cột Chi */}
                                    <path 
                                      d={`M${availableDates.map((item, index) => {
                                        const x = index * (100 / (columnCount - 1));
                                        const y = 100 - (item.displayExpenseValue / roundedMax * 100);
                                        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
                                      }).join(' ')}`}
                                      fill="none"
                                      stroke="#FF4D4F" 
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      opacity="0.8"
                                      strokeDasharray={timeGrouping === 'month' ? "0" : "1,1"}
                                    />

                                    {/* Tooltip tùy chỉnh */}
                                    {tooltipState.visible && (
                                      <foreignObject 
                                        x={tooltipState.x - 15} 
                                        y={tooltipState.y - 15} 
                                        width="30" 
                                        height="30"
                                      >
                                        <div 
                                          className={`py-0.5 px-1 rounded-sm text-white font-medium shadow-sm ${
                                            tooltipState.type === 'income' ? 'bg-blue-600' : 'bg-red-600'
                                          } ${tooltipState.frozen ? 'ring-1 ring-yellow-300' : ''}`}
                                          style={{ 
                                            fontSize: '6px', 
                                            lineHeight: '8px',
                                            whiteSpace: 'nowrap',
                                            transform: 'scale(0.85)',
                                            transformOrigin: 'center'
                                          }}
                                        >
                                          <div>{tooltipState.date}</div>
                                          <div>{tooltipState.content}</div>
                                          {tooltipState.frozen && (
                                            <div className="text-yellow-200 text-[5px] mt-0.5">
                                              Nhấp để bỏ ghim
                                            </div>
                                          )}
                                        </div>
                                      </foreignObject>
                                    )}
                                  </svg>
                                </div>
                              </div>
                              
                              {/* Nhãn trục X */}
                              <div className="absolute left-14 right-4 bottom-0">
                                {availableDates.map((item, index) => {
                                  // Tính toán vị trí chính xác cho mỗi nhãn để thẳng với cột
                                  const position = (index / (columnCount - 1)) * 100;
                                  return (
                                    <div 
                                      key={`label-${index}`} 
                                      className="absolute text-xs font-medium text-gray-600 text-center"
                                      style={{
                                        left: `${position}%`,
                                        transform: 'translateX(-50%)', // Căn giữa nhãn với cột
                                        bottom: '2px',
                                        width: 'auto', // Cho phép nhãn hiển thị đúng kích thước
                                        maxWidth: '40px', // Giới hạn chiều rộng tối đa
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}
                                    >
                                      {item.label}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Chú thích */}
                              <div className="absolute -bottom-8 w-full flex justify-center">
                                <div className="flex items-center space-x-6">
                                  <div className="flex items-center">
                                    <div className="h-3 w-6 bg-blue-500 opacity-50 rounded-sm mr-2"></div>
                                    <span className="text-sm text-gray-700">Thu</span>
                                  </div>
                                  <div className="flex items-center">
                                    <div className="h-3 w-6 bg-red-500 opacity-30 rounded-sm mr-2"></div>
                                    <span className="text-sm text-gray-700">Chi</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Thông báo về giá trị vượt quá */}
                              {availableDates.some(d => d.isIncomeExceeded || d.isExpenseExceeded) && (
                                <div className="absolute -bottom-16 w-full flex justify-center">
                                  <div className="text-xs text-gray-500">
                                    ↑ Một số giá trị vượt quá thang đo, kiểm tra chi tiết bằng cách di chuột vào biểu đồ
                                  </div>
                                </div>
                              )}
                              
                              {/* Hướng dẫn sử dụng */}
                                                            <div className="absolute -bottom-24 w-full flex justify-center">                                <div className="bg-gray-50 px-3 py-1.5 rounded-md shadow-sm border border-gray-200">                                  <div className="text-xs text-gray-700 flex items-center space-x-3">                                    <span>                                      <span className="font-medium text-blue-600">Di chuột</span>: Xem chi tiết                                    </span>                                    <span>                                      <span className="font-medium text-blue-600">Nhấp lần đầu</span>: Ghim thông tin                                    </span>                                    <span>                                      <span className="font-medium text-blue-600">Nhấp lại</span>: Bỏ ghim                                    </span>                                  </div>                                </div>                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-gray-500">Không có dữ liệu để hiển thị</p>
                    </div>
                  )}
                </div>

                {/* Phương thức thanh toán */}
                <div className="bg-white shadow rounded-lg mb-6 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Theo phương thức thanh toán</h3>

                  {paymentMethods.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Phương thức
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tổng thu
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tổng chi
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Số giao dịch
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paymentMethods.map((method, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {method.method_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className="text-green-600">{formatCurrency(method.income_amount)}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className="text-red-600">{formatCurrency(method.expense_amount)}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {method.transaction_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-gray-500">Không có dữ liệu phương thức thanh toán</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div ref={tableRef} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-3 sm:px-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Chi tiết giao dịch tài chính
                      </h3>
                      <p className="mt-0.5 max-w-2xl text-sm text-gray-500">
                        Danh sách tất cả các giao dịch thu chi
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label htmlFor="page-size" className="text-sm font-medium text-gray-700">
                        Hiển thị:
                      </label>
                      <select
                        id="page-size"
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value))
                          setCurrentPage(1) // Reset về trang đầu khi thay đổi số lượng hiển thị
                        }}
                        className="shadow-sm border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md h-8"
                      >
                        <option value={10}>10 dòng</option>
                        <option value={20}>20 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                      </select>
                    </div>
                  </div>
                </div>

                {transactions.length > 0 ? (
                  <>
                    {/* Hiển thị tổng thu chi cho các giao dịch đã lọc */}
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-4">
                          <div className="mb-2 md:mb-0 md:mr-6">
                            <span className="text-sm font-medium text-gray-500">Tổng thu:</span>{' '}
                            <span className="font-bold text-green-600">{formatCurrency(financialSummary.totalIncome)}</span>
                          </div>
                          <div className="mb-2 md:mb-0 md:mr-6">
                            <span className="text-sm font-medium text-gray-500">Tổng chi:</span>{' '}
                            <span className="font-bold text-red-600">{formatCurrency(financialSummary.totalExpense)}</span>
                          </div>
                          <div className="mb-2 md:mb-0 md:mr-6">
                            <span className="text-sm font-medium text-gray-500">Tổng vốn:</span>{' '}
                            <span className="font-bold text-yellow-600">{formatCurrency(financialSummary.totalCapital)}</span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Dòng tiền ròng:</span>{' '}
                            <span className={`font-bold ${
                              financialSummary.netCashflow >= 0 ? 'text-blue-600' : 'text-yellow-600'
                            }`}>
                              {formatCurrency(financialSummary.netCashflow)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Số giao dịch:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {transactions.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ngày
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Loại
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Số tiền
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nguồn
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mô tả
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Phương thức
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactions
                            .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                            .map((transaction) => (
                              <tr key={transaction.id}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(transaction.date).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    transaction.type === 'income'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {transaction.type === 'income' ? 'Thu' : 'Chi'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                  <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                    {formatCurrency(transaction.amount)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {transaction.source}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                                  {transaction.description}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {transaction.payment_method}
                                </td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Phân trang */}
                    {transactions.length > pageSize && (
                      <div className="px-4 py-2 flex items-center justify-between border-t border-gray-200">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Trước
                          </button>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(transactions.length / pageSize)))}
                            disabled={currentPage === Math.ceil(transactions.length / pageSize)}
                            className="ml-2 relative inline-flex items-center px-3 py-1 border border-gray-300 bg-white text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Sau
                          </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Hiển thị <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, transactions.length)}</span> đến{' '}
                              <span className="font-medium">{Math.min(currentPage * pageSize, transactions.length)}</span> trong tổng số{' '}
                              <span className="font-medium">{transactions.length}</span> giao dịch
                            </p>
                          </div>
                          <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                              <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-1.5 py-1 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <span className="sr-only">Trang đầu</span>
                                <span>&laquo;</span>
                              </button>
                              <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-1.5 py-1 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <span className="sr-only">Trang trước</span>
                                <span>&lsaquo;</span>
                              </button>

                              {/* Hiển thị các nút trang */}
                              {Array.from({ length: Math.min(5, Math.ceil(transactions.length / pageSize)) }, (_, i) => {
                                // Tính toán số trang để hiển thị xung quanh trang hiện tại
                                const totalPages = Math.ceil(transactions.length / pageSize)
                                let startPage = Math.max(1, currentPage - 2)
                                const endPage = Math.min(startPage + 4, totalPages)

                                if (endPage - startPage < 4) {
                                  startPage = Math.max(1, endPage - 4)
                                }

                                const pageNumber = startPage + i
                                if (pageNumber <= totalPages) {
                                  return (
                                    <button
                                      key={pageNumber}
                                      onClick={() => setCurrentPage(pageNumber)}
                                      className={`relative inline-flex items-center px-3 py-1 border ${
                                        currentPage === pageNumber
                                          ? `bg-${themeColor}-50 border-${themeColor}-500 text-${themeColor}-600`
                                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                      } text-sm font-medium`}
                                    >
                                      {pageNumber}
                                    </button>
                                  )
                                }
                                return null
                              })}

                              <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(transactions.length / pageSize)))}
                                disabled={currentPage === Math.ceil(transactions.length / pageSize)}
                                className="relative inline-flex items-center px-1.5 py-1 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <span className="sr-only">Trang sau</span>
                                <span>&rsaquo;</span>
                              </button>
                              <button
                                onClick={() => setCurrentPage(Math.ceil(transactions.length / pageSize))}
                                disabled={currentPage === Math.ceil(transactions.length / pageSize)}
                                className="relative inline-flex items-center px-1.5 py-1 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <span className="sr-only">Trang cuối</span>
                                <span>&raquo;</span>
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <ReceiptRefundIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Không có giao dịch</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Không tìm thấy giao dịch tài chính nào phù hợp với bộ lọc.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}