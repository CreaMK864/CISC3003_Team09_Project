/**
 * @fileoverview Profile page functionality for managing user profile information
 * @module profile
 */

import { API_BASE_URL } from "./config.js";
import { initializeAuth, checkAuth } from "./auth.js";
import { get_username } from "./app.js";

/**
 * Initialize profile page and load user data
 */
document.addEventListener("DOMContentLoaded", async () => {
  const user = await initializeAuth();
  if (user) {
    update_profile(user);
  }
});

/**
 * Update the user's display name
 * @param {string} uid - The user's unique identifier
 * @param {string} newUsername - The new username to set
 * @returns {Promise<Object|null>} The updated user data or null if failed
 */
async function update_username(uid, newUsername) {
  const session = await checkAuth();
  if (!session) {
    console.error("No active session found");
    return null;
  }

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
    if (error instanceof Error) {
      console.error(
        "There was a problem with the update operation:",
        error.message,
      );
    } else {
      console.error(
        "There was a problem with the update operation: Unknown error",
      );
    }
    return null;
  }
}

/**
 * Initialize and handle profile page functionality
 * @param {import('@supabase/supabase-js').User} user - The current user object
 */
async function update_profile(user) {
  const uid = user.id;
  const user_name = await get_username(uid);

  /** @type {HTMLInputElement|null} */
  const profile_name = /** @type {HTMLInputElement|null} */ (
    document.getElementById("profile_name")
  );
  /** @type {HTMLFormElement|null} */
  const profile_form = /** @type {HTMLFormElement|null} */ (
    document.getElementById("profile-form")
  );
  /** @type {HTMLInputElement|null} */
  const profile_email = /** @type {HTMLInputElement|null} */ (
    document.getElementById("profile_email")
  );
  /** @type {HTMLButtonElement|null} */
  const profile_btn = /** @type {HTMLButtonElement|null} */ (
    document.getElementById("profile_btn")
  );
  /** @type {HTMLElement|null} */
  const success_msg = /** @type {HTMLElement|null} */ (
    document.getElementById("success-message")
  );

  if (
    !profile_name ||
    !profile_form ||
    !profile_email ||
    !profile_btn ||
    !success_msg
  )
    return;

  profile_email.value = user.email || "";
  profile_name.placeholder = user_name;
  success_msg.style.display = "none";

  /**
   * Handle username input changes
   */
  profile_name.addEventListener("input", async () => {
    if (profile_name.value != user_name) {
      profile_btn.disabled = false;
    } else {
      profile_btn.disabled = true;
    }
  });

  /**
   * Handle profile form submission
   * @param {Event} event - The form submission event
   */
  profile_form.addEventListener("submit", async (event) => {
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
