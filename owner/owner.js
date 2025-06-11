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
  where,
  collectionGroup,  // ✅ This is missing
  increment,
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
const sendToAllCheckbox = document.getElementById('sendToAllCheckbox');
const timetableSendToAllCheckbox = document.getElementById('timetableSendToAllCheckbox');
const timetableUserUidInput = document.getElementById('timetableUserUid');
const accessRequestsList = document.getElementById('accessRequestsList');
const analyticsContent = document.getElementById('analyticsContent');

const timetableForm = document.getElementById('timetableForm');
const timetableDateInput = document.getElementById('timetableDate');
const scheduleContainer = document.getElementById('scheduleContainer');
const timetableMsg = document.getElementById('timetableMsg');
const addEntryBtn = document.getElementById('addScheduleEntry');
const videoForm = document.getElementById('videoForm');
const videoUserUidInput = document.getElementById('videoUserUid');
const videoTitleInput = document.getElementById('videoTitle');
const videoUrlInput = document.getElementById('videoUrl');
const videoDescriptionInput = document.getElementById('videoDescription');
const videoMsg = document.getElementById('videoMsg');

const chatUsersList = document.getElementById('chatUsersList');
const ownerChatMessages = document.getElementById('ownerChatMessages');
const ownerChatInput = document.getElementById('ownerChatInput');
const ownerSendChatBtn = document.getElementById('ownerSendChatBtn');
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
document.querySelectorAll('.tabBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all buttons
    document.querySelectorAll('.tabBtn').forEach(b => b.classList.remove('active'));
    // Remove active class from all tab sections
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

    // Add active class to clicked button and its tab
    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
      tabElement.classList.add('active');
    } else {
      console.error(`Tab section with id "${tabId}" not found.`);
    }

    // If Manage Users tab is opened, load data
    if (tabId === 'manageUsers') {
      loadManageUsers();
    }
    if (tabId === 'smartQuestionsTab') loadSmartQuestions();
    if (tabId === 'smartApprovalsTab') loadSmartPageAccessRequests();
    if (tabId === 'analyticsTab') loadAnalytics();


  });
});
async function loadAnalytics() {
  analyticsContent.innerHTML = 'Loading...';

  try {
    const today = new Date().toISOString().split("T")[0];

    // ✅ Fix: use valid document path
    const visitorRef = doc(db, "siteStats", `dailyVisitors_${today}`);
    const visitorSnap = await getDoc(visitorRef);
    const visitorData = visitorSnap.exists() ? visitorSnap.data() : { totalVisits: 0, uniqueVisitors: 0 };

    // Fetch user stats
    const userStatsSnap = await getDocs(collectionGroup(db, 'userStats'));

    let totalSessions = 0;
    let totalDuration = 0;
    let userDetails = '';

    userStatsSnap.forEach(docSnap => {
      const match = docSnap.ref.path.match(/userStats\/(.*?)\/(.*?)$/);
      if (!match) return;

      const [uid, date] = match.slice(1);
      const data = docSnap.data();

      if (date === today) {
        const sessionCount = data.sessions?.length || 0;
        const durationSum = (data.sessions || []).reduce((sum, s) => {
          if (s.end && s.start) return sum + (s.end - s.start);
          return sum;
        }, 0);

        totalSessions += sessionCount;
        totalDuration += durationSum;

        userDetails += `
          <li>
            UID: ${uid}<br>
            Logins: ${data.loginCount || 0}<br>
            Sessions: ${sessionCount}<br>
            Time Spent: ${(durationSum / 60000).toFixed(2)} mins
          </li>`;
      }
    });

    analyticsContent.innerHTML = `
      <p><strong>Date:</strong> ${today}</p>
      <p><strong>Total Visitors:</strong> ${visitorData.totalVisits}</p>
      <p><strong>Unique Visitors:</strong> ${visitorData.uniqueVisitors}</p>
      <p><strong>Total Logged-in Sessions:</strong> ${totalSessions}</p>
      <p><strong>Total Time Spent (all users):</strong> ${(totalDuration / 60000).toFixed(2)} minutes</p>
      <h3>Per-User Stats</h3>
      <ul>${userDetails || '<li>No user activity today.</li>'}</ul>
    `;
  } catch (error) {
    analyticsContent.innerHTML = `<p>Error loading analytics: ${error.message}</p>`;
  }
}
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



