// Sample data - mô phỏng dữ liệu từ database
const sampleOrders = [
    {
        id: 'ORDER-001',
        customer: 'Nguyễn Văn An',
        phone: '0901234567',
        address: '123 Đường ABC, Quận 1, TP.HCM',
        total: 2500000,
        status: 'Chờ xác nhận',
        isShipping: true,
        paymentMethod: 'COD',
        orderDate: '2024-01-15T10:30:00',
        products: [
            { name: 'iPhone 15 Pro', quantity: 1, price: 2500000 }
        ]
    },
    {
        id: 'ORDER-002',
        customer: 'Trần Thị Bình',
        phone: '0912345678',
        address: '456 Đường XYZ, Quận 3, TP.HCM',
        total: 1200000,
        status: 'Đã xác nhận',
        isShipping: false,
        paymentMethod: 'Tiền mặt',
        orderDate: '2024-01-15T11:15:00',
        products: [
            { name: 'Samsung Galaxy A54', quantity: 1, price: 1200000 }
        ]
    },
    {
        id: 'ORDER-003',
        customer: 'Lê Văn Cường',
        phone: '0923456789',
        address: '789 Đường DEF, Quận 7, TP.HCM',
        total: 3200000,
        status: 'Đã chuẩn bị xong',
        isShipping: true,
        paymentMethod: 'Chuyển khoản',
        orderDate: '2024-01-15T09:45:00',
        products: [
            { name: 'MacBook Air M2', quantity: 1, price: 2800000 },
            { name: 'AirPods Pro', quantity: 1, price: 400000 }
        ]
    }
];

let currentOrders = [...sampleOrders];
let selectedOrder = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    renderOrders();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('statusFilter').addEventListener('change', filterOrders);
    document.getElementById('typeFilter').addEventListener('change', filterOrders);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('orderModal');
        const statusModal = document.getElementById('statusModal');
        if (event.target === modal) {
            closeModal();
        }
        if (event.target === statusModal) {
            closeStatusModal();
        }
    });
}

function renderOrders() {
    const grid = document.getElementById('ordersGrid');
    grid.innerHTML = '';
    
    currentOrders.forEach(order => {
        const orderCard = createOrderCard(order);
        grid.appendChild(orderCard);
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.onclick = () => showOrderDetails(order);
    
    const statusClass = getStatusClass(order.status);
    const shippingIcon = order.isShipping ? '<i class="fas fa-shipping-fast"></i>' : '<i class="fas fa-store"></i>';
    
    card.innerHTML = `
        <div class="order-header">
            <div class="order-id">${order.id}</div>
            <div class="order-status ${statusClass}">${order.status}</div>
        </div>
        <div class="order-info">
            <div class="info-row">
                <span class="info-label"><i class="fas fa-user"></i> Khách hàng:</span>
                <span class="info-value">${order.customer}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-phone"></i> SĐT:</span>
                <span class="info-value">${order.phone}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-money-bill"></i> Tổng tiền:</span>
                <span class="info-value">${formatCurrency(order.total)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">${shippingIcon} Loại:</span>
                <span class="info-value">${order.isShipping ? 'Vận chuyển' : 'Lấy tại chỗ'}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-clock"></i> Thời gian:</span>
                <span class="info-value">${formatDateTime(order.orderDate)}</span>
            </div>
        </div>
    `;
    
    return card;
}

function showOrderDetails(order) {
    selectedOrder = order;
    const modal = document.getElementById('orderModal');
    const modalBody = document.getElementById('modalBody');
    
    const productsHtml = order.products.map(product => `
        <li class="product-item">
            <span>${product.name} x ${product.quantity}</span>
            <span>${formatCurrency(product.price)}</span>
        </li>
    `).join('');
    
    modalBody.innerHTML = `
        <div class="order-details">
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Thông tin đơn hàng</h4>
                <div class="detail-grid">
                    <div class="info-row">
                        <span class="info-label">Mã đơn:</span>
                        <span class="info-value">${order.id}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Trạng thái:</span>
                        <span class="info-value order-status ${getStatusClass(order.status)}">${order.status}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Thời gian đặt:</span>
                        <span class="info-value">${formatDateTime(order.orderDate)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Phương thức thanh toán:</span>
                        <span class="info-value">${order.paymentMethod}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Thông tin khách hàng</h4>
                <div class="detail-grid">
                    <div class="info-row">
                        <span class="info-label">Tên:</span>
                        <span class="info-value">${order.customer}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">SĐT:</span>
                        <span class="info-value">${order.phone}</span>
                    </div>
                    <div class="info-row" style="grid-column: 1 / -1;">
                        <span class="info-label">Địa chỉ:</span>
                        <span class="info-value">${order.address}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-box"></i> Sản phẩm</h4>
                <ul class="products-list">
                    ${productsHtml}
                </ul>
                <div class="info-row" style="margin-top: 15px; font-weight: 600; font-size: 1.1rem;">
                    <span class="info-label">Tổng cộng:</span>
                    <span class="info-value">${formatCurrency(order.total)}</span>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
    selectedOrder = null;
}

function closeStatusModal() {
    document.getElementById('statusModal').style.display = 'none';
}

function acceptOrder() {
    if (!selectedOrder) return;
    
    selectedOrder.status = 'Đã xác nhận';
    updateOrderInList(selectedOrder);
    showNotification('Đơn hàng đã được chấp nhận!', 'success');
    closeModal();
    renderOrders();
}

function rejectOrder() {
    if (!selectedOrder) return;
    
    if (confirm('Bạn có chắc chắn muốn từ chối đơn hàng này?')) {
        selectedOrder.status = 'Đã hủy';
        updateOrderInList(selectedOrder);
        showNotification('Đơn hàng đã được từ chối!', 'error');
        closeModal();
        renderOrders();
    }
}

function updateStatus() {
    if (!selectedOrder) return;
    
    document.getElementById('statusModal').style.display = 'block';
}

function confirmStatusUpdate() {
    if (!selectedOrder) return;
    
    const newStatus = document.getElementById('newStatus').value;
    selectedOrder.status = newStatus;
    updateOrderInList(selectedOrder);
    showNotification(`Trạng thái đã được cập nhật thành: ${newStatus}`, 'success');
    closeStatusModal();
    closeModal();
    renderOrders();
}

function updateOrderInList(updatedOrder) {
    const index = currentOrders.findIndex(order => order.id === updatedOrder.id);
    if (index !== -1) {
        currentOrders[index] = updatedOrder;
    }
}

function filterOrders() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    currentOrders = sampleOrders.filter(order => {
        const statusMatch = !statusFilter || order.status === statusFilter;
        const typeMatch = !typeFilter || 
            (typeFilter === 'shipping' && order.isShipping) ||
            (typeFilter === 'pickup' && !order.isShipping);
        
        return statusMatch && typeMatch;
    });
    
    renderOrders();
}

function refreshOrders() {
    currentOrders = [...sampleOrders];
    document.getElementById('statusFilter').value = 'Chờ xác nhận';
    document.getElementById('typeFilter').value = '';
    renderOrders();
    showNotification('Danh sách đã được làm mới!', 'info');
}

// Utility functions
function getStatusClass(status) {
    const statusMap = {
        'Chờ xác nhận': 'status-pending',
        'Đã xác nhận': 'status-confirmed',
        'Đã chuẩn bị xong': 'status-prepared',
        'Đang vận chuyển': 'status-shipping',
        'Đã hủy': 'status-cancelled'
    };
    return statusMap[status] || 'status-pending';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
}

function showNotification(message, type = 'info') {
    // Simple notification - có thể thay thế bằng thư viện toast
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);