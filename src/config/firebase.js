import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDRCS28cw4PzzyAJWYGKi36pTe7xmUdhnI",
    authDomain: "sms-ffb71.firebaseapp.com",
    projectId: "sms-ffb71",
    storageBucket: "sms-ffb71.firebasestorage.app",
    messagingSenderId: "577829696970",
    appId: "1:577829696970:web:a9c6f102d28945b7158b33",
    measurementId: "G-M4CTR92SQR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export default app;

