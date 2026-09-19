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

  // Login & Create Team & Events & Resources Viewport Isolation & Footer Visibility Control
  const isLoginRoute = path === "/login" || path === "/course-select" || path === "/select-program" || path === "/enter-details" || path === "/sync-details" || path === "/otp" || path === "/verify-otp";
  const isCreateTeamRoute = path === "/create-team";
  const isEventsRoute = path === "/events";
  const isResourcesRoute = path === "/resources";
  document.body.classList.toggle("is-login-route", isLoginRoute);
  document.body.classList.toggle("is-create-team-route", isCreateTeamRoute);
  document.body.classList.toggle("is-events-route", isEventsRoute);
  document.body.classList.toggle("is-resources-route", isResourcesRoute);
  const footerEl = document.getElementById("homescreenFooter");
  if (footerEl) {
    footerEl.style.display = (isLoginRoute || isCreateTeamRoute || isEventsRoute || isResourcesRoute) ? "none" : "";
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
  } else if (path === "/events") {
    const p = document.getElementById("viewEvents");
    if (p) {
      p.classList.add("active");
      loadEventsView();
    }
  } else if (path === "/resources") {
    const p = document.getElementById("viewResources");
    if (p) {
      p.classList.add("active");
      loadResourcesView();
    }
  } else if (path === "/login" || path === "/course-select" || path === "/select-program" || path === "/enter-details" || path === "/sync-details" || path === "/otp" || path === "/verify-otp") {
    const p = document.getElementById("viewLogin");
    if (p) {
      p.classList.add("active");
      loadLoginView();
      if (path === "/course-select" || path === "/select-program") {
        showAuthStep('course_select');
      } else if (path === "/enter-details" || path === "/sync-details") {
        showAuthStep('sync');
      } else if (path === "/otp" || path === "/verify-otp") {
        showAuthStep(2);
      }
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

  // Modern Desktop Top Navbar Links (Home, Events, Resources)
  document.querySelectorAll(".desktop-nav-link").forEach(link => {
    const linkPath = link.getAttribute("data-path") || link.getAttribute("href");
    if (linkPath === path || (linkPath !== "/" && path.startsWith(linkPath))) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Mobile Bottom Navigation Bar Items (Home, Events, Resources, Profile)
  document.querySelectorAll(".mobile-bottom-nav-item").forEach(item => {
    const navKey = item.getAttribute("data-nav");
    let isMatch = false;
    if (navKey === "home" && (path === "/" || path.startsWith("/team/"))) isMatch = true;
    else if (navKey === "events" && path === "/events") isMatch = true;
    else if (navKey === "resources" && path === "/resources") isMatch = true;
    else if (navKey === "profile" && path === "/profile") isMatch = true;

    if (isMatch) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

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
  const mobileAuthSlot = document.getElementById("mobileAuthSlot");

  if (currentUser) {
    const rawName = (currentUser.name || currentUser.id || "Student") + "";
    const cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
    const firstName = cleanName.split(' ')[0] || cleanName;
    const avatarUrl = getStudentAvatarSrc(currentUser.avatar_url, currentUser.id);

    if (mobileAuthSlot) {
      mobileAuthSlot.innerHTML = `
        <button id="btnMobileMenuToggle" onclick="toggleMobileDrawer()" class="mobile-menu-btn" aria-label="Open Profile & Menu">
          <img id="mobileMenuTogglePfp" src="${escapeHtml(avatarUrl)}" alt="Profile" class="mobile-menu-pfp" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
        </button>
      `;
    } else if (mobileTogglePfp) {
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
        <button type="button" onclick="toggleDesktopProfileDropdown(event)" class="desktop-top-user-pill" style="display:flex; align-items:center; gap:8px; padding:4px 12px 4px 5px; border-radius:9999px; background:#FFFFFF; border:1px solid #E2E8F0; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.06);" aria-label="Open Account Menu">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1.5px solid #16A34A; flex-shrink:0;" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
          <span style="font-weight:750; font-size:0.8125rem; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px;">${escapeHtml(cleanName)}</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px; height:13px; color:#64748B; flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
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
    if (mobileAuthSlot) {
      mobileAuthSlot.innerHTML = `
        <a href="/login" class="btn-black-pill sm" style="padding:6px 14px; font-size:0.8125rem; text-decoration:none; white-space:nowrap;">
          Sign In
        </a>
      `;
    } else if (mobileTogglePfp) {
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
  document.querySelectorAll(".filter-btn, .filter-menu-item, .discover-filter-pill").forEach(btn => {
    if (btn.getAttribute("data-filter") === type || (type === 'all' && (btn.id === 'btnFilterAll' || btn.getAttribute('data-filter') === 'all')) || (type === 'open' && (btn.id === 'btnFilterOpen' || btn.getAttribute('data-filter') === 'open'))) {
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

function handleSortTeams(val) {
  window.discoverSortOrder = val || 'newest';
  discoverCurrentPage = 1;
  if (clientCache.teamsList) {
    renderFilteredTeams(clientCache.teamsList);
  }
}

function handleMobileSearch(el) {
  const query = el ? el.value.trim().toLowerCase() : "";
  discoverSearchTerm = query;
  const desktopSearch = document.getElementById("searchInput");
  if (desktopSearch && desktopSearch.value !== (el ? el.value : "")) {
    desktopSearch.value = el ? el.value : "";
  }
  discoverCurrentPage = 1;
  if (clientCache.teamsList) {
    renderFilteredTeams(clientCache.teamsList);
  }
}

function toggleMobileFilterMenu() {
  const filterCycle = ['all', 'sih', 'ctf', 'open'];
  const nextIdx = (filterCycle.indexOf(discoverFilter) + 1) % filterCycle.length;
  setDiscoverFilter(filterCycle[nextIdx]);
  const friendlyNames = { all: "All Teams", sih: "Smart India Hackathon", ctf: "CTF Hackathon", open: "Open Slots" };
  showToast(`Filtering: ${friendlyNames[filterCycle[nextIdx]] || 'All'}`, "info");
}

let discoverCurrentPage = 1;
const TEAMS_PER_PAGE = 6;

function debounceDiscoverSearch() {
  clearTimeout(discoverSearchDebounce);
  discoverSearchDebounce = setTimeout(() => {
    const input = document.getElementById("searchInput");
    if (input) {
      discoverSearchTerm = input.value.trim().toLowerCase();
      discoverCurrentPage = 1;
      const mobInput = document.getElementById("mobileSearchInput");
      if (mobInput && mobInput.value !== input.value) {
        mobInput.value = input.value;
      }
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
    statusPill = `<span class="status-capsule full-pill">● Full (6/6)</span>`;
  } else {
    statusPill = `<span class="status-capsule open-pill">● ${openSlots} Open ${openSlots === 1 ? 'Seat' : 'Seats'}</span>`;
  }

  const hackBadgeHtml = isCtf
    ? `<span class="hackathon-tag-pill ctf"><img src="/static/img/ctf_logo.jpg" alt="CTF" style="width:16px; height:16px; object-fit:contain;"> CTF HACKATHON</span>`
    : `<span class="hackathon-tag-pill sih"><img src="/static/img/sih_logo.jpg" alt="SIH" style="width:16px; height:16px; object-fit:contain;"> SMART INDIA HACKATHON</span>`;

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
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        </div>
      `;
    }
  }

  return `
    <article class="team-forest-card" onclick="navigateTo('/team/${team.id}')" style="cursor:pointer;">
      <div style="flex:1;">
        <div class="team-card-top-row">
          ${hackBadgeHtml}
          ${statusPill}
        </div>

        <h2 class="team-card-title">${escapeHtml(team.name || 'Untitled Squad')}</h2>
        <p class="team-card-pitch">${escapeHtml(team.description || "Looking for teammates for the upcoming hackathon.")}</p>

        <div class="team-card-roster-row">
          ${rosterAvatarsHtml}
        </div>
      </div>

      <div class="team-card-bottom-row">
        <span class="team-card-members-label">${count} / 6 Members</span>
        <span class="btn-card-view-team">View Team &rarr;</span>
        <span class="team-card-mobile-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
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

  let filtered = [...teams];

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

  // Sorting
  window.discoverSortOrder = window.discoverSortOrder || 'newest';
  if (window.discoverSortOrder === 'slots') {
    filtered.sort((a, b) => {
      const aCount = a.member_count || (a.members ? a.members.length : 0);
      const bCount = b.member_count || (b.members ? b.members.length : 0);
      return (6 - bCount) - (6 - aCount);
    });
  } else if (window.discoverSortOrder === 'members') {
    filtered.sort((a, b) => {
      const aCount = a.member_count || (a.members ? a.members.length : 0);
      const bCount = b.member_count || (b.members ? b.members.length : 0);
      return bCount - aCount;
    });
  } else if (window.discoverSortOrder === 'name') {
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else {
    filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
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

  // Lock background body & html scroll (prevents Windows double scrollbars)
  document.body.classList.add("scroll-locked");
  document.documentElement.classList.add("scroll-locked");
  modal.style.display = "block";
  modal.style.pointerEvents = "auto";
  modal.scrollTop = 0;

  window.__currentTeamTab = 'team';

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
              <h2 style="font-family:var(--font-serif); font-size:1.75rem; margin-bottom:8px; color:#0F172A;">Team Not Found</h2>
              <p style="color:#64748B; margin-bottom:24px;">The requested hackathon team does not exist or has been disbanded.</p>
              <button onclick="closeTeamDetailModal()" class="btn-agro-yellow-pill">Back to Discover</button>
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
            <h2 style="font-family:var(--font-serif); font-size:1.75rem; margin-bottom:8px; color:#0F172A;">Unable to Load Team</h2>
            <p style="color:#64748B; margin-bottom:24px;">Please check your connection and try again.</p>
            <button onclick="closeTeamDetailModal()" class="btn-agro-yellow-pill">Back to Discover</button>
          </div>
        `;
      }
    });
}

function closeTeamDetailModal(restoreUrl = true) {
  stopTeamChatPolling();
  const modal = document.getElementById("teamDetailModal");
  if (modal) {
    modal.style.display = "none";
    modal.style.pointerEvents = "none";
  }
  document.body.classList.remove("scroll-locked");
  document.documentElement.classList.remove("scroll-locked");
  if (restoreUrl && window.location.pathname.startsWith("/team/")) {
    history.pushState(null, "", "/");
    highlightActiveNavLinks();
  }
}

function loadTeamDetailView(teamId) {
  openTeamDetailModal(teamId);
}

window.__currentTeamTab = window.__currentTeamTab || 'team';

function switchTeamTab(tabName, teamId) {
  window.__currentTeamTab = tabName;
  const tabs = document.querySelectorAll(".team-tab-btn");
  tabs.forEach(t => {
    t.classList.toggle("active", t.getAttribute("data-tab") === tabName);
  });
  const panes = document.querySelectorAll(".team-tab-pane");
  panes.forEach(p => {
    p.classList.toggle("active", p.id === `pane-${tabName}`);
  });

  const stickyAction = document.querySelector(".team-mobile-sticky-action");
  if (stickyAction) {
    stickyAction.style.display = (tabName === 'team') ? '' : 'none';
  }

  if (tabName === "discussion") {
    loadTeamChatMessages(teamId, true);
    startTeamChatPolling(teamId);
  } else {
    stopTeamChatPolling();
  }
}

function handleJoinMessageInput(el) {
  const counter = document.getElementById("joinMessageCounter");
  if (counter) {
    const len = (el.value || "").length;
    counter.textContent = `${len}/300`;
  }
}

function handleMobileJoinRequestClick(teamId) {
  if (!currentUser) {
    navigateTo('/login');
    return;
  }
  switchTeamTab('team', teamId);
  const input = document.getElementById('joinMessageInput');
  const card = document.getElementById('joinRequestCardBox');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { if (input) input.focus(); }, 350);
  }
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
  const activeTab = window.__currentTeamTab || 'team';
  const openSlots = Math.max(0, 6 - count);

  // Leader information
  const leaderMember = members.find(m => m && (m.role === 'leader' || (team.leader_r_id && m.r_id && m.r_id.toUpperCase() === team.leader_r_id.toUpperCase()))) || {};
  const leaderCleanName = (leaderMember.name || team.leader_r_id || "Captain").replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Captain";
  const leaderAvatar = getStudentAvatarSrc(leaderMember.avatar_url, team.leader_r_id, leaderCleanName);

  // Current user info for top bar
  const navUserName = currentUser ? (currentUser.name || currentUser.id || "Student").replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() : "";
  const navAvatar = currentUser ? getStudentAvatarSrc(currentUser.avatar_url, currentUser.id, navUserName) : "";

  // Track branding & details
  const trackLogoSrc = isSih ? '/static/img/sih_logo.jpg' : '/static/img/ctf_logo.jpg';
  const trackSubtitle = isSih 
    ? 'Official SIH Competition Track &bull; 6-Member Multidisciplinary Squad' 
    : 'Official CTF Cyber Challenge Track &bull; Cybersecurity & Defense Squad';

  // Build Roster Rows HTML
  let rosterRowsHtml = "";
  for (let i = 0; i < 6; i++) {
    const seatIndexStr = i < 9 ? `0${i + 1}` : `${i + 1}`;
    if (i < members.length) {
      const m = members[i];
      if (!m) continue;
      const mRid = (m.r_id || m.student_r_id || "") + "";
      const mName = (m.name || mRid || "Student") + "";
      const cleanName = mName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
      const isYou = Boolean(currentUser && currentUser.id && mRid && (mRid.toUpperCase() === (currentUser.id + '').toUpperCase()));
      const isTeamLeader = m.role === 'leader' || (team.leader_r_id && mRid.toUpperCase() === team.leader_r_id.toUpperCase());
      const avatarUrl = getStudentAvatarSrc(m.avatar_url, mRid, mName);

      rosterRowsHtml += `
        <div class="team-roster-item ${isTeamLeader ? 'is-lead-row' : ''}">
          <span class="team-seat-index">${seatIndexStr}</span>
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" class="team-member-avatar" loading="lazy" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
          <div class="team-member-details">
            <div class="team-member-top-row">
              <span class="team-member-name">${escapeHtml(cleanName)}</span>
              ${isTeamLeader ? `<span class="team-role-badge captain">Captain</span>` : `<span class="team-role-badge member">Member</span>`}
              ${isYou ? `<span class="team-role-badge you">You</span>` : ""}
            </div>
            <div class="team-member-meta-line">
              <span>@${escapeHtml(mRid)}</span>
              ${m.gender ? `<span>&bull; ${escapeHtml(m.gender)}</span>` : ""}
              ${m.program ? `<span>&bull; ${escapeHtml(m.program)}</span>` : ""}
              ${m.semester_year ? `<span>(Sem ${escapeHtml(m.semester_year)})</span>` : ""}
            </div>
          </div>
          <div class="team-member-actions">
            ${m.email ? `
              <a href="mailto:${escapeHtml(m.email)}" class="team-mail-icon-btn" title="Email ${escapeAttr(cleanName)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </a>
            ` : ''}
            ${isLeader && !isTeamLeader ? `
              <button onclick="confirmRemoveMember('${team.id}', '${escapeAttr(mRid)}', '${escapeAttr(cleanName)}')" class="btn-paper-danger" style="padding:4px 8px; font-size:0.75rem;" title="Remove Teammate">
                Remove
              </button>
            ` : ''}
            ${isYou && !isTeamLeader ? `
              <button onclick="confirmLeaveTeam('${team.id}')" class="btn-paper-danger" style="padding:4px 8px; font-size:0.75rem;" title="Leave this squad">
                Leave
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      const seatNum = i + 1;
      rosterRowsHtml += `
        <div class="team-roster-item is-empty-seat">
          <span class="team-seat-index">${seatIndexStr}</span>
          <div class="team-slot-empty-ring">+</div>
          <div class="team-member-details">
            <div class="team-member-top-row">
              <span class="team-member-name" style="color:#475569;">Seat 0${seatNum} &bull; Open Slot</span>
            </div>
            <div class="team-member-meta-line">
              <span>Available for student join requests</span>
            </div>
          </div>
          <div class="team-member-actions">
            ${isLeader ? `
              <button onclick="openSlotStudentSearchModalForTeam('${team.id}', ${seatNum})" class="btn-paper-assign" style="font-size:0.75rem; padding:5px 12px;">
                + Add Teammate
              </button>
            ` : `
              <span class="team-slot-open-badge">Open</span>
            `}
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <div class="team-page-wrapper">
      <!-- ================= DESKTOP TOP NAVBAR ================= -->
      <header class="team-top-navbar">
        <div class="team-top-navbar-inner">
          <a href="/" onclick="event.preventDefault(); closeTeamDetailModal();" class="team-brand-lockup">
            <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="team-crest-img">
            <div class="team-brand-text">
              <span class="team-brand-name">JnuMate<span class="team-brand-dot">.</span></span>
              <span class="team-brand-sub">JAIPUR NATIONAL UNIVERSITY</span>
            </div>
          </a>

          <nav class="team-nav-links">
            <a href="/" onclick="event.preventDefault(); closeTeamDetailModal();" class="team-nav-item">Home</a>
            <a href="javascript:void(0)" class="team-nav-item active">Events</a>
            <a href="javascript:void(0)" onclick="showToast('Resources section available on home dashboard', 'info')" class="team-nav-item">Resources</a>
          </nav>

          <div class="team-nav-right">
            <button onclick="toggleNotificationsPanel()" class="team-notif-btn" aria-label="Notifications" title="Notifications">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span id="desktopTopNotifBadge" class="notif-badge" style="display:none;">0</span>
            </button>

            ${currentUser ? `
              <div class="team-user-dropdown-wrap">
                <button type="button" onclick="toggleTeamUserDropdown(event)" class="team-user-pill" id="teamUserDropdownBtn" aria-expanded="false" aria-label="User menu">
                  <img src="${escapeHtml(navAvatar)}" alt="${escapeHtml(navUserName)}" class="team-user-avatar" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
                  <span class="team-user-name">${escapeHtml(navUserName.toUpperCase())}</span>
                  <svg class="team-user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="team-user-dropdown-menu" id="teamUserDropdownMenu" style="display:none;">
                  <div class="team-user-dropdown-header">
                    <span class="team-user-dropdown-name">${escapeHtml(navUserName)}</span>
                    <span class="team-user-dropdown-rid">@${escapeHtml(currentUser.id || '')}</span>
                  </div>
                  <div class="team-user-dropdown-divider"></div>
                  <a href="/profile" onclick="closeTeamDetailModal(false); navigateTo('/profile');" class="team-user-dropdown-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>My Profile</span>
                  </a>
                  <a href="javascript:void(0)" onclick="closeTeamDetailModal(false); navigateTo('/directory');" class="team-user-dropdown-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Student Directory</span>
                  </a>
                  <div class="team-user-dropdown-divider"></div>
                  <button type="button" onclick="handleLogout()" class="team-user-dropdown-item danger">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ` : `
              <a href="/login" class="btn-agro-yellow-pill" style="padding:7px 18px; font-size:0.85rem;">Sign In</a>
            `}
          </div>
        </div>
      </header>

      <!-- ================= DEDICATED MOBILE TOP BAR (< 768px) ================= -->
      <header class="team-mobile-top-bar">
        <div class="team-mobile-top-inner">
          <a href="/" onclick="event.preventDefault(); closeTeamDetailModal();" class="team-brand-lockup">
            <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="team-crest-img" style="height:32px;">
            <div class="team-brand-text">
              <span class="team-brand-name" style="font-size:1.15rem;">JnuMate<span class="team-brand-dot">.</span></span>
              <span class="mobile-brand-sub" style="font-size:0.62rem; color:#166534; font-weight:700; letter-spacing:0.04em;">JAIPUR NATIONAL UNIVERSITY</span>
            </div>
          </a>

          <div style="display:flex; align-items:center; gap:10px;">
            <button onclick="toggleNotificationsPanel()" class="team-notif-btn" style="width:34px; height:34px;">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>
            ${currentUser ? `
              <div class="team-user-dropdown-wrap">
                <img src="${escapeHtml(navAvatar)}" alt="Profile" onclick="toggleTeamUserDropdown(event)" class="team-user-avatar" style="width:32px; height:32px; cursor:pointer;" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
                <div class="team-user-dropdown-menu" id="teamUserDropdownMenuMobile" style="display:none; right:0; top:40px; min-width:180px;">
                  <div class="team-user-dropdown-header">
                    <span class="team-user-dropdown-name">${escapeHtml(navUserName)}</span>
                    <span class="team-user-dropdown-rid">@${escapeHtml(currentUser.id || '')}</span>
                  </div>
                  <div class="team-user-dropdown-divider"></div>
                  <a href="/profile" onclick="closeTeamDetailModal(false); navigateTo('/profile');" class="team-user-dropdown-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>My Profile</span>
                  </a>
                  <a href="javascript:void(0)" onclick="closeTeamDetailModal(false); navigateTo('/directory');" class="team-user-dropdown-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>Student Directory</span>
                  </a>
                  <div class="team-user-dropdown-divider"></div>
                  <button type="button" onclick="handleLogout()" class="team-user-dropdown-item danger">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ` : `
              <a href="/login" class="btn-agro-yellow-pill" style="padding:5px 12px; font-size:0.75rem;">Sign In</a>
            `}
          </div>
        </div>
        <div class="team-mobile-subnav">
          <a href="/" onclick="event.preventDefault(); closeTeamDetailModal();" class="team-nav-item">Home</a>
          <a href="javascript:void(0)" class="team-nav-item active">Events</a>
          <a href="javascript:void(0)" onclick="showToast('Resources section available on home dashboard', 'info')" class="team-nav-item">Resources</a>
        </div>
      </header>

      <!-- ================= MAIN CONTENT AREA ================= -->
      <main class="team-content-container">
        
        <!-- Breadcrumb & Status Row -->
        <div class="team-breadcrumb-row">
          <button onclick="closeTeamDetailModal()" class="team-back-btn" aria-label="Back to Squads">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Squads</span>
          </button>

          <div class="team-status-pill ${isFull ? 'full' : 'open'}">
            <span class="team-status-dot"></span>
            <span>${isFull ? 'Squad Roster Full' : 'Open for Join Requests'}</span>
          </div>
        </div>

        <!-- Squad Hero Card -->
        <div class="team-hero-card">
          <div class="team-hero-icon-col">
            <div class="team-hero-icon-box">
              <img src="${trackLogoSrc}" alt="${escapeHtml(team.name)}" class="team-hero-icon-img">
            </div>
          </div>

          <div class="team-hero-info">
            <div class="team-hero-title-wrap">
              <h1 class="team-hero-title">${escapeHtml(team.name)}</h1>
              <div class="team-hero-subtitle">${trackSubtitle}</div>
            </div>

            <div class="team-hero-desc">
              ${escapeHtml(team.description || 'A university-wide challenge to learn, compete, collaborate and grow together.')}
            </div>

            <div class="team-hero-meta-row">
              <div class="team-hero-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>15–17 Feb, 2026</span>
              </div>
              <div class="team-hero-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>JNU Campus</span>
              </div>
              <div class="team-hero-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <span>${count} / 6 Members</span>
              </div>
              <div class="team-hero-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                <span>${isFull ? 'Full Squad' : `${openSlots} Open ${openSlots === 1 ? 'Slot' : 'Slots'}`}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs Row -->
        <div class="team-tabs-bar">
          <button class="team-tab-btn ${activeTab === 'team' ? 'active' : ''}" data-tab="team" onclick="switchTeamTab('team', '${team.id}')">Team</button>
          <button class="team-tab-btn ${activeTab === 'about' ? 'active' : ''}" data-tab="about" onclick="switchTeamTab('about', '${team.id}')">About</button>
          <button class="team-tab-btn ${activeTab === 'discussion' ? 'active' : ''}" data-tab="discussion" onclick="switchTeamTab('discussion', '${team.id}')">Discussion</button>
        </div>

        <!-- ================= TAB PANE 1: TEAM ================= -->
        <div id="pane-team" class="team-tab-pane ${activeTab === 'team' ? 'active' : ''}">
          <div class="team-two-col-grid">
            
            <!-- Left Column: Team Roster -->
            <div class="team-roster-card">
              <div class="team-roster-card-header">
                <h2 class="team-roster-title">Team Roster (6 Seats)</h2>
                <span class="team-roster-seats-sub">${count} of 6 seats filled</span>
              </div>
              <div class="team-roster-list">
                ${rosterRowsHtml}
              </div>
            </div>

            <!-- Right Column: Sidebar Cards -->
            <div class="team-sidebar-stack">
              
              <!-- Card 1: Request to Join or Status / Leader requests -->
              ${hasPendingRequest ? `
                <div class="team-side-card" style="border: 1.5px solid #16A34A; background: #F0FDF4;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #16A34A; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">✓</div>
                    <div>
                      <div style="font-weight: 800; font-size: 0.95rem; color: #166534;">Join Request Sent</div>
                      <div style="font-size: 0.8125rem; color: #15803D; margin-top: 2px;">The squad leader has been notified. You'll receive a notification upon review.</div>
                    </div>
                  </div>
                </div>
              ` : (isLeader ? `
                <div class="team-side-card">
                  <div class="team-side-card-title-row" style="justify-content: space-between;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                      <h3 class="team-side-card-title">Join Requests</h3>
                    </div>
                    <span id="pendingReqCountBadge" style="font-size:0.75rem; font-weight:700; color:#166534; background:#DCFCE7; padding:2px 8px; border-radius:9999px;">0 Pending</span>
                  </div>
                  <div id="pendingRequestsContainer" style="margin-top:12px;">
                    ${renderIosSpinner('sm')}
                  </div>
                  <div style="margin-top:16px; padding-top:14px; border-top:1px solid #F1F5F9; display:flex; gap:8px;">
                    <button onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="btn-paper-outline" style="flex:1; justify-content:center; font-size:0.78rem;">Edit Squad</button>
                    <button onclick="confirmDisbandTeam('${team.id}')" class="btn-paper-danger" style="font-size:0.78rem;">Disband</button>
                  </div>
                </div>
              ` : (isMember ? `
                <div class="team-side-card" style="background: #F8FAFC;">
                  <div class="team-side-card-title-row">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h3 class="team-side-card-title">Squad Member</h3>
                  </div>
                  <p class="team-side-card-sub" style="margin-bottom:12px;">You are an active teammate in <strong>${escapeHtml(team.name)}</strong>. Head to the Discussion tab to coordinate strategy with your squad!</p>
                  <div style="display:flex; gap:8px;">
                    <button onclick="switchTeamTab('discussion', '${team.id}')" class="btn-team-send-req" style="flex:1; padding:9px 14px; font-size:0.84rem;">Go to Discussion</button>
                    <button onclick="confirmLeaveTeam('${team.id}')" class="btn-paper-danger" style="font-size:0.78rem;">Leave</button>
                  </div>
                </div>
              ` : (isFull ? `
                <div class="team-side-card" style="background: #FEF2F2; border-color: #FECACA;">
                  <div class="team-side-card-title-row">
                    <h3 class="team-side-card-title" style="color: #DC2626;">Squad Roster Full</h3>
                  </div>
                  <p class="team-side-card-sub" style="color: #991B1B; margin-bottom: 0;">All 6 seats in this squad have been confirmed. Explore other squads on the Discover page!</p>
                </div>
              ` : `
                <div class="team-side-card" id="joinRequestCardBox">
                  <div class="team-side-card-title-row">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                    <h3 class="team-side-card-title">Request to Join Squad</h3>
                  </div>
                  <p class="team-side-card-sub">Write down your skills or achievements or anything special (optional)</p>
                  <div class="team-textarea-wrapper">
                    <textarea id="joinMessageInput" rows="3" maxlength="300" placeholder="e.g. CTF experience, tools you know, areas of interest..." class="team-join-textarea" oninput="handleJoinMessageInput(this)"></textarea>
                    <span id="joinMessageCounter" class="team-textarea-counter">0/300</span>
                  </div>
                  <button id="btnSendJoinRequest" onclick="submitJoinRequest('${team.id}')" class="btn-team-send-req">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    <span>Send Join Request</span>
                  </button>
                </div>
              `)))}

              <!-- Card 2: Sign in with College R-ID (shown if not logged in) -->
              ${!currentUser ? `
                <div class="team-side-card team-signin-alert-card">
                  <svg class="team-shield-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
                  </svg>
                  <div class="team-signin-alert-content">
                    <h4>Sign in with your College R-ID</h4>
                    <p>Only verified JNU students can join squads.</p>
                    <a href="/login" class="team-signin-apply-link">
                      <span>Sign In to Apply</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </a>
                  </div>
                </div>
              ` : ''}

              <!-- Card 3: Readiness Checklist -->
              <div class="team-side-card">
                <div class="team-side-card-title-row">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                  <h3 class="team-side-card-title">Readiness Checklist</h3>
                </div>
                <div class="team-checklist-stack" style="margin-top:14px;">
                  <div class="team-checklist-row">
                    <div class="team-checklist-left">
                      <div class="team-check-status-circle ${count >= 2 ? 'done' : 'pending'}">${count >= 2 ? '✓' : '●'}</div>
                      <div class="team-check-info">
                        <span class="team-check-label">Roster Minimums</span>
                        <span class="team-check-sub">${count >= 6 ? 'Full squad (6/6)' : `${count}/6 confirmed members`}</span>
                      </div>
                    </div>
                  </div>

                  ${isSih ? `
                    <div class="team-checklist-row">
                      <div class="team-checklist-left">
                        <div class="team-check-status-circle ${hasFemale ? 'done' : 'pending'}">${hasFemale ? '✓' : '!'}</div>
                        <div class="team-check-info">
                          <span class="team-check-label">Gender Diversity</span>
                          <span class="team-check-sub">${hasFemale ? 'At least 1 female teammate confirmed' : 'Required: 1 female teammate'}</span>
                        </div>
                      </div>
                    </div>
                  ` : ''}

                  <div class="team-checklist-row">
                    <div class="team-checklist-left">
                      <div class="team-check-status-circle ${team.whatsapp_link ? 'done' : 'pending'}">${team.whatsapp_link ? '✓' : '●'}</div>
                      <div class="team-check-info">
                        <span class="team-check-label">Team Group Chat</span>
                        <span class="team-check-sub">${team.whatsapp_link ? 'WhatsApp group linked' : 'Link not added yet'}</span>
                      </div>
                    </div>
                    ${isLeader ? `
                      <button onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="team-checklist-btn">${team.whatsapp_link ? 'Edit Link' : 'Add Link'}</button>
                    ` : (team.whatsapp_link ? `
                      <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="team-checklist-btn" style="text-decoration:none;">Join Chat</a>
                    ` : '')}
                  </div>

                  <div class="team-checklist-row">
                    <div class="team-checklist-left">
                      <div class="team-check-status-circle done">✓</div>
                      <div class="team-check-info">
                        <span class="team-check-label">Campus Verification</span>
                        <span class="team-check-sub">All teammates verified via JNU R-ID</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- ================= TAB PANE 2: ABOUT ================= -->
        <div id="pane-about" class="team-tab-pane ${activeTab === 'about' ? 'active' : ''}">
          <div class="team-about-grid">
            <div class="team-about-card">
              <h3 style="font-size:1.2rem; font-weight:700; color:#0F172A; margin:0 0 12px 0;">About ${escapeHtml(team.name)}</h3>
              <p style="font-size:0.95rem; color:#334155; line-height:1.6; margin-bottom:24px;">${escapeHtml(team.description || 'Looking for teammates for the upcoming university hackathon.')}</p>

              <h4 style="font-size:1rem; font-weight:700; color:#0F172A; margin:0 0 10px 0;">Hackathon Track Details</h4>
              <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:16px; margin-bottom:24px;">
                <div style="font-weight:700; color:#166534; margin-bottom:4px;">${isSih ? 'Smart India Hackathon 2026' : 'Capture The Flag (CTF) Cyber Challenge 2026'}</div>
                <div style="font-size:0.875rem; color:#475569; line-height:1.5;">${isSih ? 'A national challenge focused on innovative software solutions to real-world societal problems.' : 'A university-wide cybersecurity defense & exploitation challenge to learn and compete in team-based CTF rounds.'}</div>
              </div>

              <h4 style="font-size:1rem; font-weight:700; color:#0F172A; margin:0 0 10px 0;">Squad Guidelines & Rules</h4>
              <ul style="font-size:0.875rem; color:#475569; line-height:1.6; padding-left:20px; margin:0 0 20px 0;">
                <li>All squad members must be officially enrolled students of Jaipur National University.</li>
                <li>Each student can only belong to one confirmed squad per competition track.</li>
                ${isSih ? '<li>SIH regulations require at least 1 female teammate in the 6-member squad roster.</li>' : ''}
                <li>Official announcements and live match coordination happen in the Squad Discussion & WhatsApp group.</li>
              </ul>
            </div>

            <div style="display:flex; flex-direction:column; gap:20px;">
              <div class="team-about-card">
                <h3 style="font-size:1.05rem; font-weight:700; color:#0F172A; margin:0 0 14px 0;">Squad Leadership</h3>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                  <img src="${escapeHtml(leaderAvatar)}" alt="Captain" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:1.5px solid #16A34A;" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
                  <div>
                    <div style="font-weight:750; font-size:0.95rem; color:#0F172A;">${escapeHtml(leaderCleanName)}</div>
                    <div style="font-size:0.78rem; color:#166534; font-weight:600;">Team Captain &bull; @${escapeHtml(team.leader_r_id || '')}</div>
                  </div>
                </div>
                ${leaderMember.email ? `
                  <div style="font-size:0.8125rem; color:#64748B; margin-top:8px;">
                    Email: <a href="mailto:${escapeHtml(leaderMember.email)}" style="color:#166534; font-weight:600;">${escapeHtml(leaderMember.email)}</a>
                  </div>
                ` : ''}
              </div>

              ${team.whatsapp_link ? `
                <div class="team-about-card" style="background: linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%); border-color: #A7F3D0;">
                  <h3 style="font-size:1.05rem; font-weight:700; color:#065F46; margin:0 0 8px 0;">Official Group Chat</h3>
                  <p style="font-size:0.8125rem; color:#047857; margin-bottom:14px;">Connect with the squad on WhatsApp for quick audio calls and real-time coordination.</p>
                  <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="btn-paper-wa" style="width:100%; box-sizing:border-box; justify-content:center; padding:10px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/></svg>
                    <span>Open WhatsApp Group</span>
                  </a>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- ================= TAB PANE 3: DISCUSSION (LIVE CHAT REDESIGN) ================= -->
        <div id="pane-discussion" class="team-tab-pane ${activeTab === 'discussion' ? 'active' : ''}">
          <div class="team-discussion-container">
            <div class="team-discussion-header">
              <div>
                <div class="team-discussion-title-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <h3 class="team-discussion-title">Squad Live Discussion</h3>
                  <span class="team-live-pill"><span class="team-live-dot"></span> Live</span>
                </div>
                <div style="font-size:0.8125rem; color:#64748B; margin-top:3px;">Real-time communication for verified squad members & captain</div>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                ${team.whatsapp_link ? `
                  <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="btn-paper-wa" style="padding:6px 12px; font-size:0.78rem;">
                    <span>WhatsApp Group</span>
                  </a>
                ` : ''}
              </div>
            </div>

            <!-- Live Messages Stream or Locked State -->
            ${(isLeader || isMember) ? `
              <div id="teamChatMessagesList" class="team-discussion-stream">
                <div style="padding:60px 0; text-align:center;">${renderIosSpinner('sm', 'Loading squad discussion...')}</div>
              </div>

              <!-- Message Composer -->
              <form id="teamChatForm" onsubmit="handleSendTeamChatMessage(event, '${team.id}')" class="team-discussion-composer">
                <input type="text" id="teamChatInput" placeholder="Message your squad... (Press Enter to send)" maxlength="1000" autocomplete="off" class="team-discussion-input">
                <button type="submit" id="teamChatSendBtn" class="team-discussion-send-btn" aria-label="Send message" title="Send message">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            ` : `
              <div class="team-discussion-locked-card">
                <div class="team-discussion-locked-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <h4 style="font-size:1.1rem; font-weight:800; color:#0F172A; margin:0 0 6px 0;">Private Squad Discussion</h4>
                <p style="font-size:0.875rem; color:#64748B; max-width:420px; line-height:1.5; margin:0 0 16px 0;">This live discussion stream is encrypted and reserved exclusively for confirmed teammates and the squad captain.</p>
                <button onclick="switchTeamTab('team', '${team.id}')" class="btn-agro-yellow-pill" style="padding:9px 20px; font-size:0.85rem;">View Team Roster & Apply</button>
              </div>
            `}
          </div>
        </div>

      </main>

      <!-- ================= FOOTER ================= -->
      <footer class="team-page-footer">
        <div class="team-footer-left">
          <img src="/static/img/redesign/campus_sketch.png" alt="JNU Campus" class="team-footer-campus-img">
          <div class="team-footer-quote-box">
            <div class="team-footer-quote">“Better ideas, better tomorrows together.”</div>
            <div class="team-footer-jnu">— JNU</div>
          </div>
        </div>
        <div class="team-footer-right">
          <span>&copy; 2026 JnuMate</span>
          <span>&bull;</span>
          <a href="javascript:void(0)" class="team-footer-link">Privacy</a>
          <span>&bull;</span>
          <a href="javascript:void(0)" class="team-footer-link">Help</a>
          <span>&bull;</span>
          <a href="mailto:inbox.afrozalam@gmail.com" class="team-footer-link">Contact</a>
        </div>
      </footer>

      <!-- ================= MOBILE STICKY ACTION BAR ================= -->
      <div class="team-mobile-sticky-action" style="${activeTab === 'team' ? '' : 'display:none !important;'}">
        ${(!isMember && !isLeader && !isFull && !hasPendingRequest) ? `
          <button onclick="handleMobileJoinRequestClick('${team.id}')" class="btn-mobile-req-join">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            <span>Request to Join Squad</span>
          </button>
        ` : (hasPendingRequest ? `
          <button disabled class="btn-mobile-req-join" style="background:#16A34A; opacity:0.9;">
            <span>✓ Join Request Sent</span>
          </button>
        ` : (isMember ? `
          <button onclick="switchTeamTab('discussion', '${team.id}')" class="btn-mobile-req-join">
            <span>Open Squad Discussion</span>
          </button>
        ` : (isLeader ? `
          <button onclick="switchTeamTab('team', '${team.id}')" class="btn-mobile-req-join">
            <span>Manage Squad (Leader)</span>
          </button>
        ` : '')))}
      </div>

    </div>
  `;

  if (isLeader || isMember) {
    startTeamChatPolling(team.id);
  } else {
    stopTeamChatPolling();
  }
}

/* ==========================================================================
   TEAM LIVE SQUAD CHAT IMPLEMENTATION (LIGHTWEIGHT REST POLLING)
   ========================================================================== */
let teamChatPollInterval = null;
let currentChatTeamId = null;

function linkifyChatMessage(text) {
  if (!text) return "";
  const escaped = escapeHtml(text);
  const urlRegex = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
  return escaped.replace(urlRegex, function(match) {
    let url = match;
    if (url.toLowerCase().startsWith('www.')) {
      url = 'https://' + url;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-text-link">${match}</a>`;
  });
}

function startTeamChatPolling(teamId) {
  currentChatTeamId = teamId;
  stopTeamChatPolling();
  loadTeamChatMessages(teamId, true);
  teamChatPollInterval = setInterval(() => {
    const modal = document.getElementById("teamDetailModal");
    if (modal && modal.style.display !== "none" && currentChatTeamId === teamId) {
      loadTeamChatMessages(teamId, false);
    } else {
      stopTeamChatPolling();
    }
  }, 4000);
}

function stopTeamChatPolling() {
  if (teamChatPollInterval) {
    clearInterval(teamChatPollInterval);
    teamChatPollInterval = null;
  }
}

window.__lastRenderedChatSignatures = window.__lastRenderedChatSignatures || {};

function loadTeamChatMessages(teamId, isInitial) {
  const container = document.getElementById("teamChatMessagesList");
  if (!container) return;

  if (isInitial && !container.querySelector(".team-chat-msg-row")) {
    container.innerHTML = `<div style="padding:40px 0; text-align:center;">${renderIosSpinner('sm', 'Loading squad messages...')}</div>`;
  }

  const currentRid = currentUser ? currentUser.id : "";
  fetch(`/api/teams/${teamId}/messages?r_id=${encodeURIComponent(currentRid)}`)
    .then(res => {
      if (!res.ok) throw new Error("Unauthorized or fetch failed");
      return res.json();
    })
    .then(data => {
      if (!data.success) {
        if (isInitial) {
          container.innerHTML = `<div class="team-chat-error-hint">${escapeHtml(data.message || "Discussion is restricted to active squad members.")}</div>`;
        }
        return;
      }
      const msgs = data.messages || [];

      // Create unique signature to prevent unnecessary DOM wipes & flickering
      const newSignature = msgs.map(m => `${m.id}_${m.is_active_member}`).join(",");
      if (!isInitial && window.__lastRenderedChatSignatures[teamId] === newSignature) {
        return; // Zero DOM churn when chat hasn't changed
      }
      window.__lastRenderedChatSignatures[teamId] = newSignature;

      if (msgs.length === 0) {
        container.innerHTML = `<div class="team-chat-empty-hint">No messages yet. Say hello to your squad!</div>`;
        return;
      }

      const isScrolledToBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 60;

      let chatRowsHtml = `<div class="team-chat-day-divider"><span>Today</span></div>`;
      chatRowsHtml += msgs.map(m => {
        const isYou = Boolean(currentRid && m.sender_r_id && (m.sender_r_id.toUpperCase() === currentRid.toUpperCase()));
        const cleanSender = (m.sender_name || m.sender_r_id || "Teammate").replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim();
        const av = getStudentAvatarSrc(m.sender_avatar, m.sender_r_id, cleanSender);
        const timeStr = m.created_at ? m.created_at.split(" ")[1] || m.created_at : "";
        const isFormer = m.is_active_member === false;

        return `
          <div class="team-chat-bubble-row team-chat-msg-row ${isYou ? 'you' : 'them'} ${isFormer ? 'former-member' : ''}">
            ${!isYou ? `<img src="${escapeHtml(av)}" alt="${escapeHtml(cleanSender)}" class="team-chat-bubble-avatar team-chat-avatar" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">` : ""}
            <div class="team-chat-bubble-card team-chat-msg-bubble ${isYou ? 'you' : 'them'}">
              ${!isYou ? `<div class="team-chat-bubble-sender team-chat-sender-name">${escapeHtml(cleanSender)}</div>` : ""}
              <div class="team-chat-text">${linkifyChatMessage(m.message)}</div>
              ${timeStr ? `<div class="team-chat-bubble-time team-chat-timestamp">${escapeHtml(timeStr.substring(0, 5))}</div>` : ""}
            </div>
          </div>
        `;
      }).join("");

      container.innerHTML = chatRowsHtml;

      if (isInitial || isScrolledToBottom) {
        container.scrollTop = container.scrollHeight;
      }
    })
    .catch(() => {
      if (isInitial && container) {
        container.innerHTML = `<div class="team-chat-error-hint">Discussion is restricted to active squad members.</div>`;
      }
    });
}

function handleSendTeamChatMessage(e, teamId) {
  if (e) e.preventDefault();
  const input = document.getElementById("teamChatInput");
  const sendBtn = document.getElementById("teamChatSendBtn");
  const container = document.getElementById("teamChatMessagesList");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const currentRid = currentUser ? currentUser.id : "";

  // Clear input immediately for 0ms lag feel
  input.value = "";
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = `<span class="inline-btn-spinner" style="width:14px; height:14px; border-top-color:#16A34A; border-right-color:#16A34A;"></span>`;
  }

  // Optimistic UI render
  if (container) {
    const emptyHint = container.querySelector(".team-chat-empty-hint");
    if (emptyHint) emptyHint.remove();

    const tempDiv = document.createElement("div");
    tempDiv.className = "team-chat-bubble-row team-chat-msg-row you";
    const nowTime = new Date().toTimeString().substring(0, 5);
    tempDiv.innerHTML = `
      <div class="team-chat-bubble-card team-chat-msg-bubble you">
        <div class="team-chat-text">${linkifyChatMessage(text)}</div>
        <div class="team-chat-bubble-time team-chat-timestamp">${nowTime}</div>
      </div>
    `;
    container.appendChild(tempDiv);
    container.scrollTop = container.scrollHeight;
  }

  fetch(`/api/teams/${teamId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      r_id: currentRid,
      message: text
    })
  })
    .then(res => res.json())
    .then(data => {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        `;
      }
      if (!data.success) {
        showToast(data.message || "Failed to send message", "error");
      } else {
        // Trigger background refresh to sync IDs
        loadTeamChatMessages(teamId, false);
      }
    })
    .catch(() => {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        `;
      }
      showToast("Network error sending message", "error");
    });
}

window.currentTeamRequests = [];

function loadTeamJoinRequests(teamId) {
  const container = document.getElementById("pendingRequestsContainer");
  const badge = document.getElementById("pendingReqCountBadge");
  if (!container) return;

  container.innerHTML = `<div style="padding:20px 0; text-align:center;">${renderIosSpinner('sm')}</div>`;

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
        const reqId = req.request_id || req.id;
        const applicantName = (req.name || req.student_name || req.r_id || "Student") + "";
        const cleanName = applicantName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
        return `
          <div class="clean-request-row" id="req-row-${escapeAttr(reqId)}" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; margin-bottom:12px; transition:all 0.3s ease;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer;" onclick="openStudentDetailModalByIndex(${idx})" title="Click to view student profile">
              <img src="${escapeHtml(getStudentAvatarSrc(req.avatar_url, req.r_id, applicantName))}" alt="${escapeHtml(cleanName)}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1.5px solid #16a34a; flex-shrink:0;" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
              <div style="min-width:0; flex:1;">
                <div style="font-weight:750; font-size:0.875rem; color:#0f172a; display:flex; align-items:center; gap:6px;">
                  <span>${escapeHtml(cleanName)}</span>
                  <span style="font-size:0.6875rem; color:#166534; background:#dcfce7; padding:1px 6px; border-radius:4px; font-weight:700;">View Profile</span>
                </div>
                <div style="font-size:0.75rem; color:#64748b;">@${escapeHtml(req.r_id)} ${req.gender ? `• ${escapeHtml(req.gender)}` : ''}</div>
              </div>
            </div>

            ${req.message ? `
              <div style="font-size:0.8125rem; color:#334155; background:#f1f5f9; padding:8px 12px; border-radius:8px; margin-bottom:10px; line-height:1.4; border-left:3px solid #16a34a;">
                "${escapeHtml(req.message)}"
              </div>
            ` : ""}

            <div style="display:flex; gap:8px; justify-content:flex-end;">
              <button id="btn-decline-${escapeAttr(reqId)}" onclick="handleJoinRequestAction('${teamId}', '${escapeAttr(reqId)}', 'reject')" style="font-size:0.75rem; padding:5px 12px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; color:#475569; font-weight:600; cursor:pointer;">
                Decline
              </button>
              <button id="btn-accept-${escapeAttr(reqId)}" onclick="handleJoinRequestAction('${teamId}', '${escapeAttr(reqId)}', 'accept')" style="font-size:0.75rem; padding:5px 14px; border-radius:8px; border:none; background:#16a34a; color:#ffffff; font-weight:750; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
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
  const acceptBtn = document.getElementById(`btn-accept-${reqId}`);
  const declineBtn = document.getElementById(`btn-decline-${reqId}`);
  const activeBtn = action === 'accept' ? acceptBtn : declineBtn;
  const row = document.getElementById(`req-row-${reqId}`);

  if (activeBtn) {
    activeBtn.disabled = true;
    if (declineBtn && declineBtn !== activeBtn) declineBtn.disabled = true;
    activeBtn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px;">${renderIosSpinner('sm')} <span>${action === 'accept' ? 'Accepting...' : 'Declining...'}</span></span>`;
  }

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
        showToast(action === 'accept' ? "Teammate accepted!" : "Request declined", "success");
        if (row) {
          row.style.transition = "opacity 0.25s ease, transform 0.25s ease";
          row.style.opacity = "0";
          row.style.transform = "translateX(20px)";
          setTimeout(() => {
            row.remove();
            const container = document.getElementById("pendingRequestsContainer");
            const badge = document.getElementById("pendingReqCountBadge");
            const remaining = container ? container.querySelectorAll(".clean-request-row").length : 0;
            if (badge) badge.innerText = `${remaining} Pending`;
            if (remaining === 0 && container) {
              container.innerHTML = `<p style="font-size:0.8125rem; color:#64748b; text-align:center; padding:16px 0;">No pending join requests.</p>`;
            }
          }, 250);
        }
        delete clientCache.teamsMap[teamId];
        clientCache.teamsList = null;
        fetch(`/api/teams/${teamId}`)
          .then(r => r.json())
          .then(d => {
            if (d.team) {
              clientCache.teamsMap[teamId] = d.team;
              renderFullTeamDetail(d.team);
              loadTeamJoinRequests(teamId);
            }
          })
          .catch(() => {});
        loadNotifications();
      } else {
        if (activeBtn) {
          activeBtn.disabled = false;
          if (declineBtn && declineBtn !== activeBtn) declineBtn.disabled = false;
          activeBtn.innerHTML = action === 'accept' ? 'Accept' : 'Decline';
        }
        showToast(data.message || "Action failed", "error");
      }
    })
    .catch(() => {
      if (activeBtn) {
        activeBtn.disabled = false;
        if (declineBtn && declineBtn !== activeBtn) declineBtn.disabled = false;
        activeBtn.innerHTML = action === 'accept' ? 'Accept' : 'Decline';
      }
      showToast("Network error processing request", "error");
    });
}

function submitJoinRequest(teamId) {
  const msgInput = document.getElementById("joinMessageInput");
  const btn = document.getElementById("btnSendJoinRequest");
  const msg = msgInput ? msgInput.value.trim() : "";

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;"><span class="inline-btn-spinner"></span> <span>Sending Join Request...</span></span>`;
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
          navigateTo("/");
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
          <div class="create-team-page-shell" style="max-width:600px; margin:40px auto; padding:0 16px;">
            <div style="background:#FFFFFF; border:1.5px solid #FCA5A5; border-radius:20px; padding:36px 28px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.05);">
              <div style="width:52px; height:52px; border-radius:50%; background:#FEE2E2; color:#EF4444; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto; font-size:1.4rem; font-weight:bold;">
                ✕
              </div>
              <h2 class="font-serif" style="font-size:1.6rem; color:#0A2618; margin-bottom:10px;">Already in a Squad</h2>
              <p style="color:#64748B; font-size:0.95rem; line-height:1.5; margin-bottom:24px;">
                You cannot create a team until you leave team '<strong>${escapeHtml(teamName)}</strong>'. Each student can only be in one team at a time.
              </p>
              <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
                <button onclick="openTeamDetailModal('${t.id}')" class="btn-create-submit" style="padding:10px 22px;">
                  View My Team (${escapeHtml(teamName)}) ➔
                </button>
                <a href="/" onclick="event.preventDefault(); navigateTo('/');" class="btn-create-cancel" style="padding:10px 20px;">
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
    <div class="create-team-page-shell">
      <!-- Sub-Header Bar -->
      <div class="create-team-sub-bar">
        <a href="/" onclick="event.preventDefault(); navigateTo('/');" class="btn-create-back">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span class="desktop-text">Back to Discover</span>
          <span class="mobile-text">Back</span>
        </a>

        <div class="create-team-callout-pill">
          <span class="callout-sparkle">✨</span>
          <span>Create your team and start building something amazing!</span>
        </div>
      </div>

      <div class="create-team-split-grid">
        <!-- Left Column: Form Card -->
        <div class="create-team-form-card">
          <div class="create-eyebrow">6-Seat Team Builder</div>
          <h1 class="create-title">Create New Team</h1>
          <p class="create-subtitle">
            Form your squad, choose a hackathon track, and assign teammates or leave slots open for join requests.
          </p>

          <!-- 1. Hackathon Category -->
          <div style="margin-bottom: 22px;">
            <label class="create-field-label">1. Choose Hackathon Category <span class="req-star">*</span></label>
            <div class="hackathon-cat-grid">
              <!-- SIH Card -->
              <div class="hackathon-cat-card ${selectedHackathonType === 'sih' ? 'selected' : ''}" id="catCardSih" onclick="selectHackathonType('sih')">
                <div class="cat-check-badge" style="${selectedHackathonType === 'sih' ? '' : 'display:none;'}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <img src="/static/img/sih_logo.jpg" alt="Smart India Hackathon" class="cat-icon-img">
                <div class="cat-card-text-col">
                  <div class="cat-card-title">Smart India Hackathon (SIH)</div>
                  <div class="cat-card-sub">Hardware & Software editions</div>
                  <div class="cat-card-tagline">Build innovative solutions for a Viksit Bharat</div>
                </div>
              </div>

              <!-- CTF Card -->
              <div class="hackathon-cat-card ${selectedHackathonType === 'ctf' ? 'selected' : ''}" id="catCardCtf" onclick="selectHackathonType('ctf')">
                <div class="cat-check-badge" style="${selectedHackathonType === 'ctf' ? '' : 'display:none;'}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <img src="/static/img/ctf_logo.jpg" alt="Capture The Flag" class="cat-icon-img">
                <div class="cat-card-text-col">
                  <div class="cat-card-title">Capture The Flag (CTF)</div>
                  <div class="cat-card-sub">Cybersecurity & Defense</div>
                  <div class="cat-card-tagline">Test your skills. Secure the future.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2 & 3: Inputs Row (Team Title & WhatsApp) -->
          <div class="create-inputs-row">
            <!-- 2. Team Title -->
            <div>
              <label class="create-field-label" for="teamNameInput">2. Team Title <span class="req-star">*</span></label>
              <input type="text" id="teamNameInput" maxlength="50" placeholder="e.g. CyberStorm, NeuroVision" class="create-text-input" oninput="updateCreateTeamCharCounts()">
              <div class="char-count-row">
                <span></span>
                <span class="char-count-text" id="teamNameCount">0/50</span>
              </div>
            </div>

            <!-- 3. Official WhatsApp Link -->
            <div>
              <label class="create-field-label" for="teamWhatsappInput">3. Official Team WhatsApp Link</label>
              <div class="whatsapp-input-wrap">
                <div class="whatsapp-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </div>
                <input type="text" id="teamWhatsappInput" maxlength="100" placeholder="https://chat.whatsapp.com/..." class="whatsapp-input-field" oninput="updateCreateTeamCharCounts()">
              </div>
              <div class="char-count-row">
                <span>This link will be used for team communication</span>
                <span class="char-count-text" id="teamWaCount">0/100</span>
              </div>
            </div>
          </div>

          <!-- 4. Project Pitch / Hackathon Idea -->
          <div style="margin-bottom: 22px;">
            <label class="create-field-label" for="teamDescInput">4. Project Pitch / Hackathon Idea <span class="req-star">*</span></label>
            <textarea id="teamDescInput" maxlength="500" rows="4" placeholder="Briefly describe what problem statement you're tackling and what skills you are looking for..." class="create-textarea" oninput="updateCreateTeamCharCounts()"></textarea>
            <div class="char-count-row">
              <span>Be clear and concise. You can always edit this later.</span>
              <span class="char-count-text" id="teamDescCount">0/500</span>
            </div>
          </div>

          <!-- 5. Mobile Only Roster Strip (< 768px) -->
          <div class="mobile-roster-section">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
              <label class="create-field-label" style="margin-bottom:0;">5. Team Roster (6 Seats)</label>
              <span class="assigned-pill-badge" id="createTeamFilledCountMobile">1/6 Assigned</span>
            </div>
            <div class="mobile-roster-strip" id="createTeamMobileStrip"></div>
          </div>

          <!-- Action Buttons -->
          <div class="create-form-actions-row">
            <a href="/" onclick="event.preventDefault(); navigateTo('/');" class="btn-create-cancel">
              Cancel
            </a>
            <button onclick="submitCreateTeam()" id="btnSubmitCreate" class="btn-create-submit">
              <span>Create Team ➔</span>
            </button>
          </div>
        </div>

        <!-- Right Column: Roster Card & Guidelines (Desktop) -->
        <div class="create-team-roster-card">
          <div class="roster-header-row">
            <div>
              <h3 class="roster-title">5. Team Roster (6 Seats)</h3>
              <p class="roster-subtitle">Assign teammates by searching with their R-ID. Empty seats stay open for join requests.</p>
            </div>
            <span class="assigned-pill-badge" id="createTeamFilledCountDesktop">1/6 Assigned</span>
          </div>

          <!-- 3x2 Grid -->
          <div id="createTeamSlotsContainer" class="create-roster-grid"></div>

          <!-- 4-Tip Guidelines Box -->
          <div class="create-guide-box">
            <div class="guide-item">
              <span class="guide-num">01</span>
              <span>Click on any open seat to assign from directory</span>
            </div>
            <div class="guide-item">
              <span class="guide-num">02</span>
              <span>Leave slots unassigned to accept join requests</span>
            </div>
            <div class="guide-item">
              <span class="guide-num">03</span>
              <span>Add WhatsApp link so members connect instantly</span>
            </div>
            <div class="guide-item">
              <span class="guide-num">04</span>
              <span>SIH requires 6 members with at least 1 female participant</span>
            </div>
          </div>

          <!-- Decorative Watermark Banner -->
          <div class="create-watermark-banner">
            <div class="banner-left-wrap">
              <div class="leaf-icon-box">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#10B981">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                </svg>
              </div>
              <div>
                <h4 class="banner-title">Ideas grow together.</h4>
                <div class="banner-sub">Build. Collaborate. Innovate.</div>
              </div>
            </div>
            <img src="/static/img/redesign/otp_dome_mobile.png" alt="University Dome" class="banner-dome-watermark" onerror="this.style.display='none';">
          </div>
        </div>
      </div>
    </div>
  `;

  renderCreateTeamSeats();
}

function renderCreateTeamSeats() {
  const container = document.getElementById("createTeamSlotsContainer");
  const mobileStrip = document.getElementById("createTeamMobileStrip");
  const countBadgeDesktop = document.getElementById("createTeamFilledCountDesktop");
  const countBadgeMobile = document.getElementById("createTeamFilledCountMobile");

  const totalFilled = 1 + selectedFriends.length;
  const countText = `${totalFilled}/6 Assigned`;
  if (countBadgeDesktop) countBadgeDesktop.innerText = countText;
  if (countBadgeMobile) countBadgeMobile.innerText = countText;

  const leaderAvatar = getStudentAvatarSrc((currentUser && currentUser.avatar_url), (currentUser && currentUser.id));
  const leaderName = (currentUser && currentUser.name) || "Leader";
  const leaderFirstName = leaderName.split(" ")[0];
  const leaderAcademicYear = (currentUser && (currentUser.academic_year || getAcademicYearByRid(currentUser.id))) || "Student";

  // 1. Desktop 3x2 Grid HTML
  if (container) {
    let desktopHtml = `
      <!-- Slot 1: Team Leader -->
      <div class="roster-seat-card leader">
        <div class="seat-top-row">
          <span class="seat-top-label">SEAT 1 LEADER (YOU)</span>
          <span class="seat-crown-icon">👑</span>
        </div>
        <img src="${escapeHtml(leaderAvatar)}" alt="${escapeHtml(leaderName)}" class="roster-avatar-img" onerror="this.src=DEFAULT_STUDENT_AVATAR;">
        <div class="seat-student-name">${escapeHtml(leaderName)}</div>
        <div class="seat-student-sub">${escapeHtml(leaderAcademicYear)}</div>
        <span class="seat-leader-pill">Leader</span>
      </div>
    `;

    for (let i = 0; i < 5; i++) {
      if (i < selectedFriends.length) {
        const f = selectedFriends[i];
        const friendAvatar = getStudentAvatarSrc(f.avatar_url, f.id);
        const friendAcademicYear = f.academic_year || getAcademicYearByRid(f.id);
        desktopHtml += `
          <div class="roster-seat-card filled">
            <div class="seat-top-row">
              <span class="seat-top-label" style="color:#64748B;">SEAT ${i + 2} TEAMMATE</span>
              <button onclick="removeFriendFromTeam('${escapeAttr(f.id)}')" class="btn-remove-seat" title="Remove teammate">
                ✕ Remove
              </button>
            </div>
            <img src="${escapeHtml(friendAvatar)}" alt="${escapeHtml(f.name)}" class="roster-avatar-img" onerror="this.src=DEFAULT_STUDENT_AVATAR;">
            <div class="seat-student-name">${escapeHtml(f.name)}</div>
            <div class="seat-student-sub">@${escapeHtml(f.id)} • ${escapeHtml(friendAcademicYear)}</div>
          </div>
        `;
      } else {
        desktopHtml += `
          <div class="roster-seat-card empty" onclick="openSlotStudentSearchModal(${i})" title="Click to assign teammate, or leave open">
            <div class="roster-plus-circle">+</div>
            <div class="seat-empty-title">Seat ${i + 2}<br>Open Slot</div>
            <div class="seat-empty-sub">Click to add teammate, or leave open for join requests</div>
          </div>
        `;
      }
    }
    container.innerHTML = desktopHtml;
  }

  // 2. Mobile 6-Slot Strip HTML
  if (mobileStrip) {
    let mobileHtml = `
      <!-- Mobile Slot 1: Leader -->
      <div class="mobile-roster-slot leader">
        <div class="mobile-slot-num">1</div>
        <div class="mobile-slot-leader-tag">Leader (You)</div>
        <img src="${escapeHtml(leaderAvatar)}" alt="${escapeHtml(leaderName)}" class="mobile-slot-avatar" onerror="this.src=DEFAULT_STUDENT_AVATAR;">
        <div class="mobile-slot-name">${escapeHtml(leaderFirstName)}</div>
      </div>
    `;

    for (let i = 0; i < 5; i++) {
      if (i < selectedFriends.length) {
        const f = selectedFriends[i];
        const friendAvatar = getStudentAvatarSrc(f.avatar_url, f.id);
        const friendFirstName = (f.name || "").split(" ")[0];
        mobileHtml += `
          <div class="mobile-roster-slot filled">
            <button onclick="removeFriendFromTeam('${escapeAttr(f.id)}')" class="mobile-slot-remove" title="Remove">✕</button>
            <div class="mobile-slot-num">${i + 2}</div>
            <img src="${escapeHtml(friendAvatar)}" alt="${escapeHtml(f.name)}" class="mobile-slot-avatar" onerror="this.src=DEFAULT_STUDENT_AVATAR;">
            <div class="mobile-slot-name">${escapeHtml(friendFirstName)}</div>
          </div>
        `;
      } else {
        mobileHtml += `
          <div class="mobile-roster-slot empty" onclick="openSlotStudentSearchModal(${i})" title="Click to assign teammate">
            <div class="mobile-slot-num">${i + 2}</div>
            <div class="mobile-slot-plus">+</div>
          </div>
        `;
      }
    }
    mobileStrip.innerHTML = mobileHtml;
  }
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
  const sihCard = document.getElementById("catCardSih");
  const ctfCard = document.getElementById("catCardCtf");
  if (sihCard) {
    sihCard.classList.toggle("selected", type === "sih");
    const badge = sihCard.querySelector(".cat-check-badge");
    if (badge) badge.style.display = type === "sih" ? "" : "none";
  }
  if (ctfCard) {
    ctfCard.classList.toggle("selected", type === "ctf");
    const badge = ctfCard.querySelector(".cat-check-badge");
    if (badge) badge.style.display = type === "ctf" ? "" : "none";
  }
}

function updateCreateTeamCharCounts() {
  const nameInput = document.getElementById("teamNameInput");
  const nameCount = document.getElementById("teamNameCount");
  if (nameInput && nameCount) {
    nameCount.innerText = `${nameInput.value.length}/50`;
  }

  const waInput = document.getElementById("teamWhatsappInput") || document.getElementById("teamWaInput");
  const waCount = document.getElementById("teamWaCount");
  if (waInput && waCount) {
    waCount.innerText = `${waInput.value.length}/100`;
  }

  const descInput = document.getElementById("teamDescInput");
  const descCount = document.getElementById("teamDescCount");
  if (descInput && descCount) {
    descCount.innerText = `${descInput.value.length}/500`;
  }
}

function submitCreateTeam() {
  const nameInput = document.getElementById("teamNameInput");
  const descInput = document.getElementById("teamDescInput");
  const waInput = document.getElementById("teamWhatsappInput") || document.getElementById("teamWaInput");
  const btn = document.getElementById("btnSubmitCreate");

  const name = nameInput ? nameInput.value.trim() : "";
  const desc = descInput ? descInput.value.trim() : "";
  const wa = waInput ? waInput.value.trim() : "";

  if (!name) {
    showToast("Team title is required", "error");
    if (nameInput) nameInput.focus();
    return;
  }

  if (!desc) {
    showToast("Project pitch is required", "error");
    if (descInput) descInput.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-btn-spinner" style="width:16px; height:16px; border-width:2px; margin-right:8px;"></span><span>Creating Team...</span>`;
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
        btn.innerHTML = `<span>Create Team ➔</span>`;
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
        btn.innerHTML = `<span>Create Team ➔</span>`;
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
  const otpSpotlightContainer = document.getElementById("otpProfileSpotlight");
  const emailNoticeEl = document.getElementById("otpTargetEmailText");
  const oldSpotlightContainer = document.getElementById("authStep2ProfileSpotlight");
  const bannerContainer = document.getElementById("authStep2DispatchBanner");
  if (!student) return;

  const rawAvatar = student.avatar_url || "";
  const avatarSrc = getStudentAvatarSrc(rawAvatar, student.r_id);
  const cleanName = (student.name || student.r_id || "manjari").replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "manjari";
  const displayEmail = targetEmail || student.email || student.jnu_email || (student.r_id ? `${student.r_id.toLowerCase()}@student.edu` : "manjarigulpadiya@gmail.com");
  const academicYear = student.current_year || student.academic_year || getAcademicYearByRid(student.r_id) || "4th Year Student";
  const program = student.program || student.course || "B.Tech CSE (AI & ML) Hons.-Samatrix";
  const gender = student.gender || "Female";
  const rid = student.r_id || student.rid || "R42695";

  const isBlankAvatar = !rawAvatar || rawAvatar.includes("dicebear") || rawAvatar.includes("data:image");
  const effectiveAvatar = isBlankAvatar ? "" : avatarSrc;

  if (emailNoticeEl) {
    emailNoticeEl.innerText = displayEmail;
  }

  if (otpSpotlightContainer) {
    otpSpotlightContainer.innerHTML = `
      <div class="otp-spotlight-box">
        <div class="otp-spotlight-avatar">
          ${effectiveAvatar ? `
            <img src="${escapeHtml(effectiveAvatar)}" 
                 data-raw-src="${escapeHtml(rawAvatar)}" 
                 alt="${escapeHtml(cleanName)}" 
                 class="otp-spotlight-avatar-img"
                 onerror="this.onerror=null; this.src='/static/img/blank_pfp.jpg';">
          ` : `
            <svg viewBox="0 0 80 80" width="100%" height="100%" fill="none">
              <circle cx="40" cy="40" r="40" fill="#CBD5E1"/>
              <circle cx="40" cy="30" r="14" fill="#FFFFFF"/>
              <path d="M16 68 C16 52, 26 48, 40 48 C54 48, 64 52, 64 68 Z" fill="#FFFFFF"/>
            </svg>
          `}
        </div>
        <div class="otp-spotlight-info">
          <div class="otp-student-name">${escapeHtml(cleanName)}</div>
          <div class="otp-student-rid-wrap">
            <span class="otp-student-rid-badge">R-ID: <strong>${escapeHtml(rid)}</strong></span>
          </div>
          <div class="otp-student-program">${escapeHtml(program)}</div>
          <div class="otp-student-meta">${escapeHtml(academicYear)} &bull; ${escapeHtml(gender)}</div>
        </div>
      </div>
    `;
  }

  if (oldSpotlightContainer) {
    oldSpotlightContainer.innerHTML = `
      <div class="auth-spotlight-compact-card">
        <img src="${escapeHtml(effectiveAvatar)}" 
             alt="${escapeHtml(cleanName)}" 
             class="auth-spotlight-compact-avatar"
             onerror="this.src=DEFAULT_STUDENT_AVATAR;">
        <div class="auth-spotlight-compact-meta">
          <div class="auth-spotlight-compact-name">${escapeHtml(cleanName)}</div>
          <div class="auth-spotlight-compact-subline">
            <span class="student-rid-badge" style="font-size:0.6875rem; padding:1px 6px;">@${escapeHtml(student.r_id)}</span>
            ${academicYear ? `<span>• ${escapeHtml(academicYear)}</span>` : ""}
            ${gender ? `<span>• ${escapeHtml(gender)}</span>` : ""}
          </div>
          ${(program && program !== "Student") ? `
            <div class="auth-spotlight-compact-program">${escapeHtml(program)}</div>
          ` : ""}
          <div class="auth-spotlight-compact-email">${escapeHtml(displayEmail)}</div>
        </div>
      </div>
    `;
  }

  if (bannerContainer) {
    bannerContainer.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px; height:15px; flex-shrink:0;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      <span>Verification code sent to <strong>${escapeHtml(displayEmail)}</strong></span>
    `;
  }
}

function setupOtpDigitInputs() {
  const boxes = document.querySelectorAll(".otp-digit-box");
  if (!boxes || boxes.length === 0) return;

  boxes.forEach((box, idx) => {
    box.value = "";
    box.classList.remove("has-val");

    box.oninput = function(e) {
      const val = this.value.replace(/\D/g, "");
      if (val.length > 1) {
        this.value = val.slice(-1);
      } else {
        this.value = val;
      }

      if (this.value) {
        this.classList.add("has-val");
        if (idx < boxes.length - 1) {
          boxes[idx + 1].focus();
        }
      } else {
        this.classList.remove("has-val");
      }

      const code = Array.from(boxes).map(b => b.value.trim()).join("");
      const hiddenInput = document.getElementById("otpCodeInput");
      if (hiddenInput) hiddenInput.value = code;

      if (code.length === 6) {
        verifyEmailOtpCode();
      }
    };

    box.onkeydown = function(e) {
      if (e.key === "Backspace") {
        if (!this.value && idx > 0) {
          boxes[idx - 1].focus();
          boxes[idx - 1].value = "";
          boxes[idx - 1].classList.remove("has-val");
          e.preventDefault();
        } else {
          this.classList.remove("has-val");
        }
      } else if (e.key === "ArrowLeft" && idx > 0) {
        boxes[idx - 1].focus();
      } else if (e.key === "ArrowRight" && idx < boxes.length - 1) {
        boxes[idx + 1].focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        verifyEmailOtpCode();
      }
    };

    box.onpaste = function(e) {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData("text");
      const digits = (pasteData || "").replace(/\D/g, "").slice(0, 6);
      if (!digits) return;

      for (let i = 0; i < boxes.length; i++) {
        if (i < digits.length) {
          boxes[i].value = digits[i];
          boxes[i].classList.add("has-val");
        } else {
          boxes[i].value = "";
          boxes[i].classList.remove("has-val");
        }
      }

      const lastIdx = Math.min(digits.length, boxes.length) - 1;
      if (lastIdx >= 0) boxes[lastIdx].focus();

      const hiddenInput = document.getElementById("otpCodeInput");
      if (hiddenInput) hiddenInput.value = digits;

      if (digits.length === 6) {
        verifyEmailOtpCode();
      }
    };
  });
}

function loadLoginView() {
  const container = document.getElementById("loginViewContainer");
  if (!container) return;

  const curPath = window.location.pathname;
  if (currentUser && !currentUser.needs_program && curPath !== "/course-select" && curPath !== "/select-program" && curPath !== "/enter-details" && curPath !== "/sync-details" && curPath !== "/otp" && curPath !== "/verify-otp") {
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
    <!-- Step 1 Container: Sign In (Desktop 2-Column Split & Mobile Lockup) -->
    <div id="loginStep1Wrap" class="login-step-view-wrap" style="width:100%; min-height:100vh;">
      <div class="login-split-layout">
        <!-- Left Visual Pane (Desktop Only) -->
        <aside class="login-visual-pane">
          <img src="/static/img/redesign/login_campus_facade.png" alt="Learn Grow Belong - Jaipur National University" class="login-visual-img">
        </aside>

        <!-- Right Interactive Form Pane (Desktop & Mobile) -->
        <main class="login-form-pane">
          <div class="login-ambient-curve-top"></div>
          <div class="login-ambient-curve-bottom"></div>

          <!-- Top Bar with "New here? Learn more →" -->
          <header class="login-top-bar">
            <a href="javascript:void(0)" onclick="navigateTo('/about')" class="login-learn-more-link">
              <span>New here?</span>
              <span class="accent-text">Learn more &rarr;</span>
            </a>
          </header>

          <!-- Mobile Brand Lockup (Hidden on Desktop, Visible on Mobile) -->
          <div class="login-mobile-brand-lockup">
            <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="login-mobile-crest" onerror="this.src='/static/img/jnu_logo.jpg';">
            <div class="login-mobile-brand-title">JnuMate<span class="brand-dot">.</span></div>
            <div class="login-mobile-brand-sub">JAIPUR NATIONAL UNIVERSITY</div>
          </div>

          <!-- Center Floating White Sign In Card -->
          <div class="login-center-stage">
            <div class="login-editorial-card" id="loginCardFrame">
              
              <!-- Desktop JNU Crest Logo (Centered on Desktop Card, Hidden on Mobile) -->
              <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="login-card-crest" id="loginCardCrest" onerror="this.src='/static/img/jnu_logo.jpg';">

              <h1 class="login-card-title" id="loginPortalTitle">Student Sign In</h1>
              <p class="login-card-sub" id="loginPortalSubtitle">Enter your College R-ID to continue</p>

              <!-- Step 1: Input R-ID & QR Option -->
              <div id="authStep1" class="auth-step-panel">
                <div class="login-field-group">
                  <label class="login-field-label">COLLEGE R-ID</label>
                  <div class="login-input-wrap">
                    <svg class="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <input type="text" id="authRidInput" placeholder="E.g. R15006" class="login-input-field" autocomplete="username" autofocus onkeyup="if(event.key==='Enter') submitInitialRid()">
                  </div>
                </div>

                <button type="button" onclick="submitInitialRid()" id="btnSendOtp" class="btn-login-submit">
                  <span>Sign In &rarr;</span>
                </button>

                <div class="login-or-divider">
                  <span>or</span>
                </div>

                <div class="login-qr-tile" onclick="openUniversityQrScanner()" title="Scan University ID Card">
                  <div class="login-qr-icon-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </div>
                  <div class="login-qr-text-box">
                    <div class="login-qr-title">Use QR from University ID Card</div>
                    <div class="login-qr-sub">Faster and more secure</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="login-qr-chevron">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>

              <!-- Step 1B: Legacy fallback panel (replaced by loginStepSyncWrap) -->
              <div id="authStepSyncNotice" class="auth-step-panel" style="display:none; text-align:left;">
                <div style="text-align:center; margin-bottom:16px;">
                  <div class="auth-instagram-avatar-box">
                    <img id="legacySyncAvatarImg" src="${INSTAGRAM_EMPTY_AVATAR}" alt="No profile photo" style="width:72px; height:72px; border-radius:50%; border:2px solid #16A34A; box-shadow:0 4px 12px rgba(22,163,74,0.15);">
                  </div>
                  <div style="margin-top:8px;">
                    <span class="student-rid-badge" style="font-size:0.875rem; padding:4px 14px; background:#DCFCE7; color:#166534;">
                      R-ID: <strong id="legacySyncRidBanner"></strong>
                    </span>
                  </div>
                </div>

                <div class="auth-sync-text" style="background:#FEF3C7; border:1px solid #FCD34D; border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:0.8rem; color:#92400E; line-height:1.45; text-align:center;">
                  Due to server load we couldn't fetch your profile automatically. Please enter your details manually.
                </div>

                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                  <div>
                    <label class="login-field-label">Full Name *</label>
                    <input type="text" id="legacySyncNameInput" placeholder="Your full name as per college ID" class="input-forest" style="background:#FFFFFF; color:#0F172A; border:1.5px solid #E2E8F0;">
                  </div>

                  <div>
                    <label class="login-field-label">Course / Degree Program *</label>
                    <select id="legacySyncCourseSelect" class="input-forest" style="background:#FFFFFF; color:#0F172A; border:1.5px solid #E2E8F0;">
                      ${courseOptionsHtml}
                    </select>
                  </div>

                  <div>
                    <label class="login-field-label">Gender *</label>
                    <select id="legacySyncGenderSelect" class="input-forest" style="background:#FFFFFF; color:#0F172A; border:1.5px solid #E2E8F0;">
                      <option value="Male" selected>Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label class="login-field-label">Email *</label>
                    <input type="email" id="legacySyncEmailInput" placeholder="e.g. name@gmail.com" class="input-forest" style="background:#FFFFFF; color:#0F172A; border:1.5px solid #E2E8F0;">
                  </div>
                </div>

                <button onclick="submitSyncDetailsAndSendOtp()" id="legacyBtnSendSyncOtp" class="btn-login-submit" style="width:100%;">
                  <span>Send Verification Code &rarr;</span>
                </button>

                <button onclick="showAuthStep(1)" class="auth-link-btn" style="width:100%; text-align:center; margin-top:10px; display:block;">
                  &larr; Change R-ID
                </button>
              </div>

              <!-- Step 2B: Course Selection Prompt -->
              <div id="authStepCourseSelect" class="auth-step-panel" style="display:none; text-align:left;">
                <div style="text-align:center; margin-bottom:16px;">
                  <div class="auth-student-big-avatar-box" style="margin-bottom:8px;">
                    <img id="courseSelectAvatar" src="${DEFAULT_STUDENT_AVATAR}" alt="Student" class="auth-student-big-avatar" style="width:72px; height:72px; border-radius:50%; border:2px solid #16A34A;">
                  </div>
                  <h2 id="courseSelectStudentName" class="font-serif" style="font-size:1.35rem; color:#0F172A; margin-bottom:4px;"></h2>
                  <span class="student-rid-badge" style="font-size:0.8125rem; padding:3px 12px; background:#DCFCE7; color:#166534;">
                    R-ID: <strong id="courseSelectRid"></strong>
                  </span>
                </div>

                <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:12px 14px; margin-bottom:16px; text-align:center;">
                  <div style="font-weight:700; color:#166534; font-size:0.875rem; margin-bottom:2px;">Select Your Academic Program</div>
                  <div style="font-size:0.75rem; color:#64748B;">Please choose your course to finish setting up your student profile.</div>
                </div>

                <div class="login-field-group" style="margin-bottom:18px;">
                  <label class="login-field-label">Degree / Academic Program *</label>
                  <select id="authCourseSelectInput" class="input-forest" style="background:#FFFFFF; color:#0F172A; border:1.5px solid #E2E8F0; font-size:0.9375rem; padding:12px 14px;">
                    ${courseOptionsHtml}
                  </select>
                </div>

                <button onclick="submitUserCourseSelection()" id="btnSubmitCourseSelect" class="btn-login-submit">
                  <span>Save & Continue &rarr;</span>
                </button>
              </div>

            </div>
          </div>

          <!-- Footer -->
          <footer class="login-footer-row">
            <span class="login-footer-copy">&copy; 2026 Jaipur National University. All rights reserved.</span>
            <div class="login-footer-links">
              <a href="javascript:void(0)" onclick="showToast('Help portal available on main campus site', 'info')" class="login-footer-link">Help</a>
              <span>|</span>
              <a href="javascript:void(0)" onclick="showToast('Privacy policy: Student data strictly protected under JNU regulations', 'info')" class="login-footer-link">Privacy</a>
              <span>|</span>
              <a href="mailto:inbox.afrozalam@gmail.com" class="login-footer-link">Contact</a>
            </div>
          </footer>

        </main>
      </div>
    </div>

    <!-- Step 2 Container: OTP Verification (Matches media_1789820266688.jpg) -->
    <div id="loginStep2Wrap" class="login-step-view-wrap" style="display:none; width:100%; min-height:100vh;">
      <div class="otp-page-layout">
        
        <!-- Desktop Top Bar (Hidden on mobile < 768px) -->
        <header class="otp-desktop-top-bar">
          <div class="otp-top-brand" onclick="navigateTo('/')">
            <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="otp-top-crest" onerror="this.src='/static/img/jnu_logo.jpg';">
            <div class="otp-top-title-wrap">
              <div class="otp-top-title">JnuMate<span class="brand-dot">.</span></div>
              <div class="otp-top-subtitle">JAIPUR NATIONAL UNIVERSITY</div>
            </div>
          </div>

          <!-- Center Navigation Links -->
          <nav class="otp-top-nav-links">
            <a href="/" class="otp-top-nav-link" onclick="event.preventDefault(); navigateTo('/')">Home</a>
            <a href="/events" class="otp-top-nav-link" onclick="event.preventDefault(); navigateTo('/events')">Events</a>
            <a href="/resources" class="otp-top-nav-link" onclick="event.preventDefault(); navigateTo('/resources')">Resources</a>
          </nav>

          <!-- Right Actions Cluster -->
          <div class="otp-top-actions">
            <div class="otp-top-bell-btn" onclick="showToast('No new notifications', 'info')" title="Notifications">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            
            <div class="otp-top-user-pill" onclick="showAuthStep(1)" title="Sign In with R-ID">
              <div class="otp-top-avatar-circle">
                <svg viewBox="0 0 80 80" width="100%" height="100%" fill="none">
                  <circle cx="40" cy="40" r="40" fill="#CBD5E1"/>
                  <circle cx="40" cy="30" r="14" fill="#FFFFFF"/>
                  <path d="M16 68 C16 52, 26 48, 40 48 C54 48, 64 52, 64 68 Z" fill="#FFFFFF"/>
                </svg>
              </div>
              <span class="otp-top-user-name">Sign In</span>
              <svg class="otp-top-chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </header>

        <!-- Mobile Top Bar (Shown only on mobile < 768px) -->
        <header class="otp-mobile-top-bar">
          <div class="otp-mobile-brand" onclick="navigateTo('/')">
            <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="otp-mobile-crest" onerror="this.src='/static/img/jnu_logo.jpg';">
            <div class="otp-mobile-title-wrap">
              <div class="otp-mobile-title">JnuMate<span class="brand-dot">.</span></div>
              <div class="otp-mobile-subtitle">JAIPUR NATIONAL UNIVERSITY</div>
            </div>
          </div>

          <div class="otp-mobile-actions">
            <div class="otp-mobile-bell-btn" onclick="showToast('No new notifications', 'info')">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            
            <div class="otp-mobile-avatar-circle" onclick="showAuthStep(1)">
              <svg viewBox="0 0 80 80" width="100%" height="100%" fill="none">
                <circle cx="40" cy="40" r="40" fill="#CBD5E1"/>
                <circle cx="40" cy="30" r="14" fill="#FFFFFF"/>
                <path d="M16 68 C16 52, 26 48, 40 48 C54 48, 64 52, 64 68 Z" fill="#FFFFFF"/>
              </svg>
            </div>
          </div>
        </header>

        <!-- Main Workspace Stage -->
        <main class="otp-main-workspace">
          
          <!-- Left Editorial Typography Column (Desktop Only >= 768px) -->
          <div class="otp-left-editorial-col">
            <div class="otp-editorial-title">
              Learn<br>
              Grow<br>
              Belong<br>
              Together.
            </div>
            <div class="otp-editorial-bar"></div>
            <div class="otp-editorial-subtext">
              A brighter<br>
              tomorrow,<br>
              together.
            </div>
          </div>

          <!-- Left-Bottom Architectural Building Sketch (Desktop Only >= 768px) -->
          <div class="otp-left-building-watermark">
            <img src="/static/img/redesign/otp_desktop_building.png" alt="Jaipur National University" class="otp-left-building-img">
          </div>

          <!-- Center Column: Floating OTP Card -->
          <div class="otp-center-card-col">
            <div class="otp-card-frame">

              <!-- Shield Padlock Badge -->
              <div class="otp-lock-badge-wrap">
                <div class="otp-lock-badge">
                  <svg viewBox="0 0 44 48" width="26" height="30" fill="none">
                    <path d="M22 2L6 8V21C6 31.5 12.8 41.2 22 44.5C31.2 41.2 38 31.5 38 21V8L22 2Z" fill="#0D5C3A"/>
                    <!-- White Padlock -->
                    <path d="M16.5 21V18C16.5 14.96 18.96 12.5 22 12.5C25.04 12.5 27.5 14.96 27.5 18V21H28.5C29.33 21 30 21.67 30 22.5V31.5C30 32.33 29.33 33 28.5 33H15.5C14.67 33 14 32.33 14 31.5V22.5C14 21.67 14.67 21 15.5 21H16.5ZM18.5 18V21H25.5V18C25.5 16.07 23.93 14.5 22 14.5C20.07 14.5 18.5 16.07 18.5 18ZM22 25C21.17 25 20.5 25.67 20.5 26.5C20.5 27.08 20.84 27.58 21.33 27.82L20.8 30H23.2L22.67 27.82C23.16 27.58 23.5 27.08 23.5 26.5C23.5 25.67 22.83 25 22 25Z" fill="#FFFFFF"/>
                  </svg>
                </div>
              </div>

              <!-- Title & Subtitle -->
              <h1 class="otp-card-title">OTP Verification</h1>
              <p class="otp-card-sub otp-prompt-text">Enter the 6-digit code sent to your registered email</p>

              <!-- Student Profile Spotlight -->
              <div id="otpProfileSpotlight">
                <!-- Rendered dynamically by renderAuthProfileSpotlight -->
              </div>

              <!-- Verification Code Sent Notice Box -->
              <div class="otp-email-notice-box" id="otpEmailNoticeBox">
                <span class="otp-email-notice-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <span class="otp-email-notice-text">
                  Verification code sent to <span class="otp-email-bold-link" id="otpTargetEmailText">manjarigulpadiya@gmail.com</span>
                </span>
              </div>

              <!-- Prompt Label -->
              <div class="otp-code-label">ENTER 6-DIGIT CODE</div>

              <!-- 6-Digit Input Boxes -->
              <div class="otp-digit-boxes-row" id="otpDigitBoxesRow">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-box active" data-idx="0" autocomplete="one-time-code" autofocus>
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-box" data-idx="1">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-box" data-idx="2">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-box" data-idx="3">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-box" data-idx="4">
                <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit-box" data-idx="5">
              </div>

              <!-- Hidden input for backwards compatibility & sync -->
              <input type="hidden" id="otpCodeInput" value="">

              <!-- Verify & Sign In Button -->
              <button type="button" id="btnVerifyOtp" onclick="verifyEmailOtpCode()" class="btn-otp-verify-submit">
                <span>Verify &amp; Sign In &rarr;</span>
              </button>

              <!-- Bottom Actions Row: Resend Code | Change R-ID -->
              <div class="otp-card-footer-row">
                <button type="button" id="btnResendOtp" onclick="handleResendOtp()" class="otp-resend-btn" disabled>
                  Resend Code (<span id="resendCountdown">25</span>s)
                </button>
                <button type="button" onclick="showAuthStep(1)" class="otp-change-rid-btn">
                  &larr; Change R-ID
                </button>
              </div>

            </div>
          </div>

        </main>

        <!-- Mobile Bottom Illustration & Slogan (< 768px Only) -->
        <div class="otp-mobile-bottom-section">
          <div class="otp-mobile-sketch-wrap">
            <img src="/static/img/redesign/otp_dome_mobile.png" alt="Jaipur National University" class="otp-mobile-sketch-img">
          </div>
          <div class="otp-mobile-motto">Learn &bull; Grow &bull; Belong &bull; Together.</div>
          <div class="otp-mobile-sub-bar"></div>
        </div>

      </div>
    </div>

    <!-- Step 3 Container: Course Selection (Matches media_1789792275560.jpg) -->
    <div id="loginStep3Wrap" class="login-step-view-wrap" style="display:none; width:100%; min-height:100vh;">
      <div class="course-select-page-layout">
        
        <!-- Desktop Top Bar (Hidden on mobile < 768px) -->
        <header class="course-desktop-top-bar">
          <div class="course-top-brand">
            <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="course-top-crest" onerror="this.src='/static/img/jnu_logo.jpg';">
            <div class="course-top-title-wrap">
              <div class="course-top-title">JnuMate<span class="brand-dot">.</span></div>
              <div class="course-top-subtitle">JAIPUR NATIONAL UNIVERSITY</div>
            </div>
          </div>

          <div class="course-top-actions">
            <div class="course-top-bell-btn" onclick="showToast('No new notifications', 'info')">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            
            <div class="course-top-user-pill">
              <div class="course-top-avatar-circle" id="courseTopAvatarCircle">
                <svg viewBox="0 0 80 80" width="100%" height="100%" fill="none">
                  <circle cx="40" cy="40" r="40" fill="#CBD5E1"/>
                  <circle cx="40" cy="30" r="14" fill="#FFFFFF"/>
                  <path d="M16 68 C16 52, 26 48, 40 48 C54 48, 64 52, 64 68 Z" fill="#FFFFFF"/>
                </svg>
              </div>
              <span class="course-top-user-name" id="courseTopUserName">Nishita Gumber</span>
              <svg class="course-top-chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </header>

        <!-- Mobile Top Bar (Shown only on mobile < 768px) -->
        <header class="course-mobile-top-bar">
          <div class="course-mobile-brand">
            <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="course-mobile-crest" onerror="this.src='/static/img/jnu_logo.jpg';">
            <div class="course-mobile-title-wrap">
              <div class="course-mobile-title">JnuMate<span class="brand-dot">.</span></div>
              <div class="course-mobile-subtitle">JAIPUR NATIONAL UNIVERSITY</div>
            </div>
          </div>

          <div class="course-mobile-actions">
            <div class="course-mobile-bell-btn" onclick="showToast('No new notifications', 'info')">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            
            <div class="course-mobile-avatar-circle" id="courseMobileAvatarCircle">
              <svg viewBox="0 0 80 80" width="100%" height="100%" fill="none">
                <circle cx="40" cy="40" r="40" fill="#CBD5E1"/>
                <circle cx="40" cy="30" r="14" fill="#FFFFFF"/>
                <path d="M16 68 C16 52, 26 48, 40 48 C54 48, 64 52, 64 68 Z" fill="#FFFFFF"/>
              </svg>
            </div>
          </div>
        </header>

        <!-- Main Workspace Stage -->
        <main class="course-main-workspace">
          
          <!-- Left Editorial Typography Column (Desktop Only >= 768px) -->
          <div class="course-left-editorial-col">
            <div class="course-editorial-title">
              Learn<br>
              Grow<br>
              Belong<br>
              Together.
            </div>
            <div class="course-editorial-bar"></div>
            <div class="course-editorial-subtext">
              A brighter<br>
              tomorrow,<br>
              together.
            </div>
          </div>

          <!-- Center Column: Floating Course Selection Card -->
          <div class="course-center-card-col">
            <div class="course-card-frame">

              <!-- Circular Student Avatar with Rich Emerald Ring -->
              <div class="course-card-avatar-box">
                <div class="course-card-avatar-ring">
                  <div id="courseCardAvatarInner" class="course-card-avatar-inner">
                    <svg viewBox="0 0 80 80" width="100%" height="100%" fill="none">
                      <circle cx="40" cy="40" r="40" fill="#CBD5E1"/>
                      <circle cx="40" cy="30" r="14" fill="#FFFFFF"/>
                      <path d="M16 68 C16 52, 26 48, 40 48 C54 48, 64 52, 64 68 Z" fill="#FFFFFF"/>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Student Name -->
              <h2 id="courseCardStudentName" class="course-card-student-name">Nishita Gumber</h2>

              <!-- Amber R-ID Badge -->
              <div class="course-card-rid-wrap">
                <span class="course-card-rid-badge" id="courseCardRidBadge">
                  R-ID: <strong id="courseCardRidVal">R44500</strong>
                </span>
              </div>

              <!-- Mint Instruction Box -->
              <div class="course-card-instruction-box">
                <div class="course-instruction-heading">Select Your Academic Program</div>
                <div class="course-instruction-sub">Please choose your course to finish setting up your student profile.</div>
              </div>

              <!-- Academic Program Form -->
              <div class="course-form-field-group">
                <label class="course-field-label" for="courseSelectDropdown">DEGREE / ACADEMIC PROGRAM *</label>
                <div class="course-select-custom-wrap">
                  <select id="courseSelectDropdown" class="course-select-input">
                    ${courseOptionsHtml}
                  </select>
                  <div class="course-select-custom-arrow">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Action Button -->
              <button type="button" id="btnCourseSaveContinue" onclick="submitUserCourseSelection()" class="btn-course-save-action">
                <span>Save &amp; Continue &rarr;</span>
              </button>

            </div>
          </div>

          <!-- Right Decorative Watermark Column (Desktop Only >= 768px) -->
          <div class="course-right-watermark-col">
            <div class="course-watermark-dome-wrap">
              <img src="/static/img/redesign/otp_desktop_building.png" alt="Jaipur National University" class="course-watermark-dome-img">
            </div>
          </div>

        </main>

        <!-- Mobile Bottom Illustration (< 768px Only) -->
        <div class="course-mobile-bottom-section">
          <img src="/static/img/redesign/otp_dome_mobile.png" alt="Jaipur National University" class="course-mobile-dome-img">
        </div>

      </div>
    </div>

    <!-- Step 1B Container: Enter Your Details (Matches media_1789795025736.jpg) -->
    <div id="loginStepSyncWrap" class="login-step-view-wrap" style="display:none; width:100%; min-height:100vh;">
      <div class="sync-details-page-layout">
        
        <!-- Desktop Top Bar (Hidden on mobile < 768px) -->
        <header class="sync-desktop-top-bar">
          <div class="sync-top-brand" onclick="navigateTo('/')">
            <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="sync-top-crest" onerror="this.src='/static/img/jnu_logo.jpg';">
            <div class="sync-top-title-wrap">
              <div class="sync-top-title">JnuMate<span class="brand-dot">.</span></div>
              <div class="sync-top-subtitle">JAIPUR NATIONAL UNIVERSITY</div>
            </div>
          </div>

          <!-- Center Navigation Links -->
          <nav class="sync-top-nav-links">
            <a href="/" class="sync-top-nav-link" onclick="event.preventDefault(); navigateTo('/')">Home</a>
            <a href="/events" class="sync-top-nav-link" onclick="event.preventDefault(); navigateTo('/events')">Events</a>
            <a href="/resources" class="sync-top-nav-link" onclick="event.preventDefault(); navigateTo('/resources')">Resources</a>
          </nav>

          <!-- Right Actions Cluster -->
          <div class="sync-top-actions">
            <div class="sync-top-bell-btn" onclick="showToast('No new notifications', 'info')" title="Notifications">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            
            <div class="sync-top-user-pill" onclick="showAuthStep(1)" title="Sign In with R-ID">
              <div class="sync-top-avatar-circle">
                <svg viewBox="0 0 80 80" width="100%" height="100%" fill="none">
                  <circle cx="40" cy="40" r="40" fill="#CBD5E1"/>
                  <circle cx="40" cy="30" r="14" fill="#FFFFFF"/>
                  <path d="M16 68 C16 52, 26 48, 40 48 C54 48, 64 52, 64 68 Z" fill="#FFFFFF"/>
                </svg>
              </div>
              <span class="sync-top-user-name">Sign In</span>
              <svg class="sync-top-chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </header>

        <!-- Mobile Top Bar (Shown only on mobile < 768px) -->
        <header class="sync-mobile-top-bar">
          <div class="sync-mobile-brand" onclick="navigateTo('/')">
            <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="sync-mobile-crest" onerror="this.src='/static/img/jnu_logo.jpg';">
            <div class="sync-mobile-title-wrap">
              <div class="sync-mobile-title">JnuMate<span class="brand-dot">.</span></div>
              <div class="sync-mobile-subtitle">JAIPUR NATIONAL UNIVERSITY</div>
            </div>
          </div>

          <div class="sync-mobile-actions">
            <div class="sync-mobile-bell-btn" onclick="showToast('No new notifications', 'info')">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            
            <div class="sync-mobile-avatar-circle" onclick="showAuthStep(1)">
              <svg viewBox="0 0 80 80" width="100%" height="100%" fill="none">
                <circle cx="40" cy="40" r="40" fill="#CBD5E1"/>
                <circle cx="40" cy="30" r="14" fill="#FFFFFF"/>
                <path d="M16 68 C16 52, 26 48, 40 48 C54 48, 64 52, 64 68 Z" fill="#FFFFFF"/>
              </svg>
            </div>
          </div>
        </header>

        <!-- Main Workspace Stage -->
        <main class="sync-main-workspace">
          
          <!-- Left Editorial Typography Column (Desktop Only >= 768px) -->
          <div class="sync-left-editorial-col">
            <div class="sync-editorial-title">
              Learn<br>
              Grow<br>
              Belong<br>
              Together.
            </div>
            <div class="sync-editorial-bar"></div>
            <div class="sync-editorial-subtext">
              A brighter<br>
              tomorrow,<br>
              together.
            </div>
          </div>

          <!-- Center Column: Floating Enter Details Card -->
          <div class="sync-center-card-col">
            <div class="sync-card-frame">

              <!-- Circular Student Avatar with Rich Emerald Ring -->
              <div class="sync-card-avatar-box">
                <div class="sync-card-avatar-ring">
                  <div id="syncCardAvatarInner" class="sync-card-avatar-inner">
                    <svg viewBox="0 0 80 80" width="100%" height="100%" fill="none">
                      <circle cx="40" cy="40" r="40" fill="#CBD5E1"/>
                      <circle cx="40" cy="30" r="14" fill="#FFFFFF"/>
                      <path d="M16 68 C16 52, 26 48, 40 48 C54 48, 64 52, 64 68 Z" fill="#FFFFFF"/>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Amber R-ID Pill Badge -->
              <div class="sync-card-rid-wrap">
                <span class="sync-card-rid-badge" id="syncCardRidBadge">
                  R-ID: <strong id="syncCardRidVal">R42695</strong>
                </span>
              </div>

              <!-- Amber Alert Box with Circular Exclamation Badge -->
              <div class="sync-alert-box">
                <div class="sync-alert-icon">
                  <span>!</span>
                </div>
                <div class="sync-alert-text">
                  <div class="sync-alert-line1">Due to server load we couldn't fetch your data.</div>
                  <div class="sync-alert-line2">Enter your details manually to continue.</div>
                </div>
              </div>

              <!-- Details Form Fields -->
              <div class="sync-form-fields-container">
                <!-- 1. Full Name -->
                <div class="sync-field-group">
                  <label class="sync-field-label" for="syncNameInput">FULL NAME *</label>
                  <div class="sync-field-input-wrap">
                    <span class="sync-field-left-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </span>
                    <input type="text" id="syncNameInput" placeholder="Your full name as per college ID" class="sync-text-input" autocomplete="name">
                  </div>
                </div>

                <!-- 2. Course / Degree Program -->
                <div class="sync-field-group">
                  <label class="sync-field-label" for="syncCourseSelect">COURSE / DEGREE PROGRAM *</label>
                  <div class="sync-field-input-wrap">
                    <span class="sync-field-left-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                      </svg>
                    </span>
                    <select id="syncCourseSelect" class="sync-select-input">
                      ${courseOptionsHtml}
                    </select>
                    <span class="sync-field-right-chevron">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </span>
                  </div>
                </div>

                <!-- 3. Gender -->
                <div class="sync-field-group">
                  <label class="sync-field-label" for="syncGenderSelect">GENDER *</label>
                  <div class="sync-field-input-wrap">
                    <span class="sync-field-left-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </span>
                    <select id="syncGenderSelect" class="sync-select-input">
                      <option value="Male" selected>Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <span class="sync-field-right-chevron">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </span>
                  </div>
                </div>

                <!-- 4. Email -->
                <div class="sync-field-group">
                  <label class="sync-field-label" for="syncEmailInput">EMAIL *</label>
                  <div class="sync-field-input-wrap">
                    <span class="sync-field-left-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </span>
                    <input type="email" id="syncEmailInput" placeholder="e.g. name@gmail.com" class="sync-text-input" autocomplete="email">
                  </div>
                </div>
              </div>

              <!-- Action Button -->
              <button type="button" id="btnSendSyncOtp" onclick="submitSyncDetailsAndSendOtp()" class="btn-sync-action">
                <span>Send Verification Code &rarr;</span>
              </button>

              <!-- Footer Subtext Note -->
              <div class="sync-footer-note">
                We'll send a verification code to your email.
              </div>

            </div>
          </div>

          <!-- Right Decorative Watermark Column (Desktop Only >= 768px) -->
          <div class="sync-right-watermark-col">
            <div class="sync-watermark-dome-wrap">
              <img src="/static/img/redesign/otp_desktop_building.png" alt="Jaipur National University" class="sync-watermark-dome-img">
            </div>
          </div>

        </main>

        <!-- Mobile Bottom Illustration & Slogan (< 768px Only) -->
        <div class="sync-mobile-bottom-section">
          <div class="sync-mobile-bottom-lockup">
            <div class="sync-mobile-bottom-text">
              <div class="sync-mobile-motto">Learn &bull; Grow &bull; Belong</div>
              <div class="sync-mobile-submotto">A brighter tomorrow,<br>together.</div>
              <div class="sync-mobile-sub-bar"></div>
            </div>
            <div class="sync-mobile-sketch-wrap">
              <img src="/static/img/redesign/otp_dome_mobile.png" alt="Jaipur National University" class="sync-mobile-sketch-img">
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  if (window.location.pathname === "/course-select" || window.location.pathname === "/select-program" || (currentUser && currentUser.needs_program)) {
    showAuthStep('course_select');
  } else if (window.location.pathname === "/enter-details" || window.location.pathname === "/sync-details") {
    showAuthStep('sync');
  }
}

function showAuthStep(step) {
  const step1Wrap = document.getElementById("loginStep1Wrap");
  const stepSyncWrap = document.getElementById("loginStepSyncWrap");
  const step2Wrap = document.getElementById("loginStep2Wrap");
  const step3Wrap = document.getElementById("loginStep3Wrap");
  const s1 = document.getElementById("authStep1");
  const sSync = document.getElementById("authStepSyncNotice");
  const sCourse = document.getElementById("authStepCourseSelect");

  const isStep1 = step === 1;
  const isOtpStep = step === 2;
  const isSyncStep = step === 'sync' || step === 'details' || step === 'enter-details';
  const isCourseStep = step === 'course_select' || step === 3;

  if (isOtpStep) {
    if (step1Wrap) step1Wrap.style.display = "none";
    if (stepSyncWrap) stepSyncWrap.style.display = "none";
    if (step3Wrap) step3Wrap.style.display = "none";
    if (step2Wrap) {
      step2Wrap.style.display = "block";
      step2Wrap.style.opacity = "0";
      requestAnimationFrame(() => {
        step2Wrap.style.transition = "opacity 0.2s ease";
        step2Wrap.style.opacity = "1";
      });
    }
    const prof = pendingStudentProfile || {
      name: "manjari",
      r_id: "R42695",
      rid: "R42695",
      program: "B.Tech CSE (AI & ML) Hons.-Samatrix",
      current_year: "4th Year Student",
      gender: "Female",
      email: "manjarigulpadiya@gmail.com"
    };
    renderAuthProfileSpotlight(prof, prof.email);
    setupOtpDigitInputs();
    startResendTimer();
    const firstBox = document.querySelector(".otp-digit-box[data-idx='0']");
    if (firstBox) {
      setTimeout(() => firstBox.focus(), 150);
    }
    return;
  }

  if (isCourseStep) {
    try {
      if (window.location.pathname !== "/course-select" && window.location.pathname !== "/select-program") {
        history.pushState(null, "", "/course-select");
      }
    } catch (e) {}
    if (step1Wrap) step1Wrap.style.display = "none";
    if (stepSyncWrap) stepSyncWrap.style.display = "none";
    if (step2Wrap) step2Wrap.style.display = "none";
    if (step3Wrap) {
      step3Wrap.style.display = "block";
      step3Wrap.style.opacity = "0";
      requestAnimationFrame(() => {
        step3Wrap.style.transition = "opacity 0.2s ease";
        step3Wrap.style.opacity = "1";
      });
    }

    const name = (currentUser && currentUser.name) ? currentUser.name : "Nishita Gumber";
    const rid = (currentUser && (currentUser.rid || currentUser.id)) ? (currentUser.rid || currentUser.id) : "R44500";
    const avatarUrl = (currentUser && currentUser.avatar_url) ? currentUser.avatar_url : "";

    const nameEl = document.getElementById("courseCardStudentName");
    const topNameEl = document.getElementById("courseTopUserName");
    const ridValEl = document.getElementById("courseCardRidVal");
    const avatarInnerEl = document.getElementById("courseCardAvatarInner");
    const topAvatarEl = document.getElementById("courseTopAvatarCircle");
    const mobileAvatarEl = document.getElementById("courseMobileAvatarCircle");

    if (nameEl) nameEl.innerText = name;
    if (topNameEl) topNameEl.innerText = name;
    if (ridValEl) ridValEl.innerText = rid;

    if (avatarUrl) {
      const imgTag = `<img src="${escapeAttr(avatarUrl)}" alt="${escapeAttr(name)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.onerror=null; this.src='/static/img/blank_pfp.jpg';">`;
      if (avatarInnerEl) avatarInnerEl.innerHTML = imgTag;
      if (topAvatarEl) topAvatarEl.innerHTML = imgTag;
      if (mobileAvatarEl) mobileAvatarEl.innerHTML = imgTag;
    }

    // Default select to "B.Tech CSE (AI & ML) Hons.-Samatrix" if no program chosen
    const dropdown = document.getElementById("courseSelectDropdown");
    if (dropdown) {
      if (currentUser && currentUser.program && currentUser.program !== "Student") {
        dropdown.value = currentUser.program;
      } else {
        dropdown.value = "B.Tech CSE (AI & ML) Hons.-Samatrix";
      }
    }
    return;
  }

  if (isSyncStep) {
    if (step1Wrap) step1Wrap.style.display = "none";
    if (step2Wrap) step2Wrap.style.display = "none";
    if (step3Wrap) step3Wrap.style.display = "none";
    if (stepSyncWrap) {
      stepSyncWrap.style.display = "block";
      stepSyncWrap.style.opacity = "0";
      requestAnimationFrame(() => {
        stepSyncWrap.style.transition = "opacity 0.2s ease";
        stepSyncWrap.style.opacity = "1";
      });
    }

    const rid = (pendingRegistrationData && pendingRegistrationData.rid)
      ? pendingRegistrationData.rid
      : (currentUser && (currentUser.rid || currentUser.id) ? (currentUser.rid || currentUser.id) : "R42695");
    
    const ridValEl = document.getElementById("syncCardRidVal");
    if (ridValEl) ridValEl.innerText = rid;
    const banner = document.getElementById("syncRidBanner");
    if (banner) banner.innerText = rid;

    const courseSelect = document.getElementById("syncCourseSelect");
    if (courseSelect && (!courseSelect.value || courseSelect.value === "")) {
      courseSelect.value = "B.Tech CSE (AI & ML) Hons.-Samatrix";
    }
    const genderSelect = document.getElementById("syncGenderSelect");
    if (genderSelect && (!genderSelect.value || genderSelect.value === "")) {
      genderSelect.value = "Male";
    }

    const nameInput = document.getElementById("syncNameInput");
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 150);
    }
    return;
  }

  // Non-OTP steps: show Step 1 wrap, hide Step 2, Step 3, and Step Sync wraps
  if (stepSyncWrap) stepSyncWrap.style.display = "none";
  if (step2Wrap) step2Wrap.style.display = "none";
  if (step3Wrap) step3Wrap.style.display = "none";
  if (step1Wrap) {
    step1Wrap.style.display = "block";
    step1Wrap.style.opacity = "0";
    requestAnimationFrame(() => {
      step1Wrap.style.transition = "opacity 0.2s ease";
      step1Wrap.style.opacity = "1";
    });
  }

  if (isStep1) {
    if (s1) s1.style.display = "block";
    if (sSync) sSync.style.display = "none";
    if (sCourse) sCourse.style.display = "none";
    const ridInput = document.getElementById("authRidInput");
    if (ridInput) {
      if (pendingRegistrationData && pendingRegistrationData.rid) {
        ridInput.value = pendingRegistrationData.rid;
      }
      setTimeout(() => ridInput.focus(), 150);
    }
  }
}

/* ==========================================================================
   UNIVERSITY ID CARD QR SCANNER IMPLEMENTATION
   ========================================================================== */
let qrScannerStream = null;
let qrScanAnimationId = null;

function openUniversityQrScanner() {
  const modal = document.getElementById("qrScannerModal");
  const notice = document.getElementById("qrScannerNotice");
  const video = document.getElementById("qrScannerVideo");
  if (!modal) return;

  modal.style.display = "flex";
  document.body.classList.add("scroll-locked");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (notice) notice.innerText = "Camera not supported. Please upload ID photo.";
    return;
  }

  if (notice) notice.innerText = "Starting camera...";

  navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } }
  })
    .then(stream => {
      qrScannerStream = stream;
      if (video) {
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.play();
      }
      if (notice) notice.innerText = "Align QR code inside box";
      startQrFrameScanLoop();
    })
    .catch(err => {
      console.warn("Camera access notice:", err);
      if (notice) notice.innerText = "Camera permission needed. You can also upload a photo.";
    });
}

function closeUniversityQrScanner() {
  const modal = document.getElementById("qrScannerModal");
  if (modal) modal.style.display = "none";
  document.body.classList.remove("scroll-locked");

  if (qrScanAnimationId) {
    cancelAnimationFrame(qrScanAnimationId);
    qrScanAnimationId = null;
  }
  if (qrScannerStream) {
    qrScannerStream.getTracks().forEach(track => track.stop());
    qrScannerStream = null;
  }
  const video = document.getElementById("qrScannerVideo");
  if (video) video.srcObject = null;
}

function handleQrCodeDetected(detectedText) {
  if (!detectedText) return;
  const match = detectedText.match(/R?\d{4,6}/i);
  if (match) {
    const raw = match[0].toUpperCase();
    const formattedRid = raw.startsWith("R") ? raw : ("R" + raw);
    showToast(`Detected College R-ID: ${formattedRid}`, "success");
    closeUniversityQrScanner();
    const input = document.getElementById("authRidInput");
    if (input) {
      input.value = formattedRid;
      setTimeout(() => submitInitialRid(), 300);
    }
  } else {
    showToast("QR code detected, but no R-ID found. Enter your R-ID manually.", "info");
  }
}

function startQrFrameScanLoop() {
  const video = document.getElementById("qrScannerVideo");
  const canvas = document.getElementById("qrScannerCanvas");
  if (!video || !canvas) return;

  if ('BarcodeDetector' in window) {
    try {
      const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });
      const detectFrame = () => {
        if (!qrScannerStream) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          detector.detect(video)
            .then(barcodes => {
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                handleQrCodeDetected(barcodes[0].rawValue);
                return;
              }
              qrScanAnimationId = requestAnimationFrame(detectFrame);
            })
            .catch(() => {
              qrScanAnimationId = requestAnimationFrame(detectFrame);
            });
        } else {
          qrScanAnimationId = requestAnimationFrame(detectFrame);
        }
      };
      qrScanAnimationId = requestAnimationFrame(detectFrame);
    } catch (e) {
      console.warn("BarcodeDetector init notice:", e);
    }
  }
}

function handleQrFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const notice = document.getElementById("qrScannerNotice");
  if (notice) notice.innerText = "Processing ID photo...";

  if ('BarcodeDetector' in window) {
    const img = new Image();
    img.onload = () => {
      try {
        const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39'] });
        detector.detect(img)
          .then(barcodes => {
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              handleQrCodeDetected(barcodes[0].rawValue);
            } else {
              showToast("No barcode/QR found in photo. Please enter R-ID manually.", "info");
              if (notice) notice.innerText = "No code found in photo";
            }
          })
          .catch(() => {
            showToast("Could not scan photo. Please enter R-ID manually.", "error");
          });
      } catch (e) {
        showToast("Photo processed. Please enter R-ID manually.", "info");
      }
    };
    img.src = URL.createObjectURL(file);
  } else {
    const filenameMatch = (file.name || "").match(/R?\d{4,6}/i);
    if (filenameMatch) {
      handleQrCodeDetected(filenameMatch[0]);
    } else {
      showToast("Photo received. Please enter your R-ID to sign in.", "info");
      closeUniversityQrScanner();
      const input = document.getElementById("authRidInput");
      if (input) input.focus();
    }
  }
}

function startResendTimer() {
  clearInterval(resendTimerInterval);
  resendSecondsRemaining = 25;
  const btn = document.getElementById("btnResendOtp");
  if (!btn) return;

  btn.disabled = true;
  btn.classList.remove("is-active");
  btn.innerHTML = `Resend Code (<span id="resendCountdown">${resendSecondsRemaining}</span>s)`;

  resendTimerInterval = setInterval(() => {
    resendSecondsRemaining--;
    const span = document.getElementById("resendCountdown");
    if (span) span.innerText = resendSecondsRemaining;

    if (resendSecondsRemaining <= 0) {
      clearInterval(resendTimerInterval);
      btn.disabled = false;
      btn.classList.add("is-active");
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
      btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px;"><span class="inline-btn-spinner" style="border-color:rgba(22,163,74,0.25); border-top-color:#16A34A; width:12px; height:12px;"></span> <span>Resending...</span></span>`;
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
  btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;"><span class="inline-btn-spinner"></span> <span>Connecting...</span></span>`;

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

  const ridEl = document.getElementById("syncCardRidVal");
  const fallbackRid = ridEl ? ridEl.innerText.trim() : "R42695";
  const rid = (pendingRegistrationData && pendingRegistrationData.rid) ? pendingRegistrationData.rid : fallbackRid;
  const name = nameInput ? nameInput.value.trim() : "";
  const email = emailInput ? emailInput.value.trim() : "";
  const program = courseSelect ? courseSelect.value.trim() : "";
  const gender = genderSelect ? genderSelect.value.trim() : "Male";

  if (!rid || !name || !email || !program) {
    showToast("Please fill all required academic fields", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;"><span class="inline-btn-spinner"></span> <span>Sending Code...</span></span>`;
  }

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
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Send Verification Code &rarr;</span>`;
      }

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
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Send Verification Code &rarr;</span>`;
      }
      showToast("Network error sending code", "error");
    });
}

function verifyEmailOtpCode() {
  if (isVerifyingOtp) return;

  const ridInput = document.getElementById("authRidInput");
  const otpInput = document.getElementById("otpCodeInput");
  const btn = document.getElementById("btnVerifyOtp");

  const digitBoxes = document.querySelectorAll(".otp-digit-box");
  let otp = "";
  if (digitBoxes && digitBoxes.length === 6) {
    otp = Array.from(digitBoxes).map(b => b.value.trim()).join("");
    if (otpInput) otpInput.value = otp;
  } else if (otpInput) {
    otp = otpInput.value.trim();
  }

  if (!otp || otp.length < 6) {
    showToast("Please enter 6-digit verification code", "error");
    return;
  }

  const rid = (pendingRegistrationData && pendingRegistrationData.rid) || (ridInput ? ridInput.value.trim().toUpperCase() : "") || (pendingStudentProfile && (pendingStudentProfile.r_id || pendingStudentProfile.rid)) || "R42695";

  isVerifyingOtp = true;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;"><span class="inline-btn-spinner"></span> <span>Verifying...</span></span>`;
  }

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
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Verify &amp; Sign In &rarr;</span>`;
      }

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
            navigateTo("/");
          }
        } catch (navErr) {
          console.warn("Navigation notice:", navErr);
          navigateTo("/");
        }
      } else {
        const errorMsg = (data && data.message) || "Invalid verification code";
        showToast(errorMsg, "error");
        if (digitBoxes && digitBoxes.length === 6) {
          digitBoxes.forEach(b => {
            b.value = "";
            b.classList.remove("has-val");
          });
          digitBoxes[0].focus();
        }
      }
    })
    .catch(err => {
      isVerifyingOtp = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Verify &amp; Sign In &rarr;</span>`;
      }
      console.error("verify-otp error:", err);
      showToast("Cannot connect to server. Please check your connection and retry.", "error");
    });
}

function submitUserCourseSelection() {
  const select = document.getElementById("courseSelectDropdown") || document.getElementById("authCourseSelectInput");
  const btn = document.getElementById("btnCourseSaveContinue") || document.getElementById("btnSubmitCourseSelect");
  if (!select || !select.value) {
    showToast("Please select your academic program", "error");
    return;
  }
  const program = select.value.trim();
  const ridVal = document.getElementById("courseCardRidVal");
  const rid = (currentUser && (currentUser.rid || currentUser.id)) 
    ? (currentUser.rid || currentUser.id) 
    : (ridVal ? ridVal.innerText.trim() : "R44500");

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;"><span class="inline-btn-spinner"></span> <span>Saving...</span></span>`;
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
        btn.innerHTML = `<span>Save &amp; Continue &rarr;</span>`;
      }
      if (data.success) {
        if (currentUser) {
          currentUser.program = program;
          currentUser.needs_program = false;
          try { localStorage.setItem("jnumate_user", JSON.stringify(currentUser)); } catch (e) {}
        }
        showToast("Academic program updated successfully!", "success");
        try {
          renderNavUserSlots();
          renderDrawerUserSlot();
        } catch (e) {}
        if (postLoginRedirect) {
          const redirectDest = postLoginRedirect;
          postLoginRedirect = null;
          navigateTo(redirectDest);
        } else {
          navigateTo("/");
        }
      } else {
        showToast(data.message || "Failed to update program", "error");
      }
    })
    .catch(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Save &amp; Continue &rarr;</span>`;
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
    document.documentElement.classList.remove("scroll-locked");
  }
}

function toggleTeamUserDropdown(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const isMobile = window.innerWidth <= 768;
  const menu = isMobile 
    ? (document.getElementById("teamUserDropdownMenuMobile") || document.getElementById("teamUserDropdownMenu"))
    : (document.getElementById("teamUserDropdownMenu") || document.getElementById("teamUserDropdownMenuMobile"));
  const btn = document.getElementById("teamUserDropdownBtn");
  if (!menu) return;
  const isShown = menu.style.display === "block";
  // Close any other open dropdowns first
  document.querySelectorAll(".team-user-dropdown-menu").forEach(m => { m.style.display = "none"; });
  menu.style.display = isShown ? "none" : "block";
  if (btn) btn.setAttribute("aria-expanded", isShown ? "false" : "true");
}

document.addEventListener("click", function(e) {
  const menus = document.querySelectorAll(".team-user-dropdown-menu");
  const wrap = e.target.closest(".team-user-dropdown-wrap");
  if (!wrap) {
    menus.forEach(m => { m.style.display = "none"; });
    const btn = document.getElementById("teamUserDropdownBtn");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }
});

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

/* ==========================================================================
   16. CAMPUS EVENTS ENGINE & DATASETS
   ========================================================================== */
const EVENT_SAMPLE_AVATARS = [
  "/static/img/redesign/events/attendee_1.png",
  "/static/img/redesign/events/attendee_2.png",
  "/static/img/redesign/events/attendee_3.png"
];

const CAMPUS_EVENTS_DATA = [
  {
    id: "sih-2025",
    title: "Smart India Hackathon 2025",
    category: "Hackathons",
    catBadge: "Hackathon",
    mobileCatBadge: "SIH",
    mobileBadgeTheme: "orange",
    image: "/static/img/redesign/events/event_sih.png",
    day: "15",
    month: "NOV",
    dateFull: "Saturday, 15 November 2025",
    time: "09:00 AM - 06:00 PM IST",
    location: "JNU Main Campus",
    locationDetail: "Central Auditorium & Innovation Lab, Academic Block A",
    summary: "Innovate for a better tomorrow. Build solutions for real-world problems.",
    details: "Smart India Hackathon 2025 is India's premier nationwide product innovation competition. JNU students collaborate in interdisciplinary teams of 6 to solve critical problem statements posed by ministries, departments, and industry leaders.",
    interestedCount: 234,
    organizer: "Ministry of Education & JNU Innovation Cell",
    entryFee: "Free Registration",
    eligibility: "All undergraduate & postgraduate students (6-member teams with at least 1 female leader/member)"
  },
  {
    id: "ai-ml-workshop-2025",
    title: "AI & Machine Learning Workshop",
    category: "Workshops",
    catBadge: "Workshop",
    mobileCatBadge: "Workshop",
    mobileBadgeTheme: "mint",
    image: "/static/img/redesign/events/event_ai.png",
    day: "22",
    month: "NOV",
    dateFull: "Saturday, 22 November 2025",
    time: "10:00 AM - 04:30 PM IST",
    location: "Computer Science Block",
    locationDetail: "CS Advanced Lab 304, Third Floor",
    summary: "Hands-on session on modern AI tools and applications.",
    details: "Master practical machine learning pipelines from dataset preparation to training neural networks, exploring LLM fine-tuning, and deploying transformer models with Python and PyTorch. Bring your laptops. Certificates provided.",
    interestedCount: 120,
    organizer: "Department of Computer Science & Engineering",
    entryFee: "Free (Pre-registration required)",
    eligibility: "Open to all engineering and tech enthusiasts"
  },
  {
    id: "future-tech-talk",
    title: "Future of Tech: Expert Talk",
    category: "Seminars",
    catBadge: "Seminar",
    mobileCatBadge: "Seminar",
    mobileBadgeTheme: "teal",
    image: "/static/img/redesign/events/event_future_tech.png",
    day: "28",
    month: "NOV",
    dateFull: "Friday, 28 November 2025",
    time: "02:00 PM - 05:00 PM IST",
    location: "Auditorium, JNU",
    locationDetail: "Dr. APJ Abdul Kalam Central University Auditorium",
    summary: "Insights from industry experts on emerging technologies.",
    details: "Distinguished keynote session and interactive fireside chat exploring quantum computing, edge artificial intelligence, hyperscale cloud architecture, and high-growth engineering careers with senior leaders.",
    interestedCount: 98,
    organizer: "JNU Tech Leaders Forum & IEEE Student Chapter",
    entryFee: "Free Admission",
    eligibility: "Open to all university students and faculty members"
  },
  {
    id: "cultural-fest-2025",
    title: "JNU Cultural Fest 2025",
    category: "Cultural",
    catBadge: "Cultural",
    mobileCatBadge: "Cultural",
    mobileBadgeTheme: "pink",
    image: "/static/img/redesign/events/event_cultural.png",
    day: "05",
    month: "DEC",
    dateFull: "Friday, 05 December 2025",
    time: "04:00 PM - 10:00 PM IST",
    location: "Open Air Ground",
    locationDetail: "University Amphitheater & Campus Open Air Lawn",
    summary: "Music, art, dance and much more. Celebrate the spirit of JNU.",
    details: "The university's flagship annual cultural festival bringing together live music bands, theatrical drama, folk and western dance battles, fashion runway, photography exhibitions, and a vibrant night food carnival.",
    interestedCount: 320,
    organizer: "JNU Student Activity Council (SAC)",
    entryFee: "Free Entry (Valid Student ID Required)",
    eligibility: "Open to all JNU students, alumni, and faculty"
  },
  {
    id: "ctf-competition-2025",
    title: "Capture The Flag (CTF)",
    category: "Competitions",
    catBadge: "Competition",
    mobileCatBadge: "CTF",
    mobileBadgeTheme: "purple",
    image: "/static/img/redesign/events/event_ctf.png",
    day: "12",
    month: "DEC",
    dateFull: "Friday, 12 December 2025",
    time: "11:00 AM - 07:00 PM IST",
    location: "Computer Science Block",
    locationDetail: "Cyber Defense Systems Lab, 2nd Floor",
    summary: "Test your cybersecurity skills in this thrilling competition.",
    details: "An intensive 8-hour live offensive and defensive cybersecurity jeopardy tournament. Hack through web app vulnerabilities, reverse engineer binaries, crack cryptographic puzzles, and analyze memory forensics. Cash prizes for the top 3 teams!",
    interestedCount: 176,
    organizer: "JNU Cybersecurity Club (SecNet)",
    entryFee: "Free Entry",
    eligibility: "Solo or Teams of 2-3 students"
  },
  {
    id: "startup-stories-2025",
    title: "Startup Stories",
    category: "Talks",
    catBadge: "Talk",
    mobileCatBadge: "Talk",
    mobileBadgeTheme: "amber",
    image: "/static/img/redesign/events/event_startup.png",
    day: "18",
    month: "DEC",
    dateFull: "Thursday, 18 December 2025",
    time: "03:00 PM - 06:00 PM IST",
    location: "Management Block",
    locationDetail: "Executive Conference Hall 102, School of Management",
    summary: "Learn from founders, builders and innovators.",
    details: "Candid founder stories from alumni entrepreneurs who scaled venture-backed tech startups. Learn practical lessons on initial customer discovery, prototyping on a student budget, fundraising, and pitch decks.",
    interestedCount: 64,
    organizer: "JNU E-Cell & Incubation Center",
    entryFee: "Free Entry",
    eligibility: "Open to all aspiring student founders and creators"
  }
];

let currentEventsCategory = "all";
let currentEventsQuery = "";
let userInterestedEventsSet = new Set();

function initUserInterestedEvents() {
  try {
    const raw = localStorage.getItem("jnumate_interested_events");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) userInterestedEventsSet = new Set(arr);
    }
  } catch (e) {}
}
initUserInterestedEvents();

function saveUserInterestedEvents() {
  try {
    localStorage.setItem("jnumate_interested_events", JSON.stringify(Array.from(userInterestedEventsSet)));
  } catch (e) {}
}

function loadEventsView() {
  const container = document.getElementById("eventsViewContainer");
  if (!container) return;
  currentEventsCategory = "all";
  currentEventsQuery = "";
  renderEventsPage();
}

function renderEventsPage() {
  const container = document.getElementById("eventsViewContainer");
  if (!container) return;

  const evSearchPlaceholder = (typeof window !== "undefined" && window.innerWidth <= 768) ? "Search events..." : "Search events, e.g. hackathon, workshop...";

  const html = `
    <div class="events-page-shell">
      
      <!-- HERO BANNER CARD (Editorial Mint Gradient) -->
      <div class="events-hero-card">
        <div class="events-hero-content">
          <span class="events-eyebrow">CAMPUS EVENTS</span>
          <h1 class="events-hero-title">Discover What's Happening<br class="desktop-br">at JNU</h1>
          <p class="events-hero-subtitle">
            Hackathons, workshops, seminars, cultural events and more.<br class="desktop-br">
            Stay updated and never miss an opportunity.
          </p>
        </div>
        <div class="events-hero-graphic-wrap">
          <img src="/static/img/redesign/events/events_hero_sketch.png" alt="Learn Grow Belong Together" class="events-hero-banner-illustration">
        </div>
      </div>

      <!-- FILTER & SEARCH BAR -->
      <div class="events-filter-bar">
        
        <!-- Desktop Pill Filters -->
        <div class="events-filter-pills desktop-only-flex" id="eventsFilterPillsDesktop">
          <button type="button" class="events-filter-pill ${currentEventsCategory === 'all' ? 'active' : ''}" onclick="setEventsFilter('all')">All Events</button>
          <button type="button" class="events-filter-pill ${currentEventsCategory === 'hackathons' ? 'active' : ''}" onclick="setEventsFilter('hackathons')">Hackathons</button>
          <button type="button" class="events-filter-pill ${currentEventsCategory === 'workshops' ? 'active' : ''}" onclick="setEventsFilter('workshops')">Workshops</button>
          <button type="button" class="events-filter-pill ${currentEventsCategory === 'seminars' ? 'active' : ''}" onclick="setEventsFilter('seminars')">Seminars</button>
          <button type="button" class="events-filter-pill ${currentEventsCategory === 'cultural' ? 'active' : ''}" onclick="setEventsFilter('cultural')">Cultural</button>
          <button type="button" class="events-filter-pill ${currentEventsCategory === 'competitions' ? 'active' : ''}" onclick="setEventsFilter('competitions')">Competitions</button>
          <button type="button" class="events-filter-pill ${currentEventsCategory === 'talks' ? 'active' : ''}" onclick="setEventsFilter('talks')">Talks</button>
          <button type="button" class="events-filter-pill ${currentEventsCategory === 'other' ? 'active' : ''}" onclick="setEventsFilter('other')">Other</button>
        </div>

        <!-- Search Box & Calendar Button (Desktop & Mobile) -->
        <div class="events-search-actions-wrap">
          <div class="events-search-box">
            <svg class="events-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="eventsSearchInput" class="events-search-input" placeholder="${escapeAttr(evSearchPlaceholder)}" value="${escapeAttr(currentEventsQuery)}" oninput="handleEventsSearchInput(this.value)">
          </div>

          <button type="button" class="events-calendar-btn" onclick="openEventsCalendarModal()" title="View Academic & Events Calendar" aria-label="Events Calendar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>
        </div>

      </div>

      <!-- Mobile Horizontally Scrolling Filter Pills (< 768px) -->
      <div class="events-filter-scroll-mobile mobile-only-flex" id="eventsFilterPillsMobile">
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'all' ? 'active' : ''}" onclick="setEventsFilter('all')">All</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'sih' ? 'active' : ''}" onclick="setEventsFilter('sih')">SIH</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'ctf' ? 'active' : ''}" onclick="setEventsFilter('ctf')">CTF</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'workshops' ? 'active' : ''}" onclick="setEventsFilter('workshops')">Workshops</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'seminars' ? 'active' : ''}" onclick="setEventsFilter('seminars')">Seminars</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'cultural' ? 'active' : ''}" onclick="setEventsFilter('cultural')">Cultural</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'talks' ? 'active' : ''}" onclick="setEventsFilter('talks')">Talks</button>
      </div>

      <!-- SECTION TITLE ROW -->
      <div class="events-section-header">
        <h2 class="events-section-title">Upcoming Events</h2>
        <button type="button" class="events-see-all-btn" onclick="setEventsFilter('all')">
          <span>See All</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>

      <!-- EVENTS DESKTOP GRID (3-Columns) -->
      <div class="events-grid-desktop desktop-only-grid" id="eventsDesktopGrid"></div>

      <!-- EVENTS MOBILE VERTICAL LIST (< 768px) -->
      <div class="events-list-mobile mobile-only-block" id="eventsMobileList"></div>

      <!-- EMPTY STATE (When search/filter has 0 matches) -->
      <div class="events-empty-state" id="eventsEmptyState" style="display:none;">
        <div class="events-empty-icon">🎪</div>
        <h3 class="events-empty-title">No events found</h3>
        <p class="events-empty-desc">Try modifying your search or select "All Events" to view upcoming campus schedules.</p>
        <button type="button" class="btn-create-team-primary" onclick="setEventsFilter('all')">View All Events</button>
      </div>

    </div>
  `;

  container.innerHTML = html;
  updateEventsDisplay();
}

function getFilteredEvents() {
  return CAMPUS_EVENTS_DATA.filter(evt => {
    let matchesCat = true;
    if (currentEventsCategory !== "all") {
      const c = currentEventsCategory.toLowerCase();
      if (c === "sih") {
        matchesCat = evt.id.includes("sih") || evt.category.toLowerCase() === "hackathons";
      } else if (c === "ctf") {
        matchesCat = evt.id.includes("ctf") || evt.category.toLowerCase() === "competitions";
      } else if (c === "other") {
        matchesCat = !["hackathons", "workshops", "seminars", "cultural", "competitions", "talks"].includes(evt.category.toLowerCase());
      } else {
        matchesCat = evt.category.toLowerCase() === c;
      }
    }

    let matchesQuery = true;
    if (currentEventsQuery.trim()) {
      const q = currentEventsQuery.trim().toLowerCase();
      matchesQuery = (
        evt.title.toLowerCase().includes(q) ||
        evt.summary.toLowerCase().includes(q) ||
        evt.details.toLowerCase().includes(q) ||
        evt.location.toLowerCase().includes(q) ||
        evt.category.toLowerCase().includes(q) ||
        evt.catBadge.toLowerCase().includes(q)
      );
    }

    return matchesCat && matchesQuery;
  });
}

function updateEventsDisplay() {
  const filtered = getFilteredEvents();
  const desktopContainer = document.getElementById("eventsDesktopGrid");
  const mobileContainer = document.getElementById("eventsMobileList");
  const emptyState = document.getElementById("eventsEmptyState");

  if (!desktopContainer || !mobileContainer) return;

  if (filtered.length === 0) {
    desktopContainer.innerHTML = "";
    mobileContainer.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  // Render Desktop 3-Column Grid Cards
  desktopContainer.innerHTML = filtered.map(evt => {
    const isInterested = userInterestedEventsSet.has(evt.id);
    const count = evt.interestedCount + (isInterested ? 1 : 0);

    return `
      <div class="event-card" onclick="openEventDetailModal('${evt.id}')">
        <!-- Banner Image -->
        <div class="event-card-banner">
          <img src="${escapeAttr(evt.image)}" alt="${escapeAttr(evt.title)}" class="event-card-img" loading="lazy">
        </div>

        <!-- Card Body -->
        <div class="event-card-body">
          <div class="event-meta-header">
            <div class="event-date-block">
              <span class="event-date-day">${escapeHtml(evt.day)}</span>
              <span class="event-date-month">${escapeHtml(evt.month)}</span>
            </div>
            <div class="event-title-meta-wrap">
              <h3 class="event-card-title">${escapeHtml(evt.title)}</h3>
              <div class="event-location-row">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z"></path>
                  <circle cx="12" cy="9" r="3"></circle>
                </svg>
                <span>${escapeHtml(evt.location)}</span>
              </div>
            </div>
          </div>

          <p class="event-card-desc">${escapeHtml(evt.summary)}</p>

          <!-- Card Footer -->
          <div class="event-card-footer">
            <div class="event-attendees-group">
              <div class="event-avatar-stack">
                <img src="${EVENT_SAMPLE_AVATARS[0]}" alt="Student" class="event-avatar-mini">
                <img src="${EVENT_SAMPLE_AVATARS[1]}" alt="Student" class="event-avatar-mini">
                <img src="${EVENT_SAMPLE_AVATARS[2]}" alt="Student" class="event-avatar-mini">
              </div>
              <span class="event-attendees-count">+${count} interested</span>
            </div>

            <button type="button" class="event-details-action-btn" onclick="event.stopPropagation(); openEventDetailModal('${evt.id}')">
              <span>View Details</span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Render Mobile Vertical Item List Cards (< 768px)
  mobileContainer.innerHTML = filtered.map(evt => {
    const isInterested = userInterestedEventsSet.has(evt.id);
    const count = evt.interestedCount + (isInterested ? 1 : 0);

    return `
      <div class="mobile-event-card-item" onclick="openEventDetailModal('${evt.id}')">
        <img src="${escapeAttr(evt.image)}" alt="${escapeAttr(evt.title)}" class="mobile-event-thumb" loading="lazy">
        
        <div class="mobile-event-center-info">
          <span class="mobile-cat-pill theme-${escapeAttr(evt.mobileBadgeTheme || 'mint')}">${escapeHtml(evt.mobileCatBadge || evt.catBadge)}</span>
          <h4 class="mobile-event-item-title">${escapeHtml(evt.title)}</h4>
          <div class="mobile-event-loc-line">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z"></path>
              <circle cx="12" cy="9" r="2.5"></circle>
            </svg>
            <span>${escapeHtml(evt.location)}</span>
          </div>
          <div class="mobile-event-attendees-row">
            <div class="event-avatar-stack">
              <img src="${EVENT_SAMPLE_AVATARS[0]}" alt="Student" class="event-avatar-mini mini-sm">
              <img src="${EVENT_SAMPLE_AVATARS[1]}" alt="Student" class="event-avatar-mini mini-sm">
              <img src="${EVENT_SAMPLE_AVATARS[2]}" alt="Student" class="event-avatar-mini mini-sm">
            </div>
            <span class="mobile-event-interested-text">+${count} interested</span>
          </div>
        </div>

        <div class="mobile-event-right-meta">
          <div class="mobile-date-capsule">
            <span class="mobile-date-num">${escapeHtml(evt.day)}</span>
            <span class="mobile-date-mo">${escapeHtml(evt.month)}</span>
          </div>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="mobile-event-chevron">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    `;
  }).join("");
}

function setEventsFilter(category) {
  currentEventsCategory = category;

  // Update desktop pills active class
  document.querySelectorAll(".events-filter-pill").forEach(btn => {
    const text = btn.innerText.toLowerCase();
    const isMatch = (
      (category === "all" && text.includes("all")) ||
      (category === "hackathons" && text.includes("hackathons")) ||
      (category === "workshops" && text.includes("workshops")) ||
      (category === "seminars" && text.includes("seminars")) ||
      (category === "cultural" && text.includes("cultural")) ||
      (category === "competitions" && text.includes("competitions")) ||
      (category === "talks" && text.includes("talks")) ||
      (category === "other" && text.includes("other"))
    );
    btn.classList.toggle("active", isMatch);
  });

  // Update mobile pills active class
  document.querySelectorAll(".events-filter-pill-mob").forEach(btn => {
    const text = btn.innerText.toLowerCase();
    const isMatch = (
      (category === "all" && text === "all") ||
      (category === "sih" && text === "sih") ||
      (category === "ctf" && text === "ctf") ||
      (category === "workshops" && text === "workshops") ||
      (category === "seminars" && text === "seminars") ||
      (category === "cultural" && text === "cultural") ||
      (category === "talks" && text === "talks")
    );
    btn.classList.toggle("active", isMatch);
  });

  updateEventsDisplay();
}

let eventsSearchTimeout = null;
function handleEventsSearchInput(val) {
  clearTimeout(eventsSearchTimeout);
  eventsSearchTimeout = setTimeout(() => {
    currentEventsQuery = val;
    updateEventsDisplay();
  }, 100);
}

function openEventDetailModal(eventId) {
  const evt = CAMPUS_EVENTS_DATA.find(e => e.id === eventId);
  if (!evt) return;

  const modal = document.getElementById("eventDetailModal");
  const content = document.getElementById("eventDetailModalContent");
  if (!modal || !content) return;

  const isInterested = userInterestedEventsSet.has(evt.id);
  const count = evt.interestedCount + (isInterested ? 1 : 0);

  content.innerHTML = `
    <div class="event-modal-card">
      
      <!-- Top Modal Banner -->
      <div class="event-modal-banner-wrap">
        <img src="${escapeAttr(evt.image)}" alt="${escapeAttr(evt.title)}" class="event-modal-banner-img">
        <button type="button" onclick="closeEventDetailModal()" class="event-modal-close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <span class="event-modal-cat-tag">${escapeHtml(evt.catBadge)}</span>
      </div>

      <!-- Modal Body -->
      <div class="event-modal-body">
        
        <div class="event-modal-title-row">
          <div>
            <h2 class="event-modal-title">${escapeHtml(evt.title)}</h2>
            <div class="event-modal-organizer">${escapeHtml(evt.organizer)}</div>
          </div>
          <div class="event-date-block lg">
            <span class="event-date-day">${escapeHtml(evt.day)}</span>
            <span class="event-date-month">${escapeHtml(evt.month)}</span>
          </div>
        </div>

        <!-- Key Meta Badges -->
        <div class="event-modal-meta-grid">
          <div class="event-modal-meta-item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <div>
              <strong>Time & Schedule</strong>
              <span>${escapeHtml(evt.time)}</span>
            </div>
          </div>
          <div class="event-modal-meta-item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z"></path><circle cx="12" cy="9" r="3"></circle></svg>
            <div>
              <strong>Location & Venue</strong>
              <span>${escapeHtml(evt.locationDetail || evt.location)}</span>
            </div>
          </div>
          <div class="event-modal-meta-item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            <div>
              <strong>Admission & Registration</strong>
              <span>${escapeHtml(evt.entryFee)}</span>
            </div>
          </div>
          <div class="event-modal-meta-item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <div>
              <strong>Eligibility</strong>
              <span>${escapeHtml(evt.eligibility)}</span>
            </div>
          </div>
        </div>

        <!-- Full Description -->
        <div class="event-modal-desc-box">
          <h4 class="event-modal-desc-heading">About This Event</h4>
          <p class="event-modal-desc-text">${escapeHtml(evt.details)}</p>
        </div>

        <!-- Attendee Social Row -->
        <div class="event-modal-social-row">
          <div class="event-attendees-group">
            <div class="event-avatar-stack">
              <img src="${EVENT_SAMPLE_AVATARS[0]}" alt="Student" class="event-avatar-mini">
              <img src="${EVENT_SAMPLE_AVATARS[1]}" alt="Student" class="event-avatar-mini">
              <img src="${EVENT_SAMPLE_AVATARS[2]}" alt="Student" class="event-avatar-mini">
            </div>
            <span class="event-attendees-count font-md">+${count} students interested</span>
          </div>

          <button type="button" id="btnInterestedToggle" class="btn-interested-toggle ${isInterested ? 'active' : ''}" onclick="toggleEventInterest('${evt.id}')">
            <span>${isInterested ? '★ Interested' : '☆ I\'m Interested'}</span>
          </button>
        </div>

        <!-- Action Buttons -->
        <div class="event-modal-actions-row">
          <button type="button" class="btn-secondary-pill" onclick="closeEventDetailModal()">Close</button>
          <button type="button" class="btn-primary-forest-pill" onclick="handleEventRegistration('${evt.id}')">
            <span>RSVP & Attend Event ➔</span>
          </button>
        </div>

      </div>

    </div>
  `;

  modal.style.display = "flex";
  document.body.classList.add("scroll-locked");
}

function closeEventDetailModal() {
  const modal = document.getElementById("eventDetailModal");
  if (modal) modal.style.display = "none";
  document.body.classList.remove("scroll-locked");
}

function toggleEventInterest(eventId) {
  const evt = CAMPUS_EVENTS_DATA.find(e => e.id === eventId);
  if (!evt) return;

  if (userInterestedEventsSet.has(eventId)) {
    userInterestedEventsSet.delete(eventId);
    showToast(`Removed from your interested events`, "info");
  } else {
    userInterestedEventsSet.add(eventId);
    showToast(`You are marked as interested in ${evt.title}!`, "success");
  }
  saveUserInterestedEvents();
  updateEventsDisplay();

  // Update modal button state dynamically if open
  const btn = document.getElementById("btnInterestedToggle");
  if (btn) {
    const isNow = userInterestedEventsSet.has(eventId);
    btn.classList.toggle("active", isNow);
    btn.innerHTML = `<span>${isNow ? '★ Interested' : '☆ I\'m Interested'}</span>`;
  }
}

function handleEventRegistration(eventId) {
  const evt = CAMPUS_EVENTS_DATA.find(e => e.id === eventId);
  if (!evt) return;

  if (!userInterestedEventsSet.has(eventId)) {
    userInterestedEventsSet.add(eventId);
    saveUserInterestedEvents();
    updateEventsDisplay();
  }

  showToast(`Registration confirmed for ${evt.title}! See you on ${evt.day} ${evt.month}.`, "success");
  setTimeout(() => {
    closeEventDetailModal();
  }, 1000);
}

function openEventsCalendarModal() {
  const modal = document.getElementById("eventDetailModal");
  const content = document.getElementById("eventDetailModalContent");
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="event-modal-card">
      <div class="event-modal-banner-wrap" style="background:linear-gradient(135deg, #0D2E1F 0%, #165337 100%); height:110px; display:flex; align-items:center; padding:20px 24px; color:#FFFFFF;">
        <button type="button" onclick="closeEventDetailModal()" class="event-modal-close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div>
          <span class="events-eyebrow" style="color:#86EFAC;">JNU CALENDAR</span>
          <h3 style="font-family:var(--font-serif); font-size:1.35rem; color:#FFFFFF; margin:2px 0 0 0;">Semester & Campus Events Timeline</h3>
        </div>
      </div>

      <div class="event-modal-body" style="padding:24px;">
        <div class="calendar-timeline-list">
          ${CAMPUS_EVENTS_DATA.map(e => `
            <div class="cal-timeline-item" onclick="openEventDetailModal('${e.id}')">
              <div class="cal-date-pill">
                <strong>${escapeHtml(e.day)}</strong>
                <span>${escapeHtml(e.month)}</span>
              </div>
              <div class="cal-item-info">
                <h4 class="cal-item-title">${escapeHtml(e.title)}</h4>
                <div class="cal-item-meta">📍 ${escapeHtml(e.location)} &bull; ${escapeHtml(e.time)}</div>
              </div>
              <span class="mobile-cat-pill theme-${escapeAttr(e.mobileBadgeTheme || 'mint')}">${escapeHtml(e.catBadge)}</span>
            </div>
          `).join("")}
        </div>

        <div style="margin-top:20px; text-align:right;">
          <button type="button" class="btn-primary-forest-pill" onclick="closeEventDetailModal()">Close Calendar</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  document.body.classList.add("scroll-locked");
}

/* ==========================================================================
   17. ACADEMIC & CAMPUS RESOURCES ENGINE & DATASETS
   ========================================================================== */
const CAMPUS_RESOURCES_DATA = [
  {
    id: "res-pyqs",
    title: "JNU PYQs",
    category: "Exams",
    categoryGroup: ["all", "academic", "exams"],
    image: "/static/img/redesign/resources/res_pyqs.png",
    mobileThumb: "/static/img/redesign/resources/mob_thumb_pyqs.png",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    description: "Previous year question papers for all courses and semesters.",
    metric: "📄 2.4K+ Papers",
    fullDescription: "Comprehensive database of past 6 years end-semester and mid-term examination question papers across B.Tech (Computer Science, AI, IT, EE, ME, Civil), MCA, BCA, and Allied Sciences. Searchable by subject code, year, and faculty.",
    tags: ["Question Papers", "Mid-Term", "End-Semester", "All Programs"],
    links: [
      { name: "B.Tech CSE & AI End-Semester Archive (2019-2024)", type: "Cloud Archive", size: "840+ PDFs" },
      { name: "MCA / BCA Question Papers & Model Answers", type: "PDF Library", size: "620+ PDFs" },
      { name: "Engineering Sciences & Core Mathematics", type: "Subject Bank", size: "410+ PDFs" }
    ]
  },
  {
    id: "res-syllabus",
    title: "Syllabus",
    category: "Academic",
    categoryGroup: ["all", "academic"],
    image: "/static/img/redesign/resources/res_syllabus.png",
    mobileThumb: "/static/img/redesign/resources/mob_thumb_syllabus.png",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
    description: "Latest syllabus for all programs and subjects.",
    metric: "📖 500+ Syllabi",
    fullDescription: "Official curriculum blueprints, subject syllabi, credit distribution matrices, and elective lists approved by the Academic Council for current undergraduate and postgraduate batches.",
    tags: ["Curriculum", "Credit Schemes", "Elective Lists", "Course Outlines"],
    links: [
      { name: "B.Tech Computer Science Curriculum (CBCS Scheme)", type: "Official Document", size: "Semesters 1-8" },
      { name: "MCA Revised Syllabus & Specializations", type: "Official Document", size: "Semesters 1-4" },
      { name: "BCA Semester Scheme & Lab Guidelines", type: "Official Document", size: "Semesters 1-6" }
    ]
  },
  {
    id: "res-notes",
    title: "Notes & Study Material",
    category: "Academic",
    categoryGroup: ["all", "academic"],
    image: "/static/img/redesign/resources/res_notes.png",
    mobileThumb: "/static/img/redesign/resources/mob_thumb_notes.png",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`,
    description: "Class notes, study resources and shared materials.",
    metric: "📝 1.8K+ Resources",
    fullDescription: "Verified student toppers' handwritten notebooks, professor presentation slide decks, exam cheat-sheets, and concise revision summaries categorized by unit and topic.",
    tags: ["Handwritten Notes", "Faculty Slides", "Quick Revision", "Exam Cheat Sheets"],
    links: [
      { name: "Data Structures, Algorithms & Complexity Notes", type: "Curated PDF", size: "Topper Verified" },
      { name: "Database Systems & SQL Comprehensive Guide", type: "Lecture Slides", size: "Complete 5 Units" },
      { name: "Operating Systems & Networking Quick Revision", type: "Summary Sheets", size: "High-Yield" }
    ]
  },
  {
    id: "res-calendar",
    title: "Academic Calendar",
    category: "Campus Life",
    categoryGroup: ["all", "campus life", "academic"],
    image: "/static/img/redesign/resources/res_calendar.png",
    mobileThumb: "/static/img/redesign/resources/mob_thumb_calendar.png",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    description: "Important academic dates, exam schedules and notifications.",
    metric: "📅 Latest Updates",
    fullDescription: "Official university academic calendar featuring class commencement dates, mid-term evaluation periods, preparatory leaves, gazetted holidays, and university festival weeks.",
    tags: ["Academic Calendar", "Exam Schedules", "University Holidays", "Timetable"],
    links: [
      { name: "Official JNU Academic Calendar 2025-2026", type: "PDF Notice", size: "Verified" },
      { name: "Semester End Exam Datesheet & Guidelines", type: "Notice Board", size: "Live Update" }
    ]
  },
  {
    id: "res-placements",
    title: "Placements",
    category: "Placements",
    categoryGroup: ["all", "placements", "career"],
    image: "/static/img/redesign/resources/res_placements.png",
    mobileThumb: "/static/img/redesign/resources/mob_thumb_placements.png",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    description: "Placement drives, interview experiences and preparation resources.",
    metric: "💼 300+ Resources",
    fullDescription: "Training and placement cell preparation repository. Includes company-specific test question patterns, real interview transcripts, coding rounds practice sheets, and ATS-friendly resume templates.",
    tags: ["Placement Drives", "Interview Experiences", "Coding Tests", "Resumes"],
    links: [
      { name: "Top 150 Technical Interview Questions & Solutions", type: "Interview Guide", size: "Comprehensive" },
      { name: "Verified Student Placement Debriefs & Patterns", type: "Alumni Archive", size: "120+ Stories" },
      { name: "Engineers ATS Resume Templates (LaTeX & DOCX)", type: "Template Pack", size: "8 Styles" }
    ]
  },
  {
    id: "res-career",
    title: "Career Guidance",
    category: "Career",
    categoryGroup: ["all", "career"],
    image: "/static/img/redesign/resources/res_career.png",
    mobileThumb: "/static/img/redesign/resources/mob_thumb_career.png",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`,
    description: "Guides, roadmaps and resources to help you plan your future.",
    metric: "👥 200+ Guides",
    fullDescription: "Step-by-step developer roadmaps for Full-Stack, AI Engineering, Cloud & DevOps, and Higher Education pathways (GATE, GRE, CAT, civil services).",
    tags: ["Roadmaps", "GATE Prep", "Certifications", "Career Tracks"],
    links: [
      { name: "Software Engineer Interactive Roadmap 2025", type: "Visual Guide", size: "All Tracks" },
      { name: "GATE CS & IT Comprehensive Subject Tracker", type: "Study Plan", size: "Full Syllabus" },
      { name: "Cloud Architecture & Certification Free Paths", type: "Curated Kit", size: "AWS & GCP" }
    ]
  },
  {
    id: "res-ideas",
    title: "Project Ideas",
    category: "Academic",
    categoryGroup: ["all", "academic", "career"],
    image: "/static/img/redesign/resources/res_ideas.png",
    mobileThumb: "/static/img/redesign/resources/mob_thumb_ideas.png",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>`,
    description: "Mini projects, major projects and research ideas.",
    metric: "💡 150+ Ideas",
    fullDescription: "High-impact major and minor capstone project prompts. Complete with technical architecture diagrams, recommended tech stack, datasets, API documentation, and presentation decks.",
    tags: ["Capstone Projects", "Mini Projects", "AI & Web3", "IoT & Hardware"],
    links: [
      { name: "AI/ML Real-World Problem Statements & Datasets", type: "Project Kit", size: "45 Blueprints" },
      { name: "Full-Stack Web & Distributed Systems Projects", type: "Architecture Specs", size: "35 Blueprints" },
      { name: "Smart Campus & Internet of Things Prototypes", type: "Hardware Schematics", size: "25 Blueprints" }
    ]
  },
  {
    id: "res-community",
    title: "Student Community",
    category: "Campus Life",
    categoryGroup: ["all", "campus life"],
    image: "/static/img/redesign/resources/res_community.png",
    mobileThumb: "/static/img/redesign/resources/mob_thumb_community.png",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    description: "Useful links, study groups and student initiatives.",
    metric: "👥 100+ Links",
    fullDescription: "Direct access channels to student-led societies, coding circles, hackathon squads, open-source cohorts, peer mentor lounges, and cultural interest circles.",
    tags: ["Discord Server", "WhatsApp Guilds", "Coding Circles", "Student Clubs"],
    links: [
      { name: "JNU Hackathon Squad & Coders Discord Hub", type: "Discord Community", size: "1,400+ Members" },
      { name: "Open Source Engineers WhatsApp Guild", type: "Community Group", size: "480+ Students" },
      { name: "Competitive Programming & Problem Solving Circle", type: "Weekly Meetups", size: "Active" }
    ]
  },
  {
    id: "res-links",
    title: "Useful Links",
    category: "Others",
    categoryGroup: ["all", "others"],
    image: "/static/img/redesign/resources/res_links.png",
    mobileThumb: "/static/img/redesign/resources/mob_thumb_links.png",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
    description: "Important university links and external resources.",
    metric: "🔗 250+ Links",
    fullDescription: "Curated portal directory with fast links to the JNU Student ERP, Central Digital Library, Fee Payment Portal, Result Inquiries, Bus Timings, and Hostel Administration.",
    tags: ["ERP Portal", "Library Access", "Examination Portal", "Campus Helpline"],
    links: [
      { name: "Jaipur National University Student ERP Portal", type: "Official Gateway", size: "Direct Portal" },
      { name: "JNU Digital Library & Research Gateways", type: "Academic Portal", size: "Direct Portal" },
      { name: "University Examinations & Grade Card Portal", type: "Results Gateway", size: "Direct Portal" }
    ]
  }
];

let currentResourcesCategory = "all";
let currentResourcesQuery = "";

function loadResourcesView() {
  const container = document.getElementById("resourcesViewContainer");
  if (!container) return;
  currentResourcesCategory = "all";
  currentResourcesQuery = "";
  renderResourcesPage();
}

function renderResourcesPage() {
  const container = document.getElementById("resourcesViewContainer");
  if (!container) return;

  const resSearchPlaceholder = (typeof window !== "undefined" && window.innerWidth <= 768) ? "Search resources..." : "Search resources (e.g. PYQs, notes, syllabus, placement, etc.)";

  const html = `
    <div class="resources-page-shell">
      
      <!-- HERO BANNER CARD (Editorial Mint Gradient) -->
      <div class="resources-hero-card">
        <div class="resources-hero-content">
          <span class="resources-eyebrow">RESOURCES</span>
          <h1 class="resources-hero-title">Learn. Prepare. Grow.</h1>
          <p class="resources-hero-subtitle">
            All the resources you need for your academic and campus journey, curated in one place.
          </p>
        </div>
        <div class="resources-hero-graphic-wrap">
          <img src="/static/img/redesign/resources/resources_hero_sketch.png" alt="Knowledge Shapes Brighter Tomorrows." class="resources-hero-banner-illustration">
        </div>
      </div>

      <!-- FULL-WIDTH SEARCH BAR -->
      <div class="resources-search-container">
        <div class="resources-search-wrap">
          <svg class="resources-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="resourcesSearchInput" class="resources-search-input" placeholder="${escapeAttr(resSearchPlaceholder)}" value="${escapeAttr(currentResourcesQuery)}" oninput="handleResourcesSearchInput(this.value)">
        </div>
      </div>

      <!-- FILTER ROW: Category Pills (Left) & Editorial Quote (Right) -->
      <div class="resources-filter-row">
        
        <!-- Desktop Category Pills -->
        <div class="resources-filter-pills desktop-only-flex" id="resourcesFilterPillsDesktop">
          <button type="button" class="resources-filter-pill ${currentResourcesCategory === 'all' ? 'active' : ''}" onclick="setResourcesFilter('all')">All</button>
          <button type="button" class="resources-filter-pill ${currentResourcesCategory === 'academic' ? 'active' : ''}" onclick="setResourcesFilter('academic')">Academic</button>
          <button type="button" class="resources-filter-pill ${currentResourcesCategory === 'exams' ? 'active' : ''}" onclick="setResourcesFilter('exams')">Exams</button>
          <button type="button" class="resources-filter-pill ${currentResourcesCategory === 'placements' ? 'active' : ''}" onclick="setResourcesFilter('placements')">Placements</button>
          <button type="button" class="resources-filter-pill ${currentResourcesCategory === 'career' ? 'active' : ''}" onclick="setResourcesFilter('career')">Career</button>
          <button type="button" class="resources-filter-pill ${currentResourcesCategory === 'campus life' ? 'active' : ''}" onclick="setResourcesFilter('campus life')">Campus Life</button>
          <button type="button" class="resources-filter-pill ${currentResourcesCategory === 'others' ? 'active' : ''}" onclick="setResourcesFilter('others')">Others</button>
        </div>

        <!-- Right Side Cursive Script Quote -->
        <div class="resources-quote-box desktop-only-flex">
          <span class="resources-quote-divider"></span>
          <span class="resources-quote-script">“Better Resources. Brighter Futures.”</span>
        </div>

      </div>

      <!-- Mobile Horizontally Scrolling Filter Pills (< 768px) -->
      <div class="resources-filter-scroll-mobile mobile-only-flex" id="resourcesFilterPillsMobile">
        <button type="button" class="resources-filter-pill-mob ${currentResourcesCategory === 'all' ? 'active' : ''}" onclick="setResourcesFilter('all')">All</button>
        <button type="button" class="resources-filter-pill-mob ${currentResourcesCategory === 'academic' ? 'active' : ''}" onclick="setResourcesFilter('academic')">Academic</button>
        <button type="button" class="resources-filter-pill-mob ${currentResourcesCategory === 'exams' ? 'active' : ''}" onclick="setResourcesFilter('exams')">Exams</button>
        <button type="button" class="resources-filter-pill-mob ${currentResourcesCategory === 'placements' ? 'active' : ''}" onclick="setResourcesFilter('placements')">Placements</button>
        <button type="button" class="resources-filter-pill-mob ${currentResourcesCategory === 'career' ? 'active' : ''}" onclick="setResourcesFilter('career')">Career</button>
        <button type="button" class="resources-filter-pill-mob ${currentResourcesCategory === 'campus life' ? 'active' : ''}" onclick="setResourcesFilter('campus life')">Campus Life</button>
        <button type="button" class="resources-filter-pill-mob ${currentResourcesCategory === 'others' ? 'active' : ''}" onclick="setResourcesFilter('others')">Others</button>
      </div>

      <!-- RESOURCES DESKTOP 3x3 GRID -->
      <div class="resources-grid-desktop desktop-only-grid" id="resourcesDesktopGrid"></div>

      <!-- RESOURCES MOBILE VERTICAL LIST (< 768px) -->
      <div class="resources-list-mobile mobile-only-block" id="resourcesMobileList"></div>

      <!-- EMPTY STATE -->
      <div class="resources-empty-state" id="resourcesEmptyState" style="display:none;">
        <div class="resources-empty-icon">📚</div>
        <h3 class="resources-empty-title">No resources found</h3>
        <p class="resources-empty-desc">No academic materials matched your query. Try searching for PYQs, notes, or syllabus.</p>
        <button type="button" class="btn-create-team-primary" onclick="setResourcesFilter('all')">View All Resources</button>
      </div>

      <!-- EDITORIAL FOOTER (Matching media_1789755997604.jpg) -->
      <footer class="resources-editorial-footer">
        <div class="resources-footer-left">
          &copy; 2026 JnuMate. All rights reserved.
        </div>
        <div class="resources-footer-center">
          <img src="/static/img/redesign/otp_desktop_building.png" alt="Campus Watermark" class="resources-footer-sketch">
          <div class="resources-footer-script">
            <span>Learn</span>
            <span>Grow</span>
            <span>Belong</span>
            <em>Together.</em>
          </div>
        </div>
        <div class="resources-footer-right">
          <a href="javascript:void(0)" onclick="navigateTo('/about')" class="resources-footer-link">About</a>
          <span class="resources-footer-dot">|</span>
          <a href="javascript:void(0)" onclick="showToast('Help center & documentation active', 'info')" class="resources-footer-link">Help</a>
          <span class="resources-footer-dot">|</span>
          <a href="mailto:inbox.afrozalam@gmail.com" class="resources-footer-link">Contact</a>
        </div>
      </footer>

    </div>
  `;

  container.innerHTML = html;
  updateResourcesDisplay();
}

function getFilteredResources() {
  return CAMPUS_RESOURCES_DATA.filter(res => {
    let matchesCat = true;
    if (currentResourcesCategory !== "all") {
      const c = currentResourcesCategory.toLowerCase();
      matchesCat = res.categoryGroup.includes(c) || res.category.toLowerCase() === c;
    }

    let matchesQuery = true;
    if (currentResourcesQuery.trim()) {
      const q = currentResourcesQuery.trim().toLowerCase();
      matchesQuery = (
        res.title.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q) ||
        res.fullDescription.toLowerCase().includes(q) ||
        res.category.toLowerCase().includes(q) ||
        res.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return matchesCat && matchesQuery;
  });
}

function updateResourcesDisplay() {
  const filtered = getFilteredResources();
  const desktopContainer = document.getElementById("resourcesDesktopGrid");
  const mobileContainer = document.getElementById("resourcesMobileList");
  const emptyState = document.getElementById("resourcesEmptyState");

  if (!desktopContainer || !mobileContainer) return;

  if (filtered.length === 0) {
    desktopContainer.innerHTML = "";
    mobileContainer.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  // Desktop 3x3 Grid of 9 Cards
  desktopContainer.innerHTML = filtered.map(res => {
    return `
      <div class="resource-card" onclick="openResourceDetailModal('${res.id}')">
        
        <!-- Top Image (Baked-in icon badge) -->
        <div class="resource-card-image-wrap">
          <img src="${escapeAttr(res.image)}" alt="${escapeAttr(res.title)}" class="resource-card-img" loading="lazy">
        </div>

        <!-- Card Content -->
        <div class="resource-card-content">
          <div>
            <h3 class="resource-card-title">${escapeHtml(res.title)}</h3>
            <p class="resource-card-desc">${escapeHtml(res.description)}</p>
          </div>

          <!-- Bottom Row with Metric & Arrow Action Button -->
          <div class="resource-card-bottom-row">
            <span class="resource-metric-pill">${escapeHtml(res.metric)}</span>
            <button type="button" class="resource-action-circle-btn" onclick="event.stopPropagation(); openResourceDetailModal('${res.id}')" aria-label="Open Resource">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

      </div>
    `;
  }).join("");

  // Mobile Vertical Resource List Cards (< 768px)
  mobileContainer.innerHTML = filtered.map(res => {
    const thumbSrc = res.mobileThumb || res.image;
    return `
      <div class="mobile-resource-card-item" onclick="openResourceDetailModal('${res.id}')">
        
        <img src="${escapeAttr(thumbSrc)}" alt="${escapeAttr(res.title)}" class="mobile-res-thumb" loading="lazy">
        
        <div class="mobile-res-icon-box">
          ${res.iconSvg}
        </div>

        <div class="mobile-res-info-column">
          <h4 class="mobile-res-item-title">${escapeHtml(res.title)}</h4>
          <p class="mobile-res-item-desc">${escapeHtml(res.description)}</p>
          <div class="mobile-res-metric-tag">${escapeHtml(res.metric)}</div>
        </div>

        <div class="mobile-res-right-chevron">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#16A34A" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

      </div>
    `;
  }).join("");
}

function setResourcesFilter(category) {
  currentResourcesCategory = category;

  // Update desktop pills
  document.querySelectorAll(".resources-filter-pill").forEach(btn => {
    const text = btn.innerText.toLowerCase();
    const isMatch = (
      (category === "all" && text === "all") ||
      (category === "academic" && text === "academic") ||
      (category === "exams" && text === "exams") ||
      (category === "placements" && text === "placements") ||
      (category === "career" && text === "career") ||
      (category === "campus life" && text === "campus life") ||
      (category === "others" && text === "others")
    );
    btn.classList.toggle("active", isMatch);
  });

  // Update mobile pills
  document.querySelectorAll(".resources-filter-pill-mob").forEach(btn => {
    const text = btn.innerText.toLowerCase();
    const isMatch = (
      (category === "all" && text === "all") ||
      (category === "academic" && text === "academic") ||
      (category === "exams" && text === "exams") ||
      (category === "placements" && text === "placements") ||
      (category === "career" && text === "career") ||
      (category === "campus life" && text === "campus life") ||
      (category === "others" && text === "others")
    );
    btn.classList.toggle("active", isMatch);
  });

  updateResourcesDisplay();
}

let resourcesSearchTimeout = null;
function handleResourcesSearchInput(val) {
  clearTimeout(resourcesSearchTimeout);
  resourcesSearchTimeout = setTimeout(() => {
    currentResourcesQuery = val;
    updateResourcesDisplay();
  }, 100);
}

function openResourceDetailModal(resourceId) {
  const res = CAMPUS_RESOURCES_DATA.find(r => r.id === resourceId);
  if (!res) return;

  const modal = document.getElementById("resourceDetailModal");
  const content = document.getElementById("resourceDetailModalContent");
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="resource-modal-card">
      
      <div class="resource-modal-banner-wrap">
        <img src="${escapeAttr(res.image)}" alt="${escapeAttr(res.title)}" class="resource-modal-banner-img">
        <button type="button" onclick="closeResourceDetailModal()" class="event-modal-close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="resource-modal-floating-icon">
          ${res.iconSvg}
        </div>
      </div>

      <div class="resource-modal-body">
        
        <div class="resource-modal-title-row">
          <div>
            <h2 class="resource-modal-title">${escapeHtml(res.title)}</h2>
            <p class="resource-modal-subtitle">${escapeHtml(res.description)}</p>
          </div>
          <span class="resource-metric-pill lg">${escapeHtml(res.metric)}</span>
        </div>

        <div class="resource-tags-cloud">
          ${res.tags.map(t => `<span class="resource-tag-pill">${escapeHtml(t)}</span>`).join("")}
        </div>

        <div class="resource-modal-desc-box">
          <h4 class="event-modal-desc-heading">About This Resource</h4>
          <p class="event-modal-desc-text">${escapeHtml(res.fullDescription)}</p>
        </div>

        <!-- Available Downloads & Drive Folders -->
        <div class="resource-links-section">
          <h4 class="event-modal-desc-heading">Available Materials & Directories</h4>
          <div class="resource-links-list">
            ${res.links.map(item => `
              <div class="resource-link-row">
                <div class="resource-link-icon-wrap">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                </div>
                <div class="resource-link-details">
                  <strong class="resource-link-name">${escapeHtml(item.name)}</strong>
                  <span class="resource-link-type">${escapeHtml(item.type)} &bull; ${escapeHtml(item.size)}</span>
                </div>
                <button type="button" class="btn-download-pill" onclick="handleDownloadResource('${escapeAttr(item.name)}')">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>Access</span>
                </button>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="event-modal-actions-row">
          <button type="button" class="btn-secondary-pill" onclick="closeResourceDetailModal()">Close</button>
          <button type="button" class="btn-primary-forest-pill" onclick="handleBookmarkResource('${res.id}')">
            <span>Bookmark Resource ★</span>
          </button>
        </div>

      </div>

    </div>
  `;

  modal.style.display = "flex";
  document.body.classList.add("scroll-locked");
}

function closeResourceDetailModal() {
  const modal = document.getElementById("resourceDetailModal");
  if (modal) modal.style.display = "none";
  document.body.classList.remove("scroll-locked");
}

function handleDownloadResource(name) {
  showToast(`Opening ${name}...`, "success");
}

function handleBookmarkResource(id) {
  const res = CAMPUS_RESOURCES_DATA.find(r => r.id === id);
  showToast(`${res ? res.title : 'Resource'} bookmarked to your profile!`, "success");
  closeResourceDetailModal();
}

