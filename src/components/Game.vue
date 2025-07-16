<template>
  <div class="game-container">
    <h1>Vue Tower Defense</h1>
    <div class="stats">
      <span>Money: {{ money }}</span>
      <span>Score: {{ score }}</span>
    </div>
    <div class="controls">
      <button @click="selectUnit('base')">Place Base (50)</button>
      <button @click="selectUnit('wall')">Place Wall (20)</button>
    </div>

    <!-- Module Selection Panel -->
    <div v-if="selectedBase && !selectedBase.module" class="module-panel">
      <h4>Build Module</h4>
      <button @click="buildModule('machine_gun')" :disabled="money < 100">Machine Gun (100)</button>
      <button v-if="cannonResearched" @click="buildModule('cannon')" :disabled="money < 250">Cannon (250)</button>
      <button @click="selectedBase = null">Cancel</button>
    </div>

    <div class="research">
      <button v-if="!cannonResearched" @click="researchCannon" :disabled="money < cannonResearchCost">
        Research Cannon ({{ cannonResearchCost }})
      </button>
    </div>
    <canvas ref="gameCanvas" width="450" height="800"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const gameCanvas = ref(null);
const selectedUnitType = ref(null);
const money = ref(200); // Starting money
const score = ref(0);
const cannonResearched = ref(false);
const cannonResearchCost = 500;
const selectedBase = ref(null); // To track the clicked base for module building

const selectUnit = (type) => {
  selectedUnitType.value = type;
  selectedBase.value = null; // Deselect any base when choosing a new unit to place
  console.log(`Selected: ${type}`);
};

const researchCannon = () => {
  if (money.value >= cannonResearchCost) {
    money.value -= cannonResearchCost;
    cannonResearched.value = true;
    console.log("Cannon researched!");
  }
};

