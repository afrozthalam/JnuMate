/**
 * HackMate — iOS 27 Liquid Glass SPA Engine & Performance Architecture
 */

let currentUser = null;
let currentSearchAbortController = null;
let friendSearchAbortController = null;
let selectedFriends = [];
let discoverFilter = 'all';
let discoverSearchTerm = '';
let discoverSearchDebounce = null;

// In-Memory Client Cache (0ms Instant Renders)
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
   1. CLIENT-SIDE SPA ROUTER & PREFETCHER
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
  
  // Desktop header links
  document.querySelectorAll(".nav-link-glass").forEach(link => {
    const href = link.getAttribute("href");
    if (href === path || (href !== "/" && path.startsWith(href))) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Mobile bottom dock links
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
   2. AUTHENTICATION & USER SESSION ENGINE
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
      console.error("Session check error:", err);
      currentUser = null;
      renderNavUserSlots();
    });
}

function renderNavUserSlots() {
  const dtSlot = document.getElementById("navUserSlotDesktop");
  const mbSlot = document.getElementById("navUserSlotMobile");

  if (currentUser) {
    const userHtml = `
      <div style="display:flex; align-items:center; gap:10px;">
        <a href="/profile" style="display:flex; align-items:center; gap:8px; text-decoration:none;">
          <div style="width:30px; height:30px; border-radius:50%; background:var(--accent-blue-bg); color:var(--g-blue); font-size:0.75rem; font-weight:800; display:flex; align-items:center; justify-content:center; border:1.5px solid var(--g-blue);">
            ${currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
          </div>
          <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${currentUser.name || currentUser.id}</span>
        </a>
        <button onclick="logoutUser()" class="btn-glass-secondary" style="height:32px; padding:0 12px; font-size:0.75rem;">Sign Out</button>
      </div>
    `;
    if (dtSlot) dtSlot.innerHTML = userHtml;
    if (mbSlot) mbSlot.innerHTML = userHtml;
  } else {
    const loginHtml = `
      <a href="/login" class="btn-glass-primary" style="height:34px; padding:0 14px; font-size:0.8125rem;">Sign In</a>
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
      showToast("Network error during request", "error");
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
        showToast("Successfully authenticated!", "success");
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
   3. DISCOVER TEAMS VIEW ENGINE
   ========================================================================== */
function loadDiscoverView() {
  // If cache exists, render immediately
  if (clientCache.teamsList) {
    renderTeamsGrid(clientCache.teamsList);
  } else {
    renderTeamsSkeleton();
  }

  // Refresh in background
  fetch("/api/teams")
    .then(res => res.json())
    .then(teams => {
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
    skeletonHtml += `<div class="glass-card glass-skeleton" style="height:180px;"></div>`;
  }
  container.innerHTML = skeletonHtml;
}

function renderTeamsGrid(teams) {
  const container = document.getElementById("teamsGridContainer");
  const emptyState = document.getElementById("emptyStateContainer");
  if (!container) return;

  let filtered = teams.filter(t => {
    const matchesSearch = !discoverSearchTerm || 
      t.title.toLowerCase().includes(discoverSearchTerm) || 
      (t.description && t.description.toLowerCase().includes(discoverSearchTerm));
    const matchesFilter = discoverFilter === "all" || (t.members.length < 6);
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

  container.innerHTML = filtered.map(t => {
    const memberCount = t.members ? t.members.length : 1;
    const isFull = memberCount >= 6;
    const openSlots = 6 - memberCount;
    const percent = Math.min(100, Math.round((memberCount / 6) * 100));

    // Avatar stack
    let avatarsHtml = "";
    if (t.members && t.members.length > 0) {
      avatarsHtml = t.members.slice(0, 4).map(m => `
        <div class="avatar-stack-item" title="${m.name || m.student_id}">
          ${m.name ? m.name.charAt(0).toUpperCase() : "U"}
        </div>
      `).join("");
      if (t.members.length > 4) {
        avatarsHtml += `<div class="avatar-stack-item">+${t.members.length - 4}</div>`;
      }
    }

    if (isMobile) {
      // Compact 2-column mobile card layout
      return `
        <a href="/team/${t.id}" class="glass-card glass-card-interactive mobile-team-card" style="text-decoration:none;">
          <div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
              <span class="glass-pill ${isFull ? 'glass-pill-full' : 'glass-pill-open'}" style="font-size:0.5625rem; padding:2px 6px;">
                ${isFull ? 'FULL' : openSlots + ' OPEN'}
              </span>
              <div class="avatar-stack">${avatarsHtml}</div>
            </div>

            <h3 class="mobile-team-title">${escapeHtml(t.title)}</h3>
            <p class="mobile-team-pitch">${escapeHtml(t.description || "No pitch details provided.")}</p>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.625rem; color:var(--text-tertiary); font-weight:700; margin-bottom:4px;">
              <span>SEATS</span>
              <span>${memberCount}/6</span>
            </div>
            <div class="seat-meter-bar">
              <div class="seat-meter-fill" style="width:${percent}%;"></div>
            </div>
          </div>
        </a>
      `;
    }

    // Standard Desktop Card Layout
    return `
      <a href="/team/${t.id}" class="glass-card glass-card-interactive" style="text-decoration:none; display:flex; flex-direction:column; justify-content:space-between; height:100%;">
        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <span class="glass-pill ${isFull ? 'glass-pill-full' : 'glass-pill-open'}">
              ${isFull ? 'Team Full (6/6)' : openSlots + ' Open Seats'}
            </span>
            <div class="avatar-stack">${avatarsHtml}</div>
          </div>

          <h3 style="font-size:1.125rem; font-weight:800; color:var(--text-primary); margin-bottom:6px; letter-spacing:-0.01em;">${escapeHtml(t.title)}</h3>
          <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.45; margin-bottom:16px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
            ${escapeHtml(t.description || "No pitch provided.")}
          </p>
        </div>

        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.6875rem; font-weight:700; color:var(--text-tertiary); margin-bottom:6px;">
            <span>TEAM SEATS RECORD</span>
            <span>${memberCount} of 6 Filled</span>
          </div>
          <div class="seat-meter-bar">
            <div class="seat-meter-fill" style="width:${percent}%;"></div>
          </div>
        </div>
      </a>
    `;
  }).join("");
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

  if (btnAll) btnAll.className = type === "all" ? "nav-link-glass active" : "nav-link-glass";
  if (btnOpen) btnOpen.className = type === "open" ? "nav-link-glass active" : "nav-link-glass";

  if (clientCache.teamsList) {
    renderTeamsGrid(clientCache.teamsList);
  }
}

/* ==========================================================================
   4. TEAM DETAIL VIEW ENGINE
   ========================================================================== */
function loadTeamDetailView(teamId) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  container.innerHTML = `<div class="glass-card glass-skeleton" style="height:320px;"></div>`;

  fetch(`/api/teams/${teamId}`)
    .then(res => res.json())
    .then(team => {
      if (team.error) {
        container.innerHTML = `<div class="glass-card" style="text-align:center; padding:40px;"><h3 style="color:var(--accent-red);">Team Not Found</h3></div>`;
        return;
      }
      renderTeamDetail(team);
    })
    .catch(err => {
      container.innerHTML = `<div class="glass-card" style="text-align:center; padding:40px;"><h3>Error loading team details</h3></div>`;
    });
}

function renderTeamDetail(team) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  const isLeader = currentUser && currentUser.id === team.leader_id;
  const isMember = currentUser && team.members.some(m => m.student_id === currentUser.id);
  const isFull = team.members.length >= 6;

  // Build 6 visual seats
  let seatsHtml = "";
  for (let i = 0; i < 6; i++) {
    const member = team.members[i];
    if (member) {
      const isTeamLeader = member.student_id === team.leader_id;
      seatsHtml += `
        <div class="glass-card" style="padding:14px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:38px; height:38px; border-radius:50%; background:var(--accent-blue-bg); color:var(--g-blue); font-size:0.875rem; font-weight:800; display:flex; align-items:center; justify-content:center; border:1.5px solid var(--g-blue);">
              ${member.name ? member.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div style="font-size:0.875rem; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                ${escapeHtml(member.name || member.student_id)}
                ${isTeamLeader ? `<span class="glass-pill glass-pill-user" style="font-size:0.5625rem; padding:1px 6px;">LEADER</span>` : ""}
              </div>
              <div style="font-size:0.75rem; color:var(--text-tertiary);">${escapeHtml(member.student_id)} • ${escapeHtml(member.gender || "Student")}</div>
            </div>
          </div>

          ${isLeader && !isTeamLeader ? `
            <button onclick="confirmRemoveMember('${team.id}', '${member.student_id}', '${escapeHtml(member.name || member.student_id)}')" class="btn-glass-danger" style="height:30px; padding:0 10px; font-size:0.6875rem;">
              Remove
            </button>
          ` : ""}
        </div>
      `;
    } else {
      seatsHtml += `
        <div class="glass-card" style="padding:14px; border:1.5px dashed var(--glass-border-subtle); background:transparent; display:flex; align-items:center; gap:12px; opacity:0.6;">
          <div style="width:38px; height:38px; border-radius:50%; border:1.5px dashed var(--text-tertiary); display:flex; align-items:center; justify-content:center; color:var(--text-tertiary); font-size:0.75rem; font-weight:700;">
            +
          </div>
          <div style="font-size:0.8125rem; font-weight:600; color:var(--text-tertiary);">Open Seat ${i + 1}</div>
        </div>
      `;
    }
  }

  // Join Action Panel
  let actionPanelHtml = "";
  if (currentUser) {
    if (isLeader) {
      actionPanelHtml = `
        <div style="display:flex; gap:10px; margin-top:20px;">
          <button onclick="confirmDisbandTeam('${team.id}')" class="btn-glass-danger" style="height:42px;">
            Disband Team
          </button>
        </div>
      `;
    } else if (isMember) {
      actionPanelHtml = `
        <div style="margin-top:20px;">
          <button onclick="confirmLeaveTeam('${team.id}')" class="btn-glass-danger" style="height:42px;">
            Leave Team
          </button>
        </div>
      `;
    } else if (!isFull) {
      actionPanelHtml = `
        <div class="glass-card" style="margin-top:24px; padding:20px; background:rgba(255,255,255,0.9);">
          <h4 style="font-size:0.9375rem; font-weight:800; color:var(--text-primary); margin-bottom:6px;">Request to Join Team</h4>
          <p style="font-size:0.8125rem; color:var(--text-secondary); margin-bottom:14px;">Send a note to the team leader explaining your skills or interest.</p>
          <textarea id="joinMessageInput" rows="2" placeholder="e.g. Hi, I excel at Frontend & React!" class="glass-textarea" style="margin-bottom:12px;"></textarea>
          <button onclick="submitJoinRequest('${team.id}')" class="btn-glass-primary" style="height:42px; width:100%;">
            Send Join Request
          </button>
        </div>
      `;
    }
  } else {
    actionPanelHtml = `
      <div class="glass-card" style="margin-top:24px; text-align:center; padding:20px;">
        <p style="font-size:0.875rem; color:var(--text-secondary); margin-bottom:12px;">Sign in with your R-ID to request to join this team.</p>
        <a href="/login" class="btn-glass-primary" style="display:inline-flex;">Sign In to Request</a>
      </div>
    `;
  }

  // WhatsApp Group Banner
  let whatsappBannerHtml = "";
  if (team.whatsapp_link && (isMember || isLeader)) {
    whatsappBannerHtml = `
      <div style="padding:14px 18px; background:rgba(54, 168, 83, 0.1); border:1px solid rgba(54, 168, 83, 0.3); border-radius:var(--r-md); margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <div style="font-size:0.875rem; font-weight:800; color:#2E7D32;">WhatsApp Group Link Active</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">Official team channel for hackathon coordination</div>
        </div>
        <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" class="btn-glass-primary" style="background:#34A853; border-color:rgba(255,255,255,0.4); height:36px; padding:0 14px; font-size:0.75rem;">
          Join WhatsApp ➔
        </a>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="glass-card" style="margin-bottom:20px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
        <span class="glass-pill ${isFull ? 'glass-pill-full' : 'glass-pill-open'}">
          ${isFull ? 'Team Full (6/6)' : (6 - team.members.length) + ' Open Seats'}
        </span>
        <span style="font-size:0.75rem; font-weight:700; color:var(--text-tertiary);">Team ID: ${team.id}</span>
      </div>

      <h1 class="page-title" style="font-size:1.625rem; margin-bottom:8px;">${escapeHtml(team.title)}</h1>
      <p style="font-size:0.9375rem; color:var(--text-secondary); line-height:1.5; margin-bottom:20px;">
        ${escapeHtml(team.description || "No pitch provided.")}
      </p>

      ${whatsappBannerHtml}

      <h3 style="font-size:0.875rem; font-weight:800; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.03em; margin-bottom:12px;">
        Team Roster (${team.members.length} / 6)
      </h3>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin-bottom:12px;">
        ${seatsHtml}
      </div>

      ${actionPanelHtml}
    </div>
  `;
}

function submitJoinRequest(teamId) {
  const msgInput = document.getElementById("joinMessageInput");
  const msg = msgInput ? msgInput.value.trim() : "";

  fetch(`/api/teams/${teamId}/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg })
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
      fetch(`/api/teams/${teamId}/leave`, { method: "POST" })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast("Left team successfully", "info");
            clientCache.teamsList = null;
            navigateTo("/");
          } else {
            showToast(data.message || "Failed to leave team", "error");
          }
        });
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
      fetch(`/api/teams/${teamId}/disband`, { method: "POST" })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast("Team disbanded", "info");
            clientCache.teamsList = null;
            navigateTo("/");
          } else {
            showToast(data.message || "Failed to disband team", "error");
          }
        });
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
        body: JSON.stringify({ student_id: studentId })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast(`Removed ${studentName}`, "info");
            loadTeamDetailView(teamId);
          } else {
            showToast(data.message || "Failed to remove member", "error");
          }
        });
    }
  });
}

