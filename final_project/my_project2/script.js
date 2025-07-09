const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ASPECT_RATIO = 16 / 9;
let screenWidth, screenHeight;

function resizeCanvas() {
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    if (windowWidth / windowHeight > ASPECT_RATIO) {
        canvas.height = windowHeight;
        canvas.width = windowHeight * ASPECT_RATIO;
    } else {
        canvas.width = windowWidth;
        canvas.height = windowWidth / ASPECT_RATIO;
    }
    screenWidth = canvas.width;
    screenHeight = canvas.height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==== マップ生成 ====
const mapWidth = 20;
const mapHeight = 20;

function createEmptyMap() {
    const m = [];
    for (let y = 0; y < mapHeight; y++) {
        m[y] = [];
        for (let x = 0; x < mapWidth; x++) {
            m[y][x] = (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1) ? 1 : 0;
        }
    }
    return m;
}

let map = createEmptyMap();

const wallPatterns = {
    L: [[0, 0], [1, 0], [0, 1]],
    I: [[0, 0], [1, 0], [2, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
};

function generateRandomWalls(map, attempts = 30) {
    for (let i = 0; i < attempts; i++) {
        const keys = Object.keys(wallPatterns);
        const pattern = wallPatterns[keys[Math.floor(Math.random() * keys.length)]];
        const maxX = mapWidth - 2 - Math.max(...pattern.map(p => p[0]));
        const maxY = mapHeight - 2 - Math.max(...pattern.map(p => p[1]));
        const x = 1 + Math.floor(Math.random() * maxX);
        const y = 1 + Math.floor(Math.random() * maxY);

        let canPlace = true;
        for (let dy = -1; dy <= 2; dy++) {
            for (let dx = -1; dx <= 2; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                if (map[checkY]?.[checkX] === 1) {
                    canPlace = false;
                    break;
                }
            }
            if (!canPlace) break;
        }

        if (!canPlace) continue;

        for (const [px, py] of pattern) {
            map[y + py][x + px] = 1;
        }
    }
}
generateRandomWalls(map);

function findSafePlayerStart() {
    for (let y = 1; y < mapHeight - 1; y++) {
        for (let x = 1; x < mapWidth - 1; x++) {
            if (
                map[y][x] === 0 &&
                map[y - 1][x] === 0 &&
                map[y + 1][x] === 0 &&
                map[y][x - 1] === 0 &&
                map[y][x + 1] === 0
            ) {
                return { x: x + 0.5, y: y + 0.5 };
            }
        }
    }
    return { x: 1.5, y: 1.5 };
}

const start = findSafePlayerStart();
let player = {
    x: start.x,
    y: start.y,
    dir: 0,
    fov: Math.PI / 3,
    moveSpeed: 0.05,
    rotSpeed: 0.03,
    hp: 100,
    alive: true
};

let gunKick = 0;
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (!player.alive && e.key === ' ') {
        restartGame();
    }
});

window.addEventListener('keyup', (e) => keys[e.key] = false);

const gunSound = document.getElementById('gunSound');

function drawHPBar() {
    const barWidth = 200;
    const barHeight = 20;
    const margin = 20;
    const x = margin;
    const y = canvas.height - barHeight - margin;
    const hpRatio = player.hp / 100;
    let color = 'green';
    if (player.hp < 50) color = 'yellow';
    if (player.hp < 30) color = 'red';

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
}

function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

function drawGun() {
    const gunWidth = screenWidth * 0.1 * (1 + gunKick * 0.2);
    const gunHeight = screenHeight * 0.2 * (1 + gunKick * 0.2);
    const gunX = (screenWidth - gunWidth) / 2 + gunKick * 10;
    const gunY = screenHeight - gunHeight - 10 - gunKick * 20;

    ctx.fillStyle = 'gray';
    ctx.fillRect(gunX, gunY, gunWidth, gunHeight);
}

// === 敵処理 ===
let enemies = [];

function findEnemySpawnPositions(count) {
    const positions = [];
    for (let y = 1; y < mapHeight - 1; y++) {
        for (let x = 1; x < mapWidth - 1; x++) {
            if (
                map[y][x] === 0 &&
                map[y - 1][x] === 0 &&
                map[y + 1][x] === 0 &&
                map[y][x - 1] === 0 &&
                map[y][x + 1] === 0
            ) {
                positions.push({ x: x + 0.5, y: y + 0.5 });
            }
        }
    }
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    return positions.slice(0, count);
}

function spawnEnemiesIfNeeded() {
    if (enemies.length >= 5) return;
    const newPositions = findEnemySpawnPositions(5 - enemies.length);
    newPositions.forEach(pos => {
        enemies.push({ x: pos.x, y: pos.y, size: 0.4, speed: 0.02 });
    });
}

function isWall(x, y) {
    return map[Math.floor(y)]?.[Math.floor(x)] === 1;
}

let lastDamageTime = 0;

function updateEnemies(deltaTime) {
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.1) {
            const nx = enemy.x + (dx / dist) * enemy.speed;
            const ny = enemy.y + (dy / dist) * enemy.speed;
            if (!isWall(nx, ny)) {
                enemy.x = nx;
                enemy.y = ny;
            }
        }

        if (dist < 0.4 && player.alive) {
            if (performance.now() - lastDamageTime > 500) {
                player.hp -= 10;
                lastDamageTime = performance.now();
                enemy.x += (Math.random() - 0.5);
                enemy.y += (Math.random() - 0.5);
                if (player.hp <= 0) {
                    player.hp = 0;
                    player.alive = false;
                }
            }
        }
    });
}

