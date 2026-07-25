import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ============================================
// 1. FIREBASE CONFIG (Safe Init)
// ============================================
const firebaseConfig = {
 apiKey: "AIzaSyA7mApXDPGTslYlkPGLs5KaAjrjow8mmeQ",
 authDomain: "mariabot-513a0.firebaseapp.com",
 databaseURL: "https://mariabot-513a0-default-rtdb.firebaseio.com",
 projectId: "mariabot-513a0",
 storageBucket: "mariabot-513a0.firebasestorage.app",
 messagingSenderId: "573270167233",
 appId: "1:573270167233:web:606784d298e794f6de4e40",
 measurementId: "G-8VN79GL96N"
};

// Prevent duplicate initialization
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ============================================
// 2. LOAD UPDATES & COMMENTS
// ============================================
function loadUpdates() {
 const updatesRef = ref(db, 'updates');
 const updatesContainer = document.getElementById('updates-container');
 
 onValue(updatesRef, (snapshot) => {
  updatesContainer.innerHTML = '';
  
  if (!snapshot.exists()) {
   updatesContainer.innerHTML = '<p style="text-align: center; color: #555;">No updates posted yet.</p>';
   return;
  }
  
  // Convert object to array, sort by date descending
  const updates = [];
  snapshot.forEach(child => {
   updates.push({ id: child.key, ...child.val() });
  });
  updates.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Render HTML
  updates.forEach(update => {
   const dateObj = new Date(update.date).toLocaleDateString();
   let mediaHtml = '';
   
   if (update.mediaUrl) {
    if (update.mediaType === 'video') {
     mediaHtml = `<video src="${update.mediaUrl}" controls class="update-media"></video>`;
    } else {
     mediaHtml = `<img src="${update.mediaUrl}" alt="Update Image" class="update-media">`;
    }
   }
   
   // Render Comments
   let commentsHtml = '';
   if (update.comments) {
    const comments = Object.values(update.comments);
    comments.forEach(c => {
     commentsHtml += `
                        <div class="comment-item">
                            <span class="comment-email">${escapeHtml(c.email)}</span>
                            <p class="comment-text">${escapeHtml(c.text)}</p>
                        </div>
                    `;
    });
   }
   
   // Build Post
   updatesContainer.innerHTML += `
                <div class="update-post">
                    <h3>${escapeHtml(update.title)}</h3>
                    <p class="update-date"><i class="fas fa-calendar-alt"></i> ${dateObj}</p>
                    ${mediaHtml}
                    <p class="update-desc">${escapeHtml(update.description)}</p>
                    
                    <div class="comments-section">
                        <h4><i class="fas fa-comments"></i> Comments</h4>
                        <div class="comment-input-wrapper">
                            <input type="text" id="comment-${update.id}" class="comment-input" placeholder="Write a comment...">
                            <button class="comment-post-btn" onclick="postComment('${update.id}')">Post</button>
                        </div>
                        ${commentsHtml}
                    </div>
                </div>
            `;
  });
 });
}

// ============================================
// 3. POST COMMENT
// ============================================
window.postComment = function(updateId) {
 const input = document.getElementById(`comment-${updateId}`);
 const text = input.value.trim();
 const user = auth.currentUser;
 
 if (!text) return;
 if (!user) {
  alert("You must be logged in to comment.");
  return;
 }
 
 const commentsRef = ref(db, `updates/${updateId}/comments`);
 const newCommentRef = push(commentsRef);
 
 set(newCommentRef, {
  email: user.email,
  text: text,
  timestamp: Date.now()
 }).then(() => {
  input.value = ''; // Clear input
 }).catch(err => {
  alert("Failed to post comment: " + err.message);
 });
}

// ============================================
// 4. HELPER: ESCAPE HTML
// ============================================
function escapeHtml(text) {
 if (!text) return '';
 const d = document.createElement('div');
 d.textContent = text;
 return d.innerHTML;
}

// Start loading updates immediately
loadUpdates();