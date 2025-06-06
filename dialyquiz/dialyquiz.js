import { db, auth } from "../login/firebase-init.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// DOM Elements
const quizTitleEl = document.getElementById("quiz-title");
const quizContainer = document.getElementById("quiz-container");
const submitBtn = document.getElementById("submit-btn");
const resultEl = document.getElementById("result");
const instructionScreen = document.getElementById("instruction-screen");
const startBtn = document.getElementById("start-btn");
const mainQuizScreen = document.getElementById("quiz-screen");


// ⏰ Timer Display
const timerDisplay = document.createElement("div");
timerDisplay.id = "timer";
timerDisplay.style = "font-weight: bold; color: red; margin: 10px 0;";
quizTitleEl.parentNode.insertBefore(timerDisplay, quizContainer);

// State variables
let currentUser = null;
let correctAnswers = [];
let userAnswers = [];
let timerInterval;
let quizId = "today quiz";

// 🔒 Check if user is logged in
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const attemptRef = doc(db, "users", user.uid, "attemptedQuizzes", quizId);
        const attemptSnap = await getDoc(attemptRef);

        if (attemptSnap.exists()) {
            instructionScreen.innerHTML = `
              <h2>You have already attempted the quiz ✅</h2>
              <p>Score: ${attemptSnap.data().score}/${attemptSnap.data().total}</p>
            `;
        } else {
            instructionScreen.style.display = "block";
        }
    }  
    
});

// 🧠 Load Quiz Data
async function loadQuiz() {
    quizContainer.innerHTML = "";
    correctAnswers = [];

    const quizRef = doc(db, "quiz", quizId);
    const docSnap = await getDoc(quizRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        quizTitleEl.textContent = data.title;

        data.questions.forEach((q, index) => {
            correctAnswers.push(q.answer);

            const block = document.createElement("div");
            block.className = "question-block";

            block.innerHTML = `
                <h3>Q${index + 1}: ${q.question}</h3>
                <div class="option">
                    ${q.option.map(opt => `
                        <label>
                            <input type="radio" name="q${index}" value="${opt}" />
                            ${opt}
                        </label>
                    `).join('')}
                </div>
            `;

            quizContainer.appendChild(block);
        });
    } else {
        quizTitleEl.textContent = "No quiz found for today.";
    }
}

// ✅ Submit Quiz
async function submitQuiz() {
    clearInterval(timerInterval);
    userAnswers = [];
    let score = 0;

    correctAnswers.forEach((answer, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        const userAns = selected ? selected.value : null;
        userAnswers.push(userAns);

        if (userAns?.trim().toLowerCase() === String(answer).trim().toLowerCase()) {
            score++;
        }
    });

    resultEl.textContent = `✅ You scored ${score} out of ${correctAnswers.length}`;
    submitBtn.disabled = true;
        


    if (currentUser) {
        const attemptRef = doc(db, "users", currentUser.uid, "attemptedQuizzes", quizId);
        const localDateTime = new Date().toLocaleString();

        await setDoc(attemptRef, {
            score: score,
            total: correctAnswers.length,
            answers: userAnswers,
            timestamp: serverTimestamp(),     // Firestore server time
            localTime: localDateTime          // Human-readable local time       
            
        
         });

        alert("Your result has been saved to your account ✅");
    }
}

// 🖱️ Manual Submit Button
submitBtn.addEventListener("click", submitQuiz);

// ⏳ Timer Function
function startTimer(seconds) {
    let time = seconds;

    const updateDisplay = () => {
        const mins = Math.floor(time / 60);
        const secs = time % 60;
        timerDisplay.textContent = `⏰ Time Left: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    updateDisplay();

    timerInterval = setInterval(() => {
        time--;
        updateDisplay();

        if (time <= 0) {
            clearInterval(timerInterval);
            alert("⏰ Time's up! Submitting your quiz.");
            submitQuiz();
        }
    }, 1000);
}

// ▶️ Start Button

const loginWarning = document.getElementById("login-warning");
const loginBtn = document.getElementById("login-btn");

// Helper to show login message + button for a limited time
function showLoginWarning(duration = 5000) {
    loginWarning.style.display = "block";

    // After duration, hide warning
    setTimeout(() => {
        loginWarning.style.display = "none";
    }, duration);
}

// When login button clicked, redirect with "redirect" query param to come back here after login
loginBtn.addEventListener("click", () => {
    const currentPage = window.location.href;
    // encode the URL to be safe in query string
const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `/login/login.html?redirect=${redirectUrl}`;
});

startBtn.addEventListener("click", () => {
    if (!currentUser) {
        // Show login warning message + login button for 5 seconds
        showLoginWarning(5000);
        return; // prevent quiz start
    }

    // Hide warning if any
    loginWarning.style.display = "none";

    instructionScreen.style.display = "none";
    mainQuizScreen.style.display = "block";
    loadQuiz();
    startTimer(5 * 60); // 5 minutes
});



