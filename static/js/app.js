/**
 * HackMate — iOS 27 Liquid Glass SPA Engine
 * Genuine Liquid Glass physics, complete information preservation, and high performance.
 */

let currentUser = null;
let currentSearchAbortController = null;
let friendSearchAbortController = null;
let selectedFriends = [];
let discoverFilter = 'all';
let discoverSearchTerm = '';
let discoverSearchDebounce = null;

// In-Memory Client Cache for immediate rendering
const clientCache = {
  teamsList: null,
  teamsMap: {},
  userProfiles: {}
};

document.addEventListener("DOMContentLoaded", () => {
  loadUserFromSession();
  setupRouter();
  handleCurrentRoute();
});

/* ==========================================================================
   1. CLIENT-SIDE SPA ROUTER & LINK PREFETCHER
   ========================================================================== */
function setupRouter() {
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest("a");
    if (anchor && anchor.href && anchor.origin === window.location.origin) {
      const targetPath = anchor.pathname;
      if (anchor.target === "_blank") return;

      e.preventDefault();
      if (window.location.pathname !== targetPath) {
        history.pushState(null, "", targetPath);
        handleCurrentRoute();
      }
    }
  });

  window.addEventListener("popstate", () => {
    handleCurrentRoute();
  });
}

function navigateTo(path) {
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
  } else {
    history.replaceState(null, "", "/");
    handleCurrentRoute();
  }
}

function highlightActiveNavLinks() {
  const path = window.location.pathname;
  
  document.querySelectorAll(".nav-link-glass").forEach(link => {
    const href = link.getAttribute("href");
    if (href === path || (href !== "/" && path.startsWith(href))) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  document.querySelectorAll(".dock-item").forEach(item => {
    const href = item.getAttribute("href");
    if (href === path || (href !== "/" && path.startsWith(href))) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

/* ==========================================================================
   2. AUTHENTICATION & SESSION MANAGEMENT
   ========================================================================== */
function loadUserFromSession() {
  fetch("/api/auth/me")
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        currentUser = data.user;
      } else {
        currentUser = null;
      }
      renderNavUserSlots();
    })
    .catch(err => {
      console.warn("Session check error:", err);
      currentUser = null;
      renderNavUserSlots();
    });
}

function renderNavUserSlots() {
  const dtSlot = document.getElementById("navUserSlotDesktop");
  const mbSlot = document.getElementById("navUserSlotMobile");

  if (currentUser) {
    const avatarImg = currentUser.avatar_url ? `
      <img src="${escapeHtml(currentUser.avatar_url)}" class="student-avatar" style="width:26px; height:26px;" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent('${currentUser.id}');">
    ` : `
      <div class="student-avatar-fallback" style="width:26px; height:26px; font-size:0.6875rem;">
        ${currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
      </div>
    `;

    const userHtml = `
      <div style="display:flex; align-items:center; gap:6px;">
        <a href="/profile" style="display:flex; align-items:center; gap:6px; text-decoration:none;">
          ${avatarImg}
          <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${escapeHtml(currentUser.name || currentUser.id)}</span>
        </a>
        <button onclick="logoutUser()" class="btn-secondary" style="height:28px; padding:0 8px; font-size:0.6875rem;">Sign Out</button>
      </div>
    `;
    if (dtSlot) dtSlot.innerHTML = userHtml;
    if (mbSlot) mbSlot.innerHTML = userHtml;
  } else {
    const loginHtml = `
      <a href="/login" class="btn-primary" style="height:30px; padding:0 10px; font-size:0.75rem;">Sign In</a>
    `;
    if (dtSlot) dtSlot.innerHTML = loginHtml;
    if (mbSlot) mbSlot.innerHTML = loginHtml;
  }
}

function sendEmailOtpCode() {
  const ridInput = document.getElementById("authRidInput");
  const btn = document.getElementById("btnSendOtp");
  if (!ridInput || !ridInput.value.trim()) {
    showToast("Please enter your College R-ID", "error");
    return;
  }

  const rid = ridInput.value.trim().toUpperCase();
  btn.disabled = true;
  btn.innerText = "Sending code...";

  fetch("/api/auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rid: rid })
  })
    .then(res => res.json())
    .then(data => {
      btn.disabled = false;
      btn.innerText = "Send Verification Code";
      if (data.success) {
        document.getElementById("targetEmailDisplay").innerText = data.masked_email || "your registered email";
        showAuthStep(2);
        showToast("Verification code dispatched!", "success");
      } else {
        showToast(data.message || "Failed to send code", "error");
      }
    })
    .catch(err => {
      btn.disabled = false;
      btn.innerText = "Send Verification Code";
      showToast("Network error requesting verification code", "error");
    });
}

function verifyEmailOtpCode() {
  const ridInput = document.getElementById("authRidInput");
  const otpInput = document.getElementById("otpCodeInput");
  const btn = document.getElementById("btnVerifyOtp");

  if (!otpInput || !otpInput.value.trim()) {
    showToast("Please enter 6-digit verification code", "error");
    return;
  }

  const rid = ridInput.value.trim().toUpperCase();
  const otp = otpInput.value.trim();

  btn.disabled = true;
  btn.innerText = "Verifying...";

  fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rid: rid, otp: otp })
  })
    .then(res => res.json())
    .then(data => {
      btn.disabled = false;
      btn.innerText = "Verify & Sign In";
      if (data.success) {
        currentUser = data.user;
        renderNavUserSlots();
        showToast("Signed in successfully!", "success");
        navigateTo("/");
      } else {
        showToast(data.message || "Invalid verification code", "error");
      }
    })
    .catch(err => {
      btn.disabled = false;
      btn.innerText = "Verify & Sign In";
      showToast("Verification network error", "error");
    });
}

