class Enemy {
    constructor() {
        this.active = false;

        // 기본 속성
        this.x = 0;
        this.y = 0;
        this.type = 'Medium';
        this.radius = 15;
        this.color = '#e74c3c';

        // 스탯
        this.maxHp = 20;
        this.hp = 20;
        this.speed = 50;
        this.damage = 10;
        this.defense = 0;

        // 효과
        this.flashTimer = 0;
        this.knockbackTimer = 0;
        this.knockbackDir = { x: 0, y: 0 };
        this.knockbackSpeed = 150;

        // 이미지를 300번 로드하지 않도록 정적으로 캐싱
        if (!Enemy.imgSmall) {
            Enemy.imgSmall = new Image(); Enemy.imgSmall.src = 'src/img/slime_small001.png';
            Enemy.imgMedium = new Image(); Enemy.imgMedium.src = 'src/img/slime_middle001.png';
            Enemy.imgLarge = new Image(); Enemy.imgLarge.src = 'src/img/slime_big001.png';
        }
    }

    /**
     * 풀에서 가져올 때 속성을 초기화하기 위해 호출됨
     */
    spawn(x, y, type, game) {
        this.active = true;
        this.game = game; // 게임 인스턴스에 대한 참조 저장
        this.x = x;
        this.y = y;
        this.type = type;

        // 타입별 스탯 적용 - 시각적 크기에 따라 반경 조정
        if (type === 'Small') { // 소형
            this.maxHp = 5;
            this.speed = 80;
            this.color = '#e74c3c';
            this.radius = 16;
            this.damage = 5;
            this.knockbackResistance = 0.2;
            this.img = Enemy.imgSmall;
            this.imgSize = 32;
            this.defense = 0;
        } else if (type === 'Medium') { // 중형
            this.maxHp = 25;
            this.speed = 60;
            this.color = '#8e44ad';
            this.radius = 32;
            this.damage = 15;
            this.knockbackResistance = 0.5;
            this.img = Enemy.imgMedium;
            this.imgSize = 64;
            this.defense = 3;
        } else if (type === 'Large') { // 대형
            this.maxHp = 60;
            this.defense = 3;
            this.radius = 64; // 128x128 크기에 정확히 일치하도록 반경 조정
            this.speed = 25;
            this.damage = 5;
            this.color = '#ff4757';
            this.img = Enemy.imgLarge;
            this.imgSize = 128;
            this.defense = 10;
        }

        this.hp = this.maxHp;
        this.flashTimer = 0;
        this.knockbackTimer = 0;
        this.facingX = 1; // 1 = right, -1 = left
    }

    takeDamage(amount, knockbackDx, knockbackDy, forceSpeed = null) {
        if (!this.active) return;

        // 방어력 차감 (최소 1 데미지 보장)
        const finalDamage = Math.max(1, amount - this.defense);
        this.hp -= finalDamage;

        // 실제 데미지를 입었을 때만 깜빡이고 데미지 숫자 표시
        if (finalDamage > 0) {
            this.flashTimer = 0.1; // 100ms 깜빡임
            // 데미지 숫자 표시 (머리 위, sourceKey=this로 스태킹 식별)
            if (this.game && this.game.effectPool) {
                const headY = this.y - (this.imgSize ? this.imgSize / 2 : this.radius) - 5;
                this.game.effectPool.spawnText(this.x, headY, Math.floor(finalDamage).toString(), this);
            }
        }

        // 넉백 적용
        if (knockbackDx !== undefined && knockbackDy !== undefined) {
            this.knockbackTimer = 0.1;
            this.knockbackSpeed = forceSpeed !== null ? forceSpeed : 150; // 기본값 150 또는 지정값

            const len = Math.sqrt(knockbackDx * knockbackDx + knockbackDy * knockbackDy);
            if (len > 0) {
                this.knockbackDir.x = knockbackDx / len;
                this.knockbackDir.y = knockbackDy / len;
            }
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.active = false;
        // 경험치 보석 드랍 트리거 (몬스터 종류별 차등 지급)
        if (this.game) {
            let expAmount = 1;
            const rand = Math.random();

            if (this.type === 'Small') {
                if (rand < 0.001) expAmount = 20; // 0.1% 확률
                else if (rand < 0.011) expAmount = 10; // 1% 확률
                else if (rand < 0.211) expAmount = 5;  // 20% 확률 (0.01 + 0.2)
                else expAmount = 1;  // 기본
            } else if (this.type === 'Medium') {
                if (rand < 0.001) expAmount = 50; // 0.1% 확률
                else if (rand < 0.011) expAmount = 20; // 1% 확률
                else if (rand < 0.211) expAmount = 10; // 20% 확률
                else expAmount = 5; // 기본
            } else if (this.type === 'Large') {
                if (rand < 0.2) expAmount = 50; // 20% 확률
                else if (rand < 0.5) expAmount = 20; // 30% 확률
                else expAmount = 10; // 기본
            }
            this.game.spawnGem(this.x, this.y, expAmount);
        }
    }

    update(dt, playerX, playerY) {
        if (!this.active) return;

        // 시각 효과 타이머
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // 이동 로직
        if (this.knockbackTimer > 0) {
            // 넉백 중
            if (this.type !== 'Large') { // 대형몬스터의 경우 넉백 저항, 잠시 스턴
                this.x += this.knockbackDir.x * this.knockbackSpeed * dt;
                this.y += this.knockbackDir.y * this.knockbackSpeed * dt;
            }
            this.knockbackTimer -= dt;
        } else {
            // 플레이어를 향해 일반 이동
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
                this.facingX = dx < 0 ? -1 : 1;
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // 스프라이트 렌더링
        if (this.img && this.img.complete && this.img.naturalWidth > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            if (this.facingX < 0) {
                ctx.scale(-1, 1);
            }

            if (this.flashTimer > 0) {
                // 필터(brightness)를 사용하여 피격 깜빡임 효과 (네모 박스 현상 방지)
                ctx.filter = 'brightness(3)';
                ctx.drawImage(this.img, -this.imgSize / 2, -this.imgSize / 2, this.imgSize, this.imgSize);
            } else {
                ctx.drawImage(this.img, -this.imgSize / 2, -this.imgSize / 2, this.imgSize, this.imgSize);
            }
            ctx.restore();
        } else {
            // 기본 도형 (대체용)
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = (this.flashTimer > 0) ? '#fff' : this.color;
            ctx.fill();
        }

        // 체력바 렌더링
        const barWidth = this.imgSize * 0.8;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y + this.imgSize / 2 + 5; // 아래로 오프셋

        ctx.fillStyle = '#000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#e74c3c';
        const hpPct = Math.max(0, this.hp / this.maxHp);
        ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);
    }
}
