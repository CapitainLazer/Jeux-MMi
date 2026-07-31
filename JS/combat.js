// combat.js
// Scène de combat INDÉPENDANTE et RÉUTILISABLE
import { gameState, combatState, combat, doCombatRound, getNextTrainerMonster, computeDamage } from "./state.js";
import { overlayEl, showDialog, fadeToBlack, fadeFromBlack } from "./ui.js";
import { MONSTERS_DATABASE, buildMonsterInstance } from "./monsters.js";

console.log("⚔️ Chargement combat.js");

let combatScene = null;
let combatEngine = null;
let defeatCallback = null;  // Callback appelé uniquement lors d'une DÉFAITE (tous les Digiters KO)
let victoryCallback = null; // Callback appelé uniquement lors d'une VICTOIRE (ennemi KO)
let savedExplorationState = null; // État sauvegardé pour retourner à l'exploration

// Variables pour stocker les modèles chargés en combat
let playerMonsterMesh = null;
let enemyMonsterMesh = null;

// Dictionnaire pour stocker l'orientation des monstres en combat
const monsterOrientations = {};

// Positions des zones de combat (détectées depuis le GLB ou par défaut)
let zone001Position = new BABYLON.Vector3(-3, 1, -2.5);  // Zone joueur (encore plus haut et vers l'avant)
let zone002Position = new BABYLON.Vector3(3, 0, -2.5);   // Zone ennemi (encore plus haut et vers l'avant)

/**
 * Supprime le modèle du monstre de la scène de combat
 */
function removeMonsterModel(isPlayer) {
    if (isPlayer && playerMonsterMesh) {
        playerMonsterMesh.dispose();
        playerMonsterMesh = null;
    } else if (!isPlayer && enemyMonsterMesh) {
        enemyMonsterMesh.dispose();
        enemyMonsterMesh = null;
    }
}

/**
 * Charge un modèle de monstre à une position donnée dans la scène de combat
 * @param {Object} monsterData - Données du monstre (avec champ model)
 * @param {BABYLON.Vector3} position - Position de spawn
 * @param {BABYLON.Scene} scene - Scène de combat
 * @param {boolean} isPlayer - true si c'est le monstre du joueur
 * @returns {Promise<BABYLON.AbstractMesh>} - Le mesh chargé
 */
async function loadMonsterModel(monsterData, position, scene, isPlayer = false) {
    // Debug : afficher l'identité du monstre et le camp
    console.log(`[DEBUG] Chargement modèle : key=`, monsterData.key, ", name=", monsterData.name, ", isPlayer=", isPlayer);
    let modelPath = monsterData.model;
    // Le modèle est déjà en .gltf, pas besoin de conversion
    
    if (!modelPath) {
        console.warn(`⚠️ Pas de modèle trouvé pour "${monsterData.name}", création d'un placeholder`);
        const placeholder = BABYLON.MeshBuilder.CreateBox(
            `placeholder_${monsterData.name}`,
            { size: 1 },
            scene
        );
        placeholder.position = position.clone();
        placeholder.position.y += 1;
        placeholder.position.z -= 1;
        
        // Définir l'orientation : joueur = 180°, ennemi = 0°
        if (isPlayer) {
            placeholder.rotation.y = Math.PI; // Face à l'ennemi
            monsterOrientations[monsterData.key] = 180;
        } else {
            placeholder.rotation.y = 0; // Face au joueur
            monsterOrientations[monsterData.key] = 0;
        }
        
        const mat = new BABYLON.StandardMaterial(`mat_${monsterData.name}`, scene);
        mat.alpha = 0; // invisible
        placeholder.material = mat;
        console.log(`📦 Placeholder créé pour ${monsterData.name} à `, position.toString());
        return placeholder;
    }

    // Charger le modèle GLB avec ImportMesh (plus propre)
    return new Promise((resolve) => {
        BABYLON.SceneLoader.ImportMesh(
            null, // tout importer
            '', // pas de rootUrl car modelPath contient le chemin complet
            modelPath,
            scene,
            (meshes) => {
                if (!meshes || meshes.length === 0) {
                    console.warn(`❌ Aucun mesh trouvé dans ${modelPath}`);
                    const placeholder = BABYLON.MeshBuilder.CreateBox(
                        `placeholder_${monsterData.name}`,
                        { size: 1 },
                        scene
                    );
                    placeholder.position = position.clone();
                    placeholder.position.y += 0.5;
                    placeholder.rotation.y = isPlayer ? Math.PI : 0;
                    
                    const mat = new BABYLON.StandardMaterial(`mat_${monsterData.name}`, scene);
                    mat.alpha = 0; // invisible
                    placeholder.material = mat;
                    resolve(placeholder);
                    return;
                }
                
                // Prendre le premier mesh principal
                const root = meshes[0];
                root.position = position.clone();
                if (monsterData.name === "Pedro" && isPlayer) {
                    root.position.y += 2.6;
                    root.position.z -= 2.5;
                    root.position.x += 0.5;
                } else if (monsterData.name === "Pedro" && !isPlayer) {
                    root.position.y += 3.4;
                    root.position.z -= 1.2;
                    root.position.x -= 0.7;
                    root.rotation.y = Math.PI / 3;
                } else if (monsterData.name === "Error" && isPlayer) {
                    root.position.y += 1.5;
                    root.position.z -= 2;
                    root.position.x += 0;
                    root.scaling = new BABYLON.Vector3(0.15, 0.15, 0.15);
                } else if (monsterData.name === "Error" && !isPlayer) {
                    root.position.y += 1.5;
                    root.position.z -= 2;
                    root.position.x -= 0;
                    root.scaling = new BABYLON.Vector3(0.15, 0.15, 0.15);
                } else if (!isPlayer) {
                    root.position.y += 1;
                    root.position.z -= 2.5;
                    root.position.x -= 0.5;
                    root.rotation.y = Math.PI / 3;
                } else {
                    root.position.y += 1;
                    root.position.z -= 1.5;
                    root.position.x += 0.5;
                }
                root.position.z -= 1;
                root.scaling = new BABYLON.Vector3(0.8, 0.8, 0.8);
                
                // ✔ ROTATION CORRIGÉE À 100%
                if (isPlayer) {
                    root.rotation.y = Math.PI;
                    monsterOrientations[monsterData.key] = 180;
                    console.log(`🕖 JOUEUR orienté à  180° (Math.PI)`);
                } else {
                    root.rotation.y = 0;
                    monsterOrientations[monsterData.key] = 0;
                    console.log(`❌ ENNEMI orienté à  0°`);
                }
                
                if (isPlayer && playerMonsterMesh) {
                    playerMonsterMesh.dispose();
                } else if (!isPlayer && enemyMonsterMesh) {
                    enemyMonsterMesh.dispose();
                }
                
                if (isPlayer) {
                    playerMonsterMesh = root;
                } else {
                    enemyMonsterMesh = root;
                }
                console.log(`📐 Transformations finales pour ${monsterData.name} :`);
                console.log(`   Position : ${root.position.toString()}`);
                console.log(`   Échelle : ${root.scaling.toString()}`);
                console.log(`   Rotation : ${root.rotation.toString()}`);
                console.log(`✅ Modèle chargé pour ${monsterData.name} à `, root.position.toString());
                resolve(root);
            },
            null, // pas besoin de progress
            (scene, message) => {
                console.warn(`❌ Erreur chargement ${modelPath}: ${message}`);
                const placeholder = BABYLON.MeshBuilder.CreateBox(
                    `placeholder_${monsterData.name}`,
                    { size: 1 },
                    scene
                );
                placeholder.position = position.clone();
                placeholder.position.y += 2.5;
                placeholder.position.z -= 2.5;
                
                // âœ… Rotation corrigÃ©e : joueur = 180Â°, ennemi = 0Â°
                placeholder.rotation.y = isPlayer ? Math.PI : 0;
                
                const mat = new BABYLON.StandardMaterial(`mat_${monsterData.name}`, scene);
                mat.alpha = 0; // invisible
                placeholder.material = mat;
                resolve(placeholder);
            }
        );
    });
}

