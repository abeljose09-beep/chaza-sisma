import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Replace these with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCz1WJFyapUcpCqq7V9S5nBkUzra47yqzk",
  authDomain: "chaza-sisma.firebaseapp.com",
  projectId: "chaza-sisma",
  storageBucket: "chaza-sisma.firebasestorage.app",
  messagingSenderId: "712339437179",
  appId: "1:712339437179:web:265a437ad49c253cd654de",
  measurementId: "G-XTVX8MYVC1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