function showAuthStep(step) {
  const s1 = document.getElementById("authStep1");
  const s2 = document.getElementById("authStep2");
  const sReg = document.getElementById("authStepRegister");

  if (s1) s1.style.display = step === 1 ? "block" : "none";
  if (s2) s2.style.display = step === 2 ? "block" : "none";
  if (sReg) sReg.style.display = step === 3 ? "block" : "none";
}

function showManualRegister() {
  showAuthStep(3);
}

function submitManualRegister() {
  const rid = document.getElementById("regRid").value.trim().toUpperCase();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const gender = document.getElementById("regGender").value;
  const dob = document.getElementById("regDob").value.trim();

  if (!rid || !name || !email) {
    showToast("Please fill in R-ID, Name, and Email", "error");
    return;
  }

  fetch("/api/auth/register-unlisted", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: rid, name: name, email: email, gender: gender, dob: dob })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        currentUser = data.user;
        renderNavUserSlots();
        showToast("Account registered and signed in!", "success");
        navigateTo("/");
      } else {
        showToast(data.message || "Registration failed", "error");
      }
    })
    .catch(err => {
      showToast("Network error during registration", "error");
    });
}

function logoutUser() {
  fetch("/api/auth/logout", { method: "POST" })
    .then(() => {
      currentUser = null;
      renderNavUserSlots();
      showToast("Signed out", "info");
      navigateTo("/");
    })
    .catch(err => {
      currentUser = null;
      renderNavUserSlots();
      navigateTo("/");
    });
}

function loadLoginView() {
  showAuthStep(1);
  const ridInput = document.getElementById("authRidInput");
  if (ridInput) ridInput.value = "";
  const otpInput = document.getElementById("otpCodeInput");
  if (otpInput) otpInput.value = "";
}

/* ==========================================================================
   3. DISCOVER TEAMS VIEW (CONTENT-DRIVEN 2-COLUMN MOBILE CARDS)
   ========================================================================== */
function loadDiscoverView() {
  if (clientCache.teamsList) {
    renderTeamsGrid(clientCache.teamsList);
  } else {
    renderTeamsSkeleton();
  }

  fetch("/api/teams")
    .then(res => res.json())
    .then(data => {
      const teams = data.teams || data;
      clientCache.teamsList = teams;
      renderTeamsGrid(teams);
    })
    .catch(err => console.error("Error fetching teams:", err));
}

function renderTeamsSkeleton() {
  const container = document.getElementById("teamsGridContainer");
  if (!container) return;

  let skeletonHtml = "";
  for (let i = 0; i < 6; i++) {
    skeletonHtml += `<div class="glass-card-compact glass-skeleton" style="height:130px;"></div>`;
  }
  container.innerHTML = skeletonHtml;
}

