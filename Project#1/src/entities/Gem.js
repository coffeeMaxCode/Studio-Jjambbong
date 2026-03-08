class Gem {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.expAmount = 1;
        this.radius = 4;
        this.isBeingMagnetized = false;
        this.magnetSpeed = 400; // 플레이어에게 날아갈 때의 초당 픽셀 이동 속도
        this.color = '#3498db';
        
        if (!Gem.imgGem) {
            Gem.imgGem = new Image();
            Gem.imgGem.src = 'assets/gem.svg';
        }
    }

    spawn(x, y, amount) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.expAmount = amount;
        this.isBeingMagnetized = false;
        
        // 경험치 양에 따른 색상 설정
        if (amount >= 10) {
            this.color = '#e74c3c'; // 특대 경험치는 빨간색 (또는 루비색)
            this.radius = 8;
        } else if (amount >= 5) {
            this.color = '#f1c40f'; // 큰 경험치는 노란색
            this.radius = 6;
        } else {
            this.color = '#3498db'; // 작은 경험치는 파란색
            this.radius = 4;
        }
    }

    update(dt, player) {
        if (!this.active || player.isDead) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distSq = dx*dx + dy*dy;
        const dist = Math.sqrt(distSq);

        // 자석 반경 내에 있거나 이미 자석 효과를 받고 있는지 확인
        if (this.isBeingMagnetized || distSq < player.magnetRadius * player.magnetRadius) {
            this.isBeingMagnetized = true;
            
            // 플레이어를 향해 날아감
            if (dist > 0) {
                // 자석 효과 시 매우 빠르게 이동
                this.x += (dx / dist) * 1500 * dt;
                this.y += (dy / dist) * 1500 * dt;
            }

            // 충돌 확인 (획득) - 충돌 판정 반경도 약간 넉넉하게
            const collectDist = player.radius + this.radius + 10; // 넉넉한 충돌 반경
            if (distSq < collectDist * collectDist) {
                player.gainExp(this.expAmount);
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;
        
        if (Gem.imgGem && Gem.imgGem.complete && Gem.imgGem.naturalWidth > 0) {
            const size = this.radius * 3;
            // 반경이 크기 때문에 큰 보석은 자연스럽게 더 크게 렌더링됨 
            ctx.drawImage(Gem.imgGem, this.x - size/2, this.y - size/2, size, size);
        } else {
            ctx.beginPath();
            // 다이아몬드 모양
            ctx.moveTo(this.x, this.y - this.radius);
            ctx.lineTo(this.x + this.radius, this.y);
            ctx.lineTo(this.x, this.y + this.radius);
            ctx.lineTo(this.x - this.radius, this.y);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }
    }
}
