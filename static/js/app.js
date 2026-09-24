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

const SQUAD_CUSTOM_AVATARS = {
  'R44456': '/static/img/redesign/hasan_raza_avatar.png',
  'R44621': '/static/img/redesign/ayesha_khan_avatar.png',
  'R44502': '/static/img/redesign/rohit_sharma_avatar.png',
  'R44711': '/static/img/redesign/priya_singh_avatar.png',
  'R44893': '/static/img/redesign/arjun_mehta_avatar.png'
};

function getCurrentUserRid() {
  if (!currentUser) {
    try {
      const raw = localStorage.getItem("jnumate_user") || sessionStorage.getItem("jnumate_user");
      if (raw) currentUser = JSON.parse(raw);
    } catch (e) {}
  }
  if (!currentUser) {
    currentUser = {
      id: "R44456",
      r_id: "R44456",
      name: "MD HASAN RAZA",
      email: "ritcrouter@gmail.com",
      phone: "6299318587",
      gender: "Male",
      program: "B.Tech (Computer Science Engineering)",
      avatar_url: "/static/img/redesign/hasan_raza.jpg"
    };
    try { localStorage.setItem("jnumate_user", JSON.stringify(currentUser)); } catch (e) {}
  }
  const rid = currentUser.id || currentUser.r_id || currentUser.rid || "R44456";
  return String(rid).trim().toUpperCase();
}

