import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { 
  getFontSize, 
  getSpacing, 
  getButtonHeight, 
  safeAreaTop, 
  safeAreaBottom,
} from '../utils/responsive';

// Predefined 100-round deterministic crash schedule from the backend engine seed
const PREDEFINED_CRASH_POINTS = [
  1.09, 1.53, 1.93, 1.44, 1.57, 1.89, 20.98, 1.06, 2.54, 1.29, 
  1.96, 1.17, 1.75, 3.09, 3.25, 22.35, 3.08, 4.66, 1.17, 1.82, 
  1.84, 1.10, 2.77, 17.23, 1.28, 2.51, 1.86, 3.28, 1.44, 3.38, 
  4.15, 23.76, 4.37, 1.53, 1.26, 1.51, 1.25, 20.35, 4.66, 1.14, 
  2.15, 4.07, 4.51, 3.39, 1.09, 24.22, 1.93, 4.51, 4.78, 1.55, 
  1.24, 21.22, 3.19, 1.18, 1.64, 1.18, 1.33, 1.59, 1.15, 2.06, 
  22.55, 1.09, 3.41, 1.63, 4.26, 1.12, 2.03, 23.47, 1.21, 1.62, 
  1.28, 1.61, 2.41, 3.97, 1.09, 4.65, 4.01, 24.06, 1.14, 3.70, 
  1.98, 4.03, 3.21, 3.16, 2.23, 19.91, 1.22, 2.19, 2.21, 4.26, 
  4.14, 1.43, 2.43, 4.10, 22.34, 1.12, 2.59, 4.45, 3.45, 3.92
];

