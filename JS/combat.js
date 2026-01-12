// combat.js
// Scène de combat INDÉPENDANTE et RÉUTILISABLE
import { gameState, combatState, combat, doCombatRound } from "./state.js";
import { overlayEl, showDialog, fadeToBlack, fadeFromBlack } from "./ui.js";

console.log("⚔️ Chargement combat.js");

let combatScene = null;
let combatEngine = null;
let combatCallback = null; // Callback pour retourner à l'exploration

// ====== RÉFÉRENCES DOM (partages avec world.js) ======
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

    combatPlayerNameTopEl.textContent = `${p.name} N.${p.level}`;
    combatEnemyNameTopEl.textContent  = `${e.name} N.${e.level}`;

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
            btn.textContent = move.name;
            btn.disabled = false;
            btn.title = `Puissance: ${move.power} | Précision: ${move.accuracy}%`;
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
${atk.name}
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
                const info = `<strong>${move.name}</strong><br>Puissance: ${move.power} | Précision: ${move.accuracy}%${move.effect ? `<br>Effet: ${move.effect}` : ""}`;
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
        const result = doCombatRound({type:"bag"});
        updateCombatTopUI();
        setCombatLog(result.log);
        setCombatTurnLabel();
        return result;
    }

    if (action === "run") {
        const result = doCombatRound({type:"run"});
        updateCombatTopUI();
        setCombatLog(result.log);
        setCombatTurnLabel();
        return result;
    }
}

function handlePlayerAttackChoice(index) {
    const result = doCombatRound({type:"attack", index});
    updateCombatTopUI();
    setCombatLog(result.log);
    setCombatTurnLabel();
    return result;
}

