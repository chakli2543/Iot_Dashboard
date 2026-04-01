document.addEventListener('DOMContentLoaded', function() {

// ============================================================
// FIREBASE CONFIG
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyD5a5n1j8aKxTHRfAfOOAdnXdSn8mkpGe8",
  authDomain: "smart-factory-iot-dashboard.firebaseapp.com",
  databaseURL: "https://smart-factory-iot-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-factory-iot-dashboard",
  storageBucket: "smart-factory-iot-dashboard.firebasestorage.app",
  messagingSenderId: "307396796776",
  appId: "1:307396796776:web:51d0bde6fc9c864187f6dd"
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.database();
const auth = firebase.auth();

// ============================================================
// LOGIN / AUTH
// ============================================================
const loginOverlay  = document.getElementById("loginOverlay");
const mainContent   = document.getElementById("mainContent");
const loginBtn      = document.getElementById("loginBtn");
const loginBtnText  = document.getElementById("loginBtnText");
const loginSpinner  = document.getElementById("loginSpinner");
const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError    = document.getElementById("loginError");
const logoutBtn     = document.getElementById("logoutBtn");

let dashboardInitialized = false;

function showDashboard() {
    loginOverlay.style.display = "none";
    mainContent.style.display  = "block";
    if (!dashboardInitialized) {
        dashboardInitialized = true;
        initDashboard();
    }
}

function showLogin() {
    dashboardInitialized = false;
    loginOverlay.style.display = "flex";
    mainContent.style.display  = "none";
    loginBtnText.textContent   = "Login";
    loginSpinner.style.display = "none";
    loginBtn.disabled          = false;
}

// Watch Firebase auth state
auth.onAuthStateChanged(function(user) {
    if (user) {
        showDashboard();
    } else {
        // Only show login if not already logged in via fallback
        if (!sessionStorage.getItem("sf_logged_in")) {
            showLogin();
        }
    }
});

// Login button handler
loginBtn.addEventListener("click", function() {
    const email    = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    loginError.textContent = "";

    if (!email || !password) {
        loginError.textContent = "Please enter both email and password.";
        return;
    }

    loginBtnText.textContent      = "Signing in...";
    loginSpinner.style.display    = "inline-block";
    loginBtn.disabled             = true;

    // Try Firebase Auth first
    auth.signInWithEmailAndPassword(email, password)
        .then(function(userCredential) {
            console.log("Firebase login successful:", userCredential.user.email);
            // onAuthStateChanged will call showDashboard()
        })
        .catch(function(err) {
            console.error("Firebase login error:", err.code, err.message);

            // ---- FALLBACK: works locally over file:// ----
            // If Firebase auth fails due to running locally (file://),
            // check credentials directly as a fallback.
            // IMPORTANT: Change these to your actual credentials!
            const LOCAL_EMAIL    = "smartfactory@gmail.com";
            const LOCAL_PASSWORD = "123456"; // <-- SET YOUR PASSWORD HERE

            if (email === LOCAL_EMAIL && password === LOCAL_PASSWORD) {
                console.log("Fallback login used (file:// mode)");
                sessionStorage.setItem("sf_logged_in", "true");
                showDashboard();
                return;
            }

            // Show the actual Firebase error code so user can diagnose
            loginError.textContent     = getFriendlyError(err.code);
            loginBtnText.textContent   = "Login";
            loginSpinner.style.display = "none";
            loginBtn.disabled          = false;
        });
});

// Enter key on password field
loginPassword.addEventListener("keydown", function(e) {
    if (e.key === "Enter") loginBtn.click();
});

// Logout
logoutBtn.addEventListener("click", function(e) {
    e.preventDefault();
    sessionStorage.removeItem("sf_logged_in");
    auth.signOut().catch(() => {});
    showLogin();
});

function getFriendlyError(code) {
    switch (code) {
        case "auth/invalid-email":          return "Invalid email address.";
        case "auth/user-not-found":         return "No account found with this email.";
        case "auth/wrong-password":         return "Incorrect password.";
        case "auth/invalid-credential":     return "Incorrect email or password.";
        case "auth/too-many-requests":      return "Too many attempts. Try again later.";
        case "auth/network-request-failed": return "Network error. Check your connection.";
        case "auth/operation-not-allowed":  return "Email/Password sign-in not enabled in Firebase Console.";
        case "auth/unauthorized-domain":    return "This domain is not authorized in Firebase. Open via a server, not file://.";
        default:                            return "Error: " + code;
    }
}

// ============================================================
// DASHBOARD LOGIC
// ============================================================
function initDashboard() {

    const toggleInputs   = document.querySelectorAll('.toggle-input');
    const controlCards   = document.querySelectorAll('.control-card');
    const toastContainer = document.getElementById('toastContainer');
    const powerOffBtn    = document.getElementById('powerOffBtn');
    const devices        = ["fan", "light", "conveyor", "plug"];

    // CONTROL → FIREBASE
    toggleInputs.forEach((input, index) => {
        input.addEventListener('change', function() {
            const card   = controlCards[index];
            const device = card.dataset.equipment;
            const isOn   = this.checked ? 1 : 0;
            db.ref("/" + device).set(isOn);
            if (isOn) {
                card.classList.add('on');
                showToast(device + " turned ON", "success");
            } else {
                card.classList.remove('on');
                showToast(device + " turned OFF", "info");
            }
        });
    });

    // FIREBASE → UI
    devices.forEach(device => {
        db.ref("/" + device).on("value", snapshot => {
            const value = snapshot.val();
            const card  = document.querySelector(`[data-equipment="${device}"]`);
            if (!card) return;
            const toggle = card.querySelector('.toggle-input');
            toggle.checked = value === 1;
            value === 1 ? card.classList.add('on') : card.classList.remove('on');
        });
    });

    // SENSOR DATA
    db.ref("/sensor").on("value", snapshot => {
        const data = snapshot.val();
        if (!data) return;
        document.getElementById("temp").textContent     = data.temperature + "°C";
        document.getElementById("humidity").textContent = data.humidity + "%";
    });

    // POWER OFF ALL
    powerOffBtn.addEventListener('click', function() {
        db.ref().update({ "/fan": 0, "/light": 0, "/conveyor": 0, "/plug": 0 });
        devices.forEach(device => {
            const card = document.querySelector(`[data-equipment="${device}"]`);
            if (card) {
                card.querySelector('.toggle-input').checked = false;
                card.classList.remove('on');
            }
        });
        showToast("All equipment powered OFF", "warning");
    });

    // CONTACT FORM
    const contactForm = document.querySelector('.contact-form');
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name    = this.querySelector('input').value;
        const message = this.querySelector('textarea').value;
        if (name && message) {
            alert("Thank you " + name + "! Message sent.");
            this.reset();
            showToast("Message sent successfully", "success");
        }
    });

    // SHOW ALL SECTIONS
    document.querySelectorAll("section").forEach(sec => sec.classList.add("visible"));

    // TOAST
    function showToast(message, type = "info") {
        const toast = document.createElement("div");
        toast.className   = "toast " + type;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

} // end initDashboard

});
