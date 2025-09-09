import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../theme/ThemeContext';

// Memoized Approval Item Component
const ApprovalItem = React.memo(({ item, theme, onApprove, onReject, getGameTitle }) => (
  <View style={[
    styles.approvalCard, 
    { backgroundColor: theme.colors.card, shadowColor: theme.colors.cardShadow }
  ]}>
    <View style={styles.approvalHeader}>
      <View style={styles.approvalInfo}>
        <Text style={[styles.approvalCode, { color: theme.colors.text }]}>{item.code}</Text>
        <Text style={[styles.approvalGame, { color: theme.colors.textSecondary }]}>
          {getGameTitle(item.gameId)}
        </Text>
        <Text style={[styles.approvalUser, { color: theme.colors.textSecondary }]}>
          User ID: {item.userId}
        </Text>
        <Text style={[styles.approvalTime, { color: theme.colors.textSecondary }]}>
          Requested: {item.requestedAt.toDate().toLocaleString()}
        </Text>
      </View>
      <View style={styles.approvalBadges}>
        {item.isAdminCode && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        )}
      </View>
    </View>
    
    <View style={styles.approvalActions}>
      <TouchableOpacity
        style={[styles.approveButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => onApprove(item.id, item.userId, item.gameId, item.codeId, item.isAdminCode)}
      >
        <Ionicons name="checkmark" size={16} color="white" />
        <Text style={styles.approveButtonText}>APPROVE</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.rejectButton, { backgroundColor: theme.colors.error }]}
        onPress={() => onReject(item.id)}
      >
        <Ionicons name="close" size={16} color="white" />
        <Text style={styles.rejectButtonText}>REJECT</Text>
      </TouchableOpacity>
    </View>
  </View>
));

// Memoized Code Item Component
  const CodeItem = React.memo(({ item, theme, onCopy, onDelete, getGameTitle }) => (
  <View style={[
    styles.codeCard, 
    { backgroundColor: theme.colors.card, shadowColor: theme.colors.cardShadow }
  ]}>
    <View style={styles.codeHeader}>
      <View style={styles.codeInfo}>
        <Text style={[styles.codeText, { color: theme.colors.text }]}>{item.code}</Text>
      </View>
      <View style={styles.codeActions}>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => onCopy(item.code)}
        >
          <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
    
    <View style={styles.codeDetails}>
      <Text style={[styles.gameTitle, { color: theme.colors.text }]}>{getGameTitle(item.gameId)}</Text>
      <Text style={[styles.expiryText, { color: theme.colors.textSecondary }]}>
        One-time use only
      </Text>
    </View>
    
    <View style={styles.codeBadges}>
      {item.isAdminCode && (
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      )}
      {item.isUsed && (
        <View style={[styles.expiredBadge, { backgroundColor: '#FF9500' }]}>
          <Text style={styles.expiredBadgeText}>USED</Text>
        </View>
      )}
      
    </View>
    
    {/* Delete button positioned at bottom right */}
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => onDelete(item.id)}
    >
      <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
    </TouchableOpacity>
  </View>
));

// Memoized Game Grid Item Component
const GameGridItem = React.memo(({ item, theme, isSelected, onToggleSelection }) => (
  <TouchableOpacity
    style={[
      styles.gameGridItem,
      { 
        backgroundColor: theme.colors.background, 
        borderColor: theme.colors.border 
      },
      isSelected && [
        styles.selectedGameGridItem,
        { 
          backgroundColor: theme.colors.primary, 
          borderColor: theme.colors.primary 
        }
      ]
    ]}
    onPress={() => onToggleSelection(item.id)}
  >
    <View style={styles.gameGridContent}>
      <View style={[
        styles.checkbox,
        { borderColor: theme.colors.border },
        isSelected && [
          styles.checkedBox,
          { 
            backgroundColor: theme.colors.primary, 
            borderColor: theme.colors.primary 
          }
        ]
      ]}>
        {isSelected && (
          <Ionicons name="checkmark" size={12} color="white" />
        )}
      </View>
      <Text style={[
        styles.gameGridText,
        { color: theme.colors.text },
        isSelected && [
          styles.selectedGameGridText,
          { color: 'white' }
        ]
      ]} numberOfLines={2}>
        {item.title}
      </Text>
    </View>
  </TouchableOpacity>
));

