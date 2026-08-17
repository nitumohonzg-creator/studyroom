// 1. APNI FIREBASE CONFIG YAHAN DAALEIN
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "123456789",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentRoomId = null;

// ==========================================
// SCREEN TOGGLE FUNCTION
// ==========================================
function showScreen(screenId) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('room-screen').style.display = 'none';
    document.getElementById(screenId).style.display = 'block';
}

// ==========================================
// 🌟 FIX 1: PAGE REFRESH HONA (Auth Listener)
// ==========================================
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('user-email').innerText = user.email;
        loadRooms();
        
        // Agar URL mein #room nahi hai, toh Dashboard par bhej do
        if (window.location.hash !== '#room') {
            window.location.hash = '#dashboard';
        } else if (window.location.hash === '#room' && !currentRoomId) {
            // Agar room me refresh kiya lekin memory clear ho gayi
            window.location.hash = '#dashboard';
        }
    } else {
        window.location.hash = ''; // Link clear karo
        showScreen('auth-screen');
    }
});

// ==========================================
// 🌟 FIX 2: MOBILE BACK BUTTON FIX (Hash Routing)
// ==========================================
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#dashboard') {
        currentRoomId = null; // Room se exit ho gaye
        showScreen('dashboard-screen');
    } else if (window.location.hash === '#room') {
        if (currentRoomId) {
            showScreen('room-screen');
        } else {
            window.location.hash = '#dashboard'; // Galti se room me aya toh wapas bhejo
        }
    } else if (window.location.hash === '') {
        if (auth.currentUser) {
            showScreen('dashboard-screen');
        } else {
            showScreen('auth-screen');
        }
    }
});

function goBackToDashboard() {
    // Yeh code mobile back button jaisa hi kaam karta hai
    window.history.back(); 
}


// ==========================================
// AUTHENTICATION LOGIC
// ==========================================
function signupUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(email, password)
        .catch((error) => document.getElementById('auth-error').innerText = error.message);
}

function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => document.getElementById('auth-error').innerText = error.message);
}

function logoutUser() {
    auth.signOut();
}

// ==========================================
// ROOMS LOGIC
// ==========================================
function createRoom() {
    const roomName = document.getElementById('room-name').value;
    if (roomName.trim() === "") return alert("Room ka naam daalein!");
    
    db.ref('rooms').push({
        name: roomName,
        creator: auth.currentUser.uid
    });
    document.getElementById('room-name').value = "";
}

function loadRooms() {
    db.ref('rooms').on('value', (snapshot) => {
        const roomsList = document.getElementById('rooms-list');
        roomsList.innerHTML = "";
        
        snapshot.forEach((child) => {
            const room = child.val();
            roomsList.innerHTML += `
                <div class="room-card">
                    <h4>${room.name}</h4>
                    <button onclick="joinRoom('${child.key}', '${room.name}')">Join Room</button>
                </div>
            `;
        });
    });
}

function joinRoom(roomId, roomName) {
    currentRoomId = roomId;
    document.getElementById('current-room-name').innerText = roomName;
    loadMCQs();
    window.location.hash = '#room'; // Hash change hoga aur Room screen khul jayegi
}


// ==========================================
// MCQ & CSV LOGIC
// ==========================================
function addMCQ() {
    const q = document.getElementById('question').value;
    const opt1 = document.getElementById('option1').value;
    const opt2 = document.getElementById('option2').value;
    const ans = document.getElementById('correct-ans').value;

    if (!q || !opt1 || !opt2 || !ans) return alert("Saari details bharein!");

    db.ref(`rooms/${currentRoomId}/mcqs`).push({
        question: q,
        option1: opt1,
        option2: opt2,
        answer: ans
    });

    document.getElementById('question').value = "";
    document.getElementById('option1').value = "";
    document.getElementById('option2').value = "";
    document.getElementById('correct-ans').value = "";
}

function loadMCQs() {
    db.ref(`rooms/${currentRoomId}/mcqs`).on('value', (snapshot) => {
        const mcqList = document.getElementById('mcq-list');
        mcqList.innerHTML = "";
        
        snapshot.forEach((child) => {
            const mcq = child.val();
            mcqList.innerHTML += `
                <div class="mcq-card">
                    <p><strong>Q: ${mcq.question}</strong></p>
                    <p>1. ${mcq.option1}</p>
                    <p>2. ${mcq.option2}</p>
                    <p><i>Ans: ${mcq.answer}</i></p>
                </div>
            `;
        });
    });
}

// 🌟 BULK CSV UPLOAD LOGIC
function uploadCSV() {
    if (!currentRoomId) return alert("Pehle koi Room join karein!");
    
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) return alert("Pehle ek CSV file select karein!");

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n'); // Har line ko alag karein

        let count = 0;

        // 1st row heading hoti hai, isliye i=1 se shuru
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (row) {
                // Comma (,) se columns ko alag karein
                const columns = row.split(','); 
                
                if (columns.length >= 4) {
                    const q = columns[0].trim();
                    const opt1 = columns[1].trim();
                    const opt2 = columns[2].trim();
                    const ans = columns[3].trim();

                    // Firebase mein Push karein
                    db.ref(`rooms/${currentRoomId}/mcqs`).push({
                        question: q,
                        option1: opt1,
                        option2: opt2,
                        answer: ans
                    });
                    count++;
                }
            }
        }
        
        alert(`Success! Total ${count} questions upload ho gaye.`);
        fileInput.value = ""; // Box clear karein
    };
    
    reader.readAsText(file);
}
