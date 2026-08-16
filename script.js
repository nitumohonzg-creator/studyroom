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
    alert("Sare fields bharna zaroori hai!");
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
      alert("Account successfully ban gaya! 🎉");
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
    alert("Email aur Password dalein!");
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
    alert("Room ka naam likhna zaroori hai!");
    return;
  }

  db.collection('users').doc(currentUser.uid).get().then((doc) => {
    db.collection('rooms').add({
      roomName: roomName,
      creatorId: currentUser.uid,
      creatorName: doc.data().displayName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      members: [currentUser.uid] 
    })
    .then(() => {
      alert("Room successfully ban gaya! 🎉");
      closeCreateRoom();
      loadMyRooms(); 
    });
  });
}

function joinRoomByFirebase() {
  const roomId = document.getElementById('joinRoomIdInput').value.trim();
  const currentUser = auth.currentUser;

  if(!roomId) {
    alert("Kripya Room ID dalein!");
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

      alert("Badhai ho! Aapne '" + roomData.roomName + "' room successfully join kar liya hai! 🎉");
      closeJoinRoom();
      enterRoom(doc.id, roomData.roomName);
    } else {
      alert("Galat Room ID! Aisi koi room maujood nahi hai.");
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
        container.innerHTML = '<p style="color: #666; font-size: 14px;">Koi room nahi mila.</p>';
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
  loadRoomMembers();
  loadRoomQuestions();
}

function backToDashboard() {
  document.getElementById('roomViewScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
  loadMyRooms();
}

function loadRoomMembers() {
  const container = document.getElementById('membersListContainer');
  container.innerHTML = '<p style="color: #666; font-size: 13px; margin: 0;">Loading members...</p>';

  db.collection('rooms').doc(currentRoomId).get().then((doc) => {
    if(!doc.exists) return;
    const members = doc.data().members || [];
    const creatorId = doc.data().creatorId;
    const currentUserId = auth.currentUser.uid;

    container.innerHTML = '';
    members.forEach((uid) => {
      db.collection('users').doc(uid).get().then((uDoc) => {
        const name = uDoc.exists ? uDoc.data().displayName : "Unknown";
        let removeBtn = "";

        if(creatorId === currentUserId && uid !== currentUserId) {
          removeBtn = `<button onclick="removeMember('${uid}')" style="background:#dc3545; color:white; border:none; padding:2px 6px; border-radius:3px; font-size:11px; cursor:pointer;">Remove</button>`;
        }

        container.innerHTML += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #e2e2e2; font-size: 13px;">
            <span>👤 ${name} ${uid === creatorId ? '(Admin)' : ''}</span>
            ${removeBtn}
          </div>
        `;
      });
    });
  });
}

function removeMember(memberUid) {
  db.collection('rooms').doc(currentRoomId).update({
    members: firebase.firestore.FieldValue.arrayRemove(memberUid)
  }).then(() => {
    alert("Member ko room se hata diya gaya hai.");
    loadRoomMembers();
  });
}

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
}

function saveQuestionToFirebase() {
  const queText = document.getElementById('queText').value.trim();
  const optA = document.getElementById('optA').value.trim();
  const optB = document.getElementById('optB').value.trim();
  const optC = document.getElementById('optC').value.trim();
  const optD = document.getElementById('optD').value.trim();
  const correctOpt = document.getElementById('correctOpt').value.trim().toUpperCase();
  const currentUser = auth.currentUser;

  if(!queText || !optA || !optB || !optC || !optD || !correctOpt) {
    alert("Sare fields bharna zaroori hai!");
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
      creatorName: creatorName,
      creatorUid: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      alert("Question add ho gaya! 🎯");
      closeAddQuestionBox();
      loadRoomQuestions();
    });
  });
}

// Group by Author (Creator Name) with Attempted Questions Filtering
function loadRoomQuestions() {
  const container = document.getElementById('questionsListContainer');
  container.innerHTML = '<p style="color: #888; font-size: 14px;">Loading questions...</p>';

  let attemptedList = JSON.parse(localStorage.getItem(`attempted_${currentRoomId}`)) || [];

  db.collection('rooms').doc(currentRoomId).collection('questions').orderBy('createdAt', 'desc').get()
    .then((querySnapshot) => {
      container.innerHTML = '';
      if (querySnapshot.empty) {
        container.innerHTML = '<p style="color: #666; font-size: 14px;">Abhi koi question nahi hai.</p>';
        return;
      }

      // Group questions by author name
      let authorMap = {};
      querySnapshot.forEach((doc) => {
        let qData = doc.data();
        let qId = doc.id;
        
        // Agar user ne ye question pehle hi sahi attempt kar liya hai, toh skip kar do
        if(attemptedList.includes(qId)) return;

        let author = qData.creatorName || "Unknown Author";
        if(!authorMap[author]) {
          authorMap[author] = [];
        }
        authorMap[author].push({ id: qId, ...qData });
      });

      if(Object.keys(authorMap).length === 0) {
        container.innerHTML = '<p style="color: #28a745; font-size: 15px; font-weight: bold;">🎉 Badhai ho! Aapne is room ke sabhi questions successfully attempt kar liye hain!</p>';
        return;
      }

      // Render author selection list
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

function renderQuestionsHTML(questionsArray) {
  let htmlString = '';
  questionsArray.forEach((q, index) => {
    let count = index + 1;
    htmlString += `
      <div id="q-card-${q.id}" style="background: #fdfdfd; padding: 12px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 10px;">
        <button id="start-btn-${q.id}" class="btn" style="padding: 6px 10px; font-size: 12px; margin: 0 0 8px 0; width: auto;" onclick="startQuiz('${q.id}')">Start MCQ Test</button>
        
        <div id="mcq-box-${q.id}" style="display: none;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Q${count}. ${q.question}</p>
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

function startQuiz(qId) {
  document.getElementById(`start-btn-${qId}`).style.display = 'none';
  document.getElementById(`mcq-box-${qId}`).style.display = 'block';
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
    feedback.innerText = "✅ Sahi Jawab! Question list se hata diya gaya hai.";
    feedback.style.color = "#28a745";

    // Sahi hone par question ko attempted list me daal do taaki wo gayab ho jaye
    let attemptedList = JSON.parse(localStorage.getItem(`attempted_${currentRoomId}`)) || [];
    if(!attemptedList.includes(qId)) {
      attemptedList.push(qId);
      localStorage.setItem(`attempted_${currentRoomId}`, JSON.stringify(attemptedList));
    }

    // Kuch der baad section ko refresh kar do taaki agar sab khatam ho toh author button bhi hat jaye
    setTimeout(() => {
      loadRoomQuestions();
    }, 1500);

  } else {
    clickedBtn.style.background = "#f8d7da";
    clickedBtn.style.borderColor = "#dc3545";
    
    const correctBtn = document.getElementById(`btn-${qId}-${correctOpt}`);
    correctBtn.style.background = "#d4edda";
    correctBtn.style.borderColor = "#28a745";

    feedback.innerText = "❌ Galat Jawab! (Revision me save kar liya gaya hai)";
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
    container.innerHTML = '<p style="color: #666; font-size: 14px;">Aapki revision list khali hai! Koi galat jawab nahi diya gaya.</p>';
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
