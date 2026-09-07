/**
 * HackMate — iOS 27 Liquid Glass SPA Router & Performance Engine
 */

let currentUser = null;
let currentSearchAbortController = null;

// In-Memory Client Cache (0ms Instant Renders)
const clientCache = {
  teamsList: null,
  teamsMap: {},
  userProfiles: {},
  searchQuery: {}
};

document.addEventListener("DOMContentLoaded", () => {
  loadUserFromSession();
  setupRouter();
  handleCurrentRoute();
});

/* --- CLIENT-SIDE SPA ROUTER --- */
function setupRouter() {
  // Intercept internal link clicks for 0ms instant page navigation
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest("a");
    if (anchor && anchor.href && anchor.origin === window.location.origin) {
      const targetPath = anchor.pathname;
      // Allow external links or links with target="_blank"
      if (anchor.target === "_blank") return;

      e.preventDefault();
      if (window.location.pathname !== targetPath) {
        history.pushState(null, "", targetPath);
        handleCurrentRoute();
      }
    }
  });

  // Handle browser Back / Forward buttons
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

  // Hide all view panels
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
    // Fallback to Discover
    history.replaceState(null, "", "/");
    handleCurrentRoute();
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

function highlightActiveNavLinks() {
  const path = window.location.pathname;
  const links = document.querySelectorAll(".nav-link-glass, .dock-item");
  links.forEach(link => {
    const href = link.getAttribute("href");
    if (href === path || (path.startsWith("/team/") && href === "/")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/* --- USER SESSION HANDLING --- */
function loadUserFromSession() {
  const saved = localStorage.getItem("hackmate_user");
  if (saved) {
    try { 
      currentUser = JSON.parse(saved); 
    } catch(e){}
  }
  renderNavUserSlots();
}

function saveUserSession(user) {
  currentUser = user;
  localStorage.setItem("hackmate_user", JSON.stringify(user));
  renderNavUserSlots();
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("hackmate_user");
  showToast("Signed out successfully");
  renderNavUserSlots();
  navigateTo("/");
}

function renderNavUserSlots() {
  const slotDesktop = document.getElementById("navUserSlotDesktop");
  const slotMobile = document.getElementById("navUserSlotMobile");

  if (currentUser) {
    const desktopHtml = `
      <a href="/profile" class="nav-link-glass" style="display:inline-flex; align-items:center; gap:8px;">
        <img src="${currentUser.avatar_url}" style="width:28px; height:28px; border-radius:9999px; object-fit:cover; border:1px solid rgba(255,255,255,0.4);">
        <span>${escapeHtml(currentUser.name.split(' ')[0])}</span>
      </a>
    `;

    const mobileHtml = `
      <a href="/profile" style="display:block; width:34px; height:34px; border-radius:9999px; overflow:hidden; border:1.5px solid #4285F4; box-shadow:0 0 12px rgba(66,133,244,0.4);">
        <img src="${currentUser.avatar_url}" style="width:100%; height:100%; object-fit:cover;">
      </a>
    `;

    if (slotDesktop) slotDesktop.innerHTML = desktopHtml;
    if (slotMobile) slotMobile.innerHTML = mobileHtml;
  } else {
    const desktopHtml = `
      <a href="/login" class="btn-glass-primary" style="height:36px; padding:0 18px; font-size:0.8125rem;">
        Sign In
      </a>
    `;

    const mobileHtml = `
      <a href="/login" class="btn-glass-primary" style="height:32px; padding:0 14px; font-size:0.75rem;">
        Sign In
      </a>
    `;

    if (slotDesktop) slotDesktop.innerHTML = desktopHtml;
    if (slotMobile) slotMobile.innerHTML = mobileHtml;
  }
}

/* --- VIEW 1: DISCOVER TEAMS PAGE --- */
let discoverFilter = 'all';
let discoverDebounce = null;

function setDiscoverFilter(filter) {
  discoverFilter = filter;
  const bAll = document.getElementById("btnFilterAll");
  const bOpen = document.getElementById("btnFilterOpen");

  if (bAll) bAll.className = filter === 'all' ? "nav-link-glass active" : "nav-link-glass";
  if (bOpen) bOpen.className = filter === 'open' ? "nav-link-glass active" : "nav-link-glass";

  loadDiscoverView();
}

function debounceDiscoverSearch() {
  clearTimeout(discoverDebounce);
  discoverDebounce = setTimeout(() => loadDiscoverView(), 200);
}

async function loadDiscoverView() {
  const container = document.getElementById("teamsGridContainer");
  const emptyState = document.getElementById("emptyStateContainer");
  const searchInput = document.getElementById("searchInput");
  const search = searchInput ? searchInput.value.trim() : '';

  // Render Skeleton placeholders if no cache is available
  if (!clientCache.teamsList && container) {
    container.innerHTML = Array(4).fill(0).map(() => `
      <div class="glass-card" style="height:190px;">
        <div class="glass-skeleton" style="width:60%; height:20px; margin-bottom:12px;"></div>
        <div class="glass-skeleton" style="width:90%; height:14px; margin-bottom:8px;"></div>
        <div class="glass-skeleton" style="width:75%; height:14px; margin-bottom:20px;"></div>
        <div class="glass-skeleton" style="width:100%; height:8px; margin-bottom:14px;"></div>
      </div>
    `).join('');
  }

  try {
    const r_id = currentUser ? currentUser.r_id : '';
    const res = await fetch(`/api/teams?r_id=${encodeURIComponent(r_id)}&search=${encodeURIComponent(search)}&filter=${discoverFilter}`);
    const data = await res.json();
    
    clientCache.teamsList = data.teams;
    data.teams.forEach(t => { clientCache.teamsMap[t.id] = t; });

    renderDiscoverCards(data.teams);
  } catch(e) {
    if (clientCache.teamsList) renderDiscoverCards(clientCache.teamsList);
  }
}

function renderDiscoverCards(teams) {
  const container = document.getElementById("teamsGridContainer");
  const emptyState = document.getElementById("emptyStateContainer");
  if (!container) return;

  if (!teams || teams.length === 0) {
    container.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (emptyState) emptyState.style.display = "none";

  container.innerHTML = teams.map(t => {
    let avatarsHtml = "";
    for (let i = 0; i < 6; i++) {
      const m = t.members[i];
      if (m) {
        avatarsHtml += `<img src="${m.avatar_url}" class="avatar-stack-img" title="${escapeHtml(m.name)}">`;
      } else {
        avatarsHtml += `<div class="avatar-stack-open">+</div>`;
      }
    }

    const fillPercent = Math.round((t.member_count / 6) * 100);

    return `
      <a href="/team/${t.id}" class="glass-card glass-card-interactive" onmouseenter="prefetchTeamDetail(${t.id})" style="display:flex; flex-direction:column; justify-content:space-between; height:100%;">
        <div>
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:8px;">
            <h3 style="font-size:1.0625rem; font-weight:800; color:var(--text-primary); line-height:1.3;">${escapeHtml(t.name)}</h3>
            <span style="font-size:0.75rem; font-weight:800; color:#4285F4; background:rgba(66,133,244,0.18); padding:3px 10px; border-radius:9999px; border:1px solid rgba(66,133,244,0.3); flex-shrink:0;">${t.member_count}/6 Seats</span>
          </div>

          <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.5; margin-bottom:14px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHtml(t.description || 'No pitch provided.')}</p>

          <!-- Seat Progress Meter -->
          <div class="seat-progress-track">
            <div class="seat-progress-fill" style="width: ${fillPercent}%;"></div>
          </div>
        </div>

        <div style="padding-top:14px; border-top:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; margin-top:14px;">
          <div class="avatar-stack">
            ${avatarsHtml}
          </div>
          <span style="font-size:0.75rem; font-weight:800; color:#4285F4;">View Team ➔</span>
        </div>
      </a>
    `;
  }).join('');
}

function prefetchTeamDetail(teamId) {
  if (!clientCache.teamsMap[teamId]) {
    const r_id = currentUser ? currentUser.r_id : '';
    fetch(`/api/teams/${teamId}?r_id=${encodeURIComponent(r_id)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) clientCache.teamsMap[teamId] = data.team;
      }).catch(e => {});
  }
}

/* --- VIEW 2: TEAM DETAIL PAGE --- */
async function loadTeamDetailView(teamId) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  // 0ms INSTANT RENDER if cached!
  if (clientCache.teamsMap[teamId]) {
    renderTeamDetailPage(clientCache.teamsMap[teamId]);
  } else {
    container.innerHTML = `
      <div class="glass-card" style="padding:36px; text-align:center;">
        <div class="glass-skeleton" style="width:40%; height:28px; margin:0 auto 16px;"></div>
        <div class="glass-skeleton" style="width:70%; height:16px; margin:0 auto 24px;"></div>
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">
          <div class="glass-skeleton" style="height:60px;"></div>
          <div class="glass-skeleton" style="height:60px;"></div>
        </div>
      </div>
    `;
  }

  try {
    const r_id = currentUser ? currentUser.r_id : '';
    const res = await fetch(`/api/teams/${teamId}?r_id=${encodeURIComponent(r_id)}`);
    const data = await res.json();
    if (data.success) {
      clientCache.teamsMap[teamId] = data.team;
      renderTeamDetailPage(data.team);
    }
  } catch(e) {}
}

function renderTeamDetailPage(team) {
  const container = document.getElementById("teamDetailViewContainer");
  if (!container) return;

  const isLeader = team.user_status === 'leader';
  const isMember = team.user_status === 'member';

  let seatsHtml = "";
  for (let i = 0; i < 6; i++) {
    const member = team.members[i];
    if (member) {
      const isMe = currentUser && currentUser.r_id.toUpperCase() === member.r_id.toUpperCase();
      const canRemove = isLeader && member.role !== 'leader';

      seatsHtml += `
        <div style="padding:14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:18px; display:flex; align-items:center; justify-content:space-between; gap:12px; backdrop-filter:blur(16px);">
          <div style="display:flex; align-items:center; gap:12px; min-width:0;">
            <img src="${member.avatar_url}" style="width:42px; height:42px; border-radius:9999px; background:#000; border:1px solid rgba(255,255,255,0.3); object-fit:cover; flex-shrink:0;">
            <div style="min-width:0;">
              <div style="font-size:0.875rem; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                ${escapeHtml(member.name)} ${isMe ? '<span style="font-size:0.625rem; color:#4285F4; background:rgba(66,133,244,0.2); padding:1px 6px; border-radius:9999px; font-weight:800;">(You)</span>' : ''}
              </div>
              <div style="font-size:0.75rem; color:var(--text-secondary);">${member.r_id} • ${member.gender}</div>
              <div style="font-size:0.6875rem; color:#4285F4; font-weight:700; margin-top:2px;">${escapeHtml(member.email)} • DOB: ${escapeHtml(member.dob || 'N/A')}</div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
            <span style="font-size:0.6875rem; font-weight:800; background:${member.role === 'leader' ? 'rgba(251,188,5,0.2)' : 'rgba(255,255,255,0.08)'}; color:${member.role === 'leader' ? '#FBBC05' : 'var(--text-secondary)'}; padding:3px 10px; border-radius:9999px; text-transform:uppercase; border:1px solid rgba(255,255,255,0.2);">
              ${member.role}
            </span>

            ${canRemove ? `
              <button onclick="removeMemberFromTeam(${team.id}, '${member.r_id}')" class="btn-glass-danger" style="height:32px; padding:0 10px; font-size:0.6875rem;">
                Remove
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      seatsHtml += `
        <div style="padding:14px; border:1.5px dashed rgba(66,133,244,0.4); background:rgba(66,133,244,0.08); border-radius:18px; display:flex; align-items:center; justify-content:space-between; backdrop-filter:blur(16px);">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:36px; height:36px; border-radius:9999px; background:rgba(255,255,255,0.15); color:#4285F4; font-weight:800; font-size:1.125rem; display:flex; align-items:center; justify-content:center;">+</div>
            <div>
              <div style="font-size:0.75rem; font-weight:800; color:var(--text-primary);">Seat ${i + 1} Open</div>
              <div style="font-size:0.6875rem; font-weight:700; color:#4285F4;">Open for Join Requests</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  let whatsappBanner = "";
  if (team.has_whatsapp && (isLeader || isMember)) {
    whatsappBanner = `
      <div style="padding:16px; background:rgba(52,168,83,0.15); border:1px solid rgba(52,168,83,0.4); border-radius:20px; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:20px;">
        <div>
          <div style="font-size:0.8125rem; font-weight:800; color:#A8F0B6;">Official WhatsApp Group Link</div>
          <div style="font-size:0.75rem; color:rgba(255,255,255,0.8);">Join official team chat for hackathon collaboration</div>
        </div>
        <a href="${team.whatsapp_link}" target="_blank" class="btn-glass-primary" style="background:linear-gradient(135deg, #34A853 0%, #2E7D32 100%);">
          Open Group Chat ➔
        </a>
      </div>
    `;
  }

  let joinRequestForm = "";
  if (!isLeader && !isMember && team.user_status === 'none' && !team.is_full) {
    joinRequestForm = `
      <div style="padding:20px; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:20px; margin-top:24px;">
        <h4 style="font-size:0.875rem; font-weight:800; color:var(--text-primary); margin-bottom:6px;">Request to Join this Team</h4>
        <textarea id="joinMessageInput" rows="2" placeholder="Write a short note to the team leader..." class="glass-textarea" style="margin-bottom:12px;"></textarea>
        <button onclick="submitJoinRequest(${team.id})" id="btnSubmitJoin" class="btn-glass-primary">
          Send Join Request
        </button>
      </div>
    `;
  }

  let leaderRequestsSection = "";
  if (isLeader) {
    leaderRequestsSection = `
      <div style="padding-top:20px; border-top:1px solid rgba(255,255,255,0.1); margin-top:24px;">
        <h4 style="font-size:0.75rem; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:12px;">Pending Join Requests</h4>
        <div id="pendingRequestsContainer" style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:0.75rem; color:var(--text-tertiary);">Loading requests...</div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="glass-card" style="padding:32px;">
      <!-- Header -->
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:20px;">
        <div>
          <h1 class="page-title" style="margin-bottom:4px;">${escapeHtml(team.name)}</h1>
          <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.5;">${escapeHtml(team.description || 'No pitch provided.')}</p>
        </div>
        <span style="font-size:0.8125rem; font-weight:800; color:#4285F4; background:rgba(66,133,244,0.2); padding:6px 14px; border-radius:9999px; border:1px solid rgba(66,133,244,0.3); flex-shrink:0;">${team.member_count}/6 Seats Filled</span>
      </div>

      ${whatsappBanner}

      ${isLeader ? `
        <div style="padding:16px; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:18px; margin-bottom:24px;">
          <label style="display:block; font-size:0.6875rem; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:6px;">Leader Controls — WhatsApp Link</label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="panelWhatsappInput" value="${team.whatsapp_link || ''}" placeholder="https://chat.whatsapp.com/..." class="glass-input" style="height:40px; font-size:0.75rem;">
            <button onclick="updateWhatsappLink(${team.id})" class="btn-glass-primary" style="height:40px; font-size:0.75rem;">Save</button>
          </div>
        </div>
      ` : ''}

      <!-- 6 Team Seats Grid -->
      <div>
        <h3 style="font-size:0.75rem; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:12px;">Team Members (6 Seats)</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
          ${seatsHtml}
        </div>
      </div>

      ${joinRequestForm}
      ${leaderRequestsSection}

      <!-- Leader Action Buttons -->
      ${isLeader ? `
        <div style="padding-top:20px; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:flex-end; margin-top:24px;">
          <button onclick="disbandTeam(${team.id})" class="btn-glass-danger">
            Disband Team
          </button>
        </div>
      ` : isMember ? `
        <div style="padding-top:20px; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:flex-end; margin-top:24px;">
          <button onclick="leaveTeam(${team.id})" class="btn-glass-danger">
            Leave Team
          </button>
        </div>
      ` : ''}
    </div>
  `;

  if (isLeader) fetchPendingRequests(team.id);
}

/* --- VIEW 3: CREATE TEAM PAGE --- */
let selectedFriends = [];

function loadCreateTeamView() {
  if (!currentUser) {
    showToast("Please sign in with your R-ID first");
    setTimeout(() => navigateTo("/login"), 400);
  } else {
    selectedFriends = [];
    renderCreateTeamSeats();
  }
}

async function searchFriends() {
  const q = document.getElementById("friendSearchInput").value.trim();
  const resultsDiv = document.getElementById("friendSearchResults");

  if (q.length < 2) {
    if (resultsDiv) resultsDiv.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`/api/students/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    resultsDiv.innerHTML = "";

    const filtered = data.students.filter(s => 
      s.r_id.toUpperCase() !== currentUser.r_id.toUpperCase() && 
      !selectedFriends.some(sf => sf.r_id === s.r_id)
    );

    if (filtered.length === 0) {
      resultsDiv.innerHTML = `<div style="padding:16px; font-size:0.75rem; color:var(--text-tertiary); text-align:center; font-weight:700;">No matching students found</div>`;
    } else {
      filtered.forEach(s => {
        const item = document.createElement("div");
        item.style.cssText = `padding:12px 16px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.08); transition:background 0.15s;`;
        item.onmouseenter = () => item.style.background = "rgba(255,255,255,0.15)";
        item.onmouseleave = () => item.style.background = "transparent";
        item.onclick = () => addFriendToTeam(s);

        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${s.avatar_url}" style="width:36px; height:36px; border-radius:9999px; background:#000; border:1px solid rgba(255,255,255,0.3); flex-shrink:0; object-fit:cover;">
            <div>
              <div style="font-size:0.75rem; font-weight:800; color:var(--text-primary);">${escapeHtml(s.name)}</div>
              <div style="font-size:0.6875rem; color:var(--text-secondary);">${s.r_id} • ${s.gender}</div>
            </div>
          </div>
          <span class="btn-glass-secondary" style="height:28px; padding:0 10px; font-size:0.6875rem;">+ Add</span>
        `;
        resultsDiv.appendChild(item);
      });
    }
    resultsDiv.style.display = "block";
  } catch(e) {}
}

function addFriendToTeam(student) {
  if (selectedFriends.length >= 5) return showToast("Max 5 friends (Team limit is 6)");
  selectedFriends.push(student);
  document.getElementById("friendSearchInput").value = "";
  document.getElementById("friendSearchResults").style.display = "none";
  renderCreateTeamSeats();
}

function removeFriend(rid) {
  selectedFriends = selectedFriends.filter(sf => sf.r_id !== rid);
  renderCreateTeamSeats();
}

function renderCreateTeamSeats() {
  const container = document.getElementById("createTeamSeatsContainer");
  if (!container || !currentUser) return;
  container.innerHTML = "";

  // Seat 1: Leader
  container.innerHTML += `
    <div style="padding:12px; background:rgba(66,133,244,0.15); border:1px solid rgba(66,133,244,0.3); border-radius:16px; display:flex; align-items:center; gap:12px;">
      <img src="${currentUser.avatar_url}" style="width:36px; height:36px; border-radius:9999px; object-fit:cover; background:#000; border:1px solid rgba(255,255,255,0.3);">
      <div style="flex:1; min-width:0;">
        <div style="font-size:0.75rem; font-weight:800; color:var(--text-primary);" class="truncate">${escapeHtml(currentUser.name)}</div>
        <div style="font-size:0.6875rem; font-weight:700; color:#4285F4;">Seat 1 • Leader (You)</div>
      </div>
    </div>
  `;

  // Seats 2-6
  for (let i = 0; i < 5; i++) {
    const friend = selectedFriends[i];
    if (friend) {
      container.innerHTML += `
        <div style="padding:12px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); border-radius:16px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="display:flex; align-items:center; gap:12px; min-width:0;">
            <img src="${friend.avatar_url}" style="width:36px; height:36px; border-radius:9999px; object-fit:cover; background:#000; border:1px solid rgba(255,255,255,0.3);">
            <div style="min-width:0;">
              <div style="font-size:0.75rem; font-weight:800; color:var(--text-primary);" class="truncate">${escapeHtml(friend.name)}</div>
              <div style="font-size:0.6875rem; color:var(--text-secondary);">${friend.r_id} • Added</div>
            </div>
          </div>
          <button onclick="removeFriend('${friend.r_id}')" style="background:none; border:none; color:var(--text-tertiary); font-size:1.125rem; font-weight:700; cursor:pointer;">×</button>
        </div>
      `;
    } else {
      container.innerHTML += `
        <div style="padding:12px; border:1.5px dashed rgba(66,133,244,0.4); background:rgba(66,133,244,0.08); border-radius:16px; display:flex; align-items:center; gap:10px;">
          <div style="width:30px; height:30px; border-radius:9999px; background:rgba(255,255,255,0.15); color:#4285F4; font-weight:800; font-size:0.875rem; display:flex; align-items:center; justify-content:center;">+</div>
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-primary);">Seat ${i + 2} Open</div>
            <div style="font-size:0.6875rem; font-weight:700; color:#4285F4;">Open for Requests</div>
          </div>
        </div>
      `;
    }
  }
}

async function submitCreateTeam() {
  const name = document.getElementById("teamNameInput").value.trim();
  const desc = document.getElementById("teamDescInput").value.trim();
  const whatsapp = document.getElementById("teamWhatsappInput").value.trim();

  if (!name) return showToast("Team title is required");

  const btn = document.getElementById("btnSubmitCreate");
  btn.innerText = "Creating Team...";
  btn.disabled = true;

  const payload = {
    leader_r_id: currentUser.r_id,
    name: name,
    description: desc,
    whatsapp_link: whatsapp,
    friend_r_ids: selectedFriends.map(f => f.r_id)
  };

  try {
    const res = await fetch("/api/teams/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      setTimeout(() => navigateTo(`/team/${data.team_id}`), 300);
    } else {
      showToast(data.message);
      btn.innerText = "Create & Publish Team";
      btn.disabled = false;
    }
  } catch(e) {
    showToast("Error creating team");
    btn.innerText = "Create & Publish Team";
    btn.disabled = false;
  }
}

/* --- VIEW 4: USER PROFILE PAGE --- */
async function loadProfileView() {
  if (!currentUser) return navigateTo("/login");

  const container = document.getElementById("profileViewContainer");
  if (!container) return;

  if (clientCache.userProfiles[currentUser.r_id]) {
    renderProfileViewPage(clientCache.userProfiles[currentUser.r_id]);
  } else {
    container.innerHTML = `
      <div class="glass-card" style="padding:36px; text-align:center;">
        <div class="glass-skeleton" style="width:80px; height:80px; border-radius:9999px; margin:0 auto 16px;"></div>
        <div class="glass-skeleton" style="width:40%; height:24px; margin:0 auto 12px;"></div>
      </div>
    `;
  }

  try {
    const res = await fetch(`/api/user/profile?r_id=${encodeURIComponent(currentUser.r_id)}`);
    const data = await res.json();

    if (data.success) {
      clientCache.userProfiles[currentUser.r_id] = data;
      renderProfileViewPage(data);
    }
  } catch(e) {}
}

function renderProfileViewPage(data) {
  const container = document.getElementById("profileViewContainer");
  if (!container) return;
  const prof = data.profile;
  const userTeams = data.teams;

  let teamsListHtml = "";
  if (!userTeams || userTeams.length === 0) {
    teamsListHtml = `<div style="padding:16px; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:16px; font-size:0.75rem; color:var(--text-tertiary); text-align:center; font-weight:700;">You are not currently in any team.</div>`;
  } else {
    teamsListHtml = userTeams.map(t => `
      <div style="padding:14px 18px; background:rgba(66,133,244,0.12); border:1px solid rgba(66,133,244,0.25); border-radius:18px; display:flex; align-items:center; justify-content:space-between; gap:12px; backdrop-filter:blur(16px);">
        <div>
          <div style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">${escapeHtml(t.name)}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:600; margin-top:2px;">Role: <span style="font-weight:800; color:#4285F4; text-transform:uppercase;">${t.user_status}</span> • ${t.member_count}/6 Members</div>
        </div>
        <a href="/team/${t.id}" class="btn-glass-secondary" style="height:36px; font-size:0.75rem;">
          Open Team ➔
        </a>
      </div>
    `).join('');
  }

  container.innerHTML = `
    <div class="glass-card" style="padding:32px;">
      <!-- Profile Header -->
      <div style="padding:20px; background:rgba(66,133,244,0.12); border:1px solid rgba(66,133,244,0.3); border-radius:24px; display:flex; align-items:center; gap:20px; margin-bottom:24px;">
        <img src="${prof.avatar_url}" style="width:72px; height:72px; border-radius:9999px; border:3px solid rgba(255,255,255,0.8); background:#000; object-fit:cover; flex-shrink:0; box-shadow:0 8px 24px rgba(0,0,0,0.3);">
        <div>
          <h1 style="font-family:'Outfit',sans-serif; font-size:1.5rem; font-weight:800; color:var(--text-primary); line-height:1.2;">${escapeHtml(prof.name)}</h1>
          <div style="display:inline-flex; align-items:center; gap:8px; margin-top:6px;">
            <span style="font-size:0.75rem; font-weight:800; background:#4285F4; color:#FFF; padding:3px 12px; border-radius:9999px;">${prof.r_id}</span>
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">${prof.gender}</span>
          </div>
        </div>
      </div>

      <!-- Record Info Grid -->
      <div style="margin-bottom:24px;">
        <h3 style="font-size:0.75rem; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:12px;">College Database Record</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <div style="padding:14px; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:16px;">
            <div style="font-size:0.6875rem; font-weight:700; color:var(--text-tertiary); text-transform:uppercase;">Email Address</div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-primary); word-break:break-all; margin-top:2px;">${escapeHtml(prof.email)}</div>
          </div>
          <div style="padding:14px; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:16px;">
            <div style="font-size:0.6875rem; font-weight:700; color:var(--text-tertiary); text-transform:uppercase;">Mobile Phone</div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-primary); margin-top:2px;">${escapeHtml(prof.phone || 'N/A')}</div>
          </div>
          <div style="padding:14px; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:16px;">
            <div style="font-size:0.6875rem; font-weight:700; color:var(--text-tertiary); text-transform:uppercase;">Date of Birth</div>
            <div style="font-size:0.75rem; font-weight:800; color:#4285F4; margin-top:2px;">${escapeHtml(prof.dob || 'N/A')}</div>
          </div>
          <div style="padding:14px; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:16px;">
            <div style="font-size:0.6875rem; font-weight:700; color:var(--text-tertiary); text-transform:uppercase;">Father's Name</div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-primary); margin-top:2px;">${escapeHtml(prof.father_name || 'N/A')}</div>
          </div>
          <div style="padding:14px; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:16px; grid-column: 1 / -1;">
            <div style="font-size:0.6875rem; font-weight:700; color:var(--text-tertiary); text-transform:uppercase;">Address</div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-primary); margin-top:2px; line-height:1.4;">${escapeHtml(prof.address)}</div>
          </div>
        </div>
      </div>

      <!-- My Teams -->
      <div style="margin-bottom:24px;">
        <h3 style="font-size:0.75rem; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:12px;">My Teams</h3>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${teamsListHtml}
        </div>
      </div>

      <!-- Actions -->
      <div style="padding-top:16px; border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:flex-end;">
        <button onclick="logoutUser()" class="btn-glass-danger">
          Sign Out
        </button>
      </div>
    </div>
  `;
}

/* --- VIEW 5: LOGIN PAGE --- */
let tempAuthRid = null;

function loadLoginView() {
  showAuthStep(1);
}

function showAuthStep(step) {
  const s1 = document.getElementById("authStep1");
  const s2 = document.getElementById("authStep2");
  const sReg = document.getElementById("authStepRegister");

  if (s1) s1.style.display = step === 1 ? "block" : "none";
  if (s2) s2.style.display = step === 2 ? "block" : "none";
  if (sReg) sReg.style.display = step === 'register' ? "block" : "none";
}

async function sendEmailOtpCode() {
  const ridInput = document.getElementById("authRidInput");
  const rid = (ridInput ? ridInput.value : "").trim();
  if (!rid) return showToast("Enter your College R-ID");

  tempAuthRid = rid;
  const btn = document.getElementById("btnSendOtp");
  btn.innerText = "Dispatching Code...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r_id: rid })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById("targetEmailDisplay").innerText = data.email || data.masked_email;
      showToast(data.message);
      showAuthStep(2);
    } else {
      showToast(data.message || "Failed to send code");
    }
  } catch(err) {
    showToast("Server error sending code");
  } finally {
    btn.innerText = "Send Verification Code";
    btn.disabled = false;
  }
}

async function verifyEmailOtpCode() {
  const ridInput = document.getElementById("authRidInput");
  const rid = (tempAuthRid || (ridInput ? ridInput.value : "")).trim();
  const codeInput = document.getElementById("otpCodeInput");
  const code = (codeInput ? codeInput.value : "").trim();

  if (!rid) return showToast("Please enter R-ID first");
  if (!code || code.length < 6) return showToast("Enter 6-digit verification code");

  const btn = document.getElementById("btnVerifyOtp");
  btn.innerText = "Verifying...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r_id: rid, otp: code })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Signed in successfully!");
      saveUserSession(data.student);
      setTimeout(() => navigateTo("/profile"), 300);
    } else {
      showToast(data.message || "Invalid code");
    }
  } catch(err) {
    showToast("Server error verifying code");
  } finally {
    btn.innerText = "Verify & Sign In";
    btn.disabled = false;
  }
}

