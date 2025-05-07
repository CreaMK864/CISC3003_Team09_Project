import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Check if user is already logged in
 * @returns {Promise<import('@supabase/supabase-js').Session | null>}
 */
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/**
 * Sign in user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{error: Error | null}>}
 */
async function signInWithEmail(email, password) {
    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    } catch (error) {
        return { error: error instanceof Error ? error : new Error(String(error)) };
    }
}

/**
 * Sign up user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{error: Error | null}>}
 */
async function signUpWithEmail(email, password) {
    try {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        return { error };
    } catch (error) {
        return { error: error instanceof Error ? error : new Error(String(error)) };
    }
}

/**
 * Sign in with Google
 * @returns {Promise<{error: Error | null}>}
 */
async function signInWithGoogle() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
        });
        return { error };
    } catch (error) {
        return { error: error instanceof Error ? error : new Error(String(error)) };
    }
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
async function signOut() {
    await supabase.auth.signOut();
}

export {
    supabase,
    checkAuth,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut
}; 