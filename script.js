// 1. FIREBASE CONFIGURATION
// TODO: Apne Firebase Project Settings se config copy karke yahan replace karein
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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
        joinedRooms: [] // Future me room features ke liye
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
          alert("Welcome back, " + userName + "! 🚀");
          // Yahan hum next step me user ko uske "Dashboard" par bhejenge
        }
      });
    })
    .catch((error) => {
      alert("Login Failed: " + error.message);
    });
}
