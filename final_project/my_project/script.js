const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const screenWidth = canvas.width;
const screenHeight = canvas.height;

const map = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
];

const mapWidth = map[0].length;
const mapHeight = map.length;

let player = {
  x: 3.5,
  y: 3.5,
  dir: 0,
  fov: Math.PI / 3,
  moveSpeed: 0.05,
  rotSpeed: 0.03,
};

const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

function castRays() {
  const numRays = screenWidth;

  for (let i = 0; i < numRays; i++) {
    const rayAngle = player.dir - player.fov / 2 + (i / numRays) * player.fov;

    let distanceToWall = 0;
    const stepSize = 0.01;

    let hitWall = false;

    let eyeX = Math.cos(rayAngle);
    let eyeY = Math.sin(rayAngle);

    while (!hitWall && distanceToWall < 20) {
      distanceToWall += stepSize;
      const testX = Math.floor(player.x + eyeX * distanceToWall);
      const testY = Math.floor(player.y + eyeY * distanceToWall);

      if (testX < 0 || testX >= mapWidth || testY < 0 || testY >= mapHeight) {
        hitWall = true;
        distanceToWall = 20;
      } else {
        if (map[testY][testX] === 1) {
          hitWall = true;
        }
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

function gameLoop() {
  if (keys['arrowup'] || keys['w']) {
    let newX = player.x + Math.cos(player.dir) * player.moveSpeed;
    let newY = player.y + Math.sin(player.dir) * player.moveSpeed;
    if (map[Math.floor(newY)][Math.floor(newX)] === 0) {
      player.x = newX;
      player.y = newY;
    }
  }
  if (keys['arrowdown'] || keys['s']) {
    let newX = player.x - Math.cos(player.dir) * player.moveSpeed;
    let newY = player.y - Math.sin(player.dir) * player.moveSpeed;
    if (map[Math.floor(newY)][Math.floor(newX)] === 0) {
      player.x = newX;
      player.y = newY;
    }
  }
  if (keys['arrowleft'] || keys['a']) {
    player.dir -= player.rotSpeed;
  }
  if (keys['arrowright'] || keys['d']) {
    player.dir += player.rotSpeed;
  }

  ctx.clearRect(0, 0, screenWidth, screenHeight);

  castRays();

  requestAnimationFrame(gameLoop);
}

gameLoop();
