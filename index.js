// Import Firebase modules
import { auth } from './login/firebase-init.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  serverTimestamp,
  limit        // <-- Add this import
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";




import {
  addDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";


// Init Firebase services
const db = getFirestore();

// Init AOS
AOS.init({
  duration: 2000,
  once: true
});

window.scrollTo(0, 0);
window.togglePopup = togglePopup;
window.toggleSidebar = toggleSidebar;

// Popup toggle
const popupMenu = document.getElementById("popupMenu");
const logoButton = document.querySelector(".logo-button");

function togglePopup() {
  popupMenu.style.display = popupMenu.style.display === "block" ? "none" : "block";
}

const sidebarToggleButton = document.querySelector(".menu-icon");
sidebarToggleButton.addEventListener("click", toggleSidebar);

function toggleSidebar() {
  const sidebar = document.getElementById('sidebarMenu');
  sidebar.classList.toggle('active');

  if (sidebar.classList.contains('active')) {
    document.addEventListener('click', handleOutsideClick);
  } else {
    document.removeEventListener('click', handleOutsideClick);
  }
}

function handleOutsideClick(event) {
  const sidebar = document.getElementById('sidebarMenu');
  const hamburger = document.querySelector('.menu-icon');

  if (!sidebar.contains(event.target) && !hamburger.contains(event.target)) {
    sidebar.classList.remove('active');
    document.removeEventListener('click', handleOutsideClick);
  }
}

// Subjects data
const subjects = {
  math: [  "Algebra", "Trignometry", "Co-cordinate Geometry", "Diffrential Calculus", "Applications of Derivatives", "Integral Calculus", 
           "Differential Equations", "Graph Theory and Probability", "Statistics"
 ],
  physics: ["Units and Measurements", "Statics", "Gravitation", "Concepts of Energy", "Thermal Physics", "Sound", "Electricity and Magnetism",
    "Modern Physics"

   ],
  chemistry: [ "Fundamentals Of Chemistry", "Solutions, Acids and bases", "Electrochemistry", "corrosion", "Water Treatment", 
    "Polymers and Engineering Materials",  "Fuels", "Environmental Studies"
  ]
      };

// Save or update test result in Firestore
async function saveTestResult(userId, subject, chapter, resultData) {
  const docRef = doc(db, 'users', userId, 'tests', `${subject}_${chapter}`);
  try {
    await setDoc(docRef, resultData, { merge: true }); // create or update
    console.log('Test result saved/updated');
  } catch (err) {
    console.error('Error saving test result:', err);
  }
}

// Fetch all completed tests of user
async function getCompletedChapters(userId) {
  const snapshot = await getDocs(collection(db, 'users', userId, 'tests'));
  const completed = new Set();
  snapshot.forEach(doc => {
    completed.add(doc.id); // e.g., "math_Quadratic Equations"
  });
  return completed;
}
// Render subject chapter list
async function renderList(list, category) {
  const container = document.getElementById('subjectList');
  container.innerHTML = '';

  const user = auth.currentUser;
  const completedChapters = user ? await getCompletedChapters(user.uid) : new Set();

  list.forEach(name => {
    const div = document.createElement('div');
    div.className = 'item';
    div.textContent = name;

    const chapterKey = `${category}_${name}`;
    if (completedChapters.has(chapterKey)) {
      const dot = document.createElement('span');
      dot.className = 'green-dot';
      div.appendChild(dot);
    }

    div.addEventListener('click', () => {
      window.location.href = `test1/${category}/${encodeURIComponent(name)}.html`;
    });

    container.append(div);
  });

  container.scrollIntoView({ behavior: 'smooth' });
}

let openCategory = null;

document.querySelectorAll('.subject-btn').forEach(btn => {
  btn.addEventListener('click', (event) => {
    event.preventDefault();  // <-- Add this line to prevent default scroll behavior
    const cat = btn.dataset.category;
    if (openCategory === cat) {
      closeList();
      return;
    }
    openCategory = cat;
    renderList(subjects[cat], cat);
  });
});

window.addEventListener('click', e => {
  const listEl = document.getElementById('subjectList');
  const isButton = e.target.closest('.subject-btn');
  const isListItem = e.target.closest('#subjectList');

  if (!isButton && !isListItem) {
    closeList();
  }

  if (!popupMenu.contains(e.target) && !logoButton.contains(e.target)) {
    popupMenu.style.display = "none";
  }
});

function closeList() {
  const container = document.getElementById('subjectList');
  container.innerHTML = '';
  openCategory = null;
}


// Show logged-in popup
function showLoggedInPopup(user) {
  const username = user.displayName || user.email.split('@')[0];

  popupMenu.innerHTML = `
    <ul>
      <li>Welcome, ${username}</li>
      <li><a href="#" id="logoutBtn">Logout</a></li>
      <li><a href="profile/profile.html">Profile</a></li>
      <li><a href="https://www.youtube.com/@JustForKnowing" target="_blank">Subscribe</a></li>
      <li><a href="owner/owner.html">owner login</a></li>
    </ul>
  `;

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
      window.location.reload();
    });
  });
}

