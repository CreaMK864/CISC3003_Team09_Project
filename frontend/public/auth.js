import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** @type {import('@supabase/supabase-js').User|null} */
let currentUser = null;

/**
 * Check if user is already authenticated and initialize the app
 * @returns {Promise<import("@supabase/supabase-js").User | null>}
 */
async function initializeAuth() {
  try {
    // Get session from local storage
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      currentUser = session.user;
      console.log("User is authenticated:", currentUser.email);
      return session.user;
    } else {
      console.log("User is not authenticated.");
      return null;
    }
  } catch (error) {
    console.error("Error initializing auth:", error);
    return null;
  }
}

/**
 * Show login form to prompt for credentials (basic prompt - replace with a real form)
 * @returns {void}
 */
function showLoginForm() {
  const email = prompt("Enter your email to sign in:");
  const password = prompt("Enter your password:");

  if (email && password) {
    signInWithEmail(email, password);
  }
}

/**
 * Sign in user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<import('@supabase/supabase-js').User|null>}
 */
async function signInWithEmail(email, password) {
  try {
    /** @type {import('@supabase/supabase-js').AuthResponse} */
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Error signing in:", error);
      throw error;
    }

    currentUser = data.user;
    console.log("Signed in successfully:", currentUser.email);
    return currentUser;
  } catch (error) {
    console.error("Error signing in:", error.message);
    alert("Login failed: " + error.message); // Replace with a better UI message
    return null;
  }
}

/**
 * Sign up user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<import('@supabase/supabase-js').User|null>}
 */
async function signUpWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Error signing up:", error);
      throw error;
    }

    currentUser = data.user;
    console.log("Signed up successfully:", currentUser.email);
    return currentUser;
  } catch (error) {
    console.error("Error signing up:", error.message);
    alert("Sign up failed: " + error.message); // Replace with a better UI message
    return null;
  }
}

/**
 * Sign in with Google using Supabase UI
 * @returns {Promise<any|null>}
 */
async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }

    // Supabase UI handles the redirect.  After the user authenticates
    // with Google, they'll be redirected back to your app.  Supabase
    // will automatically update the session.

    return data; // Or handle the data as needed
  } catch (error) {
    console.error("Error signing in with Google:", error.message);
    alert("Google sign-in failed: " + error.message); // Replace with a better UI message
    return null;
  }
}

/** @param {string} password - User's password */
async function changePassword(password) {
  try {
    // Update the user's password
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("Error changing password:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Password update error:", error.message);
    alert("Password update failed: " + error.message); // Replace with a better UI message
    return null;
  }
}

/** @param {string} email - User's email */
async function resetPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      console.error("Error resetting password:", error);
      throw error;
    }

    alert("Password reset email sent. Check your inbox."); // Replace with a better UI message
    return true;
  } catch (error) {
    console.error("Sending Reset Email failed:", error.message);
    alert("Failed to send reset email: " + error.message); // Replace with a better UI message
    return null;
  }
}

/**
 * Get the authentication token from Supabase
 * @returns {Promise<string>} The access token
 */
async function getAuthToken() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    console.log("getAuthToken returning:", token); // Debugging
    return token;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return ""; // Or handle the error appropriately
  }
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      throw error;
    } else {
      currentUser = null;
      console.log("User signed out.");
    }
  } catch (error) {
    console.error("Error signing out:", error.message);
    alert("Sign out failed: " + error.message); // Replace with a better UI message
  }
}

/**
 * Get the current user
 * @returns {import('@supabase/supabase-js').User|null} The current user
 */
function getCurrentUser() {
  return currentUser;
}

export {
  initializeAuth,
  showLoginForm,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  getAuthToken,
  signOut,
  getCurrentUser,
  changePassword,
  resetPassword,
  supabase,
};