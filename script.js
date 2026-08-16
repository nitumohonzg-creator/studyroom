// Auth persistence fix: Logout button kaam karega
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ... (Baaki Firebase config same rahega) ...

// Logout Fix: Page refresh par logout nahi hoga
function logoutUser() {
  auth.signOut().then(() => {
    window.location.href = "index.html"; // Redirect to fresh page
  });
}

// Room Load karte waqt Members dikhana aur Remove option
function loadMembers(roomId) {
  db.collection('rooms').doc(roomId).get().then(doc => {
    const members = doc.data().members || [];
    const container = document.getElementById('membersList');
    container.innerHTML = '';
    
    members.forEach(uid => {
      // User ka naam fetch karo
      db.collection('users').doc(uid).get().then(u => {
        container.innerHTML += `
          <div>${u.data().displayName} 
            <button onclick="removeMember('${roomId}', '${uid}')">Remove</button>
          </div>`;
      });
    });
  });
}

function removeMember(roomId, uid) {
  db.collection('rooms').doc(roomId).update({
    members: firebase.firestore.FieldValue.arrayRemove(uid)
  }).then(() => loadMembers(roomId));
}

// MCQ Logic: Q dikhne se pehle "Start Quiz" button
function loadRoomQuestions() {
  db.collection('rooms').doc(currentRoomId).collection('questions').get().then(snap => {
    const cont = document.getElementById('questionsListContainer');
    cont.innerHTML = '';
    snap.forEach(doc => {
      const q = doc.data();
      // Pehle sirf Question text dikhao, click par MCQ khulega
      cont.innerHTML += `
        <div class="q-card">
          <p>Created by: ${q.creatorName || 'Unknown'}</p>
          <button onclick="showMCQ('${doc.id}')">Start Quiz</button>
          <div id="mcq-${doc.id}" style="display:none;">
            <p>${q.question}</p>
            <!-- Options buttons yahan render honge -->
          </div>
        </div>
      `;
    });
  });
}

function showMCQ(qId) {
  document.getElementById(`mcq-${qId}`).style.display = 'block';
}

// Check Answer aur Revision logic wahi rahega...
