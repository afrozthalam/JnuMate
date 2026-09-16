/**
 * HackMate — Application Engine
 * LearnLingo Forest Green Neo-Editorial Design System
 * Instant 0ms Load, Alive Cards, Mobile Drawer, Professional Profile, Notifications & About Page
 * 100% Functionality Preserved
 */

let currentUser = null;
let pendingRegistrationData = null;
let currentSearchAbortController = null;
let friendSearchAbortController = null;
let seatSearchAbortController = null;
let selectedFriends = [];
let discoverFilter = 'all';
let discoverSearchTerm = '';
let discoverSearchDebounce = null;
let friendSearchDebounce = null;
let dirSearchDebounce = null;
let seatSearchDebounce = null;
let unreadNotificationsCount = 0;
let postLoginRedirect = null;

// Ranked Academic Programs
const ACADEMIC_PROGRAMS = [
  "B.Tech CSE (AI & ML) Hons.-Samatrix",
  "B.Tech. CSE(Hons.) in Artificial Intelligence and Machine Learning",
  "B.Tech AI & ML -Coding Pro",
  "B.Tech AI & DS -Coding Pro",
  "B.Tech CSE (AI) Hons.-Coding Pro",
  "B.Tech. CSE(Hons.) in Cyber Security",
  "B.Tech. CSE(Hons.) in Data Science",
  "B.Tech. (Computer Science Engineering)",
  "B.Tech Computer Science (RPA)(In Coll.)",
  "BCA Full Stack Development (In Coll.)",
  "BCA Specilization in Artificial Intelligence and Machine Learning",
  "BCA Specialization in Cyber Security",
  "BCA",
  "B.Des (Gaming and Animation) (In Coll.)",
  "B.Tech. (Electronics & Communication)",
  "B.Tech. (Electrical Engineering)",
  "B.Tech. (Mechanical Engineering)",
  "B.Tech. (Civil Engineering)",
  "B.Tech. (Biotechnology)",
  "B.Tech. (Biomedical Engineering)",
  "B.Tech. (Food Technology)",
  "BBA (Digital Marketing)(In Coll.)",
  "BBA-Fintech & Digital Banking(In Coll.)",
  "Other Academic Program"
];

// Deterministic Academic Year and Admission Batch inference based on College R-ID ranges
function getAcademicYearByRid(studentId) {
  if (!studentId) return "Student";
  const digits = String(studentId).replace(/\D/g, '');
  if (!digits) return "Student";
  const num = parseInt(digits, 10);
  if (isNaN(num)) return "Student";
  if (num <= 42260) return "Passed Out Student";
  if (num <= 50190) return "4th Year Student";
  if (num <= 54323) return "3rd Year Student";
  if (num <= 59643) return "2nd Year Student";
  return "1st Year Student";
}

function getAdmissionYearByRid(studentId) {
  if (!studentId) return "";
  const digits = String(studentId).replace(/\D/g, '');
  if (!digits) return "";
  const num = parseInt(digits, 10);
  if (isNaN(num)) return "";
  if (num <= 42260) return "Prior to 2023";
  if (num <= 50190) return "2023";
  if (num <= 54323) return "2024";
  if (num <= 59643) return "2025";
  return "2026";
}

// In-Memory Client Cache for Instant (0ms) Navigation
const clientCache = {
  teamsList: null,
  teamsMap: {},
  userProfiles: {}
};

// High-speed client-side search cache and avatar optimizations
const studentSearchClientCache = {};
const failedAvatarUrls = new Set();

// Sleek zero-network offline SVG fallback avatar (0ms render, 0 external requests)
// Universal clean blank profile photo fallback (Zero DiceBear, Zero Cartoon Avatars)
const DEFAULT_STUDENT_AVATAR = "/static/img/blank_pfp.jpg";
const INSTAGRAM_EMPTY_AVATAR = "/static/img/blank_pfp.jpg";

function isValidAvatarUrl(url, expectedRid) {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim();
  if (u.length < 8) return false;
  if (u.endsWith('/')) return false;
  if (u.includes('demo/avatars')) return false;
  if (u.includes('SIGNATURE')) return false;
  if (u.includes('dicebear')) return false;
  if (failedAvatarUrls.has(u)) return false;

  // Validate R-ID match if filename contains R-ID (prevents mismatched student scraped photos)
  if (expectedRid) {
    const cleanRid = String(expectedRid).trim().toUpperCase();
    const match = u.match(/(R\d+)\.(jpg|jpeg|png)/i);
    if (match && match[1]) {
      const urlRid = match[1].toUpperCase();
      if (urlRid !== cleanRid) {
        return false;
      }
    }
  }
  return true;
}

function getStudentAvatarSrc(rawUrl, rId) {
  if (!isValidAvatarUrl(rawUrl, rId)) {
    return DEFAULT_STUDENT_AVATAR;
  }
  return rawUrl.trim();
}


// Pure CSS Authentic iOS 12-Blade Activity Spinner Component
function renderIosSpinner(size = '', text = '') {
  return `
    <div class="ios-spinner-wrap">
      <div class="ios-spinner ${size}">
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
        <div class="ios-spinner-blade"></div>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  setupRouter();
  try {
    const raw = localStorage.getItem("jnumate_user");
    if (raw) currentUser = JSON.parse(raw);
  } catch (e) {}
  // Run route handler IMMEDIATELY so correct view renders with 0ms delay and no homescreen flash
  handleCurrentRoute();
  loadUserFromSession(() => {
    loadNotifications();
  });
});

/* ==========================================================================
   1. CLIENT-SIDE SPA ROUTER
   ========================================================================== */
function setupRouter() {
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest("a");
    if (anchor && anchor.href && anchor.origin === window.location.origin) {
      const targetPath = anchor.pathname;
      if (anchor.target === "_blank") return;

      e.preventDefault();
      closeMobileDrawer();
      closeNotificationsPanel();
      if (window.location.pathname !== targetPath) {
        history.pushState(null, "", targetPath);
        handleCurrentRoute();
      }
    }
  });

  window.addEventListener("popstate", () => {
    closeMobileDrawer();
    closeNotificationsPanel();
    const modal = document.getElementById("teamDetailModal");
    if (modal && !window.location.pathname.startsWith("/team/")) {
      modal.style.display = "none";
      document.body.classList.remove("scroll-locked");
    }
    handleCurrentRoute();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeTeamDetailModal();
      closeStudentSearchModal();
      closeMobileDrawer();
      closeNotificationsPanel();
    }
  });
}

function navigateTo(path) {
  closeMobileDrawer();
  closeNotificationsPanel();
  if (path.startsWith("/team/")) {
    const teamId = path.split("/")[2];
    openTeamDetailModal(teamId);
    return;
  }
  closeTeamDetailModal(false);
  if (window.location.pathname !== path) {
    history.pushState(null, "", path);
    handleCurrentRoute();
  }
}

function handleCurrentRoute() {
  window.scrollTo(0, 0);
  const path = window.location.pathname;
  highlightActiveNavLinks();

  const panels = document.querySelectorAll(".view-page-panel");
  panels.forEach(p => p.classList.remove("active"));

  // Toggle layout mode: show right widgets ONLY on discover home (/), hide on all other views
  const appShell = document.getElementById("appEnclosureFrame");
  if (appShell) {
    if (path !== "/" && !path.startsWith("/team/")) {
      appShell.classList.add("two-column-mode");
    } else {
      appShell.classList.remove("two-column-mode");
    }
  }

  // Hide discover top header pitch on interior views (login, admin, profile, etc.)
  const topHeaderCenter = document.querySelector(".desktop-top-header-center");
  if (topHeaderCenter) {
    if (path === "/" || path.startsWith("/team/")) {
      topHeaderCenter.style.display = "";
    } else {
      topHeaderCenter.style.display = "none";
    }
  }

  if (path === "/") {
    closeTeamDetailModal(false);
    const p = document.getElementById("viewDiscover");
    if (p) {
      p.classList.add("active");
      loadDiscoverView();
    }
  } else if (path.startsWith("/team/")) {
    const teamId = path.split("/")[2];
    const p = document.getElementById("viewDiscover");
    if (p) {
      p.classList.add("active");
      loadDiscoverView();
    }
    openTeamDetailModal(teamId);
  } else if (path === "/create-team") {
    const p = document.getElementById("viewCreateTeam");
    if (p) {
      p.classList.add("active");
      loadCreateTeamView();
    }
  } else if (path === "/profile") {
    const p = document.getElementById("viewProfile");
    if (p) {
      p.classList.add("active");
      loadProfileView();
    }
  } else if (path === "/login") {
    const p = document.getElementById("viewLogin");
    if (p) {
      p.classList.add("active");
      loadLoginView();
    }
  } else if (path === "/students") {
    const p = document.getElementById("viewStudents");
    if (p) {
      p.classList.add("active");
      loadStudentsView();
    }
  } else if (path === "/admin") {
    const p = document.getElementById("viewAdmin");
    if (p) {
      p.classList.add("active");
      loadAdminView();
    }
  } else if (path === "/about") {
    history.replaceState(null, "", "/");
    handleCurrentRoute();
  } else {
    history.replaceState(null, "", "/");
    handleCurrentRoute();
  }
}

function highlightActiveNavLinks() {
  const path = window.location.pathname;

  // Desktop top navbar links (AgroControl layout)
  document.querySelectorAll(".nav-capsule-link").forEach(link => {
    const linkPath = link.getAttribute("data-path") || link.getAttribute("href");
    if (linkPath === path || (linkPath !== "/" && path.startsWith(linkPath))) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Desktop sidebar nav links
  document.querySelectorAll(".sidebar-nav-item").forEach(item => {
    const itemPath = item.getAttribute("data-path") || item.getAttribute("href");
    if (itemPath === path || (itemPath !== "/" && path.startsWith(itemPath))) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Drawer nav links
  document.querySelectorAll(".drawer-nav-link").forEach(link => {
    const linkPath = link.getAttribute("href");
    if (linkPath === path || (linkPath !== "/" && path.startsWith(linkPath))) {
      link.style.backgroundColor = "var(--bg-forest-700)";
      link.style.color = "#FFFFFF";
    } else {
      link.style.backgroundColor = "transparent";
      link.style.color = "var(--text-sage)";
    }
  });
}

/* ==========================================================================
   2. AUTHENTICATION & SESSION MANAGEMENT
   ========================================================================== */
function loadUserFromSession(callback) {
  let savedUser = null;
  try {
    const raw = localStorage.getItem("jnumate_user");
    if (raw) savedUser = JSON.parse(raw);
  } catch (e) {}

  if (savedUser && savedUser.id) {
    currentUser = savedUser;
    renderNavUserSlots();
    renderDrawerUserSlot();
  }

  const verifyUrl = "/api/auth/me" + (savedUser && savedUser.id ? `?r_id=${encodeURIComponent(savedUser.id)}` : "");
  fetch(verifyUrl)
    .then(res => res.json())
    .then(data => {
      if (data.authenticated && data.user) {
        currentUser = data.user;
        try { localStorage.setItem("jnumate_user", JSON.stringify(data.user)); } catch (e) {}
        renderNavUserSlots();
        renderDrawerUserSlot();
        if (typeof callback === "function") callback();
      } else if (savedUser && savedUser.id) {
        fetch("/api/auth/restore-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ r_id: savedUser.id })
        })
          .then(r => r.json())
          .then(res => {
            if (res.success && res.user) {
              currentUser = res.user;
              try { localStorage.setItem("jnumate_user", JSON.stringify(res.user)); } catch (e) {}
            } else {
              currentUser = null;
              try { localStorage.removeItem("jnumate_user"); } catch (e) {}
            }
            renderNavUserSlots();
            renderDrawerUserSlot();
            if (typeof callback === "function") callback();
          })
          .catch(() => {
            renderNavUserSlots();
            renderDrawerUserSlot();
            if (typeof callback === "function") callback();
          });
      } else {
        currentUser = null;
        try { localStorage.removeItem("jnumate_user"); } catch (e) {}
        renderNavUserSlots();
        renderDrawerUserSlot();
        if (typeof callback === "function") callback();
      }
    })
    .catch(() => {
      if (!savedUser) {
        currentUser = null;
      }
      renderNavUserSlots();
      renderDrawerUserSlot();
      if (typeof callback === "function") callback();
    });
}

function renderNavUserSlots() {
  const dtSlot = document.getElementById("navUserSlotDesktop");
  const topSlot = document.getElementById("navUserSlotDesktopTop");
  const profileDropdown = document.getElementById("desktopProfileDropdown");
  const mobileTogglePfp = document.getElementById("mobileMenuTogglePfp");

  if (currentUser) {
    const rawName = (currentUser.name || currentUser.id || "Student") + "";
    const cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
    const firstName = cleanName.split(' ')[0] || cleanName;
    const avatarUrl = getStudentAvatarSrc(currentUser.avatar_url, currentUser.id);

    if (mobileTogglePfp) {
      mobileTogglePfp.src = avatarUrl;
    }

    const userDtHtml = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <a href="/profile" style="display:flex; align-items:center; gap:12px; text-decoration:none; padding:8px 12px; border-radius:var(--radius-xl); background:rgba(255,255,255,0.06); transition:background var(--trans-fast);">
          <div class="avatar-stack-item" style="width:36px; height:36px; border:2px solid var(--badge-yellow); margin-left:0; flex-shrink:0;">
            <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(firstName)}" loading="lazy" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
          </div>
          <div style="min-width:0; flex:1;">
            <div style="font-weight:700; font-size:0.875rem; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(cleanName)}
            </div>
            <div style="font-size:0.75rem; color:var(--text-sage);">
              ${escapeHtml(currentUser.id || 'Student')}
            </div>
          </div>
        </a>
        <button onclick="logoutUser()" class="sidebar-footer-link" style="width:100%; border:none; background:none; cursor:pointer;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
          <span>Sign Out</span>
        </button>
      </div>
    `;
    if (dtSlot) dtSlot.innerHTML = userDtHtml;

    if (topSlot) {
      topSlot.innerHTML = `
        <button type="button" onclick="toggleDesktopProfileDropdown(event)" class="desktop-top-user-pill" style="display:flex; align-items:center; gap:10px; padding:4px 12px 4px 6px; width:220px; border-radius:var(--radius-pill); background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1); cursor:pointer; transition:all var(--trans-fast);" aria-label="Open Account Menu">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1.5px solid var(--badge-mint); flex-shrink:0;" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
          <div style="min-width:0; flex:1; text-align:left;">
            <div style="font-weight:750; font-size:0.8125rem; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(cleanName)}</div>
          </div>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:14px; height:14px; color:var(--text-sage); flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
        </button>
      `;
    }

    if (profileDropdown) {
      profileDropdown.innerHTML = `
        <div class="desktop-profile-menu-header" style="display:flex; flex-direction:column; align-items:center; text-align:center; padding:18px 16px 14px 16px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="width:58px; height:58px; border-radius:50%; border:2px solid var(--accent); overflow:hidden; margin-bottom:8px; display:flex; align-items:center; justify-content:center; background:var(--surface-sunken); box-shadow:0 4px 12px rgba(0,0,0,0.25);">
            <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
          </div>
          <div style="font-size:0.75rem; font-weight:750; color:var(--accent); letter-spacing:0.05em; text-transform:uppercase; margin-bottom:2px;">
            ${escapeHtml(currentUser.id || 'STUDENT')}
          </div>
          <div style="font-family:var(--font-serif); font-size:0.9375rem; font-weight:700; color:var(--text-white); max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(cleanName)}
          </div>
        </div>
        <div class="desktop-menu-list">
          <a href="/profile" class="desktop-menu-item" onclick="closeDesktopDropdowns()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
            <span>My Profile</span>
          </a>
          <button type="button" onclick="closeDesktopDropdowns(); handleMyTeamClick();" class="desktop-menu-item" style="background:none; border:none; width:100%; text-align:left; font-family:inherit; cursor:pointer;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
            <span>My Team</span>
          </button>
          <a href="/create-team" class="desktop-menu-item" onclick="closeDesktopDropdowns()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            <span>Create Team</span>
          </a>
          <div class="desktop-menu-divider"></div>
          <button type="button" onclick="closeDesktopDropdowns(); logoutUser();" class="desktop-menu-item danger" style="background:none; border:none; width:100%; text-align:left; font-family:inherit; cursor:pointer;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
            <span>Sign Out</span>
          </button>
        </div>
      `;
    }
  } else {
    if (mobileTogglePfp) {
      mobileTogglePfp.src = DEFAULT_STUDENT_AVATAR;
    }
    const loginDtHtml = `
      <a href="/login" class="btn-black-pill" style="width:100%; justify-content:center;">
        Sign In with R-ID
      </a>
    `;
    if (dtSlot) dtSlot.innerHTML = loginDtHtml;

    if (topSlot) {
      topSlot.innerHTML = `
        <a href="/login" class="btn-black-pill sm" style="padding:7px 20px; font-size:0.875rem;">
          Sign In
        </a>
      `;
    }
    if (profileDropdown) profileDropdown.innerHTML = "";
  }
}

function toggleDesktopProfileDropdown(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const notifDropdown = document.getElementById("desktopNotifDropdown");
  if (notifDropdown) notifDropdown.classList.remove("active");

  const profileDropdown = document.getElementById("desktopProfileDropdown");
  if (profileDropdown) {
    profileDropdown.classList.toggle("active");
  }
}

function toggleDesktopNotifDropdown(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const profileDropdown = document.getElementById("desktopProfileDropdown");
  if (profileDropdown) profileDropdown.classList.remove("active");

  const notifDropdown = document.getElementById("desktopNotifDropdown");
  if (notifDropdown) {
    notifDropdown.classList.toggle("active");
    if (notifDropdown.classList.contains("active")) {
      loadNotifications();
    }
  }
}

function closeDesktopDropdowns() {
  const p = document.getElementById("desktopProfileDropdown");
  const n = document.getElementById("desktopNotifDropdown");
  if (p) p.classList.remove("active");
  if (n) n.classList.remove("active");
}

document.addEventListener("click", (e) => {
  const pWrapper = document.getElementById("desktopProfileWrapper");
  const nWrapper = document.getElementById("desktopNotifWrapper");
  if (pWrapper && !pWrapper.contains(e.target)) {
    const p = document.getElementById("desktopProfileDropdown");
    if (p) p.classList.remove("active");
  }
  if (nWrapper && !nWrapper.contains(e.target)) {
    const n = document.getElementById("desktopNotifDropdown");
    if (n) n.classList.remove("active");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDesktopDropdowns();
  }
});

function renderDrawerUserSlot() {
  const slot = document.getElementById("drawerUserSlot");
  const footer = document.getElementById("drawerFooterSlot");
  const mobileTogglePfp = document.getElementById("mobileMenuTogglePfp");
  if (!slot) return;

  if (currentUser) {
    const rawName = (currentUser.name || currentUser.id || "Student") + "";
    const cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
    const avatarUrl = getStudentAvatarSrc(currentUser.avatar_url, currentUser.id);

    if (mobileTogglePfp) {
      mobileTogglePfp.src = avatarUrl;
    }

    slot.innerHTML = `
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-surface); border-radius:var(--radius-xl); padding:20px 16px; display:flex; flex-direction:column; align-items:center; text-align:center;">
        <div style="width:68px; height:68px; border-radius:50%; border:2.5px solid var(--accent); overflow:hidden; margin-bottom:10px; background:var(--surface-sunken); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(0,0,0,0.35);">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
        </div>
        <div style="font-size:0.75rem; font-weight:750; color:var(--accent); letter-spacing:0.06em; text-transform:uppercase; margin-bottom:3px;">
          ${escapeHtml(currentUser.id || 'STUDENT')}
        </div>
        <div style="font-family:var(--font-serif); font-size:1.1rem; font-weight:700; color:var(--text-white); max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${escapeHtml(cleanName)}
        </div>
        <div style="display:inline-flex; align-items:center; gap:6px; margin-top:8px; padding:3px 10px; background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.3); border-radius:999px; font-size:0.75rem; color:#4ade80; font-weight:600;">
          <span style="width:6px; height:6px; border-radius:50%; background:#4ade80; display:inline-block;"></span>
          Active Session
        </div>
      </div>
    `;

    if (footer) {
      footer.innerHTML = `
        <button onclick="logoutUser()" class="btn-danger-pill" style="width:100%; padding:12px; font-size:0.875rem;">
          Sign Out
        </button>
      `;
    }
  } else {
    if (mobileTogglePfp) {
      mobileTogglePfp.src = DEFAULT_STUDENT_AVATAR;
    }
    slot.innerHTML = `
      <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-surface); border-radius:var(--radius-xl); padding:16px; text-align:center;">
        <div style="font-family:var(--font-serif); font-size:1.125rem; font-weight:700; margin-bottom:4px;">Join JnuMate</div>
        <p style="font-size:0.8125rem; color:var(--text-sage); margin-bottom:14px;">Sign in with your College R-ID to create or join teams.</p>
        <a href="/login" class="btn-black-pill" style="width:100%; justify-content:center;" onclick="closeMobileDrawer()">
          Sign In with R-ID
        </a>
      </div>
    `;
    if (footer) footer.innerHTML = "";
  }
}

