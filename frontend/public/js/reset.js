import { resetPassword } from "./auth.js";

// DOM elements
const resetForm = /** @type {HTMLFormElement} */ (
  document.getElementById("reset-form")
);
const errorMessage = /** @type {HTMLElement} */ (
  document.getElementById("error-message")
);
const successMessage = /** @type {HTMLElement} */ (
  document.getElementById("success-message")
);

// Handle form submission
if (resetForm && errorMessage && successMessage) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = /** @type {HTMLInputElement} */ (
      document.getElementById("email")
    );
    if (!emailInput) return;

    const email = emailInput.value.trim();
    errorMessage.style.display = "none";
    successMessage.style.display = "none";

    try {
      // Update the user's password
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