/* ==========================================================================
   5. CREATE TEAM VIEW ENGINE & PRE-ADD FRIENDS SEARCH
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

  let html = `
    <div class="glass-card" style="padding:12px; background:var(--accent-blue-bg); border-color:rgba(0,122,255,0.3);">
      <div style="font-size:0.6875rem; font-weight:800; color:var(--g-blue); text-transform:uppercase;">Seat 1 (Leader)</div>
      <div style="font-size:0.875rem; font-weight:800; color:var(--text-primary); margin-top:2px;">
        ${currentUser ? escapeHtml(currentUser.name || currentUser.id) : "You (Leader)"}
      </div>
    </div>
  `;

  for (let i = 0; i < 5; i++) {
    const friend = selectedFriends[i];
    if (friend) {
      html += `
        <div class="glass-card" style="padding:12px; display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-size:0.6875rem; font-weight:800; color:var(--text-tertiary); text-transform:uppercase;">Seat ${i + 2}</div>
            <div style="font-size:0.8125rem; font-weight:800; color:var(--text-primary); margin-top:2px;">${escapeHtml(friend.name || friend.id)}</div>
          </div>
          <button onclick="removeFriendFromTeam('${friend.id}')" style="background:none; border:none; color:var(--accent-red); font-size:1.125rem; font-weight:800; cursor:pointer;">×</button>
        </div>
      `;
    } else {
      html += `
        <div class="glass-card" style="padding:12px; border:1px dashed var(--glass-border-subtle); background:transparent; opacity:0.6;">
          <div style="font-size:0.6875rem; font-weight:700; color:var(--text-tertiary); text-transform:uppercase;">Seat ${i + 2}</div>
          <div style="font-size:0.75rem; color:var(--text-tertiary); margin-top:2px;">Open Seat</div>
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
    .then(students => {
      if (!students || students.length === 0) {
        resultsDiv.innerHTML = `<div style="padding:12px; font-size:0.8125rem; color:var(--text-tertiary); text-align:center;">No matching students found</div>`;
        resultsDiv.style.display = "block";
        return;
      }

      resultsDiv.innerHTML = students.map(s => `
        <div onclick="addFriendToTeam('${s.id}', '${escapeHtml(s.name)}', '${s.gender}')" style="padding:10px 14px; border-bottom:1px solid var(--glass-border-subtle); cursor:pointer; display:flex; align-items:center; justify-content:space-between;" onmouseover="this.style.background='rgba(0,0,0,0.03)'" onmouseout="this.style.background='transparent'">
          <div>
            <div style="font-size:0.8125rem; font-weight:800; color:var(--text-primary);">${escapeHtml(s.name)}</div>
            <div style="font-size:0.6875rem; color:var(--text-tertiary);">${s.id} • ${s.gender}</div>
          </div>
          <span style="font-size:0.75rem; font-weight:700; color:var(--g-blue);">+ Add</span>
        </div>
      `).join("");
      resultsDiv.style.display = "block";
    })
    .catch(err => {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    });
}

function addFriendToTeam(id, name, gender) {
  if (selectedFriends.length >= 5) {
    showToast("Maximum 5 pre-added teammates allowed (6 total seats)", "error");
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

  selectedFriends.push({ id: id, name: name, gender: gender });
  const resultsDiv = document.getElementById("friendSearchResults");
  if (resultsDiv) resultsDiv.style.display = "none";
  const input = document.getElementById("friendSearchInput");
  if (input) input.value = "";

  renderCreateTeamSeats();
  showToast(`Added ${name} to team seats`, "success");
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
        showToast("Team created successfully!", "success");
        clientCache.teamsList = null;
        navigateTo(`/team/${data.team.id}`);
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
   6. USER PROFILE VIEW ENGINE
   ========================================================================== */
