window.addEventListener('load', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // 게임 엔진을 초기화하고 필요한 경우 디버깅을 위해 window에 바인딩합니다
    window.game = new Game(canvas, ctx);
});
