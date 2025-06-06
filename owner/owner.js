// ---------- owner.js ----------
import { auth, db } from '../login/firebase-init.js';

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

// ---------- Constants ----------
const OWNER_UID = 'CzhEWWPHjpQlMmiiHOqxQNEiK9k1'; // Replace if needed

// ---------- Elements ----------
const logoutBtn = document.getElementById('logoutBtn');
const ownerContent = document.getElementById('ownerContent');

const accessRequestsList = document.getElementById('accessRequestsList');

const timetableForm = document.getElementById('timetableForm');
const timetableDateInput = document.getElementById('timetableDate');
const scheduleContainer = document.getElementById('scheduleContainer');
const timetableMsg = document.getElementById('timetableMsg');

const videoForm = document.getElementById('videoForm');
const videoUserUidInput = document.getElementById('videoUserUid');
const videoTitleInput = document.getElementById('videoTitle');
const videoUrlInput = document.getElementById('videoUrl');
const videoDescriptionInput = document.getElementById('videoDescription');
const videoMsg = document.getElementById('videoMsg');

const chatUsersList   = document.getElementById('chatUsersList');
const ownerChatMessages = document.getElementById('ownerChatMessages');
const ownerChatInput    = document.getElementById('ownerChatInput');
const ownerSendChatBtn  = document.getElementById('ownerSendChatBtn');
const attendanceList = document.getElementById('attendanceList');

const usersListUL = document.getElementById('usersListUL');

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

// ---------- State Variables ----------
let currentUser = null;
let chatListener = null;
let ownerId = null;
let ownerName = null;
let selectedUser = null;

// ---------- Helper: Hide/Show ----------
function showLogin(show) {
  loginForm.style.display = show ? 'block' : 'none';
  errorMsg.textContent = '';
}
function showOwnerContent(show) {
  if (show) {
    ownerContent.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    ownerContent.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
}

// On initial load, show login, hide owner dashboard
showLogin(true);
showOwnerContent(false);

// ---------- Login Form Submit ----------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;

    if (currentUser.uid !== OWNER_UID) {
      errorMsg.textContent = 'Access denied. You are not the owner.';
      await signOut(auth);
      currentUser = null;
      return;
    }

    // Owner successfully logged in
    ownerId = currentUser.uid;
    ownerName = currentUser.displayName || currentUser.email || 'Owner';

    showLogin(false);
    showOwnerContent(true);

    // Load initial data
    await loadAllAttendance();
    await loadAccessRequests();
    await loadUsersList();
    loadChatUsersList();
  } catch (err) {
    errorMsg.textContent = err.message;
  }
});

// ---------- Logout ----------
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  currentUser = null;
  ownerId = null;
  ownerName = null;
  showLogin(true);
  showOwnerContent(false);
});

// ---------- Check Auth State on Page Load ----------
onAuthStateChanged(auth, async (user) => {
  if (user && user.uid === OWNER_UID) {
    currentUser = user;
    ownerId = user.uid;
    ownerName = user.displayName || user.email || 'Owner';

    showLogin(false);
    showOwnerContent(true);

    // Load initial data
    await loadAllAttendance();
    await loadAccessRequests();
    await loadUsersList();
    loadChatUsersList();
  } else {
    currentUser = null;
    ownerId = null;
    ownerName = null;
    showLogin(true);
    showOwnerContent(false);
  }
});

// ---------- Utility: Format Date for Timetable Key ----------
function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ---------- Tabs Logic ----------
document.querySelectorAll('.tabBtn').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.tabBtn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  };
});

// ---------- Access Requests ----------
async function loadAccessRequests() {
  accessRequestsList.innerHTML = 'Loading...';
  try {
    const snapshot = await getDocs(collection(db, 'accessRequests'));
    accessRequestsList.innerHTML = snapshot.empty ? '<li>No access requests.</li>' : '';

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const li = document.createElement('li');
      li.textContent = `${data.name} (${data.branch}) - ${data.email}`;

      const approveBtn = document.createElement('button');
      approveBtn.textContent = 'Approve';
      approveBtn.className = 'approveBtn';
      approveBtn.onclick = () => approveRequest(docSnap.id, data);

      const rejectBtn = document.createElement('button');
      rejectBtn.textContent = 'Reject';
      rejectBtn.className = 'rejectBtn';
      rejectBtn.onclick = () => rejectRequest(docSnap.id);

      li.append(approveBtn, rejectBtn);
      accessRequestsList.appendChild(li);
    });
  } catch (error) {
    accessRequestsList.innerHTML = `<li>Error: ${error.message}</li>`;
  }
}

