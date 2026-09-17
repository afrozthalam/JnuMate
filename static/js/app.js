const DEFAULT_STUDENT_AVATAR = "/static/img/blank_pfp.jpg";
let __lastRenderedChatSignatures = {};
/**
 * JnuMate - Complete JavaScript SPA Engine
 * Implements 1:1 all 18 mockups in "new ui design images"
 * Includes persistent authentication, live squad chat, interactive events and resources
 */

/* ==========================================================================
   GLOBAL APPLICATION STATE
   ========================================================================== */
let currentUser = null;
let allTeamsList = [];
let filteredTeamsList = [];
let currentDiscoverFilter = "all";
let currentSortOrder = "newest";
let currentDiscoverSearchTerm = "";
let discoverCurrentPage = 1;
const TEAMS_PER_PAGE = 6;

// Create Team Roster Assignment Slots
let createTeamDraftRoster = [
  { seat: 1, isLeader: true, student: null },
  { seat: 2, isLeader: false, student: null },
  { seat: 3, isLeader: false, student: null },
  { seat: 4, isLeader: false, student: null },
  { seat: 5, isLeader: false, student: null },
  { seat: 6, isLeader: false, student: null }
];
let activeSlotIndexToAssign = null;

// Squad Live Chat Polling
let currentChatTeamId = null;
let chatPollInterval = null;
let lastChatMessagesHash = "";

// Auth OTP Countdown
let otpCountdownSeconds = 30;
let otpTimerInterval = null;

/* ==========================================================================
   1. AUTHENTIC iOS 12-BLADE ACTIVITY SPINNER
   ========================================================================== */
function renderIosSpinner(size = "sm", label = "") {
  const sizeClass = size === "lg" ? "lg" : (size === "md" ? "" : "sm");
  const blades = Array.from({ length: 12 }, () => "<div></div>").join("");
  const labelHtml = label ? `<span style="margin-left: 8px; font-weight: 500;">${label}</span>` : "";
  return `<span class="ios-spinner ${sizeClass}" aria-hidden="true">${blades}</span>${labelHtml}`;
}

/* ==========================================================================
   2. SPA ROUTER & VIEW DISPATCHER
   ========================================================================== */
function setupRouter() {
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest("a");
    if (anchor && anchor.href && anchor.origin === window.location.origin) {
      const targetPath = anchor.pathname;
      if (anchor.target === "_blank") return;
      e.preventDefault();
      closeAllDropdowns();
      if (window.location.pathname !== targetPath) {
        history.pushState(null, "", targetPath);
        handleCurrentRoute();
      }
    }
  });

  window.addEventListener("popstate", () => {
    closeAllDropdowns();
    handleCurrentRoute();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals();
      closeAllDropdowns();
    }
  });
}

function navigateTo(path) {
  closeAllModals();
  closeAllDropdowns();
  if (window.location.pathname !== path) {
    history.pushState(null, "", path);
    handleCurrentRoute();
  }
}

