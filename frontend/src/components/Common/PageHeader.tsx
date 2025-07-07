import React from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ name: string; path?: string }>;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, breadcrumbs, actions }) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && <Icons.ChevronRight className="w-4 h-4 text-gray-400 mx-2" />}
                {item.path ? (
                  <Link
                    to={item.path}
                    className={`text-sm transition-colors ${
                      index === breadcrumbs.length - 1
                        ? 'text-gray-900 font-medium cursor-default'
                        : 'text-blue-600 hover:text-blue-800 hover:underline'
                    }`}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span className={`text-sm ${
                    index === breadcrumbs.length - 1
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-500'
                  }`}>
                    {item.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center space-x-3">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;