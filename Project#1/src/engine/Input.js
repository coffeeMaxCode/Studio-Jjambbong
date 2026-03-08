class InputManager {
    constructor() {
        this.keys = {};
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    // Check if specific key is pressed
    isPressed(keyCode) {
        return !!this.keys[keyCode];
    }

    // Returns normalized movement vector based on WASD or Arrows
    getAxis() {
        let dx = 0;
        let dy = 0;

        if (this.isPressed('KeyW') || this.isPressed('ArrowUp')) dy -= 1;
        if (this.isPressed('KeyS') || this.isPressed('ArrowDown')) dy += 1;
        if (this.isPressed('KeyA') || this.isPressed('ArrowLeft')) dx -= 1;
        if (this.isPressed('KeyD') || this.isPressed('ArrowRight')) dx += 1;

        // Normalize vector so diagonal movement isn't faster
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        return { x: dx, y: dy };
    }
}
