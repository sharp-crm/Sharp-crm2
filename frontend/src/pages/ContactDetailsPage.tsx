import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { contactsApi, Contact, usersApi, User, Task } from '../api/services';
import ContactHeader from '../components/ContactDetails/ContactHeader';
import ContactSidebar from '../components/ContactDetails/ContactSidebar';
import ContactTabs from '../components/ContactDetails/ContactTabs';
import EditContactModal from '../components/EditContactModal';

const ContactDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');
  const [sidebarSection, setSidebarSection] = useState<string>('notes');
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Contact ID is required');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch contact data
        const contactData = await contactsApi.getById(id);
        if (!contactData) {
          setError('Contact not found');
          return;
        }
        setContact(contactData);
        setCurrentContact(contactData);

        // Fetch users for display names
        const usersData = await usersApi.getAll();
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch contact details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleEdit = () => {
    // Open edit modal
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    try {
      if (id) {
        const updatedContact = await contactsApi.getById(id);
        if (updatedContact) {
          setContact(updatedContact);
          setCurrentContact(updatedContact);
        }
      }
      setIsEditModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh contact data');
    }
  };

  const handleSendEmail = () => {
    // Open email compose modal
    console.log('Send email to:', contact?.email);
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return userId;
    
    const firstName = user.firstName || 'Unknown';
    const lastName = user.lastName || 'User';
    
    return `${firstName} ${lastName}`;
  };

  const handleContactUpdate = useCallback((updatedContact: Contact) => {
    setContact(updatedContact);
    setCurrentContact(updatedContact);
  }, []);

  const handleTasksUpdate = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error || 'Contact not found'}</p>
          </div>
          <button
            onClick={() => navigate('/contacts')}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <ContactHeader
          contact={contact}
          onEdit={handleEdit}
          onSendEmail={handleSendEmail}
          getUserDisplayName={getUserDisplayName}
        />

        {/* Content with Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-white border-r border-gray-200 overflow-y-auto">
            <ContactSidebar contact={currentContact || contact} tasks={tasks} />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <ContactTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              contact={currentContact || contact}
              getUserDisplayName={getUserDisplayName}
              onContactUpdate={handleContactUpdate}
              onTasksUpdate={handleTasksUpdate}
            />
          </div>
        </div>
      </div>

      {/* Edit Contact Modal */}
      <EditContactModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        contact={contact}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default ContactDetailsPage; 