function handleMyTeamClick() {
  closeMobileDrawer();
  closeDesktopDropdowns();
  if (!currentUser) {
    showToast("Please sign in with your College R-ID first.", "info");
    navigateTo("/login");
    return;
  }

  if (currentUser.team_id) {
    navigateTo(`/team/${currentUser.team_id}`);
    return;
  }

  fetch(`/api/user/profile?r_id=${encodeURIComponent(currentUser.id)}`)
    .then(r => r.json())
    .then(data => {
      const teams = (data && data.teams) || [];
      if (teams.length > 0 && teams[0].id) {
        currentUser.team_id = teams[0].id;
        currentUser.team_name = teams[0].name;
        navigateTo(`/team/${teams[0].id}`);
      } else {
        showNoTeamPromptModal();
      }
    })
    .catch(() => {
      showNoTeamPromptModal();
    });
}

function showNoTeamPromptModal() {
  const existing = document.getElementById("noTeamPromptModal");
  if (existing) existing.remove();

  const modalHtml = `
    <div id="noTeamPromptModal" class="student-search-modal-overlay active" style="z-index:1500; display:flex; align-items:center; justify-content:center; padding:16px;">
      <div class="student-detail-modal-sheet" style="max-width:440px; width:100%; text-align:center; padding:32px 24px; animation:scaleInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="width:54px; height:54px; border-radius:50%; background:rgba(242,169,34,0.12); border:1.5px solid rgba(242,169,34,0.3); display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto; color:#f2a922;">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h3 style="font-family:var(--font-serif); font-size:1.35rem; font-weight:700; color:#ffffff; margin-bottom:10px;">
          No Active Squad Found
        </h3>
        <p style="font-size:0.92rem; color:var(--text-sage-light); line-height:1.55; margin-bottom:24px;">
          You're not in any team currently please create one or join any open slots.
        </p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <a href="/create-team" onclick="document.getElementById('noTeamPromptModal').remove();" class="btn-black-pill" style="width:100%; justify-content:center; padding:12px; font-weight:700; text-decoration:none;">
            + Create a New Team
          </a>
          <a href="/" onclick="document.getElementById('noTeamPromptModal').remove();" class="btn-outline-pill" style="width:100%; justify-content:center; padding:11px; text-decoration:none;">
            Explore Open Slots
          </a>
          <button type="button" onclick="document.getElementById('noTeamPromptModal').remove();" style="background:none; border:none; color:var(--text-sage); font-size:0.85rem; padding:8px; cursor:pointer; margin-top:2px;">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function logoutUser() {
  closeMobileDrawer();
  try { localStorage.removeItem("jnumate_user"); } catch (e) {}
  fetch("/api/auth/logout", { method: "POST" })
    .then(res => res.json())
    .then(() => {
      currentUser = null;
      clientCache.teamsList = null;
      clientCache.teamsMap = {};
      renderNavUserSlots();
      renderDrawerUserSlot();
      loadNotifications();
      showToast("Signed out successfully", "info");
      navigateTo("/");
    })
    .catch(() => {
      currentUser = null;
      renderNavUserSlots();
      renderDrawerUserSlot();
      navigateTo("/");
    });
}

/* ==========================================================================
   2B. MOBILE OFF-CANVAS APP DRAWER CONTROLS
   ========================================================================== */
function toggleMobileDrawer() {
  const drawer = document.getElementById("mobileDrawerOverlay");
  if (drawer) {
    drawer.classList.toggle("active");
    if (drawer.classList.contains("active")) {
      document.body.classList.add("scroll-locked");
    } else {
      const modal = document.getElementById("teamDetailModal");
      if (!modal || modal.style.display === "none") {
        document.body.classList.remove("scroll-locked");
      }
    }
  }
}

function closeMobileDrawer() {
  const drawer = document.getElementById("mobileDrawerOverlay");
  if (drawer) {
    drawer.classList.remove("active");
  }
  const modal = document.getElementById("teamDetailModal");
  if (!modal || modal.style.display === "none") {
    document.body.classList.remove("scroll-locked");
  }
}

/* ==========================================================================
   3. DISCOVER VIEW (LIVELY 6-DOT VACANCY CARDS & 0ms INSTANT TRANSITION)
   ========================================================================== */
function loadDiscoverView() {
  const grid = document.getElementById("teamsGridContainer");
  if (!grid) return;

  // Instant render from memory cache if available
  if (clientCache.teamsList && clientCache.teamsList.length > 0) {
    try {
      renderFilteredTeams(clientCache.teamsList);
      updateLeaderboardWidget(clientCache.teamsList);
    } catch (e) {
      console.warn("Cached render notice:", e);
    }
  } else {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1;">
        ${renderIosSpinner('lg')}
      </div>
    `;
  }

  // Fast background revalidation
  fetch("/api/teams")
    .then(res => {
      if (!res.ok) throw new Error("HTTP error " + res.status);
      return res.json();
    })
    .then(data => {
      const teams = (data && data.teams) ? data.teams : [];
      clientCache.teamsList = teams;
      // Populate instant memory map for 0ms team click!
      teams.forEach(t => {
        if (t && t.id) clientCache.teamsMap[t.id] = t;
      });
      try {
        renderFilteredTeams(clientCache.teamsList);
        updateLeaderboardWidget(clientCache.teamsList);
      } catch (renderError) {
        console.error("renderFilteredTeams error:", renderError);
      }
    })
    .catch(err => {
      console.error("Failed to load teams:", err);
      if (!clientCache.teamsList || clientCache.teamsList.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align:center; padding:48px 20px;">
            <p style="color:var(--text-sage); margin-bottom:16px;">Unable to load teams right now.</p>
            <button onclick="clientCache.teamsList=null;loadDiscoverView()" class="btn-black-pill">Refresh Teams</button>
          </div>
        `;
      }
    });
}

function setDiscoverFilter(type) {
  discoverFilter = type;
  discoverCurrentPage = 1;
  document.querySelectorAll(".filter-btn, .filter-menu-item").forEach(btn => {
    if (btn.getAttribute("data-filter") === type || (type === 'all' && btn.id === 'btnFilterAll') || (type === 'open' && btn.id === 'btnFilterOpen')) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const labelSpan = document.getElementById("activeFilterLabel");
  if (labelSpan) {
    const labels = {
      all: "Filter: All",
      sih: "Filter: SIH",
      ctf: "Filter: CTF",
      open: "Filter: Open Slots"
    };
    labelSpan.innerText = labels[type] || "Filter: All";
  }

  if (clientCache.teamsList) {
    renderFilteredTeams(clientCache.teamsList);
  }
}

let discoverCurrentPage = 1;
const TEAMS_PER_PAGE = 10;

function debounceDiscoverSearch() {
  clearTimeout(discoverSearchDebounce);
  discoverSearchDebounce = setTimeout(() => {
    const input = document.getElementById("searchInput");
    if (input) {
      discoverSearchTerm = input.value.trim().toLowerCase();
      discoverCurrentPage = 1;
      if (clientCache.teamsList) {
        renderFilteredTeams(clientCache.teamsList);
      }
    }
  }, 80);
}

function renderSingleTeamCard(team) {
  if (!team) return "";
  const isFull = Boolean(team.is_full);
  const count = team.member_count || (team.members ? team.members.length : 0);
  const openSlots = Math.max(0, 6 - count);
  const hackType = (team.hackathon_type || "sih").toLowerCase();
  const isCtf = hackType === "ctf";

  // Cache team for instant 0ms transition
  clientCache.teamsMap[team.id] = team;

  let statusPill = "";
  if (isFull) {
    statusPill = `<span class="status-capsule full-pill" style="font-size:0.6875rem; padding:2px 8px;">● Full (6/6)</span>`;
  } else {
    statusPill = `<span class="status-capsule open-pill" style="font-size:0.6875rem; padding:2px 8px;">● ${openSlots} Open Seats</span>`;
  }

  const hackBadgeHtml = isCtf
    ? `<span class="hackathon-tag-pill ctf" style="font-size:0.6875rem; padding:3px 9px;"><img src="/static/img/ctf_logo.jpg" alt="CTF" style="width:16px; height:16px;"> CTF Hackathon</span>`
    : `<span class="hackathon-tag-pill sih" style="font-size:0.6875rem; padding:3px 9px;"><img src="/static/img/sih_logo.jpg" alt="SIH" style="width:16px; height:16px;"> Smart India (SIH)</span>`;

  // 6 Pronounced Roster Avatars: filled member avatars + empty circle avatars
  const members = team.members || [];
  let rosterAvatarsHtml = "";
  for (let i = 0; i < 6; i++) {
    if (i < members.length && members[i]) {
      const m = members[i];
      const mName = (m.name || m.r_id || "Student") + "";
      const cleanName = mName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
      const isLeader = m.role === 'leader';
      const avatarUrl = getStudentAvatarSrc(m.avatar_url, m.r_id);

      rosterAvatarsHtml += `
        <div class="roster-avatar-item filled" title="${escapeAttr(cleanName)}${isLeader ? ' (Leader)' : ''}">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" loading="lazy" onerror="failedAvatarUrls.add(this.src); this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
        </div>
      `;
    } else {
      rosterAvatarsHtml += `
        <div class="roster-avatar-item empty" title="Open Seat">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        </div>
      `;
    }
  }

  return `
    <article class="team-forest-card" onclick="navigateTo('/team/${team.id}')" style="cursor:pointer;">
      <div>
        <div class="team-card-top-row">
          ${hackBadgeHtml}
          ${statusPill}
        </div>

        <h2 class="team-card-title">${escapeHtml(team.name || 'Untitled Team')}</h2>
        <p class="team-card-pitch">${escapeHtml(team.description || "Looking for teammates for the upcoming hackathon.")}</p>

        <div class="team-card-roster-row">
          ${rosterAvatarsHtml}
        </div>
      </div>

      <div class="team-card-bottom-row">
        <span class="meta-members-tag" style="font-size:0.72rem; color:var(--text-sage); font-weight:700;">${count} / 6 Members</span>
        <span class="btn-black-pill sm" style="font-size:0.75rem; padding:5px 12px;">View Team ➔</span>
      </div>
    </article>
  `;
}

function renderFilteredTeams(teams) {
  const grid = document.getElementById("teamsGridContainer");
  const emptyState = document.getElementById("emptyStateContainer");
  const paginationContainer = document.getElementById("discoverPagination");
  if (!grid) return;

  if (!Array.isArray(teams)) {
    teams = [];
  }

  let filtered = teams;

  if (discoverFilter === "open") {
    filtered = filtered.filter(t => t && !t.is_full);
  } else if (discoverFilter === "sih") {
    filtered = filtered.filter(t => t && (t.hackathon_type || "sih").toLowerCase() === "sih");
  } else if (discoverFilter === "ctf") {
    filtered = filtered.filter(t => t && (t.hackathon_type || "").toLowerCase() === "ctf");
  }

  if (discoverSearchTerm) {
    filtered = filtered.filter(t => {
      if (!t) return false;
      const nameMatch = (t.name || "").toLowerCase().includes(discoverSearchTerm);
      const descMatch = (t.description || "").toLowerCase().includes(discoverSearchTerm);
      const memberMatch = (t.members || []).some(m => m && (((m.name || "") + "").toLowerCase().includes(discoverSearchTerm) || ((m.r_id || "") + "").toLowerCase().includes(discoverSearchTerm)));
      return nameMatch || descMatch || memberMatch;
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    if (paginationContainer) paginationContainer.innerHTML = "";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  const totalTeams = filtered.length;
  const totalPages = Math.ceil(totalTeams / TEAMS_PER_PAGE) || 1;
  if (discoverCurrentPage > totalPages) {
    discoverCurrentPage = 1;
  }

  const startIdx = (discoverCurrentPage - 1) * TEAMS_PER_PAGE;
  const pageTeams = filtered.slice(startIdx, startIdx + TEAMS_PER_PAGE);

  // Clean cards list/grid view across all screen sizes
  grid.className = "teams-kanban-board grid-mode";
  grid.innerHTML = pageTeams.map(renderSingleTeamCard).join("");

  renderDiscoverPagination(totalTeams, totalPages, discoverCurrentPage);
}

function renderDiscoverPagination(totalCount, totalPages, currentPage) {
  const container = document.getElementById("discoverPagination");
  if (!container) return;

  if (totalCount === 0) {
    container.innerHTML = "";
    return;
  }

  let pageButtonsHtml = "";
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages <= 7 || p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
      pageButtonsHtml += `
        <button onclick="goToDiscoverPage(${p})" class="pagination-btn ${p === currentPage ? 'active' : ''}" aria-label="Page ${p}">
          ${p}
        </button>
      `;
    } else if (p === currentPage - 2 || p === currentPage + 2) {
      pageButtonsHtml += `<span style="color:var(--text-sage); padding:0 4px; font-size:0.875rem;">…</span>`;
    }
  }

  container.innerHTML = `
    <div class="pagination-cluster">
      <button onclick="goToDiscoverPage(${currentPage - 1})" class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} aria-label="Previous Page" title="Previous Page">
        ‹
      </button>

      ${pageButtonsHtml}

      <button onclick="goToDiscoverPage(${currentPage + 1})" class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="Next Page" title="Next Page">
        ›
      </button>

      <span class="pagination-info-tag">
        Page ${currentPage} of ${totalPages}
      </span>
    </div>
  `;
}

function goToDiscoverPage(pageNumber) {
  discoverCurrentPage = pageNumber;
  if (clientCache.teamsList) {
    renderFilteredTeams(clientCache.teamsList);
  }
  const grid = document.getElementById("teamsGridContainer");
  if (grid) {
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updateLeaderboardWidget(teams) {
  const container = document.getElementById("widgetLeaderboardList");
  if (!container || !Array.isArray(teams) || teams.length === 0) return;

  const sorted = [...teams].sort((a, b) => {
    const aCount = a.member_count || (a.members ? a.members.length : 0);
    const bCount = b.member_count || (b.members ? b.members.length : 0);
    return bCount - aCount;
  });

  const rankClasses = ["rank-1", "rank-2", "rank-3", "rank-user"];
  const displayTeams = sorted.slice(0, 4);

  container.innerHTML = displayTeams.map((t, idx) => {
    const rankClass = rankClasses[idx] || "rank-user";
    const count = t.member_count || (t.members ? t.members.length : 0);
    const scoreText = count === 6 ? "Full (6/6)" : `${count}/6 Members`;
    const numStr = `#0${idx + 1}`;

    return `
      <div class="leaderboard-rank-pill ${rankClass}" onclick="navigateTo('/team/${t.id}')" style="cursor:pointer;">
        <div class="rank-left-box">
          <span class="rank-number">${numStr}</span>
          <span style="max-width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(t.name)}</span>
        </div>
        <span class="rank-score">${scoreText}</span>
      </div>
    `;
  }).join("");
}

/* ==========================================================================
   4. TEAM DETAIL VIEW (INSTANT 0ms RENDER FROM CACHE)
   ========================================================================== */
function openTeamDetailModal(teamId) {
  const modal = document.getElementById("teamDetailModal");
  const container = document.getElementById("teamDetailModalContainer");
  if (!modal || !container) return;

  // Lock background body scroll
  document.body.classList.add("scroll-locked");
  modal.style.display = "block";
  modal.style.pointerEvents = "auto";
  modal.scrollTop = 0;

  // Update browser URL without page reload
  const targetPath = `/team/${teamId}`;
  if (window.location.pathname !== targetPath) {
    history.pushState(null, "", targetPath);
  }

  // 1. INSTANT ZERO-LATENCY RENDER from cache
  const cachedTeam = clientCache.teamsMap[teamId] || (clientCache.teamsList ? clientCache.teamsList.find(t => t && t.id == teamId) : null);
  if (cachedTeam) {
    renderFullTeamDetail(cachedTeam);
    if (currentUser && cachedTeam.leader_r_id && (cachedTeam.leader_r_id.toUpperCase() === currentUser.id.toUpperCase())) {
      loadTeamJoinRequests(teamId);
    }
  } else {
    container.innerHTML = `
      <div style="text-align:center; padding:120px 20px;">
        ${renderIosSpinner('lg')}
      </div>
    `;
  }

  // 2. Background Revalidation
  fetch(`/api/teams/${teamId}`)
    .then(res => {
      if (!res.ok) throw new Error("Team not found");
      return res.json();
    })
    .then(data => {
      const team = data.team;
      if (!team) {
        if (!cachedTeam) {
          container.innerHTML = `
            <div style="text-align:center; padding:80px 20px;">
              <h2 style="font-family:var(--font-serif); font-size:1.75rem; margin-bottom:8px; color:#fff;">Team Not Found</h2>
              <p style="color:var(--text-sage); margin-bottom:24px;">The requested hackathon team does not exist or has been disbanded.</p>
              <button onclick="closeTeamDetailModal()" class="btn-black-pill">Close Window</button>
            </div>
          `;
        }
        return;
      }
      clientCache.teamsMap[teamId] = team;
      renderFullTeamDetail(team);
      if (currentUser && team.leader_r_id && (team.leader_r_id.toUpperCase() === currentUser.id.toUpperCase())) {
        loadTeamJoinRequests(teamId);
      }
    })
    .catch(() => {
      if (!cachedTeam) {
        container.innerHTML = `
          <div style="text-align:center; padding:80px 20px;">
            <h2 style="font-family:var(--font-serif); font-size:1.75rem; margin-bottom:8px; color:#fff;">Unable to Load Team</h2>
            <p style="color:var(--text-sage); margin-bottom:24px;">Please check your connection and try again.</p>
            <button onclick="closeTeamDetailModal()" class="btn-black-pill">Close Window</button>
          </div>
        `;
      }
    });
}

function closeTeamDetailModal(restoreUrl = true) {
  const modal = document.getElementById("teamDetailModal");
  if (modal) {
    modal.style.display = "none";
    modal.style.pointerEvents = "none";
  }
  document.body.classList.remove("scroll-locked");
  if (restoreUrl && window.location.pathname.startsWith("/team/")) {
    history.pushState(null, "", "/");
    highlightActiveNavLinks();
  }
}

function loadTeamDetailView(teamId) {
  openTeamDetailModal(teamId);
}

