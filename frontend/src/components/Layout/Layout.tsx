import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import InactivityWarning from '../Common/InactivityWarning';
// import AuthStatus from '../Common/AuthStatus';

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
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
