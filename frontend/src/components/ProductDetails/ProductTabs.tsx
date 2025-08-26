import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Product, Task, tasksApi, usersApi, Lead, leadsApi, Contact, contactsApi, Deal, dealsApi } from '../../api/services';
import { productsApi } from '../../api/services';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import AddNewModal from '../Common/AddNewModal';
import EditTaskModal from '../EditTaskModal';

// Add highlight effect styles
const highlightStyles = `
  .highlight-section-title {
    animation: highlightPulse 1s ease-in-out;
  }
  
  @keyframes highlightPulse {
    0% { background-color: #fef3c7; }
    50% { background-color: #fde68a; }
    100% { background-color: transparent; }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = highlightStyles;
  document.head.appendChild(styleElement);
}

interface ProductTabsProps {
  activeTab: 'overview' | 'timeline';
  onTabChange: (tab: 'overview' | 'timeline') => void;
  product: Product;
  getUserDisplayName: (userId: string) => string;
  onProductUpdate?: (updatedProduct: Product) => void;
  onTasksUpdate?: (tasks: Task[]) => void;
  onDealsUpdate?: (deals: Deal[]) => void;
}

const ProductTabs: React.FC<ProductTabsProps> = ({
  activeTab,
  onTabChange,
  product,
  getUserDisplayName,
  onProductUpdate,
  onTasksUpdate,
  onDealsUpdate
}) => {
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [lastFetchedProductId, setLastFetchedProductId] = useState<string | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDeleteConfirm, setTaskToDeleteConfirm] = useState<Task | null>(null);
  const [relatedLeads, setRelatedLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const [relatedContacts, setRelatedContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [isCreateContactModalOpen, setIsCreateContactModalOpen] = useState(false);
  const [relatedDeals, setRelatedDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [isCreateDealModalOpen, setIsCreateDealModalOpen] = useState(false);
  
  // Note management state
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch users for the EditTaskModal
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await usersApi.getAll();
        setUsers(users);
      } catch (error) {
        console.error('Error fetching users:', error);
        // Set empty array as fallback to prevent errors
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  // Fetch tasks related to this product
  useEffect(() => {
    const fetchProductTasks = async () => {
      if (!product?.id) return;
      
      // Prevent unnecessary API calls if we already have tasks for this product
      if (lastFetchedProductId === product.id && tasks.length > 0) {
        return;
      }
      
      setLoadingTasks(true);
      try {
        const productTasks = await tasksApi.getByRelatedRecord('product', product.id);
        console.log('Product tasks fetched:', productTasks);
        setTasks(productTasks);
        setLastFetchedProductId(product.id);
        // Notify parent about tasks update
        if (onTasksUpdate) {
          onTasksUpdate(productTasks);
        }
      } catch (error) {
        console.error('Error fetching product tasks:', error);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchProductTasks();

    // Cleanup function to reset state when product changes
    return () => {
      setTasks([]);
      setLastFetchedProductId(null);
    };
  }, [product?.id]); // Removed onTasksUpdate from dependencies since it's now memoized

  const handleTaskCreated = async () => {
    // Refresh tasks after creating a new one
    if (product?.id) {
      setLastFetchedProductId(null); // Reset to force refresh
      const productTasks = await tasksApi.getByRelatedRecord('product', product.id);
      setTasks(productTasks);
      setLastFetchedProductId(product.id);
      // Notify parent about tasks update
      if (onTasksUpdate) {
        onTasksUpdate(productTasks);
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
      // Notify parent about tasks update
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
      // Soft delete - update the task with isDeleted flag
      const updatedTask = await tasksApi.update(taskToDeleteConfirm.id, { isDeleted: true });
      setTasks(prev => prev.filter(task => task.id !== taskToDeleteConfirm.id));
      // Notify parent about tasks update
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
    // Refresh tasks after editing
    if (product?.id) {
      const productTasks = await tasksApi.getByRelatedRecord('product', product.id);
      setTasks(productTasks);
      // Notify parent about tasks update
      if (onTasksUpdate) {
        onTasksUpdate(productTasks);
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
      // Notify parent about tasks update
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

  // Fetch related leads
  useEffect(() => {
    const fetchRelatedLeads = async () => {
      if (!product.relatedLeadIds || product.relatedLeadIds.length === 0) {
        setRelatedLeads([]);
        return;
      }

      setLoadingLeads(true);
      try {
        const leads = await Promise.all(
          product.relatedLeadIds.map(id => leadsApi.getById(id))
        );
        setRelatedLeads(leads.filter(Boolean) as Lead[]);
      } catch (error) {
        console.error('Error fetching related leads:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch related leads.'
        });
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchRelatedLeads();
  }, [product.relatedLeadIds]);

  // Fetch related contacts
  useEffect(() => {
    const fetchRelatedContacts = async () => {
      if (!product.relatedContactIds || product.relatedContactIds.length === 0) {
        setRelatedContacts([]);
        return;
      }

      setLoadingContacts(true);
      try {
        const contacts = await Promise.all(
          product.relatedContactIds.map(id => contactsApi.getById(id))
        );
        setRelatedContacts(contacts.filter(Boolean) as Contact[]);
      } catch (error) {
        console.error('Error fetching related contacts:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch related contacts.'
        });
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchRelatedContacts();
  }, [product.relatedContactIds]);

  // Fetch related deals
  useEffect(() => {
    const fetchRelatedDeals = async () => {
      setLoadingDeals(true);
      try {
        // First, check if we have any deals that reference this product
        const allDeals = await dealsApi.getAll();
        const dealsWithThisProduct = allDeals.filter(deal => 
          deal.relatedProductIds && deal.relatedProductIds.includes(product.id)
        );
        
        console.log('🔍 [fetchRelatedDeals] Found deals with this product:', dealsWithThisProduct.length);
        
        // If we have deals that reference this product but they're not in our relatedDealIds,
        // we need to update the product to include them
        if (dealsWithThisProduct.length > 0) {
          const currentDealIds = product.relatedDealIds || [];
          const newDealIds = dealsWithThisProduct.map(deal => deal.id);
          const allDealIds = [...new Set([...currentDealIds, ...newDealIds])];
          
          if (allDealIds.length !== currentDealIds.length) {
            console.log('🔍 [fetchRelatedDeals] Updating product with missing deal IDs:', allDealIds);
            
            // Update the product with the complete list of deal IDs
            const updatedProduct = await productsApi.update(product.id, { 
              relatedDealIds: allDealIds 
            });
            
            // Update the parent component
            if (onProductUpdate && updatedProduct) {
              onProductUpdate(updatedProduct);
            }
            
            // Set the deals for display
            setRelatedDeals(dealsWithThisProduct);
            
            // Notify parent about deals update
            if (onDealsUpdate) {
              onDealsUpdate(dealsWithThisProduct);
            }
          } else {
            // Just fetch the deals we already know about
            if (product.relatedDealIds && product.relatedDealIds.length > 0) {
              const deals = await Promise.all(
                product.relatedDealIds.map(id => dealsApi.getById(id))
              );
              const validDeals = deals.filter(Boolean) as Deal[];
              setRelatedDeals(validDeals);
              
              // Notify parent about deals update
              if (onDealsUpdate) {
                onDealsUpdate(validDeals);
              }
            } else {
              setRelatedDeals([]);
              if (onDealsUpdate) {
                onDealsUpdate([]);
              }
            }
          }
        } else {
          // No deals found with this product
          setRelatedDeals([]);
          if (onDealsUpdate) {
            onDealsUpdate([]);
          }
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
  }, [product.relatedDealIds, onDealsUpdate, product.id, onProductUpdate]);

  // Additional useEffect to refetch deals when product data changes
  useEffect(() => {
    // Only fetch if we have a product and it has related IDs
    if (product && product.relatedDealIds) {
      console.log('🔍 [useEffect] Product data changed, refetching deals');
      refreshDeals();
    }
  }, [product.relatedDealIds]);

  // Additional useEffect to refetch leads and contacts when product data changes
  useEffect(() => {
    // Only fetch if we have a product and it has related IDs
    if (product && (product?.relatedLeadIds || product?.relatedContactIds)) {
      console.log('🔍 [useEffect] Product data changed, refetching leads and contacts');
      
      // Refresh leads
      if (product?.relatedLeadIds) {
        const fetchRelatedLeads = async () => {
          try {
            const leads = await Promise.all(
              product.relatedLeadIds!.map(id => leadsApi.getById(id))
            );
            const validLeads = leads.filter(Boolean) as Lead[];
            setRelatedLeads(validLeads);
          } catch (error) {
            console.error('Error refreshing leads:', error);
          }
        };
        fetchRelatedLeads();
      }
      
      // Refresh contacts
      if (product?.relatedContactIds) {
        const fetchRelatedContacts = async () => {
          try {
            const contacts = await Promise.all(
              product.relatedContactIds!.map(id => contactsApi.getById(id))
            );
            const validContacts = contacts.filter(Boolean) as Contact[];
            setRelatedContacts(validContacts);
          } catch (error) {
            console.error('Error refreshing contacts:', error);
          }
        };
        fetchRelatedContacts();
      }
    }
  }, [product?.relatedLeadIds, product?.relatedContactIds]);

  // Helper function to refresh deals
  const refreshDeals = async () => {
    try {
      console.log('🔍 [refreshDeals] Refreshing deals...');
      
      // First, refresh the product to get the latest relatedDealIds
      const refreshedProduct = await productsApi.getById(product.id);
      if (refreshedProduct && refreshedProduct.relatedDealIds && refreshedProduct.relatedDealIds.length > 0) {
        const deals = await Promise.all(
          refreshedProduct.relatedDealIds.map(id => dealsApi.getById(id))
        );
        const validDeals = deals.filter(Boolean) as Deal[];
        setRelatedDeals(validDeals);
        
        // Notify parent about deals update
        if (onDealsUpdate) {
          onDealsUpdate(validDeals);
        }
        console.log('🔍 [refreshDeals] Deals refreshed successfully');
      } else {
        setRelatedDeals([]);
        if (onDealsUpdate) {
          onDealsUpdate([]);
        }
      }
      
      // Force a re-render by updating the loading state briefly
      setLoadingDeals(true);
      setTimeout(() => setLoadingDeals(false), 100);
    } catch (error) {
      console.error('Error refreshing deals:', error);
    }
  };

  // Helper function to refresh leads
  const refreshLeads = async () => {
    try {
      console.log('🔍 [refreshLeads] Refreshing leads...');
      
      // First, refresh the product to get the latest relatedLeadIds
      const refreshedProduct = await productsApi.getById(product.id);
      if (refreshedProduct?.relatedLeadIds && refreshedProduct.relatedLeadIds.length > 0) {
        const leads = await Promise.all(
          refreshedProduct.relatedLeadIds.map(id => leadsApi.getById(id))
        );
        const validLeads = leads.filter(Boolean) as Lead[];
        setRelatedLeads(validLeads);
        console.log('🔍 [refreshLeads] Leads refreshed successfully');
      } else {
        setRelatedLeads([]);
      }
      
      // Force a re-render by updating the loading state briefly
      setLoadingLeads(true);
      setTimeout(() => setLoadingLeads(false), 100);
    } catch (error) {
      console.error('Error refreshing leads:', error);
    }
  };

  // Helper function to refresh contacts
  const refreshContacts = async () => {
    try {
      console.log('🔍 [refreshContacts] Refreshing contacts...');
      
      // First, refresh the product to get the latest relatedContactIds
      const refreshedProduct = await productsApi.getById(product.id);
      if (refreshedProduct?.relatedContactIds && refreshedProduct.relatedContactIds.length > 0) {
        const contacts = await Promise.all(
          refreshedProduct.relatedContactIds.map(id => contactsApi.getById(id))
        );
        const validContacts = contacts.filter(Boolean) as Contact[];
        setRelatedContacts(validContacts);
        console.log('🔍 [refreshContacts] Contacts refreshed successfully');
      } else {
        setRelatedContacts([]);
      }
      
      // Force a re-render by updating the loading state briefly
      setLoadingContacts(true);
      setTimeout(() => setLoadingContacts(false), 100);
    } catch (error) {
      console.error('Error refreshing contacts:', error);
    }
  };

  const handleCreateLead = async () => {
    try {
      // Show loading state
      setLoadingLeads(true);
      
      // Wait a bit for the lead to be fully created in the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh the product data to get updated relatedLeadIds
      if (onProductUpdate) {
        const refreshedProduct = await productsApi.getById(product.id);
        if (refreshedProduct) {
          console.log('🔄 Refreshed product after lead creation:', refreshedProduct);
          console.log('🔄 Product relatedLeadIds:', refreshedProduct.relatedLeadIds);
          onProductUpdate(refreshedProduct);
        }
      }

      // Refresh leads to show the new lead immediately
      await refreshLeads();

      addToast({
        type: 'success',
        title: 'Lead Created',
        message: `New lead has been created and automatically associated with ${product.name}.`
      });

      // Close the modal
      setIsCreateLeadModalOpen(false);
    } catch (error) {
      console.error('Error creating lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create lead';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleRemoveLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to remove this lead from the product?')) {
      return;
    }

    try {
      const currentLeadIds = product.relatedLeadIds || [];
      const updatedLeadIds = currentLeadIds.filter(id => id !== leadId);

      // Update the product
      const updatedProduct = await productsApi.update(product.id, { 
        relatedLeadIds: updatedLeadIds 
      });

      // Update the lead
      const lead = await leadsApi.getById(leadId);
      if (lead) {
        const currentProductIds = lead.relatedProductIds || [];
        const updatedProductIds = currentProductIds.filter(id => id !== product.id);
        await leadsApi.update(leadId, { 
          relatedProductIds: updatedProductIds 
        });
      }

      addToast({
        type: 'success',
        title: 'Lead Removed',
        message: 'Lead has been successfully removed from the product.'
      });

      // Update the parent component
      if (onProductUpdate && updatedProduct) {
        onProductUpdate(updatedProduct);
      }

      // Refresh leads to show the updated list immediately
      refreshLeads();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove lead';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  // Contact management functions
  const handleCreateContact = async () => {
    try {
      // Show loading state
      setLoadingContacts(true);
      
      // Wait a bit for the contact to be fully created in the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh the product data to get updated relatedContactIds
      if (onProductUpdate) {
        const refreshedProduct = await productsApi.getById(product.id);
        if (refreshedProduct) {
          console.log('🔄 Refreshed product after contact creation:', refreshedProduct);
          console.log('🔄 Product relatedContactIds:', refreshedProduct.relatedContactIds);
          onProductUpdate(refreshedProduct);
        }
      }

      // Refresh contacts to show the new contact immediately
      await refreshContacts();

      addToast({
        type: 'success',
        title: 'Contact Created',
        message: `New contact has been created and automatically associated with ${product.name}.`
      });

      // Close the modal
      setIsCreateContactModalOpen(false);
    } catch (error) {
      console.error('Error creating contact:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create contact';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setLoadingContacts(false);
    }
  };

  // Deal management functions
  const handleCreateDeal = async () => {
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
        
        // Check if this deal is already associated with the product
        const currentDealIds = product.relatedDealIds || [];
        if (!currentDealIds.includes(newestDeal.id)) {
          console.log('🔍 [handleCreateDeal] Adding deal to product:', newestDeal.id);
          
          // Add the deal to the product's relatedDealIds
          const updatedDealIds = [...currentDealIds, newestDeal.id];
          const updatedProduct = await productsApi.update(product.id, { 
            relatedDealIds: updatedDealIds 
          });
          
          console.log('🔍 [handleCreateDeal] Product updated successfully:', updatedProduct?.id);
          
          // Update the parent component
          if (onProductUpdate && updatedProduct) {
            onProductUpdate(updatedProduct);
          }
          
          // Refresh deals to show the new deal immediately
          await refreshDeals();
          
          addToast({
            type: 'success',
            title: 'Deal Created',
            message: `New deal has been created successfully and associated with this product.`
          });
        } else {
          console.log('🔍 [handleCreateDeal] Deal already associated with product');
          // Refresh deals to show the new deal immediately
          await refreshDeals();
          
          addToast({
            type: 'success',
            title: 'Deal Created',
            message: `New deal has been created successfully and is already associated with this product.`
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
      
      // Close the modal
      setIsCreateDealModalOpen(false);
    } catch (error) {
      console.error('🔍 [handleCreateDeal] Error:', error);
      // Refresh deals anyway to show any newly created deals
      await refreshDeals();
      
      // Only show warning if it's a real error, not just "no deals found"
      if (error instanceof Error && error.message !== 'No recent deals found to associate with product') {
        addToast({
          type: 'warning',
          title: 'Warning',
          message: 'Deal created but relationship with product could not be established. Please manually associate the deal.'
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
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to remove this contact from the product?')) {
      return;
    }

    try {
      const currentContactIds = product.relatedContactIds || [];
      const updatedContactIds = currentContactIds.filter(id => id !== contactId);

      // Update the product
      const updatedProduct = await productsApi.update(product.id, { 
        relatedContactIds: updatedContactIds 
      });

      // Update the contact
      const contact = await contactsApi.getById(contactId);
      if (contact) {
        const currentProductIds = contact.relatedProductIds || [];
        const updatedProductIds = currentProductIds.filter(id => id !== product.id);
        await contactsApi.update(contactId, { 
          relatedProductIds: updatedProductIds 
        });
      }

      addToast({
        type: 'success',
        title: 'Contact Removed',
        message: 'Contact has been successfully removed from the product.'
      });

      // Update the parent component
      if (onProductUpdate && updatedProduct) {
        onProductUpdate(updatedProduct);
      }

      // Refresh contacts to show the updated list immediately
      refreshContacts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove contact';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  // Note management functions
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
      const existingNotes = product.notes || '';
      const updatedNotes = existingNotes 
        ? `${existingNotes}\n\n${new Date().toLocaleString()}: ${newNote}`
        : `${new Date().toLocaleString()}: ${newNote}`;

      // Update the product in the database
      const updatedProduct = await productsApi.update(product.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Added',
        message: 'Note has been successfully added to the product.'
      });
      
      setNewNote('');
      
      // Update the parent component with the new product data
      if (onProductUpdate && updatedProduct) {
        onProductUpdate(updatedProduct);
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
      const notesArray = product.notes ? product.notes.split('\n\n') : [];
      const noteParts = notesArray[noteIndex].split(': ');
      const timestamp = noteParts[0];
      
      // Update the specific note
      notesArray[noteIndex] = `${timestamp}: ${editingNoteContent}`;
      const updatedNotes = notesArray.join('\n\n');

      // Update the product in the database
      const updatedProduct = await productsApi.update(product.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Updated',
        message: 'Note has been successfully updated.'
      });
      
      setEditingNoteIndex(null);
      setEditingNoteContent('');
      
      // Update the parent component with the new product data
      if (onProductUpdate && updatedProduct) {
        onProductUpdate(updatedProduct);
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
      const notesArray = product.notes ? product.notes.split('\n\n') : [];
      
      // Remove the specific note
      notesArray.splice(noteIndex, 1);
      const updatedNotes = notesArray.join('\n\n');

      // Update the product in the database
      const updatedProduct = await productsApi.update(product.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Deleted',
        message: 'Note has been successfully deleted.'
      });
      
      // Update the parent component with the new product data
      if (onProductUpdate && updatedProduct) {
        onProductUpdate(updatedProduct);
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

  const handleRemoveDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to remove this deal from the product?')) {
      return;
    }

    try {
      console.log('🔍 [handleRemoveDeal] Removing deal:', dealId, 'from product:', product.id);
      
      const currentDealIds = product.relatedDealIds || [];
      const updatedDealIds = currentDealIds.filter(id => id !== dealId);
      
      console.log('🔍 [handleRemoveDeal] Current deal IDs:', currentDealIds);
      console.log('🔍 [handleRemoveDeal] Updated deal IDs:', updatedDealIds);

      // Update the product
      const updatedProduct = await productsApi.update(product.id, { 
        relatedDealIds: updatedDealIds 
      });
      
      console.log('🔍 [handleRemoveDeal] Product updated successfully:', updatedProduct?.id);

      // Update the deal to remove this product from its relatedProductIds
      const deal = await dealsApi.getById(dealId);
      if (deal) {
        const currentProductIds = deal.relatedProductIds || [];
        const updatedProductIds = currentProductIds.filter(id => id !== product.id);
        await dealsApi.update(dealId, { 
          relatedProductIds: updatedProductIds 
        });
        console.log('🔍 [handleRemoveDeal] Deal updated successfully:', dealId);
      }

      addToast({
        type: 'success',
        title: 'Deal Removed',
        message: 'Deal has been successfully removed from the product.'
      });

      // Update the parent component
      if (onProductUpdate && updatedProduct) {
        onProductUpdate(updatedProduct);
      }

      // Refresh deals to show the updated list immediately
      console.log('🔍 [handleRemoveDeal] Refreshing deals...');
      refreshDeals();
    } catch (error) {
      console.error('🔍 [handleRemoveDeal] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove deal';
      addToast({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

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
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Product Information */}
              <div id="section-product-information" className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h3>
                <div className="space-y-6">
                  {/* Basic Product Details */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Product Name</label>
                        <p className="text-gray-900">{product.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Product Code</label>
                        <p className="text-gray-900">{product.productCode}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Product Owner</label>
                        <p className="text-gray-900">{getUserDisplayName(product.productOwner)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Active Status</label>
                        <p className="text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.activeStatus 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.activeStatus ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Usage Unit</label>
                        <p className="text-gray-900">{product.usageUnit}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Created By</label>
                        <p className="text-gray-900">{getUserDisplayName(product.createdBy)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Information */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Pricing Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Unit Price</label>
                        <p className="text-gray-900 font-medium">${product.unitPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Tax Percentage</label>
                        <p className="text-gray-900">{product.taxPercentage}%</p>
                      </div>
                      {product.commissionRate && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Commission Rate</label>
                          <p className="text-gray-900">{product.commissionRate}%</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-600">Total Price (with Tax)</label>
                        <p className="text-gray-900 font-medium text-green-600">
                          ${(product.unitPrice * (1 + product.taxPercentage / 100)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Information */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Inventory Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Current Stock</label>
                        <p className={`font-medium ${product.quantityInStock && product.quantityInStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.quantityInStock || 0} {product.usageUnit}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Demand</label>
                        <p className="text-gray-900">{product.quantityInDemand || 0} {product.usageUnit}</p>
                      </div>
                      {product.reorderLevel && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Reorder Level</label>
                          <p className="text-gray-900">{product.reorderLevel} {product.usageUnit}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-600">On Order</label>
                        <p className="text-gray-900">{product.quantityOrdered || 0} {product.usageUnit}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Description */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
                <p className="text-gray-900">{product.description || 'No description provided'}</p>
              </div>

              {/* Notes Section */}
              <div id="section-notes" className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Notes</h3>
                </div>
                
                {product.notes ? (
                  <div className="space-y-4">
                    {product.notes.split('\n\n').map((note, index) => {
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
                                  <span>Product - {product.name}</span>
                                  <span className="text-gray-300">•</span>
                                  <div className="flex items-center space-x-1">
                                    <Icons.Clock className="w-3 h-3" />
                                    <span>{timestamp}</span>
                                    <span>by</span>
                                    <span className="font-medium">{getUserDisplayName(product.createdBy)}</span>
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
                                <span>Product - {product.name}</span>
                                <span className="text-gray-300">•</span>
                                <div className="flex items-center space-x-1">
                                  <Icons.Clock className="w-3 h-3" />
                                  <span>{timestamp}</span>
                                  <span>by</span>
                                  <span className="font-medium">{getUserDisplayName(product.createdBy)}</span>
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
                      onClick={() => setIsCreateDealModalOpen(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                    >
                      <Icons.Plus className="w-4 h-4 mr-1" />
                      Create Deal for Product
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
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Close Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Owner
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
                                    {deal.dealName}
                                  </button>
                                  <div className="text-sm text-gray-500">{deal.leadSource || '—'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                deal.stage === 'Closed Won' ? 'bg-green-100 text-green-800' :
                                deal.stage === 'Closed Lost' || deal.stage === 'Closed Lost to Competition' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {deal.stage}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                              ${(deal.amount || deal.value || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getUserDisplayName(deal.dealOwner || deal.owner || '')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
              <div id="section-open-activities" className="bg-white rounded-lg border border-gray-200 p-6">
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
              <div id="section-closed-activities" className="bg-white rounded-lg border border-gray-200 p-6">
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

              {/* Contacts Section */}
              <div id="section-contacts" className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
                  <button 
                    onClick={() => setIsCreateContactModalOpen(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                  >
                    <Icons.Plus className="w-4 h-4 mr-1" />
                    Create Contact for Product
                  </button>
                </div>
                
                {loadingContacts ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading contacts...</p>
                  </div>
                ) : relatedContacts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact Info
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {relatedContacts.map((contact) => (
                          <tr key={contact.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <Icons.User className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                  <button
                                    onClick={() => navigate(`/contacts/${contact.id}`)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                                  >
                                    {contact.firstName} {contact.lastName}
                                  </button>
                                  <div className="text-sm text-gray-500">{contact.title || '—'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {contact.companyName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{contact.email || '—'}</div>
                              <div className="text-sm text-gray-500">{contact.phone || '—'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getUserDisplayName(contact.contactOwner)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveContact(contact.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Remove Contact"
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
                    <Icons.Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No contacts associated yet</p>
                  </div>
                )}
              </div>

              {/* Leads Section */}
              <div id="section-leads" className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Leads</h3>
                  <button 
                    onClick={() => setIsCreateLeadModalOpen(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                  >
                    <Icons.Plus className="w-4 h-4 mr-1" />
                    Create Lead for Product
                  </button>
                </div>
                
                {loadingLeads ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading leads...</p>
                  </div>
                ) : relatedLeads.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lead
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {relatedLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <Icons.User className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                  <button
                                    onClick={() => navigate(`/leads/${lead.id}`)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                                  >
                                    {lead.firstName} {lead.lastName}
                                  </button>
                                  <div className="text-sm text-gray-500">{lead.title || '—'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                lead.leadStatus === 'New' ? 'bg-blue-100 text-blue-800' :
                                lead.leadStatus === 'Qualified' ? 'bg-green-100 text-green-800' :
                                lead.leadStatus === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {lead.leadStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {lead.company}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{lead.email || '—'}</div>
                              <div className="text-sm text-gray-500">{lead.phone || '—'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getUserDisplayName(lead.leadOwner)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveLead(lead.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Remove Lead"
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
                    <Icons.UserPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No leads associated yet</p>
                  </div>
                )}
              </div>

              {/* Audit Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-gray-900">{new Date(product.createdAt || '').toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created By:</span>
                    <span className="text-gray-900">{product.createdBy ? getUserDisplayName(product.createdBy) : 'Unknown User'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated:</span>
                    <span className="text-gray-900">{product.updatedAt ? new Date(product.updatedAt).toLocaleString() : 'Not updated'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated By:</span>
                    <span className="text-gray-900">{product.updatedBy ? getUserDisplayName(product.updatedBy) : 'Unknown User'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <TimelineTab product={product} getUserDisplayName={getUserDisplayName} />
        )}
      </div>

      {/* Add Task Modal */}
      <AddNewModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        defaultType="task"
        onSuccess={handleTaskCreated}
        prefillData={{
          relatedRecordType: 'product',
          relatedRecordId: product?.id
        }}
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
        userName={getUserDisplayName(product?.createdBy || '')}
        users={users}
      />

      {/* Create Lead Modal */}
      <AddNewModal
        isOpen={isCreateLeadModalOpen}
        onClose={() => setIsCreateLeadModalOpen(false)}
        defaultType="lead"
        onSuccess={handleCreateLead}
        prefillData={{
          relatedProductIds: [product.id],
          productName: product.name,
          productCode: product.productCode
        }}
      />

      {/* Create Contact Modal */}
      <AddNewModal
        isOpen={isCreateContactModalOpen}
        onClose={() => setIsCreateContactModalOpen(false)}
        defaultType="contact"
        onSuccess={handleCreateContact}
        prefillData={{
          relatedProductIds: [product.id],
          productName: product.name,
          productCode: product.productCode
        }}
      />

      {/* Create Deal Modal */}
      <AddNewModal
        isOpen={isCreateDealModalOpen}
        onClose={() => setIsCreateDealModalOpen(false)}
        defaultType="deal"
        onSuccess={handleCreateDeal}
        prefillData={{
          relatedProductIds: [product.id],
          productName: product.name,
          productCode: product.productCode
        }}
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
const TimelineTab: React.FC<{ product: Product; getUserDisplayName: (userId: string) => string }> = ({
  product,
  getUserDisplayName
}) => {
  const navigate = useNavigate();
  // Mock timeline data - in a real app, this would come from an API
  const timelineEvents = [
    {
      id: 1,
      type: 'created',
      title: 'Product Created',
      description: `Product ${product.name} was created`,
      timestamp: new Date(product.createdAt),
      user: getUserDisplayName(product.createdBy)
    },
    {
      id: 2,
      type: 'updated',
      title: 'Product Updated',
      description: 'Product information was updated',
      timestamp: product.updatedAt ? new Date(product.updatedAt) : new Date(product.createdAt),
      user: getUserDisplayName(product.updatedBy || product.createdBy)
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

export default ProductTabs; 