/**
 * Met à jour le modèle du monstre (lors d'un changement de Digiter)
 * @param {Object} monsterData - Données du monstre
 * @param {boolean} isPlayer - true pour le joueur
 * @param {BABYLON.Scene} scene - Scène de combat
 */
async function updateMonsterModel(monsterData, isPlayer, scene) {
    removeMonsterModel(isPlayer);
    
    const position = isPlayer ? zone001Position : zone002Position;
    const mesh = await loadMonsterModel(monsterData, position, scene, isPlayer);
    
    if (isPlayer) {
        playerMonsterMesh = mesh;
    } else {
        enemyMonsterMesh = mesh;
    }
    
    return mesh;
}

// ✅ Exporter les fonctions pour utilisation externe
export { updateMonsterModel, removeMonsterModel };

// ✅ Fonction pour définir le callback après une DÉFAITE (tous les Digiter KO)
export function setDefeatCallback(callback) {
    defeatCallback = callback;
    console.log("💀 Defeat callback défini pour:", callback.name || "anonymous");
}

// ✅ Fonction pour définir le callback après une VICTOIRE (ennemi KO)
export function setVictoryCallback(callback) {
    victoryCallback = callback;
    console.log("🏆 Victory callback défini pour:", callback.name || "anonymous");
}

// ✅ Fonction dépréciée - redirige vers setDefeatCallback pour compatibilité
export function setCombatCallback(callback) {
    console.warn("⚠️ setCombatCallback est déprécié, utilisez setDefeatCallback ou setVictoryCallback");
    defeatCallback = callback;
}

// ====== RÉFÉRENCES DOM (partages avec world.js) ======
const combatModelsContainerEl = document.getElementById("combatModelsContainer");
const combatTopUIEl          = document.getElementById("combatTopUI");
const combatPlayerNameTopEl  = document.getElementById("combatPlayerNameTop");
const combatEnemyNameTopEl   = document.getElementById("combatEnemyNameTop");
const combatPlayerHpBarEl    = document.getElementById("combatPlayerHpBar");
const combatEnemyHpBarEl     = document.getElementById("combatEnemyHpBar");
const combatPlayerHpTextEl   = document.getElementById("combatPlayerHpText");
const combatEnemyHpTextEl    = document.getElementById("combatEnemyHpText");

const combatUIEl             = document.getElementById("combatUI");
const combatQuestionTextEl   = document.getElementById("combatQuestionText");
const combatLogTextEl        = document.getElementById("combatLogText");
const combatTurnEl           = document.getElementById("combatTurn");

const combatChoiceAttackEl   = document.getElementById("combatChoiceAttack");
const combatChoiceBagEl      = document.getElementById("combatChoiceBag");
const combatChoiceRunEl      = document.getElementById("combatChoiceRun");
const combatChoicesButtons   = [combatChoiceAttackEl, combatChoiceBagEl, combatChoiceRunEl];

const combatAttackListEl     = document.getElementById("combatAttackList");
const combatAttackInfoEl     = document.getElementById("combatAttackInfo");
const combatAttackInfoTextEl = document.getElementById("combatAttackInfoText");
const attackButtons          = [
    document.getElementById("attackBtn0"),
    document.getElementById("attackBtn1"),
    document.getElementById("attackBtn2"),
    document.getElementById("attackBtn3")
];

const combatBagListEl        = document.getElementById("combatBagList");
const combatBagItemsEl       = document.getElementById("combatBagItems");
const combatTeamListEl       = document.getElementById("combatTeamList");
const combatTeamMembersEl    = document.getElementById("combatTeamMembers");

// ====== UTILS COMBAT UI =====
function hpBarColor(pct) {
    if (pct > 0.5) return "linear-gradient(90deg,#28c728,#8be628)";
    if (pct > 0.2) return "linear-gradient(90deg,#e6c228,#f6e46b)";
    return "linear-gradient(90deg,#e62828,#f66b6b)";
}

function updateCombatTopUI() {
    const p = combat.player;
    const e = combat.enemy;
    const pPct = p.hp / p.maxHp;
    const ePct = e.hp / e.maxHp;

    combatPlayerNameTopEl.textContent = `${p.name} N.${p.level}${p.type ? ` [${p.type}]` : ""}`;
    combatEnemyNameTopEl.textContent  = `${e.name} N.${e.level}${e.type ? ` [${e.type}]` : ""}`;

    combatPlayerHpBarEl.style.width   = (pPct * 100) + "%";
    combatPlayerHpBarEl.style.background = hpBarColor(pPct);
    combatPlayerHpTextEl.textContent  = `${p.hp} / ${p.maxHp} PV`;

    combatEnemyHpBarEl.style.width    = (ePct * 100) + "%";
    combatEnemyHpBarEl.style.background = hpBarColor(ePct);
    combatEnemyHpTextEl.textContent   = `${e.hp} / ${e.maxHp} PV`;
}

