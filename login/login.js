// login.js

import { auth, db } from './firebase-init.js';

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

import {
  doc, getDoc, setDoc, updateDoc,
  arrayUnion, increment
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const form = document.querySelector(".form");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = form.querySelector('input[type="email"]').value.trim();
  const password = form.querySelector('input[type="password"]').value;

  if (!/\S+@\S+\.\S+/.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      const uid = user.uid;
      const today = new Date().toISOString().split("T")[0];

      // ✅ Correct: doc with 5 segments (collection/doc/subcollection/doc)
      const userStatsRef = doc(db, "userStats", uid, "dailyStats", today);

      try {
        await updateDoc(userStatsRef, {
          loginCount: increment(1),
          sessions: arrayUnion({ start: Date.now(), end: null })
        });
      } catch (err) {
        await setDoc(userStatsRef, {
          loginCount: 1,
          sessions: [{ start: Date.now(), end: null }]
        });
      }

      // ✅ Optional: Update daily visitor stats
      const visitorRef = doc(db, "siteStats", `dailyVisitors_${today}`);
      try {
        await setDoc(visitorRef, {
          totalVisits: increment(1),
          uniqueVisitors: increment(1)
        }, { merge: true });
      } catch (err) {
        console.error("Failed to update visitor stats:", err);
      }

      // ✅ Save session start to track on unload
      sessionStorage.setItem("sessionUid", uid);
      sessionStorage.setItem("sessionStart", Date.now().toString());

      window.location.href = "../index.html"; // redirect to main page
    })
    .catch((error) => {
      alert(error.message);
    });
});
