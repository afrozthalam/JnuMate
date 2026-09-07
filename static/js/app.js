/**
 * HackMate — Hard Reset Application Engine
 * High-performance, instant responsiveness, authentic optical translucent materials.
 */

let currentUser = null;
let currentSearchAbortController = null;
let friendSearchAbortController = null;
let selectedFriends = [];
let discoverFilter = 'all';
let discoverSearchTerm = '';
let discoverSearchDebounce = null;
let friendSearchDebounce = null;
let dirSearchDebounce = null;

// In-Memory Client Cache
const clientCache = {
  teamsList: null,
  teamsMap: {},
  userProfiles: {}
};

document.addEventListener("DOMContentLoaded", () => {
  setupRouter();
  loadUserFromSession(() => {
    handleCurrentRoute();
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
  
  document.querySelectorAll(".nav-link-item").forEach(link => {
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
      if (typeof callback === "function") callback();
    })
    .catch(() => {
      currentUser = null;
      renderNavUserSlots();
      if (typeof callback === "function") callback();
    });
}

function renderNavUserSlots() {
  const dtSlot = document.getElementById("navUserSlotDesktop");
  const mbSlot = document.getElementById("navUserSlotMobile");

  if (currentUser) {
    const initial = (currentUser.name || currentUser.id).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
    const userHtml = `
      <div style="display:flex; align-items:center; gap:8px; margin-left:6px;">
        <a href="/profile" style="text-decoration:none; display:flex; align-items:center; gap:6px;">
          <div class="avatar-stack-item" style="width:24px; height:24px; border:1px solid var(--nav-glass-border);">
            <span class="avatar-initial" style="font-size:0.625rem;">${escapeHtml(initial)}</span>
            <img src="${escapeHtml(currentUser.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(currentUser.id))}" 
                 loading="lazy" onerror="this.remove();">
          </div>
          <span style="font-size:0.8125rem; font-weight:600; color:var(--text-primary);">${escapeHtml(currentUser.name || currentUser.id)}</span>
        </a>
      </div>
    `;
    if (dtSlot) dtSlot.innerHTML = userHtml;
    if (mbSlot) mbSlot.innerHTML = userHtml;
  } else {
    const loginHtml = `
      <a href="/login" class="nav-signin-link">Sign In</a>
    `;
    if (dtSlot) dtSlot.innerHTML = loginHtml;
    if (mbSlot) mbSlot.innerHTML = loginHtml;
  }
}

/* ==========================================================================
   3. DISCOVER TEAMS VIEW
   ========================================================================== */
function loadDiscoverView() {
  if (clientCache.teamsList) {
    renderTeamsGrid(clientCache.teamsList);
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

function renderTeamsGrid(teams) {
  const container = document.getElementById("teamsGridContainer");
  const emptyState = document.getElementById("emptyStateContainer");
  if (!container) return;

  const filtered = teams.filter(t => {
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

  container.innerHTML = filtered.map(t => renderSingleTeamCard(t)).join("");
}

function renderSingleTeamCard(t) {
  const title = t.title || t.name || "Untitled Team";
  const desc = t.description || "No pitch details provided.";
  const memberCount = t.members ? t.members.length : (t.member_count || 1);
  const isFull = memberCount >= 6;
  const openSlots = 6 - memberCount;

  let avatarsHtml = "";
  if (t.members && t.members.length > 0) {
    avatarsHtml = t.members.slice(0, 3).map(m => {
      const mId = m.student_id || m.r_id || "U";
      const mName = m.name || mId;
      const initial = mName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
      const avatarSrc = m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mId)}`;
      return `
        <div class="avatar-stack-item" title="${escapeHtml(mName)}">
          <span class="avatar-initial">${escapeHtml(initial)}</span>
          <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(mName)}" loading="lazy" onerror="this.remove();">
        </div>
      `;
    }).join("");
    if (t.members.length > 3) {
      avatarsHtml += `<div class="avatar-stack-item"><span class="avatar-initial" style="font-size:0.5rem;">+${t.members.length - 3}</span></div>`;
    }
  }

  return `
    <a href="/team/${t.id}" class="team-card-module">
      <div>
        <div class="card-top-row">
          <span class="status-pill ${isFull ? 'full' : 'open'}">
            ${isFull ? 'Full (6/6)' : openSlots + ' Open'}
          </span>
          <div class="avatar-stack">${avatarsHtml}</div>
        </div>

        <h3 class="card-title">${escapeHtml(title)}</h3>
        <p class="card-pitch">${escapeHtml(desc)}</p>
      </div>

      <div class="card-bottom-row">
        <span class="meta-text">${memberCount}/6 members</span>
        <span class="card-action-hint">View ➔</span>
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
  }, 120);
}

function setDiscoverFilter(type) {
  discoverFilter = type;
  const btnAll = document.getElementById("btnFilterAll");
  const btnOpen = document.getElementById("btnFilterOpen");

  if (btnAll) btnAll.className = type === "all" ? "segmented-btn active" : "segmented-btn";
  if (btnOpen) btnOpen.className = type === "open" ? "segmented-btn active" : "segmented-btn";

  if (clientCache.teamsList) {
    renderTeamsGrid(clientCache.teamsList);
  }
}

/* ==========================================================================
   4. TEAM DETAIL VIEW (ZERO INFORMATION LOSS • PROPER ROSTER COMPOSITION)
   ========================================================================== */
function loadTeamDetailView(teamId) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  container.innerHTML = `<div class="surface-panel" style="text-align:center; padding:32px;"><p class="page-subtitle">Loading team details...</p></div>`;

  const r_id = currentUser ? currentUser.id : "";
  fetch(`/api/teams/${teamId}?r_id=${encodeURIComponent(r_id)}`)
    .then(res => res.json())
    .then(data => {
      const team = data.team || data;
      if (data.error || !team || team.error) {
        container.innerHTML = `<div class="surface-panel" style="text-align:center; padding:32px;"><h3 style="color:var(--accent-red);">Team Not Found</h3></div>`;
        return;
      }
      renderTeamDetail(team);
    })
    .catch(() => {
      container.innerHTML = `<div class="surface-panel" style="text-align:center; padding:32px;"><h3 style="color:var(--accent-red);">Error loading team details</h3></div>`;
    });
}

function renderTeamDetail(team) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  const title = team.title || team.name || "Untitled Team";
  const desc = team.description || "No project pitch details provided.";
  const leaderId = (team.leader_id || team.leader_r_id || "").toUpperCase();
  const currentUserId = currentUser ? currentUser.id.toUpperCase() : null;
  const isLeader = currentUserId && currentUserId === leaderId;
  const isMember = currentUserId && team.members.some(m => ((m.student_id || m.r_id || "").toUpperCase()) === currentUserId);
  const isFull = team.members.length >= 6;
  const openSlots = 6 - team.members.length;

  const heroHtml = `
    <div class="surface-panel">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:8px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <h1 class="page-title" style="font-size:1.35rem;">${escapeHtml(title)}</h1>
            <span class="status-pill ${isFull ? 'full' : 'open'}">
              ${isFull ? 'Team Full (6/6)' : openSlots + ' Open Seats'}
            </span>
          </div>
          <p class="page-subtitle" style="font-size:0.8125rem; line-height:1.45; max-width:600px;">${escapeHtml(desc)}</p>
        </div>

        ${team.whatsapp_link ? `
          <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" class="btn-whatsapp">
            Official WhatsApp Group ➔
          </a>
        ` : ""}
      </div>
    </div>
  `;

  let rosterHtml = "";
  for (let i = 0; i < 6; i++) {
    const member = team.members[i];
    if (member) {
      const mId = member.student_id || member.r_id || "U";
      const mName = member.name || mId;
      const mRole = (member.role || "member").toLowerCase();
      const isTeamLeader = mRole === "leader" || mId.toUpperCase() === leaderId;
      const isMe = currentUserId && mId.toUpperCase() === currentUserId;
      const canRemove = isLeader && !isTeamLeader;

      const initial = mName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
      const avatarSrc = member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mId)}`;

      rosterHtml += `
        <div class="member-row">
          <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
            <div class="member-avatar-box">
              <span class="avatar-initial">${escapeHtml(initial)}</span>
              <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(mName)}" loading="lazy" onerror="this.remove();">
            </div>

            <div class="member-details">
              <div class="member-name-row">
                <span class="member-name">${escapeHtml(mName)}</span>
                ${isMe ? `<span class="status-pill user-tag">(You)</span>` : ""}
                <span class="status-pill ${isTeamLeader ? 'leader' : 'full'}">${isTeamLeader ? 'Leader' : 'Member'}</span>
              </div>

              <div class="member-meta-row">
                <span>${escapeHtml(mId)} • ${escapeHtml(member.gender || 'Student')}</span>
                ${member.dob && member.dob !== 'N/A' ? `<span> • DOB: ${escapeHtml(member.dob)}</span>` : ""}
              </div>

              ${member.email ? `
                <div style="margin-top:1px;">
                  <a href="mailto:${escapeHtml(member.email)}" class="member-email-link">${escapeHtml(member.email)}</a>
                </div>
              ` : ""}
            </div>
          </div>

          ${canRemove ? `
            <button onclick="confirmRemoveMember('${team.id}', '${mId}', '${escapeHtml(mName)}')" class="btn-danger">
              Remove
            </button>
          ` : ""}
        </div>
      `;
    } else {
      rosterHtml += `
        <div class="member-open-row">
          <div class="plus-circle">+</div>
          <div>
            <div style="font-size:0.8125rem; font-weight:650; color:var(--text-secondary);">Seat ${i + 1} Open</div>
            <div class="meta-text">Available for join requests</div>
          </div>
        </div>
      `;
    }
  }

  const rosterSectionHtml = `
    <div class="surface-panel">
      <h3 class="section-title" style="margin-bottom:10px;">Team Roster (${team.members.length} / 6)</h3>
      <div class="roster-grid">
        ${rosterHtml}
      </div>
    </div>
  `;

  let actionPanelHtml = "";

  if (!currentUser) {
    actionPanelHtml = `
      <div class="surface-panel" style="text-align:center; padding:20px;">
        <p class="page-subtitle" style="margin-bottom:10px;">Sign in with your College R-ID to request to join this team.</p>
        <a href="/login" class="btn-primary">Sign In to Request</a>
      </div>
    `;
  } else if (isLeader) {
    actionPanelHtml = `
      <div class="surface-panel" id="leaderAdminPanel">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <h3 class="section-title" style="margin-bottom:0;">Leader Controls</h3>
          <button onclick="confirmDisbandTeam('${team.id}')" class="btn-danger">
            Disband Team
          </button>
        </div>

        <div id="pendingRequestsContainer">
          <p class="page-subtitle" style="font-size:0.75rem;">Loading pending join requests...</p>
        </div>
      </div>
    `;
  } else if (isMember) {
    actionPanelHtml = `
      <div class="surface-panel" style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div style="font-size:0.8125rem; font-weight:650;">You are a member of this team</div>
          <div class="meta-text">Collaborate with your teammates on WhatsApp or in person.</div>
        </div>
        <button onclick="confirmLeaveTeam('${team.id}')" class="btn-danger">
          Leave Team
        </button>
      </div>
    `;
  } else if (!isFull) {
    actionPanelHtml = `
      <div class="surface-panel">
        <h3 class="section-title">Request to Join Team</h3>
        <p class="page-subtitle" style="margin-bottom:10px;">Send a message to the team leader introducing your skills.</p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <textarea id="joinMessageInput" rows="2" class="form-textarea" placeholder="e.g. Hi, I have experience in Python backend and would love to join your project..."></textarea>
          <button onclick="submitJoinRequest('${team.id}')" class="btn-primary" style="align-self:flex-start;">
            Send Join Request
          </button>
        </div>
      </div>
    `;
  }

  container.innerHTML = heroHtml + rosterSectionHtml + actionPanelHtml;
  if (isLeader) {
    loadTeamJoinRequests(team.id);
  }
}

function loadTeamJoinRequests(teamId) {
  const container = document.getElementById("pendingRequestsContainer");
  if (!container) return;

  fetch(`/api/teams/${teamId}/requests?leader_r_id=${encodeURIComponent(currentUser ? currentUser.id : "")}`)
    .then(res => res.json())
    .then(data => {
      const requests = data.requests || [];
      if (requests.length === 0) {
        container.innerHTML = `<p class="meta-text">No pending join requests.</p>`;
        return;
      }

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
          ${requests.map(req => `
            <div style="background:rgba(0,0,0,0.03); border:1px solid rgba(0,0,0,0.06); border-radius:var(--radius-control); padding:10px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
              <div>
                <div style="font-size:0.8125rem; font-weight:650; color:var(--text-primary);">${escapeHtml(req.student_name || req.student_r_id)} <span class="meta-text">(${escapeHtml(req.student_r_id)})</span></div>
                ${req.message ? `<div class="card-pitch" style="margin-top:2px;">"${escapeHtml(req.message)}"</div>` : ""}
              </div>
              <div style="display:flex; gap:6px; flex-shrink:0;">
                <button onclick="handleJoinRequestAction('${teamId}', '${req.id}', 'accept')" class="btn-primary" style="background:var(--accent-green); height:26px; padding:0 8px; font-size:0.6875rem;">Accept</button>
                <button onclick="handleJoinRequestAction('${teamId}', '${req.id}', 'reject')" class="btn-danger" style="height:26px; padding:0 8px; font-size:0.6875rem;">Decline</button>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    })
    .catch(() => {
      container.innerHTML = `<p class="meta-text">Failed to load requests.</p>`;
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
        loadTeamDetailView(teamId);
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
   5. USER PROFILE VIEW (IDENTITY HERO, COLLEGE RECORD GRID & MY TEAMS)
   ========================================================================== */
function loadProfileView() {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="surface-panel" style="text-align:center; padding:32px;">
        <h2 class="page-title" style="font-size:1.25rem; margin-bottom:6px;">Sign In Required</h2>
        <p class="page-subtitle" style="margin-bottom:14px;">Sign in with your College R-ID to view your profile and joined teams.</p>
        <a href="/login" class="btn-primary" style="display:inline-flex;">Sign In with R-ID</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="surface-panel" style="text-align:center; padding:32px;"><p class="page-subtitle">Loading student profile...</p></div>`;

  fetch(`/api/user/profile?r_id=${encodeURIComponent(currentUser.id)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        container.innerHTML = `<div class="surface-panel" style="text-align:center; padding:32px;"><h3 style="color:var(--accent-red);">${escapeHtml(data.message || "Failed to load profile")}</h3></div>`;
        return;
      }
      renderFullProfile(data.profile, data.teams || []);
    })
    .catch(() => {
      container.innerHTML = `<div class="surface-panel" style="text-align:center; padding:32px;"><h3 style="color:var(--accent-red);">Error loading profile</h3></div>`;
    });
}

function renderFullProfile(prof, userTeams) {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  const initial = (prof.name || prof.r_id).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
  const avatarSrc = prof.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(prof.r_id)}`;

  const heroHtml = `
    <div class="surface-panel">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="member-avatar-box" style="width:48px; height:48px;">
            <span class="avatar-initial" style="font-size:1rem;">${escapeHtml(initial)}</span>
            <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(prof.name)}" loading="lazy" onerror="this.remove();">
          </div>

          <div>
            <h1 class="page-title" style="font-size:1.25rem;">${escapeHtml(prof.name)}</h1>
            <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
              <span class="status-pill user-tag">${escapeHtml(prof.r_id)}</span>
              <span class="meta-text">${escapeHtml(prof.gender || "Student")}</span>
            </div>
          </div>
        </div>

        <button onclick="logoutUser()" class="btn-danger" style="height:28px; font-size:0.75rem;">
          Sign Out
        </button>
      </div>
    </div>
  `;

  const recordHtml = `
    <div class="surface-panel">
      <h3 class="section-title" style="margin-bottom:10px;">College Database Record</h3>
      <div class="profile-record-grid">
        <div class="profile-field-item">
          <div class="field-label">Email Address</div>
          <div class="field-value">${escapeHtml(prof.email || "N/A")}</div>
        </div>

        <div class="profile-field-item">
          <div class="field-label">Mobile Phone</div>
          <div class="field-value">${escapeHtml(prof.phone || "N/A")}</div>
        </div>

        <div class="profile-field-item">
          <div class="field-label">Date of Birth</div>
          <div class="field-value" style="color:var(--accent-blue);">${escapeHtml(prof.dob || "N/A")}</div>
        </div>

        <div class="profile-field-item">
          <div class="field-label">Father's Name</div>
          <div class="field-value">${escapeHtml(prof.father_name || "N/A")}</div>
        </div>

        <div class="profile-field-item" style="grid-column: 1 / -1;">
          <div class="field-label">Residential Address</div>
          <div class="field-value" style="font-weight:500;">${escapeHtml(prof.address || "N/A")}</div>
        </div>
      </div>
    </div>
  `;

  let teamsGridHtml = "";
  if (!userTeams || userTeams.length === 0) {
    teamsGridHtml = `
      <div style="text-align:center; padding:20px;">
        <p class="page-subtitle">You are not currently in any hackathon team.</p>
        <a href="/create-team" class="btn-primary" style="margin-top:10px; display:inline-flex;">Create Team</a>
      </div>
    `;
  } else {
    teamsGridHtml = `
      <div class="teams-grid">
        ${userTeams.map(t => renderSingleTeamCard(t)).join("")}
      </div>
    `;
  }

  const myTeamsSectionHtml = `
    <div class="surface-panel">
      <h3 class="section-title" style="margin-bottom:10px;">My Teams (${userTeams.length})</h3>
      ${teamsGridHtml}
    </div>
  `;

  container.innerHTML = heroHtml + recordHtml + myTeamsSectionHtml;
}

function logoutUser() {
  fetch("/api/auth/logout", { method: "POST" })
    .then(() => {
      currentUser = null;
      renderNavUserSlots();
      showToast("Signed out", "info");
      navigateTo("/");
    })
    .catch(() => {
      currentUser = null;
      renderNavUserSlots();
      navigateTo("/");
    });
}

/* ==========================================================================
   6. CREATE TEAM VIEW (5-STEP STRUCTURED FLOW & 2x3 PREVIEW)
   ========================================================================== */
function loadCreateTeamView() {
  selectedFriends = [];
  const container = document.getElementById("createTeamViewContainer");
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="surface-panel" style="text-align:center; padding:32px;">
        <h2 class="page-title" style="font-size:1.25rem; margin-bottom:6px;">Sign In Required</h2>
        <p class="page-subtitle" style="margin-bottom:14px;">Sign in with your College R-ID to create and publish a hackathon team.</p>
        <a href="/login" class="btn-primary" style="display:inline-flex;">Sign In with R-ID</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="surface-panel">
      <h1 class="page-title" style="font-size:1.25rem;">Create New Team</h1>
      <p class="page-subtitle" style="margin-bottom:14px;">Build your 6-seat team: pre-add friends or leave seats open for requests.</p>

      <div style="display:flex; flex-direction:column; gap:12px;">
        <div>
          <label class="field-label" style="display:block; margin-bottom:4px;">Team Title *</label>
          <input type="text" id="teamNameInput" placeholder="e.g. CyberStorm, NeuroVision" class="form-input">
        </div>

        <div>
          <label class="field-label" style="display:block; margin-bottom:4px;">Project Pitch</label>
          <textarea id="teamDescInput" rows="2" placeholder="Describe your hackathon project pitch or required skills..." class="form-textarea"></textarea>
        </div>

        <div>
          <label class="field-label" style="display:block; color:var(--accent-blue); margin-bottom:4px;">WhatsApp Group Link (Optional)</label>
          <input type="text" id="teamWhatsappInput" placeholder="https://chat.whatsapp.com/..." class="form-input">
        </div>

        <div style="padding-top:10px; border-top:1px solid rgba(0,0,0,0.06); position:relative;">
          <label class="field-label" style="display:block; margin-bottom:4px;">Search & Pre-Add Teammates</label>
          <input type="text" id="friendSearchInput" placeholder="Type student R-ID or name..." class="form-input" oninput="debounceFriendSearch()">
          <div id="friendSearchResults" class="search-dropdown" style="display:none;"></div>
        </div>

        <div>
          <label class="field-label" style="display:block; margin-bottom:6px;">6-Seat Visual Preview</label>
          <div id="createTeamSeatsContainer" class="seat-preview-grid"></div>
        </div>

        <button onclick="submitCreateTeam()" id="btnSubmitCreate" class="btn-primary" style="height:34px; width:100%; margin-top:4px;">
          Create & Publish Team
        </button>
      </div>
    </div>
  `;

  renderCreateTeamSeats();
}

