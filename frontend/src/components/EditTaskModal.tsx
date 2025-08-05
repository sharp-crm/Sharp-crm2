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
  const [showContactLeadSearch, setShowContactLeadSearch] = useState(false);
  const [showRelatedRecordSearch, setShowRelatedRecordSearch] = useState(false);

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
    if (name === 'contactLeadType') {
      // Reset contact/lead ID when type changes
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        contactLeadId: '' // Reset the ID when type changes
      }));
    } else if (name === 'relatedRecordType') {
      // Reset related record ID when type changes
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        relatedRecordId: '' // Reset the ID when type changes
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Get dynamic options for contact/lead dropdown
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
  const getSelectedContactLeadName = () => {
    if (!formData.contactLeadId) return '';
    const type = formData.contactLeadType || 'contact';
    const records = type === 'contact' ? contacts : leads;
    const record = records.find(r => r.id === formData.contactLeadId);
    return record ? `${record.firstName} ${record.lastName}` : '';
  };

  // Get dynamic options for related record dropdown
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

      // Add new fields for related records
      if (formData.contactLeadType !== task.contactLeadType) updates.contactLeadType = formData.contactLeadType;
      if (formData.contactLeadId !== task.contactLeadId) updates.contactLeadId = formData.contactLeadId;
      if (formData.relatedRecordType !== task.relatedRecordType) updates.relatedRecordType = formData.relatedRecordType;
      if (formData.relatedRecordId !== task.relatedRecordId) updates.relatedRecordId = formData.relatedRecordId;

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
                    <div className="flex items-center">
                      <select
                        value={formData.contactLeadType || 'contact'}
                        onChange={(e) => handleInputChange('contactLeadType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="contact">Contact</option>
                        <option value="lead">Lead</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      <select
                        key={`contact-lead-${formData.contactLeadId || 'empty'}`}
                        value={formData.contactLeadId || ''}
                        onChange={(e) => handleInputChange('contactLeadId', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">Select {formData.contactLeadType || 'contact'}</option>
                        {getContactLeadOptions(formData.contactLeadType || 'contact').map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                        {/* Show selected record if it's not in the options */}
                        {formData.contactLeadId && !getContactLeadOptions(formData.contactLeadType || 'contact').find(opt => opt.value === formData.contactLeadId) && (
                          <option value={formData.contactLeadId}>
                            {getSelectedContactLeadName()}
                          </option>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowContactLeadSearch(true);
                        }}
                        className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title={`Search ${formData.contactLeadType || 'contact'}s`}
                      >
                        <Icons.Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Related Record Type and Related Record in two columns */}
                <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-4">
                  <div>
                    <div className="flex items-center">
                      <select
                        value={formData.relatedRecordType || 'deal'}
                        onChange={(e) => handleInputChange('relatedRecordType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="deal">Deal</option>
                        <option value="product">Product</option>
                        <option value="quote">Quote</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      <select
                        key={`related-record-${formData.relatedRecordId || 'empty'}`}
                        value={formData.relatedRecordId || ''}
                        onChange={(e) => handleInputChange('relatedRecordId', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">Select {formData.relatedRecordType || 'deal'}</option>
                        {getRelatedRecordOptions(formData.relatedRecordType || 'deal').map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                        {/* Show selected record if it's not in the options */}
                        {formData.relatedRecordId && !getRelatedRecordOptions(formData.relatedRecordType || 'deal').find(opt => opt.value === formData.relatedRecordId) && (
                          <option value={formData.relatedRecordId}>
                            {getSelectedRelatedRecordName()}
                          </option>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowRelatedRecordSearch(true);
                        }}
                        className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title={`Search ${formData.relatedRecordType || 'deal'}s`}
                      >
                        <Icons.Search className="w-4 h-4" />
                      </button>
                    </div>
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
      {showContactLeadSearch && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-hidden" 
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="overflow-x-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 z-10 min-w-[800px]">
                <div className="flex items-center justify-between p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Search {formData.contactLeadType || 'contact'}s
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowContactLeadSearch(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icons.X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="bg-white min-w-[800px]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            {formData.contactLeadType === 'contact' ? 'CONTACT' : 'LEAD'}
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            OWNER
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            EMAIL
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            PHONE
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            COMPANY
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            STATUS
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(formData.contactLeadType === 'contact' ? contacts : leads).map((record: any) => (
                        <tr
                          key={record.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({
                              ...prev,
                              contactLeadId: record.id
                            }));
                            setShowContactLeadSearch(false);
                          }}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <Icons.User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {record.firstName} {record.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {record.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.contactOwner || record.leadOwner || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.companyName || record.company || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              {record.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Related Record Search Overlay */}
      {showRelatedRecordSearch && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-hidden" 
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="overflow-x-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 z-10 min-w-[800px]">
                <div className="flex items-center justify-between p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Search {formData.relatedRecordType || 'deal'}s
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRelatedRecordSearch(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icons.X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="bg-white min-w-[800px]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            {formData.relatedRecordType === 'deal' ? 'DEAL' : 
                             formData.relatedRecordType === 'product' ? 'PRODUCT' : 'QUOTE'}
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            OWNER
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            {formData.relatedRecordType === 'deal' ? 'AMOUNT' : 
                             formData.relatedRecordType === 'product' ? 'UNIT PRICE' : 'TOTAL'}
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            {formData.relatedRecordType === 'deal' ? 'STAGE' : 
                             formData.relatedRecordType === 'product' ? 'STOCK' : 'STATUS'}
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            STATUS
                            <Icons.ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(formData.relatedRecordType === 'deal' ? deals : 
                        formData.relatedRecordType === 'product' ? products : quotes).map((record: any) => (
                        <tr
                          key={record.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({
                              ...prev,
                              relatedRecordId: record.id
                            }));
                            setShowRelatedRecordSearch(false);
                          }}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                {formData.relatedRecordType === 'deal' ? (
                                  <Icons.Target className="w-4 h-4 text-blue-600" />
                                ) : formData.relatedRecordType === 'product' ? (
                                  <Icons.Package className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Icons.FileText className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {record.dealName || record.name || record.quoteName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {record.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.dealOwner || record.productOwner || record.quoteOwner || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formData.relatedRecordType === 'deal' ? `$${record.amount?.toLocaleString() || '0'}` :
                             formData.relatedRecordType === 'product' ? `$${record.unitPrice?.toLocaleString() || '0'}` :
                             `$${record.totalAmount?.toLocaleString() || '0'}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formData.relatedRecordType === 'deal' ? record.stage :
                             formData.relatedRecordType === 'product' ? record.quantityInStock || '0' :
                             record.status}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              {formData.relatedRecordType === 'product' ? 
                                (record.activeStatus ? 'Active' : 'Inactive') :
                                record.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Dialog>
  );
};

export default EditTaskModal; 