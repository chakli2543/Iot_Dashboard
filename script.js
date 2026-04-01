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
const db = firebase.database();

// ============================================================
// LOGIN CREDENTIALS — Change these to your email and password
// ============================================================
const VALID_EMAIL    = "smartfactory@gmail.com";
const VALID_PASSWORD = "your_password_here"; // <-- SET YOUR PASSWORD

// ============================================================
// DOM ELEMENTS
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

// ============================================================
// CHECK SESSION — stay logged in on page refresh
// ============================================================
if (sessionStorage.getItem("sf_auth") === "true") {
    showDashboard();
} else {
    showLogin();
}

// ============================================================
// LOGIN BUTTON
// ============================================================
loginBtn.addEventListener("click", function () {
    const email    = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    loginError.textContent = "";

    if (!email || !password) {
        loginError.textContent = "Please enter both email and password.";
        return;
    }

    loginBtnText.textContent   = "Signing in...";
    loginSpinner.style.display = "inline-block";
    loginBtn.disabled          = true;

    // Simulate a small delay for UX
    setTimeout(function () {
        if (email === VALID_EMAIL && password === VALID_PASSWORD) {
            sessionStorage.setItem("sf_auth", "true");
            showDashboard();
        } else {
            loginError.textContent     = "Incorrect email or password.";
            loginBtnText.textContent   = "Login";
            loginSpinner.style.display = "none";
            loginBtn.disabled          = false;
        }
    }, 800);
});

// Press Enter to login
loginPassword.addEventListener("keydown", function (e) {
    if (e.key === "Enter") loginBtn.click();
});

// Logout
logoutBtn.addEventListener("click", function (e) {
    e.preventDefault();
    sessionStorage.removeItem("sf_auth");
    showLogin();
});

// ============================================================
// SHOW / HIDE SCREENS
// ============================================================
function showDashboard() {
    loginOverlay.style.display = "none";
    mainContent.style.display  = "block";
    initDashboard();
}

function showLogin() {
    loginOverlay.style.display = "flex";
    mainContent.style.display  = "none";
    loginBtnText.textContent   = "Login";
    loginSpinner.style.display = "none";
    loginBtn.disabled          = false;
    loginEmail.value           = "";
    loginPassword.value        = "";
    loginError.textContent     = "";
}

// ============================================================
// DASHBOARD — only runs after login
// ============================================================
let dashboardReady = false;

function initDashboard() {
    if (dashboardReady) return; // prevent duplicate listeners
    dashboardReady = true;

    const toggleInputs   = document.querySelectorAll('.toggle-input');
    const controlCards   = document.querySelectorAll('.control-card');
    const toastContainer = document.getElementById('toastContainer');
    const powerOffBtn    = document.getElementById('powerOffBtn');
    const devices        = ["fan", "light", "conveyor", "buzzer"];

    // CONTROL → FIREBASE
    toggleInputs.forEach((input, index) => {
        input.addEventListener('change', function () {
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

    // FIREBASE → UI (real-time sync)
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
    powerOffBtn.addEventListener('click', function () {
        db.ref().update({ "/fan": 0, "/light": 0, "/conveyor": 0, "/buzzer": 0 });
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
    contactForm.addEventListener('submit', function (e) {
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