addEntryBtn.addEventListener('click', () => {
  const entryDiv = document.createElement('div');
  entryDiv.className = 'scheduleEntry';

  entryDiv.innerHTML = `
    <input type="time" class="entryTime" required />
    <input type="text" class="entrySubject" placeholder="Subject" required />
    <input type="text" class="entryTopic" placeholder="Topic" required />
    <button type="button" class="removeEntryBtn">Remove</button>
  `;

  scheduleContainer.insertBefore(entryDiv, addEntryBtn);

  entryDiv.querySelector('.removeEntryBtn').addEventListener('click', () => {
    entryDiv.remove();
  });
});
timetableForm.onsubmit = async (e) => {
  e.preventDefault();

  const uid = document.getElementById('timetableUserUid').value.trim();
  const date = timetableDateInput.value;

  if (!date) {
    timetableMsg.textContent = 'Please select a date.';
    return;
  }

  if (!timetableSendToAllCheckbox && !uid) {
    timetableMsg.textContent = 'Please enter UID or select "Send to ALL Users".';
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
    if (timetableSendToAllCheckbox) {
      // Send timetable to all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      if (usersSnapshot.empty) {
        timetableMsg.textContent = 'No users found to send timetable.';
        return;
      }

      const promises = [];
      usersSnapshot.forEach(userDoc => {
        const userId = userDoc.id;
        const timetableDocRef = doc(db, 'users', userId, 'timetables', formatDate(new Date(date)));
        promises.push(setDoc(timetableDocRef, {
          schedule: entries,
          uploadedAt: serverTimestamp()
        }));
      });

      await Promise.all(promises);
      timetableMsg.textContent = `Timetable sent to ALL users for ${date}.`;

    } else {
      // Send timetable to specific user
      await setDoc(doc(db, 'users', uid, 'timetables', formatDate(new Date(date))), {
        schedule: entries,
        uploadedAt: serverTimestamp()
      });
      timetableMsg.textContent = `Timetable uploaded for user ${uid} on ${date}.`;
    }

    scheduleContainer.innerHTML = '';
    timetableForm.reset();
  } catch (error) {
    timetableMsg.textContent = 'Error: ' + error.message;
  }
};



timetableSendToAllCheckbox.addEventListener('change', () => {
  if (timetableSendToAllCheckbox.checked) {
    timetableUserUidInput.disabled = true;
    timetableUserUidInput.value = '';
  } else {
    timetableUserUidInput.disabled = false;
  }
});


// ---------- Send Videos to User ----------

videoForm.onsubmit = async (e) => {
  e.preventDefault();

  const sendToAll = sendToAllCheckbox.checked;
  const uid = videoUserUidInput.value.trim();
  const title = videoTitleInput.value.trim();
  const url = videoUrlInput.value.trim();
  const description = videoDescriptionInput.value.trim();

  // Validation
  if (!title || !url) {
    videoMsg.textContent = 'Video title and URL are required.';
    return;
  }
  if (!sendToAll && !uid) {
    videoMsg.textContent = 'User UID is required unless sending to all users.';
    return;
  }

  try {
    if (sendToAll) {
      // Send video to all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      if (usersSnapshot.empty) {
        videoMsg.textContent = 'No users found to send video.';
        return;
      }

      const promises = [];
      usersSnapshot.forEach(userDoc => {
        const userId = userDoc.id;
        const videosCollection = collection(db, 'videoLinks', userId, 'videos');
        promises.push(addDoc(videosCollection, {
          title,
          url,
          description,
          sentAt: serverTimestamp()
        }));
      });

      await Promise.all(promises);
      videoMsg.textContent = 'Video sent to ALL users successfully!';

    } else {
      // Send video to specific user
      const videosCollection = collection(db, 'videoLinks', uid, 'videos');
      await addDoc(videosCollection, {
        title,
        url,
        description,
        sentAt: serverTimestamp()
      });
      videoMsg.textContent = `Video sent to user ${uid}.`;
    }

    videoForm.reset();

  } catch (error) {
    videoMsg.textContent = 'Error: ' + error.message;
  }
};