function renderCreateTeamSeats() {
  const container = document.getElementById("createTeamSeatsContainer");
  if (!container) return;

  const leaderInitial = currentUser ? (currentUser.name || currentUser.id).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() : "U";

  let html = `
    <div class="seat-preview-box" style="background:var(--accent-blue-tint); border-color:var(--accent-blue-border);">
      <div class="field-label" style="color:var(--accent-blue); font-size:0.5625rem;">Seat 1 (Leader)</div>
      <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
        <div class="avatar-stack-item" style="width:20px; height:20px;">
          <span class="avatar-initial" style="font-size:0.5rem;">${escapeHtml(leaderInitial)}</span>
          <img src="${escapeHtml(currentUser.avatar_url || '')}" loading="lazy" onerror="this.remove();">
        </div>
        <span style="font-size:0.75rem; font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${escapeHtml(currentUser.name || currentUser.id)}
        </span>
      </div>
    </div>
  `;

  for (let i = 0; i < 5; i++) {
    const friend = selectedFriends[i];
    if (friend) {
      const fInitial = (friend.name || friend.id).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
      html += `
        <div class="seat-preview-box">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span class="field-label" style="font-size:0.5625rem;">Seat ${i + 2}</span>
            <button onclick="removeFriendFromCreate('${friend.id}')" style="background:none; border:none; color:var(--accent-red); font-size:0.75rem; cursor:pointer; padding:0;">×</button>
          </div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
            <div class="avatar-stack-item" style="width:20px; height:20px;">
              <span class="avatar-initial" style="font-size:0.5rem;">${escapeHtml(fInitial)}</span>
              <img src="${escapeHtml(friend.avatar_url || '')}" loading="lazy" onerror="this.remove();">
            </div>
            <span style="font-size:0.75rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(friend.name || friend.id)}
            </span>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="seat-preview-box" style="border:1px dashed rgba(0,0,0,0.12); opacity:0.65;">
          <span class="field-label" style="font-size:0.5625rem;">Seat ${i + 2}</span>
          <span class="meta-text" style="font-size:0.6875rem; margin-top:4px;">Open for Requests</span>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

function debounceFriendSearch() {
  clearTimeout(friendSearchDebounce);
  friendSearchDebounce = setTimeout(() => {
    const input = document.getElementById("friendSearchInput");
    const resultsDiv = document.getElementById("friendSearchResults");
    if (!input || !resultsDiv) return;

    const q = input.value.trim();
    if (q.length < 2) {
      resultsDiv.style.display = "none";
      return;
    }

    if (friendSearchAbortController) friendSearchAbortController.abort();
    friendSearchAbortController = new AbortController();

    fetch(`/api/students/search?q=${encodeURIComponent(q)}`, { signal: friendSearchAbortController.signal })
      .then(res => res.json())
      .then(data => {
        const students = data.students || [];
        if (students.length === 0) {
          resultsDiv.innerHTML = `<div style="padding:10px; font-size:0.75rem; color:var(--text-tertiary);">No students found</div>`;
          resultsDiv.style.display = "block";
          return;
        }

        resultsDiv.innerHTML = students.map(s => {
          const initial = s.name.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
          return `
            <div class="search-dropdown-item" onclick="addFriendToCreate('${escapeHtml(s.r_id)}', '${escapeHtml(s.name)}', '${escapeHtml(s.avatar_url || '')}')">
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="avatar-stack-item" style="width:24px; height:24px;">
                  <span class="avatar-initial">${escapeHtml(initial)}</span>
                  <img src="${escapeHtml(s.avatar_url || '')}" loading="lazy" onerror="this.remove();">
                </div>
                <div>
                  <div style="font-size:0.8125rem; font-weight:650;">${escapeHtml(s.name)}</div>
                  <div class="meta-text">${escapeHtml(s.r_id)} • ${escapeHtml(s.gender || 'Student')}</div>
                </div>
              </div>
              <span style="font-size:0.75rem; color:var(--accent-blue); font-weight:600;">+ Add</span>
            </div>
          `;
        }).join("");
        resultsDiv.style.display = "block";
      })
      .catch(err => {
        if (err.name !== "AbortError") resultsDiv.style.display = "none";
      });
  }, 120);
}

function addFriendToCreate(id, name, avatarUrl) {
  if (selectedFriends.length >= 5) {
    showToast("Team limit is 6 members (Leader + 5)", "error");
    return;
  }
  if (selectedFriends.some(f => f.id.toUpperCase() === id.toUpperCase())) {
    showToast("Student already added", "error");
    return;
  }
  if (currentUser && currentUser.id.toUpperCase() === id.toUpperCase()) {
    showToast("You are already the team leader", "error");
    return;
  }

  selectedFriends.push({ id, name, avatar_url: avatarUrl });
  const resultsDiv = document.getElementById("friendSearchResults");
  const input = document.getElementById("friendSearchInput");
  if (resultsDiv) resultsDiv.style.display = "none";
  if (input) input.value = "";
  renderCreateTeamSeats();
}

function removeFriendFromCreate(id) {
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
        navigateTo(`/team/${data.team_id || (data.team && data.team.id)}`);
      } else {
        showToast(data.message || "Failed to create team", "error");
      }
    })
    .catch(() => {
      btn.disabled = false;
      btn.innerText = "Create & Publish Team";
      showToast("Network error creating team", "error");
    });
}

/* ==========================================================================
   7. STUDENT DIRECTORY SEARCH VIEW
   ========================================================================== */
function loadStudentsView() {
  const container = document.getElementById("studentsViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="surface-panel">
      <h1 class="page-title" style="font-size:1.25rem;">Student Directory</h1>
      <p class="page-subtitle" style="margin-bottom:12px;">Search college student database by R-ID or Name.</p>

      <div class="search-wrapper" style="margin-bottom:14px;">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
        <input type="text" id="dirSearchInput" placeholder="Type student R-ID or Name (e.g. R15006, Rahul)..." class="search-input" oninput="debounceDirectorySearch()">
      </div>

      <div id="dirSearchResults" style="display:flex; flex-direction:column; gap:6px;">
        <p class="meta-text" style="text-align:center; padding:24px;">Type student R-ID or name above to search</p>
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
    if (query.length < 2) {
      resultsDiv.innerHTML = `<p class="meta-text" style="text-align:center; padding:24px;">Type student R-ID or name above to search</p>`;
      return;
    }

    if (currentSearchAbortController) currentSearchAbortController.abort();
    currentSearchAbortController = new AbortController();

    fetch(`/api/students/search?q=${encodeURIComponent(query)}`, { signal: currentSearchAbortController.signal })
      .then(res => res.json())
      .then(data => {
        const students = data.students || [];
        if (students.length === 0) {
          resultsDiv.innerHTML = `<p class="meta-text" style="text-align:center; padding:24px;">No students matching "${escapeHtml(query)}"</p>`;
          return;
        }

        resultsDiv.innerHTML = students.map(s => {
          const initial = s.name.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
          return `
            <div class="member-row">
              <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                <div class="member-avatar-box">
                  <span class="avatar-initial">${escapeHtml(initial)}</span>
                  <img src="${escapeHtml(s.avatar_url || '')}" alt="${escapeHtml(s.name)}" loading="lazy" onerror="this.remove();">
                </div>
                <div>
                  <div class="member-name">${escapeHtml(s.name)}</div>
                  <div class="member-meta-row">
                    <span>${escapeHtml(s.r_id)} • ${escapeHtml(s.gender || 'Student')}</span>
                    ${s.dob && s.dob !== 'N/A' ? `<span> • DOB: ${escapeHtml(s.dob)}</span>` : ""}
                  </div>
                  ${s.email ? `<a href="mailto:${escapeHtml(s.email)}" class="member-email-link">${escapeHtml(s.email)}</a>` : ""}
                </div>
              </div>
            </div>
          `;
        }).join("");
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          resultsDiv.innerHTML = `<p class="meta-text" style="text-align:center; padding:24px; color:var(--accent-red);">Search failed</p>`;
        }
      });
  }, 120);
}

/* ==========================================================================
   8. LOGIN & AUTHENTICATION VIEW
   ========================================================================== */
function loadLoginView() {
  const container = document.getElementById("loginViewContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="surface-panel" style="padding:22px;">
      <h1 class="page-title" style="font-size:1.25rem; margin-bottom:2px;">Sign In with R-ID</h1>
      <p class="page-subtitle" style="margin-bottom:14px;">Enter your College R-ID to receive a verification code on your email.</p>

      <div id="authStep1">
        <div style="margin-bottom:12px;">
          <label class="field-label" style="display:block; margin-bottom:4px;">College R-ID</label>
          <input type="text" id="authRidInput" placeholder="e.g. R15006" class="form-input" style="font-weight:700; text-transform:uppercase; height:36px;">
        </div>

        <button onclick="sendEmailOtpCode()" id="btnSendOtp" class="btn-primary" style="width:100%; height:34px;">
          Send Verification Code
        </button>

        <div style="text-align:center; margin-top:12px;">
          <button onclick="showAuthStep(3)" style="font-size:0.75rem; color:var(--accent-blue); font-weight:600; background:none; border:none; cursor:pointer;">
            Unlisted R-ID? Register Account ➔
          </button>
        </div>
      </div>

      <div id="authStep2" style="display:none;">
        <div style="padding:8px 10px; background:var(--accent-blue-tint); border:1px solid var(--accent-blue-border); border-radius:var(--radius-control); margin-bottom:12px;">
          <div class="meta-text" style="color:var(--accent-blue);">Verification code sent to:</div>
          <div id="targetEmailDisplay" style="font-size:0.8125rem; font-weight:700; color:var(--text-primary); margin-top:2px;"></div>
        </div>

        <div style="margin-bottom:12px;">
          <label class="field-label" style="display:block; text-align:center; margin-bottom:4px;">Enter 6-Digit Code</label>
          <input type="text" id="otpCodeInput" placeholder="123456" maxlength="6" class="form-input" style="height:42px; font-size:1.25rem; font-weight:750; text-align:center; letter-spacing:0.2em; color:var(--text-primary);">
        </div>

        <button onclick="verifyEmailOtpCode()" id="btnVerifyOtp" class="btn-primary" style="width:100%; height:34px;">
          Verify & Sign In
        </button>

        <button onclick="showAuthStep(1)" style="width:100%; text-align:center; margin-top:10px; font-size:0.75rem; color:var(--text-tertiary); font-weight:500; background:none; border:none; cursor:pointer;">
          ← Back to R-ID Input
        </button>
      </div>

      <div id="authStepRegister" style="display:none;">
        <div style="display:flex; flex-direction:column; gap:10px;">
          <input type="text" id="regRid" placeholder="College R-ID (e.g. R15006)" class="form-input" style="font-weight:700; text-transform:uppercase;">
          <input type="text" id="regName" placeholder="Full Name" class="form-input">
          <input type="email" id="regEmail" placeholder="College Email Address" class="form-input">
          <select id="regGender" class="form-input" style="font-weight:500;">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <input type="text" id="regDob" placeholder="Date of Birth (e.g. 12 Nov 2002)" class="form-input">
          <button onclick="submitManualRegister()" class="btn-primary" style="height:34px; margin-top:4px;">
            Register & Sign In
          </button>
          <button onclick="showAuthStep(1)" style="width:100%; text-align:center; margin-top:6px; font-size:0.75rem; color:var(--text-tertiary); font-weight:500; background:none; border:none; cursor:pointer;">
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  `;
}

function showAuthStep(step) {
  const s1 = document.getElementById("authStep1");
  const s2 = document.getElementById("authStep2");
  const sReg = document.getElementById("authStepRegister");

  if (s1) s1.style.display = step === 1 ? "block" : "none";
  if (s2) s2.style.display = step === 2 ? "block" : "none";
  if (sReg) sReg.style.display = step === 3 ? "block" : "none";
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
  const ridInput = document.getElementById("authRidInput");
  const otpInput = document.getElementById("otpCodeInput");
  const btn = document.getElementById("btnVerifyOtp");

  if (!otpInput || !otpInput.value.trim()) {
    showToast("Please enter 6-digit verification code", "error");
    return;
  }

  const rid = ridInput ? ridInput.value.trim().toUpperCase() : "";
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
    .catch(() => {
      btn.disabled = false;
      btn.innerText = "Verify & Sign In";
      showToast("Verification error", "error");
    });
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
    .catch(() => showToast("Registration network error", "error"));
}

/* ==========================================================================
   9. GLASS CONFIRMATION MODAL
   ========================================================================== */
function showGlassModal(opts) {
  const overlay = document.getElementById("glassModalOverlay");
  const sheet = document.getElementById("glassModalSheet");
  if (!overlay || !sheet) return;

  sheet.innerHTML = `
    <h3 class="page-title" style="font-size:1.125rem; margin-bottom:6px;">${escapeHtml(opts.title || "Confirm Action")}</h3>
    <p class="page-subtitle" style="margin-bottom:14px;">${escapeHtml(opts.message || "Are you sure?")}</p>
    <div style="display:flex; justify-content:flex-end; gap:8px;">
      <button onclick="hideGlassModal()" class="btn-secondary">Cancel</button>
      <button id="modalConfirmBtn" class="${opts.isDanger ? 'btn-danger' : 'btn-primary'}" style="height:30px; font-size:0.8125rem;">
        ${escapeHtml(opts.confirmText || "Confirm")}
      </button>
    </div>
  `;

  document.getElementById("modalConfirmBtn").onclick = () => {
    hideGlassModal();
    if (opts.onConfirm) opts.onConfirm();
  };

  overlay.classList.add("active");
}

function hideGlassModal() {
  const overlay = document.getElementById("glassModalOverlay");
  if (overlay) overlay.classList.remove("active");
}

/* ==========================================================================
   HELPERS & TOAST NOTIFICATIONS
   ========================================================================== */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-item ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    toast.style.transition = "all 0.2s ease";
    setTimeout(() => toast.remove(), 200);
  }, 2400);
}
