import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Quote, Task } from '../../types';
import { quotesApi, tasksApi, usersApi } from '../../api/services';
import { useToastStore } from '../../store/useToastStore';
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

interface QuoteTabsProps {
  activeTab: 'overview' | 'timeline';
  onTabChange: (tab: 'overview' | 'timeline') => void;
  quote: Quote;
  getUserDisplayName: (userId: string) => string;
  onQuoteUpdate?: (updatedQuote: Quote) => void;
  onTasksUpdate?: (tasks: Task[]) => void;
}

const QuoteTabs: React.FC<QuoteTabsProps> = ({
  activeTab,
  onTabChange,
  quote,
  getUserDisplayName,
  onQuoteUpdate,
  onTasksUpdate
}) => {
  // State for tasks functionality
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [lastFetchedQuoteId, setLastFetchedQuoteId] = useState<string | null>(null);
  const { addToast } = useToastStore();

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

  // Fetch tasks related to this quote
  useEffect(() => {
    const fetchQuoteTasks = async () => {
      if (!quote?.id) return;
      
      // Prevent unnecessary API calls if we already have tasks for this quote
      if (lastFetchedQuoteId === quote.id && tasks.length > 0) {
        return;
      }
      
      setLoadingTasks(true);
      try {
        const quoteTasks = await tasksApi.getByRelatedRecord('quote', quote.id);
        console.log('Quote tasks fetched:', quoteTasks);
        setTasks(quoteTasks);
        setLastFetchedQuoteId(quote.id);
        // Notify parent about tasks update
        if (onTasksUpdate) {
          onTasksUpdate(quoteTasks);
        }
      } catch (error) {
        console.error('Error fetching quote tasks:', error);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchQuoteTasks();

    // Cleanup function to reset state when quote changes
    return () => {
      setTasks([]);
      setLastFetchedQuoteId(null);
    };
  }, [quote?.id]); // Removed onTasksUpdate from dependencies since it's now memoized

  // Handle task creation success
  const handleTaskCreated = async () => {
    // Refresh tasks after creating a new one
    if (quote?.id) {
      setLastFetchedQuoteId(null); // Reset to force refresh
      const quoteTasks = await tasksApi.getByRelatedRecord('quote', quote.id);
      setTasks(quoteTasks);
      setLastFetchedQuoteId(quote.id);
      // Notify parent about tasks update
      if (onTasksUpdate) {
        onTasksUpdate(quoteTasks);
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
    setTaskToDelete(task);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    setIsDeletingTask(true);
    try {
      // Soft delete the task
      await tasksApi.update(taskToDelete.id, { isDeleted: true });
      
      // Remove from local state
      const updatedTasks = tasks.filter(task => task.id !== taskToDelete.id);
      setTasks(updatedTasks);
      
      // Notify parent about tasks update
      if (onTasksUpdate) {
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
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsEditTaskModalOpen(true);
  };

  const handleEditTaskSuccess = async () => {
    // Refresh tasks after editing
    if (quote?.id) {
      setLastFetchedQuoteId(null); // Reset to force refresh
      const quoteTasks = await tasksApi.getByRelatedRecord('quote', quote.id);
      setTasks(quoteTasks);
      setLastFetchedQuoteId(quote.id);
      // Notify parent about tasks update
      if (onTasksUpdate) {
        onTasksUpdate(quoteTasks);
      }
      addToast({
        type: 'success',
        title: 'Task Updated',
        message: 'Task has been updated successfully.'
      });
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
            quote={quote} 
            getUserDisplayName={getUserDisplayName} 
            onQuoteUpdate={onQuoteUpdate}
            tasks={tasks}
            loadingTasks={loadingTasks}
            onAddTask={() => setIsAddTaskModalOpen(true)}
            onTaskCreated={handleTaskCreated}
            onCompleteTask={handleCompleteTask}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask}
            isUpdatingTask={isUpdatingTask}
            isDeletingTask={isDeletingTask}
          />
        ) : (
          <TimelineTab quote={quote} getUserDisplayName={getUserDisplayName} />
        )}
      </div>

      {/* Add Task Modal */}
      <AddNewModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        defaultType="task"
        onSuccess={handleTaskCreated}
        prefillData={{
          relatedRecordType: 'quote',
          relatedRecordId: quote?.id
        }}
      />

      {/* Edit Task Modal */}
      {taskToEdit && (
        <EditTaskModal
          isOpen={isEditTaskModalOpen}
          onClose={() => {
            setIsEditTaskModalOpen(false);
            setTaskToEdit(null);
          }}
          task={taskToEdit}
          onSave={handleTaskUpdate}
          userName={getUserDisplayName(taskToEdit.assignee)}
          users={users}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Task</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{taskToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                disabled={isDeletingTask}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
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

// Overview Tab Component
const OverviewTab: React.FC<{ 
  quote: Quote; 
  getUserDisplayName: (userId: string) => string;
  onQuoteUpdate?: (updatedQuote: Quote) => void;
  tasks: Task[];
  loadingTasks: boolean;
  onAddTask: () => void;
  onTaskCreated: () => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  isUpdatingTask: boolean;
  isDeletingTask: boolean;
}> = ({
  quote,
  getUserDisplayName,
  onQuoteUpdate,
  tasks,
  loadingTasks,
  onAddTask,
  onTaskCreated,
  onCompleteTask,
  onDeleteTask,
  onEditTask,
  isUpdatingTask,
  isDeletingTask
}) => {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [pricingSummary, setPricingSummary] = useState({
    subtotal: 0,
    discount: 0,
    tax: 0,
    adjustment: 0,
    grandTotal: 0
  });
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter tasks by status
  const openTasks = tasks.filter(task => task.status !== 'Completed');
  const closedTasks = tasks.filter(task => task.status === 'Completed');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate pricing summary dynamically from line items
  const calculatePricingSummary = () => {
    if (!quote.lineItems || quote.lineItems.length === 0) {
      return {
        subtotal: 0,
        discount: 0,
        tax: 0,
        adjustment: quote.adjustment || 0,
        grandTotal: 0
      };
    }

    const subtotal = quote.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const discount = quote.lineItems.reduce((sum, item) => {
      const itemDiscount = ((item.amount || 0) * (item.discount || 0)) / 100;
      return sum + itemDiscount;
    }, 0);
    const tax = quote.lineItems.reduce((sum, item) => sum + (item.tax || 0), 0);
    const adjustment = quote.adjustment || 0;
    const grandTotal = subtotal - discount + tax + adjustment;

    return {
      subtotal,
      discount,
      tax,
      adjustment,
      grandTotal
    };
  };

  // Recalculate pricing summary when quote changes
  useEffect(() => {
    const newPricingSummary = calculatePricingSummary();
    setPricingSummary(newPricingSummary);
  }, [quote.lineItems, quote.adjustment]);

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
      const existingNotes = quote.notes || '';
      const updatedNotes = existingNotes 
        ? `${existingNotes}\n\n${new Date().toLocaleString()}: ${newNote}`
        : `${new Date().toLocaleString()}: ${newNote}`;

      // Update the quote in the database
      const updatedQuote = await quotesApi.update(quote.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Added',
        message: 'Note has been successfully added to the quote.'
      });
      
      setNewNote('');
      
      // Update the parent component with the new quote data
      if (onQuoteUpdate && updatedQuote) {
        onQuoteUpdate(updatedQuote);
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
      const notesArray = quote.notes ? quote.notes.split('\n\n') : [];
      const noteParts = notesArray[noteIndex].split(': ');
      const timestamp = noteParts[0];
      
      // Update the specific note
      notesArray[noteIndex] = `${timestamp}: ${editingNoteContent}`;
      const updatedNotes = notesArray.join('\n\n');

      // Update the quote in the database
      const updatedQuote = await quotesApi.update(quote.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Updated',
        message: 'Note has been successfully updated.'
      });
      
      setEditingNoteIndex(null);
      setEditingNoteContent('');
      
      // Update the parent component with the new quote data
      if (onQuoteUpdate && updatedQuote) {
        onQuoteUpdate(updatedQuote);
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
      const notesArray = quote.notes ? quote.notes.split('\n\n') : [];
      
      // Remove the specific note
      notesArray.splice(noteIndex, 1);
      const updatedNotes = notesArray.join('\n\n');

      // Update the quote in the database
      const updatedQuote = await quotesApi.update(quote.id, { notes: updatedNotes });
      
      addToast({
        type: 'success',
        title: 'Note Deleted',
        message: 'Note has been successfully deleted.'
      });
      
      // Update the parent component with the new quote data
      if (onQuoteUpdate && updatedQuote) {
        onQuoteUpdate(updatedQuote);
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

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Quote Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Information</h3>
          <div className="space-y-6">
            {/* Basic Quote Details */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Quote Number</label>
                  <p className="text-gray-900">{quote.quoteNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Quote Name</label>
                  <p className="text-gray-900">{quote.quoteName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Quote Owner</label>
                  <p className="text-gray-900">{getUserDisplayName(quote.quoteOwner)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <p className="text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      quote.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                      quote.status === 'Sent' ? 'bg-yellow-100 text-yellow-800' :
                      quote.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                      quote.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {quote.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Valid Until</label>
                  <p className="text-gray-900">{formatDate(quote.validUntil)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created By</label>
                  <p className="text-gray-900">{getUserDisplayName(quote.createdBy)}</p>
                </div>
              </div>
            </div>

            {/* Quoted Items */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Quoted Items</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S.NO
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        List Price ($)
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount ($)
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Discount %
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Discount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quote.lineItems?.map((item, index) => (
                      <tr key={item.id || index}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.productId ? (
                            <button
                              onClick={() => navigate(`/products/${item.productId}`)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                            >
                              {item.productName}
                            </button>
                          ) : (
                            <span className="text-gray-500">{item.productName}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ${item.listPrice?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ${item.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.discount?.toFixed(2) || '0.00'}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ${((item.amount * item.discount) / 100).toFixed(2) || '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="flex justify-end">
              <div className="w-80">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Pricing Summary</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sub Total:</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${pricingSummary.subtotal.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Discount:</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${pricingSummary.discount.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tax:</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${pricingSummary.tax.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Adjustment:</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${pricingSummary.adjustment.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900">Grand Total:</span>
                        <span className="text-sm font-bold text-gray-900">
                          ${pricingSummary.grandTotal.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quote Description */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
          <p className="text-gray-900">{quote.description || 'No description provided'}</p>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
          <p className="text-gray-900">{quote.terms || 'No terms specified'}</p>
        </div>

        {/* Notes Section */}
        <div id="section-notes" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Notes</h3>
          </div>
          
          {quote.notes ? (
            <div className="space-y-4">
              {quote.notes.split('\n\n').map((note, index) => {
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
                            <span>Quote - {quote.quoteName}</span>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center space-x-1">
                              <Icons.Clock className="w-3 h-3" />
                              <span>{timestamp}</span>
                              <span>by</span>
                              <span className="font-medium">{getUserDisplayName(quote.createdBy)}</span>
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
                          <span>Quote - {quote.quoteName}</span>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center space-x-1">
                            <Icons.Clock className="w-3 h-3" />
                            <span>{timestamp}</span>
                            <span>by</span>
                            <span className="font-medium">{getUserDisplayName(quote.createdBy)}</span>
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

        {/* Open Activities Section */}
        <div id="section-open-activities" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Open Activities</h3>
            <button 
              onClick={onAddTask}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Add Activity
            </button>
          </div>
          {loadingTasks ? (
            <div className="text-center py-8">
              <Icons.Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Loading activities...</p>
            </div>
          ) : openTasks.length === 0 ? (
            <div className="text-center py-8">
              <Icons.Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No open activities yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {openTasks.map((task) => (
                <div key={task.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-start justify-between">
                    {/* Task Information - Left Side */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {task.title}
                        </h4>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {task.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                      
                      {/* Auditing Information - Bottom */}
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
                    
                    {/* Action Buttons - Right Side */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => onCompleteTask(task.id)}
                        disabled={isUpdatingTask}
                        className="flex items-center space-x-1 text-green-600 hover:text-green-800 font-medium disabled:opacity-50 text-xs"
                      >
                        <Icons.CheckCircle className="w-4 h-4" />
                        {isUpdatingTask ? 'Marking...' : 'Completed'}
                      </button>
                      <button
                        onClick={() => onEditTask(task)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        <Icons.Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteTask(task)}
                        disabled={isDeletingTask}
                        className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                      >
                        <Icons.Trash2 className="w-4 h-4" />
                        {isDeletingTask ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Closed Activities Section */}
        <div id="section-closed-activities" className="bg-white rounded-lg border border-gray-200 p-6">
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
              <Icons.Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Loading activities...</p>
            </div>
          ) : closedTasks.length === 0 ? (
            <div className="text-center py-8">
              <Icons.CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No closed activities yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {closedTasks.map((task) => (
                <div key={task.id} className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-start justify-between">
                    {/* Task Information - Left Side */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {task.title}
                        </h4>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                      
                      {/* Auditing Information - Bottom */}
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
                          <span>{new Date(task.updatedAt || task.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons - Right Side */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => onEditTask(task)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        <Icons.Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteTask(task)}
                        disabled={isDeletingTask}
                        className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                      >
                        <Icons.Trash2 className="w-4 h-4" />
                        {isDeletingTask ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emails Section */}
        <div id="section-emails" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Emails</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Send Email
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
              <span className="text-gray-900">{new Date(quote.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created By:</span>
              <span className="text-gray-900">{getUserDisplayName(quote.createdBy)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Updated:</span>
              <span className="text-gray-900">{new Date(quote.updatedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Updated By:</span>
              <span className="text-gray-900">{getUserDisplayName(quote.updatedBy)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Timeline Tab Component
const TimelineTab: React.FC<{ quote: Quote; getUserDisplayName: (userId: string) => string }> = ({
  quote,
  getUserDisplayName
}) => {
  // Mock timeline data - in a real app, this would come from an API
  const timelineEvents = [
    {
      id: 1,
      type: 'created',
      title: 'Quote Created',
      description: `Quote ${quote.quoteNumber} was created`,
      timestamp: new Date(quote.createdAt),
      user: getUserDisplayName(quote.createdBy)
    },
    {
      id: 2,
      type: 'updated',
      title: 'Quote Updated',
      description: 'Quote information was updated',
      timestamp: new Date(quote.updatedAt),
      user: getUserDisplayName(quote.updatedBy)
    },
    {
      id: 3,
      type: 'sent',
      title: 'Quote Sent',
      description: `Quote was sent to ${quote.customerEmail}`,
      timestamp: new Date(quote.createdAt),
      user: getUserDisplayName(quote.createdBy)
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

export default QuoteTabs; 