/**
 * HackMate — Fast Zero-Lag Multi-Page Frontend Engine
 */

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  loadUserFromSession();
  highlightActiveNavLinks();
});

/* --- USER SESSION HANDLING --- */
function loadUserFromSession() {
  const saved = localStorage.getItem("hackmate_user");
  if (saved) {
    try { 
      currentUser = JSON.parse(saved); 
    } catch(e){}
  }
  renderNavUserSlot();
}

function saveUserSession(user) {
  currentUser = user;
  localStorage.setItem("hackmate_user", JSON.stringify(user));
  renderNavUserSlot();
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("hackmate_user");
  showToast("Signed out successfully");
  setTimeout(() => {
    window.location.href = "/";
  }, 400);
}

function renderNavUserSlot() {
  const slotDesktop = document.getElementById("navUserSlotDesktop");
  const slotMobile = document.getElementById("navUserSlotMobile");

  if (currentUser) {
    const desktopHtml = `
      <a href="/profile" class="nav-link flex items-center gap-2" style="display:inline-flex; align-items:center; gap:8px;">
        <img src="${currentUser.avatar_url}" style="width:28px; height:28px; border-radius:9999px; object-fit:cover; border:1px solid #E7E0EC;">
        <span>${escapeHtml(currentUser.name.split(' ')[0])}</span>
      </a>
    `;

    const mobileHtml = `
      <a href="/profile" style="display:block; width:32px; height:32px; border-radius:9999px; overflow:hidden; border:1px solid #E7E0EC;">
        <img src="${currentUser.avatar_url}" style="width:100%; height:100%; object-fit:cover;">
      </a>
    `;

    if (slotDesktop) slotDesktop.innerHTML = desktopHtml;
    if (slotMobile) slotMobile.innerHTML = mobileHtml;
  } else {
    const desktopHtml = `
      <a href="/login" class="btn-primary" style="height:36px; padding:0 18px; font-size:0.8125rem;">
        Sign In
      </a>
    `;

    const mobileHtml = `
      <a href="/login" class="btn-primary" style="height:32px; padding:0 14px; font-size:0.75rem;">
        Sign In
      </a>
    `;

    if (slotDesktop) slotDesktop.innerHTML = desktopHtml;
    if (slotMobile) slotMobile.innerHTML = mobileHtml;
  }
}

function highlightActiveNavLinks() {
  const path = window.location.pathname;
  const links = document.querySelectorAll(".nav-link, .mobile-nav-btn");
  links.forEach(link => {
    const href = link.getAttribute("href");
    if (href === path || (path.startsWith("/team/") && href === "/")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/* --- TOAST SYSTEM --- */
function showToast(msg) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.style.cssText = `pointer-events: auto; padding: 12px 20px; border-radius: 9999px; font-size: 0.75rem; font-weight: 800; background: #1D1B20; color: #FFFFFF; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.18); transition: all 0.25s ease; opacity: 0; transform: translateY(10px);`;
  
  toast.innerText = msg;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