async function approveRequest(uid, data) {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      approved: true,
      approvedAt: serverTimestamp()
    });
    await deleteDoc(doc(db, 'accessRequests', uid));
    await loadAccessRequests();
    await loadUsersList();
    loadChatUsersList();
  } catch (error) {
    alert('Approval failed: ' + error.message);
  }
}

async function rejectRequest(uid) {
  try {
    await deleteDoc(doc(db, 'accessRequests', uid));
    await loadAccessRequests();
  } catch (error) {
    alert('Rejection failed: ' + error.message);
  }
}

// ---------- Timetable Upload ----------
function createScheduleEntry() {
  const div = document.createElement('div');
  div.className = 'scheduleEntry';
  div.innerHTML = `
    <input type="time" class="entryTime" required>
    <input type="text" class="entrySubject" placeholder="Subject" required>
    <input type="text" class="entryTopic" placeholder="Topic" required>
    <button type="button" class="removeEntryBtn">Remove</button>
  `;
  div.querySelector('.removeEntryBtn').onclick = () => div.remove();
  return div;
}

document.getElementById('addScheduleEntry').onclick = () => {
  scheduleContainer.appendChild(createScheduleEntry());
};

timetableForm.onsubmit = async (e) => {
  e.preventDefault();
  const date = timetableDateInput.value;
  if (!date) {
    timetableMsg.textContent = 'Select a date.';
    return;
  }

  const entries = [...scheduleContainer.querySelectorAll('.scheduleEntry')].map((entry) => ({
    time: entry.querySelector('.entryTime').value,
    subject: entry.querySelector('.entrySubject').value.trim(),
    topic: entry.querySelector('.entryTopic').value.trim()
  }));

  if (entries.some((e) => !e.time || !e.subject || !e.topic)) {
    timetableMsg.textContent = 'Fill all fields.';
    return;
  }

  try {
    await setDoc(doc(db, 'timetables', formatDate(new Date(date))), {
      schedule: entries,
      uploadedAt: serverTimestamp()
    });
    timetableMsg.textContent = `Timetable uploaded for ${date}.`;
    scheduleContainer.innerHTML = '';
    timetableForm.reset();
  } catch (error) {
    timetableMsg.textContent = 'Error: ' + error.message;
  }
};

// ---------- Send Videos to User ----------
videoForm.onsubmit = async (e) => {
  e.preventDefault();

  const uid = videoUserUidInput.value.trim();
  const title = videoTitleInput.value.trim();
  const url = videoUrlInput.value.trim();
  const description = videoDescriptionInput.value.trim();

  if (!uid || !title || !url) {
    videoMsg.textContent = 'All fields except description are required.';
    return;
  }

  try {
    await addDoc(collection(db, 'videoLinks', uid, 'videos'), {
      title,
      url,
      description,
      sentAt: serverTimestamp()
    });
    videoMsg.textContent = `Video sent to user ${uid}.`;
    videoForm.reset();
  } catch (error) {
    videoMsg.textContent = 'Error: ' + error.message;
  }
};



async function loadAllAttendance() {
  try {
    const attendanceRef = collection(db, "attendance");
    const attendanceSnapshot = await getDocs(attendanceRef);

    if (attendanceSnapshot.empty) {
      attendanceList.innerHTML = "<li>No attendance records found.</li>";
      return;
    }

    attendanceList.innerHTML = ''; // Clear previous content

    attendanceSnapshot.forEach(async (userDoc) => {
      const userId = userDoc.id;
      const attendanceData = userDoc.data();

      // Get user's name from 'users' collection
      const userDocRef = doc(db, "users", userId);
      const userDetails = await getDoc(userDocRef);
      const userName = userDetails.exists() ? userDetails.data().name : "Unknown User";

      // Create a list item or div to show attendance
      const li = document.createElement('li');
      li.textContent = `Attendance for ${userName} (${userId}): ${JSON.stringify(attendanceData)}`;
      
      attendanceList.appendChild(li);
    });

  } catch (error) {
    attendanceList.innerHTML = `<li>Error loading attendance: ${error.message}</li>`;
  }
}





