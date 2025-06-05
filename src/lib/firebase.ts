import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyASFJPQXqUhyx8BTqZuKhydF0o-OIgy3Sw",
  authDomain: "okx-connector.firebaseapp.com",
  databaseURL: "https://okx-connector-default-rtdb.firebaseio.com",
  projectId: "okx-connector",
  storageBucket: "okx-connector.appspot.com", // Corrected: .appspot.com for storage bucket
  messagingSenderId: "19534665144",
  appId: "1:19534665144:web:d9735386efd46591506b4d"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