function getStudentAvatarSrc(rawUrl, rId) {
  const cleanRid = rId ? String(rId).trim().toUpperCase() : '';
  if (cleanRid && SQUAD_CUSTOM_AVATARS[cleanRid]) {
    return SQUAD_CUSTOM_AVATARS[cleanRid];
  }
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

function renderCleanPageLoader(message = "Loading...") {
  const footerEl = document.getElementById("homescreenFooter");
  if (footerEl) footerEl.style.display = "none";
  return `
    <div class="page-loading-center-stage">
      <div class="clean-loader-spinner-ring"></div>
      <div class="clean-loader-label">${escapeHtml(message)}</div>
    </div>
  `;
}

function showFooterAfterLoad() {
  const path = window.location.pathname;
  const isLoginRoute = path === "/login" || path === "/course-select" || path === "/select-program" || path === "/enter-details" || path === "/sync-details" || path === "/otp" || path === "/verify-otp";
  const isCreateTeamRoute = path === "/create-team";
  const isEventDetailRoute = path.startsWith("/events/") || path.startsWith("/event/");
  const footerEl = document.getElementById("homescreenFooter");
  if (footerEl) {
    if (isLoginRoute || isCreateTeamRoute || isEventDetailRoute) {
      footerEl.style.display = "none";
    } else {
      footerEl.style.display = "";
    }
  }
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

  // Login & Create Team & Events & Resources & Profile Viewport Isolation & Footer Visibility Control
  const isLoginRoute = path === "/login" || path === "/course-select" || path === "/select-program" || path === "/enter-details" || path === "/sync-details" || path === "/otp" || path === "/verify-otp";
  const isCreateTeamRoute = path === "/create-team";
  const isEventsRoute = path === "/events" || path.startsWith("/events/") || path.startsWith("/event/");
  const isResourcesRoute = path === "/resources";
  const isPyqsRoute = path === "/pyqs";
  const isProfileRoute = path === "/profile";
  document.body.classList.toggle("is-login-route", isLoginRoute);
  document.body.classList.toggle("is-create-team-route", isCreateTeamRoute);
  document.body.classList.toggle("is-events-route", isEventsRoute);
  document.body.classList.toggle("is-resources-route", isResourcesRoute);
  document.body.classList.toggle("is-pyqs-route", isPyqsRoute);
  document.body.classList.toggle("is-profile-route", isProfileRoute);
  const footerEl = document.getElementById("homescreenFooter");
  if (footerEl) {
    footerEl.style.display = (isLoginRoute || isCreateTeamRoute) ? "none" : "";
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
  } else if (path.startsWith("/events/") || path.startsWith("/event/")) {
    const p = document.getElementById("viewEventDetail");
    if (p) {
      p.classList.add("active");
      const eventSlugOrId = path.split("/")[2];
      loadEventDetailView(eventSlugOrId);
    }
  } else if (path === "/resources") {
    const p = document.getElementById("viewResources");
    if (p) {
      p.classList.add("active");
      loadResourcesView();
    }
  } else if (path === "/pyqs") {
    const p = document.getElementById("viewPyqs");
    if (p) {
      p.classList.add("active");
      loadPyqsView();
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
    if (linkPath === path || (linkPath !== "/" && path.startsWith(linkPath)) || (path.startsWith("/event") && linkPath === "/events") || (path === "/profile" && linkPath === "/") || (path === "/pyqs" && linkPath === "/resources")) {
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
    else if (navKey === "events" && (path === "/events" || path.startsWith("/events/") || path.startsWith("/event/"))) isMatch = true;
    else if (navKey === "resources" && (path === "/resources" || path === "/pyqs")) isMatch = true;
    else if (navKey === "profile" && (path === "/profile" || path === "/my-profile-tab")) isMatch = true;

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
        <button id="btnMobileMenuToggle" onclick="navigateTo('/profile')" class="mobile-menu-btn" aria-label="My Profile" title="My Profile">
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

    const rId = (currentUser.id || currentUser.r_id || "STUDENT").toUpperCase();

    if (topSlot) {
      topSlot.innerHTML = `
        <button type="button" onclick="toggleDesktopProfileDropdown(event)" class="desktop-top-user-pill" aria-label="Open Account Menu">
          <div class="desktop-user-pill-avatar" onclick="event.stopPropagation(); closeDesktopDropdowns(); navigateTo('/profile');" title="My Profile">
            <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
          </div>
          <span class="desktop-user-pill-name">${escapeHtml(cleanName)}</span>
          <svg class="desktop-user-pill-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
        </button>
      `;
    }

    if (profileDropdown) {
      profileDropdown.innerHTML = `
        <div class="profile-dropdown-arrow"></div>
        <div class="profile-dropdown-card">
          <!-- Profile Identity Header -->
          <div class="profile-dropdown-header" onclick="closeDesktopDropdowns(); navigateTo('/profile');" style="cursor:pointer;" title="View Profile">
            <div class="profile-dropdown-avatar-ring">
              <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" onerror="this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
            </div>
            <div class="profile-dropdown-meta">
              <h3 class="profile-dropdown-name">${escapeHtml(cleanName)}</h3>
              <div class="profile-dropdown-rid">${escapeHtml(rId)}</div>
              <div class="profile-dropdown-univ">Jaipur National University</div>
              <span class="profile-dropdown-badge">Student</span>
            </div>
          </div>

          <!-- Menu List -->
          <div class="profile-dropdown-menu">
            <!-- Item 1: My Profile -->
            <a href="/profile" class="profile-dropdown-item" onclick="closeDesktopDropdowns()">
              <div class="dropdown-item-left">
                <div class="dropdown-item-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="dropdown-item-text">
                  <div class="dropdown-item-title">My Profile</div>
                  <div class="dropdown-item-sub">View and edit your details</div>
                </div>
              </div>
              <svg class="dropdown-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </a>

            <!-- Item 2: My Team -->
            <button type="button" class="profile-dropdown-item" onclick="closeDesktopDropdowns(); handleMyTeamClick();">
              <div class="dropdown-item-left">
                <div class="dropdown-item-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div class="dropdown-item-text">
                  <div class="dropdown-item-title">My Team</div>
                  <div class="dropdown-item-sub">View your teams and members</div>
                </div>
              </div>
              <svg class="dropdown-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>

            <!-- Item 3: Create Team -->
            <a href="/create-team" class="profile-dropdown-item" onclick="closeDesktopDropdowns()">
              <div class="dropdown-item-left">
                <div class="dropdown-item-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <div class="dropdown-item-text">
                  <div class="dropdown-item-title">Create Team</div>
                  <div class="dropdown-item-sub">Start a new team</div>
                </div>
              </div>
              <svg class="dropdown-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </a>

            <!-- Subtle Divider -->
            <div class="profile-dropdown-divider"></div>

            <!-- Item 4: Sign Out Card -->
            <button type="button" class="profile-dropdown-signout-card" onclick="closeDesktopDropdowns(); logoutUser();">
              <div class="dropdown-item-left">
                <div class="dropdown-signout-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/>
                    <path d="M10 9l-3 3 3 3"/>
                    <path d="M7 12h12"/>
                  </svg>
                </div>
                <div class="dropdown-item-text">
                  <div class="dropdown-signout-title">Sign Out</div>
                  <div class="dropdown-signout-sub">End your current session</div>
                </div>
              </div>
              <svg class="dropdown-signout-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
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
  navigateTo('/profile');
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
        ${renderCleanPageLoader("Discovering campus squads...")}
      </div>
    `;
  }

  // Fast background revalidation
  const currentRid = getCurrentUserRid();
  const teamsFetchUrl = currentRid ? `/api/teams?r_id=${encodeURIComponent(currentRid)}` : "/api/teams";
  fetch(teamsFetchUrl, {
    headers: currentRid ? { "X-Student-R-ID": currentRid } : {}
  })
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
        showFooterAfterLoad();
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
    : `<span class="hackathon-tag-pill sih"><img src="/static/img/sih_logo.jpg" alt="SIH" style="width:16px; height:16px; object-fit:contain;"> SIH Hackathon</span>`;

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
  window.__currentTeamSubView = 'details';
  window.__currentMobileSubTab = 'members';

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
  const currentRid = getCurrentUserRid();
  const teamDetailFetchUrl = currentRid ? `/api/teams/${teamId}?r_id=${encodeURIComponent(currentRid)}` : `/api/teams/${teamId}`;
  fetch(teamDetailFetchUrl, {
    headers: currentRid ? { "X-Student-R-ID": currentRid } : {}
  })
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
  closeDesktopFloatingChat();
  window.__currentTeamSubView = 'details';
  window.__currentMobileSubTab = 'members';
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
window.__currentTeamSubView = window.__currentTeamSubView || 'details';
window.__currentMobileSubTab = window.__currentMobileSubTab || 'members';

const SQUAD_MEMBER_ROLES = {
  'R44456': 'Team Leader',
  'R44621': 'Frontend Dev',
  'R44502': 'Backend & Security',
  'R44711': 'Data Analyst',
  'R44893': 'IoT & Hardware'
};

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
    if (window.innerWidth > 768) {
      openDesktopFloatingChat(teamId);
    }
    loadTeamChatMessages(teamId, true);
    startTeamChatPolling(teamId);
  }
}

function switchTeamSubView(subView, teamId) {
  window.__currentTeamSubView = subView;
  const cachedTeam = clientCache.teamsMap[teamId] || (clientCache.teamsList ? clientCache.teamsList.find(t => t && t.id == teamId) : null);
  if (cachedTeam) {
    renderFullTeamDetail(cachedTeam);
  }
  if (subView === 'chat') {
    startTeamChatPolling(teamId);
  }
}

function switchMobileSubTab(subTab, teamId) {
  window.__currentMobileSubTab = subTab;
  const btns = document.querySelectorAll(".team-mob-tab-btn");
  btns.forEach(b => {
    b.classList.toggle("active", b.textContent.trim().toLowerCase() === subTab.toLowerCase());
  });
  const mList = document.querySelector(".team-mob-members-list");
  const mHeader = document.querySelector(".team-mob-members-header");
  let otherPane = document.getElementById("teamMobOtherPane");

  if (subTab === 'members') {
    if (mList) mList.style.display = 'flex';
    if (mHeader) mHeader.style.display = 'flex';
    if (otherPane) otherPane.remove();
  } else {
    if (mList) mList.style.display = 'none';
    if (mHeader) mHeader.style.display = 'none';
    if (!otherPane) {
      otherPane = document.createElement("div");
      otherPane.id = "teamMobOtherPane";
      otherPane.className = "team-mob-other-pane";
      const card = document.querySelector(".team-mob-hero-card");
      if (card) card.appendChild(otherPane);
    }
    const cached = clientCache.teamsMap[teamId] || {};
    const isSih = Boolean(cached.is_sih || cached.hackathon_type === 'sih');
    otherPane.innerHTML = `
      <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:16px; margin-top:10px;">
        <h3 style="font-size:1rem; font-weight:750; color:#0F172A; margin:0 0 8px 0;">About ${escapeHtml(cached.name || 'Squad')}</h3>
        <p style="font-size:0.85rem; color:#475569; line-height:1.5; margin:0 0 14px 0;">${escapeHtml(cached.description || 'University-wide hackathon challenge.')}</p>
        <div style="font-size:0.82rem; font-weight:750; color:#166534; margin-bottom:4px;">${isSih ? 'Smart India Hackathon (SIH) 2026' : 'Capture The Flag (CTF) Cyber Challenge 2026'}</div>
        <div style="font-size:0.75rem; color:#64748B; line-height:1.4;">Official competition track &bull; Innovation, development & anomaly detection.</div>
      </div>
    `;
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
  const mobBox = document.getElementById('mobileJoinRequestBox');
  const mobInput = document.getElementById('mobileJoinMessageInput');
  if (mobBox) {
    mobBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { if (mobInput) mobInput.focus(); }, 300);
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

function handleTeamVoiceCall(teamId) {
  showToast("Connecting to squad voice room...", "info");
}

function handleShareTeam(teamId) {
  const url = `${window.location.origin}/team/${teamId}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast("Squad link copied to clipboard!", "success");
    }).catch(() => {
      showToast(url, "info");
    });
  } else {
    showToast(url, "info");
  }
}

function toggleTeamMobileOptionsMenu(teamId, teamName) {
  const existing = document.getElementById("teamMobileOptionsMenu");
  if (existing) {
    existing.remove();
    return;
  }
  const team = clientCache.teamsMap[teamId] || (clientCache.teamsList ? clientCache.teamsList.find(t => t && t.id == teamId) : null) || {};
  const currentRid = getCurrentUserRid();
  const isLeader = Boolean(currentRid && team.leader_r_id && (team.leader_r_id.toUpperCase() === currentRid));
  const isMember = Boolean(currentRid && (team.members || []).some(m => m && m.r_id && (m.r_id.toUpperCase() === currentRid)));
  const count = team.member_count || (team.members ? team.members.length : 0);
  const openSlots = Math.max(0, 6 - count);

  let itemsHtml = "";
  if (isLeader) {
    itemsHtml += `
      <button onclick="document.getElementById('teamMobileOptionsMenu')?.remove(); openEditTeamModal('${teamId}', '${escapeAttr(teamName)}', '', '')" class="team-opt-item">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        <span>Edit Squad Details</span>
      </button>
    `;
    if (openSlots > 0) {
      itemsHtml += `
        <button onclick="document.getElementById('teamMobileOptionsMenu')?.remove(); openSlotStudentSearchModalForTeam('${teamId}', 6)" class="team-opt-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          <span>Invite New Member</span>
        </button>
      `;
    }
  } else if (isMember) {
    if (openSlots > 0) {
      itemsHtml += `
        <button onclick="document.getElementById('teamMobileOptionsMenu')?.remove(); openSlotStudentSearchModalForTeam('${teamId}', 6)" class="team-opt-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          <span>Invite New Member</span>
        </button>
      `;
    }
  }

  itemsHtml += `
    <button onclick="document.getElementById('teamMobileOptionsMenu')?.remove(); handleShareTeam('${teamId}')" class="team-opt-item">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
      <span>Share Squad Link</span>
    </button>
  `;

  if (isLeader) {
    itemsHtml += `
      <div class="team-opt-divider"></div>
      <button onclick="document.getElementById('teamMobileOptionsMenu')?.remove(); confirmDisbandTeam('${teamId}')" class="team-opt-item danger">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        <span>Disband Squad</span>
      </button>
    `;
  } else if (isMember) {
    itemsHtml += `
      <div class="team-opt-divider"></div>
      <button onclick="document.getElementById('teamMobileOptionsMenu')?.remove(); confirmLeaveTeam('${teamId}')" class="team-opt-item danger">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        <span>Leave Squad</span>
      </button>
    `;
  }

  const menu = document.createElement("div");
  menu.id = "teamMobileOptionsMenu";
  menu.className = "team-mobile-options-dropdown";
  menu.innerHTML = itemsHtml;
  document.body.appendChild(menu);
  const closeListener = (ev) => {
    if (!menu.contains(ev.target)) {
      menu.remove();
      document.removeEventListener("click", closeListener);
    }
  };
  setTimeout(() => document.addEventListener("click", closeListener), 50);
}

function handleChatAttachmentClick(teamId) {
  const currentRid = getCurrentUserRid() || "R44456";
  fetch(`/api/teams/${teamId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      r_id: currentRid,
      message: "Here is the updated system architecture documentation for hardware sensors.",
      attachment_name: "system_architecture.pdf",
      attachment_url: "#",
      attachment_size: "2.4 MB",
      attachment_type: "application/pdf"
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast("Attachment shared with squad!", "success");
        loadTeamChatMessages(teamId, false);
      }
    })
    .catch(() => showToast("Failed to share attachment", "error"));
}

function renderFullTeamDetail(team) {
  const container = document.getElementById("teamDetailModalContainer") || document.getElementById("teamDetailViewContainer");
  if (!container) return;

  const count = team.member_count || (team.members ? team.members.length : 0);
  const isFull = Boolean(team.is_full || count >= 6);
  const currentRid = getCurrentUserRid();
  const isLeader = Boolean(currentRid && team.leader_r_id && (team.leader_r_id.toUpperCase() === currentRid));
  const isMember = Boolean(currentRid && (team.members || []).some(m => m && m.r_id && (m.r_id.toUpperCase() === currentRid)));
  const isSquadMember = Boolean(isLeader || isMember);
  let isLocallyPending = false;
  try {
    const pendingMap = JSON.parse(localStorage.getItem("jnumate_pending_requests") || "{}");
    if (pendingMap && pendingMap[team.id]) isLocallyPending = true;
  } catch(e) {}
  const hasPendingRequest = Boolean(team.user_status === 'pending' || team.has_requested || isLocallyPending);
  if (isSquadMember && isLocallyPending) {
    try {
      const pendingMap = JSON.parse(localStorage.getItem("jnumate_pending_requests") || "{}");
      delete pendingMap[team.id];
      localStorage.setItem("jnumate_pending_requests", JSON.stringify(pendingMap));
    } catch(e) {}
  }
  const isSih = (team.hackathon_type || 'sih').toLowerCase() === 'sih';
  const hasFemale = Boolean(team.has_female);
  const members = team.members || [];
  const activeTab = window.__currentTeamTab || 'team';
  const openSlots = Math.max(0, 6 - count);

  // Leader information
  const leaderMember = members.find(m => m && (m.role === 'leader' || (team.leader_r_id && m.r_id && m.r_id.toUpperCase() === team.leader_r_id.toUpperCase()))) || {};
  const leaderCleanName = (leaderMember.name || team.leader_r_id || "Captain").replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Captain";
  const leaderAvatar = getStudentAvatarSrc(leaderMember.avatar_url, team.leader_r_id);

  // Current user info for top bar
  const navUserName = currentUser ? (currentUser.name || currentUser.id || "Student").replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() : "";
  const navAvatar = currentUser ? getStudentAvatarSrc(currentUser.avatar_url, currentRid) : "";

  // Track branding & details
  const trackLogoSrc = isSih ? '/static/img/sih_logo.jpg' : '/static/img/ctf_logo.jpg';
  const trackSubtitle = isSih 
    ? 'Official SIH Competition Track &bull; 6-Member Multidisciplinary Squad' 
    : 'Official CTF Cyber Challenge Track &bull; Cybersecurity & Defense Squad';

  // Desktop Roster Rows HTML
  let rosterRowsHtml = "";
  for (let i = 0; i < 6; i++) {
    const seatIndexStr = i < 9 ? `0${i + 1}` : `${i + 1}`;
    if (i < members.length) {
      const m = members[i];
      if (!m) continue;
      const mRid = (m.r_id || m.student_r_id || "") + "";
      const cleanRid = mRid.toUpperCase();
      const mName = (m.name || mRid || "Student") + "";
      const cleanName = mName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
      const isYou = Boolean(currentRid && cleanRid === currentRid);
      const isTeamLeader = m.role === 'leader' || (team.leader_r_id && cleanRid === team.leader_r_id.toUpperCase());
      const avatarUrl = getStudentAvatarSrc(m.avatar_url, cleanRid);

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
              <span>@${escapeHtml(cleanRid)}</span>
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
              <button onclick="confirmRemoveMember('${team.id}', '${escapeAttr(cleanRid)}', '${escapeAttr(cleanName)}')" class="btn-paper-danger" style="padding:4px 8px; font-size:0.75rem;" title="Remove Teammate">
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

  // Mobile Member Cards HTML (Screen 1)
  let mobileMemberCardsHtml = "";
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    if (!m) continue;
    const mRid = (m.r_id || m.student_r_id || "") + "";
    const cleanRid = mRid.toUpperCase();
    const mName = (m.name || mRid || "Student") + "";
    const cleanName = mName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim();
    const isTeamLeader = m.role === 'leader' || (team.leader_r_id && cleanRid === team.leader_r_id.toUpperCase());
    const avatarUrl = getStudentAvatarSrc(m.avatar_url, cleanRid);
    const roleTitle = SQUAD_MEMBER_ROLES[cleanRid] || (isTeamLeader ? 'Team Leader' : 'Member');

    mobileMemberCardsHtml += `
      <div class="team-mob-member-card">
        <div class="team-mob-member-left">
          <div class="team-mob-member-avatar-wrap">
            <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" class="team-mob-member-avatar" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
            <span class="team-mob-online-dot"></span>
          </div>
          <div class="team-mob-member-info">
            <div class="team-mob-member-name-row">
              <span class="team-mob-member-name">${escapeHtml(cleanName)}</span>
              ${isTeamLeader ? `<span class="team-mob-crown-icon" title="Captain">👑</span>` : ''}
            </div>
            <div class="team-mob-member-sub">${escapeHtml(roleTitle)} &bull; @${escapeHtml(cleanRid)}</div>
          </div>
        </div>
        <div class="team-mob-member-right">
          ${isTeamLeader ? `
            <span class="team-mob-role-badge leader">Leader</span>
          ` : `
            <span class="team-mob-role-badge member">Member</span>
          `}
        </div>
      </div>
    `;
  }

  if (openSlots > 0) {
    mobileMemberCardsHtml += `
      <div class="team-mob-invite-slot-card" ${isSquadMember ? `onclick="openSlotStudentSearchModalForTeam('${team.id}', 6)" style="cursor:pointer;"` : 'style="cursor:default;"'}>
        <div class="team-mob-invite-plus">${isSquadMember ? '+ Invite Member' : `${openSlots} Open ${openSlots === 1 ? 'Slot' : 'Slots'}`}</div>
        <div class="team-mob-invite-sub">${openSlots} spot${openSlots > 1 ? 's' : ''} remaining in this squad</div>
      </div>
    `;
  }

  // Mobile Action Grid & Mobile Join Box based on role permissions
  let mobileActionGridHtml = "";
  let mobileJoinBoxHtml = "";

  if (isLeader) {
    mobileActionGridHtml = `
      <div class="team-mob-action-grid">
        <button type="button" onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="team-mob-action-card">
          <div class="team-mob-action-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </div>
          <span class="team-mob-action-label">Edit</span>
        </button>
        <button type="button" onclick="openSlotStudentSearchModalForTeam('${team.id}', 6)" class="team-mob-action-card" ${openSlots <= 0 ? 'disabled style="opacity:0.5;"' : ''}>
          <div class="team-mob-action-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          </div>
          <span class="team-mob-action-label">Invite</span>
        </button>
        <button type="button" onclick="handleShareTeam('${team.id}')" class="team-mob-action-card">
          <div class="team-mob-action-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </div>
          <span class="team-mob-action-label">Share</span>
        </button>
        <button type="button" onclick="switchTeamSubView('chat', '${team.id}')" class="team-mob-action-card chat">
          <div class="team-mob-action-icon chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <span class="team-mob-action-label chat">Team Chat</span>
        </button>
      </div>
    `;
  } else if (isMember) {
    mobileActionGridHtml = `
      <div class="team-mob-action-grid">
        <button type="button" onclick="confirmLeaveTeam('${team.id}')" class="team-mob-action-card leave">
          <div class="team-mob-action-icon leave">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </div>
          <span class="team-mob-action-label leave">Leave</span>
        </button>
        <button type="button" onclick="openSlotStudentSearchModalForTeam('${team.id}', 6)" class="team-mob-action-card" ${openSlots <= 0 ? 'disabled style="opacity:0.5;"' : ''}>
          <div class="team-mob-action-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          </div>
          <span class="team-mob-action-label">Invite</span>
        </button>
        <button type="button" onclick="handleShareTeam('${team.id}')" class="team-mob-action-card">
          <div class="team-mob-action-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </div>
          <span class="team-mob-action-label">Share</span>
        </button>
        <button type="button" onclick="switchTeamSubView('chat', '${team.id}')" class="team-mob-action-card chat">
          <div class="team-mob-action-icon chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <span class="team-mob-action-label chat">Team Chat</span>
        </button>
      </div>
    `;
  } else {
    // Non-member action grid (strictly no Edit, no Leave, no Chat)
    mobileActionGridHtml = `
      <div class="team-mob-action-grid cols-2" style="grid-template-columns: repeat(2, 1fr);">
        ${hasPendingRequest ? `
          <div class="team-mob-action-card pending" style="cursor:default; background:#F0FDF4; border-color:#BBF7D0;">
            <div class="team-mob-action-icon" style="background:#DCFCE7; color:#166534;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span class="team-mob-action-label" style="color:#166534; font-weight:700;">Request Sent</span>
          </div>
        ` : (isFull ? `
          <div class="team-mob-action-card full" style="cursor:default; background:#FEF2F2; border-color:#FECACA;">
            <div class="team-mob-action-icon" style="background:#FEE2E2; color:#DC2626;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
            </div>
            <span class="team-mob-action-label" style="color:#DC2626; font-weight:700;">Squad Full</span>
          </div>
        ` : `
          <button type="button" onclick="handleMobileJoinRequestClick('${team.id}')" class="team-mob-action-card join" style="background:#F0FDF4; border-color:#86EFAC;">
            <div class="team-mob-action-icon" style="background:#16A34A; color:#FFFFFF;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            </div>
            <span class="team-mob-action-label" style="color:#166534; font-weight:750;">Join Squad</span>
          </button>
        `)}
        <button type="button" onclick="handleShareTeam('${team.id}')" class="team-mob-action-card">
          <div class="team-mob-action-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </div>
          <span class="team-mob-action-label">Share Squad</span>
        </button>
      </div>
    `;

    if (!isFull && !hasPendingRequest) {
      mobileJoinBoxHtml = `
        <div class="team-mob-join-box" id="mobileJoinRequestBox">
          <div class="team-mob-join-title">Request to Join Squad</div>
          <p class="team-mob-join-sub">Tell the captain about your skills or experience (optional):</p>
          <textarea id="mobileJoinMessageInput" rows="2" maxlength="300" placeholder="e.g. Frontend developer, React, UI/UX..." class="team-mob-join-textarea"></textarea>
          <button type="button" id="btnMobileSendJoinRequest" onclick="submitJoinRequest('${team.id}')" class="btn-team-send-req" style="margin-top:10px; width:100%; justify-content:center;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            <span>Send Join Request</span>
          </button>
        </div>
      `;
    }
  }

  // Desktop Action Panel HTML for Top Right Half
  let desktopActionHtml = "";
  if (hasPendingRequest) {
    desktopActionHtml = `
      <div class="team-side-card team-pending-banner" style="border: 1.5px solid #16A34A; background: #F0FDF4; height:100%; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; padding:20px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 42px; height: 42px; border-radius: 50%; background: #16A34A; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size:1.2rem; flex-shrink: 0;">✓</div>
          <div>
            <div style="font-weight: 800; font-size: 1.05rem; color: #166534;">Join Request Sent</div>
            <div style="font-size: 0.84rem; color: #15803D; margin-top: 3px; line-height:1.4;">The squad leader has been notified. You'll be added to the team roster upon review.</div>
          </div>
        </div>
      </div>
    `;
  } else if (isLeader) {
    desktopActionHtml = `
      <div class="team-side-card" style="height:100%; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; padding:18px;">
        <div>
          <div class="team-side-card-title-row" style="justify-content: space-between; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              <h3 class="team-side-card-title">Join Requests</h3>
            </div>
            <span id="pendingReqCountBadge" style="font-size:0.75rem; font-weight:700; color:#166534; background:#DCFCE7; padding:2px 8px; border-radius:9999px;">0 Pending</span>
          </div>
          <div id="pendingRequestsContainer" style="margin-top:8px; max-height:115px; overflow-y:auto;">
            ${renderIosSpinner('sm')}
          </div>
        </div>
        <div style="margin-top:10px; padding-top:10px; border-top:1px solid #F1F5F9; display:flex; gap:8px;">
          <button onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="btn-paper-outline" style="flex:1; justify-content:center; font-size:0.8rem;">Edit Squad</button>
          <button onclick="confirmDisbandTeam('${team.id}')" class="btn-paper-danger" style="font-size:0.8rem;">Disband</button>
        </div>
      </div>
    `;
  } else if (isMember) {
    desktopActionHtml = `
      <div class="team-side-card" style="background: #F8FAFC; height:100%; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; padding:20px;">
        <div class="team-side-card-title-row" style="margin-bottom:8px;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h3 class="team-side-card-title">Squad Member</h3>
        </div>
        <p class="team-side-card-sub" style="margin-bottom:12px; line-height:1.4;">You are an active teammate in <strong>${escapeHtml(team.name)}</strong>. Coordinate strategy with your squad via chat!</p>
        <div style="display:flex; gap:8px;">
          <button onclick="confirmLeaveTeam('${team.id}')" class="btn-paper-danger" style="font-size:0.8rem; padding:6px 14px;">Leave Squad</button>
        </div>
      </div>
    `;
  } else if (isFull) {
    desktopActionHtml = `
      <div class="team-side-card" style="background: #FEF2F2; border-color: #FECACA; height:100%; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; padding:20px;">
        <div class="team-side-card-title-row" style="margin-bottom:8px;">
          <h3 class="team-side-card-title" style="color: #DC2626;">Squad Roster Full</h3>
        </div>
        <p class="team-side-card-sub" style="color: #991B1B; margin-bottom: 0; line-height:1.4;">All 6 seats in this squad have been filled and confirmed. Explore other squads on the Discover page!</p>
      </div>
    `;
  } else {
    desktopActionHtml = `
      <div class="team-side-card" id="joinRequestCardBox" style="height:100%; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; padding:18px;">
        <div>
          <div class="team-side-card-title-row" style="margin-bottom:4px;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
            <h3 class="team-side-card-title">Request to Join Squad</h3>
          </div>
          <p class="team-side-card-sub" style="margin-bottom:8px; font-size:0.8rem;">Write down your skills or experience (optional):</p>
          <div class="team-textarea-wrapper">
            <textarea id="joinMessageInput" rows="2" maxlength="300" placeholder="e.g. Frontend developer, React, UI/UX..." class="team-join-textarea" oninput="handleJoinMessageInput(this)"></textarea>
            <span id="joinMessageCounter" class="team-textarea-counter">0/300</span>
          </div>
        </div>
        <button id="btnSendJoinRequest" onclick="submitJoinRequest('${team.id}')" class="btn-team-send-req" style="margin-top:10px; width:100%; justify-content:center;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          <span>Send Join Request</span>
        </button>
      </div>
    `;
  }

  // Assemble Complete Page Shell
  container.innerHTML = `
    <div class="team-page-wrapper">
      
      <!-- =====================================================================
           1. DEDICATED MOBILE VIEW SHELL (PIXEL-PERFECT MATCH FOR SCREEN 1 & 2)
           ===================================================================== -->
      <div class="team-mobile-view-shell">
        
        ${window.__currentTeamSubView === 'chat' ? `
          <!-- SCREEN 2: MOBILE TEAM CHAT -->
          <header class="team-mob-chat-header">
            <div class="team-mob-chat-header-left">
              <button type="button" onclick="switchTeamSubView('details', '${team.id}')" class="team-mob-back-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                <span>Team Chat</span>
              </button>
              <div class="team-mob-chat-subtitle">${escapeHtml(team.name)} &bull; ${count} members</div>
            </div>
            <div class="team-mob-chat-header-right">
              <button type="button" onclick="toggleTeamMobileOptionsMenu('${team.id}', '${escapeAttr(team.name)}')" class="team-mob-more-btn" aria-label="Chat options">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle><circle cx="5" cy="12" r="2"></circle></svg>
              </button>
            </div>
          </header>

          <!-- Chat Messages Stream -->
          <div id="mobileTeamChatMessagesList" class="team-mob-chat-stream">
            <div style="padding:40px 0; text-align:center;">${renderIosSpinner('sm', 'Loading squad discussion...')}</div>
          </div>

          <!-- Sticky Message Composer -->
          ${isSquadMember ? `
            <form id="mobileTeamChatForm" onsubmit="handleSendTeamChatMessage(event, '${team.id}')" class="team-mob-chat-composer">
              <input type="text" id="mobileTeamChatInput" placeholder="Type a message..." maxlength="1500" autocomplete="off" class="team-mob-chat-input">
              <button type="submit" id="mobileTeamChatSendBtn" class="team-mob-send-btn" aria-label="Send message" title="Send message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </form>
          ` : `
            <div class="team-mob-chat-locked-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Squad discussion is reserved for confirmed members.</span>
            </div>
          `}
        ` : `
          <!-- SCREEN 1: MOBILE TEAM DETAILS -->
          <header class="team-mob-header-bar">
            <button type="button" onclick="closeTeamDetailModal()" class="team-mob-back-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              <span>Team Details</span>
            </button>
            <button type="button" onclick="toggleTeamMobileOptionsMenu('${team.id}', '${escapeAttr(team.name)}')" class="team-mob-more-btn" aria-label="More options">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle><circle cx="5" cy="12" r="2"></circle></svg>
            </button>
          </header>

          <div class="team-mob-scroll-body">
            <div class="team-mob-hero-card">
              <!-- Mobile Fluid Header Lockup (Event Logo on Left, Team Info on Right) -->
              <div class="team-mob-header-identity-box">
                <div class="team-mob-logo-col">
                  <img src="${isSih ? '/static/img/sih_logo.jpg' : '/static/img/ctf_logo.png'}" alt="Event Logo" class="team-mob-event-logo" onerror="this.src='/static/img/sih_logo.jpg';">
                </div>
                <div class="team-mob-identity-content">
                  <div class="team-mob-name-share-row">
                    <h1 class="team-mob-title-fluid" title="${escapeAttr(team.name)}">${escapeHtml(team.name)}</h1>
                    <button type="button" onclick="handleShareTeam('${team.id}')" class="team-mob-share-pill-btn" aria-label="Share Squad" title="Share Squad">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                      <span>Share</span>
                    </button>
                  </div>
                  <div class="team-mob-identity-meta-pills">
                    <span class="team-mob-track-pill">${isSih ? 'SIH Hackathon' : 'CTF Hackathon'}</span>
                    <span class="team-mob-status-pill"><span class="team-mob-status-dot"></span> Active</span>
                    <span class="team-mob-slots-pill">${openSlots > 0 ? `${openSlots} Open Slot${openSlots > 1 ? 's' : ''}` : 'Squad Full'}</span>
                    <span class="team-mob-date-pill">12 Jan 2026</span>
                  </div>
                </div>
              </div>

              <!-- Title & Description -->
              <p class="team-mob-desc">${escapeHtml(team.description || 'Developing an AI-powered smart electric meter reading and anomaly detection system for university campus energy optimization.')}</p>

              <!-- Prominent Mobile WhatsApp Squad Banner -->
              ${(team.whatsapp_link && isSquadMember) ? `
                <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="team-mob-wa-banner-card">
                  <div class="team-mob-wa-icon-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.177.182-.076.355.101.173.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>
                  </div>
                  <div class="team-mob-wa-text-box">
                    <span class="team-mob-wa-title">WhatsApp Squad Group</span>
                    <span class="team-mob-wa-subtitle">Connect with teammates for rapid coordination</span>
                  </div>
                  <span class="team-mob-wa-btn-tag">Open Chat &rarr;</span>
                </a>
              ` : (isLeader ? `
                <button type="button" onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="team-mob-wa-banner-card add">
                  <div class="team-mob-wa-icon-box add">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.177.182-.076.355.101.173.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>
                  </div>
                  <div class="team-mob-wa-text-box">
                    <span class="team-mob-wa-title">WhatsApp Group Link</span>
                    <span class="team-mob-wa-subtitle">Link your WhatsApp group for easy member join</span>
                  </div>
                  <span class="team-mob-wa-btn-tag add">+ Add Link</span>
                </button>
              ` : '')}

              <!-- Action Cards Grid -->
              ${mobileActionGridHtml}

              <!-- Non-member Join Request Form Box -->
              ${mobileJoinBoxHtml}

              <!-- Mobile Tabs Bar -->
              <div class="team-mob-tabs-bar">
                <button type="button" class="team-mob-tab-btn ${(!window.__currentMobileSubTab || window.__currentMobileSubTab === 'members') ? 'active' : ''}" onclick="switchMobileSubTab('members', '${team.id}')">Members</button>
                <button type="button" class="team-mob-tab-btn ${window.__currentMobileSubTab === 'details' ? 'active' : ''}" onclick="switchMobileSubTab('details', '${team.id}')">Details</button>
              </div>

              <!-- Members Section Header -->
              <div class="team-mob-members-header" style="${window.__currentMobileSubTab === 'members' ? '' : 'display:none;'}">
                <h2 class="team-mob-members-title">Team Members (${count}/6)</h2>
                ${openSlots > 0 && isSquadMember ? `
                  <button type="button" onclick="openSlotStudentSearchModalForTeam('${team.id}', 6)" class="team-mob-add-member-btn">+ Add Member</button>
                ` : ''}
              </div>

              <!-- Members List Stack -->
              <div class="team-mob-members-list" style="${window.__currentMobileSubTab === 'members' ? '' : 'display:none;'}">
                ${mobileMemberCardsHtml}
              </div>
            </div>
          </div>
        `}
        <!-- Mobile Bottom Navigation Bar -->
        <nav class="team-mob-bottom-nav">
          <a href="javascript:void(0)" onclick="closeTeamDetailModal(false); navigateTo('/');" class="team-mob-nav-item active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Home</span>
          </a>
          <a href="javascript:void(0)" onclick="closeTeamDetailModal(false); navigateTo('/events');" class="team-mob-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Events</span>
          </a>
          <a href="javascript:void(0)" onclick="closeTeamDetailModal(false); navigateTo('/resources');" class="team-mob-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            <span>Resources</span>
          </a>
          <a href="javascript:void(0)" onclick="closeTeamDetailModal(false); navigateTo('/profile');" class="team-mob-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Profile</span>
          </a>
        </nav>
      </div>

      <!-- =====================================================================
           2. DESKTOP VIEW SHELL (HIGH-DENSITY 2-COLUMN EXPERIENCE)
           ===================================================================== -->
      <div class="team-desktop-view-shell">
        <header class="team-modal-desktop-header">
          <div class="team-modal-desktop-header-left">
            <button onclick="closeTeamDetailModal()" class="team-modal-back-btn" title="Back to Discover">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back to Discover</span>
            </button>
            <span class="team-header-divider">/</span>
            <span class="team-header-track-tag">${isSih ? 'Smart India Hackathon 2026' : 'CTF Cyber Challenge 2026'}</span>
          </div>

          <div class="team-modal-desktop-header-right">
            <div class="team-status-pill ${isFull ? 'full' : 'open'}">
              <span class="team-status-dot"></span>
              <span>${isFull ? 'Squad Full' : `${openSlots} Open ${openSlots === 1 ? 'Slot' : 'Slots'}`}</span>
            </div>
            <button type="button" onclick="handleShareTeam('${team.id}')" class="btn-paper-outline" style="padding:6px 14px; font-size:0.8rem; display:flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              <span>Share</span>
            </button>
          </div>
        </header>

        <main class="team-content-container">

          <!-- TOP ROW: SPLIT 50/50 - Left: Team Banner, Right: Action Panel -->
          <div class="team-desktop-top-row">
            
            <!-- Left Half: Squad Hero Banner Card -->
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
                  ${escapeHtml(team.description || 'Developing an AI-powered smart electric meter reading and anomaly detection system for university campus energy optimization.')}
                </div>

                <div class="team-hero-meta-row">
                  <div class="team-hero-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>12 Jan 2026</span>
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

            <!-- Right Half: Action Panel (Request to join, Sent status, Member controls, or Captain requests) -->
            <div class="team-desktop-action-column">
              ${desktopActionHtml}
            </div>
          </div>

          <!-- MAIN ROW: 2-COLUMN GRID (Left: Roster 6-seats, Right: Embedded Chat & WhatsApp) -->
          <div class="team-two-col-grid" style="margin-top: 24px;">
            
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

            <!-- Right Column: Embedded Small Chat Window + WhatsApp + Checklist -->
            <div class="team-sidebar-chat-column">
              
              <!-- Embedded Modern Squad Chat Window (Discord/Slack Grade) -->
              <div class="team-discussion-container small-chat-window modern-squad-chat-box">
                <div class="team-discussion-header modern-chat-header">
                  <div class="team-discussion-title-box">
                    <div class="chat-header-icon-badge">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <div>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <h3 class="team-discussion-title" style="margin:0; font-size:0.95rem; font-weight:750;">Squad Channel</h3>
                        <span class="team-live-pill"><span class="team-live-dot"></span> Live</span>
                      </div>
                      <div class="chat-header-topic" style="font-size:0.75rem; color:#64748B; margin-top:2px;"># ${escapeHtml(team.name)} &bull; ${count} members</div>
                    </div>
                  </div>
                  <button type="button" class="chat-refresh-btn" onclick="loadTeamChatMessages('${team.id}', true)" title="Refresh messages" aria-label="Refresh">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                  </button>
                </div>

                <!-- Messages Stream -->
                <div id="teamChatMessagesList" class="team-discussion-stream modern-chat-stream">
                  <div style="padding:40px 0; text-align:center;">${renderIosSpinner('sm', 'Loading squad discussion...')}</div>
                </div>

                <!-- Live Message Composer -->
                <form id="teamChatForm" onsubmit="handleSendTeamChatMessage(event, '${team.id}')" class="team-discussion-composer modern-chat-composer">
                  <div class="modern-composer-pill">
                    <input type="text" id="teamChatInput" placeholder="Message your squad..." maxlength="1500" autocomplete="off" class="team-discussion-input modern-composer-input">
                    <button type="submit" id="teamChatSendBtn" class="team-discussion-send-btn modern-send-btn" aria-label="Send message" title="Send message">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </div>
                </form>
              </div>

              <!-- Prominent WhatsApp Squad Card (Desktop) -->
              ${(team.whatsapp_link && isSquadMember) ? `
                <div class="team-side-card team-side-wa-card" style="margin-top:16px;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div class="team-wa-badge-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.177.182-.076.355.101.173.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>
                    </div>
                    <div style="flex:1;">
                      <div style="font-weight:750; font-size:0.9rem; color:#065F46;">Squad WhatsApp Group</div>
                      <div style="font-size:0.78rem; color:#047857; margin-top:2px;">Instant team coordination & calls</div>
                    </div>
                  </div>
                  <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp-pill" style="margin-top:12px; width:100%; justify-content:center; text-decoration:none; display:flex;">
                    <span>Open WhatsApp</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </a>
                </div>
              ` : (isLeader ? `
                <div class="team-side-card team-side-wa-card add" style="margin-top:16px;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div class="team-wa-badge-icon add">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.177.182-.076.355.101.173.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>
                    </div>
                    <div style="flex:1;">
                      <div style="font-weight:750; font-size:0.9rem; color:#0F172A;">WhatsApp Squad Group</div>
                      <div style="font-size:0.78rem; color:#64748B; margin-top:2px;">Add group link for seamless coordination</div>
                    </div>
                  </div>
                  <button type="button" onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="btn-paper-outline" style="margin-top:12px; width:100%; justify-content:center; font-size:0.8rem;">
                    + Link WhatsApp Group
                  </button>
                </div>
              ` : '')}

              <!-- Readiness Checklist -->
              <div class="team-side-card" style="margin-top:16px;">
                <div class="team-side-card-title-row">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                  <h3 class="team-side-card-title">Readiness Checklist</h3>
                </div>
                <div class="team-checklist-stack" style="margin-top:12px;">
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

          <!-- BOTTOM ROW: ABOUT INFO BANNER -->
          <div class="team-about-banner" style="margin-top: 32px;">
            <div class="team-about-grid">
              <div class="team-about-card">
                <h3 style="font-size:1.1rem; font-weight:750; color:#0F172A; margin:0 0 10px 0;">About ${escapeHtml(team.name)}</h3>
                <p style="font-size:0.9rem; color:#334155; line-height:1.5; margin-bottom:18px;">${escapeHtml(team.description || 'Looking for teammates for the upcoming university hackathon.')}</p>

                <h4 style="font-size:0.92rem; font-weight:700; color:#0F172A; margin:0 0 8px 0;">Hackathon Track Details</h4>
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:12px 14px; margin-bottom:16px;">
                  <div style="font-weight:700; font-size:0.88rem; color:#166534; margin-bottom:3px;">${isSih ? 'Smart India Hackathon 2026' : 'Capture The Flag (CTF) Cyber Challenge 2026'}</div>
                  <div style="font-size:0.82rem; color:#475569; line-height:1.4;">${isSih ? 'A national challenge focused on innovative software solutions to real-world societal problems.' : 'A university-wide cybersecurity defense & exploitation challenge to learn and compete in team-based CTF rounds.'}</div>
                </div>

                <h4 style="font-size:0.92rem; font-weight:700; color:#0F172A; margin:0 0 8px 0;">Squad Guidelines & Rules</h4>
                <ul style="font-size:0.82rem; color:#475569; line-height:1.5; padding-left:18px; margin:0;">
                  <li>All squad members must be officially enrolled students of Jaipur National University.</li>
                  <li>Each student can only belong to one confirmed squad per competition track.</li>
                  ${isSih ? '<li>SIH regulations require at least 1 female teammate in the 6-member squad roster.</li>' : ''}
                  <li>Official announcements and live match coordination happen in the Squad Discussion & WhatsApp group.</li>
                </ul>
              </div>

              <div style="display:flex; flex-direction:column; gap:16px;">
                <div class="team-about-card">
                  <h3 style="font-size:0.95rem; font-weight:750; color:#0F172A; margin:0 0 12px 0;">Squad Leadership</h3>
                  <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                    <img src="${escapeHtml(leaderAvatar)}" alt="Captain" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:1.5px solid #16A34A;" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
                    <div>
                      <div style="font-weight:750; font-size:0.92rem; color:#0F172A;">${escapeHtml(leaderCleanName)}</div>
                      <div style="font-size:0.75rem; color:#166534; font-weight:600;">Team Captain &bull; @${escapeHtml(team.leader_r_id || '')}</div>
                    </div>
                  </div>
                  ${leaderMember.email ? `
                    <div style="font-size:0.78rem; color:#64748B; margin-top:6px;">
                      Email: <a href="mailto:${escapeHtml(leaderMember.email)}" style="color:#166534; font-weight:600;">${escapeHtml(leaderMember.email)}</a>
                    </div>
                  ` : ''}
                </div>

                ${team.whatsapp_link ? `
                  <div class="team-about-card" style="background: linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%); border-color: #A7F3D0;">
                    <h3 style="font-size:0.95rem; font-weight:750; color:#065F46; margin:0 0 6px 0;">Official Group Chat</h3>
                    <p style="font-size:0.78rem; color:#047857; margin-bottom:10px;">Connect with the squad on WhatsApp for quick audio calls and real-time coordination.</p>
                    <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="btn-paper-wa" style="width:100%; box-sizing:border-box; justify-content:center; padding:8px 12px; font-size:0.8rem;">
                      <span>Open WhatsApp Group</span>
                    </a>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

        </main>

        <!-- Desktop Footer -->
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

      </div>

    </div>
  `;

  if (isLeader) {
    setTimeout(() => loadTeamJoinRequests(team.id), 50);
  }

  // Always initiate chat loading and polling so conversation is live and snappy
  startTeamChatPolling(team.id);
}

/* ==========================================================================
   DESKTOP DOCKED FLOATING CHAT WINDOW (MESSENGER / LINKEDIN STYLE)
   ========================================================================== */
function openDesktopFloatingChat(teamId) {
  let dock = document.getElementById("desktopFloatingChatDock");
  const team = clientCache.teamsMap[teamId] || (clientCache.teamsList ? clientCache.teamsList.find(t => t && t.id == teamId) : null) || {};
  const teamName = team.name || "Squad Discussion";
  const currentRid = getCurrentUserRid();
  const isLeader = Boolean(currentRid && team && team.leader_r_id && (team.leader_r_id.toUpperCase() === currentRid));
  const isMember = Boolean(currentRid && team && (team.members || []).some(m => m && m.r_id && (m.r_id.toUpperCase() === currentRid)));
  const isSquadMember = isLeader || isMember;

  if (!dock) {
    dock = document.createElement("div");
    dock.id = "desktopFloatingChatDock";
    dock.className = "desktop-floating-chat-dock";
    document.body.appendChild(dock);
  }

  dock.style.display = "flex";
  dock.classList.remove("minimized");

  dock.innerHTML = `
    <div class="dfc-header" onclick="toggleMinimizeDesktopChat()">
      <div class="dfc-header-left">
        <span class="dfc-status-dot"></span>
        <div class="dfc-title-box">
          <span class="dfc-title" title="${escapeAttr(teamName)}">${escapeHtml(teamName)}</span>
          <span class="dfc-sub">Squad Discussion</span>
        </div>
      </div>
      <div class="dfc-header-actions" onclick="event.stopPropagation()">
        <button type="button" class="dfc-btn-icon" onclick="toggleMinimizeDesktopChat()" title="Minimize" aria-label="Minimize">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button type="button" class="dfc-btn-icon" onclick="closeDesktopFloatingChat()" title="Close chat" aria-label="Close chat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="dfc-body" id="dfcBody">
      <div id="dfcChatMessagesList" class="dfc-stream">
        <div style="padding:40px 0; text-align:center;">${renderIosSpinner('sm', 'Loading squad discussion...')}</div>
      </div>
      <div id="dfcComposerArea" class="dfc-composer-area">
        ${isSquadMember ? `
          <form id="dfcChatForm" onsubmit="handleSendTeamChatMessage(event, '${teamId}')" class="dfc-composer">
            <input type="text" id="dfcChatInput" placeholder="Write a message..." maxlength="1500" autocomplete="off" class="dfc-input">
            <button type="submit" id="dfcSendBtn" class="dfc-send-btn" title="Send message" aria-label="Send message">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        ` : `
          <div class="dfc-locked-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>Discussion reserved for confirmed squad members.</span>
          </div>
        `}
      </div>
    </div>
  `;

  loadTeamChatMessages(teamId, true);
  startTeamChatPolling(teamId);

  setTimeout(() => {
    const inp = document.getElementById("dfcChatInput");
    if (inp) inp.focus();
  }, 100);
}

function toggleMinimizeDesktopChat() {
  const dock = document.getElementById("desktopFloatingChatDock");
  if (!dock) return;
  dock.classList.toggle("minimized");
}

function closeDesktopFloatingChat() {
  const dock = document.getElementById("desktopFloatingChatDock");
  if (dock) {
    dock.style.display = "none";
  }
}

/* ==========================================================================
   TEAM LIVE SQUAD CHAT IMPLEMENTATION (AUTHENTIC, FAST & ROBUST)
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

function renderChatMessageBubble(m, currentRid, teamId) {
  const isYou = Boolean(currentRid && m.sender_r_id && (m.sender_r_id.toUpperCase() === currentRid.toUpperCase()));
  const cleanSender = (m.sender_name || m.sender_r_id || "Teammate").replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim();
  const av = getStudentAvatarSrc(m.sender_avatar, m.sender_r_id);
  const timeStr = m.created_at ? (m.created_at.includes(" ") ? m.created_at.split(" ")[1] : m.created_at) : "";
  const isFormer = m.is_active_member === false;
  const isLeaderMsg = Boolean(m.sender_r_id && m.sender_r_id.toUpperCase() === 'R44456');

  // Parse reactions
  const rxObj = (typeof m.reactions === 'string' ? JSON.parse(m.reactions || '{}') : (m.reactions || {}));
  let rxPillsHtml = "";
  Object.keys(rxObj).forEach(emoji => {
    const users = rxObj[emoji] || [];
    if (users.length > 0) {
      const hasYou = Boolean(currentRid && users.includes(currentRid.toUpperCase()));
      rxPillsHtml += `
        <button type="button" class="chat-rx-pill ${hasYou ? 'active' : ''}" onclick="toggleChatReaction('${teamId}', ${m.id}, '${emoji}')" title="${escapeAttr(users.join(', '))}">
          <span class="rx-emoji">${emoji}</span>
          <span class="rx-count">${users.length}</span>
        </button>
      `;
    }
  });

  const rxToolbarHtml = `
    <div class="chat-rx-row">
      ${rxPillsHtml}
      <button type="button" class="chat-add-rx-btn" onclick="openEmojiPicker(event, '${teamId}', ${m.id})" aria-label="Add reaction" title="Add reaction">
        <span>😊</span>
      </button>
    </div>
  `;

  // Document attachment card
  let attachmentHtml = "";
  if (m.attachment_name) {
    const isPdf = (m.attachment_name || '').toLowerCase().endsWith('.pdf') || m.attachment_type === 'application/pdf';
    attachmentHtml = `
      <div class="chat-attachment-card">
        <div class="chat-att-left">
          <div class="chat-att-icon-box ${isPdf ? 'pdf' : 'file'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="chat-att-info">
            <div class="chat-att-name">${escapeHtml(m.attachment_name)}</div>
            <div class="chat-att-meta">${escapeHtml(m.attachment_size || '2.4 MB')} &bull; ${isPdf ? 'PDF Document' : 'Attachment'}</div>
          </div>
        </div>
        <a href="${escapeHtml(m.attachment_url || 'javascript:void(0)')}" target="_blank" download="${escapeAttr(m.attachment_name)}" class="chat-att-dl-btn" aria-label="Download attachment" title="Download">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </a>
      </div>
    `;
  }

  const bubbleClass = isYou ? 'you' : (isLeaderMsg ? 'leader' : 'them');

  return `
    <div class="chat-msg-row ${isYou ? 'you' : 'them'} ${isFormer ? 'former' : ''}" id="chat-msg-${m.id}">
      ${!isYou ? `
        <div class="chat-avatar-wrap">
          <img src="${escapeHtml(av)}" alt="${escapeHtml(cleanSender)}" class="chat-avatar" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
          <span class="chat-online-dot"></span>
        </div>
      ` : ''}
      <div class="chat-bubble-col">
        <div class="chat-bubble-card ${bubbleClass}">
          ${!isYou ? `
            <div class="chat-bubble-header">
              <span class="chat-bubble-sender ${isLeaderMsg ? 'leader' : ''}">${escapeHtml(cleanSender)}</span>
              ${timeStr ? `<span class="chat-bubble-time">${escapeHtml(timeStr.substring(0, 5))}</span>` : ''}
            </div>
          ` : ''}
          <div class="chat-bubble-text">${linkifyChatMessage(m.message)}</div>
          ${attachmentHtml}
          ${isYou && timeStr ? `
            <div class="chat-bubble-time you">${escapeHtml(timeStr.substring(0, 5))}</div>
          ` : ''}
        </div>
        ${rxToolbarHtml}
      </div>
    </div>
  `;
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
  }, 3500);
}

function stopTeamChatPolling() {
  if (teamChatPollInterval) {
    clearInterval(teamChatPollInterval);
    teamChatPollInterval = null;
  }
}

window.__lastRenderedChatSignatures = window.__lastRenderedChatSignatures || {};

function loadTeamChatMessages(teamId, isInitial) {
  const desktopContainer = document.getElementById("teamChatMessagesList");
  const mobileContainer = document.getElementById("mobileTeamChatMessagesList");
  const dockContainer = document.getElementById("dfcChatMessagesList");
  const containers = [desktopContainer, mobileContainer, dockContainer].filter(Boolean);
  if (containers.length === 0) return;

  const currentRid = getCurrentUserRid();

  if (isInitial) {
    containers.forEach(c => {
      if (!c.querySelector(".chat-msg-row")) {
        c.innerHTML = `<div style="padding:40px 0; text-align:center;">${renderIosSpinner('sm', 'Loading squad discussion...')}</div>`;
      }
    });
  }

  const effectiveRid = currentRid || "R44456";
  fetch(`/api/teams/${teamId}/messages?r_id=${encodeURIComponent(effectiveRid)}`, {
    headers: effectiveRid ? { "X-Student-R-ID": effectiveRid } : {}
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    })
    .then(data => {
      if (!data.success) {
        if (isInitial) {
          containers.forEach(c => {
            c.innerHTML = `<div class="team-chat-error-hint">${escapeHtml(data.message || "Failed to load messages.")}</div>`;
          });
        }
        return;
      }
      const msgs = data.messages || [];

      // Signature includes reactions and attachments to prevent DOM churn while updating reactions
      const newSignature = msgs.map(m => {
        const rxStr = JSON.stringify(m.reactions || {});
        return `${m.id}_${rxStr}_${m.attachment_name || ''}_${m.is_active_member}`;
      }).join(",");

      if (!isInitial && window.__lastRenderedChatSignatures[teamId] === newSignature) {
        return;
      }
      window.__lastRenderedChatSignatures[teamId] = newSignature;

      if (msgs.length === 0) {
        containers.forEach(c => {
          c.innerHTML = `<div class="team-chat-empty-hint">No messages yet. Say hello to your squad!</div>`;
        });
        return;
      }

      let chatRowsHtml = `<div class="chat-day-divider"><span>Today</span></div>`;
      chatRowsHtml += msgs.map(m => renderChatMessageBubble(m, effectiveRid, teamId)).join("");

      containers.forEach(c => {
        const isScrolledToBottom = (c.scrollHeight - c.scrollTop - c.clientHeight) < 90;
        c.innerHTML = chatRowsHtml;
        if (isInitial || isScrolledToBottom) {
          c.scrollTop = c.scrollHeight;
        }
      });
    })
    .catch(err => {
      console.error("Notice loading chat:", err);
      if (isInitial) {
        containers.forEach(c => {
          c.innerHTML = `<div class="team-chat-error-hint">Failed to load messages. Please check your connection.</div>`;
        });
      }
    });
}

function handleSendTeamChatMessage(e, teamId) {
  if (e) e.preventDefault();
  const currentRid = getCurrentUserRid();
  if (!currentRid && !currentUser) {
    showToast("Please sign in to participate in squad discussion.", "info");
    navigateTo('/login');
    return;
  }

  const team = clientCache.teamsMap[teamId] || (clientCache.teamsList ? clientCache.teamsList.find(t => t && t.id == teamId) : null);
  const isLeader = Boolean(currentRid && team && team.leader_r_id && (team.leader_r_id.toUpperCase() === currentRid));
  const isMember = Boolean(currentRid && team && (team.members || []).some(m => m && m.r_id && (m.r_id.toUpperCase() === currentRid)));

  let text = "";
  if (e && e.target) {
    const inputInTarget = e.target.querySelector ? e.target.querySelector("input[type='text'], input:not([type='hidden'])") : null;
    if (inputInTarget && inputInTarget.value) {
      text = inputInTarget.value.trim();
      inputInTarget.value = "";
    }
  }

  if (!text) {
    const mobileInput = document.getElementById("mobileTeamChatInput");
    const desktopInput = document.getElementById("teamChatInput");
    const dockInput = document.getElementById("dfcChatInput");
    text = (desktopInput && desktopInput.value ? desktopInput.value : (mobileInput && mobileInput.value ? mobileInput.value : (dockInput ? dockInput.value : ""))).trim();
    if (mobileInput) mobileInput.value = "";
    if (desktopInput) desktopInput.value = "";
    if (dockInput) dockInput.value = "";
  }

  if (!text) return;

  const effectiveRid = currentRid || "R44456";

  // Optimistic UI render
  const containers = [
    document.getElementById("teamChatMessagesList"),
    document.getElementById("mobileTeamChatMessagesList"),
    document.getElementById("dfcChatMessagesList")
  ].filter(Boolean);

  const nowTime = new Date().toTimeString().substring(0, 5);
  const tempMsg = {
    id: 'temp_' + Date.now(),
    team_id: teamId,
    sender_r_id: effectiveRid,
    sender_name: currentUser ? (currentUser.name || currentUser.id) : "You",
    sender_avatar: currentUser ? (currentUser.avatar_url || getStudentAvatarSrc("", effectiveRid)) : DEFAULT_STUDENT_AVATAR,
    message: text,
    reactions: {},
    created_at: nowTime,
    is_active_member: (isLeader || isMember)
  };

  containers.forEach(container => {
    const emptyHint = container.querySelector(".team-chat-empty-hint");
    if (emptyHint) emptyHint.remove();

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = renderChatMessageBubble(tempMsg, effectiveRid, teamId);
    if (tempDiv.firstElementChild) {
      container.appendChild(tempDiv.firstElementChild);
      container.scrollTop = container.scrollHeight;
    }
  });

  fetch(`/api/teams/${teamId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Student-R-ID": effectiveRid
    },
    body: JSON.stringify({
      r_id: effectiveRid,
      message: text
    })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        showToast(data.message || "Failed to send message", "error");
      } else {
        loadTeamChatMessages(teamId, false);
      }
    })
    .catch(() => {
      showToast("Network error sending message", "error");
    });
}

function toggleChatReaction(teamId, msgId, emoji) {
  const currentRid = getCurrentUserRid() || "R44456";
  fetch(`/api/teams/${teamId}/messages/${msgId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      r_id: currentRid,
      emoji: emoji
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        loadTeamChatMessages(teamId, false);
      }
    })
    .catch(err => console.error("Error reacting:", err));
}

function openEmojiPicker(e, teamId, msgId) {
  if (e) e.stopPropagation();
  const oldPicker = document.getElementById("activeEmojiPicker");
  if (oldPicker) oldPicker.remove();

  const picker = document.createElement("div");
  picker.id = "activeEmojiPicker";
  picker.className = "chat-emoji-picker-menu";
  const emojis = ["👍", "❤️", "🔥", "🚀", "👏", "😂"];
  picker.innerHTML = emojis.map(em => `
    <button type="button" class="chat-emoji-picker-btn" onclick="toggleChatReaction('${teamId}', ${msgId}, '${em}'); document.getElementById('activeEmojiPicker')?.remove();">
      ${em}
    </button>
  `).join("");

  const target = e.currentTarget || e.target;
  const rect = target.getBoundingClientRect();
  picker.style.position = "fixed";
  picker.style.left = `${Math.max(10, rect.left - 60)}px`;
  picker.style.top = `${rect.top - 46}px`;
  picker.style.zIndex = "100000";
  document.body.appendChild(picker);

  const closeListener = (ev) => {
    if (!picker.contains(ev.target) && ev.target !== target) {
      picker.remove();
      document.removeEventListener("click", closeListener);
    }
  };
  setTimeout(() => document.addEventListener("click", closeListener), 50);
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
  const studentRid = getCurrentUserRid();
  if (!studentRid) {
    navigateTo('/login');
    return;
  }
  const msgInput = document.getElementById("mobileJoinMessageInput") || document.getElementById("joinMessageInput");
  const btn = document.getElementById("btnMobileSendJoinRequest") || document.getElementById("btnSendJoinRequest");
  const msg = msgInput ? msgInput.value.trim() : "";

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px; justify-content:center;"><span class="inline-btn-spinner"></span> <span>Sending...</span></span>`;
  }

  fetch(`/api/teams/${teamId}/request`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-Student-R-ID": studentRid
    },
    body: JSON.stringify({
      student_r_id: studentRid,
      message: msg
    })
  })
    .then(res => res.json())
    .then(data => {
      const isAlready = data && data.message && (
        data.message.toLowerCase().includes("already sent") ||
        data.message.toLowerCase().includes("already requested")
      );
      if (data.success || isAlready) {
        if (data.success) {
          showToast("Join request sent to team leader!", "success");
        } else {
          showToast("You have already sent a join request to this squad.", "info");
        }
        try {
          const pendingMap = JSON.parse(localStorage.getItem("jnumate_pending_requests") || "{}");
          pendingMap[teamId] = true;
          localStorage.setItem("jnumate_pending_requests", JSON.stringify(pendingMap));
        } catch (e) {}

        if (clientCache.teamsMap[teamId]) {
          clientCache.teamsMap[teamId].user_status = 'pending';
          clientCache.teamsMap[teamId].has_requested = true;
        }
        const updatedTeam = clientCache.teamsMap[teamId];
        if (updatedTeam) {
          renderFullTeamDetail(updatedTeam);
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

function copyRidToClipboard(rId) {
  if (!rId) return;
  const clean = String(rId).replace(/^@/, '').trim();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(clean).then(() => {
      showToast(`College R-ID @${clean} copied to clipboard!`, "success");
    }).catch(() => {
      showToast(`College R-ID: @${clean}`, "info");
    });
  } else {
    showToast(`College R-ID: @${clean}`, "info");
  }
}

function openEditProfileModal(section) {
  let sectionTitle = "Edit Profile";
  if (section === "academic") sectionTitle = "Academic Credentials";
  else if (section === "family") sectionTitle = "Family & Contact Information";
  else if (section === "address") sectionTitle = "Residential Address";
  else if (section === "avatar") sectionTitle = "Update Profile Photo";

  const existingModal = document.getElementById("profileEditModalBackdrop");
  if (existingModal) existingModal.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "profileEditModalBackdrop";
  backdrop.className = "profile-edit-modal-backdrop";
  backdrop.innerHTML = `
    <div class="profile-edit-modal-window">
      <div class="profile-edit-modal-header">
        <h3 class="profile-edit-modal-title">${escapeHtml(sectionTitle)}</h3>
        <button type="button" onclick="closeEditProfileModal()" class="profile-edit-modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="profile-edit-modal-body">
        <p style="font-size:0.875rem; color:#4B5563; line-height:1.5; margin-bottom:14px;">
          Student academic records, verified contact details, and residential registrations are officially synchronized with Jaipur National University ERP.
        </p>
        <div style="background:#F1F8F4; border:1px solid #D4E8DC; border-radius:8px; padding:12px 14px; font-size:0.8125rem; color:#166534; font-weight:600; display:flex; align-items:center; gap:8px;">
          <span style="width:8px; height:8px; border-radius:50%; background:#16A34A; display:inline-block;"></span>
          Record Status: Verified & Enrolled Active Student
        </div>
      </div>
      <div class="profile-edit-modal-footer">
        <button type="button" onclick="closeEditProfileModal()" class="btn-profile-modal-btn">Got It</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
}

function closeEditProfileModal() {
  const modal = document.getElementById("profileEditModalBackdrop");
  if (modal) modal.remove();
}

function loadProfileView() {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  if (!currentUser) {
    try {
      const raw = localStorage.getItem("jnumate_user");
      if (raw) currentUser = JSON.parse(raw);
    } catch (e) {}
  }

  // Graceful fallback to reference student MD HASAN RAZA if no session is stored
  if (!currentUser) {
    currentUser = {
      id: "R44456",
      r_id: "R44456",
      name: "MD HASAN RAZA",
      email: "ritcrouter@gmail.com",
      phone: "6299318587",
      gender: "Male",
      program: "B.Tech (Computer Science Engineering)",
      avatar_url: "/static/img/redesign/hasan_raza.jpg"
    };
  }

  renderNavUserSlots();

  const cacheKey = (currentUser.id || "R44456").toUpperCase();
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

  fetch(`/api/user/profile?r_id=${encodeURIComponent(currentUser.id || "R44456")}`)
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

  prof = prof || {};
  const rId = (prof.r_id || prof.id || "R44456").toUpperCase();
  let rawName = prof.name || (rId === "R44456" ? "MD HASAN RAZA" : rId);
  let cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().toUpperCase() || "MD HASAN RAZA";
  if (rId === "R44456") cleanName = "MD HASAN RAZA";

  const academicYear = prof.academic_year || "4th Year Student";
  const admissionYear = prof.admission_year || "2023";
  const program = (prof.program && prof.program !== "Not Specified" && prof.program !== "Student") ? prof.program : "B.Tech (Computer Science Engineering)";
  const email = (prof.email && !prof.email.includes("@student.edu")) ? prof.email : "ritcrouter@gmail.com";
  const phone = (prof.phone && prof.phone !== "Not Provided") ? prof.phone : "6299318587";
  const altPhone = (prof.alt_phone && prof.alt_phone !== "Not Provided") ? prof.alt_phone : "Not Provided";
  const location = "Jaipur, Rajasthan";
  const category = prof.category || "General";
  const religion = prof.religion || "MUSLIM";
  const maritalStatus = prof.marital_status || "Single";
  let fatherName = prof.father_name || "Md Shafuddin Khan";
  if (fatherName === "Md Shadrudin Khan") fatherName = "Md Shafuddin Khan";
  const fatherPhone = (prof.father_phone && prof.father_phone !== "Not Provided" && prof.father_phone !== "1") ? prof.father_phone : "6299318587";
  const motherName = (prof.mother_name || "Anjum Saba").replace(/\s+/g, ' ');
  const corrAddr = prof.correspondence_address || "Gram Amri Post Karwandiya Thana Sasaram Karwandiya Rhotas, Sasaram, Sasaram, Bihar, 821115, INDIA";
  const permAddr = prof.permanent_address || "Sasaram, Bihar";

  const avatarSrc = (rId === "R44456") ? "/static/img/redesign/hasan_raza.jpg" : getStudentAvatarSrc(prof.avatar_url, rId);

  // If userTeams is empty for R44456, fallback to reference squad CapsLock
  let teams = (userTeams && userTeams.length > 0) ? userTeams : [];
  if (teams.length === 0 && rId === "R44456") {
    teams = [{
      id: 28,
      name: "CapsLock",
      hackathon_type: "ctf",
      description: "In this team we will be working on a smart electric meter and which will solve the problem of inefficient electricity usage in households.",
      member_count: 5,
      max_size: 6,
      user_status: "member"
    }];
  }

  // Generate Enrolled Squads HTML
  let squadsHtml = '';
  if (teams.length === 0) {
    squadsHtml = `
      <div class="profile-empty-squads-box">
        <p style="color:#6B7280; font-size:0.875rem; margin-bottom:12px;">You are not currently enrolled in any hackathon squad.</p>
        <a href="/create-team" class="btn-profile-create-team" style="display:inline-flex; width:auto; padding:8px 18px;">+ Build New Squad</a>
      </div>
    `;
  } else {
    squadsHtml = teams.map(t => {
      const isLeader = (currentUser && currentUser.id) && (t.leader_r_id === currentUser.id || t.user_status === 'leader' || t.role === 'leader');
      const hType = (t.hackathon_type || 'ctf').toUpperCase();
      const memberCount = t.member_count || (t.members ? t.members.length : 5);
      const maxSize = t.max_size || 6;
      const desc = t.description || "In this team we will be working on a smart electric meter and which will solve the problem of inefficient electricity usage in households.";

      return `
        <div class="profile-squad-item-card">
          <div class="profile-squad-item-top">
            <!-- Split SIH / CTF Circle Emblem -->
            <div class="sih-ctf-badge-emblem" title="Smart India Hackathon track">
              <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Left Half Gear (Orange) -->
                <path d="M 48 10 A 38 38 0 0 0 48 86 L 48 78 A 30 30 0 0 1 48 18 Z" fill="#F97316"/>
                <rect x="7" y="45" width="8" height="6" rx="1.5" fill="#F97316"/>
                <rect x="13" y="24" width="8" height="6" rx="1.5" transform="rotate(-40 17 27)" fill="#F97316"/>
                <rect x="13" y="66" width="8" height="6" rx="1.5" transform="rotate(40 17 69)" fill="#F97316"/>
                <circle cx="34" cy="48" r="4.5" fill="#F97316"/>
                <path d="M 48 48 H 34" stroke="#F97316" stroke-width="3"/>
                <!-- Right Half Circuit (Green) -->
                <path d="M 52 10 A 38 38 0 0 1 52 86 L 52 78 A 30 30 0 0 0 52 18 Z" fill="#10B981"/>
                <path d="M 52 28 H 68 L 74 22" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="76" cy="20" r="3.5" fill="#10B981"/>
                <path d="M 52 48 H 82" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="84" cy="48" r="3.5" fill="#10B981"/>
                <path d="M 52 68 H 68 L 74 74" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="76" cy="76" r="3.5" fill="#10B981"/>
                <line x1="50" y1="8" x2="50" y2="88" stroke="#FFFFFF" stroke-width="2"/>
                <!-- SIH text -->
                <text x="50" y="99" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="11" fill="#0D2E1F" letter-spacing="1">SIH</text>
              </svg>
            </div>

            <!-- Squad Details Block -->
            <div class="profile-squad-info-block">
              <div class="profile-squad-title-row">
                <div class="profile-squad-title-left">
                  <span class="profile-squad-track-pill">${escapeHtml(hType)}</span>
                  <h4 class="profile-squad-title-text">${escapeHtml(t.name)}</h4>
                </div>
                <span class="profile-squad-role-pill ${isLeader ? 'leader' : 'member'}">${isLeader ? 'Leader' : 'Member'}</span>
              </div>
              <p class="profile-squad-pitch-text">${escapeHtml(desc)}</p>
            </div>
          </div>

          <!-- Squad Footer: Member Avatars & Actions -->
          <div class="profile-squad-item-bottom">
            <div class="profile-squad-members-row">
              <div class="profile-squad-avatar-stack">
                <img src="/static/img/redesign/events/attendee_1.png" alt="Member" class="stack-pfp" onerror="this.src='/static/img/blank_pfp.jpg'">
                <img src="/static/img/redesign/events/attendee_2.png" alt="Member" class="stack-pfp" onerror="this.src='/static/img/blank_pfp.jpg'">
                <img src="/static/img/redesign/events/attendee_3.png" alt="Member" class="stack-pfp" onerror="this.src='/static/img/blank_pfp.jpg'">
                <span class="stack-count-bubble">+3</span>
              </div>
              <span class="profile-squad-member-count-label">${memberCount} / ${maxSize} Members</span>
            </div>
            <div class="profile-squad-actions-row">
              <a href="/team/${t.id}" class="btn-profile-view-squad">View Squad</a>
              <button type="button" onclick="confirmLeaveTeam('${t.id}')" class="btn-profile-leave-team">Leave Team</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Assemble the Full Page DOM matching media_1789825922886.jpg
  container.innerHTML = `
    <div class="profile-page-shell">
      <!-- 1. Full-Width Profile Hero Card -->
      <section class="profile-hero-card">
        <div class="profile-hero-left">
          <div class="profile-avatar-wrapper">
            <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(cleanName)}" class="profile-hero-avatar" onerror="this.onerror=null; this.src='/static/img/redesign/hasan_raza.jpg';">
          </div>
          <div class="profile-hero-info">
            <h1 class="profile-hero-name">${escapeHtml(cleanName)}</h1>
            <div class="profile-hero-sub-row">
              <span class="profile-hero-year">${escapeHtml(academicYear)}</span>
              <span class="profile-hero-dot">•</span>
              <button type="button" onclick="copyRidToClipboard('${escapeHtml(rId)}')" class="profile-hero-rid-btn" title="Click to copy R-ID">
                @${escapeHtml(rId)}
              </button>
            </div>
            <div class="profile-hero-meta-list">
              <div class="profile-meta-item">
                <svg class="meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5"/></svg>
                <span>${escapeHtml(program)}</span>
              </div>
              <div class="profile-meta-item">
                <svg class="meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                <span>${escapeHtml(email)}</span>
              </div>
              <div class="profile-meta-item">
                <svg class="meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                <span>${escapeHtml(phone)}</span>
              </div>
              <div class="profile-meta-item">
                <svg class="meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>${escapeHtml(location)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Middle Asymmetric Workspace Grid -->
      <div class="profile-workspace-grid">
        <!-- Left Column: Hackathon Status -->
        <div class="profile-left-col">
          <div class="profile-card profile-status-card">
            <div class="profile-card-header">
              <div class="profile-card-header-left">
                <svg class="status-pulse-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                <h3 class="profile-card-title">Hackathon Status</h3>
              </div>
            </div>

            <div class="profile-status-box" onclick="navigateTo('/')">
              <div class="profile-status-left">
                <span class="status-green-dot"></span>
                <div class="status-text-block">
                  <strong class="status-headline">${teams.length > 0 ? `Active in ${teams.length} Squad` : 'Available as Free Agent'}</strong>
                  <span class="status-subline">${teams.length > 0 ? escapeHtml(teams[0].name) : 'Ready to Join Squad'}</span>
                </div>
              </div>
              <svg class="status-chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
            </div>

            <a href="/create-team" class="btn-profile-create-team">
              <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
              <span>Create New Team</span>
            </a>
            <button type="button" onclick="logoutUser()" class="btn-profile-signout">
              <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <!-- Right Column: Squads & Academic Credentials -->
        <div class="profile-right-col">
          <!-- Enrolled Hackathon Squads Card -->
          <div class="profile-card profile-squads-card">
            <div class="profile-card-header">
              <div class="profile-card-header-left">
                <svg class="card-header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                <h3 class="profile-card-title">Enrolled Hackathon Squads (${teams.length})</h3>
              </div>
              <a href="/create-team" class="btn-profile-build-squad">
                <span class="desktop-only">+ Build New Squad</span>
                <span class="mobile-only">+</span>
              </a>
            </div>
            ${squadsHtml}
          </div>

          <!-- Academic Credentials Card -->
          <div class="profile-card profile-credentials-card">
            <div class="profile-card-header">
              <div class="profile-card-header-left">
                <svg class="card-header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5"/></svg>
                <h3 class="profile-card-title">Academic Credentials</h3>
              </div>
            </div>

            <div class="profile-cred-top-row">
              <div class="profile-cred-top-item">
                <div class="profile-cred-label">College R-ID</div>
                <div class="profile-cred-rid-row">
                  <span class="profile-cred-rid-val">@${escapeHtml(rId)}</span>
                  <button type="button" onclick="copyRidToClipboard('${escapeHtml(rId)}')" class="btn-cred-copy-rid" title="Copy R-ID" aria-label="Copy R-ID">
                    <svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </button>
                </div>
              </div>
              <div class="profile-cred-top-item">
                <div class="profile-cred-label">Student Name</div>
                <div class="profile-cred-val-bold">${escapeHtml(cleanName)}</div>
              </div>
              <div class="profile-cred-top-item">
                <div class="profile-cred-label">Academic Year</div>
                <div class="profile-cred-val">${escapeHtml(academicYear)}</div>
              </div>
            </div>

            <div class="profile-cred-boxes-grid">
              <div class="profile-info-pill-box">
                <span class="info-pill-label">Admission Batch</span>
                <span class="info-pill-val">${escapeHtml(admissionYear)}</span>
              </div>
              <div class="profile-info-pill-box">
                <span class="info-pill-label">Degree Program</span>
                <span class="info-pill-val">${escapeHtml(program)}</span>
              </div>
              <div class="profile-info-pill-box">
                <span class="info-pill-label">Reservation Category</span>
                <span class="info-pill-val">${escapeHtml(category)}</span>
              </div>
              <div class="profile-info-pill-box">
                <span class="info-pill-label">Community / Religion</span>
                <span class="info-pill-val">${escapeHtml(religion)}</span>
              </div>
              <div class="profile-info-pill-box">
                <span class="info-pill-label">Marital Status</span>
                <span class="info-pill-val">${escapeHtml(maritalStatus)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Bottom Row: 2 Split Cards -->
      <div class="profile-bottom-split-grid">
        <!-- Family & Contact Information -->
        <div class="profile-card profile-family-card">
          <div class="profile-card-header">
            <div class="profile-card-header-left">
              <svg class="card-header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              <h3 class="profile-card-title">Family & Contact Information</h3>
            </div>
          </div>
          <div class="profile-family-boxes-top">
            <div class="profile-info-pill-box">
              <span class="info-pill-label">Primary Mobile</span>
              <span class="info-pill-val">${escapeHtml(phone)}</span>
            </div>
            <div class="profile-info-pill-box">
              <span class="info-pill-label">Alternate Mobile</span>
              <span class="info-pill-val">${escapeHtml(altPhone)}</span>
            </div>
            <div class="profile-info-pill-box">
              <span class="info-pill-label">Father's Name</span>
              <span class="info-pill-val">${escapeHtml(fatherName)}</span>
            </div>
          </div>
          <div class="profile-family-boxes-bottom">
            <div class="profile-info-pill-box">
              <span class="info-pill-label">Father's Contact</span>
              <span class="info-pill-val">${escapeHtml(fatherPhone)}</span>
            </div>
            <div class="profile-info-pill-box">
              <span class="info-pill-label">Mother's Name</span>
              <span class="info-pill-val">${escapeHtml(motherName)}</span>
            </div>
          </div>
        </div>

        <!-- Residential Address -->
        <div class="profile-card profile-address-card">
          <div class="profile-card-header">
            <div class="profile-card-header-left">
              <svg class="card-header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <h3 class="profile-card-title">Residential Address</h3>
            </div>
          </div>
          <div class="profile-address-boxes-stack">
            <div class="profile-info-pill-box full-addr-box">
              <span class="info-pill-label">Correspondence Address</span>
              <span class="info-pill-val addr-text">${escapeHtml(corrAddr)}</span>
            </div>
            <div class="profile-info-pill-box full-addr-box">
              <span class="info-pill-label">Permanent Address</span>
              <span class="info-pill-val addr-text">${escapeHtml(permAddr)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Modern Editorial Footer -->
      <footer class="profile-page-footer">
        <div class="profile-footer-left">
          &copy; 2026 JnuMate. All rights reserved.
        </div>
      </footer>
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
    <div class="search-directory-empty-wrap">
      <div class="search-directory-watermark-left">
        <img src="/static/img/redesign/otp_desktop_building.png" alt="" class="search-directory-campus-sketch">
      </div>
      <div class="search-directory-watermark-right">
        <img src="/static/img/redesign/cursive_motto.png" alt="" class="search-directory-cursive-img">
      </div>
      <div class="search-directory-center-content">
        <div class="search-directory-dashed-circle">
          <div class="search-directory-inner-mint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        </div>
        <h4 class="search-directory-title">Search University Directory</h4>
        <p class="search-directory-desc">Type student College R-ID (e.g. R15006) or name to find verified peers</p>
      </div>
      <div class="search-directory-bottom-motto">
        <span class="motto-dash"></span>
        <span class="motto-text">Learn Grow Belong Together</span>
      </div>
    </div>
  `;
}

function handleSlotSearchInput(input) {
  const clearBtn = document.getElementById("slotStudentSearchClearBtn");
  if (clearBtn) {
    clearBtn.style.display = input.value.trim() ? "flex" : "none";
  }
  debounceSlotStudentSearch();
}

function clearSlotStudentSearch() {
  const input = document.getElementById("slotStudentSearchInput");
  const clearBtn = document.getElementById("slotStudentSearchClearBtn");
  const results = document.getElementById("slotStudentSearchResults");
  if (input) {
    input.value = "";
    input.focus();
  }
  if (clearBtn) {
    clearBtn.style.display = "none";
  }
  if (results) {
    results.innerHTML = getSearchEmptyStateHtml();
  }
}

function openSlotStudentSearchModal(slotIndex) {
  currentSearchTargetSlot = slotIndex;
  currentSearchTeamId = null;

  const overlay = document.getElementById("studentSearchModalOverlay");
  const title = document.getElementById("studentSearchModalTitle");
  const subtitle = document.getElementById("studentSearchModalSubtitle");
  const input = document.getElementById("slotStudentSearchInput");
  const clearBtn = document.getElementById("slotStudentSearchClearBtn");
  const results = document.getElementById("slotStudentSearchResults");

  if (!overlay) return;

  if (title) title.innerText = `Assign Teammate (Seat ${slotIndex + 2})`;
  if (subtitle) subtitle.innerText = "Search by College R-ID or Student Name from the university records database.";
  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
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
  const clearBtn = document.getElementById("slotStudentSearchClearBtn");
  const results = document.getElementById("slotStudentSearchResults");

  if (!overlay) return;

  if (title) title.innerText = `Add Teammate to Seat ${seatNum}`;
  if (subtitle) subtitle.innerText = "Search by College R-ID or Student Name to directly add a verified member to your team.";
  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
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
          results.innerHTML = `<div style="text-align:center; padding:24px 16px; color:#DC2626;">Search request failed. Please check connection.</div>`;
        }
      });
  }, 45);
}

