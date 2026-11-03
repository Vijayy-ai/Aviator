import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Animated,
  ActivityIndicator,
  Alert,
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
  responsiveWidth,
  getPredictionCircleSize,
  getPredictionFontSize,
} from '../utils/responsive';
import { TC_LOTTERY_TITLE, isTcLotteryGame } from '../utils/tcLottery';

const PREDICTION_CIRCLE = getPredictionCircleSize();
const PREDICTION_FONT = getPredictionFontSize();

/** Same host the website uses for live rounds. */
const LIVE_API = 'https://atorm.duckdns.org';
const COLD_START_TIMEOUT_MS = 50000;
const POLL_TIMEOUT_MS = 12000;
const POLL_MS = 1000;
const RETRY_MS = 3000;
const DEFAULT_TELEGRAM = 'https://t.me/Aviator_Predictor_V5';

export default function PredictionScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { game } = route.params;

  // Displayed values — only updated when user taps Get Prediction (or cleared on round change)
  const [prediction, setPrediction] = useState('');
  const [predictedRound, setPredictedRound] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWaitingForData, setIsWaitingForData] = useState(false);
  const [linkStatus, setLinkStatus] = useState('connecting');
  const [telegramLink, setTelegramLink] = useState(DEFAULT_TELEGRAM);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Background sync buffer — always tracks the live site; never drives the UI alone
  const syncedRef = useRef({ round: null, crash: null, ready: false });
  const revealedRoundRef = useRef(null);
  const animTimerRef = useRef(null);
  const pullNowRef = useRef(() => {});
  const revealInFlightRef = useRef(false);

  const displayTitle = isTcLotteryGame(game?.title) ? TC_LOTTERY_TITLE : (game?.title || TC_LOTTERY_TITLE);

  useEffect(() => {
    const fetchTelegramLink = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'telegram'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.url) setTelegramLink(data.url);
        }
      } catch (error) {
      }
    };
    fetchTelegramLink();
  }, []);

  const startPredictionAnimation = (finalValueStr, roundNumber) => {
    if (animTimerRef.current) clearInterval(animTimerRef.current);
    setIsGenerating(true);
    setIsWaitingForData(false);
    setPredictedRound(`Round ${roundNumber}`);
    revealedRoundRef.current = roundNumber;

    const finalValue = parseFloat(String(finalValueStr).replace(/X/gi, ''));
    let current = 1.0;
    const steps = 15;
    const increment = (finalValue - 1.0) / steps;
    let stepCount = 0;

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 150, useNativeDriver: true }),
    ]).start();

    animTimerRef.current = setInterval(() => {
      current += increment;
      stepCount++;

      if (stepCount >= steps) {
        clearInterval(animTimerRef.current);
        animTimerRef.current = null;
        setPrediction(finalValue.toFixed(2) + 'X');
        setIsGenerating(false);
        revealInFlightRef.current = false;
      } else {
        setPrediction(current.toFixed(2) + 'X');
      }
    }, 70);
  };

  const clearDisplayedPrediction = () => {
    if (animTimerRef.current) {
      clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
    revealedRoundRef.current = null;
    revealInFlightRef.current = false;
    setIsGenerating(false);
    setIsWaitingForData(false);
    setPrediction('');
    setPredictedRound('');
  };

  // Stay on the same live engine as the website. Never advance a local round clock.
  // Sync only updates the buffer — UI reveal is controlled by Get Prediction.
  useEffect(() => {
    let cancelled = false;
    let waitTimer = null;
    let inFlight = null;

    const applyState = (state) => {
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
      setIsWaitingForData(false);

      const prevRound = syncedRef.current.round;
      syncedRef.current = {
        round: roundNumber,
        crash: crashPoint,
        ready: true,
      };

      // Round advanced: do not overwrite a revealed prediction with another round's data.
      // Clear the display so the user must tap Get Prediction for the new round.
      if (prevRound != null && prevRound !== roundNumber) {
        if (revealedRoundRef.current != null && revealedRoundRef.current !== roundNumber) {
          clearDisplayedPrediction();
        }
      }

      return true;
    };

    const pull = async () => {
      if (cancelled || inFlight) return;
      const hadLock = syncedRef.current.round != null;
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
        setLinkStatus(syncedRef.current.round != null ? 'reconnecting' : 'connecting');
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

  const handleGetPrediction = () => {
    if (revealInFlightRef.current || isGenerating) {
      return;
    }

    const snap = syncedRef.current;
    if (!snap.ready || snap.round == null || snap.crash == null) {
      setIsWaitingForData(true);
      setPrediction('');
      setPredictedRound('');
      Alert.alert(
        'Please wait',
        linkStatus === 'reconnecting'
          ? 'Reconnecting to live rounds. Try again in a moment.'
          : 'Prediction for the current round is not ready yet. Please wait for sync.'
      );
      return;
    }

    // Snapshot at click time so a mid-animation poll cannot mix rounds
    const roundNumber = snap.round;
    const crashPoint = snap.crash;
    revealInFlightRef.current = true;
    startPredictionAnimation(crashPoint.toFixed(2) + 'X', roundNumber);
  };

  const goToGame = () => {
    if (game.gameLink) {
      Linking.openURL(game.gameLink);
    } else {
      Alert.alert('Error', 'Game link not available');
    }
  };

  const handleCodeAlreadyApplied = () => {
    Alert.alert('Info', 'Code already applied', [{ text: 'OK' }]);
  };

  const showSpinner =
    isWaitingForData ||
    (linkStatus === 'connecting' && !syncedRef.current.ready && !prediction);

  // Same default as other games (GameScreen demoPrediction)
  const displayPrediction = prediction || '1.00x';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getFontSize(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{displayTitle}</Text>
        <TouchableOpacity onPress={() => pullNowRef.current()} style={styles.refreshButton}>
          <Ionicons name="refresh" size={getFontSize(24)} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

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

        {/* Same big centered 1.00x area as other games (transparent — no visible ring) */}
        <View style={styles.predictionButtonContainer}>
          <Animated.View
            style={[styles.predictionButton, { transform: [{ scale: scaleAnim }] }]}
          >
            <View style={styles.predictionButtonInner}>
              <View style={styles.predictionContent}>
                {showSpinner && !prediction ? (
                  <ActivityIndicator color="#FF6B9D" />
                ) : (
                  <Text
                    style={styles.predictionValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.45}
                  >
                    {displayPrediction}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#990000' }, isGenerating && styles.buttonDisabled]}
            onPress={handleGetPrediction}
            disabled={isGenerating}
          >
            <Ionicons name="analytics" size={getFontSize(20)} color="white" />
            <Text style={styles.actionButtonText}>
              {isGenerating ? 'Generating...' : 'Get Prediction'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
            onPress={goToGame}
          >
            <Ionicons name="game-controller" size={getFontSize(20)} color="white" />
            <Text style={styles.actionButtonText}>Go to Game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.textSecondary }]}
            onPress={handleCodeAlreadyApplied}
          >
            <Ionicons name="checkmark-circle" size={getFontSize(20)} color="white" />
            <Text style={styles.actionButtonText}>Code Already Applied</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

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
    fontSize: getFontSize(20),
    fontWeight: 'bold',
  },
  backButton: {
    padding: getSpacing(4),
  },
  refreshButton: {
    padding: getSpacing(4),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: getSpacing(20),
    paddingTop: getSpacing(20),
    paddingBottom: getSpacing(80),
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
  predictionButtonContainer: {
    alignItems: 'center',
    marginTop: getSpacing(20),
    marginBottom: getSpacing(20),
  },
  predictionButton: {
    width: PREDICTION_CIRCLE,
    height: PREDICTION_CIRCLE,
    borderRadius: PREDICTION_CIRCLE / 2,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionButtonInner: {
    width: '88%',
    height: '88%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionContent: {
    width: '100%',
    paddingHorizontal: getSpacing(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionValue: {
    width: '100%',
    fontSize: PREDICTION_FONT,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  predictionLabel: {
    fontSize: getFontSize(13),
    fontWeight: '700',
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
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: getFontSize(16),
    fontWeight: '600',
    marginLeft: getSpacing(8),
  },
  bottomSpacing: {
    height: getSpacing(20),
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
