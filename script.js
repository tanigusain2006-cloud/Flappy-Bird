const config = {
  sky_color: "#87CEEB",
  bird_color: "#FFD700",
  pipe_color: "#228B22",
  ground_color: "#8B4513",
  button_color: "#FF6B6B",
  game_title: "Bird Flopping Game",
  tap_instruction: "Click, tap, or press SPACE to flap!"
};

// Day/Night cycle colors
const skyColors = {
  morning: { top: "#FFB347", bottom: "#87CEEB", sun: "#FDB813" },
  afternoon: { top: "#87CEEB", bottom: "#B0E0E6", sun: "#FFD700" },
  evening: { top: "#FF6B6B", bottom: "#FF8E53", sun: "#FF4500" },
  night: { top: "#0C1445", bottom: "#1a2a6c", sun: "#F0E68C" }
};

let currentTimeOfDay = 'morning';
let nextTimeOfDay = 'afternoon';
let transitionProgress = 0;
let transitionSpeed = 0.002;
let highestScore = 0;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over-screen');
const restartButton = document.getElementById('restart-button');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameContainer = document.getElementById('game-container');

let gameStarted = false;
let gameOver = false;
let score = 0;
let distanceTraveled = 0;
let bird = { x: 100, y: 0, velocity: 0, radius: 20 };
let pipes = [];
let ground = { y: 0, speed: 2 };
const gravity = 0.5;
const jumpStrength = -10;
const pipeWidth = 80;
const pipeGap = 200;
const pipeSpeed = 3;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ground.y = canvas.height - 100;
  if (!gameStarted) {
    bird.y = canvas.height / 2;
  }
}

