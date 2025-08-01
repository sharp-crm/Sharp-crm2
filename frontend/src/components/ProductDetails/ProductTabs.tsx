import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Product } from '../../api/services';
import { productsApi } from '../../api/services';
import { useToastStore } from '../../store/useToastStore';

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
}

const ProductTabs: React.FC<ProductTabsProps> = ({
  activeTab,
  onTabChange,
  product,
  getUserDisplayName,
  onProductUpdate
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
            product={product} 
            getUserDisplayName={getUserDisplayName} 
            onProductUpdate={onProductUpdate}
          />
        ) : (
          <TimelineTab product={product} getUserDisplayName={getUserDisplayName} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ 
  product: Product; 
  getUserDisplayName: (userId: string) => string;
  onProductUpdate?: (updatedProduct: Product) => void;
}> = ({
  product,
  getUserDisplayName,
  onProductUpdate
}) => {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
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

        {/* Open Activities Section */}
        <div id="section-open-activities" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Open Activities</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Add Activity
            </button>
          </div>
          <div className="text-center py-8">
            <Icons.Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No open activities yet</p>
          </div>
        </div>

        {/* Closed Activities Section */}
        <div id="section-closed-activities" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Closed Activities</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="text-center py-8">
            <Icons.CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No closed activities yet</p>
          </div>
        </div>

        {/* Contacts Section */}
        <div id="section-contacts" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Add Contact
            </button>
          </div>
          <div className="text-center py-8">
            <Icons.Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No contacts associated yet</p>
          </div>
        </div>

        {/* Leads Section */}
        <div id="section-leads" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Leads</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Add Lead
            </button>
          </div>
          <div className="text-center py-8">
            <Icons.UserPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No leads associated yet</p>
          </div>
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
  );
};

// Timeline Tab Component
const TimelineTab: React.FC<{ product: Product; getUserDisplayName: (userId: string) => string }> = ({
  product,
  getUserDisplayName
}) => {
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