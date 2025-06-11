import { auth, db } from '../login/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// DOM Elements
const doubtList = document.getElementById('doubtList');
const coreQuestion = document.getElementById('coreQuestion');
const subjectSelect = document.getElementById('subjectSelect');
const statusMessage = document.getElementById('statusMessage');
const mainContent = document.getElementById('mainContent'); // Wrap your form + doubt list in an element with this id
const accessBlockedWarning = document.getElementById('accessBlockedWarning');


let currentUser = null;
let smartPageEnabled = false;


async function checkSmartPageStatus() {
  try {
    const docRef = doc(db, 'settings', 'features');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      smartPageEnabled = docSnap.data().smartPageEnabled === true;
    } else {
      // 🔄 Try to create the document (only works once, then blocked for normal users)
      await setDoc(docRef, { smartPageEnabled: true });
      console.warn('✅ Created features doc with default value (smartPageEnabled: true)');
      smartPageEnabled = true;
    }
  } catch (error) {
    console.error('❌ Error fetching or creating smartPageEnabled flag:', error);
    smartPageEnabled = false;
  }
}


// Check if user has access to smart page and create document if not exists
async function checkUserAccess(uid) {
  try {
    const userDocRef = doc(db, 'smartPageUsers', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      console.log('User access doc exists for:', uid);
      const data = userDocSnap.data();
      return data.enabled === true;  // true if enabled, false otherwise
    } else {
      console.log('User access doc NOT found for:', uid, 'Creating now...');
      // No doc? Create it now with enabled = true (default access allowed)
      await setDoc(userDocRef, { enabled: true });
      console.log('User access doc created with enabled=true');
      return true;
    }
  } catch (err) {
    console.error('Error in checkUserAccess:', err);
    return false;
  }
}



onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    await checkSmartPageStatus();

    if (!smartPageEnabled) {
      mainContent.style.display = 'none';
      statusMessage.textContent = 'Smart Preparation page is currently disabled by the owner.';
      statusMessage.style.color = 'red';
      accessBlockedWarning.style.display = 'none'; // Hide warning in this case

      return;
    }

    // Check per-user access
    const userAccess = await checkUserAccess(user.uid);
    if (!userAccess) {
      mainContent.style.display = 'none';
      statusMessage.style.color = 'red';
      accessBlockedWarning.style.display = 'block'; // Show warning message

      return;
    }

    statusMessage.textContent = '';
    mainContent.style.display = 'block';
    statusMessage.textContent = '';
    accessBlockedWarning.style.display = 'none';
    await loadMyDoubts();
  } else {
    mainContent.style.display = 'none';
    statusMessage.textContent = 'Please log in to submit your doubts.';
    statusMessage.style.color = 'red';
  }
});


// Submit doubt to Firestore
window.submitDoubt = async function () {
  if (!smartPageEnabled) {
    alert('Sorry, Smart Preparation page is currently disabled.');
    return;
  }

  const question = coreQuestion.value.trim();
  const subject = subjectSelect.value;

  if (!question || !subject) {
    statusMessage.textContent = 'Please enter a question and select a subject.';
    statusMessage.style.color = 'red';
    return;
  }

  if (!currentUser) {
    statusMessage.textContent = 'User not logged in.';
    statusMessage.style.color = 'red';
    return;
  }

  try {
    await addDoc(collection(db, 'smart_doubts'), {
      uid: currentUser.uid,
      email: currentUser.email,
      question,
      subject,
      status: 'Pending Review',
      videoLink: null,
      timestamp: serverTimestamp(),
    });

    statusMessage.textContent = 'Your doubt has been submitted!';
    statusMessage.style.color = 'green';
    coreQuestion.value = '';
    subjectSelect.value = '';

    await loadMyDoubts();
  } catch (error) {
    console.error('Error adding doubt:', error);
    statusMessage.textContent = 'Something went wrong.';
    statusMessage.style.color = 'red';
  }
};

// Load user's doubts
async function loadMyDoubts() {
  doubtList.innerHTML = '';

  const q = query(collection(db, 'smart_doubts'), where('uid', '==', currentUser.uid));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    doubtList.innerHTML = "<p>You haven’t submitted any doubts yet.</p>";
    return;
  }

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const card = document.createElement('div');
    card.className = 'doubt-card';

    card.innerHTML = `
      <p><strong>Subject:</strong> ${data.subject}</p>
      <p><strong>Question:</strong> ${data.question}</p>
      <p class="status ${data.videoLink ? 'answered' : ''}">
        ${data.videoLink ? 'Answered ✔️' : data.status}
      </p>
      ${data.videoLink ? `<p><a href="${data.videoLink}" target="_blank">Watch Explanation</a></p>` : ''}
    `;

    doubtList.appendChild(card);
  });
}

window.submitDoubt = submitDoubt;
