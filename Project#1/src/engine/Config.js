const Config = {
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,
    ENEMY_SPAWN_BASE_INTERVAL: 1.0,
    ENEMY_MAX_SPAWN_INTERVAL: 0.1,
    WEAPON_STATS: {
        Sniper: {
            cooldown: 0.5,
            projSpeed: 600,
            projDuration: 3.0,
            baseDamage: 10,
            projRadius: 5,
            color: '#f1c40f',
            pierce: 3,
            maxDistSq: 1000 * 1000
        },
        Shotgun: {
            cooldown: 0.83,
            projSpeed: 400,
            projDuration: 1.0,
            baseDamage: 15,
            projRadius: 8,
            color: '#2ecc71',
            pierce: 1,
            maxDistSq: 600 * 600
        },
        Dagger: {
            cooldown: 0.4,
            projSpeed: 200,
            projDuration: 0.3,
            baseDamage: 20,
            projRadius: 45,
            color: '#e67e22',
            pierce: 99,
            maxDistSq: 200 * 200
        }
    }
};
