import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Linking,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import CustomAlert from '../components/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function GameScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { game } = route.params;
  const [isActivated, setIsActivated] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isAdminActivated, setIsAdminActivated] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [rotationAnim] = useState(new Animated.Value(0));
  
  // Custom Alert State
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: []
  });

  useEffect(() => {
    checkActivationStatus();
    checkPendingStatus();
    // startContinuousRotation(); // Commented out to stop rotation
  }, []);

  const startContinuousRotation = () => {
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  };

  const checkActivationStatus = async () => {
    try {
      const userId = auth.currentUser.uid;
      const activationQuery = query(
        collection(db, 'activatedGames'),
        where('userId', '==', userId),
        where('gameId', '==', game.id)
      );
      const querySnapshot = await getDocs(activationQuery);
      
      if (!querySnapshot.empty) {
        const activation = querySnapshot.docs[0].data();
        
        // Check if the original code still exists and is valid
        if (activation.codeId) {
          try {
            const codeDoc = await getDoc(doc(db, 'codes', activation.codeId));
            if (!codeDoc.exists()) {
              console.log('Code deleted, deactivating game');
              // Code was deleted, deactivate the game
              await deleteDoc(doc(db, 'activatedGames', querySnapshot.docs[0].id));
              setIsActivated(false);
              setIsAdminActivated(false);
              return;
            }
            
            // Code exists, check if it's an admin code
            const codeData = codeDoc.data();
            const isAdminCode = codeData.isAdminCode || false;
            setIsAdminActivated(isAdminCode);
            console.log('Code type check:', { isAdminCode, codeData });
          } catch (error) {
            console.error('Error checking code status:', error);
            // If we can't verify the code, deactivate for safety
            await deleteDoc(doc(db, 'activatedGames', querySnapshot.docs[0].id));
            setIsActivated(false);
            setIsAdminActivated(false);
            return;
          }
        } else {
          // No codeId, assume it's not an admin code
          setIsAdminActivated(false);
        }
        
        setIsActivated(true);
        console.log('Game activated:', activation);
      } else {
        setIsActivated(false);
        setIsAdminActivated(false);
        console.log('Game not activated');
      }
    } catch (error) {
      console.error('Error checking activation status:', error);
      setIsActivated(false);
      setIsAdminActivated(false);
    }
  };

  const checkPendingStatus = async () => {
    try {
      const userId = auth.currentUser.uid;
      const pendingQuery = query(
        collection(db, 'pendingActivations'),
        where('userId', '==', userId),
        where('gameId', '==', game.id),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(pendingQuery);
      
      if (!querySnapshot.empty) {
        setIsPending(true);
        console.log('Found pending activation for this game');
      } else {
        setIsPending(false);
      }
    } catch (error) {
      console.error('Error checking pending status:', error);
      setIsPending(false);
    }
  };

  const handleActivation = async () => {
    if (!activationCode.trim()) {
      showCustomAlert('Error', 'Please enter an activation code', [
        { text: 'OK', style: 'default' }
      ]);
      return;
    }

    setLoading(true);
    try {
      // Check if code exists and is valid
      const codesQuery = query(
        collection(db, 'codes'),
        where('code', '==', activationCode.trim()),
        where('gameId', '==', game.id)
      );
      const querySnapshot = await getDocs(codesQuery);
      
      // Get all codes (no expiry check needed)
      const validCodes = querySnapshot.docs;

      if (validCodes.length === 0) {
        showCustomAlert('Error', 'Invalid or expired activation code', [
          { text: 'OK', style: 'default' }
        ]);
        return;
      }

      const codeDoc = validCodes[0];
      const codeData = codeDoc.data();

      // Check if code is already used
      if (codeData.isUsed) {
        showCustomAlert('Error', 'This code has already been used. Codes can only be used once.', [
          { text: 'OK', style: 'default' }
        ]);
        return;
      }

      // Check if already pending approval (for regular codes)
      const userId = auth.currentUser.uid;
      if (!codeData.isAdminCode) {
        const pendingQuery = query(
          collection(db, 'pendingActivations'),
          where('userId', '==', userId),
          where('gameId', '==', game.id),
          where('codeId', '==', codeDoc.id)
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        
        if (!pendingSnapshot.empty) {
          showCustomAlert('Already Pending', 'This code is already waiting for admin approval', [
            { text: 'OK', style: 'default' }
          ]);
          return;
        }
      }

      // Mark code as used immediately
      await updateDoc(doc(db, 'codes', codeDoc.id), {
        isUsed: true,
        usedBy: userId,
        usedAt: new Date()
      });

      // Check if it's an admin code - activate instantly
      if (codeData.isAdminCode) {
        // Activate game instantly for admin codes
        await addDoc(collection(db, 'activatedGames'), {
          userId,
          gameId: game.id,
          codeId: codeDoc.id,
          isAdminCode: true,
          activatedAt: new Date(),
          predictionIndex: 0
        });

        console.log(`Admin code activated instantly for ${game.title} by user ${userId}`);
        setShowActivationModal(false);
        setActivationCode('');
        setIsActivated(true);
        showCustomAlert(
          'Hack Connected Successfully!', 
          'You can now get predictions for this hack.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        // Save pending activation for regular codes (admin approval required)
        const pendingActivation = {
          userId,
          gameId: game.id,
          codeId: codeDoc.id,
          code: activationCode.trim(),
          isAdminCode: false,
          requestedAt: new Date(),
          status: 'pending'
        };
        
        console.log('Saving pending activation:', pendingActivation);
        await addDoc(collection(db, 'pendingActivations'), pendingActivation);

        console.log(`Pending activation request for ${game.title} by user ${userId}`);
        setShowActivationModal(false);
        setActivationCode('');
        setIsPending(true);
        showCustomAlert(
          'Your code is not activated', 
          'The activation code you have entered is not activated so please contact the admin and get this code activated through the software',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Activation error:', error);
      
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'Failed to submit activation request. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Access denied. Please contact admin.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      showCustomAlert('Activation Error', errorMessage, [
        { text: 'OK', style: 'default' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPrediction = () => {
    const random = Math.random();
    
    // 70% chance for 1.00X - 3.00X range
    if (random < 0.7) {
      const baseMultiplier = 1.00 + (Math.random() * 2.00); // 1.00 to 3.00
      return baseMultiplier.toFixed(2) + 'X';
    }
    // 20% chance for 3.00X - 8.00X range
    else if (random < 0.9) {
      const baseMultiplier = 3.00 + (Math.random() * 5.00); // 3.00 to 8.00
      return baseMultiplier.toFixed(2) + 'X';
    }
    // 10% chance for 8.00X - 20.00X range
    else {
      const baseMultiplier = 8.00 + (Math.random() * 12.00); // 8.00 to 20.00
      return baseMultiplier.toFixed(2) + 'X';
    }
  };

  const startPredictionAnimation = (finalPrediction) => {
    setIsGenerating(true);
    
    // Extract the numeric value from prediction (e.g., "2.50X" -> 2.50)
    const finalValue = parseFloat(finalPrediction.replace('X', ''));
    
    // Start from 1.00 and animate to final value
    let currentValue = 1.00;
    const increment = (finalValue - 1.00) / 20; // 20 steps
    const interval = 100; // 100ms per step
    
    const animationInterval = setInterval(() => {
      currentValue += increment;
      
      if (currentValue >= finalValue) {
        currentValue = finalValue;
        clearInterval(animationInterval);
        setIsGenerating(false);
      }
      
      setPrediction(currentValue.toFixed(2) + 'X');
    }, interval);
  };

  const showPrediction = async () => {
    try {
      const userId = auth.currentUser.uid;
      const activationQuery = query(
        collection(db, 'activatedGames'),
        where('userId', '==', userId),
        where('gameId', '==', game.id)
      );
      const querySnapshot = await getDocs(activationQuery);
      
      if (querySnapshot.empty) {
        showCustomAlert('Error', 'Hack not activated. Please activate with admin code first.', [
          { text: 'OK', style: 'default' }
        ]);
        return;
      }

      const activation = querySnapshot.docs[0].data();
      
      // Check if the original code still exists
      if (activation.codeId) {
        try {
          const codeDoc = await getDoc(doc(db, 'codes', activation.codeId));
          if (!codeDoc.exists()) {
            showCustomAlert('Code Deleted', 'The activation code has been deleted by admin. Predictions are locked.', [
              { text: 'OK', style: 'default' }
            ]);
            return;
          }
        } catch (error) {
          console.error('Error checking code status:', error);
          showCustomAlert('Code Error', 'Unable to verify code status. Please contact admin.', [
            { text: 'OK', style: 'default' }
          ]);
          return;
        }
      }
      
      // Check if it's an admin code for sequential predictions
      if (activation.isAdminCode && activation.gameId === game.id) {
        // Get admin predictions for THIS specific game
        const gameDoc = await getDoc(doc(db, 'games', game.id));
        const gameData = gameDoc.data();
        const predictions = gameData.adminPredictions || [];
        
        if (predictions.length > 0) {
          // Use sequential prediction instead of random
          const currentIndex = activation.predictionIndex || 0;
          const prediction = predictions[currentIndex % predictions.length];
          
          // Update the prediction index for next time
          await updateDoc(doc(db, 'activatedGames', querySnapshot.docs[0].id), {
            predictionIndex: (currentIndex + 1) % predictions.length
          });
          
          // Start animation from 1.00X to final prediction
          startPredictionAnimation(prediction);
        } else {
          // No admin predictions available, use random
          const randomPrediction = generateRandomPrediction();
          startPredictionAnimation(randomPrediction);
        }
      } else {
        // For regular codes, use random prediction
        const randomPrediction = generateRandomPrediction();
        startPredictionAnimation(randomPrediction);
      }
    } catch (error) {
      console.error('Prediction error:', error);
      
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'Failed to get prediction. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Access denied. Please contact admin.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      showCustomAlert('Prediction Error', errorMessage, [
        { text: 'OK', style: 'default' }
      ]);
    }
  };

  const handleGetPrediction = () => {
    if (!isActivated) {
      if (isPending) {
        showCustomAlert(
          'Your code is not activated',
          'The activation code you have entered is not activated so please contact the admin and get this code activated through the software',
          [
            { text: 'OK', style: 'default' }
          ]
        );
        return;
      }
      
      showCustomAlert(
        'Aviator Predictor v5.0 is not activated!',
        'To activate Aviator predictor v5.0, it requires activation code. You will have to contact admin for activation code.\n\nTHE ACTIVATION CODE IS PAID.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Contact admin', 
            onPress: openTelegram,
            style: 'default'
          }
        ]
      );
      return;
    }

    if (isGenerating) {
      showCustomAlert('Generating', 'Please wait, prediction is being calculated...', [
        { text: 'OK', style: 'default' }
      ]);
      return;
    }

    // Start the prediction process
    showPrediction();
  };

  const openTelegram = () => {
    // Open Telegram channel
    Linking.openURL('https://t.me/Aviator_Predictor_V5');
  };

  const goToGame = () => {
    if (game.gameLink) {
      Linking.openURL(game.gameLink);
    } else {
      showCustomAlert('Error', 'Game link not available', [
        { text: 'OK', style: 'default' }
      ]);
    }
  };

  const refreshStatus = async () => {
    setIsAdminActivated(false); // Reset admin state before checking
    await checkActivationStatus();
    await checkPendingStatus();
  };

  const showCustomAlert = (title, message, buttons = []) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      buttons
    });
  };

  const hideCustomAlert = () => {
    setCustomAlert({
      visible: false,
      title: '',
      message: '',
      buttons: []
    });
  };

  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Demo prediction for always visible
  const demoPrediction = '1.00x';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={getFontSize(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{game.title}</Text>
        <TouchableOpacity onPress={refreshStatus}>
          <Ionicons name="refresh" size={getFontSize(24)} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={[styles.gameSubtitle, { color: '#990000' }]}>Aviator predictor v5.0</Text>
        <Text style={[styles.gameDescription, { color: theme.colors.textSecondary }]}>
          {game.description || 'Get AI-powered predictions for this hack'}
        </Text>

        {/* Circular Prediction Display - Always visible */}
        <View style={styles.predictionButtonContainer}>
          <Animated.View style={[
            styles.predictionButton,
            {
              backgroundColor: 'transparent',
            },
            {
              transform: [
                { scale: scaleAnim }
                // Removed rotation transform
              ]
            }
          ]}>
            <View style={styles.predictionButtonInner}>
              {isGenerating ? (
                <View style={styles.predictionContent}>
                  <Text style={[styles.predictionValue, { color: theme.colors.text }]}>{prediction}</Text>
                </View>
              ) : prediction ? (
                <View style={styles.predictionContent}>
                  <Text style={[styles.predictionValue, { color: theme.colors.text }]}>{prediction}</Text>
                </View>
              ) : (
                <View style={styles.predictionContent}>
                  <Text style={[styles.predictionValue, { color: theme.colors.text }]}>{demoPrediction}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Centered Buttons Section */}
        <View style={styles.buttonsContainer}>
          {/* Get Prediction Button - Always visible */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#990000' }]}
            onPress={handleGetPrediction}
            disabled={isGenerating}
          >
            <Ionicons name="analytics" size={getFontSize(20)} color="white" />
            <Text style={styles.actionButtonText}>
              {isGenerating ? 'Generating...' : 'Get Prediction'}
            </Text>
          </TouchableOpacity>

          {/* Go to Game Button - Always visible */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
            onPress={goToGame}
          >
            <Ionicons name="game-controller" size={getFontSize(20)} color="white" />
            <Text style={styles.actionButtonText}>Go to Game</Text>
          </TouchableOpacity>

          {/* Activate Button - Always visible */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowActivationModal(true)}
          >
            <Ionicons name="key" size={getFontSize(20)} color="white" />
            <Text style={styles.actionButtonText}>Activate Hack</Text>
          </TouchableOpacity>
        </View>



        {/* Hack Connection Message - Show when activated with normal code (not admin code) */}
        {isActivated && !isAdminActivated && (
          <View style={styles.hackConnectionNotice}>
            <Text style={[styles.hackConnectionText, { color: theme.colors.textSecondary }]}>
              If you are getting wrong predictions in Aviator Predictor v5.0 then it is because the hack app is not connected to your game.
            </Text>
            <Text style={[styles.hackConnectionText, { color: theme.colors.textSecondary }]}>
              Contact admin and get the hack connected to your game.
            </Text>
            <View style={styles.hackConnectionFooter}>
              <Text style={[styles.hackConnectionPaid, { color: theme.colors.error, fontWeight: 'bold' }]}>
                THIS PROCESS IS PAID.
              </Text>
              <TouchableOpacity 
                style={[styles.contactAdminButton, { backgroundColor: theme.colors.primary }]}
                onPress={openTelegram}
              >
                <Text style={styles.contactAdminButtonText}>Contact admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Activation Status */}
        {!isActivated && !isPending && (
          <View style={styles.activationNotice}>
            <Ionicons name="information-circle" size={getFontSize(20)} color={theme.colors.warning} />
            <Text style={[styles.activationText, { color: theme.colors.textSecondary }]}>
              Activate this hack to get predictions
            </Text>
          </View>
        )}

        {/* Pending Status */}
        {!isActivated && isPending && (
          <View style={styles.pendingNotice}>
            <Ionicons name="time-outline" size={getFontSize(20)} color={theme.colors.warning} />
            <Text style={[styles.pendingText, { color: theme.colors.textSecondary }]}>
              Your activation request is pending approval from admin. Please wait.
            </Text>
          </View>
        )}

        {/* Bottom spacing for telegram section */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Join Telegram Link at Bottom - Fixed Position */}
      <View style={[styles.telegramContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.telegramButton}
          onPress={openTelegram}
        >
          <Text style={[styles.telegramText, { color: theme.colors.text }]}>Join our telegram</Text>
          <Text style={[styles.telegramLink, { color: '#FF6B9D' }]}>https://t.me/Aviator_Predictor_V5</Text>
        </TouchableOpacity>
      </View>

      {/* Activation Modal */}
      <Modal
        visible={showActivationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActivationModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Activate Hack</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Enter the Activation Code provided by Admin
            </Text>
            
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: theme.colors.background, 
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              placeholder="Enter activation code"
              placeholderTextColor={theme.colors.textSecondary}
              value={activationCode}
              onChangeText={setActivationCode}
              autoCapitalize="characters"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowActivationModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.colors.primary }, loading && styles.buttonDisabled]}
                onPress={handleActivation}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? 'Submitting...' : 'Activate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        onClose={hideCustomAlert}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getSpacing(20),
    paddingTop: safeAreaTop + getSpacing(20),
    paddingBottom: getSpacing(20),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: getFontSize(20),
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: getSpacing(20),
    paddingTop: getSpacing(20),
    paddingBottom: getSpacing(80), // Reduced space for telegram section
  },
  gameSubtitle: {
    fontSize: getFontSize(24),
    fontWeight: 'bold',
    marginBottom: getSpacing(16),
    marginTop: getSpacing(20),
    textAlign: 'center',
  },
  gameDescription: {
    fontSize: getFontSize(16),
    marginBottom: getSpacing(20),
    marginTop: getSpacing(10),
    lineHeight: getFontSize(22),
    textAlign: 'center',
  },
  buttonsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getSpacing(20),
    paddingBottom: getSpacing(20),
    marginTop: getSpacing(30),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getSpacing(16),
    paddingHorizontal: getSpacing(24),
    borderRadius: getSpacing(12),
    marginBottom: getSpacing(16),
    width: '100%',
    maxWidth: responsiveWidth(85),
    minHeight: getButtonHeight(),
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontSize: getFontSize(16),
    fontWeight: '600',
    marginLeft: getSpacing(8),
  },
  predictionButtonContainer: {
    alignItems: 'center',
    marginTop: getSpacing(20),
    marginBottom: getSpacing(20),
  },
  predictionButton: {
    width: responsiveWidth(45),
    height: responsiveWidth(45),
    borderRadius: responsiveWidth(22.5),
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionValue: {
    fontSize: getFontSize(52),
    fontWeight: '900',
    marginBottom: 0,
    marginTop: getSpacing(10),
  },
  predictionLabel: {
    fontSize: getFontSize(16),
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: getFontSize(12),
    fontWeight: '600',
    marginTop: getSpacing(5),
  },
  activationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: getSpacing(16),
    borderRadius: getSpacing(12),
    marginTop: getSpacing(20),
    marginHorizontal: getSpacing(20),
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  activationText: {
    fontSize: getFontSize(14),
    marginLeft: getSpacing(8),
    textAlign: 'center',
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: getSpacing(16),
    borderRadius: getSpacing(12),
    marginTop: getSpacing(20),
    marginHorizontal: getSpacing(20),
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 123, 255, 0.3)',
  },
  pendingText: {
    fontSize: getFontSize(14),
    marginLeft: getSpacing(8),
    textAlign: 'center',
  },
  contactAdminButton: {
    paddingVertical: getSpacing(8),
    paddingHorizontal: getSpacing(16),
    borderRadius: getSpacing(6),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: responsiveWidth(30),
  },
  contactAdminButtonText: {
    color: 'white',
    fontSize: getFontSize(16),
    fontWeight: '600',
    },
  hackConnectionNotice: {
    padding: getSpacing(16),
    borderRadius: getSpacing(12),
    marginTop: getSpacing(20),
    marginHorizontal: getSpacing(20),
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  hackConnectionText: {
    fontSize: getFontSize(14),
    lineHeight: getFontSize(20),
    marginBottom: getSpacing(8),
    textAlign: 'left',
  },
  hackConnectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: getSpacing(12),
    flexWrap: 'wrap',
  },
  hackConnectionPaid: {
    fontSize: getFontSize(14),
    flex: 1,
    marginRight: getSpacing(12),
  },
  contactAdminButton: {
    paddingHorizontal: getSpacing(16),
    paddingVertical: getSpacing(8),
    borderRadius: getSpacing(8),
    minWidth: responsiveWidth(30),
  },
  contactAdminButtonText: {
    color: 'white',
    fontSize: getFontSize(14),
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: getSpacing(20),
  },
  telegramContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: getSpacing(12),
    paddingHorizontal: getSpacing(20),
    borderTopWidth: 1,
    alignItems: 'center',
    paddingBottom: safeAreaBottom + getSpacing(12),
  },
  telegramButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  telegramText: {
    fontSize: getFontSize(16),
    fontWeight: '600',
    marginBottom: getSpacing(2),
  },
  telegramLink: {
    fontSize: getFontSize(14),
    marginTop: getSpacing(2),
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: getSpacing(12),
    padding: getSpacing(24),
    margin: getSpacing(20),
    width: '90%',
    maxWidth: responsiveWidth(90),
  },
  modalTitle: {
    fontSize: getFontSize(20),
    fontWeight: 'bold',
    marginBottom: getSpacing(8),
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: getFontSize(14),
    marginBottom: getSpacing(20),
    textAlign: 'center',
  },
  modalInput: {
    paddingHorizontal: getSpacing(16),
    paddingVertical: getSpacing(12),
    borderRadius: getSpacing(8),
    fontSize: getFontSize(16),
    marginBottom: getSpacing(20),
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: getSpacing(12),
    borderRadius: getSpacing(8),
    alignItems: 'center',
    marginHorizontal: getSpacing(8),
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
  },
  cancelButtonText: {
    fontSize: getFontSize(16),
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: getFontSize(16),
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});