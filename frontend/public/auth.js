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
    console.log("Initializing auth with URL:", SUPABASE_URL);
    const {
      data: { session },
    } = await supabase.auth.getSession();

<<<<<<< HEAD
    if (session) {
      currentUser = session.user;
      console.log("User is authenticated:", currentUser.email);
      return session.user;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error initializing auth:", error.message);
    throw new Error("Failed to initialize authentication. Please check your network connection.");
=======
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
>>>>>>> 763051f9e567daa5910c5d016a5a1b91b0eed562
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
    if (!email || !password) {
      throw new Error("Please enter both email and password");
    }

    console.log("Attempting to sign in with email:", email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign-in error:", error.message, error.status);
      throw error;
    }

    currentUser = data.user;
    console.log("Signed in successfully:", currentUser.email);
    return currentUser;
  } catch (error) {
    console.error("Error signing in:", error.message);
<<<<<<< HEAD
    if (error.message.includes("fetch")) {
      throw new Error("Unable to connect to the authentication server. Please check your network connection and try again.");
    }
    throw new Error(error.message || "Failed to sign in. Please check your credentials and try again.");
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
    if (!email || !password) {
      throw new Error("Please enter both email and password");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/auth/v1/callback",
      },
    });

    if (error) throw error;

    currentUser = data.user;
    console.log("Signed up successfully:", currentUser.email);
    return currentUser;
  } catch (error) {
    console.error("Error signing up:", error.message);
    if (error.message.includes("fetch")) {
      throw new Error("Unable to connect to the authentication server. Please check your network connection and try again.");
    }
    throw new Error(error.message || "Failed to sign up. Please try again.");
  }
}

/**
 * Sign in user with Google OAuth
 * @returns {Promise<void>}
 */
async function signInWithGoogle() {
  try {
    console.log("Attempting to sign in with Google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:8080/auth/v1/callback",
      },
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error signing in with Google:", error.message);
    if (error.message.includes("fetch")) {
      throw new Error("Unable to connect to the authentication server. Please check your network connection and try again.");
    }
    throw new Error(error.message || "Failed to sign in with Google. Please try again.");
  }
}

/**
 * Reset password for the user
 * @param {string} email - User's email
 * @returns {Promise<void>}
 */
async function resetPassword(email) {
  try {
    if (!email) {
      throw new Error("Please enter your email address");
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/update-password",
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error resetting password:", error.message);
    if (error.message.includes("fetch")) {
      throw new Error("Unable to connect to the authentication server. Please check your network connection and try again.");
    }
    throw new Error(error.message || "Failed to reset password. Please try again.");
=======
    // alert("Login failed: " + error.message);
    //showLoginForm(); // Show login form again if login fails
    return null;
>>>>>>> 763051f9e567daa5910c5d016a5a1b91b0eed562
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
    return session?.access_token || "";
  } catch (error) {
    console.error("Error getting auth token:", error.message);
    return "";
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
      console.error("Error signing out:", error.message);
      throw error;
    }
    currentUser = null;
  } catch (error) {
    console.error("Error signing out:", error.message);
    throw new Error(error.message || "Failed to sign out. Please try again.");
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
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  resetPassword,
  getAuthToken,
  signOut,
  getCurrentUser,
  supabase,
};