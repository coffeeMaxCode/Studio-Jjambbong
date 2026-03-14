const Config = {
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,
    ENEMY_SPAWN_BASE_INTERVAL: 1.0,
    ENEMY_MAX_SPAWN_INTERVAL: 0.1,
    WEAPON_STATS: {
        Sniper: {
            cooldown: 1.33,
            projSpeed: 800,
            projDuration: 5.0,
            baseDamage: 5,
            projRadius: 5,
            color: '#f1c40f',
            pierce: 3,
            maxDistSq: 2000 * 2000
        },
        Shotgun: {
            cooldown: 0.83,
            projSpeed: 400,
            projDuration: 1.0,
            baseDamage: 7.5,
            projRadius: 8,
            color: '#2ecc71',
            pierce: 1,
            maxDistSq: 640 * 640
        },
        Dagger: {
            cooldown: 1.33,
            projSpeed: 300,
            projDuration: 0.2,
            baseDamage: 5,
            projRadius: 45,
            color: '#e67e22',
            pierce: 99,
            maxDistSq: 200 * 200
        },
        Greatsword: {
            cooldown: 2.5,
            baseDamage: 25,
            attackRadius: 360,
            maxDistSq: 600 * 600
        },
        EnergyBolt: {
            cooldown: 0.8,
            projSpeed: 550,
            projDuration: 3.0,
            baseDamage: 10,
            projRadius: 8,
            color: '#9b59b6',
            pierce: 5,
            maxDistSq: 1500 * 1500
        },
        Fireball: {
            cooldown: 1.5,
            projSpeed: 380,
            projDuration: 4.0,
            baseDamage: 18,
            projRadius: 12,
            color: '#e74c3c',
            pierce: 1,
            maxDistSq: 1000 * 1000,
            explosionRadius: 80
        }
    },
    // 무기 메타데이터: upgradeKey, 표시 레이블
    WEAPON_META: {
        Greatsword:  { upgradeKey: 'bruiser',   label: '대검 (Greatsword)' },
        Sniper:      { upgradeKey: 'sniper',     label: '저격 (Sniper)' },
        Shotgun:     { upgradeKey: 'balance',    label: '샷건 (Shotgun)' },
        Grenade:     { upgradeKey: 'grenade',    label: '수류탄 (Grenade)' },
        Radiation:   { upgradeKey: 'radiation',  label: '방사능 (Radiation)' },
        EnergyBolt:  { upgradeKey: 'energybolt', label: '에너지 볼트 (Energy Bolt)' },
        Fireball:    { upgradeKey: 'fireball',   label: '파이어볼 (Fireball)' },
    },
    // 직업 정의: 추후 새 직업 추가 시 이 블록만 확장
    CLASSES: {
        Swordsman: {
            label: '검사',
            description: '강력한 근접 공격의 대가',
            color: '#e74c3c',
            startWeapon: 'Greatsword',      // 단일 무기 → 자동 선택
            availableWeapons: ['Greatsword']
        },
        Mage: {
            label: '마법사',
            description: '원거리 마법 투사체 전문가',
            color: '#9b59b6',
            startWeapon: null,              // 2단계 무기 선택 필요
            availableWeapons: ['EnergyBolt', 'Fireball']
        },
        Gunner: {
            label: '거너',
            description: '다양한 총기류 전문가',
            color: '#2ecc71',
            startWeapon: null,
            availableWeapons: ['Shotgun', 'Sniper', 'Grenade']
        },
        MadScientist: {
            label: '매드사이언티스트',
            description: '위험한 실험으로 적을 제거',
            color: '#f1c40f',
            startWeapon: 'Radiation',
            availableWeapons: ['Radiation']
        }
    }
};
