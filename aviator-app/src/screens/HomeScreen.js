import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, orderBy, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ADMIN_EMAIL, ADMIN_EMAILS } from '../config/constants';
import { addAllGames } from '../utils/addGames';
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



export default function HomeScreen({ navigation }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [games, setGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  

  
  const isAdmin = ADMIN_EMAILS.includes(auth.currentUser?.email);

  // Filter games based on search query
  const filterGames = (query) => {
    if (!query.trim()) {
      setFilteredGames(games);
      return;
    }
    
    const filtered = games.filter(game => 
      game.title.toLowerCase().includes(query.toLowerCase()) ||
      (game.description && game.description.toLowerCase().includes(query.toLowerCase()))
    );
    setFilteredGames(filtered);
  };

  // Update filtered games when games or search query changes
  useEffect(() => {
    filterGames(searchQuery);
  }, [games, searchQuery]);

  const fetchGames = async () => {
    try {
      const gamesQuery = query(
        collection(db, 'games'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(gamesQuery);
      let gamesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Auto-create Aviator game if it is missing
      const hasAviator = gamesData.some(game => game.title && game.title.toLowerCase() === 'aviator');
      if (!hasAviator) {
        try {
          console.log('Aviator game not found, auto-creating in Firestore...');
          const newAviatorGame = {
            title: "Aviator",
            description: "Live AI-powered auto prediction for Aviator game",
            imageUrl: "assets/icon.png",
            gameLink: "https://1winonline.in/",
            isPinned: true,
            createdAt: new Date(),
            adminPredictions: []
          };
          const docRef = await addDoc(collection(db, 'games'), newAviatorGame);
          gamesData.push({
            id: docRef.id,
            ...newAviatorGame
          });
          console.log('Aviator game created successfully!');
        } catch (createErr) {
          console.error('Failed to auto-create Aviator game:', createErr);
        }
      }

      // Sort: Pinned (Trending) games sorted alphabetically at the top,
      // followed by Non-Pinned games sorted alphabetically below them.
      const sortedGames = gamesData.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        const titleA = (a.title || '').trim().toLowerCase();
        const titleB = (b.title || '').trim().toLowerCase();
        return titleA.localeCompare(titleB);
      });
      setGames(sortedGames);
    } catch (error) {
      console.error('Error fetching games:', error);
      
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'Failed to load games. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Access denied. Please contact admin.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Loading Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGames();
  };

  const handleAddGames = async () => {
    Alert.alert(
      'Add Games',
      'Add all 45 hacks to database?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            try {
              await addAllGames();
              fetchGames();
              Alert.alert('Success', 'Hacks added successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to add hacks');
            }
          },
        },
      ]
    );
  };

  const getImageSource = (title, imageUrl) => {
    if (title && title.toLowerCase() === 'aviator') {
      return require('../../assets/icon.png');
    }
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      return { uri: imageUrl };
    }
    return require('../../assets/icon.png');
  };

  const renderGame = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.gameCard, 
        { backgroundColor: theme.colors.card, shadowColor: theme.colors.cardShadow },
        item.isPinned && styles.pinnedCard
      ]}
      onPress={() => {
        if (item.title && item.title.toLowerCase() === 'aviator') {
          navigation.navigate('Prediction', { game: item });
        } else {
          navigation.navigate('Game', { game: item });
        }
      }}
    >
      {item.isPinned && (
        <View style={styles.pinnedBadge}>
          <Text style={styles.pinnedText}>🔥 Trending</Text>
        </View>
      )}
      
      <Image
        source={getImageSource(item.title, item.imageUrl)}
        style={styles.gameImage}
        resizeMode="cover"
      />
      
      <View style={styles.gameInfo}>
        <Text style={[styles.gameTitle, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.gameDescription, { color: theme.colors.textSecondary }]}>
          {item.description || 'Get predictions for this hack'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>🚀 Aviator</Text>
        <View style={styles.headerButtons}>
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
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => {
              setShowSearch(!showSearch);
              if (showSearch) {
                setSearchQuery('');
              }
            }}
          >
            <Ionicons name={showSearch ? "close" : "search"} size={getFontSize(24)} color={theme.colors.primary} />
          </TouchableOpacity>
          {isAdmin && (
            <>
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => navigation.navigate('AdminTabs')}
              >
                <Ionicons name="settings" size={getFontSize(24)} color={theme.colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <Ionicons name="search" size={getFontSize(20)} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search games..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text)}
              autoFocus={true}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={getFontSize(20)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={filteredGames}
        renderItem={renderGame}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.gamesList}
        numColumns={isTablet ? 4 : isLargeDevice ? 3 : isMediumDevice ? 3 : 2}
        columnWrapperStyle={styles.gameRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {loading ? 'Loading hacks...' : searchQuery ? `No games found for "${searchQuery}"` : 'No hacks available'}
            </Text>
            {!loading && isAdmin && !searchQuery && (
              <View style={styles.adminButtons}>
                <TouchableOpacity style={styles.addGamesButton} onPress={handleAddGames}>
                  <Text style={styles.addGamesButtonText}>Add All Hacks</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
      />
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeButton: {
    marginRight: getSpacing(15),
    padding: getSpacing(8),
  },
  searchButton: {
    marginRight: getSpacing(15),
    padding: getSpacing(8),
  },
  adminButton: {
    padding: getSpacing(8),
  },
  searchContainer: {
    paddingHorizontal: getSpacing(20),
    paddingVertical: getSpacing(16),
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: getSpacing(12),
    paddingHorizontal: getSpacing(16),
    paddingVertical: getSpacing(12),
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: getSpacing(12),
  },
  searchInput: {
    flex: 1,
    fontSize: getFontSize(16),
    paddingVertical: 0,
  },
  gamesList: {
    padding: getSpacing(16),
  },
  gameRow: {
    justifyContent: 'space-between',
    marginBottom: getSpacing(16),
  },
  gameCard: {
    borderRadius: getSpacing(12),
    padding: getSpacing(12),
    width: isTablet 
      ? (Dimensions.get('window').width - getSpacing(80)) / 4
      : isLargeDevice 
        ? (Dimensions.get('window').width - getSpacing(64)) / 3
        : isMediumDevice 
          ? (Dimensions.get('window').width - getSpacing(64)) / 3
          : (Dimensions.get('window').width - getSpacing(48)) / 2,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pinnedCard: {
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  pinnedBadge: {
    position: 'absolute',
    top: -getSpacing(8),
    left: getSpacing(16),
    backgroundColor: '#FF9500',
    paddingHorizontal: getSpacing(8),
    paddingVertical: getSpacing(4),
    borderRadius: getSpacing(12),
    zIndex: 1,
  },
  pinnedText: {
    color: 'white',
    fontSize: getFontSize(12),
    fontWeight: '600',
  },
  gameImage: {
    width: responsiveWidth(isTablet ? 12 : isLargeDevice ? 15 : isMediumDevice ? 15 : 18),
    height: responsiveWidth(isTablet ? 12 : isLargeDevice ? 15 : isMediumDevice ? 15 : 18),
    borderRadius: getSpacing(8),
    marginBottom: getSpacing(8),
  },
  gameInfo: {
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: getFontSize(14),
    fontWeight: '600',
    marginBottom: getSpacing(4),
    textAlign: 'center',
  },
  gameDescription: {
    fontSize: getFontSize(12),
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getSpacing(60),
  },
  emptyText: {
    fontSize: getFontSize(16),
    textAlign: 'center',
  },
  addGamesButton: {
    backgroundColor: '#34C759',
    paddingVertical: getSpacing(12),
    paddingHorizontal: getSpacing(20),
    borderRadius: getSpacing(8),
    marginTop: getSpacing(16),
  },
  addGamesButtonText: {
    color: 'white',
    fontSize: getFontSize(14),
    fontWeight: '600',
    textAlign: 'center',
  },
  adminButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: getSpacing(20),
  },
}); 