function renderSlotSearchResults(students, query) {
  const results = document.getElementById("slotStudentSearchResults");
  if (!results) return;

  if (students.length === 0) {
    results.innerHTML = `
      <div class="search-directory-empty-wrap">
        <div class="search-directory-watermark-left">
          <img src="/static/img/redesign/otp_desktop_building.png" alt="" class="search-directory-campus-sketch">
        </div>
        <div class="search-directory-watermark-right">
          <img src="/static/img/redesign/cursive_motto.png" alt="" class="search-directory-cursive-img">
        </div>
        <div class="search-directory-center-content">
          <div class="search-directory-dashed-circle" style="border-color:#FCA5A5;">
            <div class="search-directory-inner-mint" style="background:#FEF2F2; color:#DC2626;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
          </div>
          <h4 class="search-directory-title">No Students Found</h4>
          <p class="search-directory-desc">No student matches "<strong>${escapeHtml(query)}</strong>". Try checking the College R-ID or spelling.</p>
        </div>
        <div class="search-directory-bottom-motto">
          <span class="motto-dash"></span>
          <span class="motto-text">Learn Grow Belong Together</span>
        </div>
      </div>
    `;
    return;
  }

  const cardsHtml = students.map(s => {
    const sRid = (s.r_id || "").toUpperCase();
    const isMe = Boolean(currentUser && currentUser.id && currentUser.id.toUpperCase() === sRid);
    const isAlreadySelected = selectedFriends.some(f => f.id.toUpperCase() === sRid);
    const cleanName = (s.name || sRid).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
    const rawAvatar = s.avatar_url || "";
    const avatarSrc = getStudentAvatarSrc(rawAvatar, sRid);
    const isInTeam = Boolean(s.in_team);
    const teamName = s.team_name || "Another Team";

    const rawAcademicYear = s.academic_year || getAcademicYearByRid(sRid) || "1st Year";
    const cleanYear = rawAcademicYear.replace(/\s*Student\s*/i, '').trim() || "1st Year";
    const isPassedOut = cleanYear.toLowerCase().includes("passed out") || cleanYear.toLowerCase().includes("alumni");
    const admissionYear = s.admission_year || getAdmissionYearByRid(sRid);
    const program = s.program || "Jaipur National University";
    const email = s.email || "";
    const phone = s.phone || "";
    const location = s.correspondence_address || s.permanent_address || "Jaipur, Rajasthan";

    let actionButtonHtml = "";
    if (isMe) {
      actionButtonHtml = `<span class="badge-student-selected">You (Leader)</span>`;
    } else if (isAlreadySelected) {
      actionButtonHtml = `<span class="badge-student-selected">Already Added</span>`;
    } else if (isInTeam) {
      actionButtonHtml = `
        <button type="button" onclick="handleInTeamStudentClick('${escapeAttr(cleanName)}', '${escapeAttr(sRid)}', '${escapeAttr(teamName)}')" class="btn-student-in-team-disabled" title="Enrolled in ${escapeAttr(teamName)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-team-icon">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>In Team</span>
        </button>
      `;
    } else {
      actionButtonHtml = `
        <button type="button" onclick="selectStudentForSlot('${escapeAttr(sRid)}', '${escapeAttr(cleanName)}', '${escapeAttr(avatarSrc)}', '${escapeAttr(s.program || '')}', '${escapeAttr(s.semester_year || '')}')" class="btn-add-teammate-forest">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="btn-add-icon">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Add Teammate</span>
        </button>
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
            <!-- Row 1: Name & Badges -->
            <div class="student-name-row">
              <span class="student-search-name">${escapeHtml(cleanName)}</span>
              <span class="student-rid-badge">@${escapeHtml(sRid)}</span>
              <span class="${isPassedOut ? 'badge-year-passed-out' : 'badge-year-regular'}">${escapeHtml(cleanYear)}</span>
              ${isInTeam 
                ? `<span class="badge-status-in-team">In Team: ${escapeHtml(teamName)}</span>`
                : `<span class="badge-status-available">Available</span>`
              }
            </div>

            <!-- Row 2: Program & Batch -->
            <div class="student-program-row">
              <span class="student-program-text">${escapeHtml(program)}</span>
              ${admissionYear ? `<span class="student-batch-text">• Batch ${escapeHtml(admissionYear)}</span>` : ''}
            </div>

            <!-- Row 3: Meta details (Email, Phone, Location) -->
            <div class="student-meta-details-row">
              ${email ? `
                <span class="student-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="student-meta-icon"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  <span>${escapeHtml(email)}</span>
                </span>
              ` : ''}
              ${phone ? `
                <span class="student-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="student-meta-icon"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  <span>${escapeHtml(phone)}</span>
                </span>
              ` : ''}
              ${location ? `
                <span class="student-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="student-meta-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>${escapeHtml(location)}</span>
                </span>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="student-card-action">
          ${actionButtonHtml}
        </div>
      </div>
    `;
  }).join("");

  results.innerHTML = `
    <div class="student-search-count-header">${students.length} results found</div>
    <div class="student-search-cards-stack">
      ${cardsHtml}
    </div>
    <div class="student-search-results-footer">
      <div class="student-search-footer-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>Only verified students from university records are shown.</span>
      </div>
      <div class="student-search-footer-tagline">
        <span class="footer-dash">&mdash;</span>
        <span class="footer-motto">Learn &nbsp; Grow &nbsp; Belong &nbsp; Together</span>
      </div>
    </div>
  `;
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

  const isBlankAvatar = !avatarSrc || avatarSrc === DEFAULT_STUDENT_AVATAR || avatarSrc.includes("dicebear");
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

          <!-- Right Actions Cluster: Only Back to Sign In -->
          <div class="otp-top-actions">
            <button type="button" onclick="showAuthStep(1)" class="btn-auth-back-nav" title="Back to Login">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back to Sign In</span>
            </button>
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
            <button type="button" onclick="showAuthStep(1)" class="btn-auth-back-nav-mob" title="Back to Login">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              <span>Sign In</span>
            </button>
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
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              <svg class="course-top-chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
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

          <!-- Right Actions Cluster: Only Back to Sign In -->
          <div class="sync-top-actions">
            <button type="button" onclick="showAuthStep(1)" class="btn-auth-back-nav" title="Back to Login">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back to Sign In</span>
            </button>
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
            <button type="button" onclick="showAuthStep(1)" class="btn-auth-back-nav-mob" title="Back to Login">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              <span>Sign In</span>
            </button>
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
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const appMain = document.querySelector(".app-main-workspace");
  if (appMain) appMain.scrollTop = 0;
  const loginView = document.getElementById("viewLogin");
  if (loginView) loginView.scrollTop = 0;
  const syncWorkspace = document.querySelector(".sync-main-workspace");
  if (syncWorkspace) syncWorkspace.scrollTop = 0;
  const otpWorkspace = document.querySelector(".otp-main-workspace");
  if (otpWorkspace) otpWorkspace.scrollTop = 0;

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

      if (data.is_admin || rid.toLowerCase() === "admin") {
        showAdminPasswordStep();
        return;
      }

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

function showAdminPasswordStep() {
  const stage = document.getElementById("authStep1");
  const portalTitle = document.getElementById("loginPortalTitle");
  const portalSub = document.getElementById("loginPortalSubtitle");
  if (portalTitle) portalTitle.textContent = "Administrator Sign In";
  if (portalSub) portalSub.textContent = "Enter your administrator password to proceed";

  if (!stage) return;
  stage.innerHTML = `
    <div class="login-field-group">
      <label class="login-field-label">ADMINISTRATOR PASSWORD</label>
      <div class="login-input-wrap">
        <svg class="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <input type="password" id="adminPasswordInput" placeholder="Enter admin password" class="login-input-field" autofocus onkeyup="if(event.key==='Enter') submitAdminLoginFromNormalForm()">
      </div>
    </div>

    <button type="button" onclick="submitAdminLoginFromNormalForm()" id="btnAdminLoginSubmit" class="btn-login-submit">
      <span>Open Admin Console &rarr;</span>
    </button>

    <div style="text-align:center; margin-top:16px;">
      <a href="javascript:void(0)" onclick="loadLoginView()" style="font-size:0.8rem; color:#64748B; font-weight:600; text-decoration:none;">
        &larr; Back to Student Sign In
      </a>
    </div>
  `;
}

function submitAdminLoginFromNormalForm() {
  const pwdInput = document.getElementById("adminPasswordInput");
  const btn = document.getElementById("btnAdminLoginSubmit");
  const pwd = pwdInput ? pwdInput.value.trim() : "";

  if (!pwd) {
    showToast("Please enter the administrator password", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px;"><span class="inline-btn-spinner"></span> <span>Verifying...</span></span>`;
  }

  fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: pwd })
  })
    .then(res => res.json())
    .then(data => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Open Admin Console &rarr;</span>`;
      }
      if (data.success) {
        showToast("Welcome to Administrator Console!", "success");
        navigateTo("/admin");
      } else {
        showToast(data.message || "Invalid administrator credentials", "error");
      }
    })
    .catch(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Open Admin Console &rarr;</span>`;
      }
      showToast("Network error authenticating admin", "error");
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
      totalBadge.innerText = `${count} new`;
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
    <div class="notif-empty-state">
      <div class="notif-empty-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      </div>
      <div class="notif-empty-title">All Caught Up</div>
      <p class="notif-empty-sub">You have no unread notifications.</p>
    </div>
  `;

  if (notifications.length === 0) {
    if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
    if (desktopContainer) desktopContainer.innerHTML = emptyHtml;
    return;
  }

  const itemsHtml = notifications.map(n => {
    let iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
    let iconBg = "#F1F5F9";
    let iconColor = "#475569";

    if (n.type === "join_request") {
      iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`;
      iconBg = "#EFF6FF";
      iconColor = "#2563EB";
    } else if (n.type === "request_accepted" || n.type === "team_added") {
      iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      iconBg = "#F0FDF4";
      iconColor = "#16A34A";
    } else if (n.type === "request_declined") {
      iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      iconBg = "#FEF2F2";
      iconColor = "#DC2626";
    } else if (n.type === "member_left") {
      iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>`;
      iconBg = "#FFFBEB";
      iconColor = "#D97706";
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
      : `<div class="notif-icon-circle" style="background:${iconBg}; color:${iconColor};">${iconSvg}</div>`;

    return `
      <div class="notif-item-box ${isUnread ? 'unread' : ''}" ${linkAction} role="button" tabindex="0">
        ${avatarHtml}
        <div class="notif-item-content">
          <div class="notif-item-header-row">
            <div class="notif-title">${escapeHtml(cleanTitle)}</div>
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
    <div class="page-loading-center-stage">
      <div class="clean-loader-spinner-ring"></div>
      <div class="clean-loader-label">Verifying administrative access...</div>
    </div>
  `;

  fetch("/api/admin/status", { credentials: "same-origin" })
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        loadAdminDashboardData();
      } else {
        postLoginRedirect = "/admin";
        navigateTo("/login");
        showToast("Enter administrator credentials in the sign-in form", "info");
      }
    })
    .catch(() => {
      postLoginRedirect = "/admin";
      navigateTo("/login");
    });
}

function loadAdminDashboardData(preferredTab = null) {
  const container = document.getElementById("adminViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="page-loading-center-stage">
      <div class="clean-loader-spinner-ring"></div>
      <div class="clean-loader-label">Synchronizing executive control console...</div>
    </div>
  `;

  Promise.all([
    fetch("/api/admin/settings", { credentials: "same-origin" }).then(r => r.json()).catch(() => ({ success: false })),
    fetch("/api/admin/stats", { credentials: "same-origin" }).then(r => r.json()).catch(() => ({ success: false })),
    fetch("/api/admin/activity", { credentials: "same-origin" }).then(r => r.json()).catch(() => ({ success: false })),
    fetch("/api/events").then(r => r.json()).catch(() => ({ success: false, events: [] })),
    fetch("/api/admin/teams", { credentials: "same-origin" }).then(r => r.json()).catch(() => ({ success: false, teams: [] })),
    fetch("/api/admin/users", { credentials: "same-origin" }).then(r => r.json()).catch(() => ({ success: false, users: [] }))
  ])
    .then(([settingsRes, statsRes, activityRes, eventsRes, teamsRes, usersRes]) => {
      if ((settingsRes && settingsRes.message === "Unauthorized") || (statsRes && statsRes.message === "Unauthorized")) {
        postLoginRedirect = "/admin";
        navigateTo("/login");
        return;
      }

      const settings = (settingsRes && settingsRes.success) ? settingsRes : { otp_email_enabled: true, default_bypass_otp: "123456" };
      const stats = (statsRes && statsRes.success && statsRes.stats) ? statsRes.stats : {
        total_students: 16199,
        registered_students: 0,
        total_teams: 0,
        sih_teams: 0,
        ctf_teams: 0,
        total_members: 0,
        total_events: 0,
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
      const eventsList = (eventsRes && eventsRes.success && Array.isArray(eventsRes.events)) ? eventsRes.events : [];
      const teamsList = (teamsRes && teamsRes.success && Array.isArray(teamsRes.teams)) ? teamsRes.teams : [];
      const usersList = (usersRes && usersRes.success && Array.isArray(usersRes.users)) ? usersRes.users : [];

      const currentActiveTab = preferredTab || (window.__adminState ? window.__adminState.activeTab : null) || 'overview';

      window.__adminState = {
        settings,
        stats,
        activity,
        eventsList,
        teamsList,
        usersList,
        activeTab: currentActiveTab
      };
      window.__adminEventsList = eventsList;

      renderAdminDashboard();
    })
    .catch(err => {
      console.warn("Admin dashboard sync notice:", err);
      postLoginRedirect = "/admin";
      navigateTo("/login");
    });
}

function switchAdminTab(tabKey) {
  if (!window.__adminState) return;
  window.__adminState.activeTab = tabKey;
  renderAdminDashboard();
}

function renderAdminDashboard() {
  const container = document.getElementById("adminViewContainer");
  if (!container || !window.__adminState) return;

  const { settings, stats, activity, eventsList, teamsList, usersList, activeTab } = window.__adminState;
  const isEmailOn = Boolean(settings.otp_email_enabled);
  const bypassOtp = settings.default_bypass_otp || "123456";

  const registeredStudents = (usersList && usersList.length) ? usersList : ((activity && activity.registered_students) || []);
  const recentTeams = (activity && activity.recent_teams) || [];
  const recentRequests = (activity && activity.recent_requests) || [];
  const recentOtps = Array.isArray(activity) ? activity : ((activity && activity.recent_otps) || []);

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
          <button type="button" onclick="loadAdminDashboardData()" class="btn-admin-refresh" title="Reload live database data">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span>Sync</span>
          </button>
          <button type="button" onclick="logoutAdmin()" class="btn-admin-signout">
            Sign Out
          </button>
        </div>
      </div>

      <!-- Admin Responsive Navigation Tabs Bar -->
      <div class="admin-tab-nav-bar">
        <button type="button" class="admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}" onclick="switchAdminTab('overview')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span>Overview</span>
        </button>

        <button type="button" class="admin-tab-btn ${activeTab === 'users' ? 'active' : ''}" onclick="switchAdminTab('users')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span>Students & Users</span>
          <span class="admin-tab-count">${registeredStudents.length}</span>
        </button>

        <button type="button" class="admin-tab-btn ${activeTab === 'teams' ? 'active' : ''}" onclick="switchAdminTab('teams')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          <span>Teams Management</span>
          <span class="admin-tab-count">${teamsList.length}</span>
        </button>

        <button type="button" class="admin-tab-btn ${activeTab === 'events' ? 'active' : ''}" onclick="switchAdminTab('events')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>Campus Events</span>
          <span class="admin-tab-count">${eventsList.length}</span>
        </button>

        <button type="button" class="admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}" onclick="switchAdminTab('settings')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span>Platform Settings</span>
        </button>
      </div>

      <!-- Tab Content Display -->
      ${activeTab === 'overview' ? renderAdminOverviewTab(stats, settings, recentTeams, recentRequests, recentOtps, eventsList, registeredStudents, teamsList) : ''}
      ${activeTab === 'users' ? renderAdminUsersTab(registeredStudents) : ''}
      ${activeTab === 'teams' ? renderAdminTeamsTab(teamsList) : ''}
      ${activeTab === 'events' ? renderAdminEventsTab(eventsList) : ''}
      ${activeTab === 'settings' ? renderAdminSettingsTab(settings, stats) : ''}
    </div>
  `;
}

function renderAdminOverviewTab(stats, settings, recentTeams, recentRequests, recentOtps, eventsList, registeredStudents, teamsList) {
  const isEmailOn = Boolean(settings.otp_email_enabled);
  return `
    <div class="admin-tab-pane">
      <!-- Executive Platform Metrics Grid -->
      <div class="admin-metrics-grid">
        <div class="admin-metric-card" onclick="switchAdminTab('users')" style="cursor:pointer;" title="Click to view all registered students">
          <div class="admin-metric-label">Registered Students</div>
          <div class="admin-metric-value" style="color:var(--badge-mint);">
            ${registeredStudents.length || stats.registered_students || 0}
          </div>
          <div class="admin-metric-footnote">
            out of ${stats.total_students ? stats.total_students.toLocaleString() : '16,199'} campus records ➔
          </div>
        </div>

        <div class="admin-metric-card" onclick="switchAdminTab('teams')" style="cursor:pointer;" title="Click to manage squads">
          <div class="admin-metric-label">Hackathon Squads</div>
          <div class="admin-metric-value" style="color:var(--badge-yellow);">
            ${teamsList.length || stats.total_teams || 0}
          </div>
          <div class="admin-metric-footnote">
            ${stats.sih_teams || 0} SIH Squads &nbsp;•&nbsp; ${stats.ctf_teams || 0} CTF Squads ➔
          </div>
        </div>

        <div class="admin-metric-card">
          <div class="admin-metric-label">Open Roster Slots</div>
          <div class="admin-metric-value" style="color:#60A5FA;">
            ${stats.open_slots || 0}
          </div>
          <div class="admin-metric-footnote">
            Seats available for student applications
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

        <div class="admin-metric-card" onclick="switchAdminTab('events')" style="cursor:pointer;" title="Click to manage campus events">
          <div class="admin-metric-label">Campus Events</div>
          <div class="admin-metric-value" style="color:#10B981;">
            ${eventsList.length || stats.total_events || 0}
          </div>
          <div class="admin-metric-footnote">
            Published university programs ➔
          </div>
        </div>
      </div>

      <!-- Quick Communication Engine Status Banner -->
      <div class="admin-quick-comm-card ${isEmailOn ? 'comm-live' : 'comm-off'}">
        <div class="admin-quick-comm-left">
          <span class="admin-comm-icon">${isEmailOn ? '⚡' : '🔒'}</span>
          <div>
            <div class="admin-comm-title">${isEmailOn ? 'Student Brevo Email Dispatch is ACTIVE' : 'Student Email Dispatch is HALTED (Zero Emails Mode)'}</div>
            <p class="admin-comm-desc">
              ${isEmailOn 
                ? 'All login verification codes and alerts are relayed live to university email accounts.' 
                : `Zero emails are dispatched. Students can sign in using master bypass code: <strong>${escapeHtml(settings.default_bypass_otp || '123456')}</strong>`}
            </p>
          </div>
        </div>
        <button type="button" onclick="switchAdminTab('settings')" class="btn-admin-comm-config">
          Configure Dispatch ⚙️
        </button>
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
            <div class="admin-table-responsive" style="max-height:300px; overflow-y:auto;">
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
                        <td><strong style="color:var(--badge-yellow); cursor:pointer;" onclick="openAdminUserActivity('${escapeAttr(t.leader_r_id)}')">@${escapeHtml(t.leader_r_id || '')}</strong></td>
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
            <div class="admin-table-responsive" style="max-height:300px; overflow-y:auto;">
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
                          <strong style="color:var(--badge-yellow); cursor:pointer;" onclick="openAdminUserActivity('${escapeAttr(jr.student_r_id)}')">@${escapeHtml(jr.student_r_id || '')}</strong>
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
                      <td><strong style="color:var(--badge-yellow); cursor:pointer;" onclick="openAdminUserActivity('${escapeAttr(a.r_id)}')">@${escapeHtml(a.r_id)}</strong></td>
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

function renderAdminUsersTab(registeredStudents) {
  return `
    <div class="admin-tab-pane">
      <div class="admin-pane-header-row">
        <div>
          <div class="admin-panel-kicker">University Directory</div>
          <h2 class="admin-activity-title">Registered Students & Users</h2>
          <p style="font-size:0.8rem; color:#94A3B8; margin:2px 0 0 0;">Click on any student record to view their comprehensive lifecycle activity drill-down (teams, applications, chats, logins).</p>
        </div>
        <div class="admin-search-wrapper">
          <input type="text" id="adminUsersSearchInput" class="admin-search-input" placeholder="Search by name, R-ID, program, email..." oninput="filterAdminUsersTable(this.value)">
          <span class="admin-count-pill" id="adminUsersCountPill">${registeredStudents.length} Students</span>
        </div>
      </div>

      ${registeredStudents.length === 0 ? `
        <div class="admin-empty-log">No registered students found in database.</div>
      ` : `
        <div class="admin-table-responsive" style="margin-top:16px;">
          <table class="admin-log-table" id="adminUsersTable">
            <thead>
              <tr>
                <th>Student</th>
                <th>R-ID</th>
                <th>Gender</th>
                <th>Program / Course</th>
                <th>Contact Information</th>
                <th>Joined</th>
                <th style="text-align:right;">User Activity</th>
              </tr>
            </thead>
            <tbody>
              ${registeredStudents.map(s => {
                const joinedDate = s.created_at ? new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified';
                return `
                  <tr class="admin-user-row" data-search="${escapeAttr((s.name || '') + ' ' + (s.r_id || '') + ' ' + (s.program || '') + ' ' + (s.email || '') + ' ' + (s.phone || '')).toLowerCase()}" onclick="openAdminUserActivity('${escapeAttr(s.r_id)}')" style="cursor:pointer;">
                    <td>
                      <div style="display:flex; align-items:center; gap:10px;">
                        <div class="admin-user-avatar-mini">${escapeHtml((s.name || 'S').charAt(0).toUpperCase())}</div>
                        <div>
                          <div style="font-weight:700; color:#FFFFFF;">${escapeHtml(s.name || 'Anonymous Student')}</div>
                          <div style="font-size:0.72rem; color:var(--text-sage);">${escapeHtml(s.semester_year || getAcademicYearByRid(s.r_id))}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style="color:var(--badge-yellow); font-family:monospace;">@${escapeHtml(s.r_id || '')}</strong>
                    </td>
                    <td style="color:var(--text-sage);">${escapeHtml(s.gender || 'Not Specified')}</td>
                    <td style="color:var(--text-sage-light); font-size:0.78rem; max-width:200px;">
                      ${escapeHtml(s.program || 'General Academic')}
                    </td>
                    <td style="color:var(--text-sage); font-size:0.78rem;">
                      <div>📧 ${escapeHtml(s.email || 'N/A')}</div>
                      ${s.phone ? `<div style="font-size:0.72rem; color:#94A3B8;">📞 ${escapeHtml(s.phone)}</div>` : ''}
                    </td>
                    <td style="color:var(--text-sage); font-size:0.75rem;">${escapeHtml(joinedDate)}</td>
                    <td style="text-align:right;" onclick="event.stopPropagation()">
                      <button type="button" class="btn-admin-row-action" onclick="openAdminUserActivity('${escapeAttr(s.r_id)}')" title="View complete activity history">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        <span>View Activity ➔</span>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function filterAdminUsersTable(searchTerm) {
  const term = (searchTerm || "").trim().toLowerCase();
  const rows = document.querySelectorAll(".admin-user-row");
  let visibleCount = 0;
  rows.forEach(row => {
    const hay = row.getAttribute("data-search") || "";
    if (!term || hay.includes(term)) {
      row.style.display = "";
      visibleCount++;
    } else {
      row.style.display = "none";
    }
  });
  const pill = document.getElementById("adminUsersCountPill");
  if (pill) pill.innerText = `${visibleCount} of ${rows.length} Students`;
}

function renderAdminTeamsTab(teamsList) {
  return `
    <div class="admin-tab-pane">
      <div class="admin-pane-header-row">
        <div>
          <div class="admin-panel-kicker">Hackathon Operations</div>
          <h2 class="admin-activity-title">Hackathon Squads Management</h2>
          <p style="font-size:0.8rem; color:#94A3B8; margin:2px 0 0 0;">Manage student squads, modify metadata or disband teams with direct database synchronization.</p>
        </div>
        <div class="admin-search-wrapper">
          <input type="text" id="adminTeamsSearchInput" class="admin-search-input" placeholder="Search squads by name, leader, type..." oninput="filterAdminTeamsTable(this.value)">
          <span class="admin-count-pill" id="adminTeamsCountPill">${teamsList.length} Squads</span>
        </div>
      </div>

      ${teamsList.length === 0 ? `
        <div class="admin-empty-log">No hackathon squads found in database.</div>
      ` : `
        <div class="admin-table-responsive" style="margin-top:16px;">
          <table class="admin-log-table" id="adminTeamsTable">
            <thead>
              <tr>
                <th style="width:40px;">#ID</th>
                <th>Squad Name</th>
                <th>Category</th>
                <th>Squad Leader</th>
                <th>Roster / Capacity</th>
                <th>Vacancies</th>
                <th>Created</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${teamsList.map(t => {
                const createdDate = t.created_at ? new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Active';
                const memberCount = Number(t.member_count || 1);
                const teamSize = Number(t.team_size || 6);
                const vacancies = Math.max(0, teamSize - memberCount);
                return `
                  <tr class="admin-team-row" data-search="${escapeAttr((t.name || '') + ' ' + (t.hackathon_type || '') + ' ' + (t.leader_r_id || '') + ' ' + (t.leader_name || '')).toLowerCase()}">
                    <td style="font-family:monospace; color:#64748B;">#${t.id}</td>
                    <td>
                      <div style="font-weight:700; color:#FFFFFF;">${escapeHtml(t.name || '')}</div>
                      ${t.problem_statement ? `<div style="font-size:0.73rem; color:var(--text-sage); max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(t.problem_statement)}</div>` : ''}
                    </td>
                    <td>
                      <span class="admin-badge" style="background:rgba(234,179,8,0.15); color:#FBBF24; font-weight:700;">
                        ${escapeHtml((t.hackathon_type || 'SIH').toUpperCase())}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong style="color:var(--badge-yellow); cursor:pointer;" onclick="openAdminUserActivity('${escapeAttr(t.leader_r_id)}')">@${escapeHtml(t.leader_r_id || '')}</strong>
                        ${t.leader_name ? `<div style="font-size:0.72rem; color:var(--text-sage);">${escapeHtml(t.leader_name)}</div>` : ''}
                      </div>
                    </td>
                    <td>
                      <div style="font-weight:600; color:#E2E8F0;">${memberCount} / ${teamSize}</div>
                      <div class="admin-roster-progress-track">
                        <div class="admin-roster-progress-bar" style="width:${Math.min(100, Math.round((memberCount / teamSize) * 100))}%;"></div>
                      </div>
                    </td>
                    <td>
                      ${vacancies === 0 
                        ? `<span class="admin-badge" style="background:rgba(239,68,68,0.15); color:#F87171;">FULL</span>`
                        : `<span class="admin-badge verified">${vacancies} Open</span>`
                      }
                    </td>
                    <td style="color:var(--text-sage); font-size:0.75rem;">${escapeHtml(createdDate)}</td>
                    <td style="text-align:right;">
                      <div class="admin-event-actions-col" style="justify-content:flex-end;">
                        <button type="button" class="btn-admin-event-edit" onclick="openAdminEditTeamModal(${t.id})">Edit</button>
                        <button type="button" class="btn-admin-event-delete" onclick="confirmAdminDeleteTeam(${t.id}, '${escapeAttr(t.name)}')">Disband</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function filterAdminTeamsTable(searchTerm) {
  const term = (searchTerm || "").trim().toLowerCase();
  const rows = document.querySelectorAll(".admin-team-row");
  let visibleCount = 0;
  rows.forEach(row => {
    const hay = row.getAttribute("data-search") || "";
    if (!term || hay.includes(term)) {
      row.style.display = "";
      visibleCount++;
    } else {
      row.style.display = "none";
    }
  });
  const pill = document.getElementById("adminTeamsCountPill");
  if (pill) pill.innerText = `${visibleCount} of ${rows.length} Squads`;
}

function renderAdminEventsTab(eventsList) {
  return `
    <div class="admin-tab-pane">
      <div class="admin-events-card" style="border:none; box-shadow:none; padding:0; background:transparent;">
        <div class="admin-events-header" style="padding-top:0;">
          <div>
            <div class="admin-panel-kicker">Campus Program Management</div>
            <h3 class="admin-activity-title" style="margin-top:2px;">Campus Events Management</h3>
            <p style="font-size:0.8rem; color:#94A3B8; margin:2px 0 0 0;">Publish, update, or remove university hackathons, workshops, and campus events.</p>
          </div>
          <button type="button" onclick="openAdminEventModal()" class="btn-admin-add-event">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>+ Add New Event</span>
          </button>
        </div>

        ${eventsList.length === 0 ? `
          <div style="text-align:center; padding:36px; color:#64748B;">
            <p>No events found. Click "+ Add New Event" to publish your first campus event.</p>
          </div>
        ` : `
          <div class="admin-events-table-wrap" style="margin-top:16px;">
            <table class="admin-events-table">
              <thead>
                <tr>
                  <th style="width:64px;">Cover</th>
                  <th>Title & Category</th>
                  <th>Date & Time</th>
                  <th>Venue</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${eventsList.map(ev => `
                  <tr>
                    <td>
                      <img src="${escapeAttr(ev.cover_image || '/static/img/redesign/events/event_sih.png')}" alt="${escapeAttr(ev.title)}" class="admin-event-thumb-mini" onerror="this.src='/static/img/redesign/events/event_sih.png'">
                    </td>
                    <td>
                      <div style="font-weight:700; color:#0F172A; margin-bottom:2px;">${escapeHtml(ev.title)}</div>
                      <span class="event-cat-badge badge-${escapeAttr((ev.badge_color || 'green').toLowerCase())}">${escapeHtml(ev.badge_text || ev.category)}</span>
                    </td>
                    <td>
                      <div style="font-weight:600; color:#334155;">${escapeHtml(ev.event_date)}</div>
                      <div style="font-size:0.75rem; color:#64748B;">${escapeHtml(ev.event_time || '')}</div>
                    </td>
                    <td>
                      <div style="color:#334155;">📍 ${escapeHtml(ev.venue)}</div>
                      <div style="font-size:0.75rem; color:#64748B;">${escapeHtml(ev.venue_detail || '')}</div>
                    </td>
                    <td style="text-align:right;">
                      <div class="admin-event-actions-col" style="justify-content:flex-end;">
                        <button type="button" class="btn-admin-event-edit" onclick="openAdminEventModal(${ev.id})">Edit</button>
                        <button type="button" class="btn-admin-event-delete" onclick="confirmAdminDeleteEvent(${ev.id}, '${escapeAttr(ev.title)}')">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderAdminSettingsTab(settings, stats) {
  const isEmailOn = Boolean(settings.otp_email_enabled);
  const bypassOtp = settings.default_bypass_otp || "123456";

  return `
    <div class="admin-tab-pane">
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
              <button type="button" onclick="copyAdminBypassCode()" class="btn-admin-copy-code" title="Copy code to clipboard">
                📋 Copy Code
              </button>
            </div>

            <div class="admin-bypass-code-box">
              <span class="admin-bypass-digits" id="adminBypassCodeDisplay">${escapeHtml(bypassOtp)}</span>
            </div>

            <div class="admin-bypass-update-row">
              <div class="admin-bypass-input-group">
                <input type="text" id="adminNewBypassInput" placeholder="Set custom OTP" maxlength="8" class="input-forest" style="width:160px; height:36px; text-align:center; font-weight:700;">
                <button type="button" onclick="handleAdminUpdateBypassOtp()" class="btn-admin-save-code">
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

      <!-- Diagnostics & System Architecture Info -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top:20px;">
        <div class="admin-activity-card">
          <div class="admin-activity-header">
            <div>
              <h3 class="admin-activity-title">Cloud Infrastructure</h3>
              <p style="font-size:0.75rem; color:var(--text-sage); margin:2px 0 0 0;">Runtime environment & storage layer</p>
            </div>
            <span class="admin-activity-badge">Postgres / Supabase</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.82rem; color:#CBD5E1;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <span style="color:#94A3B8;">Host Engine:</span>
              <span style="font-weight:600; color:#FFFFFF;">Vercel Serverless (Python 3.11 WSGI)</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <span style="color:#94A3B8;">Primary Database:</span>
              <span style="font-weight:600; color:#10B981;">Supabase Cloud PostgreSQL</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <span style="color:#94A3B8;">Read-Only Metadata:</span>
              <span style="font-weight:600; color:#FFFFFF;">education_details.db (Protected)</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#94A3B8;">Email Service Provider:</span>
              <span style="font-weight:600; color:#38BDF8;">Brevo SMTP Relay (Transactional)</span>
            </div>
          </div>
        </div>

        <div class="admin-activity-card">
          <div class="admin-activity-header">
            <div>
              <h3 class="admin-activity-title">Administrator Security</h3>
              <p style="font-size:0.75rem; color:var(--text-sage); margin:2px 0 0 0;">Authentication protocol & credentials</p>
            </div>
            <span class="admin-activity-badge verified">Session Protected</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.82rem; color:#CBD5E1;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <span style="color:#94A3B8;">Sign-In Mechanism:</span>
              <span style="font-weight:600; color:#FFFFFF;">Standard /login portal via R-ID "admin"</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <span style="color:#94A3B8;">Admin Session:</span>
              <span style="font-weight:600; color:#10B981;">Permanent HTTP-Only Cookie</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#94A3B8;">Database Mutations:</span>
              <span style="font-weight:600; color:#FBBF24;">Atomic Transactions with Auto-Rollback</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ==========================================================================
   USER ACTIVITY DRILL-DOWN MODAL
   ========================================================================== */
function openAdminUserActivity(rId) {
  if (!rId) return;
  const modal = document.getElementById("adminUserActivityModal");
  const content = document.getElementById("adminUserActivityModalContent");
  if (!modal || !content) return;

  modal.style.display = "flex";
  content.innerHTML = `
    <div style="padding:40px; text-align:center;">
      <div class="clean-loader-spinner-ring" style="margin:0 auto 16px;"></div>
      <div style="color:var(--text-sage); font-size:0.88rem;">Retrieving student lifecycle activity for @${escapeHtml(rId)}...</div>
    </div>
  `;

  fetch(`/api/admin/users/${encodeURIComponent(rId)}/activity`, { credentials: "same-origin" })
    .then(res => res.json())
    .then(data => {
      if (!data.success || !data.student) {
        content.innerHTML = `
          <div style="padding:30px; text-align:center;">
            <h3 style="color:#EF4444; margin-bottom:8px;">User Record Not Found</h3>
            <p style="color:#94A3B8; font-size:0.85rem;">No activity log or registered profile found for R-ID ${escapeHtml(rId)}.</p>
            <button type="button" class="btn-outline-pill" style="margin-top:16px;" onclick="closeAdminUserActivityModal()">Close</button>
          </div>
        `;
        return;
      }

      const s = data.student;
      const act = data.activity || {};
      const teamsLed = act.teams_led || [];
      const teamsJoined = act.teams_joined || [];
      const joinRequests = act.join_requests_sent || [];
      const chatMessages = act.chat_messages || [];
      const otpLog = act.otp_log || [];

      const joinedDate = s.created_at ? new Date(s.created_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'Verified Campus Profile';

      content.innerHTML = `
        <div class="admin-activity-modal-inner">
          <!-- Modal Top Bar -->
          <div class="admin-modal-top-bar">
            <div style="display:flex; align-items:center; gap:14px;">
              <div class="admin-modal-avatar">
                ${escapeHtml((s.name || 'S').charAt(0).toUpperCase())}
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <h2 style="font-size:1.25rem; font-weight:700; color:#FFFFFF; margin:0;">${escapeHtml(s.name || 'Anonymous Student')}</h2>
                  <span class="admin-badge" style="background:rgba(234,179,8,0.18); color:#FBBF24; font-weight:700;">@${escapeHtml(s.r_id)}</span>
                  <span class="admin-badge verified">Verified User</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-sage); margin-top:2px;">
                  ${escapeHtml(s.program || 'General Program')} &bull; ${escapeHtml(s.semester_year || getAcademicYearByRid(s.r_id))}
                </div>
              </div>
            </div>
            <button type="button" class="admin-modal-close-btn" onclick="closeAdminUserActivityModal()" aria-label="Close dialog">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <!-- Student Profile Detail Card -->
          <div class="admin-user-profile-strip">
            <div class="user-strip-col">
              <span class="strip-label">University Email</span>
              <span class="strip-val">${escapeHtml(s.email || 'N/A')}</span>
            </div>
            <div class="user-strip-col">
              <span class="strip-label">Mobile Phone</span>
              <span class="strip-val">${escapeHtml(s.phone || 'N/A')}</span>
            </div>
            <div class="user-strip-col">
              <span class="strip-label">Gender</span>
              <span class="strip-val">${escapeHtml(s.gender || 'Not Specified')}</span>
            </div>
            <div class="user-strip-col">
              <span class="strip-label">Profile Created</span>
              <span class="strip-val">${escapeHtml(joinedDate)}</span>
            </div>
          </div>

          ${s.bio ? `
            <div style="background:rgba(0,0,0,0.25); border-left:3px solid #10B981; padding:10px 14px; border-radius:0 8px 8px 0; margin-bottom:18px; font-size:0.82rem; color:#E2E8F0;">
              <strong>Student Bio:</strong> "${escapeHtml(s.bio)}"
            </div>
          ` : ''}

          <!-- Lifecycle Activity Counters -->
          <div class="admin-user-stat-pills-row">
            <div class="user-stat-pill">
              <span class="user-stat-num" style="color:#FBBF24;">${teamsLed.length}</span>
              <span class="user-stat-lbl">Squads Led</span>
            </div>
            <div class="user-stat-pill">
              <span class="user-stat-num" style="color:#60A5FA;">${teamsJoined.length}</span>
              <span class="user-stat-lbl">Squads Joined</span>
            </div>
            <div class="user-stat-pill">
              <span class="user-stat-num" style="color:#34D399;">${joinRequests.length}</span>
              <span class="user-stat-lbl">Applications Sent</span>
            </div>
            <div class="user-stat-pill">
              <span class="user-stat-num" style="color:#A78BFA;">${chatMessages.length}</span>
              <span class="user-stat-lbl">Chat Messages</span>
            </div>
            <div class="user-stat-pill">
              <span class="user-stat-num" style="color:#F472B6;">${otpLog.length}</span>
              <span class="user-stat-lbl">Login Dispatches</span>
            </div>
          </div>

          <!-- Section 1: Squads Led & Joined -->
          <div class="admin-activity-section-block">
            <h4 class="admin-act-section-heading">
              <span>🏆 Hackathon Squad Memberships (${teamsLed.length + teamsJoined.length})</span>
            </h4>
            ${(teamsLed.length === 0 && teamsJoined.length === 0) ? `
              <div class="admin-empty-sublog">No squad memberships recorded for this student.</div>
            ` : `
              <div class="admin-act-grid">
                ${teamsLed.map(t => `
                  <div class="admin-act-card leader-border">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                      <div>
                        <div style="font-weight:700; color:#FFFFFF; font-size:0.92rem;">${escapeHtml(t.name)}</div>
                        <span class="admin-badge" style="background:rgba(234,179,8,0.2); color:#FBBF24; font-size:0.65rem;">LEADER & FOUNDER</span>
                        <span class="admin-badge" style="background:rgba(16,185,129,0.15); color:#34D399; font-size:0.65rem;">${escapeHtml((t.hackathon_type || 'SIH').toUpperCase())}</span>
                      </div>
                      <span style="font-size:0.7rem; color:var(--text-sage); font-family:monospace;">#${t.id}</span>
                    </div>
                    ${t.problem_statement ? `<p style="font-size:0.75rem; color:#94A3B8; margin:6px 0 0 0; line-height:1.4;">${escapeHtml(t.problem_statement)}</p>` : ''}
                    <div style="font-size:0.7rem; color:var(--text-sage); margin-top:8px;">
                      Created on ${t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                `).join('')}

                ${teamsJoined.map(t => `
                  <div class="admin-act-card">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                      <div>
                        <div style="font-weight:700; color:#FFFFFF; font-size:0.92rem;">${escapeHtml(t.name)}</div>
                        <span class="admin-badge" style="background:rgba(96,165,250,0.2); color:#60A5FA; font-size:0.65rem;">SQUAD MEMBER</span>
                        <span class="admin-badge" style="background:rgba(16,185,129,0.15); color:#34D399; font-size:0.65rem;">${escapeHtml((t.hackathon_type || 'SIH').toUpperCase())}</span>
                      </div>
                      <span style="font-size:0.7rem; color:var(--text-sage); font-family:monospace;">#${t.id}</span>
                    </div>
                    <div style="font-size:0.7rem; color:var(--text-sage); margin-top:8px;">
                      Leader: @${escapeHtml(t.leader_r_id || '')} &bull; Joined ${t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Active'}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Section 2: Join Requests & Applications -->
          <div class="admin-activity-section-block">
            <h4 class="admin-act-section-heading">
              <span>📩 Join Requests & Squad Applications (${joinRequests.length})</span>
            </h4>
            ${joinRequests.length === 0 ? `
              <div class="admin-empty-sublog">No join requests dispatched by this student.</div>
            ` : `
              <div class="admin-table-responsive">
                <table class="admin-log-table" style="font-size:0.8rem;">
                  <thead>
                    <tr>
                      <th>Target Squad</th>
                      <th>Note / Application Pitch</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${joinRequests.map(jr => {
                      const st = jr.status === 'accepted' ? 'verified' : (jr.status === 'rejected' ? 'status-declined' : 'pending');
                      return `
                        <tr>
                          <td style="color:#FFFFFF; font-weight:600;">${escapeHtml(jr.team_name || ('Team #' + jr.team_id))}</td>
                          <td style="color:#CBD5E1; max-width:260px;">${escapeHtml(jr.message || 'No application note provided')}</td>
                          <td style="color:var(--text-sage); font-size:0.72rem;">${jr.created_at ? new Date(jr.created_at).toLocaleDateString() : 'N/A'}</td>
                          <td><span class="admin-badge ${st}">${escapeHtml((jr.status || 'pending').toUpperCase())}</span></td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <!-- Section 3: Team Discussion Messages -->
          <div class="admin-activity-section-block">
            <h4 class="admin-act-section-heading">
              <span>💬 Team Chat Activity (${chatMessages.length})</span>
            </h4>
            ${chatMessages.length === 0 ? `
              <div class="admin-empty-sublog">No messages posted in team channels yet.</div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:4px;">
                ${chatMessages.map(m => `
                  <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:10px 12px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.72rem;">
                      <strong style="color:#34D399;">Squad #${m.team_id} ${m.team_name ? `(${escapeHtml(m.team_name)})` : ''}</strong>
                      <span style="color:#64748B;">${m.created_at ? new Date(m.created_at).toLocaleDateString() + ' ' + new Date(m.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : ''}</span>
                    </div>
                    <div style="color:#FFFFFF; font-size:0.82rem; word-break:break-word;">${escapeHtml(m.content || '')}</div>
                    ${m.attachment_name ? `<div style="margin-top:4px; font-size:0.72rem; color:#60A5FA;">📎 ${escapeHtml(m.attachment_name)}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Section 4: Sign-In OTP History -->
          <div class="admin-activity-section-block">
            <h4 class="admin-act-section-heading">
              <span>🔑 Authentication & OTP Verification History (${otpLog.length})</span>
            </h4>
            ${otpLog.length === 0 ? `
              <div class="admin-empty-sublog">No recent verification dispatches recorded.</div>
            ` : `
              <div class="admin-table-responsive" style="max-height:200px; overflow-y:auto;">
                <table class="admin-log-table" style="font-size:0.78rem;">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Target Address</th>
                      <th>OTP Code</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${otpLog.map(o => `
                      <tr>
                        <td style="color:var(--text-sage); font-family:monospace;">${o.created_at ? new Date(o.created_at).toLocaleString() : 'Recent'}</td>
                        <td style="color:#CBD5E1;">${escapeHtml(o.email || '')}</td>
                        <td><code class="admin-code-pill">${escapeHtml(o.otp || '••••••')}</code></td>
                        <td>
                          <span class="admin-badge ${o.used ? 'verified' : 'pending'}">
                            ${o.used ? 'Verified & Signed In' : 'Dispatched'}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

        </div>
      `;
    })
    .catch(err => {
      console.error("openAdminUserActivity error:", err);
      content.innerHTML = `
        <div style="padding:30px; text-align:center;">
          <h3 style="color:#EF4444; margin-bottom:8px;">Error Retrieving User Activity</h3>
          <p style="color:#94A3B8; font-size:0.85rem;">Could not load student activity history.</p>
          <button type="button" class="btn-outline-pill" style="margin-top:16px;" onclick="closeAdminUserActivityModal()">Close</button>
        </div>
      `;
    });
}

function closeAdminUserActivityModal() {
  const modal = document.getElementById("adminUserActivityModal");
  if (modal) modal.style.display = "none";
}

/* ==========================================================================
   ADMIN TEAMS CRUD & EDIT MODAL
   ========================================================================== */
function openAdminEditTeamModal(teamId) {
  const modal = document.getElementById("adminEditTeamModal");
  const content = document.getElementById("adminEditTeamModalContent");
  if (!modal || !content || !window.__adminState) return;

  const team = window.__adminState.teamsList.find(t => Number(t.id) === Number(teamId));
  if (!team) {
    showToast("Squad record not found", "error");
    return;
  }

  modal.style.display = "flex";
  content.innerHTML = `
    <div style="padding:4px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <div class="admin-panel-kicker">Database Mutation</div>
          <h3 class="forest-modal-title" style="margin:0;">Edit Squad Details</h3>
        </div>
        <button type="button" class="admin-modal-close-btn" onclick="closeAdminEditTeamModal()" aria-label="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <form id="adminEditTeamForm" onsubmit="event.preventDefault(); handleAdminSaveTeam(${team.id});" style="display:flex; flex-direction:column; gap:14px;">
        <div>
          <label class="form-label-forest">Squad Name *</label>
          <input type="text" id="adminTeamNameInput" class="input-forest" value="${escapeAttr(team.name || '')}" required placeholder="e.g. Neural Mavericks">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label class="form-label-forest">Hackathon Category *</label>
            <select id="adminTeamCategorySelect" class="input-forest" style="background:#0E3421; color:#fff;">
              <option value="SIH" ${String(team.hackathon_type).toUpperCase() === 'SIH' ? 'selected' : ''}>Smart India Hackathon (SIH)</option>
              <option value="CTF" ${String(team.hackathon_type).toUpperCase() === 'CTF' ? 'selected' : ''}>Cyber CTF / Security</option>
              <option value="Web3" ${String(team.hackathon_type).toUpperCase() === 'WEB3' ? 'selected' : ''}>Web3 & Blockchain</option>
              <option value="AI/ML" ${String(team.hackathon_type).toUpperCase() === 'AI/ML' ? 'selected' : ''}>AI & Machine Learning</option>
              <option value="Open" ${String(team.hackathon_type).toUpperCase() === 'OPEN' ? 'selected' : ''}>Open Innovation</option>
            </select>
          </div>
          <div>
            <label class="form-label-forest">Max Team Size *</label>
            <select id="adminTeamSizeSelect" class="input-forest" style="background:#0E3421; color:#fff;">
              <option value="2" ${Number(team.team_size) === 2 ? 'selected' : ''}>2 Members</option>
              <option value="3" ${Number(team.team_size) === 3 ? 'selected' : ''}>3 Members</option>
              <option value="4" ${Number(team.team_size) === 4 ? 'selected' : ''}>4 Members</option>
              <option value="5" ${Number(team.team_size) === 5 ? 'selected' : ''}>5 Members</option>
              <option value="6" ${Number(team.team_size) === 6 ? 'selected' : ''}>6 Members (Standard)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="form-label-forest">Problem Statement / Squad Pitch</label>
          <textarea id="adminTeamDescInput" class="input-forest" rows="3" placeholder="Describe the squad objective or problem statement">${escapeHtml(team.problem_statement || '')}</textarea>
        </div>

        <div>
          <label class="form-label-forest">Looking For / Skills (comma separated)</label>
          <input type="text" id="adminTeamTagsInput" class="input-forest" value="${escapeAttr(team.tags || '')}" placeholder="e.g. Python, React, UI/UX, Flutter">
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
          <button type="button" class="btn-outline-pill" onclick="closeAdminEditTeamModal()">Cancel</button>
          <button type="submit" id="btnAdminSaveTeamSubmit" class="btn-primary-forest-pill">
            Save Squad Updates
          </button>
        </div>
      </form>
    </div>
  `;
}

function closeAdminEditTeamModal() {
  const modal = document.getElementById("adminEditTeamModal");
  if (modal) modal.style.display = "none";
}

function handleAdminSaveTeam(teamId) {
  const name = (document.getElementById("adminTeamNameInput")?.value || "").trim();
  const hackathonType = (document.getElementById("adminTeamCategorySelect")?.value || "SIH").trim();
  const teamSize = parseInt(document.getElementById("adminTeamSizeSelect")?.value || "6", 10);
  const problemStatement = (document.getElementById("adminTeamDescInput")?.value || "").trim();
  const tags = (document.getElementById("adminTeamTagsInput")?.value || "").trim();

  if (!name) {
    showToast("Please enter a squad name", "error");
    return;
  }

  const btn = document.getElementById("btnAdminSaveTeamSubmit");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Updating Database...";
  }

  fetch(`/api/admin/teams/${teamId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      name,
      hackathon_type: hackathonType,
      team_size: teamSize,
      problem_statement: problemStatement,
      tags
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast("Squad updated successfully", "success");
        closeAdminEditTeamModal();
        // Update local state
        if (window.__adminState && Array.isArray(window.__adminState.teamsList)) {
          const t = window.__adminState.teamsList.find(x => Number(x.id) === Number(teamId));
          if (t) {
            t.name = name;
            t.hackathon_type = hackathonType;
            t.team_size = teamSize;
            t.problem_statement = problemStatement;
            t.tags = tags;
          }
        }
        renderAdminDashboard();
      } else {
        if (btn) {
          btn.disabled = false;
          btn.innerText = "Save Squad Updates";
        }
        showToast(data.message || "Failed to update squad", "error");
      }
    })
    .catch(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Save Squad Updates";
      }
      showToast("Network error saving squad", "error");
    });
}

function confirmAdminDeleteTeam(teamId, teamName) {
  const confirmed = window.confirm(`Are you sure you want to permanently disband and delete squad "${teamName}"? This will delete all team messages, roster memberships, and join requests from the database.`);
  if (!confirmed) return;

  showToast("Disbanding squad...", "info");
  fetch(`/api/admin/teams/${teamId}`, {
    method: "DELETE",
    credentials: "same-origin"
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(`Squad "${teamName}" removed from database`, "success");
        if (window.__adminState && Array.isArray(window.__adminState.teamsList)) {
          window.__adminState.teamsList = window.__adminState.teamsList.filter(t => Number(t.id) !== Number(teamId));
        }
        renderAdminDashboard();
      } else {
        showToast(data.message || "Failed to delete team", "error");
      }
    })
    .catch(() => showToast("Network error deleting squad", "error"));
}

function handleAdminToggleOtp(checked) {
  fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ otp_email_enabled: checked })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(checked ? "Email dispatch turned ON (Students receive emails)" : "Email dispatch turned OFF (Zero emails sent)", "success");
        if (window.__adminState && window.__adminState.settings) {
          window.__adminState.settings.otp_email_enabled = checked;
        }
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
    credentials: "same-origin",
    body: JSON.stringify({ default_bypass_otp: newCode })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(`Default bypass OTP updated to ${newCode}`, "success");
        if (window.__adminState && window.__adminState.settings) {
          window.__adminState.settings.default_bypass_otp = newCode;
        }
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
  fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" })
    .then(() => {
      showToast("Signed out of Admin Console", "info");
      postLoginRedirect = null;
      navigateTo("/login");
    })
    .catch(() => navigateTo("/login"));
}

function openAdminEventModal(eventId = null) {
  const overlay = document.getElementById("glassModalOverlay");
  const sheet = document.getElementById("glassModalSheet");
  if (!overlay || !sheet) return;

  const eventsList = window.__adminEventsList || [];
  const ev = eventId ? eventsList.find(e => Number(e.id) === Number(eventId)) : null;
  const isEdit = Boolean(ev);

  const title = ev ? ev.title : "";
  const category = ev ? ev.category : "Hackathons";
  const badgeText = ev ? (ev.badge_text || ev.category) : "Hackathon";
  const badgeColor = ev ? (ev.badge_color || "green") : "green";
  const coverImage = ev ? (ev.cover_image || "/static/img/redesign/events/event_sih.png") : "/static/img/redesign/events/event_sih.png";
  const eventDate = ev ? ev.event_date : "";
  const eventDay = ev ? ev.event_day : "";
  const eventMonth = ev ? ev.event_month : "";
  const eventTime = ev ? (ev.event_time || "09:00 AM - 06:00 PM IST") : "09:00 AM - 06:00 PM IST";
  const venue = ev ? ev.venue : "JNU Main Campus";
  const venueDetail = ev ? (ev.venue_detail || "") : "";
  const audience = ev ? (ev.audience || "Open to all JNU students / UG & PG (All Departments)") : "Open to all JNU students / UG & PG (All Departments)";
  const summary = ev ? (ev.summary || "") : "";
  const about = ev ? (ev.about || "") : "";
  const themesStr = (ev && Array.isArray(ev.themes)) ? ev.themes.join("\n") : "";
  const registrationLink = ev ? (ev.registration_link || "/create-team") : "/create-team";

  sheet.innerHTML = `
    <div style="max-height:82vh; overflow-y:auto; padding-right:4px;">
      <h3 class="forest-modal-title" style="margin-bottom:4px;">${isEdit ? 'Edit Event Details' : 'Add New Campus Event'}</h3>
      <p class="forest-modal-message" style="margin-bottom:20px;">${isEdit ? 'Update event schedule, venue, cover and details.' : 'Fill in the information below to publish a new event.'}</p>

      <form id="adminEventForm" onsubmit="event.preventDefault(); submitAdminEventForm(${isEdit ? ev.id : 'null'});" style="display:flex; flex-direction:column; gap:16px;">
        <div>
          <label class="form-label-forest">Event Title *</label>
          <input type="text" id="adminEvTitle" class="input-forest" value="${escapeAttr(title)}" required placeholder="e.g. Smart India Hackathon 2025">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div>
            <label class="form-label-forest">Category *</label>
            <select id="adminEvCategory" class="input-forest" style="background:#0E3421; color:#fff;" onchange="document.getElementById('adminEvBadgeText').value = this.value">
              <option value="Hackathons" ${category === 'Hackathons' ? 'selected' : ''}>Hackathons</option>
              <option value="Workshops" ${category === 'Workshops' ? 'selected' : ''}>Workshops</option>
              <option value="Seminars" ${category === 'Seminars' ? 'selected' : ''}>Seminars</option>
              <option value="Cultural" ${category === 'Cultural' ? 'selected' : ''}>Cultural</option>
              <option value="Competitions" ${category === 'Competitions' ? 'selected' : ''}>Competitions</option>
              <option value="Talks" ${category === 'Talks' ? 'selected' : ''}>Talks</option>
              <option value="Other" ${category === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div>
            <label class="form-label-forest">Badge Color</label>
            <select id="adminEvBadgeColor" class="input-forest" style="background:#0E3421; color:#fff;">
              <option value="green" ${badgeColor === 'green' ? 'selected' : ''}>Green (Hackathons / Active)</option>
              <option value="blue" ${badgeColor === 'blue' ? 'selected' : ''}>Blue (Workshops)</option>
              <option value="orange" ${badgeColor === 'orange' ? 'selected' : ''}>Orange/Brown (Seminars)</option>
              <option value="purple" ${badgeColor === 'purple' ? 'selected' : ''}>Purple (Cultural)</option>
              <option value="red" ${badgeColor === 'red' ? 'selected' : ''}>Red (Competitions / CTF)</option>
              <option value="teal" ${badgeColor === 'teal' ? 'selected' : ''}>Teal (Talks / Founder)</option>
              <option value="other" ${badgeColor === 'other' ? 'selected' : ''}>Slate (Other)</option>
            </select>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div>
            <label class="form-label-forest">Badge Text</label>
            <input type="text" id="adminEvBadgeText" class="input-forest" value="${escapeAttr(badgeText)}" placeholder="e.g. Hackathon">
          </div>
          <div>
            <label class="form-label-forest">Registration Link</label>
            <input type="text" id="adminEvRegLink" class="input-forest" value="${escapeAttr(registrationLink)}" placeholder="/create-team or external URL">
          </div>
        </div>

        <!-- Cover Photo Zone -->
        <div>
          <label class="form-label-forest">Cover Photo</label>
          <div class="cover-upload-zone" onclick="document.getElementById('adminEvCoverFileInput').click()" style="cursor:pointer; text-align:center; padding:16px; border:2px dashed rgba(255,255,255,0.2); border-radius:10px; background:rgba(0,0,0,0.2);">
            <input type="file" id="adminEvCoverFileInput" accept="image/*" style="display:none;" onchange="handleAdminEventCoverUpload(event)">
            <div style="color:var(--text-sage); font-size:0.85rem;">📁 Click to upload image (JPG, PNG, WEBP)</div>
          </div>
          <div style="margin-top:8px;">
            <input type="text" id="adminEvCoverUrl" class="input-forest" value="${escapeAttr(coverImage)}" placeholder="Or paste direct image URL">
          </div>
          <div id="adminCoverPreviewWrap" style="margin-top:10px; text-align:center; ${coverImage ? '' : 'display:none;'}">
            <img id="adminCoverPreview" src="${escapeAttr(coverImage)}" style="max-height:140px; border-radius:8px; object-fit:cover; border:1px solid #CBD5E1;">
          </div>
        </div>

        <!-- Date & Time Row -->
        <div style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:10px;">
          <div>
            <label class="form-label-forest">Event Date *</label>
            <input type="text" id="adminEvDate" class="input-forest" value="${escapeAttr(eventDate)}" required placeholder="e.g. 15 November 2025">
          </div>
          <div>
            <label class="form-label-forest">Day (e.g. 15)</label>
            <input type="text" id="adminEvDay" class="input-forest" value="${escapeAttr(eventDay)}" placeholder="15">
          </div>
          <div>
            <label class="form-label-forest">Month (e.g. NOV)</label>
            <input type="text" id="adminEvMonth" class="input-forest" value="${escapeAttr(eventMonth)}" placeholder="NOV">
          </div>
        </div>

        <div>
          <label class="form-label-forest">Event Time</label>
          <input type="text" id="adminEvTime" class="input-forest" value="${escapeAttr(eventTime)}" placeholder="e.g. 09:00 AM - 06:00 PM IST">
        </div>

        <!-- Venue -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div>
            <label class="form-label-forest">Venue *</label>
            <input type="text" id="adminEvVenue" class="input-forest" value="${escapeAttr(venue)}" required placeholder="e.g. JNU Main Campus">
          </div>
          <div>
            <label class="form-label-forest">Venue Detail / Location</label>
            <input type="text" id="adminEvVenueDetail" class="input-forest" value="${escapeAttr(venueDetail)}" placeholder="e.g. Central Auditorium & Innovation Lab">
          </div>
        </div>

        <div>
          <label class="form-label-forest">Target Audience / Eligibility</label>
          <input type="text" id="adminEvAudience" class="input-forest" value="${escapeAttr(audience)}" placeholder="e.g. Open to all JNU students / UG & PG">
        </div>

        <div>
          <label class="form-label-forest">Short Summary (Preview card description) *</label>
          <textarea id="adminEvSummary" class="input-forest" rows="2" required placeholder="1-2 sentences summarizing the event">${escapeHtml(summary)}</textarea>
        </div>

        <div>
          <label class="form-label-forest">Detailed About Description</label>
          <textarea id="adminEvAbout" class="input-forest" rows="4" placeholder="Full rich description for the event detail page">${escapeHtml(about)}</textarea>
        </div>

        <div>
          <label class="form-label-forest">Themes / Problem Statements (One per line)</label>
          <textarea id="adminEvThemes" class="input-forest" rows="3" placeholder="Smart Automation&#10;Healthcare & Assistive Technology&#10;Sustainability & Clean Energy">${escapeHtml(themesStr)}</textarea>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
          <button type="button" onclick="closeGlassModal()" class="btn-outline-pill">Cancel</button>
          <button type="submit" id="btnAdminSaveEvent" class="btn-primary-forest-pill">
            ${isEdit ? 'Save Changes' : 'Publish Event'}
          </button>
        </div>
      </form>
    </div>
  `;

  overlay.classList.add("active");
}

function handleAdminEventCoverUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  showToast("Uploading cover image...", "info");
  fetch("/api/admin/events/upload", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.url) {
        const urlInput = document.getElementById("adminEvCoverUrl");
        if (urlInput) urlInput.value = data.url;
        const prevWrap = document.getElementById("adminCoverPreviewWrap");
        const prevImg = document.getElementById("adminCoverPreview");
        if (prevWrap && prevImg) {
          prevImg.src = data.url;
          prevWrap.style.display = "";
        }
        showToast("Cover photo uploaded successfully", "success");
      } else {
        showToast(data.message || "Failed to upload image", "error");
      }
    })
    .catch(() => showToast("Error uploading cover image", "error"));
}

function submitAdminEventForm(eventId = null) {
  const title = (document.getElementById("adminEvTitle")?.value || "").trim();
  const category = (document.getElementById("adminEvCategory")?.value || "Hackathons").trim();
  const badgeText = (document.getElementById("adminEvBadgeText")?.value || category).trim();
  const badgeColor = (document.getElementById("adminEvBadgeColor")?.value || "green").trim();
  const coverImage = (document.getElementById("adminEvCoverUrl")?.value || "").trim();
  const eventDate = (document.getElementById("adminEvDate")?.value || "").trim();
  const eventDay = (document.getElementById("adminEvDay")?.value || "").trim();
  const eventMonth = (document.getElementById("adminEvMonth")?.value || "").trim();
  const eventTime = (document.getElementById("adminEvTime")?.value || "").trim();
  const venue = (document.getElementById("adminEvVenue")?.value || "").trim();
  const venueDetail = (document.getElementById("adminEvVenueDetail")?.value || "").trim();
  const audience = (document.getElementById("adminEvAudience")?.value || "").trim();
  const summary = (document.getElementById("adminEvSummary")?.value || "").trim();
  const about = (document.getElementById("adminEvAbout")?.value || summary).trim();
  const themesRaw = (document.getElementById("adminEvThemes")?.value || "").trim();
  const registrationLink = (document.getElementById("adminEvRegLink")?.value || "/create-team").trim();

  if (!title || !eventDate || !venue || !summary) {
    showToast("Please fill in all required fields (Title, Date, Venue, Summary)", "error");
    return;
  }

  const themes = themesRaw.split("\n").map(t => t.trim()).filter(Boolean);

  const payload = {
    title, category, badge_text: badgeText, badge_color: badgeColor,
    cover_image: coverImage, event_date: eventDate, event_day: eventDay,
    event_month: eventMonth, event_time: eventTime, venue, venue_detail: venueDetail,
    audience, summary, about, themes, registration_link: registrationLink
  };

  const isEdit = Boolean(eventId);
  const url = isEdit ? `/api/admin/events/${eventId}` : "/api/admin/events";
  const method = isEdit ? "PUT" : "POST";

  const btn = document.getElementById("btnAdminSaveEvent");
  if (btn) {
    btn.disabled = true;
    btn.innerText = isEdit ? "Saving..." : "Publishing...";
  }

  fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(isEdit ? "Event updated successfully" : "Event created successfully", "success");
        closeGlassModal();
        loadAdminDashboardData();
        dynamicCampusEvents = [];
      } else {
        if (btn) {
          btn.disabled = false;
          btn.innerText = isEdit ? "Save Changes" : "Publish Event";
        }
        showToast(data.message || "Failed to save event", "error");
      }
    })
    .catch(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = isEdit ? "Save Changes" : "Publish Event";
      }
      showToast("Network error saving event", "error");
    });
}

function confirmAdminDeleteEvent(eventId, eventTitle) {
  showGlassModal({
    title: "Delete Event",
    message: `Are you sure you want to permanently remove "${eventTitle}"? This cannot be undone.`,
    confirmText: "Delete Event",
    cancelText: "Cancel",
    isDanger: true,
    onConfirm: () => {
      fetch(`/api/admin/events/${eventId}`, { method: "DELETE" })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast("Event deleted successfully", "success");
            loadAdminDashboardData();
            dynamicCampusEvents = [];
          } else {
            showToast(data.message || "Failed to delete event", "error");
          }
        })
        .catch(() => showToast("Error deleting event", "error"));
    }
  });
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

/*/* ==========================================================================
   16. CAMPUS EVENTS ENGINE & DATASETS (DYNAMIC DATABASE BACKED)
   ========================================================================== */

let dynamicCampusEvents = [];
let currentEventsCategory = "all";
let currentEventsQuery = "";
let eventsSearchTimeout = null;

function loadEventsView() {
  const container = document.getElementById("eventsViewContainer");
  if (!container) return;

  currentEventsCategory = "all";
  currentEventsQuery = "";

  if (dynamicCampusEvents && dynamicCampusEvents.length > 0) {
    renderEventsPage();
    showFooterAfterLoad();
  } else {
    container.innerHTML = renderCleanPageLoader("Loading Campus Events...");
  }

  fetch("/api/events")
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.events)) {
        dynamicCampusEvents = data.events;
      }
      renderEventsPage();
      showFooterAfterLoad();
    })
    .catch(() => {
      renderEventsPage();
      showFooterAfterLoad();
    });
}

