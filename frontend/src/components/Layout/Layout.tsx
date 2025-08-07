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
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-4 bg-gray-50 flex-1 overflow-y-auto">
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