function drawBird() {
  const angle = bird.velocity * 0.05;
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(angle);
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(2, 3, bird.radius, bird.radius * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body with gradient
  const bodyGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, bird.radius);
  bodyGradient.addColorStop(0, adjustBrightness(config.bird_color, 40));
  bodyGradient.addColorStop(1, config.bird_color);
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.radius, bird.radius * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Wing animated
  const wingFlap = Math.sin(Date.now() / 100) * 0.5;
  ctx.fillStyle = adjustBrightness(config.bird_color, -30);
  ctx.beginPath();
  ctx.ellipse(-5, 5, 12, 8, wingFlap, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Eye white
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(8, -5, 7, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye pupil
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(10, -5, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye shine
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(11, -6, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Beak
  ctx.fillStyle = '#FF6347';
  ctx.beginPath();
  ctx.moveTo(15, -2);
  ctx.lineTo(28, 0);
  ctx.lineTo(15, 2);
  ctx.closePath();
  ctx.fill();
  
  // Tail
  ctx.fillStyle = config.bird_color;
  ctx.beginPath();
  ctx.moveTo(-bird.radius, -5);
  ctx.lineTo(-bird.radius - 10, -8);
  ctx.lineTo(-bird.radius - 8, 0);
  ctx.lineTo(-bird.radius - 10, 8);
  ctx.lineTo(-bird.radius, 5);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function drawPipe(pipe) {
  // Main pipe body with gradient
  const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
  pipeGradient.addColorStop(0, config.pipe_color);
  pipeGradient.addColorStop(0.5, adjustBrightness(config.pipe_color, 20));
  pipeGradient.addColorStop(1, config.pipe_color);
  
  // Top pipe
  ctx.fillStyle = pipeGradient;
  ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
  
  // Bottom pipe
  ctx.fillRect(pipe.x, pipe.topHeight + pipeGap, pipeWidth, canvas.height - pipe.topHeight - pipeGap - 100);
  
  // Pipe caps with darker color
  ctx.fillStyle = adjustBrightness(config.pipe_color, -30);
  const capHeight = 35;
  const capWidth = pipeWidth + 10;
  
  // Top cap
  ctx.fillRect(pipe.x - 5, pipe.topHeight - capHeight, capWidth, capHeight);
  // Bottom cap
  ctx.fillRect(pipe.x - 5, pipe.topHeight + pipeGap, capWidth, capHeight);
  
  // Pipe highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(pipe.x + 5, 0, 8, pipe.topHeight);
  ctx.fillRect(pipe.x + 5, pipe.topHeight + pipeGap, 8, canvas.height - pipe.topHeight - pipeGap - 100);
}

function adjustBrightness(color, amount) {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function drawGround() {
  // Ground gradient
  const groundGradient = ctx.createLinearGradient(0, ground.y, 0, ground.y + 100);
  groundGradient.addColorStop(0, adjustBrightness(config.ground_color, 30));
  groundGradient.addColorStop(1, adjustBrightness(config.ground_color, -20));
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, ground.y, canvas.width, 100);
  
  // Grass/texture on top
  ctx.fillStyle = adjustBrightness(config.ground_color, 40);
  for (let i = 0; i < canvas.width; i += 15) {
    const height = 10 + Math.sin(i * 0.1) * 5;
    ctx.fillRect(i, ground.y - height, 8, height);
  }
  
  // Ground pattern
  ctx.fillStyle = adjustBrightness(config.ground_color, -30);
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.fillRect(i, ground.y + 10, 2, 90);
  }
  
  for (let y = ground.y + 20; y < ground.y + 100; y += 20) {
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.fillRect(x + 10, y, 20, 2);
    }
  }
}

function lerpColor(color1, color2, t) {
  const r1 = parseInt(color1.substr(1, 2), 16);
  const g1 = parseInt(color1.substr(3, 2), 16);
  const b1 = parseInt(color1.substr(5, 2), 16);
  const r2 = parseInt(color2.substr(1, 2), 16);
  const g2 = parseInt(color2.substr(3, 2), 16);
  const b2 = parseInt(color2.substr(5, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function drawSky() {
  const currentColors = skyColors[currentTimeOfDay];
  const nextColors = skyColors[nextTimeOfDay];
  
  // Interpolate colors for smooth transition
  const topColor = lerpColor(currentColors.top, nextColors.top, transitionProgress);
  const bottomColor = lerpColor(currentColors.bottom, nextColors.bottom, transitionProgress);
  const sunColor = lerpColor(currentColors.sun, nextColors.sun, transitionProgress);
  
  // Create gradient sky
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw sun/moon
  const sunX = canvas.width * 0.8;
  const sunY = canvas.height * 0.2;
  const sunRadius = 40;
  
  // Sun glow
  const glowGradient = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, sunRadius * 2);
  glowGradient.addColorStop(0, sunColor + 'AA');
  glowGradient.addColorStop(1, sunColor + '00');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius * 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Sun/Moon body
  ctx.fillStyle = sunColor;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Stars for night
  if (currentTimeOfDay === 'night') {
    ctx.fillStyle = 'white';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % canvas.width;
      const y = (i * 73.3) % (canvas.height * 0.6);
      const size = Math.random() * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Clouds
  if (currentTimeOfDay !== 'night') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    drawCloud(canvas.width * 0.2, canvas.height * 0.15, 60);
    drawCloud(canvas.width * 0.6, canvas.height * 0.25, 50);
    drawCloud(canvas.width * 0.4, canvas.height * 0.35, 55);
  }
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y, size * 0.6, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y - size * 0.3, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function updateBird() {
  bird.velocity += gravity;
  bird.y += bird.velocity;

  if (bird.y + bird.radius > ground.y) {
    bird.y = ground.y - bird.radius;
    endGame();
  }

  if (bird.y - bird.radius < 0) {
    bird.y = bird.radius;
  }
}

function updatePipes() {
  if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 300) {
    const topHeight = Math.random() * (canvas.height - pipeGap - 200 - 100) + 100;
    pipes.push({ x: canvas.width, topHeight: topHeight, scored: false });
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].x -= pipeSpeed;

    if (pipes[i].x + pipeWidth < 0) {
      pipes.splice(i, 1);
      continue;
    }

    if (
      bird.x + bird.radius > pipes[i].x &&
      bird.x - bird.radius < pipes[i].x + pipeWidth &&
      (bird.y - bird.radius < pipes[i].topHeight || bird.y + bird.radius > pipes[i].topHeight + pipeGap)
    ) {
      endGame();
    }
  }
  
  // Update distance score continuously
  if (gameStarted && !gameOver) {
    distanceTraveled += pipeSpeed;
    score = Math.floor(distanceTraveled / 30);
    scoreDisplay.textContent = score;
    if (score > highestScore) {
      highestScore = score;
    }
  }
}

function updateTimeOfDay() {
  transitionProgress += transitionSpeed;
  
  if (transitionProgress >= 1) {
    transitionProgress = 0;
    currentTimeOfDay = nextTimeOfDay;
    
    const times = ['morning', 'afternoon', 'evening', 'night'];
    const currentIndex = times.indexOf(currentTimeOfDay);
    nextTimeOfDay = times[(currentIndex + 1) % times.length];
  }
}

function gameLoop() {
  if (gameOver || !gameStarted) return;
  
  updateTimeOfDay();
  drawSky();
  
  for (let pipe of pipes) {
    drawPipe(pipe);
  }
  
  drawGround();
  updatePipes();
  updateBird();
  drawBird();

  requestAnimationFrame(gameLoop);
}

function jump() {
  if (!gameStarted) {
    startGame();
    return;
  }
  if (gameOver) return;
  bird.velocity = jumpStrength;
}

function startGame() {
  gameStarted = true;
  gameOver = false;
  score = 0;
  distanceTraveled = 0;
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  pipes = [];
  scoreDisplay.textContent = '0';
  startScreen.classList.add('hidden');
  gameOverScreen.classList.remove('visible');
  gameLoop();
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  
  const finalScoreValue = document.getElementById('final-score-value');
  const bestScoreValue = document.getElementById('best-score-value');
  
  finalScoreValue.textContent = score;
  bestScoreValue.textContent = highestScore;
  gameOverScreen.classList.add('visible');
}

function resetGame() {
  gameStarted = false;
  gameOver = false;
  score = 0;
  distanceTraveled = 0;
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  pipes = [];
  currentTimeOfDay = 'morning';
  nextTimeOfDay = 'afternoon';
  transitionProgress = 0;
  scoreDisplay.textContent = '0';
  startScreen.classList.remove('hidden');
  gameOverScreen.classList.remove('visible');
  drawSky();
  drawGround();
  drawBird();
}

// Keyboard controls for desktop
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    jump();
  }
});

// Button event listeners
startButton.addEventListener('click', function(e) {
  e.preventDefault();
  e.stopPropagation();
  startGame();
});

restartButton.addEventListener('click', function(e) {
  e.preventDefault();
  e.stopPropagation();
  resetGame();
});

// Touch events for mobile on buttons
startButton.addEventListener('touchend', function(e) {
  e.preventDefault();
  e.stopPropagation();
  startGame();
}, { passive: false });

restartButton.addEventListener('touchend', function(e) {
  e.preventDefault();
  e.stopPropagation();
  resetGame();
}, { passive: false });

// Game container click/touch for jumping
gameContainer.addEventListener('click', function(e) {
  if (e.target === gameContainer || e.target === canvas) {
    jump();
  }
});

gameContainer.addEventListener('touchstart', function(e) {
  if (e.target === gameContainer || e.target === canvas) {
    e.preventDefault();
    jump();
  }
}, { passive: false });

gameContainer.addEventListener('touchmove', function(e) {
  e.preventDefault();
}, { passive: false });

window.addEventListener('resize', resizeCanvas);

// Prevent scrolling on mobile
document.body.addEventListener('touchmove', function(e) {
  e.preventDefault();
}, { passive: false });

// Initialize
resizeCanvas();
document.getElementById('start-title').textContent = config.game_title;
document.getElementById('start-instruction').textContent = config.tap_instruction;
document.getElementById('start-button').style.backgroundColor = config.button_color;

drawSky();
drawGround();
drawBird();