function renderTeamsGrid(teams) {
  const container = document.getElementById("teamsGridContainer");
  const emptyState = document.getElementById("emptyStateContainer");
  if (!container) return;

  let filtered = teams.filter(t => {
    const title = t.title || t.name || "";
    const desc = t.description || "";
    const matchesSearch = !discoverSearchTerm || 
      title.toLowerCase().includes(discoverSearchTerm) || 
      desc.toLowerCase().includes(discoverSearchTerm);
    const memberCount = t.members ? t.members.length : (t.member_count || 1);
    const matchesFilter = discoverFilter === "all" || (memberCount < 6);
    return matchesSearch && matchesFilter;
  });

  if (filtered.length === 0) {
    container.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  container.style.display = "grid";

  const isMobile = window.innerWidth <= 767;

  container.innerHTML = filtered.map(t => renderSingleTeamCard(t, isMobile)).join("");
}

/**
 * Single Unified Team Card Component
 * Shared between Discover and Profile pages for complete visual consistency.
 */
function renderSingleTeamCard(t, isMobile) {
  const title = t.title || t.name || "Untitled Team";
  const desc = t.description || "No pitch details provided.";
  const memberCount = t.members ? t.members.length : (t.member_count || 1);
  const isFull = memberCount >= 6;
  const openSlots = 6 - memberCount;

  // Actual Avatar Images in Stack
  let avatarsHtml = "";
  if (t.members && t.members.length > 0) {
    avatarsHtml = t.members.slice(0, 3).map(m => {
      const mId = m.student_id || m.r_id || "U";
      const mName = m.name || mId;
      const avatarSrc = m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mId)}`;
      return `
        <div class="avatar-stack-item" title="${escapeHtml(mName)}">
          <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(mName)}" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent('${mId}');">
        </div>
      `;
    }).join("");
    if (t.members.length > 3) {
      avatarsHtml += `<div class="avatar-stack-item">+${t.members.length - 3}</div>`;
    }
  }

  if (isMobile) {
    // Content-driven compact 2-column mobile card
    return `
      <a href="/team/${t.id}" class="glass-card-compact glass-card-interactive mobile-team-card">
        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <span class="glass-pill ${isFull ? 'glass-pill-full' : 'glass-pill-open'}" style="font-size:0.5rem; padding:1px 5px;">
              ${isFull ? 'FULL' : openSlots + ' OPEN'}
            </span>
            <div class="avatar-stack">${avatarsHtml}</div>
          </div>

          <h3 class="mobile-team-title">${escapeHtml(title)}</h3>
          <p class="mobile-team-pitch">${escapeHtml(desc)}</p>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px;">
          <span class="caption-text" style="font-size:0.625rem; font-weight:700;">${memberCount}/6 members</span>
          <span style="font-size:0.6875rem; color:var(--accent-blue); font-weight:700;">View ➔</span>
        </div>
      </a>
    `;
  }

  // Desktop Card
  return `
    <a href="/team/${t.id}" class="glass-card-compact glass-card-interactive">
      <div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <span class="glass-pill ${isFull ? 'glass-pill-full' : 'glass-pill-open'}">
            ${isFull ? 'Team Full (6/6)' : openSlots + ' Open Seats'}
          </span>
          <div class="avatar-stack">${avatarsHtml}</div>
        </div>

        <h3 class="card-title" style="margin-bottom:4px;">${escapeHtml(title)}</h3>
        <p class="secondary-text" style="line-height:1.4; margin-bottom:12px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
          ${escapeHtml(desc)}
        </p>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid var(--glass-t3-border); padding-top:8px; margin-top:4px;">
        <span class="caption-text">${memberCount} of 6 Seats Filled</span>
        <span style="font-size:0.75rem; font-weight:700; color:var(--accent-blue);">View Team ➔</span>
      </div>
    </a>
  `;
}

function debounceDiscoverSearch() {
  clearTimeout(discoverSearchDebounce);
  discoverSearchDebounce = setTimeout(() => {
    const input = document.getElementById("searchInput");
    if (input) {
      discoverSearchTerm = input.value.trim().toLowerCase();
      if (clientCache.teamsList) {
        renderTeamsGrid(clientCache.teamsList);
      }
    }
  }, 150);
}

function setDiscoverFilter(type) {
  discoverFilter = type;
  const btnAll = document.getElementById("btnFilterAll");
  const btnOpen = document.getElementById("btnFilterOpen");

  if (btnAll) btnAll.className = type === "all" ? "segmented-item active" : "segmented-item";
  if (btnOpen) btnOpen.className = type === "open" ? "segmented-item active" : "segmented-item";

  if (clientCache.teamsList) {
    renderTeamsGrid(clientCache.teamsList);
  }
}

/* ==========================================================================
   4. TEAM DETAIL VIEW (PRESERVING COMPLETE STUDENT INFORMATION ARCHITECTURE)
   ========================================================================== */
function loadTeamDetailView(teamId) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  container.innerHTML = `<div class="glass-surface-primary glass-skeleton" style="height:280px;"></div>`;

  const r_id = currentUser ? currentUser.id : "";
  fetch(`/api/teams/${teamId}?r_id=${encodeURIComponent(r_id)}`)
    .then(res => res.json())
    .then(data => {
      const team = data.team || data;
      if (data.error || !team || team.error) {
        container.innerHTML = `<div class="glass-surface-primary" style="text-align:center; padding:32px;"><h3 style="color:var(--accent-red);">Team Not Found</h3></div>`;
        return;
      }
      renderTeamDetail(team);
    })
    .catch(err => {
      container.innerHTML = `<div class="glass-surface-primary" style="text-align:center; padding:32px;"><h3 style="color:var(--accent-red);">Error loading team details</h3></div>`;
    });
}

function renderTeamDetail(team) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  const title = team.title || team.name || "Untitled Team";
  const leaderId = (team.leader_id || team.leader_r_id || "").toUpperCase();
  const currentUserId = currentUser ? currentUser.id.toUpperCase() : null;
  const isLeader = currentUserId && currentUserId === leaderId;
  const isMember = currentUserId && team.members.some(m => ((m.student_id || m.r_id || "").toUpperCase()) === currentUserId);
  const isFull = team.members.length >= 6;

  // Complete Student Information Member Cards
  let seatsHtml = "";
  for (let i = 0; i < 6; i++) {
    const member = team.members[i];
    if (member) {
      const mId = member.student_id || member.r_id || "U";
      const mName = member.name || mId;
      const mRole = (member.role || "member").toLowerCase();
      const isTeamLeader = mRole === "leader" || mId.toUpperCase() === leaderId;
      const isMe = currentUserId && mId.toUpperCase() === currentUserId;
      const canRemove = isLeader && !isTeamLeader;

      const avatarSrc = member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mId)}`;

      seatsHtml += `
        <div class="member-card">
          <div class="member-info-col">
            <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(mName)}" class="student-avatar" style="width:36px; height:36px;" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent('${mId}');">
            
            <div class="member-details">
              <!-- Primary: Name & Role -->
              <div class="member-name-row">
                <span style="font-size:0.875rem; font-weight:700; color:var(--text-primary);">${escapeHtml(mName)}</span>
                ${isMe ? `<span class="glass-pill glass-pill-user">(You)</span>` : ""}
                <span class="glass-pill ${isTeamLeader ? 'glass-pill-leader' : 'glass-pill-full'}">${isTeamLeader ? 'Leader' : 'Member'}</span>
              </div>

              <!-- Essential Metadata: R-ID & Gender -->
              <div class="member-meta-row">
                <span class="caption-text">${escapeHtml(mId)} • ${escapeHtml(member.gender || 'Student')}</span>
              </div>

              <!-- Secondary Information: Email & DOB -->
              <div class="member-meta-row" style="margin-top:2px;">
                ${member.email ? `<a href="mailto:${escapeHtml(member.email)}" class="caption-text" style="color:var(--accent-blue); text-decoration:none;">${escapeHtml(member.email)}</a>` : ""}
                ${member.dob && member.dob !== 'N/A' ? `<span class="caption-text">• DOB: ${escapeHtml(member.dob)}</span>` : ""}
              </div>
            </div>
          </div>

          <!-- Leader Action: Remove -->
          ${canRemove ? `
            <div class="member-action-col">
              <button onclick="confirmRemoveMember('${team.id}', '${mId}', '${escapeHtml(mName)}')" class="btn-danger" style="height:28px; padding:0 8px; font-size:0.6875rem;">
                Remove
              </button>
            </div>
          ` : ""}
        </div>
      `;
    } else {
      seatsHtml += `
        <div class="member-card" style="border:1px dashed var(--glass-t3-border); background:transparent; opacity:0.65;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; border-radius:50%; border:1.5px dashed var(--text-tertiary); display:flex; align-items:center; justify-content:center; color:var(--text-tertiary); font-size:0.75rem; font-weight:700;">
              +
            </div>
            <div>
              <div class="secondary-text" style="font-weight:700;">Seat ${i + 1} Open</div>
              <div class="caption-text">Available for join requests</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Join Action Panel
  let actionPanelHtml = "";
  if (currentUser) {
    if (isLeader) {
      actionPanelHtml = `
        <div style="display:flex; gap:10px; margin-top:16px;">
          <button onclick="confirmDisbandTeam('${team.id}')" class="btn-danger">
            Disband Team
          </button>
        </div>
      `;
    } else if (isMember) {
      actionPanelHtml = `
        <div style="margin-top:16px;">
          <button onclick="confirmLeaveTeam('${team.id}')" class="btn-danger">
            Leave Team
          </button>
        </div>
      `;
    } else if (!isFull) {
      actionPanelHtml = `
        <div class="glass-card-compact" style="margin-top:18px; padding:14px; background:rgba(255,255,255,0.85);">
          <h4 class="section-title" style="font-size:0.875rem; margin-bottom:4px;">Request to Join Team</h4>
          <p class="secondary-text" style="margin-bottom:8px;">Send a short note to the team leader explaining your skills or interest.</p>
          <textarea id="joinMessageInput" rows="2" placeholder="e.g. Hi, I excel at Frontend & React!" class="glass-textarea" style="margin-bottom:8px;"></textarea>
          <button onclick="submitJoinRequest('${team.id}')" class="btn-primary" style="height:36px; width:100%;">
            Send Join Request
          </button>
        </div>
      `;
    }
  } else {
    actionPanelHtml = `
      <div class="glass-card-compact" style="margin-top:18px; text-align:center; padding:14px;">
        <p class="secondary-text" style="margin-bottom:8px;">Sign in with your R-ID to request to join this team.</p>
        <a href="/login" class="btn-primary" style="display:inline-flex;">Sign In to Request</a>
      </div>
    `;
  }

  // WhatsApp Banner
  let whatsappBannerHtml = "";
  if (team.whatsapp_link && (isMember || isLeader)) {
    whatsappBannerHtml = `
      <div style="padding:10px 14px; background:var(--accent-green-bg); border:1px solid rgba(52, 199, 89, 0.2); border-radius:var(--r-control); margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div>
          <div style="font-size:0.8125rem; font-weight:700; color:#2E7D32;">Official WhatsApp Group Link</div>
          <div class="caption-text">Collaborate with your hackathon teammates</div>
        </div>
        <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" class="btn-primary" style="background:#34A853; border-color:rgba(255,255,255,0.3); height:30px; padding:0 10px; font-size:0.75rem;">
          Join WhatsApp ➔
        </a>
      </div>
    `;
  }

  // Leader Pending Requests Section
  let leaderRequestsHtml = "";
  if (isLeader) {
    leaderRequestsHtml = `
      <div id="leaderPendingRequestsWrapper" style="margin-top:20px; border-top:1px solid var(--glass-t3-border); padding-top:16px;">
        <h3 class="section-title" style="font-size:0.875rem;">Pending Join Requests</h3>
        <div id="teamPendingRequestsList">
          <div class="caption-text">Checking for pending requests...</div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="glass-surface-primary">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span class="glass-pill ${isFull ? 'glass-pill-full' : 'glass-pill-open'}">
          ${isFull ? 'Team Full (6/6)' : (6 - team.members.length) + ' Open Seats'}
        </span>
        <span class="caption-text">Team #${team.id}</span>
      </div>

      <h1 class="page-title">${escapeHtml(title)}</h1>
      <p class="body-text" style="margin-bottom:16px;">
        ${escapeHtml(team.description || "No project pitch provided.")}
      </p>

      ${whatsappBannerHtml}

      <h3 class="caption-text" style="text-transform:uppercase; letter-spacing:0.03em; margin-bottom:8px;">
        Team Roster (${team.members.length} / 6 Members)
      </h3>

      <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:8px;">
        ${seatsHtml}
      </div>

      ${actionPanelHtml}
      ${leaderRequestsHtml}
    </div>
  `;

  if (isLeader) {
    fetchTeamJoinRequests(team.id);
  }
}

function fetchTeamJoinRequests(teamId) {
  const reqContainer = document.getElementById("teamPendingRequestsList");
  if (!reqContainer) return;

  const leaderRid = currentUser ? currentUser.id : "";
  fetch(`/api/teams/${teamId}/requests?leader_r_id=${encodeURIComponent(leaderRid)}`)
    .then(res => res.json())
    .then(data => {
      const requests = data.requests || [];
      if (requests.length === 0) {
        reqContainer.innerHTML = `<div class="caption-text">No pending join requests.</div>`;
        return;
      }

      reqContainer.innerHTML = requests.map(r => {
        const avatarSrc = r.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.r_id)}`;
        return `
          <div id="requestRow_${r.request_id}" class="member-card" style="padding:10px 12px; margin-top:6px;">
            <div class="member-info-col">
              <img src="${escapeHtml(avatarSrc)}" class="student-avatar" style="width:32px; height:32px;" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent('${r.r_id}');">
              <div class="member-details">
                <div class="member-name-row">
                  <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${escapeHtml(r.name || r.r_id)}</span>
                  <span class="caption-text">${r.r_id} • ${r.gender || 'Student'}</span>
                </div>
                ${r.message ? `<div class="caption-text" style="color:var(--text-secondary); margin-top:2px;">"${escapeHtml(r.message)}"</div>` : ""}
              </div>
            </div>

            <div style="display:flex; gap:6px;">
              <button onclick="handleRequestAction('${teamId}', '${r.request_id}', 'accept')" class="btn-tonal" style="height:28px; padding:0 8px; font-size:0.6875rem;">
                Accept
              </button>
              <button onclick="handleRequestAction('${teamId}', '${r.request_id}', 'reject')" class="btn-danger" style="height:28px; padding:0 8px; font-size:0.6875rem;">
                Decline
              </button>
            </div>
          </div>
        `;
      }).join("");
    })
    .catch(err => {
      reqContainer.innerHTML = `<div class="caption-text" style="color:var(--accent-red);">Failed to load requests.</div>`;
    });
}

