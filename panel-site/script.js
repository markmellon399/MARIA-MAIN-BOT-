async function startBot() {
 const sessionIdInput = document.getElementById('sessionId');
 const resultDiv = document.getElementById('result');
 const startBtn = document.getElementById('startBtn');
 
 const sessionId = sessionIdInput.value.trim();
 
 if (!sessionId || sessionId.length < 20) {
  showError('Invalid Session ID. Please make sure you copied the entire string.');
  return;
 }
 
 // Set Loading State
 startBtn.classList.add('loading');
 startBtn.disabled = true;
 resultDiv.classList.add('hidden');
 resultDiv.innerHTML = '';
 
 try {
  // Send POST request to our panel.ts backend
  const response = await fetch('/api/start-bot', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ sessionId: sessionId })
  });
  
  const data = await response.json();
  
  if (response.ok && data.success) {
   // Success
   resultDiv.innerHTML = `
                <div class="result-success">
                    <h3><i class="fas fa-check-circle"></i> Bot Deployed Successfully!</h3>
                    <p>Your MARIA-MM instance is now starting up and connecting to WhatsApp.</p>
                    <p>You can now close this page and use your bot. Type <code>.menu</code> in WhatsApp to test it!</p>
                </div>
            `;
   resultDiv.classList.remove('hidden');
  } else {
   // Server returned an error
   throw new Error(data.error || 'Failed to start bot.');
  }
 } catch (error) {
  showError(error.message);
 } finally {
  // Reset Loading State
  startBtn.classList.remove('loading');
  startBtn.disabled = false;
 }
}

function showError(message) {
 const resultDiv = document.getElementById('result');
 resultDiv.innerHTML = `
        <div class="result-error">
            <h3><i class="fas fa-times-circle"></i> Deployment Failed</h3>
            <p>${message}</p>
        </div>
    `;
 resultDiv.classList.remove('hidden');
}

// ============================================
// 📊 LIVE DASHBOARD UPDATES
// ============================================
async function updateDashboard() {
 // 1. Stop if the dashboard is hidden (user not logged in)
 const dashboard = document.getElementById('dashboard');
 if (!dashboard || dashboard.classList.contains('hidden')) {
  return;
 }
 
 // 2. Prevent DOMException if opened as a local file
 if (window.location.protocol === 'file:') {
  console.warn('Please run the server using "npm start" and open http://localhost:7700');
  return;
 }
 
 try {
  // Fetch active bots and real server stats from backend
  const response = await fetch('/api/bots');
  const data = await response.json().catch(() => ({ total: 0, bots: [], ram: 0, cpu: 0 }));
  
  // Update stats
  document.getElementById('activeBotsCount').innerText = data.total || 0;
  
  // Real stats from backend (no more mock data!)
  document.getElementById('ramUsage').innerText = (data.ram || 0) + '%';
  document.getElementById('cpuUsage').innerText = (data.cpu || 0) + '%';
  
  // Update table
  const tbody = document.getElementById('botsTableBody');
  if (tbody) {
   if (data.total > 0) {
    tbody.innerHTML = data.bots.map(bot => `
                    <tr>
                        <td style="font-family: 'JetBrains Mono', monospace; color: #00ffcc;">${bot.id}</td>
                        <td><span class="status-badge"><i class="fas fa-circle"></i> Online</span></td>
                        <td><button class="stop-btn"><i class="fas fa-stop"></i> Stop</button></td>
                    </tr>
                `).join('');
   } else {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No active bots deployed yet.</td></tr>';
   }
  }
 } catch (err) {
  console.error('Failed to update dashboard:', err);
 }
}

// Update dashboard every 5 seconds
setInterval(updateDashboard, 5000);
updateDashboard(); // Initial call on load

// ============================================
// 📄 PAGE NAVIGATION (SPA Routing)
// ============================================
window.showPage = function(pageId, event) {
 // Hide all main sections explicitly
 document.getElementById('dashboard').classList.add('hidden');
 document.getElementById('updates-section').classList.add('hidden');
 document.getElementById('guide').classList.add('hidden');
 
 // Show the selected one explicitly
 if (pageId === 'dashboard') {
  document.getElementById('dashboard').classList.remove('hidden');
 } else if (pageId === 'updates') {
  document.getElementById('updates-section').classList.remove('hidden');
 } else if (pageId === 'guide') {
  document.getElementById('guide').classList.remove('hidden');
 }
 
 // Update active nav link
 document.querySelectorAll('.nav-link.app-only').forEach(link => {
  link.classList.remove('active');
 });
 
 // Add active class to the clicked link (if event exists)
 if (event && event.currentTarget) {
  event.currentTarget.classList.add('active');
 }
}
// ============================================
// 💖 SUPPORT MODAL LOGIC
// ============================================
window.openSupportModal = function() {
 document.getElementById('supportModal').classList.add('active');
}

window.closeSupportModal = function() {
 document.getElementById('supportModal').classList.remove('active');
}

// Close modal if user clicks outside the card
window.onclick = function(event) {
 const modal = document.getElementById('supportModal');
 if (event.target == modal) {
  closeSupportModal();
 }
}

// ============================================
// 💳 PAYMENT API PLACEHOLDER
// ============================================
window.initiatePayment = function(method) {
 // TODO: Connect your Payment API (e.g., Flutterwave, Stripe, Paystack)
 
 if (method === 'MTN') {
  alert("Redirecting to MTN MoMo API... (Placeholder)");
  // window.location.href = "YOUR_FLUTTERWAVE_MTN_LINK";
 }
 else if (method === 'AIRTEL') {
  alert("Redirecting to Airtel Money API... (Placeholder)");
  // window.location.href = "YOUR_FLUTTERWAVE_AIRTEL_LINK";
 }
 else if (method === 'CARD') {
  alert("Redirecting to Card Payment API... (Placeholder)");
  // window.location.href = "YOUR_STRIPE_CHECKOUT_LINK";
 }
}
// ============================================
// 📜 POLICY MODAL LOGIC
// ============================================
window.openPolicyModal = function() {
 document.getElementById('policyModal').classList.add('active');
}

window.closePolicyModal = function() {
 document.getElementById('policyModal').classList.remove('active');
}

// Close policy modal if user clicks outside the card
window.onclick = function(event) {
 const policyModal = document.getElementById('policyModal');
 if (event.target == policyModal) {
  closePolicyModal();
 }
}