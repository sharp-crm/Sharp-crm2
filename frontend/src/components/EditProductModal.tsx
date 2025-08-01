import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { Product, productsApi } from '../api/services';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
  users?: { id: string; firstName?: string; lastName?: string }[];
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
  users = []
}) => {
  const [formData, setFormData] = useState({
    name: '',
    productCode: '',
    productOwner: '',
    activeStatus: true,
    unitPrice: '',
    taxPercentage: '',
    commissionRate: '',
    usageUnit: '',
    quantityInStock: '',
    quantityInDemand: '',
    reorderLevel: '',
    quantityOrdered: '',
    description: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        productCode: product.productCode || '',
        productOwner: product.productOwner || '',
        activeStatus: product.activeStatus ?? true,
        unitPrice: product.unitPrice?.toString() || '',
        taxPercentage: product.taxPercentage?.toString() || '',
        commissionRate: product.commissionRate?.toString() || '',
        usageUnit: product.usageUnit || '',
        quantityInStock: product.quantityInStock?.toString() || '',
        quantityInDemand: product.quantityInDemand?.toString() || '',
        reorderLevel: product.reorderLevel?.toString() || '',
        quantityOrdered: product.quantityOrdered?.toString() || '',
        description: product.description || '',
        notes: product.notes || ''
      });
    }
  }, [product]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 [EditProductModal] Form submitted');
    
    if (!product) {
      console.log('❌ [EditProductModal] No product to update');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedProduct = {
        name: formData.name,
        productCode: formData.productCode,
        productOwner: formData.productOwner,
        activeStatus: formData.activeStatus,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        taxPercentage: parseFloat(formData.taxPercentage) || 0,
        commissionRate: formData.commissionRate ? parseFloat(formData.commissionRate) : undefined,
        usageUnit: formData.usageUnit,
        quantityInStock: formData.quantityInStock ? parseFloat(formData.quantityInStock) : undefined,
        quantityInDemand: formData.quantityInDemand ? parseFloat(formData.quantityInDemand) : undefined,
        reorderLevel: formData.reorderLevel ? parseFloat(formData.reorderLevel) : undefined,
        quantityOrdered: formData.quantityOrdered ? parseFloat(formData.quantityOrdered) : undefined,
        description: formData.description,
        notes: formData.notes
      };

      console.log('📝 [EditProductModal] Updating product with data:', updatedProduct);
      console.log('📝 [EditProductModal] Product ID:', product.id);
      
      const result = await productsApi.update(product.id, updatedProduct);
      console.log('✅ [EditProductModal] Product updated successfully:', result);
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('❌ [EditProductModal] Error updating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

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
                  Edit Product
                </Dialog.Title>
                <p className="text-sm text-gray-500">Update product information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Product Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Product Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.productCode}
                    onChange={(e) => handleInputChange('productCode', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Owner *
                  </label>
                  <select
                    required
                    value={formData.productOwner}
                    onChange={(e) => handleInputChange('productOwner', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Product Owner</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName || 'Unknown'} {user.lastName || 'User'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Active Status
                  </label>
                  <select
                    value={formData.activeStatus.toString()}
                    onChange={(e) => handleInputChange('activeStatus', e.target.value === 'true')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Pricing Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Percentage *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.taxPercentage}
                    onChange={(e) => handleInputChange('taxPercentage', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.commissionRate}
                    onChange={(e) => handleInputChange('commissionRate', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usage Unit *
                  </label>
                  <select
                    required
                    value={formData.usageUnit}
                    onChange={(e) => handleInputChange('usageUnit', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Usage Unit</option>
                    <option value="Pieces">Pieces</option>
                    <option value="Kilograms">Kilograms</option>
                    <option value="Meters">Meters</option>
                    <option value="Liters">Liters</option>
                    <option value="Units">Units</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Cartons">Cartons</option>
                    <option value="Bottles">Bottles</option>
                    <option value="Bags">Bags</option>
                    <option value="Rolls">Rolls</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Inventory Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Inventory Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.quantityInStock}
                    onChange={(e) => handleInputChange('quantityInStock', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Demand
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.quantityInDemand}
                    onChange={(e) => handleInputChange('quantityInDemand', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.reorderLevel}
                    onChange={(e) => handleInputChange('reorderLevel', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    On Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.quantityOrdered}
                    onChange={(e) => handleInputChange('quantityOrdered', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Description</h3>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter product description..."
              />
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Notes</h3>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter product notes..."
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  'Update Product'
                )}
              </button>
            </div>
          </form>
        </div>
      </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default EditProductModal; 