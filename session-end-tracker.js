import { auth, db } from './login/firebase-init.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

auth.onAuthStateChanged((user) => {
  if (user && !sessionStorage.getItem("sessionUid")) {
    sessionStorage.setItem("sessionUid", user.uid);
    sessionStorage.setItem("sessionStart", Date.now().toString());
  }
});

window.addEventListener("beforeunload", async () => {
  const uid = sessionStorage.getItem("sessionUid");
  const start = parseInt(sessionStorage.getItem("sessionStart"), 10);
  const today = new Date().toISOString().split("T")[0];

  if (uid && start) {
    const statsRef = doc(db, "userStats", uid, today);
    const snap = await getDoc(statsRef);
    if (snap.exists()) {
      const data = snap.data();
      const sessions = data.sessions || [];

      for (let i = sessions.length - 1; i >= 0; i--) {
        if (!sessions[i].end) {
          sessions[i].end = Date.now();
          break;
        }
      }

      await setDoc(statsRef, { ...data, sessions }, { merge: true });
    }
  }
});