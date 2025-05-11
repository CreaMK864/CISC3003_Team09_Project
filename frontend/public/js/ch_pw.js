import { changePassword } from "./auth.js";

// DOM elements
const changePasswordForm = /** @type {HTMLFormElement} */ (
  document.getElementById("change-password-form")
);
const successMessage = /** @type {HTMLElement} */ (
  document.getElementById("success-message")
);
const errorMessage = /** @type {HTMLElement} */ (
  document.getElementById("error-message")
);

if (errorMessage) {
  errorMessage.style.display = "none";
}

// Handle form submission
if (changePasswordForm && successMessage && errorMessage) {
  changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const passwordInput = /** @type {HTMLInputElement} */ (
      document.getElementById("password")
    );
    const confirmPasswordInput = /** @type {HTMLInputElement} */ (
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