function renderFullTeamDetail(team) {
  const container = document.getElementById("teamDetailModalContainer") || document.getElementById("teamDetailViewContainer");
  if (!container) return;

  const count = team.member_count || (team.members ? team.members.length : 0);
  const isFull = Boolean(team.is_full || count >= 6);
  const isLeader = Boolean(currentUser && currentUser.id && team.leader_r_id && (team.leader_r_id.toUpperCase() === currentUser.id.toUpperCase()));
  const isMember = Boolean(currentUser && currentUser.id && (team.members || []).some(m => m && m.r_id && (m.r_id.toUpperCase() === currentUser.id.toUpperCase())));
  const hasPendingRequest = Boolean(team.user_status === 'pending' || team.has_requested);
  const isSih = (team.hackathon_type || 'sih').toLowerCase() === 'sih';
  const hasFemale = Boolean(team.has_female);
  const members = team.members || [];

  let rosterRowsHtml = "";
  for (let i = 0; i < 6; i++) {
    if (i < members.length) {
      const m = members[i];
      if (!m) continue;
      const mRid = (m.r_id || m.student_r_id || "") + "";
      const mName = (m.name || mRid || "Student") + "";
      const cleanName = mName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
      const isYou = Boolean(currentUser && currentUser.id && mRid && (mRid.toUpperCase() === (currentUser.id + '').toUpperCase()));
      const isTeamLeader = m.role === 'leader';
      const avatarUrl = getStudentAvatarSrc(m.avatar_url, mRid, mName);

      rosterRowsHtml += `
        <div class="paper-roster-row ${isTeamLeader ? 'is-lead-row' : ''}">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" class="paper-roster-avatar" loading="lazy" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
          <div class="paper-roster-info">
            <div class="paper-roster-name-row">
              <span class="paper-roster-name">${escapeHtml(cleanName)}</span>
              ${isYou ? `<span class="paper-badge-you">You</span>` : ""}
              <span class="${isTeamLeader ? 'paper-badge-lead' : ''}">${isTeamLeader ? 'Captain' : 'Member'}</span>
            </div>
            <div class="paper-roster-meta">
              <span>@${escapeHtml(mRid)}</span>
              ${m.gender ? `<span>• ${escapeHtml(m.gender)}</span>` : ""}
              ${m.program ? `<span>• ${escapeHtml(m.program)}</span>` : ""}
              ${m.semester_year ? `<span>(Sem ${escapeHtml(m.semester_year)})</span>` : ""}
            </div>
          </div>
          <div class="paper-roster-actions">
            ${m.email ? `
              <a href="mailto:${escapeHtml(m.email)}" class="btn-paper-outline" style="padding:5px 9px;" title="Email ${escapeAttr(cleanName)}">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
              </a>
            ` : ''}
            ${isLeader && !isTeamLeader ? `
              <button onclick="confirmRemoveMember('${team.id}', '${escapeAttr(mRid)}', '${escapeAttr(cleanName)}')" class="btn-paper-danger" style="padding:4px 10px; font-size:0.75rem;" title="Remove Teammate">
                Remove
              </button>
            ` : ''}
            ${isYou && !isTeamLeader ? `
              <button onclick="confirmLeaveTeam('${team.id}')" class="btn-paper-danger" style="padding:5px 12px; font-weight:700;" title="Leave this squad">
                Leave Team
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      const seatNum = i + 1;
      rosterRowsHtml += `
        <div class="paper-roster-row is-empty-seat">
          <div class="paper-roster-empty-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div class="paper-roster-info">
            <div class="paper-roster-name-row">
              <span class="paper-roster-name" style="color:#64748B;">Seat 0${seatNum} &bull; Open Slot</span>
            </div>
            <div class="paper-roster-meta">
              ${isLeader ? 'Click "+ Add Teammate" to assign from directory or accept join requests' : 'Available for student join requests'}
            </div>
          </div>
          <div class="paper-roster-actions">
            ${isLeader ? `
              <button onclick="openSlotStudentSearchModalForTeam('${team.id}', ${seatNum})" class="btn-paper-assign">
                + Add Teammate
              </button>
            ` : `
              <span style="font-size:0.8125rem; font-weight:600; color:#16A34A; background:#DCFCE7; padding:3px 10px; border-radius:12px;">Open</span>
            `}
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <div class="clean-team-modal-layout">
      <!-- Full-Width Track Hero Banner with Official Logo -->
      <div class="team-track-hero-banner ${isSih ? 'track-sih-banner' : 'track-ctf-banner'}">
        <div class="track-hero-logo-box">
          <img src="${isSih ? '/static/img/sih_logo.jpg' : '/static/img/ctf_logo.jpg'}" alt="${isSih ? 'Smart India Hackathon' : 'Capture The Flag'}" class="track-hero-logo">
        </div>
        <div class="track-hero-content">
          <div class="track-hero-pill-row">
            <span class="track-hero-tag">${isSih ? 'Smart India Hackathon 2026' : 'Capture The Flag 2026'}</span>
            <span class="track-hero-status-pill">${isFull ? 'Roster Full (6/6)' : `${6 - count} Open ${6 - count === 1 ? 'Slot' : 'Slots'} Available`}</span>
            ${isSih ? `
              <span class="track-hero-rule-pill ${hasFemale ? 'rule-met' : 'rule-needed'}">
                ${hasFemale ? '✓ Female Participant Rule Met' : '⚠ 1 Female Member Mandatory'}
              </span>
            ` : ''}
          </div>
          <div class="track-hero-subtitle">
            ${isSih ? 'Official SIH Competition Track &bull; 6-Member Multidisciplinary Squad' : 'Official CTF Cyber Challenge Track &bull; Cybersecurity & Defense Squad'}
          </div>
        </div>
      </div>

      <!-- 1. Team Overview Paper Card -->
      <div class="team-paper-card">
        <h1 class="paper-team-title" style="margin-top:0;">${escapeHtml(team.name)}</h1>

        <div class="paper-team-desc">
          ${escapeHtml(team.description || "Looking for teammates for the upcoming hackathon.")}
        </div>

        <div class="paper-team-meta-row">
          <div class="paper-meta-stats">
            <div class="paper-meta-col">
              <span class="label">Team Captain</span>
              <span class="value">@${escapeHtml(team.leader_r_id || 'Assigned')}</span>
            </div>
            <div class="paper-meta-col">
              <span class="label">Hackathon Track</span>
              <span class="value">${isSih ? 'SIH Software Track' : 'CTF Cyber Defense'}</span>
            </div>
            <div class="paper-meta-col">
              <span class="label">Confirmed Roster</span>
              <span class="value">${count} / 6 Members</span>
            </div>
          </div>

          <div class="paper-header-actions">
            ${team.whatsapp_link ? `
              <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="btn-paper-wa">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/></svg>
                <span>WhatsApp Group</span>
              </a>
            ` : (isLeader ? `
              <button onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="btn-paper-outline">
                + Add WhatsApp Link
              </button>
            ` : '')}

            ${isLeader ? `
              <button onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="btn-paper-outline">
                Edit Details
              </button>
              <button onclick="confirmDisbandTeam('${team.id}')" class="btn-paper-danger">
                Disband
              </button>
            ` : ''}

            ${(isMember && !isLeader) ? `
              <button onclick="confirmLeaveTeam('${team.id}')" class="btn-leave-team-prominent" title="Leave this hackathon team">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>Leave Team</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Main Columns -->
      <div class="clean-team-grid">
        <!-- 2. Team Roster Paper Card -->
        <div class="clean-roster-column">
          <div class="team-paper-card">
            <div class="paper-card-header">
              <h2 class="paper-card-title">Team Roster (6 Seats)</h2>
              <span class="paper-card-sub">${count} of 6 seats locked</span>
            </div>

            <div class="paper-roster-list">
              ${rosterRowsHtml}
            </div>
          </div>
        </div>

        <!-- Sidebar Column -->
        <div class="clean-sidebar-column">
          ${isLeader ? `
            <div class="team-paper-card">
              <div class="paper-card-header">
                <h3 class="paper-card-title">Join Requests</h3>
                <span id="pendingReqCountBadge" class="paper-card-sub">0 Pending</span>
              </div>
              <div id="pendingRequestsContainer" class="clean-requests-list">
                ${renderIosSpinner('sm')}
              </div>
            </div>
          ` : ''}

          ${hasPendingRequest ? `
            <div class="team-paper-card join-request-card" id="joinRequestCardBox" style="border: 2px solid #16a34a; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
              <div style="display: flex; align-items: center; gap: 12px; padding: 6px 0;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #16a34a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: bold; flex-shrink: 0; box-shadow: 0 4px 10px rgba(22,163,74,0.3);">
                  ✓
                </div>
                <div>
                  <div style="font-weight: 800; font-size: 0.95rem; color: #166534;">Join Request Sent</div>
                  <div style="font-size: 0.8125rem; color: #15803d; margin-top: 2px;">The team leader will review your profile. You'll receive a notification upon approval.</div>
                </div>
              </div>
            </div>
          ` : (!isMember && !isFull) ? `
            <div class="team-paper-card join-request-card" id="joinRequestCardBox" style="border: 2px solid #2563eb; background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%); box-shadow: 0 10px 25px -5px rgba(37,99,235,0.12); position: relative; overflow: hidden;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.2);"></span>
                  <h3 class="paper-card-title" style="color: #1e3a8a; margin: 0; font-size: 1.05rem;">Request to Join Squad</h3>
                </div>
                <span style="font-size: 0.75rem; font-weight: 700; color: #2563eb; background: #dbeafe; padding: 2px 8px; border-radius: 999px;">Open Slot</span>
              </div>
              
              <label for="joinMessageInput" style="display: block; font-size: 0.8125rem; font-weight: 600; color: #475569; margin-bottom: 4px;">
                Write down your skills or achievements or anything special <span style="font-weight: 400; color: #64748b;">(optional)</span>
              </label>
              
              ${currentUser ? `
                <textarea id="joinMessageInput" rows="3" placeholder="e.g. React & Python developer, experience in CTFs, 1st place in Smart City Hackathon..." class="join-request-textarea" style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 0.85rem; color: #0f172a; background: #fff; resize: vertical; margin-bottom: 14px; transition: border-color 0.2s;"></textarea>
                <button id="btnSendJoinRequest" onclick="submitJoinRequest('${team.id}')" class="btn-send-join-req" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 18px; border-radius: 10px; background: #2563eb; color: #ffffff; font-weight: 700; font-size: 0.9rem; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  <span>Send Join Request</span>
                </button>
              ` : `
                <div style="padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; text-align:center; margin-top:8px;">
                  <p style="font-size:0.8125rem; color:#64748b; margin-bottom:10px;">Sign in with your College R-ID to send a join request.</p>
                  <a href="/login" class="btn-black-pill sm" style="display:inline-flex;">Sign In to Apply</a>
                </div>
              `}
            </div>
          ` : ''}

          <!-- 5. Readiness Checklist Paper Card -->
          <div class="team-paper-card">
            <div class="paper-card-header">
              <h3 class="paper-card-title">Readiness Checklist</h3>
            </div>
            <div style="display:flex; flex-direction:column;">
              <div class="paper-checklist-row">
                <span class="paper-check-dot ${count >= 2 ? 'pass' : 'wait'}">${count >= 2 ? '✓' : '●'}</span>
                <div>
                  <div class="paper-check-title">Roster Minimums</div>
                  <div class="paper-check-desc">${count >= 6 ? 'Full team (6/6)' : `${count}/6 confirmed members`}</div>
                </div>
              </div>

              ${isSih ? `
                <div class="paper-checklist-row">
                  <span class="paper-check-dot ${hasFemale ? 'pass' : 'warn'}">${hasFemale ? '✓' : '!'}</span>
                  <div>
                    <div class="paper-check-title">Gender Diversity</div>
                    <div class="paper-check-desc">${hasFemale ? 'At least 1 female teammate confirmed' : 'Required: 1 female teammate'}</div>
                  </div>
                </div>
              ` : ''}

              <div class="paper-checklist-row">
                <span class="paper-check-dot ${team.whatsapp_link ? 'pass' : 'wait'}">${team.whatsapp_link ? '✓' : '●'}</span>
                <div>
                  <div class="paper-check-title">Team Group Chat</div>
                  <div class="paper-check-desc">${team.whatsapp_link ? 'WhatsApp group linked' : 'Link not added yet'}</div>
                </div>
              </div>

              <div class="paper-checklist-row">
                <span class="paper-check-dot pass">✓</span>
                <div>
                  <div class="paper-check-title">Campus Verification</div>
                  <div class="paper-check-desc">All teammates verified via JNU R-ID</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.currentTeamRequests = [];

function loadTeamJoinRequests(teamId) {
  const container = document.getElementById("pendingRequestsContainer");
  const badge = document.getElementById("pendingReqCountBadge");
  if (!container) return;

  fetch(`/api/teams/${teamId}/requests?leader_r_id=${encodeURIComponent(currentUser ? currentUser.id : "")}`)
    .then(res => res.json())
    .then(data => {
      const requests = data.requests || [];
      window.currentTeamRequests = requests;
      if (badge) badge.innerText = `${requests.length} Pending`;

      if (requests.length === 0) {
        container.innerHTML = `<p style="font-size:0.8125rem; color:var(--text-sage); text-align:center; padding:16px 0;">No pending join requests.</p>`;
        return;
      }

      container.innerHTML = requests.map((req, idx) => {
        const applicantName = (req.name || req.student_name || req.r_id || "Student") + "";
        const cleanName = applicantName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
        return `
          <div class="clean-request-row" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px 14px; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer;" onclick="openStudentDetailModalByIndex(${idx})" title="Click to view student profile">
              <img src="${escapeHtml(getStudentAvatarSrc(req.avatar_url, req.r_id, applicantName))}" alt="${escapeHtml(cleanName)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1.5px solid var(--badge-mint);" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
              <div style="min-width:0; flex:1;">
                <div style="font-weight:700; font-size:0.875rem; color:#fff; display:flex; align-items:center; gap:6px;">
                  <span>${escapeHtml(cleanName)}</span>
                  <span style="font-size:0.6875rem; color:var(--badge-mint); background:rgba(34,197,94,0.15); padding:1px 6px; border-radius:4px; font-weight:600;">View Profile</span>
                </div>
                <div style="font-size:0.75rem; color:var(--text-sage);">@${escapeHtml(req.r_id)} ${req.gender ? `• ${escapeHtml(req.gender)}` : ''}</div>
              </div>
            </div>

            ${req.message ? `
              <div style="font-size:0.8125rem; color:rgba(255,255,255,0.85); background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:8px; margin-bottom:10px; line-height:1.4; border-left:2px solid var(--accent);">
                "${escapeHtml(req.message)}"
              </div>
            ` : ""}

            <div style="display:flex; gap:8px; justify-content:flex-end;">
              <button onclick="handleJoinRequestAction('${teamId}', '${req.request_id || req.id}', 'reject')" class="btn-clean-action" style="font-size:0.75rem; padding:5px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.15); background:transparent; color:#fff; cursor:pointer;">
                Decline
              </button>
              <button onclick="handleJoinRequestAction('${teamId}', '${req.request_id || req.id}', 'accept')" class="btn-black-pill sm" style="font-size:0.75rem; padding:5px 14px; background:var(--badge-mint); color:#000; font-weight:700; cursor:pointer;">
                Accept
              </button>
            </div>
          </div>
        `;
      }).join("");
    })
    .catch(() => {
      container.innerHTML = `<p style="color:var(--badge-coral); font-size:0.8125rem;">Failed to load requests.</p>`;
    });
}

function openStudentDetailModalByIndex(idx) {
  if (window.currentTeamRequests && window.currentTeamRequests[idx]) {
    openStudentDetailModal(window.currentTeamRequests[idx]);
  }
}

function openStudentDetailModal(student) {
  const modal = document.getElementById("studentDetailModal");
  const content = document.getElementById("studentDetailModalContent");
  if (!modal || !content) return;

  const rawName = (student.name || student.student_name || student.r_id || "Student") + "";
  const cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
  const avatarUrl = getStudentAvatarSrc(student.avatar_url || student.photo_url, student.r_id, cleanName);
  const rId = student.r_id || student.student_r_id || "Unknown";
  const gender = student.gender || "Not specified";
  const email = student.email || "No college email on file";
  const course = student.course || student.program || "Student";
  const year = student.year || student.semester_year ? `Year / Sem: ${student.year || student.semester_year}` : "";

  content.innerHTML = `
    <div class="student-popover-wrapper">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <span style="font-size:0.75rem; font-weight:750; color:var(--accent); text-transform:uppercase; letter-spacing:0.05em;">Student Dossier</span>
        <button onclick="closeStudentDetailModal()" class="drawer-close-btn" style="width:28px; height:28px;" aria-label="Close">✕</button>
      </div>
      
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.08);">
        <div style="width:64px; height:64px; border-radius:50%; border:2.5px solid var(--accent); overflow:hidden; flex-shrink:0; background:var(--surface-sunken); box-shadow:0 6px 16px rgba(0,0,0,0.3);">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/static/img/avatar_placeholder.svg';">
        </div>
        <div style="min-width:0; flex:1;">
          <div style="font-family:var(--font-serif); font-size:1.15rem; font-weight:700; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(cleanName)}
          </div>
          <div style="display:inline-flex; align-items:center; gap:6px; margin-top:4px;">
            <span style="font-size:0.8125rem; font-weight:700; color:var(--accent);">@${escapeHtml(rId)}</span>
            <span style="font-size:0.75rem; color:var(--text-sage);">• ${escapeHtml(gender)}</span>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr; gap:10px; font-size:0.875rem;">
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px 14px;">
          <div style="font-size:0.7rem; color:var(--text-sage); text-transform:uppercase; font-weight:600; margin-bottom:2px;">Academic Program</div>
          <div style="font-weight:600; color:var(--text-white);">${escapeHtml(course)} ${year ? `<span style="font-weight:400; color:var(--text-sage);">(${escapeHtml(year)})</span>` : ''}</div>
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px 14px;">
          <div style="font-size:0.7rem; color:var(--text-sage); text-transform:uppercase; font-weight:600; margin-bottom:2px;">Campus Email</div>
          <div style="font-weight:600; color:var(--text-white); word-break:break-all;">${escapeHtml(email)}</div>
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px 14px;">
          <div style="font-size:0.7rem; color:var(--text-sage); text-transform:uppercase; font-weight:600; margin-bottom:2px;">Gender / Identity</div>
          <div style="font-weight:600; color:var(--text-white);">${escapeHtml(gender)}</div>
        </div>
      </div>

      <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
        <button onclick="closeStudentDetailModal()" class="btn-black-pill sm" style="padding:8px 18px; font-size:0.8125rem;">Close</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  document.body.classList.add("scroll-locked");
}

function closeStudentDetailModal() {
  const modal = document.getElementById("studentDetailModal");
  if (modal) modal.style.display = "none";
  const teamModal = document.getElementById("teamDetailModal");
  if (!teamModal || teamModal.style.display === "none") {
    document.body.classList.remove("scroll-locked");
  }
}

function handleJoinRequestAction(teamId, reqId, action) {
  fetch(`/api/teams/${teamId}/requests/${reqId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leader_r_id: currentUser ? currentUser.id : "",
      action: action
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(action === 'accept' ? "Teammate accepted!" : "Request declined", "info");
        delete clientCache.teamsMap[teamId];
        clientCache.teamsList = null;
        loadTeamDetailView(teamId);
        loadNotifications();
      } else {
        showToast(data.message || "Action failed", "error");
      }
    })
    .catch(() => showToast("Network error processing request", "error"));
}

function submitJoinRequest(teamId) {
  const msgInput = document.getElementById("joinMessageInput");
  const btn = document.getElementById("btnSendJoinRequest");
  const msg = msgInput ? msgInput.value.trim() : "";

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner"></span> <span>Sending Join Request...</span>`;
  }

  fetch(`/api/teams/${teamId}/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_r_id: currentUser ? currentUser.id : "",
      message: msg
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast("Join request sent to team leader!", "success");
        if (clientCache.teamsMap[teamId]) {
          clientCache.teamsMap[teamId].user_status = 'pending';
          clientCache.teamsMap[teamId].has_requested = true;
        }
        const card = document.getElementById("joinRequestCardBox");
        if (card) {
          card.style.border = "2px solid #16a34a";
          card.style.background = "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)";
          card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; padding: 6px 0;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #16a34a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: bold; flex-shrink: 0; box-shadow: 0 4px 10px rgba(22,163,74,0.3);">
                ✓
              </div>
              <div>
                <div style="font-weight: 800; font-size: 0.95rem; color: #166534;">Join Request Sent</div>
                <div style="font-size: 0.8125rem; color: #15803d; margin-top: 2px;">The team leader has been notified. You'll receive a notification upon approval.</div>
              </div>
            </div>
          `;
        }
      } else {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> <span>Send Join Request</span>`;
        }
        showToast(data.message || "Failed to send request", "error");
      }
    })
    .catch(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> <span>Send Join Request</span>`;
      }
      showToast("Network error sending request", "error");
    });
}

function confirmLeaveTeam(teamId) {
  showGlassModal({
    title: "Leave Team?",
    message: "Are you sure you want to leave this hackathon team? You can request to join another team afterwards.",
    confirmText: "Leave Team",
    isDanger: true,
    onConfirm: () => {
      fetch(`/api/teams/${teamId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_r_id: currentUser ? currentUser.id : "" })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast("Left team", "info");
            delete clientCache.teamsMap[teamId];
            clientCache.teamsList = null;
            navigateTo("/");
          } else {
            showToast(data.message || "Failed to leave team", "error");
          }
        })
        .catch(() => showToast("Network error leaving team", "error"));
    }
  });
}

function confirmDisbandTeam(teamId) {
  showGlassModal({
    title: "Disband Team?",
    message: "This will permanently remove the team and notify all members. This action cannot be undone.",
    confirmText: "Disband Permanently",
    isDanger: true,
    onConfirm: () => {
      fetch(`/api/teams/${teamId}/disband`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leader_r_id: currentUser ? currentUser.id : "" })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast("Team disbanded", "info");
            delete clientCache.teamsMap[teamId];
            clientCache.teamsList = null;
            navigateTo("/");
          } else {
            showToast(data.message || "Failed to disband team", "error");
          }
        })
        .catch(() => showToast("Network error disbanding team", "error"));
    }
  });
}

function confirmRemoveMember(teamId, studentId, studentName) {
  showGlassModal({
    title: "Remove Member?",
    message: `Are you sure you want to remove ${studentName} (${studentId}) from the team?`,
    confirmText: "Remove Member",
    isDanger: true,
    onConfirm: () => {
      fetch(`/api/teams/${teamId}/remove-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leader_r_id: currentUser ? currentUser.id : "",
          student_id: studentId
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast(`Removed ${studentName}`, "info");
            delete clientCache.teamsMap[teamId];
            clientCache.teamsList = null;
            loadTeamDetailView(teamId);
          } else {
            showToast(data.message || "Failed to remove member", "error");
          }
        })
        .catch(() => showToast("Network error removing member", "error"));
    }
  });
}