function handleRequestAction(teamId, reqId, action) {
  const row = document.getElementById(`requestRow_${reqId}`);
  if (row) {
    row.style.opacity = "0.5";
    row.style.pointerEvents = "none";
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
        showToast(action === 'accept' ? "Teammate accepted!" : "Request declined", "info");
        // Targeted refresh of team view
        loadTeamDetailView(teamId);
      } else {
        if (row) {
          row.style.opacity = "1";
          row.style.pointerEvents = "auto";
        }
        showToast(data.message || "Failed to process request", "error");
      }
    })
    .catch(err => {
      if (row) {
        row.style.opacity = "1";
        row.style.pointerEvents = "auto";
      }
      showToast("Network error processing request", "error");
    });
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
    .catch(err => {
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
            showToast("Left team successfully", "info");
            clientCache.teamsList = null;
            navigateTo("/");
          } else {
            showToast(data.message || "Failed to leave team", "error");
          }
        })
        .catch(err => showToast("Network error leaving team", "error"));
    }
  });
}

function confirmDisbandTeam(teamId) {
  showGlassModal({
    title: "Disband Team?",
    message: "This will permanently dissolve the team and remove all members. This action cannot be undone.",
    confirmText: "Disband Team",
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
            clientCache.teamsList = null;
            navigateTo("/");
          } else {
            showToast(data.message || "Failed to disband team", "error");
          }
        })
        .catch(err => showToast("Network error disbanding team", "error"));
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
            loadTeamDetailView(teamId);
          } else {
            showToast(data.message || "Failed to remove member", "error");
          }
        })
        .catch(err => showToast("Network error removing member", "error"));
    }
  });
}

