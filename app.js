let keychains = []; // 鎖匙扣陣列
let user = null;

// 載入資料
function loadData() {
    if (user) {
        db.collection('keychains').doc(user.uid).get().then(doc => {
            if (doc.exists) keychains = doc.data().list || [];
            renderAll();
        }).catch(error => console.error('載入錯誤:', error));
    } else {
        keychains = JSON.parse(localStorage.getItem('keychains')) || [];
        renderAll();
    }
}

// 保存資料
function saveData() {
    if (user) {
        db.collection('keychains').doc(user.uid).set({ list: keychains }).catch(error => console.error('保存錯誤:', error));
    } else {
        localStorage.setItem('keychains', JSON.stringify(keychains));
    }
}

// 登入
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) return alert('請輸入 email 和密碼');
    auth.signInWithEmailAndPassword(email, password).then(cred => {
        user = cred.user;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('nav').style.display = 'flex';
        document.getElementById('back-to-top').style.display = 'block';
        location.hash = ''; // 重置 hash，初始顯示主頁導航
        loadData();
    }).catch(error => alert('登入錯誤: ' + error.message));
}

// 註冊
function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) return alert('請輸入 email 和密碼');
    auth.createUserWithEmailAndPassword(email, password).then(cred => {
        alert('註冊成功，請登入');
    }).catch(error => alert('註冊錯誤: ' + error.message));
}

// 登出
function logout() {
    auth.signOut().then(() => {
        user = null;
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('nav').style.display = 'none';
        document.getElementById('draw').style.display = 'none';
        document.getElementById('archive').style.display = 'none';
        document.getElementById('back-to-top').style.display = 'none';
        localStorage.clear(); // 可選：清除本地資料
        alert('已登出');
    }).catch(error => alert('登出錯誤: ' + error.message));
}

// 新增鎖匙扣
function addKeychain() {
    const name = document.getElementById('new-keychain').value.trim();
    if (name) {
        keychains.push({ id: Date.now(), name, drawnCount: 0, usedCount: 0, status: '未用' });
        saveData();
        renderAll();
        document.getElementById('new-keychain').value = '';
    }
}

// 渲染所有
function renderAll() {
    renderSimpleList();
    renderArchive();
    renderStats();
}

// 渲染抽籤頁簡單列表
function renderSimpleList() {
    const list = document.getElementById('simple-list');
    list.innerHTML = '';
    keychains.forEach((kc, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `${index + 1}. ${kc.name}`;
        list.appendChild(li);
    });
}

// 渲染檔案庫列表
function renderArchive() {
    const list = document.getElementById('keychain-list');
    list.innerHTML = '';
    keychains.forEach((kc, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            <span>${index + 1}. ${kc.name} - 狀態: ${kc.status}</span>
            <div>
                <button class="btn btn-sm btn-primary" onclick="editKeychain(${kc.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-success" onclick="setStatus(${kc.id}, '使用中')"><i class="fas fa-play"></i> 使用中</button>
                <button class="btn btn-sm btn-secondary" onclick="setStatus(${kc.id}, '用完')"><i class="fas fa-stop"></i> 用完</button>
                <button class="btn btn-sm btn-info" onclick="resetStatus(${kc.id})"><i class="fas fa-undo"></i> 重置狀態</button>
                <button class="btn btn-sm btn-danger" onclick="deleteKeychain(${kc.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(li);
    });
}

// 編輯
function editKeychain(id) {
    const kc = keychains.find(k => k.id === id);
    const newName = prompt('編輯名稱', kc.name);
    if (newName && newName.trim()) {
        kc.name = newName.trim();
        saveData();
        renderAll();
    }
}

// 刪除
function deleteKeychain(id) {
    if (confirm('確認刪除？')) {
        keychains = keychains.filter(k => k.id !== id);
        saveData();
        renderAll();
    }
}

// 設定狀態
function setStatus(id, status) {
    const kc = keychains.find(k => k.id === id);
    kc.status = status;
    saveData();
    renderArchive();
}

