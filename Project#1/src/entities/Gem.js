class Gem {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.expAmount = 1;
        this.radius = 4;
        this.isBeingMagnetized = false;
        this.magnetSpeed = 400; // pixels per second when flying to player
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
        
        // Color based on amount
        if (amount >= 5) {
            this.color = '#f1c40f'; // Yellow for big exp
            this.radius = 6;
        } else {
            this.color = '#3498db'; // Blue for small
            this.radius = 4;
        }
    }

    update(dt, player) {
        if (!this.active || player.isDead) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distSq = dx*dx + dy*dy;

        // Check if inside magnet radius, or already magnetized
        if (this.isBeingMagnetized || distSq < player.magnetRadius * player.magnetRadius) {
            this.isBeingMagnetized = true;
            
            // Fly towards player
            const dist = Math.sqrt(distSq);
            if (dist > 0) {
                this.x += (dx / dist) * this.magnetSpeed * dt;
                this.y += (dy / dist) * this.magnetSpeed * dt;
            }

            // Check collision with player for pickup
            const collectDist = player.radius + this.radius;
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
            // Draw larger for Big Gem naturally because radius is higher 
            ctx.drawImage(Gem.imgGem, this.x - size/2, this.y - size/2, size, size);
        } else {
            ctx.beginPath();
            // Diamond shape
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
