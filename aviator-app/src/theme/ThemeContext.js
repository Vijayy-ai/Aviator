import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from './theme';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Always start in dark mode
  const [theme, setTheme] = useState(darkTheme); // Start with dark theme

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    setTheme(isDarkMode ? darkTheme : lightTheme);
    saveThemePreference();
  }, [isDarkMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        // If no saved preference, default to dark mode
        setIsDarkMode(true);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // Default to dark mode on error
      setIsDarkMode(true);
    }
  };

  const saveThemePreference = async () => {
    try {
      await AsyncStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 