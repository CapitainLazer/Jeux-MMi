// state.js
console.log("🧠 Chargement state.js");

// ====== ÉTAT GLOBAL DU JEU ======
export const gameState = {
    mode: "exploration", // "exploration" | "combat"
    menuOpen: false,
    dialogOpen: false,
    isRunning: false,
    interactionRange: 3,
    playerInventory: [
        {name: "Potion", count: 3, icon: "🧪", description: "Restaure un peu de PV (20 PV)."},
        {name: "Poké Ball", count: 5, icon: "⚪", description: "Permet de capturer des Pokémon."},
        {name: "Antidote", count: 1, icon: "💊", description: "Soigne l’empoisonnement."}
    ],
    team: [
        {
            name: "Pikachu",
            level: 12,
            hp: 30,
            maxHp: 35,
            icon: "⚡",
            status: "OK",
            attacks: [
                { name: "Charge",     power: 10, accuracy: 100 },
                { name: "Éclair",     power: 18, accuracy: 95 },
                { name: "Rugissement", power: 0,  accuracy: 100, effect: "atk_down" }
            ]
        },
        {name: "Salamèche", level: 10, hp: 28, maxHp: 30, icon: "🔥", status: "OK"},
        {name: "Carapuce",  level: 9,  hp: 22, maxHp: 28, icon: "💧", status: "OK"}
    ],
    playerName: "Red",
    money: 500,
    selectedItemIndex: null,
    
    // ===== DONNÉES DE POSITION ET ZONE (pour sauvegarde) =====
    currentZone: "house",           // Zone actuelle du joueur
    playerPosition: { x: 0, y: 0.9, z: 0 },  // Position du joueur
    collectedItems: [],             // IDs des objets déjà ramassés (pour ne pas les respawn)
    
    // ===== CALLBACKS pour world.js =====
    _getPlayerPosition: null,       // Fonction pour récupérer la position depuis world.js
    _setPlayerPosition: null,       // Fonction pour définir la position dans world.js
    _getCurrentZone: null,          // Fonction pour récupérer la zone
    _switchZone: null               // Fonction pour changer de zone
};

/*****************************************************
 * MÉCANIQUE DE COMBAT (LOGIQUE PURE, SANS DOM)
 *****************************************************/
export const combatState = {
    active: false,
    turn: 1,
    phase: "root", // "root" | "attacks" | "bag" | "team"
    rootIndex: 0,
    attackIndex: 0,
    bagIndex: 0,
    teamIndex: 0,
    selectedBagItem: null,
    forcedSwitch: false
};

export const combat = {
    player: {
        name: "Pikachu",
        level: 12,
        maxHp: 35,
        hp: 35,
        attack: 12,
        defense: 6,
        speed: 10,
        attacks: [
            { name: "Charge",     power: 10, accuracy: 100 },
            { name: "Éclair",     power: 18, accuracy: 95 },
            { name: "Rugissement", power: 0,  accuracy: 100, effect: "atk_down" }
        ]
    },
    enemy: {
        name: "Rattata sauvage",
        level: 8,
        maxHp: 30,
        hp: 30,
        attack: 9,
        defense: 4,
        speed: 7,
        attacks: [
            { name: "Charge", power: 8, accuracy: 100 },
            { name: "Mimi-Queue", power: 0, accuracy: 100, effect: "def_down" }
        ]
    }
};

export function computeDamage(attacker, defender, move) {
    if (!move || move.power === 0) return 0;
    const base = attacker.attack + move.power - defender.defense;
    const variance = 0.85 + Math.random() * 0.3; // 0.85 - 1.15
    let dmg = Math.floor(Math.max(1, base) * variance);
    return dmg;
}

export function enemyChooseMove() {
    const moves = combat.enemy.attacks;
    return moves[Math.floor(Math.random() * moves.length)];
}

// Un tour complet : joueur puis ennemi (si vivant)
export function doCombatRound(playerAction) {
    const p = combat.player;
    const e = combat.enemy;
    let log = `Tour ${combatState.turn}\n`;

    // Joueur
    if (playerAction.type === "attack") {
        const move = p.attacks[playerAction.index];
        if (!move) {
            log += `${p.name} hésite...\n`;
        } else {
            if (Math.random()*100 <= move.accuracy) {
                const dmg = computeDamage(p, e, move);
                e.hp = Math.max(0, e.hp - dmg);
                log += `${p.name} utilise ${move.name} !\n`;
                if (dmg > 0) log += `${e.name} perd ${dmg} PV.\n`;
            } else {
                log += `${p.name} rate son attaque ${move.name} !\n`;
            }
        }
    } else if (playerAction.type === "bag") {
        const potion = gameState.playerInventory.find(it => it.name.toLowerCase().includes("potion") && it.count > 0);
        if (potion) {
            const healAmount = potion.name.toLowerCase().includes("hyper") ? 50 : 20;
            const before = p.hp;
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            const healed = p.hp - before;
            potion.count--;
            log += `${gameState.playerName} utilise ${potion.name} sur ${p.name} !\n`;
            log += `${p.name} récupère ${healed} PV.\n`;
        } else {
            log += `Le sac est vide... Aucun objet utilisable !\n`;
        }
    } else if (playerAction.type === "run") {
        log += `${gameState.playerName} prend la fuite !\n`;
        combatState.active = false;
        return { log, finished: true, escaped: true };
    }

    // Ennemi K.O. ?
    if (e.hp <= 0) {
        log += `${e.name} est K.O !\n`;
        combatState.active = false;
        return { log, finished: true, escaped: false };
    }

    // Ennemi joue
    const enemyMove = enemyChooseMove();
    if (enemyMove) {
        if (Math.random()*100 <= enemyMove.accuracy) {
            const dmg = computeDamage(e, p, enemyMove);
            p.hp = Math.max(0, p.hp - dmg);
            log += `${e.name} utilise ${enemyMove.name} !\n`;
            if (dmg > 0) log += `${p.name} perd ${dmg} PV.\n`;
        } else {
            log += `${e.name} rate son attaque ${enemyMove.name} !\n`;
        }
    }

    if (p.hp <= 0) {
        log += `${p.name} est K.O !\n`;
        combatState.active = false;
        return { log, finished: true, escaped: false };
    }

    combatState.turn++;
    return { log, finished: false, escaped: false };
}
