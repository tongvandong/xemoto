import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import { cn } from '../utils/cn';

const MainLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const onResize = () => {
      setSidebarCollapsed(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <Navbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
      />
      <Sidebar collapsed={sidebarCollapsed} />
      <div
        className={cn(
          'flex min-h-[calc(100vh-38px)] flex-col pt-[57px] transition-[margin-left] duration-200',
          sidebarCollapsed ? 'md:ml-[4.6rem]' : 'md:ml-[250px]',
        )}
      >
        {children}
      </div>
      <Footer sidebarCollapsed={sidebarCollapsed} />
    </div>
  );
};

export default MainLayout;
