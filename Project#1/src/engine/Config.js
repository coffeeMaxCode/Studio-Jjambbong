const Config = {
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,
    ENEMY_SPAWN_BASE_INTERVAL: 1.0,
    ENEMY_MAX_SPAWN_INTERVAL: 0.1,
    WEAPON_STATS: {
        Sniper: {
            cooldown: 1.33, // 0.4s (Dagger) / 0.3 = 1.33s (Approx 30% speed)
            projSpeed: 800,
            projDuration: 5.0,
            baseDamage: 5, // Halved from 10
            projRadius: 5,
            color: '#f1c40f',
            pierce: 3,
            maxDistSq: 2000 * 2000 // Map end
        },
        Shotgun: {
            cooldown: 0.83,
            projSpeed: 400,
            projDuration: 1.0,
            baseDamage: 7.5, // Halved from 15
            projRadius: 8,
            color: '#2ecc71',
            pierce: 1,
            maxDistSq: 640 * 640 // 50% of 1280
        },
        Dagger: {
            cooldown: 1.33, // 30% of original 0.4s speed
            projSpeed: 300,
            projDuration: 0.2,
            baseDamage: 5, // Halved from 10
            projRadius: 45,
            color: '#e67e22',
            pierce: 99,
            maxDistSq: 200 * 200
        }
    }
};