/* ==========================================================================
   4B. LEADER EDIT TEAM & DIRECT SEAT ASSIGN MODALS
   ========================================================================== */
function openEditTeamModal(teamId, curName, curDesc, curWa) {
  const overlay = document.getElementById("glassModalOverlay");
  const sheet = document.getElementById("glassModalSheet");
  if (!overlay || !sheet) return;

  sheet.innerHTML = `
    <h3 class="forest-modal-title">Edit Team Details</h3>
    <p class="forest-modal-message">Modify your team title, project pitch, and official WhatsApp invite link.</p>

    <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:24px;">
      <div>
        <label class="form-label-forest">Team Title *</label>
        <input type="text" id="editTeamNameInput" value="${escapeAttr(curName)}" class="input-forest">
      </div>

      <div>
        <label class="form-label-forest">Project Pitch</label>
        <textarea id="editTeamDescInput" rows="3" class="input-forest">${escapeHtml(curDesc)}</textarea>
      </div>

      <div>
        <label class="form-label-forest">WhatsApp Invite Link</label>
        <input type="text" id="editTeamWaInput" value="${escapeAttr(curWa)}" placeholder="https://chat.whatsapp.com/..." class="input-forest">
      </div>
    </div>

    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button onclick="closeGlassModal()" class="btn-outline-pill">
        Cancel
      </button>
      <button onclick="submitUpdateTeamDetails('${teamId}')" class="btn-black-pill" id="btnSaveTeamEdit">
        Save Changes
      </button>
    </div>
  `;

  overlay.classList.add("active");
}

function submitUpdateTeamDetails(teamId) {
  const nameInput = document.getElementById("editTeamNameInput");
  const descInput = document.getElementById("editTeamDescInput");
  const waInput = document.getElementById("editTeamWaInput");
  const btn = document.getElementById("btnSaveTeamEdit");

  const name = nameInput ? nameInput.value.trim() : "";
  const desc = descInput ? descInput.value.trim() : "";
  const wa = waInput ? waInput.value.trim() : "";

  if (!name) {
    showToast("Team title is required", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = "Saving...";
  }

  fetch(`/api/teams/${teamId}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leader_r_id: currentUser ? currentUser.id : "",
      name: name,
      description: desc,
      whatsapp_link: wa
    })
  })
    .then(res => res.json())
    .then(data => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Save Changes";
      }
      if (data.success) {
        showToast("Team details updated!", "success");
        closeGlassModal();
        delete clientCache.teamsMap[teamId];
        clientCache.teamsList = null;
        loadTeamDetailView(teamId);
      } else {
        showToast(data.message || "Failed to update team", "error");
      }
    })
    .catch(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Save Changes";
      }
      showToast("Network error updating team", "error");
    });
}

function openAddMemberModal(teamId, seatNumber) {
  const overlay = document.getElementById("glassModalOverlay");
  const sheet = document.getElementById("glassModalSheet");
  if (!overlay || !sheet) return;

  sheet.innerHTML = `
    <h3 class="forest-modal-title">Assign Seat ${seatNumber}</h3>
    <p class="forest-modal-message">Search the university directory by R-ID or Name to directly add a teammate.</p>

    <div style="position:relative; margin-bottom:20px;">
      <input type="text" id="seatStudentSearchInput" placeholder="Type R-ID or Name (e.g. R15008, Rahul)..." class="input-forest" oninput="debounceSeatMemberSearch('${teamId}')">
      <div id="seatStudentSearchResults" class="search-dropdown" style="display:none;"></div>
    </div>

    <div style="display:flex; justify-content:flex-end;">
      <button onclick="closeGlassModal()" class="btn-outline-pill">
        Close
      </button>
    </div>
  `;

  overlay.classList.add("active");
  setTimeout(() => {
    const input = document.getElementById("seatStudentSearchInput");
    if (input) input.focus();
  }, 150);
}

function debounceSeatMemberSearch(teamId) {
  clearTimeout(seatSearchDebounce);
  seatSearchDebounce = setTimeout(() => {
    const input = document.getElementById("seatStudentSearchInput");
    const resultsDiv = document.getElementById("seatStudentSearchResults");
    if (!input || !resultsDiv) return;

    const query = input.value.trim();
    if (!query) {
      resultsDiv.style.display = "none";
      return;
    }

    const cacheKey = query.toUpperCase();
    if (studentSearchClientCache[cacheKey]) {
      renderSeatSearchResults(teamId, studentSearchClientCache[cacheKey], query);
      return;
    }

    if (seatSearchAbortController) seatSearchAbortController.abort();
    seatSearchAbortController = new AbortController();

    fetch(`/api/students/search?q=${encodeURIComponent(query)}`, { signal: seatSearchAbortController.signal })
      .then(res => res.json())
      .then(data => {
        const students = data.students || [];
        studentSearchClientCache[cacheKey] = students;
        const currentVal = (document.getElementById("seatStudentSearchInput")?.value || "").trim().toUpperCase();
        if (currentVal === cacheKey) {
          renderSeatSearchResults(teamId, students, query);
        }
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          resultsDiv.innerHTML = `<div class="search-dropdown-item"><span style="color:var(--badge-coral); font-size:0.8125rem;">Search failed</span></div>`;
          resultsDiv.style.display = "block";
        }
      });
  }, 45);
}

function renderSeatSearchResults(teamId, students, query) {
  const resultsDiv = document.getElementById("seatStudentSearchResults");
  if (!resultsDiv) return;

  if (students.length === 0) {
    resultsDiv.innerHTML = `<div class="search-dropdown-item"><span style="color:var(--text-sage); font-size:0.8125rem;">No students matching "${escapeHtml(query)}"</span></div>`;
    resultsDiv.style.display = "block";
    return;
  }

  resultsDiv.innerHTML = students.map(s => {
    const rawAvatar = s.avatar_url || "";
    const avatarSrc = getStudentAvatarSrc(rawAvatar, s.r_id);
    return `
      <div class="search-dropdown-item" onclick="directAddTeammate('${teamId}', '${s.r_id}', '${escapeAttr(s.name)}')">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="avatar-stack-item" style="width:28px; height:28px; margin-left:0;">
            <img src="${escapeHtml(avatarSrc)}" 
                 data-raw-src="${escapeHtml(rawAvatar)}" 
                 alt="${escapeHtml(s.name)}" 
                 loading="lazy" 
                 decoding="async" 
                 onerror="failedAvatarUrls.add(this.getAttribute('data-raw-src')); this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
          </div>
          <div>
            <div style="font-size:0.875rem; font-weight:700; color:var(--text-white);">${escapeHtml(s.name)}</div>
            <div style="font-size:0.75rem; color:var(--text-sage);">${escapeHtml(s.r_id)} • ${escapeHtml(s.gender || 'Student')}</div>
          </div>
        </div>
        <span class="btn-black-pill sm" style="font-size:0.75rem; padding:4px 12px;">+ Add</span>
      </div>
    `;
  }).join("");
  resultsDiv.style.display = "block";
}

function directAddTeammate(teamId, studentRid, studentName) {
  fetch(`/api/teams/${teamId}/members/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leader_r_id: currentUser ? currentUser.id : "",
      student_r_id: studentRid
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(`Added ${studentName} to team!`, "success");
        closeGlassModal();
        delete clientCache.teamsMap[teamId];
        clientCache.teamsList = null;
        loadTeamDetailView(teamId);
      } else {
        showToast(data.message || "Failed to add teammate", "error");
      }
    })
    .catch(() => showToast("Network error adding teammate", "error"));
}

/* ==========================================================================
   5. PROFESSIONAL USER PROFILE VIEW (POINT 5: NO COLOURFUL BLOCKS/ACHIEVEMENTS)
   ========================================================================== */
let userProfileCache = {};