// ---------- Approved Users List ----------
async function loadUsersList() {
  usersListUL.innerHTML = 'Loading...';
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    usersListUL.innerHTML = snapshot.empty ? '<li>No approved users.</li>' : '';

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const li = document.createElement('li');
      li.textContent = `${data.name || data.displayName || 'No Name'} (${
        data.branch || 'No Branch'
      }) - ${data.email} - UID: ${docSnap.id}`;

      if (data.approved) {
        // Add remove approval button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove Approval';
        removeBtn.style.marginLeft = '10px';
        removeBtn.onclick = () => removeUserApproval(docSnap.id);

        li.appendChild(removeBtn);
      }
      usersListUL.appendChild(li);
    });
  } catch (error) {
    usersListUL.innerHTML = `Error: ${error.message}`;
  }
}

async function removeUserApproval(userUid) {
  if (!confirm('Are you sure you want to revoke access for this user?')) return;

  try {
    // Option 1: Update user doc to mark unapproved
    await setDoc(doc(db, 'users', userUid), { approved: false }, { merge: true });

    // Option 2: Or delete user doc (comment out if you want)
    // await deleteDoc(doc(db, 'users', userUid));

    alert('User approval removed.');

    // Reload the users and chat lists
    await loadUsersList();
    loadChatUsersList();
  } catch (error) {
    alert('Failed to remove approval: ' + error.message);
  }
}


// ---------- Chat with Users ----------

// Load approved users into clickable list
// ---------- Chat with Users ----------

// Generate consistent chat ID for two users
function generateChatId(uid1, uid2) {
  return uid1 < uid2 ? uid1 + "_" + uid2 : uid2 + "_" + uid1;
}

// Load approved users for chatting
async function loadChatUsersList() {
  if (!ownerId) return;
  chatUsersList.innerHTML = 'Loading users...';

  try {
    const snapshot = await getDocs(collection(db, 'users'));
    chatUsersList.innerHTML = '';

    snapshot.forEach((docSnap) => {
      const user = docSnap.data();
      if (user.approved) {
        const li = document.createElement('li');
        li.textContent = user.name || user.email;
        li.style.cursor = 'pointer';
        li.onclick = () => openChatWithUser(docSnap.id, user.name || user.email);
        chatUsersList.appendChild(li);
      }
    });
  } catch (error) {
    chatUsersList.innerHTML = `<li>Error: ${error.message}</li>`;
  }
}

// Open chat with selected user
function openChatWithUser(userUid, userName) {
  selectedUser = userUid;
  const chatId = generateChatId(ownerId, userUid);
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('sentAt', 'asc'));

  if (chatListener) chatListener(); // Unsubscribe previous listener

  chatListener = onSnapshot(q, (snapshot) => {
    ownerChatMessages.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const p = document.createElement('p');
      p.textContent = msg.text;
      p.className = msg.senderUid === ownerId ? 'owner' : 'user';
      ownerChatMessages.appendChild(p);
    });
    ownerChatMessages.scrollTop = ownerChatMessages.scrollHeight;
  });

  // Sending chat message
  ownerSendChatBtn.onclick = async () => {
    const text = ownerChatInput.value.trim();
    if (!text) return;

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderUid: ownerId,
        senderName: ownerName,
        text: text,
        sentAt: serverTimestamp()
      });
      ownerChatInput.value = '';
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
}


// Send a new chat message from owner
// function loadChatWithUser(userUid) {
//   const chatId = generateChatId(ownerId, userUid);
//   const messagesRef = collection(db, 'chats', chatId, 'messages');
//   const q = query(messagesRef, orderBy('sentAt', 'asc'));

//   if (chatListener) chatListener(); // Unsubscribe previous
//   chatListener = onSnapshot(q, (snapshot) => {
//     ownerChatMessages.innerHTML = "";
//     snapshot.forEach(docSnap => {
//       const msg = docSnap.data();
//       const p = document.createElement('p');
//       p.textContent = `${msg.senderName}: ${msg.text}`;
//       p.className = msg.senderUid === ownerId ? 'owner' : 'user';
//       ownerChatMessages.appendChild(p);
//     });
//     ownerChatMessages.scrollTop = ownerChatMessages.scrollHeight;
//   });


