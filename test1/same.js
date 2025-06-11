// quiz.js

import { auth, db } from "../login/firebase-init.js";
import {
  collection,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import {
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";


let countdown;
let timeLeftInSeconds = 0;
let currentUser = null;

// Track user login state globally
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("User is logged in:", user.email);
    currentUser = user;
  } else {
    console.log("No user logged in.");
    currentUser = null;
  }
});

const answers = window.quizAnswers || {};
const explanations = window.quizExplanations || {};
// Start quiz after instructions and timer set
function startQuiz() {
  const minutesInput = document.getElementById("timerInput").value;
  const noTimerChecked = document.getElementById("noTimerCheck").checked;

  document.querySelector(".instructions").classList.add("hidden");
  document.getElementById("quizForm").classList.remove("hidden");

  if (!noTimerChecked) {
    const minutes = parseInt(minutesInput);
    if (!minutes || minutes <= 0) return;

    timeLeftInSeconds = minutes * 60;
    document.getElementById("timerDisplay").classList.remove("hidden");
    startTimer();
  }
}

// Timer countdown function
function startTimer() {
  const timeEl = document.getElementById("time");
  countdown = setInterval(() => {
    const minutes = Math.floor(timeLeftInSeconds / 60);
    const seconds = timeLeftInSeconds % 60;
    timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    timeLeftInSeconds--;

    if (timeLeftInSeconds < 0) {
      clearInterval(countdown);
      submitQuiz(); // Auto-submit on timeout
    }
  }, 1000);
}

// Submit quiz answers, show results, save if logged in
async function submitQuiz() {
  clearInterval(countdown);
  document.getElementById("timerDisplay").classList.add("hidden");

  const form = document.getElementById("quizForm");
  const resultSection = document.getElementById("resultSection");
  const scoreDisplay = document.getElementById("scoreDisplay");
  const explanationContainer = document.getElementById("explanations");
  const saveDataMessage = document.getElementById("saveDataMessage");

  let score = 0;
  const totalQuestions = Object.keys(answers).length;
  let attempted = 0;

  explanationContainer.innerHTML = "";

  for (let key in answers) {
    const selected = form.querySelector(`input[name="${key}"]:checked`);
    const correctAnswer = answers[key];
    const explanation = explanations[key];

    if (selected) {
      attempted++;
      if (selected.value === correctAnswer) {
        score++;
        explanationContainer.innerHTML += `<p class="correct">✔️ Question ${key.slice(1)} - Correct! ${explanation}</p>`;
      } else {
        explanationContainer.innerHTML += `<p class="wrong">❌ Question ${key.slice(1)} - Wrong. ${explanation}</p>`;
      }
    } else {
      explanationContainer.innerHTML += `<p class="wrong">❌ Question ${key.slice(1)} - Not Answered. ${explanation}</p>`;
    }
  }

  scoreDisplay.innerText = `You scored ${score} out of ${totalQuestions}`;
  form.classList.add("hidden");
  resultSection.classList.remove("hidden");

if (currentUser) {
  const urlParts = window.location.pathname.split("/");
  const subject = urlParts[urlParts.length - 2];
  const chapter = decodeURIComponent(urlParts[urlParts.length - 1].replace(".html", ""));

  const result = {
    userId: currentUser.uid,
    email: currentUser.email,
    attempted,
    correct: score,
    wrong: attempted - score,
    total: totalQuestions,
    submittedAt: Timestamp.now(),
    subject,
    chapter
  };

  try {
    const globalDocId = `${currentUser.uid}_${subject}_${chapter}`;
    await setDoc(doc(db, "quizResults", globalDocId), result);

    const chapterKey = `${subject}_${chapter}`;
    await setDoc(doc(db, "users", currentUser.uid, "tests", chapterKey), {
      score,
      attempted,
      total: totalQuestions,
      completedAt: new Date().toISOString()
    });

    saveDataMessage.innerText = "✅ Your results have been saved.";
    saveDataMessage.style.color = "green";

  } catch (error) {
    console.error("Error saving result:", error);
    saveDataMessage.innerText = "❌ Error saving your results.";
    saveDataMessage.style.color = "red";
  }
}
 else {
    // Show login message for non-logged users
    saveDataMessage.innerText = "ℹ️ Login to save your quiz results.";
    saveDataMessage.style.color = "orange";
  }
}

document.getElementById("finishBtn").addEventListener("click", () => {
  window.location.href = "../../index.html"; // <-- Adjust path to your actual main page
});

// Save test result in user’s Firestore path
async function saveTestResult(userId, subject, chapter, result) {
  try {
    const docRef = doc(db, "users", userId, "results", `${subject}-${chapter}`);
    await setDoc(docRef, result);
    console.log("Structured test result saved.");
  } catch (e) {
    console.error("Error saving structured result:", e);
  }
}

// Export functions to be used in HTML button onclick etc.
export { startQuiz, submitQuiz };


window.startQuiz = startQuiz;
window.submitQuiz = submitQuiz;