function drawEnemiesOnMiniMap(scale) {
    ctx.fillStyle = 'red';
    enemies.forEach(enemy => {
        ctx.beginPath();
        ctx.arc(enemy.x * scale, enemy.y * scale, scale / 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

function shoot() {
    const maxDistance = 10;
    let closest = null;
    let minDist = Infinity;

    enemies.forEach((enemy, i) => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy);
        const angleToEnemy = Math.atan2(dy, dx);
        const diff = normalizeAngle(angleToEnemy - player.dir);

        if (Math.abs(diff) < player.fov / 10 && dist < maxDistance && dist < minDist) {
            closest = i;
            minDist = dist;
        }
    });

    if (closest !== null) enemies.splice(closest, 1);

    gunKick = 1;
    if (gunSound) {
        gunSound.currentTime = 0;
        gunSound.play();
    }
}

// === グローバルイベント ===
canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
        document.addEventListener('mousemove', onMouseMove);
    } else {
        document.removeEventListener('mousemove', onMouseMove);
    }
});

function onMouseMove(e) {
    player.dir += e.movementX * 0.002;
    player.dir = normalizeAngle(player.dir);
}

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) shoot();
});

function castRays() {
    const numRays = 300;
    for (let i = 0; i < numRays; i++) {
        const rayAngle = player.dir - player.fov / 2 + (i / numRays) * player.fov;
        let distance = 0;
        const step = 0.01;
        const eyeX = Math.cos(rayAngle);
        const eyeY = Math.sin(rayAngle);
        let hit = false;

        while (!hit && distance < 20) {
            distance += step;
            const testX = Math.floor(player.x + eyeX * distance);
            const testY = Math.floor(player.y + eyeY * distance);
            if (map[testY]?.[testX] === 1) hit = true;
        }

        const correctedDist = distance * Math.cos(rayAngle - player.dir);
        const brightness = Math.max(0.3, 1 - correctedDist / 10);

        const ceiling = screenHeight / 2 - screenHeight / correctedDist;
        const floor = screenHeight - ceiling;
        const wallHeight = floor - ceiling;

        const wallShade = `rgba(150,150,150,${brightness})`;
        const drawX = (i / numRays) * screenWidth;
        const drawW = screenWidth / numRays;

        ctx.fillStyle = wallShade;
        ctx.fillRect(drawX, ceiling, drawW, wallHeight);
    }
}

function drawMiniMap(scale) {
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            ctx.fillStyle = map[y][x] === 1 ? 'black' : 'white';
            ctx.fillRect(x * scale, y * scale, scale, scale);
        }
    }

    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(player.x * scale, player.y * scale, scale / 2, 0, Math.PI * 2);
    ctx.fill();

    drawEnemiesOnMiniMap(scale);
}

function updatePlayer() {
    const moveSpeed = player.moveSpeed * (keys['Shift'] ? 2 : 1);

    if (keys['w']) {
        const nx = player.x + Math.cos(player.dir) * moveSpeed;
        const ny = player.y + Math.sin(player.dir) * moveSpeed;
        if (!isWall(nx, ny)) {
            player.x = nx;
            player.y = ny;
        }
    }
    if (keys['s']) {
        const nx = player.x - Math.cos(player.dir) * moveSpeed;
        const ny = player.y - Math.sin(player.dir) * moveSpeed;
        if (!isWall(nx, ny)) {
            player.x = nx;
            player.y = ny;
        }
    }
    if (keys['a']) {
        const nx = player.x + Math.cos(player.dir - Math.PI / 2) * moveSpeed;
        const ny = player.y + Math.sin(player.dir - Math.PI / 2) * moveSpeed;
        if (!isWall(nx, ny)) {
            player.x = nx;
            player.y = ny;
        }
    }
    if (keys['d']) {
        const nx = player.x + Math.cos(player.dir + Math.PI / 2) * moveSpeed;
        const ny = player.y + Math.sin(player.dir + Math.PI / 2) * moveSpeed;
        if (!isWall(nx, ny)) {
            player.x = nx;
            player.y = ny;
        }
    }

    gunKick *= 0.9;
    if (gunKick < 0.01) gunKick = 0;
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);

    ctx.font = 'bold 32px Arial';
    ctx.fillText('Press SPACE to Restart', canvas.width / 2, canvas.height / 2 + 60);
}

function restartGame() {
    player.hp = 100;
    player.alive = true;
    player.x = start.x;
    player.y = start.y;
    player.dir = 0;
    enemies = [];
    gunKick = 0;
    lastDamageTime = 0;
    gameLoop();
}

// --- 初回起動 ---
let lastTime = 0;

function gameLoop(time = 0) {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (player.alive) {
        updatePlayer();
        updateEnemies(delta);
        spawnEnemiesIfNeeded();
        castRays();
        drawMiniMap(10);
        drawGun();
        drawHPBar();
        requestAnimationFrame(gameLoop);
    } else {
        drawGameOver();
    }
}

gameLoop();
