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
const DEFAULT_STUDENT_AVATAR = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
  '<rect width="64" height="64" rx="32" fill="#13432C"/>' +
  '<circle cx="32" cy="24" r="11" fill="#8AB89B"/>' +
  '<path d="M16 52 C16 42 23 38 32 38 C41 38 48 42 48 52" fill="#8AB89B"/>' +
  '</svg>'
);

function getStudentAvatarSrc(rawUrl, rId) {
  if (!rawUrl || failedAvatarUrls.has(rawUrl)) {
    return DEFAULT_STUDENT_AVATAR;
  }
  return rawUrl;
}

// Instagram-style white empty avatar silhouette for unlinked accounts
const INSTAGRAM_EMPTY_AVATAR = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
  '<rect width="64" height="64" rx="32" fill="#143525"/>' +
  '<circle cx="32" cy="23" r="11" fill="#FFFFFF" fill-opacity="0.9"/>' +
  '<path d="M14 53 C14 41 22 36 32 36 C42 36 50 41 50 53" fill="#FFFFFF" fill-opacity="0.9"/>' +
  '</svg>'
);

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
      ${text ? `<div class="ios-spinner-text">${escapeHtml(text)}</div>` : ''}
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  setupRouter();
  loadUserFromSession(() => {
    handleCurrentRoute();
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
    handleCurrentRoute();
  });
}

function navigateTo(path) {
  closeMobileDrawer();
  closeNotificationsPanel();
  if (window.location.pathname !== path) {
    history.pushState(null, "", path);
    handleCurrentRoute();
  }
}

function handleCurrentRoute() {
  const path = window.location.pathname;
  highlightActiveNavLinks();

  const panels = document.querySelectorAll(".view-page-panel");
  panels.forEach(p => p.classList.remove("active"));

  // Toggle layout mode: show right widgets ONLY on discover home (/), hide on all other views
  const appShell = document.getElementById("appEnclosureFrame");
  if (appShell) {
    if (path !== "/") {
      appShell.classList.add("two-column-mode");
    } else {
      appShell.classList.remove("two-column-mode");
    }
  }

  if (path === "/") {
    const p = document.getElementById("viewDiscover");
    if (p) {
      p.classList.add("active");
      loadDiscoverView();
    }
  } else if (path.startsWith("/team/")) {
    const teamId = path.split("/")[2];
    const p = document.getElementById("viewTeamDetail");
    if (p) {
      p.classList.add("active");
      loadTeamDetailView(teamId);
    }
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
  } else if (path === "/about") {
    const p = document.getElementById("viewAbout");
    if (p) {
      p.classList.add("active");
      loadAboutView();
    }
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
  fetch("/api/auth/me")
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        currentUser = data.user;
      } else {
        currentUser = null;
      }
      renderNavUserSlots();
      renderDrawerUserSlot();
      if (typeof callback === "function") callback();
    })
    .catch(() => {
      currentUser = null;
      renderNavUserSlots();
      renderDrawerUserSlot();
      if (typeof callback === "function") callback();
    });
}

function renderNavUserSlots() {
  const dtSlot = document.getElementById("navUserSlotDesktop");
  const topSlot = document.getElementById("navUserSlotDesktopTop");
  const profileDropdown = document.getElementById("desktopProfileDropdown");

  if (currentUser) {
    const rawName = (currentUser.name || currentUser.id || "Student") + "";
    const cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
    const firstName = cleanName.split(' ')[0] || cleanName;
    const avatarUrl = currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.id || 'Student')}`;

    const userDtHtml = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <a href="/profile" style="display:flex; align-items:center; gap:12px; text-decoration:none; padding:8px 12px; border-radius:var(--radius-xl); background:rgba(255,255,255,0.06); transition:background var(--trans-fast);">
          <div class="avatar-stack-item" style="width:36px; height:36px; border:2px solid var(--badge-yellow); margin-left:0; flex-shrink:0;">
            <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(firstName)}" loading="lazy" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.id || 'Student')}';">
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
        <button type="button" onclick="toggleDesktopProfileDropdown(event)" class="desktop-top-user-pill" style="display:flex; align-items:center; gap:8px; padding:4px 14px 4px 6px; border-radius:var(--radius-pill); background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1); cursor:pointer; transition:all var(--trans-fast);" aria-label="Open Account Menu">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(firstName)}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1.5px solid var(--badge-mint);" onerror="this.src='/static/img/jnu_logo.png';">
          <span style="font-weight:750; font-size:0.8125rem; color:var(--text-white);">${escapeHtml(firstName)}</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:14px; height:14px; color:var(--text-sage);"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
        </button>
      `;
    }

    if (profileDropdown) {
      profileDropdown.innerHTML = `
        <div class="desktop-profile-menu-header">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" class="desktop-profile-menu-avatar" onerror="this.src='/static/img/jnu_logo.png';">
          <div style="min-width:0; flex:1;">
            <div style="font-weight:750; font-size:0.9375rem; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(cleanName)}
            </div>
            <div style="font-size:0.75rem; color:var(--text-sage); margin-top:2px;">
              @${escapeHtml(currentUser.id || 'Student')} • <span style="color:var(--badge-mint); font-weight:700;">Active</span>
            </div>
          </div>
        </div>
        <div class="desktop-menu-list">
          <a href="/profile" class="desktop-menu-item" onclick="closeDesktopDropdowns()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
            <span>My Profile & Details</span>
          </a>
          <a href="/create-team" class="desktop-menu-item" onclick="closeDesktopDropdowns()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
            <span>Create / Manage Squad</span>
          </a>
          <button type="button" onclick="closeDesktopDropdowns(); showCoursePickerModal();" class="desktop-menu-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"/></svg>
            <span>Change Degree / Program</span>
          </button>
          <div class="desktop-menu-divider"></div>
          <button type="button" onclick="closeDesktopDropdowns(); logoutUser();" class="desktop-menu-item danger">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
            <span>Sign Out of JnuMate</span>
          </button>
        </div>
      `;
    }
  } else {
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
  if (!slot) return;

  if (currentUser) {
    const rawName = (currentUser.name || currentUser.id || "Student") + "";
    const cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
    const avatarUrl = currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.id || 'Student')}`;

    slot.innerHTML = `
      <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-surface); border-radius:var(--radius-xl); padding:14px; display:flex; align-items:center; gap:12px;">
        <div class="avatar-stack-item" style="width:42px; height:42px; border:2px solid var(--badge-yellow); margin-left:0; flex-shrink:0;">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" onerror="this.remove();">
        </div>
        <div style="min-width:0; flex:1;">
          <div style="font-weight:750; font-size:0.9375rem; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(cleanName)}
          </div>
          <div style="font-size:0.75rem; color:var(--text-sage); margin-top:2px;">
            ${escapeHtml(currentUser.id || 'Student')} • <span style="color:var(--badge-mint);">Active</span>
          </div>
        </div>
      </div>
    `;

    if (footer) {
      footer.innerHTML = `
        <button onclick="logoutUser()" class="btn-danger-pill" style="width:100%; padding:12px; font-size:0.875rem;">
          Sign Out of JnuMate
        </button>
      `;
    }
  } else {
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

function logoutUser() {
  closeMobileDrawer();
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
  }
}

function closeMobileDrawer() {
  const drawer = document.getElementById("mobileDrawerOverlay");
  if (drawer) {
    drawer.classList.remove("active");
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
        ${renderIosSpinner('lg', 'Discovering hackathon teams...')}
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

function debounceDiscoverSearch() {
  clearTimeout(discoverSearchDebounce);
  discoverSearchDebounce = setTimeout(() => {
    const input = document.getElementById("searchInput");
    if (input) {
      discoverSearchTerm = input.value.trim().toLowerCase();
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
    statusPill = `<span class="status-capsule open-pill">● ${openSlots} Open Seats</span>`;
  }

  const hackBadgeHtml = isCtf
    ? `<span class="hackathon-tag-pill ctf"><img src="/static/img/ctf_logo.jpg" alt="CTF"> CTF Hackathon</span>`
    : `<span class="hackathon-tag-pill sih"><img src="/static/img/sih_logo.jpg" alt="SIH"> Smart India (SIH)</span>`;

  // 6 Pronounced Roster Avatars: filled member avatars + empty circle avatars
  const members = team.members || [];
  let rosterAvatarsHtml = "";
  for (let i = 0; i < 6; i++) {
    if (i < members.length && members[i]) {
      const m = members[i];
      const mName = (m.name || m.r_id || "Student") + "";
      const cleanName = mName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
      const isLeader = m.role === 'leader';
      const avatarUrl = m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.r_id || 'Student')}`;

      rosterAvatarsHtml += `
        <div class="roster-avatar-item filled" title="${escapeAttr(cleanName)}${isLeader ? ' (Leader)' : ''}">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(cleanName)}" loading="lazy" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.r_id || 'Student')}';">
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
        <div class="team-card-top-row" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          ${hackBadgeHtml}
          ${statusPill}
        </div>

        <h2 class="team-card-title">${escapeHtml(team.name || 'Untitled Team')}</h2>
        <p class="team-card-pitch">${escapeHtml(team.description || "Building an innovative hackathon solution. Check out open seats and join our squad!")}</p>

        <div class="team-card-roster-row">
          ${rosterAvatarsHtml}
        </div>
      </div>

      <div class="team-card-bottom-row" style="margin-top:14px; padding-top:12px; border-top:1px solid var(--border-muted); display:flex; align-items:center; justify-content:space-between;">
        <span class="meta-members-tag" style="font-size:0.75rem; color:var(--text-sage); font-weight:700;">${count} / 6 Members</span>
        <span class="btn-black-pill sm">View Team ➔</span>
      </div>
    </article>
  `;
}

