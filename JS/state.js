// state.js
import { createStarterTeam, getTypeEffectiveness, buildAttack } from "./monsters.js";
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
        { name: "Potion", count: 3, icon: "🧪", description: "Restaure un peu de PV (20 PV)." },
        { name: "Antidote", count: 1, icon: "💊", description: "Soigne l'empoisonnement." }
    ],
    playerTeam: createStarterTeam(),
    playerName: "Red",
    money: 500,
    selectedItemIndex: null,

    // ===== DONNÉES DE POSITION ET ZONE (pour sauvegarde) =====
    currentZone: "house",
    playerPosition: { x: 0, y: 0.9, z: -3 },
    collectedItems: [],
    defeatedNPCs: [], // IDs des dresseurs vaincus (persisté)

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
        { name: "Potion", count: 3, icon: "🧪", description: "Restaure un peu de PV (20 PV)." },
        { name: "Antidote", count: 1, icon: "💊", description: "Soigne l'empoisonnement." }
    ];

    gameState.playerTeam = createStarterTeam();
    gameState.playerName = "Red";
    gameState.money = 500;
    gameState.currentZone = "house";
    gameState.playerPosition = { x: 0, y: 0.9, z: -3 };
    gameState.collectedItems = [];
    gameState.defeatedNPCs = [];
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
    forcedSwitch: false,
    isWild: true,
    fleeAttempts: 0,
    trainerId: null,
    trainerName: null,
    trainerTeam: [],
    trainerIndex: 0
};

export const combat = {
    player: createStarterTeam()[0],
    enemy: createStarterTeam()[0]
};

/**
 * Formule de dégâts style Pokémon :
 *   ((2*L/5+2) * Power * Atk/Def) / 50 + 2
 *   × STAB × Type × Critique × Random(0.85–1.00)
 *
 * @returns {{ damage: number, effectiveness: number, isCrit: boolean, stab: number }}
 */
export function computeDamage(attacker, defender, move) {
    if (!move || move.power === 0) {
        return { damage: 0, effectiveness: 1, isCrit: false, stab: 1 };
    }

    const level = attacker.level || 5;
    const atk = Math.max(1, attacker.attack || 1);
    const def = Math.max(1, defender.defense || 1);
    const power = move.power;

    let base = Math.floor((((2 * level) / 5 + 2) * power * (atk / def)) / 50) + 2;

    // STAB (Same Type Attack Bonus)
    const moveType = move.type || "normal";
    const stab = (attacker.type && moveType === attacker.type) ? 1.5 : 1;

    // Efficacité de type
    const effectiveness = getTypeEffectiveness(moveType, defender.type || "normal");

    // Critique (1/16)
    const isCrit = Math.random() < (1 / 16);
    const critMult = isCrit ? 1.5 : 1;

    // Variance 85–100%
    const variance = 0.85 + Math.random() * 0.15;

    let damage = Math.floor(base * stab * effectiveness * critMult * variance);
    damage = Math.max(1, damage);

    // Illustrator : ignore défense → recalcul simplifié sans DEF
    if (move.ignoreDefense) {
        const raw = Math.floor((((2 * level) / 5 + 2) * power * (atk / Math.max(1, atk * 0.4))) / 50) + 2;
        damage = Math.max(1, Math.floor(raw * stab * effectiveness * critMult * variance));
        delete move.ignoreDefense;
    }

    return { damage, effectiveness, isCrit, stab };
}

function effectivenessMessage(eff) {
    if (eff >= 2) return "C'est super efficace !";
    if (eff > 0 && eff < 1) return "Ce n'est pas très efficace...";
    if (eff === 0) return "Ça n'affecte pas l'adversaire...";
    return null;
}

/**
 * IA dresseur / sauvage : préfère les coups super efficaces et puissants
 */