/* ==========================================================================
   5. CREATE TEAM VIEW (5-STEP STRUCTURED FLOW & 2x3 PREVIEW)
   ========================================================================== */
function loadCreateTeamView() {
  selectedFriends = [];
  const nameInput = document.getElementById("teamNameInput");
  const descInput = document.getElementById("teamDescInput");
  const waInput = document.getElementById("teamWhatsappInput");
  const friendInput = document.getElementById("friendSearchInput");

  if (nameInput) nameInput.value = "";
  if (descInput) descInput.value = "";
  if (waInput) waInput.value = "";
  if (friendInput) friendInput.value = "";

  renderCreateTeamSeats();
}

function renderCreateTeamSeats() {
  const container = document.getElementById("createTeamSeatsContainer");
  if (!container) return;

  const leaderAvatar = currentUser && currentUser.avatar_url ? `
    <img src="${escapeHtml(currentUser.avatar_url)}" class="student-avatar" style="width:24px; height:24px;" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent('${currentUser.id}');">
  ` : `
    <div class="student-avatar-fallback" style="width:24px; height:24px; font-size:0.625rem;">
      ${currentUser && currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
    </div>
  `;

  let html = `
    <div class="glass-card-compact" style="padding:8px 10px; background:var(--accent-blue-bg); border-color:rgba(0,122,255,0.2);">
      <div class="caption-text" style="color:var(--accent-blue); font-size:0.5625rem; text-transform:uppercase;">Seat 1 (Leader)</div>
      <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
        ${leaderAvatar}
        <span style="font-size:0.75rem; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${currentUser ? escapeHtml(currentUser.name || currentUser.id) : "You"}
        </span>
      </div>
    </div>
  `;

  for (let i = 0; i < 5; i++) {
    const friend = selectedFriends[i];
    if (friend) {
      const fAvatar = friend.avatar_url ? `
        <img src="${escapeHtml(friend.avatar_url)}" class="student-avatar" style="width:24px; height:24px;" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent('${friend.id}');">
      ` : `
        <div class="student-avatar-fallback" style="width:24px; height:24px; font-size:0.625rem;">
          ${friend.name ? friend.name.charAt(0).toUpperCase() : "U"}
        </div>
      `;

      html += `
        <div class="glass-card-compact" style="padding:8px 10px; display:flex; flex-direction:column; justify-content:space-between;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span class="caption-text" style="font-size:0.5625rem; text-transform:uppercase;">Seat ${i + 2}</span>
            <button onclick="removeFriendFromTeam('${friend.id}')" style="background:none; border:none; color:var(--accent-red); font-size:0.875rem; font-weight:800; cursor:pointer; line-height:1;">×</button>
          </div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
            ${fAvatar}
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(friend.name || friend.id)}
            </span>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="glass-card-compact" style="padding:8px 10px; border:1px dashed var(--glass-t3-border); background:transparent; opacity:0.6;">
          <div class="caption-text" style="font-size:0.5625rem; text-transform:uppercase;">Seat ${i + 2}</div>
          <div class="caption-text" style="margin-top:6px;">Open Seat</div>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

function searchFriends() {
  const input = document.getElementById("friendSearchInput");
  const resultsDiv = document.getElementById("friendSearchResults");
  if (!input || !resultsDiv) return;

  const query = input.value.trim();
  if (query.length < 2) {
    resultsDiv.style.display = "none";
    return;
  }

  if (friendSearchAbortController) {
    friendSearchAbortController.abort();
  }
  friendSearchAbortController = new AbortController();

  fetch(`/api/students/search?q=${encodeURIComponent(query)}`, { signal: friendSearchAbortController.signal })
    .then(res => res.json())
    .then(data => {
      const students = data.students || data;
      if (!students || students.length === 0) {
        resultsDiv.innerHTML = `<div class="caption-text" style="padding:8px; text-align:center;">No matching students found</div>`;
        resultsDiv.style.display = "block";
        return;
      }

      resultsDiv.innerHTML = students.map(s => {
        const sId = s.id || s.r_id;
        const avatarSrc = s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sId)}`;
        return `
          <div onclick="addFriendToTeam('${sId}', '${escapeHtml(s.name)}', '${s.gender}', '${escapeHtml(avatarSrc)}')" style="padding:8px 10px; border-bottom:1px solid var(--glass-t3-border); cursor:pointer; display:flex; align-items:center; justify-content:space-between;" onmouseover="this.style.background='rgba(0,0,0,0.02)'" onmouseout="this.style.background='transparent'">
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="${escapeHtml(avatarSrc)}" class="student-avatar" style="width:26px; height:26px;" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent('${sId}');">
              <div>
                <div style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${escapeHtml(s.name)}</div>
                <div class="caption-text">${sId} • ${s.gender}</div>
              </div>
            </div>
            <span style="font-size:0.75rem; font-weight:700; color:var(--accent-blue);">+ Add</span>
          </div>
        `;
      }).join("");
      resultsDiv.style.display = "block";
    })
    .catch(err => {
      if (err.name !== "AbortError") {
        console.warn("Friend search error:", err);
      }
    });
}

