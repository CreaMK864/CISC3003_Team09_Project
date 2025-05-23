/**
 * @fileoverview Registration page functionality for new user signup
 * @module register
 */

import { signUpWithEmail, initializeAuth } from "./auth.js";

// DOM elements
/** @type {HTMLFormElement|null} */
const register_form = /** @type {HTMLFormElement|null} */ (
  document.getElementById("register-form")
);

/**
 * Handle registration form submission
 * @param {Event} event - The form submission event
 */
if (register_form) {
  register_form.addEventListener("submit", async (event) => {
    event.preventDefault();

    /** @type {HTMLInputElement|null} */
    const emailInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("email")
    );
    /** @type {HTMLInputElement|null} */
    const passwordInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("password")
    );
    /** @type {HTMLElement|null} */
    const errorMessage = /** @type {HTMLElement|null} */ (
      document.getElementById("error-message")
    );
    /** @type {HTMLElement|null} */
    const successMessage = /** @type {HTMLElement|null} */ (
      document.getElementById("success-message")
    );

    if (!emailInput || !passwordInput || !errorMessage || !successMessage)
      return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
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
      if (error instanceof Error) {
        console.error("Login error:", error.message);
        errorMessage.textContent = `Register failed: ${error.message}`;
      } else {
        console.error("Login error: Unknown error");
        errorMessage.textContent = "Register failed: An unknown error occurred";
      }
      errorMessage.style.display = "block";
    }
  });
}

/**
 * Check if user is already authenticated on page load
 * Redirects to home page if user is already logged in
 */
document.addEventListener("DOMContentLoaded", async () => {
  const user = await initializeAuth();
  if (user) {
    // Redirect to home page if already authenticated
    window.location.href = "home.html";
  }
});
