<template>
  <div class="game-container">
    <h1>Vue Tower Defense</h1>
    <canvas ref="gameCanvas" width="800" height="600"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const gameCanvas = ref(null);

onMounted(() => {
  const canvas = gameCanvas.value;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error("Could not get canvas context");
    return;
  }

  // Game variables
  let score = 0;
  const path = [
    { x: 0, y: 300 },
    { x: 200, y: 300 },
    { x: 200, y: 100 },
    { x: 600, y: 100 },
    { x: 600, y: 500 },
    { x: 800, y: 500 },
  ];

  const enemies = [];
  const towers = [];

  // Game Classes
  class Enemy {
    constructor(x, y, speed = 1, health = 100) {
      this.x = x;
      this.y = y;
      this.width = 20;
      this.height = 20;
      this.speed = speed;
      this.health = health;
      this.pathIndex = 0;
    }

    move() {
      if (this.pathIndex < path.length - 1) {
        const target = path[this.pathIndex + 1];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
          this.pathIndex++;
        } else {
          this.x += (dx / distance) * this.speed;
          this.y += (dy / distance) * this.speed;
        }
      }
    }

    draw() {
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }
  }

  // Function to spawn enemies
  function spawnEnemy() {
    enemies.push(new Enemy(path[0].x, path[0].y));
  }

  // Draw everything
  function draw() {
    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw path
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    // Draw enemies
    enemies.forEach(enemy => enemy.draw());
  }

  // Game loop
  function gameLoop() {
    // Update game state
    enemies.forEach(enemy => enemy.move());

    // Draw the game
    draw();

    requestAnimationFrame(gameLoop);
  }

  // Start the game
  setInterval(spawnEnemy, 2000); // Spawn an enemy every 2 seconds
  gameLoop();
});
</script>

<style scoped>
.game-container {
  text-align: center;
}
canvas {
  border: 1px solid black;
  background-color: #f0f0f0;
}
</style>
