import { formatCurrency, formatDate } from './formatters.js';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

// Đường kẻ để khách điền tay những thông tin hệ thống không có (số khung, số máy, lãi suất...).
const fill = (text) => (text ? escapeHtml(text) : '<span class="fill"></span>');

const pickLine = (note, prefix) => {
  const line = String(note || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.toLowerCase().startsWith(prefix.toLowerCase()));
  return line ? line.slice(prefix.length).trim() : '';
};

// Đọc số tiền sang chữ tiếng Việt (vd: 15000000 -> "Mười lăm triệu đồng").
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
    const isMostSignificant = i === groups.length - 1;
    const text = readGroup(groups[i], !isMostSignificant);
    parts.push([text, scaleWord(i)].filter(Boolean).join(' '));
  }

  const sentence = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng`;
}

// Tách hồ sơ trả góp từ ghi chú có cấu trúc của đơn (dùng chung cho cả hợp đồng lẫn chi tiết đơn).
export function parseInstallmentProfile(order = {}) {
  const note = order.note || '';
  const idLine = pickLine(note, 'CCCD/CMND:');
  const idMatch = idLine.match(/^([0-9]{9,15})(?:\s+\(cấp\s+([^)]*?)(?:\s+tại\s+([^)]*))?\))?/i);
  const partnerFromProfile = pickLine(note, 'Đối tác tài chính khách chọn:');
  const partnerFromOrder = String(note).match(/Trả góp qua\s+([^\n,—]+)/i)?.[1]?.trim();
  const termMatch = String(note).match(/kỳ hạn\s+(\d+)\s+tháng/i);

  return {
    financePartner: partnerFromProfile || partnerFromOrder || 'Đối tác tài chính',
    borrowerName: order.shippingFullName || order.customerName || '',
    borrowerPhone: order.shippingPhoneNumber || '',
    borrowerEmail: order.shippingEmail || '',
    idNumber: idMatch?.[1] || '',
    idIssueDate: idMatch?.[2] || '',
    idIssuePlace: idMatch?.[3] || '',
    birthDate: pickLine(note, 'Ngày sinh:'),
    residence: pickLine(note, 'Địa chỉ thường trú:') || order.shippingAddressLine || '',
    currentAddress: [order.shippingAddressLine, order.shippingWard, order.shippingDistrict, order.shippingProvince]
      .filter(Boolean).join(', '),
    occupation: pickLine(note, 'Nghề nghiệp:'),
    company: pickLine(note, 'Công ty:'),
    workMonths: pickLine(note, 'Thâm niên:'),
    monthlyIncome: pickLine(note, 'Thu nhập:'),
    receiving: pickLine(note, 'Nhận hàng:'),
    customerNote: pickLine(note, 'Ghi chú của khách:'),
    months: termMatch?.[1] || '',
  };
}

export function getInstallmentFinancePartner(order) {
  return parseInstallmentProfile(order).financePartner;
}

export function printInstallmentContract(order = {}, shop = {}) {
  const profile = parseInstallmentProfile(order);
  const items = order.items || [];
  const orderCode = order.orderCode || order.id || '';
  const totalAmount = Number(order.totalAmount || 0);
  const downPayment = Number(order.depositAmount || 0);
  const remainingAmount = Math.max(0, Number(order.remainingAmount ?? (totalAmount - downPayment)));
  const months = Number(profile.months) || 0;

  const today = new Date();
  const sellerName = shop.name || 'Cửa hàng bán xe';
  const sellerAddress = shop.address || shop.addressLine || '';
  const sellerRep = shop.representative || shop.ownerName || shop.bankAccountName || '';

  // Điều 1: mỗi sản phẩm là một dòng "Xe / Số khung / Số máy / Giá" theo đúng mẫu hợp đồng.
  const vehicleBlocks = (items.length ? items : [{}]).map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const lineTotal = Number(item.lineTotal || unitPrice * quantity) || totalAmount;
    const name = item.productNameSnapshot || item.productName || '';
    const sku = item.skuSnapshot || '';
    const priceForWords = lineTotal || totalAmount;
    return `
      <div class="vehicle">
        <p><strong>Xe${items.length > 1 ? ` ${index + 1}` : ''}:</strong> ${fill(name)}${sku ? ` (SKU: ${escapeHtml(sku)})` : ''}${quantity ? ` — Số lượng: ${quantity}` : ''}</p>
        <p><strong>Số khung:</strong> <span class="fill"></span></p>
        <p><strong>Số máy:</strong> <span class="fill"></span></p>
        <p><strong>Với giá:</strong> ${formatCurrency(priceForWords)} (bằng chữ: <em>${escapeHtml(numberToVietnameseWords(priceForWords))}</em>)</p>
      </div>
    `;
  }).join('');

  const printWindow = window.open('', '_blank', 'width=980,height=760');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Hợp đồng mua bán xe máy trả góp ${escapeHtml(orderCode)}</title>
        <style>
          * { box-sizing: border-box; }
          body { color: #111827; font-family: "Times New Roman", Times, serif; margin: 0; padding: 32px 40px; font-size: 14px; line-height: 1.6; }
          h1, h2, h3, p { margin: 0; }
          .center { text-align: center; }
          .national { text-align: center; }
          .national .country { font-weight: 700; text-transform: uppercase; font-size: 15px; }
          .national .motto { font-weight: 700; }
          .national .rule { width: 200px; border: none; border-top: 1px solid #111827; margin: 4px auto 0; }
          .title { margin-top: 24px; text-align: center; }
          .title h1 { font-size: 20px; font-weight: 800; text-transform: uppercase; }
          .title p { margin-top: 6px; }
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
          .signatures strong { display: block; }
          .signatures .role { font-weight: 800; text-transform: uppercase; }
          .signatures .hint { font-style: italic; font-size: 12.5px; color: #4b5563; }
          .signatures .space { height: 70px; }
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
          <p>Số: ${escapeHtml(orderCode)}/HĐMB</p>
        </div>

        <p class="intro">
          Hôm nay, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()},
          tại ${fill(sellerAddress)}. Chúng tôi gồm:
        </p>

        <div class="party">
          <h2>Bên A (Bên bán):</h2>
          <p>- Tên cửa hàng: ${fill(sellerName)}</p>
          <p>- Địa chỉ: ${fill(sellerAddress)}</p>
          <p>- Do: ${fill(sellerRep)} làm đại diện</p>
        </div>

        <div class="party">
          <h2>Bên B (Bên mua):</h2>
          <p>- Họ và Tên: ${fill(profile.borrowerName)}</p>
          <p>- Ngày sinh: ${fill(profile.birthDate)}</p>
          <p>- Số CMND/CCCD: ${fill(profile.idNumber)} &nbsp; Ngày cấp: ${fill(profile.idIssueDate)} &nbsp; Nơi cấp: ${fill(profile.idIssuePlace)}</p>
          <p>- Địa chỉ thường trú: ${fill(profile.residence)}</p>
          <p>- Chỗ ở hiện tại: ${fill(profile.currentAddress || profile.residence)}</p>
          ${profile.borrowerPhone ? `<p>- Điện thoại: ${escapeHtml(profile.borrowerPhone)}</p>` : ''}
          ${profile.borrowerEmail ? `<p>- Email: ${escapeHtml(profile.borrowerEmail)}</p>` : ''}
          <p>- Nghề nghiệp: ${fill(profile.occupation)} &nbsp; Công ty/nơi làm việc: ${fill(profile.company)}</p>
          <p>- Thâm niên: ${fill(profile.workMonths)} &nbsp; Thu nhập hàng tháng: ${fill(profile.monthlyIncome)}</p>
        </div>

        <div class="clause">
          <h2>Điều 1:</h2>
          <p>Bên A đồng ý bán trả góp cho Bên B xe gắn máy với thông tin như sau:</p>
          ${vehicleBlocks}
          <p><strong>Tổng giá trị hợp đồng:</strong> ${formatCurrency(totalAmount)} (bằng chữ: <em>${escapeHtml(numberToVietnameseWords(totalAmount))}</em>)</p>
        </div>

        <div class="clause">
          <h2>Điều 2:</h2>
          <p>
            Bên B trả trước cho Bên A số tiền là: <strong>${formatCurrency(downPayment)}</strong>
            (bằng chữ: <em>${escapeHtml(numberToVietnameseWords(downPayment))}</em>) vào ngày nhận xe,
            số tiền còn lại là: <strong>${formatCurrency(remainingAmount)}</strong>
            (bằng chữ: <em>${escapeHtml(numberToVietnameseWords(remainingAmount))}</em>).
            Phần còn lại do đối tác tài chính thẩm định, giải ngân và thu hồi theo hợp đồng tín dụng riêng giữa Bên B và đối tác tài chính.
            Bên A không lập lịch thu góp hằng tháng và không ghi nhận các khoản thanh toán định kỳ này trong hệ thống bán hàng.
          </p>
          <p style="margin-top:6px">Lãi suất, phí, lịch thanh toán và điều kiện tín dụng do đối tác tài chính dưới đây thẩm định và quản lý trực tiếp với Bên B.</p>
        </div>

        <div class="partner">
          <h2>Đối tác tài chính (Bên cấp tín dụng)</h2>
          <p>- Tên đối tác: <strong>${escapeHtml(profile.financePartner)}</strong></p>
          <p>- Kỳ hạn vay: ${months ? `${months} tháng` : '<span class="fill" style="min-width:60px"></span> tháng'}</p>
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
          <div>
            <span class="role">Bên A</span>
            <span class="hint">(ký và ghi họ tên)</span>
            <div class="space"></div>
          </div>
          <div>
            <span class="role">Bên B</span>
            <span class="hint">(ký và ghi họ tên)</span>
            <div class="space"></div>
          </div>
          <div>
            <span class="role">Đối tác tài chính</span>
            <span class="hint">(ký và đóng dấu)</span>
            <div class="space"></div>
          </div>
        </div>

        <p class="center" style="margin-top:24px; font-style:italic; color:#6b7280; font-size:12.5px">Ngày in: ${formatDate(today)}</p>

        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