function setCombatQuestion(text) {
    combatQuestionTextEl.textContent = text;
}
function setCombatLog(text) {
    combatLogTextEl.textContent = text;
}
function setCombatTurnLabel() {
    combatTurnEl.textContent = `Tour ${combatState.turn}`;
}

function hideAttackMenu() {
    combatAttackListEl.style.display = "none";
    combatAttackInfoEl.style.display = "none";
    combatState.phase = "root";
}

function showAttackMenu() {
    combatAttackListEl.style.display = "grid";
    combatAttackInfoEl.style.display = "block";
    combatState.phase = "attacks";
    
    // ✅ Remplir les boutons avec les noms des attaques
    const moves = combat.player.attacks || [];
    for (let i = 0; i < 4; i++) {
        const btn = attackButtons[i];
        if (!btn) continue;
        const move = moves[i];
        if (move) {
            btn.textContent = move.type ? `${move.name}\n(${move.type})` : move.name;
            btn.disabled = false;
            btn.title = `Type: ${move.type || "?"} | Puissance: ${move.power} | Précision: ${move.accuracy}%`;
        } else {
            btn.textContent = "-";
            btn.disabled = true;
            btn.title = "";
        }
        btn.classList.remove("selected");
    }
    
    combatState.attackIndex = 0;
    updateAttackSelection();
    updateAttackInfo();
}

function hideBagMenu() {
    combatBagListEl.style.display = "none";
    combatState.phase = "root";
}

function showBagMenu() {
    // Cacher les autres menus
    hideAttackMenu();
    combatTeamListEl.style.display = "none";
    
    // Afficher le menu sac
    combatBagListEl.style.display = "block";
    combatState.phase = "bag";
    combatState.bagIndex = 0;
    
    // Remplir avec les objets utilisables
    combatBagItemsEl.innerHTML = "";
    const usableItems = gameState.playerInventory.filter(item => 
        (item.name.toLowerCase().includes("potion") || item.name.toLowerCase().includes("ball")) && item.count > 0
    );
    
    if (usableItems.length === 0) {
        combatBagItemsEl.innerHTML = "<p style='color:#aaa; padding:10px; text-align:center; grid-column: 1 / -1;'>Aucun objet utilisable...</p>";
    } else {
        usableItems.forEach((item, idx) => {
            const btn = document.createElement("button");
            btn.className = "combat-bag-item-btn";
            btn.innerHTML = `
                <div style="font-size: 24px; margin-bottom: 4px;">${item.icon}</div>
                <div style="font-size: 12px; margin-bottom: 2px;">${item.name}</div>
                <div style="font-size: 13px; color: #ffe780;">x${item.count}</div>
            `;
            btn.dataset.itemIndex = idx;
            btn.addEventListener("click", () => {
                if (item.name.toLowerCase().includes("potion")) {
                    showTeamMenuForItem(item);
                } else {
                    // Pokéball - utiliser directement
                    useBagItem(item, null);
                }
            });
            if (idx === combatState.bagIndex) {
                btn.classList.add("selected");
            }
            combatBagItemsEl.appendChild(btn);
        });
    }
    
    // Ajouter un bouton Retour
    const btnBack = document.createElement("button");
    btnBack.className = "combat-bag-back-btn";
    btnBack.textContent = "← Retour";
    btnBack.style.cssText = "grid-column: 1 / -1; margin-top: 10px; padding: 10px; border-radius: 8px; background: #555; color: white; border: none; cursor: pointer; font-size: 14px;";
    btnBack.addEventListener("click", () => {
        hideBagMenu();
        setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
        updateCombatRootSelection();
    });
    combatBagItemsEl.appendChild(btnBack);
}

function hideTeamMenu() {
    combatTeamListEl.style.display = "none";
    combatState.phase = "root";
}

function showTeamMenuForItem(item) {
    // Afficher le menu de l'équipe pour sélectionner sur qui utiliser l'objet
    combatBagListEl.style.display = "none";
    combatTeamListEl.style.display = "block";
    combatState.phase = "team";
    combatState.teamIndex = 0;
    combatState.selectedBagItem = item;
    
    renderTeamMenuForItem();
}

function showTeamMenuForSwitch(forced = false) {
    // Afficher le menu de l'équipe pour changer de Digiter
    hideAttackMenu();
    hideBagMenu();
    combatTeamListEl.style.display = "block";
    combatState.phase = "team";
    combatState.teamIndex = 0;
    combatState.forcedSwitch = forced;
    combatState.selectedBagItem = null;
    
    renderTeamMenuForSwitch();
}

function renderTeamMenuForItem() {
    combatTeamMembersEl.innerHTML = `<h3 style="color:#fff;">Utiliser sur quel Digiter ?</h3>`;
    
    gameState.playerTeam.forEach((poke, idx) => {
        const btn = document.createElement("button");
        btn.className = "combat-team-member-btn";
        btn.innerHTML = `
            ${poke.icon} ${poke.name} Nv.${poke.level}
            <br><small>HP: ${poke.hp}/${poke.maxHp}</small>
        `;
        btn.dataset.pokeIndex = idx;
        btn.addEventListener("click", () => {
            useBagItem(combatState.selectedBagItem, poke);
        });
        if (idx === combatState.teamIndex) {
            btn.classList.add("selected");
        }
        combatTeamMembersEl.appendChild(btn);
    });
    
    const btnBack = document.createElement("button");
    btnBack.className = "combat-team-member-btn";
    btnBack.textContent = "← Retour";
    btnBack.addEventListener("click", () => {
        hideTeamMenu();
        showBagMenu();
    });
    combatTeamMembersEl.appendChild(btnBack);
}

