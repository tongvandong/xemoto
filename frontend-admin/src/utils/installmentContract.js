import { formatCurrency } from './formatCurrency';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const fill = (text) => (text ? escapeHtml(text) : '<span class="fill"></span>');

const pickLine = (note, prefix) => {
  const line = String(note || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.toLowerCase().startsWith(prefix.toLowerCase()));
  return line ? line.slice(prefix.length).trim() : '';
};

const UNITS = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readGroup(group, withLeadingZero) {
  const hundreds = Math.floor(group / 100);
  const tens = Math.floor((group % 100) / 10);
  const ones = group % 10;
  const words = [];
  if (hundreds > 0 || withLeadingZero) words.push(UNITS[hundreds] || 'không', 'trăm');
  if (tens === 0) {
    if (ones > 0 && (hundreds > 0 || withLeadingZero)) words.push('lẻ', UNITS[ones]);
    else if (ones > 0) words.push(UNITS[ones]);
  } else if (tens === 1) {
    words.push('mười');
    if (ones === 5) words.push('lăm');
    else if (ones > 0) words.push(UNITS[ones]);
  } else {
    words.push(UNITS[tens], 'mươi');
    if (ones === 1) words.push('mốt');
    else if (ones === 5) words.push('lăm');
    else if (ones > 0) words.push(UNITS[ones]);
  }
  return words.join(' ');
}

function scaleWord(groupIndex) {
  const base = ['', 'nghìn', 'triệu'][groupIndex % 3];
  const tyCount = Math.floor(groupIndex / 3);
  const ty = tyCount > 0 ? Array(tyCount).fill('tỷ').join(' ') : '';
  return [base, ty].filter(Boolean).join(' ');
}

