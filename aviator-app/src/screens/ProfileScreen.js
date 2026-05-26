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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
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

export default function ProfileScreen({ navigation }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const user = auth.currentUser;

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
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
      ]
    );
  };

  const renderSettingItem = ({ icon, title, subtitle, onPress, showSwitch, switchValue, onSwitchChange, showArrow = true }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
          <Ionicons name={icon} size={getFontSize(20)} color={theme.colors.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingItemRight}>
        {showSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
            thumbColor={switchValue ? theme.colors.primary : theme.colors.textSecondary}
          />
        ) : showArrow ? (
          <Ionicons name="chevron-forward" size={getFontSize(20)} color={theme.colors.textSecondary} />
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* App Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>👤 Profile</Text>
        <TouchableOpacity
          style={styles.themeButton}
          onPress={toggleTheme}
        >
          <Ionicons 
            name={isDarkMode ? 'sunny' : 'moon'} 
            size={getFontSize(24)} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.profileImageContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="person" size={getFontSize(40)} color="white" />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.colors.text }]}>
              {user?.displayName || 'User'}
            </Text>
          </View>
        </View>

        {/* Settings Section */}
        <View style={[styles.settingsSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</Text>
          
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
            onPress: () => Alert.alert('About', 'Aviator Predictor v5.0\nAI-Powered Predictions'),
          })}
        </View>

        {/* Account Section */}
        <View style={[styles.settingsSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>
          
          {renderSettingItem({
            icon: 'log-out-outline',
            title: 'Logout',
            subtitle: 'Sign out of your account',
            onPress: handleLogout,
          })}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: getFontSize(20),
    fontWeight: 'bold',
    marginBottom: getSpacing(4),
  },
  profileEmail: {
    fontSize: getFontSize(14),
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
    borderBottomColor: '#e0e0e0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getSpacing(20),
    paddingVertical: getSpacing(16),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  },
  settingTitle: {
    fontSize: getFontSize(16),
    fontWeight: '500',
    marginBottom: getSpacing(2),
  },
  settingSubtitle: {
    fontSize: getFontSize(14),
  },
  settingItemRight: {
    alignItems: 'center',
  },
  bottomSpacing: {
    height: getSpacing(20),
  },
}); 