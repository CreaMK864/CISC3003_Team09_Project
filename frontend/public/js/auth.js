/**
 * @fileoverview Authentication module for handling user authentication with Supabase
 * @module auth
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** @type {import('@supabase/supabase-js').User|null} */
let currentUser = null;

/**
 * Check if user is already authenticated and initialize the app
 * @returns {Promise<import('@supabase/supabase-js').Session | null>} The current session if authenticated
 */
async function checkAuth() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Initialize authentication state and check for existing session
 * @returns {Promise<import('@supabase/supabase-js').User|null>} The current user if authenticated
 */
async function initializeAuth() {
  // Get session from local storage
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    console.log("User is authenticated:", currentUser.email);
    return session.user;
  } else {
    //showLoginForm();
    return null;
  }
}

/**
 * Show login form to prompt for credentials
 * @returns {void}
 */
function showLoginForm() {
  // This is a simplified approach - in a real app, you might want to create a proper login form
  const email = prompt("Enter your email to sign in:");
  const password = prompt("Enter your password:");

  if (email && password) {
    signInWithEmail(email, password);
  }
}

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<import('@supabase/supabase-js').User|null>} The newly created user or null if failed
 */
async function signUpWithEmail(email, password) {
  try {
    /** @type {import('@supabase/supabase-js').AuthResponse} */
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    currentUser = data.user;
    console.log("Signed up successfully:", currentUser.email);
    return currentUser;
  } catch (error) {
    console.error("Error signing up:", error.message);
    // alert("Login failed: " + error.message);
    //showLoginForm(); // Show login form again if login fails
    return null;
  }
}

/**
 * Sign in user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<import('@supabase/supabase-js').User|null>} The authenticated user or null if failed
 */
async function signInWithEmail(email, password) {
  try {
    /** @type {import('@supabase/supabase-js').AuthResponse} */
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    currentUser = data.user;
    console.log("Signed in successfully:", currentUser.email);
    return currentUser;
  } catch (error) {
    console.error("Error signing in:", error.message);
    // alert("Login failed: " + error.message);
    //showLoginForm(); // Show login form again if login fails
    return null;
  }
}

/**
 * Sign in with Google using Supabase OAuth
 * @returns {Promise<import('@supabase/supabase-js').AuthResponse|null>} The authentication response or null if failed
 */
async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `https://edlrvbzhxvyvukjmvkof.supabase.co/auth/v1/callback`,
      },
    });

    if (error) {
      console.error("Error signing in with Google:", error.message);
      return null;
    }

    // Supabase UI handles the redirect.  After the user authenticates
    // with Google, they'll be redirected back to your app.  Supabase
    // will automatically update the session.

    return data; // Or handle the data as needed
  } catch (error) {
    console.error("Error signing in with Google:", error.message);
    return null;
  }
}

/**
 * Change the current user's password
 * @param {string} password - The new password
 * @returns {Promise<import('@supabase/supabase-js').User|null>} The updated user or null if failed
 */
async function changePassword(password) {
  try {
    // Update the user's password
    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Password update error:", error.message);
    return null;
  }
}

/**
 * Send a password reset email to the specified address
 * @param {string} email - The email address to send the reset link to
 * @returns {Promise<import('@supabase/supabase-js').AuthResponse|null>} The response or null if failed
 */
async function resetPassword(email) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "./ch_pw.html",
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Sending Reset Email failed:", error.message);
    return null;
  }
}

/**
 * Get the current authentication token
 * @returns {Promise<string>} The current access token or empty string if not authenticated
 */
async function getAuthToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || "";
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error.message);
  } else {
    currentUser = null;
  }
}

/**
 * Get the current authenticated user
 * @returns {import('@supabase/supabase-js').User|null} The current user or null if not authenticated
 */
function getCurrentUser() {
  return currentUser;
}

export {
  initializeAuth,
  showLoginForm,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  getAuthToken,
  signOut,
  getCurrentUser,
  changePassword,
  resetPassword,
  checkAuth,
  supabase,
};
