// src/components/layout/navbar.jsx
import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ChartBarIcon, 
  FolderIcon,
  ArrowsRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightEndOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useNavbar } from '../../context/NavbarContext';
import { useAuth } from '../../context/auth/AuthContext';

// Create a mapping of routes to page titles
const routeTitles = {
  '/home': 'Manage your personal finances',
  '/dashboard': 'My dashboard',
  '/categories': 'My categories',
  '/transactions': 'My transactions',
  '/profile': 'My profile'
};

const NavItem = ({ to, icon: Icon, children, collapsed }) => {
  const { setCurrentPage } = useNavbar();
  
  return (
    <NavLink
      to={to}
      onClick={() => setCurrentPage(routeTitles[to])}
      className={({ isActive }) =>
        `flex items-center ${collapsed ? 'justify-center' : 'justify-start'} h-10 transition-colors ${
          isActive
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-100'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        } ${collapsed ? 'mx-2 rounded-lg' : 'mx-3 px-3 rounded-lg'}`
      }
    >
      <Icon className="w-5 h-5 min-w-[20px]" />
      {!collapsed && <span className="ml-2 truncate">{children}</span>}
    </NavLink>
  );
};

const NavButton = ({ icon: Icon, children, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} h-10 transition-colors
      text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400
      ${collapsed ? 'mx-4 rounded-lg' : 'mx-4 px-3 rounded-lg'}`}
  >
    <Icon className="w-5 h-5 min-w-[20px]" />
    {!collapsed && <span className="ml-2 truncate">{children}</span>}
  </button>
);

const Navbar = () => {
  const { collapsed, setCollapsed, setCurrentPage } = useNavbar();
  const { logout, user } = useAuth();
  const location = useLocation();

  // Update the current page title when the location changes
  useEffect(() => {
    setCurrentPage(routeTitles[location.pathname] || 'Personal Finance Tool');
  }, [location, setCurrentPage]);

  const handleSignOut = () => {
    logout();
  };

  return (
    <nav 
      className={`relative flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* User Profile Section */}
      <div className={`p-4 dark:border-gray-700 ${
        collapsed ? 'text-center' : ''
      }`}>
        <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center mx-auto mb-2">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        {!collapsed && (
          <div className="text-sm text-gray-700 dark:text-gray-300 text-center truncate">
            {user?.name || 'User'}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 py-4 space-y-2">
        <NavItem to="/home" icon={HomeIcon} collapsed={collapsed}>Home</NavItem>
        <NavItem to="/dashboard" icon={ChartBarIcon} collapsed={collapsed}>Dashboard</NavItem>
        <NavItem to="/categories" icon={FolderIcon} collapsed={collapsed}>Categories</NavItem>
        <NavItem to="/transactions" icon={ArrowsRightLeftIcon} collapsed={collapsed}>Transactions</NavItem>
      </div>
      
      <div className="py-4 border-t border-gray-200 dark:border-gray-700">
        <NavButton 
          icon={ArrowRightEndOnRectangleIcon} 
          collapsed={collapsed}
          onClick={handleSignOut}
        >
          Sign Out
        </NavButton>
      </div>
      
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {collapsed ? (
          <ChevronRightIcon className="w-4 h-4" />
        ) : (
          <ChevronLeftIcon className="w-4 h-4" />
        )}
      </button>
    </nav>
  );
};

export default Navbar;