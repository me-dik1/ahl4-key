let keychains = []; // 鎖匙扣陣列
let user = null;

// 載入資料
function loadData() {
    if (user) {
        // 從Firestore載入
        db.collection('keychains').doc(user.uid).get().then(doc => {
            if (doc.exists) keychains = doc.data().list || [];
            renderArchive();
            renderStats();
        }).catch(error => console.error('載入錯誤:', error));
    } else {
        // 本地載入
        keychains = JSON.parse(localStorage.getItem('keychains')) || [];
        renderArchive();
        renderStats();
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
    auth.signInWithEmailAndPassword(email, password).catch(() => {
        return auth.createUserWithEmailAndPassword(email, password);
    }).then(cred => {
        user = cred.user;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('nav').style.display = 'flex';
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

// 新增鎖匙扣
function addKeychain() {
    const name = document.getElementById('new-keychain').value.trim();
    if (name) {
        keychains.push({ id: Date.now(), name, drawnCount: 0, usedCount: 0, status: '未用', history: [] });
        saveData();
        renderArchive();
        document.getElementById('new-keychain').value = '';
    }
}

// 渲染檔案庫
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
                <button class="btn btn-sm btn-info" onclick="markUsed(${kc.id})"><i class="fas fa-check"></i> 標記使用過</button>
                <button class="btn btn-sm btn-danger" onclick="deleteKeychain(${kc.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(li);
    });
    document.getElementById('archive').style.display = 'block';
}

// 編輯
function editKeychain(id) {
    const kc = keychains.find(k => k.id === id);
    const newName = prompt('編輯名稱', kc.name);
    if (newName && newName.trim()) {
        kc.name = newName.trim();
        saveData();
        renderArchive();
    }
}

// 刪除
function deleteKeychain(id) {
    if (confirm('確認刪除？')) {
        keychains = keychains.filter(k => k.id !== id);
        saveData();
        renderArchive();
    }
}

// 設定狀態
function setStatus(id, status) {
    const kc = keychains.find(k => k.id === id);
    kc.status = status;
    saveData();
    renderArchive();
}

// 標記使用過
function markUsed(id) {
    const kc = keychains.find(k => k.id === id);
    kc.usedCount++;
    kc.history.push({ type: '使用', date: new Date().toLocaleString('zh-TW') });
    saveData();
    renderArchive();
    renderStats();
}

// 隨機排序
function shuffleOrder() {
    keychains = keychains.sort(() => Math.random() - 0.5);
    saveData();
    renderArchive();
}

// 抽籤
function drawKeychain() {
    const undrawn = keychains.filter(kc => kc.drawnCount === 0);
    if (undrawn.length === 0) return alert('所有已抽過，請重置');
    const random = undrawn[Math.floor(Math.random() * undrawn.length)];
    random.drawnCount++;
    random.history.push({ type: '抽中', date: new Date().toLocaleString('zh-TW') });
    document.getElementById('result').innerText = `抽中：${random.name}`;
    saveData();
    renderStats();
}

// 重置抽籤
function resetDraw() {
    if (confirm('確認重置抽籤記錄？')) {
        keychains.forEach(kc => {
            kc.drawnCount = 0;
            kc.history = kc.history.filter(h => h.type !== '抽中');
        });
        saveData();
        renderStats();
    }
}

// 渲染統計
function renderStats() {
    const list = document.getElementById('stats-list');
    list.innerHTML = '';
    keychains.forEach(kc => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            ${kc.name}: 抽中 ${kc.drawnCount} 次，使用 ${kc.usedCount} 次<br>
            歷史: ${kc.history.map(h => `${h.type} - ${h.date}`).join('<br>') || '無記錄'}
        `;
        list.appendChild(li);
    });
    document.getElementById('draw').style.display = 'block';
}

// 初始化
auth.onAuthStateChanged(u => {
    if (u) {
        user = u;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('nav').style.display = 'flex';
        loadData();
    }
});

// 導航切換 (使用 hash)
window.addEventListener('hashchange', () => {
    document.getElementById('archive').style.display = 'none';
    document.getElementById('draw').style.display = 'none';
    if (location.hash === '#archive') document.getElementById('archive').style.display = 'block';
    if (location.hash === '#draw') document.getElementById('draw').style.display = 'block';
});

// 初始載入（如果已登入）
loadData();