import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
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
} from '../utils/responsive';

const FEATURES = [
  {
    icon: 'hardware-chip-outline',
    title: 'AI-Based Prediction Technology',
    desc: 'AI तकनीक आधारित अनुमानित प्रेडिक्शन सिग्नल।',
  },
  {
    icon: 'timer-outline',
    title: 'Advance Crash Point Signals',
    desc: 'अनुमानित Crash Point की एडवांस जानकारी।',
  },
  {
    icon: 'link-outline',
    title: 'Game UID Connection',
    desc: 'गेम अकाउंट और प्रेडिक्टर को कनेक्ट करने की सुविधा।',
  },
  {
    icon: 'grid-outline',
    title: 'Premium User Interface',
    desc: 'आसान नेविगेशन और शानदार यूजर एक्सपीरियंस।',
  },
  {
    icon: 'moon-outline',
    title: 'Dark & Light Mode',
    desc: 'अपनी पसंद के अनुसार थीम बदलने की सुविधा।',
  },
  {
    icon: 'logo-telegram',
    title: 'Telegram Customer Support',
    desc: 'टेलीग्राम के माध्यम से कस्टमर सहायता।',
  },
];

const STEPS = [
  {
    title: 'LOGIN TO YOUR ACCOUNT',
    desc: 'सबसे पहले अपने Aviator Predictor V5.0 अकाउंट में लॉगिन करें।',
  },
  {
    title: 'PURCHASE ACTIVATION CODE',
    desc: 'लॉगिन करने के बाद अपना Activation Code खरीदें।',
  },
  {
    title: 'ENTER YOUR ACTIVATION CODE',
    desc: 'खरीदे गए कोड को ऐप में दर्ज करके अपना अकाउंट एक्टिवेट करें।',
  },
  {
    title: 'GET AI-BASED SIGNALS',
    desc: 'कोड एक्टिवेट होने के बाद उपलब्ध AI-Based Prediction Signals प्राप्त करें।',
  },
  {
    title: 'USE SIGNALS IN THE GAME',
    desc: 'मिले हुए सिग्नल की जानकारी का उपयोग करके Aviator गेम खेल सकते हैं।',
  },
];