function loadProfileView() {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="glass-card" style="text-align:center; padding:40px;">
        <h2 class="page-title" style="font-size:1.35rem; margin-bottom:8px;">User Session Required</h2>
        <p style="font-size:0.875rem; color:var(--text-secondary); margin-bottom:20px;">Please sign in with your R-ID to view your profile and manage teams.</p>
        <a href="/login" class="btn-glass-primary" style="display:inline-flex;">Sign In with R-ID</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="glass-card" style="margin-bottom:20px;">
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
        <div style="width:56px; height:56px; border-radius:50%; background:var(--accent-blue-bg); color:var(--g-blue); font-size:1.5rem; font-weight:800; display:flex; align-items:center; justify-content:center; border:2px solid var(--g-blue);">
          ${currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
        </div>
        <div>
          <h1 class="page-title" style="font-size:1.5rem; margin-bottom:2px;">${escapeHtml(currentUser.name || "College Student")}</h1>
          <div style="font-size:0.8125rem; font-weight:700; color:var(--text-secondary);">${escapeHtml(currentUser.id)} • ${escapeHtml(currentUser.gender || "Student")}</div>
          <div style="font-size:0.75rem; color:var(--text-tertiary); margin-top:2px;">${escapeHtml(currentUser.email || "")}</div>
        </div>
      </div>

      <div style="display:flex; gap:10px;">
        <button onclick="logoutUser()" class="btn-glass-danger" style="height:36px; font-size:0.75rem;">
          Sign Out of HackMate
        </button>
      </div>
    </div>

    <div class="glass-card">
      <h3 style="font-size:0.9375rem; font-weight:800; color:var(--text-primary); margin-bottom:12px;">My Teams</h3>
      <div id="profileUserTeamsContainer">
        <div class="glass-skeleton" style="height:80px;"></div>
      </div>
    </div>
  `;

  // Fetch user's teams
  fetch("/api/teams")
    .then(res => res.json())
    .then(teams => {
      const userTeams = teams.filter(t => t.members.some(m => m.student_id === currentUser.id));
      const div = document.getElementById("profileUserTeamsContainer");
      if (!div) return;

      if (userTeams.length === 0) {
        div.innerHTML = `<p style="font-size:0.8125rem; color:var(--text-tertiary);">You are not currently in any hackathon team.</p>`;
        return;
      }

      div.innerHTML = userTeams.map(t => `
        <a href="/team/${t.id}" class="glass-card glass-card-interactive" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; margin-bottom:8px; text-decoration:none;">
          <div>
            <div style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">${escapeHtml(t.title)}</div>
            <div style="font-size:0.75rem; color:var(--text-tertiary);">${t.members.length}/6 Members • ${t.leader_id === currentUser.id ? 'Leader' : 'Member'}</div>
          </div>
          <span style="font-size:0.75rem; font-weight:700; color:var(--g-blue);">View Team ➔</span>
        </a>
      `).join("");
    });
}

/* ==========================================================================
   7. STUDENT DIRECTORY VIEW ENGINE
   ========================================================================== */
function loadStudentsView() {
  const input = document.getElementById("dirSearchInput");
  if (input) input.value = "";
  const results = document.getElementById("dirSearchResults");
  if (results) results.innerHTML = `<div style="font-size:0.875rem; color:var(--text-tertiary); text-align:center; padding:36px;">Type student R-ID or name above to search</div>`;
}

function searchStudentDirectory() {
  const input = document.getElementById("dirSearchInput");
  const resultsDiv = document.getElementById("dirSearchResults");
  if (!input || !resultsDiv) return;

  const query = input.value.trim();
  if (query.length < 2) {
    resultsDiv.innerHTML = `<div style="font-size:0.875rem; color:var(--text-tertiary); text-align:center; padding:36px;">Type student R-ID or name above to search</div>`;
    return;
  }

  if (currentSearchAbortController) {
    currentSearchAbortController.abort();
  }
  currentSearchAbortController = new AbortController();

  fetch(`/api/students/search?q=${encodeURIComponent(query)}`, { signal: currentSearchAbortController.signal })
    .then(res => res.json())
    .then(students => {
      if (!students || students.length === 0) {
        resultsDiv.innerHTML = `<div style="font-size:0.875rem; color:var(--text-tertiary); text-align:center; padding:36px;">No students found matching "${escapeHtml(query)}"</div>`;
        return;
      }

      resultsDiv.innerHTML = students.map(s => `
        <div class="glass-card" style="padding:14px; display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-size:0.9375rem; font-weight:800; color:var(--text-primary);">${escapeHtml(s.name)}</div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">R-ID: ${s.id} • ${s.gender}</div>
          </div>
          <button onclick="copyStudentRid('${s.id}')" class="btn-glass-secondary" style="height:32px; font-size:0.6875rem; padding:0 10px;">
            Copy R-ID
          </button>
        </div>
      `).join("");
    })
    .catch(err => {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    });
}

function copyStudentRid(rid) {
  navigator.clipboard.writeText(rid).then(() => {
    showToast(`Copied R-ID: ${rid}`, "info");
  });
}

/* ==========================================================================
   8. CUSTOM GLASS MODAL SHEET & TOAST UTILITIES
   ========================================================================== */
function showGlassModal({ title, message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, isDanger = false }) {
  const overlay = document.getElementById("glassModalOverlay");
  const sheet = document.getElementById("glassModalSheet");
  if (!overlay || !sheet) return;

  sheet.innerHTML = `
    <h3 style="font-size:1.125rem; font-weight:800; color:var(--text-primary); margin-bottom:8px;">${escapeHtml(title)}</h3>
    <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.45; margin-bottom:20px;">${escapeHtml(message)}</p>
    <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px;">
      <button onclick="closeGlassModal()" class="btn-glass-secondary" style="height:38px;">${escapeHtml(cancelText)}</button>
      <button id="btnModalConfirm" class="${isDanger ? 'btn-glass-danger' : 'btn-glass-primary'}" style="height:38px;">${escapeHtml(confirmText)}</button>
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
  const bgColor = type === "error" ? "rgba(255, 59, 48, 0.9)" : type === "success" ? "rgba(52, 199, 89, 0.9)" : "rgba(0, 122, 255, 0.9)";

  toast.style.cssText = `
    padding: 10px 16px;
    background: ${bgColor};
    color: #FFFFFF;
    font-size: 0.8125rem;
    font-weight: 700;
    border-radius: var(--r-full);
    box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    text-align: center;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(-8px);
    transition: all 0.2s var(--spring-ease);
  `;
  toast.innerText = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    setTimeout(() => toast.remove(), 200);
  }, 2500);
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
