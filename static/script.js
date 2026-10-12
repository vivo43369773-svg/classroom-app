const API_URL = window.location.origin.includes("127.0.0.1") || window.location.origin.includes("localhost")
    ? "http://127.0.0.1:8000"
    : window.location.origin;

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

// ค้นหาสมาชิกตามทักษะ
async function searchUsers() {
    const keyword = document.getElementById("search-input").value.trim();
    if (!keyword) {
        fetchUsers();
        return;
    }
    try {
        const res = await fetch(`${API_URL}/users`);
        const users = await res.json();
        const filtered = users.filter(user => user.skills && user.skills.toLowerCase().includes(keyword.toLowerCase()));
        renderUserCards(filtered);
    } catch (err) {
        console.error("Error searching users:", err);
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
                        ${isMe ? '<span class="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">คุณ</span>' : ''}
                    </div>
                    <p class="text-xs text-slate-500 mb-2">@${user.username}</p>
                    <div class="flex flex-wrap gap-1.5 mt-3">
                        ${user.skills ? user.skills.split(',').map(skill => `<span class="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-md font-medium">${skill.trim()}</span>`).join('') : '<span class="text-xs text-slate-400">ยังไม่มีทักษะ</span>'}
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

// จัดการ Modal เข้าสู่ระบบ
function openLoginModal() { document.getElementById("login-modal").classList.remove("hidden"); }
function closeLoginModal() { 
    document.getElementById("login-modal").classList.add("hidden");
    document.getElementById("login-error").classList.add("hidden");
    document.getElementById("login-form").reset();
}

// จัดการ Modal สมัครสมาชิก
function openRegisterModal() { document.getElementById("register-modal").classList.remove("hidden"); }
function closeRegisterModal() { 
    document.getElementById("register-modal").classList.add("hidden");
    document.getElementById("register-error").classList.add("hidden");
    document.getElementById("register-form").reset();
}

// จัดการ Modal ใส่/แก้ไขทักษะ
function openSkillModal() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("กรุณาเข้าสู่ระบบก่อนจัดการทักษะ");
        openLoginModal();
        return;
    }
    document.getElementById("skill-modal").classList.remove("hidden");
}
function closeSkillModal() { document.getElementById("skill-modal").classList.add("hidden"); }

// ส่งฟอร์มเข้าสู่ระบบ
document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new URLSearchParams();
    formData.append("username", document.getElementById("login-username").value);
    formData.append("password", document.getElementById("login-password").value);

    try {
        const res = await fetch(`${API_URL}/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("username", document.getElementById("login-username").value);
            closeLoginModal();
            checkAuth();
            fetchUsers();
        } else {
            document.getElementById("login-error").classList.remove("hidden");
        }
    } catch (err) {
        console.error("Login error:", err);
    }
});

// ส่งฟอร์มสมัครสมาชิก
document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById("reg-name").value,
        username: document.getElementById("reg-username").value,
        password: document.getElementById("reg-password").value,
        skills: document.getElementById("reg-skills").value
    };

    try {
        const res = await fetch(`${API_URL}/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
            closeRegisterModal();
            openLoginModal();
        } else {
            document.getElementById("register-error").classList.remove("hidden");
        }
    } catch (err) {
        console.error("Register error:", err);
    }
});

// ส่งฟอร์มบันทึก/อัปเดตทักษะ
document.getElementById("skill-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const skills = document.getElementById("update-skills-input").value;
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_URL}/users/me/skills`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ skills })
        });

        if (res.ok) {
            alert("อัปเดตทักษะสำเร็จ!");
            closeSkillModal();
            fetchUsers();
            fetchAnalytics();
        } else {
            alert("ไม่สามารถอัปเดตทักษะได้ กรุณาลองใหม่อีกครั้ง");
        }
    } catch (err) {
        console.error("Update skills error:", err);
    }
});

// ตรวจสอบสถานะการล็อกอินเพื่อเปลี่ยนปุ่มบน Navbar
function checkAuth() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const authBtn = document.getElementById("auth-btn");

    if (token && username) {
        authBtn.innerHTML = `
            <span class="text-sm font-medium bg-blue-700 px-3 py-1.5 rounded-lg">👤 ${username}</span>
            <button onclick="logout()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition">ออกจากระบบ</button>
        `;
    } else {
        authBtn.innerHTML = `
            <button onclick="openLoginModal()" class="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-50 transition">เข้าสู่ระบบ</button>
            <button onclick="openRegisterModal()" class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition">สมัครสมาชิก</button>
        `;
    }
}

// ออกจากระบบ
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    checkAuth();
    fetchUsers();
    alert("ออกจากระบบเรียบร้อยแล้ว");
}