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

    // Pass a dummy 'null' for the base just to get the cost
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

  // Game variables
  const paths = [
    [ // Path 1 (Top)
      { x: 50, y: 0 }, { x: 50, y: 150 }, { x: 200, y: 150 }, { x: 200, y: 300 }, { x: 50, y: 300 }, { x: 50, y: 450 }, { x: 200, y: 450 }, { x: 200, y: 600 }, { x: 50, y: 600 }, { x: 50, y: 800 }
    ],
    [ // Path 2 (Middle)
      { x: 225, y: 0 }, { x: 225, y: 250 }, { x: 350, y: 250 }, { x: 350, y: 500 }, { x: 225, y: 500 }, { x: 225, y: 800 }
    ],
    [ // Path 3 (Bottom)
      { x: 400, y: 0 }, { x: 400, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 400 }, { x: 400, y: 400 }, { x: 400, y: 700 }, { x: 300, y: 700 }, { x: 300, y: 800 }
    ]
  ];

  const enemies = [];
  const bases = [];
  const projectiles = [];
  const walls = [];
  const defenseAreas = [];

  // Define defense areas for each path
  const defenseArea1 = new DefenseArea(75, 750, 150, 50);
  const defenseArea2 = new DefenseArea(225, 750, 150, 50);
  const defenseArea3 = new DefenseArea(375, 750, 150, 50);

  defenseAreas.push(defenseArea1, defenseArea2, defenseArea3);

  // Function to spawn enemies
  function spawnEnemy() {
    const randomPathIndex = Math.floor(Math.random() * paths.length);
    const selectedPath = paths[randomPathIndex];
    const targetDefenseArea = defenseAreas[randomPathIndex];

    if (Math.random() < 0.2) { // 20% chance to spawn a Tank
        enemies.push(new Tank(selectedPath[0].x, selectedPath[0].y, selectedPath, targetDefenseArea));
    } else {
        enemies.push(new Enemy(selectedPath[0].x, selectedPath[0].y, selectedPath, targetDefenseArea));
    }
  }

  // Draw everything
  function draw() {
    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw paths
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 20;
    paths.forEach(path => {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    });

    // Draw defense areas
    defenseAreas.forEach(area => area.draw(ctx));

    // Draw enemies
    enemies.forEach(enemy => enemy.draw(ctx));

    // Draw bases and their modules
    bases.forEach(base => base.draw(ctx));

    // Draw projectiles
    projectiles.forEach(projectile => projectile.draw(ctx));

    // Draw walls
    walls.forEach(wall => wall.draw(ctx));
  }

  // Game loop
  function gameLoop() {
    // Update game state
    enemies.forEach(enemy => enemy.move(walls, defenseAreas));

    // Update bases and their modules
    bases.forEach(base => base.update(enemies, projectiles));

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      const targetStillExists = enemies.includes(p.target);

      // If target is gone or projectile reaches target, remove projectile
      if (!targetStillExists || p.move()) {
        // If target exists and we are at the target, apply damage
        if (targetStillExists) {
            p.target.health -= p.damage;

            // Apply splash damage
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
    // Check all paths
    for (const path of paths) {
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
    }
    return false;
  }

  // Event listener for canvas clicks
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Check if clicking on an existing wall for repair
    if (selectedUnitType.value === 'repair_wall') {
        const clickedWall = walls.find(w => 
            x >= w.x - w.width / 2 && x <= w.x + w.width / 2 &&
            y >= w.y - w.height / 2 && y <= w.y + w.height / 2
        );
        if (clickedWall) {
            const repairCost = 10; // Cost to repair a wall
            if (money.value >= repairCost && clickedWall.health < clickedWall.maxHealth) {
                money.value -= repairCost;
                clickedWall.health = clickedWall.maxHealth; // Fully repair
                console.log("Wall repaired!");
            } else if (money.value < repairCost) {
                console.log("Not enough money to repair!");
            } else {
                console.log("Wall is already at full health!");
            }
        }
        return;
    }

    // Check if clicking on an existing base for module building
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