/**
 * Sudoku PWA Logic
 * Copyleft 2024 Sean Lane Fuller
 */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// --- Constants & State ---
let board = [];
let solution = [];
let initialBoard = []; // To track fixed numbers
let selectedTile = null;
let errors = 0;
let difficulty = 'easy';
const DIFFICULTY_HOLES = {
    'easy': 30,
    'medium': 40,
    'hard': 50
};

// --- Initialization ---
function initApp() {
    // Splash Screen Logic
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.classList.add('fade-out');
        document.getElementById('game-container').classList.remove('hidden');
        setTimeout(() => {
            splash.style.display = 'none';
        }, 500);
    }, 2000);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Failed', err));
    }

    // Event Listeners
    setupControls();

    // Start Game
    startNewGame();
}

// --- Game Logic ---

function startNewGame() {
    errors = 0;
    updateErrorDisplay();
    generateBoard(DIFFICULTY_HOLES[difficulty]);
    renderBoard();
    if (selectedTile) deselectTile();
}

function generateBoard(holes) {
    // 1. Initialize empty 9x9
    board = Array.from({ length: 9 }, () => Array(9).fill(0));

    // 2. Fill diagonal 3x3 boxes (independent, so can be random)
    fillDiagonal();

    // 3. Solve the rest to create a valid complete board
    solveSudoku(board);

    // 4. Save solution
    solution = board.map(row => [...row]);

    // 5. Remove digits to create puzzle
    removeDigits(holes);

    // 6. Save initial state
    initialBoard = board.map(row => [...row]);
}

function fillDiagonal() {
    for (let i = 0; i < 9; i += 3) {
        fillBox(i, i);
    }
}

function fillBox(row, col) {
    let num;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            do {
                num = Math.floor(Math.random() * 9) + 1;
            } while (!isSafeInBox(row, col, num));
            board[row + i][col + j] = num;
        }
    }
}

function isSafeInBox(rowStart, colStart, num) {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[rowStart + i][colStart + j] === num) return false;
        }
    }
    return true;
}

function isSafe(grid, row, col, num) {
    // Check Row
    for (let x = 0; x < 9; x++) {
        if (grid[row][x] === num) return false;
    }
    // Check Col
    for (let x = 0; x < 9; x++) {
        if (grid[x][col] === num) return false;
    }
    // Check Box
    let startRow = row - row % 3;
    let startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[i + startRow][j + startCol] === num) return false;
        }
    }
    return true;
}

function solveSudoku(grid) {
    let row = -1;
    let col = -1;
    let isEmpty = false;

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (grid[i][j] === 0) {
                row = i;
                col = j;
                isEmpty = true;
                break;
            }
        }
        if (isEmpty) break;
    }

    if (!isEmpty) return true; // Solved

    for (let num = 1; num <= 9; num++) {
        if (isSafe(grid, row, col, num)) {
            grid[row][col] = num;
            if (solveSudoku(grid)) return true;
            grid[row][col] = 0; // Backtrack
        }
    }
    return false;
}

function removeDigits(count) {
    while (count > 0) {
        let cellId = Math.floor(Math.random() * 81);
        let i = Math.floor(cellId / 9);
        let j = cellId % 9;
        if (board[i][j] !== 0) {
            board[i][j] = 0;
            count--;
        }
    }
}

// --- UI Rendering ---

function renderBoard() {
    const boardEl = document.getElementById('sudoku-board');
    boardEl.innerHTML = '';

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.id = `${r}-${c}`;
            tile.dataset.row = r;
            tile.dataset.col = c;

            if (initialBoard[r][c] !== 0) {
                tile.innerText = initialBoard[r][c];
                tile.classList.add('initial');
            } else {
                // If user filled it (re-rendering case, though usually we update purely)
                if (board[r][c] !== 0) {
                    tile.innerText = board[r][c];
                    // Check validity
                    if (board[r][c] !== solution[r][c]) {
                        tile.classList.add('error');
                    }
                }
            }

            tile.addEventListener('click', () => selectTile(tile));
            boardEl.appendChild(tile);
        }
    }
}

function selectTile(tile) {
    if (selectedTile) {
        selectedTile.classList.remove('selected');
        // Clear highlights
        document.querySelectorAll('.tile').forEach(t => {
            t.classList.remove('highlighted');
            t.classList.remove('same-num');
        });
    }

    selectedTile = tile;
    selectedTile.classList.add('selected');

    const r = parseInt(selectedTile.dataset.row);
    const c = parseInt(selectedTile.dataset.col);
    const num = board[r][c];

    // Highlight Unit (Row, Col, Box)
    highlightUnit(r, c);

    // Highlight same numbers
    if (num !== 0) {
        highlightNumber(num);
    }
}

function highlightUnit(row, col) {
    // Highlight Row & Col
    // Using simple query selectors might be slow, let's optimize if needed. 81 is small.
    document.querySelectorAll('.tile').forEach(tile => {
        let r = parseInt(tile.dataset.row);
        let c = parseInt(tile.dataset.col);

        if (r === row || c === col) {
            tile.classList.add('highlighted');
        }

        // Box
        let startRow = row - row % 3;
        let startCol = col - col % 3;
        if (r >= startRow && r < startRow + 3 && c >= startCol && c < startCol + 3) {
            tile.classList.add('highlighted');
        }
    });
}

function highlightNumber(num) {
    document.querySelectorAll('.tile').forEach(tile => {
        if (tile.innerText == num) {
            tile.classList.add('same-num');
        }
    });
}

function deselectTile() {
    if (selectedTile) {
        selectedTile.classList.remove('selected');
        selectedTile = null;
        document.querySelectorAll('.tile').forEach(t => {
            t.classList.remove('highlighted');
            t.classList.remove('same-num');
        });
    }
}

// --- Controls ---

function setupControls() {
    // Number Pad
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const num = parseInt(btn.dataset.num);
            fillNumber(num);
        });
    });

    // Erase
    document.getElementById('erase-btn').addEventListener('click', () => {
        fillNumber(0);
    });

    // New Game
    document.getElementById('new-game-btn').addEventListener('click', startNewGame);

    // Difficulty
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            difficulty = e.target.dataset.level;
            startNewGame();
        });
    });
}

function fillNumber(num) {
    if (!selectedTile) return;

    const r = parseInt(selectedTile.dataset.row);
    const c = parseInt(selectedTile.dataset.col);

    // Cannot edit initial numbers
    if (initialBoard[r][c] !== 0) return;

    // Update State
    board[r][c] = num;

    // Update UI
    if (num === 0) {
        selectedTile.innerText = '';
        selectedTile.classList.remove('error');
    } else {
        selectedTile.innerText = num;

        // Check Validity
        if (num !== solution[r][c]) {
            selectedTile.classList.add('error');
            errors++;
            updateErrorDisplay();
        } else {
            selectedTile.classList.remove('error');
            // Check win
            checkWin();
        }
    }

    // Re-highlight based on new number
    selectTile(selectedTile);
}

function updateErrorDisplay() {
    document.getElementById('error-count').innerText = errors;
}

function checkWin() {
    // Simple check: Any 0s? Any errors? (Errors are tracked visually, but logical board must match solution)
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] !== solution[i][j]) return;
        }
    }
    // Win
    alert("Congrats! You solved it!");
}
