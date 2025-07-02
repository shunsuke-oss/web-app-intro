const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let screenWidth, screenHeight;
const ASPECT_RATIO = 16 / 9;

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

const baseMap = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
];

const baseHeight = baseMap.length;
const baseWidth = baseMap[0].length;
const repeatFactor = 5;

const mapHeight = baseHeight * repeatFactor;
const mapWidth = baseWidth * repeatFactor;

let map = Array.from({ length: mapHeight }, (_, y) =>
    Array.from({ length: mapWidth }, (_, x) => {
        const tileY = Math.floor(y / baseHeight);
        const tileX = Math.floor(x / baseWidth);

        const localY = y % baseHeight;
        const localX = x % baseWidth;

        // 元マップからコピー
        let value = baseMap[localY][localX];

        // タイル間接続：タイル境界なら通路にする
        if (localX === 0 && tileX > 0) value = 0; // 左に通路
        if (localY === 0 && tileY > 0) value = 0; // 上に通路

        return value;
    })
);



let player = {
    x: 3.5,
    y: 3.5,
    dir: 0,
    fov: Math.PI / 3,
    moveSpeed: 0.05,
    rotSpeed: 0.03,
};

let playerHP = 100;
let isInvincible = false;
let invincibleTimer = 0;
let gunKick = 0;

const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

const gunSound = document.getElementById('gunSound');

function drawGun() {
    const gunWidth = screenWidth * 0.1 * (1 + gunKick * 0.2);
    const gunHeight = screenHeight * 0.2 * (1 + gunKick * 0.2);
    const gunX = (screenWidth - gunWidth) / 2 + gunKick * 10;
    const gunY = screenHeight - gunHeight - 10 - gunKick * 20;

    ctx.fillStyle = 'gray';
    ctx.fillRect(gunX, gunY, gunWidth, gunHeight);
}

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'Shift') shoot();
});

function shoot() {
    const maxShootingDistance = 10;
    let closestEnemy = null;
    let closestDistance = Infinity;

    enemies.forEach((enemy, index) => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const angleToEnemy = Math.atan2(dy, dx);
        let angleDifference = angleToEnemy - player.dir;
        if (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
        if (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

        if (Math.abs(angleDifference) < (player.fov / 20) && distance < maxShootingDistance) {
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = index;
            }
        }
    });

    if (closestEnemy !== null) {
        enemies.splice(closestEnemy, 1);
        console.log("敵を倒した！");
    }

    gunKick = 1;
    if (gunSound) {
        gunSound.currentTime = 0;
        gunSound.play();
    }
}

function castRays() {
    const numRays = screenWidth;
    for (let i = 0; i < numRays; i++) {
        const rayAngle = player.dir - player.fov / 2 + (i / numRays) * player.fov;
        let distanceToWall = 0, hitWall = false;
        const stepSize = 0.01;
        const eyeX = Math.cos(rayAngle), eyeY = Math.sin(rayAngle);

        while (!hitWall && distanceToWall < 20) {
            distanceToWall += stepSize;
            const testX = Math.floor(player.x + eyeX * distanceToWall);
            const testY = Math.floor(player.y + eyeY * distanceToWall);

            if (testX < 0 || testX >= mapWidth || testY < 0 || testY >= mapHeight || map[testY][testX] === 1) {
                hitWall = true;
            }
        }

        let ceiling = (screenHeight / 2) - screenHeight / distanceToWall;
        let floor = screenHeight - ceiling;
        const correctedDist = distanceToWall * Math.cos(rayAngle - player.dir);
        const brightness = Math.max(0, 1 - correctedDist / 10);

        ctx.fillStyle = `rgba(255,255,255,${brightness})`;
        ctx.fillRect(i, ceiling, 1, floor - ceiling);

        ctx.fillStyle = '#222';
        ctx.fillRect(i, floor, 1, screenHeight - floor);
    }
}

const enemies = [
    { x: 5.5, y: 3.5, size: 0.5 },
    { x: 2.5, y: 4.5, size: 0.5 },
];

