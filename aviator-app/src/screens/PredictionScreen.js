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
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../theme/ThemeContext';
import { 
  getFontSize, 
  getSpacing, 
  getButtonHeight, 
  safeAreaTop, 
  safeAreaBottom,
} from '../utils/responsive';

/** Same host the website uses for live rounds. */
const LIVE_API = 'https://aviator-fcon.onrender.com';
const COLD_START_TIMEOUT_MS = 50000;
const POLL_TIMEOUT_MS = 12000;
const POLL_MS = 1000;
const RETRY_MS = 3000;
const DEFAULT_TELEGRAM = 'https://t.me/Aviator_Predictor_V5';

export default function PredictionScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { game } = route.params;

  const [prediction, setPrediction] = useState('—');
  const [predictedRound, setPredictedRound] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkStatus, setLinkStatus] = useState('connecting');
  const [telegramLink, setTelegramLink] = useState(DEFAULT_TELEGRAM);
  const [scaleAnim] = useState(new Animated.Value(1));

  const lastRoundRef = useRef(null);
  const animTimerRef = useRef(null);
  const pullNowRef = useRef(() => {});

  useEffect(() => {
    const fetchTelegramLink = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'telegram'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.url) setTelegramLink(data.url);
        }
      } catch (error) {
        console.log('Error fetching telegram link on PredictionScreen:', error);
      }
    };
    fetchTelegramLink();
  }, []);

  const startPredictionAnimation = (finalValueStr) => {
    if (animTimerRef.current) clearInterval(animTimerRef.current);
    setIsGenerating(true);
    const finalValue = parseFloat(finalValueStr.replace('X', ''));
    let current = 1.00;
    const steps = 15;
    const increment = (finalValue - 1.00) / steps;
    let stepCount = 0;

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 150, useNativeDriver: true })
    ]).start();

    animTimerRef.current = setInterval(() => {
      current += increment;
      stepCount++;

      if (stepCount >= steps) {
        clearInterval(animTimerRef.current);
        animTimerRef.current = null;
        setPrediction(finalValue.toFixed(2) + 'X');
        setIsGenerating(false);
      } else {
        setPrediction(current.toFixed(2) + 'X');
      }
    }, 70);
  };

  // Stay on the same live engine as the website. Never advance a local round clock.
  useEffect(() => {
    let cancelled = false;
    let waitTimer = null;
    let inFlight = null;

    const applyState = (state) => {
      // Same round as web: when round 5 starts (waiting buffer / live), show round 5.
      // After it crashes, when round 6's start buffer begins, then show round 6.
      // Never jump ahead to next-next while the current round is still playing.
      const roundNumber = Number(state.round_number);
      const crashPoint = Number(
        state.status === 'crashed' && state.crash_point != null
          ? state.crash_point
          : state.current_crash_point
      );
      if (!Number.isFinite(roundNumber) || !Number.isFinite(crashPoint) || crashPoint <= 0) {
        return false;
      }

      setLinkStatus('live');
      if (lastRoundRef.current !== roundNumber) {
        lastRoundRef.current = roundNumber;
        setPredictedRound(`Round ${roundNumber}`);
        startPredictionAnimation(crashPoint.toFixed(2) + 'X');
      }
      return true;
    };

    const pull = async () => {
      if (cancelled || inFlight) return;
      const hadLock = lastRoundRef.current != null;
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        hadLock ? POLL_TIMEOUT_MS : COLD_START_TIMEOUT_MS
      );
      inFlight = controller;

      try {
        const response = await fetch(`${LIVE_API}/api/game/preview-state/`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`status ${response.status}`);
        const data = await response.json();
        if (cancelled) return;
        if (!data?.state || !applyState(data.state)) throw new Error('preview empty');
        waitTimer = setTimeout(pull, POLL_MS);
      } catch (err) {
        clearTimeout(timeoutId);
        const abortedForRefresh = err?.name === 'AbortError' && inFlight !== controller;
        if (cancelled || abortedForRefresh) return;
        setLinkStatus(lastRoundRef.current != null ? 'reconnecting' : 'connecting');
        waitTimer = setTimeout(pull, RETRY_MS);
      } finally {
        if (inFlight === controller) inFlight = null;
      }
    };

    pullNowRef.current = () => {
      if (waitTimer) clearTimeout(waitTimer);
      if (inFlight) {
        inFlight.abort();
        inFlight = null;
      }
      pull();
    };

    pull();

    return () => {
      cancelled = true;
      if (waitTimer) clearTimeout(waitTimer);
      if (inFlight) inFlight.abort();
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, []);

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
        <TouchableOpacity onPress={() => pullNowRef.current()} style={styles.refreshButton}>
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
          <View style={[styles.greenDot, linkStatus !== 'live' && styles.waitingDot]} />
          <Text style={[styles.liveIndicatorText, linkStatus !== 'live' && styles.waitingText]}>
            {linkStatus === 'live' ? 'LIVE PREDICTION' : linkStatus === 'reconnecting' ? 'RECONNECTING' : 'CONNECTING'}
          </Text>
        </View>

        {/* Circular Live Sync Display */}
        <View style={styles.predictionButtonContainer}>
          <Animated.View style={[styles.predictionButton, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.predictionButtonInner}>
              <View style={styles.predictionContent}>
                {linkStatus === 'connecting' && prediction === '—' ? (
                  <ActivityIndicator color="#FF6B9D" />
                ) : (
                  <Text style={[styles.predictionValue, { color: theme.colors.text }]}>
                    {prediction}
                  </Text>
                )}
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
        <TouchableOpacity style={styles.telegramButton} onPress={() => Linking.openURL(telegramLink)}>
          <Text style={[styles.telegramText, { color: theme.colors.text }]}>Join our telegram</Text>
          <Text style={[styles.telegramLink, { color: '#FF6B9D' }]}>{telegramLink}</Text>
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
  waitingDot: {
    backgroundColor: '#FF9F0A',
  },
  liveIndicatorText: {
    color: '#34C759',
    fontSize: getFontSize(12),
    fontWeight: '900',
    letterSpacing: 1.0,
  },
  waitingText: {
    color: '#FF9F0A',
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
