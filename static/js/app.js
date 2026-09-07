/**
 * HackMate — Frontend Application Logic
 * Material 3 & Clean Minimalist UI Engine
 */

let currentUser = null;
let currentFilter = 'all';
let selectedFriends = [];
let targetTeamIdToJoin = null;
let tempAuthRid = null;
let activeTeamIdForDirectAdd = null;

// Global local cache map for instant 0ms modal opening
window.cachedTeamsMap = {};

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  loadUserFromSession();
  fetchTeams();
});

/* --- TOAST SYSTEM --- */
function showToast(msg, type = 'info') {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `pointer-events-auto px-5 py-3 rounded-full text-xs font-bold shadow-lg bg-slate-900 text-white text-center border border-slate-700 transition-all duration-300 transform translate-y-2 opacity-0 flex items-center justify-center gap-2`;
  
  toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  });

  setTimeout(() => {
    toast.classList.add("opacity-0", "-translate-y-2");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* --- USER SESSION MANAGEMENT --- */
function loadUserFromSession() {
  const saved = localStorage.getItem("hackmate_user");
  if (saved) {
    try { 
      currentUser = JSON.parse(saved); 
    } catch(e) {
      console.error("Session parse error", e);
    }
  }
  renderHeaderUser();
}

function saveUserSession(user) {
  currentUser = user;
  localStorage.setItem("hackmate_user", JSON.stringify(user));
  renderHeaderUser();
  fetchTeams();
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("hackmate_user");
  renderHeaderUser();
  fetchTeams();
  showToast("Signed out successfully");
}

function renderHeaderUser() {
  const slotDesktop = document.getElementById("headerUserSlot");
  const slotMobile = document.getElementById("mobileHeaderUserSlot");

  const desktopContent = currentUser ? `
    <button onclick="openMyTeamWorkspace()" class="btn-m3-tonal text-xs h-10 px-4 font-bold">
      <i data-lucide="users" class="w-4 h-4 text-[#6750A4]"></i> My Team
    </button>
    <button onclick="openUserProfileModal()" class="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-xs">
      <img src="${currentUser.avatar_url}" class="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 object-cover">
      <span class="text-xs text-slate-900 font-extrabold">${escapeHtml(currentUser.name.split(' ')[0])}</span>
    </button>
  ` : `
    <button onclick="openAuthSheet()" class="btn-m3-primary text-xs h-10 px-5">
      Sign In with R-ID
    </button>
  `;

  const mobileContent = currentUser ? `
    <button onclick="openUserProfileModal()" class="w-9 h-9 rounded-full overflow-hidden border border-slate-200 shadow-xs">
      <img src="${currentUser.avatar_url}" class="w-full h-full object-cover">
    </button>
  ` : `
    <button onclick="openAuthSheet()" class="btn-m3-primary text-xs h-8 px-3.5">
      Sign In
    </button>
  `;

  if (slotDesktop) slotDesktop.innerHTML = desktopContent;
  if (slotMobile) slotMobile.innerHTML = mobileContent;

  if (window.lucide) lucide.createIcons();
}

function handleMainCreateTeamClick() {
  if (!currentUser) {
    showToast("Please sign in with your R-ID first");
    openAuthSheet();
  } else {
    openCreateTeamModal();
  }
}

/* --- PROFILE MODAL FLOW --- */
async function openUserProfileModal() {
  if (!currentUser) return openAuthSheet();

  const modal = document.getElementById("userProfileSheet");
  const content = document.getElementById("userProfileContent");
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="py-12 text-center">
      <div class="ios-spinner mx-auto mb-3"></div>
      <p class="text-xs text-slate-500 font-bold">Loading profile details...</p>
    </div>
  `;

  modal.classList.add("active");

  try {
    const res = await fetch(`/api/user/profile?r_id=${encodeURIComponent(currentUser.r_id)}`);
    const data = await res.json();
    
    if (!data.success) {
      content.innerHTML = `<div class="p-6 text-center text-xs text-red-500 font-bold">${escapeHtml(data.message)}</div>`;
      return;
    }

    renderUserProfileContent(data.profile, data.teams);
  } catch(e) {
    content.innerHTML = `<div class="p-6 text-center text-xs text-red-500 font-bold">Failed to load profile details</div>`;
  }
}

function closeUserProfileModal() {
  const modal = document.getElementById("userProfileSheet");
  if (modal) modal.classList.remove("active");
}

function renderUserProfileContent(prof, userTeams) {
  const content = document.getElementById("userProfileContent");
  if (!content) return;

  let teamsListHtml = "";
  if (!userTeams || userTeams.length === 0) {
    teamsListHtml = `<div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-center font-bold">You are not currently in any hackathon team.</div>`;
  } else {
    teamsListHtml = userTeams.map(t => `
      <div class="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-extrabold text-slate-900">${escapeHtml(t.name)}</div>
          <div class="text-xs text-slate-500 font-medium">Role: <span class="font-bold text-[#6750A4] uppercase">${t.user_status}</span> • ${t.member_count}/6 Members</div>
        </div>
        <button onclick="closeUserProfileModal(); openTeamDetailSheet(${t.id});" class="btn-m3-tonal text-xs h-9 px-4">
          Open Panel ➔
        </button>
      </div>
    `).join('');
  }

  content.innerHTML = `
    <div class="space-y-6">
      <!-- Avatar & Header -->
      <div class="flex items-center gap-5 p-5 m3-card-pastel-purple rounded-3xl">
        <img src="${prof.avatar_url}" class="w-20 h-20 rounded-full border-4 border-white shadow-md bg-white object-cover shrink-0">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">${escapeHtml(prof.name)}</h2>
          <div class="inline-flex items-center gap-2 mt-1.5">
            <span class="bg-[#6750A4] text-white text-xs font-extrabold px-3 py-0.5 rounded-full">${prof.r_id}</span>
            <span class="text-xs font-bold text-slate-600">${prof.gender}</span>
          </div>
        </div>
      </div>

      <!-- College Record Details -->
      <div>
        <h3 class="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">College Database Record</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div class="text-[11px] font-bold text-slate-400 uppercase">Email Address</div>
            <div class="text-xs font-bold text-slate-900 break-all mt-0.5">${escapeHtml(prof.email)}</div>
          </div>
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div class="text-[11px] font-bold text-slate-400 uppercase">Phone Number</div>
            <div class="text-xs font-bold text-slate-900 mt-0.5">${escapeHtml(prof.phone || 'N/A')}</div>
          </div>
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div class="text-[11px] font-bold text-slate-400 uppercase">Date of Birth</div>
            <div class="text-xs font-bold text-[#6750A4] mt-0.5">${escapeHtml(prof.dob || 'N/A')}</div>
          </div>
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div class="text-[11px] font-bold text-slate-400 uppercase">Father's Name</div>
            <div class="text-xs font-bold text-slate-900 mt-0.5">${escapeHtml(prof.father_name || 'N/A')}</div>
          </div>
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl sm:col-span-2">
            <div class="text-[11px] font-bold text-slate-400 uppercase">Residential Address</div>
            <div class="text-xs font-bold text-slate-900 mt-0.5 leading-relaxed">${escapeHtml(prof.address)}</div>
          </div>
        </div>
      </div>

      <!-- Joined Teams -->
      <div>
        <h3 class="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">My Squads</h3>
        <div class="space-y-2">
          ${teamsListHtml}
        </div>
      </div>

      <!-- Sign Out Action -->
      <div class="pt-4 border-t border-slate-200 flex justify-end">
        <button onclick="closeUserProfileModal(); logoutUser();" class="btn-m3-danger text-xs h-10 px-5">
          <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out
        </button>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

/* --- AUTHENTICATION FLOW --- */
function openAuthSheet() {
  const modal = document.getElementById("authSheet");
  if (modal) {
    modal.classList.add("active");
    showAuthStep(1);
  }
}

function closeAuthSheet() {
  const modal = document.getElementById("authSheet");
  if (modal) modal.classList.remove("active");
}

function showAuthStep(step) {
  const s1 = document.getElementById("authStep1");
  const s2 = document.getElementById("authStep2");
  const sReg = document.getElementById("authStepRegister");

  if (s1) s1.classList.add("hidden");
  if (s2) s2.classList.add("hidden");
  if (sReg) sReg.classList.add("hidden");

  if (step === 1 && s1) s1.classList.remove("hidden");
  if (step === 2 && s2) s2.classList.remove("hidden");
  if (step === 'register' && sReg) sReg.classList.remove("hidden");
}

async function sendEmailOtpCode() {
  const ridInput = document.getElementById("authRidInput");
  const rid = (ridInput ? ridInput.value : "").trim();
  if (!rid) return showToast("Enter your College R-ID");

  tempAuthRid = rid;
  const btn = document.getElementById("btnSendOtp");
  if (btn) {
    btn.innerHTML = `<div class="ios-spinner"></div> Dispatching...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r_id: rid })
    });
    const data = await res.json();
    if (data.success) {
      const emailDisp = document.getElementById("targetEmailDisplay");
      if (emailDisp) emailDisp.innerText = data.email || data.masked_email;
      showToast(data.message);
      showAuthStep(2);
    } else {
      showToast(data.message || "Failed to send code");
    }
  } catch(err) {
    showToast("Server error sending code");
  } finally {
    if (btn) {
      btn.innerHTML = `<span>Send Verification Code</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
      btn.disabled = false;
    }
    if (window.lucide) lucide.createIcons();
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
  if (btn) {
    btn.innerHTML = `<div class="ios-spinner"></div> Verifying...`;
    btn.disabled = true;
  }

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
      closeAuthSheet();
    } else {
      showToast(data.message || "Invalid code");
    }
  } catch(err) {
    showToast("Server error verifying code");
  } finally {
    if (btn) {
      btn.innerHTML = `<span>Verify & Sign In</span> <i data-lucide="check" class="w-4 h-4"></i>`;
      btn.disabled = false;
    }
    if (window.lucide) lucide.createIcons();
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
      closeAuthSheet();
    } else {
      showToast(data.message);
    }
  } catch(e) { showToast("Registration error"); }
}

/* --- TEAMS LISTING & RENDER ENGINE --- */
let searchDebounce = null;
function debounceSearch() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => fetchTeams(), 250);
}

function setFilter(filter) {
  currentFilter = filter;
  const btnAll = document.getElementById("btnFilterAll");
  const btnOpen = document.getElementById("btnFilterOpen");

  if (btnAll) btnAll.className = filter === 'all' ? "m3-chip active" : "m3-chip";
  if (btnOpen) btnOpen.className = filter === 'open' ? "m3-chip active" : "m3-chip";

  fetchTeams();
}

async function fetchTeams() {
  const searchInput = document.getElementById("searchInput");
  const search = searchInput ? searchInput.value.trim() : '';
  const r_id = currentUser ? currentUser.r_id : '';
  const url = `/api/teams?r_id=${encodeURIComponent(r_id)}&search=${encodeURIComponent(search)}&filter=${currentFilter}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    renderTeams(data.teams);
  } catch(e) { console.error("Error fetching teams", e); }
}