async function deleteVideo(userUid, videoId) {
  try {
    await deleteDoc(doc(db, 'videoLinks', userUid, 'videos', videoId));
    alert('Video deleted.');
    loadUserVideos(userUid); // refresh after delete
  } catch (error) {
    alert('Failed to delete video: ' + error.message);
  }
}

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
      li.textContent = `${data.name || data.displayName || 'No Name'} (${data.branch || 'No Branch'
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
const subjects = {
  math: [ "Algebra", "Trignometry", "Co-cordinate Geometry", "Diffrential Calculus", "Applications of Derivatives", "Integral Calculus", 
           "Differential Equations", "Graph Theory and Probability", "Statistics"
         ],
  physics: ["Units and Measurements", "Statics", "Gravitation", "Concepts of Energy", "Thermal Physics", "Sound", "Electricity and Magnetism",
    "Modern Physics"
   ],
  chemistry: [ "Fundamentals Of Chemistry", "Solutions, Acids and bases", "Electrochemistry", "corrosion", "Water Treatment", 
    "Polymers and Engineering Materials",  "Fuels", "Environmental Studies"
  ]
};

async function loadManageUsers() {
  const container = document.getElementById('manageUsersList');
  container.innerHTML = 'Loading users...';

  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (usersSnapshot.empty) {
      container.innerHTML = '<p>No users found.</p>';
      return;
    }

    container.innerHTML = ''; // Clear

    // For each user, fetch timetables, videos and display them + progress checkboxes
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      const userDiv = document.createElement('div');
      userDiv.classList.add('manageUserBlock');
      userDiv.style.border = "1px solid #ccc";
      userDiv.style.marginBottom = "20px";
      userDiv.style.padding = "10px";

      userDiv.innerHTML = `<h4>${userData.name || userData.email || userId} (UID: ${userId})</h4>`;

      // Load Timetables for user
      const timetableCol = collection(db, 'users', userId, 'timetables');
      const timetableSnapshot = await getDocs(timetableCol);

      let timetableHtml = '<h5>Timetables:</h5>';
      if (timetableSnapshot.empty) {
        timetableHtml += '<p>No timetables found.</p>';
      } else {
        timetableHtml += '<ul>';
        timetableSnapshot.forEach(doc => {
          const date = doc.id;
          const data = doc.data();
          timetableHtml += `<li>
            <strong>Date:</strong> ${date}
            <ul>
              ${Array.isArray(data.schedule) ? data.schedule.map(entry =>
            `<li>${entry.time} - ${entry.subject}: ${entry.topic}</li>`
          ).join('') : '<li>No schedule data</li>'}
            </ul>
            <button onclick="deleteUserTimetable('${userId}', '${date}')">Delete Timetable</button>
          </li>`;
        });
        timetableHtml += '</ul>';
      }
      userDiv.innerHTML += timetableHtml;

      // Load Videos for user
      const videosCol = collection(db, 'videoLinks', userId, 'videos');
      const videosSnapshot = await getDocs(videosCol);

      let videosHtml = '<h5>Videos:</h5>';
      if (videosSnapshot.empty) {
        videosHtml += '<p>No videos found.</p>';
      } else {
        videosHtml += '<ul>';
        videosSnapshot.forEach(doc => {
          const vidData = doc.data();
          videosHtml += `<li>
            <strong>${vidData.title}</strong> - 
            <a href="${vidData.url}" target="_blank">Watch</a>
            <button onclick="deleteUserVideo('${userId}', '${doc.id}')">Delete Video</button>
          </li>`;
        });
        videosHtml += '</ul>';
      }
      userDiv.innerHTML += videosHtml;

      // ----- Progress Checkboxes -----
// ... existing code ...
async function deleteUserTimetable(userId, date) {
  if (!confirm(`Are you sure you want to delete timetable for ${userId} on ${date}?`)) return;

  try {
    await deleteDoc(doc(db, 'users', userId, 'timetables', date));
    alert(`Timetable deleted for ${userId} on ${date}.`);
    loadManageUsers(); // Refresh the list
  } catch (error) {
    alert('Failed to delete timetable: ' + error.message);
  }
}

async function deleteUserVideo(userId, videoId) {

  try {
    await deleteDoc(doc(db, 'videoLinks', userId, 'videos', videoId));
    alert(`Video deleted for ${userId}.`);
    loadManageUsers(); // Refresh the list
  } catch (error) {
    alert('Failed to delete video: ' + error.message);
  }
}

// Attach to global scope so buttons using onclick can call them
window.deleteUserTimetable = deleteUserTimetable;
window.deleteUserVideo = deleteUserVideo;
const btn = document.createElement('button');
btn.textContent = 'Delete Timetable';
btn.addEventListener('click', () => deleteUserTimetable(userId, date));


// ----- Progress Checkboxes with collapsible dropdown -----
const progressContainer = document.createElement('div');
progressContainer.innerHTML = '<h5>Chapter Completion Status</h5>';
userDiv.appendChild(progressContainer);

// Load progress from Firestore for the user
const progressDocRef = doc(db, 'users', userId, 'progress', 'chapters');
const progressDocSnap = await getDoc(progressDocRef);
const savedProgress = progressDocSnap.exists() ? progressDocSnap.data() : {};

for (const [subject, chapters] of Object.entries(subjects)) {
  // Create the collapsible subject header
  const subjHeader = document.createElement('button');
  subjHeader.textContent = subject.toUpperCase();
  subjHeader.style.cursor = 'pointer';
  subjHeader.style.background = '#eee';
  subjHeader.style.border = 'none';
  subjHeader.style.padding = '8px 10px';
  subjHeader.style.width = '100%';
  subjHeader.style.textAlign = 'left';
  subjHeader.style.fontWeight = 'bold';
  subjHeader.style.marginTop = '10px';
  subjHeader.setAttribute('aria-expanded', 'false');

  // Create the collapsible content div (initially hidden)
  const contentDiv = document.createElement('div');
  contentDiv.style.display = 'none';
  contentDiv.style.paddingLeft = '15px';
  contentDiv.style.borderLeft = '2px solid #ccc';

  // Create the ul list for chapters
  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.paddingLeft = '0';

  chapters.forEach(chapter => {
    const li = document.createElement('li');
    li.style.marginBottom = '4px';

    const checkboxId = `${userId}-${subject}-${chapter}`.replace(/\s+/g, '_');
    const isChecked = savedProgress[subject]?.[chapter] === true;

    li.innerHTML = `
      <label>
        <input type="checkbox" id="${checkboxId}" ${isChecked ? 'checked' : ''}>
        ${chapter}
      </label>
    `;

    // Listen to checkbox changes to update Firestore
    li.querySelector('input').addEventListener('change', async (e) => {
      try {
        if (!savedProgress[subject]) savedProgress[subject] = {};
        savedProgress[subject][chapter] = e.target.checked;
        await setDoc(progressDocRef, savedProgress);
      } catch (err) {
        alert('Failed to update progress: ' + err.message);
      }
    });

    ul.appendChild(li);
  });

  contentDiv.appendChild(ul);

  // Toggle logic for collapsible
  subjHeader.addEventListener('click', () => {
    const isVisible = contentDiv.style.display === 'block';
    contentDiv.style.display = isVisible ? 'none' : 'block';
    subjHeader.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
  });

  progressContainer.appendChild(subjHeader);
  progressContainer.appendChild(contentDiv);
}



      container.appendChild(userDiv);
    }
  } catch (error) {
    container.innerHTML = `<p>Error loading users: ${error.message}</p>`;
  }
}




sendToAllCheckbox.addEventListener('change', () => {
  if (sendToAllCheckbox.checked) {
    videoUserUidInput.disabled = true;
    videoUserUidInput.value = '';
  } else {
    videoUserUidInput.disabled = false;
  }
});
window.loadManageUsers = loadManageUsers;
async function loadSmartQuestions() {
  const list = document.getElementById('smartQuestionsList');
  list.innerHTML = 'Loading...';

  try {
    // Get all doubts
    const snapshot = await getDocs(collection(db, 'smart_doubts'));
    if (snapshot.empty) {
      list.innerHTML = '<li>No doubts found.</li>';
      return;
    }

    list.innerHTML = '';

    for (const docSnap of snapshot.docs) {
      const docId = docSnap.id;           // document ID of the doubt
      const data = docSnap.data();

      // Get user info from users collection based on uid field in doubt
      let userName = 'Unknown';
      if (data.uid) {
        const userDoc = await getDoc(doc(db, 'users', data.uid));
        if (userDoc.exists()) {
          userName = userDoc.data().name || 'Unknown';
        }
      }

      const li = document.createElement('li');
      li.innerHTML = `
        <p><strong>${userName}</strong> (UID: ${data.uid || 'N/A'})</p>
        <p><strong>Question:</strong> ${data.question || '(No question submitted)'}</p>
        ${data.videoLink ? `<p><strong>Existing Answer Video:</strong> <a href="${data.videoLink}" target="_blank">${data.videoLink}</a></p>` : ''}
        ${data.status ? `<p><strong>Status:</strong> ${data.status}</p>` : ''}
        <input type="text" placeholder="Video Link" id="link-${docId}" value="${data.videoLink || ''}" />
        <textarea placeholder="Explanation" id="desc-${docId}">${data.answer ? data.answer.replace(/<br>/g, "\n").replace(/<a[^>]*>([^<]*)<\/a>/, "$1") : ''}</textarea>
        <button onclick="sendSmartAnswer('${docId}')">
          ${data.videoLink ? 'Update Answer' : 'Send Answer'}
        </button>
        <hr/>
      `;
      list.appendChild(li);
    }
  } catch (err) {
    list.innerHTML = `<li>Error: ${err.message}</li>`;
    console.error(err);
  }
}
window.loadSmartQuestions = loadSmartQuestions;

// Submit or update answer for a doubt document
window.sendSmartAnswer = async function(docId) {
  const link = document.getElementById(`link-${docId}`).value.trim();
  const desc = document.getElementById(`desc-${docId}`).value.trim();

  if (!link || !desc) {
    alert('Both video link and explanation are required.');
    return;
  }

  try {
    // Update the smart_doubts document with answer and video link, and change status to 'Answered'
    await setDoc(doc(db, 'smart_doubts', docId), {
      answer: desc.replace(/\n/g, "<br>"),
      videoLink: link,
      status: "Answered"
    }, { merge: true });

    alert('Answer submitted!');
    loadSmartQuestions(); // Reload list after update
  } catch (err) {
    alert('Failed to submit answer: ' + err.message);
    console.error(err);
  }
};

// Load questions on page load
loadSmartQuestions();

async function loadSmartPageAccessRequests() {
  const list = document.getElementById('smartPageAccessList');
  list.innerHTML = 'Loading...';

  try {
    const snapshot = await getDocs(collection(db, 'smartPageUsers'));

    console.log("Number of docs in smartPageUsers:", snapshot.size);

    if (snapshot.empty) {
      list.innerHTML = '<li>No pending requests.</li>';
      return;
    }

    list.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const safeData = JSON.stringify(data).replace(/"/g, '&quot;');
      const formattedTime = data.timestamp?.toDate().toLocaleString() || 'N/A';

      const li = document.createElement('li');
      li.innerHTML = `
        <p><strong>${data.name}</strong> (${data.branch}) - ${data.email || 'No email'}</p>
        <p>User ID: ${docSnap.id}</p>
        <p><small>Requested on: ${formattedTime}</small></p>
        <button onclick="toggleEnabledSmartPage('${docSnap.id}', ${data.enabled === true})">
          ${data.enabled === true ? 'Disable User' : 'Enable User'}
        </button>
        <button onclick="setEnabledFalse('${docSnap.id}')">Set Disabled</button>
        <hr/>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    list.innerHTML = `<li>Error: ${err.message}</li>`;
    console.error(err);
  }
}

