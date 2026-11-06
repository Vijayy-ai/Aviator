import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { addAllGames } from '../utils/addGames';
import { useTheme } from '../theme/ThemeContext';

export default function AdminPanelScreen({ navigation }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleAddAllGames = async () => {
    Alert.alert(
      'Add All Games',
      'This will add 45 games to the database. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Games',
          onPress: async () => {
            setLoading(true);
            try {
              await addAllGames();
              Alert.alert('Success', 'All games added successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to add games');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramUrl, setTelegramUrl] = useState('');
  const [telegramAdminId, setTelegramAdminId] = useState('');
  const [updatingTelegram, setUpdatingTelegram] = useState(false);

  const handleOpenTelegramModal = async () => {
    setShowTelegramModal(true);
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'telegram');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTelegramUrl(data?.url || 'https://t.me/Aviator_Predictor_V5');
        setTelegramAdminId(data?.adminId || '');
      } else {
        setTelegramUrl('https://t.me/Aviator_Predictor_V5');
        setTelegramAdminId('');
      }
    } catch (error) {
      setTelegramUrl('https://t.me/Aviator_Predictor_V5');
      setTelegramAdminId('');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTelegramLink = async () => {
    if (!telegramUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid Telegram channel link');
      return;
    }
    setUpdatingTelegram(true);
    try {
      const docRef = doc(db, 'settings', 'telegram');
      await setDoc(docRef, {
        url: telegramUrl.trim(),
        adminId: telegramAdminId.trim().replace(/^@/, ''),
        updatedAt: new Date(),
      }, { merge: true });
      Alert.alert('Success', 'Telegram channel & admin ID updated!');
      setShowTelegramModal(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update Telegram settings');
    } finally {
      setUpdatingTelegram(false);
    }
  };

  const adminFeatures = [
    {
      title: 'Games',
      icon: 'game-controller',
      onPress: () => navigation.navigate('AdminTabs'),
      color: '#007AFF',
    },
    {
      title: 'Codes',
      icon: 'key',
      onPress: () => navigation.navigate('AdminTabs'),
      color: '#FF9500',
    },
    {
      title: 'Predictions',
      icon: 'analytics',
      onPress: () => navigation.navigate('AdminTabs'),
      color: '#34C759',
    },
    {
      title: 'Telegram Link',
      icon: 'paper-plane',
      onPress: handleOpenTelegramModal,
      color: '#0088cc',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>🛠 Admin Panel</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>
          Welcome to the Admin Panel! Manage your app from here.
        </Text>

        <View style={styles.featuresContainer}>
          {adminFeatures.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.featureCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.cardShadow }]}
              onPress={feature.onPress}
            >
              <View style={[styles.iconContainer, { backgroundColor: feature.color }]}>
                <Ionicons name={feature.icon} size={32} color="white" />
              </View>
              <View style={styles.featureInfo}>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{feature.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.primary }]}>📋 Quick Guide</Text>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            • Use Games Management to add new games and upload images{'\n'}
            • Generate codes in Code Generator for user activation{'\n'}
            • Set up admin predictions in Prediction Manager{'\n'}
            • Pin important games to show as "Trending"
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addGamesButton, { backgroundColor: theme.colors.success }, loading && styles.buttonDisabled]}
          onPress={handleAddAllGames}
          disabled={loading}
        >
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.addGamesButtonText}>
            {loading ? 'Adding Games...' : 'Add All 45 Games'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Telegram Settings Modal */}
      <Modal
        visible={showTelegramModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTelegramModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>📢 Telegram Settings</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Channel link for footer · Admin ID for Contact Admin (personal chat)
            </Text>

            <Text style={[styles.modalFieldLabel, { color: theme.colors.text }]}>Channel Link</Text>
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: theme.colors.background, 
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="https://t.me/your_channel"
              placeholderTextColor={theme.colors.textSecondary}
              value={telegramUrl}
              onChangeText={setTelegramUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.modalFieldLabel, { color: theme.colors.text }]}>Admin Telegram ID</Text>
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: theme.colors.background, 
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="@admin_username"
              placeholderTextColor={theme.colors.textSecondary}
              value={telegramAdminId}
              onChangeText={setTelegramAdminId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowTelegramModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.colors.primary }, updatingTelegram && styles.buttonDisabled]}
                onPress={handleSaveTelegramLink}
                disabled={updatingTelegram}
              >
                <Text style={styles.confirmButtonText}>
                  {updatingTelegram ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featureCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  addGamesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  addGamesButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    marginRight: 8,
  },
  confirmButton: {
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 