function renderTeams(teams) {
  const grid = document.getElementById("teamsGrid");
  const empty = document.getElementById("emptyState");

  if (!grid || !empty) return;

  if (!teams || teams.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  let html = "";
  teams.forEach(t => {
    // Cache team object locally for instant 0ms detail viewing
    window.cachedTeamsMap[t.id] = t;

    let seatsAvatarsHtml = "";
    for (let i = 0; i < 6; i++) {
      const m = t.members[i];
      if (m) {
        seatsAvatarsHtml += `<img src="${m.avatar_url}" class="w-8 h-8 rounded-full border-2 border-white bg-slate-100 object-cover shadow-xs" title="${escapeHtml(m.name)}">`;
      } else {
        seatsAvatarsHtml += `<div class="w-8 h-8 rounded-full border-2 border-dashed border-[#D0BCFF] bg-purple-50 flex items-center justify-center text-xs text-[#6750A4] font-bold" title="Open Seat">+</div>`;
      }
    }

    const tagBadge = t.has_female 
      ? `<span class="badge-balanced">✓ Gender Balanced</span>` 
      : `<span class="badge-needs-female">⚡ Needs Female Teammate</span>`;

    html += `
      <div onclick="openTeamDetailSheet(${t.id})" class="m3-card m3-card-interactive flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-3 mb-2">
            <h3 class="font-extrabold text-slate-900 text-lg leading-snug">${escapeHtml(t.name)}</h3>
            <span class="badge-seat-count shrink-0">${t.member_count}/6 Seats</span>
          </div>

          <p class="text-slate-600 text-xs line-clamp-2 mb-4 leading-relaxed">${escapeHtml(t.description || 'No pitch provided.')}</p>

          <!-- Status Tag -->
          <div class="mb-4">
            ${tagBadge}
          </div>

          <!-- Visual 6 Seats Grid Bar -->
          <div class="flex items-center gap-1.5 mb-5">
            ${seatsAvatarsHtml}
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500">${t.is_full ? 'Fully Staffed (6/6)' : (6 - t.member_count) + ' Open Slots'}</span>
          <button class="btn-m3-outlined text-xs h-9 px-4">View Team Panel ➔</button>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

/* --- TEAM CREATION FLOW --- */
function openCreateTeamModal() {
  if (!currentUser) return openAuthSheet();
  selectedFriends = [];
  renderCreateTeamSeats();
  const modal = document.getElementById("createTeamSheet");
  if (modal) modal.classList.add("active");
}

function closeCreateTeamSheet() {
  const modal = document.getElementById("createTeamSheet");
  if (modal) modal.classList.remove("active");
}

async function searchFriends() {
  const q = document.getElementById("friendSearchInput").value.trim();
  const resultsDiv = document.getElementById("friendSearchResults");
  const loadingSpinner = document.getElementById("friendSearchLoading");

  if (q.length < 2) {
    if (resultsDiv) resultsDiv.classList.add("hidden");
    if (loadingSpinner) loadingSpinner.classList.add("hidden");
    return;
  }

  if (loadingSpinner) loadingSpinner.classList.remove("hidden");

  try {
    const res = await fetch(`/api/students/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    resultsDiv.innerHTML = "";

    const filtered = data.students.filter(s => 
      s.r_id.toUpperCase() !== currentUser.r_id.toUpperCase() && 
      !selectedFriends.some(sf => sf.r_id === s.r_id)
    );

    if (filtered.length === 0) {
      resultsDiv.innerHTML = `<div class="p-4 text-xs text-slate-400 text-center font-bold">No matching students found</div>`;
    } else {
      filtered.forEach(s => {
        const item = document.createElement("div");
        item.className = "p-3.5 hover:bg-purple-50 flex items-center justify-between cursor-pointer border-b border-slate-100 last:border-0 transition-colors";
        item.onclick = () => addFriendToTeam(s);

        item.innerHTML = `
          <div class="flex items-center gap-3">
            <img src="${s.avatar_url}" class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 shrink-0 object-cover">
            <div>
              <div class="text-xs font-bold text-slate-900">${escapeHtml(s.name)}</div>
              <div class="text-[11px] text-slate-500 font-medium">${s.r_id} • ${s.gender}</div>
              <div class="text-[10px] text-[#6750A4] font-semibold">${escapeHtml(s.email)} • DOB: ${escapeHtml(s.dob || 'N/A')}</div>
            </div>
          </div>
          <span class="text-xs font-extrabold text-[#6750A4] bg-purple-100 px-3 py-1 rounded-full shrink-0">+ Add</span>
        `;
        resultsDiv.appendChild(item);
      });
    }
    resultsDiv.classList.remove("hidden");
  } catch(e) {
  } finally {
    if (loadingSpinner) loadingSpinner.classList.add("hidden");
  }
}

function addFriendToTeam(student) {
  if (selectedFriends.length >= 5) return showToast("Max 5 friends (Team limit is 6)");
  selectedFriends.push(student);
  const input = document.getElementById("friendSearchInput");
  const results = document.getElementById("friendSearchResults");
  if (input) input.value = "";
  if (results) results.classList.add("hidden");
  renderCreateTeamSeats();
}

function removeFriend(rid) {
  selectedFriends = selectedFriends.filter(sf => sf.r_id !== rid);
  renderCreateTeamSeats();
}

function renderCreateTeamSeats() {
  const container = document.getElementById("createTeamSeatsContainer");
  if (!container) return;
  container.innerHTML = "";

  // Seat 1: Leader
  container.innerHTML += `
    <div class="seat-card-filled flex items-center gap-3 border-[#D0BCFF] bg-purple-50/50">
      <img src="${currentUser.avatar_url}" class="w-10 h-10 rounded-full bg-white shrink-0 border border-slate-200 object-cover">
      <div class="flex-1 min-w-0">
        <div class="text-xs font-extrabold text-slate-900 truncate">${escapeHtml(currentUser.name)}</div>
        <div class="text-[11px] text-[#6750A4] font-bold">Seat 1 • Leader (You)</div>
      </div>
    </div>
  `;

  // Seats 2-6
  for (let i = 0; i < 5; i++) {
    const friend = selectedFriends[i];
    if (friend) {
      container.innerHTML += `
        <div class="seat-card-filled flex items-center justify-between gap-2">
          <div class="flex items-center gap-3 min-w-0">
            <img src="${friend.avatar_url}" class="w-10 h-10 rounded-full bg-white shrink-0 border border-slate-200 object-cover">
            <div class="min-w-0">
              <div class="text-xs font-bold text-slate-900 truncate">${escapeHtml(friend.name)}</div>
              <div class="text-[11px] text-slate-500 font-medium">${friend.r_id} • Added</div>
            </div>
          </div>
          <button onclick="removeFriend('${friend.r_id}')" class="text-slate-400 hover:text-red-600 font-bold p-1 text-base">×</button>
        </div>
      `;
    } else {
      container.innerHTML += `
        <div class="seat-card-open flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-purple-100 text-[#6750A4] flex items-center justify-center font-bold text-xs">+</div>
            <div>
              <div class="text-xs font-bold text-slate-800">Seat ${i + 2} Open</div>
              <div class="text-[10px] text-[#6750A4] font-bold">Open for Requests</div>
            </div>
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

  const btn = document.getElementById("btnSubmitCreateTeam");
  if (btn) {
    btn.innerHTML = `<div class="ios-spinner"></div> Creating Team...`;
    btn.disabled = true;
  }

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
      closeCreateTeamSheet();
      fetchTeams();
    } else {
      showToast(data.message);
    }
  } catch(e) {
    showToast("Error creating team");
  } finally {
    if (btn) {
      btn.innerHTML = `<span>Create & Publish Team</span> <i data-lucide="rocket" class="w-4 h-4"></i>`;
      btn.disabled = false;
    }
    if (window.lucide) lucide.createIcons();
  }
}

/* --- DETAILED TEAM PANEL MODAL --- */
async function openTeamDetailSheet(teamId) {
  const modal = document.getElementById("teamDetailSheet");
  const content = document.getElementById("teamDetailContent");
  if (!modal || !content) return;

  // INSTANT 0MS RENDERING: If team is already cached locally, render immediately!
  if (window.cachedTeamsMap[teamId]) {
    renderTeamDetailPanel(window.cachedTeamsMap[teamId]);
  } else {
    content.innerHTML = `
      <div class="py-12 text-center">
        <div class="ios-spinner mx-auto mb-3"></div>
        <p class="text-xs text-slate-500 font-bold">Opening squad panel...</p>
      </div>
    `;
  }

  modal.classList.add("active");

  try {
    const r_id = currentUser ? currentUser.r_id : '';
    const res = await fetch(`/api/teams/${teamId}?r_id=${encodeURIComponent(r_id)}`);
    const data = await res.json();

    if (data.success) {
      window.cachedTeamsMap[teamId] = data.team;
      renderTeamDetailPanel(data.team);
    }
  } catch(e) {}
}

function closeTeamDetailSheet() {
  const modal = document.getElementById("teamDetailSheet");
  if (modal) modal.classList.remove("active");
}

function renderTeamDetailPanel(team) {
  const content = document.getElementById("teamDetailContent");
  if (!content) return;

  const isLeader = team.user_status === 'leader';
  const isMember = team.user_status === 'member';

  let seatsHtml = "";
  for (let i = 0; i < 6; i++) {
    const member = team.members[i];

    if (member) {
      const isMe = currentUser && currentUser.r_id.toUpperCase() === member.r_id.toUpperCase();
      const canRemove = isLeader && member.role !== 'leader';

      seatsHtml += `
        <div class="seat-card-filled flex items-center justify-between gap-3">
          <div class="flex items-center gap-3.5 min-w-0">
            <img src="${member.avatar_url}" class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 shrink-0 object-cover">
            <div class="min-w-0">
              <div class="text-sm font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                ${escapeHtml(member.name)} ${isMe ? '<span class="text-[10px] text-[#6750A4] bg-purple-100 px-2 py-0.5 rounded-full font-bold">(You)</span>' : ''}
              </div>
              <div class="text-xs text-slate-500 font-medium">${member.r_id} • ${member.gender}</div>
              <div class="text-[11px] text-[#6750A4] font-semibold truncate mt-0.5">${escapeHtml(member.email)} • DOB: ${escapeHtml(member.dob || 'N/A')}</div>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[10px] font-bold ${member.role === 'leader' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700 border border-slate-200'} px-2.5 py-1 rounded-full uppercase">
              ${member.role}
            </span>

            ${canRemove ? `
              <button onclick="removeMemberFromTeam(${team.id}, '${member.r_id}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-xl text-xs font-bold transition-all" title="Remove Member">
                <i data-lucide="user-minus" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      seatsHtml += `
        <div class="seat-card-open flex items-center justify-between p-3.5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-purple-100 text-[#6750A4] flex items-center justify-center font-extrabold text-lg">+</div>
            <div>
              <div class="text-xs font-extrabold text-slate-800">Seat ${i + 1} Open</div>
              <div class="text-[11px] text-[#6750A4] font-bold">Open for Join Requests</div>
            </div>
          </div>

          <div class="flex gap-2">
            ${isLeader ? `
              <button onclick="openDirectAddTeammateModal(${team.id})" class="btn-m3-primary text-xs h-9 px-3.5">
                + Add Teammate
              </button>
            ` : (!currentUser || team.user_status === 'none') ? `
              <button onclick="closeTeamDetailSheet(); openJoinSheet(${team.id}, '${escapeHtml(team.name)}');" class="btn-m3-primary text-xs h-9 px-4">
                Request to Join ➔
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }
  }

  let whatsappBanner = "";
  if (team.has_whatsapp && (isLeader || isMember)) {
    whatsappBanner = `
      <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
        <div>
          <div class="text-xs font-extrabold text-emerald-950">Official WhatsApp Group Link</div>
          <div class="text-[11px] text-emerald-700 font-medium">Join official squad chat for hackathon collaboration</div>
        </div>
        <a href="${team.whatsapp_link}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs shrink-0 flex items-center gap-1.5">
          <i data-lucide="message-circle" class="w-4 h-4"></i> Open WhatsApp ➔
        </a>
      </div>
    `;
  }

  let leaderRequestsSection = "";
  if (isLeader) {
    leaderRequestsSection = `
      <div class="pt-5 border-t border-slate-200">
        <h4 class="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">Pending Join Requests</h4>
        <div id="panelPendingRequestsContainer" class="space-y-2">
          <div class="text-center py-4"><div class="ios-spinner"></div></div>
        </div>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="space-y-6">
      <!-- Header Info -->
      <div>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-2xl font-extrabold text-slate-900 leading-tight">${escapeHtml(team.name)}</h3>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">${escapeHtml(team.description || 'No pitch provided.')}</p>
          </div>
          <span class="badge-seat-count shrink-0">${team.member_count}/6 Seats Filled</span>
        </div>
      </div>

      ${whatsappBanner}

      ${isLeader ? `
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">Team Leader Controls — WhatsApp Group Link</label>
          <div class="flex gap-2">
            <input type="text" id="panelWhatsappInput" value="${team.whatsapp_link || ''}" placeholder="https://chat.whatsapp.com/..." class="flex-1 h-11 px-4 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#6750A4]">
            <button onclick="updateWhatsappLink(${team.id})" class="btn-m3-primary text-xs h-11 px-5">Save Link</button>
          </div>
        </div>
      ` : ''}

      <!-- 6 Visual Seats Grid -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xs font-extrabold text-slate-700 uppercase tracking-wider">All 6 Squad Seats</h4>
          ${isLeader && !team.is_full ? `
            <button onclick="openDirectAddTeammateModal(${team.id})" class="text-xs font-extrabold text-[#6750A4] hover:underline">+ Add Teammate Directly</button>
          ` : ''}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${seatsHtml}
        </div>
      </div>

      ${leaderRequestsSection}

      <!-- Footer Actions Toolbar -->
      <div class="pt-5 border-t border-slate-200 flex items-center justify-between">
        ${isLeader ? `
          <button onclick="disbandTeam(${team.id})" class="btn-m3-danger">
            <i data-lucide="trash-2" class="w-4 h-4"></i> Disband Team
          </button>
        ` : isMember ? `
          <button onclick="leaveTeam(${team.id})" class="btn-m3-danger">
            <i data-lucide="log-out" class="w-4 h-4"></i> Leave Team
          </button>
        ` : '<div></div>'}

        <button onclick="closeTeamDetailSheet()" class="btn-m3-outlined text-xs h-10 px-5">Close Panel</button>
      </div>
    </div>
  `;

  if (isLeader) {
    fetchLeaderPendingRequests(team.id);
  }

  if (window.lucide) lucide.createIcons();
}

/* --- DIRECT ADD TEAMMATE BY LEADER --- */
function openDirectAddTeammateModal(teamId) {
  activeTeamIdForDirectAdd = teamId;
  const input = document.getElementById("directAddSearchInput");
  const container = document.getElementById("directAddSearchResults");
  if (input) input.value = "";
  if (container) container.innerHTML = `<div class="text-xs text-slate-400 text-center py-6">Type student R-ID or name above</div>`;
  
  const modal = document.getElementById("addTeammateModal");
  if (modal) modal.classList.add("active");
}

function closeAddTeammateModal() {
  const modal = document.getElementById("addTeammateModal");
  if (modal) modal.classList.remove("active");
}

async function searchDirectAddCandidate() {
  const q = document.getElementById("directAddSearchInput").value.trim();
  const container = document.getElementById("directAddSearchResults");
  if (!container) return;

  if (q.length < 2) {
    container.innerHTML = `<div class="text-xs text-slate-400 text-center py-6">Type student R-ID or name above</div>`;
    return;
  }

  container.innerHTML = `<div class="text-center py-4"><div class="ios-spinner"></div></div>`;

  try {
    const res = await fetch(`/api/students/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    
    if (!data.students || data.students.length === 0) {
      container.innerHTML = `<div class="text-xs text-slate-400 text-center py-6 font-bold">No students found</div>`;
      return;
    }

    container.innerHTML = data.students.map(s => `
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <img src="${s.avatar_url}" class="w-10 h-10 rounded-full bg-white border border-slate-200 object-cover">
          <div>
            <div class="text-xs font-bold text-slate-900">${escapeHtml(s.name)}</div>
            <div class="text-[11px] text-slate-500">${s.r_id} • ${s.gender}</div>
            <div class="text-[10px] text-[#6750A4] font-semibold">${escapeHtml(s.email)} • DOB: ${escapeHtml(s.dob || 'N/A')}</div>
          </div>
        </div>
        <button onclick="submitDirectAddTeammate('${s.r_id}')" class="btn-m3-primary text-xs h-8 px-3">
          + Add
        </button>
      </div>
    `).join('');
  } catch(e) {
    container.innerHTML = `<div class="text-xs text-red-500 text-center py-4 font-bold">Error searching directory</div>`;
  }
}

async function submitDirectAddTeammate(studentRid) {
  if (!activeTeamIdForDirectAdd) return;

  try {
    const res = await fetch(`/api/teams/${activeTeamIdForDirectAdd}/members/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leader_r_id: currentUser.r_id, student_r_id: studentRid })
    });
    const data = await res.json();
    showToast(data.message);
    if (data.success) {
      closeAddTeammateModal();
      openTeamDetailSheet(activeTeamIdForDirectAdd);
      fetchTeams();
    }
  } catch(e) {
    showToast("Error adding teammate");
  }
}

async function removeMemberFromTeam(teamId, targetRid) {
  if (!confirm(`Are you sure you want to remove ${targetRid} from the team?`)) return;

  try {
    const res = await fetch(`/api/teams/${teamId}/members/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leader_r_id: currentUser.r_id, target_r_id: targetRid })
    });
    const data = await res.json();
    showToast(data.message);
    if (data.success) {
      openTeamDetailSheet(teamId);
      fetchTeams();
    }
  } catch(e) {
    showToast("Error removing member");
  }
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
      closeTeamDetailSheet();
      fetchTeams();
    }
  } catch(e) {
    showToast("Error leaving team");
  }
}

async function disbandTeam(teamId) {
  if (!confirm("Are you sure you want to disband this team? This action cannot be undone.")) return;

  try {
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leader_r_id: currentUser.r_id })
    });
    const data = await res.json();
    showToast(data.message);
    if (data.success) {
      closeTeamDetailSheet();
      fetchTeams();
    }
  } catch(e) {
    showToast("Error disbanding team");
  }
}