function renderTeamMenuForSwitch() {
    const title = combatState.forcedSwitch 
        ? `<h3 style="color:#f66;">Choisir un autre Digiter !</h3>`
        : `<h3 style="color:#fff;">Changer de Digiter</h3>`;
    
    combatTeamMembersEl.innerHTML = title;
    
    gameState.playerTeam.forEach((poke, idx) => {
        const btn = document.createElement("button");
        btn.className = "combat-team-member-btn";
        
        // Le Digiter actuel en combat ne peut pas être sélectionné
        const isCurrent = poke.name === combat.player.name;
        const isFainted = poke.hp <= 0;
        
        btn.innerHTML = `
            ${poke.icon} ${poke.name} Nv.${poke.level} ${poke.type ? `(${poke.type})` : ''}
            <br><small>HP: ${poke.hp}/${poke.maxHp}</small>
            ${isCurrent ? "<br><em>(Actuel)</em>" : ""}
            ${isFainted ? "<br><em style='color:#f66;'>(K.O.)</em>" : ""}
        `;
        btn.dataset.pokeIndex = idx;
        btn.disabled = isCurrent || isFainted;
        
        btn.addEventListener("click", () => {
            if (!btn.disabled) {
                switchPokemon(poke);
            }
        });
        
        if (idx === combatState.teamIndex && !btn.disabled) {
            btn.classList.add("selected");
        }
        combatTeamMembersEl.appendChild(btn);
    });
    
    if (!combatState.forcedSwitch) {
        const btnBack = document.createElement("button");
        btnBack.className = "combat-team-member-btn";
        btnBack.textContent = "← Retour";
        btnBack.addEventListener("click", () => {
            hideTeamMenu();
            updateCombatRootSelection();
        });
        combatTeamMembersEl.appendChild(btnBack);
    }
}

function useBagItem(item, targetPokemon) {
    if (!item || item.count <= 0) return;
    
    if (item.name.toLowerCase().includes("potion")) {
        if (!targetPokemon) return;
        let healAmount = 20;
        if (item.name.toLowerCase().includes("super")) healAmount = 50;
        if (item.name.toLowerCase().includes("hyper")) healAmount = 200;
        const before = targetPokemon.hp;
        targetPokemon.hp = Math.min(targetPokemon.maxHp, targetPokemon.hp + healAmount);
        const healed = targetPokemon.hp - before;
        
        item.count--;
        
        // Si c'est le Digiter en combat, mettre à jour combat.player
        if (targetPokemon.name === combat.player.name) {
            combat.player.hp = targetPokemon.hp;
        }
        
        const log = `${gameState.playerName} utilise ${item.name} sur ${targetPokemon.name} !\n${targetPokemon.name} récupère ${healed} PV.`;
        
        hideTeamMenu();
        hideBagMenu();
        updateCombatTopUI();
        setCombatLog(log);
        setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
        updateCombatRootSelection();
        
        // L'ennemi attaque après l'utilisation
        enemyTurnAfterBag();
    }
}

function switchPokemon(newPokemon) {
    // Synchroniser avec l'équipe
    const currentInTeam = gameState.playerTeam.find(p => p.name === combat.player.name);
    if (currentInTeam) {
        currentInTeam.hp = combat.player.hp;
        currentInTeam.status = combat.player.hp <= 0 ? "KO" : "OK";
    }

    const wasForced = combatState.forcedSwitch;
    const previousName = combat.player.name;

    // Copier TOUTES les stats (évite les fuites de stats du Digiter précédent)
    Object.assign(combat.player, {
        key: newPokemon.key || newPokemon.name,
        name: newPokemon.name,
        type: newPokemon.type,
        level: newPokemon.level,
        maxHp: newPokemon.maxHp,
        hp: newPokemon.hp,
        attack: newPokemon.attack,
        defense: newPokemon.defense,
        speed: newPokemon.speed,
        attacks: newPokemon.attacks ? [...newPokemon.attacks] : combat.player.attacks,
        model: newPokemon.model,
        icon: newPokemon.icon,
        status: "OK",
        stunned: false,
        precisionDown: 0,
        speedBoost: false,
        poisoned: false
    });

    const log = wasForced
        ? `${gameState.playerName} envoie ${newPokemon.name} !`
        : `${gameState.playerName} rappelle ${previousName} !\n${gameState.playerName} envoie ${newPokemon.name} !`;

    hideTeamMenu();
    updateCombatTopUI();
    setCombatLog(log);
    setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
    updateCombatRootSelection();
    combatState.forcedSwitch = false;

    // ✅ Mettre à jour le modèle 3D avec les données complètes
    if (combatScene) {
        updateMonsterModel(newPokemon, true, combatScene);
    }

    // L'ennemi attaque après un switch volontaire uniquement
    if (!wasForced) {
        enemyTurnAfterSwitch();
    }
}

function performEnemyFreeTurn(prefixLog = "") {
    const attacks = combat.enemy.attacks || [];
    if (!attacks.length) return;

    // Même IA simple que state.js (préférence puissance × type)
    let enemyMove = attacks[Math.floor(Math.random() * attacks.length)];
    if (Math.random() >= 0.25) {
        let bestScore = -Infinity;
        for (const move of attacks) {
            const score = (move.power || 0) + (move.type === combat.enemy.type ? 10 : 0);
            if (score > bestScore) {
                bestScore = score;
                enemyMove = move;
            }
        }
    }

    const accuracy = enemyMove.accuracy || 90;
    let log = prefixLog;
    if (Math.random() * 100 <= accuracy) {
        const { damage, effectiveness, isCrit } = computeDamage(combat.enemy, combat.player, { ...enemyMove });
        combat.player.hp = Math.max(0, combat.player.hp - damage);

        const currentInTeam = gameState.playerTeam.find(p => p.name === combat.player.name);
        if (currentInTeam) currentInTeam.hp = combat.player.hp;

        log += `${combat.enemy.name} utilise ${enemyMove.name} !\n`;
        if (damage > 0) log += `${combat.player.name} perd ${damage} PV.\n`;
        if (isCrit) log += "Coup critique !\n";
        if (effectiveness >= 2) log += "C'est super efficace !\n";
        else if (effectiveness < 1 && effectiveness > 0) log += "Ce n'est pas très efficace...\n";
    } else {
        log += `${combat.enemy.name} rate son attaque ${enemyMove.name} !\n`;
    }

    updateCombatTopUI();
    setCombatLog(log.trim());
    checkPlayerFainted();
    combatState.turn++;
    setCombatTurnLabel();
}

function enemyTurnAfterBag() {
    setTimeout(() => performEnemyFreeTurn(), 800);
}

