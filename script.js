// 1. FIREBASE CONFIGURATION (Wahi purana configuration)
const firebaseConfig = {
  apiKey: "AIzaSyBSpX_DBpJlvGspjzVhAKOBXV-0376P7Ug",
  authDomain: "studyroom-20729.firebaseapp.com",
  projectId: "studyroom-20729",
  storageBucket: "studyroom-20729.firebasestorage.app",
  messagingSenderId: "772929165730",
  appId: "1:772929165730:web:866576fe222456c61fbafb"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// GLOBALS
let currentRoomId = null, currentRoomName = null, currentRoomCreator = null, currentRoomAdmins = [];
let currentRoomAdminOnlyMCQ = false, currentRoomIsPublic = false, editingQuestionId = null;
let openAuthorFolders = [], openTopicFolders = [], allCurrentQuestions = [];
let wrongQuestions = JSON.parse(localStorage.getItem('studyRoomWrong')) || [];
let correctQuestions = JSON.parse(localStorage.getItem('studyRoomCorrect')) || []; // 🌟 NEW: Solved Archive
let allPublicRooms = []; 
let selectedQuestionIds = []; // 🌟 NEW: For Bulk Selection

updateRevisionCount(); checkDailyStreak(); 

// -------------------------------
// 🔥 DAILY STREAK
// -------------------------------
function checkDailyStreak() {
  const t = new Date().toDateString(); let s = JSON.parse(localStorage.getItem('studyRoomStreak')) || { date: '', count: 0, streak: 0 };
  if (s.date !== t) {
    let y = new Date(); y.setDate(y.getDate() - 1);
    if (s.date === y.toDateString() && s.count >= 10) {} else if (s.date !== y.toDateString()) { s.streak = 0; }
    s.date = t; s.count = 0; localStorage.setItem('studyRoomStreak', JSON.stringify(s));
  } updateStreakUI();
}
function updateStreakUI() {
  let s = JSON.parse(localStorage.getItem('studyRoomStreak')) || { count: 0, streak: 0 };
  let e1=document.getElementById('streakCount'); if(e1) e1.innerText = s.streak + " Days";
  let e2=document.getElementById('dailyQuestionsDone'); if(e2) e2.innerText = Math.min(s.count, 10);
  let e3=document.getElementById('dailyProgressBar'); if(e3) e3.style.width = Math.min((s.count/10)*100, 100) + "%";
}
function recordQuestionAttempt() {
  const t = new Date().toDateString(); let s = JSON.parse(localStorage.getItem('studyRoomStreak'));
  if(s.date !== t) checkDailyStreak();
  if(s.count < 10) { s.count++; if(s.count === 10) { s.streak++; setTimeout(() => alert("🎉 Daily Goal Completed!"), 500); } localStorage.setItem('studyRoomStreak', JSON.stringify(s)); updateStreakUI(); }
}

// -------------------------------
// 📱 BOTTOM NAV & MODALS
// -------------------------------
function openProfileMenuModal() { document.getElementById('profileSettingsModal').style.display = 'flex'; if(auth.currentUser) db.collection('users').doc(auth.currentUser.uid).get().then(doc => { if(doc.exists) document.getElementById('menuWelcomeText').innerText = "Hi, " + doc.data().displayName + "!"; }); }
function closeProfileMenuModal(e) { if(e && e.target.classList.contains('profile-menu-sheet')) return; let m = document.getElementById('profileSettingsModal'); if(m) m.style.display = 'none'; }
function updateBottomNav(activeId) {
  const nav = document.getElementById('bottomNavBar'); if(!auth.currentUser || (window.location.hash === '#room' && currentRoomId)) { if(nav) nav.style.display = 'none'; return; }
  if(nav) nav.style.display = 'flex'; ['navHome','navDiscover','navRevision','navProfile'].forEach(id => { let el = document.getElementById(id); if(el) el.classList.remove('active'); });
  if(activeId) { let el = document.getElementById(activeId); if(el) el.classList.add('active'); }
}

function openRoomMenuModal() { document.getElementById('roomMenuModal').style.display = 'flex'; }
function closeRoomMenuModal(e) { if(e && e.target.classList.contains('profile-menu-sheet')) return; let m = document.getElementById('roomMenuModal'); if(m) m.style.display = 'none'; }
function openAddMcqChoiceModal() { document.getElementById('addMcqChoiceModal').style.display = 'flex'; }
function closeAddMcqChoiceModal(e) { if(e && e.target.classList.contains('profile-menu-sheet')) return; let m = document.getElementById('addMcqChoiceModal'); if(m) m.style.display = 'none'; }
function openMembersModal() { closeRoomMenuModal(); document.getElementById('membersModal').style.display = 'flex'; }
function closeMembersModal() { document.getElementById('membersModal').style.display = 'none'; }
function openEditRoomBox() { closeRoomMenuModal(); document.getElementById('editRoomBox').style.display = 'flex'; document.getElementById('editRoomNameInput').value = currentRoomName; document.getElementById('editRoomAdminOnlyToggle').checked = currentRoomAdminOnlyMCQ; let p = document.getElementById('editRoomPublicToggle'); if(p) p.checked = currentRoomIsPublic; }
function closeEditRoomBox() { document.getElementById('editRoomBox').style.display = 'none'; }

function openManualAddBox() { closeAddMcqChoiceModal(); editingQuestionId = null; document.getElementById('addQuestionBoxTitle').innerText = "✍️ New Question"; document.getElementById('addMoreBtnContainer').style.display = 'flex'; document.getElementById('updateQuestionBtn').style.display = 'none'; ['queTopic','queText','optA','optB','optC','optD','correctOpt','queTime'].forEach(id => document.getElementById(id).value = ''); document.getElementById('addQuestionBox').style.display = 'flex'; }
function closeManualAddBox(e) { if(e && e.target.classList.contains('profile-menu-sheet')) return; let m=document.getElementById('addQuestionBox'); if(m) m.style.display = 'none'; }
function openCsvUploadBox() { closeAddMcqChoiceModal(); document.getElementById('csvUploadBox').style.display = 'flex'; }
function closeCsvUploadBox(e) { if(e && e.target.classList.contains('profile-menu-sheet')) return; let m=document.getElementById('csvUploadBox'); if(m) m.style.display = 'none'; }

// 🌟 LONG PRESS LOGIC
let lpTimer, activeQId = null;
function startLongPress(qId) { activeQId = qId; lpTimer = setTimeout(() => { if (navigator.vibrate) navigator.vibrate(100); editingQuestionId = qId; document.getElementById('questionActionModal').style.display = 'flex'; }, 600); }
function cancelLongPress() { clearTimeout(lpTimer); }
function closeQuestionActionBox(e) { if(e && e.target.classList.contains('profile-menu-sheet')) return; let m = document.getElementById('questionActionModal'); if(m) m.style.display = 'none'; }
function editLongPressedQuestion() { closeQuestionActionBox(); editQuestion(editingQuestionId); }
function deleteLongPressedQuestion() { closeQuestionActionBox(); deleteQuestion(editingQuestionId); }

if(localStorage.getItem('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
function toggleDarkMode() { closeProfileMenuModal(); if(document.documentElement.getAttribute('data-theme') === 'dark') { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); } else { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); } }

// 🌟 SMART ROUTING (Added Solved Screen)
function hideAllScreens() { ['authBox','dashboardScreen','discoverScreen','revisionScreen','profileScreen','roomViewScreen','solvedQuestionsScreen'].forEach(id => { let el = document.getElementById(id); if(el) el.style.display = 'none'; }); closeProfileMenuModal(); closeRoomMenuModal(); closeAddMcqChoiceModal(); clearSelection(); }
window.addEventListener('hashchange', handleHashChange);
function handleHashChange() {
  const hash = window.location.hash; hideAllScreens();
  if (hash.startsWith('#join=')) { const joinId = hash.split('=')[1]; if (auth.currentUser) { document.getElementById('joinRoomIdInput').value = joinId; joinRoomByFirebase(); } else { alert("Login to join."); localStorage.setItem('pendingJoin', joinId); document.getElementById('authBox').style.display = 'block'; updateBottomNav(); } return; }
  if (!auth.currentUser) { document.getElementById('authBox').style.display = 'block'; updateBottomNav(); return; }
  if (hash === '#dashboard' || hash === '') { document.getElementById('dashboardScreen').style.display = 'block'; loadMyRooms(); checkDailyStreak(); updateBottomNav('navHome'); } 
  else if (hash === '#discover') { document.getElementById('discoverScreen').style.display = 'block'; loadDiscoverRooms(); updateBottomNav('navDiscover'); } 
  else if (hash === '#revision') { document.getElementById('revisionScreen').style.display = 'block'; renderRevisionBox(); updateBottomNav('navRevision'); } 
  else if (hash === '#solved') { document.getElementById('solvedQuestionsScreen').style.display = 'block'; renderSolvedQuestions(); updateBottomNav(); } // 🌟 NEW 
  else if (hash === '#profile') { document.getElementById('profileScreen').style.display = 'block'; updateBottomNav('navProfile'); } 
  else if (hash === '#room' && currentRoomId) { document.getElementById('roomViewScreen').style.display = 'block'; updateBottomNav(); } else { window.location.hash = '#dashboard'; }
}
auth.onAuthStateChanged((user) => { if (user) { db.collection('users').doc(user.uid).get().then(() => { let p = localStorage.getItem('pendingJoin'); if (p) { localStorage.removeItem('pendingJoin'); document.getElementById('joinRoomIdInput').value = p; joinRoomByFirebase(); } else { handleHashChange(); } }); } else { window.location.hash = ''; handleHashChange(); } });

// AUTH, LEADERBOARD, DISCOVER, CREATE ROOM (Kept Same for brevity)
function openLeaderboard() { let m = document.getElementById('leaderboardModal'), c = document.getElementById('leaderboardList'); if(!m || !c) return; m.style.display = 'flex'; c.innerHTML = "Loading..."; db.collection('rooms').doc(currentRoomId).collection('leaderboard').orderBy('score', 'desc').limit(10).get().then(snap => { if(snap.empty) { c.innerHTML = "No scores yet."; return; } let html = '', rank = 1; snap.forEach(doc => { let d = doc.data(), medal = rank===1?'🥇':(rank===2?'🥈':(rank===3?'🥉':'🏅')); html += `<div style="display:flex; justify-content:space-between; padding:10px 5px; border-bottom:1px solid var(--border-color);"><span>${medal} <b>${d.name||'User'}</b></span><span style="color:#28a745; font-weight:bold;">${d.score||0} pts</span></div>`; rank++; }); c.innerHTML = html; }).catch(e => { c.innerHTML = `❌ Error`; }); }
function closeLeaderboard(e) { if(e && e.target.classList.contains('profile-menu-sheet')) return; let m=document.getElementById('leaderboardModal'); if(m) m.style.display='none'; }
function updateLeaderboardScore() { if(!auth.currentUser || !currentRoomId) return; db.collection('users').doc(auth.currentUser.uid).get().then(doc => { db.collection('rooms').doc(currentRoomId).collection('leaderboard').doc(auth.currentUser.uid).set({ name: doc.data().displayName||"Unknown", score: firebase.firestore.FieldValue.increment(1) }, { merge: true }); }); }
function openShareModal() { document.getElementById('shareLinkInput').value = window.location.origin + window.location.pathname + '#join=' + currentRoomId; document.getElementById('shareModal').style.display = 'flex'; }
function closeShareModal(e) { if(e && e.target.classList.contains('profile-menu-sheet')) return; let m=document.getElementById('shareModal'); if(m) m.style.display = 'none'; }
function copyInviteLink() { navigator.clipboard.writeText(document.getElementById('shareLinkInput').value).then(() => alert("🔗 Copied!")); }
function shareViaWhatsApp() { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my Study Room! 📚\nClick here: ${document.getElementById('shareLinkInput').value}`)}`, '_blank'); }

