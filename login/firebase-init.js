// firebase-init.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js"; // 👈 Add this

const firebaseConfig = {
  apiKey: "AIzaSyA7pgtejNcxc5AxKPLY-FA-TjKhWgYafos",
  authDomain: "just-for-knowing.firebaseapp.com",
  projectId: "just-for-knowing",
  storageBucket: "just-for-knowing.appspot.com",
  messagingSenderId: "875987473771",
  appId: "1:875987473771:web:4b5783e3a77bec6e76682e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // 👈 Add this

export { auth, db }; // 👈 Export both
