/**
 * @fileoverview Password reset functionality for users who forgot their password
 * @module reset
 */

import { resetPassword } from "./auth.js";

// DOM elements
/** @type {HTMLFormElement|null} */
const resetForm = /** @type {HTMLFormElement|null} */ (
  document.getElementById("reset-form")
);
/** @type {HTMLElement|null} */
const errorMessage = /** @type {HTMLElement|null} */ (
  document.getElementById("error-message")
);
/** @type {HTMLElement|null} */
const successMessage = /** @type {HTMLElement|null} */ (
  document.getElementById("success-message")
);

/**
 * Handle password reset form submission
 * Sends a password reset email to the user's email address
 */
if (resetForm && errorMessage && successMessage) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    /** @type {HTMLInputElement|null} */
    const emailInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("email")
    );
    if (!emailInput) return;

    const email = emailInput.value.trim();
    errorMessage.style.display = "none";
    successMessage.style.display = "none";

    try {
      // Send password reset email
      const status = await resetPassword(email);
      if (status) {
        successMessage.textContent =
          "The resetting Email has sent. Please check your email";
        successMessage.style.display = "block";
        resetForm.reset();
      }
    } catch (error) {
      if (error instanceof Error) {
        errorMessage.textContent = `Error: ${error.message}`;
      } else {
        errorMessage.textContent = "An unknown error occurred";
      }
      errorMessage.style.display = "block";
    }
  });
}
