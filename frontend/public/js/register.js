import { signUpWithEmail, initializeAuth } from "./auth.js";

// DOM elements
const register_form = /** @type {HTMLFormElement} */ (
  document.getElementById("register-form")
);

// Handle form submission
if (register_form) {
  register_form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = /** @type {HTMLInputElement} */ (
      document.getElementById("email")
    );
    const passwordInput = /** @type {HTMLInputElement} */ (
      document.getElementById("password")
    );
    const errorMessage = /** @type {HTMLElement} */ (
      document.getElementById("error-message")
    );
    const successMessage = /** @type {HTMLElement} */ (
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

// Check if user is already authenticated
document.addEventListener("DOMContentLoaded", async () => {
  const user = await initializeAuth();
  if (user) {
    // Initialize app to set up conversation
    // Redirect to chat page
    window.location.href = "home.html";
  }
});
