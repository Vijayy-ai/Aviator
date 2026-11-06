import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getFontSize,
  getSpacing,
  getButtonHeight,
  responsiveWidth,
} from '../utils/responsive';

/**
 * Gate modal when Get Prediction is tapped but hack is not fully activated.
 * variant: 'locked'  = before code apply → Get Prediction Access
 *          'pending' = after code apply, waiting admin → User Not Verified
 */
export default function PredictionAccessModal({
  visible,
  variant = 'locked',
  onClose,
  onContactAdmin,
  onPrimaryAction,
}) {
  const isPending = variant === 'pending';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* key=variant: never morph locked→pending in the same open */}
        <View style={[styles.card, isPending && styles.cardPending]} key={variant}>
          {visible ? (
            isPending ? (
              <PendingContent
                onClose={onClose}
                onContactAdmin={onContactAdmin}
              />
            ) : (
              <LockedContent
                onClose={onClose}
                onContactAdmin={onContactAdmin}
                onPrimaryAction={onPrimaryAction}
              />
            )
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function LockedContent({ onClose, onContactAdmin, onPrimaryAction }) {
  const steps = [
    {
      icon: 'paper-plane',
      iconColor: '#2AABEE',
      textParts: [
        { text: 'Contact our Admin on ', bold: false },
        { text: 'Telegram', bold: true },
        { text: '.', bold: false },
      ],
    },
    {
      icon: 'ticket',
      iconColor: '#EAB308',
      textParts: [
        { text: 'Purchase your ', bold: false },
        { text: 'Activation Code', bold: true },
        { text: '.', bold: false },
      ],
    },
    {
      icon: 'checkmark-circle',
      iconColor: '#22C55E',
      textParts: [
        { text: 'Enter the code in the app to start ', bold: false },
        { text: 'Predictions', bold: true },
        { text: '.', bold: false },
      ],
    },
  ];

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.badgeWrap}>
          <View style={styles.laurelLeft}>
            <Ionicons name="leaf" size={getFontSize(22)} color="#F87171" />
          </View>
          <View style={styles.shield}>
            <Ionicons name="shield" size={getFontSize(56)} color="#DC2626" />
            <Ionicons
              name="lock-closed"
              size={getFontSize(24)}
              color="#FACC15"
              style={styles.lockIcon}
            />
          </View>
          <View style={styles.laurelRight}>
            <Ionicons name="leaf" size={getFontSize(22)} color="#F87171" />
          </View>
        </View>

        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>Get Prediction Access!</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            To start using the prediction feature, you need a{' '}
            <Text style={styles.infoHighlight}>Paid Activation Code</Text>.
          </Text>
        </View>

        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                {index < steps.length - 1 ? <View style={styles.stepLine} /> : null}
              </View>
              <View style={styles.stepIconWrap}>
                <Ionicons
                  name={step.icon}
                  size={getFontSize(18)}
                  color={step.iconColor}
                />
              </View>
              <Text style={styles.stepText}>
                {step.textParts.map((part, i) => (
                  <Text key={i} style={part.bold ? styles.stepBold : undefined}>
                    {part.text}
                  </Text>
                ))}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.promoChip}
          onPress={onPrimaryAction || onContactAdmin}
          activeOpacity={0.85}
        >
          <View style={styles.promoInner}>
            <Ionicons name="key" size={getFontSize(15)} color="#DC2626" />
            <Text style={styles.promoText}>
              Enter Activation Code to Unlock Predictions!
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactBtnGreen} onPress={onContactAdmin}>
          <Ionicons name="paper-plane" size={getFontSize(16)} color="#FFFFFF" />
          <Text style={styles.contactText}>Contact Admin on Telegram</Text>
          <Ionicons name="arrow-forward" size={getFontSize(16)} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

