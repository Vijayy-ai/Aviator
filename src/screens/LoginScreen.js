import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { ADMIN_EMAIL } from '../config/constants';
import { useTheme } from '../theme/ThemeContext';
import { 
  getFontSize, 
  getSpacing, 
  getButtonHeight, 
  safeAreaTop, 
  safeAreaBottom,
  responsiveWidth,
  responsiveHeight,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isTablet
} from '../utils/responsive';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debug admin email import
  console.log('🔍 LoginScreen - ADMIN_EMAIL imported:', ADMIN_EMAIL);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation will be handled automatically by App.js
    } catch (error) {
      console.error('Login error:', error);
      
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please check your credentials.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Account not found. Please check your email or sign up.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format. Please enter a valid email.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          errorMessage = 'Login failed. Please try again.';
      }
      
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openTelegram = () => {
    Linking.openURL('https://t.me/Aviator_Predictor_V5');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>🚀 Aviator</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>AI-Powered Predictions</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email Address</Text>
            <View style={[styles.inputContainer, { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.border 
            }]}>
              <Ionicons name="mail-outline" size={getFontSize(20)} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Password</Text>
            <View style={[styles.inputContainer, { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.border 
            }]}>
              <Ionicons name="lock-closed-outline" size={getFontSize(20)} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={getFontSize(20)} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={[styles.signupText, { color: theme.colors.textSecondary }]}>
              Don't have an account? <Text style={[styles.signupLink, { color: theme.colors.primary }]}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.telegramSection}>
          <TouchableOpacity style={styles.telegramButton} onPress={openTelegram}>
            <Ionicons name="logo-telegram" size={getFontSize(24)} color="#0088cc" />
            <Text style={[styles.telegramText, { color: theme.colors.text }]}>Join our Telegram</Text>
          </TouchableOpacity>
          <Text style={[styles.telegramLink, { color: '#FF6B9D' }]}>
            https://t.me/Aviator_Predictor_V5
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: getSpacing(20),
    paddingTop: safeAreaTop + getSpacing(40),
    paddingBottom: safeAreaBottom + getSpacing(40),
  },
  header: {
    alignItems: 'center',
    marginBottom: getSpacing(60),
  },
  title: {
    fontSize: getFontSize(32),
    fontWeight: 'bold',
    marginBottom: getSpacing(8),
  },
  subtitle: {
    fontSize: getFontSize(18),
    textAlign: 'center',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: getSpacing(24),
  },
  inputLabel: {
    fontSize: getFontSize(16),
    fontWeight: '600',
    marginBottom: getSpacing(8),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: getSpacing(12),
    paddingHorizontal: getSpacing(16),
    minHeight: getButtonHeight(),
  },
  inputIcon: {
    marginRight: getSpacing(12),
  },
  input: {
    flex: 1,
    fontSize: getFontSize(16),
    paddingVertical: getSpacing(12),
  },
  eyeButton: {
    padding: getSpacing(4),
  },
  loginButton: {
    borderRadius: getSpacing(12),
    paddingVertical: getSpacing(16),
    alignItems: 'center',
    marginTop: getSpacing(32),
    marginBottom: getSpacing(24),
    minHeight: getButtonHeight(),
  },
  loginButtonText: {
    color: 'white',
    fontSize: getFontSize(18),
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signupButton: {
    alignItems: 'center',
  },
  signupText: {
    fontSize: getFontSize(16),
    textAlign: 'center',
  },
  signupLink: {
    fontWeight: '600',
  },
  telegramSection: {
    alignItems: 'center',
    marginTop: getSpacing(40),
  },
  telegramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getSpacing(8),
  },
  telegramText: {
    fontSize: getFontSize(16),
    fontWeight: '600',
    marginLeft: getSpacing(8),
  },
  telegramLink: {
    fontSize: getFontSize(14),
    textDecorationLine: 'underline',
  },
}); 