import React from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Product } from '../api/services';

interface ViewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  getUserDisplayName?: (userId: string) => string;
}

const ViewProductModal: React.FC<ViewProductModalProps> = ({
  isOpen,
  onClose,
  product,
  getUserDisplayName = (userId: string) => userId
}) => {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full max-h-[90vh] rounded-lg bg-white shadow-lg flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icons.Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  {product.name}
                </Dialog.Title>
                <p className="text-sm text-gray-500">Product Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</label>
                  <p className="text-sm text-gray-900 mt-1">{product.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Product Code</label>
                  <p className="text-sm text-gray-900 mt-1">{product.productCode}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Product Owner</label>
                  <p className="text-sm text-gray-900 mt-1">{getUserDisplayName(product.productOwner)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Status</label>
                  <p className="text-sm text-gray-900 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.activeStatus 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.activeStatus ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">${product.unitPrice.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Percentage</label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{product.taxPercentage}%</p>
                </div>
                {product.commissionRate && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Commission Rate</label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{product.commissionRate}%</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price (with Tax)</label>
                  <p className="text-lg font-semibold text-green-600 mt-1">
                    ${(product.unitPrice * (1 + product.taxPercentage / 100)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Stock Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Stock Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current Stock:</span>
                  <span className={`text-sm font-medium ${product.quantityInStock && product.quantityInStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.quantityInStock || 0} {product.usageUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Demand:</span>
                  <span className="text-sm text-gray-900">{product.quantityInDemand || 0} {product.usageUnit}</span>
                </div>
                {product.reorderLevel && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reorder Level:</span>
                    <span className="text-sm text-gray-900">{product.reorderLevel} {product.usageUnit}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">On Order:</span>
                  <span className="text-sm text-gray-900">{product.quantityOrdered || 0} {product.usageUnit}</span>
                </div>
              </div>
            </div>

            {/* Specifications */}
            {(product.weight || product.dimensions) && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Specifications</h3>
                <div className="space-y-2">
                  {product.weight && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Weight:</span>
                      <span className="text-sm text-gray-900">{product.weight} kg</span>
                    </div>
                  )}
                  {product.dimensions && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dimensions:</span>
                      <span className="text-sm text-gray-900">{product.dimensions}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Description</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Audit Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Audit Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="text-gray-900">{new Date(product.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created By:</span>
                  <span className="text-gray-900">{product.createdBy ? getUserDisplayName(product.createdBy) : 'Unknown User'}</span>
                </div>
                {product.updatedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="text-gray-900">{new Date(product.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
                {product.updatedBy && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated By:</span>
                    <span className="text-gray-900">{getUserDisplayName(product.updatedBy)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ViewProductModal; 