function showManualRegister() { showAuthStep('register'); }

async function submitManualRegister() {
  const rid = document.getElementById("regRid").value.trim();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const gender = document.getElementById("regGender").value;
  const dob = document.getElementById("regDob").value.trim();

  if (!rid || !name || !email) return showToast("R-ID, Name, and Email required");

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r_id: rid, name: name, email: email, phone: "", gender: gender, dob: dob })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Account created");
      saveUserSession(data.student);
      setTimeout(() => navigateTo("/profile"), 300);
    } else {
      showToast(data.message);
    }
  } catch(e) { showToast("Registration error"); }
}

/* --- VIEW 6: STUDENT DIRECTORY SEARCH PAGE --- */
let studentSearchDebounce = null;

function searchStudentDirectory() {
  clearTimeout(studentSearchDebounce);
  studentSearchDebounce = setTimeout(() => executeStudentSearch(), 180);
}

async function executeStudentSearch() {
  const q = document.getElementById("dirSearchInput").value.trim();
  const container = document.getElementById("dirSearchResults");
  if (!container) return;

  if (q.length < 2) {
    container.innerHTML = `<div style="font-size:0.8125rem; color:var(--text-tertiary); text-align:center; padding:36px;">Type student R-ID or name above to search</div>`;
    return;
  }

  // Cancel previous pending search request using AbortController
  if (currentSearchAbortController) {
    currentSearchAbortController.abort();
  }
  currentSearchAbortController = new AbortController();

  try {
    const res = await fetch(`/api/students/search?q=${encodeURIComponent(q)}`, {
      signal: currentSearchAbortController.signal
    });
    const data = await res.json();
    
    if (!data.students || data.students.length === 0) {
      container.innerHTML = `<div style="font-size:0.8125rem; color:var(--text-tertiary); text-align:center; padding:36px; font-weight:700;">No students found matching "${escapeHtml(q)}"</div>`;
      return;
    }

    container.innerHTML = data.students.map(s => `
      <div style="padding:14px 18px; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:18px; display:flex; align-items:center; justify-content:space-between; gap:12px; backdrop-filter:blur(16px);">
        <div style="display:flex; align-items:center; gap:14px;">
          <img src="${s.avatar_url}" style="width:44px; height:44px; border-radius:9999px; background:#000; border:1px solid rgba(255,255,255,0.3); object-fit:cover; flex-shrink:0;">
          <div>
            <div style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">${escapeHtml(s.name)}</div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">${s.r_id} • ${s.gender}</div>
            <div style="font-size:0.6875rem; color:#4285F4; font-weight:700; margin-top:2px;">${escapeHtml(s.email)} • DOB: ${escapeHtml(s.dob || 'N/A')}</div>
          </div>
        </div>
        <span style="font-size:0.75rem; font-weight:800; background:rgba(66,133,244,0.2); color:#4285F4; padding:4px 12px; border-radius:9999px; border:1px solid rgba(66,133,244,0.3);">${s.r_id}</span>
      </div>
    `).join('');
  } catch(e) {
    if (e.name !== 'AbortError') {
      container.innerHTML = `<div style="font-size:0.8125rem; color:#FF8A80; text-align:center; padding:24px; font-weight:700;">Error searching database</div>`;
    }
  }
}

