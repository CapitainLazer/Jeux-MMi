// =======================
//   COMBAT SYSTEM (ESM)
// =======================

// ----- Combat State -----
export const combatState = {
    active: false,
    turn: 1,
    phase: "root", // "root" | "attacks"
    rootIndex: 0,
    attackIndex: 0
};

// ----- Combat Data -----
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

// ----- Helpers -----
export function computeDamage(attacker, defender, move) {
    if (!move || move.power === 0) return 0;
    const base = attacker.attack + move.power - defender.defense;
    const variance = 0.85 + Math.random() * 0.3;
    return Math.floor(Math.max(1, base) * variance);
}

export function hpBarColor(pct) {
    if (pct > 0.5) return "linear-gradient(90deg,#28c728,#8be628)";
    if (pct > 0.2) return "linear-gradient(90deg,#e6c228,#f6e46b)";
    return "linear-gradient(90deg,#e62828,#f66b6b)";
}

// ----- DOM references (Liés dynamiquement depuis game.js) -----
let combatDOM = {};

// Injecté depuis game.js
export function bindCombatDOM(domRefs) {
    combatDOM = domRefs;
}

// =================================
//        UI UPDATE FUNCTIONS
// =================================
export function updateCombatTopUI() {
    const p = combat.player;
    const e = combat.enemy;

    const pPct = p.hp / p.maxHp;
    const ePct = e.hp / e.maxHp;

    combatDOM.playerName.textContent = `${p.name} N.${p.level}`;
    combatDOM.enemyName.textContent  = `${e.name} N.${e.level}`;

    combatDOM.playerHpBar.style.width   = (pPct * 100) + "%";
    combatDOM.playerHpBar.style.background = hpBarColor(pPct);
    combatDOM.playerHpText.textContent  = `${p.hp} / ${p.maxHp} PV`;

    combatDOM.enemyHpBar.style.width    = (ePct * 100) + "%";
    combatDOM.enemyHpBar.style.background = hpBarColor(ePct);
    combatDOM.enemyHpText.textContent   = `${e.hp} / ${e.maxHp} PV`;
}

export function setCombatQuestion(text) {
    combatDOM.question.textContent = text;
}

export function setCombatLog(text) {
    combatDOM.log.textContent = text;
}

export function setCombatTurnLabel() {
    combatDOM.turn.textContent = `Tour ${combatState.turn}`;
}

// ----- Enemy move selection -----
export function enemyChooseMove() {
    const moves = combat.enemy.attacks;
    return moves[Math.floor(Math.random() * moves.length)];
}

// =================================
//         COMBAT ROUND LOGIC
// =================================
export function doCombatRound(playerAction) {
    const p = combat.player;
    const e = combat.enemy;
    let log = `Tour ${combatState.turn}\n`;

    // ========== PLAYER TURN ==========
    if (playerAction.type === "attack") {
        const move = p.attacks[playerAction.index];
        if (move && Math.random()*100 <= move.accuracy) {
            const dmg = computeDamage(p, e, move);
            e.hp = Math.max(0, e.hp - dmg);
            log += `${p.name} utilise ${move.name} !\n`;
            log += `${e.name} perd ${dmg} PV.\n`;
        } else {
            log += `${p.name} rate ${move?.name} !\n`;
        }
    }

    if (playerAction.type === "run") {
        return { log: gameState.playerName+" s'enfuit !", finished:true, escaped:true };
    }

    if (e.hp <= 0) {
        log += `${e.name} est K.O !`;
        return { log, finished: true };
    }

    // ========== ENEMY TURN ==========
    const enemyMove = enemyChooseMove();
    if (enemyMove && Math.random()*100 <= enemyMove.accuracy) {
        const dmg = computeDamage(e, p, enemyMove);
        p.hp = Math.max(0, p.hp - dmg);
        log += `${e.name} utilise ${enemyMove.name} !\n`;
        log += `${p.name} perd ${dmg} PV.\n`;
    } else {
        log += `${e.name} rate ${enemyMove?.name} !\n`;
    }

    if (p.hp <= 0) {
        log += `${p.name} est K.O !`;
        return { log, finished:true };
    }

    combatState.turn++;
    return { log, finished:false };
}

// =================================
//         COMBAT ENTRY/EXIT
// =================================
export function enterCombatFromWorld(playerCollider, npc, camera, ctx) {
    console.log("⚔️ Combat commencé.");

    combatState.active = true;
    combatState.turn = 1;
    combatState.phase = "root";
    combatState.rootIndex = 0;

    // Save current world state
    ctx.prevPlayerPos = playerCollider.position.clone();
    ctx.prevNpcPos = npc.position.clone();
    ctx.prevCamera = {
        radius: camera.radius,
        height: camera.heightOffset,
        rot: camera.rotationOffset
    };

    // Move into arena
    playerCollider.position = new BABYLON.Vector3(-3,0.5,0);
    npc.position = new BABYLON.Vector3(3,0.9,0);

    camera.radius = 10;
    camera.heightOffset = 8;
    camera.rotationOffset = 0;

    // Show UI
    combatDOM.top.style.display = "flex";
    combatDOM.ui.style.display = "block";

    updateCombatTopUI();
    setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
    setCombatLog("Un combat commence !");
    setCombatTurnLabel();
}

export function exitCombatToWorld(playerCollider, npc, camera, ctx) {
    console.log("🏁 Combat terminé.");

    combatDOM.top.style.display = "none";
    combatDOM.ui.style.display = "none";

    playerCollider.position = ctx.prevPlayerPos;
    npc.position = ctx.prevNpcPos;

    camera.radius = ctx.prevCamera.radius;
    camera.heightOffset = ctx.prevCamera.height;
    camera.rotationOffset = ctx.prevCamera.rot;

    combatState.active = false;
}

// ===============================
//     INPUT HANDLING (KEYBOARD)
// ===============================
export function handleCombatKeyboard(code, gameState, playerCollider, npc, camera, ctx) {
    if (!combatState.active) return;

    if (code === "Enter") {
        const result = doCombatRound({type:"attack", index:0});
        setCombatLog(result.log);
        updateCombatTopUI();

        if (result.finished) {
            setTimeout(() => {
                exitCombatToWorld(playerCollider, npc, camera, ctx);
                gameState.mode = "exploration";
            }, 500);
        }
    }
}
