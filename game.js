const GRID_SIZE = 9;
const BOARD_ID = 'game-board';
let boardState = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
let score = 0;
let bestScore = localStorage.getItem('blockBlastBest_9x9') || 0;

// Cài đặt mặc định
const userSettings = { vibration: true };

// ĐỊNH NGHĨA CÁC KHỐI (SHAPES)
const SHAPES = [
    { m: [[1]], c: '#3498db' }, 
    { m: [[1,1]], c: '#e74c3c' }, 
    { m: [[1],[1]], c: '#e74c3c' },
    { m: [[1,1,1]], c: '#2ecc71' }, 
    { m: [[1],[1],[1]], c: '#2ecc71' },
    { m: [[1,1,1,1]], c: '#f39c12' }, 
    { m: [[1],[1],[1],[1]], c: '#f39c12' },
    { m: [[1,1],[1,1]], c: '#f1c40f' }, 
    { m: [[1,1,1],[1,1,1],[1,1,1]], c: '#9b59b6' }, 
    { m: [[1,0],[1,0],[1,1]], c: '#e67e22' }, 
    { m: [[0,1],[0,1],[1,1]], c: '#e67e22' },
    { m: [[1,1,1],[0,1,0]], c: '#1abc9c' },
    { m: [[0,1,0],[1,1,1]], c: '#1abc9c' }
];

// KHỞI TẠO GAME
function init() {
    initSettings();
    document.getElementById('best-score').innerText = bestScore;
    drawBoard();
    spawnShapes();
}

// --- XỬ LÝ SETTINGS (CÀI ĐẶT) ---
function initSettings() {
    const saved = localStorage.getItem('blockBlastSettings');
    if (saved) Object.assign(userSettings, JSON.parse(saved));
    const toggle = document.getElementById('toggle-vibration');
    if(toggle) toggle.checked = userSettings.vibration;
}

window.toggleSettings = () => { document.getElementById('settings-modal').classList.toggle('hidden'); }

window.updateSetting = (key) => {
    const isChecked = document.getElementById(`toggle-${key}`).checked;
    userSettings[key] = isChecked;
    localStorage.setItem('blockBlastSettings', JSON.stringify(userSettings));
    if (key === 'vibration' && isChecked && navigator.vibrate) navigator.vibrate(100);
}

function triggerVibrate(ms = 50) {
    if (userSettings.vibration && navigator.vibrate) navigator.vibrate(ms);
}

// --- VẼ BẢNG & TẠO KHỐI ---
function drawBoard() {
    const boardEl = document.getElementById(BOARD_ID);
    boardEl.innerHTML = '';
    for(let r=0; r<GRID_SIZE; r++) {
        for(let c=0; c<GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.id = `c-${r}-${c}`;
            if(boardState[r][c] !== 0) {
                cell.style.backgroundColor = boardState[r][c];
                cell.style.boxShadow = "inset 0 0 5px rgba(0,0,0,0.3)";
            }
            boardEl.appendChild(cell);
        }
    }
}

function spawnShapes() {
    const container = document.getElementById('shapes-container');
    container.innerHTML = '';
    for(let i=0; i<4; i++) {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        createDraggable(shape);
    }
    checkGameOver();
}

function createDraggable(shapeObj) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('shape-preview');
    wrapper.style.gridTemplateColumns = `repeat(${shapeObj.m[0].length}, 1fr)`;
    wrapper.dataset.matrix = JSON.stringify(shapeObj.m);
    wrapper.dataset.color = shapeObj.c;

    shapeObj.m.forEach(row => {
        row.forEach(val => {
            const b = document.createElement('div');
            if(val) {
                b.classList.add('block');
                b.style.backgroundColor = shapeObj.c;
            } else {
                b.style.width = '20px'; b.style.height = '20px';
            }
            wrapper.appendChild(b);
        });
    });

    document.getElementById('shapes-container').appendChild(wrapper);
    addDragLogic(wrapper);
}

// --- TÍNH NĂNG BÓNG MỜ (GHOST BLOCK) ---
function clearGhost() {
    document.querySelectorAll('.ghost').forEach(el => el.classList.remove('ghost'));
}

function drawGhost(r, c, matrix) {
    clearGhost(); // Xóa bóng cũ
    for(let i=0; i<matrix.length; i++) {
        for(let j=0; j<matrix[0].length; j++) {
            if(matrix[i][j] === 1) {
                const cell = document.getElementById(`c-${r+i}-${c+j}`);
                // Chỉ hiện bóng nếu ô đó nằm trong bảng và chưa có gạch
                if(cell && boardState[r+i][c+j] === 0) {
                    cell.classList.add('ghost');
                }
            }
        }
    }
}

// --- KÉO THẢ (DRAG & DROP) ---
let clone = null, original = null;
let offX = 0, offY = 0;

function addDragLogic(el) {
    const start = (e) => {
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const rect = el.getBoundingClientRect();
        
        offX = touch.clientX - rect.left;
        offY = touch.clientY - rect.top;

        clone = el.cloneNode(true);
        clone.classList.add('dragging');
        const matrix = JSON.parse(el.dataset.matrix);
        clone.style.gridTemplateColumns = `repeat(${matrix[0].length}, 1fr)`;
        
        document.body.appendChild(clone);
        original = el;
        original.style.opacity = '0';
        move(e);
    };
    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start, {passive: false});
}