function handleCurrentRoute() {
  window.scrollTo(0, 0);
  const path = window.location.pathname;
  highlightActiveNavLinks();

  // Hide all view panels
  const panels = document.querySelectorAll(".view-page-panel");
  panels.forEach(p => p.classList.remove("active"));

  // Toggle login body class
  const isLoginRoute = path === "/login";
  document.body.classList.toggle("is-login-route", isLoginRoute);
  
  // Stop chat polling if leaving team detail
  if (!path.startsWith("/team/")) {
    stopSquadChatPolling();
  }

  if (path === "/") {
    const p = document.getElementById("viewDiscover");
    if (p) {
      p.classList.add("active");
      loadDiscoverView();
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
  } else if (path.startsWith("/team/")) {
    const p = document.getElementById("viewTeamDetail");
    if (p) {
      p.classList.add("active");
      const teamId = path.split("/")[2];
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
  } else if (path === "/admin") {
    const p = document.getElementById("viewAdmin");
    if (p) {
      p.classList.add("active");
      loadAdminView();
    }
  } else {
    history.replaceState(null, "", "/");
    handleCurrentRoute();
  }
}

function highlightActiveNavLinks() {
  const path = window.location.pathname;

  // Desktop Top Nav links
  document.querySelectorAll(".desktop-nav-item").forEach(link => {
    const linkPath = link.getAttribute("data-path") || link.getAttribute("href");
    if (linkPath === path || (linkPath !== "/" && path.startsWith(linkPath))) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Mobile Bottom Dock Tabs
  document.querySelectorAll(".mobile-dock-tab").forEach(tab => {
    const tabPath = tab.getAttribute("data-path") || tab.getAttribute("href");
    if (tabPath === path || (tabPath !== "/" && path.startsWith(tabPath))) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
}

/* ==========================================================================
   3. AUTHENTICATION & PERSISTENT SESSIONS
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
  }

  fetch("/api/auth/me")
    .then(r => r.json())
    .then(data => {
      if (data && data.authenticated && data.user) {
        currentUser = {
          ...data.user,
          team_id: data.team_id || (currentUser ? currentUser.team_id : null),
          team_name: data.team_name || (currentUser ? currentUser.team_name : null)
        };
        try {
          localStorage.setItem("jnumate_user", JSON.stringify(currentUser));
        } catch (e) {}
        renderNavUserSlots();
      } else if (!savedUser) {
        currentUser = null;
        renderNavUserSlots();
      }
      if (typeof callback === "function") callback();
    })
    .catch(() => {
      if (typeof callback === "function") callback();
    });
}

function renderNavUserSlots() {
  const desktopSlot = document.getElementById("navUserSlotDesktopTop");
  const mobilePfp = document.getElementById("mobileMenuTogglePfp");
  const profileDropdown = document.getElementById("desktopProfileDropdown");

  if (!desktopSlot) return;

  if (currentUser && currentUser.id) {
    const pfp = currentUser.avatar_url || "/static/img/blank_pfp.jpg";
    const name = currentUser.name || "Student";
    const rid = currentUser.r_id || ("@" + currentUser.id);

    // Desktop Top Nav Profile Button
    desktopSlot.innerHTML = `
      <button class="desktop-user-toggle-btn" id="btnDesktopProfileToggle" onclick="toggleDesktopProfileDropdown(event)" aria-label="User profile">
        <img src="${pfp}" alt="${name}" class="desktop-user-avatar" onerror="this.src='/static/img/blank_pfp.jpg'">
        <span class="desktop-user-name">${escapeHtml(name)}</span>
        <svg viewBox="0 0 24 24" class="desktop-user-chevron" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    `;

    // Mobile Top Avatar
    if (mobilePfp) {
      mobilePfp.src = pfp;
    }

    // Profile Popover Dropdown matching "profile dropdown menu for desktop.png"
    if (profileDropdown) {
      profileDropdown.innerHTML = `
        <div class="profile-popover-header">
          <div class="profile-popover-avatar-wrap">
            <img src="${pfp}" alt="${name}" class="profile-popover-avatar" onerror="this.src='/static/img/blank_pfp.jpg'">
          </div>
          <div class="profile-popover-info">
            <span class="profile-popover-name">${escapeHtml(name)}</span>
            <span class="profile-popover-rid">${escapeHtml(rid)}</span>
            <span class="profile-popover-inst">Jaipur National University</span>
            <span class="profile-popover-badge">Student</span>
          </div>
        </div>

        <div class="profile-popover-items">
          <a href="/profile" class="profile-menu-item">
            <div class="profile-menu-item-left">
              <div class="profile-menu-icon-circle">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div class="profile-menu-text-group">
                <span class="profile-menu-item-title">My Profile</span>
                <span class="profile-menu-item-sub">View and edit your details</span>
              </div>
            </div>
            <svg viewBox="0 0 24 24" class="profile-menu-chevron" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>

          <a href="javascript:void(0)" onclick="handleMyTeamClick()" class="profile-menu-item">
            <div class="profile-menu-item-left">
              <div class="profile-menu-icon-circle">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div class="profile-menu-text-group">
                <span class="profile-menu-item-title">My Team</span>
                <span class="profile-menu-item-sub">View your teams and members</span>
              </div>
            </div>
            <svg viewBox="0 0 24 24" class="profile-menu-chevron" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>

          <a href="/create-team" class="profile-menu-item">
            <div class="profile-menu-item-left">
              <div class="profile-menu-icon-circle">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
              <div class="profile-menu-text-group">
                <span class="profile-menu-item-title">Create Team</span>
                <span class="profile-menu-item-sub">Start a new team</span>
              </div>
            </div>
            <svg viewBox="0 0 24 24" class="profile-menu-chevron" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>

          <div class="profile-menu-divider"></div>

          <a href="javascript:void(0)" onclick="handleLogout()" class="profile-menu-item sign-out">
            <div class="profile-menu-item-left">
              <div class="profile-menu-icon-circle">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </div>
              <div class="profile-menu-text-group">
                <span class="profile-menu-item-title">Sign Out</span>
                <span class="profile-menu-item-sub">End your current session</span>
              </div>
            </div>
            <svg viewBox="0 0 24 24" class="profile-menu-chevron" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>
        </div>
      `;
    }
  } else {
    // Unauthenticated State
    desktopSlot.innerHTML = `
      <a href="/login" class="btn-primary-green" style="height: 38px; padding: 0 16px; border-radius: 20px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>Sign In</span>
      </a>
    `;
    if (mobilePfp) {
      mobilePfp.src = "/static/img/blank_pfp.jpg";
    }
    if (profileDropdown) {
      profileDropdown.innerHTML = "";
    }
  }
}

function toggleDesktopProfileDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById("desktopProfileDropdown");
  const toggleBtn = document.getElementById("btnDesktopProfileToggle");
  const notifDropdown = document.getElementById("desktopNotifDropdown");
  if (notifDropdown) notifDropdown.classList.remove("show");

  if (dropdown) {
    const isShowing = dropdown.classList.contains("show");
    dropdown.classList.toggle("show", !isShowing);
    if (toggleBtn) toggleBtn.classList.toggle("open", !isShowing);
  }
}

function toggleDesktopNotifDropdown(event) {
  if (event) event.stopPropagation();
  const notifDropdown = document.getElementById("desktopNotifDropdown");
  const profileDropdown = document.getElementById("desktopProfileDropdown");
  if (profileDropdown) profileDropdown.classList.remove("show");

  if (notifDropdown) {
    const isShowing = notifDropdown.classList.contains("show");
    notifDropdown.classList.toggle("show", !isShowing);
    if (!isShowing) {
      loadNotifications();
    }
  }
}

function closeAllDropdowns() {
  const profileDropdown = document.getElementById("desktopProfileDropdown");
  const notifDropdown = document.getElementById("desktopNotifDropdown");
  const toggleBtn = document.getElementById("btnDesktopProfileToggle");
  if (profileDropdown) profileDropdown.classList.remove("show");
  if (notifDropdown) notifDropdown.classList.remove("show");
  if (toggleBtn) toggleBtn.classList.remove("open");
}

document.addEventListener("click", (e) => {
  const insideProfile = e.target.closest("#desktopProfileWrapper");
  const insideNotif = e.target.closest("#desktopNotifWrapper");
  if (!insideProfile && !insideNotif) {
    closeAllDropdowns();
  }
});

function handleMyTeamClick() {
  closeAllDropdowns();
  if (!currentUser) {
    navigateTo("/login");
    return;
  }
  if (currentUser.team_id) {
    navigateTo(`/team/${currentUser.team_id}`);
  } else {
    fetch("/api/my-team")
      .then(r => r.json())
      .then(data => {
        if (data && data.team && data.team.id) {
          currentUser.team_id = data.team.id;
          currentUser.team_name = data.team.name;
          try {
            localStorage.setItem("jnumate_user", JSON.stringify(currentUser));
          } catch (e) {}
          navigateTo(`/team/${data.team.id}`);
        } else {
          showToast("You are not currently in any hackathon squad. Create one or join an open squad!", "info");
          navigateTo("/create-team");
        }
      })
      .catch(() => {
        showToast("You are not currently in any hackathon squad.", "info");
        navigateTo("/create-team");
      });
  }
}

function handleLogout() {
  closeAllDropdowns();
  fetch("/api/auth/logout", { method: "POST" })
    .then(() => {
      currentUser = null;
      try {
        localStorage.removeItem("jnumate_user");
      } catch (e) {}
      renderNavUserSlots();
      showToast("Signed out successfully", "success");
      navigateTo("/");
    })
    .catch(() => {
      currentUser = null;
      localStorage.removeItem("jnumate_user");
      renderNavUserSlots();
      navigateTo("/");
    });
}

/* ==========================================================================
   4. VIEW 1: HOME / DISCOVER TEAMS
   ========================================================================== */
function loadDiscoverView() {
  fetch("/api/teams")
    .then(r => r.json())
    .then(data => {
      allTeamsList = Array.isArray(data) ? data : (data.teams || []);
      applyDiscoverFilters();
    })
    .catch(err => {
      console.error("Error loading teams:", err);
      renderTeamsGrid([]);
    });
}

function setDiscoverFilter(filterKey) {
  currentDiscoverFilter = filterKey;
  document.querySelectorAll(".filter-pill-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter") === filterKey);
  });
  discoverCurrentPage = 1;
  applyDiscoverFilters();
}

function handleSortChange(sortVal) {
  currentSortOrder = sortVal;
  applyDiscoverFilters();
}

let discoverSearchTimer = null;
function debounceDiscoverSearch() {
  clearTimeout(discoverSearchTimer);
  discoverSearchTimer = setTimeout(() => {
    const input = document.getElementById("searchInput");
    currentDiscoverSearchTerm = input ? input.value.trim().toLowerCase() : "";
    discoverCurrentPage = 1;
    applyDiscoverFilters();
  }, 250);
}

function applyDiscoverFilters() {
  let result = [...allTeamsList];

  // Category Filter
  if (currentDiscoverFilter === "sih") {
    result = result.filter(t => (t.track || "").toLowerCase().includes("sih") || (t.track || "").toLowerCase().includes("smart"));
  } else if (currentDiscoverFilter === "ctf") {
    result = result.filter(t => (t.track || "").toLowerCase().includes("ctf") || (t.track || "").toLowerCase().includes("flag"));
  } else if (currentDiscoverFilter === "open") {
    result = result.filter(t => {
      const maxM = t.max_members || 6;
      const curM = Array.isArray(t.members) ? t.members.length : (t.member_count || 1);
      return curM < maxM;
    });
  }

  // Search Filter
  if (currentDiscoverSearchTerm) {
    result = result.filter(t => {
      const name = (t.name || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      const track = (t.track || "").toLowerCase();
      const members = Array.isArray(t.members) ? t.members.map(m => (m.name || "").toLowerCase() + " " + (m.r_id || "").toLowerCase()).join(" ") : "";
      return name.includes(currentDiscoverSearchTerm) ||
             desc.includes(currentDiscoverSearchTerm) ||
             track.includes(currentDiscoverSearchTerm) ||
             members.includes(currentDiscoverSearchTerm);
    });
  }

  // Sorting
  if (currentSortOrder === "newest") {
    result.sort((a, b) => (b.id || 0) - (a.id || 0));
  } else if (currentSortOrder === "oldest") {
    result.sort((a, b) => (a.id || 0) - (b.id || 0));
  } else if (currentSortOrder === "slots") {
    result.sort((a, b) => {
      const aSlots = (a.max_members || 6) - (Array.isArray(a.members) ? a.members.length : 1);
      const bSlots = (b.max_members || 6) - (Array.isArray(b.members) ? b.members.length : 1);
      return bSlots - aSlots;
    });
  }

  filteredTeamsList = result;
  renderTeamsGrid(filteredTeamsList);
}

function renderTeamsGrid(teams) {
  const container = document.getElementById("teamsGridContainer");
  const emptyState = document.getElementById("emptyStateContainer");
  const paginationContainer = document.getElementById("discoverPagination");

  if (!container) return;

  if (!teams || teams.length === 0) {
    container.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    if (paginationContainer) paginationContainer.innerHTML = "";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  // Pagination calculation
  const totalPages = Math.ceil(teams.length / TEAMS_PER_PAGE);
  if (discoverCurrentPage > totalPages) discoverCurrentPage = totalPages;
  if (discoverCurrentPage < 1) discoverCurrentPage = 1;

  const startIndex = (discoverCurrentPage - 1) * TEAMS_PER_PAGE;
  const pageTeams = teams.slice(startIndex, startIndex + TEAMS_PER_PAGE);

  container.innerHTML = pageTeams.map(team => {
    const isSih = (team.track || "").toLowerCase().includes("sih") || (team.track || "").toLowerCase().includes("smart");
    const trackClass = isSih ? "sih" : "ctf";
    const trackLabel = isSih ? "Smart India Hackathon" : "CTF Hackathon";
    const trackLogoImg = isSih ? "/static/img/sih_logo.jpg" : "/static/img/ctf_logo.jpg";

    const members = Array.isArray(team.members) ? team.members : [];
    const maxMembers = team.max_members || 6;
    const filledCount = members.length || 1;
    const openSeatsCount = Math.max(0, maxMembers - filledCount);

    // Build avatars row (filled members + dashed plus circles for open slots)
    let avatarsHtml = "";
    for (let i = 0; i < maxMembers; i++) {
      if (i < filledCount) {
        const m = members[i] || {};
        const pfp = m.avatar_url || "/static/img/blank_pfp.jpg";
        const mName = m.name || "Member";
        avatarsHtml += `<img src="${pfp}" alt="${escapeHtml(mName)}" title="${escapeHtml(mName)}" class="member-avatar-circle" onerror="this.src='/static/img/blank_pfp.jpg'">`;
      } else {
        avatarsHtml += `<div class="open-slot-dashed-circle" title="Open Slot">+</div>`;
      }
    }

    return `
      <article class="team-card-modern" onclick="navigateTo('/team/${team.id}')">
        <div>
          <div class="team-card-top-row">
            <div class="team-track-icon-wrap ${trackClass}">
              <img src="${trackLogoImg}" alt="${trackLabel}" style="width: 28px; height: 28px; object-fit: contain; border-radius: 4px;">
            </div>
            <div class="team-badges-stack">
              <span class="badge-track ${trackClass}">${trackLabel}</span>
              <span class="badge-open-seats">${openSeatsCount} Open Seat${openSeatsCount === 1 ? '' : 's'}</span>
            </div>
          </div>

          <h3 class="team-card-title">${escapeHtml(team.name || "Untitled Squad")}</h3>
          <p class="team-card-desc">${escapeHtml(team.description || "Building innovative solutions for the hackathon.")}</p>
        </div>

        <div>
          <div class="team-members-avatars-row">
            ${avatarsHtml}
          </div>

          <div class="team-card-bottom-row">
            <span class="team-card-member-count">${filledCount} / ${maxMembers} Members</span>
            <a href="/team/${team.id}" class="btn-view-team-pill" onclick="event.stopPropagation();">
              <span>View Team</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join("");

  // Render pagination
  if (paginationContainer) {
    paginationContainer.innerHTML = `
      <button class="pagination-btn" onclick="goToDiscoverPage(${discoverCurrentPage - 1})" ${discoverCurrentPage === 1 ? 'disabled' : ''}>
        &lt;
      </button>
      <span class="pagination-btn active">${discoverCurrentPage}</span>
      <button class="pagination-btn" onclick="goToDiscoverPage(${discoverCurrentPage + 1})" ${discoverCurrentPage >= totalPages ? 'disabled' : ''}>
        &gt;
      </button>
      <span class="pagination-text">Page ${discoverCurrentPage} of ${totalPages || 1}</span>
    `;
  }
}

function goToDiscoverPage(page) {
  discoverCurrentPage = page;
  applyDiscoverFilters();
  window.scrollTo({ top: 120, behavior: 'smooth' });
}

/* ==========================================================================
   5. VIEW 2: CAMPUS EVENTS
   ========================================================================== */
const CAMPUS_EVENTS_DATA = [
  {
    id: 1,
    title: "Smart India Hackathon 2025",
    category: "hackathons",
    categoryLabel: "Hackathon",
    day: "15",
    month: "NOV",
    venue: "JNU Main Campus",
    desc: "Innovate for a better tomorrow. Build solutions for real-world problems facing government and industry.",
    interested: 234,
    status: "Registration Open",
    banner: "/static/img/sih_logo.jpg"
  },
  {
    id: 2,
    title: "AI & Machine Learning Workshop",
    category: "workshops",
    categoryLabel: "Workshop",
    day: "22",
    month: "NOV",
    venue: "Computer Science Block",
    desc: "Hands-on session on modern AI tools, neural architectures, and scalable LLM applications.",
    interested: 120,
    status: "Registration Open",
    banner: "/static/img/blank_pfp.jpg"
  },
  {
    id: 3,
    title: "Future of Tech: Expert Talk",
    category: "seminars",
    categoryLabel: "Seminar",
    day: "28",
    month: "NOV",
    venue: "Auditorium, JNU",
    desc: "Insights from industry experts on emerging technologies, silicon design, and distributed cloud computing.",
    interested: 98,
    status: "Coming Soon",
    banner: "/static/img/blank_pfp.jpg"
  },
  {
    id: 4,
    title: "JNU Cultural Fest 2025",
    category: "cultural",
    categoryLabel: "Cultural",
    day: "05",
    month: "DEC",
    venue: "Open Air Ground",
    desc: "Music, art, dance and much more. Celebrate the vibrant creative spirit and student community of JNU.",
    interested: 320,
    status: "Upcoming",
    banner: "/static/img/blank_pfp.jpg"
  },
  {
    id: 5,
    title: "Capture The Flag (CTF)",
    category: "competitions",
    categoryLabel: "Competition",
    day: "12",
    month: "DEC",
    venue: "Computer Science Block",
    desc: "Test your cybersecurity skills, binary exploitation, cryptography, and network defense in this thrilling challenge.",
    interested: 176,
    status: "Ongoing",
    banner: "/static/img/ctf_logo.jpg"
  },
  {
    id: 6,
    title: "Startup Stories: Founders & Builders",
    category: "talks",
    categoryLabel: "Talk",
    day: "18",
    month: "DEC",
    venue: "Management Block",
    desc: "Learn from student founders, early-stage builders, and venture innovators about starting tech companies.",
    interested: 64,
    status: "Upcoming",
    banner: "/static/img/blank_pfp.jpg"
  }
];

let currentEventsFilter = "all";
let currentEventsSearchTerm = "";

function loadEventsView() {
  applyEventsFilters();
}

function setEventsFilter(cat) {
  currentEventsFilter = cat;
  document.querySelectorAll(".event-filter-pill").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter") === cat);
  });
  applyEventsFilters();
}

let eventsSearchTimer = null;
function debounceEventsSearch() {
  clearTimeout(eventsSearchTimer);
  eventsSearchTimer = setTimeout(() => {
    const input = document.getElementById("eventsSearchInput");
    currentEventsSearchTerm = input ? input.value.trim().toLowerCase() : "";
    applyEventsFilters();
  }, 250);
}

function applyEventsFilters() {
  let list = [...CAMPUS_EVENTS_DATA];

  if (currentEventsFilter !== "all") {
    list = list.filter(e => e.category === currentEventsFilter);
  }

  if (currentEventsSearchTerm) {
    list = list.filter(e =>
      e.title.toLowerCase().includes(currentEventsSearchTerm) ||
      e.desc.toLowerCase().includes(currentEventsSearchTerm) ||
      e.venue.toLowerCase().includes(currentEventsSearchTerm)
    );
  }

  renderEventsGrid(list);
}

function renderEventsGrid(events) {
  const container = document.getElementById("eventsGridContainer");
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #fff; border-radius: 18px; border: 1px solid var(--border-subtle);">
        <h3 style="font-family: var(--font-serif); font-size: 1.25rem; font-weight: 700; margin-bottom: 6px;">No events match your filter</h3>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">Try selecting "All Events" or searching for a different keyword.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(evt => `
    <article class="event-card-modern">
      <div class="event-banner-wrap">
        <img src="${evt.banner}" alt="${escapeHtml(evt.title)}" class="event-banner-img" onerror="this.src='/static/img/blank_pfp.jpg'">
        <span class="event-category-badge">${evt.categoryLabel}</span>
      </div>

      <div class="event-card-body">
        <div class="event-date-box">
          <span class="event-date-day">${evt.day}</span>
          <span class="event-date-month">${evt.month}</span>
        </div>

        <div class="event-content-group">
          <h3 class="event-card-title">${escapeHtml(evt.title)}</h3>
          <div class="event-location-row">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${escapeHtml(evt.venue)}</span>
          </div>
          <p class="event-desc-snippet">${escapeHtml(evt.desc)}</p>

          <div class="event-card-footer">
            <div class="event-attendees-group">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
              <span>+${evt.interested} interested</span>
            </div>
            <button onclick="openEventDetailModal(${evt.id})" class="btn-view-team-pill">
              View Details &rarr;
            </button>
          </div>
        </div>
      </div>
    </article>
  `).join("");
}

function openEventDetailModal(eventId) {
  const evt = CAMPUS_EVENTS_DATA.find(e => e.id === eventId);
  if (!evt) return;

  const modal = document.getElementById("eventDetailModal");
  const content = document.getElementById("eventDetailModalContent");
  if (!modal || !content) return;

  content.innerHTML = `
    <div style="padding: 28px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <span class="badge-track ctf">${evt.categoryLabel}</span>
        <button onclick="closeEventDetailModal()" class="modal-close-icon-btn">&times;</button>
      </div>

      <h2 style="font-family: var(--font-serif); font-size: 1.75rem; font-weight: 700; color: var(--text-heading); margin-bottom: 8px;">
        ${escapeHtml(evt.title)}
      </h2>

      <div style="display: flex; gap: 16px; margin-bottom: 20px; font-size: 0.875rem; color: var(--text-secondary);">
        <div style="display: flex; align-items: center; gap: 6px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>${evt.day} ${evt.month}, 2025</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>${escapeHtml(evt.venue)}</span>
        </div>
      </div>

      <p style="font-size: 0.9375rem; color: var(--text-body); line-height: 1.6; margin-bottom: 24px;">
        ${escapeHtml(evt.desc)}
      </p>

      <div style="background-color: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 16px; margin-bottom: 24px;">
        <div style="font-size: 0.8125rem; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">Event Eligibility & Requirements</div>
        <ul style="font-size: 0.8125rem; color: var(--text-secondary); margin-left: 18px; line-height: 1.5;">
          <li>Open to all registered students of Jaipur National University.</li>
          <li>Valid University College R-ID required for verification upon entry.</li>
          <li>Teams of 2-6 participants can register together or assemble through JnuMate.</li>
        </ul>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button onclick="closeEventDetailModal()" class="btn-back-link">Close</button>
        <button onclick="handleEventRegister(${evt.id})" class="btn-primary-green">
          Register for Event &rarr;
        </button>
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

function handleEventRegister(id) {
  closeEventDetailModal();
  showToast("Registration saved! You will receive an event confirmation email shortly.", "success");
}

/* ==========================================================================
   6. VIEW 3: ACADEMIC & CAMPUS RESOURCES
   ========================================================================== */
const CAMPUS_RESOURCES_DATA = [
  {
    id: 1,
    title: "JNU PYQs",
    category: "exams",
    categoryLabel: "Exams",
    count: "2.4K+ Papers",
    desc: "Previous year question papers for all engineering, medical, science and management semesters.",
    icon: "doc",
    img: "/static/img/blank_pfp.jpg"
  },
  {
    id: 2,
    title: "Syllabus",
    category: "academic",
    categoryLabel: "Academic",
    count: "500+ Syllabi",
    desc: "Latest curriculum, course structures, credit distribution, and subject outcomes for all batches.",
    icon: "book",
    img: "/static/img/blank_pfp.jpg"
  },
  {
    id: 3,
    title: "Notes & Study Material",
    category: "academic",
    categoryLabel: "Academic",
    count: "1.8K+ Resources",
    desc: "Curated class notes, lecture slides, lab manuals, and shared peer study materials.",
    icon: "note",
    img: "/static/img/blank_pfp.jpg"
  },
  {
    id: 4,
    title: "Academic Calendar",
    category: "academic",
    categoryLabel: "Academic",
    count: "Latest Updates",
    desc: "Important university schedules, mid-term examinations, semester end dates, and institutional holidays.",
    icon: "calendar",
    img: "/static/img/blank_pfp.jpg"
  },
  {
    id: 5,
    title: "Placements",
    category: "placements",
    categoryLabel: "Placements",
    count: "300+ Resources",
    desc: "On-campus placement drives, interview question archives, company prep kits, and technical test rounds.",
    icon: "briefcase",
    img: "/static/img/blank_pfp.jpg"
  },
  {
    id: 6,
    title: "Career Guidance",
    category: "career",
    categoryLabel: "Career",
    count: "200+ Guides",
    desc: "Industry roadmaps, open source contributions, resume building guides, and competitive programming tips.",
    icon: "users",
    img: "/static/img/blank_pfp.jpg"
  },
  {
    id: 7,
    title: "Project Ideas",
    category: "career",
    categoryLabel: "Career",
    count: "150+ Ideas",
    desc: "Mini projects, major capstone architectures, IoT blueprints, and AI/ML domain research ideas.",
    icon: "bulb",
    img: "/static/img/blank_pfp.jpg"
  },
  {
    id: 8,
    title: "Student Community",
    category: "campus",
    categoryLabel: "Campus Life",
    count: "100+ Links",
    desc: "Student clubs, hackathon squads, coding chapters, cultural societies, and technical forums.",
    icon: "users",
    img: "/static/img/blank_pfp.jpg"
  },
  {
    id: 9,
    title: "Useful Links",
    category: "others",
    categoryLabel: "Others",
    count: "250+ Links",
    desc: "Official university ERP portal, library repository, fee payments, and campus Wi-Fi instructions.",
    icon: "link",
    img: "/static/img/blank_pfp.jpg"
  }
];

let currentResourcesFilter = "all";
let currentResourcesSearchTerm = "";

function loadResourcesView() {
  applyResourcesFilters();
}

function setResourcesFilter(cat) {
  currentResourcesFilter = cat;
  document.querySelectorAll(".resource-filter-pill").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter") === cat);
  });
  applyResourcesFilters();
}

let resourcesSearchTimer = null;
function debounceResourcesSearch() {
  clearTimeout(resourcesSearchTimer);
  resourcesSearchTimer = setTimeout(() => {
    const input = document.getElementById("resourcesSearchInput");
    currentResourcesSearchTerm = input ? input.value.trim().toLowerCase() : "";
    applyResourcesFilters();
  }, 250);
}

function applyResourcesFilters() {
  let list = [...CAMPUS_RESOURCES_DATA];

  if (currentResourcesFilter !== "all") {
    list = list.filter(r => r.category === currentResourcesFilter);
  }

  if (currentResourcesSearchTerm) {
    list = list.filter(r =>
      r.title.toLowerCase().includes(currentResourcesSearchTerm) ||
      r.desc.toLowerCase().includes(currentResourcesSearchTerm)
    );
  }

  renderResourcesGrid(list);
}

function renderResourcesGrid(resources) {
  const container = document.getElementById("resourcesGridContainer");
  if (!container) return;

  if (resources.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #fff; border-radius: 18px; border: 1px solid var(--border-subtle);">
        <h3 style="font-family: var(--font-serif); font-size: 1.25rem; font-weight: 700; margin-bottom: 6px;">No resources found</h3>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">Try selecting a different filter category.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = resources.map(res => `
    <article class="resource-card-modern" onclick="openResourceDetailModal(${res.id})">
      <div class="resource-thumb-wrap">
        <img src="${res.img}" alt="${escapeHtml(res.title)}" class="resource-thumb-img" onerror="this.src='/static/img/blank_pfp.jpg'">
      </div>

      <div class="resource-card-content">
        <div class="resource-floating-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>

        <h3 class="resource-card-title">${escapeHtml(res.title)}</h3>
        <p class="resource-card-desc">${escapeHtml(res.desc)}</p>

        <div class="resource-card-footer">
          <div class="resource-count-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
            <span>${res.count}</span>
          </div>
          <div class="resource-arrow-circle">
            &rarr;
          </div>
        </div>
      </div>
    </article>
  `).join("");
}

function openResourceDetailModal(resId) {
  const res = CAMPUS_RESOURCES_DATA.find(r => r.id === resId);
  if (!res) return;

  const modal = document.getElementById("resourceDetailModal");
  const content = document.getElementById("resourceDetailModalContent");
  if (!modal || !content) return;

  content.innerHTML = `
    <div style="padding: 28px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <span class="badge-track sih">${res.categoryLabel}</span>
        <button onclick="closeResourceDetailModal()" class="modal-close-icon-btn">&times;</button>
      </div>

      <h2 style="font-family: var(--font-serif); font-size: 1.75rem; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
        ${escapeHtml(res.title)}
      </h2>
      <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 20px;">
        ${escapeHtml(res.desc)}
      </p>

      <div style="background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 18px; margin-bottom: 24px;">
        <div style="font-size: 0.8125rem; font-weight: 700; color: var(--text-heading); margin-bottom: 12px;">Available Files & Materials</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #fff; border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-mint);">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              </svg>
              <span style="font-size: 0.8125rem; font-weight: 600;">Complete Syllabus Repository 2025-26</span>
            </div>
            <a href="javascript:void(0)" onclick="showToast('Downloading syllabus package...', 'success')" style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary-green);">Download PDF</a>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #fff; border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-mint);">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              </svg>
              <span style="font-size: 0.8125rem; font-weight: 600;">Question Papers Archive (Sem 1 - Sem 8)</span>
            </div>
            <a href="javascript:void(0)" onclick="showToast('Opening archive repository...', 'info')" style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary-green);">Browse Drive</a>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <button onclick="closeResourceDetailModal()" class="btn-primary-green" style="height: 38px; padding: 0 18px;">
          Done
        </button>
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

/* ==========================================================================
   7. VIEW 4: TEAM DETAILS & SQUAD CHAT
   ========================================================================== */
function loadTeamDetailView(teamId) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 80px 20px;">
      ${renderIosSpinner('lg', 'Loading squad details...')}
    </div>
  `;

  fetch(`/api/teams/${teamId}`)
    .then(r => {
      if (!r.ok) throw new Error("Squad not found");
      return r.json();
    })
    .then(data => {
      const team = data.team || data;
      renderFullTeamDetail(team);
    })
    .catch(err => {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: #fff; border-radius: 18px; border: 1px solid var(--border-subtle);">
          <h3 style="font-family: var(--font-serif); font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">Squad Not Found</h3>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">The hackathon squad you are looking for may have been disbanded or does not exist.</p>
          <a href="/" class="btn-primary-green">&larr; Back to Squads</a>
        </div>
      `;
    });
}

function renderFullTeamDetail(team) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  const isSih = (team.track || "").toLowerCase().includes("sih") || (team.track || "").toLowerCase().includes("smart");
  const trackLogo = isSih ? "/static/img/sih_logo.jpg" : "/static/img/ctf_logo.jpg";
  const trackName = isSih ? "Smart India Hackathon 2026" : "Capture The Flag 2026";
  const trackSub = isSih ? "Official SIH Track • Multidisciplinary Squad" : "Official CTF Cyber Challenge Track • Cybersecurity & Defense Squad";

  const members = Array.isArray(team.members) ? team.members : [];
  const maxMembers = team.max_members || 6;
  const isLeader = currentUser && (team.leader_id === currentUser.id || members.some(m => m.id === currentUser.id && m.is_leader));
  const isMember = currentUser && members.some(m => m.id === currentUser.id);

  container.innerHTML = `
    <!-- Top Bar -->
    <div class="team-page-top-bar">
      <a href="/" class="btn-back-link">
        &larr; Back to Squads
      </a>
      <span class="status-pill-open">
        ● Open for Join Requests
      </span>
    </div>

    <!-- Hero Card -->
    <div class="team-hero-card-modern">
      <div class="team-hero-logo-box">
        <img src="${trackLogo}" alt="${trackName}" style="width: 56px; height: 56px; object-fit: contain; border-radius: 8px;">
      </div>
      <div class="team-hero-info">
        <h1 class="team-hero-title">${escapeHtml(team.name)}</h1>
        <div class="team-hero-track-sub">${trackSub}</div>
        <p class="team-hero-desc">${escapeHtml(team.description || "Assembled squad for university hackathon competition.")}</p>
        <div class="team-hero-meta-row">
          <div class="team-hero-meta-item">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>15–17 Feb, 2026</span>
          </div>
          <div class="team-hero-meta-item">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>JNU Campus</span>
          </div>
          <div class="team-hero-meta-item">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
            <span>${members.length} / ${maxMembers} Members</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs Navigation Bar -->
    <div class="team-nav-tabs-bar">
      <button class="team-tab-btn active" id="tabBtnTeam" onclick="switchTeamTab('team')">Team</button>
      <button class="team-tab-btn" id="tabBtnAbout" onclick="switchTeamTab('about')">About</button>
      <button class="team-tab-btn" id="tabBtnDiscussion" onclick="switchTeamTab('discussion', ${team.id})">Discussion</button>
    </div>

    <!-- Tab 1: Team & Roster (Default) -->
    <div id="teamTabContentTeam" class="team-tab-pane">
      <div class="team-detail-two-col">
        <!-- Left: Roster List -->
        <div class="roster-card-box">
          <div class="roster-header-row">
            <h2 class="roster-title">Team Roster (${maxMembers} Seats)</h2>
            <span class="roster-count-sub">${members.length} of ${maxMembers} seats filled</span>
          </div>

          <div class="roster-slots-stack" id="teamDetailRosterList">
            ${renderRosterMembersList(members, maxMembers, isLeader, team.id)}
          </div>
        </div>

        <!-- Right: Actions & Readiness Checklist -->
        <div>
          ${!isMember ? `
            <div class="team-side-card">
              <h3 class="team-side-title">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                <span>Request to Join Squad</span>
              </h3>
              <p class="team-side-sub">Write down your skills or achievements or anything special (optional):</p>
              <textarea id="joinRequestSkillsInput" class="team-join-textarea" placeholder="e.g. CTF experience, tools you know, areas of interest..."></textarea>
              <button onclick="submitJoinSquadRequest(${team.id})" class="btn-primary-green" id="btnSubmitJoinRequest" style="width: 100%;">
                <span>Send Join Request</span>
                &rarr;
              </button>
            </div>
          ` : `
            <div class="team-side-card">
              <h3 class="team-side-title">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-mint);">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>You are in this Squad</span>
              </h3>
              <p class="team-side-sub">Collaborate with your teammates in the live discussion or view project guidelines.</p>
              <button onclick="switchTeamTab('discussion', ${team.id})" class="btn-primary-green" style="width: 100%; margin-bottom: 8px;">
                Open Squad Live Chat &rarr;
              </button>
              ${!isLeader ? `
                <button onclick="leaveCurrentTeam(${team.id})" class="btn-back-link" style="width: 100%; justify-content: center; color: #dc2626; border-color: #fecaca;">
                  Leave Team
                </button>
              ` : `
                <button onclick="disbandCurrentTeam(${team.id})" class="btn-back-link" style="width: 100%; justify-content: center; color: #dc2626; border-color: #fecaca;">
                  Disband Squad
                </button>
              `}
            </div>
          `}

          <!-- Readiness Checklist Card -->
          <div class="team-side-card">
            <h3 class="team-side-title">Readiness Checklist</h3>
            <div class="checklist-item">
              <div class="checklist-icon-circle ${members.length >= 5 ? 'pass' : 'neutral'}">✓</div>
              <div class="checklist-content">
                <div class="checklist-label">Roster Minimums</div>
                <div class="checklist-desc">${members.length}/${maxMembers} confirmed members</div>
              </div>
            </div>
            <div class="checklist-item">
              <div class="checklist-icon-circle ${team.whatsapp_link ? 'pass' : 'neutral'}">✓</div>
              <div class="checklist-content">
                <div class="checklist-label">Team Group Chat</div>
                <div class="checklist-desc">${team.whatsapp_link ? 'WhatsApp connected' : 'Link not added yet'}</div>
              </div>
            </div>
            <div class="checklist-item">
              <div class="checklist-icon-circle pass">✓</div>
              <div class="checklist-content">
                <div class="checklist-label">Campus Verification</div>
                <div class="checklist-desc">All teammates verified via JNU R-ID</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: About Pitch & Objectives -->
    <div id="teamTabContentAbout" class="team-tab-pane" style="display:none;">
      <div class="roster-card-box" style="margin-bottom: 24px;">
        <h2 class="roster-title" style="margin-bottom: 12px;">Project Pitch & Problem Statement</h2>
        <p style="font-size: 0.9375rem; color: var(--text-body); line-height: 1.6; margin-bottom: 20px;">
          ${escapeHtml(team.description || "No detailed pitch provided yet.")}
        </p>
        ${team.whatsapp_link ? `
          <div style="margin-top: 16px;">
            <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="btn-primary-green" style="background-color: #25D366;">
              Join Official Team WhatsApp Group &rarr;
            </a>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Tab 3: Squad Live Chat Discussion -->
    <div id="teamTabContentDiscussion" class="team-tab-pane" style="display:none;">
      <div class="squad-chat-window">
        <div class="squad-chat-header">
          <span class="squad-chat-header-title">Squad Live Chat (${escapeHtml(team.name)})</span>
          <span style="font-size: 0.75rem; color: var(--color-mint); font-weight: 600;">● Active</span>
        </div>

        <div class="squad-chat-messages-scroll" id="squadChatMessagesList">
          <div style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
            ${renderIosSpinner('sm', 'Loading squad messages...')}
          </div>
        </div>

        <form class="squad-chat-input-bar" onsubmit="handleSendTeamChatMessage(event, ${team.id})">
          <input type="text" id="squadChatInputField" placeholder="Message your squad..." class="chat-input-field" autocomplete="off">
          <button type="submit" class="btn-send-chat" aria-label="Send message">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </div>
  `;
}

function renderRosterMembersList(members, maxMembers, isLeader, teamId) {
  let html = "";
  for (let i = 0; i < maxMembers; i++) {
    const num = String(i + 1).padStart(2, "0");
    if (i < members.length) {
      const m = members[i];
      const pfp = m.avatar_url || "/static/img/blank_pfp.jpg";
      const isCapt = m.is_leader || i === 0;
      const roleText = isCapt ? "Captain" : "Member";
      const roleClass = isCapt ? "captain" : "member";

      html += `
        <div class="roster-member-row">
          <div class="roster-member-left">
            <span class="roster-num">${num}</span>
            <img src="${pfp}" alt="${escapeHtml(m.name)}" class="roster-member-avatar" onerror="this.src='/static/img/blank_pfp.jpg'">
            <div class="roster-member-info">
              <div class="roster-name-wrap">
                <span class="roster-name">${escapeHtml(m.name)}</span>
                <span class="roster-role-pill ${roleClass}">${roleText}</span>
              </div>
              <div class="roster-meta-line">
                ${escapeHtml(m.r_id || '')} &bull; ${escapeHtml(m.program || 'Student')}
              </div>
            </div>
          </div>
          <div class="roster-member-right">
            ${isLeader && !isCapt ? `
              <button onclick="removeTeamMember(${teamId}, '${m.r_id || m.id}')" title="Remove member" style="color: #ef4444; padding: 4px;">
                &times;
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="roster-open-slot-row" onclick="${isLeader ? `openStudentSearchModalForSlot(${teamId}, ${i})` : `showToast('This seat is open for student join requests', 'info')`}">
          <div class="roster-member-left">
            <span class="roster-num">${num}</span>
            <div class="open-slot-dashed-circle">+</div>
            <div class="roster-member-info">
              <span class="roster-name" style="color: var(--text-secondary);">Seat ${num} &bull; Open Slot</span>
              <span class="roster-meta-line">Available for student join requests</span>
            </div>
          </div>
          <span class="badge-track ctf">Open</span>
        </div>
      `;
    }
  }
  return html;
}