/* --- LEADER ACTIONS & OPTIMISTIC UPDATES --- */
async function fetchPendingRequests(teamId) {
  const container = document.getElementById("pendingRequestsContainer");
  if (!container || !currentUser) return;

  try {
    const res = await fetch(`/api/teams/${teamId}/requests?leader_r_id=${encodeURIComponent(currentUser.r_id)}`);
    const data = await res.json();
    const reqs = data.requests || [];

    if (reqs.length === 0) {
      container.innerHTML = `<div style="font-size:0.75rem; color:var(--text-tertiary); font-style:italic;">No pending requests</div>`;
      return;
    }

    container.innerHTML = reqs.map(r => `
      <div style="padding:12px; background:rgba(255,255,255,0.06); border:1px solid var(--glass-border); border-radius:14px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${r.avatar_url}" style="width:36px; height:36px; border-radius:9999px; background:#000; border:1px solid rgba(255,255,255,0.3); object-fit:cover;">
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:var(--text-primary);">${escapeHtml(r.name)} (${r.r_id})</div>
            <div style="font-size:0.6875rem; color:var(--text-secondary);">"${escapeHtml(r.message || 'No note')}"</div>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button onclick="actionRequest(${teamId}, ${r.request_id}, 'accept')" class="btn-glass-primary" style="height:32px; padding:0 12px; font-size:0.6875rem;">Accept</button>
          <button onclick="actionRequest(${teamId}, ${r.request_id}, 'reject')" class="btn-glass-secondary" style="height:32px; padding:0 10px; font-size:0.6875rem;">Decline</button>
        </div>
      </div>
    `).join('');
  } catch(e) {}
}

