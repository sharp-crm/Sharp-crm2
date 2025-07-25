import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Logout from './pages/Logout';
import Home from './pages/Home';
import SuperAdminHome from './pages/SuperAdminHome';
import Leads from './pages/Leads';
import Contacts from './pages/Contacts';
import Deals from './pages/Deals';
import Tasks from './pages/Tasks';
import Subsidiaries from './pages/Subsidiries';
import Dealers from './pages/Dealers';
import Notifications from './pages/Notifications';
import Personal from './pages/Settings/Personal';
import AccessControl from './pages/Settings/AccessControl';
import OrgTree from './pages/Settings/OrgTree';
import EmailIntegration from './pages/Integration/EmailIntegration';
import TeamChat from './pages/TeamChat';
import Profile from './pages/Profile';
import AllReports from './pages/Reports/AllReports';
import Favourites from './pages/Reports/Favourites';
import ScheduledReports from './pages/Reports/ScheduledReports';
import Overview from './pages/Analytics/Overview';
import LeadAnalytics from './pages/Analytics/LeadAnalytics';
import DealInsights from './pages/Analytics/DealInsights';
import ActivityStats from './pages/Analytics/ActivityStats';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthWrapper from './components/AuthWrapper';
import Toast from './components/Common/Toast';
import AllUsers from './pages/AllUsersByDomain';
import NotFound from './pages/NotFound';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { isSuperAdmin } from './utils/roleAccess';

// Component to handle SuperAdmin route access control
const SuperAdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSuperAdminUser = isSuperAdmin();
  
  // If user is SuperAdmin, redirect to 404 for unauthorized pages
  if (isSuperAdminUser) {
    return <NotFound />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <RouteErrorBoundary>
      <AuthWrapper>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/logout" element={<Logout />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="home" element={<SuperAdminHome />} />
            <Route path="settings/all-users" element={<AllUsers />} />
            
            {/* Routes that SuperAdmin cannot access - redirect to 404 */}
            <Route path="leads" element={<SuperAdminRouteGuard><Leads /></SuperAdminRouteGuard>} />
            <Route path="contacts" element={<SuperAdminRouteGuard><Contacts /></SuperAdminRouteGuard>} />
            <Route path="deals" element={<SuperAdminRouteGuard><Deals /></SuperAdminRouteGuard>} />
            <Route path="tasks" element={<SuperAdminRouteGuard><Tasks /></SuperAdminRouteGuard>} />
            <Route path="subsidiaries" element={<SuperAdminRouteGuard><Subsidiaries /></SuperAdminRouteGuard>} />
            <Route path="dealers" element={<SuperAdminRouteGuard><Dealers /></SuperAdminRouteGuard>} />
            
            {/* Common routes - SuperAdmin can access */}
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            
            {/* Settings routes - SuperAdmin can access specific ones */}
            <Route path="settings/personal" element={<Personal />} />
            <Route path="settings/access-control" element={<AccessControl />} />
            <Route path="settings/org-tree" element={<OrgTree />} />
            
            {/* Integration and Chat routes - SuperAdmin can access */}
            <Route path="integrations/email" element={<EmailIntegration />} />
            <Route path="team-chat" element={<TeamChat />} />
            
            {/* Reports routes - SuperAdmin cannot access */}
            <Route path="reports/all" element={<SuperAdminRouteGuard><AllReports /></SuperAdminRouteGuard>} />
            <Route path="reports/favourites" element={<SuperAdminRouteGuard><Favourites /></SuperAdminRouteGuard>} />
            <Route path="reports/scheduled" element={<SuperAdminRouteGuard><ScheduledReports /></SuperAdminRouteGuard>} />
            
            {/* Analytics routes - SuperAdmin cannot access */}
            <Route path="analytics/overview" element={<SuperAdminRouteGuard><Overview /></SuperAdminRouteGuard>} />
            <Route path="analytics/leads" element={<SuperAdminRouteGuard><LeadAnalytics /></SuperAdminRouteGuard>} />
            <Route path="analytics/deals" element={<SuperAdminRouteGuard><DealInsights /></SuperAdminRouteGuard>} />
            <Route path="analytics/activity" element={<SuperAdminRouteGuard><ActivityStats /></SuperAdminRouteGuard>} />
          </Route>
          
          {/* 404 Catch-all Route - MUST be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toast />
      </AuthWrapper>
    </RouteErrorBoundary>
  );
};

export default App;
