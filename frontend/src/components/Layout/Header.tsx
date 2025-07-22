import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import avatar from '../../Assets/avatar.png';

import AddNewModal from '../Common/AddNewModal';
import CalendarModal from '../Common/CalendarModal';
import NotificationPanel from '../Common/NotificationsPanel';
import SearchDropdown from '../Common/SearchDropdown';
import { globalSearchService, SearchResults, SearchResult } from '../../services/globalSearchService';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    leads: [],
    contacts: [],
    deals: [],
    tasks: [],
    subsidiaries: [],
    dealers: [],
    total: 0
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);
  const { notifications, unreadCount } = useNotificationStore();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults({
          leads: [],
          contacts: [],
          deals: [],
          tasks: [],
          subsidiaries: [],
          dealers: [],
          total: 0
        });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await globalSearchService.search(query);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Handle search query changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setShowSearchResults(false);
      setSearchResults({
        leads: [],
        contacts: [],
        deals: [],
        tasks: [],
        subsidiaries: [],
        dealers: [],
        total: 0
      });
    } else {
      debouncedSearch(query);
    }
  };

  // Handle search result selection
  const handleSearchResultClick = (result: SearchResult) => {
    setSearchQuery('');
    setShowSearchResults(false);
    // Navigation is handled in the SearchDropdown component
  };

  // Close search dropdown
  const closeSearchDropdown = () => {
    setShowSearchResults(false);
  };

  // Handle keyboard events for search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    }
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    if (showNotifications || showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showSearchResults]);

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Toggle + Search */}
          <div className="flex items-center space-x-4 w-1/2">
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Icons.Menu className="w-5 h-5" />
            </button>
            <div className="relative w-full" ref={searchRef}>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search contacts, leads, deals, tasks..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isSearching ? (
                    <Icons.Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  ) : (
                    <Icons.Search className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <Icons.X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {(showSearchResults || isSearching) && (
                <SearchDropdown
                  results={searchResults}
                  isLoading={isSearching}
                  searchTerm={searchQuery}
                  onClose={closeSearchDropdown}
                  onResultClick={handleSearchResultClick}
                />
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddNew(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Icons.Plus className="w-4 h-4 mr-2" />
              Add New
            </button>

            <button
              onClick={() => setShowCalendar(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.Calendar className="w-5 h-5" />
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
              >
                <Icons.Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Link
                to="/profile"
                className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg p-2 transition-colors"
              >
                <img
                  src={avatar}
                  alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</div>
                  <div className="text-xs text-gray-500">{user?.role}</div>
                </div>
              </Link>

              <Link
                to="/logout"
                className="p-2 text-red-600 hover:text-red-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.LogOut className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Modals from Common folder */}
      <AddNewModal isOpen={showAddNew} onClose={() => setShowAddNew(false)} />
      <CalendarModal isOpen={showCalendar} onClose={() => setShowCalendar(false)} />
    </>
  );
};

export default Header;