function enemyTurnAfterSwitch() {
    showTurnParticleEffect().then(() => {
        setTimeout(() => performEnemyFreeTurn(), 800);
    });
}

function showTurnParticleEffect() {
    return new Promise((resolve) => {
        let el = document.getElementById("turnParticleEffect");
        if (!el) {
            el = document.createElement("div");
            el.id = "turnParticleEffect";
            el.style.position = "fixed";
            el.style.left = "50%";
            el.style.top = "50%";
            el.style.transform = "translate(-50%, -50%)";
            el.style.pointerEvents = "none";
            el.style.zIndex = 2000;
            document.body.appendChild(el);
        }
        el.innerHTML = "";
        for (let i = 0; i < 12; i++) {
            const p = document.createElement("div");
            p.className = "turn-particle";
            p.style.position = "absolute";
            p.style.width = "18px";
            p.style.height = "18px";
            p.style.borderRadius = "50%";
            p.style.background = "radial-gradient(circle, #FFD700 60%, #fff70000 100%)";
            p.style.opacity = "0.85";
            const angle = (i / 12) * 2 * Math.PI;
            p.style.left = `calc(50% + ${Math.cos(angle) * 10}px)`;
            p.style.top = `calc(50% + ${Math.sin(angle) * 10}px)`;
            p.style.transition = "all 0.7s cubic-bezier(.4,2,.6,1)";
            el.appendChild(p);
            setTimeout(() => {
                p.style.left = `calc(50% + ${Math.cos(angle) * 80}px)`;
                p.style.top = `calc(50% + ${Math.sin(angle) * 80}px)`;
                p.style.opacity = "0";
            }, 10);
        }
        setTimeout(() => {
            el.innerHTML = "";
            resolve();
        }, 700);
    });
}

function checkPlayerFainted() {
    if (combat.player.hp <= 0) {
        setCombatLog(`${combat.player.name} est K.O. !`);
        
        // Vérifier s'il reste des Digiter en vie
        const aliveTeam = gameState.playerTeam.filter(p => p.hp > 0);
        if (aliveTeam.length === 0) {
            setTimeout(() => {
                setCombatLog("Tous vos Digiter sont K.O. !\nVous perdez le combat...");
                setTimeout(() => endCombat(true), 2000); // true = DÉFAITE
            }, 1000);
        } else {
            setTimeout(() => {
                showTeamMenuForSwitch(true);
            }, 1000);
        }
    }
}

function updateAttackSelection() {
    attackButtons.forEach((btn, idx) => {
        if (!btn) return;
        btn.classList.toggle("selected", idx === combatState.attackIndex);
    });
}

function updateAttackInfo() {
    const p = combat.player;
    const atk = p.attacks[combatState.attackIndex];
    if (!atk) {
        combatAttackInfoTextEl.textContent = "---";
        return;
    }
    // Affichage amélioré des infos
    combatAttackInfoTextEl.textContent = `
${atk.name}${atk.type ? ` (${atk.type})` : ""}
Puissance: ${atk.power}
Précision: ${atk.accuracy}%
${atk.effect ? `Effet: ${atk.effect}` : ""}
    `.trim();
}

function updateCombatRootSelection() {
    combatChoicesButtons.forEach((btn, idx) => {
        if (!btn) return;
        const isSelected = idx === combatState.rootIndex;
        btn.classList.toggle("selected", isSelected);
        if (isSelected) {
            console.log(`📍 Sélection menu : ${btn.textContent || btn.dataset.action}`);
        }
    });
}

function updateCombatAttackSelection() {
    attackButtons.forEach((btn, idx) => {
        if (!btn) return;
        const isSelected = idx === combatState.attackIndex;
        btn.classList.toggle("selected", isSelected);
        if (isSelected) {
            console.log(`📍 Sélection attaque : ${btn.textContent}`);
            const move = combat.player.attacks[idx];
            if (move) {
                const info = `<strong>${move.name}</strong>${move.type ? ` <em>(${move.type})</em>` : ""}<br>Puissance: ${move.power} | Précision: ${move.accuracy}%${move.effect ? `<br>Effet: ${move.effect}` : ""}`;
                combatAttackInfoTextEl.innerHTML = info;
            }
        }
    });
}

// ====== ACTIONS COMBAT =====
function handlePlayerRootChoice(action) {
    if (!combatState.active) return;

    if (action === "attack") {
        showAttackMenu();
        setCombatQuestion("Choisis une attaque :");
        return;
    }

    if (action === "bag") {
        showBagMenu();
        setCombatQuestion("Choisis un objet :");
        return;
    }

    if (action === "run") {
        if (!combatState.isWild) {
            setCombatLog("On ne peut pas fuir un combat de dresseur !");
            return { finished: false, escaped: false };
        }
        const result = doCombatRound({ type: "run" });
        updateCombatTopUI();
        setCombatLog(result.log);
        setCombatTurnLabel();
        if (result.playerFainted) {
            checkPlayerFainted();
            return { ...result, finished: false };
        }
        return result;
    }
}

function handlePlayerAttackChoice(index) {
    const result = doCombatRound({ type: "attack", index });

    // Synchroniser les HP avec l'équipe
    const currentInTeam = gameState.playerTeam.find(p => p.name === combat.player.name);
    if (currentInTeam) {
        currentInTeam.hp = combat.player.hp;
        if (combat.player.hp <= 0) currentInTeam.status = "KO";
    }

    updateCombatTopUI();
    setCombatLog(result.log);
    setCombatTurnLabel();

    // Digiter joueur K.O. → switch forcé (ne pas traiter comme victoire)
    if (result.playerFainted) {
        checkPlayerFainted();
        return { ...result, finished: false };
    }

    // Ennemi K.O. → éventuellement Digiter suivant du dresseur
    if (result.finished && result.victory) {
        const next = getNextTrainerMonster();
        if (next) {
            const nextMonster = buildMonsterInstance(next);
            Object.assign(combat.enemy, nextMonster);
            combat.enemy.hp = nextMonster.maxHp;
            combat.enemy.stunned = false;
            combat.enemy.precisionDown = 0;
            combat.enemy.speedBoost = false;

            setCombatLog(
                result.log +
                `\n${combatState.trainerName || "Le dresseur"} envoie ${nextMonster.name} !`
            );
            updateCombatTopUI();
            if (combatScene) {
                updateMonsterModel(nextMonster, false, combatScene);
            }
            setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
            return { log: result.log, finished: false, escaped: false, playerFainted: false };
        }
    }

    return result;
}

