import { changePassword } from "./auth.js";

// DOM elements
const changePasswordForm = document.getElementById("change-password-form");
const successMessage = document.getElementById("success-message");
const errorMessage = document.getElementById("error-message");

errorMessage.style.display = "none";
// Handle form submission
changePasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = document.getElementById("password").value.trim();
  const confirmPassword = document
    .getElementById("confirm-password")
    .value.trim();
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
    errorMessage.textContent = `Error: ${error.message}`;
    errorMessage.style.display = "block";
  }
});
