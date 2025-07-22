import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
}

const DataTable: React.FC<DataTableProps> = ({ columns, data, onRowClick, actions }) => {
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Refs for synchronized scrolling
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  // Synchronized scrolling effect
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const tableScroll = tableScrollRef.current;
    const table = tableRef.current;

    if (!topScroll || !tableScroll || !table) return;

    // Set the width of the top scrollbar to match table width
    const updateScrollWidth = () => {
      const scrollContent = topScroll.querySelector('.scroll-content') as HTMLElement;
      if (scrollContent && table) {
        const tableWidth = table.scrollWidth;
        const containerWidth = tableScroll.clientWidth;
        
        // Only show scrollbar if content is wider than container
        if (tableWidth > containerWidth) {
          scrollContent.style.width = `${tableWidth}px`;
          topScroll.style.display = 'block';
        } else {
          topScroll.style.display = 'none';
        }
      }
    };

    // Handle top scrollbar scroll
    const handleTopScroll = () => {
      tableScroll.scrollLeft = topScroll.scrollLeft;
    };

    // Handle table scroll
    const handleTableScroll = () => {
      topScroll.scrollLeft = tableScroll.scrollLeft;
    };

    // Set up event listeners
    topScroll.addEventListener('scroll', handleTopScroll);
    tableScroll.addEventListener('scroll', handleTableScroll);

    // Update scroll width on mount and resize
    updateScrollWidth();
    const resizeObserver = new ResizeObserver(updateScrollWidth);
    resizeObserver.observe(table);

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      tableScroll.removeEventListener('scroll', handleTableScroll);
      resizeObserver.disconnect();
    };
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Top horizontal scrollbar */}
      <div 
        ref={topScrollRef}
        className="overflow-x-auto top-scrollbar border-b border-gray-200 bg-gray-50"
        style={{ height: '16px', width: '100%' }}
        title="Scroll horizontally to view more columns"
      >
        <div className="scroll-content" style={{ height: '1px', minWidth: '100%' }} />
      </div>
      
      {/* Main table container */}
      <div 
        ref={tableScrollRef}
        className="overflow-x-scroll overflow-y-auto table-scroll-container max-h-[60vh] lg:max-h-[calc(100vh-350px)]"
      >
        <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <Icons.ChevronUp
                          className={`w-3 h-3 ${
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        />
                        <Icons.ChevronDown
                          className={`w-3 h-3 -mt-1 ${
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`${
                  onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                } transition-colors`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render ? column.render(row[column.key], row) : (
                      <div className="text-sm text-gray-900">{row[column.key]}</div>
                    )}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;