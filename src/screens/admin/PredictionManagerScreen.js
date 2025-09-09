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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../theme/ThemeContext';

// Memoized Game Item Component
const GameItem = React.memo(({ item, theme, onManage }) => (
  <View style={[styles.gameCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.cardShadow }]}>
    <View style={styles.gameInfo}>
      <Text style={[styles.gameTitle, { color: theme.colors.text }]}>{item.title}</Text>
      <Text style={[styles.predictionCount, { color: theme.colors.textSecondary }]}>
        {item.adminPredictions ? item.adminPredictions.length : 0} predictions set
      </Text>
    </View>
    
    <TouchableOpacity
      style={[styles.manageButton, { 
        backgroundColor: theme.colors.background, 
        borderColor: theme.colors.border 
      }]}
      onPress={() => onManage(item)}
    >
      <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
      <Text style={[styles.manageButtonText, { color: theme.colors.primary }]}>Manage</Text>
    </TouchableOpacity>
  </View>
));

// Memoized Empty Component
const EmptyComponent = React.memo(({ theme }) => (
  <View style={styles.emptyContainer}>
    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No games available</Text>
    <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
      Add games in the Games Management tab first
    </Text>
  </View>
));

export default function PredictionManagerScreen() {
  const { theme } = useTheme();
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(['', '', '', '', '', '', '', '', '', '']);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeFormData, setCodeFormData] = useState({
    codePrefix: '',
    codeCount: '1',
  });

  useEffect(() => {
    fetchGames();
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

  const openPredictionModal = (game) => {
    setSelectedGame(game);
    // Load existing predictions or set empty array
    const existingPredictions = game.adminPredictions || [];
    const newPredictions = [...existingPredictions];
    // Fill up to 10 predictions
    while (newPredictions.length < 10) {
      newPredictions.push('');
    }
    setPredictions(newPredictions.slice(0, 10));
    setShowPredictionModal(true);
  };

  const handleSavePredictions = async () => {
    if (!selectedGame) return;

    // Filter out empty predictions
    const validPredictions = predictions.filter(pred => pred.trim() !== '');
    
    if (validPredictions.length === 0) {
      Alert.alert('Error', 'Please add at least one prediction');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'games', selectedGame.id), {
        adminPredictions: validPredictions,
      });

      setShowPredictionModal(false);
      setSelectedGame(null);
      setPredictions(['', '', '', '', '', '', '', '', '', '']);
      fetchGames();
      Alert.alert('Success', 'Predictions saved successfully!');
    } catch (error) {
      console.error('Error saving predictions:', error);
      Alert.alert('Error', 'Failed to save predictions');
    } finally {
      setLoading(false);
    }
  };

  const updatePrediction = (index, value) => {
    const newPredictions = [...predictions];
    newPredictions[index] = value;
    setPredictions(newPredictions);
  };

  const addPrediction = () => {
    if (predictions.length < 10) {
      setPredictions([...predictions, '']);
    }
  };

  const removePrediction = (index) => {
    if (predictions.length > 1) {
      const newPredictions = predictions.filter((_, i) => i !== index);
      setPredictions(newPredictions);
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

  const handleGenerateAdminCodes = async () => {
    if (!selectedGame) return;

    if (!codeFormData.codeCount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const codeCount = parseInt(codeFormData.codeCount);
    if (codeCount < 1 || codeCount > 50) {
      Alert.alert('Error', 'Please enter a valid number of codes (1-50)');
      return;
    }

    setLoading(true);
    try {
      let generatedCount = 0;
      for (let i = 0; i < codeCount; i++) {
        const code = generateRandomCode(codeFormData.codePrefix);
        await addDoc(collection(db, 'codes'), {
          gameId: selectedGame.id,
          code: code.toUpperCase(),
          isAdminCode: true,
          createdAt: new Date(),
        });
        generatedCount++;
      }

      setCodeFormData({
        codePrefix: '',
        codeCount: '1',
      });
      setShowCodeModal(false);
      Alert.alert('Success', `Created ${generatedCount} admin codes for ${selectedGame.title}!`);
    } catch (error) {
      console.error('Error generating codes:', error);
      Alert.alert('Error', 'Failed to generate admin codes');
    } finally {
      setLoading(false);
    }
  };

  // Memoized callback functions
  const handleManage = useCallback((game) => {
    openPredictionModal(game);
  }, []);

  // Memoized render functions
  const renderGame = useCallback(({ item }) => (
    <GameItem
      item={item}
      theme={theme}
      onManage={handleManage}
    />
  ), [theme, handleManage]);

  // Memoized key extractor
  const keyExtractor = useCallback((item) => item.id, []);

  // Memoized empty component
  const emptyComponent = useMemo(() => <EmptyComponent theme={theme} />, [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Predictions</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            // This could be used to add quick predictions or other features
            Alert.alert('Info', 'Select a game to manage its predictions');
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={[styles.infoBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.infoTitle, { color: theme.colors.primary }]}>📋 How it works</Text>
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          • Set up to 10 custom predictions for each game{'\n'}
          • Generate admin codes for each game to enable custom predictions{'\n'}
          • Users with normal codes get random predictions{'\n'}
          • Users with admin codes get one of your custom predictions{'\n'}
          • Admin codes are marked with "ADMIN" badge in code generator
        </Text>
      </View>

      <FlatList
        data={games}
        renderItem={renderGame}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.gamesList}
        ListEmptyComponent={emptyComponent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        getItemLayout={(data, index) => ({
          length: 80, // Approximate height of each game item
          offset: 80 * index,
          index,
        })}
      />

      {/* Prediction Modal */}
      <Modal
        visible={showPredictionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPredictionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <FlatList
              data={predictions}
              keyExtractor={(item, index) => index.toString()}
              ListHeaderComponent={() => (
                <>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    Manage Predictions for {selectedGame?.title}
                  </Text>
                  
                  <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                    Add up to 10 custom predictions. Users with admin codes will see one of these randomly.
                  </Text>

                  {/* Admin Code Generation Section */}
                  <View style={[styles.adminCodeSection, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    <Text style={[styles.adminCodeTitle, { color: theme.colors.primary }]}>🔑 Create Admin Codes</Text>
                    <Text style={[styles.adminCodeSubtitle, { color: theme.colors.textSecondary }]}>
                      Make special codes for this game. Users with these codes will see your predictions.
                    </Text>
                    <TouchableOpacity
                      style={[styles.generateCodeButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => setShowCodeModal(true)}
                    >
                      <Ionicons name="key" size={20} color="white" />
                      <Text style={styles.generateCodeButtonText}>Create Admin Codes</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              renderItem={({ item, index }) => (
                <View style={styles.predictionInputContainer}>
                  <TextInput
                    style={[styles.predictionInput, { 
                      backgroundColor: theme.colors.background, 
                      color: theme.colors.text,
                      borderColor: theme.colors.border 
                    }]}
                    placeholder={`Prediction ${index + 1}`}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={item}
                    onChangeText={(text) => updatePrediction(index, text)}
                    multiline
                  />
                  {predictions.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removePrediction(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListFooterComponent={() => (
                predictions.length < 10 ? (
                  <TouchableOpacity
                    style={[styles.addPredictionButton, { 
                      backgroundColor: theme.colors.background, 
                      borderColor: theme.colors.border 
                    }]}
                    onPress={addPrediction}
                  >
                    <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                    <Text style={[styles.addPredictionText, { color: theme.colors.primary }]}>Add Another Prediction</Text>
                  </TouchableOpacity>
                ) : null
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            />
            
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
                  setShowPredictionModal(false);
                  setSelectedGame(null);
                  setPredictions(['', '', '', '', '', '', '', '', '', '']);
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
                onPress={handleSavePredictions}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? 'Saving...' : 'Save Predictions'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Code Generation Modal */}
      <Modal
        visible={showCodeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Create Admin Codes for {selectedGame?.title}
            </Text>
            
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Create special codes that will show your predictions to users.
            </Text>



            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>How Many Codes?</Text>
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="1-50"
                placeholderTextColor={theme.colors.textSecondary}
                value={codeFormData.codeCount}
                onChangeText={(text) => setCodeFormData(prev => ({ ...prev, codeCount: text }))}
                keyboardType="numeric"
              />
            </View>


            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => {
                  setShowCodeModal(false);
                  setCodeFormData({
                    codePrefix: '',
                    codeCount: '1',
                  });
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.colors.primary }, loading && styles.buttonDisabled]}
                onPress={handleGenerateAdminCodes}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? 'Creating...' : 'Create Codes'}
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
  infoBox: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  gamesList: {
    padding: 16,
  },
  gameCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
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
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  predictionCount: {
    fontSize: 14,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  manageButtonText: {
    marginLeft: 8,
    fontSize: 14,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    flexDirection: 'column',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  predictionInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  predictionInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  removeButton: {
    padding: 8,
    marginTop: 4,
  },
  addPredictionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    marginHorizontal: 24,
  },
  addPredictionText: {
    marginLeft: 8,
    fontSize: 16,
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
  adminCodeSection: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  adminCodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  adminCodeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  generateCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  generateCodeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
}); 