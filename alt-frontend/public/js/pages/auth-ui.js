import { checkAuth, signInWithEmail, signUpWithEmail, signInWithGoogle } from "../lib/auth.js";

// DOM Elements
/** @type {HTMLInputElement} */
const emailInput = document.getElementById("email");
/** @type {HTMLInputElement} */
const passwordInput = document.getElementById("password");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const googleSignInBtn = document.getElementById("googleSignInBtn");
/** @type {HTMLDivElement} */
const errorMessage = document.getElementById("errorMessage");

// Check if user is already logged in
async function initializeAuth() {
    const session = await checkAuth();
    if (session) {
        console.log(session)
        window.location.href = "./chat.html";
    }
}

// Initialize auth state
initializeAuth();

// Event Listeners
signInBtn?.addEventListener("click", async () => {
    const email = emailInput?.value;
    const password = passwordInput?.value;
    if (email && password) {
        const { error } = await signInWithEmail(email, password);
        if (error) {
            errorMessage.textContent = error.message;
        } else {
            console.log("Sign in successful");
            window.location.href = "./chat.html";
        }
    } else {
        errorMessage.textContent = "Please fill in all fields";
    }
});

signUpBtn?.addEventListener("click", async () => {
    const email = emailInput?.value;
    const password = passwordInput?.value;
    if (email && password) {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
            errorMessage.textContent = error.message;
        } else {
            errorMessage.textContent = "Please check your email for verification link";
        }
    } else {
        errorMessage.textContent = "Please fill in all fields";
    }
});

googleSignInBtn?.addEventListener("click", async () => {
    const { error } = await signInWithGoogle();
    if (error) {
        errorMessage.textContent = error.message;
    }
}); 