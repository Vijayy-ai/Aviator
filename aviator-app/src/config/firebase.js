import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyATMuW58HMWMki6-jqm9GdDKvPfmHtYKWY",
  authDomain: "batiq-875d7.firebaseapp.com",
  projectId: "batiq-875d7",
  storageBucket: "batiq-875d7.firebasestorage.app",
  messagingSenderId: "288907237599",
  appId: "1:288907237599:web:423bfd3391ffd79c42f16a",
  measurementId: "G-75H9RKNBTB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 