function loadProfileView() {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  if (!currentUser) {
    try {
      const raw = localStorage.getItem("jnumate_user");
      if (raw) currentUser = JSON.parse(raw);
    } catch (e) {}
  }

  if (!currentUser) {
    navigateTo("/login");
    return;
  }

  const cacheKey = (currentUser.id || "").toUpperCase();
  if (userProfileCache[cacheKey]) {
    const cached = userProfileCache[cacheKey];
    renderFullProfile(cached.profile, cached.teams);
  } else {
    container.innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        ${renderIosSpinner('lg')}
      </div>
    `;
  }

  fetch(`/api/user/profile?r_id=${encodeURIComponent(currentUser.id || "")}`)
    .then(res => res.json())
    .then(data => {
      const prof = data.profile || currentUser;
      const userTeams = data.teams || [];
      userProfileCache[cacheKey] = { profile: prof, teams: userTeams };
      renderFullProfile(prof, userTeams);
    })
    .catch(() => {
      if (!userProfileCache[cacheKey]) {
        renderFullProfile(currentUser, []);
      }
    });
}

function renderFullProfile(prof, userTeams) {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  const rawName = prof.name || prof.r_id || "Student";
  const cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
  const rId = prof.r_id || prof.id || "N/A";
  const avatarSrc = getStudentAvatarSrc(prof.avatar_url, rId);
  const academicYear = prof.academic_year || getAcademicYearByRid(rId);
  const admissionYear = prof.admission_year || getAdmissionYearByRid(rId);
  const email = prof.email || `${rId}@student.edu`;
  const phone = prof.phone || "Not Provided";
  const altPhone = prof.alt_phone || "Not Provided";
  const gender = prof.gender || "Not Specified";
  const dob = prof.dob || "Not Provided";
  const bloodGroup = prof.blood_group || "Not Provided";
  const category = prof.category || "General";
  const religion = prof.religion || "Not Provided";
  const maritalStatus = prof.marital_status || "Single";
  const program = prof.program || "Bachelor of Technology";
  const semester = prof.semester_year ? `Semester ${prof.semester_year}` : "Enrolled";
  const fatherName = prof.father_name || "Not Provided";
  const fatherPhone = prof.father_phone || "Not Provided";
  const motherName = prof.mother_name || "Not Provided";
  const corrAddr = prof.correspondence_address || prof.address || "Not Provided";
  const permAddr = prof.permanent_address || "Not Provided";

  // 1. Professional Profile Left Identity Spotlight Card
  const identityCardHtml = `
    <div class="profile-sticky-identity-card">
      <div class="profile-identity-avatar-box">
        <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(cleanName)}" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
      </div>

      <h2 class="font-serif" style="font-size:1.625rem; line-height:1.2; margin-bottom:4px;">${escapeHtml(cleanName)}</h2>
      <div style="font-size:0.875rem; color:var(--badge-yellow); font-weight:750; margin-bottom:12px;">@${escapeHtml(rId)}</div>

      <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
        <span class="status-capsule member" style="font-size:0.75rem;">${escapeHtml(academicYear)}</span>
      </div>

      <div style="background:rgba(0,0,0,0.28); border:1px solid rgba(255,255,255,0.08); border-radius:var(--radius-xl); padding:14px; margin-bottom:20px; text-align:left;">
        <div style="font-size:0.6875rem; color:var(--text-sage); text-transform:uppercase; font-weight:800; letter-spacing:0.06em; margin-bottom:6px;">Hackathon Status</div>
        <div style="font-size:0.9375rem; font-weight:750; color:var(--badge-mint);">
          ${userTeams.length > 0 ? `Active in ${userTeams.length} Squad(s)` : 'Free Agent (Available for Squads)'}
        </div>
        ${userTeams.length > 0 ? `<div style="font-size:0.75rem; color:var(--text-sage-light); margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(userTeams[0].name)}</div>` : ''}
      </div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <a href="/create-team" class="btn-agro-yellow-pill" style="width:100%; justify-content:center;">
          Create Team
        </a>
        <button onclick="logoutUser()" class="btn-danger-pill" style="width:100%; justify-content:center;">
          Sign Out
        </button>
      </div>
    </div>
  `;

  // 2. Right Section: User's Teams
  let teamsListHtml = '';
  if (!userTeams || userTeams.length === 0) {
    teamsListHtml = `
      <div class="profile-empty-teams" style="padding:28px 16px; text-align:center; background:rgba(0,0,0,0.2); border-radius:var(--radius-lg);">
        <p style="color:var(--text-sage); font-size:0.875rem; margin-bottom:16px;">You are not currently enrolled in any hackathon teams.</p>
        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <a href="/create-team" class="btn-agro-yellow-pill">+ Create a Squad</a>
          <a href="/" class="btn-outline-pill">Explore Open Teams</a>
        </div>
      </div>
    `;
  } else {
    teamsListHtml = `
      <div class="profile-teams-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:14px;">
        ${userTeams.map(t => {
          const isLeader = (currentUser && currentUser.id) && (t.leader_id === currentUser.id || (t.leader && t.leader.id === currentUser.id));
          const hType = (t.hackathon_type || 'sih').toLowerCase();
          const memberCount = (t.members && t.members.length) || 1;
          const maxSize = t.max_size || 6;
          return `
            <div class="profile-team-card" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:var(--radius-lg); padding:16px;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                <span class="hackathon-tag-pill ${hType}" style="font-size:0.6875rem; padding:2px 8px;">${hType.toUpperCase()}</span>
                <span class="status-capsule ${isLeader ? 'leader' : 'member'}" style="font-size:0.6875rem; padding:2px 8px;">${isLeader ? 'Leader' : 'Member'}</span>
              </div>
              <h4 style="font-family:var(--font-serif); font-size:1.125rem; font-weight:750; color:var(--text-white); margin-bottom:6px;">${escapeHtml(t.name)}</h4>
              <p style="font-size:0.8125rem; color:var(--text-sage); line-height:1.4; margin-bottom:14px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHtml(t.description || 'No project pitch provided.')}</p>
              <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
                <span style="font-size:0.75rem; color:var(--text-sage);">${memberCount}/${maxSize} Members</span>
                <div style="display:flex; align-items:center; gap:8px;">
                  ${(!isLeader) ? `
                    <button onclick="confirmLeaveTeam('${t.id}')" class="btn-danger-pill" style="padding:4px 12px; font-size:0.75rem;">Leave Team</button>
                  ` : ''}
                  <a href="/team/${t.id}" class="btn-outline-pill" style="padding:4px 10px; font-size:0.75rem;">View Squad ➔</a>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  const teamsHtml = `
    <div class="profile-section-card">
      <div class="profile-section-header">
        <h3 class="profile-section-title">Enrolled Hackathon Squads (${userTeams.length})</h3>
        <a href="/create-team" class="btn-outline-pill" style="font-size:0.75rem; padding:4px 12px;">+ Build New Squad</a>
      </div>
      ${teamsListHtml}
    </div>
  `;

  // 3. Right Section: Reorganized Real Student Dossier in 4 Micro-Grids
  const dossierHtml = `
    <!-- 1. Academic Credentials -->
    <div class="profile-section-card" style="margin-bottom:18px;">
      <div class="profile-section-header">
        <h3 class="profile-section-title">Academic Credentials</h3>
        <span class="status-capsule member">Verified Student</span>
      </div>
      <div class="profile-dossier-grid">
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">College R-ID</span>
          <span class="profile-dossier-val highlight">@${escapeHtml(rId)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Student Name</span>
          <span class="profile-dossier-val">${escapeHtml(cleanName)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Academic Year</span>
          <span class="profile-dossier-val highlight">${escapeHtml(academicYear)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Admission Batch</span>
          <span class="profile-dossier-val">${escapeHtml(admissionYear || 'Enrolled')}</span>
        </div>
        <div class="profile-dossier-cell full-width">
          <span class="profile-dossier-label">Degree Program</span>
          <span class="profile-dossier-val">${escapeHtml(program)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Current Term</span>
          <span class="profile-dossier-val">${escapeHtml(semester)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Official Campus Email</span>
          <span class="profile-dossier-val">${escapeHtml(email)}</span>
        </div>
      </div>
    </div>

    <!-- 2. Personal & Demographic Details -->
    <div class="profile-section-card" style="margin-bottom:18px;">
      <div class="profile-section-header">
        <h3 class="profile-section-title">Personal & Demographic Details</h3>
      </div>
      <div class="profile-dossier-grid">
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Gender</span>
          <span class="profile-dossier-val">${escapeHtml(gender)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Date of Birth</span>
          <span class="profile-dossier-val">${escapeHtml(dob)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Blood Group</span>
          <span class="profile-dossier-val">${escapeHtml(bloodGroup)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Reservation Category</span>
          <span class="profile-dossier-val">${escapeHtml(category)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Community / Religion</span>
          <span class="profile-dossier-val">${escapeHtml(religion)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Marital Status</span>
          <span class="profile-dossier-val">${escapeHtml(maritalStatus)}</span>
        </div>
      </div>
    </div>

    <!-- 3. Family & Contact Details -->
    <div class="profile-section-card" style="margin-bottom:18px;">
      <div class="profile-section-header">
        <h3 class="profile-section-title">Family & Contact Information</h3>
      </div>
      <div class="profile-dossier-grid">
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Primary Mobile</span>
          <span class="profile-dossier-val">${escapeHtml(phone)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Alternate Mobile</span>
          <span class="profile-dossier-val">${escapeHtml(altPhone)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Father's Name</span>
          <span class="profile-dossier-val">${escapeHtml(fatherName)}</span>
        </div>
        <div class="profile-dossier-cell">
          <span class="profile-dossier-label">Father's Contact</span>
          <span class="profile-dossier-val">${escapeHtml(fatherPhone)}</span>
        </div>
        <div class="profile-dossier-cell full-width">
          <span class="profile-dossier-label">Mother's Name</span>
          <span class="profile-dossier-val">${escapeHtml(motherName)}</span>
        </div>
      </div>
    </div>

    <!-- 4. Residential Address -->
    <div class="profile-section-card">
      <div class="profile-section-header">
        <h3 class="profile-section-title">Residential Addresses</h3>
      </div>
      <div class="profile-dossier-grid">
        <div class="profile-dossier-cell full-width">
          <span class="profile-dossier-label">Correspondence Address</span>
          <span class="profile-dossier-val">${escapeHtml(corrAddr)}</span>
        </div>
        <div class="profile-dossier-cell full-width">
          <span class="profile-dossier-label">Permanent Address</span>
          <span class="profile-dossier-val">${escapeHtml(permAddr)}</span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="profile-pro-wrap">
      <div class="profile-two-column-layout">
        <!-- Left Section: Sticky Identity Spotlight -->
        <div>
          ${identityCardHtml}
        </div>

        <!-- Right Section: Clean Developer Profile, Squads & Real Dossier -->
        <div class="profile-content-column">
          ${teamsHtml}
          ${dossierHtml}
        </div>
      </div>
    </div>
  `;
}

/* ==========================================================================
   5B. COURSE PICKER MODAL
   ========================================================================== */
function showCoursePickerModal() {
  const overlay = document.getElementById("glassModalOverlay");
  const sheet = document.getElementById("glassModalSheet");
  if (!overlay || !sheet) return;

  const curProg = (currentUser && currentUser.program) || "";
  const curSem = (currentUser && currentUser.semester_year) || "";

  const optionsHtml = ACADEMIC_PROGRAMS.map(p => `
    <option value="${escapeAttr(p)}" ${p === curProg ? 'selected' : ''}>${escapeHtml(p)}</option>
  `).join("");

  sheet.innerHTML = `
    <h3 class="forest-modal-title">Select Academic Program</h3>
    <p class="forest-modal-message">Select your enrolled degree and course for your JnuMate hackathon profile.</p>

    <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:24px;">
      <div>
        <label class="form-label-forest">Academic Program *</label>
        <select id="modalCourseSelect" class="input-forest">
          ${optionsHtml}
        </select>
      </div>

      <div>
        <label class="form-label-forest">Semester / Year (Optional)</label>
        <input type="text" id="modalSemInput" value="${escapeAttr(curSem)}" placeholder="e.g. Semester 4 or Year 2" class="input-forest">
      </div>
    </div>

    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button onclick="closeGlassModal()" class="btn-outline-pill">
        Cancel
      </button>
      <button onclick="saveCourseSelection()" class="btn-black-pill" id="btnSaveProgram">
        Confirm & Save
      </button>
    </div>
  `;

  overlay.classList.add("active");
}

function saveCourseSelection() {
  const sel = document.getElementById("modalCourseSelect");
  const semInput = document.getElementById("modalSemInput");
  const btn = document.getElementById("btnSaveProgram");

  const program = sel ? sel.value.trim() : "";
  const semester = semInput ? semInput.value.trim() : "";

  if (!program) {
    showToast("Please select your academic program", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = "Saving...";
  }

  fetch("/api/user/update-program", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      program: program,
      semester_year: semester
    })
  })
    .then(res => res.json())
    .then(data => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Confirm & Save";
      }
      if (data.success) {
        if (currentUser) {
          currentUser.program = program;
          currentUser.semester_year = semester;
          currentUser.needs_program = false;
        }
        showToast("Academic program updated!", "success");
        closeGlassModal();
        if (window.location.pathname === "/profile") {
          loadProfileView();
        } else {
          navigateTo("/profile");
        }
      } else {
        showToast(data.message || "Failed to update program", "error");
      }
    })
    .catch(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Confirm & Save";
      }
      showToast("Network error updating program", "error");
    });
}

/* ==========================================================================
   6. CREATE TEAM VIEW
   ========================================================================== */
function loadCreateTeamView() {
  selectedFriends = [];
  const container = document.getElementById("createTeamViewContainer");
  if (!container) return;

  if (!currentUser) {
    postLoginRedirect = "/create-team";
    navigateTo("/login");
    return;
  }

  container.innerHTML = `
    <div style="text-align:center; padding:60px 20px;">
      ${renderIosSpinner('lg')}
    </div>
  `;

  fetch(`/api/user/profile?r_id=${encodeURIComponent(currentUser.id || "")}`)
    .then(r => r.json())
    .then(data => {
      const teams = data.teams || [];
      if (teams.length > 0) {
        const t = teams[0];
        const teamName = t.name || "another team";
        container.innerHTML = `
          <div class="create-team-container" style="max-width:640px; margin:40px auto; padding:0 16px;">
            <div style="background:rgba(239, 68, 68, 0.08); border:1.5px solid rgba(239, 68, 68, 0.35); border-radius:18px; padding:32px 24px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
              <div style="width:52px; height:52px; border-radius:50%; background:rgba(239, 68, 68, 0.15); color:#ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto; font-size:1.5rem; font-weight:bold;">
                ✕
              </div>
              <h2 class="font-serif" style="font-size:1.5rem; color:#fff; margin-bottom:10px;">Already in a Squad</h2>
              <p style="color:var(--text-sage); font-size:0.95rem; line-height:1.5; margin-bottom:24px;">
                You cannot create a team until you leave team '<strong>${escapeHtml(teamName)}</strong>'. Each student can only be in one team at a time.
              </p>
              <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
                <button onclick="openTeamDetailModal('${t.id}')" class="btn-black-pill" style="padding:10px 22px;">
                  View My Team (${escapeHtml(teamName)}) ➔
                </button>
                <a href="/" class="btn-outline-pill" style="padding:10px 20px;">
                  Back to Discover
                </a>
              </div>
            </div>
          </div>
        `;
        return;
      }
      renderCreateTeamForm();
    })
    .catch(() => renderCreateTeamForm());
}

function renderCreateTeamForm() {
  const container = document.getElementById("createTeamViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="create-team-container">
      <div style="margin-bottom:16px;">
        <a href="/" class="btn-outline-pill">
          ← Cancel & Back to Discover
        </a>
      </div>

      <div class="create-team-wide-layout">
        <!-- Left Column: Team Details & Pitch Form -->
        <div class="create-team-col-form">
          <div class="greeting-sup-text" style="color:var(--badge-mint);">6-Seat Team Builder</div>
          <h1 class="font-serif" style="font-size:2rem; margin-bottom:6px;">Create New Team</h1>
          <p style="color:var(--text-sage); font-size:0.875rem; margin-bottom:18px;">
            Name your squad, select your hackathon track, and assign teammates or leave slots open for applicants.
          </p>

          <div style="display:flex; flex-direction:column; gap:16px;">
            <!-- Category Selector -->
            <div>
              <label class="form-label-forest" style="margin-bottom:8px;">Choose Hackathon Category *</label>
              <div class="hackathon-selector-grid compact">
                <div class="hackathon-select-card sih ${selectedHackathonType === 'sih' ? 'active' : ''}" onclick="selectHackathonType('sih')">
                  <img src="/static/img/sih_logo.jpg" alt="SIH Hackathon">
                  <div style="min-width:0; flex:1;">
                    <div style="font-weight:750; font-size:0.875rem; color:var(--text-white);">Smart India Hackathon (SIH)</div>
                    <div style="font-size:0.6875rem; color:var(--text-sage-light);">Hardware & Software editions</div>
                  </div>
                </div>

                <div class="hackathon-select-card ctf ${selectedHackathonType === 'ctf' ? 'active' : ''}" onclick="selectHackathonType('ctf')">
                  <img src="/static/img/ctf_logo.jpg" alt="CTF Hackathon">
                  <div style="min-width:0; flex:1;">
                    <div style="font-weight:750; font-size:0.875rem; color:var(--text-white);">Capture The Flag (CTF)</div>
                    <div style="font-size:0.6875rem; color:var(--text-sage-light);">Cybersecurity & Defense</div>
                  </div>
                </div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px;">
              <div>
                <label class="form-label-forest">Team Title *</label>
                <input type="text" id="teamNameInput" placeholder="e.g. CyberStorm, NeuroVision" class="input-forest">
              </div>
              <div>
                <label class="form-label-forest">Official Team WhatsApp Link</label>
                <input type="text" id="teamWaInput" placeholder="https://chat.whatsapp.com/..." class="input-forest">
              </div>
            </div>

            <div>
              <label class="form-label-forest">Project Pitch / Hackathon Idea *</label>
              <textarea id="teamDescInput" rows="3" placeholder="Briefly describe what problem statement you're tackling and what skills you are looking for..." class="input-forest"></textarea>
            </div>

            <button onclick="submitCreateTeam()" id="btnSubmitCreate" class="btn-black-pill lg" style="width:100%; margin-top:6px;">
              Create & Publish Team ➔
            </button>
          </div>
        </div>

        <!-- Right Column: Interactive 6-Seat Team Builder & Tips -->
        <div class="create-team-col-roster">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div>
              <div class="form-label-forest" style="margin-bottom:2px; font-size:0.9375rem;">6-Seat Team Roster</div>
              <span style="font-size:0.75rem; color:var(--text-sage);">Click open seats to assign teammates by R-ID. Empty seats stay open for join requests.</span>
            </div>
            <span class="status-capsule open" id="createTeamFilledCount">1/6 Assigned</span>
          </div>

          <div id="createTeamSlotsContainer" class="create-slots-grid"></div>

          <!-- Compact Horizontal Tips Bar -->
          <div class="create-team-tips-banner">
            <div class="tip-item">
              <span class="tip-bullet">01</span>
              <span>Click open seat to assign from directory</span>
            </div>
            <div class="tip-item">
              <span class="tip-bullet">02</span>
              <span>Leave slots unassigned to accept join requests</span>
            </div>
            <div class="tip-item">
              <span class="tip-bullet">03</span>
              <span>Add WhatsApp link so members connect instantly</span>
            </div>
            <div class="tip-item">
              <span class="tip-bullet">04</span>
              <span>SIH requires 6 members with 1+ female participant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderCreateTeamSeats();
}

function renderCreateTeamSeats() {
  const container = document.getElementById("createTeamSlotsContainer");
  const countBadge = document.getElementById("createTeamFilledCount");
  if (!container) return;

  const totalFilled = 1 + selectedFriends.length;
  if (countBadge) countBadge.innerText = `${totalFilled}/6 Assigned`;

  const leaderAvatar = getStudentAvatarSrc((currentUser && currentUser.avatar_url), (currentUser && currentUser.id));
  const leaderAcademicYear = (currentUser && (currentUser.academic_year || getAcademicYearByRid(currentUser.id))) || "Student";

  let seatsHtml = `
    <!-- Slot 1: Team Leader -->
    <div class="create-slot-box leader">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:0.6875rem; font-weight:800; text-transform:uppercase; color:var(--badge-mint);">Seat 1 • Leader (You)</span>
        <span class="status-capsule leader" style="font-size:0.625rem; padding:2px 8px;">Leader</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="seat-avatar">
          <img src="${escapeHtml(leaderAvatar)}" alt="${escapeHtml((currentUser && currentUser.name) || '')}" onerror="this.src=DEFAULT_STUDENT_AVATAR;">
        </div>
        <div style="min-width:0; flex:1;">
          <div style="font-size:0.875rem; font-weight:750; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml((currentUser && currentUser.name) || 'Leader')}
          </div>
          <div style="font-size:0.6875rem; color:var(--text-sage);">
            @${escapeHtml((currentUser && currentUser.id) || '')} • ${escapeHtml(leaderAcademicYear)}
          </div>
        </div>
      </div>
    </div>
  `;

  for (let i = 0; i < 5; i++) {
    if (i < selectedFriends.length) {
      const f = selectedFriends[i];
      const friendAvatar = getStudentAvatarSrc(f.avatar_url, f.id);
      const friendAcademicYear = f.academic_year || getAcademicYearByRid(f.id);
      seatsHtml += `
        <div class="create-slot-box filled">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="font-size:0.6875rem; font-weight:800; text-transform:uppercase; color:var(--badge-mint);">Seat ${i + 2} • Teammate</span>
            <button onclick="removeFriendFromTeam('${escapeAttr(f.id)}')" class="btn-danger-pill" style="padding:2px 8px; font-size:0.6875rem;">
              ✕ Remove
            </button>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="seat-avatar">
              <img src="${escapeHtml(friendAvatar)}" alt="${escapeHtml(f.name)}" onerror="this.src=DEFAULT_STUDENT_AVATAR;">
            </div>
            <div style="min-width:0; flex:1;">
              <div style="font-size:0.875rem; font-weight:750; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(f.name)}
              </div>
              <div style="font-size:0.6875rem; color:var(--text-sage);">
                @${escapeHtml(f.id)} • ${escapeHtml(friendAcademicYear)}
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      seatsHtml += `
        <div class="create-slot-box empty" onclick="openSlotStudentSearchModal(${i})" title="Click to assign teammate, or leave open">
          <div class="slot-empty-icon">+</div>
          <div class="slot-empty-title">Seat ${i + 2} • Open Slot</div>
          <div class="slot-empty-subtitle">Click to add teammate, or leave open for join requests</div>
        </div>
      `;
    }
  }

  container.innerHTML = seatsHtml;
}

/* ==========================================================================
   STUDENT SEARCH MODAL SYSTEM (CREATE TEAM & TEAM DETAIL)
   ========================================================================== */
let currentSearchTargetSlot = null;
let currentSearchTeamId = null;
let slotSearchDebounceTimer = null;

let slotSearchAbortController = null;

function getSearchEmptyStateHtml() {
  return `
    <div class="search-empty-state">
      <div class="search-empty-icon-ring">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
      </div>
      <h4 class="search-empty-title">Search University Directory</h4>
      <p class="search-empty-desc">Type student College R-ID (e.g. <strong>R15006</strong>) or name to find verified peers</p>
    </div>
  `;
}

function openSlotStudentSearchModal(slotIndex) {
  currentSearchTargetSlot = slotIndex;
  currentSearchTeamId = null;

  const overlay = document.getElementById("studentSearchModalOverlay");
  const title = document.getElementById("studentSearchModalTitle");
  const subtitle = document.getElementById("studentSearchModalSubtitle");
  const input = document.getElementById("slotStudentSearchInput");
  const results = document.getElementById("slotStudentSearchResults");

  if (!overlay) return;

  if (title) title.innerText = `Assign Teammate (Seat ${slotIndex + 2})`;
  if (subtitle) subtitle.innerText = "Search by College R-ID or Student Name from the university records database.";
  if (input) input.value = "";
  if (results) results.innerHTML = getSearchEmptyStateHtml();

  overlay.classList.add("active");
  setTimeout(() => { if (input) input.focus(); }, 80);
}

function openSlotStudentSearchModalForTeam(teamId, seatNum) {
  currentSearchTargetSlot = null;
  currentSearchTeamId = teamId;

  const overlay = document.getElementById("studentSearchModalOverlay");
  const title = document.getElementById("studentSearchModalTitle");
  const subtitle = document.getElementById("studentSearchModalSubtitle");
  const input = document.getElementById("slotStudentSearchInput");
  const results = document.getElementById("slotStudentSearchResults");

  if (!overlay) return;

  if (title) title.innerText = `Add Teammate to Seat ${seatNum}`;
  if (subtitle) subtitle.innerText = "Search by College R-ID or Student Name to directly add a verified member to your team.";
  if (input) input.value = "";
  if (results) results.innerHTML = getSearchEmptyStateHtml();

  overlay.classList.add("active");
  setTimeout(() => { if (input) input.focus(); }, 80);
}

function closeStudentSearchModal() {
  const overlay = document.getElementById("studentSearchModalOverlay");
  if (overlay) overlay.classList.remove("active");
}

function handleInTeamStudentClick(name, rId, teamName) {
  showGlassModal({
    title: "Student Already In Team",
    message: `${name} (@${rId}) is already enrolled in team "${teamName}". Each student can only belong to one active hackathon team at a time.`,
    confirmText: "Understood",
    icon: "⚠️",
    alertOnly: true
  });
}

function debounceSlotStudentSearch() {
  clearTimeout(slotSearchDebounceTimer);
  slotSearchDebounceTimer = setTimeout(() => {
    const input = document.getElementById("slotStudentSearchInput");
    const results = document.getElementById("slotStudentSearchResults");
    if (!input || !results) return;

    const query = input.value.trim();
    if (!query) {
      results.innerHTML = getSearchEmptyStateHtml();
      return;
    }

    const cacheKey = query.toUpperCase();
    if (studentSearchClientCache[cacheKey]) {
      renderSlotSearchResults(studentSearchClientCache[cacheKey], query);
      return;
    }

    if (slotSearchAbortController) {
      slotSearchAbortController.abort();
    }
    slotSearchAbortController = new AbortController();

    fetch(`/api/students/search?q=${encodeURIComponent(query)}`, { signal: slotSearchAbortController.signal })
      .then(res => res.json())
      .then(data => {
        const students = data.students || [];
        studentSearchClientCache[cacheKey] = students;
        const currentVal = (document.getElementById("slotStudentSearchInput")?.value || "").trim().toUpperCase();
        if (currentVal === cacheKey) {
          renderSlotSearchResults(students, query);
        }
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          results.innerHTML = `<div style="text-align:center; padding:24px 16px; color:var(--badge-coral);">Search request failed. Please check connection.</div>`;
        }
      });
  }, 45);
}

function renderSlotSearchResults(students, query) {
  const results = document.getElementById("slotStudentSearchResults");
  if (!results) return;

  if (students.length === 0) {
    results.innerHTML = `
      <div class="search-empty-state">
        <div class="search-empty-icon-ring" style="color:var(--badge-coral); background:rgba(240,83,66,0.1);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
        <h4 class="search-empty-title">No Students Found</h4>
        <p class="search-empty-desc">No student matches "<strong>${escapeHtml(query)}</strong>". Try checking the R-ID or name spelling.</p>
      </div>
    `;
    return;
  }

  results.innerHTML = students.map(s => {
    const sRid = (s.r_id || "").toUpperCase();
    const isMe = Boolean(currentUser && currentUser.id && currentUser.id.toUpperCase() === sRid);
    const isAlreadySelected = selectedFriends.some(f => f.id.toUpperCase() === sRid);
    const cleanName = (s.name || sRid).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
    const rawAvatar = s.avatar_url || "";
    const avatarSrc = getStudentAvatarSrc(rawAvatar, sRid);
    const isInTeam = Boolean(s.in_team);
    const teamName = s.team_name || "Another Team";
    const academicYear = s.academic_year || getAcademicYearByRid(sRid);
    const admissionYear = s.admission_year || getAdmissionYearByRid(sRid);

    let actionButtonHtml = "";
    if (isMe) {
      actionButtonHtml = `<span class="badge-selected">You (Leader)</span>`;
    } else if (isAlreadySelected) {
      actionButtonHtml = `<span class="badge-selected">Already Added</span>`;
    } else if (isInTeam) {
      actionButtonHtml = `
        <button onclick="handleInTeamStudentClick('${escapeAttr(cleanName)}', '${escapeAttr(sRid)}', '${escapeAttr(teamName)}')" class="btn-in-team-badge" title="Already enrolled in another team">
          In Team ⚠️
        </button>
      `;
    } else {
      actionButtonHtml = `
        <button onclick="selectStudentForSlot('${escapeAttr(sRid)}', '${escapeAttr(cleanName)}', '${escapeAttr(avatarSrc)}', '${escapeAttr(s.program || '')}', '${escapeAttr(s.semester_year || '')}')" class="btn-black-pill sm">
          + Add Teammate
        </button>
      `;
    }

    if (s.is_unindexed_fallback) {
      return `
        <div class="student-search-card-rich" style="border:1.5px dashed rgba(245,158,11,0.5); background:rgba(245,158,11,0.04);">
          <div class="student-card-left">
            <div class="student-search-avatar">
              <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(sRid)}" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
            </div>
            <div class="student-search-info">
              <div class="student-name-row">
                <span class="student-search-name">${escapeHtml(cleanName)}</span>
                <span class="student-rid-badge">@${escapeHtml(sRid)}</span>
                ${isInTeam 
                  ? `<span class="already-in-team-badge" title="Enrolled in ${escapeAttr(teamName)}">In Team: ${escapeHtml(teamName)}</span>`
                  : `<span class="student-available-badge">Available</span>`
                }
              </div>
              <div style="font-size:0.75rem; color:#f59e0b; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.25); border-radius:6px; padding:4px 8px; margin-top:6px; line-height:1.35;">
                Due to database overload, some student details aren't fully visible. You can still add them to your team roster.
              </div>
            </div>
          </div>
          <div class="student-card-action">
            ${actionButtonHtml}
          </div>
        </div>
      `;
    }

    return `
      <div class="student-search-card-rich">
        <div class="student-card-left">
          <div class="student-search-avatar">
            <img src="${escapeHtml(avatarSrc)}" 
                 data-raw-src="${escapeHtml(rawAvatar)}" 
                 alt="${escapeHtml(cleanName)}" 
                 loading="lazy" 
                 decoding="async" 
                 onerror="failedAvatarUrls.add(this.getAttribute('data-raw-src')); this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
          </div>
          <div class="student-search-info">
            <div class="student-name-row">
              <span class="student-search-name">${escapeHtml(cleanName)}</span>
              <span class="student-rid-badge">@${escapeHtml(sRid)}</span>
              <span class="student-year-badge">${escapeHtml(academicYear)}</span>
              ${isInTeam 
                ? `<span class="already-in-team-badge" title="Enrolled in ${escapeAttr(teamName)}">In Team: ${escapeHtml(teamName)}</span>`
                : `<span class="student-available-badge">Available</span>`
              }
            </div>

            <div class="student-program-row">
              <span class="student-program-text">${escapeHtml(s.program || 'Jaipur National University')}</span>
              ${admissionYear ? `<span class="student-batch-text">• Batch ${escapeHtml(admissionYear)}</span>` : ''}
            </div>

            <div class="student-meta-details-row">
              ${s.email ? `<span class="student-detail-chip"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px;height:13px;flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg> ${escapeHtml(s.email)}</span>` : ''}
              ${s.gender ? `<span class="student-detail-chip">• ${escapeHtml(s.gender)}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="student-card-action">
          ${actionButtonHtml}
        </div>
      </div>
    `;
  }).join("");
}

function selectStudentForSlot(rId, name, avatarUrl, program, semesterYear) {
  // If in Create Team mode
  if (currentSearchTeamId === null) {
    if (selectedFriends.some(f => f.id.toUpperCase() === rId.toUpperCase())) {
      showToast("Student already added to roster", "error");
      return;
    }
    if (selectedFriends.length >= 5) {
      showToast("All 5 teammate slots are already filled", "error");
      return;
    }
    selectedFriends.push({
      id: rId,
      name: name,
      avatar_url: avatarUrl,
      program: program,
      semester_year: semesterYear
    });
    closeStudentSearchModal();
    renderCreateTeamSeats();
    showToast(`Added ${name} to team roster!`, "success");
  } else {
    // In Team Detail mode: directly add member to the existing team
    const teamId = currentSearchTeamId;
    fetch(`/api/teams/${teamId}/members/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leader_r_id: currentUser ? currentUser.id : "",
        student_r_id: rId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`Added ${name} to the team!`, "success");
          closeStudentSearchModal();
          delete clientCache.teamsMap[teamId];
          clientCache.teamsList = null;
          loadTeamDetailView(teamId);
        } else {
          showToast(data.message || "Failed to add member", "error");
        }
      })
      .catch(() => showToast("Network error adding member", "error"));
  }
}

function removeFriendFromTeam(rId) {
  selectedFriends = selectedFriends.filter(f => f.id.toUpperCase() !== rId.toUpperCase());
  renderCreateTeamSeats();
}

let selectedHackathonType = "sih";

function selectHackathonType(type) {
  selectedHackathonType = type;
  document.querySelectorAll(".hackathon-select-card").forEach(c => {
    if (c.classList.contains(type)) {
      c.classList.add("active");
    } else {
      c.classList.remove("active");
    }
  });
}

function submitCreateTeam() {
  const nameInput = document.getElementById("teamNameInput");
  const descInput = document.getElementById("teamDescInput");
  const waInput = document.getElementById("teamWhatsappInput");
  const btn = document.getElementById("btnSubmitCreate");

  const name = nameInput ? nameInput.value.trim() : "";
  const desc = descInput ? descInput.value.trim() : "";
  const wa = waInput ? waInput.value.trim() : "";

  if (!name) {
    showToast("Team title is required", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = "Creating Team...";
  }

  fetch("/api/teams/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leader_r_id: currentUser ? currentUser.id : "",
      name: name,
      description: desc,
      whatsapp_link: wa,
      hackathon_type: selectedHackathonType,
      friend_r_ids: selectedFriends.map(f => f.id),
      pre_added_members: selectedFriends.map(f => f.id)
    })
  })
    .then(res => res.json())
    .then(data => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Create & Publish Team ➔";
      }
      if (data.success && data.team_id) {
        showToast("Team published successfully!", "success");
        clientCache.teamsList = null;
        clientCache.teamsMap = {};
        selectedFriends = [];

        // Clear form inputs
        if (nameInput) nameInput.value = "";
        if (descInput) descInput.value = "";
        if (waInput) waInput.value = "";

        // Reset underlying navigation to homepage so closing team modal returns to home
        document.querySelectorAll(".view-page-panel").forEach(p => p.classList.remove("active"));
        const discoverPanel = document.getElementById("viewDiscover");
        if (discoverPanel) discoverPanel.classList.add("active");
        const appShell = document.getElementById("appEnclosureFrame");
        if (appShell) appShell.classList.remove("two-column-mode");
        loadDiscoverView();

        // Display the newly created team full-screen window
        openTeamDetailModal(data.team_id);
      } else {
        showToast(data.message || "Failed to create team", "error");
      }
    })
    .catch(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Create & Publish Team ➔";
      }
      showToast("Network error creating team", "error");
    });
}

/* ==========================================================================
   7. STUDENT DIRECTORY VIEW
   ========================================================================== */
function loadStudentsView() {
  const container = document.getElementById("studentsViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="forest-header-section">
      <div class="greeting-sup-text">University Student Directory</div>
      <h1 class="greeting-main-title">Student Directory</h1>
      <p class="greeting-subtitle">Search registered college participants by R-ID or Name to discover collaborators.</p>
    </div>

    <div class="search-pill-wrapper" style="margin-bottom:24px;">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
      <input type="text" id="dirSearchInput" placeholder="Type student R-ID or Name (e.g. R15006, Rahul)..." class="search-pill-input" oninput="debounceDirectorySearch()">
    </div>

    <div id="dirSearchResults" class="teams-forest-grid">
      <div style="grid-column: 1 / -1; text-align:center; padding:48px 20px;">
        <p style="color:var(--text-sage); font-size:0.9375rem;">Type student R-ID or Name above to search</p>
      </div>
    </div>
  `;
}

function debounceDirectorySearch() {
  clearTimeout(dirSearchDebounce);
  dirSearchDebounce = setTimeout(() => {
    const input = document.getElementById("dirSearchInput");
    const resultsDiv = document.getElementById("dirSearchResults");
    if (!input || !resultsDiv) return;

    const query = input.value.trim();
    if (!query) {
      resultsDiv.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:48px 20px;"><p style="color:var(--text-sage); font-size:0.9375rem;">Type student R-ID or Name above to search</p></div>`;
      return;
    }

    const cacheKey = "DIR_" + query.toUpperCase();
    if (studentSearchClientCache[cacheKey]) {
      renderDirectorySearchResults(studentSearchClientCache[cacheKey], query);
      return;
    }

    if (currentSearchAbortController) currentSearchAbortController.abort();
    currentSearchAbortController = new AbortController();

    fetch(`/api/students/search?q=${encodeURIComponent(query)}`, { signal: currentSearchAbortController.signal })
      .then(res => res.json())
      .then(data => {
        const students = data.students || [];
        studentSearchClientCache[cacheKey] = students;
        const currentVal = (document.getElementById("dirSearchInput")?.value || "").trim().toUpperCase();
        if (currentVal === query.toUpperCase()) {
          renderDirectorySearchResults(students, query);
        }
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          resultsDiv.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:48px 20px;"><p style="color:var(--badge-coral); font-size:0.9375rem;">Search failed</p></div>`;
        }
      });
  }, 45);
}

