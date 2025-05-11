/**
 * @fileoverview Change password page functionality
 * @module ch_pw
 */

import { changePassword } from "./auth.js";

// DOM elements
/** @type {HTMLFormElement|null} */
const changePasswordForm = /** @type {HTMLFormElement|null} */ (
  document.getElementById("change-password-form")
);
/** @type {HTMLElement|null} */
const successMessage = /** @type {HTMLElement|null} */ (
  document.getElementById("success-message")
);
/** @type {HTMLElement|null} */
const errorMessage = /** @type {HTMLElement|null} */ (
  document.getElementById("error-message")
);

// Hide error message initially
if (errorMessage) {
  errorMessage.style.display = "none";
}

/**
 * Handle password change form submission
 * Validates passwords match and updates user's password
 */
if (changePasswordForm && successMessage && errorMessage) {
  changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    /** @type {HTMLInputElement|null} */
    const passwordInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("password")
    );
    /** @type {HTMLInputElement|null} */
    const confirmPasswordInput = /** @type {HTMLInputElement|null} */ (
      document.getElementById("confirm-password")
    );
    if (!passwordInput || !confirmPasswordInput) return;

    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    successMessage.style.display = "none";

    // Validate that passwords match
    if (password !== confirmPassword) {
      errorMessage.textContent = "Passwords do not match.";
      errorMessage.style.display = "block";
      return;
    }

    try {
      // Update the user's password
      const success = await changePassword(password);

      if (success) {
        successMessage.textContent =
          "Password updated successfully. Redirecting to login...";
        successMessage.style.display = "block";
        changePasswordForm.reset();

        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      } else {
        errorMessage.textContent = `Cannot update password`;
        errorMessage.style.display = "block";
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
