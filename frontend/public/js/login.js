import { signInWithEmail, signInWithGoogle, initializeAuth } from "./auth.js";

// DOM elements
const loginBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById("loginBtn")
);
const loginForm = /** @type {HTMLFormElement} */ (
  document.getElementById("login-form")
);
const errorMessage = /** @type {HTMLElement} */ (
  document.getElementById("error-message")
);
const googleSignInBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById("googleSignInBtn")
);

// Handle form submission
loginForm?.addEventListener("submit", async (event) => {
  event?.preventDefault();
});

if (loginBtn) {
  loginBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    const emailInput = /** @type {HTMLInputElement} */ (
      document.getElementById("email")
    );
    const passwordInput = /** @type {HTMLInputElement} */ (
      document.getElementById("password")
    );
    if (!emailInput || !passwordInput) return;

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

if (googleSignInBtn) {
  googleSignInBtn.addEventListener("click", async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      errorMessage.textContent = error.message;
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