function enemyChooseMove() {
    const e = combat.enemy;
    const p = combat.player;
    if (!e.attacks || e.attacks.length === 0) return null;

    // 25% coup aléatoire (imprévisibilité)
    if (Math.random() < 0.25) {
        return e.attacks[Math.floor(Math.random() * e.attacks.length)];
    }

    let best = e.attacks[0];
    let bestScore = -Infinity;

    for (const move of e.attacks) {
        const eff = getTypeEffectiveness(move.type || "normal", p.type || "normal");
        const power = move.power || 0;
        // Status moves (power 0) : score moyen pour variété
        let score = power === 0 ? 25 : power * eff;
        if (e.type && move.type === e.type) score *= 1.3; // STAB bias
        // Préférer un heal si PV bas
        if (power === 0 && move.name === "Lightroom" && e.hp < e.maxHp * 0.4) {
            score += 40;
        }
        if (score > bestScore) {
            bestScore = score;
            best = move;
        }
    }
    return best;
}

/**
 * Exécute une attaque et retourne le texte de log + KO éventuel
 */
function resolveAttack(attacker, defender, move) {
    let log = "";
    const logArr = [];

    let effectiveAccuracy = move.accuracy ?? 100;
    if (defender.precisionDown) {
        effectiveAccuracy -= 15 * defender.precisionDown;
    }

    if (Math.random() * 100 > effectiveAccuracy) {
        return { log: `${attacker.name} rate son attaque ${move.name} !\n`, fainted: false };
    }

    applyAttackEffect(move, attacker, defender, logArr);

    const { damage, effectiveness, isCrit } = computeDamage(attacker, defender, move);
    defender.hp = Math.max(0, defender.hp - damage);

    log += `${attacker.name} utilise ${move.name} !\n`;
    if (damage > 0) log += `${defender.name} perd ${damage} PV.\n`;
    if (isCrit) log += "Coup critique !\n";
    const effMsg = effectivenessMessage(effectiveness);
    if (effMsg) log += `${effMsg}\n`;
    if (logArr.length) log += logArr.join("\n") + "\n";

    return { log, fainted: defender.hp <= 0 };
}

/**
 * Chance de fuite style Pokémon (combats sauvages uniquement)
 */
function tryFlee() {
    combatState.fleeAttempts = (combatState.fleeAttempts || 0) + 1;
    if (!combatState.isWild) {
        return { success: false, log: "On ne peut pas fuir un combat de dresseur !\n" };
    }

    // Error (easter egg) : fuite volontairement difficile — "process locked"
    if (combat.enemy.isBugCheat || combat.enemy.name === "Error") {
        const locked = Math.random() > 0.18 + combatState.fleeAttempts * 0.08;
        if (locked) {
            return {
                success: false,
                log: "🔒 process.lock — Impossible de quitter le thread Error !\n"
            };
        }
        return {
            success: true,
            log: `${gameState.playerName} force un kill -9… et s'échappe !\n`
        };
    }

    const pSpeed = combat.player.speed || 1;
    const eSpeed = Math.max(1, combat.enemy.speed || 1);
    const odds = Math.floor((pSpeed * 128) / eSpeed) + 30 * combatState.fleeAttempts;
    const success = odds > 255 || Math.random() * 256 < odds;

    if (success) {
        return { success: true, log: `${gameState.playerName} prend la fuite !\n` };
    }
    return { success: false, log: `${gameState.playerName} ne peut pas s'échapper !\n` };
}