function drawEnemies() {
    enemies.forEach(enemy => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const angleToEnemy = Math.atan2(dy, dx);
        let angleDifference = angleToEnemy - player.dir;

        if (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
        if (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

        if (Math.abs(angleDifference) < player.fov / 2) {
            const screenX = (0.5 + angleDifference / player.fov) * screenWidth;
            const enemyHeight = Math.min(screenHeight, screenHeight / distance * enemy.size * 50);
            const enemyTop = (screenHeight / 2) - enemyHeight / 2;

            ctx.fillStyle = 'red';
            ctx.fillRect(screenX - enemyHeight / 4, enemyTop, enemyHeight / 2, enemyHeight);
        }
    });
}

function drawMiniMap() {
    const scale = 20;

    // ミニマップ表示範囲
    const viewWidth = baseWidth;
    const viewHeight = baseHeight;

    const topLeftX = Math.max(0, Math.floor(player.x) - Math.floor(viewWidth / 2));
    const topLeftY = Math.max(0, Math.floor(player.y) - Math.floor(viewHeight / 2));

    for (let y = 0; y < viewHeight; y++) {
        for (let x = 0; x < viewWidth; x++) {
            const mapX = topLeftX + x;
            const mapY = topLeftY + y;

            // マップ外は描かない
            if (mapY >= mapHeight || mapX >= mapWidth) continue;

            ctx.fillStyle = map[mapY][mapX] === 1 ? 'gray' : 'black';
            ctx.fillRect(x * scale, y * scale, scale, scale);
        }
    }

    // プレイヤー位置をミニマップ内に描く
    const relativeX = (player.x - topLeftX) * scale;
    const relativeY = (player.y - topLeftY) * scale;
    ctx.fillStyle = 'red';
    ctx.fillRect(relativeX - 5, relativeY - 5, 10, 10);

    // 向き線
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(relativeX, relativeY);
    ctx.lineTo(
        relativeX + Math.cos(player.dir) * 20,
        relativeY + Math.sin(player.dir) * 20
    );
    ctx.stroke();
}


function drawUI() {
    const barWidth = screenWidth * 0.3;
    const barHeight = 20;
    const barX = 20;
    const barY = screenHeight - barHeight - 20; // 左下から20px余白

    const hpRatio = playerHP / 100;

    // HP残量に応じて色変更
    let barColor;
    if (hpRatio > 0.5) {
        barColor = 'green';
    } else if (hpRatio > 0.2) {
        barColor = 'yellow';
    } else {
        barColor = 'red';
    }

    // 背景バー（灰色）
    ctx.fillStyle = 'gray';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // HPゲージ
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // HP数値をゲージの中、左側に重ねて表示
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`HP: ${Math.max(0, playerHP)}`, barX + 5, barY + barHeight / 2);
}

function gameLoop() {
    if (keys['arrowup'] || keys['w']) {
        let newX = player.x + Math.cos(player.dir) * player.moveSpeed;
        let newY = player.y + Math.sin(player.dir) * player.moveSpeed;
        if (map[Math.floor(newY)][Math.floor(newX)] === 0) {
            player.x = newX; player.y = newY;
        }
    }
    if (keys['arrowdown'] || keys['s']) {
        let newX = player.x - Math.cos(player.dir) * player.moveSpeed;
        let newY = player.y - Math.sin(player.dir) * player.moveSpeed;
        if (map[Math.floor(newY)][Math.floor(newX)] === 0) {
            player.x = newX; player.y = newY;
        }
    }
    if (keys['arrowleft'] || keys['a']) player.dir -= player.rotSpeed;
    if (keys['arrowright'] || keys['d']) player.dir += player.rotSpeed;

    if (gunKick > 0) gunKick -= 0.1;

    // 無敵時間の経過を管理
    if (isInvincible) {
        invincibleTimer -= 1 / 60; // 60FPS想定
        if (invincibleTimer <= 0) {
            isInvincible = false;
        }
    }

    // 敵との接触チェック
    if (!isInvincible) {
        enemies.forEach(enemy => {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 0.5) { // 0.5以内で接触と判定
                playerHP -= 10;
                isInvincible = true;
                invincibleTimer = 2; // 2秒の無敵時間
                console.log("敵に当たった！HP:", playerHP);
            }
        });
    }

    ctx.clearRect(0, 0, screenWidth, screenHeight);
    ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, screenWidth, screenHeight / 2);
    ctx.fillStyle = '#654321'; ctx.fillRect(0, screenHeight / 2, screenWidth, screenHeight / 2);

    castRays();
    drawEnemies();
    drawMiniMap();
    drawGun();
    drawUI();

    requestAnimationFrame(gameLoop);
}

gameLoop();
