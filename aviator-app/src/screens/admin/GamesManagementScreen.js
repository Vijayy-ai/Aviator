import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { uploadToUploadcare } from '../../config/uploadcare';
import { useTheme } from '../../theme/ThemeContext';

// Memoized Game Item Component
const GameItem = React.memo(({ item, theme, onTogglePin, onEdit, onDelete, onUrlFixed }) => {
  // Clean up old transformation URLs and add cache-busting
  const cleanImageUrl = (url) => {
    if (!url) return url;
    
    // If it's an old transformation URL, clean it up
    if (url.includes('/-/resize/') || url.includes('/-/format/') || url.includes('/-/quality/')) {
      // Extract the file ID from the URL
      const match = url.match(/https:\/\/ucarecdn\.com\/([a-f0-9-]+)/);
      if (match) {
        return `https://ucarecdn.com/${match[1]}/`;
      }
    }
    
    return url;
  };

  // Function to fix old URLs in database
  const fixOldImageUrl = async (gameId, oldUrl) => {
    try {
      const cleanUrl = cleanImageUrl(oldUrl);
      if (cleanUrl !== oldUrl) {
        console.log('🔧 Fixing old image URL for game:', gameId);
        
        await updateDoc(doc(db, 'games', gameId), {
          imageUrl: cleanUrl,
          updatedAt: new Date(),
        });
        
        if (onUrlFixed) {
          onUrlFixed();
        }
        return cleanUrl;
      }
    } catch (error) {
      console.error('Error fixing old URL:', error);
    }
    return oldUrl;
  };
  
  const imageUrl = cleanImageUrl(item.imageUrl);
  const imageUrlWithCacheBust = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
  
  return (
    <View style={[
      styles.gameCard, 
      { backgroundColor: theme.colors.card, shadowColor: theme.colors.cardShadow },
      item.isPinned && styles.pinnedCard
    ]}>
      <View style={styles.gameCardRow}>
        <Image 
          source={{ uri: imageUrlWithCacheBust }} 
          style={styles.gameImage}
          resizeMode="cover"
          onError={async (error) => {
            if (item.imageUrl.includes('/-/resize/') || item.imageUrl.includes('/-/format/') || item.imageUrl.includes('/-/quality/')) {
              await fixOldImageUrl(item.id, item.imageUrl);
            }
          }}
        />
        
        <View style={styles.gameInfo}>
          <View style={styles.titleContainer}>
            <Text style={[styles.gameTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
            {item.isPinned && (
              <View style={styles.pinnedBadgeInline}>
                <Text style={styles.pinnedTextInline}>🔥 Trending</Text>
              </View>
            )}
          </View>
          <Text style={[styles.gameDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>
          {item.gameLink ? (
            <Text style={[styles.gameLink, { color: theme.colors.primary }]} numberOfLines={1}>
              🔗 {item.gameLink}
            </Text>
          ) : (
            <Text style={[styles.gameLink, { color: theme.colors.textSecondary, fontStyle: 'italic' }]}>
              No game link set
            </Text>
          )}
        </View>
      </View>
      
      <View style={[styles.gameActionsLine, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.actionIconButton, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}
          onPress={() => onTogglePin(item)}
        >
          <Ionicons
            name={item.isPinned ? 'pin' : 'pin-outline'}
            size={18}
            color="#FF9500"
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionIconButton, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}
          onPress={() => onEdit(item)}
        >
          <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionIconButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
          onPress={() => onDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Memoized Empty Component
const EmptyComponent = React.memo(({ theme }) => (
  <View style={styles.emptyContainer}>
    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No games available</Text>
  </View>
));

export default function GamesManagementScreen() {
  const { theme } = useTheme();
  const [games, setGames] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    gameLink: '',
  });

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const gamesQuery = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(gamesQuery);
      const gamesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGames(gamesData);
    } catch (error) {
      console.error('Error fetching games:', error);
      
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'Failed to load games. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Access denied. Please contact support.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Loading Error', errorMessage);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('Manual refresh triggered...');
    await fetchGames();
    setRefreshing(false);
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for consistent sizing
      quality: 0.8,
      base64: false,
      exif: false,
      // Set specific dimensions for consistent sizing
      allowsMultipleSelection: false,
    });

    if (!result.canceled) {
      setFormData(prev => ({ ...prev, imageUrl: result.assets[0].uri }));
    }
  };

  const uploadImage = async (imageUri) => {
    try {
      console.log('🚀 Uploading image to Uploadcare...');
      const uploadedUrl = await uploadToUploadcare(imageUri);
      return uploadedUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const validateUrl = (url) => {
    if (!url.trim()) return true; // Empty URL is allowed
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddGame = async () => {
    if (!formData.title.trim() || !formData.imageUrl) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.gameLink.trim() && !validateUrl(formData.gameLink.trim())) {
      Alert.alert('Error', 'Please enter a valid website URL (e.g., https://example.com)');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = formData.imageUrl;
      if (!formData.imageUrl.startsWith('http')) {
        finalImageUrl = await uploadImage(formData.imageUrl);
      }

      await addDoc(collection(db, 'games'), {
        title: formData.title.trim(),
        description: formData.description.trim(),
        imageUrl: finalImageUrl,
        gameLink: formData.gameLink.trim(),
        isPinned: false,
        createdAt: new Date(),
        adminPredictions: [],
      });

      setFormData({ title: '', description: '', imageUrl: '', gameLink: '' });
      setShowAddModal(false);
      fetchGames();
      Alert.alert('Success', 'Game added successfully!');
    } catch (error) {
      console.error('Error adding game:', error);
      
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'Failed to add game. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Access denied. Please contact support.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Add Game Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditGame = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.gameLink.trim() && !validateUrl(formData.gameLink.trim())) {
      Alert.alert('Error', 'Please enter a valid website URL (e.g., https://example.com)');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = selectedGame.imageUrl;
      let imageChanged = false;
      
      if (formData.imageUrl && formData.imageUrl !== selectedGame.imageUrl) {
        console.log('Uploading new image...');
        finalImageUrl = await uploadImage(formData.imageUrl);
        imageChanged = true;
        console.log('New image URL:', finalImageUrl);
      }

      console.log('Updating game with new image URL:', finalImageUrl);
      
      await updateDoc(doc(db, 'games', selectedGame.id), {
        title: formData.title.trim(),
        description: formData.description.trim(),
        imageUrl: finalImageUrl,
        gameLink: formData.gameLink.trim(),
        updatedAt: new Date(), // Add timestamp to force refresh
      });

      setFormData({ title: '', description: '', imageUrl: '', gameLink: '' });
      setShowEditModal(false);
      setSelectedGame(null);
      
      // Force refresh the games list
      console.log('Refreshing games list...');
      await fetchGames();
      
      if (imageChanged) {
        Alert.alert('Success', 'Game updated successfully! The new image should appear shortly.');
      } else {
        Alert.alert('Success', 'Game updated successfully!');
      }
    } catch (error) {
      console.error('Error updating game:', error);
      
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'Failed to update game. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Access denied. Please contact support.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Update Game Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId) => {
    Alert.alert(
      'Delete Game',
      'Are you sure you want to delete this game?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'games', gameId));
              fetchGames();
              Alert.alert('Success', 'Game deleted successfully!');
            } catch (error) {
              console.error('Error deleting game:', error);
              
              // Convert Firebase errors to user-friendly messages
              let errorMessage = 'Failed to delete game. Please try again.';
              
              if (error.code === 'permission-denied') {
                errorMessage = 'Access denied. Please contact support.';
              } else if (error.code === 'unavailable') {
                errorMessage = 'Network error. Please check your connection.';
              }
              
              Alert.alert('Delete Game Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const togglePinGame = async (game) => {
    try {
      await updateDoc(doc(db, 'games', game.id), {
        isPinned: !game.isPinned,
      });
      fetchGames();
    } catch (error) {
      console.error('Error toggling pin:', error);
      Alert.alert('Error', 'Failed to update game pin status');
    }
  };

  const openEditModal = (game) => {
    setSelectedGame(game);
    setFormData({
      title: game.title,
      description: game.description || '',
      imageUrl: game.imageUrl,
      gameLink: game.gameLink || '',
    });
    setShowEditModal(true);
  };

  // Removed test function as we've migrated to Uploadcare
  const handleTestUploadcare = async () => {
    try {
      Alert.alert('✅ Uploadcare Configured', 'Using Uploadcare with public key: 18906b1428767eaf6052');
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('❌ Error', 'Something went wrong');
    }
  };

  // Memoized callback functions
  const handleTogglePin = useCallback((game) => {
    togglePinGame(game);
  }, []);

  const handleEdit = useCallback((game) => {
    openEditModal(game);
  }, []);

  const handleDelete = useCallback((gameId) => {
    handleDeleteGame(gameId);
  }, []);

  // Memoized render item function
  const renderGame = useCallback(({ item }) => (
    <GameItem
      item={item}
      theme={theme}
      onTogglePin={handleTogglePin}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onUrlFixed={fetchGames} // Pass fetchGames to trigger refresh
    />
  ), [theme, handleTogglePin, handleEdit, handleDelete, fetchGames]);

  // Memoized key extractor
  const keyExtractor = useCallback((item) => item.id, []);

  // Memoized empty component
  const emptyComponent = useMemo(() => <EmptyComponent theme={theme} />, [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}> 
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Games</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={games}
        renderItem={renderGame}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.gamesList}
        ListEmptyComponent={emptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        getItemLayout={(data, index) => ({
          length: 120, // Approximate height of each item
          offset: 120 * index,
          index,
        })}
      />

      {/* Add Game Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            
            {/* Absolute Close Icon */}
            <TouchableOpacity 
              style={styles.closeIconButton}
              onPress={() => {
                setShowAddModal(false);
                setFormData({ title: '', description: '', imageUrl: '', gameLink: '' });
              }}
            >
              <Ionicons name="close-circle-outline" size={28} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 4 }}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add New Game</Text>
              
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Game Title *"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
                
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Game Description"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
              
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Go to Game Link / URL (e.g., https://example.com)"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.gameLink}
                onChangeText={(text) => setFormData(prev => ({ ...prev, gameLink: text }))}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <TouchableOpacity style={[styles.imageButton, { borderColor: theme.colors.border }]} onPress={pickImage}>
                <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.imageButtonText, { color: theme.colors.primary }]}>
                  {formData.imageUrl ? 'Change Image' : 'Select Image * (Square recommended)'}
                </Text>
              </TouchableOpacity>
              
              {formData.imageUrl && (
                <Image source={{ uri: formData.imageUrl }} style={styles.previewImage} />
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    setShowAddModal(false);
                    setFormData({ title: '', description: '', imageUrl: '', gameLink: '' });
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.colors.primary }, loading && styles.buttonDisabled]}
                  onPress={handleAddGame}
                  disabled={loading}
                >
                  <Text style={styles.confirmButtonText}>
                    {loading ? 'Adding...' : 'Add Game'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Game Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            
            {/* Absolute Close Icon */}
            <TouchableOpacity 
              style={styles.closeIconButton}
              onPress={() => {
                setShowEditModal(false);
                setFormData({ title: '', description: '', imageUrl: '', gameLink: '' });
                setSelectedGame(null);
              }}
            >
              <Ionicons name="close-circle-outline" size={28} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 4 }}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Game</Text>
              
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Game Title *"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
              
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Game Description"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
              
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Go to Game Link / URL (e.g., https://example.com)"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.gameLink}
                onChangeText={(text) => setFormData(prev => ({ ...prev, gameLink: text }))}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <TouchableOpacity style={[styles.imageButton, { borderColor: theme.colors.border }]} onPress={pickImage}>
                <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.imageButtonText, { color: theme.colors.primary }]}>Change Image (Square recommended)</Text>
              </TouchableOpacity>
              
              {formData.imageUrl && (
                <Image source={{ uri: formData.imageUrl }} style={styles.previewImage} />
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    setShowEditModal(false);
                    setFormData({ title: '', description: '', imageUrl: '', gameLink: '' });
                    setSelectedGame(null);
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.colors.primary }, loading && styles.buttonDisabled]}
                  onPress={handleEditGame}
                  disabled={loading}
                >
                  <Text style={styles.confirmButtonText}>
                    {loading ? 'Updating...' : 'Update Game'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  gamesList: {
    padding: 16,
    paddingBottom: 48,
  },
  gameCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pinnedCard: {
    borderColor: '#FF9500',
  },
  gameCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  gameInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  pinnedBadgeInline: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pinnedTextInline: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gameDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  gameLink: {
    fontSize: 12,
    fontWeight: '500',
  },
  gameActionsLine: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
    gap: 12,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
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
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    color: '#666',
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
  closeIconButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },
}); 