import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

const Sidebar = ({ collapsed = false }) => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const displayName = user?.fullName || user?.hoTen || user?.name || (user?.roles?.includes('Staff') ? 'Nhân viên' : 'Admin');

  const isActive = (path) => location.pathname === path;
  const isActiveGroup = (prefix) => location.pathname.startsWith(prefix);

  const navLinkClass = (active) => cn(
    'mb-1 flex min-h-[2.35rem] items-center rounded px-4 py-2 text-[#c2c7d0] hover:bg-white/10 hover:text-white',
    collapsed && 'justify-center px-3',
    active && 'bg-primary text-white hover:bg-primary hover:text-white',
  );
  const navIconClass = cn('w-[1.6rem] text-center', !collapsed && 'mr-1');
  const labelClass = cn('m-0', collapsed && 'hidden');
  const headerClass = cn('px-4 py-2 text-[0.72rem] uppercase tracking-normal text-[#d0d4db]', collapsed && 'hidden');

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-[1038] min-h-screen overflow-x-hidden overflow-y-auto bg-[#343a40] text-[#c2c7d0] shadow-[0_14px_28px_rgba(0,0,0,0.25),0_10px_10px_rgba(0,0,0,0.22)] transition-[transform,width] duration-200',
        collapsed ? 'w-[230px] -translate-x-full md:w-[4.6rem] md:translate-x-0' : 'w-[230px] translate-x-0 md:w-[250px]',
      )}
    >
      <Link to="/" className="block min-h-[57px] whitespace-nowrap border-b border-[#4b545c] px-2 py-[0.8125rem] text-xl leading-normal text-white/80 hover:text-white">
        <span className={cn('ml-3 font-light', collapsed && 'hidden')}>
          <b>MoToSale</b> Admin
        </span>
      </Link>

      <div className="px-2">
        <div className="mb-3 mt-3 flex border-b border-[#4f5962] pb-3">
          <div>
            <i className="fas fa-user-circle fa-2x text-[#f8f9fa]"></i>
          </div>
          <div className={cn('pl-2', collapsed && 'hidden')}>
            <Link to="#" className="block text-[#c2c7d0] hover:text-white">{displayName}</Link>
          </div>
        </div>

        <nav className="mt-2">
          <ul className="m-0 list-none p-0" role="menu">
            <li>
              <Link to="/" className={navLinkClass(isActive('/'))}>
                <i className={cn(navIconClass, 'fas fa-tachometer-alt')}></i>
                <p className={labelClass}>Tổng quan</p>
              </Link>
            </li>

            <li className={headerClass}>KINH DOANH & SẢN PHẨM</li>
            <li>
              <Link to="/motorcycles" className={navLinkClass(isActiveGroup('/motorcycles'))}>
                <i className={cn(navIconClass, 'fas fa-motorcycle')}></i>
                <p className={labelClass}>Xe máy</p>
              </Link>
            </li>
            <li>
              <Link to="/parts" className={navLinkClass(isActiveGroup('/parts'))}>
                <i className={cn(navIconClass, 'fas fa-cogs')}></i>
                <p className={labelClass}>Phụ tùng</p>
              </Link>
            </li>
            <li>
              <Link to="/categories" className={navLinkClass(isActiveGroup('/categories'))}>
                <i className={cn(navIconClass, 'fas fa-tags')}></i>
                <p className={labelClass}>Danh mục</p>
              </Link>
            </li>
            <li>
              <Link to="/brands" className={navLinkClass(isActiveGroup('/brands'))}>
                <i className={cn(navIconClass, 'fas fa-industry')}></i>
                <p className={labelClass}>Hãng xe & Dòng xe</p>
              </Link>
            </li>
            <li>
              <Link to="/manufacturers" className={navLinkClass(isActiveGroup('/manufacturers'))}>
                <i className={cn(navIconClass, 'fas fa-trademark')}></i>
                <p className={labelClass}>Hãng sản xuất phụ tùng</p>
              </Link>
            </li>

            <li className={headerClass}>BÁN HÀNG</li>
            <li>
              <Link to="/orders" className={navLinkClass(isActiveGroup('/orders'))}>
                <i className={cn(navIconClass, 'fas fa-shopping-cart')}></i>
                <p className={labelClass}>Đơn hàng</p>
              </Link>
            </li>
            <li>
              <Link to="/pos" className={navLinkClass(isActive('/pos'))}>
                <i className={cn(navIconClass, 'fas fa-cash-register')}></i>
                <p className={labelClass}>Bán tại quầy (POS)</p>
              </Link>
            </li>
            <li>
              <Link to="/vouchers" className={navLinkClass(isActiveGroup('/vouchers'))}>
                <i className={cn(navIconClass, 'fas fa-ticket-alt')}></i>
                <p className={labelClass}>Voucher</p>
              </Link>
            </li>
            <li>
              <Link to="/customers" className={navLinkClass(isActiveGroup('/customers'))}>
                <i className={cn(navIconClass, 'fas fa-user-tag')}></i>
                <p className={labelClass}>Khách hàng</p>
              </Link>
            </li>

            <li className={headerClass}>KHO & CUNG ỨNG</li>
            <li>
              <Link to="/inventory" className={navLinkClass(isActiveGroup('/inventory'))}>
                <i className={cn(navIconClass, 'fas fa-warehouse')}></i>
                <p className={labelClass}>Tồn kho</p>
              </Link>
            </li>
            <li>
              <Link to="/stock-documents" className={navLinkClass(isActiveGroup('/stock-documents'))}>
                <i className={cn(navIconClass, 'fas fa-clipboard-check')}></i>
                <p className={labelClass}>Chứng từ kho</p>
              </Link>
            </li>
            <li>
              <Link to="/supply" className={navLinkClass(isActiveGroup('/supply'))}>
                <i className={cn(navIconClass, 'fas fa-truck-loading')}></i>
                <p className={labelClass}>Cung ứng & mua hàng</p>
              </Link>
            </li>
            <li>
              <Link to="/installments" className={navLinkClass(isActiveGroup('/installments'))}>
                <i className={cn(navIconClass, 'fas fa-hand-holding-usd')}></i>
                <p className={labelClass}>Hồ sơ trả góp</p>
              </Link>
            </li>

            <li className={headerClass}>HẬU MÃI & DỊCH VỤ</li>
            <li>
              <Link to="/returns" className={navLinkClass(isActiveGroup('/returns'))}>
                <i className={cn(navIconClass, 'fas fa-undo')}></i>
                <p className={labelClass}>Đổi trả & hoàn tiền</p>
              </Link>
            </li>
            <li>
              <Link to="/warranties" className={navLinkClass(isActiveGroup('/warranties'))}>
                <i className={cn(navIconClass, 'fas fa-shield-alt')}></i>
                <p className={labelClass}>Bảo hành</p>
              </Link>
            </li>
            <li>
              <Link to="/service-crm" className={navLinkClass(isActiveGroup('/service-crm'))}>
                <i className={cn(navIconClass, 'fas fa-tools')}></i>
                <p className={labelClass}>Dịch vụ & CSKH</p>
              </Link>
            </li>

            <li className={headerClass}>Nội dung storefront</li>
            <li>
              <Link to="/home-banners" className={navLinkClass(isActiveGroup('/home-banners'))}>
                <i className={cn(navIconClass, 'fas fa-images')}></i>
                <p className={labelClass}>Banner trang chủ</p>
              </Link>
            </li>
            <li>
              <Link to="/faq" className={navLinkClass(isActiveGroup('/faq'))}>
                <i className={cn(navIconClass, 'fas fa-question-circle')}></i>
                <p className={labelClass}>Câu hỏi thường gặp</p>
              </Link>
            </li>
            <li>
              <Link to="/contacts" className={navLinkClass(isActiveGroup('/contacts'))}>
                <i className={cn(navIconClass, 'fas fa-envelope-open-text')}></i>
                <p className={labelClass}>Liên hệ khách hàng</p>
              </Link>
            </li>
            <li>
              <Link to="/reviews" className={navLinkClass(isActiveGroup('/reviews'))}>
                <i className={cn(navIconClass, 'fas fa-star-half-alt')}></i>
                <p className={labelClass}>Đánh giá</p>
              </Link>
            </li>
            <li>
              <Link to="/posts" className={navLinkClass(isActiveGroup('/posts'))}>
                <i className={cn(navIconClass, 'fas fa-newspaper')}></i>
                <p className={labelClass}>Bài viết</p>
              </Link>
            </li>

            <li className={headerClass}>TÀI CHÍNH & HỆ THỐNG</li>
            {isAdmin() && (
              <li>
                <Link to="/finance" className={navLinkClass(isActiveGroup('/finance'))}>
                  <i className={cn(navIconClass, 'fas fa-cash-register')}></i>
                  <p className={labelClass}>Tài chính: thu chi & công nợ</p>
                </Link>
              </li>
            )}
            <li>
              <Link to="/reports" className={navLinkClass(isActiveGroup('/reports'))}>
                <i className={cn(navIconClass, 'fas fa-chart-bar')}></i>
                <p className={labelClass}>Báo cáo & Thống kê</p>
              </Link>
            </li>
            {isAdmin() && (
              <li>
                <Link to="/users" className={navLinkClass(isActiveGroup('/users'))}>
                  <i className={cn(navIconClass, 'fas fa-users')}></i>
                  <p className={labelClass}>Tài khoản hệ thống</p>
                </Link>
              </li>
            )}
            {isAdmin() && (
              <li>
                <Link to="/audit-logs" className={navLinkClass(isActiveGroup('/audit-logs'))}>
                  <i className={cn(navIconClass, 'fas fa-clipboard-list')}></i>
                  <p className={labelClass}>Nhật ký hệ thống</p>
                </Link>
              </li>
            )}
            <li>
              <Link to="/settings" className={navLinkClass(isActiveGroup('/settings'))}>
                <i className={cn(navIconClass, 'fas fa-cog')}></i>
                <p className={labelClass}>Cấu hình vận hành</p>
              </Link>
            </li>
            {isAdmin() && (
              <li>
                <Link to="/operational-imports" className={navLinkClass(isActiveGroup('/operational-imports'))}>
                  <i className={cn(navIconClass, 'fas fa-file-import')}></i>
                  <p className={labelClass}>Import dữ liệu</p>
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