export function numberToVietnameseWords(value) {
  let num = Math.floor(Math.abs(Number(value) || 0));
  if (num === 0) return 'Không đồng';
  const groups = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }
  const parts = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    if (groups[i] === 0) continue;
    const text = readGroup(groups[i], i !== groups.length - 1);
    parts.push([text, scaleWord(i)].filter(Boolean).join(' '));
  }
  const sentence = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng`;
}

// Chuẩn hóa đơn (đặt tên field theo admin) về dạng chung cho hợp đồng.
function normalizeOrder(order = {}) {
  const note = order.note || order.ghiChu || '';
  const idLine = pickLine(note, 'CCCD/CMND:');
  const idMatch = idLine.match(/^([0-9]{9,15})(?:\s+\(cấp\s+([^)]*?)(?:\s+tại\s+([^)]*))?\))?/i);
  const partner = String(note).match(/Trả góp qua\s+([^\n,—]+)/i)?.[1]?.trim()
    || pickLine(note, 'Đối tác tài chính khách chọn:')
    || 'Đối tác tài chính';
  const months = Number(String(note).match(/kỳ hạn\s+(\d+)\s+tháng/i)?.[1]) || 0;
  const items = order.chiTiet || order.items || order.lines || [];

  return {
    orderCode: order.maDonHangKinhDoanh || order.maDonHang || order.orderCode || order.code || order.id || '',
    borrowerName: order.shippingRecipient || order.hoTenNhanHang || order.customerName || order.tenKhachHang || '',
    borrowerPhone: order.shippingPhone || order.soDienThoai || order.phone || '',
    borrowerEmail: order.shippingEmail || order.email || '',
    currentAddress: order.shippingAddress || order.diaChi || order.address || '',
    residence: pickLine(note, 'Địa chỉ thường trú:') || order.shippingAddress || '',
    idNumber: idMatch?.[1] || '',
    idIssueDate: idMatch?.[2] || '',
    idIssuePlace: idMatch?.[3] || '',
    birthDate: pickLine(note, 'Ngày sinh:'),
    occupation: pickLine(note, 'Nghề nghiệp:'),
    company: pickLine(note, 'Công ty:'),
    workMonths: pickLine(note, 'Thâm niên:'),
    monthlyIncome: pickLine(note, 'Thu nhập:'),
    customerNote: pickLine(note, 'Ghi chú của khách:'),
    financePartner: partner,
    months,
    totalAmount: Number(order.grandTotal ?? order.tongThanhToan ?? order.tongTien ?? order.totalAmount ?? 0),
    downPayment: Number(order.depositAmount ?? order.tienCoc ?? 0),
    remainingAmount: Number(order.remainingAmount ?? order.tienConLai ?? 0),
    items: items.map((item) => ({
      name: item.tenSanPhamSnapshot || item.tenSanPham || item.productName || '',
      sku: item.skuSnapshot || item.sku || item.skuCode || '',
      qty: Number(item.soLuong || item.quantity || item.qty || 0),
      unitPrice: Number(item.donGia || item.unitPrice || 0),
      lineTotal: Number(item.thanhTien || item.lineTotal || item.subtotal || 0),
    })),
  };
}

export function printInstallmentContract(order = {}, settings = {}) {
  const c = normalizeOrder(order);
  const remainingAmount = Math.max(0, c.remainingAmount || (c.totalAmount - c.downPayment));

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const sellerName = settings.StoreName || 'Cửa hàng bán xe';
  const sellerAddress = settings.Address || '';
  const sellerPhone = settings.Hotline || '';

  const vehicleBlocks = (c.items.length ? c.items : [{}]).map((item, index) => {
    const lineTotal = item.lineTotal || (item.unitPrice || 0) * (item.qty || 0) || c.totalAmount;
    return `
      <div class="vehicle">
        <p><strong>Xe${c.items.length > 1 ? ` ${index + 1}` : ''}:</strong> ${fill(item.name)}${item.sku ? ` (SKU: ${escapeHtml(item.sku)})` : ''}${item.qty ? ` — Số lượng: ${item.qty}` : ''}</p>
        <p><strong>Số khung:</strong> <span class="fill"></span></p>
        <p><strong>Số máy:</strong> <span class="fill"></span></p>
        <p><strong>Với giá:</strong> ${formatCurrency(lineTotal)} (bằng chữ: <em>${escapeHtml(numberToVietnameseWords(lineTotal))}</em>)</p>
      </div>
    `;
  }).join('');

  const printWindow = window.open('', '_blank', 'width=980,height=760');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Hợp đồng mua bán xe máy trả góp ${escapeHtml(c.orderCode)}</title>
        <style>
          * { box-sizing: border-box; }
          body { color: #111827; font-family: "Times New Roman", Times, serif; margin: 0; padding: 32px 40px; font-size: 14px; line-height: 1.6; }
          h1, h2, p { margin: 0; }
          .national { text-align: center; }
          .national .country { font-weight: 700; text-transform: uppercase; font-size: 15px; }
          .national .motto { font-weight: 700; }
          .national .rule { width: 200px; border: none; border-top: 1px solid #111827; margin: 4px auto 0; }
          .title { margin-top: 24px; text-align: center; }
          .title h1 { font-size: 20px; font-weight: 800; text-transform: uppercase; }
          .intro { margin-top: 18px; text-align: justify; }
          .party { margin-top: 14px; }
          .party h2 { font-size: 15px; font-weight: 800; }
          .party p { margin-left: 6px; }
          .clause { margin-top: 16px; text-align: justify; }
          .clause h2 { font-size: 15px; font-weight: 800; }
          .vehicle { margin: 8px 0 8px 6px; }
          .partner { margin-top: 16px; border: 1px dashed #9ca3af; border-radius: 8px; padding: 10px 14px; background: #f9fafb; }
          .partner h2 { font-size: 14px; font-weight: 800; text-transform: uppercase; }
          .fill { display: inline-block; min-width: 160px; border-bottom: 1px dotted #6b7280; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 40px; text-align: center; }
          .signatures .role { font-weight: 800; text-transform: uppercase; display: block; }
          .signatures .hint { font-style: italic; font-size: 12.5px; color: #4b5563; display: block; }
          .signatures .space { height: 70px; }
          .center { text-align: center; }
          @media print { body { padding: 14mm; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="national">
          <p class="country">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
          <p class="motto">Độc lập - Tự do - Hạnh phúc</p>
          <hr class="rule" />
        </div>

        <div class="title">
          <h1>Hợp đồng mua bán xe máy trả góp</h1>
          <p>Số: ${escapeHtml(c.orderCode)}/HĐMB</p>
        </div>

        <p class="intro">
          Hôm nay, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()},
          tại ${fill(sellerAddress)}. Chúng tôi gồm:
        </p>

        <div class="party">
          <h2>Bên A (Bên bán):</h2>
          <p>- Tên cửa hàng: ${fill(sellerName)}</p>
          <p>- Địa chỉ: ${fill(sellerAddress)}</p>
          <p>- Điện thoại: ${fill(sellerPhone)}</p>
          <p>- Do: <span class="fill"></span> làm đại diện</p>
        </div>

        <div class="party">
          <h2>Bên B (Bên mua):</h2>
          <p>- Họ và Tên: ${fill(c.borrowerName)}</p>
          <p>- Ngày sinh: ${fill(c.birthDate)}</p>
          <p>- Số CMND/CCCD: ${fill(c.idNumber)} &nbsp; Ngày cấp: ${fill(c.idIssueDate)} &nbsp; Nơi cấp: ${fill(c.idIssuePlace)}</p>
          <p>- Địa chỉ thường trú: ${fill(c.residence)}</p>
          <p>- Chỗ ở hiện tại: ${fill(c.currentAddress || c.residence)}</p>
          ${c.borrowerPhone ? `<p>- Điện thoại: ${escapeHtml(c.borrowerPhone)}</p>` : ''}
          ${c.borrowerEmail ? `<p>- Email: ${escapeHtml(c.borrowerEmail)}</p>` : ''}
          <p>- Nghề nghiệp: ${fill(c.occupation)} &nbsp; Công ty/nơi làm việc: ${fill(c.company)}</p>
          <p>- Thâm niên: ${fill(c.workMonths)} &nbsp; Thu nhập hàng tháng: ${fill(c.monthlyIncome)}</p>
        </div>

        <div class="clause">
          <h2>Điều 1:</h2>
          <p>Bên A đồng ý bán trả góp cho Bên B xe gắn máy với thông tin như sau:</p>
          ${vehicleBlocks}
          <p><strong>Tổng giá trị hợp đồng:</strong> ${formatCurrency(c.totalAmount)} (bằng chữ: <em>${escapeHtml(numberToVietnameseWords(c.totalAmount))}</em>)</p>
        </div>

        <div class="clause">
          <h2>Điều 2:</h2>
          <p>
            Bên B trả trước cho Bên A số tiền là: <strong>${formatCurrency(c.downPayment)}</strong>
            (bằng chữ: <em>${escapeHtml(numberToVietnameseWords(c.downPayment))}</em>) vào ngày nhận xe,
            số tiền còn lại là: <strong>${formatCurrency(remainingAmount)}</strong>
            (bằng chữ: <em>${escapeHtml(numberToVietnameseWords(remainingAmount))}</em>).
            Phần còn lại do đối tác tài chính thẩm định, giải ngân và thu hồi theo hợp đồng tín dụng riêng giữa Bên B và đối tác tài chính.
            Bên A không lập lịch thu góp hằng tháng và không ghi nhận các khoản thanh toán định kỳ này trong hệ thống bán hàng.
          </p>
          <p style="margin-top:6px">Lãi suất, phí, lịch thanh toán và điều kiện tín dụng do đối tác tài chính dưới đây thẩm định và quản lý trực tiếp với Bên B.</p>
        </div>

        <div class="partner">
          <h2>Đối tác tài chính (Bên cấp tín dụng)</h2>
          <p>- Tên đối tác: <strong>${escapeHtml(c.financePartner)}</strong></p>
          <p>- Kỳ hạn vay: ${c.months ? `${c.months} tháng` : '<span class="fill" style="min-width:60px"></span> tháng'}</p>
          <p>- Số tiền giải ngân (phần còn lại): ${formatCurrency(remainingAmount)}</p>
          <p>- Địa chỉ / đại diện đối tác: <span class="fill" style="min-width:260px"></span></p>
        </div>

        <div class="clause">
          <h2>Điều 3:</h2>
          <p>
            Mọi tranh chấp xảy ra sẽ được hai bên hoà giải, thương lượng; nếu không hoà giải được sẽ do Toà án địa phương
            giải quyết mọi tranh chấp. Hợp đồng làm thành 02 bản, mỗi bên giữ 01 bản và có giá trị pháp lý như nhau.
          </p>
        </div>

        <div class="signatures">
          <div><span class="role">Bên A</span><span class="hint">(ký và ghi họ tên)</span><div class="space"></div></div>
          <div><span class="role">Bên B</span><span class="hint">(ký và ghi họ tên)</span><div class="space"></div></div>
          <div><span class="role">Đối tác tài chính</span><span class="hint">(ký và đóng dấu)</span><div class="space"></div></div>
        </div>

        <p class="center" style="margin-top:24px; font-style:italic; color:#6b7280; font-size:12.5px">Ngày in: ${dateStr}</p>

        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