// Memoized Empty Component
const EmptyComponent = React.memo(({ theme }) => (
  <View style={styles.emptyContainer}>
    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No codes generated yet</Text>
  </View>
));

export default function CodeGeneratorScreen() {
  const { theme } = useTheme();
  const [games, setGames] = useState([]);
  const [codes, setCodes] = useState([]);
  const [pendingActivations, setPendingActivations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('codes'); // 'codes' or 'approvals'
  const [formData, setFormData] = useState({
    selectedGames: [],
    codePrefix: '',
    isAdminCode: false,
    codeCount: '1',
  });

  useEffect(() => {
    fetchGames();
    fetchCodes();
    fetchPendingActivations();
  }, []);

  const fetchGames = async () => {
    try {
      const gamesQuery = query(collection(db, 'games'), orderBy('title'));
      const querySnapshot = await getDocs(gamesQuery);
      const gamesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGames(gamesData);
    } catch (error) {
      console.error('Error fetching games:', error);
      Alert.alert('Error', 'Failed to load games');
    }
  };

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const codesQuery = query(collection(db, 'codes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(codesQuery);
      const codesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // All codes are active (no expiry time)
      setCodes(codesData);
    } catch (error) {
      console.error('Error fetching codes:', error);
      Alert.alert('Error', 'Failed to fetch codes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingActivations = async () => {
    try {
      const pendingQuery = query(
        collection(db, 'pendingActivations'),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(pendingQuery);
      const pendingData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by requestedAt in descending order (most recent first)
      pendingData.sort((a, b) => b.requestedAt.toDate() - a.requestedAt.toDate());
      
      setPendingActivations(pendingData);
      console.log(`Found ${pendingData.length} pending activations`);
    } catch (error) {
      console.error('Error fetching pending activations:', error);
      Alert.alert('Error', 'Failed to fetch pending activations. Please check Firebase console for index creation.');
    }
  };

  const generateRandomCode = (prefix = '') => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    for (let i = 0; i < 8 - prefix.length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const toggleGameSelection = (gameId) => {
    setFormData(prev => ({
      ...prev,
      selectedGames: prev.selectedGames.includes(gameId)
        ? prev.selectedGames.filter(id => id !== gameId)
        : [...prev.selectedGames, gameId]
    }));
  };

  const handleAddCode = async () => {
    if (formData.selectedGames.length === 0) {
      Alert.alert('Error', 'Please select at least one game');
      return;
    }

    if (!formData.codeCount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const codeCount = parseInt(formData.codeCount);
    if (codeCount < 1 || codeCount > 50) {
      Alert.alert('Error', 'Please enter a valid number of codes (1-50)');
      return;
    }

    setLoading(true);
    try {
      let generatedCount = 0;
      for (const gameId of formData.selectedGames) {
        for (let i = 0; i < codeCount; i++) {
          const code = generateRandomCode(formData.codePrefix);
          await addDoc(collection(db, 'codes'), {
            gameId: gameId,
            code: code.toUpperCase(),
            isAdminCode: formData.isAdminCode,
            createdAt: new Date(),
            isUsed: false,
            usedBy: null,
            usedAt: null,
          });
          generatedCount++;
        }
      }

      setFormData({
        selectedGames: [],
        codePrefix: '',
        isAdminCode: false,
        codeCount: '1',
      });
      setShowAddModal(false);
      fetchCodes();
      Alert.alert('Success', `Generated ${generatedCount} codes successfully!`);
    } catch (error) {
      console.error('Error adding codes:', error);
      Alert.alert('Error', 'Failed to generate codes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCode = async (codeId) => {
    Alert.alert(
      'Delete Code',
      'Are you sure you want to delete this code?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'codes', codeId));
              fetchCodes();
              Alert.alert('Success', 'Code deleted successfully!');
            } catch (error) {
              console.error('Error deleting code:', error);
              Alert.alert('Error', 'Failed to delete code');
            }
          },
        },
      ]
    );
  };

  const handleApproveActivation = async (activationId, userId, gameId, codeId, isAdminCode) => {
    try {
      // Create activation record
      await addDoc(collection(db, 'activatedGames'), {
        userId,
        gameId,
        codeId,
        isAdminCode,
        activatedAt: new Date(),
        predictionIndex: 0
      });

      // Update pending activation status
      await updateDoc(doc(db, 'pendingActivations', activationId), {
        status: 'approved',
        approvedAt: new Date()
      });

      fetchPendingActivations();
      fetchCodes(); // Refresh codes list too
      Alert.alert('Success', 'Activation approved successfully!');
    } catch (error) {
      console.error('Error approving activation:', error);
      Alert.alert('Error', 'Failed to approve activation');
    }
  };

  const handleRejectActivation = async (activationId) => {
    Alert.alert(
      'Reject Activation',
      'Are you sure you want to reject this activation request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'pendingActivations', activationId), {
                status: 'rejected',
                rejectedAt: new Date()
              });
              fetchPendingActivations();
              Alert.alert('Success', 'Activation rejected successfully!');
            } catch (error) {
              console.error('Error rejecting activation:', error);
              Alert.alert('Error', 'Failed to reject activation');
            }
          },
        },
      ]
    );
  };

  const refreshAll = () => {
    fetchCodes();
    fetchPendingActivations();
  };

  const refreshApprovals = () => {
    fetchPendingActivations();
  };

  const copyToClipboard = async (code) => {
    try {
      await Clipboard.setString(code);
      Alert.alert('Copied!', 'Code copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy code');
    }
  };

  const getGameTitle = (gameId) => {
    const game = games.find(g => g.id === gameId);
    return game ? game.title : 'Unknown Game';
  };



  // Memoized callback functions
  const handleCopy = useCallback((code) => {
    copyToClipboard(code);
  }, []);

  const handleDelete = useCallback((codeId) => {
    handleDeleteCode(codeId);
  }, []);

  const handleToggleGameSelection = useCallback((gameId) => {
    toggleGameSelection(gameId);
  }, []);

  // Memoized render functions
  const renderCode = useCallback(({ item }) => (
    <CodeItem
      item={item}
      theme={theme}
      onCopy={handleCopy}
      onDelete={handleDelete}
      getGameTitle={getGameTitle}
    />
  ), [theme, handleCopy, handleDelete, getGameTitle]);

  // Memoized key extractor
  const codeKeyExtractor = useCallback((item) => item.id, []);

  // Memoized empty component
  const emptyComponent = useMemo(() => <EmptyComponent theme={theme} />, [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Admin Panel</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
            onPress={refreshAll}
          >
            <Ionicons name="refresh" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'codes' && [styles.activeTabButton, { backgroundColor: theme.colors.primary }]
          ]}
          onPress={() => setActiveTab('codes')}
        >
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'codes' ? 'white' : theme.colors.textSecondary }
          ]}>
            Codes ({codes.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'approvals' && [styles.activeTabButton, { backgroundColor: theme.colors.primary }]
          ]}
          onPress={() => setActiveTab('approvals')}
        >
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'approvals' ? 'white' : theme.colors.textSecondary }
          ]}>
            Approvals ({pendingActivations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Codes Tab */}
      {activeTab === 'codes' && (
        <FlatList
          data={codes}
          renderItem={renderCode}
          keyExtractor={codeKeyExtractor}
          contentContainerStyle={styles.codesList}
          ListEmptyComponent={emptyComponent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          getItemLayout={(data, index) => ({
            length: 120, // Increased height for better spacing
            offset: 120 * index,
            index,
          })}
        />
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <View style={styles.approvalsContainer}>
          <View style={styles.approvalsHeader}>
            <Text style={[styles.approvalsTitle, { color: theme.colors.text }]}>
              Pending Approvals ({pendingActivations.length})
            </Text>
            <TouchableOpacity
              style={[styles.refreshApprovalsButton, { backgroundColor: theme.colors.primary }]}
              onPress={refreshApprovals}
            >
              <Ionicons name="refresh" size={16} color="white" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={pendingActivations}
            renderItem={({ item }) => (
              <ApprovalItem
                item={item}
                theme={theme}
                onApprove={handleApproveActivation}
                onReject={handleRejectActivation}
                getGameTitle={getGameTitle}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.approvalsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No pending approvals
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                  Pull to refresh or tap the refresh button
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* Add Code Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Generate New Codes</Text>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
              <View style={[styles.section, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Select Games *</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Choose one or more games</Text>
                <View style={styles.gameGridContainer}>
                  {games.map((game) => (
                    <GameGridItem
                      key={game.id}
                      item={game}
                      theme={theme}
                      isSelected={formData.selectedGames.includes(game.id)}
                      onToggleSelection={handleToggleGameSelection}
                    />
                  ))}
                </View>
              </View>
              
              <View style={[styles.section, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Code Settings</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Configure your codes</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Code Prefix (Optional)</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.colors.background, 
                      color: theme.colors.text,
                      borderColor: theme.colors.border 
                    }]}
                    placeholder="e.g., VIP, PREMIUM"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.codePrefix}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, codePrefix: text.toUpperCase() }))}
                    autoCapitalize="characters"
                    maxLength={4}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Number of Codes per Game *</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.colors.background, 
                      color: theme.colors.text,
                      borderColor: theme.colors.border 
                    }]}
                    placeholder="1"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.codeCount}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, codeCount: text }))}
                    keyboardType="numeric"
                  />
                </View>
                

              </View>
              
              <View style={[styles.section, styles.lastSection, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Code Type</Text>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setFormData(prev => ({ ...prev, isAdminCode: !prev.isAdminCode }))}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: theme.colors.border },
                    formData.isAdminCode && [
                      styles.checkedBox,
                      { 
                        backgroundColor: theme.colors.primary, 
                        borderColor: theme.colors.primary 
                      }
                    ]
                  ]}>
                    {formData.isAdminCode && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <View style={styles.checkboxTextContainer}>
                    <Text style={[styles.checkboxText, { color: theme.colors.text }]}>Admin Code</Text>
                    <Text style={[styles.checkboxSubtext, { color: theme.colors.textSecondary }]}>Gives access to admin predictions</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
            
            <View style={[styles.modalButtons, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.cancelButton, 
                  { 
                    backgroundColor: theme.colors.background, 
                    borderColor: theme.colors.border 
                  }
                ]}
                onPress={() => {
                  setShowAddModal(false);
                  setFormData({
                    selectedGames: [],
                    codePrefix: '',
                    isAdminCode: false,
                    codeCount: '1',
                  });
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.confirmButton, 
                  { backgroundColor: theme.colors.primary },
                  loading && styles.buttonDisabled
                ]}
                onPress={handleAddCode}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? 'Generating...' : 'Generate Codes'}
                </Text>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codesList: {
    padding: 16,
  },
  codeCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    paddingRight: 50, // Add right padding for delete button
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },

  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  codeInfo: {
    flex: 1,
    marginRight: 8,
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 4,
  },
  codeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeDetails: {
    marginTop: 8,
    marginBottom: 12,
  },
  gameTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  expiryText: {
    fontSize: 12,
  },
  codeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  adminBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  adminBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    height: '90%',
    flexDirection: 'column',
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalScrollContent: {
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 0,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  gamesContainer: {
    marginBottom: 16,
    minHeight: 100,
    padding: 8,
    borderRadius: 6,
  },
  gameOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  selectedGameOption: {
  },
  gameOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameOptionText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  selectedGameOptionText: {
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  lastSection: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  gameGridContainer: {
    paddingBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gameGridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gameGridItem: {
    width: '48%', // Adjust as needed for 2 columns
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  selectedGameGridItem: {
  },
  gameGridContent: {
    alignItems: 'center',
  },
  gameGridText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  selectedGameGridText: {
    fontWeight: '600',
  },
  approvalCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  approvalInfo: {
    flex: 1,
  },
  approvalCode: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  approvalGame: {
    fontSize: 14,
    marginBottom: 4,
  },
  approvalUser: {
    fontSize: 14,
    marginBottom: 4,
  },
  approvalTime: {
    fontSize: 12,
  },
  approvalBadges: {
    flexDirection: 'row',
  },
  approvalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FF9500', // Example color for approve
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FF3B30', // Example color for reject
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeTabButton: {
    borderRadius: 20,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  approvalsList: {
    padding: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalsContainer: {
    flex: 1,
  },
  approvalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  approvalsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshApprovalsButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
}); 