// 重置狀態
function resetStatus(id) {
    const kc = keychains.find(k => k.id === id);
    kc.status = '未用';
    saveData();
    renderArchive();
}

// 隨機排序
function shuffleOrder() {
    keychains = keychains.sort(() => Math.random() - 0.5);
    saveData();
    renderAll();
}

// 抽籤
function drawKeychain() {
    const undrawn = keychains.filter(kc => kc.drawnCount === 0);
    if (undrawn.length === 0) return alert('所有已抽過，請重置');
    const random = undrawn[Math.floor(Math.random() * undrawn.length)];
    random.drawnCount++;
    document.getElementById('result').innerText = `抽中：${random.name}`;
    saveData();
    renderAll();
}

// 手動加抽中
function manualDraw(id) {
    const kc = keychains.find(k => k.id === id);
    kc.drawnCount++;
    saveData();
    renderAll();
}

// 手動加使用過
function manualUse(id) {
    const kc = keychains.find(k => k.id === id);
    kc.usedCount++;
    saveData();
    renderAll();
}

// 重置所有抽籤記錄
function resetDraw() {
    if (confirm('確認重置所有抽籤記錄？')) {
        keychains.forEach(kc => kc.drawnCount = 0);
        saveData();
        renderAll();
    }
}

// 重置所有使用記錄
function resetAllUsed() {
    if (confirm('確認重置所有使用記錄？')) {
        keychains.forEach(kc => kc.usedCount = 0);
        saveData();
        renderAll();
    }
}

// 渲染統計
function renderStats() {
    const list = document.getElementById('stats-list');
    list.innerHTML = '';
    let totalDrawn = 0;
    let totalUsed = 0;
    keychains.forEach(kc => {
        totalDrawn += kc.drawnCount;
        totalUsed += kc.usedCount;
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            ${kc.name}: 抽中 ${kc.drawnCount} 次，使用 ${kc.usedCount} 次
            <div>
                <button class="btn btn-sm btn-primary" onclick="manualDraw(${kc.id})"><i class="fas fa-dice"></i> 抽中</button>
                <button class="btn btn-sm btn-info ms-2" onclick="manualUse(${kc.id})"><i class="fas fa-check"></i> 使用過</button>
            </div>
        `;
        list.appendChild(li);
    });

    // 總統計
    const totalDiv = document.getElementById('total-stats');
    totalDiv.innerHTML = `
        總抽中: ${totalDrawn} 次 <button class="btn btn-sm btn-warning" onclick="resetDraw()"><i class="fas fa-undo"></i> 重置總抽中</button><br>
        總使用: ${totalUsed} 次 <button class="btn btn-sm btn-warning" onclick="resetAllUsed()"><i class="fas fa-undo"></i> 重置總使用</button>
    `;
}

// 初始化
auth.onAuthStateChanged(u => {
    if (u) {
        user = u;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('nav').style.display = 'flex';
        document.getElementById('back-to-top').style.display = 'block';
        location.hash = ''; // 重置 hash，初始顯示主頁導航
        loadData();
    } else {
        document.getElementById('login-section').style.display = 'block';
    }
});

// 導航切換
window.addEventListener('hashchange', () => {
    document.getElementById('nav').style.display = 'none'; // 切頁時隱藏主頁導航
    document.getElementById('draw').style.display = 'none';
    document.getElementById('archive').style.display = 'none';
    if (location.hash === '#draw') document.getElementById('draw').style.display = 'block';
    if (location.hash === '#archive') document.getElementById('archive').style.display = 'block';
});

// 一鍵到頂
document.getElementById('back-to-top').onclick = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 返回主頁
function backToHome() {
    location.hash = '';
    document.getElementById('nav').style.display = 'flex';
    document.getElementById('draw').style.display = 'none';
    document.getElementById('archive').style.display = 'none';
}

// 初始載入
loadData();