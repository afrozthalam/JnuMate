/**
 * HackMate — Fast Zero-Lag Frontend Engine
 * Pure Vanilla JS with 0ms Client Cache & SVG Icon Helper
 */

let currentUser = null;
let currentFilter = 'all';
let selectedFriends = [];
let targetTeamIdToJoin = null;
let tempAuthRid = null;
let activeTeamIdForDirectAdd = null;

// Local client cache map for instant 0ms modal panels
window.cachedTeamsMap = {};

document.addEventListener("DOMContentLoaded", () => {
  loadUserFromSession();
  fetchTeams();
  setupKeyboardShortcuts();
});

/* --- LIGHTWEIGHT FAST SVG ICON RENDERER --- */
function getIconSvg(name, sizeClass = "w-4 h-4") {
  const icons = {
    'plus': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>`,
    'search': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>`,
    'users': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>`,
    'user': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>`,
    'user-plus': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110 21c-2.331 0-4.512-.645-6.374-1.765z"/></svg>`,
    'log-out': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>`,
    'compass': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15.82 8.18L13.5 13.5l-5.32 2.32 2.32-5.32 5.32-2.32z"/></svg>`,
    'grid': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>`,
    'check': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>`,
    'x': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
    'rocket': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.24A4.5 4.5 0 003.75 18H7.5m.375-3.75h-4.8M16.5 7.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/></svg>`,
    'message-circle': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-1.074-.865 5.97 5.97 0 011.002-2.186C4.167 16.51 3 14.364 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>`,
    'arrow-right': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>`,
    'send': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>`,
    'trash-2': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>`,
    'zap': `<svg class="${sizeClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>`
  };
  return icons[name] || '';
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const input = document.getElementById('searchInput') || document.getElementById('desktopSearchInput');
      if (input) input.focus();
    }
  });
}

/* --- TOAST SYSTEM --- */
function showToast(msg) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.style.cssText = `pointer-events: auto; padding: 12px 20px; border-radius: 9999px; font-size: 0.75rem; font-weight: 800; background: #1D1B20; color: #FFFFFF; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transition: all 0.25s ease; opacity: 0; transform: translateY(10px); display: flex; align-items: center; justify-content: center; gap: 6px;`;
  
  toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
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

