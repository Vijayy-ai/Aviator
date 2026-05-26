import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { getFontSize, getSpacing, getButtonHeight } from '../../utils/responsive';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const [telegramUrl, setTelegramUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Admin password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'telegram');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.url) {
          setTelegramUrl(data.url);
        } else {
          setTelegramUrl('https://t.me/Aviator_Predictor_V5');
        }
      } else {
        setTelegramUrl('https://t.me/Aviator_Predictor_V5');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setTelegramUrl('https://t.me/Aviator_Predictor_V5');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!telegramUrl.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid Telegram URL');
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'telegram');
      await setDoc(docRef, {
        url: telegramUrl.trim(),
        updatedAt: new Date(),
      }, { merge: true });
      Alert.alert('Success 🎉', 'Global Telegram link updated successfully across all screens!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Validation Error', 'Please enter your current password to verify identity.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }

    setSavingPassword(true);
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        // Step 1: Re-authenticate user programmatically to prevent requires-recent-login error
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        console.log('🔑 Re-authentication successful for:', user.email);

        // Step 2: Change password
        await updatePassword(user, newPassword);
        
        // Reset fields
        setCurrentPassword('');
        setNewPassword('');
        Alert.alert('Success 🎉', 'Admin password changed successfully! Use this new password for your next login.');
      } else {
        Alert.alert('Error', 'No authenticated admin user found.');
      }
    } catch (error) {
      console.error('Error updating admin password:', error);
      let errorMessage = error.message || 'Failed to update admin password.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        errorMessage = 'Your current password is incorrect. Please verify and try again.';
      }
      Alert.alert('Error Changing Password', errorMessage);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>⚙️ App Settings</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading settings...</Text>
          </View>
        ) : (
          <View style={styles.content}>


            {/* Telegram Link Setting Card */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, shadowColor: theme.colors.cardShadow }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 136, 204, 0.1)' }]}>
                  <Ionicons name="paper-plane" size={24} color="#0088cc" />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Telegram Channel Link</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                    Used for support redirect and footer links
                  </Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.background, 
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }]}
                  placeholder="Enter Telegram URL"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={telegramUrl}
                  onChangeText={setTelegramUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton, 
                  { backgroundColor: theme.colors.primary },
                  saving && styles.buttonDisabled
                ]}
                onPress={handleSaveSettings}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Change Admin Password Card */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, shadowColor: theme.colors.cardShadow }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                  <Ionicons name="lock-closed" size={24} color="#FF9500" />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Change Admin Password</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                    Update the credentials for the logged-in admin account
                  </Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text, marginBottom: 8, fontSize: getFontSize(14), fontWeight: '600' }]}>Current Password</Text>
                <View style={[styles.passwordInputWrapper, { 
                  backgroundColor: theme.colors.background, 
                  borderColor: theme.colors.border,
                  marginBottom: getSpacing(16)
                }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: theme.colors.text }]}
                    placeholder="Enter current password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons 
                      name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={theme.colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { color: theme.colors.text, marginBottom: 8, fontSize: getFontSize(14), fontWeight: '600' }]}>New Password</Text>
                <View style={[styles.passwordInputWrapper, { 
                  backgroundColor: theme.colors.background, 
                  borderColor: theme.colors.border 
                }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: theme.colors.text }]}
                    placeholder="Enter new admin password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={theme.colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton, 
                  { backgroundColor: theme.colors.primary },
                  savingPassword && styles.buttonDisabled
                ]}
                onPress={handleChangePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="key-outline" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Change Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: getSpacing(20),
    paddingTop: Platform.OS === 'ios' ? getSpacing(60) : getSpacing(40),
    paddingBottom: getSpacing(20),
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: getFontSize(22),
    fontWeight: 'bold',
  },
  content: {
    padding: getSpacing(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getSpacing(100),
  },
  loadingText: {
    fontSize: getFontSize(16),
    marginTop: getSpacing(12),
  },
  infoBox: {
    padding: getSpacing(16),
    borderRadius: getSpacing(12),
    borderWidth: 1,
    marginBottom: getSpacing(24),
  },
  infoTitle: {
    fontSize: getFontSize(16),
    fontWeight: '700',
    marginBottom: getSpacing(6),
  },
  infoText: {
    fontSize: getFontSize(14),
    lineHeight: getSpacing(20),
  },
  card: {
    borderRadius: getSpacing(12),
    padding: getSpacing(20),
    marginBottom: getSpacing(24),
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getSpacing(16),
  },
  iconContainer: {
    width: getSpacing(48),
    height: getSpacing(48),
    borderRadius: getSpacing(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getSpacing(12),
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: getFontSize(16),
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: getFontSize(12),
    marginTop: getSpacing(2),
  },
  inputContainer: {
    marginBottom: getSpacing(20),
  },
  input: {
    paddingHorizontal: getSpacing(16),
    paddingVertical: getSpacing(12),
    borderRadius: getSpacing(8),
    fontSize: getFontSize(16),
    borderWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getSpacing(14),
    borderRadius: getSpacing(8),
    minHeight: getButtonHeight(),
  },
  saveButtonText: {
    color: 'white',
    fontSize: getFontSize(16),
    fontWeight: '600',
    marginLeft: getSpacing(8),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: getSpacing(8),
    paddingHorizontal: getSpacing(16),
  },
  passwordInput: {
    flex: 1,
    paddingVertical: getSpacing(12),
    fontSize: getFontSize(16),
  },
  eyeIcon: {
    padding: getSpacing(4),
  },
});
