import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { LogBox, Platform } from 'react-native';
import App from './App';

// Ignore ALL possible errors and warnings to prevent them from showing on screen
LogBox.ignoreLogs([
  'Require cycle:',
  'Non-serializable values were found in the navigation state', 
  'Setting a timer for a long period of time',
  'AsyncStorage has been extracted from react-native',
  'Firebase: Error (auth/',
  'FirebaseError: Firebase: Error (auth/',
  'Auth Error during',
  'Error during signup process:',
  'Sign up error:',
  'network-request-failed',
  'AuthError:',
  'Sign in error:',
  'Sign in error: auth/',
  'auth/invalid-credentials',
  'Invalid email or',
  'Invalid email or password',
  'VirtualizedLists should never be nested',
  'componentWillReceiveProps has been renamed',
  'componentWillMount has been renamed',
  'Failed prop type:',
  'Warning: Each child in a list should have a unique',
  'Warning: Failed prop type:',
  'Warning: componentWillMount has been renamed',
  'Warning: componentWillReceiveProps has been renamed',
  'Possible Unhandled Promise Rejection',
  'Module RNDeviceInfo requires main queue setup',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'Task orphaned for request',
  'Network request failed',
  'RCTBridge required dispatch_sync',
  'Selector unknown returned a different result',
  '[ERROR]',
  'ERROR',
  'Error:',
  'Exception:',
  'Auth Error',
  'Authentication failed',
  'Login failed', 
  'Sign up failed',
  'Password reset failed',
  'Token refresh failed',
  'Backend error',
  'API error',
  'Upload failed',
  'Download failed',
  'Cache error',
  'Storage error',
  'Database error',
  'Network error',
  'Connection timeout',
  'Request timeout'
]);

// Disable all LogBox in production for clean user experience
if (!__DEV__) {
  LogBox.ignoreAllLogs(true);
}

// Register the app
registerRootComponent(App);
