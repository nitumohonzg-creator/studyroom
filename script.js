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

let currentRoomId = null;
let currentRoomName = null;
let allCurrentQuestions = []; // For search filtering

// -------------------------------
// 🌙 DARK MODE LOGIC
// -------------------------------
if(localStorage.getItem('theme') === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}

function toggleDarkMode() {
  let theme = document.documentElement.getAttribute('data-theme');
  if(theme === 'dark') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
}

// -------------------------------
// 🌟 SMART ROUTING & INVITE LINK LOGIC
// -------------------------------
function hideAllScreens() {
  document.getElementById('authBox').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'none';
  document.getElementById('roomViewScreen').style.display = 'none';
}

window.addEventListener('hashchange', handleHashChange);

function handleHashChange() {
  const hash = window.location.hash;
  hideAllScreens();

  // If user clicked an Invite Link
  if (hash.startsWith('#join=')) {
    const joinId = hash.split('=')[1];
    if (auth.currentUser) {
      document.getElementById('joinRoomIdInput').value = joinId;
      joinRoomByFirebase();
    } else {
      alert("Welcome! Please Login or Sign Up to join the room.");
      localStorage.setItem('pendingJoin', joinId); // Save room for after login
      document.getElementById('authBox').style.display = 'block';
    }
    return;
  }

  if (!auth.currentUser) {
    document.getElementById('authBox').style.display = 'block';
    return;
  }

  if (hash === '#dashboard' || hash === '') {
    document.getElementById('dashboardScreen').style.display = 'block';
    loadMyRooms();
  } else if (hash === '#room' && currentRoomId) {
    document.getElementById('roomViewScreen').style.display = 'block';
  } else {
    window.location.hash = '#dashboard';
  }
}

auth.onAuthStateChanged((user) => {
  if (user) {
    db.collection('users').doc(user.uid).get().then((doc) => {
      if(doc.exists) document.getElementById('welcomeText').innerText = "Hi, " + doc.data().displayName + "!";
      
      // Auto-join if came from invite link
      let pending = localStorage.getItem('pendingJoin');
      if (pending) {
        localStorage.removeItem('pendingJoin');
        document.getElementById('joinRoomIdInput').value = pending;
        joinRoomByFirebase();
      } else {
        handleHashChange();
      }
    });
  } else {
    window.location.hash = '';
    handleHashChange();
  }
});

// -------------------------------
// 🔗 DIRECT SHARE LINK
// -------------------------------
function shareInviteLink() {
  const link = window.location.origin + window.location.pathname + '#join=' + currentRoomId;
  navigator.clipboard.writeText(link).then(() => {
    alert("🔗 Invite Link Copied! Send it to your friends on WhatsApp.");
  }).catch(() => {
    alert("Failed to copy. Link: " + link);
  });
}

function copyRoomId() {
  navigator.clipboard.writeText(currentRoomId);
  alert("ID Copied: " + currentRoomId);
}

// -------------------------------
// AUTHENTICATION
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
    .then((cred) => db.collection('users').doc(cred.user.uid).set({ displayName: name, email: email }))
    .then(() => { alert("Created!"); toggleAuth('login'); })
    .catch((err) => alert(err.message));
}

function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  auth.signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
}

function logoutUser() { auth.signOut().then(() => { window.location.hash=''; window.location.reload(); }); }

// -------------------------------
// ROOM MANAGEMENT
// -------------------------------
function openCreateRoom() { document.getElementById('createRoomBox').style.display = 'block'; document.getElementById('joinRoomBox').style.display = 'none'; }
function openJoinRoom() { document.getElementById('joinRoomBox').style.display = 'block'; document.getElementById('createRoomBox').style.display = 'none'; }
function backToDashboard() { window.location.hash = '#dashboard'; }

function saveRoomToFirebase() {
  const roomName = document.getElementById('newRoomName').value.trim();
  if(!roomName) return alert("Enter Room Name!");
  db.collection('rooms').add({
    roomName: roomName, creatorId: auth.currentUser.uid, members: [auth.currentUser.uid], createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => { alert("Room Created!"); document.getElementById('createRoomBox').style.display = 'none'; loadMyRooms(); });
}

function joinRoomByFirebase() {
  const roomId = document.getElementById('joinRoomIdInput').value.trim();
  if(!roomId) return alert("Enter Room ID!");
  db.collection('rooms').doc(roomId).get().then((doc) => {
    if(doc.exists) {
      db.collection('rooms').doc(roomId).update({ members: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid) });
      document.getElementById('joinRoomBox').style.display = 'none';
      enterRoom(doc.id, doc.data().roomName);
    } else { alert("Invalid Room ID!"); window.location.hash = '#dashboard'; }
  });
}

function loadMyRooms() {
  const container = document.getElementById('roomsListContainer');
  container.innerHTML = 'Loading...';
  db.collection('rooms').where("members", "array-contains", auth.currentUser.uid).get().then((snap) => {
    if(snap.empty) { container.innerHTML = 'No rooms yet.'; return; }
    let html = '';
    snap.forEach((doc) => {
      html += `<div class="q-card" style="display:flex; justify-content:space-between; align-items:center;">
                 <div><b>${doc.data().roomName}</b></div>
                 <button class="btn" style="width:auto; padding:5px 10px; margin:0;" onclick="enterRoom('${doc.id}', '${doc.data().roomName}')">Enter</button>
               </div>`;
    });
    container.innerHTML = html;
  });
}

