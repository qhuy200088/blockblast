const GRID_SIZE = 9;
const BOARD_ID = 'game-board';
let boardState = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
let score = 0;
let bestScore = localStorage.getItem('blockBlastBest_9x9') || 0;
const userSettings = { vibration: true };

// CÁC HÌNH DÁNG
const SHAPES = [
    { m: [[1]], c: '#3498db' }, { m: [[1,1]], c: '#e74c3c' }, { m: [[1],[1]], c: '#e74c3c' },
    { m: [[1,1,1]], c: '#2ecc71' }, { m: [[1],[1],[1]], c: '#2ecc71' },
    { m: [[1,1,1,1]], c: '#f39c12' }, { m: [[1],[1],[1],[1]], c: '#f39c12' },
    { m: [[1,1],[1,1]], c: '#f1c40f' }, { m: [[1,1,1],[1,1,1],[1,1,1]], c: '#9b59b6' }, 
    { m: [[1,0],[1,0],[1,1]], c: '#e67e22' }, { m: [[0,1],[0,1],[1,1]], c: '#e67e22' },
    { m: [[1,1,1],[0,1,0]], c: '#1abc9c' }, { m: [[0,1,0],[1,1,1]], c: '#1abc9c' }
];

function init() {
    initSettings();
    document.getElementById('best-score').innerText = bestScore;
    drawBoard();
    spawnShapes();
}

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
function triggerVibrate(ms = 40) {
    if (userSettings.vibration && navigator.vibrate) navigator.vibrate(ms);
}

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
            if(val) { b.classList.add('block'); b.style.backgroundColor = shapeObj.c; }
            else { b.style.width = '20px'; b.style.height = '20px'; }
            wrapper.appendChild(b);
        });
    });
    document.getElementById('shapes-container').appendChild(wrapper);
    addDragLogic(wrapper);
}

// --- GHOST LOGIC ---
function clearGhost() {
    document.querySelectorAll('.ghost').forEach(el => el.classList.remove('ghost'));
}

function drawGhost(r, c, matrix) {
    clearGhost();
    for(let i=0; i<matrix.length; i++) {
        for(let j=0; j<matrix[0].length; j++) {
            if(matrix[i][j] === 1) {
                const cell = document.getElementById(`c-${r+i}-${c+j}`);
                // Chỉ hiện bóng trên ô trống
                if(cell && boardState[r+i][c+j] === 0) {
                    cell.classList.add('ghost');
                }
            }
        }
    }
}

// --- DRAG LOGIC (CẢI TIẾN) ---
let clone = null, original = null;
let offX = 0, offY = 0;
const LIFT_HEIGHT = 80; // Độ cao nhấc lên

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

// Hàm tìm ô lưới gần nhất tại tọa độ (x, y)
function getCellAt(x, y) {
    // Ẩn clone tạm thời để không che mất ô lưới bên dưới
    if (clone) clone.style.display = 'none';
    let el = document.elementFromPoint(x, y);
    if (clone) clone.style.display = 'grid'; // Hiện lại ngay
    
    // Nếu trúng ô lưới
    if (el && el.id && el.id.startsWith('c-')) return el;
    
    // Nếu trúng khe hở (gap), thử tìm xung quanh một chút
    // (Logic này giúp đỡ bị lệch khi ngón tay run)
    const offsets = [5, -5];
    for(let ox of offsets) {
        for(let oy of offsets) {
             if (clone) clone.style.display = 'none';
             el = document.elementFromPoint(x + ox, y + oy);
             if (clone) clone.style.display = 'grid';
             if (el && el.id && el.id.startsWith('c-')) return el;
        }
    }
    return null;
}

const move = (e) => {
    if(!clone) return;
    const touch = e.touches ? e.touches[0] : e;
    
    clone.style.left = (touch.clientX - offX) + 'px';
    clone.style.top = (touch.clientY - offY - LIFT_HEIGHT) + 'px';

    // Lấy tọa độ "trọng tâm" của ô đầu tiên trong khối
    // Cộng thêm 1 chút vào X, Y để trỏ vào giữa ô thay vì góc
    const checkX = touch.clientX - offX + 10; 
    const checkY = touch.clientY - offY - LIFT_HEIGHT + 10;

    const targetEl = getCellAt(checkX, checkY);
    
    if (targetEl) {
        const parts = targetEl.id.split('-');
        const r = parseInt(parts[1]);
        const c = parseInt(parts[2]);
        const matrix = JSON.parse(original.dataset.matrix);

        if (canPlace(r, c, matrix)) {
            drawGhost(r, c, matrix);
        } else {
            clearGhost();
        }
    } else {
        clearGhost();
    }
}

const end = (e) => {
    if(!clone) return;
    clone.style.display = 'none'; // Ẩn clone để check lần cuối
    
    // Lấy tọa độ thả tay (lấy từ vị trí clone cuối cùng)
    const rect = clone.getBoundingClientRect();
    const checkX = rect.left + 10;
    const checkY = rect.top + 10;
    
    const targetEl = document.elementFromPoint(checkX, checkY);
    
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

    // Fail
    original.style.opacity = '1';
    clone.remove();
    original = null; clone = null;
}

document.addEventListener('mousemove', move);
document.addEventListener('touchmove', move, {passive: false});
document.addEventListener('mouseup', end);
document.addEventListener('touchend', end);

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
    triggerVibrate(40);
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
    if(rows.length + cols.length > 0) {
        rows.forEach(r => boardState[r].fill(0));
        cols.forEach(c => { for(let r=0; r<GRID_SIZE; r++) boardState[r][c] = 0; });
        const combo = (rows.length + cols.length);
        updateScore(combo * 9 * 10 * combo);
        triggerVibrate(150);
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
        document.getElementById('go-title').innerText = (score >= bestScore && score > 0) ? "KỶ LỤC MỚI! 👑" : "GAME OVER";
        document.getElementById('game-over-modal').classList.remove('hidden');
    }
}

init();