async function submitJoinRequest(teamId) {
  if (!currentUser) return navigateTo("/login");
  const msg = document.getElementById("joinMessageInput").value.trim();
  const btn = document.getElementById("btnSubmitJoin");
  btn.innerText = "Sending...";
  btn.disabled = true;

  try {
    const res = await fetch(`/api/teams/${teamId}/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_r_id: currentUser.r_id, message: msg })
    });
    const data = await res.json();
    showToast(data.message);
    if (data.success) {
      delete clientCache.teamsMap[teamId];
      loadTeamDetailView(teamId);
    }
  } catch(e) {
    showToast("Error sending request");
  } finally {
    btn.innerText = "Send Join Request";
    btn.disabled = false;
  }
}

async function actionRequest(teamId, reqId, action) {
  try {
    const res = await fetch(`/api/teams/${teamId}/requests/${reqId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leader_r_id: currentUser.r_id, action: action })
    });
    const data = await res.json();
    showToast(data.message);
    delete clientCache.teamsMap[teamId];
    loadTeamDetailView(teamId);
  } catch(e) {}
}

async function removeMemberFromTeam(teamId, targetRid) {
  if (!confirm(`Are you sure you want to remove ${targetRid}?`)) return;
  try {
    const res = await fetch(`/api/teams/${teamId}/members/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leader_r_id: currentUser.r_id, target_r_id: targetRid })
    });
    const data = await res.json();
    showToast(data.message);
    delete clientCache.teamsMap[teamId];
    loadTeamDetailView(teamId);
  } catch(e) {}
}

async function updateWhatsappLink(teamId) {
  const link = document.getElementById("panelWhatsappInput").value.trim();
  try {
    const res = await fetch(`/api/teams/${teamId}/whatsapp`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leader_r_id: currentUser.r_id, whatsapp_link: link })
    });
    const data = await res.json();
    showToast(data.message);
    delete clientCache.teamsMap[teamId];
    loadTeamDetailView(teamId);
  } catch(e) {}
}

async function disbandTeam(teamId) {
  if (!confirm("Are you sure you want to disband this team?")) return;
  try {
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leader_r_id: currentUser.r_id })
    });
    const data = await res.json();
    showToast(data.message);
    if (data.success) {
      delete clientCache.teamsMap[teamId];
      clientCache.teamsList = null;
      navigateTo("/");
    }
  } catch(e) {}
}

async function leaveTeam(teamId) {
  if (!confirm("Are you sure you want to leave this team?")) return;
  try {
    const res = await fetch(`/api/teams/${teamId}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_r_id: currentUser.r_id })
    });
    const data = await res.json();
    showToast(data.message);
    if (data.success) {
      delete clientCache.teamsMap[teamId];
      clientCache.teamsList = null;
      navigateTo("/");
    }
  } catch(e) {}
}

/* --- TOAST SYSTEM --- */
function showToast(msg) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.style.cssText = `pointer-events: auto; padding: 12px 22px; border-radius: 9999px; font-size: 0.75rem; font-weight: 800; background: rgba(22, 22, 28, 0.92); color: #FFFFFF; text-align: center; box-shadow: 0 16px 36px rgba(0,0,0,0.5); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.25); transition: all 0.25s var(--spring-ease); opacity: 0; transform: translateY(10px);`;
  
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
