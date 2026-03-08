class Item {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.type = 'heal_50'; // 'heal_50', 'heal_100', 'magnet' ...
        this.radius = 16;
        this.color = '#fff';
        this.img = null;
        this.imgSize = 32;

        if (!Item.imgHeal50) { Item.imgHeal50 = new Image(); Item.imgHeal50.src = 'src/img/heal_50.png'; }
        if (!Item.imgHealFull) { Item.imgHealFull = new Image(); Item.imgHealFull.src = 'src/img/heal_full.png'; }
        if (!Item.imgMagnet) { Item.imgMagnet = new Image(); Item.imgMagnet.src = 'src/img/magnet.png'; }
    }

    spawn(x, y, type) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.type = type;
        this.img = null;

        if (this.type === 'heal_50') {
            this.img = Item.imgHeal50;
        } else if (this.type === 'heal_100') {
            this.img = Item.imgHealFull;
        } else if (this.type === 'magnet') {
            this.img = Item.imgMagnet;
        } else if (this.type === 'bomb') {
            this.color = '#000000ff'; // Black
        } else if (this.type === 'stopwatch') {
            this.color = '#3498db'; // Blue
        } else if (this.type === 'buff_both') {
            this.color = '#f1c40f'; // Gold
        } else if (this.type === 'buff_aspd') {
            this.color = '#e67e22'; // Orange
        } else if (this.type === 'buff_mspd') {
            this.color = '#1abc9c'; // Turquoise
        }
    }

    update(dt) {
        if (!this.active) return;
    }

    draw(ctx) {
        if (!this.active) return;

        if (this.img && this.img.complete && this.img.naturalWidth > 0) {
            ctx.drawImage(this.img, this.x - this.imgSize / 2, this.y - this.imgSize / 2, this.imgSize, this.imgSize);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let label = '';
            if (this.type === 'bomb') label = 'B';
            else if (this.type === 'stopwatch') label = 'T';
            else if (this.type === 'buff_both') label = 'A+S';
            else if (this.type === 'buff_aspd') label = 'A';
            else if (this.type === 'buff_mspd') label = 'S';
            ctx.fillText(label, this.x, this.y);
        }
    }
}
