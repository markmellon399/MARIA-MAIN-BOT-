// ============================================
// INDEPENDENT MARIA BOT ANALYTICS MODULE
// Saves all data securely under /siteanalytics
// ============================================

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, runTransaction, onDisconnect, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ============================================
// 1. FIREBASE CONFIG (FIXED TYPO: comma to semicolon)
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
}; // <-- FIXED: Changed the comma to a semicolon here!

// Safe initialization
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);

const ROOT_NODE = 'siteanalytics'; 

// ============================================
// 2. HELPER DETECTION FUNCTIONS
// ============================================
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let name = "Unknown", version = "Unknown";
    if (ua.includes("Firefox/")) { name = "Firefox"; version = ua.split("Firefox/")[1]; }
    else if (ua.includes("Edg/")) { name = "Edge"; version = ua.split("Edg/")[1]; }
    else if (ua.includes("OPR/") || ua.includes("Opera")) { name = "Opera"; version = ua.split("OPR/")[1]; }
    else if (ua.includes("Chrome/")) { name = "Chrome"; version = ua.split("Chrome/")[1].split(" ")[0]; }
    else if (ua.includes("Safari/") && !ua.includes("Chrome")) { name = "Safari"; version = ua.split("Version/")[1]?.split(" ")[0]; }
    else if (ua.includes("SamsungBrowser/")) { name = "Samsung Browser"; version = ua.split("SamsungBrowser/")[1]; }
    return { name, version: version.split(".")[0] };
}

function getOSInfo() {
    const ua = navigator.userAgent;
    if (ua.includes("Windows NT 10")) return "Windows 10/11";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac OS")) return "macOS";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    if (ua.includes("CrOS")) return "ChromeOS";
    if (ua.includes("Linux")) return "Linux";
    return "Unknown";
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    let type = "Desktop";
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) type = "Tablet";
    else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) type = "Mobile";
    return { type, width: screen.width, height: screen.height, pixelRatio: window.devicePixelRatio };
}

function getTrafficSource() {
    const referrer = document.referrer;
    if (!referrer) return "Direct";
    if (referrer.includes("google")) return "Google Organic";
    if (referrer.includes("facebook") || referrer.includes("fb.com")) return "Facebook";
    if (referrer.includes("instagram")) return "Instagram";
    if (referrer.includes("tiktok")) return "TikTok";
    if (referrer.includes("whatsapp")) return "WhatsApp";
    if (referrer.includes("telegram") || referrer.includes("t.me")) return "Telegram";
    if (referrer.includes("twitter") || referrer.includes("x.com")) return "Twitter/X";
    if (referrer.includes("youtube")) return "YouTube";
    return "Referral";
}

function getUTMData() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    if (params.get('utm_source')) utm.source = params.get('utm_source');
    if (params.get('utm_medium')) utm.medium = params.get('utm_medium');
    if (params.get('utm_campaign')) utm.campaign = params.get('utm_campaign');
    return utm;
}

