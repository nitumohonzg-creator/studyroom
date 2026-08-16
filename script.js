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

  // Firebase me Naya Account banana
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // User banne ke baad, uska Display Name Database me save karna
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
      // Form khali karna
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

  // Firebase se Verify karna
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      
      // Database se user ka 'Display Name' nikalna
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
  // Login/Signup screen ko chhupa do
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('authBox').style.display = 'none'; 

  // Dashboard ko dikhao
  document.getElementById('dashboardScreen').style.display = 'block';
  document.getElementById('welcomeText').innerText = "Welcome, " + userName + "!";
}

function logoutUser() {
  auth.signOut().then(() => {
    // Logout hone par wapas login screen dikhao
    document.getElementById('dashboardScreen').style.display = 'none';
    document.getElementById('authBox').style.display = 'block';
    toggleAuth('login');
  }).catch((error) => {
    alert("Error logging out: " + error.message);
  });
}

// 6. ROOM BANANE KA LOGIC (FIREBASE)
// Room banane wala dabba kholna aur band karna
function openCreateRoom() {
  document.getElementById('createRoomBox').style.display = 'block';
}

function closeCreateRoom() {
  document.getElementById('createRoomBox').style.display = 'none';
  document.getElementById('newRoomName').value = ''; // Input khali kar do
}

// Room ko actually Firebase me save karna
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

  // Pehle user ka Display Name nikalenge, fir room banayenge
  db.collection('users').doc(currentUser.uid).get().then((doc) => {
    const creatorName = doc.data().displayName;

    // Firebase 'rooms' collection me naya data save karna
    db.collection('rooms').add({
      roomName: roomName,
      creatorId: currentUser.uid,
      creatorName: creatorName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      members: [currentUser.uid] // Room banane wala automatically pehla member ban jayega
    })
    .then((roomRef) => {
      // Room banne ke baad ka success message
      alert("Mubarak ho! '" + roomName + "' room successfully ban gaya! 🎉");
      closeCreateRoom();
    })
    .catch((error) => {
      alert("Room banane me error aayi: " + error.message);
    });
  });
}