function renderFilteredTeams(teams) {
  const grid = document.getElementById("teamsGridContainer");
  const emptyState = document.getElementById("emptyStateContainer");
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
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  // Clean cards list/grid view across all screen sizes (No Kanban columns)
  grid.className = "teams-kanban-board grid-mode";
  grid.innerHTML = filtered.map(renderSingleTeamCard).join("");
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
function loadTeamDetailView(teamId) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  // 1. INSTANT ZERO-LATENCY RENDER: Check in-memory cache first!
  const cachedTeam = clientCache.teamsMap[teamId] || (clientCache.teamsList ? clientCache.teamsList.find(t => t && t.id == teamId) : null);
  if (cachedTeam) {
    renderFullTeamDetail(cachedTeam);
    // Only fetch join requests if user is team leader!
    if (currentUser && cachedTeam.leader_r_id && (cachedTeam.leader_r_id.toUpperCase() === currentUser.id.toUpperCase())) {
      loadTeamJoinRequests(teamId);
    }
  } else {
    container.innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        ${renderIosSpinner('lg', 'Loading team roster...')}
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
            <div style="text-align:center; padding:60px 20px;">
              <div style="font-family:var(--font-serif); font-size:1.5rem; margin-bottom:8px;">Team Not Found</div>
              <p style="color:var(--text-sage); margin-bottom:18px;">The requested hackathon team does not exist or has been disbanded.</p>
              <a href="/" class="btn-black-pill">← Back to Discover</a>
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
          <div style="text-align:center; padding:60px 20px;">
            <div style="font-family:var(--font-serif); font-size:1.5rem; margin-bottom:8px;">Unable to Load Team</div>
            <p style="color:var(--text-sage); margin-bottom:18px;">Please check your connection and try again.</p>
            <a href="/" class="btn-black-pill">← Back to Discover</a>
          </div>
        `;
      }
    });
}

function renderFullTeamDetail(team) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  const count = team.member_count || (team.members ? team.members.length : 0);
  const isFull = Boolean(team.is_full || count >= 6);
  const isLeader = Boolean(currentUser && currentUser.id && team.leader_r_id && (team.leader_r_id.toUpperCase() === currentUser.id.toUpperCase()));
  const isMember = Boolean(currentUser && currentUser.id && (team.members || []).some(m => m && m.r_id && (m.r_id.toUpperCase() === currentUser.id.toUpperCase())));

  // 6-Seat Visual Roster Cards
  const members = team.members || [];
  let rosterCardsHtml = "";

  for (let i = 0; i < 6; i++) {
    if (i < members.length) {
      const m = members[i];
      if (!m) continue;
      const mRid = (m.r_id || m.student_r_id || "") + "";
      const mName = (m.name || mRid || "Student") + "";
      const cleanName = mName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
      const initial = cleanName.charAt(0).toUpperCase() || 'U';
      const isYou = Boolean(currentUser && currentUser.id && mRid && (mRid.toUpperCase() === (currentUser.id + '').toUpperCase()));
      const isTeamLeader = m.role === 'leader';
      const roleCapsule = isTeamLeader
        ? `<span class="status-capsule leader">Leader</span>`
        : `<span class="status-capsule member">Member</span>`;
      const avatarUrl = m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mRid || 'Student')}`;

      rosterCardsHtml += `
        <div class="roster-seat-card">
          <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
            <div class="seat-avatar">
              <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(mName)}" loading="lazy" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mRid || 'Student')}';">
            </div>

            <div style="min-width:0; flex:1;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="seat-name">${escapeHtml(cleanName)}</span>
                ${isYou ? `<span class="status-capsule" style="background:var(--badge-mint); color:#fff; font-size:0.6875rem;">(You)</span>` : ""}
                ${roleCapsule}
              </div>

              <div class="seat-meta">
                @${escapeHtml(mRid)} ${m.gender ? `• ${escapeHtml(m.gender)}` : ""}
                ${m.dob && m.dob !== 'N/A' ? ` • DOB: ${escapeHtml(m.dob)}` : ""}
              </div>

              ${m.program ? `
                <div style="margin-top:4px;">
                  <span class="status-capsule member" style="font-size:0.6875rem;">${escapeHtml(m.program)}</span>
                </div>
              ` : ''}

              ${m.email ? `
                <div style="margin-top:4px;">
                  <a href="mailto:${escapeHtml(m.email)}" style="font-size:0.75rem; color:var(--badge-blue); text-decoration:underline;">
                    ${escapeHtml(m.email)}
                  </a>
                </div>
              ` : ''}
            </div>
          </div>

          ${isLeader && !isTeamLeader ? `
            <button onclick="confirmRemoveMember('${team.id}', '${escapeAttr(mRid)}', '${escapeAttr(cleanName)}')" class="btn-danger-pill" style="padding:4px 10px; font-size:0.6875rem;">
              Remove
            </button>
          ` : ''}
        </div>
      `;
    } else {
      const seatNum = i + 1;
      rosterCardsHtml += `
        <div class="roster-seat-card empty-seat">
          <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
            <span style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-sage);">
              Seat ${seatNum} • Open
            </span>
            ${isLeader ? `
              <button onclick="openSlotStudentSearchModalForTeam('${team.id}', ${seatNum})" class="btn-black-pill sm" style="margin-top:4px;">
                + Add Teammate
              </button>
            ` : `
              <span style="font-size:0.8125rem; color:var(--text-sage-light);">Open for join requests</span>
            `}
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <div class="team-page-full-container">
      <div style="margin-bottom:20px;">
        <a href="/" class="btn-outline-pill">
          ← Back to Discover
        </a>
      </div>

      <!-- Hero Header -->
      <div class="team-header-hero">
        <div class="team-header-top">
          <div class="team-title-cluster">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
              <span class="hackathon-tag-pill ${(team.hackathon_type || 'sih').toLowerCase()}" style="font-size:0.75rem; padding:4px 12px;">
                <img src="${(team.hackathon_type === 'ctf') ? '/static/img/ctf_logo.jpg' : '/static/img/sih_logo.jpg'}" alt="Logo">
                ${(team.hackathon_type === 'ctf') ? 'Capture The Flag (CTF)' : 'Smart India Hackathon (SIH)'}
              </span>
              <span class="status-capsule ${isFull ? 'full-pill' : 'open-pill'}">
                ${isFull ? '● Team Full (6/6)' : `● ${6 - count} Open Seats Available`}
              </span>
            </div>
            <h1 class="team-hero-name">${escapeHtml(team.name)}</h1>
          </div>

          <div class="team-header-actions">
            ${isLeader ? `
              <button onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="btn-black-pill sm">
                ✎ Edit Team
              </button>
              <button onclick="confirmDisbandTeam('${team.id}')" class="btn-danger-pill">
                Disband Team
              </button>
            ` : ''}

            ${(isMember && !isLeader) ? `
              <button onclick="confirmLeaveTeam('${team.id}')" class="btn-danger-pill">
                Leave Team
              </button>
            ` : ''}
          </div>
        </div>

        <div class="team-pitch-quote-box">
          <div class="pitch-quote-label">PROJECT PITCH & GOAL</div>
          <p class="pitch-quote-text">
            ${escapeHtml(team.description || "Building an innovative hackathon solution. Check out our open seats and join the squad!")}
          </p>
        </div>
      </div>

      <!-- 2-Column Team Workspace Layout -->
      <div class="team-detail-grid">
        <!-- LEFT COLUMN: WhatsApp Card & 6-Seat Roster -->
        <div class="team-detail-left-col">
          <!-- WhatsApp Group Card -->
          <div class="team-wa-card">
            <div class="team-wa-left">
              <div class="team-wa-icon-circle">
                <svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/></svg>
              </div>
              <div>
                <div class="team-wa-title">Official Team WhatsApp Chat</div>
                <div class="team-wa-subtitle">
                  ${team.whatsapp_link ? 'Connect directly with confirmed teammates for standups and coding sessions.' : (isLeader ? 'You haven\'t linked a WhatsApp group yet. Add one so members can coordinate!' : 'No WhatsApp link provided yet by team leader.')}
                </div>
              </div>
            </div>
            <div>
              ${team.whatsapp_link ? `
                <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" class="btn-whatsapp-pill">
                  Join WhatsApp ➔
                </a>
              ` : (isLeader ? `
                <button onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="btn-outline-pill">
                  + Add Link
                </button>
              ` : `<span style="font-size:0.8125rem; color:var(--text-sage);">Not set</span>`)}
            </div>
          </div>

          <!-- 6-Seat Roster Section -->
          <div class="roster-section-card">
            <div class="roster-section-header">
              <div>
                <h3 class="font-serif" style="font-size:1.375rem;">Official Team Roster</h3>
                <p style="font-size:0.8125rem; color:var(--text-sage); margin-top:2px;">
                  ${count} of 6 seats filled (${6 - count} open)
                </p>
              </div>
              <span class="status-capsule ${isFull ? 'full' : 'open'}">
                ${isFull ? 'Roster Complete' : `${6 - count} Open Slots`}
              </span>
            </div>

            <div class="roster-grid-6">
              ${rosterCardsHtml}
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Pending Requests & Team Info -->
        <div class="team-detail-right-col">
          <!-- IF LEADER: Pending Join Requests Panel (PROMINENT AT TOP!) -->
          ${isLeader ? `
            <div class="pending-requests-card">
              <div class="pending-requests-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <h3 class="font-serif" style="font-size:1.25rem;">Pending Join Requests</h3>
                  <span id="pendingReqCountBadge" class="status-capsule open" style="font-size:0.6875rem;">0</span>
                </div>
              </div>
              <div id="pendingRequestsContainer" class="pending-requests-list">
                ${renderIosSpinner('sm', 'Checking for applicants...')}
              </div>
            </div>
          ` : ''}

          <!-- IF NON-MEMBER & NOT FULL: Join Team Card -->
          ${(!isMember && !isFull) ? `
            <div class="join-team-action-card">
              <div class="widget-title-row" style="margin-bottom:12px;">
                <span class="widget-label-tiny">Join Team</span>
                <span style="font-size:0.75rem; color:var(--badge-mint); font-weight:750;">● Open for Applications</span>
              </div>
              <h3 class="font-serif" style="font-size:1.25rem; margin-bottom:6px;">Want to join ${escapeHtml(team.name)}?</h3>
              <p style="font-size:0.8125rem; color:var(--text-sage-light); line-height:1.45; margin-bottom:14px;">
                Send a direct join request to the team leader. Introduce yourself or highlight your technical skills.
              </p>
              ${currentUser ? `
                <textarea id="joinMessageInput" rows="3" placeholder="e.g. Hey! I'm proficient in React, Node, and UI design. Would love to join..." class="input-forest" style="margin-bottom:12px;"></textarea>
                <button onclick="submitJoinRequest('${team.id}')" class="btn-black-pill" style="width:100%;">
                  Send Join Request ➔
                </button>
              ` : `
                <div style="background:rgba(0,0,0,0.25); border-radius:var(--radius-lg); padding:14px; text-align:center;">
                  <p style="font-size:0.8125rem; color:var(--text-sage); margin-bottom:10px;">Sign in with your College R-ID to request joining this team.</p>
                  <a href="/login" class="btn-black-pill sm">Sign In to Apply</a>
                </div>
              `}
            </div>
          ` : ''}

          <!-- Team Guidelines Card -->
          <div class="team-guide-side-card">
            <h4 class="font-serif" style="font-size:1.0625rem; margin-bottom:10px;">Team Guidelines</h4>
            <ul style="list-style:none; display:flex; flex-direction:column; gap:10px; font-size:0.8125rem; color:var(--text-sage-light);">
              <li style="display:flex; gap:8px;">
                <span style="color:var(--badge-mint);">✓</span> <span>Max 6 members per hackathon squad.</span>
              </li>
              <li style="display:flex; gap:8px;">
                <span style="color:var(--badge-mint);">✓</span> <span>Leaders can directly invite peers via R-ID or accept applications.</span>
              </li>
              <li style="display:flex; gap:8px;">
                <span style="color:var(--badge-mint);">✓</span> <span>Join the official WhatsApp chat to coordinate immediately.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

function loadTeamJoinRequests(teamId) {
  const container = document.getElementById("pendingRequestsContainer");
  const badge = document.getElementById("pendingReqCountBadge");
  if (!container) return;

  fetch(`/api/teams/${teamId}/requests?leader_r_id=${encodeURIComponent(currentUser ? currentUser.id : "")}`)
    .then(res => res.json())
    .then(data => {
      const requests = data.requests || [];
      if (badge) badge.innerText = `${requests.length} Pending`;

      if (requests.length === 0) {
        container.innerHTML = `<p style="font-size:0.8125rem; color:var(--text-sage); text-align:center; padding:12px 0;">No pending join requests right now.</p>`;
        return;
      }

      container.innerHTML = requests.map(req => {
        const applicantName = (req.name || req.student_name || req.r_id || "Student") + "";
        const initial = applicantName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
        return `
          <div class="pending-request-item">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="seat-avatar" style="width:36px; height:36px;">
                <img src="${escapeHtml(req.avatar_url || '')}" alt="${escapeHtml(applicantName)}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(req.r_id || 'Student')}';">
              </div>
              <div style="min-width:0; flex:1;">
                <div style="font-weight:750; font-size:0.875rem; color:var(--text-white);">${escapeHtml(applicantName)}</div>
                <div style="font-size:0.6875rem; color:var(--text-sage);">@${escapeHtml(req.r_id)} ${req.gender ? `• ${escapeHtml(req.gender)}` : ''}</div>
              </div>
            </div>

            ${req.message ? `
              <div style="font-size:0.8125rem; color:var(--text-sage-light); background:rgba(0,0,0,0.25); padding:8px 12px; border-radius:var(--radius-md); font-style:italic;">
                "${escapeHtml(req.message)}"
              </div>
            ` : ""}

            <div style="display:flex; gap:8px; justify-content:flex-end;">
              <button onclick="handleJoinRequestAction('${teamId}', '${req.request_id || req.id}', 'reject')" class="btn-outline-pill" style="padding:5px 12px; font-size:0.75rem;">
                Decline
              </button>
              <button onclick="handleJoinRequestAction('${teamId}', '${req.request_id || req.id}', 'accept')" class="btn-black-pill sm" style="background:var(--badge-mint); color:#fff; border-color:var(--badge-mint);">
                ✓ Accept
              </button>
            </div>
          </div>
        `;
      }).join("");
    })
    .catch(() => {
      container.innerHTML = `<p style="color:var(--badge-coral); font-size:0.875rem;">Failed to load requests.</p>`;
    });
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
  const msg = msgInput ? msgInput.value.trim() : "";

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
        loadTeamDetailView(teamId);
      } else {
        showToast(data.message || "Failed to send request", "error");
      }
    })
    .catch(() => showToast("Network error sending request", "error"));
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
function loadProfileView() {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="form-card-centered" style="text-align:center;">
        <h2 class="font-serif" style="font-size:1.625rem; margin-bottom:8px;">Sign In Required</h2>
        <p style="color:var(--text-sage); margin-bottom:20px;">Sign in with your College R-ID to view your hackathon profile and teams.</p>
        <a href="/login" class="btn-black-pill lg" style="width:100%;">Sign In with R-ID</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="text-align:center; padding:60px 20px;">
      ${renderIosSpinner('lg', 'Loading your profile...')}
    </div>
  `;

  fetch(`/api/user/profile?r_id=${encodeURIComponent(currentUser.id || "")}`)
    .then(res => res.json())
    .then(data => {
      const prof = data.profile || currentUser;
      const userTeams = data.teams || [];
      renderFullProfile(prof, userTeams);
    })
    .catch(() => {
      renderFullProfile(currentUser, []);
    });
}

function renderFullProfile(prof, userTeams) {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  const rawName = prof.name || prof.r_id || "Student";
  const cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
  const avatarSrc = prof.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(prof.r_id || 'Student')}`;

  // 1. Professional Profile Left Identity Spotlight Card
  const identityCardHtml = `
    <div class="profile-sticky-identity-card">
      <div class="profile-identity-avatar-box">
        <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(cleanName)}" onerror="this.src='/static/img/jnu_logo.png';">
      </div>

      <h2 class="font-serif" style="font-size:1.625rem; line-height:1.2; margin-bottom:4px;">${escapeHtml(cleanName)}</h2>
      <div style="font-size:0.875rem; color:var(--badge-yellow); font-weight:750; margin-bottom:12px;">@${escapeHtml(prof.r_id || 'N/A')}</div>

      <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
        <span class="status-capsule member" style="font-size:0.75rem;">${escapeHtml(prof.program || 'Student')}</span>
        <span class="status-capsule full" style="font-size:0.75rem;">● Verified Student</span>
      </div>

      <div style="background:rgba(0,0,0,0.28); border:1px solid rgba(255,255,255,0.08); border-radius:var(--radius-xl); padding:14px; margin-bottom:20px; text-align:left;">
        <div style="font-size:0.6875rem; color:var(--text-sage); text-transform:uppercase; font-weight:800; letter-spacing:0.06em; margin-bottom:6px;">Hackathon Status</div>
        <div style="font-size:0.9375rem; font-weight:750; color:var(--badge-mint);">
          ${userTeams.length > 0 ? `Active in ${userTeams.length} Team(s)` : 'Free Agent (Looking for Squad)'}
        </div>
        ${userTeams.length > 0 ? `<div style="font-size:0.75rem; color:var(--text-sage-light); margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(userTeams[0].name)}</div>` : ''}
      </div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <button onclick="showCoursePickerModal()" class="btn-black-pill sm" style="width:100%; justify-content:center;">
          ✎ Edit Academic Course
        </button>
        <button onclick="logoutUser()" class="btn-danger-pill" style="width:100%; justify-content:center;">
          Sign Out of JnuMate
        </button>
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

        <!-- Right Section: Credentials, Personal Contact & Teams -->
        <div class="profile-content-column">
          ${credentialsHtml}
          ${contactHtml}
          ${teamsHtml}
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
    container.innerHTML = `
      <div class="form-card-centered" style="text-align:center;">
        <h2 class="font-serif" style="font-size:1.625rem; margin-bottom:8px;">Sign In Required</h2>
        <p style="color:var(--text-sage); margin-bottom:20px;">Sign in with your College R-ID to create and publish a hackathon team.</p>
        <a href="/login" class="btn-black-pill lg" style="width:100%;">Sign In with R-ID</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="create-team-container">
      <div style="margin-bottom:20px;">
        <a href="/" class="btn-outline-pill">
          ← Cancel & Back to Discover
        </a>
      </div>

        <div class="create-team-two-column">
          <!-- Left Column: Team Creation Form Card -->
          <div class="create-team-card">
            <div class="greeting-sup-text" style="color:var(--badge-mint);">6-Seat Team Builder</div>
            <h1 class="font-serif" style="font-size:2.25rem; margin-bottom:8px;">Create New Team</h1>
            <p style="color:var(--text-sage); font-size:0.9375rem; margin-bottom:28px;">
              Name your hackathon team, describe your project pitch, and assign teammates to slots or leave them open for applicants.
            </p>

            <div style="display:flex; flex-direction:column; gap:20px;">
              <!-- Hackathon Category Selector (Point 1: SIH vs CTF) -->
              <div>
                <label class="form-label-forest" style="margin-bottom:8px;">Choose Hackathon Category *</label>
                <div class="hackathon-selector-grid">
                  <div class="hackathon-select-card sih ${selectedHackathonType === 'sih' ? 'active' : ''}" onclick="selectHackathonType('sih')">
                    <img src="/static/img/sih_logo.jpg" alt="SIH Hackathon">
                    <div style="min-width:0; flex:1;">
                      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
                        <span style="font-weight:750; font-size:0.9375rem; color:var(--text-white);">Smart India Hackathon (SIH)</span>
                        <span class="hackathon-tag-pill sih" style="font-size:0.65rem; padding:2px 8px;">SIH</span>
                      </div>
                      <div style="font-size:0.75rem; color:var(--text-sage-light); line-height:1.4;">Hardware & Software editions • National 6-member squad</div>
                    </div>
                  </div>

                  <div class="hackathon-select-card ctf ${selectedHackathonType === 'ctf' ? 'active' : ''}" onclick="selectHackathonType('ctf')">
                    <img src="/static/img/ctf_logo.jpg" alt="CTF Hackathon">
                    <div style="min-width:0; flex:1;">
                      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
                        <span style="font-weight:750; font-size:0.9375rem; color:var(--text-white);">Capture The Flag (CTF)</span>
                        <span class="hackathon-tag-pill ctf" style="font-size:0.65rem; padding:2px 8px;">CTF</span>
                      </div>
                      <div style="font-size:0.75rem; color:var(--text-sage-light); line-height:1.4;">Cybersecurity, network defense & binary exploits • 6-member squad</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:18px;">
                <div>
                  <label class="form-label-forest">Team Title *</label>
                  <input type="text" id="teamNameInput" placeholder="e.g. CyberStorm, NeuroVision" class="input-forest">
                </div>
                <div>
                  <label class="form-label-forest">Official Team WhatsApp Group Link</label>
                  <input type="text" id="teamWaInput" placeholder="https://chat.whatsapp.com/..." class="input-forest">
                </div>
              </div>

              <div>
                <label class="form-label-forest">Project Pitch / Hackathon Idea *</label>
                <textarea id="teamDescInput" rows="3" placeholder="Briefly describe what problem statement you're tackling and what skills you are looking for..." class="input-forest"></textarea>
              </div>

              <!-- 6-Seat Team Builder -->
              <div style="margin-top:10px;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
                  <div>
                    <label class="form-label-forest" style="margin-bottom:2px;">6-Seat Team Roster</label>
                    <span style="font-size:0.8125rem; color:var(--text-sage);">Click any open seat to search and add a student by R-ID. Empty seats stay open for join requests.</span>
                  </div>
                  <span class="status-capsule open" id="createTeamFilledCount">1/6 Assigned</span>
                </div>

                <div id="createTeamSlotsContainer" class="create-slots-grid"></div>
              </div>

              <button onclick="submitCreateTeam()" id="btnSubmitCreate" class="btn-black-pill lg" style="width:100%; margin-top:12px;">
                Create & Publish Team ➔
              </button>
            </div>
          </div>

          <!-- Right Column: Hackathon Rules & Guidelines Sticky Sidebar -->
          <div class="create-team-guide-sidebar">
            <h3 class="font-serif" style="font-size:1.25rem; margin-bottom:14px; color:var(--text-white);">Team Builder Guidelines</h3>
            
            <div style="display:flex; flex-direction:column; gap:16px;">
              <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:var(--radius-lg); padding:12px 14px;">
                <div style="font-weight:750; font-size:0.875rem; color:var(--badge-mint); margin-bottom:4px;">
                  🏆 6-Member Roster System
                </div>
                <div style="font-size:0.78rem; color:var(--text-sage-light); line-height:1.45;">
                  Every hackathon team consists of 1 Leader plus up to 5 teammates. Any open slots remain searchable by fellow students looking to apply.
                </div>
              </div>

              <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:var(--radius-lg); padding:12px 14px;">
                <div style="font-weight:750; font-size:0.875rem; color:#FDBA74; margin-bottom:4px;">
                  🇮🇳 Smart India (SIH) Rule
                </div>
                <div style="font-size:0.78rem; color:var(--text-sage-light); line-height:1.45;">
                  SIH regulations mandate at least one female teammate per 6-member squad. Ensure you balance backend, AI/ML, and UI/UX design skills.
                </div>
              </div>

              <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:var(--radius-lg); padding:12px 14px;">
                <div style="font-weight:750; font-size:0.875rem; color:#86EFAC; margin-bottom:4px;">
                  🛡️ CTF Challenge Squads
                </div>
                <div style="font-size:0.78rem; color:var(--text-sage-light); line-height:1.45;">
                  Assemble specialists across Cryptography, Reverse Engineering, Binary Exploitation, Web Defense, and Digital Forensics for maximum coverage.
                </div>
              </div>

              <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:var(--radius-lg); padding:12px 14px;">
                <div style="font-weight:750; font-size:0.875rem; color:var(--badge-yellow); margin-bottom:4px;">
                  💬 Instant WhatsApp Invite
                </div>
                <div style="font-size:0.78rem; color:var(--text-sage-light); line-height:1.45;">
                  Add your group link so admitted teammates can immediately access team discussions, meeting links, and shared files.
                </div>
              </div>
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

  const leaderInitial = currentUser ? (currentUser.name || currentUser.id).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U' : 'L';

  let seatsHtml = `
    <!-- Slot 1: Team Leader -->
    <div class="create-slot-box leader">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:0.6875rem; font-weight:800; text-transform:uppercase; color:var(--badge-mint);">Seat 1 • Leader (You)</span>
        <span class="status-capsule leader" style="font-size:0.625rem; padding:2px 8px;">Leader</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="seat-avatar" style="width:38px; height:38px;">
          <img src="${escapeHtml((currentUser && currentUser.avatar_url) || '')}" alt="${escapeHtml((currentUser && currentUser.name) || '')}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent((currentUser && currentUser.id) || 'Leader')}';">
        </div>
        <div style="min-width:0; flex:1;">
          <div style="font-size:0.875rem; font-weight:750; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml((currentUser && currentUser.name) || 'Leader')}
          </div>
          <div style="font-size:0.6875rem; color:var(--text-sage);">
            @${escapeHtml((currentUser && currentUser.id) || '')} ${currentUser && currentUser.program ? `• ${escapeHtml(currentUser.program)}` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  for (let i = 0; i < 5; i++) {
    if (i < selectedFriends.length) {
      const f = selectedFriends[i];
      const initial = (f.name || f.id).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
      seatsHtml += `
        <div class="create-slot-box filled">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="font-size:0.6875rem; font-weight:800; text-transform:uppercase; color:var(--badge-mint);">Seat ${i + 2} • Teammate</span>
            <button onclick="removeFriendFromTeam('${escapeAttr(f.id)}')" class="btn-danger-pill" style="padding:2px 8px; font-size:0.6875rem;">
              ✕ Remove
            </button>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="seat-avatar" style="width:38px; height:38px;">
              <img src="${escapeHtml(f.avatar_url || '')}" alt="${escapeHtml(f.name)}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(f.id || 'Student')}';">
            </div>
            <div style="min-width:0; flex:1;">
              <div style="font-size:0.875rem; font-weight:750; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(f.name)}
              </div>
              <div style="font-size:0.6875rem; color:var(--text-sage);">
                @${escapeHtml(f.id)} ${f.program ? `• ${escapeHtml(f.program)}` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      seatsHtml += `
        <div class="create-slot-box empty" onclick="openSlotStudentSearchModal(${i})" title="Click to add student by R-ID">
          <div class="slot-empty-icon">+</div>
          <div class="slot-empty-title">Seat ${i + 2} • Open Slot</div>
          <div class="slot-empty-subtitle">Click to search & add teammate</div>
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

    let actionButtonHtml = "";
    if (isMe) {
      actionButtonHtml = `<span class="badge-selected">You (Leader)</span>`;
    } else if (isAlreadySelected) {
      actionButtonHtml = `<span class="badge-selected">Already Selected</span>`;
    } else if (isInTeam) {
      actionButtonHtml = `
        <button onclick="handleInTeamStudentClick('${escapeAttr(cleanName)}', '${escapeAttr(sRid)}', '${escapeAttr(teamName)}')" class="btn-in-team-badge" title="Click to view details">
          In Team ⚠️
        </button>
      `;
    } else {
      actionButtonHtml = `
        <button onclick="selectStudentForSlot('${escapeAttr(sRid)}', '${escapeAttr(cleanName)}', '${escapeAttr(avatarSrc)}', '${escapeAttr(s.program || '')}', '${escapeAttr(s.semester_year || '')}')" class="btn-black-pill sm">
          + Select Teammate
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
            <div class="student-name-row">
              <span class="student-search-name">${escapeHtml(cleanName)}</span>
              <span class="student-rid-badge">@${escapeHtml(sRid)}</span>
              ${isInTeam 
                ? `<span class="already-in-team-badge" title="Enrolled in ${escapeAttr(teamName)}">⚠️ In: ${escapeHtml(teamName)}</span>`
                : `<span class="college-verified-tag">✓ Verified Student</span>`
              }
            </div>

            <div class="student-academic-row" style="margin-top:4px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="student-academic-chip">${escapeHtml(s.program || 'Student')}</span>
              ${s.semester_year ? `<span style="font-size:0.75rem; color:var(--text-sage); font-weight:600;">• ${escapeHtml(s.semester_year)}</span>` : ''}
            </div>

            <div class="student-contact-row" style="margin-top:6px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              ${s.email ? `<span class="student-contact-chip">✉ ${escapeHtml(s.email)}</span>` : ''}
              ${s.gender ? `<span class="student-contact-chip">• ${escapeHtml(s.gender)}</span>` : ''}
              ${s.dob && s.dob !== 'N/A' ? `<span class="student-contact-chip">• DOB: ${escapeHtml(s.dob)}</span>` : ''}
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
        navigateTo(`/team/${data.team_id}`);
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
    const avatarSrc = getStudentAvatarSrc(rawAvatar, s.r_id);
    return `
      <div class="team-card-forest">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:14px;">
          <div class="avatar-stack-item" style="width:48px; height:48px; margin-left:0; border:2px solid var(--badge-yellow);">
            <img src="${escapeHtml(avatarSrc)}" 
                 data-raw-src="${escapeHtml(rawAvatar)}" 
                 alt="${escapeHtml(s.name)}" 
                 loading="lazy" 
                 decoding="async" 
                 onerror="failedAvatarUrls.add(this.getAttribute('data-raw-src')); this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
          </div>
          <div style="min-width:0; flex:1;">
            <h3 class="font-serif" style="font-size:1.125rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(s.name)}</h3>
            <div style="font-size:0.8125rem; color:var(--text-sage); margin-top:2px;">
              ${escapeHtml(s.r_id)} • ${escapeHtml(s.gender || 'Student')}
            </div>
          </div>
        </div>

        ${s.program ? `
          <div style="margin-bottom:12px;">
            <span class="status-capsule member" style="font-size:0.6875rem;">${escapeHtml(s.program)}</span>
          </div>
        ` : ''}

        <div class="team-card-bottom-row">
          <span style="font-size:0.75rem; color:var(--text-sage);">DOB: ${escapeHtml(s.dob || 'N/A')}</span>
          ${s.email ? `<a href="mailto:${escapeHtml(s.email)}" class="btn-black-pill sm" style="font-size:0.75rem; padding:4px 12px;">Email ➔</a>` : ""}
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
  if (!spotlightContainer) return;

  const rawAvatar = student.avatar_url || "";
  const avatarSrc = getStudentAvatarSrc(rawAvatar, student.r_id);
  const cleanName = (student.name || student.r_id || "Student").replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
  const displayEmail = targetEmail || student.email || `${student.r_id}@student.edu`;
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    spotlightContainer.innerHTML = `
      <div class="auth-profile-spotlight" style="display:flex; align-items:center; text-align:left; gap:12px; padding:10px 12px; margin-bottom:10px; background:rgba(0,0,0,0.25); border-radius:var(--radius-lg); border:1px solid rgba(255,255,255,0.1);">
        <div class="auth-avatar-large" style="width:44px; height:44px; margin:0; flex-shrink:0;">
          <img src="${escapeHtml(avatarSrc)}" 
               data-raw-src="${escapeHtml(rawAvatar)}" 
               alt="${escapeHtml(cleanName)}" 
               loading="lazy" 
               style="width:100%; height:100%; border-radius:50%; object-fit:cover;"
               onerror="failedAvatarUrls.add(this.getAttribute('data-raw-src')); this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
        </div>
        <div style="min-width:0; flex:1;">
          <div style="font-weight:750; font-size:1rem; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(cleanName)}
          </div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
            <span class="student-rid-badge" style="font-size:0.6875rem; padding:1px 6px;">@${escapeHtml(student.r_id)}</span>
            <span class="status-capsule member" style="font-size:0.625rem; padding:1px 6px;">${escapeHtml(student.program || 'Student')}</span>
          </div>
        </div>
      </div>

      <div class="auth-otp-target-banner" style="padding:8px 12px; margin-bottom:12px; border-radius:var(--radius-md); font-size:0.75rem; background:rgba(62,168,108,0.12); border:1px solid rgba(62,168,108,0.3);">
        <div style="font-size:0.6875rem; color:var(--badge-mint); font-weight:800; text-transform:uppercase;">
          Code Sent To:
        </div>
        <div class="auth-otp-target-email" style="font-size:0.875rem; font-weight:750; color:var(--text-white);">${escapeHtml(displayEmail)}</div>
      </div>
    `;
    return;
  }

  spotlightContainer.innerHTML = `
    <div class="auth-profile-spotlight">
      <div class="auth-avatar-large">
        <img src="${escapeHtml(avatarSrc)}" 
             data-raw-src="${escapeHtml(rawAvatar)}" 
             alt="${escapeHtml(cleanName)}" 
             loading="lazy" 
             decoding="async" 
             onerror="failedAvatarUrls.add(this.getAttribute('data-raw-src')); this.onerror=null; this.src=DEFAULT_STUDENT_AVATAR;">
      </div>
      <h2 class="font-serif" style="font-size:1.375rem; color:var(--text-white); margin-bottom:4px;">
        ${escapeHtml(cleanName)}
      </h2>
      <div style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
        <span class="student-rid-badge">@${escapeHtml(student.r_id)}</span>
        <span class="status-capsule member" style="font-size:0.6875rem;">${escapeHtml(student.program || 'Student')}</span>
        ${student.semester ? `<span style="font-size:0.75rem; color:var(--text-sage); font-weight:600;">• ${escapeHtml(student.semester)}</span>` : ''}
      </div>
      <div style="font-size:0.8125rem; color:var(--text-sage); display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap;">
        ${student.dob && student.dob !== 'N/A' ? `<span>DOB: ${escapeHtml(student.dob)}</span>` : ''}
        ${student.gender ? `<span>• ${escapeHtml(student.gender)}</span>` : ''}
      </div>
    </div>

    <div class="auth-otp-target-banner">
      <div style="font-size:0.72rem; color:var(--badge-mint); font-weight:800; text-transform:uppercase; letter-spacing:0.06em;">
        Verification Code Dispatched To:
      </div>
      <div class="auth-otp-target-email">${escapeHtml(displayEmail)}</div>
      <div style="font-size:0.75rem; color:var(--text-sage); margin-top:4px;">
        Please check your inbox and spam folder for your 6-digit verification code.
      </div>
    </div>
  `;
}

function loadLoginView() {
  const container = document.getElementById("loginViewContainer");
  if (!container) return;

  pendingRegistrationData = null;
  pendingStudentProfile = null;
  clearInterval(resendTimerInterval);

  const courseOptionsHtml = ACADEMIC_PROGRAMS.map(p => `
    <option value="${escapeAttr(p)}">${escapeHtml(p)}</option>
  `).join("");

  container.innerHTML = `
    <div class="login-screen-wrap">
      <div class="login-editorial-card">
        
        <!-- Official JNU Transparent Logo Merged with Portal -->
        <div class="login-jnu-logo-box">
          <img src="/static/img/jnu_logo.png" alt="Jaipur National University Logo" class="jnu-signin-logo" onerror="this.src='/static/img/jnu_logo.jpg';">
        </div>

        <div class="greeting-sup-text" style="color:var(--badge-yellow);">Official Hackathon Portal</div>
        <h1 class="font-serif" style="font-size:1.875rem; margin-bottom:6px;">Sign In to JnuMate</h1>
        <p style="color:var(--text-sage); font-size:0.875rem; margin-bottom:28px;">Find teammates, build 6-seat dream teams, and win hackathons!</p>

        <!-- Step 1: Input R-ID -->
        <div id="authStep1">
          <div class="form-group">
            <label class="form-label-forest" style="text-align:left;">College R-ID</label>
            <input type="text" id="authRidInput" placeholder="e.g. R15006" class="input-forest" style="font-weight:750; text-transform:uppercase; font-size:1.125rem; letter-spacing:0.04em; text-align:center;" onkeyup="if(event.key==='Enter') submitInitialRid()">
          </div>

          <button onclick="submitInitialRid()" id="btnSendOtp" class="btn-black-pill lg" style="width:100%;">
            Sign In ➔
          </button>
        </div>

        <!-- Step 1B: Fallback when campus database is offline -->
        <div id="authStepSyncNotice" style="display:none; text-align:left;">
          <div style="text-align:center; margin-bottom:18px;">
            <div class="auth-empty-avatar" title="No profile photo available">
              <img src="${INSTAGRAM_EMPTY_AVATAR}" alt="No profile photo" style="width:100%; height:100%; border-radius:50%;">
            </div>
            <span class="student-rid-badge" style="font-size:0.875rem; padding:4px 14px;">
              R-ID: <strong id="syncRidBanner"></strong>
            </span>
          </div>

          <div style="background:rgba(242,169,34,0.12); border:1px solid rgba(242,169,34,0.3); border-radius:var(--radius-lg); padding:12px 16px; margin-bottom:18px; font-size:0.8125rem; color:#FFD479; line-height:1.45; text-align:center;">
            Server couldn't connect to campus database. Please complete your registration details manually to continue.
          </div>

          <div style="display:flex; flex-direction:column; gap:14px; margin-bottom:20px;">
            <div>
              <label class="form-label-forest">Full Name *</label>
              <input type="text" id="syncNameInput" placeholder="Your full name as per college ID" class="input-forest">
            </div>

            <div>
              <label class="form-label-forest">College Email *</label>
              <input type="email" id="syncEmailInput" placeholder="name@student.jnujaipur.ac.in" class="input-forest">
            </div>

            <div>
              <label class="form-label-forest">Academic Program *</label>
              <select id="syncCourseSelect" class="input-forest">
                ${courseOptionsHtml}
              </select>
            </div>
          </div>

          <button onclick="submitSyncDetailsAndSendOtp()" id="btnSendSyncOtp" class="btn-black-pill lg" style="width:100%;">
            Send Verification Code
          </button>

          <button onclick="showAuthStep(1)" class="btn-outline-pill" style="width:100%; margin-top:10px;">
            ← Change R-ID
          </button>
        </div>

        <!-- Step 2: OTP Verification with Full Profile Spotlight -->
        <div id="authStep2" style="display:none;">
          <div id="authStep2ProfileSpotlight"></div>

          <div class="form-group">
            <label class="form-label-forest" style="text-align:center;">Enter 6-Digit Verification Code</label>
            <input type="text" id="otpCodeInput" placeholder="123456" maxlength="6" class="input-forest" style="height:56px; font-size:1.75rem; font-weight:800; text-align:center; letter-spacing:0.35em;" onkeyup="if(event.key==='Enter') verifyEmailOtpCode()">
          </div>

          <button onclick="verifyEmailOtpCode()" id="btnVerifyOtp" class="btn-black-pill lg" style="width:100%;">
            Verify & Sign In ➔
          </button>

          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:16px;">
            <button type="button" id="btnResendOtp" onclick="handleResendOtp()" style="font-size:0.8125rem; color:var(--badge-yellow); font-weight:700;" disabled>
              Resend Code (<span id="resendCountdown">30</span>s)
            </button>
            <button type="button" onclick="showAuthStep(1)" style="font-size:0.8125rem; color:var(--text-sage); font-weight:700;">
              ← Change R-ID
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

function showAuthStep(step) {
  const s1 = document.getElementById("authStep1");
  const sSync = document.getElementById("authStepSyncNotice");
  const s2 = document.getElementById("authStep2");
  const logoBox = document.querySelector(".login-jnu-logo-box");
  const cardTitle = document.querySelector(".login-editorial-card h1");
  const cardSub = document.querySelector(".login-editorial-card p");
  const cardSup = document.querySelector(".greeting-sup-text");

  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    if (logoBox) logoBox.style.display = step === 2 ? "none" : "";
    if (cardTitle) cardTitle.style.display = step === 2 ? "none" : "";
    if (cardSub) cardSub.style.display = step === 2 ? "none" : "";
    if (cardSup) cardSup.style.display = step === 2 ? "none" : "";
  }

  if (s1) s1.style.display = step === 1 ? "block" : "none";
  if (sSync) sSync.style.display = step === 'sync' ? "block" : "none";
  if (s2) {
    s2.style.display = step === 2 ? "block" : "none";
    if (step === 2) {
      startResendTimer();
      setTimeout(() => {
        const input = document.getElementById("otpCodeInput");
        if (input) {
          input.value = "";
          input.focus();
        }
      }, 150);
    }
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
      btn.innerText = "Resending...";
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

  const rid = ridInput.value.trim().toUpperCase();
  btn.disabled = true;
  btn.innerText = "Signing you in...";

  fetch("/api/auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rid: rid })
  })
    .then(res => res.json())
    .then(data => {
      btn.disabled = false;
      btn.innerText = "Sign In ➔";

      if (data.exists) {
        pendingRegistrationData = { rid: rid };
        pendingStudentProfile = data.student || { r_id: rid };
        renderAuthProfileSpotlight(pendingStudentProfile, data.email);
        showAuthStep(2);
        showToast("Verification code sent!", "success");
      } else if (data.not_found) {
        pendingRegistrationData = { rid: rid };
        document.getElementById("syncRidBanner").innerText = rid;
        showAuthStep('sync');
      } else {
        showToast(data.message || "Unable to proceed with this R-ID", "error");
      }
    })
    .catch(() => {
      btn.disabled = false;
      btn.innerText = "Sign In ➔";
      showToast("Network error checking R-ID", "error");
    });
}

function submitSyncDetailsAndSendOtp() {
  const nameInput = document.getElementById("syncNameInput");
  const emailInput = document.getElementById("syncEmailInput");
  const courseSelect = document.getElementById("syncCourseSelect");
  const btn = document.getElementById("btnSendSyncOtp");

  const rid = pendingRegistrationData ? pendingRegistrationData.rid : "";
  const name = nameInput ? nameInput.value.trim() : "";
  const email = emailInput ? emailInput.value.trim() : "";
  const program = courseSelect ? courseSelect.value.trim() : "";

  if (!rid || !name || !email || !program) {
    showToast("Please fill all required academic fields", "error");
    return;
  }

  btn.disabled = true;
  btn.innerText = "Sending Code...";

  fetch("/api/auth/send-registration-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rid: rid,
      name: name,
      email: email,
      program: program
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
          program: program
        };
        pendingStudentProfile = {
          r_id: rid,
          name: name,
          email: email,
          program: program,
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
  btn.innerText = "Signing you in...";

  const payload = {
    rid: rid,
    otp: otp
  };

  if (pendingRegistrationData) {
    payload.name = pendingRegistrationData.name;
    payload.email = pendingRegistrationData.email;
    payload.program = pendingRegistrationData.program;
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
      btn.innerText = "Verify & Sign In";

      if (data && data.success) {
        currentUser = data.user || { id: rid, name: "Student" };
        try {
          renderNavUserSlots();
          renderDrawerUserSlot();
          loadNotifications();
        } catch (renderErr) {
          console.warn("renderNavUserSlots notice:", renderErr);
        }
        showToast("Signed in successfully!", "success");

        try {
          if (data.needs_program) {
            showCoursePickerModal();
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
      btn.innerText = "Verify & Sign In";
      console.error("verify-otp error:", err);
      showToast("Cannot connect to server. Please check your connection and retry.", "error");
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
      loadNotifications();
    }
  }
}

function closeNotificationsPanel() {
  const overlay = document.getElementById("notifOverlay");
  if (overlay) {
    overlay.classList.remove("active");
  }
}

function renderNotificationsList(notifications, unreadCount) {
  const mobileContainer = document.getElementById("notifListContainer");
  const desktopContainer = document.getElementById("desktopNotifListBody");

  const emptyHtml = `
    <div style="text-align:center; padding:36px 16px;">
      <div style="font-size:1.75rem; margin-bottom:6px;">🔔</div>
      <div style="font-family:var(--font-serif); font-size:1rem; font-weight:700; color:var(--text-white); margin-bottom:4px;">All Caught Up!</div>
      <p style="font-size:0.75rem; color:var(--text-sage); margin:0;">You have no notifications right now.</p>
    </div>
  `;

  if (notifications.length === 0) {
    if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
    if (desktopContainer) desktopContainer.innerHTML = emptyHtml;
    return;
  }

  const itemsHtml = notifications.map(n => {
    let icon = "🔔";
    if (n.type === "join_request") icon = "🤝";
    else if (n.type === "request_accepted" || n.type === "team_added") icon = "🎉";
    else if (n.type === "request_declined") icon = "ℹ️";
    else if (n.type === "member_left") icon = "🚪";

    const isUnread = (!n.is_read || n.is_read === 0);
    const linkAction = n.link ? `onclick="handleNotificationClick('${escapeAttr(n.id)}', '${escapeAttr(n.link)}')"` : `onclick="handleNotificationClick('${escapeAttr(n.id)}', null)"`;

    return `
      <div class="notif-item-box ${isUnread ? 'unread' : ''}" ${linkAction} style="cursor:pointer;">
        <div class="notif-icon-circle">${icon}</div>
        <div style="flex:1; min-width:0;">
          <div class="notif-title">${escapeHtml(n.title)}</div>
          <div class="notif-message">${escapeHtml(n.message)}</div>
          <div class="notif-time">${n.created_at ? escapeHtml(n.created_at.toString().split('.')[0]) : "Recently"}</div>
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
