import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Product } from '../../api/services';

interface ProductHeaderProps {
  product: Product;
  onEdit?: () => void;
}

const ProductHeader: React.FC<ProductHeaderProps> = ({ product, onEdit }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Product info */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/products')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Icons.ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icons.Package className="w-6 h-6 text-blue-600" />
            </div>
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Code: {product.productCode}</span>
                <span>•</span>
                <span>Unit: {product.usageUnit}</span>
                <span>•</span>
                <span className="font-medium text-gray-900">Price: ${product.unitPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-3">
          <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Icons.Share2 className="w-4 h-4 mr-2" />
            Share
          </button>
          
          <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Icons.Download className="w-4 h-4 mr-2" />
            Export
          </button>
          
          <button 
            onClick={onEdit}
            className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Icons.Edit2 className="w-4 h-4 mr-2" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductHeader; 