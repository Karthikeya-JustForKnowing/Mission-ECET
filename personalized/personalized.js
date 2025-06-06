// personalized.js
import { auth, db } from '../login/firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  limit,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

let currentUser = null;
let chatListener = null;

const loginStatus = document.getElementById('loginStatus');
const accessRequestDiv = document.getElementById('accessRequestDiv');
const dashboardDiv = document.getElementById('dashboardDiv');
const requestMsg = document.getElementById('requestMsg');
const reqName = document.getElementById('reqName');
const reqBranch = document.getElementById('reqBranch');
const reqEmail = document.getElementById('reqEmail');
const accessRequestForm = document.getElementById('accessRequestForm');
const timetableList = document.getElementById('timetableList');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const videoLinksList = document.getElementById('videoLinks');
const leaderboardBody = document.getElementById('leaderboardBody');
const logoutBtn = document.getElementById('logoutBtn');
const startTestBtn = document.getElementById('startTestBtn');
const main1 = document.getElementById('main1');
const attendanceCheckbox = document.getElementById('attendanceCheckbox');
const submitAttendanceBtn = document.getElementById('submitAttendanceBtn');
const attendanceStatus = document.getElementById('attendanceStatus');
const attend = document.getElementById('attend');


function show(el) {
  el.classList.remove('hidden');       // Remove 'hidden' if you're using Tailwind or CSS classes
  el.style.display = 'block';          // Or explicitly show it
}
function hide(el) {
  el.classList.add('hidden');
  el.style.display = 'none';
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    loginStatus.textContent = "You are not logged in. Please login first.";
    hide(accessRequestDiv);
    hide(main1);
    hide(dashboardDiv);
    hide(attend);
    return;
  }

  const test = await getDoc(doc(db, "users", auth.currentUser.uid));
  console.log("TEST user doc:", test.exists(), test.data());


  currentUser = user;
  loginStatus.textContent = `Logged in as ${user.email}`;

  const userDocRef = doc(db, 'users', user.uid);
  const userDocSnap = await getDoc(userDocRef);
  const userData = userDocSnap.exists() ? userDocSnap.data() : null;
console.log("userData.approved =", userData?.approved);

  if (!userData || !userData.approved) {
    // Not approved: show access request form
    show(accessRequestDiv);
    show(main1);         // <--- Add this line
    hide(dashboardDiv);
    hide(attend);

    reqEmail.value = user.email;
    reqName.value = "";
    reqBranch.value = "";
    requestMsg.textContent = "";

    const reqDocRef = doc(db, 'accessRequests', user.uid);
    const reqDocSnap = await getDoc(reqDocRef);

    if (reqDocSnap.exists()) {
      requestMsg.textContent = "Your request is pending for approval. Please wait.";
      reqName.disabled = true;
      reqBranch.disabled = true;
      accessRequestForm.querySelector('button').disabled = true;
    } else {
      reqName.disabled = false;
      reqBranch.disabled = false;
      accessRequestForm.querySelector('button').disabled = false;
    }

  } else {
    // Approved: show dashboard and attendance
    hide(accessRequestDiv);
    show(dashboardDiv);
    show(attend);

    setupDashboard(user.uid);
    await checkAttendance(user.uid);
  }
});


async function checkAttendance(uid) {
  const today = new Date().toISOString().split('T')[0];
  const attendanceDocRef = doc(db, "attendance", uid);
  const attendanceDoc = await getDoc(attendanceDocRef);
  
  if (attendanceDoc.exists() && attendanceDoc.data()[today]) {
    attendanceCheckbox.checked = true;
    attendanceCheckbox.disabled = true;
    submitAttendanceBtn.disabled = true;
    attendanceStatus.textContent = "You have already marked attendance for today.";
  } else {
    attendanceCheckbox.checked = false;
    attendanceCheckbox.disabled = false;
    submitAttendanceBtn.disabled = false;
    attendanceStatus.textContent = "";
  }
}

accessRequestForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) return;

  try {
    const reqDocRef = doc(db, 'accessRequests', currentUser.uid);
    await setDoc(reqDocRef, {
      name: reqName.value.trim(),
      branch: reqBranch.value.trim(),
      email: reqEmail.value,
      uid: currentUser.uid,
      requestedAt: serverTimestamp()  // Using server timestamp here
    });
    requestMsg.textContent = "Request submitted. Please wait for approval.";
    reqName.disabled = true;
    reqBranch.disabled = true;
    accessRequestForm.querySelector('button').disabled = true;
  } catch (err) {
    requestMsg.textContent = "Submission failed. Try again.";
  }
});
window.onload = () => {
  const logoutBtn = document.getElementById("logoutBtn");
   if (logoutBtn) {
  logoutBtn.onclick = () => {
    auth.signOut();
};
  } else {
    console.error("logoutBtn not found!");
  }
};

async function setupDashboard(uid) {
  await loadTimetable();
  await loadVideos(uid);
  setupChat(uid);
  // loadLeaderboard();
  startTestBtn.onclick = () => alert('Special test system coming soon!');
}

async function loadTimetable() {
  timetableList.innerHTML = "<li>Loading timetable...</li>";
  const today = formatDate(new Date());
  const timetableDocRef = doc(db, 'timetables', today);
  const docSnap = await getDoc(timetableDocRef);

  if (!docSnap.exists() || !(docSnap.data().schedule?.length)) {
    timetableList.innerHTML = "<li>No timetable for today.</li>";
    return;
  }

  timetableList.innerHTML = "";
  docSnap.data().schedule.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `${item.time} - ${item.subject}: ${item.topic}
      <button class="delete-btn" style="margin-left:10px;">🗑️</button>`;
    
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.onclick = async () => {
      const confirmed = confirm("Delete this timetable entry?");
      if (!confirmed) return;

      const updatedSchedule = [...docSnap.data().schedule];
      updatedSchedule.splice(index, 1);

      await setDoc(timetableDocRef, { schedule: updatedSchedule }, { merge: true });
      await loadTimetable(); // Refresh
    };

    timetableList.appendChild(li);
  });
}