function safeKey(str) {
    return str.replace(/\./g, '_').replace(/\//g, '_').replace(/#/g, '_');
}

// ============================================
// 3. ADVANCED TRACKING SETUP
// ============================================

// A. Track JavaScript Errors
function setupErrorTracking() {
    window.addEventListener('error', (e) => {
        if (e.target !== window) return; 
        push(ref(db, `${ROOT_NODE}/errors`), {
            message: (e.message || 'Unknown').substring(0, 200),
            file: (e.filename || '').substring(0, 100),
            line: e.lineno,
            page: safeKey(location.pathname),
            timestamp: Date.now()
        });
    });
    window.addEventListener('unhandledrejection', (e) => {
        push(ref(db, `${ROOT_NODE}/errors`), {
            message: String(e.reason).substring(0, 200),
            type: 'Promise_Rejection',
            page: safeKey(location.pathname),
            timestamp: Date.now()
        });
    });
}

// B. Track Form Submissions
function setupFormTracking() {
    document.addEventListener('submit', (e) => {
        const form = e.target;
        if (!form) return;
        const formId = form.id || form.action || 'unknown_form';
        push(ref(db, `${ROOT_NODE}/forms`), {
            formId: safeKey(formId.substring(0, 100)),
            page: safeKey(location.pathname),
            timestamp: Date.now()
        });
    });
}

// C. Track Clicks (Added Per Your Request)
function setupClickTracking(pageKey) {
    let clickCount = 0;
    let flushTimer = null;

    document.addEventListener('click', (e) => {
        clickCount++;
        
        // Optional: Log what they clicked (Button, Link, Image, etc.)
        const tag = e.target.tagName;
        const id = e.target.id ? `#${e.target.id}` : '';
        const cls = e.target.className ? `.${String(e.target.className).split(' ')[0]}` : '';
        
        // Debounce: Wait 1 second before sending to Firebase to prevent spam if they click 50 times fast
        if (!flushTimer) {
            flushTimer = setTimeout(async () => {
                if (clickCount > 0 && db) {
                    try {
                        // Add to specific page clicks
                        await runTransaction(ref(db, `${ROOT_NODE}/pages/${pageKey}/clicks`), (cur) => (cur || 0) + clickCount);
                        // Add to total website traffic clicks
                        await runTransaction(ref(db, `${ROOT_NODE}/aggregations/traffic/total_clicks`), (cur) => (cur || 0) + clickCount);
                        
                        // Log the specific element clicked (limited to save DB space)
                        push(ref(db, `${ROOT_NODE}/clicks`), {
                            element: `${tag}${id}${cls}`.substring(0, 50),
                            page: pageKey,
                            timestamp: Date.now()
                        });
                    } catch (err) {
                        console.warn("[Analytics] Click save failed:", err);
                    }
                    clickCount = 0;
                    flushTimer = null;
                }
            }, 1000); // Flush clicks every 1 second
        }
    }, { capture: true, passive: true }); 
}

// D. Track Presence (Online Users)
function setupPresence(visitorId) {
    const userStatusRef = ref(db, `${ROOT_NODE}/active_users/${visitorId}`);
    
    set(userStatusRef, {
        online: true,
        lastSeen: serverTimestamp(),
        page: safeKey(location.pathname)
    });

    onDisconnect(userStatusRef).set({
        online: false,
        lastSeen: serverTimestamp()
    });

    const activeUsersRef = ref(db, `${ROOT_NODE}/active_users`);
    onValue(activeUsersRef, (snap) => {
        let onlineCount = 0;
        snap.forEach(child => { if (child.val().online) onlineCount++; });
        set(ref(db, `${ROOT_NODE}/aggregations/visitors/online`), onlineCount);
    });
}

// E. Track Page Activity (Scroll & Time)
function setupActivityTracking(pageKey) {
    let maxScroll = 0;
    let startTime = Date.now();

    window.addEventListener('scroll', () => {
        const scrollPercent = Math.round(((window.innerHeight + window.scrollY) / document.body.offsetHeight) * 100);
        if (scrollPercent > maxScroll) maxScroll = scrollPercent;
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveActivityData(pageKey, maxScroll, startTime);
        } else if (document.visibilityState === 'visible') {
            startTime = Date.now(); 
        }
    });

    window.addEventListener('beforeunload', () => {
        saveActivityData(pageKey, maxScroll, startTime);
    });
}

async function saveActivityData(pageKey, maxScroll, startTime) {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    if (timeSpent < 1) return; 

    try {
        await runTransaction(ref(db, `${ROOT_NODE}/pages/${pageKey}/total_time`), (cur) => (cur || 0) + timeSpent);
        await runTransaction(ref(db, `${ROOT_NODE}/pages/${pageKey}/max_scroll`), (cur) => Math.max(cur || 0, maxScroll));
        await runTransaction(ref(db, `${ROOT_NODE}/pages/${pageKey}/exits`), (cur) => (cur || 0) + 1);
    } catch (e) {
        console.warn("[Analytics] Could not save exit data:", e);
    }
}

