import { signInWithEmail, signInWithGoogle, initializeAuth } from "./auth.js";

// DOM elements
const loginBtn = document.getElementById("loginBtn");
const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");
const googleSignInBtn = document.getElementById("googleSignInBtn");

// Handle form submission
loginForm?.addEventListener("submit", async () => {
  event?.preventDefault();
});
loginBtn.addEventListener("click", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const user = await signInWithEmail(email, password);

    if (user) {
      window.location.href = "home.html";
    } else {
      errorMessage.textContent = "Login failed. Please check your credentials.";
      errorMessage.style.display = "block";
    }
  } catch (error) {
    console.error("Login error:", error.message);
    errorMessage.textContent = `Login failed: ${error.message}`;
    errorMessage.style.display = "block";
  }
});
googleSignInBtn.addEventListener("click", async () => {
  const { error } = await signInWithGoogle();
  if (error) {
    errorMessage.textContent = error.message;
  }
});
// Check if user is already authenticated
document.addEventListener("DOMContentLoaded", async () => {
  const user = await initializeAuth();
  if (user) {
    // Initialize app to set up conversation
    // Redirect to chat page
    window.location.href = "home.html";
  }
});