// ====== CLAVIER COMBAT =====
// Exporté pour les contrôles mobiles
export function handleCombatKeyboard(rawKey, k) {
    if (!combatState.active) {
        endCombat(false); // État invalide, pas une défaite
        return;
    }

    if (combatState.phase === "root") {
        if (["arrowup","z","w"].includes(k)) {
            combatState.rootIndex = (combatState.rootIndex + combatChoicesButtons.length - 1) % combatChoicesButtons.length;
            console.log(`⬆️ Haut - Nouvel index: ${combatState.rootIndex}`);
            updateCombatRootSelection();
        } else if (["arrowdown","s"].includes(k)) {
            combatState.rootIndex = (combatState.rootIndex + 1) % combatChoicesButtons.length;
            console.log(`⬇️ Bas - Nouvel index: ${combatState.rootIndex}`);
            updateCombatRootSelection();
        } else if (["arrowleft","q"].includes(k)) {
            combatState.rootIndex = Math.max(0, combatState.rootIndex - 1);
            console.log(`⬅️ Gauche - Nouvel index: ${combatState.rootIndex}`);
            updateCombatRootSelection();
        } else if (["arrowright","d"].includes(k)) {
            combatState.rootIndex = Math.min(combatChoicesButtons.length - 1, combatState.rootIndex + 1);
            console.log(`➡️ Droite - Nouvel index: ${combatState.rootIndex}`);
            updateCombatRootSelection();
        } else if (rawKey === "Enter") {
            const btn = combatChoicesButtons[combatState.rootIndex];
            const action = btn.dataset.action;
            console.log(`✅ Validation: ${action}`);
            const result = handlePlayerRootChoice(action);
            if (result && result.finished) {
                setTimeout(() => endCombat(false, !!result.escaped), 500);
            }
        } else if (rawKey === "Escape") {
            console.log(`🏃 Fuite (Escape)`);
            const result = handlePlayerRootChoice("run");
            if (result && result.finished) {
                setTimeout(() => endCombat(false, !!result.escaped), 500);
            }
        }
    } else if (combatState.phase === "attacks") {
        let idx = combatState.attackIndex;
        if (["arrowup","z","w"].includes(k)) {
            idx = (idx - 2 + 4) % 4;
            console.log(`⬆️ Haut attaque - Nouvel index: ${idx}`);
        } else if (["arrowdown","s"].includes(k)) {
            idx = (idx + 2) % 4;
            console.log(`⬇️ Bas attaque - Nouvel index: ${idx}`);
        } else if (["arrowleft","q"].includes(k)) {
            if (idx % 2 === 1) idx--;
            console.log(`⬅️ Gauche attaque - Nouvel index: ${idx}`);
        } else if (["arrowright","d"].includes(k)) {
            if (idx % 2 === 0 && idx < 3) idx++;
            console.log(`➡️ Droite attaque - Nouvel index: ${idx}`);
        } else if (rawKey === "Enter") {
            const move = combat.player.attacks[combatState.attackIndex];
            console.log(`✅ Attaque sélectionnée: ${move?.name || "?"}`);
            const result = handlePlayerAttackChoice(combatState.attackIndex);
            if (result && result.finished) {
                setTimeout(() => endCombat(false), 500); // Victoire (ennemi KO)
            } else {
                hideAttackMenu();
                setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
                updateCombatRootSelection();
            }
        } else if (rawKey === "Escape") {
            console.log(`↩️ Retour au menu`);
            hideAttackMenu();
            setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
            updateCombatRootSelection();
        }
        combatState.attackIndex = idx;
        updateCombatAttackSelection();
        updateAttackSelection();
        updateAttackInfo();
    }
}

// ====== EVENT LISTENERS COMBAT =====
function attachCombatListeners() {
    // Boutons du menu racine (Attaque, Sac, Fuite)
    combatChoiceAttackEl.addEventListener("click", () => {
        combatState.rootIndex = 0;
        updateCombatRootSelection();
        handlePlayerRootChoice("attack");
    });
    combatChoiceAttackEl.addEventListener("mouseover", () => {
        combatState.rootIndex = 0;
        updateCombatRootSelection();
    });
    
    combatChoiceBagEl.addEventListener("click", () => {
        combatState.rootIndex = 1;
        updateCombatRootSelection();
        const result = handlePlayerRootChoice("bag");
        if (result && result.finished) {
            setTimeout(() => endCombat(false), 500);
        }
    });
    combatChoiceBagEl.addEventListener("mouseover", () => {
        combatState.rootIndex = 1;
        updateCombatRootSelection();
    });
    
    combatChoiceRunEl.addEventListener("click", () => {
        combatState.rootIndex = 2;
        updateCombatRootSelection();
        const result = handlePlayerRootChoice("run");
        if (result && result.finished) {
            setTimeout(() => endCombat(false, !!result.escaped), 500);
        }
    });
    combatChoiceRunEl.addEventListener("mouseover", () => {
        combatState.rootIndex = 2;
        updateCombatRootSelection();
    });

    // Boutons d'attaque (grille 2x2)
    attackButtons.forEach((btn, idx) => {
        btn.addEventListener("click", () => {
            if (!btn.disabled) {
                combatState.attackIndex = idx;
                updateCombatAttackSelection();
                const result = handlePlayerAttackChoice(idx);
                if (result && result.finished) {
                    setTimeout(() => endCombat(false), 500);
                } else {
                    hideAttackMenu();
                    setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
                    updateCombatRootSelection();
                }
            }
        });
        btn.addEventListener("mouseover", () => {
            if (!btn.disabled) {
                combatState.attackIndex = idx;
                updateCombatAttackSelection();
            }
        });
    });
}

// ====== GESTION SCÈNE COMBAT =====
let zonesDetected = false;

