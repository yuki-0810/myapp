export class Projectile {
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

  draw(ctx) {
    ctx.fillStyle = 'gold';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Base {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.cost = 50;
        this.module = null; // To hold the weapon module
    }

    draw(ctx) {
        ctx.fillStyle = '#aaa';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        if (this.module) {
            this.module.draw(ctx);
        }
    }

    update(enemies, projectiles) {
        if (this.module) {
            this.module.update(enemies, projectiles);
        }
    }
}

export class MachineGunModule {
    constructor(base) {
        this.base = base;
        this.range = 150;
        this.damage = 20;
        this.attackSpeed = 60; // in frames
        this.attackCooldown = 0;
        this.cost = 100;
    }

    draw(ctx) {
        if (!this.base) return;
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.base.x - 15, this.base.y - 15, 30, 30);
        // Draw range circle
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.base.x, this.base.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
    }

    update(enemies, projectiles) {
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

export class CannonModule {
    constructor(base) {
        this.base = base;
        this.range = 120;
        this.damage = 40;
        this.attackSpeed = 180; // in frames
        this.cost = 250;
    }

    draw(ctx) {
        if (!this.base) return;
        ctx.fillStyle = 'darkgreen';
        ctx.fillRect(this.base.x - 20, this.base.y - 20, 40, 40);
        // Draw range circle
        ctx.strokeStyle = 'rgba(0, 100, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(this.base.x, this.base.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
    }

    update(enemies, projectiles) {
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

export class Wall {
  constructor(x, y, health = 200) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    this.health = health;
    this.maxHealth = health;
    this.cost = 20;
  }

  draw(ctx) {
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

export class DefenseArea {
  constructor(x, y, width, height, health = 1000) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.health = health;
    this.maxHealth = health;
    this.containedUnits = []; // Towers and walls within this area
  }

  draw(ctx) {
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

export class Enemy {
  constructor(x, y, path, targetDefenseArea, speed = 1, health = 100) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.speed = speed;
    this.health = health;
    this.maxHealth = health;
    this.path = path; // Assigned path
    this.targetDefenseArea = targetDefenseArea; // Target defense area
    this.pathIndex = 0;
    this.isAttackingWall = false;
    this.reward = 10;
  }

  move(walls, defenseAreas) {
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
      if (this.pathIndex < this.path.length - 1) {
        const target = this.path[this.pathIndex + 1];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
          this.pathIndex++;
        } else {
          this.x += (dx / distance) * this.speed;
          this.y += (dy / distance) * this.speed;
        }
      } else { // Reached end of path, move towards targetDefenseArea
        const target = this.targetDefenseArea;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) { // Only move if not already at target
          this.x += (dx / distance) * this.speed;
          this.y += (dy / distance) * this.speed;
        }
      }
    }
  }

  draw(ctx) {
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

export class Tank extends Enemy {
  constructor(x, y, path, targetDefenseArea) {
    super(x, y, path, targetDefenseArea, 0.5, 400); // x, y, path, targetDefenseArea, speed, health
    this.width = 30;
    this.height = 30;
    this.reward = 50;
  }

  draw(ctx) {
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
