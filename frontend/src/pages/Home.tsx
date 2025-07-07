import React, { useState, useEffect } from "react";
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from "../store/useAuthStore";
import { leadsApi, dealsApi, tasksApi, analyticsApi } from "../api/services";
import { useNotificationStore } from '../store/useNotificationStore';


const StatCard = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex items-center space-x-5 hover:shadow-lg transition-shadow duration-200 min-w-[220px] hover:bg-gray-50">
    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
      <Icon className="w-6 h-6 text-blue-600" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: { [key: string]: string } = {
    Negotiation: "bg-yellow-100 text-yellow-800",
    Proposal: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusStyles[status] || "bg-gray-100 text-gray-800"
      }`}
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
};

const Home: React.FC = () => {
  const today = new Date();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { addNotification } = useNotificationStore();
  
  // State for real data
  const [stats, setStats] = useState({
    openDeals: 0,
    activeDeals: 0,
    totalLeads: 0,
    totalTasks: 0
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [upcomingDeals, setUpcomingDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analytics, tasks, leads, deals] = await Promise.all([
        analyticsApi.getOverview(),
        tasksApi.getAll(),
        leadsApi.getAll(),
        dealsApi.getAll()
      ]);

      setStats({
        openDeals: analytics.activeDeals,
        activeDeals: analytics.deals.active,
        totalLeads: analytics.totalLeads,
        totalTasks: analytics.totalTasks
      });

      // Get recent incomplete tasks
      const incompleteTasks = tasks
        .filter(task => task.status !== 'Completed')
        .slice(0, 3);
      setRecentTasks(incompleteTasks);

      // Get recent leads (created today or recently)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const recentLeadsData = leads
        .filter(lead => {
          if (!lead.createdAt) return false;
          const leadDate = new Date(lead.createdAt);
          // Show leads from the last 7 days
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return leadDate >= weekAgo;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);
      setRecentLeads(recentLeadsData);

      // Get deals closing this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const closingDeals = deals
        .filter(deal => {
          if (!deal.expectedCloseDate) return false;
          const closeDate = new Date(deal.expectedCloseDate);
          return closeDate.getMonth() === currentMonth && 
                 closeDate.getFullYear() === currentYear &&
                 deal.stage !== 'Closed Won' && 
                 deal.stage !== 'Closed Lost';
        })
        .sort((a, b) => new Date(a.expectedCloseDate).getTime() - new Date(b.expectedCloseDate).getTime())
        .slice(0, 3);
      setUpcomingDeals(closingDeals);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dateString: string) => {
    const dueDate = new Date(dateString);
    return dueDate < today;
  };

  const handleTestNotification = () => {
    const notificationTypes = ['success', 'info', 'warning', 'error'];
    const messages = [
      { type: 'success', title: 'Deal Closed', message: 'Congratulations! You closed a $50,000 deal with TechCorp.' },
      { type: 'info', title: 'Meeting Reminder', message: 'You have a client meeting in 30 minutes.' },
      { type: 'warning', title: 'Task Overdue', message: 'The follow-up task for Global Industries is overdue.' },
      { type: 'error', title: 'System Alert', message: 'Failed to sync data. Please check your connection.' },
      { type: 'info', title: 'New Lead', message: 'A new lead "StartupXYZ" has been assigned to you.' }
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    addNotification({
      type: randomMessage.type,
      title: randomMessage.title,
      message: randomMessage.message,
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-10 max-w-screen-xl mx-auto">
      {/* ✅ Personalized Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl shadow-md border border-gray-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
                              Welcome, {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
            </h1>
            <p className="text-md text-gray-600 mt-2">
              Today is {today.toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}, {today.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })} IST
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/leads')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Icons.Users className="w-5 h-5 inline mr-2" /> View Leads
            </button>
            <button
              onClick={() => navigate('/deals')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Icons.Target className="w-5 h-5 inline mr-2" /> View Deals
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 animate-pulse">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard label="Open Deals" value={stats.openDeals} icon={Icons.Target} />
            <StatCard label="Active Deals" value={stats.activeDeals} icon={Icons.AlertCircle} />
            <StatCard label="Total Tasks" value={stats.totalTasks} icon={Icons.CheckSquare} />
            <StatCard label="Total Leads" value={stats.totalLeads} icon={Icons.Users} />
          </>
        )}
      </div>

      {/* Tasks and Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Open Tasks */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">My Open Tasks</h3>
            <button
              onClick={() => navigate('/tasks')}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm underline-offset-4 hover:underline transition-colors"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm table-auto">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.CheckSquare className="w-5 h-5 mr-2" /> Subject</span></th>
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Calendar className="w-5 h-5 mr-2" /> Due Date</span></th>
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Info className="w-5 h-5 mr-2" /> Status</span></th>
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Flag className="w-5 h-5 mr-2" /> Priority</span></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading skeleton for tasks
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-t border-gray-100 animate-pulse">
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    </tr>
                  ))
                ) : recentTasks.length > 0 ? (
                  recentTasks.map((task, index) => (
                    <tr
                      key={task.id}
                      className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                      onClick={() => navigate('/tasks')}
                    >
                      <td className="py-4 px-6">{task.title}</td>
                      <td className={`py-4 px-6 ${task.dueDate && isOverdue(task.dueDate) ? "text-red-600 font-medium" : "text-gray-800"}`}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                      </td>
                      <td className="py-4 px-6 text-gray-700">{task.status}</td>
                      <td className={`py-4 px-6 ${task.priority === "High" ? "text-red-600 font-medium" : "text-gray-700"}`}>
                        {task.priority}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 px-6 text-center text-gray-500">
                      No open tasks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Notifications</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleTestNotification}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Icons.Plus className="w-4 h-4 inline mr-1" /> Test
              </button>
              <button
                onClick={() => navigate('/notifications')}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm underline-offset-4 hover:underline transition-colors"
              >
                View All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm table-auto">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Bell className="w-5 h-5 mr-2" /> Message</span></th>
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Clock className="w-5 h-5 mr-2" /> Timestamp</span></th>
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Info className="w-5 h-5 mr-2" /> Type</span></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading skeleton for notifications
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-t border-gray-100 animate-pulse">
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-64"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 px-6 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Icons.Bell className="h-8 w-8 text-gray-400 mb-2" />
                        <p>No recent notifications</p>
                        <p className="text-sm text-gray-400 mt-1">Notifications will appear here when available</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Leads and Deals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Leads */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Recent Leads</h3>
            <button
              onClick={() => navigate('/leads')}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm underline-offset-4 hover:underline transition-colors"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm table-auto">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.User className="w-5 h-5 mr-2" /> Name</span></th>
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Mail className="w-5 h-5 mr-2" /> Email</span></th>
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Phone className="w-5 h-5 mr-2" /> Phone</span></th>
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Building2 className="w-5 h-5 mr-2" /> Company</span></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading skeleton for leads
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-t border-gray-100 animate-pulse">
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    </tr>
                  ))
                ) : recentLeads.length > 0 ? (
                  recentLeads.map((lead, index) => (
                    <tr
                      key={lead.id}
                      className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                      onClick={() => navigate('/leads')}
                    >
                      <td className="py-4 px-6 text-gray-800">{lead.firstName} {lead.lastName}</td>
                      <td className="py-4 px-6 text-gray-600">{lead.email}</td>
                      <td className="py-4 px-6 text-gray-600">{lead.phone || 'N/A'}</td>
                      <td className="py-4 px-6 text-gray-700">{lead.company || 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 px-6 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Icons.Users className="h-8 w-8 text-gray-400 mb-2" />
                        <p>No recent leads</p>
                        <p className="text-sm text-gray-400 mt-1">Recent leads will appear here</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deals Closing This Month */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Deals Closing This Month</h3>
            <button
              onClick={() => navigate('/deals')}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm underline-offset-4 hover:underline transition-colors"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm table-auto">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Target className="w-5 h-5 mr-2" /> Deal Name</span></th>
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Info className="w-5 h-5 mr-2" /> Stage</span></th>
                  <th className="pb-4 px-6"><span className="flex items-center"><Icons.Calendar className="w-5 h-5 mr-2" /> Expected Close Date</span></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading skeleton for deals
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-t border-gray-100 animate-pulse">
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-36"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    </tr>
                  ))
                ) : upcomingDeals.length > 0 ? (
                  upcomingDeals.map((deal, index) => (
                    <tr
                      key={deal.id}
                      className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                      onClick={() => navigate('/deals')}
                    >
                      <td className="py-4 px-6 text-gray-800">{deal.title}</td>
                      <td className="py-4 px-6"><StatusBadge status={deal.stage} /></td>
                      <td className="py-4 px-6 text-gray-600">
                        {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 px-6 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Icons.Target className="h-8 w-8 text-gray-400 mb-2" />
                        <p>No deals closing this month</p>
                        <p className="text-sm text-gray-400 mt-1">Deals with close dates this month will appear here</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;