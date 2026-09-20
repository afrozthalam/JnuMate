# -*- coding: utf-8 -*-
import os
import sys

new_block = r'''window.__currentTeamTab = window.__currentTeamTab || 'team';
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
    if (subTab === 'details') {
      otherPane.innerHTML = `
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:16px; margin-top:10px;">
          <h3 style="font-size:1rem; font-weight:750; color:#0F172A; margin:0 0 8px 0;">About ${escapeHtml(cached.name || 'Squad')}</h3>
          <p style="font-size:0.85rem; color:#475569; line-height:1.5; margin:0 0 14px 0;">${escapeHtml(cached.description || 'University-wide hackathon challenge.')}</p>
          <div style="font-size:0.82rem; font-weight:750; color:#166534; margin-bottom:4px;">Capture The Flag (CTF) Cyber Challenge 2026</div>
          <div style="font-size:0.75rem; color:#64748B; line-height:1.4;">Official competition track &bull; Cybersecurity defense, exploitation, and smart meter anomaly detection.</div>
        </div>
      `;
    } else if (subTab === 'submissions') {
      otherPane.innerHTML = `
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:24px 16px; margin-top:10px; text-align:center;">
          <div style="font-size:1.8rem; margin-bottom:6px;">🚀</div>
          <div style="font-weight:750; font-size:0.92rem; color:#0F172A;">Round 1 Submission Pending</div>
          <p style="font-size:0.8rem; color:#64748B; margin:6px 0 0 0;">Project submissions will open on February 15, 2026.</p>
        </div>
      `;
    } else if (subTab === 'resources') {
      otherPane.innerHTML = `
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:16px; margin-top:10px;">
          <div style="font-weight:750; font-size:0.92rem; color:#0F172A; margin-bottom:10px;">Squad Resources</div>
          <a href="/static/img/redesign/team_smart_meter_banner.png" target="_blank" style="display:flex; align-items:center; gap:10px; padding:10px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; text-decoration:none; color:#0F172A; font-size:0.82rem; margin-bottom:8px;">
            <span>📄</span>
            <span style="flex:1; font-weight:600;">System Architecture Diagram</span>
            <span style="color:#166534; font-weight:700;">View</span>
          </a>
        </div>
      `;
    }
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
  const menu = document.createElement("div");
  menu.id = "teamMobileOptionsMenu";
  menu.className = "team-mobile-options-dropdown";
  menu.innerHTML = `
    <button onclick="document.getElementById('teamMobileOptionsMenu')?.remove(); openEditTeamModal('${teamId}', '${escapeAttr(teamName)}', '', '')" class="team-opt-item">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      <span>Edit Squad Details</span>
    </button>
    <button onclick="document.getElementById('teamMobileOptionsMenu')?.remove(); openSlotStudentSearchModalForTeam('${teamId}', 6)" class="team-opt-item">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
      <span>Invite New Member</span>
    </button>
    <button onclick="document.getElementById('teamMobileOptionsMenu')?.remove(); handleShareTeam('${teamId}')" class="team-opt-item">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
      <span>Share Squad Link</span>
    </button>
    <div class="team-opt-divider"></div>
    <button onclick="document.getElementById('teamMobileOptionsMenu')?.remove(); confirmLeaveTeam('${teamId}')" class="team-opt-item danger">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      <span>Leave Squad</span>
    </button>
  `;
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
  const hasPendingRequest = Boolean(team.user_status === 'pending' || team.has_requested);
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
      <div class="team-mob-invite-slot-card" onclick="openSlotStudentSearchModalForTeam('${team.id}', 6)">
        <div class="team-mob-invite-plus">+ Invite Member</div>
        <div class="team-mob-invite-sub">${openSlots} spot${openSlots > 1 ? 's' : ''} remaining in this squad</div>
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
              <button type="button" onclick="handleTeamVoiceCall('${team.id}')" class="team-mob-call-btn" aria-label="Voice call">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </button>
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
          <form id="mobileTeamChatForm" onsubmit="handleSendTeamChatMessage(event, '${team.id}')" class="team-mob-chat-composer">
            <button type="button" onclick="handleChatAttachmentClick('${team.id}')" class="team-mob-attach-btn" aria-label="Attach file" title="Attach file">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            </button>
            <input type="text" id="mobileTeamChatInput" placeholder="Type a message..." maxlength="1500" autocomplete="off" class="team-mob-chat-input">
            <button type="submit" id="mobileTeamChatSendBtn" class="team-mob-send-btn" aria-label="Send message" title="Send message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
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
              <!-- Smart Meter Circuit Hero Banner -->
              <div class="team-mob-banner-wrap">
                <img src="/static/img/redesign/team_smart_meter_banner.png" alt="${escapeHtml(team.name)}" class="team-mob-banner-img">
                <button type="button" onclick="handleShareTeam('${team.id}')" class="team-mob-banner-share-btn" aria-label="Share Squad" title="Share Squad">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                </button>
              </div>

              <!-- Badges Row -->
              <div class="team-mob-badges-row">
                <span class="team-mob-track-pill">${isSih ? 'SIH HACKATHON' : 'CTF HACKATHON'}</span>
                <span class="team-mob-status-pill"><span class="team-mob-status-dot"></span> Active</span>
              </div>

              <!-- Title & Description -->
              <h1 class="team-mob-title">${escapeHtml(team.name)}</h1>
              <p class="team-mob-desc">${escapeHtml(team.description || 'Developing an AI-powered smart electric meter reading and anomaly detection system for university campus energy optimization.')}</p>

              <!-- Meta Row -->
              <div class="team-mob-meta-row">
                <div class="team-mob-meta-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <span>Started 12 Jan 2026</span>
                </div>
                <div class="team-mob-meta-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  <span>${count} / 6 Members</span>
                </div>
              </div>

              <!-- 4 Action Cards Grid -->
              <div class="team-mob-action-grid">
                <button type="button" onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="team-mob-action-card">
                  <div class="team-mob-action-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </div>
                  <span class="team-mob-action-label">Edit</span>
                </button>
                <button type="button" onclick="openSlotStudentSearchModalForTeam('${team.id}', 6)" class="team-mob-action-card">
                  <div class="team-mob-action-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                  </div>
                  <span class="team-mob-action-label">Invite</span>
                </button>
                <button type="button" onclick="confirmLeaveTeam('${team.id}')" class="team-mob-action-card leave">
                  <div class="team-mob-action-icon leave">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  </div>
                  <span class="team-mob-action-label leave">Leave</span>
                </button>
                <button type="button" onclick="switchTeamSubView('chat', '${team.id}')" class="team-mob-action-card chat">
                  <div class="team-mob-action-icon chat">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <span class="team-mob-action-label chat">Team Chat</span>
                </button>
              </div>

              <!-- Mobile Tabs Bar -->
              <div class="team-mob-tabs-bar">
                <button type="button" class="team-mob-tab-btn ${window.__currentMobileSubTab === 'members' ? 'active' : ''}" onclick="switchMobileSubTab('members', '${team.id}')">Members</button>
                <button type="button" class="team-mob-tab-btn ${window.__currentMobileSubTab === 'details' ? 'active' : ''}" onclick="switchMobileSubTab('details', '${team.id}')">Details</button>
                <button type="button" class="team-mob-tab-btn ${window.__currentMobileSubTab === 'submissions' ? 'active' : ''}" onclick="switchMobileSubTab('submissions', '${team.id}')">Submissions</button>
                <button type="button" class="team-mob-tab-btn ${window.__currentMobileSubTab === 'resources' ? 'active' : ''}" onclick="switchMobileSubTab('resources', '${team.id}')">Resources</button>
              </div>

              <!-- Members Section Header -->
              <div class="team-mob-members-header" style="${window.__currentMobileSubTab === 'members' ? '' : 'display:none;'}">
                <h2 class="team-mob-members-title">Team Members (${count}/6)</h2>
                ${openSlots > 0 ? `
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
        <header class="team-top-navbar">
          <div class="team-top-navbar-inner">
            <a href="/" onclick="event.preventDefault(); closeTeamDetailModal();" class="team-brand-lockup">
              <img src="/static/img/jnu_logo.png" alt="JNU Crest" class="team-crest-img">
              <div class="team-brand-text">
                <span class="team-brand-name">JnuMate<span class="team-brand-dot">.</span></span>
                <span class="team-brand-sub">JAIPUR NATIONAL UNIVERSITY</span>
              </div>
            </a>

            <nav class="team-nav-links">
              <a href="/" onclick="event.preventDefault(); closeTeamDetailModal();" class="team-nav-item">Home</a>
              <a href="javascript:void(0)" class="team-nav-item active">Events</a>
              <a href="javascript:void(0)" onclick="showToast('Resources section available on home dashboard', 'info')" class="team-nav-item">Resources</a>
            </nav>

            <div class="team-nav-right">
              <button onclick="toggleNotificationsPanel()" class="team-notif-btn" aria-label="Notifications" title="Notifications">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <span id="desktopTopNotifBadge" class="notif-badge" style="display:none;">0</span>
              </button>

              ${currentUser ? `
                <div class="team-user-dropdown-wrap">
                  <button type="button" onclick="toggleTeamUserDropdown(event)" class="team-user-pill" id="teamUserDropdownBtn" aria-expanded="false" aria-label="User menu">
                    <img src="${escapeHtml(navAvatar)}" alt="${escapeHtml(navUserName)}" class="team-user-avatar" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
                    <span class="team-user-name">${escapeHtml(navUserName.toUpperCase())}</span>
                    <svg class="team-user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                  <div class="team-user-dropdown-menu" id="teamUserDropdownMenu" style="display:none;">
                    <div class="team-user-dropdown-header">
                      <span class="team-user-dropdown-name">${escapeHtml(navUserName)}</span>
                      <span class="team-user-dropdown-rid">@${escapeHtml(currentUser.id || '')}</span>
                    </div>
                    <div class="team-user-dropdown-divider"></div>
                    <a href="/profile" onclick="closeTeamDetailModal(false); navigateTo('/profile');" class="team-user-dropdown-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      <span>My Profile</span>
                    </a>
                    <a href="javascript:void(0)" onclick="closeTeamDetailModal(false); navigateTo('/directory');" class="team-user-dropdown-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      <span>Student Directory</span>
                    </a>
                    <div class="team-user-dropdown-divider"></div>
                    <button type="button" onclick="handleLogout()" class="team-user-dropdown-item danger">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ` : `
                <a href="/login" class="btn-agro-yellow-pill" style="padding:7px 18px; font-size:0.85rem;">Sign In</a>
              `}
            </div>
          </div>
        </header>

        <main class="team-content-container">
          <!-- Breadcrumb & Status Row -->
          <div class="team-breadcrumb-row">
            <button onclick="closeTeamDetailModal()" class="team-back-btn" aria-label="Back to Squads">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back to Squads</span>
            </button>

            <div class="team-status-pill ${isFull ? 'full' : 'open'}">
              <span class="team-status-dot"></span>
              <span>${isFull ? 'Squad Roster Full' : 'Open for Join Requests'}</span>
            </div>
          </div>

          <!-- Squad Hero Card -->
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

          <!-- Desktop Navigation Tabs Row -->
          <div class="team-tabs-bar">
            <button class="team-tab-btn ${activeTab === 'team' ? 'active' : ''}" data-tab="team" onclick="switchTeamTab('team', '${team.id}')">Team</button>
            <button class="team-tab-btn ${activeTab === 'about' ? 'active' : ''}" data-tab="about" onclick="switchTeamTab('about', '${team.id}')">About</button>
            <button class="team-tab-btn ${activeTab === 'discussion' ? 'active' : ''}" data-tab="discussion" onclick="switchTeamTab('discussion', '${team.id}')">Discussion</button>
          </div>

          <!-- TAB PANE 1: TEAM -->
          <div id="pane-team" class="team-tab-pane ${activeTab === 'team' ? 'active' : ''}">
            <div class="team-two-col-grid">
              
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

              <!-- Right Column: Sidebar Cards -->
              <div class="team-sidebar-stack">
                ${hasPendingRequest ? `
                  <div class="team-side-card" style="border: 1.5px solid #16A34A; background: #F0FDF4;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: #16A34A; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">✓</div>
                      <div>
                        <div style="font-weight: 800; font-size: 0.95rem; color: #166534;">Join Request Sent</div>
                        <div style="font-size: 0.8125rem; color: #15803D; margin-top: 2px;">The squad leader has been notified. You'll receive a notification upon review.</div>
                      </div>
                    </div>
                  </div>
                ` : (isLeader ? `
                  <div class="team-side-card">
                    <div class="team-side-card-title-row" style="justify-content: space-between;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        <h3 class="team-side-card-title">Join Requests</h3>
                      </div>
                      <span id="pendingReqCountBadge" style="font-size:0.75rem; font-weight:700; color:#166534; background:#DCFCE7; padding:2px 8px; border-radius:9999px;">0 Pending</span>
                    </div>
                    <div id="pendingRequestsContainer" style="margin-top:12px;">
                      ${renderIosSpinner('sm')}
                    </div>
                    <div style="margin-top:16px; padding-top:14px; border-top:1px solid #F1F5F9; display:flex; gap:8px;">
                      <button onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="btn-paper-outline" style="flex:1; justify-content:center; font-size:0.78rem;">Edit Squad</button>
                      <button onclick="confirmDisbandTeam('${team.id}')" class="btn-paper-danger" style="font-size:0.78rem;">Disband</button>
                    </div>
                  </div>
                ` : (isMember ? `
                  <div class="team-side-card" style="background: #F8FAFC;">
                    <div class="team-side-card-title-row">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <h3 class="team-side-card-title">Squad Member</h3>
                    </div>
                    <p class="team-side-card-sub" style="margin-bottom:12px;">You are an active teammate in <strong>${escapeHtml(team.name)}</strong>. Head to the Discussion tab to coordinate strategy with your squad!</p>
                    <div style="display:flex; gap:8px;">
                      <button onclick="switchTeamTab('discussion', '${team.id}')" class="btn-team-send-req" style="flex:1; padding:9px 14px; font-size:0.84rem;">Go to Discussion</button>
                      <button onclick="confirmLeaveTeam('${team.id}')" class="btn-paper-danger" style="font-size:0.78rem;">Leave</button>
                    </div>
                  </div>
                ` : (isFull ? `
                  <div class="team-side-card" style="background: #FEF2F2; border-color: #FECACA;">
                    <div class="team-side-card-title-row">
                      <h3 class="team-side-card-title" style="color: #DC2626;">Squad Roster Full</h3>
                    </div>
                    <p class="team-side-card-sub" style="color: #991B1B; margin-bottom: 0;">All 6 seats in this squad have been confirmed. Explore other squads on the Discover page!</p>
                  </div>
                ` : `
                  <div class="team-side-card" id="joinRequestCardBox">
                    <div class="team-side-card-title-row">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                      <h3 class="team-side-card-title">Request to Join Squad</h3>
                    </div>
                    <p class="team-side-card-sub">Write down your skills or achievements or anything special (optional)</p>
                    <div class="team-textarea-wrapper">
                      <textarea id="joinMessageInput" rows="3" maxlength="300" placeholder="e.g. CTF experience, tools you know, areas of interest..." class="team-join-textarea" oninput="handleJoinMessageInput(this)"></textarea>
                      <span id="joinMessageCounter" class="team-textarea-counter">0/300</span>
                    </div>
                    <button id="btnSendJoinRequest" onclick="submitJoinRequest('${team.id}')" class="btn-team-send-req">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                      <span>Send Join Request</span>
                    </button>
                  </div>
                `)))}

                <!-- Readiness Checklist -->
                <div class="team-side-card">
                  <div class="team-side-card-title-row">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    <h3 class="team-side-card-title">Readiness Checklist</h3>
                  </div>
                  <div class="team-checklist-stack" style="margin-top:14px;">
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
                      ${isLeader ? `
                        <button onclick="openEditTeamModal('${team.id}', '${escapeAttr(team.name)}', '${escapeAttr(team.description || '')}', '${escapeAttr(team.whatsapp_link || '')}')" class="team-checklist-btn">${team.whatsapp_link ? 'Edit Link' : 'Add Link'}</button>
                      ` : (team.whatsapp_link ? `
                        <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="team-checklist-btn" style="text-decoration:none;">Join Chat</a>
                      ` : '')}
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
          </div>

          <!-- TAB PANE 2: ABOUT -->
          <div id="pane-about" class="team-tab-pane ${activeTab === 'about' ? 'active' : ''}">
            <div class="team-about-grid">
              <div class="team-about-card">
                <h3 style="font-size:1.2rem; font-weight:700; color:#0F172A; margin:0 0 12px 0;">About ${escapeHtml(team.name)}</h3>
                <p style="font-size:0.95rem; color:#334155; line-height:1.6; margin-bottom:24px;">${escapeHtml(team.description || 'Looking for teammates for the upcoming university hackathon.')}</p>

                <h4 style="font-size:1rem; font-weight:700; color:#0F172A; margin:0 0 10px 0;">Hackathon Track Details</h4>
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:16px; margin-bottom:24px;">
                  <div style="font-weight:700; color:#166534; margin-bottom:4px;">${isSih ? 'Smart India Hackathon 2026' : 'Capture The Flag (CTF) Cyber Challenge 2026'}</div>
                  <div style="font-size:0.875rem; color:#475569; line-height:1.5;">${isSih ? 'A national challenge focused on innovative software solutions to real-world societal problems.' : 'A university-wide cybersecurity defense & exploitation challenge to learn and compete in team-based CTF rounds.'}</div>
                </div>

                <h4 style="font-size:1rem; font-weight:700; color:#0F172A; margin:0 0 10px 0;">Squad Guidelines & Rules</h4>
                <ul style="font-size:0.875rem; color:#475569; line-height:1.6; padding-left:20px; margin:0 0 20px 0;">
                  <li>All squad members must be officially enrolled students of Jaipur National University.</li>
                  <li>Each student can only belong to one confirmed squad per competition track.</li>
                  ${isSih ? '<li>SIH regulations require at least 1 female teammate in the 6-member squad roster.</li>' : ''}
                  <li>Official announcements and live match coordination happen in the Squad Discussion & WhatsApp group.</li>
                </ul>
              </div>

              <div style="display:flex; flex-direction:column; gap:20px;">
                <div class="team-about-card">
                  <h3 style="font-size:1.05rem; font-weight:700; color:#0F172A; margin:0 0 14px 0;">Squad Leadership</h3>
                  <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                    <img src="${escapeHtml(leaderAvatar)}" alt="Captain" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:1.5px solid #16A34A;" onerror="this.onerror=null; this.src='${DEFAULT_STUDENT_AVATAR}';">
                    <div>
                      <div style="font-weight:750; font-size:0.95rem; color:#0F172A;">${escapeHtml(leaderCleanName)}</div>
                      <div style="font-size:0.78rem; color:#166534; font-weight:600;">Team Captain &bull; @${escapeHtml(team.leader_r_id || '')}</div>
                    </div>
                  </div>
                  ${leaderMember.email ? `
                    <div style="font-size:0.8125rem; color:#64748B; margin-top:8px;">
                      Email: <a href="mailto:${escapeHtml(leaderMember.email)}" style="color:#166534; font-weight:600;">${escapeHtml(leaderMember.email)}</a>
                    </div>
                  ` : ''}
                </div>

                ${team.whatsapp_link ? `
                  <div class="team-about-card" style="background: linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%); border-color: #A7F3D0;">
                    <h3 style="font-size:1.05rem; font-weight:700; color:#065F46; margin:0 0 8px 0;">Official Group Chat</h3>
                    <p style="font-size:0.8125rem; color:#047857; margin-bottom:14px;">Connect with the squad on WhatsApp for quick audio calls and real-time coordination.</p>
                    <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="btn-paper-wa" style="width:100%; box-sizing:border-box; justify-content:center; padding:10px;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/></svg>
                      <span>Open WhatsApp Group</span>
                    </a>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- TAB PANE 3: DISCUSSION (DESKTOP LIVE CHAT) -->
          <div id="pane-discussion" class="team-tab-pane ${activeTab === 'discussion' ? 'active' : ''}">
            <div class="team-discussion-container">
              <div class="team-discussion-header">
                <div>
                  <div class="team-discussion-title-box">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <h3 class="team-discussion-title">Squad Live Discussion</h3>
                    <span class="team-live-pill"><span class="team-live-dot"></span> Live</span>
                  </div>
                  <div style="font-size:0.8125rem; color:#64748B; margin-top:3px;">Real-time communication for verified squad members & captain</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <button type="button" onclick="handleTeamVoiceCall('${team.id}')" class="btn-paper-outline" style="padding:6px 12px; font-size:0.78rem; display:flex; align-items:center; gap:6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <span>Voice Channel</span>
                  </button>
                  ${team.whatsapp_link ? `
                    <a href="${escapeHtml(team.whatsapp_link)}" target="_blank" rel="noopener noreferrer" class="btn-paper-wa" style="padding:6px 12px; font-size:0.78rem;">
                      <span>WhatsApp Group</span>
                    </a>
                  ` : ''}
                </div>
              </div>

              <!-- Messages Stream -->
              <div id="teamChatMessagesList" class="team-discussion-stream">
                <div style="padding:60px 0; text-align:center;">${renderIosSpinner('sm', 'Loading squad discussion...')}</div>
              </div>

              <!-- Sticky Message Composer -->
              <form id="teamChatForm" onsubmit="handleSendTeamChatMessage(event, '${team.id}')" class="team-discussion-composer">
                <button type="button" onclick="handleChatAttachmentClick('${team.id}')" class="team-discussion-attach-btn" aria-label="Attach file" title="Attach file">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </button>
                <input type="text" id="teamChatInput" placeholder="Message your squad... (Press Enter to send)" maxlength="1500" autocomplete="off" class="team-discussion-input">
                <button type="submit" id="teamChatSendBtn" class="team-discussion-send-btn" aria-label="Send message" title="Send message">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
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

  // Always initiate chat loading and polling so conversation is live and snappy
  startTeamChatPolling(team.id);
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
  const containers = [desktopContainer, mobileContainer].filter(Boolean);
  if (containers.length === 0) return;

  if (isInitial) {
    containers.forEach(c => {
      if (!c.querySelector(".chat-msg-row")) {
        c.innerHTML = `<div style="padding:40px 0; text-align:center;">${renderIosSpinner('sm', 'Loading squad discussion...')}</div>`;
      }
    });
  }

  const currentRid = getCurrentUserRid() || "R44456";
  fetch(`/api/teams/${teamId}/messages?r_id=${encodeURIComponent(currentRid)}`)
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
      chatRowsHtml += msgs.map(m => renderChatMessageBubble(m, currentRid, teamId)).join("");

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
          c.innerHTML = `<div class="team-chat-error-hint">Discussion is restricted to active squad members.</div>`;
        });
      }
    });
}

function handleSendTeamChatMessage(e, teamId) {
  if (e) e.preventDefault();
  const mobileInput = document.getElementById("mobileTeamChatInput");
  const desktopInput = document.getElementById("teamChatInput");
  const text = (mobileInput && mobileInput.value ? mobileInput.value : (desktopInput ? desktopInput.value : "")).trim();
  if (!text) return;

  // Clear inputs immediately for instant 0ms response
  if (mobileInput) mobileInput.value = "";
  if (desktopInput) desktopInput.value = "";

  const currentRid = getCurrentUserRid() || "R44456";

  // Optimistic UI render
  const containers = [
    document.getElementById("teamChatMessagesList"),
    document.getElementById("mobileTeamChatMessagesList")
  ].filter(Boolean);

  const nowTime = new Date().toTimeString().substring(0, 5);
  const tempMsg = {
    id: 'temp_' + Date.now(),
    team_id: teamId,
    sender_r_id: currentRid,
    sender_name: currentUser ? (currentUser.name || currentUser.id) : "You",
    sender_avatar: currentUser ? currentUser.avatar_url : DEFAULT_STUDENT_AVATAR,
    message: text,
    reactions: {},
    created_at: nowTime,
    is_active_member: true
  };

  containers.forEach(container => {
    const emptyHint = container.querySelector(".team-chat-empty-hint");
    if (emptyHint) emptyHint.remove();

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = renderChatMessageBubble(tempMsg, currentRid, teamId);
    if (tempDiv.firstElementChild) {
      container.appendChild(tempDiv.firstElementChild);
      container.scrollTop = container.scrollHeight;
    }
  });

  fetch(`/api/teams/${teamId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      r_id: currentRid,
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
'''

with open('static/js/app.js', 'r', encoding='utf-8') as f:
    orig = f.read()

start_marker = "window.__currentTeamTab = window.__currentTeamTab || 'team';"
end_marker = "window.currentTeamRequests = [];"

start_idx = orig.find(start_marker)
end_idx = orig.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Error: markers not found ({start_idx}, {end_idx})")
    sys.exit(1)

updated = orig[:start_idx] + new_block + "\n\n" + orig[end_idx:]

with open('static/js/app.js', 'w', encoding='utf-8') as f:
    f.write(updated)

print("Successfully replaced team code in app.js!")
