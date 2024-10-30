// src/context/NavbarContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const NavbarContext = createContext();

export function NavbarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    const savedState = localStorage.getItem('navbarCollapsed');
    return savedState ? JSON.parse(savedState) : false;
  });

  const [currentPage, setCurrentPage] = useState('Home');

  // Update localStorage whenever collapsed state changes
  useEffect(() => {
    localStorage.setItem('navbarCollapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  return (
    <NavbarContext.Provider value={{ 
      collapsed, 
      setCollapsed, 
      currentPage, 
      setCurrentPage 
    }}>
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  const context = useContext(NavbarContext);
  if (!context) {
    throw new Error('useNavbar must be used within a NavbarProvider');
  }
  return context;
}