import { resetPassword } from "./auth.js";

// DOM elements
const resetForm = document.getElementById("reset-form");
const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");

// Handle form submission
resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  errorMessage.style.display = "none";
  successMessage.style.display = "none";

  try {
    // Update the user's password
    const success = await resetPassword(email);

    if (success) {
      successMessage.textContent =
        "Email founded. Ready to reset your password...";
      successMessage.style.display = "block";
      resetForm.reset();

      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = "ch_pw.html";
      }, 2000);
    } else {
      errorMessage.textContent = `Failed to find your email address`;
      errorMessage.style.display = "block";
    }
  } catch (error) {
    errorMessage.textContent = `Error: ${error.message}`;
    errorMessage.style.display = "block";
  }
});