/* --- USER SESSION HANDLING --- */
function loadUserFromSession() {
  const saved = localStorage.getItem("hackmate_user");
  if (saved) {
    try { 
      currentUser = JSON.parse(saved); 
    } catch(e){}
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
  const slotSidebar = document.getElementById("sidebarUserCard");
  const slotMobile = document.getElementById("mobileHeaderUserSlot");

  if (currentUser) {
    if (slotSidebar) {
      slotSidebar.innerHTML = `
        <div onclick="openUserProfileModal()" class="sidebar-user-card" title="Open My Profile">
          <img src="${currentUser.avatar_url}" class="user-avatar-sm">
          <div class="user-info-text">
            <div class="user-name-title">${escapeHtml(currentUser.name.split(' ')[0])}</div>
            <div class="user-sub-title">${currentUser.r_id} • Signed In</div>
          </div>
        </div>
      `;
    }

    if (slotMobile) {
      slotMobile.innerHTML = `
        <button onclick="openUserProfileModal()" style="width:36px; height:36px; border-radius:9999px; overflow:hidden; border:1px solid #E7E0EC; background:#FFF;">
          <img src="${currentUser.avatar_url}" style="width:100%; height:100%; object-fit:cover;">
        </button>
      `;
    }
  } else {
    if (slotSidebar) {
      slotSidebar.innerHTML = `
        <button onclick="openAuthSheet()" class="btn-primary" style="width:100%; justify-content:center;">
          ${getIconSvg('user')} Sign In with R-ID
        </button>
      `;
    }

    if (slotMobile) {
      slotMobile.innerHTML = `
        <button onclick="openAuthSheet()" class="btn-primary" style="height:34px; padding:0 14px; font-size:0.75rem;">
          Sign In
        </button>
      `;
    }
  }
}

function handleMainCreateTeamClick() {
  if (!currentUser) {
    showToast("Please sign in with your R-ID first");
    openAuthSheet();
  } else {
    openCreateTeamModal();
  }
}

/* --- USER PROFILE MODAL FLOW --- */
async function openUserProfileModal() {
  if (!currentUser) return openAuthSheet();

  const modal = document.getElementById("userProfileSheet");
  const content = document.getElementById("userProfileContent");
  if (!modal || !content) return;

  content.innerHTML = `
    <div style="padding:48px 0; text-align:center;">
      <div class="ios-spinner" style="margin:0 auto 12px;"></div>
      <p style="font-size:0.75rem; color:#79747E; font-weight:700;">Loading college profile details...</p>
    </div>
  `;

  modal.classList.add("active");

  try {
    const res = await fetch(`/api/user/profile?r_id=${encodeURIComponent(currentUser.r_id)}`);
    const data = await res.json();
    
    if (!data.success) {
      content.innerHTML = `<div style="padding:24px; text-align:center; font-size:0.75rem; color:#B3261E; font-weight:800;">${escapeHtml(data.message)}</div>`;
      return;
    }

    renderUserProfileContent(data.profile, data.teams);
  } catch(e) {
    content.innerHTML = `<div style="padding:24px; text-align:center; font-size:0.75rem; color:#B3261E; font-weight:800;">Failed to load profile details</div>`;
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
    teamsListHtml = `<div style="padding:16px; background:#F7F2FA; border:1px solid #E7E0EC; border-radius:16px; font-size:0.75rem; color:#79747E; text-align:center; font-weight:700;">You are not currently in any hackathon squad.</div>`;
  } else {
    teamsListHtml = userTeams.map(t => `
      <div style="padding:16px; background:#F3EDF7; border:1px solid #D0BCFF; border-radius:16px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <div style="font-size:0.875rem; font-weight:800; color:#1D1B20;">${escapeHtml(t.name)}</div>
          <div style="font-size:0.75rem; color:#49454F; font-weight:600; margin-top:2px;">Role: <span style="font-weight:800; color:#6750A4; text-transform:uppercase;">${t.user_status}</span> • ${t.member_count}/6 Members</div>
        </div>
        <button onclick="closeUserProfileModal(); openTeamDetailSheet(${t.id});" class="btn-tonal" style="height:36px; padding:0 14px; font-size:0.75rem;">
          Open Panel ➔
        </button>
      </div>
    `).join('');
  }

  content.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <!-- Profile Header -->
      <div style="padding:20px; background:linear-gradient(135deg, #F3EDF7 0%, #E8DEF8 100%); border:1px solid #D0BCFF; border-radius:24px; display:flex; align-items:center; gap:20px;">
        <img src="${prof.avatar_url}" style="width:72px; height:72px; border-radius:9999px; border:3px solid #FFF; box-shadow:0 4px 12px rgba(0,0,0,0.08); background:#FFF; object-fit:cover; flex-shrink:0;">
        <div>
          <h2 style="font-size:1.25rem; font-weight:800; color:#1D1B20;">${escapeHtml(prof.name)}</h2>
          <div style="display:inline-flex; align-items:center; gap:8px; margin-top:6px;">
            <span style="background:#6750A4; color:#FFF; font-size:0.75rem; font-weight:800; padding:2px 10px; border-radius:9999px;">${prof.r_id}</span>
            <span style="font-size:0.75rem; font-weight:700; color:#49454F;">${prof.gender}</span>
          </div>
        </div>
      </div>

      <!-- Details Grid -->
      <div>
        <h3 style="font-size:0.75rem; font-weight:800; color:#49454F; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px;">College Record Information</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <div style="padding:14px; background:#F7F2FA; border:1px solid #E7E0EC; border-radius:16px;">
            <div style="font-size:0.6875rem; font-weight:700; color:#79747E; text-transform:uppercase;">Email Address</div>
            <div style="font-size:0.75rem; font-weight:800; color:#1D1B20; word-break:break-all; margin-top:2px;">${escapeHtml(prof.email)}</div>
          </div>
          <div style="padding:14px; background:#F7F2FA; border:1px solid #E7E0EC; border-radius:16px;">
            <div style="font-size:0.6875rem; font-weight:700; color:#79747E; text-transform:uppercase;">Mobile Phone</div>
            <div style="font-size:0.75rem; font-weight:800; color:#1D1B20; margin-top:2px;">${escapeHtml(prof.phone || 'N/A')}</div>
          </div>
          <div style="padding:14px; background:#F7F2FA; border:1px solid #E7E0EC; border-radius:16px;">
            <div style="font-size:0.6875rem; font-weight:700; color:#79747E; text-transform:uppercase;">Date of Birth</div>
            <div style="font-size:0.75rem; font-weight:800; color:#6750A4; margin-top:2px;">${escapeHtml(prof.dob || 'N/A')}</div>
          </div>
          <div style="padding:14px; background:#F7F2FA; border:1px solid #E7E0EC; border-radius:16px;">
            <div style="font-size:0.6875rem; font-weight:700; color:#79747E; text-transform:uppercase;">Father's Name</div>
            <div style="font-size:0.75rem; font-weight:800; color:#1D1B20; margin-top:2px;">${escapeHtml(prof.father_name || 'N/A')}</div>
          </div>
          <div style="padding:14px; background:#F7F2FA; border:1px solid #E7E0EC; border-radius:16px; grid-column: 1 / -1;">
            <div style="font-size:0.6875rem; font-weight:700; color:#79747E; text-transform:uppercase;">Address</div>
            <div style="font-size:0.75rem; font-weight:800; color:#1D1B20; margin-top:2px; line-height:1.4;">${escapeHtml(prof.address)}</div>
          </div>
        </div>
      </div>

      <!-- Squads -->
      <div>
        <h3 style="font-size:0.75rem; font-weight:800; color:#49454F; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px;">My Squads</h3>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${teamsListHtml}
        </div>
      </div>

      <!-- Actions -->
      <div style="padding-top:16px; border-top:1px solid #E7E0EC; display:flex; justify-content:flex-end;">
        <button onclick="closeUserProfileModal(); logoutUser();" class="btn-danger">
          ${getIconSvg('log-out')} Sign Out
        </button>
      </div>
    </div>
  `;
}

/* --- AUTH FLOW --- */
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

  if (s1) s1.style.display = "none";
  if (s2) s2.style.display = "none";
  if (sReg) sReg.style.display = "none";

  if (step === 1 && s1) s1.style.display = "block";
  if (step === 2 && s2) s2.style.display = "block";
  if (step === 'register' && sReg) sReg.style.display = "block";
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
      btn.innerHTML = `<span>Send Verification Code</span> ${getIconSvg('arrow-right')}`;
      btn.disabled = false;
    }
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
      btn.innerHTML = `<span>Verify & Sign In</span> ${getIconSvg('check')}`;
      btn.disabled = false;
    }
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

/* --- TEAMS LISTING & DASHBOARD STATS ENGINE --- */
let searchDebounce = null;
function debounceSearch() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => fetchTeams(), 200);
}

function setFilter(filter) {
  currentFilter = filter;
  const btnAll = document.getElementById("btnFilterAll");
  const btnOpen = document.getElementById("btnFilterOpen");

  if (btnAll) btnAll.className = filter === 'all' ? "chip-btn active" : "chip-btn";
  if (btnOpen) btnOpen.className = filter === 'open' ? "chip-btn active" : "chip-btn";

  fetchTeams();
}

async function fetchTeams() {
  const searchInput = document.getElementById("searchInput") || document.getElementById("desktopSearchInput");
  const search = searchInput ? searchInput.value.trim() : '';
  const r_id = currentUser ? currentUser.r_id : '';
  const url = `/api/teams?r_id=${encodeURIComponent(r_id)}&search=${encodeURIComponent(search)}&filter=${currentFilter}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    renderTeams(data.teams);
    updateDashboardStats(data.teams);
  } catch(e) { console.error(e); }
}

