import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyBwzihSfSpeqw-NnJZqFmwhyzgMrhtD3yk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "chikondi-dot.firebaseapp.com",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ??
    "https://chikondi-dot-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "chikondi-dot",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "chikondi-dot.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "3831754990",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:3831754990:web:80dc28dbe51a5e71e103ff",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-1V7EVF2EY8",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
