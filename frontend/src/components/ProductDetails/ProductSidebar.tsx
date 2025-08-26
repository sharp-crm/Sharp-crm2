import React from 'react';
import * as Icons from 'lucide-react';
import { Product, Task } from '../../api/services';

interface ProductSidebarProps {
  product?: Product;
  tasks?: Task[];
  dealsCount?: number;
}

const ProductSidebar: React.FC<ProductSidebarProps> = ({ product, tasks = [], dealsCount }) => {
  // Calculate counts based on product data
  const getSpecificationsCount = () => {
    if (!product) return 0;
    let count = 0;
    if (product.weight) count++;
    if (product.dimensions) count++;
    return count;
  };

  const getPricingCount = () => {
    if (!product) return 0;
    return 3; // Price, Cost, Profit Margin
  };

  const getInventoryCount = () => {
    if (!product) return 0;
    let count = 0;
    if (product.quantityInStock !== undefined && product.quantityInStock > 0) count++;
    if (product.quantityInDemand !== undefined && product.quantityInDemand > 0) count++;
    if (product.reorderLevel !== undefined && product.reorderLevel > 0) count++;
    if (product.quantityOrdered !== undefined && product.quantityOrdered > 0) count++;
    return count;
  };

  const getOpenActivitiesCount = () => {
    return tasks.filter(task => task.status !== 'Completed').length;
  };

  const getClosedActivitiesCount = () => {
    return tasks.filter(task => task.status === 'Completed').length;
  };

  const getNotesCount = () => {
    if (!product?.notes) return 0;
    return product.notes.split('\n\n').length;
  };

  const getLeadsCount = () => {
    if (!product?.relatedLeadIds) return 0;
    return product.relatedLeadIds.length;
  };

  const getContactsCount = () => {
    if (!product?.relatedContactIds) return 0;
    return product.relatedContactIds.length;
  };

  const getDealsCount = () => {
    return dealsCount || 0;
  };

  const sidebarItems = [
    { 
      id: 'product-information', 
      label: 'Product Information', 
      icon: Icons.Package, 
      count: 0 
    },
    { 
      id: 'notes', 
      label: 'Notes', 
      icon: Icons.FileText, 
      count: getNotesCount()
    },
    { 
      id: 'deals', 
      label: 'Deals', 
      icon: Icons.Target, 
      count: getDealsCount()
    },
    { 
      id: 'open-activities', 
      label: 'Open Tasks', 
      icon: Icons.Activity, 
      count: getOpenActivitiesCount()
    },
    { 
      id: 'closed-activities', 
      label: 'Closed Tasks', 
      icon: Icons.CheckCircle, 
      count: getClosedActivitiesCount()
    },
    { 
      id: 'contacts', 
      label: 'Contacts', 
      icon: Icons.Users, 
      count: getContactsCount()
    },
    { 
      id: 'leads', 
      label: 'Leads', 
      icon: Icons.UserPlus, 
      count: getLeadsCount()
    }
  ];

  const handleSectionClick = (sectionId: string) => {
    // Scroll to the corresponding section in the Overview tab
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Add highlight effect to the section title
      const titleElement = element.querySelector('h3');
      if (titleElement) {
        titleElement.classList.add('highlight-section-title');
        setTimeout(() => {
          titleElement.classList.remove('highlight-section-title');
        }, 1000);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Related List</h3>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSectionClick(item.id)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <div className="flex items-center space-x-2">
                <item.icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.count > 0 && (
                <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductSidebar; 