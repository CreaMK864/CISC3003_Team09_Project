/**
 * @fileoverview UI/DOM interactions for the profile page
 * @module profile-ui
 */

/**
 * Initialize profile page when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  /** @type {HTMLElement|null} */
  const hamburgerButton = document.querySelector(".hamburger");
  /** @type {HTMLElement|null} */
  const sidebar = document.getElementById("sidebar");
  /** @type {HTMLInputElement|null} */
  const themeSwitch = /** @type {HTMLInputElement|null} */ (
    document.getElementById("theme-switch")
  );

  // State
  const currentTheme = localStorage.getItem("theme");
  const savedTheme = localStorage.getItem("theme") || "light";

  // Initialize
  applyTheme(savedTheme);

  // Theme handling
  if (themeSwitch && currentTheme === "dark") {
    document.body.classList.add("dark-theme");
    themeSwitch.checked = true;
  }

  if (themeSwitch) {
    themeSwitch.addEventListener("change", function () {
      document.body.classList.toggle("dark-theme");
      localStorage.setItem("theme", this.checked ? "dark" : "light");
    });
  }

  document.addEventListener("themeChanged", (/** @type {CustomEvent} */ e) => {
    applyTheme(e.detail.theme);
  });

  window.addEventListener("storage", (event) => {
    if (event.key === "theme") {
      applyTheme(event.newValue || "light");
    }
  });

  // Navigation
  if (hamburgerButton && sidebar) {
    hamburgerButton.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }

  /**
   * Applies a theme to the document
   * @param {string} theme - The theme to apply (either "dark" or "light")
   */
  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark-theme");
      document.body.classList.add("dark-theme");
    } else {
      document.documentElement.classList.remove("dark-theme");
      document.body.classList.remove("dark-theme");
    }
  }
});
