import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import GameScreen from './src/screens/GameScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import GamesManagementScreen from './src/screens/admin/GamesManagementScreen';
import CodeGeneratorScreen from './src/screens/admin/CodeGeneratorScreen';
import PredictionManagerScreen from './src/screens/admin/PredictionManagerScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Global error handler
const handleGlobalError = (error, errorInfo) => {
  console.error('Global Error:', error, errorInfo);
  
  // Don't show Firebase auth errors as they're handled in screens
  if (error?.code?.startsWith('auth/')) {
    return;
  }
  
  // Don't show network errors as they're handled in screens
  if (error?.message?.includes('network') || error?.message?.includes('Network')) {
    return;
  }
  
  // For other errors, you can add custom handling here
  // For now, we'll just log them to console
};

function AdminTabs() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Hide the default tab navigator header
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Games') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
          } else if (route.name === 'Codes') {
            iconName = focused ? 'key' : 'key-outline';
          } else if (route.name === 'Predictions') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
        },
      })}
    >
      <Tab.Screen name="Games" component={GamesManagementScreen} />
      <Tab.Screen name="Codes" component={CodeGeneratorScreen} />
      <Tab.Screen name="Predictions" component={PredictionManagerScreen} />
    </Tab.Navigator>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    handleGlobalError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            Please restart the app or contact support if the problem persists.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setLoading(false);
      // Don't show auth errors globally, they're handled in screens
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <StatusBar style={theme.colors.background === '#000000' ? 'light' : 'dark'} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            // Auth screens
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
            </>
          ) : (
            // Main app screens
            <>
              <Stack.Screen name="MainTabs" component={MainTabNavigator} />
              <Stack.Screen name="Game" component={GameScreen} />
              <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
              <Stack.Screen name="AdminTabs" component={AdminTabs} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 