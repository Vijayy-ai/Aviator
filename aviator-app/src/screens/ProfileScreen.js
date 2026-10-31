import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { signOut, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { uploadGameImage } from '../config/imageUpload';
import { useTheme } from '../theme/ThemeContext';
import {
  getFontSize,
  getSpacing,
  getButtonHeight,
  safeAreaTop,
  responsiveWidth,
} from '../utils/responsive';

const DEFAULT_AVATAR = require('../../assets/imagesss.jpeg');

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const user = auth.currentUser;

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);
  const [saving, setSaving] = useState(false);

  const uid = user?.uid || '';

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Logout Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  const copyUid = async () => {
    if (!uid) return;
    try {
      await Clipboard.setStringAsync(uid);
      Alert.alert('Copied', 'User ID copied to clipboard');
    } catch (e) {
      Alert.alert('Error', 'Could not copy UID');
    }
  };

  const openEditName = () => {
    setNameDraft(displayName || '');
    setShowNameModal(true);
  };

  const saveDisplayName = async () => {
    const next = nameDraft.trim();
    if (!next) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      await updateProfile(user, { displayName: next });
      setDisplayName(next);
      setShowNameModal(false);
      Alert.alert('Success', 'Name updated');
    } catch (error) {
      console.error('Name update error:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const changeProfilePhoto = async () => {
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setSaving(true);
    try {
      const uploadedUrl = await uploadGameImage(result.assets[0].uri);
      await updateProfile(user, { photoURL: uploadedUrl });
      setPhotoURL(uploadedUrl);
      Alert.alert('Success', 'Profile photo updated');
    } catch (error) {
      console.error('Photo update error:', error);
      Alert.alert('Error', error?.message || 'Failed to update photo');
    } finally {
      setSaving(false);
    }
  };

  const renderSettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showSwitch,
    switchValue,
    onSwitchChange,
    showArrow = true,
    rightElement,
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      disabled={showSwitch || !onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
          <Ionicons name={icon} size={getFontSize(20)} color={theme.colors.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text
              style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.settingItemRight}>
        {rightElement}
        {showSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
            thumbColor={switchValue ? theme.colors.primary : theme.colors.textSecondary}
          />
        ) : showArrow && onPress ? (
          <Ionicons name="chevron-forward" size={getFontSize(20)} color={theme.colors.textSecondary} />
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>👤 Profile</Text>
        <TouchableOpacity style={styles.themeButton} onPress={toggleTheme}>
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={getFontSize(24)}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={changeProfilePhoto}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Image
              source={photoURL ? { uri: photoURL } : DEFAULT_AVATAR}
              style={styles.profileImage}
            />
            <View style={[styles.cameraBadge, { backgroundColor: theme.colors.primary }]}>
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="camera" size={getFontSize(14)} color="white" />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <TouchableOpacity style={styles.nameRow} onPress={openEditName} activeOpacity={0.7}>
              <Text style={[styles.profileName, { color: theme.colors.text }]} numberOfLines={1}>
                {displayName || 'User'}
              </Text>
              <Ionicons name="create-outline" size={getFontSize(18)} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.uidRow} onPress={copyUid} activeOpacity={0.7}>
              <Text style={[styles.uidLabel, { color: theme.colors.textSecondary }]}>
                User ID:
              </Text>
              <Text
                style={[styles.profileUid, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {uid || '—'}
              </Text>
              <Ionicons name="copy-outline" size={getFontSize(16)} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.settingsSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}>
            Settings
          </Text>

          {renderSettingItem({
            icon: 'moon-outline',
            title: 'Dark Mode',
            subtitle: 'Toggle dark/light theme',
            showSwitch: true,
            switchValue: isDarkMode,
            onSwitchChange: toggleTheme,
            showArrow: false,
          })}

          {renderSettingItem({
            icon: 'information-circle-outline',
            title: 'About',
            subtitle: 'App version and information',
            onPress: () => navigation.navigate('About'),
          })}
        </View>

        <View style={[styles.settingsSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}>
            Session
          </Text>

          {renderSettingItem({
            icon: 'log-out-outline',
            title: 'Logout',
            subtitle: 'Sign out of your account',
            onPress: handleLogout,
          })}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit username</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.textSecondary}
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              maxLength={40}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: theme.colors.border }]}
                onPress={() => setShowNameModal(false)}
                disabled={saving}
              >
                <Text style={{ color: theme.colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSave, { backgroundColor: theme.colors.primary }]}
                onPress={saveDisplayName}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getSpacing(20),
    paddingTop: safeAreaTop + getSpacing(20),
    paddingBottom: getSpacing(20),
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: getFontSize(24),
    fontWeight: 'bold',
  },
  themeButton: {
    padding: getSpacing(8),
  },
  scrollContent: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getSpacing(20),
    marginBottom: getSpacing(20),
  },
  profileImageContainer: {
    marginRight: getSpacing(16),
    position: 'relative',
  },
  profileImage: {
    width: responsiveWidth(20),
    height: responsiveWidth(20),
    borderRadius: responsiveWidth(10),
  },
  profileImagePlaceholder: {
    width: responsiveWidth(20),
    height: responsiveWidth(20),
    borderRadius: responsiveWidth(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: getSpacing(28),
    height: getSpacing(28),
    borderRadius: getSpacing(14),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getSpacing(8),
    marginBottom: getSpacing(4),
  },
  profileName: {
    fontSize: getFontSize(20),
    fontWeight: 'bold',
    flexShrink: 1,
  },
  uidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getSpacing(6),
    maxWidth: '100%',
    flexWrap: 'wrap',
  },
  uidLabel: {
    fontSize: getFontSize(12),
    fontWeight: '600',
  },
  profileUid: {
    fontSize: getFontSize(12),
    flexShrink: 1,
  },
  settingsSection: {
    marginBottom: getSpacing(20),
  },
  sectionTitle: {
    fontSize: getFontSize(18),
    fontWeight: '600',
    paddingHorizontal: getSpacing(20),
    paddingVertical: getSpacing(12),
    borderBottomWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getSpacing(20),
    paddingVertical: getSpacing(16),
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: getSpacing(40),
    height: getSpacing(40),
    borderRadius: getSpacing(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getSpacing(12),
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: getSpacing(8),
  },
  settingTitle: {
    fontSize: getFontSize(16),
    fontWeight: '500',
    marginBottom: getSpacing(2),
  },
  settingSubtitle: {
    fontSize: getFontSize(13),
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getSpacing(8),
  },
  copyBtn: {
    padding: getSpacing(4),
  },
  bottomSpacing: {
    height: getSpacing(20),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: getSpacing(24),
  },
  modalCard: {
    borderRadius: getSpacing(16),
    padding: getSpacing(20),
  },
  modalTitle: {
    fontSize: getFontSize(18),
    fontWeight: '700',
    marginBottom: getSpacing(16),
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: getSpacing(10),
    paddingHorizontal: getSpacing(14),
    paddingVertical: getSpacing(12),
    fontSize: getFontSize(16),
    marginBottom: getSpacing(16),
  },
  modalActions: {
    flexDirection: 'row',
    gap: getSpacing(10),
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getButtonHeight(),
    borderRadius: getSpacing(10),
    borderWidth: 1,
  },
  modalSave: {
    borderWidth: 0,
  },
  modalSaveText: {
    color: 'white',
    fontWeight: '600',
    fontSize: getFontSize(16),
  },
});
