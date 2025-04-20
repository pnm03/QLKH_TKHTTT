CREATE TABLE public.returns (
    return_id SERIAL PRIMARY KEY,
    name_return TEXT,
    order_id TEXT NOT NULL REFERENCES public.orders(order_id),
    return_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    return_reason TEXT NOT NULL,
    refund_amount DECIMAL(15, 2) CHECK (refund_amount >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('đang xử lý', 'đã chấp nhận', 'đã từ chối'))
);

COMMENT ON TABLE public.returns IS 'Bảng lưu trữ thông tin yêu cầu đổi/trả hàng của khách hàng';
COMMENT ON COLUMN public.returns.return_id IS 'Mã yêu cầu đổi/trả (Tự tăng)';
COMMENT ON COLUMN public.returns.name_return IS 'Tên yêu cầu đổi/trả';
COMMENT ON COLUMN public.returns.order_id IS 'Mã đơn hàng gốc liên quan';
COMMENT ON COLUMN public.returns.return_date IS 'Ngày yêu cầu đổi/trả';
COMMENT ON COLUMN public.returns.return_reason IS 'Lý do đổi/trả hàng';
COMMENT ON COLUMN public.returns.refund_amount IS 'Số tiền hoàn lại (nếu có)';
COMMENT ON COLUMN public.returns.status IS 'Trạng thái của yêu cầu đổi/trả (đang xử lý, đã chấp nhận, đã từ chối)';
