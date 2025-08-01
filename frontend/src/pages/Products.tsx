import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import DataTable from '../components/Common/DataTable';
import StatusBadge from '../components/Common/StatusBadge';
import { productsApi, Product, usersApi, User } from '../api/services';
import AddNewModal from '../components/Common/AddNewModal';
import ViewProductModal from '../components/ViewProductModal';
import EditProductModal from '../components/EditProductModal';
import { Dialog } from '@headlessui/react';

const Products: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<string | undefined>(undefined);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    productCode: false,
    productName: false,
    price: false,
    usageUnit: false,
    taxPercentage: false
  });

  // Filter values
  const [filterValues, setFilterValues] = useState({
    productCode: '',
    productName: '',
    minPrice: '',
    maxPrice: '',
    usageUnit: '',
    taxPercentage: ''
  });

  // Filtered products
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  

  
  // Category suggestions state
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // Fetch products and users data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [productsData, usersData] = await Promise.all([
          productsApi.getAll(),
          usersApi.getAll()
        ]);
        setProducts(productsData);
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters and SKU search whenever products, filter values, or SKU search change
  useEffect(() => {
    let filtered = [...products];

    // Apply product code filter
    if (filters.productCode && filterValues.productCode) {
      filtered = filtered.filter(product => 
        product.productCode?.toLowerCase().includes(filterValues.productCode.toLowerCase())
      );
    }

    // Apply product name filter
    if (filters.productName && filterValues.productName) {
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(filterValues.productName.toLowerCase())
      );
    }

    // Apply price range filter
    if (filters.price && (filterValues.minPrice || filterValues.maxPrice)) {
      filtered = filtered.filter(product => {
        const price = product.unitPrice || 0;
        const minPrice = filterValues.minPrice ? parseFloat(filterValues.minPrice) : 0;
        const maxPrice = filterValues.maxPrice ? parseFloat(filterValues.maxPrice) : Infinity;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Apply tax percentage filter
    if (filters.taxPercentage && filterValues.taxPercentage) {
      filtered = filtered.filter(product => {
        const taxValue = parseFloat(filterValues.taxPercentage);
        const productTax = product.taxPercentage || 0;
        return !isNaN(taxValue) && productTax === taxValue;
      });
    }



    setFilteredProducts(filtered);
  }, [products, filters, filterValues]);

  const handleCheckboxChange = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFilterValueChange = (key: keyof typeof filterValues, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    
    // Handle product name suggestions
    if (key === 'productName') {
      if (value.length >= 2) {
        // Get unique product names from products
        const uniqueNames = [...new Set(products.map(product => product.name || '').filter(Boolean))];
        
        // Filter names that contain the search term (case-insensitive)
        const suggestions = uniqueNames.filter(name => 
          name.toLowerCase().includes(value.toLowerCase())
        );
        
        setCategorySuggestions(suggestions);
        setShowCategorySuggestions(suggestions.length > 0);
      } else {
        setCategorySuggestions([]);
        setShowCategorySuggestions(false);
      }
    }
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically via useEffect
    // This could be used for additional logic if needed
  };

  const handleClearFilters = () => {
    setFilters({
      productCode: false,
      productName: false,
      price: false,
      usageUnit: false,
      taxPercentage: false
    });
    setFilterValues({
      productCode: '',
      productName: '',
      minPrice: '',
      maxPrice: '',
      usageUnit: '',
      taxPercentage: ''
    });

    setCategorySuggestions([]);
    setShowCategorySuggestions(false);
  };

  const handleDelete = async (id: string) => {
    setProductToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await productsApi.delete(productToDelete);
      setProducts(prev => prev.filter(product => product.id !== productToDelete));
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setIsViewModalOpen(true);
  };

  const handleRowClick = (item: Product) => {
    navigate(`/products/${item.id}`);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setSelectedProduct(null);
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setSuccessMessage(null);
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return userId;
    
    const firstName = user.firstName || 'Unknown';
    const lastName = user.lastName || 'User';
    
    return `${firstName} ${lastName}`;
  };

  const handleEditSuccess = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data);
      setSuccessMessage('Product has been successfully updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh products');
    }
  };



  const columns = [
    {
      key: 'name',
      label: 'Product',
      sortable: true,
      render: (value: string, row: any) => {
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <Icons.Package className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{row.productCode || 'No Code'}</div>
            </div>
          </div>
        );
      }
    },
    { 
      key: 'productOwner', 
      label: 'Owner', 
      sortable: true,
      render: (value: string) => getUserDisplayName(value)
    },
    { key: 'usageUnit', label: 'Unit', sortable: true },
    {
      key: 'unitPrice',
      label: 'Unit Price',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-gray-900">${value.toLocaleString()}</span>
      )
    },
    {
      key: 'taxPercentage',
      label: 'Tax %',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-gray-900">{value}%</span>
      )
    },
    {
      key: 'quantityInStock',
      label: 'Stock',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-gray-900">{value || 0}</span>
      )
    },
    {
      key: 'activeStatus',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <StatusBadge status={value ? 'Active' : 'Inactive'} />
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ];

  const actions = (row: any) => (
    <div className="flex items-center space-x-2">
      <button 
        className="p-1 text-gray-400 hover:text-blue-600"
        onClick={(e) => {
          e.stopPropagation();
          handleView(row);
        }}
        title="View Product"
      >
        <Icons.Eye className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-green-600"
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(row);
        }}
        title="Edit Product"
      >
        <Icons.Edit2 className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-gray-400 hover:text-red-600"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(row.id);
        }}
        title="Delete Product"
      >
        <Icons.Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const headerActions = (
    <>
      <button 
        className={`flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
          showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''
        }`}
        onClick={() => setShowFilters(!showFilters)}
      >
        <Icons.Filter className="w-4 h-4 mr-2" />
        Filter
      </button>
      <button
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        onClick={() => {
          setDefaultType('product');
          setIsModalOpen(true);
        }}
      >
        <Icons.Plus className="w-4 h-4 mr-2" />
        New Product
      </button>
    </>
  );

  const getStatusCounts = () => {
    const displayedProducts = filteredProducts.length > 0 || Object.values(filters).some(f => f) ? filteredProducts : products;
    const counts = {
      total: displayedProducts.length,
      active: displayedProducts.filter(product => product.activeStatus).length,
      inactive: displayedProducts.filter(product => !product.activeStatus).length,
      categories: [...new Set(displayedProducts.map(product => product.category || '').filter(Boolean))].length 
    };
    return counts;
  };

  const statusCounts = getStatusCounts();
  const displayedProducts = filteredProducts.length > 0 || Object.values(filters).some(f => f) ? filteredProducts : products;
  const totalValue = displayedProducts.reduce((sum, product) => sum + ((product.unitPrice || 0) * ((product.activeStatus ? 1 : 0))), 0);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4">
        {/* Page Header */}
        <PageHeader
          title="Products"
          subtitle="Manage your product catalog"
          breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Products' }]}
          actions={headerActions}
        />

        {/* Filter Section */}
        {showFilters && (
          <div className="w-full max-w-md bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="font-medium text-gray-700 mb-3">Filter & Sort Products</p>
            <div className="text-sm text-gray-600 space-y-3">
              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.productCode} onChange={() => handleCheckboxChange('productCode')} />
                  Product Code
                </label>
                {filters.productCode && (
                  <div className="mt-3 pl-4">
                    <input 
                      type="text"
                      placeholder="Product code"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={filterValues.productCode}
                      onChange={(e) => handleFilterValueChange('productCode', e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.productName} onChange={() => handleCheckboxChange('productName')} />
                  Product Name
                </label>
                {filters.productName && (
                  <div className="mt-3 pl-4 relative">
                    <input
                      type="text"
                      placeholder="Product name (min 2 characters for suggestions)"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={filterValues.productName}
                      onChange={(e) => handleFilterValueChange('productName', e.target.value)}
                      onFocus={() => {
                        if (filterValues.productName.length >= 2) {
                          setShowCategorySuggestions(categorySuggestions.length > 0);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow clicking on them
                        setTimeout(() => setShowCategorySuggestions(false), 200);
                      }}
                    />
                    {showCategorySuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {categorySuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              handleFilterValueChange('productName', suggestion);
                              setShowCategorySuggestions(false);
                            }}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.price} onChange={() => handleCheckboxChange('price')} />
                  Price Range
                </label>
                {filters.price && (
                  <div className="mt-3 pl-4 space-y-2">
                    <input 
                      type="number" 
                      placeholder="Min Price"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={filterValues.minPrice}
                      onChange={(e) => handleFilterValueChange('minPrice', e.target.value)}
                    />
                    <input 
                      type="number" 
                      placeholder="Max Price"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={filterValues.maxPrice}
                      onChange={(e) => handleFilterValueChange('maxPrice', e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.taxPercentage} onChange={() => handleCheckboxChange('taxPercentage')} />
                  Tax %
                </label>
                {filters.taxPercentage && (
                  <div className="mt-3 pl-4">
                    <input 
                      type="number"
                      placeholder="Tax percentage"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={filterValues.taxPercentage}
                      onChange={(e) => handleFilterValueChange('taxPercentage', e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2 h-4 w-4" checked={filters.usageUnit} onChange={() => handleCheckboxChange('usageUnit')} />
                  Usage Unit
                </label>
                {filters.usageUnit && (
                  <div className="mt-3 pl-4">
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={filterValues.usageUnit}
                      onChange={(e) => handleFilterValueChange('usageUnit', e.target.value)}
                    >
                      <option value="">-Select Usage Unit-</option>
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
                )}
              </div>


              {/* Search by SKU */}


              <div className="flex gap-2 mt-4">
                <button 
                  className="flex-1 py-1.5 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  onClick={handleApplyFilters}
                >
                  Apply
                </button>
                <button 
                  className="flex-1 py-1.5 px-3 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300 transition-colors"
                  onClick={handleClearFilters}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <Icons.CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-700">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-xl font-semibold text-gray-900">{statusCounts.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-xl font-semibold text-gray-900">{statusCounts.active}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Inactive</p>
                  <p className="text-xl font-semibold text-gray-900">{statusCounts.inactive}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Icons.DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="text-xl font-semibold text-gray-900">${totalValue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table or Kanban View */}
          {(filteredProducts.length === 0 && Object.values(filters).some(f => f)) ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Icons.Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products match your filters</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filter criteria.</p>
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Icons.Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first product.</p>
              <button
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                onClick={() => {
                  setDefaultType('product');
                  setIsModalOpen(true);
                }}
              >
                <Icons.Plus className="w-4 h-4 mr-2" />
                New Product
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full">
              <DataTable
                data={Object.values(filters).some(f => f) ? filteredProducts : products}
                columns={columns}
                actions={actions}
                onRowClick={handleRowClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add New Modal */}
      <AddNewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultType={defaultType}
        onSuccess={() => {
          // Refresh products data after successful creation
          productsApi.getAll().then(setProducts).catch((err) => {
            setError(err instanceof Error ? err.message : 'Failed to refresh products');
          });
          setSuccessMessage('Product has been successfully created.');
        }}
      />

      {/* View Product Modal */}
      <ViewProductModal
        isOpen={isViewModalOpen}
        onClose={handleModalClose}
        product={selectedProduct}
        getUserDisplayName={getUserDisplayName}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        product={selectedProduct}
        onSuccess={handleEditSuccess}
        users={users}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-2">
              Delete Product
            </Dialog.Title>
            
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setProductToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default Products; 