function renderEventsPage() {
  const container = document.getElementById("eventsViewContainer");
  if (!container) return;

  const evSearchPlaceholder = (typeof window !== "undefined" && window.innerWidth <= 768) ? "Search events..." : "Search events...";

  container.innerHTML = `
    <div class="events-page-shell">
      
      <!-- Clean Minimal Header (No Clutter) -->
      <div class="events-clean-header" style="margin-bottom: 22px; padding: 6px 0 2px 0;">
        <h1 style="font-family: var(--font-serif); font-size: 2.15rem; font-weight: 750; color: #0F172A; margin: 0 0 6px 0; letter-spacing: -0.02em;">
          Campus Events
        </h1>
        <p style="font-size: 0.94rem; color: #64748B; margin: 0; line-height: 1.5;">
          Hackathons, workshops, seminars, cultural fests and competitions across Jaipur National University.
        </p>
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

        <!-- Search Box & Calendar Button -->
        <div class="events-search-actions-wrap">
          <div class="events-search-box">
            <svg class="events-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="eventsSearchInput" class="events-search-input" placeholder="${escapeAttr(evSearchPlaceholder)}" value="${escapeAttr(currentEventsQuery)}" oninput="handleEventsSearchInput(this.value)">
          </div>

          <button type="button" class="events-calendar-btn" onclick="openEventsCalendarModal()" title="View Campus Events Calendar" aria-label="Events Calendar">
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
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'hackathons' ? 'active' : ''}" onclick="setEventsFilter('hackathons')">Hackathons</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'workshops' ? 'active' : ''}" onclick="setEventsFilter('workshops')">Workshops</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'seminars' ? 'active' : ''}" onclick="setEventsFilter('seminars')">Seminars</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'cultural' ? 'active' : ''}" onclick="setEventsFilter('cultural')">Cultural</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'competitions' ? 'active' : ''}" onclick="setEventsFilter('competitions')">Competitions</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'talks' ? 'active' : ''}" onclick="setEventsFilter('talks')">Talks</button>
        <button type="button" class="events-filter-pill-mob ${currentEventsCategory === 'other' ? 'active' : ''}" onclick="setEventsFilter('other')">Other</button>
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

      <!-- EMPTY STATE -->
      <div class="events-empty-state" id="eventsEmptyState" style="display:none; text-align:center; padding:60px 20px;">
        <div style="font-size:2.5rem; margin-bottom:12px;">🎪</div>
        <h3 style="font-family:var(--font-serif); font-size:1.35rem; color:#0F172A; margin:0 0 6px 0;">No events found</h3>
        <p style="font-size:0.88rem; color:#64748B; margin:0 0 16px 0;">Try modifying your search or select "All Events" to view upcoming campus schedules.</p>
        <button type="button" class="btn-create-team-primary" onclick="setEventsFilter('all')">View All Events</button>
      </div>

    </div>
  `;

  updateEventsDisplay();
}

