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

  if(!name || !email || !password) {
    alert("All fields are required!");
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      return db.collection('users').doc(user.uid).set({
        displayName: name,
        email: email,
        totalScore: 0,
        joinedRooms: [] 
      });
    })
    .then(() => {
      alert("Account successfully created! 🎉");
      toggleAuth('login');
      document.getElementById('signupName').value = '';
      document.getElementById('signupEmail').value = '';
      document.getElementById('signupPassword').value = '';
    })
    .catch((error) => {
      alert("Error: " + error.message);
    });
}

function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if(!email || !password) {
    alert("Please enter both Email and Password!");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      db.collection('users').doc(user.uid).get().then((doc) => {
        if(doc.exists) {
          showDashboard(doc.data().displayName);
        }
      });
    })
    .catch((error) => {
      alert("Login Failed: " + error.message);
    });
}

// FORGOT PASSWORD
function forgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  if(!email) {
    alert("Please enter your email address in the box first!");
    return;
  }
  auth.sendPasswordResetEmail(email)
    .then(() => {
      alert("Password reset link has been sent to your email!");
    })
    .catch((error) => {
      alert("Error: " + error.message);
    });
}

function showDashboard(userName) {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('authBox').style.display = 'none'; 
  document.getElementById('roomViewScreen').style.display = 'none';
  document.getElementById('revisionScreen').style.display = 'none';

  document.getElementById('dashboardScreen').style.display = 'block';
  document.getElementById('welcomeText').innerText = "Welcome, " + userName + "!";
  loadMyRooms();
}

function logoutUser() {
  auth.signOut().then(() => {
    window.location.href = window.location.pathname;
  });
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
  const currentUser = auth.currentUser;

  if(!roomName) {
    alert("Room name is required!");
    return;
  }

  db.collection('users').doc(currentUser.uid).get().then((doc) => {
    db.collection('rooms').add({
      roomName: roomName,
      creatorId: currentUser.uid,
      creatorName: doc.data().displayName,
      admins: [currentUser.uid], // Set creator as first admin
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      members: [currentUser.uid] 
    })
    .then(() => {
      alert("Room successfully created! 🎉");
      closeCreateRoom();
      loadMyRooms(); 
    });
  });
}

function joinRoomByFirebase() {
  const roomId = document.getElementById('joinRoomIdInput').value.trim();
  const currentUser = auth.currentUser;

  if(!roomId) {
    alert("Please enter a Room ID!");
    return;
  }

  db.collection('rooms').doc(roomId).get().then((doc) => {
    if(doc.exists) {
      const roomData = doc.data();
      let membersList = roomData.members || [];
      if(!membersList.includes(currentUser.uid)) {
        membersList.push(currentUser.uid);
        db.collection('rooms').doc(roomId).update({ members: membersList });
      }

      alert("Congratulations! You joined '" + roomData.roomName + "'! 🎉");
      closeJoinRoom();
      enterRoom(doc.id, roomData.roomName);
    } else {
      alert("Invalid Room ID! Room not found.");
    }
  }).catch((error) => {
    alert("Error joining room: " + error.message);
  });
}

