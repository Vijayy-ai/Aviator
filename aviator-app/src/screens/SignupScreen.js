import React, { useState, useEffect } from 'react';
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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
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

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [telegramLink, setTelegramLink] = useState('https://t.me/Aviator_Predictor_V5');

  useEffect(() => {
    fetchTelegramLink();
  }, []);

  const fetchTelegramLink = async () => {
    try {
      const docRef = doc(db, 'settings', 'telegram');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.url) {
          setTelegramLink(data.url);
        }
      }
    } catch (error) {
      console.log('Error fetching telegram link on SignupScreen:', error);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Navigation will be handled automatically by App.js
    } catch (error) {
      console.error('Signup error:', error);
      
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'Signup failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email already exists. Please use a different email or login.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format. Please enter a valid email.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use a stronger password.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        default:
          errorMessage = 'Signup failed. Please try again.';
      }
      
      Alert.alert('Signup Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openTelegram = () => {
    Linking.openURL(telegramLink);
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
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Create Your Account</Text>
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

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Confirm Password</Text>
            <View style={[styles.inputContainer, { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.border 
            }]}>
              <Ionicons name="lock-closed-outline" size={getFontSize(20)} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={getFontSize(20)} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signupButton, { backgroundColor: theme.colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.loginText, { color: theme.colors.textSecondary }]}>
              Already have an account? <Text style={[styles.loginLink, { color: theme.colors.primary }]}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.telegramSection}>
          <TouchableOpacity style={styles.telegramButton} onPress={openTelegram}>
            <Ionicons name="paper-plane" size={getFontSize(24)} color="#0088cc" />
            <Text style={[styles.telegramText, { color: theme.colors.text }]}>Join our Telegram</Text>
          </TouchableOpacity>
          <Text style={[styles.telegramLink, { color: '#FF6B9D' }]}>
            {telegramLink}
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
  signupButton: {
    borderRadius: getSpacing(12),
    paddingVertical: getSpacing(16),
    alignItems: 'center',
    marginTop: getSpacing(32),
    marginBottom: getSpacing(24),
    minHeight: getButtonHeight(),
  },
  signupButtonText: {
    color: 'white',
    fontSize: getFontSize(18),
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButton: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: getFontSize(16),
    textAlign: 'center',
  },
  loginLink: {
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