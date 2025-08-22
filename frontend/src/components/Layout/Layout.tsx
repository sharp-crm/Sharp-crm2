import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import InactivityWarning from '../Common/InactivityWarning';
// import AuthStatus from '../Common/AuthStatus';

const Layout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Auto-collapse sidebar on mobile devices
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  // Auto-collapse sidebar on mobile when clicking outside
  const handleMainContentClick = () => {
    if (isMobile && !isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={handleToggleSidebar} 
      />
      
      {/* Mobile backdrop overlay */}
      {!isSidebarCollapsed && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={handleToggleSidebar}
        />
      )}
      
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out" onClick={handleMainContentClick}>
        <Header onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
      
      {/* Inactivity warning component */}
      <InactivityWarning />
      
      {/* Auth status component (only in development) */}
      {/* {process.env.NODE_ENV === 'development' && <AuthStatus />} */}
    </div>
  );
};

export default Layout;
