import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Task, tasksApi, contactsApi, leadsApi, dealsApi, productsApi, quotesApi } from '../../api/services';
import { useToastStore } from '../../store/useToastStore';

interface TaskTabsProps {
  activeTab: 'overview' | 'timeline';
  onTabChange: (tab: 'overview' | 'timeline') => void;
  task: Task;
  getUserDisplayName: (userId: string) => string;
  onTaskUpdate?: (updatedTask: Task) => void;
}

const TaskTabs: React.FC<TaskTabsProps> = ({
  activeTab,
  onTabChange,
  task,
  getUserDisplayName,
  onTaskUpdate
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
            task={task} 
            getUserDisplayName={getUserDisplayName}
            onTaskUpdate={onTaskUpdate}
          />
        ) : (
          <TimelineTab task={task} getUserDisplayName={getUserDisplayName} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ 
  task: Task; 
  getUserDisplayName: (userId: string) => string;
  onTaskUpdate?: (updatedTask: Task) => void;
}> = ({
  task,
  getUserDisplayName,
  onTaskUpdate
}) => {
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Related records state
  const [relatedContact, setRelatedContact] = useState<any>(null);
  const [relatedLead, setRelatedLead] = useState<any>(null);
  const [relatedDeal, setRelatedDeal] = useState<any>(null);
  const [relatedProduct, setRelatedProduct] = useState<any>(null);
  const [relatedQuote, setRelatedQuote] = useState<any>(null);
  const [loadingRelatedRecords, setLoadingRelatedRecords] = useState(false);

  // Fetch related records
  useEffect(() => {
    const fetchRelatedRecords = async () => {
      if (!task) return;
      
      setLoadingRelatedRecords(true);
      try {
        // Fetch contact/lead
        if (task.contactLeadId && task.contactLeadType) {
          if (task.contactLeadType === 'contact') {
            const contact = await contactsApi.getById(task.contactLeadId);
            setRelatedContact(contact);
          } else if (task.contactLeadType === 'lead') {
            const lead = await leadsApi.getById(task.contactLeadId);
            setRelatedLead(lead);
          }
        }

        // Fetch related record
        if (task.relatedRecordId && task.relatedRecordType) {
          switch (task.relatedRecordType) {
            case 'deal':
              const deal = await dealsApi.getById(task.relatedRecordId);
              setRelatedDeal(deal);
              break;
            case 'product':
              const product = await productsApi.getById(task.relatedRecordId);
              setRelatedProduct(product);
              break;
            case 'quote':
              const quote = await quotesApi.getById(task.relatedRecordId);
              setRelatedQuote(quote);
              break;
          }
        }
      } catch (error) {
        console.error('Error fetching related records:', error);
      } finally {
        setLoadingRelatedRecords(false);
      }
    };

    fetchRelatedRecords();
  }, [task]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setIsSubmitting(true);
      const currentNotes = task.notes || '';
      const updatedNotes = currentNotes ? `${currentNotes}\n\n${newNote}` : newNote;
      
      const updatedTask = await tasksApi.update(task.id, { notes: updatedNotes });
      
      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
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
      const notes = task.notes ? task.notes.split('\n\n') : [];
      notes[noteIndex] = editingNoteContent;
      const updatedNotes = notes.join('\n\n');
      
      const updatedTask = await tasksApi.update(task.id, { notes: updatedNotes });
      
      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
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
      const notes = task.notes ? task.notes.split('\n\n') : [];
      notes.splice(noteIndex, 1);
      const updatedNotes = notes.join('\n\n');
      
      const updatedTask = await tasksApi.update(task.id, { notes: updatedNotes });
      
      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
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

  const getRelatedRecordDisplayName = () => {
    if (relatedDeal) {
      return relatedDeal.dealName || relatedDeal.name || 'Untitled Deal';
    }
    if (relatedProduct) {
      return relatedProduct.name || 'Untitled Product';
    }
    if (relatedQuote) {
      return relatedQuote.quoteName || relatedQuote.quoteNumber || 'Untitled Quote';
    }
    return null;
  };

  const getRelatedRecordLink = () => {
    if (relatedDeal) {
      return `/deals/${task.relatedRecordId}`;
    }
    if (relatedProduct) {
      return `/products/${task.relatedRecordId}`;
    }
    if (relatedQuote) {
      return `/quotes/${task.relatedRecordId}`;
    }
    return null;
  };

  const getContactLeadDisplayName = () => {
    if (relatedContact) {
      const firstName = relatedContact.firstName || '';
      const lastName = relatedContact.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Untitled Contact';
    }
    if (relatedLead) {
      const firstName = relatedLead.firstName || '';
      const lastName = relatedLead.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Untitled Lead';
    }
    return null;
  };

  const getContactLeadLink = () => {
    if (relatedContact) {
      return `/contacts/${task.contactLeadId}`;
    }
    if (relatedLead) {
      return `/leads/${task.contactLeadId}`;
    }
    return null;
  };

  return (
    <div className="p-6 space-y-8">
      {/* Task Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <p className="text-gray-900">{task.title}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <p className="text-gray-900">{getUserDisplayName(task.assignee)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <p className="text-gray-900">{task.status}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <p className="text-gray-900">{task.priority}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <p className="text-gray-900">{task.type}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <p className="text-gray-900">{new Date(task.dueDate).toLocaleDateString()}</p>
          </div>
          {task.description && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <p className="text-gray-900">{task.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Notes</h3>
        </div>
        
        {/* Display Notes */}
        {task.notes && (
          <div className="space-y-4">
            {task.notes.split('\n\n').map((note, index) => (
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

      {/* Related Records Section */}
      {(task.contactLeadId || task.relatedRecordId) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Records</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {task.contactLeadId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact/Lead</label>
                {loadingRelatedRecords ? (
                  <div className="flex items-center space-x-2">
                    <Icons.Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-gray-500">Loading...</span>
                  </div>
                ) : getContactLeadDisplayName() ? (
                  <button
                    onClick={() => {
                      const link = getContactLeadLink();
                      if (link) navigate(link);
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center space-x-2"
                  >
                    <span>{getContactLeadDisplayName()}</span>
                    <Icons.ArrowUpRight className="w-3 h-3" />
                  </button>
                ) : (
                  <p className="text-gray-500">Record not found</p>
                )}
              </div>
            )}
            {task.relatedRecordId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Related Record</label>
                {loadingRelatedRecords ? (
                  <div className="flex items-center space-x-2">
                    <Icons.Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-gray-500">Loading...</span>
                  </div>
                ) : getRelatedRecordDisplayName() ? (
                  <button
                    onClick={() => {
                      const link = getRelatedRecordLink();
                      if (link) navigate(link);
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center space-x-2"
                  >
                    <span>{getRelatedRecordDisplayName()}</span>
                    <Icons.ArrowUpRight className="w-3 h-3" />
                  </button>
                ) : (
                  <p className="text-gray-500">Record not found</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
            <p className="text-gray-900">{task.createdBy ? getUserDisplayName(task.createdBy) : 'Unknown'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
            <p className="text-gray-900">{task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Unknown'}</p>
          </div>
          {task.updatedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Updated At</label>
              <p className="text-gray-900">{new Date(task.updatedAt).toLocaleString()}</p>
            </div>
          )}
          {task.updatedBy && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Updated By</label>
              <p className="text-gray-900">{getUserDisplayName(task.updatedBy)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Timeline Tab Component
const TimelineTab: React.FC<{ task: Task; getUserDisplayName: (userId: string) => string }> = ({
  task,
  getUserDisplayName
}) => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="w-3 h-3 bg-blue-600 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">Task Created</h4>
                  <p className="text-sm text-gray-600">
                    Task "{task.title}" was created by {task.createdBy ? getUserDisplayName(task.createdBy) : 'Unknown'}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          
          {task.updatedAt && task.updatedAt !== task.createdAt && (
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 bg-green-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">Task Updated</h4>
                    <p className="text-sm text-gray-600">
                      Task was last updated by {task.updatedBy ? getUserDisplayName(task.updatedBy) : 'Unknown'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(task.updatedAt).toLocaleDateString()}
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

export default TaskTabs; 