function addFriendToTeam(id, name, gender, avatarUrl) {
  if (selectedFriends.length >= 5) {
    showToast("Maximum 5 pre-added teammates (6 seats total)", "error");
    return;
  }
  if (currentUser && currentUser.id === id) {
    showToast("You are already the team leader", "info");
    return;
  }
  if (selectedFriends.some(f => f.id === id)) {
    showToast("Student already added", "info");
    return;
  }

  selectedFriends.push({ id: id, name: name, gender: gender, avatar_url: avatarUrl });
  const resultsDiv = document.getElementById("friendSearchResults");
  if (resultsDiv) resultsDiv.style.display = "none";
  const input = document.getElementById("friendSearchInput");
  if (input) input.value = "";

  renderCreateTeamSeats();
  showToast(`Added ${name} to team seats`, "info");
}

function removeFriendFromTeam(id) {
  selectedFriends = selectedFriends.filter(f => f.id !== id);
  renderCreateTeamSeats();
}

function submitCreateTeam() {
  const nameInput = document.getElementById("teamNameInput");
  const descInput = document.getElementById("teamDescInput");
  const waInput = document.getElementById("teamWhatsappInput");
  const btn = document.getElementById("btnSubmitCreate");

  if (!currentUser) {
    showToast("Please sign in first to create a team", "error");
    navigateTo("/login");
    return;
  }

  const title = nameInput ? nameInput.value.trim() : "";
  const desc = descInput ? descInput.value.trim() : "";
  const wa = waInput ? waInput.value.trim() : "";

  if (!title) {
    showToast("Team title is required", "error");
    return;
  }

  btn.disabled = true;
  btn.innerText = "Publishing Team...";

  fetch("/api/teams/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title,
      description: desc,
      whatsapp_link: wa,
      initial_members: selectedFriends.map(f => f.id)
    })
  })
    .then(res => res.json())
    .then(data => {
      btn.disabled = false;
      btn.innerText = "Create & Publish Team";
      if (data.success) {
        showToast("Team created successfully!", "info");
        clientCache.teamsList = null;
        navigateTo(`/team/${data.team_id || data.team.id}`);
      } else {
        showToast(data.message || "Failed to create team", "error");
      }
    })
    .catch(err => {
      btn.disabled = false;
      btn.innerText = "Create & Publish Team";
      showToast("Network error creating team", "error");
    });
}