function renderDirectorySearchResults(students, query) {
  const resultsDiv = document.getElementById("dirSearchResults");
  if (!resultsDiv) return;

  if (students.length === 0) {
    resultsDiv.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:48px 20px;"><p style="color:var(--text-sage); font-size:0.9375rem;">No students matching "${escapeHtml(query)}"</p></div>`;
    return;
  }

  resultsDiv.innerHTML = students.map(s => {
    const rawAvatar = s.avatar_url || "";
    const sRid = (s.r_id || "").toUpperCase();
    const cleanName = (s.name || sRid).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
    const avatarSrc = getStudentAvatarSrc(rawAvatar, sRid);
    const academicYear = s.academic_year || getAcademicYearByRid(sRid);
    const admissionYear = s.admission_year || getAdmissionYearByRid(sRid);

    return `
      <div class="team-card-forest student-directory-card">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:12px;">
          <div class="student-search-avatar" style="width:56px; height:56px; border-radius:10px;">
            <img src="${escapeHtml(avatarSrc)}" 
                 data-raw-src="${escapeHtml(rawAvatar)}" 
                 alt="${escapeHtml(cleanName)}" 
                 loading="lazy" 
                 decoding="async" 
                 onerror="failedAvatarUrls.add(this.getAttribute('data-raw-src')); this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
          </div>
          <div style="min-width:0; flex:1;">
            <h3 class="font-serif" style="font-size:1.15rem; color:#FFFFFF; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(cleanName)}</h3>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="student-rid-badge">@${escapeHtml(sRid)}</span>
              <span class="student-year-badge">${escapeHtml(academicYear)}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom:12px; font-size:0.8125rem; color:var(--text-sage);">
          <div>${escapeHtml(s.program || 'Jaipur National University')}</div>
          ${admissionYear ? `<div style="font-size:0.75rem; color:var(--text-sage-light); margin-top:2px;">Batch of ${escapeHtml(admissionYear)}</div>` : ''}
        </div>

        <div class="team-card-bottom-row" style="margin-top:auto;">
          <span style="font-size:0.75rem; color:var(--text-sage);">${escapeHtml(s.gender || '')}</span>
          ${s.email ? `<a href="mailto:${escapeHtml(s.email)}" class="btn-black-pill sm" style="font-size:0.75rem; padding:5px 12px;">Email Teammate</a>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================================
   8. AUTHENTICATION VIEW & JNU LOGO INTEGRATION (POINT 4)
   ========================================================================== */
let resendTimerInterval = null;
let resendSecondsRemaining = 30;
let isVerifyingOtp = false;
let pendingStudentProfile = null;

function renderAuthProfileSpotlight(student, targetEmail) {
  const spotlightContainer = document.getElementById("authStep2ProfileSpotlight");
  const bannerContainer = document.getElementById("authStep2DispatchBanner");
  if (!spotlightContainer) return;

  const rawAvatar = student.avatar_url || "";
  const avatarSrc = getStudentAvatarSrc(rawAvatar, student.r_id);
  const cleanName = (student.name || student.r_id || "Student").replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
  const displayEmail = student.jnu_email || targetEmail || student.email || `${student.r_id}@student.edu`;
  const academicYear = student.current_year || student.academic_year || getAcademicYearByRid(student.r_id);
  const dob = student.dob || "Not Provided";
  const gender = student.gender || "Not Specified";
  const state = student.state || "Not Provided";

  const isBlankAvatar = !rawAvatar || rawAvatar.includes("dicebear") || rawAvatar.includes("data:image");

  spotlightContainer.innerHTML = `
    <div class="auth-spotlight-profile-inner">
      <div class="auth-student-big-avatar-box">
        ${isBlankAvatar ? `
          <div class="auth-instagram-avatar-circle">
            <img src="${INSTAGRAM_EMPTY_AVATAR}" alt="Default avatar" class="auth-student-big-avatar" style="border-radius:50%;">
          </div>
        ` : `
          <img src="${escapeHtml(avatarSrc)}" 
               data-raw-src="${escapeHtml(rawAvatar)}" 
               alt="${escapeHtml(cleanName)}" 
               class="auth-student-big-avatar"
               onerror="failedAvatarUrls.add(this.getAttribute('data-raw-src')); this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
        `}
      </div>

      <div class="auth-student-details-sheet">
        <h2 class="auth-student-fullname font-serif">${escapeHtml(cleanName)}</h2>
        <div style="margin-bottom:12px;">
          <span class="student-rid-badge highlight">@${escapeHtml(student.r_id)}</span>
        </div>

        <div class="auth-unboxed-details">
          <div class="auth-unboxed-row">
            <span class="auth-unboxed-label">Academic Year</span>
            <span class="auth-unboxed-value">${escapeHtml(academicYear)}</span>
          </div>
          <div class="auth-unboxed-row">
            <span class="auth-unboxed-label">Date of Birth</span>
            <span class="auth-unboxed-value">${escapeHtml(dob)}</span>
          </div>
          <div class="auth-unboxed-row">
            <span class="auth-unboxed-label">Gender</span>
            <span class="auth-unboxed-value">${escapeHtml(gender)}</span>
          </div>
          <div class="auth-unboxed-row">
            <span class="auth-unboxed-label">State</span>
            <span class="auth-unboxed-value">${escapeHtml(state)}</span>
          </div>
          <div class="auth-unboxed-row full-width">
            <span class="auth-unboxed-label">Official Email</span>
            <span class="auth-unboxed-value truncate">${escapeHtml(displayEmail)}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  if (bannerContainer) {
    bannerContainer.innerHTML = `
      <div class="auth-dispatch-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; flex-shrink:0;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      </div>
      <div class="auth-dispatch-text">
        <span>Verification code sent to</span>
        <strong class="auth-dispatch-email">${escapeHtml(displayEmail)}</strong>
      </div>
    `;
  }
}

function loadLoginView() {
  const container = document.getElementById("loginViewContainer");
  if (!container) return;

  if (currentUser && !currentUser.needs_program) {
    const dest = postLoginRedirect || "/";
    postLoginRedirect = null;
    navigateTo(dest);
    return;
  }

  pendingRegistrationData = null;
  pendingStudentProfile = null;
  clearInterval(resendTimerInterval);

  const courseOptionsHtml = ACADEMIC_PROGRAMS.map(p => `
    <option value="${escapeAttr(p)}">${escapeHtml(p)}</option>
  `).join("");

  container.innerHTML = `
    <div class="login-screen-wrap">
      <div class="login-editorial-card" id="loginCardFrame">
        
        <!-- Official JNU Transparent Logo Merged with Portal (Hidden on Step 2 & Course Select) -->
        <div class="login-jnu-logo-box">
          <img src="/static/img/jnu_logo.png" alt="Jaipur National University Logo" class="jnu-signin-logo" onerror="this.src='/static/img/jnu_logo.jpg';">
        </div>

        <h1 class="font-serif login-portal-title" style="font-size:1.875rem; margin-bottom:6px;">Student Sign In</h1>
        <p class="login-portal-subtitle" style="color:var(--text-sage); font-size:0.875rem; margin-bottom:20px;">Enter your College R-ID to continue</p>

        <!-- Step 1: Input R-ID -->
        <div id="authStep1" class="auth-step-panel">
          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label-forest" style="text-align:left;">College R-ID</label>
            <input type="text" id="authRidInput" placeholder="e.g. R15006" class="input-forest" style="font-weight:750; text-transform:uppercase; font-size:1.125rem; letter-spacing:0.04em; text-align:center;" onkeyup="if(event.key==='Enter') submitInitialRid()">
          </div>

          <button onclick="submitInitialRid()" id="btnSendOtp" class="btn-auth-submit" style="width:100%;">
            Sign In ➔
          </button>
        </div>

        <!-- Step 1B: Fallback when campus database is offline or unlisted (Case 2) -->
        <div id="authStepSyncNotice" class="auth-step-panel" style="display:none; text-align:left;">
          <div style="text-align:center; margin-bottom:16px;">
            <div class="auth-instagram-avatar-box">
              <img id="syncAvatarImg" src="${INSTAGRAM_EMPTY_AVATAR}" alt="No profile photo" style="width:76px; height:76px; border-radius:50%; border:2px solid rgba(255,255,255,0.15); box-shadow:0 4px 16px rgba(0,0,0,0.3);">
            </div>
            <div style="margin-top:8px;">
              <span class="student-rid-badge" style="font-size:0.875rem; padding:4px 14px;">
                R-ID: <strong id="syncRidBanner"></strong>
              </span>
            </div>
          </div>

          <div class="auth-sync-text" style="background:rgba(242,169,34,0.1); border:1px solid rgba(242,169,34,0.25); border-radius:8px; padding:12px 16px; margin-bottom:16px; font-size:0.8125rem; color:#FFD479; line-height:1.45; text-align:center;">
            Due to server load we couldn't fetch your data. Enter your details manually to continue.
          </div>

          <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:18px;">
            <div>
              <label class="form-label-forest">Full Name *</label>
              <input type="text" id="syncNameInput" placeholder="Your full name as per college ID" class="input-forest">
            </div>

            <div>
              <label class="form-label-forest">Course / Degree Program *</label>
              <select id="syncCourseSelect" class="input-forest">
                ${courseOptionsHtml}
              </select>
            </div>

            <div>
              <label class="form-label-forest">Gender *</label>
              <select id="syncGenderSelect" class="input-forest">
                <option value="Male" selected>Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label class="form-label-forest">Email *</label>
              <input type="email" id="syncEmailInput" placeholder="e.g. name@gmail.com" class="input-forest">
            </div>
          </div>

          <button onclick="submitSyncDetailsAndSendOtp()" id="btnSendSyncOtp" class="btn-auth-submit" style="width:100%;">
            Send Verification Code ➔
          </button>

          <button onclick="showAuthStep(1)" class="btn-auth-secondary" style="width:100%; margin-top:8px;">
            ← Change R-ID
          </button>
        </div>

        <!-- Step 2: Zero-Scroll OTP Verification (Clean Split Grid on Desktop) -->
        <div id="authStep2" class="auth-step-panel" style="display:none;">
          <div class="auth-otp-split-grid">
            <!-- Left Column: Student Identity Spotlight -->
            <div id="authStep2ProfileSpotlight" class="auth-otp-left-col"></div>

            <!-- Right Column: OTP Code Entry & Actions -->
            <div class="auth-otp-right-col">
              <div id="authStep2DispatchBanner" class="auth-dispatch-notice-bar"></div>

              <div class="form-group" style="margin-bottom:14px;">
                <label class="form-label-forest" style="text-align:center; font-size:0.75rem; margin-bottom:6px; letter-spacing:0.04em;">Enter 6-Digit Code</label>
                <input type="text" id="otpCodeInput" placeholder="••••••" maxlength="6" class="input-forest otp-code-input" autocomplete="one-time-code" inputmode="numeric" onkeyup="if(event.key==='Enter') verifyEmailOtpCode()">
              </div>

              <button onclick="verifyEmailOtpCode()" id="btnVerifyOtp" class="btn-auth-submit" style="width:100%;">
                Verify & Sign In ➔
              </button>

              <div class="auth-otp-footer-row">
                <button type="button" id="btnResendOtp" onclick="handleResendOtp()" class="auth-link-btn" disabled>
                  Resend Code (<span id="resendCountdown">30</span>s)
                </button>
                <button type="button" onclick="showAuthStep(1)" class="auth-link-btn change-rid">
                  ← Change R-ID
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2B: Post-Login Education Course Selection (Case 1B) -->
        <div id="authStepCourseSelect" class="auth-step-panel" style="display:none; text-align:left;">
          <div style="text-align:center; margin-bottom:16px;">
            <div class="auth-student-big-avatar-box" style="margin-bottom:8px;">
              <img id="courseSelectAvatar" src="${DEFAULT_STUDENT_AVATAR}" alt="Student" class="auth-student-big-avatar" style="width:76px; height:76px; border-radius:50%;">
            </div>
            <h2 id="courseSelectStudentName" class="font-serif" style="font-size:1.35rem; color:#FFFFFF; margin-bottom:4px;"></h2>
            <span class="student-rid-badge" style="font-size:0.8125rem; padding:3px 12px;">
              R-ID: <strong id="courseSelectRid"></strong>
            </span>
          </div>

          <div style="background:rgba(62,168,108,0.1); border:1px solid rgba(62,168,108,0.25); border-radius:8px; padding:12px 16px; margin-bottom:16px; text-align:center;">
            <div style="font-weight:700; color:#B8D8C4; font-size:0.875rem; margin-bottom:2px;">Select Your Academic Program</div>
            <div style="font-size:0.75rem; color:var(--text-sage);">Please choose your course to finish setting up your student profile.</div>
          </div>

          <div class="form-group" style="margin-bottom:18px;">
            <label class="form-label-forest">Degree / Academic Program *</label>
            <select id="authCourseSelectInput" class="input-forest" style="font-size:0.9375rem; padding:12px 14px;">
              ${courseOptionsHtml}
            </select>
          </div>

          <button onclick="submitUserCourseSelection()" id="btnSubmitCourseSelect" class="btn-auth-submit" style="width:100%;">
            Save & Continue to Profile ➔
          </button>
        </div>

      </div>
    </div>
  `;

  if (currentUser && currentUser.needs_program) {
    showAuthStep('course');
  }
}

function showAuthStep(step) {
  const s1 = document.getElementById("authStep1");
  const sSync = document.getElementById("authStepSyncNotice");
  const s2 = document.getElementById("authStep2");
  const sCourse = document.getElementById("authStepCourseSelect");
  const logoBox = document.querySelector(".login-jnu-logo-box");
  const cardTitle = document.querySelector(".login-portal-title");
  const cardSub = document.querySelector(".login-portal-subtitle");

  const isStep1 = step === 1;
  const isOtpStep = step === 2;
  const isSyncStep = step === 'sync';
  const isCourseStep = step === 'course_select';

  // HIDE official JNU Crest logo and default titles on Step 2, sync, and course_select
  if (logoBox) logoBox.style.display = isStep1 ? "block" : "none";
  if (cardTitle) cardTitle.style.display = isStep1 ? "block" : "none";
  if (cardSub) cardSub.style.display = isStep1 ? "block" : "none";

  const panels = [
    { el: s1, active: isStep1 },
    { el: sSync, active: isSyncStep },
    { el: s2, active: isOtpStep },
    { el: sCourse, active: isCourseStep }
  ];

  panels.forEach(p => {
    if (p.el) {
      if (p.active) {
        p.el.style.display = "block";
        p.el.style.opacity = "0";
        p.el.style.transform = "translateY(4px)";
        requestAnimationFrame(() => {
          p.el.style.transition = "opacity 0.2s ease, transform 0.2s ease";
          p.el.style.opacity = "1";
          p.el.style.transform = "translateY(0)";
        });
      } else {
        p.el.style.display = "none";
      }
    }
  });

  if (isOtpStep) {
    startResendTimer();
    const input = document.getElementById("otpCodeInput");
    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 150);
    }
  }

  if (isCourseStep && currentUser) {
    const nameEl = document.getElementById("courseSelectStudentName");
    const ridEl = document.getElementById("courseSelectRid");
    const avatarEl = document.getElementById("courseSelectAvatar");
    if (nameEl) nameEl.innerText = currentUser.name || "Student";
    if (ridEl) ridEl.innerText = currentUser.id || "";
    if (avatarEl) avatarEl.src = getStudentAvatarSrc(currentUser.avatar_url, currentUser.id);
  }
}

function startResendTimer() {
  clearInterval(resendTimerInterval);
  resendSecondsRemaining = 30;
  const btn = document.getElementById("btnResendOtp");
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = `Resend Code (<span id="resendCountdown">${resendSecondsRemaining}</span>s)`;

  resendTimerInterval = setInterval(() => {
    resendSecondsRemaining--;
    const span = document.getElementById("resendCountdown");
    if (span) span.innerText = resendSecondsRemaining;

    if (resendSecondsRemaining <= 0) {
      clearInterval(resendTimerInterval);
      btn.disabled = false;
      btn.innerHTML = `Resend Code`;
    }
  }, 1000);
}

function handleResendOtp() {
  const btn = document.getElementById("btnResendOtp");
  if (btn && btn.disabled) return;

  if (pendingRegistrationData && pendingRegistrationData.name) {
    submitSyncDetailsAndSendOtp();
  } else {
    const ridInput = document.getElementById("authRidInput");
    const rid = (pendingRegistrationData && pendingRegistrationData.rid) || (ridInput ? ridInput.value.trim() : "");
    if (!rid) {
      showToast("Please enter your R-ID first", "error");
      showAuthStep(1);
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px;">${renderIosSpinner('sm')} <span>Resending...</span></span>`;
    }
    fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rid: rid.toUpperCase() })
    })
      .then(res => res.json())
      .then(data => {
        if (data.exists) {
          showToast("New verification code sent!", "success");
          startResendTimer();
        } else {
          showToast(data.message || "Failed to resend code", "error");
          btn.disabled = false;
          btn.innerText = "Resend Code";
        }
      })
      .catch(() => {
        showToast("Network error resending code", "error");
        btn.disabled = false;
        btn.innerText = "Resend Code";
      });
  }
}

