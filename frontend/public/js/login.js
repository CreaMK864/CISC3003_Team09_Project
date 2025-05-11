/**
 * @fileoverview Login page functionality for user authentication
 * @module login
 */

import { signInWithEmail, signInWithGoogle, initializeAuth } from "./auth.js";

// DOM elements
/** @type {HTMLButtonElement|null} */
const loginBtn = /** @type {HTMLButtonElement|null} */ (
  document.getElementById("loginBtn")
);

/** @type {HTMLFormElement|null} */
const loginForm = /** @type {HTMLFormElement|null} */ (
  document.getElementById("login-form")
);

/** @type {HTMLElement|null} */
const errorMessage = document.getElementById("error-message");

/** @type {HTMLButtonElement|null} */
const googleSignInBtn = /** @type {HTMLButtonElement|null} */ (
  document.getElementById("googleSignInBtn")
);

/**
 * Handle form submission event
 * @param {Event} event - The form submission event
 */
loginForm?.addEventListener("submit", async (event) => {
  event?.preventDefault();
});

/**
 * Handle login button click event
 * @param {Event} event - The click event
 */
if (loginBtn) {
  loginBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    /** @type {HTMLInputElement|null} */
    const emailInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("email")
    );
    /** @type {HTMLInputElement|null} */
    const passwordInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("password")
    );
    if (!emailInput || !passwordInput || !errorMessage) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    try {
      const user = await signInWithEmail(email, password);

      if (user) {
        window.location.href = "home.html";
      } else {
        errorMessage.textContent =
          "Login failed. Please check your credentials.";
        errorMessage.style.display = "block";
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Login error:", error.message);
        errorMessage.textContent = `Login failed: ${error.message}`;
      } else {
        console.error("Login error: Unknown error");
        errorMessage.textContent = "Login failed: An unknown error occurred";
      }
      errorMessage.style.display = "block";
    }
  });
}

/**
 * Handle Google sign-in button click event
 */
if (googleSignInBtn && errorMessage) {
  googleSignInBtn.addEventListener("click", async () => {
    const response = await signInWithGoogle();
    if (response?.error) {
      errorMessage.textContent = response.error.message;
    }
  });
}

/**
 * Check if user is already authenticated on page load
 */
document.addEventListener("DOMContentLoaded", async () => {
  const user = await initializeAuth();
  if (user) {
    // Redirect to chat page if already authenticated
    window.location.href = "home.html";
  }
});
