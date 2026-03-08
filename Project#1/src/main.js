const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let lastTime = 0;
// Game States: MENU, PLAYING, LEVELUP, GAMEOVER
let gameState = 'MENU'; 
let currentWeaponType = null;

// Core Engine Systems
const input = new InputManager();

// Game Logic Systems (to be instantiated)
let player;
let waveManager;
let upgradeSystem;
let collisionSystem;

let gemPool;
let activeGems = [];
let effectPool;

// UI Elements
const uiMainMenu = document.getElementById('main-menu');
const uiArea = document.getElementById('ui-area');
const uiHud = document.getElementById('hud');
const uiLevelUp = document.getElementById('levelup-screen');
const uiGameOver = document.getElementById('gameover-screen');
const timeDisplay = document.getElementById('time-display');

// Global Game Variables
let gameTime = 0; // seconds

function initGame(weaponType) {
    currentWeaponType = weaponType;
    gameState = 'PLAYING';
    gameTime = 0;
    
    // UI Transitions
    uiMainMenu.classList.add('hidden');
    uiGameOver.classList.add('hidden');
    uiLevelUp.classList.add('hidden');
    
    // Show 20% UI panel
    uiArea.style.display = 'block';
    uiHud.classList.remove('hidden');

    // Initialize/Reset Systems and Entities
    waveManager = new WaveManager(canvas.width, canvas.height);
    collisionSystem = new CollisionSystem();
    if (!upgradeSystem) upgradeSystem = new UpgradeSystem();
    
    effectPool = new EffectPool();

    gemPool = new Pool(() => new Gem(), 300);
    activeGems = [];

    player = new Player(canvas.width/2, canvas.height/2);
    player.weapon = new Weapon(weaponType);
    player.updateHpUI();
    player.updateExpUI();
    document.getElementById('level-display').innerText = `Lv: ${player.level}`;

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;

    // Delta time in seconds. Cap to avoid huge jumps
    let dt = (timestamp - lastTime) / 1000; 
    if (dt > 0.1) dt = 0.1; 
    
    lastTime = timestamp;

    update(dt);
    draw(ctx);

    requestAnimationFrame(gameLoop);
}

function update(dt) {
    gameTime += dt;
    const mins = Math.floor(gameTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(gameTime % 60).toString().padStart(2, '0');
    timeDisplay.innerText = `${mins}:${secs}`;

    if (player) player.update(dt, input, waveManager);
    if (waveManager) waveManager.update(dt, player);
    if (collisionSystem) collisionSystem.update(player, waveManager);

    // Update gems
    for (let i = activeGems.length - 1; i >= 0; i--) {
        const gem = activeGems[i];
        gem.update(dt, player);
        if (!gem.active) {
            gemPool.release(gem);
            activeGems.splice(i, 1);
        }
    }
    
    if (effectPool) effectPool.update(dt);
}

function draw(ctx) {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;
    for(let x=0; x<canvas.width; x+=100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for(let y=0; y<canvas.height; y+=100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw gems below player and enemies
    for (const gem of activeGems) gem.draw(ctx);

    if (waveManager) waveManager.draw(ctx);
    if (player) player.draw(ctx);
    if (effectPool) effectPool.draw(ctx);
}

// Global functions for events
window.spawnGem = function(x, y) {
    if (!gemPool) return;
    const gem = gemPool.get();
    const amt = Math.random() < 0.2 ? 5 : 1; // 20% chance for big gem
    gem.spawn(x, y, amt);
    activeGems.push(gem);
};

window.triggerGameOver = function() {
    gameState = 'GAMEOVER';
    uiGameOver.classList.remove('hidden');
    document.getElementById('final-time').innerText = timeDisplay.innerText;
    
    if (!player.hasRevived) {
        document.getElementById('revive-prompt').classList.remove('hidden');
    } else {
        document.getElementById('revive-prompt').classList.add('hidden');
    }
};

window.triggerLevelUp = function() {
    gameState = 'LEVELUP';
    uiLevelUp.classList.remove('hidden');
    upgradeSystem.trigger(player);
};

window.resumeGameAfterLevelUp = function() {
    gameState = 'PLAYING';
    lastTime = performance.now(); // reset timer to avoid huge dt jump
    requestAnimationFrame(gameLoop);
    
    // Process multiple queued level ups if exp is vastly overfilled (e.g. collecting huge cluster)
    if (player && player.exp >= player.expToNext) {
        player.levelUp();
    }
};

// Event Listeners
document.getElementById('btn-sniper').addEventListener('click', () => initGame('Sniper'));
document.getElementById('btn-balance').addEventListener('click', () => initGame('Balance'));
document.getElementById('btn-bruiser').addEventListener('click', () => initGame('Bruiser'));

document.getElementById('btn-revive').addEventListener('click', () => { 
    if(player && player.revive()) {
        gameState = 'PLAYING';
        uiGameOver.classList.add('hidden');
        lastTime = performance.now(); // reset timer to avoid huge dt jump
        requestAnimationFrame(gameLoop);
    }
});
document.getElementById('btn-restart').addEventListener('click', () => { 
    gameState = 'MENU';
    uiGameOver.classList.add('hidden');
    uiHud.classList.add('hidden');
    uiArea.style.display = 'none'; // hide 20% bottom panel again
    uiMainMenu.classList.remove('hidden');
});
