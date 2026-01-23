// state.js
import { createStarterTeam } from "./monsters.js";
import { applyAttackEffect } from "./attackEffects.js";

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
        {name: "Antidote", count: 1, icon: "💊", description: "Soigne l'empoisonnement."}
    ],
    playerTeam: [
        // Adoubee
        {
            key: "Adoubee",
            name: "Adoubee",
            type: "eau",
            rarity: "commun",
            level: 5,
            maxHp: 30,
            hp: 30,
            attack: 12,
            defense: 9,
            speed: 9,
            skills: ["Tackle", "Splash"],
            description: "Un nuage flottant. Des yeux captivant.",
            icon: "💧",
            model: "./Assets/models/animations/Adoubee.gltf",
            status: "OK",
            attacks: [
                { name: "Tackle", power: 20, accuracy: 100 },
                { name: "Splash", power: 10, accuracy: 100 }
            ]
        },
        // Pedro
        {
            key: "Pedro",
            name: "Pedro",
            type: "poison",
            rarity: "commun",
            level: 5,
            maxHp: 60,
            hp: 60,
            attack: 14,
            defense: 10,
            speed: 12,
            skills: ["Morsure", "Sifflement"],
            description: "Pedro, le serpent mystérieux.",
            icon: "🐍",
            model: "./Assets/models/animations/Pedro.gltf",
            status: "OK",
            attacks: [
                { name: "Morsure", power: 20, accuracy: 100 },
                { name: "Sifflement", power: 10, accuracy: 100 }
            ],
            combatPosition: { x: 0, y: 0, z: 0 },
            combatRotation: 180
        }
    ],
    playerName: "Red",
    money: 500,
    selectedItemIndex: null,
    
    // ===== DONNÉES DE POSITION ET ZONE (pour sauvegarde) =====
    currentZone: "house",
    playerPosition: { x: 0, y: 0.9, z: -3 },
    collectedItems: [],
    
    // ===== CALLBACKS pour world.js =====
    _getPlayerPosition: null,
    _setPlayerPosition: null,
    _getCurrentZone: null,
    _switchZone: null
};

// ✅ FONCTION POUR RÉINITIALISER COMPLÈTEMENT LE JEU
export function resetGameState() {
    console.log("🔄 Réinitialisation complète de l'état du jeu...");
    
    gameState.playerInventory = [
        {name: "Potion", count: 3, icon: "🧪", description: "Restaure un peu de PV (20 PV)."},
        {name: "Antidote", count: 1, icon: "💊", description: "Soigne l'empoisonnement."}
    ];
    
    gameState.playerTeam = [
        {
            key: "Adoubee",
            name: "Adoubee",
            type: "eau",
            rarity: "commun",
            level: 5,
            maxHp: 30,
            hp: 30,
            attack: 12,
            defense: 9,
            speed: 9,
            skills: ["Tackle", "Splash"],
            description: "Un nuage flottant. Des yeux captivant.",
            icon: "💧",
            model: "./Assets/models/animations/Adoubee.gltf",
            status: "OK",
            attacks: [
                { name: "Tackle", power: 20, accuracy: 100 },
                { name: "Splash", power: 10, accuracy: 100 }
            ]
        },
        {
            key: "Pedro",
            name: "Pedro",
            type: "commun",
            rarity: "commun",
            level: 5,
            maxHp: 60,
            hp: 60,
            attack: 14,
            defense: 10,
            speed: 12,
            skills: ["Coup de chapeau", "Sourire"],
            description: "Pedro, le héros inattendu.",
            icon: "🧑",
            model: "./Assets/models/animations/Pedro.gltf",
            status: "OK",
            attacks: [
                { name: "Coup de chapeau", power: 20, accuracy: 100 },
                { name: "Sourire", power: 10, accuracy: 100 }
            ]
        }
    ];
    
    gameState.playerName = "Red";
    gameState.money = 500;
    gameState.currentZone = "house";
    gameState.playerPosition = { x: 0, y: 0.9, z: -3 };
    gameState.collectedItems = [];
    gameState.selectedItemIndex = null;
    gameState.mode = "exploration";
    gameState.menuOpen = false;
    gameState.dialogOpen = false;
    gameState.isRunning = false;
    
    console.log("✅ État du jeu réinitialisé");
}

// ====== MÉCANIQUE DE COMBAT ======
export const combatState = {
    active: false,
    turn: 1,
    phase: "root",
    rootIndex: 0,
    attackIndex: 0,
    bagIndex: 0,
    teamIndex: 0,
    selectedBagItem: null,
    forcedSwitch: false
};

export const combat = {
    player: {
        name: "Adoubee",
        level: 5,
        maxHp: 30,
        hp: 30,
        attack: 12,
        defense: 9,
        speed: 9,
        attacks: [
            { name: "Tackle", power: 20, accuracy: 100 },
            { name: "Splash", power: 10, accuracy: 100 }
        ]
    },
    enemy: {
        name: "Adoubee",
        level: 5,
        maxHp: 30,
        hp: 30,
        attack: 12,
        defense: 9,
        speed: 9,
        attacks: [
            { name: "Tackle", power: 20, accuracy: 100 },
            { name: "Splash", power: 10, accuracy: 100 }
        ]
    }
};