// ====== CLAVIER COMBAT =====
function handleCombatKeyboard(rawKey, k) {
    if (!combatState.active) {
        endCombat();
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
                setTimeout(() => endCombat(), 500);
            }
        } else if (rawKey === "Escape") {
            console.log(`🏃 Fuite (Escape)`);
            const result = handlePlayerRootChoice("run");
            if (result && result.finished) {
                setTimeout(() => endCombat(), 500);
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
                setTimeout(() => endCombat(), 500);
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

// ====== GESTION SCÈNE COMBAT =====

/**
 * Crée et initialise la scène de combat dédiée
 */
function createCombatScene(canvas, engine) {
    const scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;

    console.log("⚔️ Création de la scène de combat");

    // Lumière simple
    const light = new BABYLON.HemisphericLight("combatLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 1.2;

    // ✅ Charger le GLB FigthZone1.glb pour la zone de combat
    let combatGround = null;
    BABYLON.SceneLoader.ImportMesh(
        "",
        "../Assets/models/zones/",
        "FigthZone1.glb",
        scene,
        (meshes) => {
            if (meshes && meshes.length > 0) {
                combatGround = meshes[0];
                console.log("✅ Zone de combat chargée :", combatGround.name);
                
                // Optionnel : ajuster la position/échelle du GLB
                // combatGround.position = new BABYLON.Vector3(0, 0, 0);
                // combatGround.scaling = new BABYLON.Vector3(1, 1, 1);
            }
        }
    );

    // Caméra centrée (ArcRotate pour effet isométrique)
    const camera = new BABYLON.ArcRotateCamera(
        "combatCam",
        Math.PI / 2,
        Math.PI / 2,
        9,
        new BABYLON.Vector3(0, 1.5, 0),
        scene
    );
    
    // ✅ Verrouiller complètement la caméra (aucun contrôle possible)
    camera.attachControl(canvas, true);
    camera.detachControl();  // Détacher immédiatement pour un vrai lock
    
    // Désactiver aussi l'inertia par sécurité
    camera.inertia = 0;
    camera.angularSensibilityX = 0;
    camera.angularSensibilityY = 0;
    camera.wheelPrecision = 0;
    
    // ✅ Optionnel : Désactiver complètement les contrôles
    // camera.attachControl(canvas, false); // Ne pas réagir aux inputs

    // Conteneur pour les modèles du joueur
    const playerContainer = new BABYLON.TransformNode("playerCombatContainer", scene);
    playerContainer.position = new BABYLON.Vector3(-5, 0, 0);

    // Conteneur pour les modèles de l'ennemi
    const enemyContainer = new BABYLON.TransformNode("enemyCombatContainer", scene);
    enemyContainer.position = new BABYLON.Vector3(5, 0, 0);

    return {
        scene,
        camera,
        playerContainer,
        enemyContainer,
        meshes: [] // Tracker les meshes pour les nettoyer
    };
}

/**
 * Initialise un combat et affiche la scène dédiée
 */
export async function initiateCombat(explorationScene, explorationCamera, options = {}) {
    const canvas = explorationScene.getEngine().getRenderingCanvas();
    const engine = explorationScene.getEngine();
    
    await fadeToBlack();

    // Sauvegarder l'état d'exploration avec le render loop actuel
    const savedExplorationState = {
        scene: explorationScene,
        camera: explorationCamera
    };

    // Créer la scène de combat
    const combatSceneData = createCombatScene(canvas, engine);
    combatScene = combatSceneData.scene;
    combatEngine = engine;

    // Initialiser l'état du combat
    const isWild = !!options.isWild;
    const enemyTemplate = options.enemy || null;

    const lead = gameState.team[0];
    if (lead) {
        combat.player.name    = lead.name;
        combat.player.level   = lead.level || 5;
        combat.player.maxHp   = lead.maxHp;
        combat.player.hp      = lead.hp;
        combat.player.attacks = lead.attacks || combat.player.attacks;
    } else {
        combat.player.hp = combat.player.maxHp;
    }

    if (enemyTemplate) {
        combat.enemy.name   = enemyTemplate.name;
        combat.enemy.level  = enemyTemplate.level;
        combat.enemy.maxHp  = enemyTemplate.maxHp;
        combat.enemy.hp     = enemyTemplate.maxHp;
    } else {
        combat.enemy.hp = combat.enemy.maxHp;
    }

    combatState.active      = true;
    combatState.turn        = 1;
    combatState.phase       = "root";
    combatState.rootIndex   = 0;
    combatState.attackIndex = 0;

    gameState.mode     = "combat";
    gameState.menuOpen = false;

    // Affichage UI
    combatTopUIEl.style.display = "flex";
    combatUIEl.style.display    = "block";
    overlayEl.classList.remove("visible");
    gameState.dialogOpen = false;

    updateCombatTopUI();
    setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
    setCombatLog(isWild ? "Un Pokémon sauvage apparaît !" : "Un combat commence !");
    setCombatTurnLabel();
    updateCombatRootSelection();
    hideAttackMenu();

    // Changer le render loop vers la scène de combat
    combatEngine.runRenderLoop(() => {
        if (combatScene && combatScene.activeCamera) {
            combatScene.render();
        }
    });

    // Callback pour retourner à l'exploration
    combatCallback = async () => {
        await returnToExploration(savedExplorationState);
    };

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

    // ✅ IMPORTANT : Arrêter le render loop précédent et en créer un nouveau
    // Sinon Babylon accumule les render loops et plusieurs s'exécutent simultanément !
    console.log("🛑 Arrêt du render loop précédent...");
    engine.stopRenderLoop();
    
    console.log("🔁 Création d'un nouveau render loop pour le combat...");
    engine.runRenderLoop(() => {
        if (combatScene && combatScene.activeCamera) {
            combatScene.render();
        }
    });

    await fadeFromBlack();
}

/**
 * Termine le combat et retourne à l'exploration
 */
async function endCombat() {
    console.log("🏁 Fin du combat");
    combatTopUIEl.style.display = "none";
    combatUIEl.style.display    = "none";
    gameState.mode = "exploration";
    combatState.active = false;

    // Mettre à jour HP du joueur
    const lead = gameState.team[0];
    if (lead) {
        lead.hp = combat.player.hp;
    }

    if (combatCallback) {
        await combatCallback();
    }
}

/**
 * Retourne à la scène d'exploration et dispose la scène de combat
 */
async function returnToExploration(savedExplorationState) {
    console.log("🔄 Début du retour à l'exploration...");
    console.log("combatScene type:", typeof combatScene);
    console.log("combatScene:", combatScene);
    
    await fadeToBlack();

    // Disposer complètement la scène de combat
    console.log("🗑️ Suppression de la scène de combat...");
    if (combatScene) {
        try {
            // Vérifier si c'est vraiment une scène Babylon
            if (typeof combatScene.dispose === 'function') {
                combatScene.dispose();
                console.log("✅ Scène de combat supprimée avec dispose()");
            } else {
                console.warn("⚠️ combatScene n'a pas de méthode dispose()");
            }
        } catch (e) {
            console.error("❌ Erreur lors de la suppression:", e);
        }
        combatScene = null;
    } else {
        console.log("ℹ️ combatScene est déjà null");
    }

    // Revenir à la scène d'exploration
    const explorationScene = savedExplorationState.scene;
    const explorationCamera = savedExplorationState.camera;
    const engine = combatEngine;

    console.log("📊 État de l'exploration :");
    console.log("  - Scene existe ?", !!explorationScene);
    console.log("  - Camera existe ?", !!explorationCamera);
    console.log("  - Engine existe ?", !!engine);

    // S'assurer que la caméra d'exploration est active AVANT le render loop
    if (explorationCamera && explorationScene) {
        explorationScene.activeCamera = explorationCamera;
        console.log("✅ Caméra d'exploration restaurée");
    } else {
        console.warn("⚠️ Impossible de restaurer la caméra d'exploration");
    }

    // ✅ IMPORTANT : Arrêter le render loop du combat et en créer un nouveau pour l'exploration
    console.log("🛑 Arrêt du render loop du combat...");
    if (engine) {
        try {
            engine.stopRenderLoop();
            console.log("✅ Render loop du combat arrêté");
            
            console.log("🔁 Création d'un nouveau render loop pour l'exploration...");
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
    } else {
        console.error("❌ Engine n'existe pas !");
    }

    await fadeFromBlack();

    console.log("✅ Retour à l'exploration COMPLÉTÉ");
}
