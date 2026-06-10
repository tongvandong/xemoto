import { formatCurrency } from './formatCurrency';
import { PAYMENT_METHODS } from './constants';

// Đọc số tiền VND bằng chữ (phục vụ hóa đơn GTGT).
export const docTienBangChu = (amount) => {
  const n = Math.round(Number(amount) || 0);
  if (n === 0) return 'Không đồng';
  const chuSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const docBaSo = (block, full) => {
    const tram = Math.floor(block / 100);
    const chuc = Math.floor((block % 100) / 10);
    const donVi = block % 10;
    let s = '';
    if (full || tram > 0) s += `${chuSo[tram]} trăm`;
    if (chuc === 0) {
      if (donVi > 0) s += `${s ? ' ' : ''}${(full || tram > 0) ? 'lẻ ' : ''}${chuSo[donVi]}`;
    } else if (chuc === 1) {
      s += `${s ? ' ' : ''}mười${donVi > 0 ? ' ' + (donVi === 5 ? 'lăm' : chuSo[donVi]) : ''}`;
    } else {
      s += `${s ? ' ' : ''}${chuSo[chuc]} mươi`;
      if (donVi === 1) s += ' mốt';
      else if (donVi === 5) s += ' lăm';
      else if (donVi > 0) s += ` ${chuSo[donVi]}`;
    }
    return s.trim();
  };
  const donViLon = ['', ' nghìn', ' triệu', ' tỷ'];
  const blocks = [];
  let rest = n;
  while (rest > 0) { blocks.unshift(rest % 1000); rest = Math.floor(rest / 1000); }
  let result = '';
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const power = blocks.length - 1 - i;
    if (block === 0) continue;
    result += `${docBaSo(block, i > 0)}${donViLon[power]} `;
  }
  result = result.trim();
  return `${result.charAt(0).toUpperCase()}${result.slice(1)} đồng`;
};

const formatNow = () => new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date());

// In hóa đơn GTGT (VAT) cho 1 đơn hàng. `settings` là map khóa cấu hình (StoreName, Address, Hotline, TaxCode, VatRate).
export const printVatInvoice = (order, settings = {}) => {
  if (!order) return;
  const items = order.lines || order.items || order.chiTiet || [];
  const totalAmount = order.grandTotal ?? order.tongThanhToan ?? order.tongTien ?? order.totalAmount ?? 0;
  const customerName = order.shippingRecipient || order.customerName || order.hoTenNhanHang || order.tenKhachHang || '';
  const phone = order.shippingPhone || order.phone || order.soDienThoai || '';
  const email = order.shippingEmail || order.email || '';
  const address = order.shippingAddress || order.address || order.diaChi || '';
  const orderCode = order.code || order.maDonHang || order.orderCode || order.id;
  const payments = order.payments || [];
  const payment = order.payment || payments.find((p) => p.status !== 'Cancelled') || payments[0] || null;
  const paymentMethodLabel = PAYMENT_METHODS[payment?.method || payment?.phuongThuc] || 'TM/CK';

  const vatRate = Number(settings.VatRate || 10);
  const totalIncl = Number(totalAmount) || 0;
  const preTax = Math.round(totalIncl / (1 + vatRate / 100));
  const vatAmount = totalIncl - preTax;
  const seller = {
    name: settings.StoreName || 'MoToSale',
    address: settings.Address || '...',
    phone: settings.Hotline || '...',
    taxCode: settings.TaxCode || '..................',
  };

  const rows = items.map((item, idx) => {
    const price = item.donGia || item.unitPrice || 0;
    const qty = item.soLuong || item.quantity || item.qty || 0;
    const line = item.thanhTien || item.subtotal || item.lineTotal || price * qty;
    const name = item.tenSanPhamSnapshot || item.tenSanPham || item.productName || '-';
    return `<tr><td>${idx + 1}</td><td>${name}</td><td class="center">${qty}</td><td class="right">${formatCurrency(price)}</td><td class="right">${formatCurrency(line)}</td></tr>`;
  }).join('');

  const win = window.open('', '_blank', 'width=900,height=800');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>Hóa đơn GTGT ${orderCode}</title>
        <style>
          body { font-family: 'Times New Roman', serif; color: #000; padding: 28px; font-size: 14px; }
          .center { text-align: center; }
          .right { text-align: right; }
          h1 { font-size: 20px; text-align: center; margin: 4px 0; text-transform: uppercase; }
          .sub { text-align: center; font-style: italic; color: #444; margin-bottom: 10px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0 12px; }
          .party { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #000; padding: 6px 8px; font-size: 13px; }
          th { background: #f0f0f0; text-align: center; }
          .sum td { border: none; padding: 3px 8px; }
          .words { font-style: italic; margin-top: 6px; }
          .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 40px; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Hóa đơn giá trị gia tăng</h1>
        <div class="sub">(Bản thể hiện của hóa đơn — phục vụ demo, chưa phát hành qua cơ quan thuế)</div>
        <div class="center">Ngày ${formatNow()}</div>
        <div class="meta">
          <div>Mẫu số: <b>01GTKT</b></div>
          <div class="right">Ký hiệu: <b>1C26MTS</b></div>
          <div>Số HĐ: <b>${orderCode}</b></div>
          <div class="right">Hình thức TT: <b>${paymentMethodLabel}</b></div>
        </div>
        <div class="party"><b>ĐƠN VỊ BÁN HÀNG:</b> ${seller.name}</div>
        <div class="party">Mã số thuế: ${seller.taxCode}</div>
        <div class="party">Địa chỉ: ${seller.address} &nbsp;|&nbsp; Điện thoại: ${seller.phone}</div>
        <hr/>
        <div class="party"><b>Họ tên người mua hàng:</b> ${customerName || '-'}</div>
        <div class="party">Điện thoại: ${phone || '-'} ${email ? '&nbsp;|&nbsp; Email: ' + email : ''}</div>
        <div class="party">Địa chỉ: ${address || '-'}</div>
        <table>
          <thead>
            <tr><th>STT</th><th>Tên hàng hóa, dịch vụ</th><th>Số lượng</th><th>Đơn giá (đã gồm VAT)</th><th>Thành tiền</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" class="center">Không có hàng hóa</td></tr>'}</tbody>
        </table>
        <table class="sum" style="margin-top:10px;width:60%;float:right">
          <tr><td>Cộng tiền hàng (chưa thuế):</td><td class="right">${formatCurrency(preTax)}</td></tr>
          <tr><td>Thuế suất GTGT (${vatRate}%):</td><td class="right">${formatCurrency(vatAmount)}</td></tr>
          <tr><td><b>Tổng tiền thanh toán:</b></td><td class="right"><b>${formatCurrency(totalIncl)}</b></td></tr>
        </table>
        <div style="clear:both"></div>
        <div class="words">Số tiền viết bằng chữ: <b>${docTienBangChu(totalIncl)}</b></div>
        <div class="sign">
          <div>Người mua hàng<br/><i>(Ký, ghi rõ họ tên)</i><br/><br/><br/>........................</div>
          <div>Người bán hàng<br/><i>(Ký, đóng dấu)</i><br/><br/><br/>........................</div>
        </div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  win.document.close();
};