function updateDashboardStats(teams) {
  if (!teams) return;
  const totalSquads = teams.length;
  let openSeats = 0;
  let balancedSquads = 0;

  teams.forEach(t => {
    openSeats += (6 - t.member_count);
    if (t.has_female) balancedSquads++;
  });

  const elTotal = document.getElementById("statTotalSquads");
  const elSeats = document.getElementById("statOpenSeats");
  const elBalanced = document.getElementById("statBalancedSquads");

  if (elTotal) elTotal.innerText = totalSquads;
  if (elSeats) elSeats.innerText = openSeats;
  if (elBalanced) elBalanced.innerText = balancedSquads;
}

function renderTeams(teams) {
  const grid = document.getElementById("teamsGrid");
  const empty = document.getElementById("emptyState");

  if (!grid || !empty) return;

  if (!teams || teams.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  let html = "";
  teams.forEach(t => {
    // Cache team object for 0ms instant modal panel opening
    window.cachedTeamsMap[t.id] = t;

    let avatarsHtml = "";
    for (let i = 0; i < 6; i++) {
      const m = t.members[i];
      if (m) {
        avatarsHtml += `<img src="${m.avatar_url}" class="avatar-stack-item" title="${escapeHtml(m.name)}">`;
      } else {
        avatarsHtml += `<div class="avatar-stack-open" title="Open Seat">+</div>`;
      }
    }

    const fillPercent = Math.round((t.member_count / 6) * 100);

    const tagBadge = t.has_female 
      ? `<span class="badge-tag badge-green">✓ Gender Balanced</span>` 
      : `<span class="badge-tag badge-pink">⚡ Needs Female</span>`;

    html += `
      <div onclick="openTeamDetailSheet(${t.id})" class="squad-card">
        <div>
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px;">
            <h3 style="font-size:1.125rem; font-weight:800; color:#1D1B20; line-height:1.3;">${escapeHtml(t.name)}</h3>
            <span style="font-size:0.75rem; font-weight:800; color:#6750A4; background:#E8DEF8; padding:3px 10px; border-radius:9999px; flex-shrink:0;">${t.member_count}/6 Seats</span>
          </div>

          <p style="font-size:0.75rem; color:#49454F; line-height:1.5; margin-bottom:14px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHtml(t.description || 'No project pitch provided.')}</p>

          <div style="margin-bottom:14px;">
            ${tagBadge}
          </div>

          <!-- VISUAL SEAT PROGRESS METER -->
          <div class="seat-meter-container">
            <div class="seat-meter-header">
              <span>Squad Capacity</span>
              <span>${fillPercent}% (${6 - t.member_count} open)</span>
            </div>
            <div class="seat-progress-track">
              <div class="seat-progress-fill" style="width: ${fillPercent}%;"></div>
            </div>
          </div>
        </div>

        <div style="padding-top:14px; border-top:1px solid #E7E0EC; display:flex; align-items:center; justify-content:space-between; margin-top:14px;">
          <div class="avatar-stack">
            ${avatarsHtml}
          </div>
          <button class="btn-outlined" style="height:36px; padding:0 14px; font-size:0.75rem;">View Panel ➔</button>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
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
      resultsDiv.innerHTML = `<div style="padding:16px; font-size:0.75rem; color:#79747E; text-align:center; font-weight:700;">No matching students found</div>`;
    } else {
      filtered.forEach(s => {
        const item = document.createElement("div");
        item.style.cssText = `padding:12px 16px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; border-bottom:1px solid #E7E0EC; transition:background 0.15s;`;
        item.onmouseenter = () => item.style.background = "#F3EDF7";
        item.onmouseleave = () => item.style.background = "#FFFFFF";
        item.onclick = () => addFriendToTeam(s);

        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${s.avatar_url}" style="width:36px; height:36px; border-radius:9999px; background:#F7F2FA; border:1px solid #E7E0EC; flex-shrink:0; object-fit:cover;">
            <div>
              <div style="font-size:0.75rem; font-weight:800; color:#1D1B20;">${escapeHtml(s.name)}</div>
              <div style="font-size:0.6875rem; color:#49454F;">${s.r_id} • ${s.gender}</div>
            </div>
          </div>
          <span style="font-size:0.75rem; font-weight:800; color:#6750A4; background:#E8DEF8; padding:3px 10px; border-radius:9999px;">+ Add</span>
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
  const input = document.getElementById("friendSearchInput");
  const results = document.getElementById("friendSearchResults");
  if (input) input.value = "";
  if (results) results.style.display = "none";
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
    <div class="modal-seat-card" style="display:flex; align-items:center; gap:12px; background:#F3EDF7; border-color:#D0BCFF;">
      <img src="${currentUser.avatar_url}" style="width:36px; height:36px; border-radius:9999px; object-fit:cover; background:#FFF; border:1px solid #E7E0EC;">
      <div style="flex:1; min-width:0;">
        <div style="font-size:0.75rem; font-weight:800; color:#1D1B20;" class="truncate">${escapeHtml(currentUser.name)}</div>
        <div style="font-size:0.6875rem; font-weight:700; color:#6750A4;">Seat 1 • Leader (You)</div>
      </div>
    </div>
  `;

  // Seats 2-6
  for (let i = 0; i < 5; i++) {
    const friend = selectedFriends[i];
    if (friend) {
      container.innerHTML += `
        <div class="modal-seat-card" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="display:flex; align-items:center; gap:12px; min-width:0;">
            <img src="${friend.avatar_url}" style="width:36px; height:36px; border-radius:9999px; object-fit:cover; background:#FFF; border:1px solid #E7E0EC;">
            <div style="min-width:0;">
              <div style="font-size:0.75rem; font-weight:800; color:#1D1B20;" class="truncate">${escapeHtml(friend.name)}</div>
              <div style="font-size:0.6875rem; color:#49454F;">${friend.r_id} • Added</div>
            </div>
          </div>
          <button onclick="removeFriend('${friend.r_id}')" style="background:none; border:none; color:#79747E; font-size:1.125rem; font-weight:700; cursor:pointer; padding:4px;">×</button>
        </div>
      `;
    } else {
      container.innerHTML += `
        <div class="modal-seat-card modal-seat-open" style="display:flex; align-items:center; gap:10px;">
          <div style="width:30px; height:30px; border-radius:9999px; background:#E8DEF8; color:#6750A4; font-weight:800; font-size:0.875rem; display:flex; align-items:center; justify-content:center;">+</div>
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:#1D1B20;">Seat ${i + 2} Open</div>
            <div style="font-size:0.6875rem; font-weight:700; color:#6750A4;">Open for Join Requests</div>
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
      btn.innerHTML = `<span>Create & Publish Team</span> ${getIconSvg('rocket')}`;
      btn.disabled = false;
    }
  }
}

/* --- DETAILED TEAM PANEL MODAL --- */
async function openTeamDetailSheet(teamId) {
  const modal = document.getElementById("teamDetailSheet");
  const content = document.getElementById("teamDetailContent");
  if (!modal || !content) return;

  // 0ms INSTANT RENDERING: If team is already cached locally, render immediately!
  if (window.cachedTeamsMap[teamId]) {
    renderTeamDetailPanel(window.cachedTeamsMap[teamId]);
  } else {
    content.innerHTML = `
      <div style="padding:48px 0; text-align:center;">
        <div class="ios-spinner" style="margin:0 auto 12px;"></div>
        <p style="font-size:0.75rem; color:#79747E; font-weight:700;">Opening squad panel...</p>
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
        <div class="modal-seat-card" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px; min-width:0;">
            <img src="${member.avatar_url}" style="width:40px; height:40px; border-radius:9999px; background:#FFF; border:1px solid #E7E0EC; object-fit:cover; flex-shrink:0;">
            <div style="min-width:0;">
              <div style="font-size:0.8125rem; font-weight:800; color:#1D1B20; display:flex; align-items:center; gap:6px;">
                ${escapeHtml(member.name)} ${isMe ? '<span style="font-size:0.625rem; color:#6750A4; background:#E8DEF8; padding:1px 6px; border-radius:9999px; font-weight:800;">(You)</span>' : ''}
              </div>
              <div style="font-size:0.6875rem; color:#49454F;">${member.r_id} • ${member.gender}</div>
              <div style="font-size:0.625rem; color:#6750A4; font-weight:700; margin-top:2px;">${escapeHtml(member.email)} • DOB: ${escapeHtml(member.dob || 'N/A')}</div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
            <span style="font-size:0.625rem; font-weight:800; background:${member.role === 'leader' ? '#FFF4E5' : '#F7F2FA'}; color:${member.role === 'leader' ? '#3E1B00' : '#49454F'}; padding:3px 8px; border-radius:9999px; text-transform:uppercase; border:1px solid #E7E0EC;">
              ${member.role}
            </span>

            ${canRemove ? `
              <button onclick="removeMemberFromTeam(${team.id}, '${member.r_id}')" style="background:#FFD8E4; color:#31111D; border:none; padding:6px; border-radius:10px; cursor:pointer;" title="Remove Member">
                ${getIconSvg('trash-2', 'w-3.5 h-3.5')}
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      seatsHtml += `
        <div class="modal-seat-card modal-seat-open" style="display:flex; align-items:center; justify-content:space-between; padding:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:34px; height:34px; border-radius:9999px; background:#E8DEF8; color:#6750A4; font-weight:800; font-size:1rem; display:flex; align-items:center; justify-content:center;">+</div>
            <div>
              <div style="font-size:0.75rem; font-weight:800; color:#1D1B20;">Seat ${i + 1} Open</div>
              <div style="font-size:0.6875rem; font-weight:700; color:#6750A4;">Open for Join Requests</div>
            </div>
          </div>

          <div>
            ${isLeader ? `
              <button onclick="openDirectAddTeammateModal(${team.id})" class="btn-primary" style="height:32px; padding:0 12px; font-size:0.75rem;">
                + Add Teammate
              </button>
            ` : (!currentUser || team.user_status === 'none') ? `
              <button onclick="closeTeamDetailSheet(); openJoinSheet(${team.id}, '${escapeHtml(team.name)}');" class="btn-primary" style="height:32px; padding:0 12px; font-size:0.75rem;">
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
      <div style="padding:14px; background:#E6F4EA; border:1px solid #A5D6A7; border-radius:16px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <div style="font-size:0.75rem; font-weight:800; color:#002204;">Official WhatsApp Group Link</div>
          <div style="font-size:0.6875rem; color:#1E4620;">Join official squad chat for hackathon collaboration</div>
        </div>
        <a href="${team.whatsapp_link}" target="_blank" style="background:#2E7D32; color:#FFF; font-size:0.75rem; font-weight:800; padding:8px 14px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
          ${getIconSvg('message-circle')} Open Chat
        </a>
      </div>
    `;
  }

  let leaderRequestsSection = "";
  if (isLeader) {
    leaderRequestsSection = `
      <div style="padding-top:18px; border-top:1px solid #E7E0EC;">
        <h4 style="font-size:0.75rem; font-weight:800; color:#49454F; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px;">Pending Join Requests</h4>
        <div id="panelPendingRequestsContainer" style="display:flex; flex-direction:column; gap:8px;">
          <div style="text-align:center; padding:12px;"><div class="ios-spinner"></div></div>
        </div>
      </div>
    `;
  }

  content.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <!-- Header -->
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">
        <div>
          <h3 style="font-size:1.5rem; font-weight:800; color:#1D1B20; line-height:1.2;">${escapeHtml(team.name)}</h3>
          <p style="font-size:0.75rem; color:#49454F; margin-top:4px; line-height:1.5;">${escapeHtml(team.description || 'No project pitch provided.')}</p>
        </div>
        <span style="font-size:0.75rem; font-weight:800; color:#6750A4; background:#E8DEF8; padding:4px 12px; border-radius:9999px; flex-shrink:0;">${team.member_count}/6 Seats</span>
      </div>

      ${whatsappBanner}

      ${isLeader ? `
        <div style="padding:14px; background:#F7F2FA; border:1px solid #E7E0EC; border-radius:16px;">
          <label style="display:block; font-size:0.6875rem; font-weight:800; color:#49454F; text-transform:uppercase; margin-bottom:8px;">Leader Controls — WhatsApp Link</label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="panelWhatsappInput" value="${team.whatsapp_link || ''}" placeholder="https://chat.whatsapp.com/..." style="flex:1; height:38px; padding:0 12px; background:#FFF; border:1px solid #E7E0EC; border-radius:12px; font-size:0.75rem; outline:none;">
            <button onclick="updateWhatsappLink(${team.id})" class="btn-primary" style="height:38px; padding:0 16px; font-size:0.75rem;">Save</button>
          </div>
        </div>
      ` : ''}

      <!-- 6 Seats Grid -->
      <div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <h4 style="font-size:0.75rem; font-weight:800; color:#49454F; text-transform:uppercase;">All 6 Squad Seats</h4>
          ${isLeader && !team.is_full ? `
            <button onclick="openDirectAddTeammateModal(${team.id})" style="font-size:0.75rem; font-weight:800; color:#6750A4; background:none; border:none; cursor:pointer;">+ Add Teammate Directly</button>
          ` : ''}
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px;">
          ${seatsHtml}
        </div>
      </div>

      ${leaderRequestsSection}

      <!-- Toolbar Footer -->
      <div style="padding-top:16px; border-top:1px solid #E7E0EC; display:flex; align-items:center; justify-content:space-between;">
        ${isLeader ? `
          <button onclick="disbandTeam(${team.id})" class="btn-danger">
            ${getIconSvg('trash-2')} Disband Team
          </button>
        ` : isMember ? `
          <button onclick="leaveTeam(${team.id})" class="btn-danger">
            ${getIconSvg('log-out')} Leave Team
          </button>
        ` : '<div></div>'}

        <button onclick="closeTeamDetailSheet()" class="btn-outlined" style="height:38px; padding:0 16px; font-size:0.75rem;">Close Panel</button>
      </div>
    </div>
  `;

  if (isLeader) {
    fetchLeaderPendingRequests(team.id);
  }
}

/* --- DIRECT ADD TEAMMATE BY LEADER --- */
function openDirectAddTeammateModal(teamId) {
  activeTeamIdForDirectAdd = teamId;
  const input = document.getElementById("directAddSearchInput");
  const container = document.getElementById("directAddSearchResults");
  if (input) input.value = "";
  if (container) container.innerHTML = `<div style="font-size:0.75rem; color:#79747E; text-align:center; padding:24px;">Type student R-ID or name above</div>`;
  
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
    container.innerHTML = `<div style="font-size:0.75rem; color:#79747E; text-align:center; padding:24px;">Type student R-ID or name above</div>`;
    return;
  }

  container.innerHTML = `<div style="text-align:center; padding:16px;"><div class="ios-spinner"></div></div>`;

  try {
    const res = await fetch(`/api/students/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    
    if (!data.students || data.students.length === 0) {
      container.innerHTML = `<div style="font-size:0.75rem; color:#79747E; text-align:center; padding:24px; font-weight:700;">No students found</div>`;
      return;
    }

    container.innerHTML = data.students.map(s => `
      <div style="padding:10px; background:#F7F2FA; border:1px solid #E7E0EC; border-radius:12px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${s.avatar_url}" style="width:36px; height:36px; border-radius:9999px; background:#FFF; border:1px solid #E7E0EC; object-fit:cover;">
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:#1D1B20;">${escapeHtml(s.name)}</div>
            <div style="font-size:0.6875rem; color:#49454F;">${s.r_id} • ${s.gender}</div>
          </div>
        </div>
        <button onclick="submitDirectAddTeammate('${s.r_id}')" class="btn-primary" style="height:32px; padding:0 12px; font-size:0.75rem;">
          + Add
        </button>
      </div>
    `).join('');
  } catch(e) {
    container.innerHTML = `<div style="font-size:0.75rem; color:#B3261E; text-align:center; padding:16px; font-weight:700;">Error searching directory</div>`;
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
      container.innerHTML = `<div style="font-size:0.75rem; color:#79747E; font-style:italic; padding:6px 0; font-weight:600;">No pending requests</div>`;
      return;
    }

    container.innerHTML = reqs.map(r => `
      <div style="padding:10px; background:#F7F2FA; border:1px solid #E7E0EC; border-radius:12px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${r.avatar_url}" style="width:36px; height:36px; border-radius:9999px; background:#FFF; border:1px solid #E7E0EC; object-fit:cover;">
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:#1D1B20;">${escapeHtml(r.name)} (${r.r_id})</div>
            <div style="font-size:0.6875rem; color:#49454F;">"${escapeHtml(r.message || 'No note')}" • DOB: ${escapeHtml(r.dob || 'N/A')}</div>
          </div>
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button onclick="actionRequest(${teamId}, ${r.request_id}, 'accept')" class="btn-primary" style="height:30px; padding:0 10px; font-size:0.6875rem;">Accept</button>
          <button onclick="actionRequest(${teamId}, ${r.request_id}, 'reject')" class="btn-outlined" style="height:30px; padding:0 10px; font-size:0.6875rem;">Decline</button>
        </div>
      </div>
    `).join('');
  } catch(e){
    container.innerHTML = `<div style="font-size:0.75rem; color:#B3261E; font-weight:800;">Error loading requests</div>`;
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
      btn.innerHTML = `<span>Send Join Request</span> ${getIconSvg('send')}`;
      btn.disabled = false;
    }
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
