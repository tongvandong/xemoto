import { SiFacebook, SiGmail, SiMessenger, SiYoutube, SiZalo } from "react-icons/si";
import banner1 from "./banners/banner1.png";
import banner2 from "./banners/banner2.png";
import banner3 from "./banners/banner3.png";
import banner4 from "./banners/banner4.png";
import banner5 from "./banners/banner5.png";
import maintenanceService from "./services/maintenance.png";
import genuinePartsService from "./services/phu-tung.png";
import mobileRepairService from "./services/sua-chua-luu-dong.png";
import combustionCleaningService from "./services/ve-sinh-buong-dot.png";
import logoEuroMoto from "./logo.png";

export const brandAssets = {
  logo: logoEuroMoto,
  footerLogo: logoEuroMoto,
  slider: banner1,
  bannerOne: banner4,
  bannerTwo: banner5,
  productBanner: banner2,
  collectionBannerOne: banner3,
  collectionBannerTwo: banner5,
};

const featuredCategoryImages = {
  scooter: 'https://cdn.honda.com.vn/motorbike-versions/Image360/November2025/1762149017/6.png',
  manual: 'https://cdn.honda.com.vn/motorbike-strong-points/October2024/Hz1Ql8MYzIzGOaRTzkxH.png',
  clutch: 'https://cdn.honda.com.vn/motorbike-versions/Image360/September2025/1757787378/0.png',
};

export const homeHeroSlides = [
  {
    id: 'banner-1',
    image: banner1,
    alt: 'EURO Moto',
    to: '/products',
  },
  {
    id: 'banner-2',
    image: banner2,
    alt: 'EURO Moto',
    to: '/products',
  },
  {
    id: 'banner-4',
    image: banner4,
    alt: 'EURO Moto',
    to: '/products',
  },
  {
    id: 'banner-3',
    image: banner3,
    alt: 'EURO Moto',
    to: '/products',
  },
  {
    id: 'banner-5',
    image: banner5,
    alt: 'EURO Moto',
    to: '/products',
  },
];

export const homeCategoryReferences = [
  {
    id: 'featured-scooter',
    name: 'Xe tay ga',
    slug: 'xe-tay-ga',
    image: featuredCategoryImages.scooter,
    to: '/products?categorySlug=xe-tay-ga',
    match: ['xe tay ga', 'tay ga', 'scooter'],
  },
  {
    id: 'featured-manual',
    name: 'Xe số',
    slug: 'xe-so',
    image: featuredCategoryImages.manual,
    to: '/products?categorySlug=xe-so',
    match: ['xe so', 'xe số', 'so', 'underbone'],
  },
  {
    id: 'featured-sport',
    name: 'Xe côn tay',
    slug: 'xe-con-tay',
    image: featuredCategoryImages.clutch,
    to: '/products?categorySlug=xe-con-tay',
    match: ['xe con tay', 'xe côn tay', 'con tay', 'sport'],
  },
];

export const serviceHighlights = [
  {
    id: 'bao-duong',
    title: 'Bảo dưỡng xe',
    description: 'Bảo dưỡng định kỳ, thay dầu, kiểm tra máy và hệ thống phanh để xe luôn vận hành ổn định.',
    image: maintenanceService,
  },
  {
    id: 'phu-tung',
    title: 'Phụ tùng chính hãng',
    description: 'Cung cấp linh kiện và phụ tùng đúng tiêu chuẩn chính hãng cho các dòng xe phổ biến.',
    image: genuinePartsService,
  },
  {
    id: 'luu-dong',
    title: 'Sửa chữa lưu động',
    description: 'Hỗ trợ xử lý sự cố nhanh, tư vấn tại chỗ và sắp xếp kỹ thuật viên khi khách hàng cần gấp.',
    image: mobileRepairService,
  },
  {
    id: 've-sinh',
    title: 'Vệ sinh buồng đốt',
    description: 'Làm sạch hệ thống buồng đốt, kim phun và họng máy để cải thiện hiệu suất và tiết kiệm nhiên liệu.',
    image: combustionCleaningService,
  },
];

export const navItems = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Sản phẩm', to: '/products', hasCaret: true },
  { label: 'Trả góp', to: '/tra-gop' },
  { label: 'Liên hệ', to: '/contact' },
  { label: 'Câu hỏi thường gặp', to: '/faq' },
];

export const socialLinks = [
  {
    icon: SiFacebook,
    label: "Facebook",
    className: "bg-[#1877f2]",
    href: "https://web.facebook.com/pham.dung.224360"
  },
  {
    icon: SiMessenger,
    label: "Messenger",
    className: "bg-[#0084ff]",
    href: "https://m.me/pham.dung.224360"
  },
  {
    icon: SiZalo,
    label: "Zalo",
    className: "bg-[#0068ff]",
    href: "https://zalo.me/0392757286"
  },
  {
    icon: SiGmail,
    label: "Gmail",
    className: "bg-[#ea4335]",
    href: "mailto:phamtiendung2k5hc@gmail.com"
  },
  {
    icon: SiYoutube,
    label: "YouTube",
    className: "bg-[#ff0000]",
    href: "https://www.youtube.com/"
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
