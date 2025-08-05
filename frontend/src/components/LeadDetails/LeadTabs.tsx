import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Lead, leadsApi, Product, productsApi, Task, tasksApi, usersApi } from '../../api/services';
import { useToastStore } from '../../store/useToastStore';
import ProductSelectionModal from './ProductSelectionModal';
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

interface LeadTabsProps {
  activeTab: 'overview' | 'timeline';
  onTabChange: (tab: 'overview' | 'timeline') => void;
  lead: Lead;
  getUserDisplayName: (userId: string) => string;
  onLeadUpdate?: (updatedLead: Lead) => void;
  onTasksUpdate?: (tasks: Task[]) => void;
}

const LeadTabs: React.FC<LeadTabsProps> = ({
  activeTab,
  onTabChange,
  lead,
  getUserDisplayName,
  onLeadUpdate,
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
            lead={lead} 
            getUserDisplayName={getUserDisplayName}
            onLeadUpdate={onLeadUpdate}
            onTasksUpdate={onTasksUpdate}
          />
        ) : (
          <TimelineTab lead={lead} getUserDisplayName={getUserDisplayName} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ 
  lead: Lead; 
  getUserDisplayName: (userId: string) => string;
  onLeadUpdate?: (updatedLead: Lead) => void;
  onTasksUpdate?: (tasks: Task[]) => void;
}> = ({
  lead,
  getUserDisplayName,
  onLeadUpdate,
  onTasksUpdate
}) => {
  const { addToast } = useToastStore();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [lastFetchedLeadId, setLastFetchedLeadId] = useState<string | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDeleteConfirm, setTaskToDeleteConfirm] = useState<Task | null>(null);
  const navigate = useNavigate();

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
      const existingNotes = lead.notes || '';
      const updatedNotes = existingNotes 
        ? `${existingNotes}\n\n${new Date().toLocaleString()}: ${newNote}`
        : `${new Date().toLocaleString()}: ${newNote}`;

      console.log('🔍 [handleAddNote] Existing notes:', existingNotes);
      console.log('🔍 [handleAddNote] New note:', newNote);
      console.log('🔍 [handleAddNote] Updated notes:', updatedNotes);
      console.log('🔍 [handleAddNote] Sending update with notes:', { notes: updatedNotes });

      // Update the lead in the database
      const updatedLead = await leadsApi.update(lead.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Added',
        message: 'Note has been successfully added to the lead.'
      });
      
      setNewNote('');
      
      // Update the parent component with the new lead data
      if (onLeadUpdate && updatedLead) {
        onLeadUpdate(updatedLead);
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
      const notesArray = lead.notes ? lead.notes.split('\n\n') : [];
      const noteParts = notesArray[noteIndex].split(': ');
      const timestamp = noteParts[0];
      
      // Update the specific note
      notesArray[noteIndex] = `${timestamp}: ${editingNoteContent}`;
      const updatedNotes = notesArray.join('\n\n');

      // Update the lead in the database
      const updatedLead = await leadsApi.update(lead.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Updated',
        message: 'Note has been successfully updated.'
      });
      
      setEditingNoteIndex(null);
      setEditingNoteContent('');
      
      // Update the parent component with the new lead data
      if (onLeadUpdate && updatedLead) {
        onLeadUpdate(updatedLead);
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
      const notesArray = lead.notes ? lead.notes.split('\n\n') : [];
      
      // Remove the specific note
      notesArray.splice(noteIndex, 1);
      const updatedNotes = notesArray.join('\n\n');

      // Update the lead in the database
      const updatedLead = await leadsApi.update(lead.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Deleted',
        message: 'Note has been successfully deleted.'
      });
      
      // Update the parent component with the new lead data
      if (onLeadUpdate && updatedLead) {
        onLeadUpdate(updatedLead);
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
        // Set empty array as fallback to prevent errors
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  // Fetch tasks related to this lead
  useEffect(() => {
    const fetchLeadTasks = async () => {
      if (!lead?.id) return;
      
      // Prevent unnecessary API calls if we already have tasks for this lead
      if (lastFetchedLeadId === lead.id && tasks.length > 0) {
        return;
      }
      
      setLoadingTasks(true);
      try {
        // For leads, we need to fetch tasks where contactLeadType = 'lead' and contactLeadId = lead.id
        console.log('Fetching tasks for lead:', lead.id);
        
        // Get all tasks and filter for this lead
        const allTasks = await tasksApi.getAll();
        console.log('All tasks fetched:', allTasks);
        
        // Filter tasks for this lead
        const leadTasks = allTasks.filter(task => 
          task.contactLeadType === 'lead' && task.contactLeadId === lead.id
        );
        
        console.log('Filtered lead tasks:', leadTasks);
        setTasks(leadTasks);
        setLastFetchedLeadId(lead.id);
        // Notify parent about tasks update
        if (onTasksUpdate) {
          onTasksUpdate(leadTasks);
        }
      } catch (error) {
        console.error('Error fetching lead tasks:', error);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchLeadTasks();

    // Cleanup function to reset state when lead changes
    return () => {
      setTasks([]);
      setLastFetchedLeadId(null);
    };
  }, [lead?.id]); // Removed onTasksUpdate from dependencies since it's now memoized

  // Fetch related products
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!lead.relatedProductIds || lead.relatedProductIds.length === 0) {
        setRelatedProducts([]);
        return;
      }

      setLoadingProducts(true);
      try {
        const products = await Promise.all(
          lead.relatedProductIds.map(id => productsApi.getById(id))
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
  }, [lead.relatedProductIds]);

  const handleAddProduct = async (productId: string) => {
    try {
      const currentProductIds = lead.relatedProductIds || [];
      const updatedProductIds = [...currentProductIds, productId];

      // Update the lead with the new product
      const updatedLead = await leadsApi.update(lead.id, { 
        relatedProductIds: updatedProductIds 
      });

      // Update the product with the new lead
      const product = await productsApi.getById(productId);
      if (product) {
        const currentLeadIds = product.relatedLeadIds || [];
        const updatedLeadIds = [...currentLeadIds, lead.id];
        await productsApi.update(productId, { 
          relatedLeadIds: updatedLeadIds 
        });
      }

      addToast({
        type: 'success',
        title: 'Product Added',
        message: 'Product has been successfully added to the lead.'
      });

      // Update the parent component
      if (onLeadUpdate && updatedLead) {
        onLeadUpdate(updatedLead);
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
    if (!confirm('Are you sure you want to remove this product from the lead?')) {
      return;
    }

    try {
      const currentProductIds = lead.relatedProductIds || [];
      const updatedProductIds = currentProductIds.filter(id => id !== productId);

      // Update the lead
      const updatedLead = await leadsApi.update(lead.id, { 
        relatedProductIds: updatedProductIds 
      });

      // Update the product
      const product = await productsApi.getById(productId);
      if (product) {
        const currentLeadIds = product.relatedLeadIds || [];
        const updatedLeadIds = currentLeadIds.filter(id => id !== lead.id);
        await productsApi.update(productId, { 
          relatedLeadIds: updatedLeadIds 
        });
      }

      addToast({
        type: 'success',
        title: 'Product Removed',
        message: 'Product has been successfully removed from the lead.'
      });

      // Update the parent component
      if (onLeadUpdate && updatedLead) {
        onLeadUpdate(updatedLead);
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

  const handleTaskCreated = async () => {
    // Refresh tasks after creating a new one
    if (lead?.id) {
      setLastFetchedLeadId(null); // Reset to force refresh
      
      // Get all tasks and filter for this lead
      const allTasks = await tasksApi.getAll();
      const leadTasks = allTasks.filter(task => 
        task.contactLeadType === 'lead' && task.contactLeadId === lead.id
      );
      
      setTasks(leadTasks);
      setLastFetchedLeadId(lead.id);
      // Notify parent about tasks update
      if (onTasksUpdate) {
        onTasksUpdate(leadTasks);
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
    if (lead?.id) {
      // Get all tasks and filter for this lead
      const allTasks = await tasksApi.getAll();
      const leadTasks = allTasks.filter(task => 
        task.contactLeadType === 'lead' && task.contactLeadId === lead.id
      );
      
      setTasks(leadTasks);
      // Notify parent about tasks update
      if (onTasksUpdate) {
        onTasksUpdate(leadTasks);
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

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Lead Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Lead Owner</label>
                <p className="text-gray-900">{getUserDisplayName(lead.leadOwner)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Title</label>
                <p className="text-gray-900">{lead.title || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-gray-900">{lead.phone || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Lead Source</label>
                <p className="text-gray-900">{lead.leadSource || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Company</label>
                <p className="text-gray-900">{lead.company}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Lead Name</label>
                <p className="text-gray-900">{lead.firstName} {lead.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900">{lead.email || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Lead Status</label>
                <p className="text-gray-900">{lead.leadStatus}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
          {(lead.street || lead.city || lead.state || lead.country) ? (
            <div className="space-y-2">
              {lead.street && <p className="text-gray-900">{lead.street}</p>}
              {lead.area && <p className="text-gray-900">{lead.area}</p>}
              <p className="text-gray-900">
                {[lead.city, lead.state, lead.zipCode].filter(Boolean).join(', ')}
              </p>
              {lead.country && <p className="text-gray-900">{lead.country}</p>}
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
          
          {lead.notes ? (
            <div className="space-y-4">
              {lead.notes.split('\n\n').map((note, index) => {
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
                            <span>Lead - {lead.firstName} {lead.lastName}</span>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center space-x-1">
                              <Icons.Clock className="w-3 h-3" />
                              <span>{timestamp}</span>
                              <span>by</span>
                              <span className="font-medium">{getUserDisplayName(lead.createdBy)}</span>
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
                          <span>Lead - {lead.firstName} {lead.lastName}</span>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center space-x-1">
                            <Icons.Clock className="w-3 h-3" />
                            <span>{timestamp}</span>
                            <span>by</span>
                            <span className="font-medium">{getUserDisplayName(lead.createdBy)}</span>
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

        {/* Open Activities Section */}
        <div id="section-openActivities" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
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
                        <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
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
              <p className="text-sm text-gray-500">No open activities yet</p>
            </div>
          )}
        </div>

        {/* Closed Activities Section */}
        <div id="section-closedActivities" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Closed Activities</h3>
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
                        <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
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
              <p className="text-sm text-gray-500">No closed activities yet</p>
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
              <span className="text-gray-900">{new Date(lead.createdAt || '').toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created By:</span>
              <span className="text-gray-900">{lead.createdBy ? getUserDisplayName(lead.createdBy) : 'Unknown User'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Updated:</span>
              <span className="text-gray-900">{lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : 'Not updated'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Updated By:</span>
              <span className="text-gray-900">{lead.updatedBy ? getUserDisplayName(lead.updatedBy) : 'Unknown User'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection Modal */}
      <ProductSelectionModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onProductSelect={handleAddProduct}
        existingProductIds={lead.relatedProductIds || []}
      />

      {/* Add Task Modal */}
      <AddNewModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        defaultType="task"
        onSuccess={handleTaskCreated}
        prefillData={{
          relatedRecordType: 'lead',
          relatedRecordId: lead?.id,
          contactLeadType: 'lead',
          contactLeadId: lead?.id,
          // Pass the current lead data to ensure it's available in the dropdown
          currentLead: {
            id: lead?.id,
            firstName: lead?.firstName,
            lastName: lead?.lastName
          }
        }}
        key={`task-modal-${lead?.id}`} // Force re-render when lead changes
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
        userName={getUserDisplayName(lead?.createdBy || '')}
        users={users}
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
const TimelineTab: React.FC<{ lead: Lead; getUserDisplayName: (userId: string) => string }> = ({
  lead,
  getUserDisplayName
}) => {
  // Mock timeline data - in a real app, this would come from an API
  const timelineEvents = [
    {
      id: 1,
      type: 'created',
      title: 'Lead Created',
      description: `Lead ${lead.firstName} ${lead.lastName} was created`,
      timestamp: new Date(lead.createdAt),
      user: getUserDisplayName(lead.createdBy)
    },
    {
      id: 2,
      type: 'updated',
      title: 'Lead Updated',
      description: 'Lead information was updated',
      timestamp: lead.updatedAt ? new Date(lead.updatedAt) : new Date(lead.createdAt),
      user: getUserDisplayName(lead.updatedBy || lead.createdBy)
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

export default LeadTabs; 