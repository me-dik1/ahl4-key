let keychains = []; // 鎖匙扣陣列
let user = null;

const CLOUDINARY_CLOUD_NAME = 'djecklwhf'; // 修改這裡：替換成您的Cloud Name，例如 'demo'
const CLOUDINARY_UPLOAD_PRESET = 'ahl4-key'; // 修改這裡：替換成您的unsigned upload preset名稱，例如 'keychain_unsigned'


// 上傳圖片到Cloudinary的函數（新增）
async function uploadToCloudinary(file) {
    if (!file) return ''; // 無檔案，返回空
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); // 使用無簽名預設
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.secure_url) {
            return data.secure_url; // 返回安全的HTTPS URL
        } else {
            alert('上傳失敗: ' + data.error.message);
            return '';
        }
    } catch (error) {
        alert('上傳錯誤: ' + error.message);
        return '';
    }
}

// 載入資料（修改：確保imageUrl存在）
function loadData() {
    if (user) {
        db.collection('keychains').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                keychains = doc.data().list || [];
                // 確保每個keychain有imageUrl（舊資料兼容）
                keychains.forEach(kc => { if (!kc.imageUrl) kc.imageUrl = ''; });
            }
            renderAll();
        }).catch(error => console.error('載入錯誤:', error));
    } else {
        keychains = JSON.parse(localStorage.getItem('keychains')) || [];
        keychains.forEach(kc => { if (!kc.imageUrl) kc.imageUrl = ''; });
        renderAll();
    }
}

// 保存資料（無變更，但會自動保存imageUrl）
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
        document.getElementById('back-to-top').style.display = 'block';
        location.hash = '#home'; // 初始顯示抽籤頁，避免停留主頁
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
        document.getElementById('home').style.display = 'none';
        document.getElementById('draw').style.display = 'none';
        document.getElementById('archive').style.display = 'none';
        document.getElementById('back-to-top').style.display = 'none';
        localStorage.clear(); // 可選：清除本地資料
        keychains = []; // 清空陣列，避免殘留
        renderAll(); // 重渲染清空
        location.hash = '';  // 重設 hash，避免未知頁
        alert('已登出');
    }).catch(error => alert('登出錯誤: ' + error.message));
}

// 新增鎖匙扣（修改：處理圖片上傳）
async function addKeychain() {
    const name = document.getElementById('new-keychain').value.trim();
    const fileInput = document.getElementById('new-keychain-image');
    const file = fileInput ? fileInput.files[0] : null; // 防錯：如果元素不存在，返回 null
    if (name) {
        let imageUrl = '';
        if (file) {
            imageUrl = await uploadToCloudinary(file); // 上傳並獲取URL
        }
        keychains.push({ id: Date.now(), name, drawnCount: 0, usedCount: 0, status: '未用', imageUrl });
        saveData();
        renderAll();
        document.getElementById('new-keychain').value = '';
        if (fileInput) fileInput.value = ''; // 清空file input
    }
}

// 渲染所有
function renderAll() {
    renderSimpleList();
    renderArchive();
    renderStats();
}

// 渲染抽籤頁簡單列表（修改：顯示圖片）
function renderSimpleList() {
    const list = document.getElementById('simple-list');
    list.innerHTML = '';
    keychains.forEach((kc, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex align-items-center';
        li.innerHTML = `${index + 1}. ${kc.name}`;
        if (kc.imageUrl) {
            li.innerHTML += `<img src="${kc.imageUrl}" alt="${kc.name}" class="keychain-img">`;
        }
        list.appendChild(li);
    });
}

// 渲染檔案庫列表（修改：只留一個上傳按鈕，使用可見 file input）
function renderArchive() {
    const list = document.getElementById('keychain-list');
    list.innerHTML = '';
    keychains.forEach((kc, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        let content = `${index + 1}. ${kc.name} - 狀態: ${kc.status}`;
        if (kc.imageUrl) {
            content += `<img src="${kc.imageUrl}" alt="${kc.name}" class="keychain-img">`;
        }
        li.innerHTML = `
            <span>${content}</span>
            <div>
                <button class="btn btn-sm btn-primary" onclick="editKeychain(${kc.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-success" onclick="setStatus(${kc.id}, '使用中')"><i class="fas fa-play"></i> 使用中</button>
                <button class="btn btn-sm btn-secondary" onclick="setStatus(${kc.id}, '用完')"><i class="fas fa-stop"></i> 用完</button>
                <button class="btn btn-sm btn-info" onclick="resetStatus(${kc.id})"><i class="fas fa-undo"></i> 重置狀態</button>
                <button class="btn btn-sm btn-danger" onclick="deleteKeychain(${kc.id})"><i class="fas fa-trash"></i></button>
                <input type="file" id="edit-image-${kc.id}" class="form-control d-inline-block w-auto ms-2" accept="image/*"> <!-- 直接顯示 file input 作為唯一按鈕 -->
            </div>
        `;
        list.appendChild(li);

        // 監聽file change事件，上傳圖片（無需隱藏和額外按鈕）
        document.getElementById(`edit-image-${kc.id}`).addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const newUrl = await uploadToCloudinary(file);
                if (newUrl) {
                    kc.imageUrl = newUrl;
                    saveData();
                    renderAll();
                }
            }
        });
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

// 新增: 重置所有狀態
function resetAllStatus() {
    if (confirm('確認重置所有鎖匙扣狀態為「未用」？')) {
        keychains.forEach(kc => kc.status = '未用');
        saveData();
        renderAll();
    }
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
        document.getElementById('back-to-top').style.display = 'block';
        location.hash = '#draw'; // 初始顯示抽籤頁導航
        loadData();
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('home').style.display = 'none'; // 強化隱藏主頁
        document.getElementById('draw').style.display = 'none';
        document.getElementById('archive').style.display = 'none';
        location.hash = ''; // 確保未登入時 hash 清空
    }
});

// 導航切換
window.addEventListener('hashchange', () => {
    // 先隱藏所有頁面，避免重疊
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('home').style.display = 'none';
    document.getElementById('draw').style.display = 'none';
    document.getElementById('archive').style.display = 'none';

    // 根據登入狀態和 hash 顯示
    if (user) {
        if (location.hash === '#home') {
            document.getElementById('home').style.display = 'block'; // 改 block 以匹配 card
        } else if (location.hash === '#draw') {
            document.getElementById('draw').style.display = 'block';
        } else if (location.hash === '#archive') {
            document.getElementById('archive').style.display = 'block';
        } else {
            location.hash = '#draw'; // 未知或空 hash 跳到抽籤頁
        }
    } else {
        document.getElementById('login-section').style.display = 'block';
        location.hash = ''; // 未登入時清 hash
    }
    window.scrollTo(0, 0); // 切換頁面時強制滾到頂部，修滾動 bug
});

// 一鍵到頂
document.getElementById('back-to-top').onclick = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 初始載入
loadData();