async function fetchLeaderPendingRequests(teamId) {
  const container = document.getElementById("panelPendingRequestsContainer");
  if (!container) return;

  try {
    const res = await fetch(`/api/teams/${teamId}/requests?leader_r_id=${encodeURIComponent(currentUser.r_id)}`);
    const data = await res.json();
    const reqs = data.requests || [];

    if (reqs.length === 0) {
      container.innerHTML = `<div class="text-xs text-slate-400 italic py-2 font-semibold">No pending requests</div>`;
      return;
    }

    container.innerHTML = reqs.map(r => `
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <img src="${r.avatar_url}" class="w-10 h-10 rounded-full bg-white border border-slate-200 object-cover">
          <div>
            <div class="text-xs font-bold text-slate-900">${escapeHtml(r.name)} (${r.r_id})</div>
            <div class="text-[11px] text-slate-500 font-medium">"${escapeHtml(r.message || 'No note')}" • DOB: ${escapeHtml(r.dob || 'N/A')}</div>
          </div>
        </div>
        <div class="flex gap-1.5 shrink-0">
          <button onclick="actionRequest(${teamId}, ${r.request_id}, 'accept')" class="btn-m3-primary text-xs h-8 px-3">Accept</button>
          <button onclick="actionRequest(${teamId}, ${r.request_id}, 'reject')" class="btn-m3-outlined text-xs h-8 px-3">Decline</button>
        </div>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  } catch(e){
    container.innerHTML = `<div class="text-xs text-red-500 font-bold">Error loading requests</div>`;
  }
}

function openMyTeamWorkspace() {
  if (!currentUser) return openAuthSheet();
  fetch(`/api/my-team?r_id=${encodeURIComponent(currentUser.r_id)}`)
    .then(r => r.json())
    .then(data => {
      if (data.team) {
        openTeamDetailSheet(data.team.id);
      } else {
        showToast("You are not in a team yet");
        openCreateTeamModal();
      }
    });
}

/* --- JOIN REQUEST FLOW --- */
function openJoinSheet(teamId, teamName) {
  if (!currentUser) return openAuthSheet();
  targetTeamIdToJoin = teamId;
  const nameEl = document.getElementById("joinTeamName");
  const msgEl = document.getElementById("joinMessageInput");
  if (nameEl) nameEl.innerText = teamName;
  if (msgEl) msgEl.value = "";
  
  const modal = document.getElementById("joinSheet");
  if (modal) modal.classList.add("active");
}

function closeJoinSheet() {
  const modal = document.getElementById("joinSheet");
  if (modal) modal.classList.remove("active");
}

async function submitJoinRequest() {
  const msg = document.getElementById("joinMessageInput").value.trim();
  const btn = document.getElementById("btnSubmitJoinRequest");
  if (btn) {
    btn.innerHTML = `<div class="ios-spinner"></div> Sending...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch(`/api/teams/${targetTeamIdToJoin}/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_r_id: currentUser.r_id, message: msg })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      closeJoinSheet();
      fetchTeams();
    } else {
      showToast(data.message);
    }
  } catch(e) {
    showToast("Error sending request");
  } finally {
    if (btn) {
      btn.innerHTML = `<span>Send Join Request</span> <i data-lucide="send" class="w-4 h-4"></i>`;
      btn.disabled = false;
    }
    if (window.lucide) lucide.createIcons();
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
    openTeamDetailSheet(teamId);
    fetchTeams();
  } catch(e) { showToast("Error handling request"); }
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
    openTeamDetailSheet(teamId);
    fetchTeams();
  } catch(e) { showToast("Error updating link"); }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
