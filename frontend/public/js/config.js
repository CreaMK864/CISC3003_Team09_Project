/**
 * @fileoverview Configuration file containing environment variables and API endpoints
 * @module config
 */

/**
 * Supabase project URL
 * @type {string}
 * @constant
 */
export const SUPABASE_URL = "https://edlrvbzhxvyvukjmvkof.supabase.co";

/**
 * Supabase anonymous key for client-side authentication
 * @type {string}
 * @constant
 */
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbHJ2YnpoeHZ5dnVram12a29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MjIxMDQsImV4cCI6MjA2MjA5ODEwNH0.PlxiJPCsvYbGqA2h_jiFDPu8_AvdPQ_C01Qw2AZ9DDo";

/**
 * Base URL for the API endpoints
 * @type {string}
 * @constant
 * @description Change to http://localhost:8000 for local development
 */
export const API_BASE_URL = "https://api.saviomak.com";