// ============================================
// 4. MAIN TRACKING ENGINE
// ============================================
async function trackAnalytics() {
    let visitorId = localStorage.getItem('maria_vid');
    let isNewVisitor = false;
    
    if (!visitorId) {
        visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        localStorage.setItem('maria_vid', visitorId);
        isNewVisitor = true;
    }
    
    const browser = getBrowserInfo();
    const os = getOSInfo();
    const device = getDeviceInfo();
    const source = getTrafficSource();
    const utm = getUTMData();
    
    // FIX: 'location' is a reserved browser word. Renamed to 'geoLocation'
    let geoLocation = { country: "Unknown", city: "Unknown", isp: "Unknown" };
    
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
            const data = await res.json();
            geoLocation.country = data.country_name || "Unknown";
            geoLocation.city = data.city || "Unknown";
            geoLocation.isp = data.org || "Unknown";
        }
    } catch (e) { /* Silent fail */ }
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekStr = now.getFullYear() + "-W" + String(Math.ceil(now.getDate() / 7)).padStart(2, '0');
    const monthStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, '0');
    
    await push(ref(db, `${ROOT_NODE}/raw_visits`), {
        vid: visitorId,
        timestamp: Date.now(),
        date: todayStr,
        isNew: isNewVisitor,
        browser: browser.name,
        browserVersion: browser.version,
        os: os,
        device: device.type,
        screen: `${device.width}x${device.height}`,
        country: geoLocation.country,
        city: geoLocation.city,
        isp: geoLocation.isp,
        source: source,
        utm: utm,
        page: safeKey(location.pathname.split("/").pop() || "index"), // This now safely uses the browser's URL
        url: window.location.href // FIX: Explicitly use window.location to get the page URL
    });
    
    const tx = (path) => runTransaction(ref(db, path), (cur) => (cur || 0) + 1);
    
    await tx(`${ROOT_NODE}/aggregations/visitors/total`);
    if (isNewVisitor) await tx(`${ROOT_NODE}/aggregations/visitors/new`);
    else await tx(`${ROOT_NODE}/aggregations/visitors/returning`);
    
    await tx(`${ROOT_NODE}/aggregations/visitors/daily/${todayStr}`);
    await tx(`${ROOT_NODE}/aggregations/visitors/weekly/${weekStr}`);
    await tx(`${ROOT_NODE}/aggregations/visitors/monthly/${monthStr}`);
    
    await tx(`${ROOT_NODE}/aggregations/devices/${device.type}`);
    await tx(`${ROOT_NODE}/aggregations/browsers/${browser.name}`);
    await tx(`${ROOT_NODE}/aggregations/os/${os}`);
    
    // Use geoLocation for country/city
    await tx(`${ROOT_NODE}/aggregations/geo/${safeKey(geoLocation.country)}`);
    await tx(`${ROOT_NODE}/aggregations/cities/${safeKey(geoLocation.city)}`);
    
    const sourceKey = utm.source ? `utm_${safeKey(utm.source)}` : safeKey(source);
    await tx(`${ROOT_NODE}/aggregations/traffic/${sourceKey}`);
    
    await tx(`${ROOT_NODE}/pages/${safeKey(location.pathname.split("/").pop() || "index")}/views`);
    if (isNewVisitor) await tx(`${ROOT_NODE}/pages/${safeKey(location.pathname.split("/").pop() || "index")}/unique_views`);
    
    if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
        await tx(`${ROOT_NODE}/pages/${safeKey(location.pathname.split("/").pop() || "index")}/refreshes`);
    }
    
    // 7. Initialize ALL Background Trackers
    setupPresence(visitorId);
    setupActivityTracking(safeKey(location.pathname.split("/").pop() || "index"));
    setupErrorTracking();
    setupFormTracking();
    setupClickTracking(safeKey(location.pathname.split("/").pop() || "index"));
    
    console.log(`✅ [${ROOT_NODE}] Tracked: ${safeKey(location.pathname.split("/").pop() || "index")} | Device: ${device.type} | Loc: ${geoLocation.city}`);
}

// ============================================
// 5. AUTO-START
// ============================================
trackAnalytics();