function toggleAuth(type) { document.getElementById('loginForm').style.display = type === 'login' ? 'block' : 'none'; document.getElementById('signupForm').style.display = type === 'signup' ? 'block' : 'none'; }
function signupUser() { const n=document.getElementById('signupName').value.trim(), e=document.getElementById('signupEmail').value.trim(), p=document.getElementById('signupPassword').value.trim(); if(!n||!e||!p) return alert("Fill fields"); auth.createUserWithEmailAndPassword(e, p).then(c => db.collection('users').doc(c.user.uid).set({ displayName: n, email: e, username: "", mobile: "", bio: "" })).then(() => { alert("Created!"); toggleAuth('login'); }).catch(e => alert(e.message)); }
function loginUser() { auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value.trim(), document.getElementById('loginPassword').value.trim()).catch(e => alert(e.message)); }
function forgotPassword() { const e=document.getElementById('loginEmail').value.trim(); if(!e) return alert("Enter email!"); auth.sendPasswordResetEmail(e).then(() => alert("Sent!")).catch(e => alert(e.message)); }
function logoutUser() { auth.signOut().then(() => { window.location.hash=''; window.location.reload(); }); }
function openProfileScreen() { closeProfileMenuModal(); db.collection('users').doc(auth.currentUser.uid).get().then(doc => { if(doc.exists) { let d=doc.data(); document.getElementById('profileName').value=d.displayName||""; document.getElementById('profileUsername').value=d.username||""; document.getElementById('profileMobile').value=d.mobile||""; document.getElementById('profileBio').value=d.bio||""; window.location.hash='#profile'; } }); }
function saveProfileData() { const n=document.getElementById('profileName').value.trim(); if(!n) return alert("Name required!"); db.collection('users').doc(auth.currentUser.uid).update({ displayName: n, username: document.getElementById('profileUsername').value.trim(), mobile: document.getElementById('profileMobile').value.trim(), bio: document.getElementById('profileBio').value.trim() }).then(() => { alert("Updated!"); window.location.hash='#dashboard'; }); }
function viewUserProfile(uid) { db.collection('users').doc(uid).get().then(doc => { if(doc.exists) { document.getElementById('viewProfileName').innerText=doc.data().displayName||"Unknown"; document.getElementById('viewProfileUsername').innerText=doc.data().username||""; document.getElementById('viewProfileBio').innerText=doc.data().bio||""; document.getElementById('viewProfileModal').style.display='flex'; } }); }
function closeViewProfile() { document.getElementById('viewProfileModal').style.display='none'; }
function openDiscoverRooms() { window.location.hash = '#discover'; }
function loadDiscoverRooms() { const c = document.getElementById('publicRoomsListContainer'); if(!c) return; c.innerHTML = 'Loading...'; db.collection('rooms').where('isPublic', '==', true).get().then(snap => { allPublicRooms = []; if(snap.empty) { c.innerHTML = '<p>No public rooms.</p>'; return; } let html = ''; snap.forEach(doc => { let r=doc.data(); r.id=doc.id; allPublicRooms.push(r); let im = r.members && auth.currentUser && r.members.includes(auth.currentUser.uid); let btn = im ? `<button class="btn" style="width:auto; padding:5px 10px; background:#6c757d; font-size:11px;" disabled>Joined</button>` : `<button class="btn" style="width:auto; padding:5px 10px; background:#28a745; font-size:11px;" onclick="joinSpecificRoom('${r.id}')">Join</button>`; html += `<div id="pub-room-${r.id}" style="display:flex; justify-content:space-between; align-items:center; padding:15px; border:1px solid var(--border-color); border-radius:8px; margin-bottom:10px; background:var(--card-bg);"><div><b style="color:var(--primary-btn); font-size:16px;">${r.roomName||'Room'}</b><br><span style="font-size:11px; color:var(--text-color);">By: ${r.creatorName||'Admin'} | 👥 ${r.members?r.members.length:1} Members</span></div>${btn}</div>`; }); c.innerHTML = html; }).catch(e => { c.innerHTML = `❌ Error`; }); }
function filterPublicRooms() { const q = document.getElementById('searchPublicRoom').value.toLowerCase(); allPublicRooms.forEach(r => { let c = document.getElementById(`pub-room-${r.id}`); if(c) c.style.display = (r.roomName && r.roomName.toLowerCase().includes(q)) ? "flex" : "none"; }); }

