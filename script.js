// 1. FIREBASE CONFIGURATION & INITIALIZATION
const firebaseConfig = {
  apiKey: "AIzaSyBSpX_DBpJlvGspjzVhAKOBXV-0376P7Ug",
  authDomain: "studyroom-20729.firebaseapp.com",
  projectId: "studyroom-20729",
  storageBucket: "studyroom-20729.firebasestorage.app",
  messagingSenderId: "772929165730",
  appId: "1:772929165730:web:866576fe222456c61fbafb"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Auth Persistence Fix
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

let wrongQuestions = JSON.parse(localStorage.getItem('studyRoomWrong')) || [];
updateRevisionCount();

// GLOBAL VARIABLES FOR ROOMS & FOLDERS
let currentRoomId = null;
let currentRoomName = null;
let currentRoomCreator = null;
let currentRoomAdmins = [];
let editingQuestionId = null;
let openAuthorFolders = []; 

// -------------------------------
// AUTHENTICATION (LOGIN / SIGNUP)
// -------------------------------
function toggleAuth(type) {
  if(type === 'signup') {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
  } else {
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
  }
}

function signupUser() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  if(!name || !email || !password) return alert("All fields are required!");

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      return db.collection('users').doc(userCredential.user.uid).set({
        displayName: name, 
        email: email, 
        totalScore: 0,
        username: "",
        mobile: "",
        bio: ""
      });
    })
    .then(() => {
      alert("Account successfully created! 🎉");
      toggleAuth('login');
    })
    .catch((error) => alert("Error: " + error.message));
}

function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if(!email || !password) return alert("Please enter both Email and Password!");

  auth.signInWithEmailAndPassword(email, password)
    .then((cred) => {
      db.collection('users').doc(cred.user.uid).get().then((doc) => {
        if(doc.exists) showDashboard(doc.data().displayName);
      });
    }).catch((error) => alert("Login Failed: " + error.message));
}

function forgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  if(!email) return alert("Please enter your email address in the box first!");
  auth.sendPasswordResetEmail(email)
    .then(() => alert("Password reset link has been sent to your email!"))
    .catch((error) => alert("Error: " + error.message));
}

function logoutUser() {
  auth.signOut().then(() => { window.location.href = window.location.pathname; });
}

// -------------------------------
// USER PROFILE MANAGEMENT
// -------------------------------
function openProfileScreen() {
  const uid = auth.currentUser.uid;
  db.collection('users').doc(uid).get().then((doc) => {
    if(doc.exists) {
      const data = doc.data();
      document.getElementById('profileName').value = data.displayName || "";
      document.getElementById('profileUsername').value = data.username || "";
      document.getElementById('profileMobile').value = data.mobile || "";
      document.getElementById('profileBio').value = data.bio || "";
      
      document.getElementById('dashboardScreen').style.display = 'none';
      document.getElementById('profileScreen').style.display = 'block';
    }
  });
}