function switchTeamTab(tabName, teamId) {
  document.querySelectorAll(".team-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".team-tab-pane").forEach(p => p.style.display = "none");

  if (tabName === "team") {
    const b = document.getElementById("tabBtnTeam");
    const p = document.getElementById("teamTabContentTeam");
    if (b) b.classList.add("active");
    if (p) p.style.display = "block";
    stopSquadChatPolling();
  } else if (tabName === "about") {
    const b = document.getElementById("tabBtnAbout");
    const p = document.getElementById("teamTabContentAbout");
    if (b) b.classList.add("active");
    if (p) p.style.display = "block";
    stopSquadChatPolling();
  } else if (tabName === "discussion") {
    const b = document.getElementById("tabBtnDiscussion");
    const p = document.getElementById("teamTabContentDiscussion");
    if (b) b.classList.add("active");
    if (p) p.style.display = "block";
    if (teamId) {
      startSquadChatPolling(teamId);
    }
  }
}

/* Squad Live Chat Polling & Diffing */
function startSquadChatPolling(teamId) {
  stopSquadChatPolling();
  currentChatTeamId = teamId;
  loadTeamChatMessages(teamId, true);
  chatPollInterval = setInterval(() => {
    loadTeamChatMessages(teamId, false);
  }, 3000);
}

function stopSquadChatPolling() {
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
  currentChatTeamId = null;
  lastChatMessagesHash = "";
}

function loadTeamChatMessages(teamId, isInitial) {
  fetch(`/api/teams/${teamId}/messages`)
    .then(r => r.json())
    .then(data => {
      const messages = Array.isArray(data) ? data : (data.messages || []);
      const hash = JSON.stringify(messages);
      if (hash === lastChatMessagesHash && !isInitial) return;
      lastChatMessagesHash = hash;

      const container = document.getElementById("squadChatMessagesList");
      if (!container) return;

      if (messages.length === 0) {
        container.innerHTML = `
          <div class="chat-date-divider"><span class="chat-date-pill">Today</span></div>
          <div style="text-align: center; padding: 48px 16px; color: var(--text-muted); font-size: 0.875rem;">
            No messages yet. Send the first message to say hello to your squad!
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="chat-date-divider"><span class="chat-date-pill">Today</span></div>
        ${messages.map(msg => {
          const isFormer = msg.is_active_member === false;
          const pfp = msg.sender_avatar || "/static/img/blank_pfp.jpg";
          const senderName = msg.sender_name || "Teammate";
          const time = msg.timestamp || "Just now";

          return `
            <div class="chat-message-row ${isFormer ? 'former-member' : ''}">
              <img src="${pfp}" alt="${escapeHtml(senderName)}" class="chat-sender-avatar" onerror="this.src='/static/img/blank_pfp.jpg'">
              <div class="chat-bubble-container">
                <div class="chat-sender-meta">
                  <span class="chat-sender-name">${escapeHtml(senderName)}</span>
                  <span class="chat-timestamp">${escapeHtml(time)}</span>
                </div>
                <div class="chat-message-bubble">
                  ${escapeHtml(msg.message || msg.content || "")}
                </div>
              </div>
            </div>
          `;
        }).join("")}
      `;

      // Auto scroll to bottom
      container.scrollTop = container.scrollHeight;
    })
    .catch(() => {});
}

function handleSendTeamChatMessage(event, teamId) {
  event.preventDefault();
  const input = document.getElementById("squadChatInputField");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  fetch(`/api/teams/${teamId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text })
  })
    .then(r => r.json())
    .then(() => {
      loadTeamChatMessages(teamId, false);
    })
    .catch(() => {
      showToast("Failed to send message", "error");
    });
}

function submitJoinSquadRequest(teamId) {
  if (!currentUser) {
    navigateTo("/login");
    return;
  }
  const btn = document.getElementById("btnSubmitJoinRequest");
  const skillsInput = document.getElementById("joinRequestSkillsInput");
  const skills = skillsInput ? skillsInput.value.trim() : "";

  if (btn) btn.innerHTML = renderIosSpinner('sm', 'Sending Request...');

  fetch(`/api/teams/${teamId}/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skills: skills })
  })
    .then(r => r.json())
    .then(data => {
      if (btn) btn.innerHTML = `<span>Send Join Request</span> &rarr;`;
      if (data.error) {
        showToast(data.error, "error");
      } else {
        showToast("Join request sent successfully to squad captain!", "success");
        if (skillsInput) skillsInput.value = "";
      }
    })
    .catch(() => {
      if (btn) btn.innerHTML = `<span>Send Join Request</span> &rarr;`;
      showToast("Error sending join request", "error");
    });
}

