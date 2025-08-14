import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { createPortal } from 'react-dom';
import { Task, TASK_STATUSES } from '../types';
import { tasksApi, contactsApi, leadsApi, dealsApi, productsApi, quotesApi } from '../api/services';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onSave: (updates: Partial<Task>) => void;
  userName: string;
  users: { id: string; firstName?: string; lastName?: string; name?: string }[];
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ 
  isOpen, 
  onClose, 
  task, 
  onSave, 
  userName, 
  users 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: '' as Task['status'],
    priority: '' as Task['priority'],
    dueDate: '',
    // Add new fields for related records
    contactLeadType: 'contact' as string,
    contactLeadId: '' as string,
    relatedRecordType: 'deal' as string,
    relatedRecordId: '' as string
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Add state for related data and search overlays
  const [contacts, setContacts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);

  // Fetch related data for task form
  useEffect(() => {
    if (isOpen) {
      const fetchTaskRelatedData = async () => {
        try {
          // Fetch contacts, leads, deals, products, and quotes for dropdowns
          const [contactsRes, leadsRes, dealsRes, productsRes, quotesRes] = await Promise.all([
            contactsApi.getAll(),
            leadsApi.getAll(),
            dealsApi.getAll(),
            productsApi.getAll(),
            quotesApi.getAll()
          ]);
          
          setContacts(contactsRes);
          setLeads(leadsRes);
          setDeals(dealsRes);
          setProducts(productsRes);
          setQuotes(quotesRes);
        } catch (error) {
          console.error('Failed to fetch task related data:', error);
        }
      };
      fetchTaskRelatedData();
    }
  }, [isOpen]);

  // Populate form with task data when modal opens
  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'Open',
        priority: task.priority || 'Normal',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        // Add new fields from task data
        contactLeadType: task.contactLeadType || 'contact',
        contactLeadId: task.contactLeadId || '',
        relatedRecordType: task.relatedRecordType || 'deal',
        relatedRecordId: task.relatedRecordId || ''
      });
      setError(null);
    }
  }, [task, isOpen, users]);

  const handleInputChange = (name: string, value: string | string[]) => {
    // Prevent changes to readonly fields
    if (name === 'contactLeadType' || name === 'relatedRecordType' || 
        name === 'contactLeadId' || name === 'relatedRecordId') {
      return; // These fields are readonly and cannot be changed
    }
    
    // Ensure value is a string for string fields
    const stringValue = Array.isArray(value) ? value[0] || '' : value;
    
    // All other fields can be updated
    setFormData(prev => ({ ...prev, [name]: stringValue }));
  };

  // Get dynamic options for contact/lead dropdown
  // Note: This function is no longer needed since contactLeadId is readonly,
  // but keeping it for potential future use
  const getContactLeadOptions = (type: string): { value: string; label: string }[] => {
    if (type === 'contact') {
      return contacts.map(c => ({
        value: c.id,
        label: `${c.firstName} ${c.lastName}`
      }));
    } else if (type === 'lead') {
      return leads.map(l => ({
        value: l.id,
        label: `${l.firstName} ${l.lastName}`
      }));
    }
    return [];
  };

  // Get display name for selected contact/lead
  // Note: This function is still needed to display the readonly field values
  const getSelectedContactLeadName = () => {
    if (!formData.contactLeadId) return '';
    const type = formData.contactLeadType || 'contact';
    const records = type === 'contact' ? contacts : leads;
    const record = records.find(r => r.id === formData.contactLeadId);
    return record ? `${record.firstName} ${record.lastName}` : '';
  };

  // Get dynamic options for related record dropdown
  // Note: This function is no longer needed since relatedRecordId is readonly,
  // but keeping it for potential future use
  const getRelatedRecordOptions = (type: string): { value: string; label: string }[] => {
    if (type === 'deal') {
      return deals.map(d => ({
        value: d.id,
        label: d.dealName
      }));
    } else if (type === 'product') {
      return products.map(p => ({
        value: p.id,
        label: p.name
      }));
    } else if (type === 'quote') {
      return quotes.map(q => ({
        value: q.id,
        label: q.quoteName
      }));
    }
    return [];
  };

  // Get display name for selected related record
  // Note: This function is still needed to display the readonly field values
  const getSelectedRelatedRecordName = () => {
    if (!formData.relatedRecordId) return '';
    const type = formData.relatedRecordType || 'deal';
    let records;
    if (type === 'deal') records = deals;
    else if (type === 'product') records = products;
    else if (type === 'quote') records = quotes;
    else return '';
    
    const record = records.find(r => r.id === formData.relatedRecordId);
    return record ? (record.dealName || record.name || record.quoteName) : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Create update object with only changed fields
      const updates: Partial<Task> = {};
      
      if (formData.title !== task.title) updates.title = formData.title;
      if (formData.description !== task.description) updates.description = formData.description;
      if (formData.status !== task.status) updates.status = formData.status;
      if (formData.priority !== task.priority) updates.priority = formData.priority;
      
      const newDueDate = new Date(formData.dueDate).toISOString();
      if (newDueDate !== task.dueDate) updates.dueDate = newDueDate;

      // Add new fields for related records (only the IDs, not the types since they're readonly)
      // Note: contactLeadId and relatedRecordId are also readonly and cannot be changed
      // These fields are now readonly and will not be included in updates

      // Call the onSave callback with only the updates
      await onSave(updates);
      onClose();
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task. Please check your input and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions = ['Low', 'Normal', 'High'];

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              Edit Task
            </Dialog.Title>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Task Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Icons.CheckSquare className="w-5 h-5 mr-2 text-blue-600" />
                Task Information
              </h3>
         
              <div className="space-y-4">
                {/* Task Owner */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Owner
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={userName}
                      disabled
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100"
                    />
                    <Icons.User className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>

                {/* Subject */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter subject"
                  />
                </div>

                {/* Due Date */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleInputChange('dueDate', e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="DD/MM/YYYY"
                    />
                    <Icons.Calendar className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>

                {/* Contact/Lead Type and Contact/Lead in two columns */}
                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact/Lead Type
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={formData.contactLeadType === 'contact' ? 'Contact' : 'Lead'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                      <Icons.Lock className="w-4 h-4 text-gray-400 ml-2" />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Type cannot be changed after task creation</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.contactLeadType === 'contact' ? 'Contact' : 'Lead'}
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={getSelectedContactLeadName() || 'No record selected'}
                        disabled
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                      <Icons.Lock className="w-4 h-4 text-gray-400 ml-2" />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Record cannot be changed after task creation</p>
                  </div>
                </div>

                {/* Related Record Type and Related Record in two columns */}
                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Related Record Type
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={formData.relatedRecordType === 'deal' ? 'Deal' : 
                               formData.relatedRecordType === 'product' ? 'Product' : 
                               formData.relatedRecordType === 'quote' ? 'Quote' : 
                               formData.relatedRecordType === 'lead' ? 'Lead' : 'Deal'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                      <Icons.Lock className="w-4 h-4 text-gray-400 ml-2" />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Type cannot be changed after task creation</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.relatedRecordType === 'deal' ? 'Deal' : 
                       formData.relatedRecordType === 'quote' ? 'Quote' : 
                       formData.relatedRecordType === 'lead' ? 'Lead' : 'Deal'}
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={getSelectedRelatedRecordName() || 'No record selected'}
                        disabled
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                      <Icons.Lock className="w-4 h-4 text-gray-400 ml-2" />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Record cannot be changed after task creation</p>
                  </div>
                </div>

                {/* Status */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      {TASK_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>

                {/* Priority */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      {priorityOptions.map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                    <Icons.ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                  </div>
                </div>


              </div>
            </div>

            {/* Description Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Icons.FileText className="w-5 h-5 mr-2 text-purple-600" />
                Description Information
              </h3>
              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter description"
                />
              </div>
            </div>



            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Task'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>

      {/* Contact/Lead Search Overlay */}
      {/* This overlay is no longer needed as contactLeadId is readonly */}

      {/* Related Record Search Overlay */}
      {/* This overlay is no longer needed as relatedRecordId is readonly */}
    </Dialog>
  );
};

export default EditTaskModal; 