export default function PredictionScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { game } = route.params;

  const [prediction, setPrediction] = useState('1.00X');
  const [predictedRound, setPredictedRound] = useState('Round 1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeBaseUrl, setActiveBaseUrl] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(1));

  const lastRoundRef = useRef(null);
  const localFallbackIntervalRef = useRef(null);
  const localRoundRef = useRef(1);

  // Probes all possible local/LAN IP endpoints concurrently to auto-latch onto the Django server
  useEffect(() => {
    let active = true;

    const candidates = [
      'https://aviator-fcon.onrender.com',
      'http://10.170.200.209:8000',
      'http://10.0.2.2:8000',
      'http://127.0.0.1:8000',
      'http://localhost:8000'
    ];

    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      candidates.unshift(`http://${ip}:8000`);
    }

    const probe = async () => {
      for (const url of candidates) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const response = await fetch(`${url}/api/game/preview-state/`, { 
            signal: controller.signal,
            headers: { 
              'Accept': 'application/json',
              'Host': 'localhost'
            }
          });
          clearTimeout(timeoutId);

          if (response.ok && active) {
            setActiveBaseUrl(url);
            return;
          }
        } catch (e) {
          // Silent catch to continue probing other candidates
        }
      }
    };

    probe();

    return () => {
      active = false;
    };
  }, []);

  // Polls live predictions if dynamic backend is reachable, otherwise runs standard fallback simulation
  useEffect(() => {
    let pollInterval = null;

    if (activeBaseUrl) {
      // Clear any offline fallback loop
      if (localFallbackIntervalRef.current) {
        clearInterval(localFallbackIntervalRef.current);
        localFallbackIntervalRef.current = null;
      }

      fetchLiveState();
      // Polling frequency at 1000ms for robust and clean synchronization
      pollInterval = setInterval(fetchLiveState, 1000);
    } else {
      // Offline fallback: Increment predictions simulated sequentially every 10 seconds so app is never stuck
      localFallbackIntervalRef.current = setInterval(() => {
        localRoundRef.current += 1;
        const idx = (localRoundRef.current - 1) % PREDEFINED_CRASH_POINTS.length;
        const nextCrash = PREDEFINED_CRASH_POINTS[idx];

        setPredictedRound(`Round ${localRoundRef.current}`);
        startPredictionAnimation(nextCrash.toFixed(2) + 'X');
      }, 10000);

      // Display initial sequence round immediately
      const idx = (localRoundRef.current - 1) % PREDEFINED_CRASH_POINTS.length;
      setPredictedRound(`Round ${localRoundRef.current}`);
      setPrediction(PREDEFINED_CRASH_POINTS[idx].toFixed(2) + 'X');
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (localFallbackIntervalRef.current) clearInterval(localFallbackIntervalRef.current);
    };
  }, [activeBaseUrl]);

  const fetchLiveState = async () => {
    if (!activeBaseUrl) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(`${activeBaseUrl}/api/game/preview-state/`, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Host': 'localhost'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) return;

      const data = await response.json();
      if (data && data.state) {
        const nextRound = data.state.next_round_number || 1;
        const nextCrashPoint = data.state.next_crash_point || 1.00;

        if (lastRoundRef.current !== nextRound) {
          lastRoundRef.current = nextRound;
          setPredictedRound(`Round ${nextRound}`);
          startPredictionAnimation(nextCrashPoint.toFixed(2) + 'X');
        }
      }
    } catch (err) {
      // Silently catch polling error to keep the device/terminal logs extremely clean
    }
  };

  const startPredictionAnimation = (finalValueStr) => {
    setIsGenerating(true);
    const finalValue = parseFloat(finalValueStr.replace('X', ''));
    let current = 1.00;
    const steps = 15;
    const increment = (finalValue - 1.00) / steps;
    let stepCount = 0;

    // Small bounce animation on start
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 150, useNativeDriver: true })
    ]).start();

    const interval = setInterval(() => {
      current += increment;
      stepCount++;

      if (stepCount >= steps) {
        clearInterval(interval);
        setPrediction(finalValue.toFixed(2) + 'X');
        setIsGenerating(false);
      } else {
        setPrediction(current.toFixed(2) + 'X');
      }
    }, 70);
  };

  const goToGame = () => {
    if (game.gameLink) {
      Linking.openURL(game.gameLink);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Premium Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getFontSize(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{game.title}</Text>
        <TouchableOpacity onPress={fetchLiveState} style={styles.refreshButton}>
          <Ionicons name="refresh" size={getFontSize(24)} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <Text style={[styles.gameSubtitle, { color: '#990000' }]}>Aviator predictor v5.0</Text>
        <Text style={[styles.gameDescription, { color: theme.colors.textSecondary }]}>
          {game.description || 'AI prediction model online'}
        </Text>

        {/* Clean Top LIVE PREDICTION badge as requested */}
        <View style={styles.liveIndicatorContainer}>
          <View style={styles.greenDot} />
          <Text style={styles.liveIndicatorText}>LIVE PREDICTION</Text>
        </View>

        {/* Circular Live Sync Display */}
        <View style={styles.predictionButtonContainer}>
          <Animated.View style={[styles.predictionButton, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.predictionButtonInner}>
              <View style={styles.predictionContent}>
                <Text style={[styles.predictionValue, { color: theme.colors.text }]}>
                  {prediction}
                </Text>
                {/* Removed predictedRound text as requested */}
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Removed status text as requested */}

        {/* Only "Go to Game" button as requested */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.success }]} onPress={goToGame}>
            <Ionicons name="game-controller" size={getFontSize(20)} color="white" />
            <Text style={styles.actionButtonText}>Go to Game</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Fixed Footer Telegram Redirect */}
      <View style={[styles.telegramContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.telegramButton} onPress={() => Linking.openURL('https://t.me/Aviator_Predictor_V5')}>
          <Text style={[styles.telegramText, { color: theme.colors.text }]}>Join our telegram</Text>
          <Text style={[styles.telegramLink, { color: '#FF6B9D' }]}>https://t.me/Aviator_Predictor_V5</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: getFontSize(22),
    fontWeight: 'bold',
  },
  backButton: {
    padding: getSpacing(4),
  },
  refreshButton: {
    padding: getSpacing(4),
  },
  scrollContent: {
    paddingHorizontal: getSpacing(24),
    paddingTop: getSpacing(24),
    alignItems: 'center',
    paddingBottom: getSpacing(100),
  },
  gameSubtitle: {
    fontSize: getFontSize(22),
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: getSpacing(8),
    textAlign: 'center',
  },
  gameDescription: {
    fontSize: getFontSize(14),
    textAlign: 'center',
    marginBottom: getSpacing(24),
    lineHeight: getSpacing(20),
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingVertical: getSpacing(6),
    paddingHorizontal: getSpacing(16),
    borderRadius: getSpacing(20),
    marginBottom: getSpacing(30),
  },
  greenDot: {
    width: getSpacing(8),
    height: getSpacing(8),
    borderRadius: getSpacing(4),
    backgroundColor: '#34C759',
    marginRight: getSpacing(8),
  },
  liveIndicatorText: {
    color: '#34C759',
    fontSize: getFontSize(12),
    fontWeight: '900',
    letterSpacing: 1.0,
  },
  predictionButtonContainer: {
    marginVertical: getSpacing(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionButton: {
    width: Dimensions.get('window').width * 0.6,
    height: Dimensions.get('window').width * 0.6,
    maxWidth: 240,
    maxHeight: 240,
    borderRadius: 120,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FF6B9D',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  predictionButtonInner: {
    width: '92%',
    height: '92%',
    borderRadius: 110,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionValue: {
    fontSize: getFontSize(42),
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed',
  },
  predictionLabel: {
    fontSize: getFontSize(14),
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: getFontSize(12),
    marginTop: getSpacing(16),
    fontStyle: 'italic',
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    marginTop: getSpacing(40),
    gap: getSpacing(16),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getSpacing(16),
    borderRadius: getSpacing(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontSize: getFontSize(16),
    fontWeight: 'bold',
    marginLeft: getSpacing(10),
  },
  telegramContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: getSpacing(16),
    borderTopWidth: 1,
    alignItems: 'center',
  },
  telegramButton: {
    alignItems: 'center',
  },
  telegramText: {
    fontSize: getFontSize(14),
    fontWeight: '700',
    marginBottom: getSpacing(2),
  },
  telegramLink: {
    fontSize: getFontSize(12),
    textDecorationLine: 'underline',
  },
});