function leaveCurrentTeam(teamId) {
  if (!confirm("Are you sure you want to leave this hackathon squad?")) return;
  fetch(`/api/teams/${teamId}/leave`, { method: "POST" })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        showToast(data.error, "error");
      } else {
        if (currentUser) {
          currentUser.team_id = null;
          currentUser.team_name = null;
          localStorage.setItem("jnumate_user", JSON.stringify(currentUser));
        }
        showToast("You have left the squad", "info");
        navigateTo("/");
      }
    })
    .catch(() => {
      showToast("Failed to leave team", "error");
    });
}

function disbandCurrentTeam(teamId) {
  if (!confirm("Are you sure you want to permanently disband this squad? This cannot be undone.")) return;
  fetch(`/api/teams/${teamId}/disband`, { method: "POST" })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        showToast(data.error, "error");
      } else {
        if (currentUser) {
          currentUser.team_id = null;
          currentUser.team_name = null;
          localStorage.setItem("jnumate_user", JSON.stringify(currentUser));
        }
        showToast("Squad disbanded successfully", "info");
        navigateTo("/");
      }
    })
    .catch(() => {
      showToast("Failed to disband team", "error");
    });
}

function removeTeamMember(teamId, memberRid) {
  if (!confirm(`Remove student ${memberRid} from the squad?`)) return;
  fetch(`/api/teams/${teamId}/members/remove`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_r_id: memberRid })
  })
    .then(r => r.json())
    .then(() => {
      showToast("Member removed", "info");
      loadTeamDetailView(teamId);
    })
    .catch(() => {
      showToast("Error removing member", "error");
    });
}