function openCreateRoom() { document.getElementById('createRoomBox').style.display = 'block'; document.getElementById('joinRoomBox').style.display = 'none'; }
function closeCreateRoom() { document.getElementById('createRoomBox').style.display = 'none'; }
function openJoinRoom() { document.getElementById('joinRoomBox').style.display = 'block'; document.getElementById('createRoomBox').style.display = 'none'; }
function closeJoinRoom() { document.getElementById('joinRoomBox').style.display = 'none'; }
function backToDashboard() { window.location.hash = '#dashboard'; }
function copyRoomId() { closeRoomMenuModal(); navigator.clipboard.writeText(currentRoomId).then(() => alert("ID Copied!")); }

function saveRoomToFirebase() { const n = document.getElementById('newRoomName').value.trim(), t = document.getElementById('isRoomPublicToggle'), p = t ? t.checked : false; if(!n) return alert("Enter Name!"); db.collection('users').doc(auth.currentUser.uid).get().then(doc => { db.collection('rooms').add({ roomName: n, creatorId: auth.currentUser.uid, creatorName: doc.data().displayName, admins: [auth.currentUser.uid], members: [auth.currentUser.uid], adminOnlyMCQ: false, isPublic: p, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { alert("Created!"); closeCreateRoom(); loadMyRooms(); }); }); }
function joinRoomByFirebase() { const id = document.getElementById('joinRoomIdInput').value.trim(); if(!id) return alert("Enter ID!"); db.collection('rooms').doc(id).get().then(doc => { if(doc.exists) { db.collection('rooms').doc(id).update({ members: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid) }); closeJoinRoom(); enterRoom(doc.id, doc.data().roomName); } else { alert("Invalid ID!"); window.location.hash = '#dashboard'; } }); }
function joinSpecificRoom(id) { document.getElementById('joinRoomIdInput').value = id; joinRoomByFirebase(); }
function loadMyRooms() { const c = document.getElementById('roomsListContainer'); c.innerHTML = 'Loading...'; db.collection('rooms').where("members", "array-contains", auth.currentUser.uid).get().then(snap => { if(snap.empty) { c.innerHTML = '<p style="font-size:13px;">No rooms found.</p>'; return; } let html = ''; snap.forEach(doc => { let p = doc.data().isPublic ? '<span style="color:#17a2b8; font-size:10px;">🌍 Public</span>' : '<span style="color:#6c757d; font-size:10px;">🔒 Private</span>'; html += `<div class="q-card" style="display:flex; justify-content:space-between; align-items:center;"><div><b style="font-size:16px;">${doc.data().roomName}</b><br>${p}</div><button class="btn" style="width:auto; padding:6px 12px; margin:0;" onclick="enterRoom('${doc.id}', '${doc.data().roomName}')">Enter</button></div>`; }); c.innerHTML = html; }); }

