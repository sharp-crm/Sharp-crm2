import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import SuperAdminHeader from './SuperAdminHeader';
import { Outlet } from 'react-router-dom';
import { isSuperAdmin } from '../../utils/roleAccess';

const Layout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isSuperAdminUser = isSuperAdmin();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isCollapsed={isSuperAdminUser ? false : isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        {isSuperAdminUser ? (
          <SuperAdminHeader onToggleSidebar={() => {}} />
        ) : (
          <Header onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        )}
        <main className="p-4 bg-gray-50 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