function submitInitialRid() {
  const ridInput = document.getElementById("authRidInput");
  const btn = document.getElementById("btnSendOtp");
  if (!ridInput || !ridInput.value.trim()) {
    showToast("Please enter your College R-ID", "error");
    return;
  }

  const isCreateTeamIntent = postLoginRedirect === "/create-team";
  const defaultBtnText = isCreateTeamIntent ? "Sign In & Continue ➔" : "Sign In ➔";

  const rid = ridInput.value.trim().toUpperCase();
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;">${renderIosSpinner('sm')} <span>Connecting...</span></span>`;

  fetch("/api/auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rid: rid })
  })
    .then(async res => {
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error("Server communication error (status " + res.status + ")");
      }
      return data;
    })
    .then(data => {
      btn.disabled = false;
      btn.innerHTML = defaultBtnText;

      if (data.exists) {
        pendingRegistrationData = { rid: rid };
        pendingStudentProfile = data.student || { r_id: rid };
        renderAuthProfileSpotlight(pendingStudentProfile, data.email);
        showAuthStep(2);
        showToast("Verification code sent!", "success");
      } else if (data.not_found) {
        pendingRegistrationData = { rid: rid };
        const banner = document.getElementById("syncRidBanner");
        if (banner) banner.innerText = rid;
        showAuthStep('sync');
      } else {
        showToast(data.message || "Unable to proceed with this R-ID", "error");
      }
    })
    .catch((err) => {
      console.error("submitInitialRid error:", err);
      btn.disabled = false;
      btn.innerHTML = defaultBtnText;
      showToast(err && err.message ? err.message : "Network error checking R-ID", "error");
    });
}

function submitSyncDetailsAndSendOtp() {
  const nameInput = document.getElementById("syncNameInput");
  const emailInput = document.getElementById("syncEmailInput");
  const courseSelect = document.getElementById("syncCourseSelect");
  const genderSelect = document.getElementById("syncGenderSelect");
  const btn = document.getElementById("btnSendSyncOtp");

  const rid = pendingRegistrationData ? pendingRegistrationData.rid : "";
  const name = nameInput ? nameInput.value.trim() : "";
  const email = emailInput ? emailInput.value.trim() : "";
  const program = courseSelect ? courseSelect.value.trim() : "";
  const gender = genderSelect ? genderSelect.value.trim() : "Male";

  if (!rid || !name || !email || !program) {
    showToast("Please fill all required academic fields", "error");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;">${renderIosSpinner('sm')} <span>Sending Code...</span></span>`;

  fetch("/api/auth/send-registration-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rid: rid,
      name: name,
      email: email,
      program: program,
      gender: gender
    })
  })
    .then(res => res.json())
    .then(data => {
      btn.disabled = false;
      btn.innerText = "Send Verification Code";

      if (data.success) {
        pendingRegistrationData = {
          rid: rid,
          name: name,
          email: email,
          program: program,
          gender: gender
        };
        pendingStudentProfile = {
          r_id: rid,
          name: name,
          email: email,
          program: program,
          gender: gender,
          avatar_url: null
        };
        renderAuthProfileSpotlight(pendingStudentProfile, email);
        showAuthStep(2);
        showToast("Verification code sent!", "success");
      } else {
        showToast(data.message || "Failed to send code", "error");
      }
    })
    .catch(() => {
      btn.disabled = false;
      btn.innerText = "Send Verification Code";
      showToast("Network error sending code", "error");
    });
}

function verifyEmailOtpCode() {
  if (isVerifyingOtp) return;

  const ridInput = document.getElementById("authRidInput");
  const otpInput = document.getElementById("otpCodeInput");
  const btn = document.getElementById("btnVerifyOtp");

  if (!otpInput || !otpInput.value.trim()) {
    showToast("Please enter 6-digit verification code", "error");
    return;
  }

  const rid = (pendingRegistrationData && pendingRegistrationData.rid) || (ridInput ? ridInput.value.trim().toUpperCase() : "");
  const otp = otpInput.value.trim();

  if (!rid) {
    showToast("Session expired, please re-enter your R-ID", "error");
    showAuthStep(1);
    return;
  }

  isVerifyingOtp = true;
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;">${renderIosSpinner('sm')} <span>Verifying...</span></span>`;

  const payload = {
    rid: rid,
    otp: otp
  };

  if (pendingRegistrationData) {
    payload.name = pendingRegistrationData.name;
    payload.email = pendingRegistrationData.email;
    payload.program = pendingRegistrationData.program;
    payload.gender = pendingRegistrationData.gender;
  }

  fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(async res => {
      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error("Server returned an invalid response (status " + res.status + ")");
      }
      return data;
    })
    .then(data => {
      isVerifyingOtp = false;
      btn.disabled = false;
      btn.innerText = "Verify & Sign In ➔";

      if (data && data.success) {
        currentUser = data.user || { id: rid, name: "Student" };
        currentUser.rid = currentUser.id || rid;
        try { localStorage.setItem("jnumate_user", JSON.stringify(currentUser)); } catch (e) {}
        try {
          renderNavUserSlots();
          renderDrawerUserSlot();
          loadNotifications();
        } catch (renderErr) {
          console.warn("renderNavUserSlots notice:", renderErr);
        }
        // Case 1B: If education details (program) are missing, show course selection prompt
        const needsCourse = Boolean(data.needs_program || !currentUser.program || currentUser.program === "Student");
        if (needsCourse && (!pendingRegistrationData || !pendingRegistrationData.program)) {
          showAuthStep('course_select');
          return;
        }

        showToast("Signed in successfully!", "success");

        try {
          if (postLoginRedirect) {
            const redirectDest = postLoginRedirect;
            postLoginRedirect = null;
            navigateTo(redirectDest);
          } else {
            navigateTo("/profile");
          }
        } catch (navErr) {
          console.warn("Navigation notice:", navErr);
          navigateTo("/");
        }
      } else {
        const errorMsg = (data && data.message) || "Invalid verification code";
        showToast(errorMsg, "error");
      }
    })
    .catch(err => {
      isVerifyingOtp = false;
      btn.disabled = false;
      btn.innerText = "Verify & Sign In ➔";
      console.error("verify-otp error:", err);
      showToast("Cannot connect to server. Please check your connection and retry.", "error");
    });
}

function submitUserCourseSelection() {
  const select = document.getElementById("authCourseSelectInput");
  const btn = document.getElementById("btnSubmitCourseSelect");
  if (!select || !select.value) {
    showToast("Please select your academic program", "error");
    return;
  }
  const program = select.value;
  const rid = currentUser ? currentUser.id : "";

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;">${renderIosSpinner('sm')} <span>Saving...</span></span>`;
  }

  fetch("/api/user/update-program", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r_id: rid, program: program })
  })
    .then(res => res.json())
    .then(data => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Save & Continue to Profile ➔";
      }
      if (data.success) {
        if (currentUser) {
          currentUser.program = program;
          try { localStorage.setItem("jnumate_user", JSON.stringify(currentUser)); } catch (e) {}
        }
        showToast("Academic program updated successfully!", "success");
        if (postLoginRedirect) {
          const redirectDest = postLoginRedirect;
          postLoginRedirect = null;
          navigateTo(redirectDest);
        } else {
          navigateTo("/profile");
        }
      } else {
        showToast(data.message || "Failed to update program", "error");
      }
    })
    .catch(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Save & Continue to Profile ➔";
      }
      showToast("Network error updating program", "error");
    });
}

/* ==========================================================================
   9. NOTIFICATION ENGINE FRONTEND (POINT 6)
   ========================================================================== */
function loadNotifications() {
  const r_id = currentUser ? currentUser.id : "";
  fetch(`/api/notifications?r_id=${encodeURIComponent(r_id)}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        unreadNotificationsCount = data.unread_count || 0;
        updateNotificationBadges(unreadNotificationsCount);
        renderNotificationsList(data.notifications || [], unreadNotificationsCount);
      }
    })
    .catch(err => console.warn("Notice loading notifications:", err));
}

function updateNotificationBadges(count) {
  const dtBadge = document.getElementById("desktopNotifBadge");
  const dtTopBadge = document.getElementById("desktopTopNotifBadge");
  const mbBadge = document.getElementById("mobileNotifBadge");
  const totalBadge = document.getElementById("notifTotalBadge");
  const dtUnread = document.getElementById("desktopNotifUnreadCount");

  [dtBadge, dtTopBadge, mbBadge].forEach(b => {
    if (!b) return;
    if (count > 0) {
      b.innerText = count > 9 ? "9+" : count;
      b.style.display = "block";
    } else {
      b.style.display = "none";
    }
  });

  if (totalBadge) {
    if (count > 0) {
      totalBadge.innerText = `${count} unread`;
      totalBadge.style.display = "inline-flex";
    } else {
      totalBadge.style.display = "none";
    }
  }

  if (dtUnread) {
    if (count > 0) {
      dtUnread.innerText = `${count} new`;
      dtUnread.style.display = "inline-flex";
    } else {
      dtUnread.style.display = "none";
    }
  }
}

function toggleNotificationsPanel() {
  const overlay = document.getElementById("notifOverlay");
  if (overlay) {
    overlay.classList.toggle("active");
    if (overlay.classList.contains("active")) {
      document.body.classList.add("scroll-locked");
      loadNotifications();
    } else {
      const modal = document.getElementById("teamDetailModal");
      if (!modal || modal.style.display === "none") {
        document.body.classList.remove("scroll-locked");
      }
    }
  }
}

function closeNotificationsPanel() {
  const overlay = document.getElementById("notifOverlay");
  if (overlay) {
    overlay.classList.remove("active");
  }
  const modal = document.getElementById("teamDetailModal");
  if (!modal || modal.style.display === "none") {
    document.body.classList.remove("scroll-locked");
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).split('.')[0];
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch (e) {
    return String(dateStr).split('.')[0];
  }
}

function renderNotificationsList(notifications, unreadCount) {
  const mobileContainer = document.getElementById("notifListContainer");
  const desktopContainer = document.getElementById("desktopNotifListBody");

  const emptyHtml = `
    <div style="text-align:center; padding:36px 16px;">
      <div style="width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto; color:var(--text-sage);">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      </div>
      <div style="font-family:var(--font-serif); font-size:1rem; font-weight:700; color:var(--text-white); margin-bottom:4px;">All Caught Up</div>
      <p style="font-size:0.75rem; color:var(--text-sage); margin:0;">You have no unread notifications.</p>
    </div>
  `;

  if (notifications.length === 0) {
    if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
    if (desktopContainer) desktopContainer.innerHTML = emptyHtml;
    return;
  }

  const itemsHtml = notifications.map(n => {
    let iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
    let iconBg = "rgba(255,255,255,0.08)";
    let iconColor = "var(--text-white)";

    if (n.type === "join_request") {
      iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`;
      iconBg = "rgba(59, 130, 246, 0.15)";
      iconColor = "#60a5fa";
    } else if (n.type === "request_accepted" || n.type === "team_added") {
      iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      iconBg = "rgba(34, 197, 94, 0.15)";
      iconColor = "#4ade80";
    } else if (n.type === "request_declined") {
      iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      iconBg = "rgba(239, 68, 68, 0.15)";
      iconColor = "#f87171";
    } else if (n.type === "member_left") {
      iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>`;
      iconBg = "rgba(245, 158, 11, 0.15)";
      iconColor = "#fbbf24";
    }

    const isUnread = (!n.is_read || n.is_read === 0);
    const linkAction = n.link ? `onclick="handleNotificationClick('${escapeAttr(n.id)}', '${escapeAttr(n.link)}')"` : `onclick="handleNotificationClick('${escapeAttr(n.id)}', null)"`;

    const cleanTitle = (n.title || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
    const cleanMessage = (n.message || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
    const relativeTime = formatRelativeTime(n.created_at);

    // Show real applicant avatar on join request notifications (Zero generic icons)
    const applicantAvatar = getStudentAvatarSrc(n.sender_avatar, n.sender_rid);
    const hasApplicantPhoto = Boolean(n.sender_avatar || n.sender_rid || n.type === 'join_request');

    const avatarHtml = hasApplicantPhoto
      ? `<img src="${escapeHtml(applicantAvatar)}" alt="${escapeHtml(n.sender_name || 'Applicant')}" class="notif-applicant-avatar" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">`
      : `<div class="notif-icon-circle" style="background:${iconBg}; color:${iconColor}; display:flex; align-items:center; justify-content:center;">${iconSvg}</div>`;

    return `
      <div class="notif-item-box ${isUnread ? 'unread' : ''}" ${linkAction} style="cursor:pointer; display:flex; align-items:center; gap:12px; padding:12px 14px;">
        ${avatarHtml}
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:2px;">
            <div class="notif-title" style="margin-bottom:0;">${escapeHtml(cleanTitle)}</div>
            ${isUnread ? '<span class="notif-pulse-dot" title="Unread"></span>' : ''}
          </div>
          <div class="notif-message">${escapeHtml(cleanMessage)}</div>
          <div class="notif-time">${escapeHtml(relativeTime)}</div>
        </div>
      </div>
    `;
  }).join("");

  if (mobileContainer) mobileContainer.innerHTML = itemsHtml;
  if (desktopContainer) desktopContainer.innerHTML = itemsHtml;
}

function handleNotificationClick(notifId, link) {
  closeDesktopDropdowns();
  closeNotificationsPanel();
  fetch("/api/notifications/mark-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      r_id: currentUser ? currentUser.id : "",
      notification_id: notifId
    })
  }).then(() => {
    loadNotifications();
  }).catch(() => {});

  if (link) {
    navigateTo(link);
  }
}

function markAllNotificationsAsRead() {
  fetch("/api/notifications/mark-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      r_id: currentUser ? currentUser.id : ""
    })
  })
    .then(res => res.json())
    .then(() => {
      showToast("All notifications marked as read", "info");
      loadNotifications();
    })
    .catch(() => showToast("Network error", "error"));
}

/* ==========================================================================
   10. ABOUT PAGE VIEW & CREATOR SPOTLIGHT (POINT 7: AFROZ ALAM)
   ========================================================================== */
function loadAboutView() {
  const container = document.getElementById("aboutViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div style="max-width:920px; margin:0 auto; padding-bottom:40px;">
      
      <!-- Editorial Header -->
      <div class="about-hero-section" style="margin-bottom:32px;">
        <div class="greeting-sup-text" style="color:var(--badge-mint);">Quick Student Guide</div>
        <h1 class="font-serif" style="font-size:2.5rem; line-height:1.15; margin-bottom:12px;">How to Use JnuMate in 4 Easy Steps</h1>
        <p style="font-size:1.0625rem; color:var(--text-sage-light); line-height:1.6;">
          Looking to join a team or find great teammates for your hackathon project? JnuMate makes it simple to team up, connect on WhatsApp, and start building together.
        </p>
      </div>

      <!-- Human 4-Step Guide -->
      <div class="about-features-grid" style="margin-bottom:36px;">
        <div class="about-feature-card">
          <div class="about-feature-icon">⚡</div>
          <h4 class="font-serif" style="font-size:1.25rem; margin-bottom:8px;">1. Sign In with R-ID</h4>
          <p style="font-size:0.875rem; color:var(--text-sage-light); line-height:1.5;">
            Type your College R-ID (e.g. R15006) and enter the 6-digit OTP. You are logged in within 5 seconds—no lengthy forms or passwords needed.
          </p>
        </div>

        <div class="about-feature-card">
          <div class="about-feature-icon">🚀</div>
          <h4 class="font-serif" style="font-size:1.25rem; margin-bottom:8px;">2. Browse or Pitch an Idea</h4>
          <p style="font-size:0.875rem; color:var(--text-sage-light); line-height:1.5;">
            Explore open project pitches on the Discover feed to find teams needing your skills, or tap <strong>+ Create Team</strong> to launch your own idea.
          </p>
        </div>

        <div class="about-feature-card">
          <div class="about-feature-icon">🤝</div>
          <h4 class="font-serif" style="font-size:1.25rem; margin-bottom:8px;">3. Fill Roster & Add Friends</h4>
          <p style="font-size:0.875rem; color:var(--text-sage-light); line-height:1.5;">
            Searching for friends? Click any open slot on your team and search them by name or R-ID to add them instantly, or accept incoming join requests.
          </p>
        </div>

        <div class="about-feature-card">
          <div class="about-feature-icon">💬</div>
          <h4 class="font-serif" style="font-size:1.25rem; margin-bottom:8px;">4. Chat on WhatsApp & Build</h4>
          <p style="font-size:0.875rem; color:var(--text-sage-light); line-height:1.5;">
            Once your team is assembled, click the team's official WhatsApp group link to sync up in real time, plan tasks, and hack together.
          </p>
        </div>
      </div>

      <!-- FAQ Card -->
      <div class="profile-pro-card" style="margin-bottom:36px;">
        <h3 class="font-serif" style="font-size:1.375rem; margin-bottom:16px;">Helpful Tips for Students</h3>
        
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <div style="font-weight:750; font-size:1rem; color:var(--text-white); margin-bottom:4px;">Can I be in multiple teams?</div>
            <p style="font-size:0.875rem; color:var(--text-sage-light); line-height:1.5;">No, each student can only belong to one active hackathon squad at a time so rosters stay fair and committed.</p>
          </div>

          <div style="border-top:1px solid var(--border-muted); padding-top:14px;">
            <div style="font-weight:750; font-size:1rem; color:var(--text-white); margin-bottom:4px;">How do teammates communicate?</div>
            <p style="font-size:0.875rem; color:var(--text-sage-light); line-height:1.5;">Team leaders can link an official WhatsApp group chat directly in the team page so all members can join with one click.</p>
          </div>

          <div style="border-top:1px solid var(--border-muted); padding-top:14px;">
            <div style="font-weight:750; font-size:1rem; color:var(--text-white); margin-bottom:4px;">How do open slots work?</div>
            <p style="font-size:0.875rem; color:var(--text-sage-light); line-height:1.5;">Any slot you leave unassigned will show as an open seat on the homepage feed. Other students can submit a request with a note explaining why they want to join.</p>
          </div>
        </div>
      </div>

      <!-- Creator Spotlight Banner (HONORING AFROZ ALAM - AT BOTTOM) -->
      <div class="creator-spotlight-banner">
        <div class="creator-badge">★ Creator Spotlight</div>
        <h2 class="creator-name-title">Designed & Built by Afroz Alam</h2>
        <p class="creator-pitch">
          JnuMate was designed and crafted by <strong>Afroz Alam</strong> to eliminate the chaos of hackathon team hunting. Built specifically for students, JnuMate brings together instant discovery, verified student search, and seamless collaboration so you can spend less time looking for a team and more time building winning software.
        </p>
      </div>

      <!-- Bottom Action CTA -->
      <div style="text-align:center; margin-top:24px; margin-bottom:20px;">
        <a href="/" class="btn-black-pill lg" style="margin-right:12px;">
          Discover Teams ➔
        </a>
        <a href="/create-team" class="btn-outline-pill" style="padding:13px 26px;">
          + Create Team
        </a>
      </div>

    </div>
  `;
}

/* ==========================================================================
   11. MODAL & TOAST UTILITY SYSTEM
   ========================================================================== */
function showGlassModal(options) {
  const overlay = document.getElementById("glassModalOverlay");
  const sheet = document.getElementById("glassModalSheet");
  if (!overlay || !sheet) return;

  const title = options.title || "Confirm Action";
  const message = options.message || "Are you sure you want to proceed?";
  const confirmText = options.confirmText || "Confirm";
  const cancelText = options.cancelText || "Cancel";
  const isDanger = options.isDanger || false;

  if (options.alertOnly) {
    sheet.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
        <span style="font-size:1.625rem;">${options.icon || '⚠️'}</span>
        <h3 class="forest-modal-title" style="margin-bottom:0;">${escapeHtml(title)}</h3>
      </div>
      <p class="forest-modal-message" style="font-size:0.9375rem; line-height:1.55; color:var(--text-white); margin-bottom:20px;">${escapeHtml(message)}</p>
      <div style="display:flex; justify-content:flex-end;">
        <button onclick="closeGlassModal()" class="btn-black-pill" style="padding:9px 24px;">
          ${escapeHtml(confirmText || "Understood")}
        </button>
      </div>
    `;
    overlay.classList.add("active");
    return;
  }

  sheet.innerHTML = `
    <h3 class="forest-modal-title">${escapeHtml(title)}</h3>
    <p class="forest-modal-message">${escapeHtml(message)}</p>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button onclick="closeGlassModal()" class="btn-outline-pill">
        ${escapeHtml(cancelText)}
      </button>
      <button id="modalConfirmBtn" class="${isDanger ? 'btn-danger-pill' : 'btn-black-pill'}">
        ${escapeHtml(confirmText)}
      </button>
    </div>
  `;

  const btn = document.getElementById("modalConfirmBtn");
  if (btn) {
    btn.onclick = () => {
      closeGlassModal();
      if (typeof options.onConfirm === "function") options.onConfirm();
    };
  }

  overlay.classList.add("active");
}

