import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
/** @type {string} */
const supabaseUrl = "https://rktloofzzbabyeugqots.supabase.co";
/** @type {string} */
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrdGxvb2Z6emJhYnlldWdxb3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3OTgyNjMsImV4cCI6MjA2MDM3NDI2M30.f992jGcCkSeX7qKwCQ7viJ-3i7IQXdakx2YD4rJ9UGc";
/** @type {import('@supabase/supabase-js').SupabaseClient} */
const supabase = createClient(supabaseUrl, supabaseKey);

/** @type {import('@supabase/supabase-js').User|null} */
let currentUser = null;

/**
 * Check if user is already authenticated and initialize the app
 * @returns {Promise<User | void>}
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
    showLoginForm();
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
 * Sign in user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<import('@supabase/supabase-js').User|null>}
 */
async function signInWithEmail(email, password) {
  try {
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
    alert("Login failed: " + error.message);
    showLoginForm(); // Show login form again if login fails
    return null;
  }
}

/**
 * Get the authentication token from Supabase
 * @returns {Promise<string>} The access token
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
  getAuthToken,
  signOut,
  getCurrentUser,
  supabase,
};
