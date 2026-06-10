import React from 'react';
import { cn } from '../utils/cn';

const Footer = ({ sidebarCollapsed = false }) => {
  return (
    <footer
      className={cn(
        'min-h-[38px] border-t border-[#dee2e6] bg-white px-4 py-2 text-[#869099] transition-[margin-left] duration-200',
        sidebarCollapsed ? 'md:ml-[4.6rem]' : 'md:ml-[250px]',
      )}
    >
      <div className="flex w-full items-center justify-between gap-4 text-sm leading-tight max-sm:flex-col max-sm:items-start">
        <strong>Copyright &copy; 2026 <a className="text-primary hover:text-[#0056b3]" href="#">MoToSale</a>.</strong>
        <div className="hidden sm:inline-block">
          <b>Version</b> 1.0.0
        </div>
      </div>
    </footer>
  );
};

export default Footer;
