class Player {
    constructor(x, y, game) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 26; // Tight fit to visible character sprite (81x108px rendered)

        this.img = new Image();
        this.img.src = 'src/img/character001.png';

        // 기본 스탯
        this.baseMaxHp = 100;
        this.baseAttackPower = 2.5; // Halved from 5
        this.baseDefense = 0;
        this.baseMoveSpeed = 150;
        this.baseAttackSpeed = 1.0;

        // 현재 스탯
        this.maxHp = this.baseMaxHp;
        this.hp = this.maxHp;
        this.attackPower = this.baseAttackPower;
        this.defense = this.baseDefense;
        this.moveSpeed = this.baseMoveSpeed;
        this.attackSpeed = this.baseAttackSpeed;

        // 업그레이드 수치 트래킹
        this.aspdUpgradeAmount = 0.1;

        // 상태
        this.isDead = false;
        this.hasRevived = false;

        // 무적 시간(i-frames)
        this.invincibleTimer = 0;

        // 경험치 / 레벨
        this.level = 1;
        this.exp = 0;
        this.expToNext = 10;
        this.magnetRadius = 200; // Doubled from 100

        // 무기 목록 (일반 투사체 무기 배열)
        this.weapons = [];

        // 장판 무기 목록 (ZoneWeapon 인스턴스 배열)
        this.zoneWeapons = [];

        // 바라보는 방향 (기본값: 오른쪽)
        this.facingX = 1;
        this.facingY = 0;

        // 업그레이드 선택 횟수 트래킹
        this.upgradeLevels = {
            hp: 0, atk: 0, def: 0, spd: 0, aspd: 0,
            magnet: 0, hpregen: 0,
            bruiser: 0, sniper: 0, balance: 0, grenade: 0, radiation: 0
        };

        this.hpRegen = 0;
        this.hpRegenTimer = 0;

