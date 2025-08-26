import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Contact, contactsApi, Product, productsApi, Task, tasksApi, usersApi, Quote, quotesApi, Deal, dealsApi } from '../../api/services';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import AddNewModal from '../Common/AddNewModal';
import EditTaskModal from '../EditTaskModal';
import ProductSelectionModal from './ProductSelectionModal';
import QuoteSelectionModal from './QuoteSelectionModal';

interface ContactTabsProps {
  activeTab: 'overview' | 'timeline';
  onTabChange: (tab: 'overview' | 'timeline') => void;
  contact: Contact;
  getUserDisplayName: (userId: string) => string;
  onContactUpdate?: (updatedContact: Contact) => void;
  onTasksUpdate?: (tasks: Task[]) => void;
  onDealsUpdate?: (deals: Deal[]) => void;
}

const ContactTabs: React.FC<ContactTabsProps> = ({
  activeTab,
  onTabChange,
  contact,
  getUserDisplayName,
  onContactUpdate,
  onTasksUpdate,
  onDealsUpdate
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          <button
            onClick={() => onTabChange('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onTabChange('timeline')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' ? (
          <OverviewTab 
            contact={contact} 
            getUserDisplayName={getUserDisplayName}
            onContactUpdate={onContactUpdate}
            onTasksUpdate={onTasksUpdate}
            onDealsUpdate={onDealsUpdate}
          />
        ) : (
          <TimelineTab contact={contact} getUserDisplayName={getUserDisplayName} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ 
  contact: Contact; 
  getUserDisplayName: (userId: string) => string;
  onContactUpdate?: (updatedContact: Contact) => void;
  onTasksUpdate?: (tasks: Task[]) => void;
  onDealsUpdate?: (deals: Deal[]) => void;
}> = ({
  contact,
  getUserDisplayName,
  onContactUpdate,
  onTasksUpdate,
  onDealsUpdate
}) => {
  const { addToast } = useToastStore();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [lastFetchedContactId, setLastFetchedContactId] = useState<string | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDeleteConfirm, setTaskToDeleteConfirm] = useState<Task | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [relatedQuotes, setRelatedQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [isAddQuoteModalOpen, setIsAddQuoteModalOpen] = useState(false);
  const [isCreateQuoteModalOpen, setIsCreateQuoteModalOpen] = useState(false);
  const [relatedDeals, setRelatedDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please enter a note before saving.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine existing notes with new note
      const existingNotes = contact.notes || '';
      const updatedNotes = existingNotes 
        ? `${existingNotes}\n\n${new Date().toLocaleString()}: ${newNote}`
        : `${new Date().toLocaleString()}: ${newNote}`;

      // Update the contact in the database
      const updatedContact = await contactsApi.update(contact.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Added',
        message: 'Note has been successfully added to the contact.'
      });
      
      setNewNote('');
      
      // Update the parent component with the new contact data
      if (onContactUpdate && updatedContact) {
        onContactUpdate(updatedContact);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add note';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNote = async (noteIndex: number) => {
    if (!editingNoteContent.trim()) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please enter a note before saving.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const notesArray = contact.notes ? contact.notes.split('\n\n') : [];
      const noteParts = notesArray[noteIndex].split(': ');
      const timestamp = noteParts[0];
      
      // Update the specific note
      notesArray[noteIndex] = `${timestamp}: ${editingNoteContent}`;
      const updatedNotes = notesArray.join('\n\n');

      // Update the contact in the database
      const updatedContact = await contactsApi.update(contact.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Updated',
        message: 'Note has been successfully updated.'
      });
      
      setEditingNoteIndex(null);
      setEditingNoteContent('');
      
      // Update the parent component with the new contact data
      if (onContactUpdate && updatedContact) {
        onContactUpdate(updatedContact);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update note';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteIndex: number) => {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const notesArray = contact.notes ? contact.notes.split('\n\n') : [];
      
      // Remove the specific note
      notesArray.splice(noteIndex, 1);
      const updatedNotes = notesArray.join('\n\n');

      // Update the contact in the database
      const updatedContact = await contactsApi.update(contact.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Deleted',
        message: 'Note has been successfully deleted.'
      });
      
      // Update the parent component with the new contact data
      if (onContactUpdate && updatedContact) {
        onContactUpdate(updatedContact);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete note';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch users for the EditTaskModal
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await usersApi.getAll();
        setUsers(users);
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  // Fetch tasks related to this contact
  useEffect(() => {
    const fetchContactTasks = async () => {
      if (!contact?.id) return;
      
      if (lastFetchedContactId === contact.id && tasks.length > 0) {
        return;
      }
      
      setLoadingTasks(true);
      try {
        const allTasks = await tasksApi.getAll();
        const contactTasks = allTasks.filter(task => 
          task.contactLeadType === 'contact' && task.contactLeadId === contact.id
        );
        
        setTasks(contactTasks);
        setLastFetchedContactId(contact.id);
        if (onTasksUpdate) {
          onTasksUpdate(contactTasks);
        }
      } catch (error) {
        console.error('Error fetching contact tasks:', error);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchContactTasks();

    return () => {
      setTasks([]);
      setLastFetchedContactId(null);
    };
  }, [contact?.id]);

  // Fetch related products
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!contact.relatedProductIds || contact.relatedProductIds.length === 0) {
        setRelatedProducts([]);
        return;
      }

      setLoadingProducts(true);
      try {
        const products = await Promise.all(
          contact.relatedProductIds.map(id => productsApi.getById(id))
        );
        setRelatedProducts(products.filter(Boolean) as Product[]);
      } catch (error) {
        console.error('Error fetching related products:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch related products.'
        });
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchRelatedProducts();
  }, [contact.relatedProductIds]);

  // Fetch related quotes
  useEffect(() => {
    const fetchRelatedQuotes = async () => {
      if (!contact.relatedQuoteIds || contact.relatedQuoteIds.length === 0) {
        setRelatedQuotes([]);
        setLoadingQuotes(false);
        return;
      }

      setLoadingQuotes(true);
      try {
        const quotes = await Promise.all(
          contact.relatedQuoteIds.map(id => quotesApi.getById(id))
        );
        setRelatedQuotes(quotes.filter(Boolean) as Quote[]);
      } catch (error) {
        console.error('Error fetching related quotes:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch related quotes.'
        });
      } finally {
        setLoadingQuotes(false);
      }
    };

    fetchRelatedQuotes();
  }, [contact.relatedQuoteIds]);

  // Fetch related deals
  useEffect(() => {
    const fetchRelatedDeals = async () => {
      setLoadingDeals(true);
      try {
        // Get all deals and filter for those that have this contact in their relatedContactIds
        const allDeals = await dealsApi.getAll();
        const dealsWithContact = allDeals.filter(deal => 
          deal.relatedContactIds && deal.relatedContactIds.includes(contact.id)
        );
        setRelatedDeals(dealsWithContact);
        
        // Update parent component with deals count
        if (onDealsUpdate) {
          onDealsUpdate(dealsWithContact);
        }
      } catch (error) {
        console.error('Error fetching related deals:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch related deals.'
        });
      } finally {
        setLoadingDeals(false);
      }
    };

    fetchRelatedDeals();
  }, [contact.id, onDealsUpdate]);

  // Refresh deals when contact changes
  useEffect(() => {
    if (contact.id) {
      // Only fetch if we have a contact
      console.log('🔍 [useEffect] Contact changed, refetching deals');
      refreshDeals();
    }
  }, [contact.id]);

  const handleTaskCreated = async () => {
    if (contact?.id) {
      setLastFetchedContactId(null);
      
      const allTasks = await tasksApi.getAll();
      const contactTasks = allTasks.filter(task => 
        task.contactLeadType === 'contact' && task.contactLeadId === contact.id
      );
      
      setTasks(contactTasks);
      setLastFetchedContactId(contact.id);
      if (onTasksUpdate) {
        onTasksUpdate(contactTasks);
      }
      addToast({
        type: 'success',
        title: 'Task Created',
        message: 'New task has been created successfully.'
      });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setIsUpdatingTask(true);
    try {
      const updatedTask = await tasksApi.update(taskId, { status: 'Completed' });
      setTasks(prev => prev.map(task => task.id === taskId ? updatedTask : task));
      if (onTasksUpdate) {
        const updatedTasks = tasks.map(task => task.id === taskId ? updatedTask : task);
        onTasksUpdate(updatedTasks);
      }
      addToast({
        type: 'success',
        title: 'Task Completed',
        message: 'Task has been marked as completed successfully.'
      });
    } catch (error) {
      console.error('Error completing task:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to complete task. Please try again.'
      });
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDeleteConfirm(task);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDeleteConfirm) return;
    
    setIsDeletingTask(true);
    setTaskToDelete(taskToDeleteConfirm.id);
    try {
      const updatedTask = await tasksApi.update(taskToDeleteConfirm.id, { isDeleted: true });
      setTasks(prev => prev.filter(task => task.id !== taskToDeleteConfirm.id));
      if (onTasksUpdate) {
        const updatedTasks = tasks.filter(task => task.id !== taskToDeleteConfirm.id);
        onTasksUpdate(updatedTasks);
      }
      addToast({
        type: 'success',
        title: 'Task Deleted',
        message: 'Task has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete task. Please try again.'
      });
    } finally {
      setIsDeletingTask(false);
      setTaskToDelete(null);
      setShowDeleteConfirm(false);
      setTaskToDeleteConfirm(null);
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsEditTaskModalOpen(true);
  };

  const handleEditTaskSuccess = async () => {
    if (contact?.id) {
      const allTasks = await tasksApi.getAll();
      const contactTasks = allTasks.filter(task => 
        task.contactLeadType === 'contact' && task.contactLeadId === contact.id
      );
      
      setTasks(contactTasks);
      if (onTasksUpdate) {
        onTasksUpdate(contactTasks);
      }
    }
    setIsEditTaskModalOpen(false);
    setTaskToEdit(null);
  };

  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!taskToEdit) return;
    
    try {
      const updatedTask = await tasksApi.update(taskToEdit.id, updates);
      setTasks(prev => prev.map(task => task.id === taskToEdit.id ? updatedTask : task));
      if (onTasksUpdate) {
        const updatedTasks = tasks.map(task => task.id === taskToEdit.id ? updatedTask : task);
        onTasksUpdate(updatedTasks);
      }
      addToast({
        type: 'success',
        title: 'Task Updated',
        message: 'Task has been updated successfully.'
      });
      setIsEditTaskModalOpen(false);
      setTaskToEdit(null);
    } catch (error) {
      console.error('Error updating task:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task. Please try again.'
      });
    }
  };

  // Product management functions
  const handleAddProduct = async (productId: string) => {
    try {
      const currentProductIds = contact.relatedProductIds || [];
      const updatedProductIds = [...currentProductIds, productId];

      // Update the contact with the new product
      const updatedContact = await contactsApi.update(contact.id, { 
        relatedProductIds: updatedProductIds 
      });

      // Update the product with the new contact
      const product = await productsApi.getById(productId);
      if (product) {
        const currentContactIds = product.relatedContactIds || [];
        const updatedContactIds = [...currentContactIds, contact.id];
        await productsApi.update(productId, { 
          relatedContactIds: updatedContactIds 
        });
      }

      addToast({
        type: 'success',
        title: 'Product Added',
        message: 'Product has been successfully added to the contact.'
      });

      // Update the parent component
      if (onContactUpdate && updatedContact) {
        onContactUpdate(updatedContact);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add product';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this product from the contact?')) {
      return;
    }

    try {
      const currentProductIds = contact.relatedProductIds || [];
      const updatedProductIds = currentProductIds.filter(id => id !== productId);

      // Update the contact
      const updatedContact = await contactsApi.update(contact.id, { 
        relatedProductIds: updatedProductIds 
      });

      // Update the product
      const product = await productsApi.getById(productId);
      if (product) {
        const currentContactIds = product.relatedContactIds || [];
        const updatedContactIds = currentContactIds.filter(id => id !== contact.id);
        await productsApi.update(productId, { 
          relatedContactIds: updatedContactIds 
        });
      }

      addToast({
        type: 'success',
        title: 'Product Removed',
        message: 'Product has been successfully removed from the contact.'
      });

      // Update the parent component
      if (onContactUpdate && updatedContact) {
        onContactUpdate(updatedContact);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove product';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  // Quote management functions
  const handleAddQuote = async (quoteId: string) => {
    try {
      const currentQuoteIds = contact.relatedQuoteIds || [];
      const updatedQuoteIds = [...currentQuoteIds, quoteId];

      // Update the contact with the new quote
      const updatedContact = await contactsApi.update(contact.id, { 
        relatedQuoteIds: updatedQuoteIds 
      });

      addToast({
        type: 'success',
        title: 'Quote Added',
        message: 'Quote has been successfully added to the contact.'
      });

      // Update the parent component
      if (onContactUpdate && updatedContact) {
        onContactUpdate(updatedContact);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add quote';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  const handleRemoveQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to remove this quote from the contact?')) {
      return;
    }

    try {
      const currentQuoteIds = contact.relatedQuoteIds || [];
      const updatedQuoteIds = currentQuoteIds.filter(id => id !== quoteId);

      // Update the contact
      const updatedContact = await contactsApi.update(contact.id, { 
        relatedQuoteIds: updatedQuoteIds 
      });

      addToast({
        type: 'success',
        title: 'Quote Removed',
        message: 'Quote has been successfully removed from the contact.'
      });

      // Update the parent component
      if (onContactUpdate && updatedContact) {
        onContactUpdate(updatedContact);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove quote';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  const handleRemoveDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to remove this deal from the contact?')) {
      return;
    }

    try {
      // Get the deal and remove this contact from its relatedContactIds
      const deal = await dealsApi.getById(dealId);
      if (deal && deal.relatedContactIds) {
        const updatedContactIds = deal.relatedContactIds.filter(id => id !== contact.id);
        await dealsApi.update(dealId, { 
          relatedContactIds: updatedContactIds 
        });
      }

      addToast({
        type: 'success',
        title: 'Deal Removed',
        message: 'Deal has been successfully removed from the contact.'
      });

      // Refresh deals to update the UI
      refreshDeals();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove deal';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  const refreshQuotes = async () => {
    try {
      const refreshedContact = await contactsApi.getById(contact.id);
      if (refreshedContact && onContactUpdate) {
        onContactUpdate(refreshedContact);
      }
      
      // Also refresh the local quotes state
      if (refreshedContact?.relatedQuoteIds && refreshedContact.relatedQuoteIds.length > 0) {
        const quotes = await Promise.all(
          refreshedContact.relatedQuoteIds.map(id => quotesApi.getById(id))
        );
        setRelatedQuotes(quotes.filter(Boolean) as Quote[]);
      } else {
        setRelatedQuotes([]);
      }
      
      // Force a re-render by updating the loading state briefly
      setLoadingQuotes(true);
      setTimeout(() => setLoadingQuotes(false), 100);
      
      return refreshedContact;
    } catch (error) {
      console.error('Error refreshing quotes:', error);
      return null;
    }
  };

  const refreshDeals = async () => {
    try {
      console.log('🔍 [refreshDeals] Refreshing deals...');
      
      // Get all deals and filter for those that have this contact in their relatedContactIds
      const allDeals = await dealsApi.getAll();
      const dealsWithContact = allDeals.filter(deal => 
        deal.relatedContactIds && deal.relatedContactIds.includes(contact.id)
      );
      
      console.log('🔍 [refreshDeals] Found deals with this contact:', dealsWithContact.length);
      
      // Update local state
      setRelatedDeals(dealsWithContact);
      
      // Update parent component with deals count
      if (onDealsUpdate) {
        onDealsUpdate(dealsWithContact);
      }
      
      // Force a re-render by updating the loading state briefly
      setLoadingDeals(true);
      setTimeout(() => setLoadingDeals(false), 100);
      
      console.log('🔍 [refreshDeals] Deals refreshed successfully');
      return dealsWithContact;
    } catch (error) {
      console.error('Error refreshing deals:', error);
      return [];
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Contact Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Contact Owner</label>
                <p className="text-gray-900">{getUserDisplayName(contact.contactOwner || contact.ownerId || '')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Title</label>
                <p className="text-gray-900">{contact.title || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-gray-900">{contact.phone || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Lead Source</label>
                <p className="text-gray-900">{contact.leadSource || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Company</label>
                <p className="text-gray-900">{contact.companyName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Contact Name</label>
                <p className="text-gray-900">{contact.firstName} {contact.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900">{contact.email || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <p className="text-gray-900">{contact.status || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
          {(contact.street || contact.city || contact.state || contact.country) ? (
            <div className="space-y-2">
              {contact.street && <p className="text-gray-900">{contact.street}</p>}
              {contact.area && <p className="text-gray-900">{contact.area}</p>}
              <p className="text-gray-900">
                {[contact.city, contact.state, contact.zipCode].filter(Boolean).join(', ')}
              </p>
              {contact.country && <p className="text-gray-900">{contact.country}</p>}
            </div>
          ) : (
            <p className="text-gray-500 italic">No address information provided</p>
          )}
        </div>

        {/* Notes Section */}
        <div id="section-notes" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Notes</h3>
          </div>
          
          {contact.notes ? (
            <div className="space-y-4">
              {contact.notes.split('\n\n').map((note, index) => {
                const noteParts = note.split(': ');
                const timestamp = noteParts[0];
                const noteContent = noteParts.slice(1).join(': ');
                
                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    {editingNoteIndex === index ? (
                      <div className="space-y-3">
                        <textarea
                          value={editingNoteContent}
                          onChange={(e) => setEditingNoteContent(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          placeholder="Edit your note..."
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>Contact - {contact.firstName} {contact.lastName}</span>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center space-x-1">
                              <Icons.Clock className="w-3 h-3" />
                              <span>{timestamp}</span>
                              <span>by</span>
                              <span className="font-medium">{getUserDisplayName(contact.createdBy)}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingNoteIndex(null);
                                setEditingNoteContent('');
                              }}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleEditNote(index)}
                              disabled={isSubmitting}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSubmitting ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {noteContent}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingNoteIndex(index);
                                setEditingNoteContent(noteContent);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteNote(index)}
                              disabled={isDeleting}
                              className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                            >
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>Contact - {contact.firstName} {contact.lastName}</span>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center space-x-1">
                            <Icons.Clock className="w-3 h-3" />
                            <span>{timestamp}</span>
                            <span>by</span>
                            <span className="font-medium">{getUserDisplayName(contact.createdBy)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Icons.FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No notes yet</p>
            </div>
          )}
          
          {/* Add Note Input */}
          <div className="mt-5">
            <div className="border border-gray-300 rounded-lg p-4">
              <textarea
                id="add-note-textarea"
                placeholder="Add a note"
                rows={3}
                className="w-full border-none resize-none focus:ring-0 focus:outline-none text-sm text-gray-900 placeholder-gray-500"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>Press Enter to save</span>
                </div>
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Icons.Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Plus className="w-4 h-4" />
                      <span>Add Note</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Deals Section */}
        <div id="section-deals" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Deals</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsAddDealModalOpen(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                <Icons.Plus className="w-4 h-4 mr-1" />
                Add Deal
              </button>
            </div>
          </div>
          
          {loadingDeals ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading deals...</p>
            </div>
          ) : relatedDeals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Close Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {relatedDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <Icons.Target className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <button
                              onClick={() => navigate(`/deals/${deal.id}`)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                            >
                              {deal.dealName || deal.name}
                            </button>
                            <div className="text-sm text-gray-500">{deal.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          deal.stage === 'Closed Won' ? 'bg-green-100 text-green-800' :
                          deal.stage === 'Closed Lost' ? 'bg-red-100 text-red-800' :
                          deal.stage === 'Closed Lost to Competition' ? 'bg-red-100 text-red-800' :
                          deal.stage === 'Needs Analysis' ? 'bg-blue-100 text-blue-800' :
                          deal.stage === 'Value Proposition' ? 'bg-yellow-100 text-yellow-800' :
                          deal.stage === 'Identify Decision Makers' ? 'bg-purple-100 text-purple-800' :
                          deal.stage === 'Negotiation/Review' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {deal.stage || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getUserDisplayName(deal.dealOwner || deal.owner || '')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ${deal.amount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/deals/${deal.id}`)}
                          className="text-blue-600 hover:text-blue-800 transition-colors mr-2"
                          title="View Deal"
                        >
                          <Icons.Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveDeal(deal.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Remove Deal"
                        >
                          <Icons.X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Icons.Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No deals associated yet</p>
            </div>
          )}
        </div>

        {/* Open Tasks Section */}
        <div id="section-openActivities" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Open Tasks</h3>
            <button 
              onClick={() => setIsAddTaskModalOpen(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              <Icons.Plus className="w-4 h-4 mr-1" />
              Add Activity
            </button>
          </div>
          
          {loadingTasks ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading activities...</p>
            </div>
          ) : tasks.filter(task => task.status !== 'Completed').length > 0 ? (
            <div className="space-y-3">
              {tasks.filter(task => task.status !== 'Completed').map((task) => (
                <div key={task.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Icons.CheckSquare className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-medium text-gray-900">
                          <button
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                          >
                            {task.title}
                          </button>
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.priority === 'High' ? 'bg-red-100 text-red-800' :
                          task.priority === 'Normal' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Icons.User className="w-3 h-3" />
                          <span>{getUserDisplayName(task.assignee)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icons.Calendar className="w-3 h-3" />
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icons.Clock className="w-3 h-3" />
                          <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={isUpdatingTask}
                        className="px-3 py-1 text-sm text-green-600 hover:text-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        title="Mark as Complete"
                      >
                        <Icons.Check className="w-3 h-3" />
                        <span>{isUpdatingTask ? 'Completing...' : 'Complete'}</span>
                      </button>
                      <button
                        onClick={() => handleEditTask(task)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
                        title="Edit Task"
                      >
                        <Icons.Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task)}
                        disabled={isDeletingTask}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        title="Delete Task"
                      >
                        <Icons.Trash2 className="w-3 h-3" />
                        <span>{isDeletingTask ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Icons.Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No Open Tasks yet</p>
            </div>
          )}
        </div>

        {/* Closed Tasks Section */}
        <div id="section-closedActivities" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Closed Tasks</h3>
            <button 
              onClick={() => navigate('/tasks')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
          
          {loadingTasks ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading activities...</p>
            </div>
          ) : tasks.filter(task => task.status === 'Completed').length > 0 ? (
            <div className="space-y-3">
              {tasks.filter(task => task.status === 'Completed').map((task) => (
                <div key={task.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Icons.CheckSquare className="w-4 h-4 text-green-600" />
                        <h4 className="text-sm font-medium text-gray-900">
                          <button
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                          >
                            {task.title}
                          </button>
                        </h4>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Icons.User className="w-3 h-3" />
                          <span>{getUserDisplayName(task.assignee)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icons.Calendar className="w-3 h-3" />
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Icons.Clock className="w-3 h-3" />
                          <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEditTask(task)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
                        title="Edit Task"
                      >
                        <Icons.Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task)}
                        disabled={isDeletingTask}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        title="Delete Task"
                      >
                        <Icons.Trash2 className="w-3 h-3" />
                        <span>{isDeletingTask ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Icons.CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No Closed Tasks yet</p>
          </div>
          )}
        </div>

        {/* Products Section */}
        <div id="section-products" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Products</h3>
            <button 
              onClick={() => setIsAddProductModalOpen(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              <Icons.Plus className="w-4 h-4 mr-1" />
              Add Product
            </button>
          </div>
          
          {loadingProducts ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading products...</p>
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {relatedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <Icons.Package className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <button
                              onClick={() => navigate(`/products/${product.id}`)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                            >
                              {product.name}
                            </button>
                            <div className="text-sm text-gray-500">{product.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.activeStatus 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.activeStatus ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getUserDisplayName(product.productOwner)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${product.unitPrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.quantityInStock || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemoveProduct(product.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Remove Product"
                        >
                          <Icons.X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Icons.Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No products associated yet</p>
            </div>
          )}
        </div>

        {/* Quotes Section */}
        <div id="section-quotes" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quotes</h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsAddQuoteModalOpen(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                <Icons.Plus className="w-4 h-4 mr-1" />
                Assign
              </button>
              <button 
                onClick={() => setIsCreateQuoteModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1 rounded-lg flex items-center"
              >
                <Icons.Plus className="w-4 h-4 mr-1" />
                New
              </button>
            </div>
          </div>
          
          {loadingQuotes ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading quotes...</p>
            </div>
          ) : relatedQuotes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quote
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valid Until
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {relatedQuotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <Icons.FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <button
                              onClick={() => navigate(`/quotes/${quote.id}`)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                            >
                              {quote.quoteName}
                            </button>
                            <div className="text-sm text-gray-500">{quote.quoteNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          quote.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                          quote.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                          quote.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                          quote.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getUserDisplayName(quote.quoteOwner)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ${quote.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(quote.validUntil).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemoveQuote(quote.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Remove Quote"
                        >
                          <Icons.X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Icons.FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No quotes associated yet</p>
            </div>
          )}
        </div>

        {/* Emails Section */}
        <div id="section-emails" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Emails</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Add New
            </button>
          </div>
          <div className="text-center py-8">
            <Icons.Mail className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No emails yet</p>
          </div>
        </div>

        {/* Audit Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="text-gray-900">{new Date(contact.createdAt || '').toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created By:</span>
              <span className="text-gray-900">{contact.createdBy ? getUserDisplayName(contact.createdBy) : 'Unknown User'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Updated:</span>
              <span className="text-gray-900">{contact.updatedAt ? new Date(contact.updatedAt).toLocaleString() : 'Not updated'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Updated By:</span>
              <span className="text-gray-900">{contact.updatedBy ? getUserDisplayName(contact.updatedBy) : 'Unknown User'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      <AddNewModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        defaultType="task"
        onSuccess={handleTaskCreated}
        prefillData={{
          relatedRecordType: 'contact',
          relatedRecordId: contact?.id,
          contactLeadType: 'contact',
          contactLeadId: contact?.id,
          currentContact: {
            id: contact?.id,
            firstName: contact?.firstName,
            lastName: contact?.lastName
          }
        }}
        key={`task-modal-${contact?.id}`}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={isEditTaskModalOpen}
        onClose={() => {
          setIsEditTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        task={taskToEdit!}
        onSave={handleTaskUpdate}
        userName={getUserDisplayName(contact?.createdBy || '')}
        users={users}
      />

      {/* Product Selection Modal */}
      <ProductSelectionModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onProductSelect={handleAddProduct}
        existingProductIds={contact.relatedProductIds || []}
      />

      {/* Quote Selection Modal */}
      <QuoteSelectionModal
        isOpen={isAddQuoteModalOpen}
        onClose={() => setIsAddQuoteModalOpen(false)}
        onQuoteSelect={handleAddQuote}
        existingQuoteIds={contact.relatedQuoteIds || []}
      />

      {/* Create New Quote Modal */}
      <AddNewModal
        isOpen={isCreateQuoteModalOpen}
        onClose={() => setIsCreateQuoteModalOpen(false)}
        defaultType="quote"
        onSuccess={async () => {
          setIsCreateQuoteModalOpen(false);
          
          try {
            console.log('🔍 [handleCreateQuote] Quote created successfully, establishing relationship...');
            
            // Show loading state
            setLoadingQuotes(true);
            
            // Wait a bit for the quote to be fully created in the database
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get all quotes and find the most recent one created by the current user
            const allQuotes = await quotesApi.getAll();
            const currentUserId = user?.userId || '';
            
            console.log('🔍 [handleCreateQuote] Looking for quotes created by user:', currentUserId);
            console.log('🔍 [handleCreateQuote] Total quotes found:', allQuotes.length);
            
            if (!currentUserId) {
              throw new Error('Current user ID not available');
            }
            
            // Find quotes created by the current user within the last 5 minutes (increased time window for reliability)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const recentQuotes = allQuotes
              .filter(quote => {
                const createdTime = new Date(quote.createdAt);
                const isRecent = createdTime > fiveMinutesAgo;
                const isCreatedByUser = quote.createdBy === currentUserId;
                
                console.log(`🔍 [handleCreateQuote] Quote ${quote.id}: createdBy=${quote.createdBy}, createdAt=${quote.createdAt}, isRecent=${isRecent}, isCreatedByUser=${isCreatedByUser}`);
                
                return isRecent && isCreatedByUser;
              })
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            console.log('🔍 [handleCreateQuote] Recent quotes by current user:', recentQuotes.length);
            
            if (recentQuotes.length > 0) {
              const newestQuote = recentQuotes[0];
              console.log('🔍 [handleCreateQuote] Newest quote found:', newestQuote.id, newestQuote.quoteName);
              
              // Check if this quote is already associated with the contact
              const currentQuoteIds = contact.relatedQuoteIds || [];
              if (!currentQuoteIds.includes(newestQuote.id)) {
                console.log('🔍 [handleCreateQuote] Adding quote to contact:', newestQuote.id);
                
                // Update the contact to include this quote in relatedQuoteIds
                const updatedQuoteIds = [...currentQuoteIds, newestQuote.id];
                const updatedContact = await contactsApi.update(contact.id, {
                  relatedQuoteIds: updatedQuoteIds
                });
                
                console.log('🔍 [handleCreateQuote] Contact updated successfully:', updatedContact?.id);
                
                if (updatedContact && onContactUpdate) {
                  onContactUpdate(updatedContact);
                }
                
                // Refresh quotes to show the new quote immediately
                await refreshQuotes();
                
                addToast({
                  type: 'success',
                  title: 'Quote Created',
                  message: 'New quote has been created successfully and associated with this contact.'
                });
              } else {
                console.log('🔍 [handleCreateQuote] Quote already associated with contact');
                // Refresh quotes to show the new quote immediately
                await refreshQuotes();
                
                addToast({
                  type: 'success',
                  title: 'Quote Created',
                  message: 'New quote has been created successfully and is already associated with this contact.'
                });
              }
            } else {
              console.log('🔍 [handleCreateQuote] No recent quotes found by current user');
              // Instead of throwing an error, just refresh and show a success message
              // The quote might have been created but not found due to timing
              await refreshQuotes();
              
              addToast({
                type: 'success',
                title: 'Quote Created',
                message: 'New quote has been created successfully. Please check the quotes section.'
              });
            }
          } catch (error) {
            console.error('🔍 [handleCreateQuote] Error:', error);
            // Refresh quotes anyway to show any newly created quotes
            await refreshQuotes();
            
            // Only show warning if it's a real error, not just "no quotes found"
            if (error instanceof Error && error.message !== 'No recent quotes found to associate with contact') {
              addToast({
                type: 'warning',
                title: 'Warning',
                message: 'Quote created but relationship with contact could not be established. Please manually associate the quote.'
              });
            } else {
              addToast({
                type: 'success',
                title: 'Quote Created',
                message: 'New quote has been created successfully. Please check the quotes section.'
              });
            }
          } finally {
            setLoadingQuotes(false);
          }
        }}
        prefillData={{
          relatedRecordType: 'contact',
          relatedRecordId: contact?.id,
          contactLeadType: 'contact',
          contactLeadId: contact?.id,
          currentContact: {
            id: contact?.id,
            firstName: contact?.firstName,
            lastName: contact?.lastName
          }
        }}
        key={`create-quote-modal-${contact?.id}`}
      />

      {/* Add Deal Modal */}
      <AddNewModal
        isOpen={isAddDealModalOpen}
        onClose={() => setIsAddDealModalOpen(false)}
        defaultType="deal"
        onSuccess={async () => {
          setIsAddDealModalOpen(false);
          
          try {
            console.log('🔍 [handleCreateDeal] Deal created successfully, establishing bidirectional relationship...');
            
            // Show loading state
            setLoadingDeals(true);
            
            // Wait a bit for the deal to be fully created in the database
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get all deals and find the most recent one created by the current user
            const allDeals = await dealsApi.getAll();
            const currentUserId = user?.userId || '';
            
            console.log('🔍 [handleCreateDeal] Looking for deals created by user:', currentUserId);
            console.log('🔍 [handleCreateDeal] Total deals found:', allDeals.length);
            
            if (!currentUserId) {
              throw new Error('Current user ID not available');
            }
            
            // Find deals created by the current user within the last 5 minutes (increased time window for reliability)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const recentDeals = allDeals
              .filter(deal => {
                const createdTime = new Date(deal.createdAt);
                const isRecent = createdTime > fiveMinutesAgo;
                const isCreatedByUser = deal.createdBy === currentUserId;
                
                console.log(`🔍 [handleCreateDeal] Deal ${deal.id}: createdBy=${deal.createdBy}, createdAt=${deal.createdAt}, isRecent=${isRecent}, isCreatedByUser=${isCreatedByUser}`);
                
                return isRecent && isCreatedByUser;
              })
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            console.log('🔍 [handleCreateDeal] Recent deals by current user:', recentDeals.length);
            
            if (recentDeals.length > 0) {
              const newestDeal = recentDeals[0];
              console.log('🔍 [handleCreateDeal] Newest deal found:', newestDeal.id, newestDeal.dealName);
              
              // Check if this deal is already associated with the contact
              const currentContactIds = newestDeal.relatedContactIds || [];
              if (!currentContactIds.includes(contact.id)) {
                console.log('🔍 [handleCreateDeal] Adding contact to deal:', contact.id);
                
                // Add the contact to the deal's relatedContactIds
                const updatedContactIds = [...currentContactIds, contact.id];
                const updatedDeal = await dealsApi.update(newestDeal.id, { 
                  relatedContactIds: updatedContactIds 
                });
                
                console.log('🔍 [handleCreateDeal] Deal updated successfully:', updatedDeal?.id);
                
                // Refresh deals to show the new deal immediately
                await refreshDeals();
                
                addToast({
                  type: 'success',
                  title: 'Deal Created',
                  message: 'New deal has been created successfully and associated with this contact.'
                });
              } else {
                console.log('🔍 [handleCreateDeal] Contact already associated with deal');
                // Refresh deals to show the new deal immediately
                await refreshDeals();
                
                addToast({
                  type: 'success',
                  title: 'Deal Created',
                  message: 'New deal has been created successfully and is already associated with this contact.'
                });
              }
            } else {
              console.log('🔍 [handleCreateDeal] No recent deals found by current user');
              // Instead of throwing an error, just refresh and show a success message
              // The deal might have been created but not found due to timing
              await refreshDeals();
              
              addToast({
                type: 'success',
                title: 'Deal Created',
                message: 'New deal has been created successfully. Please check the deals section.'
              });
            }
          } catch (error) {
            console.error('🔍 [handleCreateDeal] Error:', error);
            // Refresh deals anyway to show any newly created deals
            await refreshDeals();
            
            // Only show warning if it's a real error, not just "no deals found"
            if (error instanceof Error && error.message !== 'No recent deals found to associate with contact') {
              addToast({
                type: 'warning',
                title: 'Warning',
                message: 'Deal created but relationship with contact could not be established. Please manually associate the deal.'
              });
            } else {
              addToast({
                type: 'success',
                title: 'Deal Created',
                message: 'New deal has been created successfully. Please check the deals section.'
              });
            }
          } finally {
            setLoadingDeals(false);
          }
        }}
        prefillData={{
          // Prefill with current contact information
          contactLeadType: 'contact',
          contactLeadId: contact?.id,
          contactId: contact?.id, // This will disable contact fields in the deal form
          currentContact: {
            id: contact?.id,
            firstName: contact?.firstName,
            lastName: contact?.lastName,
            companyName: contact?.companyName,
            email: contact?.email,
            phone: contact?.phone
          },
          // Make contact fields read-only by setting them as pre-filled and disabled
          dealName: `Deal for ${contact?.firstName} ${contact?.lastName}`,
          leadSource: contact?.leadSource || 'Contact',
          // Pre-populate with contact's company information
          companyName: contact?.companyName,
          // Use the correct field names that the deal form expects
          email: contact?.email || '',
          phone: contact?.phone || '',
          // Pre-populate deal owner with current user
          dealOwner: user?.userId || '',
          // Set default stage
          stage: 'Needs Analysis'
        }}
        key={`create-deal-modal-${contact?.id}`}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && taskToDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <Icons.AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Task</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{taskToDeleteConfirm.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTaskToDeleteConfirm(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                disabled={isDeletingTask}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingTask ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Timeline Tab Component
const TimelineTab: React.FC<{ contact: Contact; getUserDisplayName: (userId: string) => string }> = ({
  contact,
  getUserDisplayName
}) => {
  // Mock timeline data - in a real app, this would come from an API
  const timelineEvents = [
    {
      id: 1,
      type: 'created',
      title: 'Contact Created',
      description: `Contact ${contact.firstName} ${contact.lastName} was created`,
      timestamp: new Date(contact.createdAt),
      user: getUserDisplayName(contact.createdBy)
    },
    {
      id: 2,
      type: 'updated',
      title: 'Contact Updated',
      description: 'Contact information was updated',
      timestamp: contact.updatedAt ? new Date(contact.updatedAt) : new Date(contact.createdAt),
      user: getUserDisplayName(contact.updatedBy || contact.createdBy)
    }
  ];

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
        </div>
        
        <div className="p-6">
          <div className="space-y-6">
            {timelineEvents.map((event, index) => (
              <div key={event.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icons.Activity className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {event.timestamp.toLocaleDateString()} {event.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  <p className="text-xs text-gray-500 mt-1">by {event.user}</p>
                </div>
              </div>
            ))}
            
            {timelineEvents.length === 0 && (
              <div className="text-center py-8">
                <Icons.Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No activity recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactTabs; 