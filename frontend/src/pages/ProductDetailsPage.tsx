import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { productsApi, Product, usersApi, User, Task, Deal } from '../api/services';
import ProductHeader from '../components/ProductDetails/ProductHeader';
import ProductSidebar from '../components/ProductDetails/ProductSidebar';
import ProductTabs from '../components/ProductDetails/ProductTabs';
import EditProductModal from '../components/EditProductModal';

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const [productData, usersData] = await Promise.all([
          productsApi.getById(id),
          usersApi.getAll()
        ]);
        
        if (productData) {
          setProduct(productData);
        } else {
          setError('Product not found');
        }
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const getUserDisplayName = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    if (!user) return userId;
    
    const firstName = user.firstName || 'Unknown';
    const lastName = user.lastName || 'User';
    
    return `${firstName} ${lastName}`;
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    try {
      const data = await productsApi.getById(id!);
      if (data) {
        setProduct(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh product');
    }
    setIsEditModalOpen(false);
  };

  const handleProductUpdate = useCallback((updatedProduct: Product) => {
    setProduct(updatedProduct);
  }, []);

  const handleTasksUpdate = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  }, []);

  const handleDealsUpdate = useCallback((updatedDeals: Deal[]) => {
    setDeals(updatedDeals);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Icons.AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error || 'Product not found'}</p>
        <button
          onClick={() => navigate('/products')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <ProductHeader product={product} onEdit={handleEdit} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-white border-r border-gray-200">
          <ProductSidebar product={product} tasks={tasks} dealsCount={deals.length} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ProductTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            product={product}
            getUserDisplayName={getUserDisplayName}
            onProductUpdate={handleProductUpdate}
            onTasksUpdate={handleTasksUpdate}
            onDealsUpdate={handleDealsUpdate}
          />
        </div>
      </div>

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={product}
        onSuccess={handleEditSuccess}
        users={users}
      />
    </div>
  );
};

export default ProductDetailsPage; 