        // 버프 시스템
        this.buffMultipliers = { aspd: 1.0, mspd: 1.0 };
        this.buffTimers = { aspd: 0, mspd: 0 };
    }

    applyTempBuff(type, duration, value) {
        this.buffMultipliers[type] = value;
        this.buffTimers[type] = duration;
    }

    update(dt, inputManager, waveManager) {
        if (this.isDead) return;

        // 버프 타이머 업데이트
        if (this.buffTimers.aspd > 0) {
            this.buffTimers.aspd -= dt;
            if (this.buffTimers.aspd <= 0) this.buffMultipliers.aspd = 1.0;
        }
        if (this.buffTimers.mspd > 0) {
            this.buffTimers.mspd -= dt;
            if (this.buffTimers.mspd <= 0) this.buffMultipliers.mspd = 1.0;
        }

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }

        // 이동 (버프 반영)
        const axis = inputManager.getAxis();
        const effectiveMoveSpeed = this.moveSpeed * this.buffMultipliers.mspd;
        this.x += axis.x * effectiveMoveSpeed * dt;
        this.y += axis.y * effectiveMoveSpeed * dt;

        // 바라보는 방향 업데이트 (정지 시 마지막 방향 유지)
        if (axis.x !== 0 || axis.y !== 0) {
            this.facingX = axis.x;
            this.facingY = axis.y;
        }

        // 맵 경계 제한 (Canvas 1280x720)
        const padding = this.radius;
        if (this.x < padding) this.x = padding;
        if (this.x > 1280 - padding) this.x = 1280 - padding;
        if (this.y < padding) this.y = padding;
        if (this.y > 720 - padding) this.y = 720 - padding;

        // 일반 무기 업데이트
        for (const w of this.weapons) {
            w.update(dt, this, waveManager);
        }

        // 장판 무기 업데이트
        for (const zw of this.zoneWeapons) {
            zw.update(dt, this, waveManager);
        }

        // 초당 체력 회복 로직
        if (this.hpRegen > 0 && this.hp < this.maxHp) {
            this.hpRegenTimer += dt;
            if (this.hpRegenTimer >= 1.0) {
                this.hpRegenTimer -= 1.0;
                this.hp = Math.min(this.maxHp, this.hp + this.hpRegen);
                this.updateHpUI();
            }
        }
    }

    draw(ctx) {
        if (this.isDead) return;

        // 장판 무기는 플레이어/적 뒤에 렌더링
        for (const zw of this.zoneWeapons) {
            zw.draw(ctx);
        }

        // 무적 시 깜빡임
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 플레이어 스프라이트
        if (this.img.complete && this.img.naturalWidth > 0) {
            ctx.drawImage(this.img, this.x - 40.5, this.y - 54, 81, 108); // 162x216의 절반 크기
        } else {
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;

        // 일반 무기 발사체
        for (const w of this.weapons) {
            w.draw(ctx);
        }
    }

    takeDamage(amount) {
        if (this.invincibleTimer > 0 || this.isDead) return;

        // 방어력 감소 (최소 1 데미지)
        const finalDamage = Math.max(1, amount - this.defense);
        this.hp -= finalDamage;

        // 피격 무적 1초
        this.invincibleTimer = 1.0;

        this.updateHpUI();

        if (this.hp <= 0) {
            this.die();
        }
    }

    heal(amount) {
        if (this.isDead) return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.updateHpUI();
    }

    die() {
        this.hp = 0;
        this.isDead = true;
        this.updateHpUI();
        if (this.game) {
            this.game.triggerGameOver();
        }
    }

    revive() {
        if (this.hasRevived || !this.isDead) return false;
        this.hasRevived = true;
        this.isDead = false;
        this.hp = this.maxHp * 0.5;
        this.invincibleTimer = 3.0;
        this.updateHpUI();
        return true;
    }

    gainExp(amount) {
        if (this.isDead) return;
        this.exp += amount;
        if (this.exp >= this.expToNext) {
            this.levelUp();
        }
        this.updateExpUI();
    }

    levelUp() {
        this.exp -= this.expToNext;
        this.level++;
        this.expToNext = Math.floor(this.expToNext * 1.25); // 기존 50% 증가에서 25%로 완화
        document.getElementById('level-display').innerText = `Lv: ${this.level}`;
        if (this.game) {
            this.game.triggerLevelUp();
        }
        if (this.exp >= this.expToNext) {
            // 연속 레벨업은 UpgradeSystem에서 처리
        }
    }

    updateHpUI() {
        const pct = Math.max(0, (this.hp / this.maxHp) * 100);
        document.getElementById('hp-bar-fill').style.width = `${pct}%`;
        document.getElementById('hp-text').innerText = `${Math.floor(this.hp)} / ${Math.floor(this.maxHp)}`;

        document.getElementById('stat-atk').innerText = `ATK: ${Math.floor(this.attackPower)}`;
        document.getElementById('stat-def').innerText = `DEF: ${Math.floor(this.defense)}`;
        document.getElementById('stat-spd').innerText = `SPD: ${Math.floor(this.moveSpeed)}`;
        this.level = 1;
        this.exp = 0;
        this.expToNext = 10;
        this.magnetRadius = 200; // Doubled from 100

        // 무기 목록 (일반 투사체 무기 배열)
        this.weapons = [];

        // 장판 무기 목록 (ZoneWeapon 인스턴스 배열)
        this.zoneWeapons = [];

        // 바라보는 방향 (기본값: 오른쪽)
        this.facingX = 1;
        this.facingY = 0;

        // 업그레이드 선택 횟수 트래킹
        this.upgradeLevels = {
            hp: 0, atk: 0, def: 0, spd: 0, aspd: 0,
            magnet: 0, hpregen: 0,
            bruiser: 0, sniper: 0, balance: 0, grenade: 0, radiation: 0
        };

        this.hpRegen = 0;
        this.hpRegenTimer = 0;

        // 버프 시스템
        this.buffMultipliers = { aspd: 1.0, mspd: 1.0 };
        this.buffTimers = { aspd: 0, mspd: 0 };
    }

    applyTempBuff(type, duration, value) {
        this.buffMultipliers[type] = value;
        this.buffTimers[type] = duration;
    }

    update(dt, inputManager, waveManager) {
        if (this.isDead) return;

        // 버프 타이머 업데이트
        if (this.buffTimers.aspd > 0) {
            this.buffTimers.aspd -= dt;
            if (this.buffTimers.aspd <= 0) this.buffMultipliers.aspd = 1.0;
        }
        if (this.buffTimers.mspd > 0) {
            this.buffTimers.mspd -= dt;
            if (this.buffTimers.mspd <= 0) this.buffMultipliers.mspd = 1.0;
        }

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }

        // 이동 (버프 반영)
        const axis = inputManager.getAxis();
        const effectiveMoveSpeed = this.moveSpeed * this.buffMultipliers.mspd;
        this.x += axis.x * effectiveMoveSpeed * dt;
        this.y += axis.y * effectiveMoveSpeed * dt;

        // 바라보는 방향 업데이트 (정지 시 마지막 방향 유지)
        if (axis.x !== 0 || axis.y !== 0) {
            this.facingX = axis.x;
            this.facingY = axis.y;
        }

        // 맵 경계 제한 (Canvas 1280x720)
        const padding = this.radius;
        if (this.x < padding) this.x = padding;
        if (this.x > 1280 - padding) this.x = 1280 - padding;
        if (this.y < padding) this.y = padding;
        if (this.y > 720 - padding) this.y = 720 - padding;

        // 일반 무기 업데이트
        for (const w of this.weapons) {
            w.update(dt, this, waveManager);
        }

        // 장판 무기 업데이트
        for (const zw of this.zoneWeapons) {
            zw.update(dt, this, waveManager);
        }

        // 초당 체력 회복 로직
        if (this.hpRegen > 0 && this.hp < this.maxHp) {
            this.hpRegenTimer += dt;
            if (this.hpRegenTimer >= 1.0) {
                this.hpRegenTimer -= 1.0;
                this.hp = Math.min(this.maxHp, this.hp + this.hpRegen);
                this.updateHpUI();
            }
        }
    }

    draw(ctx) {
        if (this.isDead) return;

        // 장판 무기는 플레이어/적 뒤에 렌더링
        for (const zw of this.zoneWeapons) {
            zw.draw(ctx);
        }

        // handlesSprite=true인 무기(GreatswordWeapon)가 있으면
        // 해당 무기의 draw()에서 캐릭터 스프라이트를 직접 렌더링하므로 여기서는 건너뜀
        const spriteHandled = this.weapons.some(w => w.handlesSprite);

        if (!spriteHandled) {
            // 무적 시 깜빡임
            if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }

            // 기본 캐릭터 스프라이트 (character001.png)
            if (this.img.complete && this.img.naturalWidth > 0) {
                ctx.save();
                ctx.translate(this.x, this.y);
                if (this.facingX < 0) ctx.scale(-1, 1);
                ctx.drawImage(this.img, -40.5, -54, 81, 108);
                ctx.restore();
            } else {
                ctx.fillStyle = '#3498db';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1.0;
        }

        // DEBUG: Hitbox visualization
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // 무기 렌더링 (GreatswordWeapon은 여기서 캐릭터 스프라이트도 함께 그림)
        for (const w of this.weapons) {
            w.draw(ctx);
        }
    }

    takeDamage(amount) {
        if (this.invincibleTimer > 0 || this.isDead) return;

        // 방어력 감소 (최소 1 데미지)
        const finalDamage = Math.max(1, amount - this.defense);
        this.hp -= finalDamage;

        // 피격 무적 1초
        this.invincibleTimer = 1.0;

        this.updateHpUI();

        if (this.hp <= 0) {
            this.die();
        }
    }

    heal(amount) {
        if (this.isDead) return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.updateHpUI();
    }

    die() {
        this.hp = 0;
        this.isDead = true;
        this.updateHpUI();
        if (this.game) {
            this.game.triggerGameOver();
        }
    }

    revive() {
        if (this.hasRevived || !this.isDead) return false;
        this.hasRevived = true;
        this.isDead = false;
        this.hp = this.maxHp * 0.5;
        this.invincibleTimer = 3.0;
        this.updateHpUI();
        return true;
    }

    gainExp(amount) {
        if (this.isDead) return;
        this.exp += amount;
        if (this.exp >= this.expToNext) {
            this.levelUp();
        }
        this.updateExpUI();
    }

    levelUp() {
        this.exp -= this.expToNext;
        this.level++;
        this.expToNext = Math.floor(this.expToNext * 1.25); // 기존 50% 증가에서 25%로 완화
        document.getElementById('level-display').innerText = `Lv: ${this.level}`;
        if (this.game) {
            this.game.triggerLevelUp();
        }
        if (this.exp >= this.expToNext) {
            // 연속 레벨업은 UpgradeSystem에서 처리
        }
    }

    updateHpUI() {
        const pct = Math.max(0, (this.hp / this.maxHp) * 100);
        document.getElementById('hp-bar-fill').style.width = `${pct}%`;
        document.getElementById('hp-text').innerText = `${Math.floor(this.hp)} / ${Math.floor(this.maxHp)}`;

        document.getElementById('stat-atk').innerText = `ATK: ${Math.floor(this.attackPower)}`;
        document.getElementById('stat-def').innerText = `DEF: ${Math.floor(this.defense)}`;
        document.getElementById('stat-spd').innerText = `SPD: ${Math.floor(this.moveSpeed)}`;
        document.getElementById('stat-aspd').innerText = `ASPD: ${this.attackSpeed.toFixed(2)}x`;
        document.getElementById('stat-magnet').innerText = `MAG: ${Math.floor(this.magnetRadius)}`;
        document.getElementById('stat-hpregen').innerText = `REG: ${this.hpRegen.toFixed(1)}/s`;
    }

    updateExpUI() {
        const pct = Math.min(100, (this.exp / this.expToNext) * 100);
        document.getElementById('exp-bar-fill').style.width = `${pct}%`;
        document.getElementById('exp-text').innerText = `${Math.floor(this.exp)} / ${this.expToNext}`;
    }
}
