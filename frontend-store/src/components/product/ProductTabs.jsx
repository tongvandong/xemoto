import { useMemo, useState } from 'react';

const buyGuideHtml = `
  <div class="space-y-3 text-sm leading-7 text-zinc-700">
    <p><strong>Bước 1:</strong> Truy cập website và chọn sản phẩm phù hợp.</p>
    <p><strong>Bước 2:</strong> Xem chi tiết sản phẩm, phiên bản, màu sắc và số lượng cần mua.</p>
    <p><strong>Bước 3:</strong> Thêm vào giỏ hàng hoặc mua ngay để chuyển sang bước thanh toán.</p>
    <p><strong>Bước 4:</strong> Điền thông tin nhận hàng, chọn hình thức thanh toán và hoàn tất đơn.</p>
    <p><strong>Bước 5:</strong> Nhân viên xác nhận đơn hàng và lịch giao xe với bạn.</p>
  </div>
`;

function buildSpecsHtml(product) {
  const rows = [
    ['Loại xe', product?.productType || product?.categoryName || 'Đang cập nhật'],
    ['Thương hiệu', product?.brandName || 'Đang cập nhật'],
    ['Động cơ', product?.engine || 'Đang cập nhật'],
    ['Hộp số', product?.transmission || 'Đang cập nhật'],
    ['Nhiên liệu', product?.fuelType || 'Đang cập nhật'],
    ['Màu sắc', product?.exteriorColor || 'Đang cập nhật'],
    ['Năm sản xuất', product?.year || 'Đang cập nhật'],
    ['Tồn kho', product?.stockQuantity ?? 'Liên hệ'],
  ];

  return `
    <div class="overflow-hidden rounded-2xl border border-zinc-200">
      ${rows
        .map(
          ([label, value], index) => `
            <div class="grid grid-cols-[180px_minmax(0,1fr)] gap-4 px-4 py-3 text-sm ${index % 2 === 0 ? 'bg-zinc-50' : 'bg-white'}">
              <div class="font-semibold text-zinc-500">${label}</div>
              <div class="text-zinc-800">${value}</div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function buildFeatureHtml(title, body) {
  return `
    <div class="rounded-2xl border border-zinc-200 bg-white p-4">
      <h4 class="text-lg font-bold text-zinc-950">${title}</h4>
      <p class="mt-2 text-sm leading-7 text-zinc-700">${body}</p>
    </div>
  `;
}

function buildTabs(product) {
  const descriptionHtml = product?.description || `<p>${product?.shortDescription || 'Thông tin sản phẩm đang được cập nhật.'}</p>`;
  const specsHtml = buildSpecsHtml(product);
  const engineHtml =
    product?.engine || product?.fuelType || product?.transmission
      ? [
          buildFeatureHtml(
            'Động cơ và công nghệ',
            `${product?.name || 'Sản phẩm'} được trang bị ${product?.engine || 'động cơ hiện đại'}, kết hợp ${product?.transmission || 'hộp số tối ưu'} để mang lại cảm giác vận hành ổn định và hiệu quả.`,
          ),
          buildFeatureHtml(
            'Hiệu quả vận hành',
            `Cấu hình nhiên liệu ${product?.fuelType || 'tiết kiệm'} cùng trạng thái ${product?.status || 'sẵn sàng giao'} giúp tối ưu trải nghiệm sử dụng hằng ngày.`,
          ),
        ].join('')
      : buildFeatureHtml('Động cơ và công nghệ', 'Thông tin động cơ và công nghệ đang được cập nhật thêm từ hệ thống.');
  const utilityHtml = [
    buildFeatureHtml('Tiện ích sử dụng', `${product?.name || 'Sản phẩm'} phù hợp cho nhu cầu di chuyển hằng ngày với khả năng vận hành ổn định và bố trí tiện ích thực dụng.`),
    buildFeatureHtml('An toàn', `Tình trạng ${product?.status || 'đang cập nhật'} cùng số lượng tồn ${product?.stockQuantity ?? 'liên hệ'} giúp bạn chủ động hơn khi chọn mua.`),
  ].join('');
  const designHtml = [
    buildFeatureHtml('Thiết kế tổng thể', product?.shortDescription || `${product?.name || 'Sản phẩm'} sở hữu kiểu dáng hiện đại, phù hợp phong cách di chuyển đô thị.`),
    buildFeatureHtml('Màu sắc và nhận diện', `Phiên bản hiện có màu ${product?.exteriorColor || 'đang cập nhật'} và được hoàn thiện theo phong cách đặc trưng của ${product?.brandName || 'thương hiệu'}.`),
  ].join('');
  const reviewHtml = `
    <div class="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-6 text-sm text-zinc-600">
      Chưa có đánh giá cho sản phẩm này. Bạn có thể liên hệ để được tư vấn thêm trước khi đặt mua.
    </div>
  `;

  return [
    { id: 'description', title: 'Mô tả sản phẩm', html: descriptionHtml },
    { id: 'specs', title: 'Thông số kỹ thuật', html: specsHtml },
    { id: 'engine', title: 'Động cơ và công nghệ', html: engineHtml },
    { id: 'utility', title: 'Tiện ích và an toàn', html: utilityHtml },
    { id: 'design', title: 'Thiết kế', html: designHtml },
    { id: 'guide', title: 'Hướng dẫn mua hàng', html: buyGuideHtml },
    { id: 'reviews', title: 'Đánh giá sản phẩm', html: reviewHtml },
  ];
}

function ProductTabs({ product }) {
  const tabs = useMemo(() => buildTabs(product), [product]);
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'description');

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-xl font-bold text-zinc-950">Thông tin sản phẩm</h2>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="overflow-x-auto xl:overflow-visible">
          <div className="flex gap-3 xl:flex-col">
            {tabs.map((tab) => {
              const active = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`shrink-0 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition xl:w-full ${
                    active ? 'border-[#d71920] bg-[#fff5f5] text-[#d71920]' : 'border-zinc-200 bg-white text-zinc-700 hover:border-[#d71920]'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 sm:p-5">
          {tabs.map((tab) =>
            tab.id === activeTab ? (
              <div
                key={tab.id}
                className="prose prose-zinc max-w-none prose-headings:text-zinc-950 prose-p:text-zinc-700 prose-strong:text-zinc-950 prose-img:rounded-2xl"
                dangerouslySetInnerHTML={{ __html: tab.html }}
              />
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductTabs;
