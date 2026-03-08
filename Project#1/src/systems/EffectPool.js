class EffectPool {
    constructor() {
        this.texts = [];
        this.poolSize = 100;
        
        for (let i = 0; i < this.poolSize; i++) {
            this.texts.push({
                active: false,
                x: 0,
                y: 0,
                text: '',
                duration: 0,
                maxDuration: 0,
                color: '#fff',
                vy: -50 // Float up speed
            });
        }
    }

    spawnText(x, y, text, color = '#fff') {
        const t = this.texts.find(t => !t.active);
        if (t) {
            t.active = true;
            t.x = x + (Math.random() * 20 - 10); // slight random offset
            t.y = y;
            t.text = text;
            t.duration = 0.5; // half second float
            t.maxDuration = 0.5;
            t.color = color;
        }
    }

    update(dt) {
        for (const t of this.texts) {
            if (!t.active) continue;
            t.y += t.vy * dt;
            t.duration -= dt;
            if (t.duration <= 0) t.active = false;
        }
    }

    draw(ctx) {
        for (const t of this.texts) {
            if (!t.active) continue;
            const alpha = Math.max(0, t.duration / t.maxDuration);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = t.color;
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.globalAlpha = 1.0;
    }
}
