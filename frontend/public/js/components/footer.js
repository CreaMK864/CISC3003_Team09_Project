// Create and inject footer element
(function () {
  const footer = document.createElement("footer");
  footer.style.cssText = `
        background-color: #f8f9fa;
        padding: 20px 0;
        margin-top: 40px;
        border-top: 1px solid #e9ecef;
        text-align: center;
        font-family: Arial, sans-serif;
    `;

  footer.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <p style="margin: 0; color: #6c757d;">
                © ${new Date().getFullYear()} CISC3003-2024-02 Team 09.
            </p>
        </div>
    `;

  // Insert footer at the end of the body
  document.body.appendChild(footer);
})();