function enterRoom(id, name) {
  currentRoomId = id; currentRoomName = name; document.getElementById('roomTitleText').innerText = name; document.getElementById('searchQuestion').value = ''; closeRoomMenuModal(); closeAddMcqChoiceModal(); clearSelection(); openAuthorFolders = []; openTopicFolders = [];
  db.collection('rooms').doc(id).get().then(doc => {
    if(doc.exists) {
      currentRoomCreator = doc.data().creatorId; currentRoomAdmins = doc.data().admins || [currentRoomCreator]; currentRoomAdminOnlyMCQ = doc.data().adminOnlyMCQ || false; currentRoomIsPublic = doc.data().isPublic || false; const im = currentRoomAdmins.includes(auth.currentUser.uid);
      let eb = document.getElementById('editRoomMenuBtn'); if(eb) eb.style.display = im ? 'block' : 'none';
      let dbBtn = document.getElementById('deleteRoomMenuBtn'); if(dbBtn) dbBtn.style.display = (auth.currentUser.uid === currentRoomCreator) ? 'block' : 'none';
      let ab = document.getElementById('addMcqMainBtn'); if(ab) ab.style.display = (currentRoomAdminOnlyMCQ && !im) ? 'none' : 'block';
      loadRoomMembers(); loadRoomQuestions(); window.location.hash = '#room';
    }
  });
}
function leaveRoom() { if(confirm("Leave room?")) db.collection('rooms').doc(currentRoomId).update({ members: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid), admins: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid) }).then(() => backToDashboard()); }
function deleteRoom() { if(confirm("Delete permanently?")) db.collection('rooms').doc(currentRoomId).delete().then(() => backToDashboard()); }
function saveRoomEdit() { let n = document.getElementById('editRoomNameInput').value.trim(), a = document.getElementById('editRoomAdminOnlyToggle').checked, p = document.getElementById('editRoomPublicToggle').checked; if(!n) return alert("Enter valid name"); db.collection('rooms').doc(currentRoomId).update({ roomName: n, adminOnlyMCQ: a, isPublic: p }).then(() => { alert("Updated!"); currentRoomName=n; currentRoomAdminOnlyMCQ=a; currentRoomIsPublic=p; document.getElementById('roomTitleText').innerText=n; closeEditRoomBox(); let ab=document.getElementById('addMcqMainBtn'); if(ab) ab.style.display=(a && !currentRoomAdmins.includes(auth.currentUser.uid))?'none':'block'; }); }
function loadRoomMembers() { const c = document.getElementById('membersListContainer'); if(!c) return; c.innerHTML = 'Loading...'; db.collection('rooms').doc(currentRoomId).get().then(doc => { if(!doc.exists) return; const m = doc.data().members || []; currentRoomAdmins = doc.data().admins || [doc.data().creatorId]; const imc = (auth.currentUser.uid === doc.data().creatorId); if(m.length === 0) { c.innerHTML = "No members"; return; } Promise.all(m.map(uid => db.collection('users').doc(uid).get().catch(e => null))).then(docs => { let html = ''; docs.forEach((d, i) => { if(!d) return; const uid=m[i], n=d.exists?d.data().displayName:"Unknown", ima=currentRoomAdmins.includes(uid); let b=""; if (uid !== auth.currentUser.uid) { if (imc) { b += ima ? `<button onclick="removeAdminRole('${uid}')" style="background:#ffc107; border:none; padding:3px 8px; font-size:11px;">Remove Admin</button> ` : `<button onclick="makeAdmin('${uid}')" style="background:#28a745; color:white; border:none; padding:3px 8px; font-size:11px;">Make Admin</button> `; b += `<button onclick="removeMember('${uid}')" style="background:#dc3545; color:white; border:none; padding:3px 8px; font-size:11px;">Kick</button>`; } else if (currentRoomAdmins.includes(auth.currentUser.uid) && !ima) { b += `<button onclick="removeMember('${uid}')" style="background:#dc3545; color:white; border:none; padding:3px 8px; font-size:11px;">Kick</button>`; } } let r = (uid === doc.data().creatorId) ? '👑' : (ima ? '🛡️' : '👤'); html += `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--border-color);"><span style="color:var(--primary-btn); cursor:pointer;" onclick="viewUserProfile('${uid}')">${r} ${n}</span><div>${b}</div></div>`; }); c.innerHTML = html; }); }); }
function makeAdmin(uid) { if(confirm("Make Admin?")) db.collection('rooms').doc(currentRoomId).update({ admins: firebase.firestore.FieldValue.arrayUnion(uid) }).then(() => loadRoomMembers()); }
function removeAdminRole(uid) { if(confirm("Remove Admin?")) db.collection('rooms').doc(currentRoomId).update({ admins: firebase.firestore.FieldValue.arrayRemove(uid) }).then(() => loadRoomMembers()); }
function removeMember(uid) { if(confirm("Kick member?")) db.collection('rooms').doc(currentRoomId).update({ members: firebase.firestore.FieldValue.arrayRemove(uid), admins: firebase.firestore.FieldValue.arrayRemove(uid) }).then(() => loadRoomMembers()); }