onMounted(() => {
  const canvas = gameCanvas.value;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error("Could not get canvas context");
    return;
  }

  // Game variables
  const path = [
    { x: 50, y: 0 },
    { x: 50, y: 300 },
    { x: 400, y: 300 },
    { x: 400, y: 750 },
    { x: 400, y: 800 },
  ];

  const enemies = [];
  const bases = []; // Replaces towers array
  const projectiles = [];
  const walls = [];
  const defenseAreas = [];

  // Game Classes
  class Projectile {
    constructor(x, y, target, damage, speed = 5, splashRadius = 0) {
      this.x = x;
      this.y = y;
      this.target = target;
      this.damage = damage;
      this.speed = speed;
      this.radius = 3;
      this.splashRadius = splashRadius;
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

  class Base {
      constructor(x, y) {
          this.x = x;
          this.y = y;
          this.width = 40;
          this.height = 40;
          this.cost = 50;
          this.module = null; // To hold the weapon module
      }

      draw() {
          ctx.fillStyle = '#aaa';
          ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
          if (this.module) {
              this.module.draw();
          }
      }

      update() {
          if (this.module) {
              this.module.update();
          }
      }
  }

  class MachineGunModule {
      constructor(base) {
          this.base = base;
          this.range = 150;
          this.damage = 20;
          this.attackSpeed = 60; // in frames
          this.attackCooldown = 0;
          this.cost = 100;
      }

      draw() {
          ctx.fillStyle = 'blue';
          ctx.fillRect(this.base.x - 15, this.base.y - 15, 30, 30);
          // Draw range circle
          ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(this.base.x, this.base.y, this.range, 0, Math.PI * 2);
          ctx.stroke();
      }

      update() {
          if (this.attackCooldown > 0) {
              this.attackCooldown--;
              return;
          }
          const target = enemies.find(enemy => {
              const dist = Math.sqrt(Math.pow(enemy.x - this.base.x, 2) + Math.pow(enemy.y - this.base.y, 2));
              return dist <= this.range;
          });
          if (target) {
              projectiles.push(new Projectile(this.base.x, this.base.y, target, this.damage));
              this.attackCooldown = this.attackSpeed;
          }
      }
  }

  class CannonModule {
      constructor(base) {
          this.base = base;
          this.range = 120;
          this.damage = 40;
          this.attackSpeed = 180; // in frames
          this.cost = 250;
      }

      draw() {
          ctx.fillStyle = 'darkgreen';
          ctx.fillRect(this.base.x - 20, this.base.y - 20, 40, 40);
          // Draw range circle
          ctx.strokeStyle = 'rgba(0, 100, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(this.base.x, this.base.y, this.range, 0, Math.PI * 2);
          ctx.stroke();
      }

      update() {
          if (this.attackCooldown > 0) {
              this.attackCooldown--;
              return;
          }
          const target = enemies.find(enemy => {
              const dist = Math.sqrt(Math.pow(enemy.x - this.base.x, 2) + Math.pow(enemy.y - this.base.y, 2));
              return dist <= this.range;
          });
          if (target) {
              projectiles.push(new Projectile(this.base.x, this.base.y, target, this.damage, 4, 50)); // speed=4, splashRadius=50
              this.attackCooldown = this.attackSpeed;
          }
      }
  }

  class Wall {
    constructor(x, y, health = 200) {
      this.x = x;
      this.y = y;
      this.width = 40;
      this.height = 40;
      this.health = health;
      this.maxHealth = health;
      this.cost = 20;
    }

    draw() {
      ctx.fillStyle = 'brown';
      ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

      // Draw health bar
      const healthBarWidth = this.width;
      const healthBarHeight = 5;
      const healthBarX = this.x - this.width / 2;
      const healthBarY = this.y - this.height / 2 - 10;

      ctx.fillStyle = 'gray';
      ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

      ctx.fillStyle = 'lime';
      const currentHealthWidth = (this.health / this.maxHealth) * healthBarWidth;
      ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
    }
  }

  class DefenseArea {
    constructor(x, y, width, height, health = 1000) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.health = health;
      this.maxHealth = health;
      this.containedUnits = []; // Towers and walls within this area
    }

    draw() {
      ctx.strokeStyle = 'purple';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

      // Draw health bar
      const healthBarWidth = this.width;
      const healthBarHeight = 8;
      const healthBarX = this.x - this.width / 2;
      const healthBarY = this.y - this.height / 2 - 15;

      ctx.fillStyle = 'darkgray';
      ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

      ctx.fillStyle = 'green';
      const currentHealthWidth = (this.health / this.maxHealth) * healthBarWidth;
      ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
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
      this.maxHealth = health;
      this.pathIndex = 0;
      this.isAttackingWall = false;
      this.reward = 10;
    }

    move() {
      // Check for collision with walls
      const collidedWall = walls.find(wall => {
        return this.x < wall.x + wall.width / 2 &&
               this.x + this.width / 2 > wall.x - wall.width / 2 &&
               this.y < wall.y + wall.height / 2 &&
               this.y + this.height / 2 > wall.y - wall.height / 2;
      });

      // Check for collision with defense areas
      const collidedDefenseArea = defenseAreas.find(area => {
        return this.x < area.x + area.width / 2 &&
               this.x + this.width / 2 > area.x - area.width / 2 &&
               this.y < area.y + area.height / 2 &&
               this.y + this.height / 2 > area.y - area.height / 2;
      });

      if (collidedWall) {
        this.isAttackingWall = true;
        collidedWall.health -= 1; // Reduce wall health over time
      } else if (collidedDefenseArea) {
        this.isAttackingWall = true; // Treat as attacking a wall for now, can be refined later
        collidedDefenseArea.health -= 1; // Reduce defense area health over time
      } else {
        this.isAttackingWall = false;
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
    }

    draw() {
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      
      // Draw health bar
      const healthBarWidth = this.width;
      const healthBarHeight = 5;
      const healthBarX = this.x - this.width / 2;
      const healthBarY = this.y - this.height / 2 - 7;

      ctx.fillStyle = 'gray';
      ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

      ctx.fillStyle = 'lime';
      const currentHealthWidth = (this.health / this.maxHealth) * healthBarWidth;
      ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
    }
  }

  class Tank extends Enemy {
    constructor(x, y) {
      super(x, y, 0.5, 400); // speed, health
      this.width = 30;
      this.height = 30;
      this.reward = 50;
    }

    draw() {
      ctx.fillStyle = 'purple';
      ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

      // Draw health bar
      const healthBarWidth = this.width;
      const healthBarHeight = 5;
      const healthBarX = this.x - this.width / 2;
      const healthBarY = this.y - this.height / 2 - 7;

      ctx.fillStyle = 'gray';
      ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

      ctx.fillStyle = 'lime';
      const currentHealthWidth = (this.health / this.maxHealth) * healthBarWidth;
      ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
    }
  }

  // Function to spawn enemies
  function spawnEnemy() {
    if (Math.random() < 0.2) { // 20% chance to spawn a Tank
        enemies.push(new Tank(path[0].x, path[0].y));
    } else {
        enemies.push(new Enemy(path[0].x, path[0].y));
    }
  }

  // Add defense areas for testing
  defenseAreas.push(new DefenseArea(50, 150, 80, 80)); // Area 1
  defenseAreas.push(new DefenseArea(225, 300, 80, 80)); // Area 2
  defenseAreas.push(new DefenseArea(400, 525, 80, 80)); // Area 3

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

    // Draw defense areas
    defenseAreas.forEach(area => area.draw());

    // Draw enemies
    enemies.forEach(enemy => enemy.draw());

    // Draw bases and their modules
    bases.forEach(base => base.draw());

    // Draw projectiles
    projectiles.forEach(projectile => projectile.draw());

    // Draw walls
    walls.forEach(wall => wall.draw());
  }

  // Game loop
  function gameLoop() {
    // Update game state
    enemies.forEach(enemy => enemy.move());

    // Update bases and their modules
    bases.forEach(base => base.update());

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (p.move()) {
        // Apply damage to the main target
        p.target.health -= p.damage;

        // If there's a splash radius, apply splash damage
        if (p.splashRadius > 0) {
          enemies.forEach(enemy => {
            if (enemy !== p.target) { // Don't re-damage the main target
              const dist = Math.sqrt(Math.pow(enemy.x - p.target.x, 2) + Math.pow(enemy.y - p.target.y, 2));
              if (dist <= p.splashRadius) {
                enemy.health -= p.damage / 2; // Splash damage is half
              }
            }
          });
        }
        projectiles.splice(i, 1);
      }
    }

    // Remove dead enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].health <= 0) {
        money.value += enemies[i].reward;
        score.value += enemies[i].reward;
        enemies.splice(i, 1);
      }
    }

    // Remove destroyed walls
    for (let i = walls.length - 1; i >= 0; i--) {
      if (walls[i].health <= 0) {
        walls.splice(i, 1);
      }
    }

    // Remove destroyed defense areas and their contained units
    for (let i = defenseAreas.length - 1; i >= 0; i--) {
      if (defenseAreas[i].health <= 0) {
        const destroyedArea = defenseAreas[i];

        // Remove bases within the destroyed area
        for (let j = bases.length - 1; j >= 0; j--) {
          const base = bases[j];
          if (base.x > destroyedArea.x - destroyedArea.width / 2 &&
              base.x < destroyedArea.x + destroyedArea.width / 2 &&
              base.y > destroyedArea.y - destroyedArea.height / 2 &&
              base.y < destroyedArea.y + destroyedArea.height / 2) {
            bases.splice(j, 1);
          }
        }

        // Remove walls within the destroyed area
        for (let j = walls.length - 1; j >= 0; j--) {
          const wall = walls[j];
          if (wall.x > destroyedArea.x - destroyedArea.width / 2 &&
              wall.x < destroyedArea.x + destroyedArea.width / 2 &&
              wall.y > destroyedArea.y - destroyedArea.height / 2 &&
              wall.y < destroyedArea.y + destroyedArea.height / 2) {
            walls.splice(j, 1);
          }
        }

        defenseAreas.splice(i, 1);
      }
    }

    // Draw the game
    draw();

    requestAnimationFrame(gameLoop);
  }

  // Helper function to check if a point is on or near the path
  function isNearPath(x, y, tolerance = 15) {
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lengthSq = dx * dx + dy * dy;
      let t = ((x - p1.x) * dx + (y - p1.y) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t));

      const closestX = p1.x + t * dx;
      const closestY = p1.y + t * dy;

      const distSq = Math.pow(x - closestX, 2) + Math.pow(y - closestY, 2);
      if (distSq <= tolerance * tolerance) {
        return true;
      }
    }
    return false;
  }

  window.buildModule = (moduleType) => {
      if (!selectedBase.value || selectedBase.value.module) return;

      const modules = {
          machine_gun: MachineGunModule,
          cannon: CannonModule
      };
      const moduleClass = modules[moduleType];
      if (!moduleClass) return;

      const cost = new moduleClass(null).cost;
      if (money.value >= cost) {
          money.value -= cost;
          selectedBase.value.module = new moduleClass(selectedBase.value);
          selectedBase.value = null; // Hide panel
      } else {
          console.log("Not enough money for this module!");
      }
  };

  // Event listener for canvas clicks
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Check if clicking on an existing base
    const clickedBase = bases.find(b => 
        x >= b.x - b.width / 2 && x <= b.x + b.width / 2 &&
        y >= b.y - b.height / 2 && y <= b.y + b.height / 2
    );

    if (clickedBase) {
        if (!clickedBase.module) {
            selectedBase.value = clickedBase;
            selectedUnitType.value = null; // Stop placing new units
        }
        return;
    }

    if (selectedBase.value) {
        selectedBase.value = null;
        return;
    }

    const unitCosts = { base: 50, wall: 20 };
    const cost = unitCosts[selectedUnitType.value];

    if (!cost) return;
    if (money.value < cost) {
        console.log("Not enough money!");
        return;
    }

    if (selectedUnitType.value === 'base') {
      if (!isNearPath(x, y)) {
        bases.push(new Base(x, y));
        money.value -= cost;
      } else {
        console.log(`Cannot place base on path!`);
      }
    } else if (selectedUnitType.value === 'wall') {
      if (isNearPath(x, y)) {
        walls.push(new Wall(x, y));
        money.value -= cost;
      } else {
        console.log("Can only place walls on the path!");
      }
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

.stats {
  margin-bottom: 10px;
  font-size: 1.2em;
}

.stats span {
  margin: 0 15px;
}

.controls, .research, .module-panel {
  margin-bottom: 10px;
}

.controls button, .research button, .module-panel button {
  padding: 10px 20px;
  margin: 0 5px;
  font-size: 16px;
  cursor: pointer;
}

.module-panel {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid black;
    padding: 20px;
    z-index: 10;
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
