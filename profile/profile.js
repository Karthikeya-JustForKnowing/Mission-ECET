// profile.js
import { auth } from '../login/firebase-init.js';
import {
  onAuthStateChanged,
  updateProfile,
  signOut,
  updateEmail,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const db = getFirestore();

// DOM Elements
const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const userPhotoEl = document.getElementById('userPhoto');
const displayNameInput = document.getElementById('displayNameInput');
const phoneInput = document.getElementById('phoneInput');
const bioInput = document.getElementById('bioInput');
const updateBtn = document.getElementById('updateProfileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const testResultsContainer = document.getElementById('testResults');
const photoUploadInput = document.getElementById('photoUpload');
const changePhotoBtn = document.getElementById('changePhotoBtn');
const dailyQuizResults = document.getElementById('dailyQuizResults'); // Add this DOM element

let currentUser = null;

function showUserProfile(user, userData = {}) {
  userNameEl.textContent = user.displayName || 'No display name';
  userEmailEl.textContent = user.email;

  userPhotoEl.src = user.photoURL || '../profile.png';

  displayNameInput.value = user.displayName || '';
  phoneInput.value = userData.phone || '';
  bioInput.value = userData.bio || '';
}

// Fetch additional user data from Firestore (phone, bio)
async function fetchUserExtraData(userId) {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error('Error fetching user extra data:', err);
  }
  return {};
}

// Fetch test results and render
async function fetchUserTestResults(userId) {
  testResultsContainer.innerHTML = '<p>Loading your tests...</p>';
  try {
    const testsCol = collection(db, 'users', userId, 'tests');
    const snapshot = await getDocs(testsCol);

    if (snapshot.empty) {
      testResultsContainer.innerHTML = '<p>You have not attended any tests yet.</p>';
      return;
    }

    testResultsContainer.innerHTML = ''; // Clear container

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      console.log('Test document data:', data);

      // Determine marks fields (either marksObtained/totalMarks or score/total)
      const marksObtained = data.marksObtained ?? data.score ?? 'N/A';
      const totalMarks    = data.totalMarks    ?? data.total ?? 'N/A';

      // Determine date field and convert Timestamp if needed
      let rawDate = data.date ?? data.completedAt ?? data.submittedAt;
      let dateStr;
      if (rawDate && rawDate.toDate) {
        dateStr = rawDate.toDate().toLocaleString();
      } else {
        dateStr = rawDate ?? 'Unknown';
      }

      const card = document.createElement('div');
      card.className = 'test-result-card';
      card.innerHTML = `
        <div class="test-result-title">${docSnap.id.replace(/_/g, ' ')}</div>
        <div class="test-result-info">Date: ${dateStr}</div>
        <div class="test-result-score">${marksObtained} / ${totalMarks} Marks</div>
      `;

      testResultsContainer.appendChild(card);
    });

  } catch (err) {
    testResultsContainer.innerHTML = `<p>Error loading test results: ${err.message}</p>`;
  }
}
async function fetchUserDailyQuizResults(userId) {
  dailyQuizResults.innerHTML = '<p>Loading your daily quizzes…</p>';

  try {
    const quizzesCol = collection(db, 'users', userId, 'attemptedQuizzes');
    const snapshot = await getDocs(quizzesCol);

    if (snapshot.empty) {
      dailyQuizResults.innerHTML = '<p>You have not attended any daily quizzes yet.</p>';
      return;
    }

    dailyQuizResults.innerHTML = ''; // clear the container

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const score = data.score ?? 'N/A';
      const total = data.total ?? 'N/A';

      // ─── look for "timestamp" first, then "localTime" if you stored that as a string ───
      const rawDate = data.timestamp ?? data.localTime;

      let dateStr = 'Unknown';
      if (
        rawDate &&
        typeof rawDate === 'object' &&
        typeof rawDate.toDate === 'function'
      ) {
        // Firestore Timestamp → convert to JS Date
        dateStr = rawDate.toDate().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      } else if (typeof rawDate === 'string') {
        // fallback if you stored a string in "localTime"
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          dateStr = parsed.toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
        }
      }

      const card = document.createElement('div');
      card.className = 'quiz-result-card';
      card.innerHTML = `
        <div class="quiz-result-title">${docSnap.id.replace(/_/g, ' ')}</div>
        <div class="quiz-result-info">Date: ${dateStr}</div>
        <div class="quiz-result-score">${score} / ${total} Marks</div>
      `;

      dailyQuizResults.appendChild(card);
    });
  } catch (err) {
    dailyQuizResults.innerHTML = `<p>Error loading daily quizzes: ${err.message}</p>`;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const extraData = await fetchUserExtraData(user.uid);
    showUserProfile(user, extraData);
    fetchUserTestResults(user.uid);
    fetchUserDailyQuizResults(user.uid); // call daily quiz fetcher here
  } 
});

// Save extra user data to Firestore
async function saveUserExtraData(userId, data) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, data, { merge: true });
    console.log('User extra data updated');
  } catch (err) {
    console.error('Error updating user extra data:', err);
  }
}

// Handle profile update button
updateBtn.addEventListener('click', async () => {
  if (!currentUser) return alert('No user logged in.');

  const newName = displayNameInput.value.trim();
  const phone = phoneInput.value.trim();
  const bio = bioInput.value.trim();

  if (!newName) return alert('Username cannot be empty.');

  try {
    // Update Firebase Auth profile displayName
    await updateProfile(currentUser, { displayName: newName });

    // Save extra data (phone, bio) to Firestore
    await saveUserExtraData(currentUser.uid, { phone, bio });

    // Reflect changes on UI
    showUserProfile(currentUser, { phone, bio });

    alert('Profile updated successfully!');
  } catch (err) {
    alert('Failed to update profile: ' + err.message);
  }
});

// Logout button handler
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    alert('Logged out successfully');
    window.location.href = 'login.html';
  } catch (err) {
    alert('Logout failed: ' + err.message);
  }
});

// Handle profile photo change
changePhotoBtn.addEventListener('click', () => {
  photoUploadInput.click();
});

photoUploadInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // For now, just preview locally; implement Firebase Storage upload if needed.
  const reader = new FileReader();
  reader.onload = () => {
    userPhotoEl.src = reader.result;
  };
  reader.readAsDataURL(file);

  alert('Profile photo change is not implemented fully yet.');
});

// Listen for auth state changes
// onAuthStateChanged(auth, async (user) => {
//   if (user) {
//     currentUser = user;
//     const extraData = await fetchUserExtraData(user.uid);
//     showUserProfile(user, extraData);
//     fetchUserTestResults(user.uid);
//   } else {
//     alert('Please log in first.');
//     window.location.href = 'login.html';
//   }
// });