// ---------------------------------
// 🌟 BULK ACTIONS & FLOATING BAR (UPDATE 4.0)
// ---------------------------------
function handleCheckboxChange(cb) {
  if(cb.checked) { if(!selectedQuestionIds.includes(cb.value)) selectedQuestionIds.push(cb.value); } 
  else { selectedQuestionIds = selectedQuestionIds.filter(id => id !== cb.value); }
  updateSelectionBar();
}

function updateSelectionBar() {
  const bar = document.getElementById('selectionActionBar'); const txt = document.getElementById('selectedCountText');
  if(selectedQuestionIds.length > 0) { bar.style.display = 'flex'; txt.innerText = `${selectedQuestionIds.length} Selected`; } 
  else { bar.style.display = 'none'; }
}

function clearSelection() { selectedQuestionIds = []; document.querySelectorAll('.bulk-delete-chk').forEach(c => c.checked = false); updateSelectionBar(); }

function toggleSelectAll() { 
  const isChecked = !document.querySelector('.bulk-delete-chk:not(:checked)'); // Toggle logic
  document.querySelectorAll('.bulk-delete-chk').forEach(c => {
    c.checked = !isChecked; if(!isChecked && !selectedQuestionIds.includes(c.value)) selectedQuestionIds.push(c.value);
    else if(isChecked) selectedQuestionIds = selectedQuestionIds.filter(id => id !== c.value);
  }); updateSelectionBar(); 
}

function deleteSelectedQuestions() {
  if (selectedQuestionIds.length === 0) return;
  if(confirm(`Delete ${selectedQuestionIds.length} questions permanently?`)) { 
      let p = []; selectedQuestionIds.forEach(id => { p.push(db.collection('rooms').doc(currentRoomId).collection('questions').doc(id).delete()); }); 
      Promise.all(p).then(() => { alert("Deleted Successfully!"); clearSelection(); loadRoomQuestions(); }); 
  }
}