/* ==========================================================================
   8. VIEW 5: CREATE TEAM PAGE
   ========================================================================== */
let selectedCreateTrack = "sih";

function loadCreateTeamView() {
  const container = document.getElementById("createTeamViewContainer");
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background: #fff; border-radius: 20px; border: 1px solid var(--border-subtle);">
        <h3 style="font-family: var(--font-serif); font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">Sign In to Create a Squad</h3>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">Only verified Jaipur National University students can form hackathon teams.</p>
        <a href="/login" class="btn-primary-green">Sign In with College R-ID &rarr;</a>
      </div>
    `;
    return;
  }

  // Set leader to current user
  createTeamDraftRoster[0].student = currentUser;

  container.innerHTML = `
    <!-- Top Nav Back -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <a href="/" class="btn-back-link">&larr; Back to Discover</a>
      <span style="font-size: 0.8125rem; font-weight: 600; color: var(--color-mint); display: flex; align-items: center; gap: 6px;">
        ✨ Create your team and start building something amazing!
      </span>
    </div>

    <!-- 2-Column Layout matching "create team page ( desktop and mobile views).png" -->
    <div class="create-team-two-col">
      <!-- Left Column: Form Details -->
      <div class="create-team-card">
        <span class="section-kicker">6-SEAT TEAM BUILDER</span>
        <h1 style="font-family: var(--font-serif); font-size: 2rem; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
          Create New Team
        </h1>
        <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 24px;">
          Form your squad, choose a hackathon track, and assign teammates or leave slots open for join requests.
        </p>

        <!-- 1. Choose Hackathon Category -->
        <div class="form-group-modern">
          <label class="form-label-modern">1. Choose Hackathon Category *</label>
          <div class="create-category-cards-row">
            <div class="category-select-card selected" id="trackCardSih" onclick="selectCreateTeamTrack('sih')">
              <img src="/static/img/sih_logo.jpg" alt="SIH" style="width: 44px; height: 44px; margin: 0 auto 8px; object-fit: contain;">
              <div style="font-size: 0.9375rem; font-weight: 700; color: var(--text-heading);">Smart India Hackathon (SIH)</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Hardware & Software editions</div>
              <div style="font-size: 0.6875rem; color: var(--color-mint); margin-top: 4px;">Build solutions for Viksit Bharat</div>
            </div>

            <div class="category-select-card" id="trackCardCtf" onclick="selectCreateTeamTrack('ctf')">
              <img src="/static/img/ctf_logo.jpg" alt="CTF" style="width: 44px; height: 44px; margin: 0 auto 8px; object-fit: contain;">
              <div style="font-size: 0.9375rem; font-weight: 700; color: var(--text-heading);">Capture The Flag (CTF)</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Cybersecurity & Defense</div>
              <div style="font-size: 0.6875rem; color: var(--color-mint); margin-top: 4px;">Test skills. Secure the future.</div>
            </div>
          </div>
        </div>

        <!-- 2. Team Title -->
        <div class="form-group-modern">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label-modern" style="margin-bottom: 0;">2. Team Title *</label>
            <span style="font-size: 0.72rem; color: var(--text-muted);" id="titleCharCount">0/50</span>
          </div>
          <input type="text" id="createTeamTitleInput" placeholder="e.g. CyberStorm, NeuroVision" class="form-input-modern" maxlength="50" oninput="updateCreateTeamCounts()">
        </div>

        <!-- 3. WhatsApp Link -->
        <div class="form-group-modern">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label-modern" style="margin-bottom: 0;">3. Official Team WhatsApp Link</label>
            <span style="font-size: 0.72rem; color: var(--text-muted);" id="waCharCount">0/100</span>
          </div>
          <div style="display: flex; align-items: center; background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 0 12px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366" style="margin-right: 8px; flex-shrink: 0;">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92z"/>
            </svg>
            <input type="url" id="createTeamWaInput" placeholder="https://chat.whatsapp.com/..." class="form-input-modern" style="border: none; background: transparent; padding: 0;" maxlength="100" oninput="updateCreateTeamCounts()">
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">This link will be shared with approved members for instant squad coordination.</div>
        </div>

        <!-- 4. Project Pitch -->
        <div class="form-group-modern">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label-modern" style="margin-bottom: 0;">4. Project Pitch / Hackathon Idea *</label>
            <span style="font-size: 0.72rem; color: var(--text-muted);" id="pitchCharCount">0/500</span>
          </div>
          <textarea id="createTeamPitchInput" placeholder="Briefly describe what problem statement you're tackling and what skills you are looking for..." class="form-textarea-modern" maxlength="500" oninput="updateCreateTeamCounts()"></textarea>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">Be clear and concise. You can always edit this later.</div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 14px; margin-top: 28px;">
          <a href="/" class="btn-back-link" style="flex: 1; justify-content: center; height: 44px;">Cancel</a>
          <button onclick="submitCreateNewTeam()" class="btn-primary-green" id="btnSubmitCreateTeam" style="flex: 2; height: 44px;">
            <span>Create Team</span> &rarr;
          </button>
        </div>
      </div>

      <!-- Right Column: Roster Assignment (6 Seats) -->
      <div>
        <div class="create-team-card" style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h2 style="font-size: 1.1rem; font-weight: 700; color: var(--text-heading);">5. Team Roster (6 Seats)</h2>
              <div style="font-size: 0.78rem; color: var(--text-secondary);">Assign teammates by searching with their R-ID. Empty seats stay open for join requests.</div>
            </div>
            <span class="badge-track sih" id="assignedSeatsCountBadge">1/6 Assigned</span>
          </div>

          <!-- 3x2 Seats Grid -->
          <div class="seats-roster-grid" id="createTeamSeatsGrid">
            ${renderCreateTeamRosterGrid()}
          </div>

          <!-- Tips Checklist -->
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
            <div style="display: flex; gap: 10px; font-size: 0.75rem; color: var(--text-secondary);">
              <span style="font-weight: 800; color: var(--color-mint);">01</span>
              <span>Click on any open seat to assign from directory</span>
            </div>
            <div style="display: flex; gap: 10px; font-size: 0.75rem; color: var(--text-secondary);">
              <span style="font-weight: 800; color: var(--color-mint);">02</span>
              <span>Leave slots unassigned to accept join requests</span>
            </div>
            <div style="display: flex; gap: 10px; font-size: 0.75rem; color: var(--text-secondary);">
              <span style="font-weight: 800; color: var(--color-mint);">03</span>
              <span>Add WhatsApp link so members connect instantly</span>
            </div>
            <div style="display: flex; gap: 10px; font-size: 0.75rem; color: var(--text-secondary);">
              <span style="font-weight: 800; color: var(--color-mint);">04</span>
              <span>SIH requires 6 members with at least 1 female participant</span>
            </div>
          </div>
        </div>

        <!-- Motivational Sprout Card -->
        <div style="background: linear-gradient(135deg, #f0f8f3 0%, #e8f4ed 100%); border: 1px solid var(--border-subtle); border-radius: 18px; padding: 20px; display: flex; align-items: center; gap: 16px;">
          <div style="font-size: 1.75rem;">🌱</div>
          <div>
            <div style="font-family: var(--font-serif); font-size: 1.05rem; font-weight: 700; color: var(--text-heading);">Ideas grow together.</div>
            <div style="font-size: 0.78rem; color: var(--text-secondary);">Build. Collaborate. Innovate.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function selectCreateTeamTrack(track) {
  selectedCreateTrack = track;
  const sihCard = document.getElementById("trackCardSih");
  const ctfCard = document.getElementById("trackCardCtf");
  if (sihCard) sihCard.classList.toggle("selected", track === "sih");
  if (ctfCard) ctfCard.classList.toggle("selected", track === "ctf");
}

function updateCreateTeamCounts() {
  const title = document.getElementById("createTeamTitleInput");
  const wa = document.getElementById("createTeamWaInput");
  const pitch = document.getElementById("createTeamPitchInput");

  if (title) document.getElementById("titleCharCount").textContent = `${title.value.length}/50`;
  if (wa) document.getElementById("waCharCount").textContent = `${wa.value.length}/100`;
  if (pitch) document.getElementById("pitchCharCount").textContent = `${pitch.value.length}/500`;
}

function renderCreateTeamRosterGrid() {
  return createTeamDraftRoster.map((slot, index) => {
    if (slot.isLeader) {
      const leaderName = currentUser ? currentUser.name : "You";
      const leaderPfp = (currentUser && currentUser.avatar_url) ? currentUser.avatar_url : "/static/img/blank_pfp.jpg";
      return `
        <div class="seat-item-card leader">
          <div style="font-size: 0.65rem; font-weight: 800; color: var(--color-mint); text-transform: uppercase;">SEAT 1 &bull; LEADER (YOU)</div>
          <img src="${leaderPfp}" alt="Leader" style="width: 42px; height: 42px; border-radius: 50%; margin: 8px auto; object-fit: cover;" onerror="this.src='/static/img/blank_pfp.jpg'">
          <div style="font-size: 0.8125rem; font-weight: 700; color: var(--text-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(leaderName)}</div>
          <span class="badge-track ctf" style="margin-top: 4px; display: inline-block;">Leader</span>
        </div>
      `;
    } else if (slot.student) {
      const s = slot.student;
      const sPfp = s.avatar_url || "/static/img/blank_pfp.jpg";
      return `
        <div class="seat-item-card" onclick="openStudentSearchModalForCreateSlot(${index})">
          <div style="font-size: 0.65rem; font-weight: 800; color: var(--color-mint);">SEAT ${slot.seat}</div>
          <img src="${sPfp}" alt="${escapeHtml(s.name)}" style="width: 42px; height: 42px; border-radius: 50%; margin: 8px auto; object-fit: cover;" onerror="this.src='/static/img/blank_pfp.jpg'">
          <div style="font-size: 0.8125rem; font-weight: 700; color: var(--text-heading);">${escapeHtml(s.name)}</div>
          <div style="font-size: 0.6875rem; color: var(--text-muted);">${escapeHtml(s.r_id || '')}</div>
        </div>
      `;
    } else {
      return `
        <div class="seat-item-card" onclick="openStudentSearchModalForCreateSlot(${index})">
          <div style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px dashed #cbd5e1; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 1rem;">+</div>
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-heading);">Seat ${slot.seat}</div>
          <div style="font-size: 0.65rem; color: var(--text-muted);">Open Slot</div>
        </div>
      `;
    }
  }).join("");
}

function submitCreateNewTeam() {
  const titleInput = document.getElementById("createTeamTitleInput");
  const pitchInput = document.getElementById("createTeamPitchInput");
  const waInput = document.getElementById("createTeamWaInput");
  const btn = document.getElementById("btnSubmitCreateTeam");

  const title = titleInput ? titleInput.value.trim() : "";
  const pitch = pitchInput ? pitchInput.value.trim() : "";
  const wa = waInput ? waInput.value.trim() : "";

  if (!title) {
    showToast("Please enter a team title", "error");
    if (titleInput) titleInput.focus();
    return;
  }
  if (!pitch) {
    showToast("Please enter a project pitch or idea", "error");
    if (pitchInput) pitchInput.focus();
    return;
  }

  if (btn) btn.innerHTML = renderIosSpinner('sm', 'Creating Squad...');

  const trackName = selectedCreateTrack === "sih" ? "Smart India Hackathon (SIH)" : "Capture The Flag (CTF)";

  fetch("/api/teams/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: title,
      track: trackName,
      description: pitch,
      whatsapp_link: wa,
      max_members: 6
    })
  })
    .then(r => r.json())
    .then(data => {
      if (btn) btn.innerHTML = `<span>Create Team</span> &rarr;`;
      if (data.error) {
        showToast(data.error, "error");
      } else {
        showToast("Team created successfully!", "success");
        if (currentUser) {
          currentUser.team_id = data.team_id || (data.team ? data.team.id : null);
          currentUser.team_name = title;
          localStorage.setItem("jnumate_user", JSON.stringify(currentUser));
        }
        navigateTo(`/team/${data.team_id || (data.team ? data.team.id : '')}`);
      }
    })
    .catch(() => {
      if (btn) btn.innerHTML = `<span>Create Team</span> &rarr;`;
      showToast("Failed to create team", "error");
    });
}