export function computeDamage(attacker, defender, move) {
    if (!move || move.power === 0) return 0;
    const base = attacker.attack + move.power - defender.defense;
    const variance = 0.85 + Math.random() * 0.3;
    let dmg = Math.floor(Math.max(1, base) * variance);
    return dmg;
}

function enemyChooseMove() {
    const e = combat.enemy;
    if (!e.attacks || e.attacks.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * e.attacks.length);
    return e.attacks[randomIndex];
}

export function doCombatRound(playerAction) {
    const p = combat.player;
    const e = combat.enemy;
    let log = `Tour ${combatState.turn}\n`;

    if (playerAction.type === "bag") {
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
        combatState.turn++;
        return { log, finished: false, escaped: false };
    } else if (playerAction.type === "run") {
        log += `${gameState.playerName} prend la fuite !\n`;
        combatState.active = false;
        return { log, finished: true, escaped: true };
    }

    let playerSpeed = p.speed + (p.speedBoost ? 10 : 0);
    let enemySpeed = e.speed + (e.speedBoost ? 10 : 0);
    let playerActsFirst = playerSpeed >= enemySpeed;
    let playerActionDone = false;
    let enemyActionDone = false;

    if (playerActsFirst) {
        if (p.stunned) {
            log += `${p.name} est étourdi et ne peut pas attaquer ce tour !\n`;
            p.stunned = false;
            playerActionDone = true;
        } else if (playerAction.type === "attack") {
            const move = p.attacks[playerAction.index];
            if (!move) {
                log += `${p.name} hésite...\n`;
            } else {
                if (Math.random() * 100 <= move.accuracy) {
                    let logArr = [];
                    applyAttackEffect(move, p, e, logArr);
                    let dmg;
                    if (move.ignoreDefense) {
                        dmg = Math.max(1, Math.floor(move.power * (p.level / 10)));
                        delete move.ignoreDefense;
                    } else {
                        dmg = computeDamage(p, e, move);
                    }
                    e.hp = Math.max(0, e.hp - dmg);
                    log += `${p.name} utilise ${move.name} !\n`;
                    if (dmg > 0) log += `${e.name} perd ${dmg} PV.\n`;
                    if (logArr.length) log += logArr.join("\n") + "\n";
                } else {
                    log += `${p.name} rate son attaque ${move.name} !\n`;
                }
            }
            playerActionDone = true;
        }
    }

    if (e.hp <= 0) {
        log += `${e.name} est K.O !\n`;
        combatState.active = false;
        return { log, finished: true, escaped: false };
    }

    if (!enemyActionDone) {
        let enemyCanAct = true;
        if (e.stunned) {
            log += `${e.name} est étourdi et ne peut pas attaquer ce tour !\n`;
            e.stunned = false;
            enemyCanAct = false;
        }
        const enemyMove = enemyCanAct ? enemyChooseMove() : null;
        if (enemyMove) {
            let effectiveAccuracy = enemyMove.accuracy;
            if (p.precisionDown) {
                effectiveAccuracy -= 15 * p.precisionDown;
            }
            if (Math.random() * 100 <= effectiveAccuracy) {
                let logArr = [];
                applyAttackEffect(enemyMove, e, p, logArr);
                let dmg;
                if (enemyMove.ignoreDefense) {
                    dmg = Math.max(1, Math.floor(enemyMove.power * (e.level / 10)));
                    delete enemyMove.ignoreDefense;
                } else {
                    dmg = computeDamage(e, p, enemyMove);
                }
                p.hp = Math.max(0, p.hp - dmg);
                log += `${e.name} utilise ${enemyMove.name} !\n`;
                if (dmg > 0) log += `${p.name} perd ${dmg} PV.\n`;
                if (logArr.length) log += logArr.join("\n") + "\n";
            } else {
                log += `${e.name} rate son attaque ${enemyMove.name} !\n`;
            }
        }
        enemyActionDone = true;
    }

    if (!playerActsFirst && !playerActionDone) {
        if (p.stunned) {
            log += `${p.name} est étourdi et ne peut pas attaquer ce tour !\n`;
            p.stunned = false;
        } else if (playerAction.type === "attack") {
            const move = p.attacks[playerAction.index];
            if (!move) {
                log += `${p.name} hésite...\n`;
            } else {
                if (Math.random() * 100 <= move.accuracy) {
                    let logArr = [];
                    applyAttackEffect(move, p, e, logArr);
                    let dmg;
                    if (move.ignoreDefense) {
                        dmg = Math.max(1, Math.floor(move.power * (p.level / 10)));
                        delete move.ignoreDefense;
                    } else {
                        dmg = computeDamage(p, e, move);
                    }
                    e.hp = Math.max(0, e.hp - dmg);
                    log += `${p.name} utilise ${move.name} !\n`;
                    if (dmg > 0) log += `${e.name} perd ${dmg} PV.\n`;
                    if (logArr.length) log += logArr.join("\n") + "\n";
                } else {
                    log += `${p.name} rate son attaque ${move.name} !\n`;
                }
            }
        }
    }

    if (p.hp <= 0) {
        log += `${p.name} est K.O !\n`;
        combatState.active = false;
        return { log, finished: true, escaped: false };
    }

    if (p.speedBoost) p.speedBoost = false;
    if (e.speedBoost) e.speedBoost = false;
    
    combatState.turn++;
    return { log, finished: false, escaped: false };
}