function enterRoom(roomId, roomName) {
  currentRoomId = roomId; currentRoomName = roomName;
  document.getElementById('roomTitleText').innerText = roomName;
  document.getElementById('searchQuestion').value = ''; // Reset search
  window.location.hash = '#room';
  loadRoomQuestions();
}

function leaveRoom() {
  if(confirm("Leave this room?")) {
    db.collection('rooms').doc(currentRoomId).update({ members: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid) })
    .then(() => backToDashboard());
  }
}

// ---------------------------------
// MCQ (TAGGING, SHUFFLE, SEARCH)
// ---------------------------------
function openAddQuestionBox() { document.getElementById('addQuestionBox').style.display = 'block'; }
function closeAddQuestionBox() { document.getElementById('addQuestionBox').style.display = 'none'; }

function saveQuestionToFirebase() {
  let qData = {
    topic: document.getElementById('queTopic').value.trim() || 'General',
    question: document.getElementById('queText').value.trim(),
    optionA: document.getElementById('optA').value.trim(),
    optionB: document.getElementById('optB').value.trim(),
    optionC: document.getElementById('optC').value.trim(),
    optionD: document.getElementById('optD').value.trim(),
    correct: document.getElementById('correctOpt').value.trim().toUpperCase(),
    creatorUid: auth.currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if(!qData.question || !qData.optionA || !qData.correct) return alert("Fill required fields!");
  
  db.collection('rooms').doc(currentRoomId).collection('questions').add(qData).then(() => {
    alert("Question added!"); closeAddQuestionBox(); loadRoomQuestions();
  });
}

// 🔍 LIVE SEARCH/FILTER
function filterQuestions() {
  const query = document.getElementById('searchQuestion').value.toLowerCase();
  allCurrentQuestions.forEach(q => {
    const card = document.getElementById(`q-card-${q.id}`);
    const match = q.question.toLowerCase().includes(query) || q.topic.toLowerCase().includes(query);
    card.style.display = match ? "block" : "none";
  });
}

function loadRoomQuestions() {
  const container = document.getElementById('questionsListContainer');
  container.innerHTML = 'Loading...';

  db.collection('rooms').doc(currentRoomId).collection('questions').orderBy('createdAt', 'desc').get()
    .then((snap) => {
      if (snap.empty) { container.innerHTML = 'No questions yet.'; return; }
      allCurrentQuestions = [];
      let html = '';

      snap.forEach((doc) => {
        let q = doc.data();
        q.id = doc.id;
        allCurrentQuestions.push(q);

        // 🔀 SHUFFLE OPTIONS LOGIC
        let options = [
          { text: q.optionA, letter: 'A' },
          { text: q.optionB, letter: 'B' },
          { text: q.optionC, letter: 'C' },
          { text: q.optionD, letter: 'D' }
        ];
        // Shuffling array randomly
        options = options.sort(() => Math.random() - 0.5);

        let optionsHtml = '';
        options.forEach((opt) => {
          optionsHtml += `<button id="btn-${q.id}-${opt.letter}" class="quiz-opt-btn" style="width:100%;" 
            onclick="checkAnswer('${q.id}', '${opt.letter}', '${q.correct}')">${opt.text}</button>`;
        });

        html += `
          <div id="q-card-${q.id}" class="q-card">
            <p style="margin-bottom: 10px; font-weight: bold;">
              ${q.question} 
              <span class="topic-badge">${q.topic}</span>
            </p>
            <div style="display:flex; flex-direction:column; gap:5px;">
              ${optionsHtml}
            </div>
            <p id="feedback-${q.id}" style="margin-top:10px; font-weight:bold; display:none;"></p>
          </div>
        `;
      });
      container.innerHTML = html;
    });
}

function checkAnswer(qId, selectedOpt, correctOpt) {
  const btns = document.querySelectorAll(`[id^="btn-${qId}-"]`);
  btns.forEach(b => b.disabled = true); // Disable all
  
  const clickedBtn = document.getElementById(`btn-${qId}-${selectedOpt}`);
  const feedback = document.getElementById(`feedback-${qId}`);

  if (selectedOpt === correctOpt) {
    clickedBtn.style.background = "#d4edda"; clickedBtn.style.color = "#155724";
    feedback.innerText = "✅ Correct!"; feedback.style.color = "#28a745";
  } else {
    clickedBtn.style.background = "#f8d7da"; clickedBtn.style.color = "#721c24";
    document.getElementById(`btn-${qId}-${correctOpt}`).style.background = "#d4edda"; 
    document.getElementById(`btn-${qId}-${correctOpt}`).style.color = "#155724";
    feedback.innerText = "❌ Wrong Answer!"; feedback.style.color = "#dc3545";
  }
  feedback.style.display = 'block';
}

