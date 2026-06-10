import {
  FaFacebookF,
  FaYoutube,
  FaTwitter,
  FaPinterestP,
  FaInstagram
} from "react-icons/fa";

export const CDN = 'https://bizweb.dktcdn.net/100/519/812';

export const brandAssets = {
  logo: `${CDN}/themes/954445/assets/logo.png?1758009468922`,
  footerLogo: `${CDN}/themes/954445/assets/logo-ft.png?1758009468922`,
  slider: `${CDN}/themes/954445/assets/slider_1.jpg?1758009468922`,
  bannerOne: `${CDN}/themes/954445/assets/banner_three_1.jpg?1758009468922`,
  bannerTwo: `${CDN}/themes/954445/assets/banner_three_2.jpg?1758009468922`,
  productBanner: `${CDN}/themes/954445/assets/image_product_3.png?1758009468922`,
  hotIcon: `${CDN}/themes/954445/assets/hot_icon.png?1758009468922`,
  collectionBannerOne: `${CDN}/themes/954445/assets/banner_col_1.png?1758009468922`,
  collectionBannerTwo: `${CDN}/themes/954445/assets/banner_col_2.png?1758009468922`,
};

export const homeCategoryReferences = [
  {
    id: 'featured-scooter',
    name: 'Xe tay ga',
    slug: 'xe-tay-ga',
    kind: 1,
    image: `${CDN}/collections/xe-tay-ga.jpg?v=1727746181450`,
    to: '/products?categorySlug=xe-tay-ga',
    match: ['xe tay ga', 'tay ga', 'scooter'],
  },
  {
    id: 'featured-sport',
    name: 'Xe côn tay',
    slug: 'xe-con-tay',
    kind: 1,
    image: `${CDN}/collections/xe-con-tay.jpg?v=1727746225237`,
    to: '/products?categorySlug=xe-con-tay',
    match: ['xe con tay', 'xe côn tay', 'con tay', 'sport'],
  },
  {
    id: 'featured-oil',
    name: 'Dầu nhớt',
    slug: 'dau-nhot',
    kind: 2,
    image: `${CDN}/themes/954445/assets/banner_col_1.png?1758009468922`,
    to: '/products?categorySlug=dau-nhot',
    match: ['dau nhot', 'dầu nhớt', 'nhot', 'nhớt', 'oil'],
  },
  {
    id: 'featured-tire',
    name: 'Lốp xe',
    slug: 'lop-xe',
    kind: 2,
    image: `${CDN}/themes/954445/assets/banner_col_2.png?1758009468922`,
    to: '/products?categorySlug=lop-xe',
    match: ['lop xe', 'lốp xe', 'lop', 'lốp', 'tire'],
  },
];

export const serviceHighlights = [
  {
    id: 'bao-duong',
    title: 'Bảo dưỡng xe',
    description: 'Bảo dưỡng định kỳ, thay dầu, kiểm tra máy và hệ thống phanh để xe luôn vận hành ổn định.',
    icon: `${CDN}/themes/954445/assets/icon_dv_1.png?1758009468922`,
    image: `${CDN}/themes/954445/assets/image_dv_1.png?1758009468922`,
  },
  {
    id: 'phu-tung',
    title: 'Phụ tùng chính hãng',
    description: 'Cung cấp linh kiện và phụ tùng đúng tiêu chuẩn chính hãng cho các dòng xe phổ biến.',
    icon: `${CDN}/themes/954445/assets/icon_dv_2.png?1758009468922`,
    image: `${CDN}/themes/954445/assets/image_dv_2.png?1758009468922`,
  },
  {
    id: 'luu-dong',
    title: 'Sửa chữa lưu động',
    description: 'Hỗ trợ xử lý sự cố nhanh, tư vấn tại chỗ và sắp xếp kỹ thuật viên khi khách hàng cần gấp.',
    icon: `${CDN}/themes/954445/assets/icon_dv_3.png?1758009468922`,
    image: `${CDN}/themes/954445/assets/image_dv_3.png?1758009468922`,
  },
  {
    id: 've-sinh',
    title: 'Vệ sinh buồng đốt',
    description: 'Làm sạch hệ thống buồng đốt, kim phun và họng máy để cải thiện hiệu suất và tiết kiệm nhiên liệu.',
    icon: `${CDN}/themes/954445/assets/icon_dv_4.png?1758009468922`,
    image: `${CDN}/themes/954445/assets/image_dv_4.png?1758009468922`,
  },
];

export const navItems = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Sản phẩm', to: '/products', hasCaret: true },
  { label: 'Liên hệ', to: '/' },
  { label: 'Hệ thống cửa hàng', to: '/he-thong-cua-hang' },
  { label: 'Câu hỏi thường gặp', to: '/' },
];

export const socialLinks = [
  {
    icon: FaFacebookF,
    className: "bg-[#1877f2]",
    href: "#"
  },
  {
    icon: FaYoutube,
    className: "bg-[#ff0000]",
    href: "#"
  },
  {
    icon: FaTwitter,
    className: "bg-[#1d9bf0]",
    href: "#"
  },
  {
    icon: FaPinterestP,
    className: "bg-[#e60023]",
    href: "#"
  },
  {
    icon: FaInstagram,
    className:
      "bg-[linear-gradient(135deg,#ffb347,#fd1d1d_55%,#c13584)]",
    href: "#"
  }
];

export const productBrandGroups = [
  {
    brandLabel: 'Honda',
    brandSlug: 'honda',
    items: [
      { label: 'Xe ga', categorySlug: 'xe-tay-ga' },
      { label: 'Xe côn tay', categorySlug: 'xe-con-tay' },
      { label: 'Xe số', categorySlug: 'xe-so' },
    ],
  },
  {
    brandLabel: 'Yamaha',
    brandSlug: 'yamaha',
    items: [
      { label: 'Xe ga', categorySlug: 'xe-tay-ga' },
      { label: 'Xe côn tay', categorySlug: 'xe-con-tay' },
      { label: 'Xe số', categorySlug: 'xe-so' },
    ],
  },
  {
    brandLabel: 'SYM',
    brandSlug: 'sym',
    items: [
      { label: 'Xe ga', categorySlug: 'xe-tay-ga' },
      { label: 'Xe côn tay', categorySlug: 'xe-con-tay' },
      { label: 'Xe số', categorySlug: 'xe-so' },
    ],
  },
];