async function loadVideos(uid) {
  videoLinksList.innerHTML = "<li>Loading videos...</li>";
  const videosCollectionRef = collection(db, 'videoLinks', uid, 'videos');
  const snapshot = await getDocs(videosCollectionRef);

  if (snapshot.empty) {
    videoLinksList.innerHTML = "<li>No videos yet.</li>";
    return;
  }

  videoLinksList.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement('li');

    li.innerHTML = `
      <strong>${data.title}</strong><br/>
      <a href="${data.url}" target="_blank">${data.url}</a><br/>
      <small>${data.description || ''}</small>
      <button class="delete-video-btn" style="margin-left:10px;">🗑️</button>
    `;

    const deleteBtn = li.querySelector('.delete-video-btn');
    deleteBtn.onclick = async () => {
      const confirmed = confirm("Delete this video?");
      if (!confirmed) return;

      await deleteDoc(doc(db, 'videoLinks', uid, 'videos', docSnap.id));
      await loadVideos(uid); // Refresh
    };

    videoLinksList.appendChild(li);
  });
}


function generateChatId(uid1, uid2) {
  return uid1 < uid2 ? uid1 + "_" + uid2 : uid2 + "_" + uid1;
}


function setupChat(uid) {
  const ownerUid = "CzhEWWPHjpQlMmiiHOqxQNEiK9k1";
  const chatId = generateChatId(uid, ownerUid);
  const messagesCollectionRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesCollectionRef, orderBy('sentAt', 'asc'));

  if (chatListener) chatListener(); // unsubscribe old

  chatListener = onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = "";
    snapshot.forEach(docSnap => {
      const msg = docSnap.data();
      const p = document.createElement('p');

      const isCurrentUser = msg.senderUid === auth.currentUser.uid;

      p.textContent = `${msg.senderName || 'User'}: ${msg.text}`;
      p.className = isCurrentUser ? 'user' : 'owner';

      chatMessages.appendChild(p);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  sendChatBtn.onclick = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderUid: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || "User",
        text: text,
        sentAt: serverTimestamp()
      });
      chatInput.value = "";
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
}







// let currentUserEmail = null;

// onAuthStateChanged(auth, async (user) => {
//   if (user) {
//     currentUserEmail = user.email;
//     document.getElementById('reqEmail').value = user.email;

//     // Show dashboard
//     document.getElementById('loginStatus').style.display = "none";
//     document.getElementById('dashboardDiv').classList.remove('hidden');

//     // Optional: check if user already submitted today's attendance
//     const today = new Date().toISOString().split('T')[0];
//     const attendanceDocRef = doc(db, "attendance", user.uid);
//     const attendanceDoc = await getDoc(attendanceDocRef);
//     if (attendanceDoc.exists() && attendanceDoc.data()[today]) {
//       attendanceCheckbox.checked = true;
//       attendanceCheckbox.disabled = true;
//       submitAttendanceBtn.disabled = true;
//       attendanceStatus.textContent = "You have already marked attendance for today.";
//     }
//   } else {
//     document.getElementById('loginStatus').textContent = "Not authenticated!";
//   }
// });

submitAttendanceBtn.addEventListener('click', async () => {
  if (!attendanceCheckbox.checked) {
    attendanceStatus.textContent = "Please check the box to mark attendance.";
    return;
  }

  if (!auth.currentUser) {
    attendanceStatus.textContent = "You're not logged in!";
    return;
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const uid = auth.currentUser.uid;

  try {
    const attendanceDocRef = doc(db, "attendance", uid);
    const attendanceData = {
      [today]: true
    };
    await setDoc(attendanceDocRef, attendanceData, { merge: true });

    attendanceStatus.textContent = "Attendance submitted successfully!";
    attendanceCheckbox.disabled = true;
    submitAttendanceBtn.disabled = true;
  } catch (error) {
    console.error("Error submitting attendance:", error);
    attendanceStatus.textContent = "Error submitting attendance. Please try again.";
  }
});


// async function loadLeaderboard() {
//   leaderboardBody.innerHTML = "<tr><td colspan='3'>Loading leaderboard...</td></tr>";

//   try {
//     // Query top 10 users ordered by score descending
//     const usersRef = collection(db, 'users');
//     const q = query(usersRef, orderBy('score', 'desc'), limit(10));
//     const querySnapshot = await getDocs(q);

//     if (querySnapshot.empty) {
//       leaderboardBody.innerHTML = "<tr><td colspan='3'>No leaderboard data available.</td></tr>";
//       return;
//     }

//     leaderboardBody.innerHTML = ""; // Clear loading message

//     let rank = 1;
//     querySnapshot.forEach(docSnap => {
//       const data = docSnap.data();
//       const tr = document.createElement('tr');

//       const rankTd = document.createElement('td');
//       rankTd.textContent = rank++;

//       const nameTd = document.createElement('td');
//       nameTd.textContent = data.name || "Unnamed";

//       const scoreTd = document.createElement('td');
//       scoreTd.textContent = data.score || 0;

//       tr.appendChild(rankTd);
//       tr.appendChild(nameTd);
//       tr.appendChild(scoreTd);

//       leaderboardBody.appendChild(tr);
//     });
//   } catch (error) {
//     leaderboardBody.innerHTML = `<tr><td colspan='3'>Failed to load leaderboard.</td></tr>`;
//     console.error("Error loading leaderboard:", error);
//   }
// }