window.toggleEnabledSmartPage = async function (uid, currentlyEnabled) {
  try {
    const newStatus = !currentlyEnabled;

    await setDoc(doc(db, 'smartPageUsers', uid), { enabled: newStatus }, { merge: true });

    alert(newStatus ? 'User enabled.' : 'User disabled.');
    loadSmartPageAccessRequests();
  } catch (err) {
    alert('Toggle enabled status failed: ' + err.message);
  }
};

window.setEnabledFalse = async function (uid) {
  try {
    // Set enabled to false explicitly
    await setDoc(doc(db, 'smartPageUsers', uid), { enabled: false }, { merge: true });

    alert('User set to disabled.');
    loadSmartPageAccessRequests();
  } catch (err) {
    alert('Failed to disable user: ' + err.message);
  }
};


// document.querySelectorAll('.tabBtn1').forEach((btn) => {
//   btn.onclick = () => {
//     document.querySelectorAll('.tabBtn1').forEach((b) => b.classList.remove('active'));
//     document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
//     btn.classList.add('active');
//     const tabId = btn.dataset.tab;
//     document.getElementById(tabId).classList.add('active');

//     // Load Manage Users tab data when that tab is opened
//     if (tabId === 'manageUsers') {
//       loadManageUsers();
//     }
//   };
// });



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


