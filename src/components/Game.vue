<template>
  <div class="game-container">
    <h1>Vue Tower Defense</h1>
    <canvas ref="gameCanvas" width="450" height="800"></canvas>
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
    { x: 50, y: 0 },
    { x: 50, y: 300 },
    { x: 400, y: 300 },
    { x: 400, y: 750 },
    { x: 400, y: 800 },
  ];

  const enemies = [];
  const towers = [];
  const projectiles = [];

  // Game Classes
  class Projectile {
    constructor(x, y, target, damage, speed = 5) {
      this.x = x;
      this.y = y;
      this.target = target;
      this.damage = damage;
      this.speed = speed;
      this.radius = 3;
    }

    move() {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.speed) {
        this.x = this.target.x;
        this.y = this.target.y;
        return true; // Reached target
      } else {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
        return false;
      }
    }

    draw() {
      ctx.fillStyle = 'gold';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  class Tower {
    constructor(x, y, range = 150, damage = 20, attackSpeed = 60) { // attackSpeed in frames
      this.x = x;
      this.y = y;
      this.width = 40;
      this.height = 40;
      this.range = range;
      this.damage = damage;
      this.attackSpeed = attackSpeed;
      this.attackCooldown = 0;
    }

    draw() {
      ctx.fillStyle = 'blue';
      ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

      // Draw range circle (for debugging)
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
      ctx.stroke();
    }

    update() {
      if (this.attackCooldown > 0) {
        this.attackCooldown--;
        return;
      }

      const target = enemies.find(enemy => {
        const dist = Math.sqrt(Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2));
        return dist <= this.range;
      });

      if (target) {
        projectiles.push(new Projectile(this.x, this.y, target, this.damage));
        this.attackCooldown = this.attackSpeed;
      }
    }
  }

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

    // Draw towers
    towers.forEach(tower => tower.draw());

    // Draw projectiles
    projectiles.forEach(projectile => projectile.draw());
  }

  // Game loop
  function gameLoop() {
    // Update game state
    enemies.forEach(enemy => enemy.move());

    // Update towers
    towers.forEach(tower => tower.update());

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (projectiles[i].move()) {
        projectiles[i].target.health -= projectiles[i].damage;
        projectiles.splice(i, 1);
      }
    }

    // Remove dead enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].health <= 0) {
        enemies.splice(i, 1);
      }
    }

    // Draw the game
    draw();

    requestAnimationFrame(gameLoop);
  }

  // Helper function to check if a point is on the path
  function isOnPath(x, y) {
    // This is a simplified check. A more robust solution would check distance to path segments.
    // For now, we'll just check if it's within the general path area.
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i+1];
      // Check if x is between p1.x and p2.x (inclusive) and y is between p1.y and p2.y (inclusive)
      // Considering the path width (20)
      const minX = Math.min(p1.x, p2.x) - 10;
      const maxX = Math.max(p1.x, p2.x) + 10;
      const minY = Math.min(p1.y, p2.y) - 10;
      const maxY = Math.max(p1.y, p2.y) + 10;

      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return true;
      }
    }
    return false;
  }

  // Event listener for tower placement
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Basic check to prevent placing towers on the path
    if (!isOnPath(x, y)) {
      towers.push(new Tower(x, y));
    } else {
      console.log("Cannot place tower on path!");
    }
  });

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
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto; /* Center the canvas */
}
</style>