function loadMyRooms() {
  const currentUser = auth.currentUser;
  const container = document.getElementById('roomsListContainer');
  if(!currentUser) return;

  container.innerHTML = '<p style="color: #888; font-size: 14px;">Loading rooms...</p>';

  db.collection('rooms').where("members", "array-contains", currentUser.uid).get()
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

let currentRoomId = null;
let currentRoomName = null;

function enterRoom(roomId, roomName) {
  currentRoomId = roomId;
  currentRoomName = roomName;
  document.getElementById('dashboardScreen').style.display = 'none';
  document.getElementById('roomViewScreen').style.display = 'block';
  document.getElementById('roomTitleText').innerText = roomName;
  document.getElementById('editRoomBox').style.display = 'none'; // reset edit box
  loadRoomMembers();
  loadRoomQuestions();
}

function backToDashboard() {
  document.getElementById('roomViewScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
  loadMyRooms();
}

// -------------------------------
// NEW CONTROLS: SHARE, LEAVE, EDIT
// -------------------------------
function copyRoomId() {
  navigator.clipboard.writeText(currentRoomId).then(() => {
    alert("Room ID Copied: " + currentRoomId);
  }).catch(err => {
    alert("Failed to copy. Room ID is: " + currentRoomId);
  });
}

function leaveRoom() {
  const currentUser = auth.currentUser;
  if(confirm("Are you sure you want to leave this room?")) {
    db.collection('rooms').doc(currentRoomId).update({
      members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
      admins: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
    }).then(() => {
      alert("You have left the room.");
      backToDashboard();
    });
  }
}

function openEditRoom() {
  document.getElementById('editRoomBox').style.display = 'block';
  document.getElementById('editRoomNameInput').value = currentRoomName;
}

function closeEditRoom() {
  document.getElementById('editRoomBox').style.display = 'none';
}

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
    const creatorId = doc.data().creatorId;
    // Fallback for old rooms that don't have an admins array yet
    const admins = doc.data().admins || [creatorId]; 
    const currentUserId = auth.currentUser.uid;
    const isMeAdmin = admins.includes(currentUserId);

    // Show/Hide "Settings" button based on Admin status
    document.getElementById('editRoomBtn').style.display = isMeAdmin ? 'inline-block' : 'none';

    container.innerHTML = '';
    members.forEach((uid) => {
      db.collection('users').doc(uid).get().then((uDoc) => {
        const name = uDoc.exists ? uDoc.data().displayName : "Unknown";
        const isThisUserAdmin = admins.includes(uid);
        
        let actionBtns = "";

        // Current Admin can promote or remove regular members
        if(isMeAdmin && uid !== currentUserId) {
          let promoteBtn = isThisUserAdmin ? '' : `<button onclick="makeAdmin('${uid}')" style="background:#28a745; color:white; border:none; padding:3px 8px; border-radius:3px; font-size:11px; cursor:pointer; margin-right:5px;">Make Admin</button>`;
          let removeBtn = `<button onclick="removeMember('${uid}')" style="background:#dc3545; color:white; border:none; padding:3px 8px; border-radius:3px; font-size:11px; cursor:pointer;">Remove</button>`;
          actionBtns = promoteBtn + removeBtn;
        }

        let roleTag = isThisUserAdmin ? '🛡️ Admin' : '👤 Member';

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

function makeAdmin(memberUid) {
  if(confirm("Are you sure you want to make this member an Admin?")) {
    db.collection('rooms').doc(currentRoomId).update({
      admins: firebase.firestore.FieldValue.arrayUnion(memberUid)
    }).then(() => {
      alert("User promoted to Admin.");
      loadRoomMembers();
    });
  }
}

function removeMember(memberUid) {
  if(confirm("Are you sure you want to remove this member?")) {
    db.collection('rooms').doc(currentRoomId).update({
      members: firebase.firestore.FieldValue.arrayRemove(memberUid),
      admins: firebase.firestore.FieldValue.arrayRemove(memberUid)
    }).then(() => {
      alert("Member has been removed.");
      loadRoomMembers();
    });
  }
}

// -------------------------------
// MCQ SECTION
// -------------------------------
function openAddQuestionBox() {
  document.getElementById('addQuestionBox').style.display = 'block';
}

function closeAddQuestionBox() {
  document.getElementById('addQuestionBox').style.display = 'none';
  document.getElementById('queText').value = '';
  document.getElementById('optA').value = '';
  document.getElementById('optB').value = '';
  document.getElementById('optC').value = '';
  document.getElementById('optD').value = '';
  document.getElementById('correctOpt').value = '';
  document.getElementById('queTime').value = '';
}

function saveQuestionToFirebase() {
  const queText = document.getElementById('queText').value.trim();
  const optA = document.getElementById('optA').value.trim();
  const optB = document.getElementById('optB').value.trim();
  const optC = document.getElementById('optC').value.trim();
  const optD = document.getElementById('optD').value.trim();
  const correctOpt = document.getElementById('correctOpt').value.trim().toUpperCase();
  const queTime = document.getElementById('queTime').value.trim();
  const currentUser = auth.currentUser;

  if(!queText || !optA || !optB || !optC || !optD || !correctOpt) {
    alert("All fields (except Time Limit) are required!");
    return;
  }

  db.collection('users').doc(currentUser.uid).get().then((userDoc) => {
    const creatorName = userDoc.exists ? userDoc.data().displayName : "Unknown";

    db.collection('rooms').doc(currentRoomId).collection('questions').add({
      question: queText,
      optionA: optA,
      optionB: optB,
      optionC: optC,
      optionD: optD,
      correct: correctOpt,
      timeLimit: queTime ? queTime : null,
      creatorName: creatorName,
      creatorUid: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      alert("Question successfully added! 🎯");
      closeAddQuestionBox();
      loadRoomQuestions();
    });
  });
}

function loadRoomQuestions() {
  const container = document.getElementById('questionsListContainer');
  container.innerHTML = '<p style="color: #888; font-size: 14px;">Loading questions...</p>';

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
        if(!authorMap[author]) {
          authorMap[author] = [];
        }
        authorMap[author].push({ id: qId, ...qData });
      });

      if(Object.keys(authorMap).length === 0) {
        container.innerHTML = '<p style="color: #28a745; font-size: 15px; font-weight: bold;">🎉 Congratulations! You have successfully attempted all questions in this room!</p>';
        return;
      }

      for(let author in authorMap) {
        let authorDivId = `author-section-${author.replace(/\s+/g, '_')}`;
        container.innerHTML += `
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px; text-align: left;">
            <h4 style="margin: 0 0 10px 0; color: #1a73e8; cursor: pointer;" onclick="toggleAuthorQuestions('${authorDivId}')">📁 MCQ by ${author} (${authorMap[author].length} Questions) 🔽</h4>
            <div id="${authorDivId}" style="display: none; margin-top: 10px;">
              ${renderQuestionsHTML(authorMap[author])}
            </div>
          </div>
        `;
      }
    });
}

function toggleAuthorQuestions(divId) {
  let el = document.getElementById(divId);
  if(el.style.display === 'none') {
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

// IMPROVED UI: REMOVED START BUTTON, QUESTIONS LOAD DIRECTLY
function renderQuestionsHTML(questionsArray) {
  let htmlString = '';
  questionsArray.forEach((q, index) => {
    let count = index + 1;
    let timeBadge = q.timeLimit ? `<span style="font-size: 11px; background: #ffeeba; color: #856404; padding: 3px 6px; border-radius: 4px; margin-left: 10px;">⏳ ${q.timeLimit}s</span>` : '';
    
    htmlString += `
      <div id="q-card-${q.id}" style="background: #fdfdfd; padding: 12px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 10px;">
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

  btnA.disabled = true;
  btnB.disabled = true;
  btnC.disabled = true;
  btnD.disabled = true;

  const clickedBtn = document.getElementById(`btn-${qId}-${selectedOpt}`);

  if (selectedOpt === correctOpt) {
    clickedBtn.style.background = "#d4edda";
    clickedBtn.style.borderColor = "#28a745";
    feedback.innerText = "✅ Correct Answer! Removed from your pending list.";
    feedback.style.color = "#28a745";

    let attemptedList = JSON.parse(localStorage.getItem(`attempted_${currentRoomId}`)) || [];
    if(!attemptedList.includes(qId)) {
      attemptedList.push(qId);
      localStorage.setItem(`attempted_${currentRoomId}`, JSON.stringify(attemptedList));
    }

    setTimeout(() => {
      loadRoomQuestions();
    }, 1500);

  } else {
    clickedBtn.style.background = "#f8d7da";
    clickedBtn.style.borderColor = "#dc3545";
    
    const correctBtn = document.getElementById(`btn-${qId}-${correctOpt}`);
    correctBtn.style.background = "#d4edda";
    correctBtn.style.borderColor = "#28a745";

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

function openRevisionBox() {
  document.getElementById('dashboardScreen').style.display = 'none';
  document.getElementById('revisionScreen').style.display = 'block';
  
  const container = document.getElementById('revisionListContainer');
  container.innerHTML = '';

  if (wrongQuestions.length === 0) {
    container.innerHTML = '<p style="color: #666; font-size: 14px;">Your revision list is empty! No incorrect answers recorded.</p>';
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