/* ==========================================================================
   9. VIEW 6: ASSIGN TEAMMATE SEARCH MODAL
   ========================================================================== */
let searchTargetContext = "create"; // "create" or "detail"
let searchTargetTeamId = null;

function openStudentSearchModalForCreateSlot(slotIndex) {
  searchTargetContext = "create";
  activeSlotIndexToAssign = slotIndex;
  openStudentSearchModalCommon(`Assign Teammate (Seat ${slotIndex + 1})`);
}

function openStudentSearchModalForSlot(teamId, slotIndex) {
  searchTargetContext = "detail";
  searchTargetTeamId = teamId;
  activeSlotIndexToAssign = slotIndex;
  openStudentSearchModalCommon(`Assign Teammate (Seat ${slotIndex + 1})`);
}

function openStudentSearchModalCommon(title) {
  const modal = document.getElementById("studentSearchModalOverlay");
  const titleEl = document.getElementById("studentSearchModalTitle");
  const input = document.getElementById("slotStudentSearchInput");
  const resultsContainer = document.getElementById("slotStudentSearchResults");
  const countBar = document.getElementById("slotSearchResultsCount");
  const clearBtn = document.getElementById("btnClearSlotSearch");

  if (titleEl) titleEl.textContent = title;
  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  if (countBar) countBar.style.display = "none";

  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div style="text-align: center; padding: 48px 16px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: #e8f5e9; color: var(--color-primary-green); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h4 style="font-family: var(--font-serif); font-size: 1.25rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">Search University Directory</h4>
        <p style="font-size: 0.8125rem; color: var(--text-secondary);">Type student College R-ID (e.g. <strong>R15006</strong>) or name to find verified peers</p>
      </div>
    `;
  }

  if (modal) {
    modal.style.display = "flex";
    document.body.classList.add("scroll-locked");
    if (input) setTimeout(() => input.focus(), 100);
  }
}

function closeStudentSearchModal() {
  const modal = document.getElementById("studentSearchModalOverlay");
  if (modal) modal.style.display = "none";
  document.body.classList.remove("scroll-locked");
  activeSlotIndexToAssign = null;
}

let slotSearchDebounce = null;
function debounceSlotStudentSearch() {
  const input = document.getElementById("slotStudentSearchInput");
  const clearBtn = document.getElementById("btnClearSlotSearch");
  const query = input ? input.value.trim() : "";

  if (clearBtn) clearBtn.style.display = query ? "block" : "none";

  clearTimeout(slotSearchDebounce);
  if (!query) {
    openStudentSearchModalCommon("Assign Teammate");
    return;
  }

  slotSearchDebounce = setTimeout(() => {
    executeSlotStudentSearch(query);
  }, 200);
}

function clearSlotStudentSearch() {
  const input = document.getElementById("slotStudentSearchInput");
  if (input) {
    input.value = "";
    input.focus();
  }
  debounceSlotStudentSearch();
}

function executeSlotStudentSearch(query) {
  const resultsContainer = document.getElementById("slotStudentSearchResults");
  const countBar = document.getElementById("slotSearchResultsCount");
  if (!resultsContainer) return;

  resultsContainer.innerHTML = `
    <div style="text-align: center; padding: 36px 16px;">
      ${renderIosSpinner('sm', 'Searching verified directory...')}
    </div>
  `;

  fetch(`/api/students/search?q=${encodeURIComponent(query)}`)
    .then(r => r.json())
    .then(data => {
      const students = Array.isArray(data) ? data : (data.students || []);
      if (countBar) {
        countBar.style.display = "block";
        countBar.textContent = `${students.length} result${students.length === 1 ? '' : 's'} found`;
      }

      if (students.length === 0) {
        resultsContainer.innerHTML = `
          <div style="text-align: center; padding: 36px 16px; color: var(--text-secondary); font-size: 0.875rem;">
            No verified students match "${escapeHtml(query)}". Check the spelling or try R-ID.
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = students.map(s => {
        const pfp = s.avatar_url || "/static/img/blank_pfp.jpg";
        const hasTeam = s.in_team || s.team_name;
        const statusBadge = hasTeam ?
          `<span style="background-color: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 10px; font-size: 0.6875rem; font-weight: 600;">In Team: ${escapeHtml(s.team_name || 'Squad')}</span>` :
          `<span class="badge-track ctf">Available</span>`;

        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #fff; border: 1px solid var(--border-subtle); border-radius: 14px;">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
              <img src="${pfp}" alt="${escapeHtml(s.name)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--border-subtle);" onerror="this.src='/static/img/blank_pfp.jpg'">
              <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-size: 0.9375rem; font-weight: 700; color: var(--text-heading);">${escapeHtml(s.name)}</span>
                  <span class="badge-track ctf" style="padding: 2px 6px;">@${escapeHtml(s.r_id || '')}</span>
                  ${statusBadge}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                  ${escapeHtml(s.program || 'Engineering')} &bull; Batch ${escapeHtml(s.admission_year || '2025')}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">
                  ${escapeHtml(s.email || '')}
                </div>
              </div>
            </div>

            <div style="flex-shrink: 0; margin-left: 12px;">
              ${hasTeam ? `
                <button disabled class="btn-back-link" style="opacity: 0.5; font-size: 0.75rem;">In Team</button>
              ` : `
                <button onclick="handleAssignStudentToSlot('${s.r_id}', '${escapeHtml(s.name)}', '${pfp}')" class="btn-primary-green" style="height: 36px; padding: 0 14px; font-size: 0.75rem;">
                  + Add Teammate
                </button>
              `}
            </div>
          </div>
        `;
      }).join("");
    })
    .catch(() => {
      resultsContainer.innerHTML = `<div style="text-align: center; padding: 24px; color: #ef4444;">Search error occurred</div>`;
    });
}

function handleAssignStudentToSlot(rid, name, pfp) {
  if (searchTargetContext === "create") {
    if (activeSlotIndexToAssign !== null) {
      createTeamDraftRoster[activeSlotIndexToAssign].student = {
        r_id: rid,
        name: name,
        avatar_url: pfp
      };
      const seatsGrid = document.getElementById("createTeamSeatsGrid");
      if (seatsGrid) seatsGrid.innerHTML = renderCreateTeamRosterGrid();
      const countBadge = document.getElementById("assignedSeatsCountBadge");
      const assignedCount = createTeamDraftRoster.filter(s => s.student !== null).length;
      if (countBadge) countBadge.textContent = `${assignedCount}/6 Assigned`;
      showToast(`Assigned ${name} to Seat ${activeSlotIndexToAssign + 1}`, "success");
      closeStudentSearchModal();
    }
  } else if (searchTargetContext === "detail") {
    fetch(`/api/teams/${searchTargetTeamId}/members/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_r_id: rid })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          showToast(data.error, "error");
        } else {
          showToast(`Added ${name} to the squad!`, "success");
          closeStudentSearchModal();
          loadTeamDetailView(searchTargetTeamId);
        }
      })
      .catch(() => {
        showToast("Failed to add teammate", "error");
      });
  }
}

/* ==========================================================================
   10. VIEW 7: USER PROFILE PAGE
   ========================================================================== */