/* ==========================================================================
   6. USER PROFILE VIEW (STRUCTURED IDENTITY HERO, DATABASE GRID, & MY TEAMS)
   ========================================================================== */
function loadProfileView() {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="glass-surface-primary" style="text-align:center; padding:32px;">
        <h2 class="page-title" style="font-size:1.25rem; margin-bottom:6px;">Sign In Required</h2>
        <p class="secondary-text" style="margin-bottom:14px;">Sign in with your College R-ID to view your profile and joined teams.</p>
        <a href="/login" class="btn-primary" style="display:inline-flex;">Sign In with R-ID</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="glass-surface-primary glass-skeleton" style="height:260px;"></div>`;

  fetch(`/api/user/profile?r_id=${encodeURIComponent(currentUser.id)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        container.innerHTML = `<div class="glass-surface-primary" style="text-align:center; padding:32px;"><h3 style="color:var(--accent-red);">${escapeHtml(data.message || "Failed to load profile")}</h3></div>`;
        return;
      }
      renderFullProfile(data.profile, data.teams || []);
    })
    .catch(err => {
      container.innerHTML = `<div class="glass-surface-primary" style="text-align:center; padding:32px;"><h3 style="color:var(--accent-red);">Error loading profile</h3></div>`;
    });
}

function renderFullProfile(prof, userTeams) {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  const avatarSrc = prof.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(prof.r_id)}`;
  const isMobile = window.innerWidth <= 767;

  // 1. Identity Hero
  const heroHtml = `
    <div class="glass-surface-primary">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:14px;">
          <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(prof.name)}" class="student-avatar" style="width:52px; height:52px;" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent('${prof.r_id}');">
          <div>
            <h1 class="page-title" style="font-size:1.35rem; margin-bottom:2px;">${escapeHtml(prof.name)}</h1>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="glass-pill glass-pill-user">${escapeHtml(prof.r_id)}</span>
              <span class="caption-text">${escapeHtml(prof.gender || "Student")}</span>
            </div>
          </div>
        </div>

        <button onclick="logoutUser()" class="btn-danger" style="height:30px; font-size:0.75rem;">
          Sign Out
        </button>
      </div>
    </div>
  `;

  // 2. Complete College Database Record Grid (Email, Phone, DOB, Father's Name, Address)
  const recordHtml = `
    <div class="glass-surface-primary">
      <h3 class="section-title">College Database Record</h3>
      <div class="profile-record-grid">
        <div class="profile-record-item">
          <div class="caption-text" style="text-transform:uppercase;">Email Address</div>
          <div class="body-text" style="font-weight:700; color:var(--text-primary); word-break:break-all; margin-top:2px;">${escapeHtml(prof.email || "N/A")}</div>
        </div>
        <div class="profile-record-item">
          <div class="caption-text" style="text-transform:uppercase;">Mobile Phone</div>
          <div class="body-text" style="font-weight:700; color:var(--text-primary); margin-top:2px;">${escapeHtml(prof.phone || "N/A")}</div>
        </div>
        <div class="profile-record-item">
          <div class="caption-text" style="text-transform:uppercase;">Date of Birth</div>
          <div class="body-text" style="font-weight:700; color:var(--accent-blue); margin-top:2px;">${escapeHtml(prof.dob || "N/A")}</div>
        </div>
        <div class="profile-record-item">
          <div class="caption-text" style="text-transform:uppercase;">Father's Name</div>
          <div class="body-text" style="font-weight:700; color:var(--text-primary); margin-top:2px;">${escapeHtml(prof.father_name || "N/A")}</div>
        </div>
        <div class="profile-record-item" style="grid-column: 1 / -1;">
          <div class="caption-text" style="text-transform:uppercase;">Address</div>
          <div class="body-text" style="font-weight:600; color:var(--text-primary); margin-top:2px;">${escapeHtml(prof.address || "N/A")}</div>
        </div>
      </div>
    </div>
  `;

  // 3. My Teams Section (Using the exact same redesigned team card as Discover)
  let teamsGridHtml = "";
  if (!userTeams || userTeams.length === 0) {
    teamsGridHtml = `
      <div class="glass-card-compact" style="text-align:center; padding:24px 16px;">
        <p class="secondary-text">You are not currently in any hackathon team.</p>
        <a href="/create-team" class="btn-primary" style="margin-top:10px; display:inline-flex;">Create Team</a>
      </div>
    `;
  } else {
    teamsGridHtml = `
      <div class="teams-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:12px;">
        ${userTeams.map(t => renderSingleTeamCard(t, isMobile)).join("")}
      </div>
    `;
  }

  const myTeamsSectionHtml = `
    <div class="glass-surface-primary">
      <h3 class="section-title">My Teams (${userTeams.length})</h3>
      ${teamsGridHtml}
    </div>
  `;

  container.innerHTML = heroHtml + recordHtml + myTeamsSectionHtml;
}

/* ==========================================================================
   7. STUDENT DIRECTORY SEARCH VIEW
   ========================================================================== */
function loadStudentsView() {
  const input = document.getElementById("dirSearchInput");
  if (input) input.value = "";
  const results = document.getElementById("dirSearchResults");
  if (results) results.innerHTML = `<div class="caption-text" style="text-align:center; padding:24px;">Type student R-ID or name above to search</div>`;
}

function searchStudentDirectory() {
  const input = document.getElementById("dirSearchInput");
  const resultsDiv = document.getElementById("dirSearchResults");
  if (!input || !resultsDiv) return;

  const query = input.value.trim();
  if (query.length < 2) {
    resultsDiv.innerHTML = `<div class="caption-text" style="text-align:center; padding:24px;">Type student R-ID or name above to search</div>`;
    return;
  }

  if (currentSearchAbortController) {
    currentSearchAbortController.abort();
  }
  currentSearchAbortController = new AbortController();

  fetch(`/api/students/search?q=${encodeURIComponent(query)}`, { signal: currentSearchAbortController.signal })
    .then(res => res.json())
    .then(data => {
      const students = data.students || data;
      if (!students || students.length === 0) {
        resultsDiv.innerHTML = `<div class="caption-text" style="text-align:center; padding:24px;">No students found matching "${escapeHtml(query)}"</div>`;
        return;
      }

      resultsDiv.innerHTML = students.map(s => {
        const sId = s.id || s.r_id;
        const avatarSrc = s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sId)}`;
        return `
          <div class="member-card" style="padding:10px 12px; margin-bottom:6px;">
            <div class="member-info-col">
              <img src="${escapeHtml(avatarSrc)}" class="student-avatar" style="width:32px; height:32px;" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent('${sId}');">
              <div class="member-details">
                <div style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${escapeHtml(s.name)}</div>
                <div class="caption-text">${sId} • ${s.gender}</div>
              </div>
            </div>
            <button onclick="copyStudentRid('${sId}')" class="btn-secondary" style="height:28px; font-size:0.6875rem; padding:0 8px;">
              Copy R-ID
            </button>
          </div>
        `;
      }).join("");
    })
    .catch(err => {
      if (err.name !== "AbortError") {
        console.warn("Directory search error:", err);
      }
    });
}

