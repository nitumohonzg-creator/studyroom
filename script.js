// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBSpX_DBpJlvGspjzVhAKOBXV-0376P7Ug",
  authDomain: "studyroom-20729.firebaseapp.com",
  projectId: "studyroom-20729",
  storageBucket: "studyroom-20729.firebasestorage.app",
  messagingSenderId: "772929165730",
  appId: "1:772929165730:web:866576fe222456c61fbafb"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// GLOBALS
let currentRoomId = null;
let currentRoomName = null;
let currentRoomCreator = null;
let currentRoomAdmins = [];
let currentRoomAdminOnlyMCQ = false;
let editingQuestionId = null;
let openAuthorFolders = []; 
let allCurrentQuestions = [];
let wrongQuestions = JSON.parse(localStorage.getItem('studyRoomWrong')) || [];

updateRevisionCount();

// -------------------------------
// 🌙 DARK MODE LOGIC
// -------------------------------
if(localStorage.getItem('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

function toggleDarkMode() {
  if(document.documentElement.getAttribute('data-theme') === 'dark') {
    document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark');
  }
}

// -------------------------------
// 🌟 SMART ROUTING & INVITE LINK
// -------------------------------
function hideAllScreens() {
  ['authBox', 'dashboardScreen', 'roomViewScreen', 'profileScreen', 'revisionScreen'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
}

window.addEventListener('hashchange', handleHashChange);

function handleHashChange() {
  const hash = window.location.hash;
  hideAllScreens();

  if (hash.startsWith('#join=')) {
    const joinId = hash.split('=')[1];
    if (auth.currentUser) {
      document.getElementById('joinRoomIdInput').value = joinId;
      joinRoomByFirebase();
    } else {
      alert("Welcome! Login or Sign Up to join the room.");
      localStorage.setItem('pendingJoin', joinId);
      document.getElementById('authBox').style.display = 'block';
    }
    return;
  }

  if (!auth.currentUser) { document.getElementById('authBox').style.display = 'block'; return; }

  if (hash === '#dashboard' || hash === '') {
    document.getElementById('dashboardScreen').style.display = 'block'; loadMyRooms();
  } else if (hash === '#room' && currentRoomId) {
    document.getElementById('roomViewScreen').style.display = 'block';
  } else if (hash === '#profile') {
    document.getElementById('profileScreen').style.display = 'block';
  } else if (hash === '#revision') {
    document.getElementById('revisionScreen').style.display = 'block'; openRevisionBox();
  } else {
    window.location.hash = '#dashboard';
  }
}

auth.onAuthStateChanged((user) => {
  if (user) {
    db.collection('users').doc(user.uid).get().then((doc) => {
      if(doc.exists) document.getElementById('welcomeText').innerText = "Hi, " + doc.data().displayName + "!";
      let pending = localStorage.getItem('pendingJoin');
      if (pending) {
        localStorage.removeItem('pendingJoin'); document.getElementById('joinRoomIdInput').value = pending; joinRoomByFirebase();
      } else { handleHashChange(); }
    });
  } else { window.location.hash = ''; handleHashChange(); }
});

// -------------------------------
// 🔗 SOCIAL SHARING MODAL LOGIC
// -------------------------------
function openShareModal() {
  const link = window.location.origin + window.location.pathname + '#join=' + currentRoomId;
  document.getElementById('shareLinkInput').value = link;
  document.getElementById('shareModal').style.display = 'block';
}

function closeShareModal() {
  document.getElementById('shareModal').style.display = 'none';
}

function copyInviteLink() {
  const link = document.getElementById('shareLinkInput').value;
  navigator.clipboard.writeText(link).then(() => alert("🔗 Link Copied!"));
}

function shareViaWhatsApp() {
  const link = document.getElementById('shareLinkInput').value;
  const text = `Join my Study Room on StudyRoom Pro to practice MCQs together! 📚\nClick here: ${link}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

function shareViaFacebook() {
  const link = document.getElementById('shareLinkInput').value;
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
}

function shareViaTwitter() {
  const link = document.getElementById('shareLinkInput').value;
  const text = `Join my Study Room to practice MCQs! 📚`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
}

// -------------------------------
// AUTHENTICATION & PROFILE
// -------------------------------
function toggleAuth(type) {
  document.getElementById('loginForm').style.display = type === 'login' ? 'block' : 'none';
  document.getElementById('signupForm').style.display = type === 'signup' ? 'block' : 'none';
}

function signupUser() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  if(!name || !email || !password) return alert("Fill all fields!");

  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => db.collection('users').doc(cred.user.uid).set({ displayName: name, email: email, username: "", mobile: "", bio: "" }))
    .then(() => { alert("Created!"); toggleAuth('login'); })
    .catch(err => alert(err.message));
}

function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  auth.signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
}

function forgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  if(!email) return alert("Enter email first!");
  auth.sendPasswordResetEmail(email).then(() => alert("Link sent!")).catch(err => alert(err.message));
}

function logoutUser() { auth.signOut().then(() => { window.location.hash=''; window.location.reload(); }); }

function openProfileScreen() {
  db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
    if(doc.exists) {
      const data = doc.data();
      document.getElementById('profileName').value = data.displayName || "";
      document.getElementById('profileUsername').value = data.username || "";
      document.getElementById('profileMobile').value = data.mobile || "";
      document.getElementById('profileBio').value = data.bio || "";
      window.location.hash = '#profile';
    }
  });
}
function closeProfileScreen() { window.history.back(); }
function saveProfileData() {
  const newName = document.getElementById('profileName').value.trim();
  if(!newName) return alert("Name required!");
  db.collection('users').doc(auth.currentUser.uid).update({
    displayName: newName, username: document.getElementById('profileUsername').value.trim(),
    mobile: document.getElementById('profileMobile').value.trim(), bio: document.getElementById('profileBio').value.trim()
  }).then(() => { alert("Updated!"); closeProfileScreen(); });
}
function viewUserProfile(uid) {
  db.collection('users').doc(uid).get().then(doc => {
    if(doc.exists) {
      document.getElementById('viewProfileName').innerText = doc.data().displayName || "Unknown User";
      document.getElementById('viewProfileUsername').innerText = doc.data().username || "no_username";
      document.getElementById('viewProfileBio').innerText = doc.data().bio || "No bio added.";
      document.getElementById('viewProfileModal').style.display = 'flex';
    }
  });
}
function closeViewProfile() { document.getElementById('viewProfileModal').style.display = 'none'; }

// -------------------------------
// ROOM MANAGEMENT
// -------------------------------
function openCreateRoom() { document.getElementById('createRoomBox').style.display = 'block'; document.getElementById('joinRoomBox').style.display = 'none'; }
function closeCreateRoom() { document.getElementById('createRoomBox').style.display = 'none'; }
function openJoinRoom() { document.getElementById('joinRoomBox').style.display = 'block'; document.getElementById('createRoomBox').style.display = 'none'; }
function closeJoinRoom() { document.getElementById('joinRoomBox').style.display = 'none'; }
function backToDashboard() { window.location.hash = '#dashboard'; }
function copyRoomId() { navigator.clipboard.writeText(currentRoomId).then(() => alert("ID Copied!")); }

function saveRoomToFirebase() {
  const roomName = document.getElementById('newRoomName').value.trim();
  if(!roomName) return alert("Enter Name!");
  db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
    db.collection('rooms').add({
      roomName: roomName, creatorId: auth.currentUser.uid, creatorName: doc.data().displayName,
      admins: [auth.currentUser.uid], members: [auth.currentUser.uid], adminOnlyMCQ: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => { alert("Created!"); closeCreateRoom(); loadMyRooms(); });
  });
}

function joinRoomByFirebase() {
  const roomId = document.getElementById('joinRoomIdInput').value.trim();
  if(!roomId) return alert("Enter ID!");
  db.collection('rooms').doc(roomId).get().then(doc => {
    if(doc.exists) {
      db.collection('rooms').doc(roomId).update({ members: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid) });
      closeJoinRoom(); enterRoom(doc.id, doc.data().roomName);
    } else { alert("Invalid ID!"); window.location.hash = '#dashboard'; }
  });
}

function loadMyRooms() {
  const container = document.getElementById('roomsListContainer'); container.innerHTML = 'Loading...';
  db.collection('rooms').where("members", "array-contains", auth.currentUser.uid).get().then(snap => {
    if(snap.empty) { container.innerHTML = 'No rooms found.'; return; }
    let html = '';
    snap.forEach(doc => {
      html += `<div class="q-card" style="display:flex; justify-content:space-between; align-items:center;">
                 <div><b>${doc.data().roomName}</b><p style="font-size:11px; margin:0;">ID: <span style="background:#ddd; padding:2px 4px; border-radius:3px; color:#000;">${doc.id}</span></p></div>
                 <button class="btn" style="width:auto; padding:6px 12px; margin:0;" onclick="enterRoom('${doc.id}', '${doc.data().roomName}')">Enter</button>
               </div>`;
    });
    container.innerHTML = html;
  });
}

function enterRoom(roomId, roomName) {
  currentRoomId = roomId; currentRoomName = roomName;
  document.getElementById('roomTitleText').innerText = roomName;
  document.getElementById('editRoomBox').style.display = 'none';
  document.getElementById('shareModal').style.display = 'none';
  document.getElementById('searchQuestion').value = ''; 
  closeAddQuestionBox(); openAuthorFolders = [];

  db.collection('rooms').doc(roomId).get().then(doc => {
    if(doc.exists) {
      currentRoomCreator = doc.data().creatorId;
      currentRoomAdmins = doc.data().admins || [currentRoomCreator];
      currentRoomAdminOnlyMCQ = doc.data().adminOnlyMCQ || false;
      const isMeAdmin = currentRoomAdmins.includes(auth.currentUser.uid);
      
      document.getElementById('editRoomAdminOnlyToggle').checked = currentRoomAdminOnlyMCQ;
      document.getElementById('editRoomBtn').style.display = isMeAdmin ? 'inline-block' : 'none';
      document.getElementById('deleteRoomBtn').style.display = (auth.currentUser.uid === currentRoomCreator) ? 'inline-block' : 'none';
      document.getElementById('addMcqBtnContainer').style.display = (currentRoomAdminOnlyMCQ && !isMeAdmin) ? 'none' : 'block';

      loadRoomMembers(); loadRoomQuestions(); window.location.hash = '#room';
    }
  });
}

function leaveRoom() {
  if(confirm("Leave room?")) db.collection('rooms').doc(currentRoomId).update({ members: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid), admins: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid) }).then(() => backToDashboard());
}
function deleteRoom() {
  if(confirm("Delete permanently?")) db.collection('rooms').doc(currentRoomId).delete().then(() => backToDashboard());
}

// EDIT ROOM SETTINGS
function openEditRoom() { document.getElementById('editRoomBox').style.display = 'block'; document.getElementById('editRoomNameInput').value = currentRoomName; }
function closeEditRoom() { document.getElementById('editRoomBox').style.display = 'none'; }
function saveRoomEdit() {
  let newName = document.getElementById('editRoomNameInput').value.trim();
  let adminOnlyToggle = document.getElementById('editRoomAdminOnlyToggle').checked;
  if(!newName) return alert("Enter valid name");
  db.collection('rooms').doc(currentRoomId).update({ roomName: newName, adminOnlyMCQ: adminOnlyToggle }).then(() => {
    alert("Updated!"); currentRoomName = newName; currentRoomAdminOnlyMCQ = adminOnlyToggle;
    document.getElementById('roomTitleText').innerText = newName; closeEditRoom();
    document.getElementById('addMcqBtnContainer').style.display = (currentRoomAdminOnlyMCQ && !currentRoomAdmins.includes(auth.currentUser.uid)) ? 'none' : 'block';
  });
}

// MEMBERS, ADMIN & KICK
function loadRoomMembers() {
  const container = document.getElementById('membersListContainer'); container.innerHTML = 'Loading...';
  db.collection('rooms').doc(currentRoomId).get().then(doc => {
    if(!doc.exists) return;
    const members = doc.data().members || []; currentRoomAdmins = doc.data().admins || [doc.data().creatorId]; 
    const isMeCreator = (auth.currentUser.uid === doc.data().creatorId);
    
    if(members.length === 0) { container.innerHTML = "No members"; return; }

    Promise.all(members.map(uid => db.collection('users').doc(uid).get().catch(e => null))).then(userDocs => {
      let html = '';
      userDocs.forEach((uDoc, index) => {
        if(!uDoc) return;
        const uid = members[index]; const name = uDoc.exists ? uDoc.data().displayName : "Unknown";
        const isThisUserAdmin = currentRoomAdmins.includes(uid);
        let actionBtns = "";

        if (uid !== auth.currentUser.uid) {
          if (isMeCreator) {
            actionBtns += isThisUserAdmin ? `<button onclick="removeAdminRole('${uid}')" style="background:#ffc107; border:none; padding:3px 8px; font-size:11px; cursor:pointer;">Remove Admin</button> ` : `<button onclick="makeAdmin('${uid}')" style="background:#28a745; color:white; border:none; padding:3px 8px; font-size:11px; cursor:pointer;">Make Admin</button> `;
            actionBtns += `<button onclick="removeMember('${uid}')" style="background:#dc3545; color:white; border:none; padding:3px 8px; font-size:11px; cursor:pointer;">Kick</button>`;
          } else if (currentRoomAdmins.includes(auth.currentUser.uid) && !isThisUserAdmin) {
            actionBtns += `<button onclick="removeMember('${uid}')" style="background:#dc3545; color:white; border:none; padding:3px 8px; font-size:11px; cursor:pointer;">Kick</button>`;
          }
        }
        let role = (uid === doc.data().creatorId) ? '👑' : (isThisUserAdmin ? '🛡️' : '👤');
        html += `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--border-color);">
                  <span style="color:var(--primary-btn); cursor:pointer;" onclick="viewUserProfile('${uid}')">${role} ${name}</span>
                  <div>${actionBtns}</div></div>`;
      });
      container.innerHTML = html;
    }).catch(e => { container.innerHTML = "Error loading members."; console.error(e); });
  });
}
function makeAdmin(uid) { if(confirm("Make Admin?")) db.collection('rooms').doc(currentRoomId).update({ admins: firebase.firestore.FieldValue.arrayUnion(uid) }).then(() => loadRoomMembers()); }
function removeAdminRole(uid) { if(confirm("Remove Admin?")) db.collection('rooms').doc(currentRoomId).update({ admins: firebase.firestore.FieldValue.arrayRemove(uid) }).then(() => loadRoomMembers()); }
function removeMember(uid) { if(confirm("Kick member?")) db.collection('rooms').doc(currentRoomId).update({ members: firebase.firestore.FieldValue.arrayRemove(uid), admins: firebase.firestore.FieldValue.arrayRemove(uid) }).then(() => loadRoomMembers()); }

// ---------------------------------
// MCQ (ADD, EDIT, DELETE, BULK UPLOAD)
// ---------------------------------
function openAddQuestionBox() {
  editingQuestionId = null; document.getElementById('addQuestionBoxTitle').innerText = "New Question"; document.getElementById('saveQuestionBtn').innerText = "Save";
  ['queTopic','queText','optA','optB','optC','optD','correctOpt','queTime'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('addQuestionBox').style.display = 'block';
}
function closeAddQuestionBox() { document.getElementById('addQuestionBox').style.display = 'none'; }

function editQuestion(qId) {
  db.collection('rooms').doc(currentRoomId).collection('questions').doc(qId).get().then(doc => {
    let q = doc.data();
    document.getElementById('queTopic').value = q.topic || 'General';
    document.getElementById('queText').value = q.question; document.getElementById('optA').value = q.optionA;
    document.getElementById('optB').value = q.optionB; document.getElementById('optC').value = q.optionC;
    document.getElementById('optD').value = q.optionD; document.getElementById('correctOpt').value = q.correct;
    document.getElementById('queTime').value = q.timeLimit || '';
    editingQuestionId = qId; document.getElementById('addQuestionBoxTitle').innerText = "Edit Question"; document.getElementById('saveQuestionBtn').innerText = "Update";
    document.getElementById('addQuestionBox').style.display = 'block'; window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
function deleteQuestion(qId) {
  if(confirm("Delete question?")) db.collection('rooms').doc(currentRoomId).collection('questions').doc(qId).delete().then(() => {
    alert("Deleted!"); const card = document.getElementById(`q-card-${qId}`); if(card) card.style.display = 'none';
  });
}

function saveQuestionToFirebase() {
  const qData = {
    topic: document.getElementById('queTopic').value.trim() || 'General',
    question: document.getElementById('queText').value.trim(), optionA: document.getElementById('optA').value.trim(),
    optionB: document.getElementById('optB').value.trim(), optionC: document.getElementById('optC').value.trim(),
    optionD: document.getElementById('optD').value.trim(), correct: document.getElementById('correctOpt').value.trim().toUpperCase(),
    timeLimit: document.getElementById('queTime').value.trim() || null
  };
  if(!qData.question || !qData.optionA || !qData.correct) return alert("Fill required fields!");

  if (editingQuestionId) {
    db.collection('rooms').doc(currentRoomId).collection('questions').doc(editingQuestionId).update(qData).then(() => { alert("Updated!"); closeAddQuestionBox(); loadRoomQuestions(); });
  } else {
    db.collection('users').doc(auth.currentUser.uid).get().then(userDoc => {
      qData.creatorName = userDoc.exists ? userDoc.data().displayName : "Unknown";
      qData.creatorUid = auth.currentUser.uid; qData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      db.collection('rooms').doc(currentRoomId).collection('questions').add(qData).then(() => { alert("Added!"); closeAddQuestionBox(); loadRoomQuestions(); });
    });
  }
}

function uploadCSV() {
  if (!currentRoomId) return alert("Enter a room first!");
  const file = document.getElementById('csv-file').files[0];
  if (!file) return alert("Select CSV!");

  const reader = new FileReader();
  reader.onload = function(e) {
    const rows = e.target.result.split('\n'); let count = 0;
    db.collection('users').doc(auth.currentUser.uid).get().then(userDoc => {
      const creatorName = userDoc.exists ? userDoc.data().displayName : "Unknown";
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].trim().split(','); 
        if (cols.length >= 6) {
          db.collection('rooms').doc(currentRoomId).collection('questions').add({
            topic: 'General', question: cols[0].trim(), optionA: cols[1].trim(), optionB: cols[2].trim(),
            optionC: cols[3].trim(), optionD: cols[4].trim(), correct: cols[5].trim().toUpperCase(),
            creatorName: creatorName, creatorUid: auth.currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          count++;
        }
      }
      alert(`Uploaded ${count} questions!`); document.getElementById('csv-file').value = ""; loadRoomQuestions(); 
    });
  };
  reader.readAsText(file);
}

// ---------------------------------
// MCQ DISPLAY, SHUFFLE, SEARCH
// ---------------------------------
function toggleAuthorQuestions(divId) {
  let el = document.getElementById(divId);
  if(el.style.display === 'none') { el.style.display = 'block'; if(!openAuthorFolders.includes(divId)) openAuthorFolders.push(divId); } 
  else { el.style.display = 'none'; openAuthorFolders = openAuthorFolders.filter(id => id !== divId); }
}

function filterQuestions() {
  const query = document.getElementById('searchQuestion').value.toLowerCase();
  allCurrentQuestions.forEach(q => {
    const card = document.getElementById(`q-card-${q.id}`);
    if(card) {
      const match = q.question.toLowerCase().includes(query) || (q.topic && q.topic.toLowerCase().includes(query));
      card.style.display = match ? "block" : "none";
    }
  });
}

function loadRoomQuestions() {
  const container = document.getElementById('questionsListContainer'); container.innerHTML = 'Loading...';
  let attemptedList = JSON.parse(localStorage.getItem(`attempted_${currentRoomId}`)) || [];

  db.collection('rooms').doc(currentRoomId).collection('questions').orderBy('createdAt', 'desc').get().then(snap => {
    if (snap.empty) { container.innerHTML = 'No questions found.'; return; }
    let authorMap = {}; allCurrentQuestions = [];

    snap.forEach(doc => {
      let q = doc.data(); q.id = doc.id; q.topic = q.topic || 'General';
      allCurrentQuestions.push(q);
      if(attemptedList.includes(q.id)) return;
      
      let author = q.creatorName || "Unknown Author";
      if(!authorMap[author]) authorMap[author] = []; authorMap[author].push(q);
    });

    if(Object.keys(authorMap).length === 0) { container.innerHTML = '<p style="color:#28a745; font-weight:bold;">🎉 All questions attempted!</p>'; return; }

    let html = '';
    for(let author in authorMap) {
      let authorDivId = `author-section-${author.replace(/\s+/g, '_')}`;
      let isFolderOpen = openAuthorFolders.includes(authorDivId) ? 'block' : 'none';
      html += `<div class="q-card">
                 <h4 style="color:var(--primary-btn); cursor:pointer; font-size:15px; margin:0;" onclick="toggleAuthorQuestions('${authorDivId}')">📁 MCQ by ${author} (${authorMap[author].length}) 🔽</h4>
                 <div id="${authorDivId}" style="display: ${isFolderOpen}; margin-top:10px;">${renderQuestionsHTML(authorMap[author])}</div>
               </div>`;
    }
    container.innerHTML = html;
  });
}

function renderQuestionsHTML(questionsArray) {
  let htmlString = ''; const isMeAdmin = currentRoomAdmins.includes(auth.currentUser.uid);
  questionsArray.forEach((q, index) => {
    let timeBadge = q.timeLimit ? `<span style="background:#ffeeba; color:#856404; padding:2px 5px; border-radius:3px; font-size:11px;">⏳ ${q.timeLimit}s</span>` : '';
    let controlBtns = (q.creatorUid === auth.currentUser.uid || isMeAdmin) ? `<div style="margin-bottom:8px;"><button onclick="editQuestion('${q.id}')" style="background:#ffc107; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">✏️ Edit</button> <button onclick="deleteQuestion('${q.id}')" style="background:#dc3545; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">🗑️ Delete</button></div>` : '';
    
    let options = [{text: q.optionA, let: 'A'}, {text: q.optionB, let: 'B'}, {text: q.optionC, let: 'C'}, {text: q.optionD, let: 'D'}];
    options.sort(() => Math.random() - 0.5); 

    let optsHtml = '';
    options.forEach(o => {
      optsHtml += `<button id="btn-${q.id}-${o.let}" class="quiz-opt-btn" onclick="checkAnswer('${q.id}', '${o.let}', '${q.correct}')">${o.text}</button>`;
    });

    htmlString += `
      <div id="q-card-${q.id}" class="q-card" style="border:1px solid var(--border-color); margin-bottom:10px;">
        ${controlBtns}
        <p style="font-weight:bold; margin-bottom:10px;">Q${index+1}. ${q.question} <span class="topic-badge">${q.topic}</span> ${timeBadge}</p>
        <div id="mcq-options-${q.id}" style="display:flex; flex-direction:column; gap:5px;">${optsHtml}</div>
        <p id="feedback-${q.id}" style="margin-top:10px; font-size:13px; font-weight:bold; display:none;"></p>
      </div>`;
  });
  return htmlString;
}

// ---------------------------------
// REVISION LOGIC 
// ---------------------------------
function checkAnswer(qId, selectedOpt, correctOpt) {
  const btns = document.querySelectorAll(`[id^="btn-${qId}-"]`);
  btns.forEach(b => b.disabled = true);
  const clickedBtn = document.getElementById(`btn-${qId}-${selectedOpt}`);
  const feedback = document.getElementById(`feedback-${qId}`);

  if (selectedOpt === correctOpt) {
    clickedBtn.style.background = "#d4edda"; clickedBtn.style.color = "#155724"; clickedBtn.style.borderColor = "#28a745";
    feedback.innerText = "✅ Correct Answer!"; feedback.style.color = "#28a745";

    let attemptedList = JSON.parse(localStorage.getItem(`attempted_${currentRoomId}`)) || [];
    if(!attemptedList.includes(qId)) { attemptedList.push(qId); localStorage.setItem(`attempted_${currentRoomId}`, JSON.stringify(attemptedList)); }
    setTimeout(() => { const card = document.getElementById(`q-card-${qId}`); if(card) card.style.display = 'none'; }, 1500);
  } else {
    clickedBtn.style.background = "#f8d7da"; clickedBtn.style.color = "#721c24"; clickedBtn.style.borderColor = "#dc3545";
    document.getElementById(`btn-${qId}-${correctOpt}`).style.background = "#d4edda"; document.getElementById(`btn-${qId}-${correctOpt}`).style.borderColor = "#28a745"; document.getElementById(`btn-${qId}-${correctOpt}`).style.color = "#155724";
    feedback.innerText = "❌ Wrong Answer! (Saved to Revision)"; feedback.style.color = "#dc3545";

    const cardElement = document.getElementById(`q-card-${qId}`);
    const cloneCard = cardElement.cloneNode(true);
    if(cloneCard.children[0].tagName === 'DIV') cloneCard.children[0].style.display = 'none'; 
    const finalHtml = cloneCard.innerHTML;

    if (!wrongQuestions.some(item => item.id === qId)) {
      wrongQuestions.push({ id: qId, html: finalHtml }); 
      localStorage.setItem('studyRoomWrong', JSON.stringify(wrongQuestions)); 
      updateRevisionCount();
    }
  }
  feedback.style.display = 'block';
}

function openRevisionBox() {
  window.location.hash = '#revision'; const container = document.getElementById('revisionListContainer');
  if (wrongQuestions.length === 0) { container.innerHTML = '<p>Your revision list is empty!</p>'; return; }
  let html = '';
  wrongQuestions.forEach((item, index) => {
    html += `<div class="q-card" style="border:1px solid #dc3545; margin-bottom:15px;">
               <p style="color:#dc3545; font-size:12px; font-weight:bold; border-bottom:1px solid #dc3545; padding-bottom:5px; margin-bottom:10px;">Revision Item #${index + 1}</p>
               ${item.html}
             </div>`;
  });
  container.innerHTML = html;
}
function closeRevisionBox() { window.history.back(); }
function updateRevisionCount() { 
    const badge = document.getElementById('revCount');
    if(badge) badge.innerText = wrongQuestions.length; 
}
