// src/components/Header.js
import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavbar } from '../../context/NavbarContext';
import { SunIcon, MoonIcon, UserIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const Header = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { currentPage } = useNavbar();

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentPage}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
            <Link
              to="/profile"
              onClick={() => setCurrentPage('Profile')}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Profile"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;