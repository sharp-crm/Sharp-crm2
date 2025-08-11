import React, { useState, useEffect, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { LineItem } from '../../types';
import { productsApi, Product } from '../../api/services';
import AddNewModal from './AddNewModal';

interface LineItemsInputProps {
  value: LineItem[];
  onChange: (lineItems: LineItem[]) => void;
  className?: string;
}

const LineItemsInput: React.FC<LineItemsInputProps> = ({ value, onChange, className = '' }) => {
  const [lineItems, setLineItems] = useState<LineItem[]>(value.length > 0 ? value : [{
    id: '1',
    productName: '',
    productId: '', // Add productId field
    description: '',
    quantity: 1,
    listPrice: 0,
    amount: 0,
    discount: 0,
    tax: 0
  }]);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const productsData = await productsApi.getAll();
        setProducts(productsData);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Memoize the onChange callback to prevent infinite loops
  const memoizedOnChange = useCallback(onChange, [onChange]);

  // Update parent when lineItems change - but only if lineItems actually changed
  useEffect(() => {
    // Only call onChange if lineItems have actually changed from the initial value
    if (JSON.stringify(lineItems) !== JSON.stringify(value)) {
      memoizedOnChange(lineItems);
    }
  }, [lineItems, memoizedOnChange, value]);

  // Update local state when value prop changes
  useEffect(() => {
    console.log('LineItemsInput: value prop changed:', value);
    console.log('LineItemsInput: value length:', value.length);
    console.log('LineItemsInput: value items:', value);
    
    if (value && value.length > 0) {
      // Ensure all items have required fields
      const formattedValue = value.map((item, index) => ({
        id: item.id || `item-${index + 1}`,
        productName: item.productName || '',
        productId: item.productId || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        listPrice: item.listPrice || item.unitPrice || 0,
        amount: item.amount || 0,
        discount: item.discount || 0,
        tax: item.tax || 0
      }));
      console.log('LineItemsInput: formatted value:', formattedValue);
      setLineItems(formattedValue);
    } else {
      setLineItems([{
        id: '1',
        productName: '',
        productId: '',
        description: '',
        quantity: 1,
        listPrice: 0,
        amount: 0,
        discount: 0,
        tax: 0
      }]);
    }
  }, [value]);

  const addLineItem = () => {
    const newLineItem: LineItem = {
      id: Date.now().toString(),
      productName: '',
      productId: '', // Add productId field
      description: '',
      quantity: 1,
      listPrice: 0,
      amount: 0,
      discount: 0,
      tax: 0
    };
    const updatedItems = [...lineItems, newLineItem];
    setLineItems(updatedItems);
  };

  const removeLineItem = (id: string) => {
    // Ensure at least one row remains
    if (lineItems.length > 1) {
      const updatedItems = lineItems.filter(item => item.id !== id);
      setLineItems(updatedItems);
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    const updatedItems = lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate amount
        if (field === 'quantity' || field === 'listPrice') {
          updatedItem.amount = updatedItem.quantity * updatedItem.listPrice;
        }
        
        return updatedItem;
      }
      return item;
    });
    setLineItems(updatedItems);
  };

  const handleProductSelect = (id: string, productId: string) => {
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      const updatedItems = lineItems.map(item => {
        if (item.id === id) {
          return {
            ...item,
            productName: selectedProduct.name,
            productId: selectedProduct.id, // Store product ID
            description: selectedProduct.description || '',
            listPrice: selectedProduct.unitPrice || 0,
            amount: item.quantity * (selectedProduct.unitPrice || 0)
          };
        }
        return item;
      });
      setLineItems(updatedItems);
    }
  };

  const handleAddProductSuccess = async () => {
    // Refresh products after adding new one
    try {
      const productsData = await productsApi.getAll();
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to refresh products:', error);
    }
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalDiscount = lineItems.reduce((sum, item) => {
    // Calculate discount amount from percentage
    const discountAmount = (item.amount * item.discount) / 100;
    return sum + discountAmount;
  }, 0);
  const totalTax = lineItems.reduce((sum, item) => sum + item.tax, 0);
  const grandTotal = subtotal - totalDiscount + totalTax;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-9 gap-4 p-4 bg-gray-50 border-b border-gray-200">
          <div className="col-span-1">
            <span className="text-sm font-semibold text-gray-700">S.NO</span>
          </div>
          <div className="col-span-2">
            <span className="text-sm font-semibold text-gray-700">Product Name</span>
          </div>
          <div className="col-span-1">
            <span className="text-sm font-semibold text-gray-700">Quantity</span>
          </div>
          <div className="col-span-1">
            <span className="text-sm font-semibold text-gray-700">List Price($)</span>
          </div>
          <div className="col-span-1">
            <span className="text-sm font-semibold text-gray-700">Amount($)</span>
          </div>
          <div className="col-span-1">
            <span className="text-sm font-semibold text-gray-700">Discount(%)</span>
          </div>
          <div className="col-span-1">
            <span className="text-sm font-semibold text-gray-700">Tax($)</span>
          </div>
          <div className="col-span-1">
            <span className="text-sm font-semibold text-gray-700">Actions</span>
          </div>
        </div>
        
        {/* Line Items */}
        {lineItems.map((item, index) => (
          <div key={item.id} className="grid grid-cols-9 gap-4 p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
            {/* S.NO */}
            <div className="col-span-1 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-900 bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center">
                {index + 1}
              </span>
            </div>
            
            {/* Product Name */}
            <div className="col-span-2 space-y-2">
              <div className="relative">
                <select
                  value={item.productId || ''}
                  onChange={(e) => {
                    if (e.target.value === 'add-new') {
                      setIsAddProductModalOpen(true);
                    } else if (e.target.value) {
                      handleProductSelect(item.id, e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} (${product.unitPrice})
                    </option>
                  ))}
                  <option value="add-new" className="font-semibold text-blue-600">
                    + Add New Product
                  </option>
                </select>
              </div>
              <textarea
                value={item.description}
                onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
              />
            </div>
            
            {/* Quantity */}
            <div className="col-span-1">
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                min="1"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            
            {/* List Price */}
            <div className="col-span-1">
              <input
                type="number"
                value={item.listPrice}
                onChange={(e) => updateLineItem(item.id, 'listPrice', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            
            {/* Amount */}
            <div className="col-span-1">
              <input
                type="number"
                value={item.amount}
                readOnly
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>
            
            {/* Discount */}
            <div className="col-span-1">
              <input
                type="number"
                value={item.discount}
                onChange={(e) => updateLineItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="0-100%"
              />
            </div>
            
            {/* Tax */}
            <div className="col-span-1">
              <input
                type="number"
                value={item.tax}
                onChange={(e) => updateLineItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            
            {/* Actions */}
            <div className="col-span-1 flex items-center justify-center">
              {lineItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLineItem(item.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove row"
                >
                  <Icons.Trash2 className="w-4 h-4" />
                </button>
              )}
              {lineItems.length === 1 && (
                <div className="w-8 h-8"></div>
              )}
            </div>
          </div>
        ))}
      </div>
        
      {/* Add Row Button */}
        <button
          type="button"
          onClick={addLineItem}
        className="flex items-center justify-center w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
        <Icons.Plus className="w-4 h-4 mr-2" />
        Add Row
        </button>

      {/* Totals Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600">Subtotal:</span>
            <div className="text-lg font-semibold text-gray-900">${subtotal.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Discount:</span>
            <div className="text-lg font-semibold text-gray-900">${totalDiscount.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Tax:</span>
            <div className="text-lg font-semibold text-gray-900">${totalTax.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Total:</span>
            <div className="text-lg font-bold text-blue-600">${grandTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Add New Product Modal */}
      <AddNewModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        defaultType="product"
        onSuccess={handleAddProductSuccess}
      />
    </div>
  );
};

export default LineItemsInput; 