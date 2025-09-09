import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Device type detection
export const isSmallDevice = screenWidth < 375;
export const isMediumDevice = screenWidth >= 375 && screenWidth < 414;
export const isLargeDevice = screenWidth >= 414;
export const isTablet = screenWidth >= 768;

// Status bar height
export const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

// Safe area calculations
export const safeAreaTop = Platform.OS === 'ios' ? 44 : statusBarHeight;
export const safeAreaBottom = Platform.OS === 'ios' ? 34 : 0;

// Responsive dimensions
export const responsiveWidth = (percentage) => (screenWidth * percentage) / 100;
export const responsiveHeight = (percentage) => (screenHeight * percentage) / 100;

// Font sizes
export const getFontSize = (size) => {
  if (isSmallDevice) return size * 0.9;
  if (isMediumDevice) return size;
  if (isLargeDevice) return size * 1.1;
  if (isTablet) return size * 1.2;
  return size;
};

// Spacing
export const getSpacing = (size) => {
  if (isSmallDevice) return size * 0.8;
  if (isMediumDevice) return size;
  if (isLargeDevice) return size * 1.1;
  if (isTablet) return size * 1.3;
  return size;
};

// Button heights
export const getButtonHeight = () => {
  if (isSmallDevice) return 44;
  if (isMediumDevice) return 48;
  if (isLargeDevice) return 52;
  if (isTablet) return 56;
  return 48;
};

// Header height
export const getHeaderHeight = () => {
  return safeAreaTop + getSpacing(60);
};

// Screen dimensions
export const screenDimensions = {
  width: screenWidth,
  height: screenHeight,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isTablet,
};

// Common responsive styles
export const responsiveStyles = {
  container: {
    flex: 1,
    paddingHorizontal: getSpacing(20),
  },
  header: {
    paddingTop: safeAreaTop + getSpacing(20),
    paddingBottom: getSpacing(20),
    paddingHorizontal: getSpacing(20),
  },
  content: {
    flex: 1,
    paddingHorizontal: getSpacing(20),
    paddingBottom: getSpacing(80),
  },
  button: {
    height: getButtonHeight(),
    borderRadius: getSpacing(12),
    paddingHorizontal: getSpacing(24),
  },
  text: {
    fontSize: getFontSize(16),
  },
  title: {
    fontSize: getFontSize(20),
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: getFontSize(18),
    fontWeight: '600',
  },
};