// Show logged-out popup (fallback)
function showLoggedOutPopup() {
  popupMenu.innerHTML = `
    <ul>
      <li><a href="login/login.html">Login</a></li>
      <li><a href="login/signup.html">Sign Up</a></li>
      <li><a href="https://www.youtube.com/@JustForKnowing" target="_blank">Subscribe</a></li>
      <li><a href="owner/owner.html">owner login</a></li>


    </ul>
  `;
}

// Auth state listener
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed, user:", user);
  if (user) {
    showLoggedInPopup(user);
  } else {
    showLoggedOutPopup();
  }
});


  // Function to toggle dropdown menus in sidebar
function toggleDropdown(event) {
  event.preventDefault();
  const parentLi = event.target.parentElement;

  // Close other open dropdowns except the clicked one
  document.querySelectorAll('#sidebarMenu ul li.open').forEach(li => {
    if (li !== parentLi) {
      li.classList.remove('open');
    }
  });

  // Toggle open class on the clicked li
  parentLi.classList.toggle('open');
}

// Attach click listeners to all dropdown toggle links
document.querySelectorAll('#sidebarMenu .dropdown-toggle').forEach(link => {
  link.addEventListener('click', toggleDropdown);
});



// Import Firebase modules

// Ask question and show latest one question
// Reference the Firestore collection "doubts"
const doubtsCollection = collection(db, "doubts");
const questionForm = document.getElementById("questionForm");

questionForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("questionTitle").value.trim();
  const description = document.getElementById("questionDesc").value.trim();

  if (!title || !description) {
    alert("Please fill both the question title and description.");
    return;
  }

  try {
    await addDoc(collection(db, "doubts"), {
      title: title,
      description: description,
      createdAt: serverTimestamp()
    });

    questionForm.reset(); // Clear form inputs
  } catch (error) {
    console.error("Error submitting question: ", error);
    alert("Failed to submit question. Please try again.");
  }
});
window.addEventListener('DOMContentLoaded', () => {
  const questionsList = document.getElementById("questionsList");
  const viewAllBtn = document.createElement('button');
  const Answerquestion= document.createElement('button');
  viewAllBtn.textContent = "View All Questions";
  Answerquestion.textContent = "Answer Question";
  viewAllBtn.style.marginTop = "20px";

  // Query latest single question only
  const latestQuestionQuery = query(doubtsCollection, orderBy("createdAt", "desc"), limit(1));

  onSnapshot(latestQuestionQuery, (snapshot) => {
    questionsList.innerHTML = "";

    if (snapshot.empty) {
      questionsList.innerHTML = "<p>No questions asked yet.</p>";
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const questionId = docSnap.id;

      const questionDiv = document.createElement("div");
      questionDiv.className = "question-item";
      questionDiv.style.border = "1px solid #ddd";
      questionDiv.style.padding = "10px";
      questionDiv.style.marginBottom = "10px";
      questionDiv.style.borderRadius = "5px";

      const qTitle = document.createElement("h4");
      qTitle.textContent = data.title;
      questionDiv.appendChild(qTitle);

      const qDesc = document.createElement("p");
      qDesc.textContent = data.description;
      questionDiv.appendChild(qDesc);

      // Show answers for this question on main page too
      const answersListDiv = document.createElement("div");
      answersListDiv.style.marginTop = "15px";
      questionDiv.appendChild(answersListDiv);

      const answersQuery = query(collection(db, "doubts", questionId, "answers"), orderBy("createdAt", "asc"));
      onSnapshot(answersQuery, (answersSnapshot) => {
        answersListDiv.innerHTML = "";
        if (answersSnapshot.empty) {
          answersListDiv.innerHTML = "<em>No answers yet.</em>";
          return;
        }

        answersSnapshot.forEach(answerDoc => {
          const ansData = answerDoc.data();

          const ansDiv = document.createElement("div");
          ansDiv.style.backgroundColor = "#f9f9f9";
          ansDiv.style.border = "1px solid #ccc";
          ansDiv.style.borderRadius = "3px";
          ansDiv.style.padding = "6px";
          ansDiv.style.marginBottom = "6px";

          const ansText = document.createElement("p");
          ansText.textContent = ansData.text;
          ansDiv.appendChild(ansText);

          if (ansData.createdAt && ansData.createdAt.toDate) {
            const dateSpan = document.createElement("small");
            dateSpan.textContent = ansData.createdAt.toDate().toLocaleString();
            dateSpan.style.color = "#666";
            ansDiv.appendChild(dateSpan);
          }

          answersListDiv.appendChild(ansDiv);

        });
      });

      questionsList.appendChild(questionDiv);
    });

    // Add the "View All Questions" button after the question
    questionsList.appendChild(viewAllBtn);
  });

  viewAllBtn.addEventListener('click', () => {
    window.location.href = 'questions/all-questions.html'; // Your full questions page URL
  });
});