function openAssignTopicModal() { document.getElementById('assignTopicModal').style.display = 'flex'; document.getElementById('bulkTopicInput').value = ''; }
function closeAssignTopicModal(e) { if(e && e.target.classList.contains('profile-menu-sheet')) return; document.getElementById('assignTopicModal').style.display = 'none'; }
function assignTopicToSelected() {
  const newTopic = document.getElementById('bulkTopicInput').value.trim(); if(!newTopic) return alert("Enter a valid topic name.");
  let p = []; selectedQuestionIds.forEach(id => { p.push(db.collection('rooms').doc(currentRoomId).collection('questions').doc(id).update({ topic: newTopic })); });
  Promise.all(p).then(() => { alert(`Moved to 📂 ${newTopic}!`); closeAssignTopicModal(); clearSelection(); loadRoomQuestions(); });
}

// ---------------------------------
// 🌟 MCQ LOGIC & CSV
// ---------------------------------
function editQuestion(qId) { db.collection('rooms').doc(currentRoomId).collection('questions').doc(qId).get().then(doc => { let q = doc.data(); document.getElementById('queTopic').value = q.topic||'General'; document.getElementById('queText').value = q.question; document.getElementById('optA').value = q.optionA; document.getElementById('optB').value = q.optionB; document.getElementById('optC').value = q.optionC; document.getElementById('optD').value = q.optionD; document.getElementById('correctOpt').value = q.correct; document.getElementById('queTime').value = q.timeLimit||''; editingQuestionId = qId; document.getElementById('addQuestionBoxTitle').innerText = "✏️ Edit Question"; document.getElementById('addMoreBtnContainer').style.display = 'none'; document.getElementById('updateQuestionBtn').style.display = 'block'; document.getElementById('addQuestionBox').style.display = 'flex'; }); }
function deleteQuestion(qId) { if(confirm("Delete question?")) db.collection('rooms').doc(currentRoomId).collection('questions').doc(qId).delete().then(() => { alert("Deleted!"); loadRoomQuestions(); }); }