function createCombatScene(canvas, engine) {
    const scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;
    zonesDetected = false;

    console.log("⚔️ Création de la scène de combat");

    // Lumière simple
    const light = new BABYLON.HemisphericLight("combatLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 1.2;

    // ✅ Charger le GLB FigthZone1.glb pour la zone de combat
    let combatGround = null;
    BABYLON.SceneLoader.ImportMesh(
        "",
        "./Assets/models/zones/",
        "FigthZone1.glb",
        scene,
        (meshes) => {
            if (meshes && meshes.length > 0) {
                combatGround = meshes[0];
                console.log("✅ Zone de combat chargée :", combatGround.name);
                
                // ✅ Chercher les zones dans TOUS les nodes de la scène
                const allNodes = scene.getNodes();
                console.log("📋 Tous les nodes de la scène:", allNodes.map(n => `${n.name} (${n.getClassName()})`).join(", "));
                
                allNodes.forEach((node) => {
                    const nameLower = node.name.toLowerCase();
                    
                    if (nameLower.includes("zone.001") || nameLower === "zone.001") {
                        node.computeWorldMatrix(true);
                        const rawPos = node.getAbsolutePosition().clone();
                        zone001Position = new BABYLON.Vector3(
                            rawPos.x + 2.5,
                            rawPos.y + 0.5,
                            rawPos.z + 5.5
                        );
                        console.log(`🔍 zone.001 (joueur) détectée [${node.getClassName()}] à :`, zone001Position.toString());
                    }
                    
                    if (nameLower.includes("zone.002") || nameLower === "zone.002") {
                        node.computeWorldMatrix(true);
                        const rawPos = node.getAbsolutePosition().clone();
                        zone002Position = new BABYLON.Vector3(
                            rawPos.x - 1.5,
                            rawPos.y + 0.5,
                            rawPos.z + 1
                        );
                        console.log(`🔍 zone.002 (ennemi) détectée [${node.getClassName()}] à :`, zone002Position.toString());
                    }
                });
                
                zonesDetected = true;
                console.log("🎯 Positions finales - Joueur:", zone001Position.toString(), "| Ennemi:", zone002Position.toString());
            }
        }
    );

    // Caméra centrée (ArcRotate pour effet isométrique)
    const camera = new BABYLON.ArcRotateCamera(
        "combatCam",
        Math.PI / 2,
        Math.PI / 2.1,
        9,
        new BABYLON.Vector3(0, 1.2, 0),
        scene
    );
    
    // ✅ Verrouiller complètement la caméra
    camera.attachControl(canvas, true);
    camera.detachControl();
    camera.inertia = 0;
    camera.angularSensibilityX = 0;
    camera.angularSensibilityY = 0;
    camera.wheelPrecision = 0;
    
    // 🔧 Touche DEBUG (V) pour déverrouiller la caméra
    let cameraDebugMode = false;
    scene.onKeyboardObservable.add((kbInfo) => {
        if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            if (kbInfo.event.key.toLowerCase() === "v") {
                cameraDebugMode = !cameraDebugMode;
                if (cameraDebugMode) {
                    camera.attachControl(canvas, false);
                    console.log("🔓 Caméra déverrouillée (mode debug)");
                } else {
                    camera.detachControl();
                    camera.inertia = 0;
                    camera.angularSensibilityX = 0;
                    camera.angularSensibilityY = 0;
                    camera.wheelPrecision = 0;
                    console.log("🔒 Caméra verrouillée (mode normal)");
                }
            }
        }
    });

    // Conteneur pour les modèles du joueur
    const playerContainer = new BABYLON.TransformNode("playerCombatContainer", scene);
    playerContainer.position = zone001Position.clone();

    // Conteneur pour les modèles de l'ennemi
    const enemyContainer = new BABYLON.TransformNode("enemyCombatContainer", scene);
    enemyContainer.position = zone002Position.clone();

    return {
        scene,
        camera,
        playerContainer,
        enemyContainer,
        meshes: []
    };
}

