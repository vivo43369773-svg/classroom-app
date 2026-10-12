// ตรวจสอบว่าถ้ารันบน localhost ให้ใช้ http://127.0.0.1:8000 แต่ถ้ารันบน Render ให้ใช้ค่าว่าง
const API_URL = window.location.origin.includes("127.0.0.1") || window.location.origin.includes("localhost")
    ? "http://127.0.0.1:8000"
    : (window.location.protocol.startsWith("file") ? "http://127.0.0.1:8000" : "");
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
        grid.innerHTML = `<p class="text-slate-400 text-sm col-span-full text-center py-8">ไม่พบข้อมูลสมาชิก</p>`;
        return;
    }

    grid.innerHTML = users.map(user => {
        const isMe = user.username === currentUsername;
        return `
            <div class="border-2 ${isMe ? 'border-indigo-500 bg-indigo-50/20' : 'border-black'} rounded-lg overflow-hidden shadow-md flex flex-col transition hover:shadow-lg">
                
                <!-- ส่วนบน: ช่องใส่รูป (Image Box) -->
                <div class="h-40 bg-slate-200 flex flex-col items-center justify-center border-b-2 border-black relative">
                    <span class="text-4xl">👤</span>
                    <span class="text-xs text-slate-500 mt-1 font-medium">รูปโปรไฟล์</span>
                    <span class="absolute top-2 right-2 text-xs bg-white/80 border border-slate-300 text-slate-700 px-2 py-0.5 rounded font-semibold">${user.role}</span>
                </div>

                <!-- ส่วนล่าง: ช่องใส่ข้อมูล (Content Box) -->
                <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                        <h4 class="font-bold text-slate-800 text-base flex items-center justify-between">
                            <span>${user.username}</span>
                            ${isMe ? '<span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">คุณ</span>' : ''}
                        </h4>
                        <p class="text-sm text-slate-500 mt-1 line-clamp-2">${user.bio || 'ไม่มีคำอธิบายตัวตน'}</p>
                    </div>

                    <!-- ส่วนแสดงทักษะ -->
                    <div class="pt-2 border-t border-slate-100">
                        <p class="text-xs font-semibold text-slate-400 mb-1.5">ทักษะและความสามารถ:</p>
                        <div class="flex flex-wrap gap-1.5">
                            ${user.skills.length > 0 
                                ? user.skills.map(s => `
                                    <span class="bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                                        # ${s.skill_name}${isMe ? `<button onclick="deleteSkill(${s.id})" class="text-red-400 hover:text-red-600 ml-1 font-bold">×</button>` : ''}
                                    </span>
                                `).join('') 
                                : '<span class="text-xs text-slate-400 italic">ยังไม่มีทักษะที่บันทึก</span>'}
                        </div>
                    </div>
                </div>

            </div>
        `;
    }).join('');
}

// เพิ่มทักษะใหม่
async function handleAddSkill(e) {
    e.preventDefault();
    const skillName = document.getElementById("new-skill-input").value;
    const token = localStorage.getItem("access_token");

    try {
        const res = await fetch(`${API_URL}/users/me/skills`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ skill_name: skillName })
        });

        if (res.ok) {
            document.getElementById("new-skill-input").value = "";
            fetchUsers();
            fetchAnalytics();
        } else {
            alert("ไม่สามารถเพิ่มทักษะได้");
        }
    } catch (err) {
        console.error("Error adding skill:", err);
    }
}

// ลบทักษะ
async function deleteSkill(skillId) {
    if (!confirm("คุณต้องการลบทักษะนี้ใช่หรือไม่?")) return;
    const token = localStorage.getItem("access_token");

    try {
        const res = await fetch(`${API_URL}/skills/${skillId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.ok) {
            fetchUsers();
            fetchAnalytics();
        } else {
            alert("ไม่สามารถลบทักษะได้");
        }
    } catch (err) {
        console.error("Error deleting skill:", err);
    }
}

// ค้นหาทักษะ
async function handleSearch() {
    const query = document.getElementById("search-skill-input").value.trim();
    if (!query) return fetchUsers();

    try {
        const res = await fetch(`${API_URL}/skills/search?skill_name=${encodeURIComponent(query)}`);
        const users = await res.json();
        renderUserCards(users);
    } catch (err) {
        console.error("Error searching:", err);
    }
}

function resetSearch() {
    document.getElementById("search-skill-input").value = "";
    fetchUsers();
}

// ดึงข้อมูล Analytics
async function fetchAnalytics() {
    try {
        const res = await fetch(`${API_URL}/analytics/skills`);
        const data = await res.json();
        document.getElementById("total-skills").textContent = data.total_skills_count || 0;
    } catch (err) {
        console.error("Error fetching analytics:", err);
    }
}

// จัดการระบบ Auth (Login / Logout)
function checkAuth() {
    const token = localStorage.getItem("access_token");
    const username = localStorage.getItem("username");
    if (token && username) {
        document.getElementById("login-btn").classList.add("hidden");
        document.getElementById("logout-btn").classList.remove("hidden");
        document.getElementById("my-skill-section").classList.remove("hidden");
        const userDisplay = document.getElementById("user-display");
        userDisplay.textContent = `👤 ${username}`;
        userDisplay.classList.remove("hidden");
    } else {
        document.getElementById("my-skill-section").classList.add("hidden");
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById("username").value;
    const passwordInput = document.getElementById("password").value;

    const formData = new URLSearchParams();
    formData.append("username", usernameInput);
    formData.append("password", passwordInput);

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("username", usernameInput);
            closeLoginModal();
            checkAuth();
            fetchUsers();
        } else {
            document.getElementById("login-error").classList.remove("hidden");
        }
    } catch (err) {
        console.error("Login failed:", err);
    }
}

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    location.reload();
}

function openLoginModal() {
    document.getElementById("login-modal").classList.remove("hidden");
}

function closeLoginModal() {
    document.getElementById("login-modal").classList.add("hidden");
    document.getElementById("login-error").classList.add("hidden");
}