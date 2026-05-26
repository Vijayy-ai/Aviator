import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { 
  getFontSize, 
  getSpacing, 
  getButtonHeight,
  responsiveWidth
} from '../utils/responsive';

const CustomAlert = ({ 
  visible, 
  title, 
  message, 
  buttons = [], 
  onClose 
}) => {
  const { theme } = useTheme();

  const handleButtonPress = (button) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.alertContainer, { backgroundColor: theme.colors.surface }]}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
              {message}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'destructive' && { backgroundColor: theme.colors.error },
                  button.style === 'default' && { backgroundColor: theme.colors.primary },
                  button.style === 'cancel' && { 
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: theme.colors.border
                  },
                  buttons.length === 1 && { width: '100%' },
                  buttons.length === 2 && { flex: 1, marginHorizontal: getSpacing(4) }
                ]}
                onPress={() => handleButtonPress(button)}
              >
                <Text style={[
                  styles.buttonText,
                  { 
                    color: button.style === 'cancel' ? theme.colors.text : 'white',
                    fontWeight: button.style === 'destructive' ? '600' : '500'
                  }
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getSpacing(20),
  },
  alertContainer: {
    borderRadius: getSpacing(16),
    padding: getSpacing(24),
    width: '100%',
    maxWidth: responsiveWidth(90),
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  titleContainer: {
    marginBottom: getSpacing(16),
  },
  title: {
    fontSize: getFontSize(20),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: getSpacing(24),
  },
  message: {
    fontSize: getFontSize(16),
    lineHeight: getFontSize(24),
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: getSpacing(12),
    paddingHorizontal: getSpacing(20),
    borderRadius: getSpacing(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getButtonHeight(),
  },
  buttonText: {
    fontSize: getFontSize(16),
    fontWeight: '500',
  },
});

export default CustomAlert;