// Time Table code
  document.querySelector(".Time_Table").addEventListener("click", function (e) {
    e.preventDefault();

    const popup = this.nextElementSibling;
    popup.style.display = "block";
    setTimeout(() => popup.style.opacity = 1, 10); // Fade in

    // Hide after 3 seconds
    setTimeout(() => {
      popup.style.opacity = 0;
      setTimeout(() => popup.style.display = "none", 300);
    }, 3000);
  });

// Other Than ECET code

  document.querySelector(".OtherThan").addEventListener("click", function (e) {
    e.preventDefault();

    const popup = this.nextElementSibling;
    popup.style.display = "block";
    setTimeout(() => popup.style.opacity = 1, 10); // Fade in

    // Hide after 3 seconds
    setTimeout(() => {
      popup.style.opacity = 0;
      setTimeout(() => popup.style.display = "none", 300);
    }, 3000);
  });

// Independent Subjects Data (rename if needed)
const altSubjects = {
  math: [ "Algebra 2", "Trignometry 2", "Co-cordinate Geometry 2", "Diffrential Calculus 2", "Applications of Derivatives 2", "Integral Calculus 2", 
          "Differential Equations 2", "Graph Theory and Probability 2", "Statistics 2"
  ],
  physics: ["Units and Measurements 2", "Statics 2", "Gravitation 2", "Concepts of Energy 2", "Thermal Physics 2", "Sound 2", "Electricity and Magnetism 2",
    "Modern Physics 2"
  ],
  chemistry: [ "Fundamentals Of Chemistry 2", "Solutions, Acids and bases 2", "Electrochemistry 2", "corrosion 2", "Water Treatment 2", 
    "Polymers and Engineering Materials 2",  "Fuels 2", "Environmental Studies 2"
  ]
};

// Save or update alt test results
async function saveAltTestResult(userId, subject, chapter, resultData) {
  const ref = doc(db, 'users', userId, 'test2', `${subject}_${chapter}`);
  try {
    await setDoc(ref, resultData, { merge: true });
    console.log('Alt test result saved/updated');
  } catch (err) {
    console.error('Error saving alt test result:', err);
  }
}

// Get completed alt chapters
async function getAltCompletedChapters(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'test2'));
  const done = new Set();
  snap.forEach(doc => {
    done.add(doc.id);
  });
  return done;
}

// Render alternative list
async function renderAltList(list, category) {
  const container = document.getElementById('altSubjectList');
  container.innerHTML = '';

  const user = auth.currentUser;
  const completed = user ? await getAltCompletedChapters(user.uid) : new Set();

  list.forEach(name => {
    const div = document.createElement('div');
    div.className = 'alt-item';
    div.textContent = name;

    const chapterKey = `${category}_${name}`;
    if (completed.has(chapterKey)) {
      const dot = document.createElement('span');
      dot.className = 'green-dot';
      div.appendChild(dot);
    }

    div.addEventListener('click', () => {
      window.location.href = `test2/${category}/${encodeURIComponent(name)}.html`;
    });

    container.appendChild(div);
  });

  container.scrollIntoView({ behavior: 'smooth' });
}

let openAltCategory = null;

document.querySelectorAll('.alt-subject-btn').forEach(btn => {
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    const cat = btn.dataset.category;
    if (openAltCategory === cat) {
      closeAltList();
      return;
    }
    openAltCategory = cat;
    renderAltList(altSubjects[cat], cat);
  });
});

window.addEventListener('click', e => {
  const altListEl = document.getElementById('altSubjectList');
  const isAltButton = e.target.closest('.alt-subject-btn');
  const isAltListItem = e.target.closest('#altSubjectList');

  if (!isAltButton && !isAltListItem) {
    closeAltList();
  }

  // Optional: hide different popup menu if needed
  if (!altPopupMenu.contains(e.target) && !altLogoButton.contains(e.target)) {
    altPopupMenu.style.display = "none";
  }
});

function closeAltList() {
  const container = document.getElementById('altSubjectList');
  container.innerHTML = '';
  openAltCategory = null;
}

// this is light theme code
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('themeToggle');
  const icon = toggleBtn.querySelector('.material-icons');

  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    icon.textContent = document.body.classList.contains('light-theme') ? 'dark_mode' : 'light_mode';
  });
});



// Attach toggle listeners
logoButton.addEventListener('click', togglePopup);
document.querySelector('.menu-icon').addEventListener('click', toggleSidebar);
window.addEventListener('scroll', () => console.log('scroll event'));