export function doCombatRound(playerAction) {
    const p = combat.player;
    const e = combat.enemy;
    let log = `Tour ${combatState.turn}\n`;

    if (playerAction.type === "bag") {
        // Chemin legacy — le combat.js gère surtout via useBagItem
        const potion = gameState.playerInventory.find(
            it => it.name.toLowerCase().includes("potion") && it.count > 0
        );
        if (potion) {
            let healAmount = 20;
            if (potion.name.toLowerCase().includes("super")) healAmount = 50;
            if (potion.name.toLowerCase().includes("hyper")) healAmount = 200;
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
        return { log, finished: false, escaped: false, playerFainted: false };
    }

    if (playerAction.type === "run") {
        const flee = tryFlee();
        log += flee.log;
        if (flee.success) {
            combatState.active = false;
            return { log, finished: true, escaped: true, playerFainted: false };
        }
        // Échec de fuite → l'ennemi attaque
        if (!e.stunned) {
            const enemyMove = enemyChooseMove();
            if (enemyMove) {
                const result = resolveAttack(e, p, enemyMove);
                log += result.log;
            }
        } else {
            log += `${e.name} est étourdi et ne peut pas attaquer ce tour !\n`;
            e.stunned = false;
        }
        if (p.hp <= 0) {
            log += `${p.name} est K.O. !\n`;
            return { log, finished: false, escaped: false, playerFainted: true };
        }
        combatState.turn++;
        return { log, finished: false, escaped: false, playerFainted: false };
    }

    // === Tour d'attaque normal ===
    let playerSpeed = p.speed + (p.speedBoost ? 10 : 0);
    let enemySpeed = e.speed + (e.speedBoost ? 10 : 0);
    // Premiere Rush appliqué avant comparaison si choisi ce tour
    if (playerAction.type === "attack") {
        const preview = p.attacks[playerAction.index];
        if (preview && preview.name === "Premiere Rush") {
            playerSpeed += 10;
        }
    }

    const playerActsFirst = playerSpeed >= enemySpeed;

    const doPlayerAttack = () => {
        if (p.stunned) {
            log += `${p.name} est étourdi et ne peut pas attaquer ce tour !\n`;
            p.stunned = false;
            return false;
        }
        if (playerAction.type !== "attack") return false;
        const move = p.attacks[playerAction.index];
        if (!move) {
            log += `${p.name} hésite...\n`;
            return false;
        }
        const result = resolveAttack(p, e, move);
        log += result.log;
        return result.fainted;
    };

    const doEnemyAttack = () => {
        if (e.stunned) {
            log += `${e.name} est étourdi et ne peut pas attaquer ce tour !\n`;
            e.stunned = false;
            return false;
        }
        const enemyMove = enemyChooseMove();
        if (!enemyMove) return false;
        const result = resolveAttack(e, p, enemyMove);
        log += result.log;
        return result.fainted;
    };

    if (playerActsFirst) {
        const enemyFainted = doPlayerAttack();
        if (enemyFainted) {
            log += `${e.name} est K.O. !\n`;
            return { log, finished: true, escaped: false, playerFainted: false, victory: true };
        }
        const playerFainted = doEnemyAttack();
        if (playerFainted) {
            log += `${p.name} est K.O. !\n`;
            // Ne PAS terminer le combat : permettre le switch
            return { log, finished: false, escaped: false, playerFainted: true };
        }
    } else {
        const playerFainted = doEnemyAttack();
        if (playerFainted) {
            log += `${p.name} est K.O. !\n`;
            return { log, finished: false, escaped: false, playerFainted: true };
        }
        const enemyFainted = doPlayerAttack();
        if (enemyFainted) {
            log += `${e.name} est K.O. !\n`;
            return { log, finished: true, escaped: false, playerFainted: false, victory: true };
        }
    }

    if (p.speedBoost) p.speedBoost = false;
    if (e.speedBoost) e.speedBoost = false;

    combatState.turn++;
    return { log, finished: false, escaped: false, playerFainted: false };
}

/**
 * Remplace le Digiter ennemi par le suivant de l'équipe dresseur
 * @returns {Object|null} prochain Digiter ou null si plus aucun
 */
export function getNextTrainerMonster() {
    if (combatState.isWild || !combatState.trainerTeam.length) return null;
    const nextIndex = combatState.trainerIndex + 1;
    if (nextIndex >= combatState.trainerTeam.length) return null;
    combatState.trainerIndex = nextIndex;
    return combatState.trainerTeam[nextIndex];
}
