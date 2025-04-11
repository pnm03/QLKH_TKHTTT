import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function OrdersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo đơn hàng mới</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div>
            <Label htmlFor="customerName">Tên khách hàng</Label>
            <Input id="customerName" placeholder="Nhập tên khách hàng" />
          </div>
          <div>
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input id="phone" placeholder="Nhập số điện thoại" />
          </div>
          <div>
            <Label htmlFor="address">Địa chỉ giao hàng</Label>
            <Input id="address" placeholder="Nhập địa chỉ giao hàng" />
          </div>
          <Button type="submit">Tạo đơn hàng</Button>
        </form>
      </CardContent>
    </Card>
  );
} 