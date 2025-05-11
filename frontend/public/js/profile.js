import { API_BASE_URL } from "./config.js";
import { initializeAuth, checkAuth } from "./auth.js";
import { get_username } from "./app.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await initializeAuth();
  if (user) {
    update_profile(user);
  }
});
/**
 * Apply the selected theme to the document
 * @param {string} uid
 * @param {string} newUsername
 */
async function update_username(uid, newUsername) {
  const session = await checkAuth();

  try {
    const response = await fetch(`${API_BASE_URL}/users/${uid}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ display_name: newUsername }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("There was a problem with the update operation:", error);
  }
}

async function update_profile(user) {
  const uid = user.id;
  const user_name = await get_username(uid);
  const profile_name = document.getElementById("profile_name");
  const profile_form = document.getElementById("profile-form");
  const profile_email = document.getElementById("profile_email");
  const profile_btn = document.getElementById("profile_btn");
  const success_msg = document.getElementById("success-message");

  profile_email.value = user.email;
  profile_name.placeholder = user_name;
  success_msg.style.display = "none";

  profile_name.addEventListener("input", async () => {
    if (profile_name.value != user_name) {
      profile_btn.disabled = false;
    } else {
      profile_btn.disabled = true;
    }
  });

  profile_form.addEventListener("submit", async () => {
    event?.preventDefault();
    if (profile_name.value != user_name) {
      await update_username(uid, profile_name.value);
      success_msg.textContent = "Your username has been updated!";
      success_msg.style.display = "block";

      await new Promise((resolve) => setTimeout(resolve, 1500));
      window.location.href = "profile.html";
    }
  });
}
