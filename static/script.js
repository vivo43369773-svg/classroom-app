// ตรวจสอบว่ากำลังรันบน localhost ให้ใช้พอร์ต 8000 แต่ถ้ารันบน Render ให้ใช้ URL ปัจจุบัน
const API_URL = window.location.origin.includes("127.0.0.1") || window.location.origin.includes("localhost")
    ? "http://127.0.0.1:8000"
    : window.location.origin;

let currentUserId = null;

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    fetchUsers();
    fetchAnalytics();
});

// ดึงข้อมูลสมาชิกทั้งหมด
async function fetchUsers() {
    try {
        const res = await fetch(`${API_URL}/users`);
        const users = await res.json();
        document.getElementById("total-users").textContent = users.length;
        renderUserCards(users);
    } catch (err) {
        console.error("Error fetching users:", err);
    }
}

// แสดงผล User Cards
function renderUserCards(users) {
    const grid = document.getElementById("users-grid");
    const currentUsername = localStorage.getItem("username");

    if (users.length === 0) {
        grid.innerHTML = `<p class="text-slate-400 text-sm col-span-full text-center py-6">ไม่พบข้อมูลสมาชิกในระบบ</p>`;
        return;
    }

    grid.innerHTML = users.map(user => {
        const isMe = user.username === currentUsername;
        return `
            <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition duration-200 flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <span class="font-semibold text-slate-800 text-base">${user.name}</span>
                        ${isMe ? '<span class="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full font-medium">คุณ</span>' : ''}
                    </div>
                    <p class="text-xs text-slate-500 mb-2">@${user.username}</p>
                    <div class="flex flex-wrap gap-1.5 mt-3">
                        ${user.skills ? user.skills.split(',').map(skill => `<span class="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-md font-medium">${skill.trim()}</span>`).join('') : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ดึงข้อมูลสถิติ
async function fetchAnalytics() {
    try {
        const res = await fetch(`${API_URL}/analytics`);
        const data = await res.json();
        document.getElementById("total-skills").textContent = data.total_skills || 0;
    } catch (err) {
        console.error("Error fetching analytics:", err);
    }
}

// ควบคุม Modal เข้าสู่ระบบ
function openLoginModal() {
    document.getElementById("login-modal").classList.remove("hidden");
}

function closeLoginModal() {
    document.getElementById("login-modal").classList.add("hidden");
    document.getElementById("login-error").classList.add("hidden");
    document.getElementById("login-form").reset();
}

// จัดการการส่งฟอร์มเข้าสู่ระบบ
document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById("username").value;
    const passwordInput = document.getElementById("password").value;

    const formData = new URLSearchParams();
    formData.append("username", usernameInput);
    formData.append("password", passwordInput);

    try {
        const res = await fetch(`${API_URL}/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("username", usernameInput);
            closeLoginModal();
            checkAuth();
            fetchUsers();
        } else {
            const errorMsg = document.getElementById("login-error");
            errorMsg.classList.remove("hidden");
        }
    } catch (err) {
        console.error("Login error:", err);
    }
});

// ตรวจสอบสถานะการล็อกอิน
function checkAuth() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const authBtn = document.getElementById("auth-btn");
    const apiStatus = document.getElementById("api-status");

    if (token && username) {
        authBtn.innerHTML = `
            <span class="text-sm font-medium text-slate-700">👤 ${username}</span>
            <button onclick="logout()" class="text-xs text-red-500 hover:underline ml-2">ออกจากระบบ</button>
        `;
    } else {
        authBtn.innerHTML = `
            <button onclick="openLoginModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition">
                เข้าสู่ระบบ
            </button>
        `;
    }
}

// ออกจากระบบ
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    checkAuth();
    fetchUsers();
}