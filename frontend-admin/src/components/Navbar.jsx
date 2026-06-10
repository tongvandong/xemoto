import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

const Navbar = ({ sidebarCollapsed, onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const displayName = user?.fullName || user?.hoTen || user?.name || (user?.roles?.includes('Staff') ? 'Nhân viên' : 'Admin');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav
      className={cn(
        'fixed right-0 top-0 z-[1030] flex min-h-[57px] items-center justify-between border-b border-[#dee2e6] bg-white px-2 transition-[left] duration-200',
        sidebarCollapsed ? 'left-0 md:left-[4.6rem]' : 'left-0 md:left-[250px]',
      )}
    >
      <ul className="m-0 flex list-none items-center p-0">
        <li>
          <button
            className="flex min-h-10 items-center gap-2 border-0 bg-transparent px-4 py-2 text-black/65 hover:text-black/90"
            type="button"
            onClick={onToggleSidebar}
            aria-label="Mở/đóng menu"
          >
            <i className="fas fa-bars"></i>
          </button>
        </li>
        <li className="hidden sm:inline-block">
          <span className="flex min-h-10 items-center px-4 py-2 text-black/65">Hệ thống quản trị MoToSale</span>
        </li>
      </ul>

      <ul className="m-0 ml-auto flex list-none items-center p-0">
        <li className="relative">
          <button
            className="flex min-h-10 items-center gap-2 border-0 bg-transparent px-4 py-2 text-black/65 hover:text-black/90"
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
          >
            <i className="far fa-user"></i> {displayName}
          </button>
          <div
            className={cn(
              'absolute right-0 top-full z-[1000] mt-0.5 hidden min-w-40 border border-black/15 bg-white py-2 shadow-[0_0.5rem_1rem_rgba(0,0,0,0.12)]',
              profileOpen && 'block',
            )}
          >
            <span className="block w-full whitespace-nowrap px-4 py-1 text-sm text-[#6c757d]">
              {user?.email}
            </span>
            <div className="my-2 border-t border-[#e9ecef]"></div>
            <button className="block w-full whitespace-nowrap border-0 bg-transparent px-4 py-1 text-left text-[#212529] hover:bg-[#f8f9fa]" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt mr-2"></i> Đăng xuất
            </button>
          </div>
        </li>
        <li className="hidden sm:block">
          <button
            className="ml-1 flex min-h-9 items-center gap-2 rounded border border-[#dc3545] bg-white px-3 py-1.5 text-sm font-semibold text-[#dc3545] hover:bg-[#dc3545] hover:text-white"
            type="button"
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <i className="fas fa-sign-out-alt"></i>
            Đăng xuất
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