function closeGlassModal() {
  const overlay = document.getElementById("glassModalOverlay");
  if (overlay) overlay.classList.remove("active");
}

/* ==========================================================================
   10. ADMIN EXECUTIVE CONSOLE (/admin)
   ========================================================================== */
function loadAdminView() {
  const container = document.getElementById("adminViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="admin-loading-wrap">
      ${renderIosSpinner('lg')}
    </div>
  `;

  fetch("/api/admin/status", { credentials: "same-origin" })
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        loadAdminDashboardData();
      } else {
        renderAdminLoginForm();
      }
    })
    .catch(() => {
      renderAdminLoginForm();
    });
}

function renderAdminLoginForm() {
  const container = document.getElementById("adminViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="admin-auth-wrap">
      <div class="admin-auth-card">
        <div class="admin-auth-crest">
          <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="jnu-admin-logo" onerror="this.src='/static/img/jnu_logo.jpg';">
        </div>
        <h2 class="admin-auth-title font-serif">JnuMate Administration</h2>
        <p class="admin-auth-subtitle">Enter administrator credentials to access platform controls.</p>

        <form onsubmit="event.preventDefault(); submitAdminLogin();" class="admin-auth-form">
          <div class="form-group" style="margin-bottom:14px; text-align:left;">
            <label class="form-label-forest">Administrator ID</label>
            <input type="text" id="adminUserIdInput" class="input-forest" placeholder="e.g. admin" value="admin" required autocomplete="username">
          </div>

          <div class="form-group" style="margin-bottom:20px; text-align:left;">
            <label class="form-label-forest">Admin Password</label>
            <input type="password" id="adminPasswordInput" class="input-forest" placeholder="Enter password" required autocomplete="current-password" onkeyup="if(event.key==='Enter') submitAdminLogin()">
          </div>

          <button type="submit" id="btnAdminLogin" class="btn-auth-submit" style="width:100%;">
            Sign In ➔
          </button>
        </form>
      </div>
    </div>
  `;
}

function submitAdminLogin() {
  const userEl = document.getElementById("adminUserIdInput");
  const passEl = document.getElementById("adminPasswordInput");
  const btn = document.getElementById("btnAdminLogin");
  if (!userEl || !passEl) return;

  const username = userEl.value.trim();
  const password = passEl.value.trim();

  if (!username || !password) {
    showToast("Please enter User ID and Password", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;">${renderIosSpinner('sm')} <span>Authenticating...</span></span>`;
  }

  fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ user_id: username, password: password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast("Administrator authenticated", "success");
        loadAdminDashboardData();
      } else {
        if (btn) {
          btn.disabled = false;
          btn.innerText = "Sign In ➔";
        }
        showToast(data.message || "Invalid admin credentials", "error");
      }
    })
    .catch(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Sign In ➔";
      }
      showToast("Connection error authenticating admin", "error");
    });
}

function loadAdminDashboardData() {
  const container = document.getElementById("adminViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="admin-loading-wrap">
      ${renderIosSpinner('lg')}
    </div>
  `;

  Promise.all([
    fetch("/api/admin/settings").then(r => r.json()),
    fetch("/api/admin/stats").then(r => r.json()),
    fetch("/api/admin/activity").then(r => r.json()).catch(() => ({ success: false }))
  ])
    .then(([settingsRes, statsRes, activityRes]) => {
      if (!settingsRes || !statsRes) {
        renderAdminLoginForm();
        return;
      }
      if (settingsRes.message === "Unauthorized" || statsRes.message === "Unauthorized") {
        renderAdminLoginForm();
        return;
      }
      const settings = settingsRes.success ? settingsRes : { otp_email_enabled: true, default_bypass_otp: "123456" };
      const stats = (statsRes.success && statsRes.stats) ? statsRes.stats : {
        total_students: 16199,
        registered_students: 0,
        total_teams: 0,
        sih_teams: 0,
        ctf_teams: 0,
        total_members: 0,
        open_slots: 0,
        otp_email_enabled: true,
        default_bypass_otp: "123456"
      };
      const activity = (activityRes && activityRes.success) ? activityRes : {
        registered_students: [],
        recent_otps: (statsRes && statsRes.recent_activity) || [],
        recent_teams: [],
        recent_requests: []
      };
      renderAdminDashboard(settings, stats, activity);
    })
    .catch(err => {
      console.warn("Admin dashboard data notice:", err);
      renderAdminLoginForm();
    });
}

function renderAdminDashboard(settings, stats, activityData) {
  const container = document.getElementById("adminViewContainer");
  if (!container) return;

  const isEmailOn = Boolean(settings.otp_email_enabled);
  const bypassOtp = settings.default_bypass_otp || "123456";

  const registeredStudents = (activityData && activityData.registered_students) || [];
  const recentTeams = (activityData && activityData.recent_teams) || [];
  const recentRequests = (activityData && activityData.recent_requests) || [];
  const recentOtps = Array.isArray(activityData) ? activityData : ((activityData && activityData.recent_otps) || []);

  container.innerHTML = `
    <div class="admin-dashboard-wrap">
      <!-- Admin Top Executive Bar -->
      <div class="admin-header-bar">
        <div class="admin-header-left">
          <div class="admin-crest-mini">
            <img src="/static/img/jnu_logo.png" alt="JNU" onerror="this.src='/static/img/jnu_logo.jpg';">
          </div>
          <div>
            <div class="admin-header-kicker">Platform Administration</div>
            <h1 class="admin-header-title font-serif">Executive Control Center</h1>
          </div>
        </div>
        <div class="admin-header-right">
          <span class="admin-status-indicator">
            <span class="indicator-dot pulse"></span>
            Superuser Active
          </span>
          <button onclick="logoutAdmin()" class="btn-admin-signout">
            Sign Out
          </button>
        </div>
      </div>

      <!-- Master Control: OTP & Email Dispatch Switch -->
      <div class="admin-toggle-panel ${isEmailOn ? 'email-active' : 'email-paused'}">
        <div class="admin-toggle-main-row">
          <div class="admin-toggle-desc-col">
            <div class="admin-panel-kicker">Master Communication Engine</div>
            <h2 class="admin-panel-title">Student Email & OTP Dispatch</h2>
            <p class="admin-panel-subtitle">
              ${isEmailOn 
                ? "Live dispatch is <strong>ACTIVE</strong>. Brevo SMTP relays real OTP codes and notifications to student university emails."
                : "Live dispatch is <strong>HALTED</strong>. Zero emails are sent under any circumstance. All students can log in using the confidential default bypass OTP below."
              }
            </p>
          </div>
          <div class="admin-toggle-switch-box">
            <div class="admin-toggle-status-badge ${isEmailOn ? 'live' : 'paused'}">
              ${isEmailOn ? '● LIVE DISPATCH (ON)' : '■ ZERO EMAILS (OFF)'}
            </div>
            <label class="admin-switch">
              <input type="checkbox" id="adminOtpEmailToggle" ${isEmailOn ? 'checked' : ''} onchange="handleAdminToggleOtp(this.checked)">
              <span class="admin-slider"></span>
            </label>
          </div>
        </div>

        ${!isEmailOn ? `
          <!-- CONFIDENTIAL MASTER BYPASS CODE (VISIBLE STRICTLY WHEN EMAIL DISPATCH IS OFF) -->
          <div class="admin-bypass-card" id="adminBypassBox">
            <div class="admin-bypass-header">
              <div class="admin-bypass-title-row">
                <span class="admin-lock-icon">🔒</span>
                <div>
                  <h3 class="admin-bypass-heading">Default Master Bypass OTP</h3>
                  <p class="admin-bypass-sub">Use this code to sign in to any student account without sending emails.</p>
                </div>
              </div>
              <button onclick="copyAdminBypassCode()" class="btn-admin-copy-code" title="Copy code to clipboard">
                📋 Copy Code
              </button>
            </div>

            <div class="admin-bypass-code-box">
              <span class="admin-bypass-digits" id="adminBypassCodeDisplay">${escapeHtml(bypassOtp)}</span>
            </div>

            <div class="admin-bypass-update-row">
              <div class="admin-bypass-input-group">
                <input type="text" id="adminNewBypassInput" placeholder="Set custom OTP" maxlength="8" class="input-forest" style="width:160px; height:36px; text-align:center; font-weight:700;">
                <button onclick="handleAdminUpdateBypassOtp()" class="btn-admin-save-code">
                  Update Bypass Code
                </button>
              </div>
              <span class="admin-bypass-confidential-note">
                Strictly Confidential: Visible only on this admin dashboard. Hidden from students and public API responses.
              </span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Executive Platform Metrics Grid -->
      <div class="admin-metrics-grid">
        <div class="admin-metric-card">
          <div class="admin-metric-label">Registered Students</div>
          <div class="admin-metric-value" style="color:var(--badge-mint);">
            ${stats.registered_students || 0}
          </div>
          <div class="admin-metric-footnote">
            out of ${stats.total_students ? stats.total_students.toLocaleString() : '16,199'} campus records
          </div>
        </div>

        <div class="admin-metric-card">
          <div class="admin-metric-label">Hackathon Squads</div>
          <div class="admin-metric-value" style="color:var(--badge-yellow);">
            ${stats.total_teams || 0}
          </div>
          <div class="admin-metric-footnote">
            ${stats.sih_teams || 0} SIH Squads &nbsp;•&nbsp; ${stats.ctf_teams || 0} CTF Squads
          </div>
        </div>

        <div class="admin-metric-card">
          <div class="admin-metric-label">Open Roster Slots</div>
          <div class="admin-metric-value" style="color:#60A5FA;">
            ${stats.open_slots || 0}
          </div>
          <div class="admin-metric-footnote">
            Seats available for join requests
          </div>
        </div>

        <div class="admin-metric-card">
          <div class="admin-metric-label">Active Team Members</div>
          <div class="admin-metric-value" style="color:var(--text-white);">
            ${stats.total_members || 0}
          </div>
          <div class="admin-metric-footnote">
            Students assigned to active squads
          </div>
        </div>
      </div>

      <!-- Live Registered Students Directory -->
      <div class="admin-activity-card" style="margin-bottom: 24px;">
        <div class="admin-activity-header">
          <div>
            <h3 class="admin-activity-title">Live Registered Students</h3>
            <p style="font-size:0.75rem; color:var(--text-sage); margin:2px 0 0 0;">Verified student profiles active on JnuMate platform</p>
          </div>
          <span class="admin-activity-badge">${registeredStudents.length} Students</span>
        </div>

        ${registeredStudents.length === 0 ? `
          <div class="admin-empty-log">No registered students found in database.</div>
        ` : `
          <div class="admin-table-responsive" style="max-height:360px; overflow-y:auto;">
            <table class="admin-log-table">
              <thead style="position:sticky; top:0; background:#08170E; z-index:2;">
                <tr>
                  <th>Student R-ID</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Program / Dept</th>
                  <th>Email / Mobile</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${registeredStudents.map(s => `
                  <tr>
                    <td><strong style="color:var(--badge-yellow);">@${escapeHtml(s.r_id || '')}</strong></td>
                    <td style="color:#FFFFFF; font-weight:600;">${escapeHtml(s.name || 'Anonymous Student')}</td>
                    <td style="color:var(--text-sage);">${escapeHtml(s.gender || 'Not Specified')}</td>
                    <td style="color:var(--text-sage-light); font-size:0.78rem;">${escapeHtml(s.program || 'General')}</td>
                    <td style="color:var(--text-sage); font-size:0.78rem;">${escapeHtml(s.email || s.phone || 'N/A')}</td>
                    <td>
                      <span class="admin-badge verified">Registered</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Dual Activity Timeline: Squad Formations & Join Requests -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 24px;">
        <!-- Recent Squad Formations -->
        <div class="admin-activity-card">
          <div class="admin-activity-header">
            <div>
              <h3 class="admin-activity-title">Recent Squad Formations</h3>
              <p style="font-size:0.75rem; color:var(--text-sage); margin:2px 0 0 0;">Newly created hackathon teams</p>
            </div>
            <span class="admin-activity-badge">${recentTeams.length} Squads</span>
          </div>

          ${recentTeams.length === 0 ? `
            <div class="admin-empty-log">No hackathon squads created yet.</div>
          ` : `
            <div class="admin-table-responsive" style="max-height:320px; overflow-y:auto;">
              <table class="admin-log-table">
                <thead style="position:sticky; top:0; background:#08170E; z-index:2;">
                  <tr>
                    <th>Squad Name</th>
                    <th>Leader</th>
                    <th>Category</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentTeams.map(t => {
                    const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent';
                    return `
                      <tr>
                        <td style="color:#FFFFFF; font-weight:600;">${escapeHtml(t.name || '')}</td>
                        <td><strong style="color:var(--badge-yellow);">@${escapeHtml(t.leader_r_id || '')}</strong></td>
                        <td><span class="admin-badge" style="background:rgba(234,179,8,0.15); color:#FBBF24;">${escapeHtml((t.hackathon_type || 'SIH').toUpperCase())}</span></td>
                        <td style="color:var(--text-sage); font-size:0.75rem;">${escapeHtml(dateStr)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Recent Join Requests -->
        <div class="admin-activity-card">
          <div class="admin-activity-header">
            <div>
              <h3 class="admin-activity-title">Recent Join Requests</h3>
              <p style="font-size:0.75rem; color:var(--text-sage); margin:2px 0 0 0;">Applications sent to squad leaders</p>
            </div>
            <span class="admin-activity-badge">${recentRequests.length} Requests</span>
          </div>

          ${recentRequests.length === 0 ? `
            <div class="admin-empty-log">No join requests dispatched yet.</div>
          ` : `
            <div class="admin-table-responsive" style="max-height:320px; overflow-y:auto;">
              <table class="admin-log-table">
                <thead style="position:sticky; top:0; background:#08170E; z-index:2;">
                  <tr>
                    <th>Applicant</th>
                    <th>Target Squad</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentRequests.map(jr => {
                    const statusClass = jr.status === 'accepted' ? 'verified' : (jr.status === 'rejected' ? 'status-declined' : 'pending');
                    return `
                      <tr>
                        <td>
                          <strong style="color:var(--badge-yellow);">@${escapeHtml(jr.student_r_id || '')}</strong>
                          ${jr.student_name ? `<div style="color:var(--text-sage); font-size:0.7rem;">${escapeHtml(jr.student_name)}</div>` : ''}
                        </td>
                        <td>
                          <div style="color:#FFFFFF; font-weight:600; font-size:0.8rem;">${escapeHtml(jr.team_name || ('Team #' + jr.team_id))}</div>
                          ${jr.message ? `<div style="color:var(--text-sage-light); font-size:0.68rem; max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(jr.message)}</div>` : ''}
                        </td>
                        <td>
                          <span class="admin-badge ${statusClass}">
                            ${escapeHtml((jr.status || 'pending').toUpperCase())}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <!-- Recent OTP & Authentication Activity Log -->
      <div class="admin-activity-card">
        <div class="admin-activity-header">
          <div>
            <h3 class="admin-activity-title">Recent OTP & Authentication Events</h3>
            <p style="font-size:0.75rem; color:var(--text-sage); margin:2px 0 0 0;">Campus verification attempts & login dispatches</p>
          </div>
          <span class="admin-activity-badge">Last 30 Dispatches</span>
        </div>

        ${recentOtps.length === 0 ? `
          <div class="admin-empty-log">No recent verification attempts logged.</div>
        ` : `
          <div class="admin-table-responsive">
            <table class="admin-log-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Student R-ID</th>
                  <th>Target Email</th>
                  <th>Verification Code</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${recentOtps.map(a => {
                  const dateStr = a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recent';
                  const isUsed = Boolean(a.used);
                  return `
                    <tr>
                      <td style="color:var(--text-sage); font-family:monospace;">${escapeHtml(dateStr)}</td>
                      <td><strong style="color:var(--badge-yellow);">@${escapeHtml(a.r_id)}</strong></td>
                      <td style="color:var(--text-sage-light);">${escapeHtml(a.email)}</td>
                      <td><code class="admin-code-pill">${escapeHtml(a.otp || '••••••')}</code></td>
                      <td>
                        <span class="admin-badge ${isUsed ? 'verified' : 'pending'}">
                          ${isUsed ? 'Verified / Logged In' : 'Dispatched'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

    </div>
  `;
}

function handleAdminToggleOtp(checked) {
  fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otp_email_enabled: checked })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(checked ? "Email dispatch turned ON (Students receive emails)" : "Email dispatch turned OFF (Zero emails sent)", "success");
        loadAdminDashboardData();
      } else {
        showToast(data.message || "Failed to update setting", "error");
      }
    })
    .catch(() => showToast("Error toggling email setting", "error"));
}

function handleAdminUpdateBypassOtp() {
  const input = document.getElementById("adminNewBypassInput");
  if (!input || !input.value.trim()) {
    showToast("Please enter a new bypass code", "error");
    return;
  }
  const newCode = input.value.trim();
  fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ default_bypass_otp: newCode })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(`Default bypass OTP updated to ${newCode}`, "success");
        loadAdminDashboardData();
      } else {
        showToast(data.message || "Failed to update code", "error");
      }
    })
    .catch(() => showToast("Error updating bypass code", "error"));
}

function copyAdminBypassCode() {
  const el = document.getElementById("adminBypassCodeDisplay");
  const code = el ? el.innerText.trim() : "123456";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`Master bypass code ${code} copied to clipboard!`, "success");
    }).catch(() => {
      showToast(`Master bypass code: ${code}`, "info");
    });
  } else {
    showToast(`Master bypass code: ${code}`, "info");
  }
}

function logoutAdmin() {
  fetch("/api/admin/logout", { method: "POST" })
    .then(() => {
      showToast("Signed out of Admin Console", "info");
      loadAdminView();
    })
    .catch(() => loadAdminView());
}

document.addEventListener("click", (e) => {
  const overlay = document.getElementById("glassModalOverlay");
  if (overlay && e.target === overlay) {
    closeGlassModal();
  }
});

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `forest-toast-pill ${type}`;
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(str) {
  if (!str) return "";
  return String(str)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