const move = (e) => {
    if(!clone) return;
    const touch = e.touches ? e.touches[0] : e;
    
    // 1. Di chuyển khối theo tay
    clone.style.left = (touch.clientX - offX) + 'px';
    clone.style.top = (touch.clientY - offY - 80) + 'px'; // Nhấc cao 80px để dễ nhìn

    // 2. Tính toán vị trí thả để hiện BÓNG MỜ
    // Lấy phần tử bên dưới ngón tay (trừ đi offset đã nhấc lên)
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY - 80);
    
    if (targetEl && targetEl.id && targetEl.id.startsWith('c-')) {
        const parts = targetEl.id.split('-');
        const r = parseInt(parts[1]);
        const c = parseInt(parts[2]);
        const matrix = JSON.parse(original.dataset.matrix);

        // Nếu vị trí hợp lệ -> Vẽ bóng
        if (canPlace(r, c, matrix)) {
            drawGhost(r, c, matrix);
        } else {
            clearGhost();
        }
    } else {
        clearGhost(); // Ra ngoài bảng thì xóa bóng
    }
}

const end = (e) => {
    if(!clone) return;
    clone.style.display = 'none';
    
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY - 80);

    // Xóa bóng ngay khi thả tay
    clearGhost();

    if (targetEl && targetEl.id && targetEl.id.startsWith('c-')) {
        const parts = targetEl.id.split('-');
        const r = parseInt(parts[1]);
        const c = parseInt(parts[2]);
        const matrix = JSON.parse(original.dataset.matrix);
        
        if (canPlace(r, c, matrix)) {
            place(r, c, matrix, original.dataset.color);
            original.remove();
            clone.remove();
            original = null; clone = null;
            
            if (document.getElementById('shapes-container').children.length === 0) {
                setTimeout(spawnShapes, 300);
            } else {
                checkGameOver();
            }
            return;
        }
    }

    // Nếu thả sai -> Trả về cũ
    original.style.opacity = '1';
    clone.remove();
    original = null; clone = null;
}

document.addEventListener('mousemove', move);
document.addEventListener('touchmove', move, {passive: false});
document.addEventListener('mouseup', end);
document.addEventListener('touchend', end);

// --- LOGIC GAMEPLAY ---
function canPlace(r, c, matrix) {
    for(let i=0; i<matrix.length; i++) {
        for(let j=0; j<matrix[0].length; j++) {
            if(matrix[i][j] === 1) {
                let nr = r + i;
                let nc = c + j;
                if(nr >= GRID_SIZE || nc >= GRID_SIZE || boardState[nr][nc] !== 0) return false;
            }
        }
    }
    return true;
}

function place(r, c, matrix, color) {
    let count = 0;
    for(let i=0; i<matrix.length; i++) {
        for(let j=0; j<matrix[0].length; j++) {
            if(matrix[i][j] === 1) {
                boardState[r+i][c+j] = color;
                count++;
            }
        }
    }
    triggerVibrate(40); // Rung nhẹ
    updateScore(count);
    drawBoard();
    setTimeout(checkLines, 50);
}

function checkLines() {
    let rows = [], cols = [];
    for(let r=0; r<GRID_SIZE; r++) if(boardState[r].every(v => v !== 0)) rows.push(r);
    for(let c=0; c<GRID_SIZE; c++) {
        let full = true;
        for(let r=0; r<GRID_SIZE; r++) if(boardState[r][c]===0) { full=false; break; }
        if(full) cols.push(c);
    }

    const total = rows.length + cols.length;
    if(total > 0) {
        rows.forEach(r => boardState[r].fill(0));
        cols.forEach(c => { for(let r=0; r<GRID_SIZE; r++) boardState[r][c] = 0; });
        
        // Tính điểm Combo
        const comboPoints = (total * 9) * 10 * total;
        updateScore(comboPoints);
        triggerVibrate(150); // Rung mạnh
        drawBoard();
    }
}

function updateScore(points) {
    score += points;
    document.getElementById('score').innerText = score;
    if(score > bestScore) {
        bestScore = score;
        document.getElementById('best-score').innerText = bestScore;
        localStorage.setItem('blockBlastBest_9x9', bestScore);
    }
}

function checkGameOver() {
    const shapes = document.querySelectorAll('.shape-preview');
    if(shapes.length === 0) return;

    let dead = true;
    shapes.forEach(el => {
        const m = JSON.parse(el.dataset.matrix);
        for(let r=0; r<GRID_SIZE; r++) {
            for(let c=0; c<GRID_SIZE; c++) {
                if(canPlace(r, c, m)) { dead = false; return; }
            }
        }
    });

    if(dead) {
        document.getElementById('final-score').innerText = score;
        let title = "GAME OVER";
        if(score >= bestScore && score > 0) title = "KỶ LỤC MỚI! 👑";
        document.getElementById('go-title').innerText = title;
        document.getElementById('game-over-modal').classList.remove('hidden');
    }
}

// Chạy game
init();