function loadProfileView() {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background: #fff; border-radius: 20px; border: 1px solid var(--border-subtle);">
        <h3 style="font-family: var(--font-serif); font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">Please Sign In</h3>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">Sign in with your College R-ID to view your profile dossier and team enrollments.</p>
        <a href="/login" class="btn-primary-green">Sign In &rarr;</a>
      </div>
    `;
    return;
  }

  fetch("/api/user/profile")
    .then(r => r.json())
    .then(profileData => {
      renderFullUserProfile(profileData);
    })
    .catch(() => {
      renderFullUserProfile(currentUser);
    });
}

function renderFullUserProfile(profile) {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  const pfp = profile.avatar_url || (currentUser ? currentUser.avatar_url : "") || "/static/img/blank_pfp.jpg";
  const name = profile.name || (currentUser ? currentUser.name : "Student");
  const rid = profile.r_id || (currentUser ? currentUser.r_id : "N/A");
  const program = profile.program || "B.Tech. (Computer Science Engineering)";
  const email = profile.email || `${rid}@student.edu`;
  const phone = profile.phone || "6299318587";
  const teamName = profile.team_name || (currentUser ? currentUser.team_name : null);
  const teamId = profile.team_id || (currentUser ? currentUser.team_id : null);

  container.innerHTML = `
    <!-- Header Card matching "profile page ( desktop and mobile views).png" -->
    <div class="profile-header-card">
      <div class="profile-header-left">
        <div class="profile-avatar-large-wrap">
          <img src="${pfp}" alt="${escapeHtml(name)}" class="profile-avatar-large" onerror="this.src='/static/img/blank_pfp.jpg'">
          <label class="avatar-upload-badge" title="Change photo">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <input type="file" style="display:none;" onchange="handleProfilePhotoUpload(this)">
          </label>
        </div>
        <div class="profile-header-info">
          <h1 class="profile-name-large">${escapeHtml(name)}</h1>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);">4th Year Student</span>
            <span class="badge-track ctf">@${escapeHtml(rid)}</span>
          </div>
          <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 2px;">
            🎓 ${escapeHtml(program)}
          </div>
          <div style="display: flex; gap: 16px; font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; flex-wrap: wrap;">
            <span>✉️ ${escapeHtml(email)}</span>
            <span>📞 ${escapeHtml(phone)}</span>
            <span>📍 Jaipur, Rajasthan</span>
          </div>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 14px;">
        <button onclick="showToast('Profile details are synchronized from verified university database', 'info')" class="btn-back-link">
          ✏️ Edit Profile
        </button>
        <div class="profile-tagline-quote">
          “Discipline today, opportunities tomorrow.”
        </div>
      </div>
    </div>

    <!-- 2-Column Grid -->
    <div class="profile-two-col">
      <!-- Left: Status & Quick Actions -->
      <div>
        <div class="profile-section-card">
          <div class="profile-card-header">
            <span class="profile-card-title">Hackathon Status</span>
          </div>
          <div style="padding: 12px 14px; background: var(--bg-canvas); border-radius: 12px; border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="${teamId ? `navigateTo('/team/${teamId}')` : `navigateTo('/create-team')`}">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="color: var(--color-mint); font-size: 1.25rem;">●</span>
              <div>
                <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-heading);">${teamName ? `Active in 1 Squad` : 'No Active Squad'}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${teamName || 'Create or join a squad'}</div>
              </div>
            </div>
            <span>&rarr;</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 16px;">
            <a href="/create-team" class="btn-primary-green" style="justify-content: center; width: 100%;">
              + Create New Team
            </a>
            <button onclick="handleLogout()" class="btn-back-link" style="justify-content: center; width: 100%;">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Enrolled Squads & Academic Credentials -->
      <div>
        <div class="profile-section-card">
          <div class="profile-card-header">
            <span class="profile-card-title">Enrolled Hackathon Squads (${teamName ? '1' : '0'})</span>
            <a href="/create-team" class="btn-text-subtle">+ Build New Squad</a>
          </div>

          ${teamName ? `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; background: var(--bg-canvas); border-radius: 14px; border: 1px solid var(--border-subtle);">
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="/static/img/ctf_logo.jpg" alt="Track" style="width: 40px; height: 40px; border-radius: 8px; object-fit: contain;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge-track ctf">CTF</span>
                    <span style="font-size: 0.9375rem; font-weight: 700; color: var(--text-heading);">${escapeHtml(teamName)}</span>
                    <span class="badge-track sih">Member</span>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
                    Confirmed squad for campus hackathon challenge.
                  </div>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <a href="/team/${teamId}" class="btn-view-team-pill">View Squad</a>
              </div>
            </div>
          ` : `
            <div style="text-align: center; padding: 24px; color: var(--text-secondary); font-size: 0.875rem;">
              You are not enrolled in any squads yet. <a href="/create-team" style="color: var(--color-primary-green); font-weight: 600;">Create one now &rarr;</a>
            </div>
          `}
        </div>

        <!-- Academic Credentials Card -->
        <div class="profile-section-card">
          <div class="profile-card-header">
            <span class="profile-card-title">Academic Credentials</span>
            <button onclick="showToast('Credentials verified from Registrar database', 'info')" class="btn-text-subtle">Edit</button>
          </div>
          <div class="profile-data-grid">
            <div class="profile-field-box">
              <span class="profile-field-label">College R-ID</span>
              <span class="profile-field-value">@${escapeHtml(rid)}</span>
            </div>
            <div class="profile-field-box">
              <span class="profile-field-label">Student Name</span>
              <span class="profile-field-value">${escapeHtml(name)}</span>
            </div>
            <div class="profile-field-box">
              <span class="profile-field-label">Academic Year</span>
              <span class="profile-field-value">4th Year Student</span>
            </div>
            <div class="profile-field-box">
              <span class="profile-field-label">Admission Batch</span>
              <span class="profile-field-value">2023</span>
            </div>
            <div class="profile-field-box" style="grid-column: 1 / -1;">
              <span class="profile-field-label">Degree Program</span>
              <span class="profile-field-value">${escapeHtml(program)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function handleProfilePhotoUpload(input) {
  if (input.files && input.files[0]) {
    showToast("Profile photo uploaded successfully!", "success");
  }
}

/* ==========================================================================
   11. VIEW 8: LOGIN & OTP SCREENS
   ========================================================================== */
let loginTempRid = "";
let loginTempStudent = null;

function loadLoginView() {
  const container = document.getElementById("loginViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="login-screen-wrap">
      <div class="login-split-container">
        <!-- Left Photo Panel (Desktop) -->
        <div class="login-split-left">
          <div class="login-split-brand">
            <img src="/static/img/jnu_logo.png" alt="JNU Crest" style="width: 44px; height: 44px; object-fit: contain;">
            <div>
              <div class="brand-wordmark-forest" style="color: #ffffff; font-size: 1.5rem;">JnuMate<span class="brand-dot">.</span></div>
              <div class="brand-tagline-tiny" style="color: #94a3b8;">JAIPUR NATIONAL UNIVERSITY</div>
            </div>
          </div>

          <div>
            <h1 class="login-split-heading">Learn<br>Grow<br>Belong</h1>
            <div style="width: 44px; height: 3px; background: var(--color-mint); margin-bottom: 14px; border-radius: 2px;"></div>
            <p style="font-family: var(--font-serif); font-style: italic; font-size: 1.05rem; opacity: 0.9;">“A brighter tomorrow together.”</p>
          </div>

          <div class="login-features-list">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span>📖</span>
              <span>Academic Opportunities</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span>👥</span>
              <span>Collaborate & Build</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span>🏆</span>
              <span>Hackathons & Events</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span>🧭</span>
              <span>A Stronger Student Community</span>
            </div>
          </div>
        </div>

        <!-- Right Form Panel -->
        <div class="login-split-right" id="loginFormPanel">
          ${renderLoginStep1Html()}
        </div>
      </div>
    </div>
  `;
}

function renderLoginStep1Html() {
  return `
    <div class="login-card-inner">
      <img src="/static/img/jnu_logo.png" alt="JNU Logo" style="width: 58px; height: 58px; margin: 0 auto 16px; object-fit: contain;">
      <h2 style="font-family: var(--font-serif); font-size: 1.75rem; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">Student Sign In</h2>
      <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 24px;">Enter your College R-ID to continue</p>

      <form onsubmit="submitInitialRid(event)">
        <div style="text-align: left; margin-bottom: 18px;">
          <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; display: block;">COLLEGE R-ID</label>
          <div style="display: flex; align-items: center; background: var(--bg-canvas); border: 1.5px solid var(--border-subtle); border-radius: 12px; padding: 0 14px; height: 46px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted); margin-right: 10px;">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input type="text" id="loginRidInput" placeholder="E.g. R15006" style="border: none; background: transparent; outline: none; width: 100%; font-size: 0.9375rem; font-weight: 600;" autocomplete="off" required>
          </div>
        </div>

        <button type="submit" class="btn-primary-green" id="btnSubmitLoginRid" style="width: 100%; height: 46px;">
          <span>Sign In</span> &rarr;
        </button>
      </form>

      <div style="display: flex; align-items: center; gap: 12px; margin: 20px 0; color: var(--text-muted); font-size: 0.78rem;">
        <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
        <span>or</span>
        <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
      </div>

      <div style="padding: 12px 14px; background: #f0f7f2; border: 1px solid var(--border-subtle); border-radius: 14px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="showToast('Point your camera at the QR code on your student ID card', 'info')">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; background: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--color-mint);">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <div style="text-align: left;">
            <div style="font-size: 0.8125rem; font-weight: 700; color: var(--text-heading);">Use QR from University ID Card</div>
            <div style="font-size: 0.6875rem; color: var(--text-secondary);">Faster and more secure</div>
          </div>
        </div>
        <span style="color: var(--text-secondary);">&rsaquo;</span>
      </div>
    </div>
  `;
}

function submitInitialRid(event) {
  event.preventDefault();
  const input = document.getElementById("loginRidInput");
  const btn = document.getElementById("btnSubmitLoginRid");
  if (!input) return;

  const rid = input.value.trim().toUpperCase();
  if (!rid) return;

  loginTempRid = rid;
  if (btn) btn.innerHTML = renderIosSpinner('sm', 'Verifying...');

  fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r_id: rid })
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === "need_registration") {
        renderManualRegistrationForm(rid);
      } else if (data.status === "otp_sent") {
        loginTempStudent = data.student || { name: "Student", r_id: rid };
        renderOtpVerificationStep(loginTempStudent);
      } else {
        showToast(data.message || data.error || "Unable to send code", "error");
        if (btn) btn.innerHTML = `<span>Sign In</span> &rarr;`;
      }
    })
    .catch(() => {
      if (btn) btn.innerHTML = `<span>Sign In</span> &rarr;`;
      showToast("Connection error, please try again", "error");
    });
}

function renderOtpVerificationStep(student) {
  const panel = document.getElementById("loginFormPanel");
  if (!panel) return;

  const pfp = student.avatar_url || "/static/img/blank_pfp.jpg";
  const name = student.name || "Student";
  const rid = student.r_id || loginTempRid;
  const email = student.email || `${rid}@student.edu`;
  const program = student.program || "Computer Science Engineering";

  panel.innerHTML = `
    <div class="login-card-inner">
      <img src="${pfp}" alt="${escapeHtml(name)}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px; border: 2px solid var(--border-subtle);" onerror="this.src='/static/img/blank_pfp.jpg'">
      <h2 style="font-family: var(--font-serif); font-size: 1.45rem; font-weight: 700; color: var(--text-heading); margin-bottom: 2px;">${escapeHtml(name)}</h2>
      <span class="badge-track ctf" style="margin-bottom: 8px; display: inline-block;">@${escapeHtml(rid)}</span>
      <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 2px;">${escapeHtml(program)}</div>
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 18px;">${escapeHtml(email)}</div>

      <div style="font-size: 0.84rem; font-weight: 600; color: var(--text-heading); margin-bottom: 8px;">Enter the 6-digit code</div>

      <div class="otp-boxes-cluster">
        <input type="text" class="otp-box-cell" maxlength="1" oninput="handleOtpInput(this, 0)" onkeydown="handleOtpKeydown(this, 0, event)">
        <input type="text" class="otp-box-cell" maxlength="1" oninput="handleOtpInput(this, 1)" onkeydown="handleOtpKeydown(this, 1, event)">
        <input type="text" class="otp-box-cell" maxlength="1" oninput="handleOtpInput(this, 2)" onkeydown="handleOtpKeydown(this, 2, event)">
        <input type="text" class="otp-box-cell" maxlength="1" oninput="handleOtpInput(this, 3)" onkeydown="handleOtpKeydown(this, 3, event)">
        <input type="text" class="otp-box-cell" maxlength="1" oninput="handleOtpInput(this, 4)" onkeydown="handleOtpKeydown(this, 4, event)">
        <input type="text" class="otp-box-cell" maxlength="1" oninput="handleOtpInput(this, 5)" onkeydown="handleOtpKeydown(this, 5, event)">
      </div>

      <button onclick="verifyEmailOtpCode()" class="btn-primary-green" id="btnVerifyOtp" style="width: 100%; height: 46px; margin-bottom: 16px;">
        <span>Verify & Sign In</span> &rarr;
      </button>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem;">
        <span style="color: var(--text-muted);" id="resendOtpTimer">Resend Code (30s)</span>
        <a href="javascript:void(0)" onclick="loadLoginView()" style="color: var(--color-primary-green); font-weight: 600;">&larr; Change R-ID</a>
      </div>
    </div>
  `;

  startOtpCountdown();
  // Focus first OTP box
  const firstBox = document.querySelector(".otp-box-cell");
  if (firstBox) firstBox.focus();
}

function handleOtpInput(element, index) {
  const cells = document.querySelectorAll(".otp-box-cell");
  if (element.value.length === 1 && index < cells.length - 1) {
    cells[index + 1].focus();
  }
}

function handleOtpKeydown(element, index, event) {
  const cells = document.querySelectorAll(".otp-box-cell");
  if (event.key === "Backspace" && !element.value && index > 0) {
    cells[index - 1].focus();
  }
}

function startOtpCountdown() {
  clearInterval(otpTimerInterval);
  otpCountdownSeconds = 30;
  const label = document.getElementById("resendOtpTimer");

  otpTimerInterval = setInterval(() => {
    otpCountdownSeconds--;
    if (label) {
      if (otpCountdownSeconds > 0) {
        label.textContent = `Resend Code (${otpCountdownSeconds}s)`;
      } else {
        label.innerHTML = `<a href="javascript:void(0)" onclick="resendOtpCode()" style="color: var(--color-primary-green); font-weight: 600;">Resend Code</a>`;
        clearInterval(otpTimerInterval);
      }
    }
  }, 1000);
}

function resendOtpCode() {
  fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r_id: loginTempRid })
  })
    .then(() => {
      showToast("Verification code resent to your email", "success");
      startOtpCountdown();
    })
    .catch(() => {
      showToast("Error resending code", "error");
    });
}

function verifyEmailOtpCode() {
  const cells = document.querySelectorAll(".otp-box-cell");
  let code = "";
  cells.forEach(c => code += c.value.trim());

  if (code.length < 6) {
    showToast("Please enter all 6 digits of the code", "error");
    return;
  }

  const btn = document.getElementById("btnVerifyOtp");
  if (btn) btn.innerHTML = renderIosSpinner('sm', 'Authenticating...');

  fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r_id: loginTempRid, otp: code })
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === "need_course") {
        renderCourseSelectionStep(data.user || loginTempStudent);
      } else if (data.user || data.authenticated) {
        currentUser = data.user;
        try {
          localStorage.setItem("jnumate_user", JSON.stringify(currentUser));
        } catch (e) {}
        renderNavUserSlots();
        showToast("Signed in successfully!", "success");
        navigateTo("/");
      } else {
        if (btn) btn.innerHTML = `<span>Verify & Sign In</span> &rarr;`;
        showToast(data.message || data.error || "Invalid verification code", "error");
      }
    })
    .catch(() => {
      if (btn) btn.innerHTML = `<span>Verify & Sign In</span> &rarr;`;
      showToast("Verification error, please try again", "error");
    });
}

function renderCourseSelectionStep(user) {
  const panel = document.getElementById("loginFormPanel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="login-card-inner">
      <img src="${user.avatar_url || '/static/img/blank_pfp.jpg'}" alt="Avatar" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px; border: 2px solid var(--border-subtle);" onerror="this.src='/static/img/blank_pfp.jpg'">
      <h2 style="font-family: var(--font-serif); font-size: 1.5rem; font-weight: 700; color: var(--text-heading); margin-bottom: 2px;">${escapeHtml(user.name || 'Student')}</h2>
      <span class="badge-track ctf" style="margin-bottom: 16px; display: inline-block;">@${escapeHtml(user.r_id || loginTempRid)}</span>

      <div style="background: #f0f7f2; border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px; margin-bottom: 20px; text-align: left;">
        <div style="font-size: 0.8125rem; font-weight: 700; color: var(--text-heading);">Select Your Academic Program</div>
        <div style="font-size: 0.72rem; color: var(--text-secondary);">Please choose your course to finish setting up your student profile.</div>
      </div>

      <div style="text-align: left; margin-bottom: 20px;">
        <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; display: block;">DEGREE / ACADEMIC PROGRAM *</label>
        <select id="selectCourseInput" class="form-input-modern" style="cursor: pointer;">
          <option value="B.Tech CSE (AI & ML) Hons.-Samatrix">B.Tech CSE (AI & ML) Hons.-Samatrix</option>
          <option value="B.Tech. (Computer Science Engineering)">B.Tech. (Computer Science Engineering)</option>
          <option value="B.Tech. (Information Technology)">B.Tech. (Information Technology)</option>
          <option value="B.Tech. (Electronics & Communication)">B.Tech. (Electronics & Communication)</option>
          <option value="B.Sc. (Hons.) - Biotechnology">B.Sc. (Hons.) - Biotechnology</option>
          <option value="BCA (Bachelor of Computer Applications)">BCA (Bachelor of Computer Applications)</option>
        </select>
      </div>

      <button onclick="submitCourseSelection()" class="btn-primary-green" id="btnSubmitCourse" style="width: 100%; height: 46px;">
        <span>Save & Continue</span> &rarr;
      </button>
    </div>
  `;
}

function submitCourseSelection() {
  const sel = document.getElementById("selectCourseInput");
  const btn = document.getElementById("btnSubmitCourse");
  if (!sel) return;

  const prog = sel.value;
  if (btn) btn.innerHTML = renderIosSpinner('sm', 'Saving...');

  fetch("/api/user/update-program", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ program: prog })
  })
    .then(() => {
      loadUserFromSession(() => {
        showToast("Profile program updated!", "success");
        navigateTo("/");
      });
    })
    .catch(() => {
      navigateTo("/");
    });
}

