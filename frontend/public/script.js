document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const openSidebarBtn = document.getElementById("open-sidebar");
  const closeSidebarBtn = document.getElementById("close-sidebar");
  const messageInput = document.getElementById("message-input");
  const searchInput = document.getElementById("search-input");
  const historyItems = document.querySelectorAll(".history-item");

  //theme
  const themeSwitch = document.getElementById("theme-switch");
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    document.body.classList.add("dark-theme");
    themeSwitch.checked = true;
  }
  themeSwitch.addEventListener("change", function () {
    document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", this.checked ? "dark" : "light");
  });

  openSidebarBtn.addEventListener("click", () => {
    sidebar.classList.add("active");
  });

  closeSidebarBtn.addEventListener("click", () => {
    sidebar.classList.remove("active");
  });

  if (messageInput && sidebar) {
    messageInput.addEventListener("focus", () => {
      sidebar.classList.remove("active");
    });
  }

  if (searchInput && historyItems) {
    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value.toLowerCase();

      historyItems.forEach((item) => {
        const title = item.querySelector("h4").textContent.toLowerCase();
        const summary = item.querySelector("p").textContent.toLowerCase();

        if (title.includes(searchTerm) || summary.includes(searchTerm)) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      });
    });
  }
});
