import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Deal, dealsApi, Product, productsApi, Task, tasksApi, usersApi, Quote, quotesApi, Contact, contactsApi } from '../../api/services';
import { useToastStore } from '../../store/useToastStore';
import AddNewModal from '../Common/AddNewModal';
import EditTaskModal from '../EditTaskModal';
import ProductSelectionModal from '../ContactDetails/ProductSelectionModal';
import QuoteSelectionModal from '../ContactDetails/QuoteSelectionModal';
import ContactSelectionModal from './ContactSelectionModal';
import API from '../../api/client';

interface DealTabsProps {
  activeTab: 'overview' | 'timeline';
  onTabChange: (tab: 'overview' | 'timeline') => void;
  deal: Deal;
  getUserDisplayName: (userId: string) => string;
  onDealUpdate?: (updatedDeal: Deal) => void;
  onTasksUpdate?: (tasks: Task[]) => void;
}

const DealTabs: React.FC<DealTabsProps> = ({
  activeTab,
  onTabChange,
  deal,
  getUserDisplayName,
  onDealUpdate,
  onTasksUpdate
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
            deal={deal} 
            getUserDisplayName={getUserDisplayName}
            onDealUpdate={onDealUpdate}
            onTasksUpdate={onTasksUpdate}
          />
        ) : (
          <TimelineTab deal={deal} getUserDisplayName={getUserDisplayName} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ 
  deal: Deal; 
  getUserDisplayName: (userId: string) => string;
  onDealUpdate?: (updatedDeal: Deal) => void;
  onTasksUpdate?: (tasks: Task[]) => void;
}> = ({
  deal,
  getUserDisplayName,
  onDealUpdate,
  onTasksUpdate
}) => {
  const { addToast } = useToastStore();
  const navigate = useNavigate();
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
  const [lastFetchedDealId, setLastFetchedDealId] = useState<string | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [relatedQuotes, setRelatedQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddQuoteModalOpen, setIsAddQuoteModalOpen] = useState(false);
  const [relatedContacts, setRelatedContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; firstName?: string; lastName?: string; name?: string }[]>([]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setIsSubmitting(true);
      const currentNotes = deal.notes || '';
      const updatedNotes = currentNotes ? `${currentNotes}\n\n${newNote}` : newNote;
      
      const updatedDeal = await dealsApi.update(deal.id, { notes: updatedNotes });
      
      if (onDealUpdate) {
        onDealUpdate(updatedDeal);
      }
      
      setNewNote('');
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Note added successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add note'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNote = async (noteIndex: number) => {
    if (!editingNoteContent.trim()) return;

    try {
      setIsSubmitting(true);
      const notes = deal.notes ? deal.notes.split('\n\n') : [];
      notes[noteIndex] = editingNoteContent;
      const updatedNotes = notes.join('\n\n');
      
      const updatedDeal = await dealsApi.update(deal.id, { notes: updatedNotes });
      
      if (onDealUpdate) {
        onDealUpdate(updatedDeal);
      }
      
      setEditingNoteIndex(null);
      setEditingNoteContent('');
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Note updated successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update note'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteIndex: number) => {
    try {
      setIsDeleting(true);
      const notes = deal.notes ? deal.notes.split('\n\n') : [];
      notes.splice(noteIndex, 1);
      const updatedNotes = notes.join('\n\n');
      
      const updatedDeal = await dealsApi.update(deal.id, { notes: updatedNotes });
      
      if (onDealUpdate) {
        onDealUpdate(updatedDeal);
      }
      
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Note deleted successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete note'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch related data when deal changes
  useEffect(() => {
    if (deal.id !== lastFetchedDealId) {
      setLastFetchedDealId(deal.id);
      
      const fetchUsers = async () => {
        try {
          const response = await API.get('/users/tenant-users');
          const data = response.data?.data || [];
          setUsers(data);
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      };

      const fetchDealTasks = async () => {
        try {
          setLoadingTasks(true);
          const allTasks = await tasksApi.getAll();
          
          // Get tasks directly related to this deal
          const dealTasks = allTasks.filter(task => 
            task.relatedRecordId === deal.id && task.relatedRecordType === 'deal'
          );
          
          // Get tasks related to contacts associated with this deal
          let contactTasks: Task[] = [];
          if (deal.relatedContactIds && deal.relatedContactIds.length > 0) {
            contactTasks = allTasks.filter(task => 
              task.contactLeadType === 'contact' && 
              deal.relatedContactIds!.includes(task.contactLeadId!)
            );
          }
          
          // Combine and deduplicate tasks (in case a task is associated with both deal and contact)
          const combinedTasks = [...dealTasks, ...contactTasks];
          const uniqueTasks = combinedTasks.filter((task, index, self) => 
            index === self.findIndex(t => t.id === task.id)
          );
          
          setTasks(uniqueTasks);
          if (onTasksUpdate) {
            onTasksUpdate(uniqueTasks);
          }
        } catch (error) {
          console.error('Error fetching deal tasks:', error);
        } finally {
          setLoadingTasks(false);
        }
      };

      const fetchRelatedProducts = async () => {
        try {
          setLoadingProducts(true);
          if (deal.relatedProductIds && deal.relatedProductIds.length > 0) {
            const products = await Promise.all(
              deal.relatedProductIds.map(async (productId) => {
                try {
                  return await productsApi.getById(productId);
                } catch (error) {
                  console.error(`Error fetching product ${productId}:`, error);
                  return null;
                }
              })
            );
            setRelatedProducts(products.filter(Boolean) as Product[]);
          } else {
            setRelatedProducts([]);
          }
        } catch (error) {
          console.error('Error fetching related products:', error);
        } finally {
          setLoadingProducts(false);
        }
      };

      const fetchRelatedQuotes = async () => {
        try {
          setLoadingQuotes(true);
          if (deal.relatedQuoteIds && deal.relatedQuoteIds.length > 0) {
            const quotes = await Promise.all(
              deal.relatedQuoteIds.map(async (quoteId) => {
                try {
                  return await quotesApi.getById(quoteId);
                } catch (error) {
                  console.error(`Error fetching quote ${quoteId}:`, error);
                  return null;
                }
              })
            );
            setRelatedQuotes(quotes.filter(Boolean) as Quote[]);
          } else {
            setRelatedQuotes([]);
          }
        } catch (error) {
          console.error('Error fetching related quotes:', error);
        } finally {
          setLoadingQuotes(false);
        }
      };

      const fetchRelatedContacts = async () => {
        try {
          setLoadingContacts(true);
          if (deal.relatedContactIds && deal.relatedContactIds.length > 0) {
            const contacts = await Promise.all(
              deal.relatedContactIds.map(async (contactId) => {
                try {
                  return await contactsApi.getById(contactId);
                } catch (error) {
                  console.error(`Error fetching contact ${contactId}:`, error);
                  return null;
                }
              })
            );
            setRelatedContacts(contacts.filter(Boolean) as Contact[]);
          } else {
            setRelatedContacts([]);
          }
        } catch (error) {
          console.error('Error fetching related contacts:', error);
        } finally {
          setLoadingContacts(false);
        }
      };

      fetchUsers();
      fetchDealTasks();
      fetchRelatedProducts();
      fetchRelatedQuotes();
      fetchRelatedContacts();
    }
  }, [deal.id, lastFetchedDealId, onTasksUpdate]);

  // Additional useEffect to refetch related data when deal data changes
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        console.log('🔍 [fetchRelatedProducts] Starting with deal.relatedProductIds:', deal.relatedProductIds);
        setLoadingProducts(true);
        if (deal.relatedProductIds && deal.relatedProductIds.length > 0) {
          const products = await Promise.all(
            deal.relatedProductIds.map(async (productId) => {
              try {
                console.log('🔍 [fetchRelatedProducts] Fetching product:', productId);
                return await productsApi.getById(productId);
              } catch (error) {
                console.error(`Error fetching product ${productId}:`, error);
                return null;
              }
            })
          );
          const filteredProducts = products.filter(Boolean) as Product[];
          console.log('🔍 [fetchRelatedProducts] Fetched products:', filteredProducts);
          setRelatedProducts(filteredProducts);
        } else {
          console.log('🔍 [fetchRelatedProducts] No related product IDs, setting empty array');
          setRelatedProducts([]);
        }
      } catch (error) {
        console.error('Error fetching related products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    const fetchRelatedQuotes = async () => {
      try {
        console.log('🔍 [fetchRelatedQuotes] Starting with deal.relatedQuoteIds:', deal.relatedQuoteIds);
        setLoadingQuotes(true);
        if (deal.relatedQuoteIds && deal.relatedQuoteIds.length > 0) {
          const quotes = await Promise.all(
            deal.relatedQuoteIds.map(async (quoteId) => {
              try {
                console.log('🔍 [fetchRelatedQuotes] Fetching quote:', quoteId);
                return await quotesApi.getById(quoteId);
              } catch (error) {
                console.error(`Error fetching quote ${quoteId}:`, error);
                return null;
              }
            })
          );
          const filteredQuotes = quotes.filter(Boolean) as Quote[];
          console.log('🔍 [fetchRelatedQuotes] Fetched quotes:', filteredQuotes);
          setRelatedQuotes(filteredQuotes);
        } else {
          console.log('🔍 [fetchRelatedQuotes] No related quote IDs, setting empty array');
          setRelatedQuotes([]);
        }
      } catch (error) {
        console.error('Error fetching related quotes:', error);
      } finally {
        setLoadingQuotes(false);
      }
    };

    // Only fetch if we have a deal and it has related IDs
    if (deal && (deal.relatedProductIds || deal.relatedQuoteIds)) {
      console.log('🔍 [useEffect] Deal data changed, refetching related data');
      fetchRelatedProducts();
      fetchRelatedQuotes();
    }
  }, [deal.relatedProductIds, deal.relatedQuoteIds]);

  const handleTaskCreated = async () => {
    try {
      const allTasks = await tasksApi.getAll();
      const dealTasks = allTasks.filter(task => 
        task.relatedRecordId === deal.id && task.relatedRecordType === 'deal'
      );
      setTasks(dealTasks);
      if (onTasksUpdate) {
        onTasksUpdate(dealTasks);
      }
      setIsAddTaskModalOpen(false);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Task created successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create task'
      });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setIsUpdatingTask(true);
      const updatedTask = await tasksApi.update(taskId, { status: 'Completed' });
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ));
      if (onTasksUpdate) {
        onTasksUpdate(tasks.map(task => 
          task.id === taskId ? updatedTask : task
        ));
      }
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Task completed successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to complete task'
      });
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const handleDeleteTask = (task: Task) => {
    setSelectedTask(task);
    setTaskToDelete(task.id);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      setIsDeletingTask(true);
      await tasksApi.delete(taskToDelete);
      setTasks(prev => prev.filter(task => task.id !== taskToDelete));
      if (onTasksUpdate) {
        onTasksUpdate(tasks.filter(task => task.id !== taskToDelete));
      }
      setTaskToDelete(null);
      setSelectedTask(null);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Task deleted successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete task'
      });
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsEditTaskModalOpen(true);
  };

  const handleEditTaskSuccess = async () => {
    try {
      const allTasks = await tasksApi.getAll();
      const dealTasks = allTasks.filter(task => 
        task.relatedRecordId === deal.id && task.relatedRecordType === 'deal'
      );
      setTasks(dealTasks);
      if (onTasksUpdate) {
        onTasksUpdate(dealTasks);
      }
      setIsEditTaskModalOpen(false);
      setSelectedTask(null);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Task updated successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task'
      });
    }
  };

  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!selectedTask) return;

    try {
      setIsUpdatingTask(true);
      const updatedTask = await tasksApi.update(selectedTask.id, updates);
      setTasks(prev => prev.map(task => 
        task.id === selectedTask.id ? updatedTask : task
      ));
      if (onTasksUpdate) {
        onTasksUpdate(tasks.map(task => 
          task.id === selectedTask.id ? updatedTask : task
        ));
      }
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Task updated successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task'
      });
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const handleAddProduct = async (productId: string) => {
    try {
      console.log('🔍 [handleAddProduct] Starting with productId:', productId);
      console.log('🔍 [handleAddProduct] Current deal:', deal);
      
      const currentProductIds = deal.relatedProductIds || [];
      const updatedProductIds = [...currentProductIds, productId];
      
      console.log('🔍 [handleAddProduct] Current product IDs:', currentProductIds);
      console.log('🔍 [handleAddProduct] Updated product IDs:', updatedProductIds);
      
      const updateData = { relatedProductIds: updatedProductIds };
      console.log('🔍 [handleAddProduct] Sending update data:', updateData);
      
      const updatedDeal = await dealsApi.update(deal.id, updateData);
      
      console.log('🔍 [handleAddProduct] Response from backend:', updatedDeal);
      
      if (onDealUpdate) {
        onDealUpdate(updatedDeal);
      }
      
      setIsAddProductModalOpen(false);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Product added successfully'
      });
    } catch (error) {
      console.error('🔍 [handleAddProduct] Error:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add product'
      });
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    try {
      const currentProductIds = deal.relatedProductIds || [];
      const updatedProductIds = currentProductIds.filter(id => id !== productId);
      
      const updatedDeal = await dealsApi.update(deal.id, { 
        relatedProductIds: updatedProductIds 
      });
      
      if (onDealUpdate) {
        onDealUpdate(updatedDeal);
      }
      
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Product removed successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove product'
      });
    }
  };

  const handleAddQuote = async (quoteId: string) => {
    try {
      console.log('🔍 [handleAddQuote] Starting with quoteId:', quoteId);
      console.log('🔍 [handleAddQuote] Current deal:', deal);
      
      const currentQuoteIds = deal.relatedQuoteIds || [];
      const updatedQuoteIds = [...currentQuoteIds, quoteId];
      
      console.log('🔍 [handleAddQuote] Current quote IDs:', currentQuoteIds);
      console.log('🔍 [handleAddQuote] Updated quote IDs:', updatedQuoteIds);
      
      const updateData = { relatedQuoteIds: updatedQuoteIds };
      console.log('🔍 [handleAddQuote] Sending update data:', updateData);
      
      const updatedDeal = await dealsApi.update(deal.id, updateData);
      
      console.log('🔍 [handleAddQuote] Response from backend:', updatedDeal);
      
      if (onDealUpdate) {
        onDealUpdate(updatedDeal);
      }
      
      setIsAddQuoteModalOpen(false);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Quote added successfully'
      });
    } catch (error) {
      console.error('🔍 [handleAddQuote] Error:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add quote'
      });
    }
  };

  const handleRemoveQuote = async (quoteId: string) => {
    try {
      const currentQuoteIds = deal.relatedQuoteIds || [];
      const updatedQuoteIds = currentQuoteIds.filter(id => id !== quoteId);
      
      const updatedDeal = await dealsApi.update(deal.id, { 
        relatedQuoteIds: updatedQuoteIds 
      });
      
      if (onDealUpdate) {
        onDealUpdate(updatedDeal);
      }
      
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Quote removed successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove quote'
      });
    }
  };

  const handleAddContact = async (contactId: string) => {
    try {
      const currentContactIds = deal.relatedContactIds || [];
      const updatedContactIds = [...currentContactIds, contactId];
      
      const updatedDeal = await dealsApi.update(deal.id, { 
        relatedContactIds: updatedContactIds 
      });
      
      if (onDealUpdate) {
        onDealUpdate(updatedDeal);
      }
      
      setIsAddContactModalOpen(false);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Contact added successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add contact'
      });
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    try {
      const currentContactIds = deal.relatedContactIds || [];
      const updatedContactIds = currentContactIds.filter(id => id !== contactId);
      
      const updatedDeal = await dealsApi.update(deal.id, { 
        relatedContactIds: updatedContactIds 
      });
      
      if (onDealUpdate) {
        onDealUpdate(updatedDeal);
      }
      
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Contact removed successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove contact'
      });
    }
  };

  const handleContactClick = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Normal':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      case 'Deferred':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Deal Information */}
      <div id="section-dealInfo" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name</label>
            <p className="text-gray-900">{deal.dealName || deal.name || 'Untitled Deal'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
            <p className="text-gray-900">{getUserDisplayName(deal.dealOwner || deal.owner || '')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <p className="text-gray-900">{deal.stage}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <p className="text-gray-900">{formatCurrency(deal.amount || deal.value || 0)}</p>
          </div>
          {deal.probability && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probability</label>
              <p className="text-gray-900">{deal.probability}%</p>
            </div>
          )}
          {deal.closeDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Close Date</label>
              <p className="text-gray-900">{new Date(deal.closeDate).toLocaleDateString()}</p>
            </div>
          )}
          {deal.leadSource && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <p className="text-gray-900">{deal.leadSource}</p>
            </div>
          )}
          {deal.description && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <p className="text-gray-900">{deal.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div id="section-notes" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Notes</h3>
        </div>
        
        {/* Display Notes */}
        {deal.notes && (
          <div className="space-y-4">
            {deal.notes.split('\n\n').map((note, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                {editingNoteIndex === index ? (
                  <div>
                    <textarea
                      value={editingNoteContent}
                      onChange={(e) => setEditingNoteContent(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={() => handleEditNote(index)}
                        disabled={isSubmitting || !editingNoteContent.trim()}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingNoteIndex(null);
                          setEditingNoteContent('');
                        }}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <p className="text-gray-900 flex-1">{note}</p>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingNoteIndex(index);
                          setEditingNoteContent(note);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(index)}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
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

      {/* Open Activities Section */}
      <div id="section-openActivities" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Open Activities</h3>
          <button
            onClick={() => setIsAddTaskModalOpen(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
          >
            <Icons.Plus className="w-4 h-4 mr-1" />
            Add Activity
          </button>
        </div>

        {loadingTasks ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.filter(task => task.status !== 'Completed').length === 0 ? (
          <p className="text-gray-500 text-center py-8">No open activities found</p>
        ) : (
          <div className="space-y-4">
            {tasks.filter(task => task.status !== 'Completed').map((task) => (
              <div key={task.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      <span>Type: {task.type}</span>
                      <span>Assignee: {getUserDisplayName(task.assignee)}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={isUpdatingTask}
                      className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleEditTask(task)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Closed Activities Section */}
      <div id="section-closedActivities" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Closed Activities</h3>
        </div>

        {loadingTasks ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.filter(task => task.status === 'Completed').length === 0 ? (
          <p className="text-gray-500 text-center py-8">No closed activities found</p>
        ) : (
          <div className="space-y-4">
            {tasks.filter(task => task.status === 'Completed').map((task) => (
              <div key={task.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      <span>Type: {task.type}</span>
                      <span>Assignee: {getUserDisplayName(task.assignee)}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTask(task)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products Section */}
      <div id="section-products" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
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
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : relatedProducts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No products associated with this deal</p>
        ) : (
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
                      {formatCurrency(product.unitPrice || product.price || 0)}
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
        )}
      </div>

      {/* Quotes Section */}
      <div id="section-quotes" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quotes</h3>
          <button
            onClick={() => setIsAddQuoteModalOpen(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
          >
            <Icons.Plus className="w-4 h-4 mr-1" />
            Add Quote
          </button>
        </div>

        {loadingQuotes ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : relatedQuotes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No quotes associated with this deal</p>
        ) : (
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
                      {formatCurrency(quote.totalAmount)}
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
        )}
      </div>

      {/* Contacts Section */}
      <div id="section-contacts" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
          <button
            onClick={() => setIsAddContactModalOpen(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
          >
            <Icons.Plus className="w-4 h-4 mr-1" />
            Add Contact
          </button>
        </div>

        {loadingContacts ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : relatedContacts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No contacts associated with this deal</p>
        ) : (
          <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {relatedContacts.map((contact) => (
                  <tr 
                    key={contact.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleContactClick(contact.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Icons.User className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {contact.firstName || ''} {contact.lastName || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contact.companyName || 'No company'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Icons.Mail className="h-3 w-3 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="text-sm text-gray-900 truncate">{contact.email || 'No email'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Icons.Phone className="h-3 w-3 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="text-sm text-gray-900">{contact.phone || 'No phone'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contact.title || 'No title'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveContact(contact.id);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Emails Section */}
      <div id="section-emails" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Created:</span>
            <span className="text-gray-900">{new Date(deal.createdAt || '').toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Created By:</span>
            <span className="text-gray-900">{deal.createdBy ? getUserDisplayName(deal.createdBy) : 'Unknown User'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Updated:</span>
            <span className="text-gray-900">{deal.updatedAt ? new Date(deal.updatedAt).toLocaleString() : 'Not updated'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Updated By:</span>
            <span className="text-gray-900">{deal.updatedBy ? getUserDisplayName(deal.updatedBy) : 'Unknown User'}</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddNewModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        defaultType="task"
        onSuccess={handleTaskCreated}
        prefillData={{
          relatedRecordType: 'deal',
          relatedRecordId: deal?.id,
          contactLeadType: 'contact',
          currentDeal: {
            id: deal?.id,
            dealName: deal?.dealName || deal?.name,
            stage: deal?.stage,
            amount: deal?.amount || deal?.value
          },
          // Add related contacts for task creation
          relatedContacts: relatedContacts,
          // Auto-select first contact if only one exists
          autoSelectContact: relatedContacts.length === 1 ? relatedContacts[0].id : undefined,
          // Force contact selection if contacts exist
          requireContactSelection: relatedContacts.length > 0
        }}
        key={`task-modal-${deal?.id}`}
      />

      {selectedTask && (
        <EditTaskModal
          isOpen={isEditTaskModalOpen}
          onClose={() => {
            setIsEditTaskModalOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onSave={handleTaskUpdate}
          userName={getUserDisplayName(selectedTask.assignee)}
          users={users}
        />
      )}

      <ProductSelectionModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onProductSelect={handleAddProduct}
        existingProductIds={deal.relatedProductIds || []}
      />

      <QuoteSelectionModal
        isOpen={isAddQuoteModalOpen}
        onClose={() => setIsAddQuoteModalOpen(false)}
        onQuoteSelect={handleAddQuote}
        existingQuoteIds={deal.relatedQuoteIds || []}
      />

      <ContactSelectionModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        onContactSelect={handleAddContact}
        existingContactIds={deal.relatedContactIds || []}
      />
    </div>
  );
};

// Timeline Tab Component
const TimelineTab: React.FC<{ deal: Deal; getUserDisplayName: (userId: string) => string }> = ({
  deal,
  getUserDisplayName
}) => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="w-3 h-3 bg-blue-600 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">Deal Created</h4>
                  <p className="text-sm text-gray-600">
                    Deal "{deal.dealName || deal.name}" was created by {getUserDisplayName(deal.createdBy)}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(deal.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          {deal.updatedAt && deal.updatedAt !== deal.createdAt && (
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 bg-green-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">Deal Updated</h4>
                    <p className="text-sm text-gray-600">
                      Deal was last updated by {getUserDisplayName(deal.updatedBy)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(deal.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealTabs; 