function saveQuestionToFirebase(isAddNext) {
  const qData = { topic: document.getElementById('queTopic').value.trim()||'General', question: document.getElementById('queText').value.trim(), optionA: document.getElementById('optA').value.trim(), optionB: document.getElementById('optB').value.trim(), optionC: document.getElementById('optC').value.trim(), optionD: document.getElementById('optD').value.trim(), correct: document.getElementById('correctOpt').value.trim().toUpperCase(), timeLimit: document.getElementById('queTime').value.trim()||null };
  if(!qData.question || !qData.optionA || !qData.correct) return alert("Fill required fields!");
  if (editingQuestionId) { db.collection('rooms').doc(currentRoomId).collection('questions').doc(editingQuestionId).update(qData).then(() => { alert("Updated!"); closeManualAddBox(); loadRoomQuestions(); }); } else { db.collection('users').doc(auth.currentUser.uid).get().then(userDoc => { qData.creatorName = userDoc.exists ? userDoc.data().displayName : "Unknown"; qData.creatorUid = auth.currentUser.uid; qData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); db.collection('rooms').doc(currentRoomId).collection('questions').add(qData).then(() => { if(isAddNext) { ['queText','optA','optB','optC','optD','correctOpt'].forEach(id => document.getElementById(id).value = ''); document.getElementById('queText').focus(); loadRoomQuestions(); } else { alert("Added!"); closeManualAddBox(); loadRoomQuestions(); } }); }); }
}
function uploadCSV() { const f = document.getElementById('csv-file').files[0]; if (!f) return alert("Select CSV!"); const ti = document.getElementById('csvTopic'), ct = ti && ti.value.trim() ? ti.value.trim() : 'General'; const r = new FileReader(); r.onload = function(e) { const rows = e.target.result.split('\n'); let c = 0; db.collection('users').doc(auth.currentUser.uid).get().then(doc => { const n = doc.exists ? doc.data().displayName : "Unknown"; for (let i = 1; i < rows.length; i++) { const cols = rows[i].trim().split(','); if (cols.length >= 6) { db.collection('rooms').doc(currentRoomId).collection('questions').add({ topic: ct, question: cols[0].trim(), optionA: cols[1].trim(), optionB: cols[2].trim(), optionC: cols[3].trim(), optionD: cols[4].trim(), correct: cols[5].trim().toUpperCase(), creatorName: n, creatorUid: auth.currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); c++; } } alert(`Uploaded ${c} questions!`); document.getElementById('csv-file').value = ""; closeCsvUploadBox(); loadRoomQuestions(); }); }; r.readAsText(f); }

// ---------------------------------
// 🌟 NESTED FOLDERS DISPLAY (UPDATE 4.0)
// ---------------------------------
function toggleAuthorQuestions(id) { let el = document.getElementById(id); if(el.style.display === 'none') { el.style.display = 'block'; if(!openAuthorFolders.includes(id)) openAuthorFolders.push(id); } else { el.style.display = 'none'; openAuthorFolders = openAuthorFolders.filter(x => x !== id); } }
function toggleTopicQuestions(id) { let el = document.getElementById(id); if(el.style.display === 'none') { el.style.display = 'block'; if(!openTopicFolders.includes(id)) openTopicFolders.push(id); } else { el.style.display = 'none'; openTopicFolders = openTopicFolders.filter(x => x !== id); } }
function filterQuestions() { const q = document.getElementById('searchQuestion').value.toLowerCase(); allCurrentQuestions.forEach(x => { const c = document.getElementById(`q-card-${x.id}`); if(c) c.style.display = (x.question.toLowerCase().includes(q) || (x.topic && x.topic.toLowerCase().includes(q))) ? "block" : "none"; }); }

function loadRoomQuestions() {
  const c = document.getElementById('questionsListContainer'); c.innerHTML = 'Loading...'; 
  let attemptedList = JSON.parse(localStorage.getItem(`attempted_${currentRoomId}`)) || [];
  
  db.collection('rooms').doc(currentRoomId).collection('questions').orderBy('createdAt', 'desc').get().then(snap => {
    if (snap.empty) { c.innerHTML = 'No questions found.'; return; }
    let aMap = {}; allCurrentQuestions = [];
    
    snap.forEach(doc => { 
        let q = doc.data(); q.id = doc.id; q.topic = q.topic || 'General'; allCurrentQuestions.push(q); 
        if(attemptedList.includes(q.id)) return; // Don't show attempted
        let author = q.creatorName || "Unknown"; 
        
        if(!aMap[author]) aMap[author] = {}; 
        if(!aMap[author][q.topic]) aMap[author][q.topic] = [];
        aMap[author][q.topic].push(q); 
    });

    const im = currentRoomAdmins.includes(auth.currentUser.uid); 
    if(Object.keys(aMap).length === 0) { c.innerHTML = '<p style="color:#28a745; font-weight:bold;">🎉 All questions attempted in this room!</p>'; return; }
    
    // 🌟 NESTED FOLDERS RENDER LOGIC
    let html = `<button class="btn" style="width:auto; padding:5px 10px; font-size:11px; margin-bottom:10px; background:#6c757d;" onclick="toggleSelectAll()">☑️ Select/Deselect All Visible</button>`;
    
    for(let author in aMap) { 
      let authId = `auth-${author.replace(/[^a-zA-Z0-9]/g, '_')}`; 
      let authOpen = openAuthorFolders.includes(authId) ? 'block' : 'none'; 
      
      let totalAuthQ = 0; let topicHtml = '';
      for(let topic in aMap[author]) {
          totalAuthQ += aMap[author][topic].length;
          let topicId = `topic-${author.replace(/[^a-zA-Z0-9]/g, '_')}-${topic.replace(/[^a-zA-Z0-9]/g, '_')}`;
          let topicOpen = openTopicFolders.includes(topicId) ? 'block' : 'none';
          
          topicHtml += `
            <div class="topic-folder">
                <div class="topic-title" onclick="toggleTopicQuestions('${topicId}')">
                    <span>📂 ${topic} (${aMap[author][topic].length})</span> <span>🔽</span>
                </div>
                <div id="${topicId}" style="display: ${topicOpen}; margin-top:10px;">
                    ${renderQuestionsHTML(aMap[author][topic], im)}
                </div>
            </div>`;
      }
      
      html += `<div class="q-card" style="border: 2px solid var(--border-color);">
                 <h4 style="color:var(--primary-btn); cursor:pointer; font-size:16px; margin:0;" onclick="toggleAuthorQuestions('${authId}')">
                   👤 MCQ by ${author} (${totalAuthQ}) 🔽
                 </h4>
                 <div id="${authId}" style="display: ${authOpen}; margin-top:10px;">${topicHtml}</div>
               </div>`; 
    } 
    c.innerHTML = html;
    updateSelectionBar(); // Refresh selection state
  });
}

function renderQuestionsHTML(arr, im) {
  let html = ''; arr.forEach((q, i) => {
    let t = q.timeLimit ? `<span style="background:#ffeeba; color:#856404; padding:2px 5px; border-radius:3px; font-size:11px;">⏳ ${q.timeLimit}s</span>` : '';
    let isChecked = selectedQuestionIds.includes(q.id) ? "checked" : "";
    let chk = (q.creatorUid === auth.currentUser.uid || im) ? `<input type="checkbox" class="bulk-delete-chk" value="${q.id}" ${isChecked} onchange="handleCheckboxChange(this)" style="transform:scale(1.3); margin-right:10px; accent-color:#dc3545;" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">` : '';
    
    let opt = [{text: q.optionA, let: 'A'}, {text: q.optionB, let: 'B'}, {text: q.optionC, let: 'C'}, {text: q.optionD, let: 'D'}]; opt.sort(() => Math.random() - 0.5); 
    let oh = ''; opt.forEach(o => { oh += `<button id="btn-${q.id}-${o.let}" class="quiz-opt-btn" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()" onclick="checkAnswer('${q.id}', '${o.let}', '${q.correct}', '${q.question.replace(/'/g, "\\'")}')">${o.text}</button>`; });
    
    let lp = (q.creatorUid === auth.currentUser.uid || im) ? `onmousedown="startLongPress('${q.id}')" onmouseup="cancelLongPress()" onmouseleave="cancelLongPress()" ontouchstart="startLongPress('${q.id}')" ontouchend="cancelLongPress()"` : "";
    
    html += `<div id="q-card-${q.id}" class="q-card" style="border:1px solid var(--border-color); margin-bottom:10px; cursor:pointer;" ${lp}>
              <div style="font-weight:bold; margin-bottom:10px; display:flex; align-items:flex-start;">
                ${chk} <div style="flex:1;">Q. ${q.question} ${t}</div>
              </div>
              <div id="mcq-options-${q.id}" style="display:flex; flex-direction:column; gap:5px;">${oh}</div>
              <p id="feedback-${q.id}" style="margin-top:10px; font-size:13px; font-weight:bold; display:none;"></p>
            </div>`;
  }); return html;
}

// ---------------------------------
// 🌟 ANSWER CHECK & ARCHIVE LOGIC (UPDATE 4.0)
// ---------------------------------
function checkAnswer(qId, sOpt, cOpt, qText) {
  document.querySelectorAll(`[id^="btn-${qId}-"]`).forEach(b => b.disabled = true); const cb = document.getElementById(`btn-${qId}-${sOpt}`), fb = document.getElementById(`feedback-${qId}`); recordQuestionAttempt(); 
  
  // Clean Question from Attempt List
  let a = JSON.parse(localStorage.getItem(`attempted_${currentRoomId}`)) || []; 
  if(!a.includes(qId)) { a.push(qId); localStorage.setItem(`attempted_${currentRoomId}`, JSON.stringify(a)); }

  if (sOpt === cOpt) { 
    cb.style.background = "#d4edda"; cb.style.color = "#155724"; cb.style.borderColor = "#28a745"; fb.innerText = "✅ Correct!"; fb.style.color = "#28a745"; updateLeaderboardScore(); 
    
    // 🌟 SAVE TO PROFILE SOLVED ARCHIVE
    if (!correctQuestions.some(item => item.id === qId)) {
       let ce = document.getElementById(`q-card-${qId}`); let cc = ce.cloneNode(true);
       let chk = cc.querySelector('.bulk-delete-chk'); if(chk) chk.remove(); // Remove checkbox from saved card
       correctQuestions.push({ id: qId, html: cc.innerHTML, room: currentRoomName }); localStorage.setItem('studyRoomCorrect', JSON.stringify(correctQuestions));
    }
    
    // Auto-hide correctly answered question from feed
    setTimeout(() => { let c = document.getElementById(`q-card-${qId}`); if(c) c.style.display = 'none'; }, 1000); 
  } 
  else { 
    cb.style.background = "#f8d7da"; cb.style.color = "#721c24"; cb.style.borderColor = "#dc3545"; document.getElementById(`btn-${qId}-${cOpt}`).style.background = "#d4edda"; document.getElementById(`btn-${qId}-${cOpt}`).style.borderColor = "#28a745"; document.getElementById(`btn-${qId}-${cOpt}`).style.color = "#155724"; fb.innerText = "❌ Wrong! (Saved to Revision)"; fb.style.color = "#dc3545"; 
    
    let ce = document.getElementById(`q-card-${qId}`); let cc = ce.cloneNode(true);
    let chk = cc.querySelector('.bulk-delete-chk'); if(chk) chk.remove(); // Remove checkbox from revision card
    if (!wrongQuestions.some(item => item.id === qId)) { wrongQuestions.push({ id: qId, html: cc.innerHTML }); localStorage.setItem('studyRoomWrong', JSON.stringify(wrongQuestions)); updateRevisionCount(); } 
  }
  fb.style.display = 'block';
}

// ---------------------------------
// 🌟 MY SOLVED QUESTIONS (NEW PROFILE HUB)
// ---------------------------------
function openSolvedQuestionsScreen() { closeProfileMenuModal(); window.location.hash = '#solved'; }
function renderSolvedQuestions() {
  const c = document.getElementById('solvedQuestionsListContainer'); 
  if (correctQuestions.length === 0) { c.innerHTML = '<p style="color:var(--text-color);">You haven\'t solved any questions yet!</p>'; return; }
  
  let html = ''; correctQuestions.reverse().forEach((i, idx) => { 
    html += `<div class="q-card" style="border:1px solid #28a745; margin-bottom:15px; background:var(--bg-color);">
               <p style="color:#28a745; font-size:11px; font-weight:bold; border-bottom:1px solid #28a745; padding-bottom:5px; margin-bottom:10px;">
                 From Room: ${i.room || 'General'}
               </p>
               ${i.html}
             </div>`; 
  }); correctQuestions.reverse(); // put it back to normal
  c.innerHTML = html;
}

// REVISION (Wrong Answers)
function openRevisionBox() { window.location.hash = '#revision'; }
function renderRevisionBox() {
  const c = document.getElementById('revisionListContainer'); if (wrongQuestions.length === 0) { c.innerHTML = '<p>Your revision list is empty!</p>'; return; }
  let html = ''; wrongQuestions.forEach((i, idx) => { html += `<div class="q-card" style="border:1px solid #dc3545; margin-bottom:15px;"><p style="color:#dc3545; font-size:12px; font-weight:bold; border-bottom:1px solid #dc3545; padding-bottom:5px; margin-bottom:10px;">Revision Item #${idx + 1}</p>${i.html}</div>`; }); c.innerHTML = html;
}
function updateRevisionCount() { const b = document.getElementById('revCount'); if(b) b.innerText = wrongQuestions.length; }