export async function initiateCombat(explorationScene, explorationCamera, options = {}) {
    const canvas = explorationScene.getEngine().getRenderingCanvas();
    const engine = explorationScene.getEngine();

    await fadeToBlack();

    // Sauvegarder l'état d'exploration
    savedExplorationState = {
        scene: explorationScene,
        camera: explorationCamera
    };

    // Créer la scène de combat
    const combatSceneData = createCombatScene(canvas, engine);
    combatScene = combatSceneData.scene;
    combatEngine = engine;

    // Initialiser l'état du combat
    const isWild = options.isWild !== false && !options.trainer;
    const enemyTemplate = options.enemy || null;
    const trainer = options.trainer || null;

    combatState.isWild = isWild;
    combatState.fleeAttempts = 0;
    combatState.trainerId = trainer ? trainer.id : null;
    combatState.trainerName = trainer ? trainer.name : null;
    combatState.trainerTeam = [];
    combatState.trainerIndex = 0;
    combatState.forcedSwitch = false;

    // Fusionner les données du monstre de l'équipe avec le dictionnaire
    const lead = gameState.playerTeam.find(p => p.hp > 0) || gameState.playerTeam[0];
    const needsSwitch = !lead || lead.hp <= 0;
    if (lead && lead.hp > 0) {
        const db = MONSTERS_DATABASE[lead.key || lead.name] || {};
        Object.assign(combat.player, db, lead, {
            stunned: false,
            precisionDown: 0,
            speedBoost: false,
            poisoned: false
        });
    }

    if (trainer && Array.isArray(trainer.team) && trainer.team.length > 0) {
        combatState.trainerTeam = trainer.team.map(t => buildMonsterInstance(t));
        combatState.trainerIndex = 0;
        const first = combatState.trainerTeam[0];
        Object.assign(combat.enemy, first);
        combat.enemy.hp = first.maxHp;
    } else if (enemyTemplate) {
        const built = buildMonsterInstance(enemyTemplate);
        Object.assign(combat.enemy, built);
        combat.enemy.hp = built.maxHp;
    } else {
        const fallback = buildMonsterInstance("Adoubee", 5);
        Object.assign(combat.enemy, fallback);
        combat.enemy.hp = fallback.maxHp;
    }
    combat.enemy.stunned = false;
    combat.enemy.precisionDown = 0;
    combat.enemy.speedBoost = false;

    combatState.active = true;
    combatState.turn = 1;
    combatState.phase = "root";
    combatState.rootIndex = 0;
    combatState.attackIndex = 0;

    gameState.mode = "combat";
    gameState.menuOpen = false;

    // Affichage UI
    combatModelsContainerEl.style.display = "flex";
    combatTopUIEl.style.display = "flex";
    combatUIEl.style.display = "block";
    overlayEl.classList.remove("visible");
    gameState.dialogOpen = false;

    updateCombatTopUI();
    setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
    if (isWild) {
        if (combat.enemy.isBugCheat || combat.enemy.name === "Error") {
            setCombatLog(
                "⚠️ EXCEPTION NON GÉRÉE\n" +
                "Un Error a glissé dans la matrice…\n" +
                "Ceci n'est PAS une fonctionnalité. (si.)"
            );
        } else {
            setCombatLog(`Un ${combat.enemy.name} sauvage apparaît !`);
        }
    } else {
        setCombatLog(`${combatState.trainerName || "Un dresseur"} vous défie !\n${combat.enemy.name} entre en combat !`);
    }
    setCombatTurnLabel();
    updateCombatRootSelection();
    hideAttackMenu();

    // ✅ Attacher les event listeners
    attachCombatListeners();

    // ✅ Charger les modèles 3D des monstres
    const loadMonsters = async () => {
        let attempts = 0;
        while (!zonesDetected && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        console.log("🐾 Chargement des modèles de monstres...");
        console.log("   Zone001:", zone001Position.toString());
        console.log("   Zone002:", zone002Position.toString());

        const minDistance = 3;
        const dz = Math.abs(zone001Position.z - zone002Position.z);
        const dx = Math.abs(zone001Position.x - zone002Position.x);
        if (dz < 1 || dx < minDistance) {
            console.warn("[CORRECTION] Positions trop proches. Application positions fixes.");
            zone001Position = new BABYLON.Vector3(-3, 0.5, 0);
            zone002Position = new BABYLON.Vector3(3, 0.5, 0);
        }

        playerMonsterMesh = await loadMonsterModel(
            combat.player,
            zone001Position,
            combatScene,
            true
        );

        enemyMonsterMesh = await loadMonsterModel(
            combat.enemy,
            zone002Position,
            combatScene,
            false
        );

        console.log("✅ Modèles de monstres chargés!");
    };

    loadMonsters();

    // ✅ Si le Digiters de tête est K.O., forcer le changement
    if (needsSwitch) {
        setTimeout(() => {
            setCombatLog("Votre Digiters de tête est K.O. !\nChoisissez un autre Digiters.");
            showTeamMenuForSwitch(true);
        }, 1000);
    }

    // Changer le render loop vers la scène de combat
    console.log("🛑 Arrêt du render loop précédent...");
    engine.stopRenderLoop();

    console.log("🔄 Création d'un nouveau render loop pour le combat...");
    engine.runRenderLoop(() => {
        if (combatScene && combatScene.activeCamera) {
            combatScene.render();
        }
    });

    // ✅ Écoute clavier dédiée à la scène de combat
    combatScene.onKeyboardObservable.add(e => {
        if (!combatState.active || !combatScene) return;

        if (e.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            const rawKey = e.event.key;
            const k = rawKey.toLowerCase();
            console.log(`⌨️ Touche combat : ${k} (phase: ${combatState.phase})`);
            handleCombatKeyboard(rawKey, k);
        }
    });

    await fadeFromBlack();
}

async function endCombat(isDefeat = false, wasEscape = false) {
    console.log("🏁 Fin du combat -", isDefeat ? "💀 DÉFAITE" : (wasEscape ? "🏃 FUITE" : "🏆 VICTOIRE"));
    combatModelsContainerEl.style.display = "none";
    combatTopUIEl.style.display = "none";
    combatUIEl.style.display = "none";
    gameState.mode = "exploration";
    combatState.active = false;

    // ✅ Supprimer les modèles de monstres
    removeMonsterModel(true);
    removeMonsterModel(false);

    // Mettre à jour HP du Digiter actif (par nom, pas seulement [0])
    const active = gameState.playerTeam.find(p => p.name === combat.player.name);
    if (active) {
        active.hp = Math.max(0, combat.player.hp);
        active.status = active.hp <= 0 ? "KO" : "OK";
    }

    const trainerId = combatState.trainerId;
    const isWild = combatState.isWild;

    // ✅ TOUJOURS retourner à l'exploration d'abord
    if (savedExplorationState) {
        await returnToExploration(savedExplorationState);
    }

    // Appeler le callback approprié
    if (isDefeat && defeatCallback) {
        console.log("💀 Appel du callback de défaite...");
        await defeatCallback();
    } else if (!isDefeat && !wasEscape && victoryCallback) {
        console.log("🏆 Appel du callback de victoire...");
        await victoryCallback({
            trainerId,
            isWild,
            escaped: false
        });
    }

    // Reset trainer state
    combatState.trainerId = null;
    combatState.trainerTeam = [];
    combatState.trainerIndex = 0;
}

async function returnToExploration(savedExplorationState) {
    console.log("🔄 Début du retour à l'exploration...");
    
    await fadeToBlack();

    // Disposer complètement la scène de combat
    console.log("🗑️ Suppression de la scène de combat...");
    if (combatScene) {
        try {
            if (typeof combatScene.dispose === 'function') {
                combatScene.dispose();
                console.log("✅ Scène de combat supprimée");
            } else {
                console.warn("⚠️ combatScene n'a pas de méthode dispose()");
            }
        } catch (e) {
            console.error("❌ Erreur lors de la suppression:", e);
        }
        combatScene = null;
    }

    // Revenir à la scène d'exploration
    const explorationScene = savedExplorationState.scene;
    const explorationCamera = savedExplorationState.camera;
    const engine = combatEngine;

    // S'assurer que la caméra d'exploration est active
    if (explorationCamera && explorationScene) {
        explorationScene.activeCamera = explorationCamera;
        console.log("✅ Caméra d'exploration restaurée");
    }

    // Arrêter le render loop du combat et en créer un nouveau
    console.log("🛑 Arrêt du render loop du combat...");
    if (engine) {
        try {
            engine.stopRenderLoop();
            console.log("✅ Render loop du combat arrêté");
            
            console.log("🔄 Création d'un nouveau render loop pour l'exploration...");
            engine.runRenderLoop(() => {
                if (explorationScene && typeof explorationScene.render === 'function') {
                    if (explorationScene.activeCamera) {
                        explorationScene.render();
                    }
                }
            });
            console.log("✅ Render loop de l'exploration créé");
        } catch (e) {
            console.error("❌ Erreur lors du retour à l'exploration:", e);
        }
    }

    await fadeFromBlack();

    console.log("✅ Retour à l'exploration COMPLETÉ");
}