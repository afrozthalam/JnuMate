/**
 * HackMate — Application Engine
 * iOS 27 Liquid Glass Visual System, Client SPA Router, Real Database & Course Integration
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
    const rawName = (currentUser.name || currentUser.id || "Student") + "";
    const cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim() || "Student";
    const initial = cleanName.charAt(0).toUpperCase() || 'U';
    const firstName = cleanName.split(' ')[0] || cleanName;
    const avatarUrl = currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.id || 'Student')}`;

    const userHtml = `
      <div style="display:flex; align-items:center; gap:8px;">
        <a href="/profile" style="text-decoration:none; display:flex; align-items:center; gap:6px;">
          <div class="avatar-stack-item" style="width:28px; height:28px; border:1px solid var(--nav-glass-border); margin-left:0;">
            <span style="font-size:0.6875rem; font-weight:700; color:var(--text-secondary);">${escapeHtml(initial)}</span>
            <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(firstName)}" loading="lazy" onerror="this.remove();" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <span style="font-size:0.875rem; font-weight:600; color:var(--text-primary); max-width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(firstName)}
          </span>
        </a>
      </div>
    `;
    if (dtSlot) dtSlot.innerHTML = userHtml;
    if (mbSlot) mbSlot.innerHTML = userHtml;
  } else {
    const loginHtml = `
      <a href="/login" class="nav-signin-link">
        Sign In
      </a>
    `;
    if (dtSlot) dtSlot.innerHTML = loginHtml;
    if (mbSlot) mbSlot.innerHTML = loginHtml;
  }
}

function logoutUser() {
  fetch("/api/auth/logout", { method: "POST" })
    .then(res => res.json())
    .then(() => {
      currentUser = null;
      clientCache.teamsList = null;
      renderNavUserSlots();
      showToast("Signed out successfully", "info");
      navigateTo("/");
    })
    .catch(() => {
      currentUser = null;
      renderNavUserSlots();
      navigateTo("/");
    });
}

/* ==========================================================================
   3. DISCOVER VIEW (STRICT 2-COLUMN MOBILE GRID & FAST CACHED FILTERING)
   ========================================================================== */
function loadDiscoverView() {
  const grid = document.getElementById("teamsGridContainer") || document.getElementById("discoverTeamsGrid");
  if (!grid) return;

  if (clientCache.teamsList && clientCache.teamsList.length > 0) {
    try {
      renderFilteredTeams(clientCache.teamsList);
    } catch (e) {
      console.warn("Cached render notice:", e);
    }
  } else {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:32px 0;">
        <p class="page-subtitle">Loading hackathon teams...</p>
      </div>
    `;
  }

  fetch("/api/teams")
    .then(res => {
      if (!res.ok) throw new Error("HTTP error " + res.status);
      return res.json();
    })
    .then(data => {
      clientCache.teamsList = (data && data.teams) ? data.teams : [];
      try {
        renderFilteredTeams(clientCache.teamsList);
      } catch (renderError) {
        console.error("renderFilteredTeams error:", renderError);
      }
    })
    .catch(err => {
      console.error("Failed to load teams:", err);
      if (!clientCache.teamsList || clientCache.teamsList.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align:center; padding:36px 16px;">
            <p class="page-subtitle" style="margin-bottom:12px;">Unable to load teams right now.</p>
            <button onclick="clientCache.teamsList=null;loadDiscoverView()" class="btn-primary" style="padding:8px 20px; font-size:0.875rem;">Refresh Teams</button>
          </div>
        `;
      }
    });
}

