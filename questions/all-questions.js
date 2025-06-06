import { auth } from '../login/firebase-init.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";




  document.getElementById("backArrow").addEventListener("click", function (e) {
    e.preventDefault();
    if (document.referrer) {
      history.back();
    } else {
      window.location.href = "index.html";
    }
  });

const db = getFirestore();
const doubtsCollection = collection(db, "doubts");

const questionsList = document.getElementById("questionsList");
// DOM elements (connect JS to HTML)
const askBtn = document.getElementById("askBtn");
const modal = document.getElementById("modal");
const closeModalBtn = document.getElementById("closeModal");
const modalQuestionTitle = document.getElementById("modalQuestionTitle");
const modalQuestionDesc = document.getElementById("modalQuestionDesc");
const questionFormModal = document.getElementById("questionFormModal");





askBtn.addEventListener("click", () => {
  modal.style.display = "block";
});

// Close modal on close button click or outside click
closeModalBtn.addEventListener("click", () => {
  modal.style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

function createQuestionElement(questionDoc) {
  const data = questionDoc.data();
  const questionId = questionDoc.id;

  const container = document.createElement("div");
  container.className = "question-item";

  // Title & Description
  const title = document.createElement("h3");
  title.textContent = data.title;
  container.appendChild(title);

  const desc = document.createElement("p");
  desc.textContent = data.description;
  container.appendChild(desc);

  // Answer toggle button
  const answerBtn = document.createElement("button");
  answerBtn.textContent = "Answer";
  answerBtn.className = "answer-btn";
  container.appendChild(answerBtn);

  // Answer form container (hidden initially)
  const answerFormDiv = document.createElement("div");
  answerFormDiv.className = "answer-form";
  container.appendChild(answerFormDiv);

  const textarea = document.createElement("textarea");
  textarea.placeholder = "Type your answer here...";
  answerFormDiv.appendChild(textarea);

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "Submit Answer";
  answerFormDiv.appendChild(submitBtn);

  // Answers list container
  const answersListDiv = document.createElement("div");
  answersListDiv.className = "answers-list";
  container.appendChild(answersListDiv);

  // Toggle answer form on button click
  answerBtn.addEventListener("click", () => {
    answerFormDiv.style.display = answerFormDiv.style.display === "none" || answerFormDiv.style.display === "" ? "block" : "none";
  });

  // Submit answer logic
  submitBtn.addEventListener("click", async () => {
    const answerText = textarea.value.trim();
    if (!answerText) {
      alert("Please enter your answer.");
      return;
    }

    if (!auth.currentUser) {
      alert("Please log in to submit an answer.");
      return;
    }

    try {
      const answersCollection = collection(db, "doubts", questionId, "answers");
      await addDoc(answersCollection, {
        text: answerText,
        createdAt: serverTimestamp(),
        userId: auth.currentUser.uid,
      });
      textarea.value = "";
      answerFormDiv.style.display = "none";
    } catch (error) {
      console.error("Error submitting answer:", error);
      alert("Failed to submit answer. Try again.");
    }
  });

  // Real-time listener for answers to this question
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
      ansDiv.className = "answer-item";

      const ansText = document.createElement("p");
      ansText.textContent = ansData.text;
      ansDiv.appendChild(ansText);

      if (ansData.createdAt && ansData.createdAt.toDate) {
        const dateSpan = document.createElement("small");
        dateSpan.textContent = ansData.createdAt.toDate().toLocaleString();
        ansDiv.appendChild(dateSpan);
      }

      answersListDiv.appendChild(ansDiv);
    });
  });

  return container;
}

// Load all questions with real-time updates
const questionsQuery = query(doubtsCollection, orderBy("createdAt", "desc"));
onSnapshot(questionsQuery, (snapshot) => {
  questionsList.innerHTML = "";

  if (snapshot.empty) {
    questionsList.innerHTML = "<p>No questions have been asked yet.</p>";
    return;
  }

  snapshot.forEach(docSnap => {
    const questionElement = createQuestionElement(docSnap);
    questionsList.appendChild(questionElement);
  });
});


questionFormModal.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = modalQuestionTitle.value.trim();
  const description = modalQuestionDesc.value.trim();

  if (!title || !description) {
    alert("Please fill in both the title and description.");
    return;
  }

  try {
    await addDoc(collection(db, "doubts"), {
      title,
      description,
      answer: "",
      createdAt: serverTimestamp()
    });
    questionFormModal.reset();
    modal.style.display = "none";
  } catch (error) {
    alert("Error submitting your question. Please try again.");
    console.error("Error adding question:", error);
  }
});

// renderQuestions();


const canvas = document.getElementById("crystal-canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let crystals = [];

const colors = [
  '#00ffff', '#ff00ff', '#00ff99', '#ffff00', '#a1c4fd', '#c2e9fb', '#fbc2eb', '#a18cd1', '#fda085', '#fad0c4', '#84fab0', '#8fd3f4', '#fccb90', '#e0c3fc', '#ff9a9e', '#ffdde1', '#b2fefa', '#d4fc79', '#96e6a1', '#ffe29f', '#f5f7fa', '#e6e9f0', '#fbc7d4'  
];

for (let i = 0; i < 120; i++) {
  crystals.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1 + 1,
    dx: (Math.random() - 0.5) * 5,
    dy: (Math.random() - 0.5) * 5,
    glow: colors[Math.floor(Math.random() * colors.length)]
  });
}

function drawCrystals() {
  // Draw a semi-transparent black rectangle to fade previous frames (trail effect)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let c of crystals) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fillStyle = c.glow;
    ctx.shadowBlur = 0;
    ctx.shadowColor = c.glow;   
    ctx.fill();
  }
}

function updateCrystals() {
  for (let c of crystals) {
    c.x += c.dx;
    c.y += c.dy;

    // Bounce from edges
    if (c.x < 0 || c.x > canvas.width) c.dx = -c.dx;
    if (c.y < 0 || c.y > canvas.height) c.dy = -c.dy;
  }
}

function animate() {
  drawCrystals();
  updateCrystals();
  requestAnimationFrame(animate);
}

animate();

// Resize canvas on window resize
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});


console.log("Starting animation...");
animate();
