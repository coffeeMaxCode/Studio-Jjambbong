class Item {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.type = 'heal_50'; // 'heal_50', 'heal_100', 'magnet'
        this.radius = 12;
        this.color = '#fff';
    }

    spawn(x, y, type) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.type = type;

        if (this.type === 'heal_50') {
            this.color = '#2ecc71'; // Green for small heal
        } else if (this.type === 'heal_100') {
            this.color = '#e74c3c'; // Red for full heal
        } else if (this.type === 'magnet') {
            this.color = '#9b59b6'; // Purple for magnet
        }
    }

    update(dt) {
        if (!this.active) return;
        // Items just sit there, no movement necessary unless floating animation is desired
    }

    draw(ctx) {
        if (!this.active) return;
        
        ctx.beginPath();
        // Give items a slightly square/rounded look or simple circle
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Inner detail
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let label = '';
        if (this.type === 'heal_50') label = '+';
        else if (this.type === 'heal_100') label = '++';
        else if (this.type === 'magnet') label = 'M';
        ctx.fillText(label, this.x, this.y);
    }
}