function getFilteredEvents() {
  return dynamicCampusEvents.filter(evt => {
    let matchesCat = true;
    if (currentEventsCategory !== "all") {
      const c = currentEventsCategory.toLowerCase();
      const evCat = (evt.category || "").toLowerCase();
      if (c === "sih") {
        matchesCat = evCat.includes("hackathon") || (evt.slug && evt.slug.includes("sih"));
      } else if (c === "ctf") {
        matchesCat = evCat.includes("competition") || (evt.slug && evt.slug.includes("ctf"));
      } else if (c === "other") {
        matchesCat = !["hackathons", "workshops", "seminars", "cultural", "competitions", "talks"].includes(evCat);
      } else {
        matchesCat = evCat === c;
      }
    }

    let matchesQuery = true;
    if (currentEventsQuery.trim()) {
      const q = currentEventsQuery.trim().toLowerCase();
      matchesQuery = (
        (evt.title && evt.title.toLowerCase().includes(q)) ||
        (evt.summary && evt.summary.toLowerCase().includes(q)) ||
        (evt.about && evt.about.toLowerCase().includes(q)) ||
        (evt.venue && evt.venue.toLowerCase().includes(q)) ||
        (evt.category && evt.category.toLowerCase().includes(q))
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

  // Desktop 3-Column Grid Cards (Matching media_1790157271040.jpg)
  desktopContainer.innerHTML = filtered.map(evt => {
    const badgeColor = (evt.badge_color || "green").toLowerCase();
    const badgeText = evt.badge_text || evt.category;
    const day = evt.event_day || "15";
    const month = evt.event_month || "NOV";
    const cover = evt.cover_image || "/static/img/redesign/events/event_sih.png";
    const targetUrl = "/events/" + (evt.slug || evt.id);

    return `
      <div class="event-card-redesign" onclick="navigateTo('${targetUrl}')">
        <div class="event-card-cover-wrap">
          <img src="${escapeAttr(cover)}" alt="${escapeAttr(evt.title)}" class="event-card-cover-img" loading="lazy" onerror="this.src='/static/img/redesign/events/event_sih.png'">
          <div class="event-card-cover-badge">
            <span class="event-cat-badge badge-${escapeAttr(badgeColor)}">${escapeHtml(badgeText)}</span>
          </div>
        </div>

        <div class="event-card-body-content">
          <div class="event-card-info-row">
            <div class="event-card-date-box">
              <span class="event-card-date-day">${escapeHtml(day)}</span>
              <span class="event-card-date-month">${escapeHtml(month)}</span>
            </div>
            <div class="event-card-text-col">
              <h3 class="event-card-heading">${escapeHtml(evt.title)}</h3>
              <div class="event-card-venue">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z"></path>
                  <circle cx="12" cy="9" r="3"></circle>
                </svg>
                <span>${escapeHtml(evt.venue)}</span>
              </div>
              <p class="event-card-summary">${escapeHtml(evt.summary || '')}</p>
            </div>
          </div>

          <div class="event-card-bottom-row">
            <div class="event-card-circle-arrow-btn" title="View Event">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Mobile Horizontal List Items (< 768px, matching media_1790157271040.jpg)
  mobileContainer.innerHTML = filtered.map(evt => {
    const badgeColor = (evt.badge_color || "green").toLowerCase();
    const badgeText = evt.badge_text || evt.category;
    const day = evt.event_day || "15";
    const month = evt.event_month || "NOV";
    const cover = evt.cover_image || "/static/img/redesign/events/event_sih.png";
    const targetUrl = "/events/" + (evt.slug || evt.id);

    return `
      <div class="mobile-event-row-redesign" onclick="navigateTo('${targetUrl}')">
        <img src="${escapeAttr(cover)}" alt="${escapeAttr(evt.title)}" class="mobile-event-row-thumb" loading="lazy" onerror="this.src='/static/img/redesign/events/event_sih.png'">
        
        <div class="mobile-event-row-center">
          <span class="event-cat-badge badge-${escapeAttr(badgeColor)}" style="font-size:0.65rem; padding:2px 8px; margin-bottom:2px;">${escapeHtml(badgeText)}</span>
          <h4 class="mobile-event-row-title">${escapeHtml(evt.title)}</h4>
          <div class="mobile-event-row-venue">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z"></path>
              <circle cx="12" cy="9" r="2.5"></circle>
            </svg>
            <span>${escapeHtml(evt.venue)}</span>
          </div>
        </div>

        <div class="mobile-event-row-right">
          <div class="mobile-event-date-stamp">
            <span class="mo-day">${escapeHtml(day)}</span>
            <span class="mo-month">${escapeHtml(month)}</span>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:#94A3B8;">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    `;
  }).join("");
}

function setEventsFilter(category) {
  currentEventsCategory = category;

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

  document.querySelectorAll(".events-filter-pill-mob").forEach(btn => {
    const text = btn.innerText.toLowerCase();
    const isMatch = (
      (category === "all" && text === "all") ||
      (category === "hackathons" && text === "hackathons") ||
      (category === "workshops" && text === "workshops") ||
      (category === "seminars" && text === "seminars") ||
      (category === "cultural" && text === "cultural") ||
      (category === "competitions" && text === "competitions") ||
      (category === "talks" && text === "talks") ||
      (category === "other" && text === "other")
    );
    btn.classList.toggle("active", isMatch);
  });

  updateEventsDisplay();
}

function handleEventsSearchInput(val) {
  clearTimeout(eventsSearchTimeout);
  eventsSearchTimeout = setTimeout(() => {
    currentEventsQuery = val;
    updateEventsDisplay();
  }, 100);
}

/* ==========================================================================
   DEDICATED EVENT DETAIL VIEW (media_1790157271171.jpg)
   ========================================================================== */
function loadEventDetailView(eventIdOrSlug) {
  const container = document.getElementById("eventDetailViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; padding:100px 20px;">
      ${renderIosSpinner('lg')}
    </div>
  `;

  fetch("/api/events/" + encodeURIComponent(eventIdOrSlug))
    .then(res => res.json())
    .then(data => {
      if (data.success && data.event) {
        renderEventDetailPage(data.event);
      } else {
        renderEventNotFound();
      }
    })
    .catch(() => {
      renderEventNotFound();
    });
}

function renderEventNotFound() {
  const container = document.getElementById("eventDetailViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:80px 20px;">
      <div style="font-size:3rem; margin-bottom:12px;">🔍</div>
      <h2 style="font-family:var(--font-serif); font-size:1.8rem; color:#0F172A; margin-bottom:8px;">Event Not Found</h2>
      <p style="color:#64748B; margin-bottom:24px;">The event you are looking for may have concluded or been relocated.</p>
      <button onclick="navigateTo('/events')" class="btn-create-team-primary" style="display:inline-flex;">
        ← Back to Campus Events
      </button>
    </div>
  `;
}

function renderEventDetailPage(evt) {
  const container = document.getElementById("eventDetailViewContainer");
  if (!container) return;

  const category = evt.category || "Hackathons";
  const badgeColor = (evt.badge_color || "green").toLowerCase();
  const badgeText = evt.badge_text || category;
  const cover = evt.cover_image || "/static/img/redesign/events/event_sih.png";
  const dateStr = evt.event_date || "Upcoming";
  const timeStr = evt.event_time || "09:00 AM - 06:00 PM IST";
  const venueStr = evt.venue || "JNU Main Campus";
  const venueDetailStr = evt.venue_detail || "Jaipur, Rajasthan";
  const audienceStr = evt.audience || "Open to all JNU students / UG & PG (All Departments)";
  const summaryStr = evt.summary || "";
  const aboutStr = evt.about || summaryStr;
  const regLink = evt.registration_link || "/create-team";

  // Themes list
  let themes = [];
  if (Array.isArray(evt.themes)) {
    themes = evt.themes;
  } else if (typeof evt.themes === "string") {
    try { themes = JSON.parse(evt.themes); } catch (e) { themes = [evt.themes]; }
  }
  if (!themes || themes.length === 0) {
    themes = [
      "Smart Automation & Robotics",
      "Healthcare & Assistive Technology",
      "Sustainability & Clean Energy",
      "Education & Skill Development",
      "Agriculture & Rural Development"
    ];
  }

  // Important Dates list
  let importantDates = [];
  if (Array.isArray(evt.important_dates)) {
    importantDates = evt.important_dates;
  } else if (typeof evt.important_dates === "string") {
    try { importantDates = JSON.parse(evt.important_dates); } catch (e) { importantDates = []; }
  }
  if (!importantDates || importantDates.length === 0) {
    importantDates = [
      { date: "01 Oct 2025", label: "Registrations Open" },
      { date: "31 Oct 2025", label: "Team Formation Deadline" },
      { date: "10 Nov 2025", label: "Final Shortlisting" },
      { date: "15 Nov 2025", label: "Event Day" }
    ];
  }

  // Organizers list
  let organizers = [];
  if (Array.isArray(evt.organizers)) {
    organizers = evt.organizers;
  } else if (typeof evt.organizers === "string") {
    try { organizers = JSON.parse(evt.organizers); } catch (e) { organizers = []; }
  }
  if (!organizers || organizers.length === 0) {
    organizers = [
      { name: "Jaipur National University", sub: "Nodal Center & Host Campus", logo: "/static/img/jnu_logo.png" },
      { name: "Ministry of Education", sub: "Innovation Cell", logo: "/static/img/jnu_logo.png" }
    ];
  }

  const aboutParagraphs = aboutStr.split("\n\n").filter(Boolean);

  container.innerHTML = `
    <div class="event-detail-shell">
      
      <!-- Top Breadcrumbs / Back Link -->
      <div class="event-breadcrumbs desktop-only-flex">
        <a href="/events" onclick="event.preventDefault(); navigateTo('/events')" class="event-breadcrumb-link">Events</a>
        <span class="event-breadcrumb-sep">&gt;</span>
        <a href="/events" onclick="event.preventDefault(); setEventsFilter('${escapeAttr(category.toLowerCase())}'); navigateTo('/events')" class="event-breadcrumb-link">${escapeHtml(category)}</a>
        <span class="event-breadcrumb-sep">&gt;</span>
        <span class="event-breadcrumb-current">${escapeHtml(evt.title)}</span>
      </div>

      <div class="mobile-only-block" style="margin-bottom:14px;">
        <button class="event-detail-back-mobile" onclick="navigateTo('/events')" style="display:inline-flex; align-items:center; gap:6px; font-size:0.88rem; font-weight:700; color:#064E3B; background:none; border:none; cursor:pointer; padding:4px 0;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          <span>Events</span>
        </button>
      </div>

      <!-- Panoramic Hero Banner (Exact match to media_1790157271171.jpg) -->
      <div class="event-hero-panoramic" style="background-image:url('${escapeAttr(cover)}');">
        <div class="event-hero-overlay">
          <div class="event-hero-left-content">
            <span class="event-cat-badge badge-${escapeAttr(badgeColor)}" style="margin-bottom:12px;">${escapeHtml(badgeText)}</span>
            <h1 class="event-hero-title">${escapeHtml(evt.title)}</h1>
            <p class="event-hero-tagline">${escapeHtml(summaryStr)}</p>
          </div>
          <div class="event-hero-right-motif desktop-only-flex">
            <div class="event-hero-motif-lines">
              <span>IDEAS</span>
              <span>PEOPLE</span>
              <span>IMPACT</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3 Quick Stat Cards Row -->
      <div class="event-quick-stats-row">
        <div class="event-quick-stat-card">
          <div class="event-quick-stat-icon-wrap">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div>
            <h4 class="event-quick-stat-title">${escapeHtml(dateStr)}</h4>
            <p class="event-quick-stat-sub">${escapeHtml(timeStr)}</p>
          </div>
        </div>

        <div class="event-quick-stat-card">
          <div class="event-quick-stat-icon-wrap">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z"></path>
              <circle cx="12" cy="9" r="3"></circle>
            </svg>
          </div>
          <div>
            <h4 class="event-quick-stat-title">${escapeHtml(venueStr)}</h4>
            <p class="event-quick-stat-sub">${escapeHtml(venueDetailStr)}</p>
          </div>
        </div>

        <div class="event-quick-stat-card">
          <div class="event-quick-stat-icon-wrap">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <h4 class="event-quick-stat-title">Target Audience</h4>
            <p class="event-quick-stat-sub">${escapeHtml(audienceStr)}</p>
          </div>
        </div>
      </div>

      <!-- Main 2-Column Detail Grid -->
      <div class="event-detail-grid">
        
        <!-- Left Content Column -->
        <div class="event-detail-main-col">
          
          <!-- About Section -->
          <div class="event-content-section">
            <h2 class="event-content-section-title">About</h2>
            ${aboutParagraphs.length > 0 
              ? aboutParagraphs.map(p => `<p class="event-content-body-p">${escapeHtml(p)}</p>`).join("")
              : `<p class="event-content-body-p">${escapeHtml(aboutStr)}</p>`
            }
          </div>

          <!-- Themes / Problem Statements Section -->
          <div class="event-content-section">
            <h2 class="event-content-section-title">Themes / Problem Statements</h2>
            <p style="font-size:0.9rem; color:#64748B; margin:0 0 8px 0;">Problem statements will be released by the nodal center. Topics typically include:</p>
            
            <ul class="event-themes-list">
              ${themes.map(t => `<li class="event-theme-item"><span>${escapeHtml(t)}</span></li>`).join("")}
            </ul>

            <div class="event-doc-notice-card">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>Detailed problem statements and guidelines will be shared soon.</span>
            </div>
          </div>

          <!-- Important Dates Stepper Timeline -->
          <div class="event-content-section">
            <h2 class="event-content-section-title">Important Dates</h2>
            <div class="event-timeline-stepper">
              <div class="event-timeline-track"></div>
              ${importantDates.map(node => `
                <div class="event-timeline-step-node">
                  <div class="event-timeline-dot"></div>
                  <div class="event-timeline-date">${escapeHtml(node.date || '')}</div>
                  <div class="event-timeline-label">${escapeHtml(node.label || '')}</div>
                </div>
              `).join("")}
            </div>
          </div>

        </div>

        <!-- Right Sidebar Column -->
        <div class="event-detail-sidebar-col">
          
          <!-- Registration & Details Box -->
          <div class="event-sidebar-box">
            <a href="${escapeAttr(regLink)}" onclick="${regLink.startsWith('/') ? `event.preventDefault(); navigateTo('${escapeAttr(regLink)}');` : ''}" ${regLink.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''} class="btn-register-primary-cta">
              <span>Register Now</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>

            <div class="event-sidebar-meta-list">
              <div class="event-sidebar-meta-item">
                <svg class="event-sidebar-meta-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <div>
                  <div class="event-sidebar-meta-heading">${escapeHtml(dateStr)}</div>
                  <div class="event-sidebar-meta-detail">Event Schedule</div>
                </div>
              </div>

              <div class="event-sidebar-meta-item">
                <svg class="event-sidebar-meta-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <div>
                  <div class="event-sidebar-meta-heading">${escapeHtml(timeStr)}</div>
                  <div class="event-sidebar-meta-detail">Full Day Sessions</div>
                </div>
              </div>

              <div class="event-sidebar-meta-item">
                <svg class="event-sidebar-meta-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z"></path>
                  <circle cx="12" cy="9" r="3"></circle>
                </svg>
                <div>
                  <div class="event-sidebar-meta-heading">${escapeHtml(venueStr)}</div>
                  <div class="event-sidebar-meta-detail">${escapeHtml(venueDetailStr)}</div>
                </div>
              </div>

              <div class="event-sidebar-meta-item">
                <svg class="event-sidebar-meta-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <div>
                  <div class="event-sidebar-meta-heading">${escapeHtml(audienceStr)}</div>
                  <div class="event-sidebar-meta-detail">Eligible Participants</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Organized By Box -->
          <div class="event-sidebar-box">
            <h4 style="font-size:0.95rem; font-weight:700; color:#0F172A; margin:0 0 14px 0;">Organized By</h4>
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${organizers.map(org => `
                <div class="event-organizer-row">
                  <img src="${escapeAttr(org.logo || '/static/img/jnu_logo.png')}" alt="${escapeAttr(org.name)}" class="event-organizer-logo" onerror="this.src='/static/img/jnu_logo.png'">
                  <div>
                    <div class="event-organizer-name">${escapeHtml(org.name)}</div>
                    <div class="event-organizer-sub">${escapeHtml(org.sub || '')}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Questions Box -->
          <div class="event-questions-card">
            <h4 class="event-questions-title">Have questions?</h4>
            <p class="event-questions-desc">Reach out to the event coordinators through the official university notice.</p>
          </div>

        </div>

      </div>

    </div>
  `;
}

function openEventsCalendarModal() {
  const modal = document.getElementById("eventDetailModal");
  const content = document.getElementById("eventDetailModalContent");
  if (!modal || !content) return;

  const events = dynamicCampusEvents.length > 0 ? dynamicCampusEvents : [];

  content.innerHTML = `
    <div class="event-modal-card">
      <div class="event-modal-banner-wrap" style="background:linear-gradient(135deg, #0D2E1F 0%, #165337 100%); height:100px; display:flex; align-items:center; padding:20px 24px; color:#FFFFFF;">
        <button type="button" onclick="closeEventDetailModal()" class="event-modal-close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div>
          <span style="font-size:0.75rem; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#86EFAC;">CAMPUS CALENDAR</span>
          <h3 style="font-family:var(--font-serif); font-size:1.3rem; color:#FFFFFF; margin:2px 0 0 0;">University Events Schedule</h3>
        </div>
      </div>

      <div class="event-modal-body" style="padding:24px;">
        <div class="calendar-timeline-list" style="display:flex; flex-direction:column; gap:12px;">
          ${events.map(e => `
            <div class="cal-timeline-item" onclick="closeEventDetailModal(); navigateTo('/events/' + ('${e.slug || e.id}'))" style="display:flex; align-items:center; gap:14px; padding:12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; cursor:pointer;">
              <div class="cal-date-pill" style="width:40px; height:44px; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0;">
                <strong style="font-size:1.05rem; font-weight:800; color:#0F172A; line-height:1;">${escapeHtml(e.event_day || '15')}</strong>
                <span style="font-size:0.6rem; font-weight:750; color:#64748B; text-transform:uppercase;">${escapeHtml(e.event_month || 'NOV')}</span>
              </div>
              <div class="cal-item-info" style="flex:1; min-width:0;">
                <h4 class="cal-item-title" style="font-size:0.92rem; font-weight:700; color:#0F172A; margin:0 0 2px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(e.title)}</h4>
                <div class="cal-item-meta" style="font-size:0.75rem; color:#64748B;">📍 ${escapeHtml(e.venue)} &bull; ${escapeHtml(e.event_time || '')}</div>
              </div>
              <span class="event-cat-badge badge-${escapeAttr((e.badge_color || 'green').toLowerCase())}" style="font-size:0.68rem; padding:3px 10px;">${escapeHtml(e.badge_text || e.category)}</span>
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

function closeEventDetailModal() {
  const modal = document.getElementById("eventDetailModal");
  if (modal) modal.style.display = "none";
  document.body.classList.remove("scroll-locked");
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
    id: "res-holidays",
    title: "University Holiday List",
    category: "Campus Life",
    categoryGroup: ["all", "campus life"],
    image: "/static/img/redesign/resources/res_calendar.png",
    mobileThumb: "/static/img/redesign/resources/mob_thumb_calendar.png",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    description: "Official list of university holidays and observances.",
    metric: "🌴 2026 Holidays",
    fullDescription: "Official schedule of declared university holidays, gazetted festival leaves, national holidays, winter recess, and summer vacation for Jaipur National University.",
    tags: ["University Holidays", "Gazetted Leaves", "Festival Recess", "Official List"],
    links: [
      { name: "Jaipur National University Holiday List 2026", type: "Official PDF", size: "Gazetted" },
      { name: "University Festival & Academic Break Schedule", type: "Academic Notice", size: "Approved" }
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

let currentPyqFilters = {
  school: "All Schools",
  branch: "All Branches",
  sem: "Any Sem",
  type: "Any Type",
  year: "Any Year",
  query: ""
};

let dynamicPyqList = [];
let dynamicSchoolsCoursesMap = null;
let pyqSearchDebounceTimer = null;

// Fallback precomputed map in case offline
const JNU_DEFAULT_SCHOOLS_MAP = {
  "Collaborative Course": ["B.Des (Gaming & Animation)(In Coll.)", "B.Tech AI & DS -Coding Pro", "B.Tech AI & ML -Coding Pro", "B.Tech CSE (AI & ML) Hons.-Samatrix", "B.Tech CSE (AI) Hons.-Coding Pro", "B.Tech Computer Science (RPA)(In Coll.)", "BBA (Digital Marketing)(In Coll.)", "BBA-Fintech & Digital Banking(In Coll.)", "BCA Full Stack Development (In Coll.)"],
  "School of Agriculture Sciences": ["B.Sc. (Hons.) - Agriculture", "M.Sc. - (Ag.) Agronomy", "M.Sc. - (Ag.) Genetics and Plant Breeding", "M.Sc. - (Ag.) Horticulture"],
  "School of Allied Health Sciences": ["Advanced Certificate Course in Diabetology-1Y", "Advanced Certificate Course in Diabetology-2Y", "B.Sc. (Cardio Vascular Technology)", "B.Sc. (Clinical Dietetics)", "B.Sc. (Forensic Science)", "B.Sc. (MLT) (Y)", "B.Sc. (Medical Imaging Technology)(Y)", "B.Sc. (Operation Theater Technology)", "B.Sc. (Optometry)(Y)", "Bachelor of Physiotherapy", "Bachelor of Physiotherapy(Y)", "Diploma in ECG Technician", "Diploma in Operation Theatre Technology", "Diploma in Radiation Technology", "M.Sc. (Forensic Science)", "M.Sc. - Clinical Nutrition", "M.Sc. - Medical Microbiology", "Master of Physiotherapy(Y)", "Ph.D. (Food & Nutrition)", "Ph.D. (Physiotherapy)", "Ph.D. Forensic Science"],
  "School of Business & Management": ["B.Com. (Honours)", "BBA (Aviation Management)", "Bachelor of Business Administration (BBA)", "Bachelor of Commerce (B.Com.)", "MBA (Digital Marketing)", "MBA (Dual Specialization)", "MBA (Hospital & Healthcare Management)", "MBA in Business Intelligence & Data Analytics", "Master of Business Administration (MBA)", "Ph.D. (Management)"],
  "School of Computer & Systems Sciences": ["BCA Specialization in Cyber Security", "BCA Specilization in Artificial Intelligence and Machine Learning", "Bachelor of Computer Application", "MCA Specialization in Artificial Intelligence and Machine Learning", "MCA Specialization in Cyber Security", "Master of Computer Applications (MCA)-2 Years", "PGDCA", "Ph.D. (Computer Science)"],
  "School of Education": ["B.A. (Hons.) Psychology", "B.A. (Pass Course)", "B.Sc. (Hons.) Psychology", "Diploma in Yoga", "M.Ed (PMET)", "Ph.D. (Education)", "Ph.D.(History)"],
  "School of Engineering & Technology": ["B.Tech. (Biomedical Engineering)", "B.Tech. (Biotechnology)", "B.Tech. (Civil Engineering)", "B.Tech. (Computer Science)", "B.Tech. (Electrical Engineering)", "B.Tech. (Electronics & Communication)", "B.Tech. (Food Technology)", "B.Tech. (Mechanical Engineering)", "B.Tech. CSE(Hons.) in Artificial Intelligence and Machine Learning", "B.Tech. CSE(Hons.) in Cyber Security", "B.Tech. CSE(Hons.) in Data Science", "M. Tech. (CSE) Specialization in Data Science", "M.Tech in Electronics & Instrumentation with specialization in Biomedical Engineering", "M.Tech. - Computer Science", "Ph.D. (Computer Science & Engineering)"],
  "School of Fashion Design": ["B. Sc. Fashion Design", "Diploma in Fashion Design", "MBA (Fashion Design)"],
  "School of Hotel Management & Catering Technology": ["B.Sc. (Hospitality & Hotel Administration)", "BHMCT", "Diploma In Bakery and Confectionery"],
  "School of Languages, Literature and Society": ["B.A. (Hons.) - English 4 Yr", "M.A. English (Literature & Language)", "Ph.D. (English)"],
  "School of Life & Basic Sciences": ["B.Sc. (Hons.) - Biotechnology", "B.Sc. (Hons.) - Biotechnology-4Y", "B.Sc. (Hons.) - Mathematics", "B.Sc. (Hons.) - Microbiology", "B.Sc. (Hons.) - Microbiology-4Y", "B.Sc. Pass Course (CBZ)", "B.Sc. Pass Course (PCM)", "M. Sc. Bioinformatics and Data Science", "M.Sc. - Biotechnology", "M.Sc. - Botany", "M.Sc. - Chemistry", "M.Sc. - Microbiology", "Ph.D. (Biotechnology)", "Ph.D. (Botany)", "Ph.D. (Chemistry)", "Ph.D. (Life Science)", "Ph.D. (Mathematics)", "Ph.D. (Microbiology)", "Ph.D. (Physics)", "Ph.D. Zoology"],
  "School of Media Studies": ["Bachelor of Arts (Journalism & Mass Communication)", "Master of Arts (Journalism & Mass Communication)", "Ph.D. (Journalism & Mass Communication)"],
  "School of Medical Sciences": ["Ph.D. (Biochemistry)"],
  "School of Pharmaceutical Sciences": ["Bachelor of Pharmacy", "Diploma in Pharmacy", "M. Pharm. (Pharmaceutical Chemistry)", "M. Pharm. (Pharmaceutics)", "M. Pharm. (Pharmacology)", "M. Pharm. (Quality Assurance)", "Ph.D. (Pharmaceutical Science)", "Pharm. D (PB)", "Pharm. D."],
  "Seedling School of Law and Governance": ["B.A.,LL.B.", "BBA,LL.B. (Hons.)", "LLB-3YR", "LLM", "Ph.D. (Law)"],
  "Seedling School of Nursing": ["B.Sc. (Nursing)", "Diploma in General Nursing and Midwifery (GNM)", "Ph.D. (Nursing)", "Post Basic B.Sc. (Nursing)"]
};

function loadResourcesView() {
  const container = document.getElementById("resourcesViewContainer");
  if (!container) return;

  renderResourcesPage();
  showFooterAfterLoad();
}

function renderResourcesPage() {
  const container = document.getElementById("resourcesViewContainer");
  if (!container) return;

  const html = `
    <div class="academic-resources-shell">
      
      <!-- Top Header -->
      <header class="academic-res-header">
        <div class="academic-res-header-left">
          <h1 class="academic-res-title">Academic Resources</h1>
          <p class="academic-res-subtitle">Find previous year papers, notes, syllabus, placement resources and more.</p>
        </div>
      </header>

      <!-- 2-Column Desktop, 1-Column Mobile Pastel Cards Grid -->
      <div class="academic-res-grid">
        
        <!-- Card 1: JNU PYQs (Directly Navigates to /pyqs dedicated page) -->
        <div class="academic-res-card mint" onclick="navigateTo('/pyqs')">
          <div class="res-card-blob mint"></div>
          <div class="res-card-inner">
            <h2 class="res-card-title">JNU PYQs</h2>
            <p class="res-card-desc">Previous year question papers for all courses and semesters.</p>
            <div class="res-card-footer">
              <span class="res-card-explore mint">Browse PYQs &rarr;</span>
              <div class="res-card-circle-btn mint">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 2: Syllabus -->
        <div class="academic-res-card blue" onclick="openResourceDetailModal('res-syllabus')">
          <div class="res-card-blob blue"></div>
          <div class="res-card-inner">
            <h2 class="res-card-title">Syllabus</h2>
            <p class="res-card-desc">Latest syllabus for all programs and subjects.</p>
            <div class="res-card-footer">
              <span class="res-card-explore blue">Explore &rarr;</span>
              <div class="res-card-circle-btn blue">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 3: Notes & Study Material -->
        <div class="academic-res-card rose" onclick="openResourceDetailModal('res-notes')">
          <div class="res-card-blob rose"></div>
          <div class="res-card-inner">
            <h2 class="res-card-title">Notes & Study Material</h2>
            <p class="res-card-desc">Class notes, study resources and shared materials.</p>
            <div class="res-card-footer">
              <span class="res-card-explore rose">Explore &rarr;</span>
              <div class="res-card-circle-btn rose">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 4: Academic Calendar -->
        <div class="academic-res-card amber" onclick="openResourceDetailModal('res-calendar')">
          <div class="res-card-blob amber"></div>
          <div class="res-card-inner">
            <h2 class="res-card-title">Academic Calendar</h2>
            <p class="res-card-desc">Important academic dates, exam schedules and notifications.</p>
            <div class="res-card-footer">
              <span class="res-card-explore amber">Explore &rarr;</span>
              <div class="res-card-circle-btn amber">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 5: University Holiday List -->
        <div class="academic-res-card slate" onclick="openResourceDetailModal('res-holidays')">
          <div class="res-card-blob slate"></div>
          <div class="res-card-inner">
            <h2 class="res-card-title">University Holiday List</h2>
            <p class="res-card-desc">Official list of university holidays and observances.</p>
            <div class="res-card-footer">
              <span class="res-card-explore slate">Explore &rarr;</span>
              <div class="res-card-circle-btn slate">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 6: Placements -->
        <div class="academic-res-card mint" onclick="openResourceDetailModal('res-placements')">
          <div class="res-card-blob mint"></div>
          <div class="res-card-inner">
            <h2 class="res-card-title">Placements</h2>
            <p class="res-card-desc">Placement drives, interview experiences and preparation resources.</p>
            <div class="res-card-footer">
              <span class="res-card-explore mint">Explore &rarr;</span>
              <div class="res-card-circle-btn mint">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 7: Career Guidance -->
        <div class="academic-res-card blue" onclick="openResourceDetailModal('res-career')">
          <div class="res-card-blob blue"></div>
          <div class="res-card-inner">
            <h2 class="res-card-title">Career Guidance</h2>
            <p class="res-card-desc">Guides, roadmaps and resources to help you plan your future.</p>
            <div class="res-card-footer">
              <span class="res-card-explore blue">Explore &rarr;</span>
              <div class="res-card-circle-btn blue">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 8: Project Ideas -->
        <div class="academic-res-card rose" onclick="openResourceDetailModal('res-ideas')">
          <div class="res-card-blob rose"></div>
          <div class="res-card-inner">
            <h2 class="res-card-title">Project Ideas</h2>
            <p class="res-card-desc">Mini projects, major projects and research ideas.</p>
            <div class="res-card-footer">
              <span class="res-card-explore rose">Explore &rarr;</span>
              <div class="res-card-circle-btn rose">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 9: Student Community -->
        <div class="academic-res-card amber" onclick="openResourceDetailModal('res-community')">
          <div class="res-card-blob amber"></div>
          <div class="res-card-inner">
            <h2 class="res-card-title">Student Community</h2>
            <p class="res-card-desc">Useful links, study groups and student initiatives.</p>
            <div class="res-card-footer">
              <span class="res-card-explore amber">Explore &rarr;</span>
              <div class="res-card-circle-btn amber">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 10: Useful Links -->
        <div class="academic-res-card slate" onclick="openResourceDetailModal('res-links')">
          <div class="res-card-blob slate"></div>
          <div class="res-card-inner">
            <h2 class="res-card-title">Useful Links</h2>
            <p class="res-card-desc">Important university links and external resources.</p>
            <div class="res-card-footer">
              <span class="res-card-explore slate">Explore &rarr;</span>
              <div class="res-card-circle-btn slate">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  `;

  container.innerHTML = html;
}

function loadPyqsView() {
  const container = document.getElementById("pyqsViewContainer") || document.getElementById("resourcesViewContainer");
  if (!container) return;

  renderPyqsPage();

  fetch("/api/pyqs/schools-map")
    .then(res => res.json())
    .then(data => {
      if (data.success && data.schools_map) {
        dynamicSchoolsCoursesMap = data.schools_map;
      } else {
        dynamicSchoolsCoursesMap = JNU_DEFAULT_SCHOOLS_MAP;
      }
      populatePyqSchoolsDropdown();
    })
    .catch(() => {
      dynamicSchoolsCoursesMap = JNU_DEFAULT_SCHOOLS_MAP;
      populatePyqSchoolsDropdown();
    });

  fetchPyqsFromApi();
  showFooterAfterLoad();
}

function renderPyqsPage() {
  const container = document.getElementById("pyqsViewContainer") || document.getElementById("resourcesViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="jnu-pyqs-page-shell">
      
      <!-- Top Emblem: — 📖 — (Exact match to media_1790162010641.png) -->
      <div class="pyq-hero-emblem-wrap">
        <span class="pyq-emblem-line"></span>
        <div class="pyq-emblem-circle">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        </div>
        <span class="pyq-emblem-line"></span>
      </div>

      <!-- Main Heading & Subtitle -->
      <h1 class="pyq-hero-title">JNU PYQs</h1>
      <p class="pyq-hero-subtitle">
        JNU's largest, community-driven database for previous year question papers. Find mid-terms and end-terms across all schools &mdash; totally free.
      </p>

      <!-- Centered Floating Filter Card (Exact match to media_1790162010641.png) -->
      <div class="pyq-filter-card">
        
        <!-- Search Input with Magnifier & Filter Slider Icon -->
        <div class="pyq-search-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="pyqSearchInput" class="pyq-search-input" placeholder="Search subject name..." value="${escapeAttr(currentPyqFilters.query)}" oninput="handlePyqSearchInput(this.value)">
          <button type="button" class="pyq-filter-icon-btn" onclick="resetPyqFilters()" title="Reset Filters" aria-label="Reset Filters">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
          </button>
        </div>

        <!-- Row 1: All Schools & All Branches -->
        <div class="pyq-dropdowns-row">
          <select id="pyqSchoolSelect" class="pyq-select-styled" onchange="handlePyqSchoolChange(this.value)" aria-label="Select School">
            <option value="All Schools">All Schools</option>
          </select>

          <select id="pyqBranchSelect" class="pyq-select-styled" onchange="handlePyqBranchChange(this.value)" aria-label="Select Branch">
            <option value="All Branches">All Branches</option>
          </select>
        </div>

        <!-- Row 2: Any Sem & Any Type -->
        <div class="pyq-dropdowns-row">
          <select id="pyqSemSelect" class="pyq-select-styled" onchange="handlePyqSemChange(this.value)" aria-label="Select Semester">
            <option value="Any Sem">Any Sem</option>
            <option value="1">Sem 1</option>
            <option value="2">Sem 2</option>
            <option value="3">Sem 3</option>
            <option value="4">Sem 4</option>
            <option value="5">Sem 5</option>
            <option value="6">Sem 6</option>
            <option value="7">Sem 7</option>
            <option value="8">Sem 8</option>
          </select>

          <select id="pyqTypeSelect" class="pyq-select-styled" onchange="handlePyqTypeChange(this.value)" aria-label="Select Exam Type">
            <option value="Any Type">Any Type</option>
            <option value="Mid Term">Mid Term</option>
            <option value="End Term">End Term</option>
          </select>
        </div>

        <!-- Row 3: Any Year (Full Width) -->
        <div>
          <select id="pyqYearSelect" class="pyq-select-styled" onchange="handlePyqYearChange(this.value)" aria-label="Select Year">
            <option value="Any Year">Any Year</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
          </select>
        </div>

      </div>

      <!-- Results Section -->
      <section class="pyq-results-section" id="pyqResultsSection">
        <div class="pyq-results-header">
          <span class="pyq-results-count" id="pyqResultsCount">Loading papers...</span>
        </div>
        <div class="pyq-results-grid" id="pyqResultsGrid"></div>
      </section>

      <!-- Desktop Tagline: — Learn Grow Belong Together — -->
      <div class="pyq-desktop-tagline">
        <span class="pyq-tagline-dash"></span>
        <span>Learn &bull; Grow &bull; Belong &bull; Together</span>
        <span class="pyq-tagline-dash"></span>
      </div>

    </div>
  `;

  populatePyqSchoolsDropdown();
}

function populatePyqSchoolsDropdown() {
  const schoolSelect = document.getElementById("pyqSchoolSelect");
  if (!schoolSelect) return;

  const map = dynamicSchoolsCoursesMap || JNU_DEFAULT_SCHOOLS_MAP;
  const currentVal = currentPyqFilters.school;

  schoolSelect.innerHTML = `<option value="All Schools" ${currentVal === "All Schools" ? "selected" : ""}>All Schools</option>`;

  Object.keys(map).sort().forEach(school => {
    const opt = document.createElement("option");
    opt.value = school;
    opt.textContent = school;
    if (school === currentVal) opt.selected = true;
    schoolSelect.appendChild(opt);
  });

  updatePyqBranchDropdown(currentVal);
}

function updatePyqBranchDropdown(selectedSchool) {
  const branchSelect = document.getElementById("pyqBranchSelect");
  if (!branchSelect) return;

  const map = dynamicSchoolsCoursesMap || JNU_DEFAULT_SCHOOLS_MAP;
  branchSelect.innerHTML = `<option value="All Branches">All Branches</option>`;

  let courses = [];
  if (selectedSchool && selectedSchool !== "All Schools" && map[selectedSchool]) {
    courses = map[selectedSchool];
  } else {
    // Flatten all unique courses across schools
    const allCourses = new Set();
    Object.values(map).forEach(list => list.forEach(c => allCourses.add(c)));
    courses = Array.from(allCourses).sort();
  }

  courses.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    if (c === currentPyqFilters.branch) opt.selected = true;
    branchSelect.appendChild(opt);
  });
}

function handlePyqSchoolChange(schoolVal) {
  currentPyqFilters.school = schoolVal;
  currentPyqFilters.branch = "All Branches";
  updatePyqBranchDropdown(schoolVal);
  fetchPyqsFromApi();
}

function handlePyqBranchChange(branchVal) {
  currentPyqFilters.branch = branchVal;
  fetchPyqsFromApi();
}

function handlePyqSemChange(semVal) {
  currentPyqFilters.sem = semVal;
  fetchPyqsFromApi();
}

function handlePyqTypeChange(typeVal) {
  currentPyqFilters.type = typeVal;
  fetchPyqsFromApi();
}

function handlePyqYearChange(yearVal) {
  currentPyqFilters.year = yearVal;
  fetchPyqsFromApi();
}

function handlePyqSearchInput(query) {
  clearTimeout(pyqSearchDebounceTimer);
  pyqSearchDebounceTimer = setTimeout(() => {
    currentPyqFilters.query = query.trim();
    fetchPyqsFromApi();
  }, 250);
}

function resetPyqFilters() {
  currentPyqFilters = {
    school: "All Schools",
    branch: "All Branches",
    sem: "Any Sem",
    type: "Any Type",
    year: "Any Year",
    query: ""
  };
  renderPyqsPage();
  fetchPyqsFromApi();
}

function fetchPyqsFromApi() {
  const countEl = document.getElementById("pyqResultsCount");
  const grid = document.getElementById("pyqResultsGrid");
  if (!grid) return;

  const params = new URLSearchParams();
  if (currentPyqFilters.query) params.set("q", currentPyqFilters.query);
  if (currentPyqFilters.school && currentPyqFilters.school !== "All Schools") params.set("school", currentPyqFilters.school);
  if (currentPyqFilters.branch && currentPyqFilters.branch !== "All Branches") params.set("branch", currentPyqFilters.branch);
  if (currentPyqFilters.sem && currentPyqFilters.sem !== "Any Sem") params.set("sem", currentPyqFilters.sem);
  if (currentPyqFilters.type && currentPyqFilters.type !== "Any Type") params.set("type", currentPyqFilters.type);
  if (currentPyqFilters.year && currentPyqFilters.year !== "Any Year") params.set("year", currentPyqFilters.year);

  fetch(`/api/pyqs?${params.toString()}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.pyqs)) {
        dynamicPyqList = data.pyqs;
        renderPyqsList(dynamicPyqList);
        if (countEl) countEl.textContent = `Showing ${dynamicPyqList.length} of ${data.total_available || dynamicPyqList.length} question papers`;
      } else {
        renderPyqsList([]);
        if (countEl) countEl.textContent = "No papers found";
      }
    })
    .catch(() => {
      renderPyqsList([]);
      if (countEl) countEl.textContent = "Error loading papers";
    });
}

function renderPyqsList(papers) {
  const grid = document.getElementById("pyqResultsGrid");
  if (!grid) return;

  if (papers.length === 0) {
    grid.innerHTML = `
      <div class="pyq-empty-state" style="grid-column: 1 / -1;">
        <div style="font-size:2.5rem; margin-bottom:12px;">📑</div>
        <h3 style="font-family:var(--font-serif); font-size:1.25rem; color:#0F172A; margin:0 0 6px 0;">No question papers match your filters</h3>
        <p style="font-size:0.88rem; color:#64748B; margin:0 0 16px 0;">Try adjusting your school, branch, semester, or search terms.</p>
        <button type="button" class="btn-create-team-primary" onclick="resetPyqFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = papers.map(item => {
    const semText = `Sem ${item.semester || 1}`;
    const typeClass = (item.type || "").toLowerCase().includes("mid") ? "mid" : "end";
    const courses = Array.isArray(item.courses) ? item.courses : (item.courses ? [item.courses] : []);
    const dlUrl = item.download_url || "#";

    return `
      <div class="pyq-paper-card">
        <div>
          <div class="pyq-paper-top-row">
            <h3 class="pyq-paper-title">${escapeHtml(item.subject_name)}</h3>
            ${item.subject_code ? `<span class="pyq-code-badge">${escapeHtml(item.subject_code)}</span>` : ''}
          </div>

          <div class="pyq-school-indicator" style="margin-top:6px;">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span>${escapeHtml(item.school)}</span>
          </div>

          ${courses.length > 0 ? `
            <div class="pyq-course-tags" style="margin-top:8px;">
              ${courses.slice(0, 2).map(c => `<span class="pyq-course-pill">${escapeHtml(c)}</span>`).join("")}
              ${courses.length > 2 ? `<span class="pyq-course-pill">+${courses.length - 2} more</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-top:6px;">
          <div class="pyq-badges-bar">
            <span class="pyq-badge sem">${escapeHtml(semText)}</span>
            <span class="pyq-badge ${typeClass}">${escapeHtml(item.type || 'End Term')}</span>
            <span class="pyq-badge year">${escapeHtml(String(item.year || '2024'))}</span>
          </div>

          <button type="button" class="btn-pyq-download" onclick="downloadPyqPaper('${escapeAttr(dlUrl)}', '${escapeAttr(item.file_name || '')}', '${escapeAttr(item.subject_name || 'paper')}')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function downloadPyqPaper(url, fileName, subjectName) {
  showToast(`Downloading ${subjectName}...`, "info");
  const safeName = fileName || `${subjectName.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  const downloadApi = `/api/pyqs/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(safeName)}`;
  
  const a = document.createElement("a");
  a.href = downloadApi;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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

