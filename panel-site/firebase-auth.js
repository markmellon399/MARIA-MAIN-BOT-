import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
 getAuth,
 createUserWithEmailAndPassword,
 signInWithEmailAndPassword,
 onAuthStateChanged,
 signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
 getDatabase,
 ref,
 set,
 get,
 child
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ============================================
// 1. FIREBASE CONFIGURATION
// ============================================
// TODO: Replace with your actual Firebase project config
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ============================================
// 2. UI TOGGLE FUNCTION (Login <-> Signup)
// ============================================
window.toggleAuth = function(cardId) {
 document.getElementById('loginCard').classList.toggle('hidden', cardId !== 'loginCard');
 document.getElementById('signupCard').classList.toggle('hidden', cardId !== 'signupCard');
}

// ============================================
// 3. AUTH STATE LISTENER (Hides/Shows Dashboard)
// ============================================
onAuthStateChanged(auth, (user) => {
 if (user) {
  // User is logged in - Show Dashboard, Hide Auth
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-content').classList.remove('hidden');
  document.querySelectorAll('.app-only').forEach(el => el.classList.remove('hidden'));
  
  console.log("User logged in:", user.uid);
  
  // Auto-show support modal after 5 seconds of logging in
  setTimeout(() => {
   if (typeof openSupportModal === 'function') {
    openSupportModal();
   }
  }, 5000);
  
 } else {
  // User is logged out - Show Auth, Hide Dashboard
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('app-content').classList.add('hidden');
  document.querySelectorAll('.app-only').forEach(el => el.classList.add('hidden'));
  
  console.log("User logged out.");
 }
});

// ============================================
// 4. VERIFY PRIVATE KEY FUNCTION
// ============================================
async function verifyPrivateKey(key) {
 // We check if the key exists in the Realtime Database under 'adminKeys'
 const dbRef = ref(db);
 try {
  const snapshot = await get(child(dbRef, `adminKeys/${key}`));
  return snapshot.exists();
 } catch (error) {
  console.error("Error checking private key:", error);
  return false;
 }
}

// ============================================
// 5. SIGN UP HANDLER
// ============================================
window.handleSignup = async function() {
 const email = document.getElementById('signupEmail').value;
 const phone = document.getElementById('signupPhone').value;
 const password = document.getElementById('signupPassword').value;
 const privateKey = document.getElementById('signupPrivateKey').value;
 
 if (!email || !phone || !password || !privateKey) {
  alert("Please fill in all fields.");
  return;
 }
 
 try {
  // 1. Verify the 8-digit private key
  const isValidKey = await verifyPrivateKey(privateKey);
  if (!isValidKey) {
   alert("Invalid Private Key. Please contact the admin.");
   return;
  }
  
  // 2. Create the user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // 3. Save extra user info (phone number) to Realtime Database
  await set(ref(db, 'users/' + user.uid), {
   email: email,
   phone: phone,
   privateKey: privateKey,
   createdAt: new Date().toISOString()
  });
  
  alert("Account created successfully! Welcome to MARIA-MM.");
  
  // The onAuthStateChanged listener will automatically show the dashboard now.
  
 } catch (error) {
  console.error("Signup Error:", error);
  let errorMsg = error.message;
  if (error.code === 'auth/email-already-in-use') errorMsg = "This email is already registered.";
  if (error.code === 'auth/weak-password') errorMsg = "Password should be at least 6 characters.";
  alert(errorMsg);
 }
}

// ============================================
// 6. LOGIN HANDLER
// ============================================
window.handleLogin = async function() {
 const email = document.getElementById('loginEmail').value;
 const password = document.getElementById('loginPassword').value;
 const privateKey = document.getElementById('loginPrivateKey').value;
 
 if (!email || !password || !privateKey) {
  alert("Please fill in all fields.");
  return;
 }
 
 try {
  // 1. Verify the 8-digit private key before attempting login
  const isValidKey = await verifyPrivateKey(privateKey);
  if (!isValidKey) {
   alert("Invalid Private Key. Access denied.");
   return;
  }
  
  // 2. Log the user in
  await signInWithEmailAndPassword(auth, email, password);
  alert("Logged in successfully!");
  
  // The onAuthStateChanged listener will automatically show the dashboard now.
  
 } catch (error) {
  console.error("Login Error:", error);
  let errorMsg = error.message;
  if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
   errorMsg = "Invalid email or password.";
  }
  alert(errorMsg);
 }
}

// ============================================
// 7. LOGOUT HANDLER
// ============================================
window.handleLogout = function() {
 signOut(auth).then(() => {
  alert("Logged out successfully.");
 }).catch((error) => {
  console.error("Logout Error:", error);
 });
}

// Attach logout to the button
document.getElementById('logoutBtn')?.addEventListener('click', window.handleLogout);