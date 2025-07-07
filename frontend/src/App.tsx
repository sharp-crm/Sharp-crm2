import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Logout from './pages/Logout';
import Home from './pages/Home';
import Leads from './pages/Leads';
import Contacts from './pages/Contacts';
import Deals from './pages/Deals';
import Tasks from './pages/Tasks';
import Subsidiaries from './pages/Subsidiries';
import Dealers from './pages/Dealers';
import Notifications from './pages/Notifications';
import Personal from './pages/Settings/Personal';
import AccessControl from './pages/Settings/AccessControl';
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

const App: React.FC = () => {
  return (
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
          <Route path="settings/all-users" element={<AllUsers />} />
          <Route path="leads" element={<Leads />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="deals" element={<Deals />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="subsidiaries" element={<Subsidiaries />} />
          <Route path="dealers" element={<Dealers />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings/personal" element={<Personal />} />
          <Route path="settings/access-control" element={<AccessControl />} />
          <Route path="integrations/email" element={<EmailIntegration />} />
          <Route path="team-chat" element={<TeamChat />} />
          <Route path="profile" element={<Profile />} />
          <Route path="reports/all" element={<AllReports />} />
          <Route path="reports/favourites" element={<Favourites />} />
          <Route path="reports/scheduled" element={<ScheduledReports />} />
          <Route path="analytics/overview" element={<Overview />} />
          <Route path="analytics/leads" element={<LeadAnalytics />} />
          <Route path="analytics/deals" element={<DealInsights />} />
          <Route path="analytics/activity" element={<ActivityStats />} />
        </Route>
      </Routes>
      <Toast />
    </AuthWrapper>
  );
};

export default App;