function setDiscoverFilter(type) {
  discoverFilter = type;
  document.querySelectorAll(".segmented-btn, .pill-segment").forEach(btn => {
    if (btn.getAttribute("data-filter") === type || (type === 'all' && btn.id === 'btnFilterAll') || (type === 'open' && btn.id === 'btnFilterOpen')) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  if (clientCache.teamsList) {
    renderFilteredTeams(clientCache.teamsList);
  }
}

function debounceDiscoverSearch() {
  clearTimeout(discoverSearchDebounce);
  discoverSearchDebounce = setTimeout(() => {
    const input = document.getElementById("searchInput") || document.getElementById("discoverSearchInput");
    if (input) {
      discoverSearchTerm = input.value.trim().toLowerCase();
      if (clientCache.teamsList) {
        renderFilteredTeams(clientCache.teamsList);
      }
    }
  }, 80);
}

function renderFilteredTeams(teams) {
  const grid = document.getElementById("teamsGridContainer") || document.getElementById("discoverTeamsGrid");
  if (!grid) return;

  if (!Array.isArray(teams)) {
    teams = [];
  }

  let filtered = teams;

  if (discoverFilter === "open") {
    filtered = filtered.filter(t => t && !t.is_full);
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
    grid.innerHTML = `
      <div class="teams-empty-state">
        <h3 class="page-title" style="font-size:1.125rem; margin-bottom:4px;">No Teams Found</h3>
        <p class="page-subtitle">Try adjusting your search terms or filter.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(team => {
    if (!team) return "";
    const isFull = Boolean(team.is_full);
    const count = team.member_count || (team.members ? team.members.length : 0);
    const openSlots = Math.max(0, 6 - count);

    let statusPill = "";
    if (isFull) {
      statusPill = `<span class="status-pill full">Full (6/6)</span>`;
    } else {
      statusPill = `<span class="status-pill open">${openSlots} Open</span>`;
    }

    const avatarsHtml = (team.members || []).slice(0, 3).map(m => {
      if (!m) return "";
      const initial = ((m.name || m.r_id || 'U') + '').replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
      return `
        <div class="avatar-stack-item">
          <span class="avatar-initial">${escapeHtml(initial)}</span>
          <img src="${escapeHtml(m.avatar_url || '')}" alt="${escapeHtml(m.name || '')}" loading="lazy" onerror="this.remove();">
        </div>
      `;
    }).join("");

    return `
      <article class="team-card-module" onclick="navigateTo('/team/${team.id}')">
        <div class="card-top-row">
          ${statusPill}
          <div class="avatar-stack">
            ${avatarsHtml}
          </div>
        </div>

        <div>
          <h2 class="card-title">${escapeHtml(team.name || 'Untitled Team')}</h2>
          <p class="card-pitch">${escapeHtml(team.description || "Building an innovative hackathon solution.")}</p>
        </div>

        <div class="card-bottom-row">
          <span class="meta-text">${count}/6 members</span>
          <span class="card-action-hint">View ➔</span>
        </div>
      </article>
    `;
  }).join("");
}

/* ==========================================================================
   4. TEAM DETAIL VIEW (ROSTER, VACANT SEATS WITH DIRECT ADD & TEAM EDIT)
   ========================================================================== */
function loadTeamDetailView(teamId) {
  const container = document.getElementById("teamDetailViewContainer") || document.getElementById("teamDetailContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="surface-panel" style="text-align:center; padding:32px 0;">
      <p class="page-subtitle">Loading team details...</p>
    </div>
  `;

  const userRidParam = currentUser ? `?r_id=${encodeURIComponent(currentUser.id)}` : "";

  fetch(`/api/teams/${teamId}${userRidParam}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        container.innerHTML = `
          <div class="surface-panel" style="text-align:center; padding:32px;">
            <h2 class="page-title" style="color:var(--accent-red); margin-bottom:8px;">Team Not Found</h2>
            <p class="page-subtitle" style="margin-bottom:16px;">The team you are looking for does not exist or has been disbanded.</p>
            <a href="/" class="btn-primary">← Back to Discover</a>
          </div>
        `;
        return;
      }
      renderFullTeamDetail(data.team);
    })
    .catch(() => {
      container.innerHTML = `
        <div class="surface-panel" style="text-align:center; padding:32px; color:var(--accent-red);">
          <p class="page-subtitle">Failed to load team details.</p>
          <a href="/" class="btn-primary" style="margin-top:12px;">← Back to Discover</a>
        </div>
      `;
    });
}

function renderFullTeamDetail(team) {
  const container = document.getElementById("teamDetailViewContainer") || document.getElementById("teamDetailContainer");
  if (!container) return;

  const count = team.member_count || (team.members ? team.members.length : 0);
  const isFull = team.is_full;
  const isLeader = currentUser && (team.leader_r_id.toUpperCase() === currentUser.id.toUpperCase());
  const isMember = currentUser && (team.members || []).some(m => m.r_id.toUpperCase() === currentUser.id.toUpperCase());

  // Hero Section
  const heroHtml = `
    <div style="margin-bottom:12px;">
      <a href="/" class="btn-primary" style="background:var(--card-bg); color:var(--text-secondary); border:1px solid var(--card-border); height:28px; padding:0 12px; font-size:0.75rem; display:inline-flex;">
        ← Back to Discover Teams
      </a>
    </div>

    <div class="surface-panel" style="margin-bottom:14px;">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="flex:1; min-width:240px;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <h1 class="page-title" style="font-size:1.375rem;">${escapeHtml(team.name)}</h1>
            <span class="status-pill ${isFull ? 'full' : 'open'}">
              ${isFull ? 'Team Full (6/6)' : `${6 - count} Open Seats`}
            </span>
          </div>
          <p class="page-subtitle" style="margin-top:4px; font-size:0.875rem;">
            ${escapeHtml(team.description || "Building an innovative hackathon solution.")}
          </p>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          ${isLeader ? `
            <button onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="btn-primary" style="height:32px; font-size:0.75rem; background:rgba(0,0,0,0.06); color:var(--text-primary); border:1px solid rgba(0,0,0,0.12);">
              ✎ Edit Team
            </button>
          ` : ''}

          ${team.whatsapp_link ? `
            <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" class="btn-primary" style="background:#E6F7ED; color:#0F8B44; border:1px solid #B8E8CA; height:32px; font-size:0.75rem;">
              Official WhatsApp Group ➔
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // 6-Seat Visual Roster Grid
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
      const rolePill = m.role === 'leader'
        ? `<span class="status-pill leader">Leader</span>`
        : `<span class="status-pill" style="color:var(--text-secondary); background:rgba(0,0,0,0.05); border:1px solid rgba(0,0,0,0.08);">Member</span>`;
      const avatarUrl = m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mRid || 'Student')}`;

      rosterCardsHtml += `
        <div class="member-row">
          <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
            <div class="member-avatar-box">
              <span class="avatar-initial">${escapeHtml(initial)}</span>
              <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(mName)}" loading="lazy" onerror="this.remove();">
            </div>

            <div style="min-width:0; flex:1;">
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span class="member-name">${escapeHtml(mName)}</span>
                ${isYou ? `<span class="status-pill user-tag">(You)</span>` : ""}
                ${rolePill}
              </div>

              <div class="member-meta-row" style="margin-top:2px;">
                <span>${escapeHtml(mRid)} • ${escapeHtml(m.gender || 'Student')}</span>
                ${m.dob && m.dob !== 'N/A' ? `<span> • DOB: ${escapeHtml(m.dob)}</span>` : ""}
              </div>

              ${m.program ? `
                <div style="display:flex; align-items:center; gap:4px; margin-top:3px; flex-wrap:wrap;">
                  <span class="program-pill">${escapeHtml(m.program)}</span>
                  ${m.semester_year ? `<span class="semester-pill">${escapeHtml(m.semester_year)}</span>` : ''}
                </div>
              ` : ''}

              ${m.email ? `
                <a href="mailto:${escapeHtml(m.email)}" class="member-email-link" style="margin-top:3px; display:inline-block;">
                  ${escapeHtml(m.email)}
                </a>
              ` : ""}
            </div>
          </div>

          ${isLeader && m.role !== 'leader' ? `
            <button onclick="confirmRemoveMember('${team.id}', '${mRid}', '${escapeAttr(mName)}')" class="btn-danger" style="margin-left:8px; height:26px; padding:0 8px; font-size:0.6875rem; flex-shrink:0;">
              Remove
            </button>
          ` : ""}
        </div>
      `;
    } else {
      // Vacant Seat
      rosterCardsHtml += `
        <div class="member-row open-seat-row" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px; min-width:0;">
            <div class="open-seat-icon">+</div>
            <div>
              <div class="open-seat-title">Seat ${i + 1} Open</div>
              <div class="open-seat-meta">${isLeader ? 'Open for requests or add teammate' : 'Available for join requests'}</div>
            </div>
          </div>

          ${isLeader ? `
            <button onclick="openAddMemberModal('${team.id}', ${i + 1})" class="open-seat-action-btn">
              + Add Teammate
            </button>
          ` : ''}
        </div>
      `;
    }
  }

  const rosterSectionHtml = `
    <div class="surface-panel" style="margin-bottom:14px;">
      <h3 class="section-title" style="margin-bottom:12px;">Team Roster (${count} / 6)</h3>
      <div class="roster-grid">
        ${rosterCardsHtml}
      </div>
    </div>
  `;

  // Action Panel (Leader Controls, Join Request, Leave Team)
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
        container.innerHTML = `<p class="meta-text" style="font-size:0.75rem; color:var(--text-tertiary);">No pending join requests.</p>`;
        return;
      }

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
          ${requests.map(req => `
            <div style="background:rgba(0,0,0,0.03); border:1px solid rgba(0,0,0,0.06); border-radius:var(--radius-control); padding:10px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
              <div>
                <div style="font-size:0.8125rem; font-weight:650; color:var(--text-primary);">${escapeHtml(req.name || req.student_name || req.r_id)} <span class="meta-text">(${escapeHtml(req.r_id)})</span></div>
                ${req.message ? `<div class="card-pitch" style="margin-top:2px;">"${escapeHtml(req.message)}"</div>` : ""}
              </div>
              <div style="display:flex; gap:6px; flex-shrink:0;">
                <button onclick="handleJoinRequestAction('${teamId}', '${req.request_id || req.id}', 'accept')" class="btn-primary" style="background:#E6F7ED; color:#0F8B44; border:1px solid #B8E8CA; height:26px; padding:0 8px; font-size:0.6875rem;">Accept</button>
                <button onclick="handleJoinRequestAction('${teamId}', '${req.request_id || req.id}', 'reject')" class="btn-danger" style="height:26px; padding:0 8px; font-size:0.6875rem;">Decline</button>
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
        clientCache.teamsList = null;
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
   4B. LEADER EDIT TEAM MODAL & DIRECT SEAT ASSIGN MODAL
   ========================================================================== */
function openEditTeamModal(teamId, curName, curDesc, curWa) {
  const overlay = document.getElementById("glassModalOverlay");
  const sheet = document.getElementById("glassModalSheet");
  if (!overlay || !sheet) return;

  sheet.innerHTML = `
    <h3 class="modal-title">Edit Team Details</h3>
    <p class="modal-message" style="margin-bottom:12px;">Modify your team name, hackathon project pitch, and WhatsApp invite link.</p>

    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
      <div>
        <label class="field-label" style="display:block; margin-bottom:4px;">Team Title *</label>
        <input type="text" id="editTeamNameInput" value="${escapeAttr(curName)}" class="form-input">
      </div>

      <div>
        <label class="field-label" style="display:block; margin-bottom:4px;">Project Pitch</label>
        <textarea id="editTeamDescInput" rows="3" class="form-textarea">${escapeHtml(curDesc)}</textarea>
      </div>

      <div>
        <label class="field-label" style="display:block; color:var(--accent-blue); margin-bottom:4px;">WhatsApp Invite Link</label>
        <input type="text" id="editTeamWaInput" value="${escapeAttr(curWa)}" placeholder="https://chat.whatsapp.com/..." class="form-input">
      </div>
    </div>

    <div style="display:flex; gap:8px; justify-content:flex-end;">
      <button onclick="closeGlassModal()" class="btn-primary" style="background:rgba(0,0,0,0.06); color:var(--text-primary); border:1px solid rgba(0,0,0,0.12);">
        Cancel
      </button>
      <button onclick="submitUpdateTeamDetails('${teamId}')" class="btn-primary" id="btnSaveTeamEdit">
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
    <h3 class="modal-title">Assign Seat ${seatNumber}</h3>
    <p class="modal-message" style="margin-bottom:12px;">Search university database by R-ID or Name to directly add a teammate.</p>

    <div style="position:relative; margin-bottom:14px;">
      <input type="text" id="seatStudentSearchInput" placeholder="Type student R-ID or name (e.g. R15008, Rahul)..." class="form-input" oninput="debounceSeatMemberSearch('${teamId}')">
      <div id="seatStudentSearchResults" class="search-dropdown" style="display:none; max-height:220px;"></div>
    </div>

    <div style="display:flex; justify-content:flex-end;">
      <button onclick="closeGlassModal()" class="btn-primary" style="background:rgba(0,0,0,0.06); color:var(--text-primary); border:1px solid rgba(0,0,0,0.12);">
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
    if (query.length < 2) {
      resultsDiv.style.display = "none";
      return;
    }

    if (seatSearchAbortController) seatSearchAbortController.abort();
    seatSearchAbortController = new AbortController();

    fetch(`/api/students/search?q=${encodeURIComponent(query)}`, { signal: seatSearchAbortController.signal })
      .then(res => res.json())
      .then(data => {
        const students = data.students || [];
        if (students.length === 0) {
          resultsDiv.innerHTML = `<div class="search-dropdown-item"><span class="meta-text">No students matching "${escapeHtml(query)}"</span></div>`;
          resultsDiv.style.display = "block";
          return;
        }

        resultsDiv.innerHTML = students.map(s => `
          <div class="search-dropdown-item" onclick="directAddTeammate('${teamId}', '${s.r_id}', '${escapeAttr(s.name)}')">
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="avatar-stack-item" style="width:24px; height:24px; margin-left:0;">
                <span class="avatar-initial" style="font-size:0.625rem;">${escapeHtml(s.name.charAt(0).toUpperCase())}</span>
                <img src="${escapeHtml(s.avatar_url || '')}" alt="${escapeHtml(s.name)}" loading="lazy" onerror="this.remove();">
              </div>
              <div>
                <div style="font-size:0.8125rem; font-weight:650; color:var(--text-primary);">${escapeHtml(s.name)}</div>
                <div class="meta-text">${escapeHtml(s.r_id)} • ${escapeHtml(s.gender || 'Student')}</div>
              </div>
            </div>
            <span style="font-size:0.75rem; color:var(--accent-blue); font-weight:600;">+ Add</span>
          </div>
        `).join("");
        resultsDiv.style.display = "block";
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          resultsDiv.innerHTML = `<div class="search-dropdown-item"><span class="meta-text" style="color:var(--accent-red);">Search failed</span></div>`;
          resultsDiv.style.display = "block";
        }
      });
  }, 100);
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
        clientCache.teamsList = null;
        loadTeamDetailView(teamId);
      } else {
        showToast(data.message || "Failed to add teammate", "error");
      }
    })
    .catch(() => showToast("Network error adding teammate", "error"));
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
    <div class="surface-panel" style="margin-bottom:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px; min-width:200px;">
          <div class="member-avatar-box" style="width:52px; height:52px; border-radius:16px;">
            <span class="avatar-initial" style="font-size:1.125rem;">${escapeHtml(initial)}</span>
            <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(prof.name)}" loading="lazy" onerror="this.remove();">
          </div>

          <div>
            <h1 class="page-title" style="font-size:1.25rem;">${escapeHtml(prof.name)}</h1>
            <div style="display:flex; align-items:center; gap:6px; margin-top:2px; flex-wrap:wrap;">
              <span class="status-pill user-tag">${escapeHtml(prof.r_id)}</span>
              <span class="meta-text">${escapeHtml(prof.gender || "Student")}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; margin-top:4px; flex-wrap:wrap;">
              <span class="program-pill">${escapeHtml(prof.program || "Academic Program Unspecified")}</span>
              ${prof.semester_year ? `<span class="semester-pill">${escapeHtml(prof.semester_year)}</span>` : ''}
              <button onclick="showCoursePickerModal()" style="font-size:0.6875rem; color:var(--accent-blue); background:none; border:none; cursor:pointer; text-decoration:underline;">Change</button>
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
    <div class="surface-panel" style="margin-bottom:14px;">
      <h3 class="section-title" style="margin-bottom:10px;">College Database Record</h3>
      <div class="profile-record-grid">
        <div class="profile-field-item">
          <div class="field-label">Academic Program</div>
          <div class="field-value" style="font-weight:600; color:var(--accent-blue);">${escapeHtml(prof.program || "Not Specified")}</div>
        </div>

        <div class="profile-field-item">
          <div class="field-label">Semester / Year</div>
          <div class="field-value">${escapeHtml(prof.semester_year || "Current Session")}</div>
        </div>

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
          <div class="field-value">${escapeHtml(prof.address || "N/A")}</div>
        </div>
      </div>
    </div>
  `;

  let teamsHtml = "";
  if (userTeams.length === 0) {
    teamsHtml = `
      <div class="surface-panel">
        <h3 class="section-title" style="margin-bottom:6px;">My Teams (0)</h3>
        <p class="page-subtitle" style="margin-bottom:12px;">You haven't joined or created any hackathon teams yet.</p>
        <div style="display:flex; gap:8px;">
          <a href="/" class="btn-primary" style="font-size:0.75rem;">Discover Teams</a>
          <a href="/create-team" class="btn-primary" style="font-size:0.75rem; background:rgba(0,0,0,0.06); color:var(--text-primary); border:1px solid rgba(0,0,0,0.12);">+ Create Team</a>
        </div>
      </div>
    `;
  } else {
    const cards = userTeams.map(team => {
      const isFull = team.is_full;
      const count = team.member_count || (team.members ? team.members.length : 0);
      const openSlots = 6 - count;

      const avatarsHtml = (team.members || []).slice(0, 3).map(m => {
        const init = (m.name || m.r_id || 'U').replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
        return `
          <div class="avatar-stack-item">
            <span class="avatar-initial">${escapeHtml(init)}</span>
            <img src="${escapeHtml(m.avatar_url || '')}" alt="${escapeHtml(m.name)}" loading="lazy" onerror="this.remove();">
          </div>
        `;
      }).join("");

      return `
        <article class="team-card-module" onclick="navigateTo('/team/${team.id}')">
          <div class="card-top-row">
            <span class="status-pill ${isFull ? 'full' : 'open'}">
              ${isFull ? 'Full (6/6)' : `${openSlots} Open`}
            </span>
            <div class="avatar-stack">
              ${avatarsHtml}
            </div>
          </div>

          <div>
            <h2 class="card-title">${escapeHtml(team.name)}</h2>
            <p class="card-pitch">${escapeHtml(team.description || "Building an innovative hackathon solution.")}</p>
          </div>

          <div class="card-bottom-row">
            <span class="meta-text">${count}/6 members</span>
            <span class="card-action-hint">View ➔</span>
          </div>
        </article>
      `;
    }).join("");

    teamsHtml = `
      <div class="surface-panel">
        <h3 class="section-title" style="margin-bottom:12px;">My Teams (${userTeams.length})</h3>
        <div class="teams-grid">
          ${cards}
        </div>
      </div>
    `;
  }

  container.innerHTML = heroHtml + recordHtml + teamsHtml;
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
    <h3 class="modal-title">Select Academic Program</h3>
    <p class="modal-message" style="margin-bottom:14px;">Select your enrolled degree/program for your HackMate hackathon profile.</p>

    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
      <div>
        <label class="field-label" style="display:block; margin-bottom:4px;">Academic Program *</label>
        <select id="modalCourseSelect" class="form-input" style="font-weight:500;">
          ${optionsHtml}
        </select>
      </div>

      <div>
        <label class="field-label" style="display:block; margin-bottom:4px;">Semester / Year (Optional)</label>
        <input type="text" id="modalSemInput" value="${escapeAttr(curSem)}" placeholder="e.g. Semester 2 or Year 1" class="form-input">
      </div>
    </div>

    <div style="display:flex; gap:8px; justify-content:flex-end;">
      <button onclick="saveCourseSelection()" class="btn-primary" id="btnSaveProgram">
        Confirm & Continue
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
        btn.innerText = "Confirm & Continue";
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
        btn.innerText = "Confirm & Continue";
      }
      showToast("Network error saving program", "error");
    });
}

/* ==========================================================================
   6. CREATE TEAM VIEW (TITLE, PITCH, WHATSAPP, FRIEND SEARCH & 6-SEAT PREVIEW)
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
    <div style="margin-bottom:12px;">
      <a href="/" class="btn-primary" style="background:var(--card-bg); color:var(--text-secondary); border:1px solid var(--card-border); height:28px; padding:0 12px; font-size:0.75rem; display:inline-flex;">
        ← Cancel & Back
      </a>
    </div>

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

  const leaderInitial = currentUser ? (currentUser.name || currentUser.id).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U' : 'L';

  let seatsHtml = `
    <div class="seat-preview-item active">
      <div class="seat-label" style="color:var(--accent-blue);">Seat 1 (Leader)</div>
      <div style="display:flex; align-items:center; gap:6px; min-width:0;">
        <div class="avatar-stack-item" style="width:20px; height:20px; margin-left:0;">
          <span class="avatar-initial" style="font-size:0.5625rem;">${escapeHtml(leaderInitial)}</span>
          <img src="${escapeHtml((currentUser && currentUser.avatar_url) || '')}" alt="${escapeHtml((currentUser && currentUser.name) || '')}" loading="lazy" onerror="this.remove();">
        </div>
        <span style="font-size:0.75rem; font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${escapeHtml((currentUser && currentUser.name) || 'Leader')}
        </span>
      </div>
    </div>
  `;

  for (let i = 0; i < 5; i++) {
    if (i < selectedFriends.length) {
      const f = selectedFriends[i];
      const initial = (f.name || f.id).replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').trim().charAt(0).toUpperCase() || 'U';
      seatsHtml += `
        <div class="seat-preview-item active">
          <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
            <span class="seat-label" style="color:var(--accent-blue);">Seat ${i + 2}</span>
            <button onclick="removeFriendFromTeam('${f.id}')" style="background:none; border:none; color:var(--accent-red); font-size:0.6875rem; cursor:pointer; font-weight:700;">×</button>
          </div>
          <div style="display:flex; align-items:center; gap:6px; min-width:0;">
            <div class="avatar-stack-item" style="width:20px; height:20px; margin-left:0;">
              <span class="avatar-initial" style="font-size:0.5625rem;">${escapeHtml(initial)}</span>
              <img src="${escapeHtml(f.avatar_url || '')}" alt="${escapeHtml(f.name)}" loading="lazy" onerror="this.remove();">
            </div>
            <span style="font-size:0.75rem; font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(f.name)}
            </span>
          </div>
        </div>
      `;
    } else {
      seatsHtml += `
        <div class="seat-preview-item">
          <div class="seat-label">Seat ${i + 2}</div>
          <div class="seat-status">Open for Requests</div>
        </div>
      `;
    }
  }

  container.innerHTML = seatsHtml;
}

function debounceFriendSearch() {
  clearTimeout(friendSearchDebounce);
  friendSearchDebounce = setTimeout(() => {
    const input = document.getElementById("friendSearchInput");
    const resultsDiv = document.getElementById("friendSearchResults");
    if (!input || !resultsDiv) return;

    const query = input.value.trim();
    if (query.length < 2) {
      resultsDiv.style.display = "none";
      return;
    }

    if (friendSearchAbortController) friendSearchAbortController.abort();
    friendSearchAbortController = new AbortController();

    fetch(`/api/students/search?q=${encodeURIComponent(query)}`, { signal: friendSearchAbortController.signal })
      .then(res => res.json())
      .then(data => {
        const students = data.students || [];
        if (students.length === 0) {
          resultsDiv.innerHTML = `<div class="search-dropdown-item"><span class="meta-text">No students matching "${escapeHtml(query)}"</span></div>`;
          resultsDiv.style.display = "block";
          return;
        }

        resultsDiv.innerHTML = students.map(s => `
          <div class="search-dropdown-item" onclick="addFriendToTeam('${s.r_id}', '${escapeAttr(s.name)}', '${escapeAttr(s.avatar_url || '')}')">
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="avatar-stack-item" style="width:24px; height:24px; margin-left:0;">
                <span class="avatar-initial" style="font-size:0.625rem;">${escapeHtml(s.name.charAt(0).toUpperCase())}</span>
                <img src="${escapeHtml(s.avatar_url || '')}" alt="${escapeHtml(s.name)}" loading="lazy" onerror="this.remove();">
              </div>
              <div>
                <div style="font-size:0.8125rem; font-weight:650; color:var(--text-primary);">${escapeHtml(s.name)}</div>
                <div class="meta-text">${escapeHtml(s.r_id)} • ${escapeHtml(s.gender || 'Student')}</div>
              </div>
            </div>
            <span style="font-size:0.75rem; color:var(--accent-blue); font-weight:600;">+ Add</span>
          </div>
        `).join("");
        resultsDiv.style.display = "block";
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          resultsDiv.innerHTML = `<div class="search-dropdown-item"><span class="meta-text" style="color:var(--accent-red);">Search failed</span></div>`;
          resultsDiv.style.display = "block";
        }
      });
  }, 100);
}

function addFriendToTeam(r_id, name, avatar_url) {
  const resultsDiv = document.getElementById("friendSearchResults");
  const input = document.getElementById("friendSearchInput");
  if (resultsDiv) resultsDiv.style.display = "none";
  if (input) input.value = "";

  if (currentUser && currentUser.id.toUpperCase() === r_id.toUpperCase()) {
    showToast("You are already the team leader", "info");
    return;
  }

  if (selectedFriends.some(f => f.id.toUpperCase() === r_id.toUpperCase())) {
    showToast("Friend already added", "info");
    return;
  }

  if (selectedFriends.length >= 5) {
    showToast("Maximum 5 teammates can be pre-added", "error");
    return;
  }

  selectedFriends.push({ id: r_id, name: name, avatar_url: avatar_url });
  renderCreateTeamSeats();
}

function removeFriendFromTeam(r_id) {
  selectedFriends = selectedFriends.filter(f => f.id.toUpperCase() !== r_id.toUpperCase());
  renderCreateTeamSeats();
}

function submitCreateTeam() {
  const nameInput = document.getElementById("teamNameInput");
  const descInput = document.getElementById("teamDescInput");
  const waInput = document.getElementById("teamWhatsappInput");
  const btn = document.getElementById("btnSubmitCreate");

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
   8. AUTHENTICATION VIEW (TWO-CASE R-ID RESOLUTION, BRANDED LOGO, NO UNLISTED LINK)
   ========================================================================== */
let resendTimerInterval = null;
let resendSecondsRemaining = 30;
let isVerifyingOtp = false;

/* ==========================================================================
   8. AUTHENTICATION VIEW (BEAUTIFIED CARD, TRANSPARENT LOGO, RESEND OTP)
   ========================================================================== */
function loadLoginView() {
  const container = document.getElementById("loginViewContainer");
  if (!container) return;

  pendingRegistrationData = null;
  clearInterval(resendTimerInterval);

  const courseOptionsHtml = ACADEMIC_PROGRAMS.map(p => `
    <option value="${escapeAttr(p)}">${escapeHtml(p)}</option>
  `).join("");

  container.innerHTML = `
    <div class="login-card">
      <!-- Native Transparent University Crest -->
      <div class="login-uni-logo-box">
        <img src="/static/img/jnu_logo.png" alt="University Crest" onerror="this.src='/static/img/jnu_logo.jpg';">
      </div>

      <h1 class="page-title" style="font-size:1.5rem; margin-bottom:4px; text-align:center;">Sign In with College R-ID</h1>
      <p class="page-subtitle" style="margin-bottom:22px; text-align:center;">Official Hackathon Team Matching Platform</p>

      <!-- Step 1: Input R-ID -->
      <div id="authStep1">
        <div style="margin-bottom:16px;">
          <label class="field-label" style="display:block; margin-bottom:6px;">College R-ID</label>
          <input type="text" id="authRidInput" placeholder="e.g. R15006" class="form-input" style="font-weight:750; text-transform:uppercase; height:46px; font-size:1.125rem; letter-spacing:0.04em; text-align:center;">
        </div>

        <button onclick="submitInitialRid()" id="btnSendOtp" class="btn-primary" style="width:100%; height:44px; font-size:0.9375rem;">
          Continue
        </button>
      </div>

      <!-- Step 1B: Fallback when details sync is pending (Case 2) -->
      <div id="authStepSyncNotice" style="display:none;">
        <div style="text-align:center; margin-bottom:12px;">
          <div class="rid-banner-tag">
            <span>R-ID:</span>
            <span id="syncRidBanner"></span>
          </div>
        </div>

        <div class="sync-notice-banner">
          University records sync is currently in progress for this R-ID. Please confirm your academic details below to proceed.
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
          <div>
            <label class="field-label" style="display:block; margin-bottom:4px;">Full Name *</label>
            <input type="text" id="syncNameInput" placeholder="Your full name as per records" class="form-input" style="height:44px; font-size:0.9375rem;">
          </div>

          <div>
            <label class="field-label" style="display:block; margin-bottom:4px;">College Email *</label>
            <input type="email" id="syncEmailInput" placeholder="e.g. name@student.jnujaipur.ac.in" class="form-input" style="height:44px; font-size:0.9375rem;">
          </div>

          <div>
            <label class="field-label" style="display:block; margin-bottom:4px;">Academic Program *</label>
            <select id="syncCourseSelect" class="form-input" style="font-weight:550; height:44px; font-size:0.9375rem;">
              ${courseOptionsHtml}
            </select>
          </div>
        </div>

        <button onclick="submitSyncDetailsAndSendOtp()" id="btnSendSyncOtp" class="btn-primary" style="width:100%; height:44px; font-size:0.9375rem;">
          Send Verification Code
        </button>

        <button onclick="showAuthStep(1)" class="change-rid-btn" style="width:100%; text-align:center; margin-top:12px;">
          ← Change R-ID
        </button>
      </div>

      <!-- Step 2: OTP Verification -->
      <div id="authStep2" style="display:none;">
        <div style="padding:10px 14px; background:var(--accent-primary-tint); border:1px solid var(--accent-primary-border); border-radius:12px; margin-bottom:16px;">
          <div class="meta-text" style="color:#1B8A33;">Verification code sent to:</div>
          <div id="targetEmailDisplay" style="font-size:0.9375rem; font-weight:700; color:var(--text-primary); margin-top:2px;"></div>
        </div>

        <div style="margin-bottom:16px;">
          <label class="field-label" style="display:block; text-align:center; margin-bottom:6px;">Enter 6-Digit Code</label>
          <input type="text" id="otpCodeInput" placeholder="123456" maxlength="6" class="form-input" style="height:52px; font-size:1.5rem; font-weight:800; text-align:center; letter-spacing:0.3em; color:var(--text-primary);" onkeyup="if(event.key==='Enter') verifyEmailOtpCode()">
        </div>

        <button onclick="verifyEmailOtpCode()" id="btnVerifyOtp" class="btn-primary" style="width:100%; height:44px; font-size:0.9375rem;">
          Verify & Sign In
        </button>

        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:14px;">
          <button type="button" id="btnResendOtp" onclick="handleResendOtp()" class="resend-otp-btn" disabled>
            Resend Code (<span id="resendCountdown">30</span>s)
          </button>
          <button type="button" onclick="showAuthStep(1)" class="change-rid-btn">
            ← Change R-ID
          </button>
        </div>
      </div>
    </div>
  `;
}

function showAuthStep(step) {
  const s1 = document.getElementById("authStep1");
  const sSync = document.getElementById("authStepSyncNotice");
  const s2 = document.getElementById("authStep2");

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

  if (pendingRegistrationData && pendingRegistrationData.rid) {
    // Case 2: Unlisted student registration OTP
    submitSyncDetailsAndSendOtp();
  } else {
    // Case 1: Existing student OTP
    const ridInput = document.getElementById("authRidInput");
    const rid = (ridInput ? ridInput.value.trim() : "");
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
  btn.innerText = "Checking...";

  fetch("/api/auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rid: rid })
  })
    .then(res => res.json())
    .then(data => {
      btn.disabled = false;
      btn.innerText = "Continue";

      if (data.exists) {
        // Case 1: Student is in our database!
        pendingRegistrationData = { rid: rid };
        document.getElementById("targetEmailDisplay").innerText = data.masked_email || "your registered email";
        showAuthStep(2);
        showToast("Verification code sent!", "success");
      } else if (data.not_found) {
        // Case 2: Sync in progress notice!
        pendingRegistrationData = { rid: rid };
        document.getElementById("syncRidBanner").innerText = rid;
        showAuthStep('sync');
      } else {
        showToast(data.message || "Unable to proceed with this R-ID", "error");
      }
    })
    .catch(() => {
      btn.disabled = false;
      btn.innerText = "Continue";
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
        document.getElementById("targetEmailDisplay").innerText = data.masked_email || email;
        showAuthStep(2);
        showToast("Verification code sent to " + email, "success");
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
  btn.innerText = "Verifying...";

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
    .then(res => res.json())
    .then(data => {
      isVerifyingOtp = false;
      btn.disabled = false;
      btn.innerText = "Verify & Sign In";

      if (data && data.success) {
        currentUser = data.user || { id: rid, name: "Student" };
        try {
          renderNavUserSlots();
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
      showToast("Network error during verification. Please retry.", "error");
    });
}

/* ==========================================================================
   9. MODAL & TOAST UTILITY SYSTEM
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

  sheet.innerHTML = `
    <h3 class="modal-title">${escapeHtml(title)}</h3>
    <p class="modal-message">${escapeHtml(message)}</p>
    <div style="display:flex; gap:8px; justify-content:flex-end;">
      <button onclick="closeGlassModal()" class="btn-primary" style="background:rgba(0,0,0,0.06); color:var(--text-primary); border:1px solid rgba(0,0,0,0.12);">
        ${escapeHtml(cancelText)}
      </button>
      <button id="modalConfirmBtn" class="${isDanger ? 'btn-danger' : 'btn-primary'}">
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
  toast.className = `toast-pill ${type}`;
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
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