function closeProfileScreen() {
  document.getElementById('profileScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
}

function saveProfileData() {
  const uid = auth.currentUser.uid;
  const newName = document.getElementById('profileName').value.trim();
  const newUsername = document.getElementById('profileUsername').value.trim();
  const newMobile = document.getElementById('profileMobile').value.trim();
  const newBio = document.getElementById('profileBio').value.trim();

  if(!newName) return alert("Display Name cannot be empty!");

  db.collection('users').doc(uid).update({
    displayName: newName,
    username: newUsername,
    mobile: newMobile,
    bio: newBio
  }).then(() => {
    alert("Profile updated successfully! ✅");
    document.getElementById('welcomeText').innerText = "Welcome, " + newName + "!";
    closeProfileScreen();
  }).catch((error) => alert("Error updating profile: " + error.message));
}

function sendPasswordResetFromProfile() {
  const userEmail = auth.currentUser.email;
  if(confirm("We will send a password reset link to: " + userEmail + ". Do you want to proceed?")) {
    auth.sendPasswordResetEmail(userEmail)
      .then(() => alert("Password reset link sent to your email! Check your inbox."))
      .catch((error) => alert("Error: " + error.message));
  }
}

// -------------------------------
// STATIC PAGES (ABOUT / PRIVACY)
// -------------------------------
function openStaticPage(pageType) {
  document.getElementById('dashboardScreen').style.display = 'none';
  document.getElementById('staticPageScreen').style.display = 'block';
  
  const titleEl = document.getElementById('staticPageTitle');
  const contentEl = document.getElementById('staticPageContent');

  if(pageType === 'about') {
    titleEl.innerText = "About Us";
    contentEl.innerHTML = `
      <h3>Welcome to StudyRoom Pro</h3>
      <p>StudyRoom Pro is a dedicated platform designed for students and educators to create, share, and practice MCQs in real-time group environments.</p>
      <p>Our mission is to make group study more interactive, structured, and accessible for everyone preparing for competitive exams.</p>
      <p><strong>Features:</strong> Group Rooms, Real-time MCQ practice, Error Revision lists, and Role-based access controls.</p>
      <p>Happy Learning! 🚀</p>
    `;
  } else if(pageType === 'privacy') {
    titleEl.innerText = "Privacy Policy";
    contentEl.innerHTML = `
      <h3>Privacy Policy</h3>
      <p>Your privacy is critically important to us.</p>
      <ul>
        <li><strong>Data Collection:</strong> We only collect the information necessary to provide our service, such as your email, name, and quiz performance data.</li>
        <li><strong>Data Protection:</strong> Your passwords are encrypted by Firebase Auth. We do not sell your personal data to third parties.</li>
        <li><strong>Usage:</strong> The data (like MCQs and answers) you submit in public or group rooms is visible to other members of that specific room.</li>
        <li><strong>Contact:</strong> For any privacy-related concerns, please contact the admin.</li>
      </ul>
    `;
  }
}

function closeStaticPage() {
  document.getElementById('staticPageScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
}


// -------------------------------
// DASHBOARD & ROOM MANAGEMENT
// -------------------------------
function showDashboard(userName) {
  document.getElementById('authBox').style.display = 'none'; 
  document.getElementById('roomViewScreen').style.display = 'none';
  document.getElementById('revisionScreen').style.display = 'none';
  document.getElementById('profileScreen').style.display = 'none';
  document.getElementById('staticPageScreen').style.display = 'none';
  
  document.getElementById('dashboardScreen').style.display = 'block';
  document.getElementById('welcomeText').innerText = "Welcome, " + userName + "!";
  loadMyRooms();
}

function openCreateRoom() {
  document.getElementById('createRoomBox').style.display = 'block';
  document.getElementById('joinRoomBox').style.display = 'none';
}

function closeCreateRoom() {
  document.getElementById('createRoomBox').style.display = 'none';
  document.getElementById('newRoomName').value = ''; 
}

function openJoinRoom() {
  document.getElementById('joinRoomBox').style.display = 'block';
  document.getElementById('createRoomBox').style.display = 'none';
}

function closeJoinRoom() {
  document.getElementById('joinRoomBox').style.display = 'none';
  document.getElementById('joinRoomIdInput').value = '';
}

function saveRoomToFirebase() {
  const roomName = document.getElementById('newRoomName').value.trim();
  const uid = auth.currentUser.uid;
  if(!roomName) return alert("Room name is required!");

  db.collection('users').doc(uid).get().then((doc) => {
    db.collection('rooms').add({
      roomName: roomName,
      creatorId: uid,
      creatorName: doc.data().displayName,
      admins: [uid], 
      members: [uid],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      alert("Room successfully created! 🎉");
      closeCreateRoom();
      loadMyRooms(); 
    });
  });
}

function joinRoomByFirebase() {
  const roomId = document.getElementById('joinRoomIdInput').value.trim();
  const uid = auth.currentUser.uid;
  if(!roomId) return alert("Please enter a Room ID!");

  db.collection('rooms').doc(roomId).get().then((doc) => {
    if(doc.exists) {
      let membersList = doc.data().members || [];
      if(!membersList.includes(uid)) {
        membersList.push(uid);
        db.collection('rooms').doc(roomId).update({ members: membersList });
      }
      alert("Congratulations! You joined '" + doc.data().roomName + "'!");
      closeJoinRoom();
      enterRoom(doc.id, doc.data().roomName);
    } else {
      alert("Invalid Room ID! Room not found.");
    }
  }).catch((error) => alert("Error joining room: " + error.message));
}

function loadMyRooms() {
  const uid = auth.currentUser.uid;
  const container = document.getElementById('roomsListContainer');
  container.innerHTML = '<p style="color: #888; font-size: 14px;">Loading rooms...</p>';

  db.collection('rooms').where("members", "array-contains", uid).get()
    .then((querySnapshot) => {
      container.innerHTML = '';
      if (querySnapshot.empty) {
        container.innerHTML = '<p style="color: #666; font-size: 14px;">No rooms found.</p>';
        return;
      }
      querySnapshot.forEach((doc) => {
        const roomData = doc.data();
        container.innerHTML += `
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div style="text-align: left;">
              <h4 style="margin: 0; color: #1a73e8;">${roomData.roomName}</h4>
              <p style="margin: 5px 0 0 0; font-size: 11px; color: #555;">Room ID: <span style="background:#eee; padding:2px 4px; border-radius:3px; user-select:all;">${doc.id}</span></p>
            </div>
            <button class="btn" style="width: auto; padding: 8px 12px; font-size: 14px;" onclick="enterRoom('${doc.id}', '${roomData.roomName}')">Enter Room</button>
          </div>
        `;
      });
    });
}

function enterRoom(roomId, roomName) {
  currentRoomId = roomId;
  currentRoomName = roomName;
  document.getElementById('dashboardScreen').style.display = 'none';
  document.getElementById('roomViewScreen').style.display = 'block';
  document.getElementById('roomTitleText').innerText = roomName;
  document.getElementById('editRoomBox').style.display = 'none'; 
  closeAddQuestionBox(); 

  openAuthorFolders = [];

  db.collection('rooms').doc(roomId).get().then(doc => {
    if(doc.exists) {
      currentRoomCreator = doc.data().creatorId;
      currentRoomAdmins = doc.data().admins || [currentRoomCreator];
      const isMeAdmin = currentRoomAdmins.includes(auth.currentUser.uid);
      const isMeCreator = (auth.currentUser.uid === currentRoomCreator);

      document.getElementById('editRoomBtn').style.display = isMeAdmin ? 'inline-block' : 'none';
      document.getElementById('deleteRoomBtn').style.display = isMeCreator ? 'inline-block' : 'none';

      loadRoomMembers();
      loadRoomQuestions();
    }
  });
}

function backToDashboard() {
  document.getElementById('roomViewScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
  loadMyRooms();
}

// -------------------------------
// ROOM SETTINGS
// -------------------------------
function copyRoomId() {
  navigator.clipboard.writeText(currentRoomId).then(() => {
    alert("Room ID Copied: " + currentRoomId);
  }).catch(() => {
    alert("Failed to copy. Room ID is: " + currentRoomId);
  });
}

function leaveRoom() {
  const uid = auth.currentUser.uid;
  if(confirm("Are you sure you want to leave this room?")) {
    db.collection('rooms').doc(currentRoomId).update({
      members: firebase.firestore.FieldValue.arrayRemove(uid),
      admins: firebase.firestore.FieldValue.arrayRemove(uid)
    }).then(() => {
      alert("You have left the room.");
      backToDashboard();
    });
  }
}

function deleteRoom() {
  if(confirm("DANGER: Are you sure you want to completely delete this room? This cannot be undone!")) {
    db.collection('rooms').doc(currentRoomId).delete().then(() => {
      alert("Room has been deleted permanently.");
      backToDashboard();
    });
  }
}

function openEditRoom() {
  document.getElementById('editRoomBox').style.display = 'block';
  document.getElementById('editRoomNameInput').value = currentRoomName;
}

function closeEditRoom() { document.getElementById('editRoomBox').style.display = 'none'; }

function saveRoomEdit() {
  let newName = document.getElementById('editRoomNameInput').value.trim();
  if(!newName) return alert("Please enter a valid room name");
  db.collection('rooms').doc(currentRoomId).update({ roomName: newName }).then(() => {
    alert("Room settings updated!");
    currentRoomName = newName;
    document.getElementById('roomTitleText').innerText = newName;
    closeEditRoom();
  });
}

// -------------------------------
// ADMIN MANAGEMENT & MEMBERS LIST
// -------------------------------
function loadRoomMembers() {
  const container = document.getElementById('membersListContainer');
  container.innerHTML = '<p style="color: #666; font-size: 13px; margin: 0;">Loading members...</p>';

  db.collection('rooms').doc(currentRoomId).get().then((doc) => {
    if(!doc.exists) return;
    const members = doc.data().members || [];
    currentRoomAdmins = doc.data().admins || [doc.data().creatorId]; 
    const isMeCreator = (auth.currentUser.uid === doc.data().creatorId);
    
    container.innerHTML = '';
    members.forEach((uid) => {
      db.collection('users').doc(uid).get().then((uDoc) => {
        const name = uDoc.exists ? uDoc.data().displayName : "Unknown";
        const isThisUserAdmin = currentRoomAdmins.includes(uid);
        
        let actionBtns = "";

        if (uid !== auth.currentUser.uid) {
          if (isMeCreator) {
            let adminBtn = isThisUserAdmin ? 
              `<button onclick="removeAdminRole('${uid}')" style="background:#ffc107; border:none; padding:3px 8px; border-radius:3px; font-size:11px; cursor:pointer; margin-right:5px;">Remove Admin</button>` : 
              `<button onclick="makeAdmin('${uid}')" style="background:#28a745; color:white; border:none; padding:3px 8px; border-radius:3px; font-size:11px; cursor:pointer; margin-right:5px;">Make Admin</button>`;
            
            let removeBtn = `<button onclick="removeMember('${uid}')" style="background:#dc3545; color:white; border:none; padding:3px 8px; border-radius:3px; font-size:11px; cursor:pointer;">Kick</button>`;
            actionBtns = adminBtn + removeBtn;
          } else if (currentRoomAdmins.includes(auth.currentUser.uid) && !isThisUserAdmin) {
            actionBtns = `<button onclick="removeMember('${uid}')" style="background:#dc3545; color:white; border:none; padding:3px 8px; border-radius:3px; font-size:11px; cursor:pointer;">Kick</button>`;
          }
        }

        let roleTag = (uid === doc.data().creatorId) ? '👑 Creator' : (isThisUserAdmin ? '🛡️ Admin' : '👤 Member');

        container.innerHTML += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e2e2e2; font-size: 13px;">
            <span>${roleTag} - ${name}</span>
            <div>${actionBtns}</div>
          </div>
        `;
      });
    });
  });
}

function makeAdmin(uid) {
  if(confirm("Make this member an Admin?")) {
    db.collection('rooms').doc(currentRoomId).update({ admins: firebase.firestore.FieldValue.arrayUnion(uid) })
      .then(() => loadRoomMembers());
  }
}

function removeAdminRole(uid) {
  if(confirm("Remove admin rights from this user?")) {
    db.collection('rooms').doc(currentRoomId).update({ admins: firebase.firestore.FieldValue.arrayRemove(uid) })
      .then(() => loadRoomMembers());
  }
}

function removeMember(uid) {
  if(confirm("Kick this member from the room?")) {
    db.collection('rooms').doc(currentRoomId).update({
      members: firebase.firestore.FieldValue.arrayRemove(uid),
      admins: firebase.firestore.FieldValue.arrayRemove(uid)
    }).then(() => loadRoomMembers());
  }
}

// ---------------------------------
// MCQ SECTION (ADD, EDIT, DELETE)
// ---------------------------------
function openAddQuestionBox() {
  editingQuestionId = null;
  document.getElementById('addQuestionBoxTitle').innerText = "New Question";
  document.getElementById('saveQuestionBtn').innerText = "Save Question";
  
  document.getElementById('queText').value = '';
  document.getElementById('optA').value = '';
  document.getElementById('optB').value = '';
  document.getElementById('optC').value = '';
  document.getElementById('optD').value = '';
  document.getElementById('correctOpt').value = '';
  document.getElementById('queTime').value = '';
  
  document.getElementById('addQuestionBox').style.display = 'block';
}

function closeAddQuestionBox() {
  editingQuestionId = null;
  document.getElementById('addQuestionBox').style.display = 'none';
}

function editQuestion(qId) {
  db.collection('rooms').doc(currentRoomId).collection('questions').doc(qId).get().then(doc => {
    let q = doc.data();
    document.getElementById('queText').value = q.question;
    document.getElementById('optA').value = q.optionA;
    document.getElementById('optB').value = q.optionB;
    document.getElementById('optC').value = q.optionC;
    document.getElementById('optD').value = q.optionD;
    document.getElementById('correctOpt').value = q.correct;
    document.getElementById('queTime').value = q.timeLimit || '';
    
    editingQuestionId = qId;
    document.getElementById('addQuestionBoxTitle').innerText = "Edit Question";
    document.getElementById('saveQuestionBtn').innerText = "Update Question";
    document.getElementById('addQuestionBox').style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function deleteQuestion(qId) {
  if(confirm("Are you sure you want to delete this question?")) {
    db.collection('rooms').doc(currentRoomId).collection('questions').doc(qId).delete().then(() => {
      alert("Question deleted!");
      const card = document.getElementById(`q-card-${qId}`);
      if(card) card.style.display = 'none';
    });
  }
}

function saveQuestionToFirebase() {
  const queText = document.getElementById('queText').value.trim();
  const optA = document.getElementById('optA').value.trim();
  const optB = document.getElementById('optB').value.trim();
  const optC = document.getElementById('optC').value.trim();
  const optD = document.getElementById('optD').value.trim();
  const correctOpt = document.getElementById('correctOpt').value.trim().toUpperCase();
  const queTime = document.getElementById('queTime').value.trim();
  const uid = auth.currentUser.uid;

  if(!queText || !optA || !optB || !optC || !optD || !correctOpt) {
    return alert("All fields (except Time Limit) are required!");
  }

  let qData = {
    question: queText, optionA: optA, optionB: optB, optionC: optC, optionD: optD,
    correct: correctOpt, timeLimit: queTime ? queTime : null
  };

  if (editingQuestionId) {
    db.collection('rooms').doc(currentRoomId).collection('questions').doc(editingQuestionId).update(qData)
      .then(() => {
        alert("Question updated successfully! 🎯");
        closeAddQuestionBox();
        loadRoomQuestions();
      });
  } else {
    db.collection('users').doc(uid).get().then((userDoc) => {
      qData.creatorName = userDoc.exists ? userDoc.data().displayName : "Unknown";
      qData.creatorUid = uid;
      qData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      
      db.collection('rooms').doc(currentRoomId).collection('questions').add(qData)
        .then(() => {
          alert("Question added successfully! 🎯");
          closeAddQuestionBox();
          loadRoomQuestions();
        });
    });
  }
}

// ---------------------------------
// MCQ DISPLAY & LOGIC
// ---------------------------------
function toggleAuthorQuestions(divId) {
  let el = document.getElementById(divId);
  if(el.style.display === 'none') {
    el.style.display = 'block';
    if(!openAuthorFolders.includes(divId)) openAuthorFolders.push(divId);
  } else {
    el.style.display = 'none';
    openAuthorFolders = openAuthorFolders.filter(id => id !== divId);
  }
}

function loadRoomQuestions() {
  const container = document.getElementById('questionsListContainer');
  if(container.innerHTML.trim() === '') {
    container.innerHTML = '<p style="color: #888; font-size: 14px;">Loading questions...</p>';
  }

  let attemptedList = JSON.parse(localStorage.getItem(`attempted_${currentRoomId}`)) || [];

  db.collection('rooms').doc(currentRoomId).collection('questions').orderBy('createdAt', 'desc').get()
    .then((querySnapshot) => {
      container.innerHTML = '';
      if (querySnapshot.empty) {
        container.innerHTML = '<p style="color: #666; font-size: 14px;">No questions available yet.</p>';
        return;
      }

      let authorMap = {};
      querySnapshot.forEach((doc) => {
        let qData = doc.data();
        let qId = doc.id;
        
        if(attemptedList.includes(qId)) return;

        let author = qData.creatorName || "Unknown Author";
        if(!authorMap[author]) authorMap[author] = [];
        authorMap[author].push({ id: qId, ...qData });
      });

      if(Object.keys(authorMap).length === 0) {
        container.innerHTML = '<p style="color: #28a745; font-size: 15px; font-weight: bold;">🎉 Congratulations! You have successfully attempted all questions!</p>';
        return;
      }

      for(let author in authorMap) {
        let authorDivId = `author-section-${author.replace(/\s+/g, '_')}`;
        let isFolderOpen = openAuthorFolders.includes(authorDivId) ? 'block' : 'none';

        container.innerHTML += `
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px; text-align: left;">
            <h4 style="margin: 0 0 10px 0; color: #1a73e8; cursor: pointer;" onclick="toggleAuthorQuestions('${authorDivId}')">📁 MCQ by ${author} (${authorMap[author].length} Questions) 🔽</h4>
            <div id="${authorDivId}" style="display: ${isFolderOpen}; margin-top: 10px;">
              ${renderQuestionsHTML(authorMap[author])}
            </div>
          </div>
        `;
      }
    });
}

function renderQuestionsHTML(questionsArray) {
  let htmlString = '';
  const uid = auth.currentUser.uid;
  const isMeAdmin = currentRoomAdmins.includes(uid);

  questionsArray.forEach((q, index) => {
    let count = index + 1;
    let timeBadge = q.timeLimit ? `<span style="font-size: 11px; background: #ffeeba; color: #856404; padding: 3px 6px; border-radius: 4px; margin-left: 10px;">⏳ ${q.timeLimit}s</span>` : '';
    
    let controlBtns = '';
    if (q.creatorUid === uid || isMeAdmin) {
      controlBtns = `
        <div style="margin-bottom: 8px; display: flex; gap: 5px;">
          <button onclick="editQuestion('${q.id}')" style="background: #ffc107; color: black; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">✏️ Edit</button>
          <button onclick="deleteQuestion('${q.id}')" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">🗑️ Delete</button>
        </div>`;
    }

    htmlString += `
      <div id="q-card-${q.id}" style="background: #fdfdfd; padding: 12px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 10px;">
        ${controlBtns}
        <div id="mcq-box-${q.id}" style="display: block;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Q${count}. ${q.question} ${timeBadge}</p>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <button id="btn-${q.id}-A" class="quiz-opt-btn" onclick="checkAnswer('${q.id}', 'A', '${q.correct}')" style="padding: 8px; text-align: left; border: 1px solid #ccc; background: #f9f9f9; border-radius: 4px; cursor: pointer;">A) ${q.optionA}</button>
            <button id="btn-${q.id}-B" class="quiz-opt-btn" onclick="checkAnswer('${q.id}', 'B', '${q.correct}')" style="padding: 8px; text-align: left; border: 1px solid #ccc; background: #f9f9f9; border-radius: 4px; cursor: pointer;">B) ${q.optionB}</button>
            <button id="btn-${q.id}-C" class="quiz-opt-btn" onclick="checkAnswer('${q.id}', 'C', '${q.correct}')" style="padding: 8px; text-align: left; border: 1px solid #ccc; background: #f9f9f9; border-radius: 4px; cursor: pointer;">C) ${q.optionC}</button>
            <button id="btn-${q.id}-D" class="quiz-opt-btn" onclick="checkAnswer('${q.id}', 'D', '${q.correct}')" style="padding: 8px; text-align: left; border: 1px solid #ccc; background: #f9f9f9; border-radius: 4px; cursor: pointer;">D) ${q.optionD}</button>
          </div>
          <p id="feedback-${q.id}" style="margin: 10px 0 0 0; font-size: 13px; font-weight: bold; display: none;"></p>
        </div>
      </div>
    `;
  });
  return htmlString;
}

function checkAnswer(qId, selectedOpt, correctOpt) {
  const btnA = document.getElementById(`btn-${qId}-A`);
  const btnB = document.getElementById(`btn-${qId}-B`);
  const btnC = document.getElementById(`btn-${qId}-C`);
  const btnD = document.getElementById(`btn-${qId}-D`);
  const feedback = document.getElementById(`feedback-${qId}`);

  btnA.disabled = btnB.disabled = btnC.disabled = btnD.disabled = true;
  const clickedBtn = document.getElementById(`btn-${qId}-${selectedOpt}`);

  if (selectedOpt === correctOpt) {
    clickedBtn.style.background = "#d4edda";
    clickedBtn.style.borderColor = "#28a745";
    feedback.innerText = "✅ Correct Answer! Removed from pending list.";
    feedback.style.color = "#28a745";

    let attemptedList = JSON.parse(localStorage.getItem(`attempted_${currentRoomId}`)) || [];
    if(!attemptedList.includes(qId)) {
      attemptedList.push(qId);
      localStorage.setItem(`attempted_${currentRoomId}`, JSON.stringify(attemptedList));
    }
    
    setTimeout(() => { 
      const card = document.getElementById(`q-card-${qId}`);
      if(card) card.style.display = 'none'; 
    }, 1500);
    
  } else {
    clickedBtn.style.background = "#f8d7da";
    clickedBtn.style.borderColor = "#dc3545";
    document.getElementById(`btn-${qId}-${correctOpt}`).style.background = "#d4edda";
    document.getElementById(`btn-${qId}-${correctOpt}`).style.borderColor = "#28a745";

    feedback.innerText = "❌ Wrong Answer! (Saved to Revision)";
    feedback.style.color = "#dc3545";

    const cardHtml = document.getElementById(`q-card-${qId}`).innerHTML;
    if (!wrongQuestions.some(item => item.id === qId)) {
      wrongQuestions.push({ id: qId, html: cardHtml });
      localStorage.setItem('studyRoomWrong', JSON.stringify(wrongQuestions));
      updateRevisionCount();
    }
  }
  feedback.style.display = 'block';
}

// ---------------------------------
// REVISION SCREEN
// ---------------------------------
function openRevisionBox() {
  document.getElementById('dashboardScreen').style.display = 'none';
  document.getElementById('revisionScreen').style.display = 'block';
  const container = document.getElementById('revisionListContainer');
  container.innerHTML = '';

  if (wrongQuestions.length === 0) {
    container.innerHTML = '<p style="color: #666; font-size: 14px;">Your revision list is empty!</p>';
    return;
  }
  wrongQuestions.forEach((item, index) => {
    container.innerHTML += `
      <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dc3545; margin-bottom: 15px; text-align: left;">
        <p style="margin: 0 0 5px 0; font-size: 12px; color: #dc3545; font-weight: bold;">Revision Item #${index + 1}</p>
        ${item.html}
      </div>
    `;
  });
}

function closeRevisionBox() {
  document.getElementById('revisionScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
}

function updateRevisionCount() {
  document.getElementById('revCount').innerText = wrongQuestions.length;
}
