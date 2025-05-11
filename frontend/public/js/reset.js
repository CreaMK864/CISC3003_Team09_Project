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
    const status = await resetPassword(email);
    if (status) {
      successMessage.textContent =
        "The resetting Email has sent. Please check your email";
      successMessage.style.display = "block";
      resetForm.reset();
    }
  } catch (error) {
    errorMessage.textContent = `Error: ${error.message}`;
    errorMessage.style.display = "block";
  }
});
