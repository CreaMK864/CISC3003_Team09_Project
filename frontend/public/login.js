import { signInWithEmail, initializeAuth } from "./auth.js";

// DOM elements
const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");

// Handle form submission
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const user = await signInWithEmail(email, password);

    if (user) {
      window.location.href = "index.html";
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

// Check if user is already authenticated
document.addEventListener("DOMContentLoaded", async () => {
  const user = await initializeAuth();
  if (user) {
    // Initialize app to set up conversation
    // Redirect to chat page
    window.location.href = "index.html";
  }
});
