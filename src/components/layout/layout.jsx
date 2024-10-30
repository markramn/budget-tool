// src/components/layout/layout.jsx
import React from 'react';
import { useAuth } from '../../context/auth/AuthContext';
import Header from './header';
import Navbar from './navbar';
import { NavbarProvider } from '../../context/NavbarContext';

const Layout = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return null; // The ProtectedRoute component will handle the redirect
  }

  return (
    <NavbarProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </NavbarProvider>
  );
};

export default Layout;