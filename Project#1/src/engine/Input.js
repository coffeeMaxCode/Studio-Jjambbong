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

    // 특정 키가 눌렸는지 확인
    isPressed(keyCode) {
        return !!this.keys[keyCode];
    }

    // WASD 또는 방향키를 기반으로 정규화된 이동 벡터를 반환
    getAxis() {
        let dx = 0;
        let dy = 0;

        if (this.isPressed('KeyW') || this.isPressed('ArrowUp')) dy -= 1;
        if (this.isPressed('KeyS') || this.isPressed('ArrowDown')) dy += 1;
        if (this.isPressed('KeyA') || this.isPressed('ArrowLeft')) dx -= 1;
        if (this.isPressed('KeyD') || this.isPressed('ArrowRight')) dx += 1;

        // 대각선 이동이 더 빠르지 않도록 벡터를 정규화
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        return { x: dx, y: dy };
    }
}
