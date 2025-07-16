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
import { Base, MachineGunModule, CannonModule, Wall, Enemy, Tank, DefenseArea, Projectile } from '../game/entities.js';

// --- Vue Component Script ---

const gameCanvas = ref(null);
const selectedUnitType = ref(null);
const money = ref(500); // Starting money
const score = ref(0);
const cannonResearched = ref(false);
const cannonResearchCost = 500;
const selectedBase = ref(null); // To track the clicked base for module building
const countdown = ref(5);
const gameStarted = ref(false);

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

const buildModule = (moduleType) => {
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

onMounted(() => {
  const canvas = gameCanvas.value;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error("Could not get canvas context");
    return;
  }

  const enemies = [];
  const bases = [];
  const projectiles = [];
  const walls = [];
  const defenseAreas = [];

  // Define defense areas
  const areaWidth = canvas.width * 0.9;
  const centerX = canvas.width / 2;
  const topMargin = canvas.height * 0.2;
  const remainingHeight = canvas.height - topMargin;
  const areaHeight = remainingHeight / 3;

  const defenseArea1 = new DefenseArea(centerX, topMargin + areaHeight / 2, areaWidth, areaHeight);
  const defenseArea2 = new DefenseArea(centerX, topMargin + areaHeight * 1.5, areaWidth, areaHeight);
  const defenseArea3 = new DefenseArea(centerX, topMargin + areaHeight * 2.5, areaWidth, areaHeight);
  defenseAreas.push(defenseArea1, defenseArea2, defenseArea3);

  function createRandomPath(targetArea) {
    const path = [];
    let currentX = Math.random() * canvas.width;
    let currentY = 0;
    path.push({ x: currentX, y: currentY });

    while (currentY < targetArea.y - targetArea.height / 2) {
      currentX += (Math.random() - 0.5) * 200;
      currentY += Math.random() * 100 + 50;

      // Clamp to canvas bounds
      currentX = Math.max(0, Math.min(canvas.width, currentX));
      currentY = Math.min(currentY, targetArea.y - targetArea.height / 2);

      path.push({ x: currentX, y: currentY });
    }

    path.push({ x: targetArea.x, y: targetArea.y });
    return path;
  }

  // Function to spawn enemies
  function spawnEnemy() {
    if (!gameStarted.value) return;
    const randomPathIndex = Math.floor(Math.random() * defenseAreas.length);
    const targetDefenseArea = defenseAreas[randomPathIndex];
    const newPath = createRandomPath(targetDefenseArea);

    if (Math.random() < 0.2) { // 20% chance to spawn a Tank
        enemies.push(new Tank(newPath[0].x, newPath[0].y, newPath, targetDefenseArea));
    } else {
        enemies.push(new Enemy(newPath[0].x, newPath[0].y, newPath, targetDefenseArea));
    }
  }

  // Draw everything
  function draw() {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    defenseAreas.forEach(area => area.draw(ctx));
    enemies.forEach(enemy => enemy.draw(ctx));
    bases.forEach(base => base.draw(ctx));
    projectiles.forEach(projectile => projectile.draw(ctx));
    walls.forEach(wall => wall.draw(ctx));

    if (!gameStarted.value) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Game starts in ${countdown.value}`, canvas.width / 2, canvas.height / 2);
    }
  }

  // Game loop
  function gameLoop() {
    if (gameStarted.value) {
      enemies.forEach(enemy => enemy.move(walls, defenseAreas));
      bases.forEach(base => base.update(enemies, projectiles));

      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const targetStillExists = enemies.includes(p.target);
        if (!targetStillExists || p.move()) {
          if (targetStillExists) {
              p.target.health -= p.damage;
              if (p.splashRadius > 0) {
                  enemies.forEach(enemy => {
                      if (enemy !== p.target) {
                          const dist = Math.sqrt(Math.pow(enemy.x - p.target.x, 2) + Math.pow(enemy.y - p.target.y, 2));
                          if (dist <= p.splashRadius) {
                              enemy.health -= p.damage / 2;
                          }
                      }
                  });
              }
          }
          projectiles.splice(i, 1);
        }
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].health <= 0) {
          money.value += enemies[i].reward;
          score.value += enemies[i].reward;
          enemies.splice(i, 1);
        }
      }

      for (let i = walls.length - 1; i >= 0; i--) {
        if (walls[i].health <= 0) {
          walls.splice(i, 1);
        }
      }

      for (let i = defenseAreas.length - 1; i >= 0; i--) {
        if (defenseAreas[i].health <= 0) {
          // For now, just remove the area. In a real game, this might trigger a game over.
          defenseAreas.splice(i, 1);
        }
      }
    }

    draw();
    requestAnimationFrame(gameLoop);
  }

  canvas.addEventListener('click', (event) => {
    if (!gameStarted.value) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const clickedBase = bases.find(b => x >= b.x - b.width / 2 && x <= b.x + b.width / 2 && y >= b.y - b.height / 2 && y <= b.y + b.height / 2);
    if (clickedBase) {
        if (!clickedBase.module) {
            selectedBase.value = clickedBase;
            selectedUnitType.value = null;
        }
        return;
    }

    if (selectedBase.value) {
        selectedBase.value = null;
        return;
    }

    const unitCosts = { base: 50, wall: 20 };
    const cost = unitCosts[selectedUnitType.value];
    if (!cost || money.value < cost) return;

    if (selectedUnitType.value === 'base') {
        bases.push(new Base(x, y));
        money.value -= cost;
    } else if (selectedUnitType.value === 'wall') {
        walls.push(new Wall(x, y));
        money.value -= cost;
    }
  });

  // Start countdown
  const countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownInterval);
      gameStarted.value = true;
      setInterval(spawnEnemy, 2000); // Start spawning enemies
    }
  }, 1000);

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