function PendingContent({ onClose, onContactAdmin }) {
  return (
    <>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
        <Ionicons name="close" size={getFontSize(18)} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.userBadge}>
          <View style={styles.userCircle}>
            <Ionicons name="person" size={getFontSize(36)} color="#FFFFFF" />
          </View>
          <View style={styles.verifyBadge}>
            <Ionicons name="checkmark-circle" size={getFontSize(22)} color="#FACC15" />
          </View>
        </View>

        <Text style={styles.pendingTitle}>
          User Not <Text style={styles.pendingTitleAccent}>Verified!</Text>
        </Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>Your account is not verified yet.</Text>
        </View>

        <View style={styles.pendingRow}>
          <View style={[styles.pendingIconBox, { backgroundColor: 'rgba(42, 171, 238, 0.2)' }]}>
            <Ionicons name="paper-plane" size={getFontSize(20)} color="#2AABEE" />
          </View>
          <Text style={styles.pendingBody}>
            To unlock the prediction feature, please contact our Admin on{' '}
            <Text style={styles.telegramLink}>Telegram</Text> to complete your account
            verification.
          </Text>
        </View>

        <View style={styles.pendingRow}>
          <View style={[styles.pendingIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
            <Ionicons name="shield-checkmark" size={getFontSize(20)} color="#22C55E" />
          </View>
          <Text style={styles.pendingBody}>
            Once your account is successfully verified, you can access and use the predictions.
          </Text>
        </View>

        <View style={styles.verifyBanner}>
          <Ionicons name="rocket" size={getFontSize(18)} color="#EF4444" />
          <Text style={styles.verifyBannerText}>
            Verify your account now to unlock predictions!
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactBtnBlue} onPress={onContactAdmin}>
          <Ionicons name="paper-plane" size={getFontSize(16)} color="#FFFFFF" />
          <Text style={styles.contactText}>Contact Admin</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getSpacing(16),
  },
  card: {
    width: '100%',
    maxWidth: responsiveWidth(92),
    maxHeight: '88%',
    backgroundColor: '#0B1220',
    borderRadius: getSpacing(18),
    borderWidth: 2,
    borderColor: '#3B82F6',
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  cardPending: {
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: getSpacing(10),
    right: getSpacing(10),
    zIndex: 2,
    width: getSpacing(32),
    height: getSpacing(32),
    borderRadius: getSpacing(16),
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: getSpacing(16),
    paddingTop: getSpacing(20),
    paddingBottom: getSpacing(12),
    alignItems: 'center',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: getSpacing(10),
  },
  laurelLeft: {
    transform: [{ rotate: '-25deg' }, { scaleX: -1 }],
    marginRight: getSpacing(4),
  },
  laurelRight: {
    transform: [{ rotate: '25deg' }],
    marginLeft: getSpacing(4),
  },
  shield: {
    width: getFontSize(64),
    height: getFontSize(64),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    position: 'absolute',
    top: getFontSize(20),
  },
  ribbon: {
    backgroundColor: '#DC2626',
    paddingVertical: getSpacing(8),
    paddingHorizontal: getSpacing(20),
    borderRadius: getSpacing(6),
    marginBottom: getSpacing(14),
    width: '100%',
    alignItems: 'center',
  },
  ribbonText: {
    color: '#FFFFFF',
    fontSize: getFontSize(18),
    fontWeight: '800',
    textAlign: 'center',
  },
  infoBox: {
    width: '100%',
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.45)',
    borderRadius: getSpacing(10),
    padding: getSpacing(12),
    marginBottom: getSpacing(16),
  },
  infoText: {
    color: '#E5E7EB',
    fontSize: getFontSize(14),
    lineHeight: getFontSize(20),
    textAlign: 'center',
  },
  infoHighlight: {
    color: '#FACC15',
    fontWeight: '800',
  },
  steps: {
    width: '100%',
    marginBottom: getSpacing(14),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: getSpacing(44),
  },
  stepLeft: {
    width: getSpacing(28),
    alignItems: 'center',
  },
  stepNumber: {
    width: getSpacing(22),
    height: getSpacing(22),
    borderRadius: getSpacing(11),
    backgroundColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#111827',
    fontSize: getFontSize(12),
    fontWeight: '800',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: getSpacing(18),
    marginVertical: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  stepIconWrap: {
    width: getSpacing(28),
    alignItems: 'center',
    paddingTop: getSpacing(2),
  },
  stepText: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: getFontSize(13),
    lineHeight: getFontSize(19),
    paddingBottom: getSpacing(10),
  },
  stepBold: {
    fontWeight: '800',
    color: '#FACC15',
  },
  promoChip: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    borderRadius: getSpacing(24),
    paddingVertical: getSpacing(10),
    paddingHorizontal: getSpacing(14),
    width: '100%',
    marginBottom: getSpacing(4),
  },
  promoInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getSpacing(6),
    maxWidth: '100%',
  },
  promoText: {
    color: '#111827',
    fontSize: getFontSize(12),
    fontWeight: '800',
    textAlign: 'center',
    flexShrink: 1,
  },
  userBadge: {
    width: getSpacing(72),
    height: getSpacing(72),
    marginBottom: getSpacing(14),
    marginTop: getSpacing(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCircle: {
    width: getSpacing(64),
    height: getSpacing(64),
    borderRadius: getSpacing(32),
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#0B1220',
    borderRadius: getSpacing(12),
  },
  pendingTitle: {
    color: '#FFFFFF',
    fontSize: getFontSize(24),
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: getSpacing(12),
  },
  pendingTitleAccent: {
    color: '#FACC15',
  },
  statusPill: {
    backgroundColor: '#7F1D1D',
    borderRadius: getSpacing(20),
    paddingVertical: getSpacing(8),
    paddingHorizontal: getSpacing(16),
    marginBottom: getSpacing(16),
    width: '100%',
    alignItems: 'center',
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: getFontSize(13),
    fontWeight: '700',
    textAlign: 'center',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: getSpacing(14),
    gap: getSpacing(10),
  },
  pendingIconBox: {
    width: getSpacing(36),
    height: getSpacing(36),
    borderRadius: getSpacing(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBody: {
    flex: 1,
    color: '#E5E7EB',
    fontSize: getFontSize(13),
    lineHeight: getFontSize(19),
  },
  telegramLink: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getSpacing(10),
    width: '100%',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: '#FACC15',
    borderRadius: getSpacing(12),
    paddingVertical: getSpacing(12),
    paddingHorizontal: getSpacing(14),
    marginBottom: getSpacing(4),
  },
  verifyBannerText: {
    flex: 1,
    color: '#FACC15',
    fontSize: getFontSize(13),
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    gap: getSpacing(8),
    padding: getSpacing(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.25)',
  },
  cancelBtn: {
    paddingVertical: getSpacing(12),
    paddingHorizontal: getSpacing(14),
    borderRadius: getSpacing(10),
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: getButtonHeight(),
  },
  cancelText: {
    color: '#E5E7EB',
    fontSize: getFontSize(14),
    fontWeight: '600',
  },
  contactBtnGreen: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getSpacing(6),
    backgroundColor: '#16A34A',
    borderRadius: getSpacing(10),
    paddingVertical: getSpacing(12),
    paddingHorizontal: getSpacing(10),
    minHeight: getButtonHeight(),
  },
  contactBtnBlue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getSpacing(6),
    backgroundColor: '#2563EB',
    borderRadius: getSpacing(10),
    paddingVertical: getSpacing(12),
    paddingHorizontal: getSpacing(10),
    minHeight: getButtonHeight(),
  },
  contactText: {
    color: '#FFFFFF',
    fontSize: getFontSize(12),
    fontWeight: '700',
    flexShrink: 1,
  },
});
