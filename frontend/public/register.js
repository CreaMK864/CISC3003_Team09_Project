import { signUpWithEmail, initializeAuth } from "./auth.js";

// DOM elements
const register_form = document.getElementById("register-form");

// Handle form submission
register_form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMessage = document.getElementById("error-message");
  const successMessage = document.getElementById("success-message");
  successMessage.style.display = "none";
  errorMessage.style.display = "none";

  try {
    const user = await signUpWithEmail(email, password);

    if (user) {
      successMessage.textContent =
        "The validating email has sent, check your email!";
      successMessage.style.display = "block";
      register_form.reset();
    } else {
      errorMessage.textContent =
        "Register failed. Please check your credentials.";
      errorMessage.style.display = "block";
    }
  } catch (error) {
    console.error("Login error:", error.message);
    errorMessage.textContent = `Register failed: ${error.message}`;
    errorMessage.style.display = "block";
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