export default function AboutScreen({ navigation }) {
  const { theme } = useTheme();
  const [telegramLink, setTelegramLink] = useState('https://t.me/Aviator_Predictor_V5');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'telegram'));
        if (snap.exists() && snap.data()?.url) {
          setTelegramLink(snap.data().url);
        }
      } catch (e) {
        console.log('Error fetching telegram on About:', e);
      }
    })();
  }, []);

  const openTelegram = () => {
    if (telegramLink) Linking.openURL(telegramLink);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={getFontSize(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>About</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <View style={[styles.logoBox, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="airplane" size={getFontSize(28)} color="#fff" />
          </View>
          <Text style={[styles.brandTitle, { color: theme.colors.text }]}>AVIATOR PREDICTOR</Text>
          <View style={[styles.versionPill, { backgroundColor: '#22c55e33', borderColor: '#22c55e' }]}>
            <Text style={styles.versionPillText}>VERSION 5.0</Text>
          </View>
          <Text style={[styles.brandSub, { color: theme.colors.primary }]}>
            AI POWERED PREDICTION SYSTEM
          </Text>
          <Text style={[styles.brandMeta, { color: theme.colors.textSecondary }]}>
            SMART TECHNOLOGY • ADVANCED SIGNALS
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={getFontSize(20)} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>ABOUT APPLICATION</Text>
          </View>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Aviator Predictor V5.0 is an AI-powered prediction application specially designed for
            the Aviator game.
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary, marginTop: getSpacing(10) }]}>
            यह एप्लीकेशन विशेष रूप से Aviator गेम के लिए तैयार किया गया है। इसमें AI-Based Prediction
            Technology के माध्यम से अनुमानित Crash Point Signals उपलब्ध कराए जाते हैं।
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: getSpacing(12) }]}>
            ADVANCED FEATURES
          </Text>
          {FEATURES.map((item) => (
            <View key={item.title} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '22' }]}>
                <Ionicons name={item.icon} size={getFontSize(18)} color={theme.colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.featureDesc, { color: theme.colors.textSecondary }]}>
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.card,
            styles.howCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.primary, marginBottom: getSpacing(14) }]}>
            HOW IT WORKS
          </Text>
          {STEPS.map((step, index) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.stepNumText}>{index + 1}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={[styles.stepTitle, { color: theme.colors.text }]}>{step.title}</Text>
                <Text style={[styles.stepDesc, { color: theme.colors.textSecondary }]}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark" size={getFontSize(20)} color="#EAB308" />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>IMPORTANT DISCLAIMER</Text>
          </View>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Aviator Predictor V5.0 Aviator game के लिए AI-based prediction signals provide करता है। आपको
            100% accurate signals मिलेंगे और 100% profit की गारंटी है। जिम्मेदारी से उपयोग करें और लागू
            कानूनों का पालन करें।
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary, marginTop: getSpacing(10) }]}>
            Aviator Predictor V5.0 provides AI-based prediction signals for the Aviator game. You will
            get 100% accurate signals with a 100% profit guarantee. Use responsibly and follow
            applicable laws.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="headset" size={getFontSize(20)} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>CUSTOMER SUPPORT</Text>
          </View>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Need help? Our Telegram Support team is available for application-related assistance.
          </Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary, marginTop: getSpacing(8) }]}>
            मदद चाहिए? एप्लिकेशन से जुड़ी सहायता के लिए हमारी Telegram Support टीम उपलब्ध है।
          </Text>

          <TouchableOpacity
            style={[styles.tgBtn, { backgroundColor: theme.colors.primary }]}
            onPress={openTelegram}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-telegram" size={getFontSize(18)} color="#fff" />
            <Text style={styles.tgBtnText}>OFFICIAL TELEGRAM SUPPORT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tgLinkBtn, { borderColor: theme.colors.primary }]}
            onPress={openTelegram}
            activeOpacity={0.85}
          >
            <Text style={[styles.tgLinkText, { color: theme.colors.primary }]} numberOfLines={1}>
              {telegramLink}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
          APPLICATION VERSION 5.0
        </Text>
        <Text style={[styles.footerCopy, { color: theme.colors.textSecondary }]}>
          © 2026 AVIATOR PREDICTOR. ALL RIGHTS RESERVED.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getSpacing(16),
    paddingTop: safeAreaTop + getSpacing(12),
    paddingBottom: getSpacing(14),
    borderBottomWidth: 1,
  },
  backBtn: { width: getSpacing(36), alignItems: 'flex-start' },
  headerTitle: { fontSize: getFontSize(18), fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: {
    padding: getSpacing(16),
    paddingBottom: getSpacing(40),
  },
  brandBlock: { alignItems: 'center', marginBottom: getSpacing(20) },
  logoBox: {
    width: getSpacing(56),
    height: getSpacing(56),
    borderRadius: getSpacing(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: getSpacing(12),
  },
  brandTitle: {
    fontSize: getFontSize(22),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  versionPill: {
    marginTop: getSpacing(8),
    paddingHorizontal: getSpacing(12),
    paddingVertical: getSpacing(4),
    borderRadius: getSpacing(20),
    borderWidth: 1,
  },
  versionPillText: {
    color: '#22c55e',
    fontSize: getFontSize(11),
    fontWeight: '700',
  },
  brandSub: {
    marginTop: getSpacing(10),
    fontSize: getFontSize(12),
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  brandMeta: {
    marginTop: getSpacing(4),
    fontSize: getFontSize(11),
  },
  card: {
    borderRadius: getSpacing(14),
    padding: getSpacing(16),
    marginBottom: getSpacing(14),
  },
  howCard: { borderWidth: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getSpacing(8),
    marginBottom: getSpacing(10),
  },
  cardTitle: { fontSize: getFontSize(14), fontWeight: '800', letterSpacing: 0.4 },
  body: { fontSize: getFontSize(13), lineHeight: getFontSize(20) },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: getSpacing(12),
  },
  featureIcon: {
    width: getSpacing(36),
    height: getSpacing(36),
    borderRadius: getSpacing(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: getSpacing(10),
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: getFontSize(14), fontWeight: '600', marginBottom: 2 },
  featureDesc: { fontSize: getFontSize(12), lineHeight: getFontSize(18) },
  stepRow: {
    flexDirection: 'row',
    marginBottom: getSpacing(14),
  },
  stepNum: {
    width: getSpacing(26),
    height: getSpacing(26),
    borderRadius: getSpacing(13),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: getSpacing(10),
    marginTop: 2,
  },
  stepNumText: { color: '#fff', fontWeight: '700', fontSize: getFontSize(12) },
  stepText: { flex: 1 },
  stepTitle: { fontSize: getFontSize(13), fontWeight: '700', marginBottom: 2 },
  stepDesc: { fontSize: getFontSize(12), lineHeight: getFontSize(18) },
  tgBtn: {
    marginTop: getSpacing(14),
    minHeight: getButtonHeight(),
    borderRadius: getSpacing(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getSpacing(8),
    paddingHorizontal: getSpacing(12),
  },
  tgBtnText: { color: '#fff', fontWeight: '700', fontSize: getFontSize(13) },
  tgLinkBtn: {
    marginTop: getSpacing(10),
    borderWidth: 1,
    borderRadius: getSpacing(10),
    paddingVertical: getSpacing(12),
    paddingHorizontal: getSpacing(12),
    alignItems: 'center',
  },
  tgLinkText: { fontSize: getFontSize(12), fontWeight: '600' },
  footer: {
    textAlign: 'center',
    fontSize: getFontSize(12),
    fontWeight: '600',
    marginTop: getSpacing(8),
  },
  footerCopy: {
    textAlign: 'center',
    fontSize: getFontSize(11),
    marginTop: getSpacing(4),
    marginBottom: getSpacing(12),
  },
});
