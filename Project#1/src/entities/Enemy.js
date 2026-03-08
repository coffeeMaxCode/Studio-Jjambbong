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
        
        // 효과
        this.flashTimer = 0;
        this.knockbackTimer = 0;
        this.knockbackDir = { x: 0, y: 0 };
        this.knockbackSpeed = 150;
        
        // 이미지를 300번 로드하지 않도록 정적으로 캐싱
        if (!Enemy.imgSmall) {
            Enemy.imgSmall = new Image(); Enemy.imgSmall.src = 'assets/slime_green.svg';
            Enemy.imgMedium = new Image(); Enemy.imgMedium.src = 'assets/slime_blue.svg';
            Enemy.imgLarge = new Image(); Enemy.imgLarge.src = 'assets/slime_red.svg';
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
        if (type === 'Small') {
            this.radius = 12; // 32x32 크기
            this.maxHp = 10;
            this.speed = 80;
            this.damage = 1;
            this.color = '#2ed573';
            this.img = Enemy.imgSmall;
            this.imgSize = 32;
        } else if (type === 'Large') {
            this.radius = 45; // 128x128 크기
            this.maxHp = 100;
            this.speed = 25;
            this.damage = 5;
            this.color = '#ff4757';
            this.img = Enemy.imgLarge;
            this.imgSize = 128;
        } else { 
            // 중형
            this.radius = 24; // 64x64 크기
            this.maxHp = 30;
            this.speed = 50;
            this.damage = 3;
            this.color = '#1e90ff';
            this.img = Enemy.imgMedium;
            this.imgSize = 64;
        }

        this.hp = this.maxHp;
        this.flashTimer = 0;
        this.knockbackTimer = 0;
    }

    takeDamage(amount, knockbackDx, knockbackDy, forceSpeed = null) {
        if (!this.active) return;

        this.hp -= amount;

        // 실제 데미지를 입었을 때만 깜빡이고 데미지 숫자 표시
        if (amount > 0) {
            this.flashTimer = 0.1; // 100ms 깜빡임
            // 데미지 숫자 표시 (머리 위, sourceKey=this로 스태킹 식별)
            if (this.game && this.game.effectPool) {
                const headY = this.y - (this.imgSize ? this.imgSize / 2 : this.radius) - 5;
                this.game.effectPool.spawnText(this.x, headY, Math.floor(amount).toString(), this);
            }
        }
        
        // 넉백 적용
        if (knockbackDx !== undefined && knockbackDy !== undefined) {
            this.knockbackTimer = 0.1;
            this.knockbackSpeed = forceSpeed !== null ? forceSpeed : 150; // 기본값 150 또는 지정값
            
            const len = Math.sqrt(knockbackDx*knockbackDx + knockbackDy*knockbackDy);
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
            if (this.type === 'Small') {
                expAmount = Math.random() < 0.2 ? 5 : 1; // 기존 로직
            } else if (this.type === 'Medium') {
                expAmount = 5; // 무조건 큰 경험치
            } else if (this.type === 'Large') {
                expAmount = 10; // 큰 경험치의 2배
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
            this.x += this.knockbackDir.x * this.knockbackSpeed * dt;
            this.y += this.knockbackDir.y * this.knockbackSpeed * dt;
            this.knockbackTimer -= dt;
        } else {
            // 플레이어를 향해 일반 이동
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 0) {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // 스프라이트 렌더링
        if (this.img && this.img.complete && this.img.naturalWidth > 0) {
            if (this.flashTimer > 0) {
                // 합성(composition)을 사용한 피격 깜빡임 효과
                ctx.globalCompositeOperation = 'source-atop';
                ctx.drawImage(this.img, this.x - this.imgSize/2, this.y - this.imgSize/2, this.imgSize, this.imgSize);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillRect(this.x - this.imgSize/2, this.y - this.imgSize/2, this.imgSize, this.imgSize);
                ctx.globalCompositeOperation = 'source-over';
            } else {
                ctx.drawImage(this.img, this.x - this.imgSize/2, this.y - this.imgSize/2, this.imgSize, this.imgSize);
            }
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
