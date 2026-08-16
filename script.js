// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBSpX_DBpJlvGspjzVhAKOBXV-0376P7Ug",
  authDomain: "studyroom-20729.firebaseapp.com",
  projectId: "studyroom-20729",
  storageBucket: "studyroom-20729.firebasestorage.app",
  messagingSenderId: "772929165730",
  appId: "1:772929165730:web:866576fe222456c61fbafb"
};

// Firebase Initialize karna
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// 2. UI TOGGLE FUNCTION (Login/Signup Screen badalna)
function toggleAuth(type) {
  if(type === 'signup') {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
  } else {
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
  }
}

// 3. FIREBASE SIGNUP LOGIC
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

// 4. FIREBASE LOGIN LOGIC
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
          const userName = doc.data().displayName;
          showDashboard(userName);
        }
      });
    })
    .catch((error) => {
      alert("Login Failed: " + error.message);
    });
}

// 5. DASHBOARD SHOW KARNA AUR LOGOUT KARNA
function showDashboard(userName) {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('authBox').style.display = 'none'; 
  document.getElementById('roomViewScreen').style.display = 'none';

  document.getElementById('dashboardScreen').style.display = 'block';
  document.getElementById('welcomeText').innerText = "Welcome, " + userName + "!";
  
  loadMyRooms();
}

function logoutUser() {
  auth.signOut().then(() => {
    document.getElementById('dashboardScreen').style.display = 'none';
    document.getElementById('roomViewScreen').style.display = 'none';
    document.getElementById('authBox').style.display = 'block';
    toggleAuth('login');
  }).catch((error) => {
    alert("Error logging out: " + error.message);
  });
}

// 6. ROOM BANANE KA LOGIC
function openCreateRoom() {
  document.getElementById('createRoomBox').style.display = 'block';
}

function closeCreateRoom() {
  document.getElementById('createRoomBox').style.display = 'none';
  document.getElementById('newRoomName').value = ''; 
}

function saveRoomToFirebase() {
  const roomName = document.getElementById('newRoomName').value.trim();
  const currentUser = auth.currentUser;

  if(!roomName) {
    alert("Room ka naam likhna zaroori hai!");
    return;
  }

  if(!currentUser) {
    alert("Error: Aap login nahi hain!");
    return;
  }

  db.collection('users').doc(currentUser.uid).get().then((doc) => {
    const creatorName = doc.data().displayName;

    db.collection('rooms').add({
      roomName: roomName,
      creatorId: currentUser.uid,
      creatorName: creatorName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      members: [currentUser.uid] 
    })
    .then(() => {
      alert("Mubarak ho! '" + roomName + "' room successfully ban gaya! 🎉");
      closeCreateRoom();
      loadMyRooms(); 
    })
    .catch((error) => {
      alert("Room banane me error aayi: " + error.message);
    });
  });
}

// 7. ROOMS KI LIST FETCH KARNA
function loadMyRooms() {
  const currentUser = auth.currentUser;
  const container = document.getElementById('roomsListContainer');
  
  if(!currentUser) return;

  container.innerHTML = '<p style="color: #888; font-size: 14px;">Loading your rooms...</p>';

  db.collection('rooms').where("creatorId", "==", currentUser.uid).get()
    .then((querySnapshot) => {
      container.innerHTML = '';
      
      if (querySnapshot.empty) {
        container.innerHTML = '<p style="color: #666; font-size: 14px;">Abhi tak koi room nahi banaya. Upar "Create Room" par click karein!</p>';
        return;
      }

      querySnapshot.forEach((doc) => {
        const roomData = doc.data();
        const roomId = doc.id;

        const roomHtml = `
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="text-align: left;">
              <h4 style="margin: 0; color: #1a73e8;">${roomData.roomName}</h4>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Admin: ${roomData.creatorName}</p>
            </div>
            <button class="btn" style="width: auto; padding: 8px 12px; font-size: 14px; background-color: #1a73e8;" onclick="enterRoom('${roomId}', '${roomData.roomName}')">Enter Room</button>
          </div>
        `;
        
        container.innerHTML += roomHtml;
      });
    })
    .catch((error) => {
      container.innerHTML = '<p style="color: red; font-size: 14px;">Error: ' + error.message + '</p>';
    });
}

// 8. ROOM KE ANDAR JANE KA LOGIC
let currentRoomId = null;
let currentRoomName = null;

function enterRoom(roomId, roomName) {
  currentRoomId = roomId;
  currentRoomName = roomName;

  document.getElementById('dashboardScreen').style.display = 'none';
  document.getElementById('roomViewScreen').style.display = 'block';
  document.getElementById('roomTitleText').innerText = roomName;

  loadRoomQuestions();
}

function backToDashboard() {
  document.getElementById('roomViewScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
  currentRoomId = null;
  currentRoomName = null;
  loadMyRooms();
}

// 9. MCQ QUESTION ADD KARNA
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

  if(correctOpt !== 'A' && correctOpt !== 'B' && correctOpt !== 'C' && correctOpt !== 'D') {
    alert("Correct answer me sirf A, B, C, ya D likhein!");
    return;
  }

  db.collection('rooms').doc(currentRoomId).collection('questions').add({
    question: queText,
    optionA: optA,
    optionB: optB,
    optionC: optC,
    optionD: optD,
    correct: correctOpt,
    addedBy: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    alert("Question successfully add ho gaya! 🎯");
    closeAddQuestionBox();
    loadRoomQuestions();
  })
  .catch((error) => {
    alert("Error saving question: " + error.message);
  });
}

function loadRoomQuestions() {
  const container = document.getElementById('questionsListContainer');
  container.innerHTML = '<p style="color: #888; font-size: 14px;">Loading questions...</p>';

  db.collection('rooms').doc(currentRoomId).collection('questions').orderBy('createdAt', 'desc').get()
    .then((querySnapshot) => {
      container.innerHTML = '';
      
      if (querySnapshot.empty) {
        container.innerHTML = '<p style="color: #666; font-size: 14px;">Is room me abhi koi question nahi hai. "Add MCQ Question" par click karke pehla question banayein!</p>';
        return;
      }

      let count = 1;
      querySnapshot.forEach((doc) => {
        const q = doc.data();
        const qHtml = `
          <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 10px; text-align: left;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #333;">Q${count}. ${q.question}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #555;">A) ${q.optionA}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #555;">B) ${q.optionB}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #555;">C) ${q.optionC}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #555;">D) ${q.optionD}</p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #1a73e8; font-weight: bold;">Correct Answer: ${q.correct}</p>
          </div>
        `;
        container.innerHTML += qHtml;
        count++;
      });
    })
    .catch((error) => {
      container.innerHTML = '<p style="color: red; font-size: 14px;">Error loading questions: ' + error.message + '</p>';
    });
}