function copyStudentRid(rid) {
  navigator.clipboard.writeText(rid).then(() => {
    showToast(`Copied R-ID: ${rid}`, "info");
  }).catch(() => {
    showToast(`R-ID: ${rid}`, "info");
  });
}

/* ==========================================================================
   8. CUSTOM GLASS CONFIRMATION MODAL SHEET & TOASTS
   ========================================================================== */
function showGlassModal({ title, message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, isDanger = false }) {
  const overlay = document.getElementById("glassModalOverlay");
  const sheet = document.getElementById("glassModalSheet");
  if (!overlay || !sheet) return;

  sheet.innerHTML = `
    <h3 class="section-title" style="margin-bottom:6px;">${escapeHtml(title)}</h3>
    <p class="body-text" style="margin-bottom:16px;">${escapeHtml(message)}</p>
    <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px;">
      <button onclick="closeGlassModal()" class="btn-secondary">${escapeHtml(cancelText)}</button>
      <button id="btnModalConfirm" class="${isDanger ? 'btn-danger' : 'btn-primary'}">${escapeHtml(confirmText)}</button>
    </div>
  `;

  document.getElementById("btnModalConfirm").onclick = () => {
    closeGlassModal();
    if (onConfirm) onConfirm();
  };

  overlay.classList.add("active");
}

function closeGlassModal() {
  const overlay = document.getElementById("glassModalOverlay");
  if (overlay) overlay.classList.remove("active");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  const bgColor = type === "error" ? "rgba(255, 59, 48, 0.94)" : type === "success" ? "rgba(52, 199, 89, 0.94)" : "rgba(0, 122, 255, 0.94)";

  toast.style.cssText = `
    padding: 8px 14px;
    background: ${bgColor};
    color: #FFFFFF;
    font-size: 0.75rem;
    font-weight: 700;
    border-radius: var(--r-pill);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    text-align: center;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(-6px);
    transition: all var(--trans-fast);
  `;
  toast.innerText = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 160);
  }, 2200);
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