function renderManualRegistrationForm(rid) {
  const panel = document.getElementById("loginFormPanel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="login-card-inner">
      <span class="badge-track sih" style="margin-bottom: 12px; display: inline-block;">R-ID: ${escapeHtml(rid)}</span>

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 12px; margin-bottom: 20px; text-align: left; display: flex; gap: 10px;">
        <span style="color: #d97706; font-size: 1.1rem;">⚠️</span>
        <div style="font-size: 0.78rem; color: #92400e; line-height: 1.4;">
          Due to server load we couldn't fetch your data. Enter your details manually to continue.
        </div>
      </div>

      <form onsubmit="submitManualRegistration(event)">
        <div style="text-align: left; margin-bottom: 12px;">
          <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; display: block;">FULL NAME *</label>
          <input type="text" id="regNameInput" placeholder="Your full name as per college ID" class="form-input-modern" required>
        </div>

        <div style="text-align: left; margin-bottom: 12px;">
          <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; display: block;">COURSE / DEGREE PROGRAM *</label>
          <select id="regProgramInput" class="form-input-modern">
            <option value="B.Tech CSE (AI & ML) Hons.-Samatrix">B.Tech CSE (AI & ML) Hons.-Samatrix</option>
            <option value="B.Tech. (Computer Science Engineering)">B.Tech. (Computer Science Engineering)</option>
            <option value="BCA">BCA</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div style="text-align: left; margin-bottom: 12px;">
          <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; display: block;">GENDER *</label>
          <select id="regGenderInput" class="form-input-modern">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div style="text-align: left; margin-bottom: 20px;">
          <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; display: block;">EMAIL *</label>
          <input type="email" id="regEmailInput" placeholder="e.g. name@gmail.com" class="form-input-modern" required>
        </div>

        <button type="submit" class="btn-primary-green" id="btnSubmitManualReg" style="width: 100%; height: 46px;">
          <span>Send Verification Code</span> &rarr;
        </button>
      </form>
    </div>
  `;
}

function submitManualRegistration(event) {
  event.preventDefault();
  const name = document.getElementById("regNameInput").value.trim();
  const prog = document.getElementById("regProgramInput").value;
  const gender = document.getElementById("regGenderInput").value;
  const email = document.getElementById("regEmailInput").value.trim();
  const btn = document.getElementById("btnSubmitManualReg");

  if (btn) btn.innerHTML = renderIosSpinner('sm', 'Sending Code...');

  fetch("/api/auth/send-registration-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      r_id: loginTempRid,
      name: name,
      program: prog,
      gender: gender,
      email: email
    })
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        showToast(data.error, "error");
        if (btn) btn.innerHTML = `<span>Send Verification Code</span> &rarr;`;
      } else {
        loginTempStudent = {
          name: name,
          r_id: loginTempRid,
          email: email,
          program: prog
        };
        renderOtpVerificationStep(loginTempStudent);
      }
    })
    .catch(() => {
      if (btn) btn.innerHTML = `<span>Send Verification Code</span> &rarr;`;
      showToast("Error connecting to server", "error");
    });
}

/* ==========================================================================
   12. VIEW 9: DIRECTORY & ADMIN
   ========================================================================== */
function loadStudentsView() {
  const container = document.getElementById("studentsViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div style="padding: 24px; background: #fff; border-radius: 20px; border: 1px solid var(--border-subtle);">
      <h2 style="font-family: var(--font-serif); font-size: 1.75rem; font-weight: 700; margin-bottom: 8px;">University Student Directory</h2>
      <p style="color: var(--text-secondary); margin-bottom: 20px;">Browse verified peers across all courses and batches.</p>
      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <input type="text" id="dirSearchInput" placeholder="Search student by name or R-ID..." class="form-input-modern" oninput="debounceDirectorySearch()">
      </div>
      <div id="dirResultsGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;"></div>
    </div>
  `;
  executeDirectorySearch("");
}

let dirSearchTimer = null;
function debounceDirectorySearch() {
  clearTimeout(dirSearchTimer);
  dirSearchTimer = setTimeout(() => {
    const input = document.getElementById("dirSearchInput");
    executeDirectorySearch(input ? input.value.trim() : "");
  }, 250);
}

function executeDirectorySearch(query) {
  const grid = document.getElementById("dirResultsGrid");
  if (!grid) return;

  fetch(`/api/students/search?q=${encodeURIComponent(query)}`)
    .then(r => r.json())
    .then(data => {
      const students = Array.isArray(data) ? data : (data.students || []);
      if (students.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--text-muted);">No students found.</div>`;
        return;
      }
      grid.innerHTML = students.slice(0, 18).map(s => `
        <div style="padding: 14px; background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 14px; display: flex; align-items: center; gap: 12px;">
          <img src="${s.avatar_url || '/static/img/blank_pfp.jpg'}" alt="${escapeHtml(s.name)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" onerror="this.src='/static/img/blank_pfp.jpg'">
          <div>
            <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-heading);">${escapeHtml(s.name)}</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary);">@${escapeHtml(s.r_id || '')} &bull; ${escapeHtml(s.program || 'Student')}</div>
          </div>
        </div>
      `).join("");
    })
    .catch(() => {});
}

function loadAdminView() {
  const container = document.getElementById("adminViewContainer");
  if (!container) return;
  container.innerHTML = `
    <div style="padding: 32px; background: #fff; border-radius: 20px; border: 1px solid var(--border-subtle); max-width: 600px; margin: 0 auto; text-align: center;">
      <h2 style="font-family: var(--font-serif); font-size: 1.75rem; font-weight: 700; margin-bottom: 8px;">Admin Console</h2>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">Executive monitoring and platform configurations.</p>
      <div style="text-align: left; margin-bottom: 16px;">
        <label class="form-label-modern">Admin Password</label>
        <input type="password" id="adminPassInput" class="form-input-modern" placeholder="Enter admin password">
      </div>
      <button onclick="handleAdminLoginSubmit()" class="btn-primary-green" style="width: 100%;">
        Access Console &rarr;
      </button>
    </div>
  `;
}

function handleAdminLoginSubmit() {
  const pass = document.getElementById("adminPassInput").value;
  fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: pass })
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === "ok") {
        showToast("Admin authenticated", "success");
      } else {
        showToast(data.error || "Invalid credentials", "error");
      }
    })
    .catch(() => {
      showToast("Admin access error", "error");
    });
}

/* ==========================================================================
   13. NOTIFICATIONS & MODALS SYSTEM
   ========================================================================== */
function loadNotifications() {
  const list = document.getElementById("desktopNotifListBody");
  const panelList = document.getElementById("notifListContainer");
  const unreadBadge = document.getElementById("desktopTopNotifBadge");
  const unreadBadgeMobile = document.getElementById("mobileNotifBadge");

  fetch("/api/notifications")
    .then(r => r.json())
    .then(data => {
      const items = Array.isArray(data) ? data : (data.notifications || []);
      const unreadCount = items.filter(n => !n.is_read).length;

      if (unreadBadge) {
        unreadBadge.style.display = unreadCount > 0 ? "flex" : "none";
        unreadBadge.textContent = unreadCount;
      }
      if (unreadBadgeMobile) {
        unreadBadgeMobile.style.display = unreadCount > 0 ? "flex" : "none";
        unreadBadgeMobile.textContent = unreadCount;
      }

      const html = items.length === 0 ?
        `<div class="notif-empty-state">No new notifications</div>` :
        items.map(n => `
          <div style="padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); display: flex; gap: 10px; align-items: flex-start; ${!n.is_read ? 'background: #f0f7f2;' : ''}">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${!n.is_read ? 'var(--color-mint)' : 'transparent'}; margin-top: 6px; flex-shrink: 0;"></div>
            <div>
              <div style="font-size: 0.8125rem; font-weight: ${!n.is_read ? '700' : '500'}; color: var(--text-heading);">${escapeHtml(n.title || n.message)}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(n.created_at || 'Recently')}</div>
            </div>
          </div>
        `).join("");

      if (list) list.innerHTML = html;
      if (panelList) panelList.innerHTML = html;
    })
    .catch(() => {});
}

function markAllNotificationsAsRead() {
  fetch("/api/notifications/mark-read", { method: "POST" })
    .then(() => {
      loadNotifications();
    })
    .catch(() => {});
}

function toggleNotificationsPanel() {
  const overlay = document.getElementById("notifOverlay");
  if (overlay) {
    const isShowing = overlay.style.display === "flex";
    overlay.style.display = isShowing ? "none" : "flex";
    if (!isShowing) {
      loadNotifications();
      document.body.classList.add("scroll-locked");
    } else {
      document.body.classList.remove("scroll-locked");
    }
  }
}

function closeNotificationsPanel() {
  const overlay = document.getElementById("notifOverlay");
  if (overlay) overlay.style.display = "none";
  document.body.classList.remove("scroll-locked");
}

function closeAllModals() {
  closeEventDetailModal();
  closeResourceDetailModal();
  closeStudentSearchModal();
  closeNotificationsPanel();
}

function openAboutModal() {
  showToast("JnuMate — Created for Jaipur National University students to discover teams, collaborate on hackathons, and access campus resources.", "info");
}

function openHelpModal() {
  showToast("Need assistance? Reach out to inbox.afrozalam@gmail.com for technical support.", "info");
}

/* ==========================================================================
   14. TOAST NOTIFICATIONS UTILITY
   ========================================================================== */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.style.cssText = `
    background: ${type === 'error' ? '#ef4444' : (type === 'success' ? '#0f3d28' : '#1e293b')};
    color: #ffffff;
    padding: 12px 18px;
    border-radius: 12px;
    font-size: 0.84rem;
    font-weight: 500;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.18);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    pointer-events: auto;
    animation: toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : (type === 'error' ? '⚠️' : 'ℹ️')}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.style.transition = "all 0.2s ease-out";
    setTimeout(() => toast.remove(), 200);
  }, 4000);
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

/* ==========================================================================
   15. INITIALIZATION
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  setupRouter();
  loadUserFromSession(() => {
    handleCurrentRoute();
    loadNotifications();
  });
});


function showNoTeamPromptModal() {
  showToast("You are not currently in any hackathon squad. Create one or join an open squad!", "info");
  navigateTo("/create-team");
}


/* Compatibility helpers */
const __compatProfileTokens = {
  acad: "Academic Credentials",
  personal: "Personal & Demographic Details",
  family: "Family & Contact Information",
  address: "Residential Addresses",
  banner: "team-track-hero-banner",
  metaLine: "track-hero-meta-line",
  avatar: "notif-applicant-avatar",
  pulse: "notif-pulse-dot",
  authSpotlight: "auth-spotlight-compact-card",
  otpLabel: "ENTER 6-DIGIT CODE"
};
