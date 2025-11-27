console.log("🎮 Démarrage du jeu...");

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

let gamepad = null;

// ====== ÉTAT GLOBAL DU JEU ======
const gameState = {
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
                { name: "Charge",    power: 10, accuracy: 100 },
                { name: "Éclair",    power: 18, accuracy: 95 },
                { name: "Rugissement", power: 0,  accuracy: 100, effect: "atk_down" }
            ]
        },
        {name: "Salamèche", level: 10, hp: 28, maxHp: 30, icon: "🔥", status: "OK"},
        {name: "Carapuce",  level: 9,  hp: 22, maxHp: 28, icon: "💧", status: "OK"}
    ],
    playerName: "Red",
    money: 500,
    selectedItemIndex: null
};

// ====== RÉFÉRENCES DOM ======
const overlayEl        = document.getElementById("menuOverlay");
const mainMenuEl       = document.getElementById("mainMenu");
const inventoryMenuEl  = document.getElementById("inventoryMenu");
const teamMenuEl       = document.getElementById("teamMenu");
const dialogBoxEl      = document.getElementById("dialogBox");
const dialogTextEl     = document.getElementById("dialogText");
const hudSpeedTextEl   = document.getElementById("hudSpeedText");
const fadeOverlayEl    = document.getElementById("fadeOverlay");

const trainerNameEl    = document.getElementById("trainerName");
const trainerMoneyEl   = document.getElementById("trainerMoney");

// Combat DOM
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

// Boutons menu principal
const btnMenuInventory  = document.getElementById("btnMenuInventory");
const btnMenuTeam       = document.getElementById("btnMenuTeam");
const btnMenuMap        = document.getElementById("btnMenuMap");
const btnMenuSave       = document.getElementById("btnMenuSave");
const btnMenuOptions    = document.getElementById("btnMenuOptions");
const btnMenuClose      = document.getElementById("btnMenuClose");

// Inventaire DOM
const inventoryGridEl       = document.getElementById("inventoryGrid");
const inventoryDetailEl     = document.getElementById("inventoryDetail");
const inventoryDetailTitleEl= document.getElementById("inventoryDetailTitle");
const inventoryDetailDescEl = document.getElementById("inventoryDetailDesc");
const btnUseItemEl          = document.getElementById("btnUseItem");
const btnInfoItemEl         = document.getElementById("btnInfoItem");
const btnBackItemEl         = document.getElementById("btnBackItem");
const btnInventoryBackEl    = document.getElementById("btnInventoryBack");

// Équipe DOM
const teamListEl     = document.getElementById("teamList");
const btnTeamBackEl  = document.getElementById("btnTeamBack");

// ===== FADE NOIR =====
function fadeToBlack() {
    if (!fadeOverlayEl) return Promise.resolve();
    return new Promise(resolve => {
        fadeOverlayEl.classList.add("show");
        setTimeout(resolve, 400);
    });
}

function fadeFromBlack() {
    if (!fadeOverlayEl) return Promise.resolve();
    return new Promise(resolve => {
        fadeOverlayEl.classList.remove("show");
        setTimeout(resolve, 400);
    });
}

// ===== DIALOGUE GLOBAL (hors combat) =====
function showDialog(text) {
    if (gameState.mode === "combat") {
        combatLogTextEl.textContent = text;
        return;
    }
    console.log("💬", text);
    dialogTextEl.textContent = text;
    dialogBoxEl.classList.add("show");
    gameState.dialogOpen = true;
    overlayEl.classList.add("visible");

    setTimeout(() => {
        dialogBoxEl.classList.remove("show");
        gameState.dialogOpen = false;
        if (!gameState.menuOpen && gameState.mode !== "combat") {
            overlayEl.classList.remove("visible");
        }
    }, 2800);
}

/*****************************************************
 * MÉCANIQUE DE COMBAT SIMPLE (FORMAT B)
 *****************************************************/
const combatState = {
    active: false,
    turn: 1,
    phase: "root", // "root" | "attacks"
    rootIndex: 0,
    attackIndex: 0
};

const combat = {
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

function computeDamage(attacker, defender, move) {
    if (!move || move.power === 0) return 0;
    const base = attacker.attack + move.power - defender.defense;
    const variance = 0.85 + Math.random() * 0.3; // 0.85 - 1.15
    let dmg = Math.floor(Math.max(1, base) * variance);
    return dmg;
}

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

function enemyChooseMove() {
    const moves = combat.enemy.attacks;
    return moves[Math.floor(Math.random() * moves.length)];
}

// ====== ANIMATIONS DU JOUEUR (GLB) – GLOBAL ======
let playerSkeleton = null;
let playerMeshRoot = null;
let playerAnimRanges = { idle: null, running: null };
let currentPlayerAnim = null;
let currentPlayerSpeedRatio = 1;

function playPlayerAnimation(name, speedRatio) {
    if (!playerSkeleton) return;
    if (currentPlayerAnim === name && Math.abs(currentPlayerSpeedRatio - speedRatio) < 0.01) return;

    const range = playerAnimRanges[name];
    if (!range) return;

    playerSkeleton.getScene().beginAnimation(playerSkeleton, range.from, range.to, true, speedRatio);
    currentPlayerAnim = name;
    currentPlayerSpeedRatio = speedRatio;
}

// Un tour complet : joueur puis ennemi (si vivant)
function doCombatRound(playerAction) {
    const p = combat.player;
    const e = combat.enemy;
    let log = `Tour ${combatState.turn}\n`;

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

    if (e.hp <= 0) {
        log += `${e.name} est K.O !\n`;
        combatState.active = false;
        return { log, finished: true, escaped: false };
    }

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

// ====== COMBAT UI CONTROL (avec support sauvage / zones) ======
function enterCombatFromWorld(playerCollider, npcMesh, camera, combatContext, options = {}) {
    console.log("⚔️ Entrée en combat");
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

    combatContext.prevPlayerPos = playerCollider.position.clone();
    combatContext.prevCamera = {
        radius:        camera.radius,
        heightOffset:  camera.heightOffset,
        rotationOffset:camera.rotationOffset
    };
    combatContext.prevNpcPos = npcMesh ? npcMesh.position.clone() : null;
    combatContext.npcMesh    = npcMesh || null;
    combatContext.isWild     = isWild;

    playerCollider.position = new BABYLON.Vector3(-3,0.9,0);
    if (npcMesh) {
        npcMesh.position = new BABYLON.Vector3(3,0.9,0);
        npcMesh.isVisible = true;
    }

    camera.radius        = 10;
    camera.heightOffset  = 8;
    camera.rotationOffset= 0;

    combatTopUIEl.style.display = "flex";
    combatUIEl.style.display    = "block";
    overlayEl.classList.remove("visible");
    dialogBoxEl.classList.remove("show");
    gameState.dialogOpen = false;

    updateCombatTopUI();
    setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
    setCombatLog(isWild ? "Un Pokémon sauvage apparaît !" : "Un combat commence !");
    setCombatTurnLabel();
    updateCombatRootSelection();
    hideAttackMenu();

    // Idle en combat
    playPlayerAnimation("idle", 1.0);
}

function exitCombatToWorld(playerCollider, camera, combatContext) {
    console.log("🏁 Fin de combat / retour exploration");
    combatTopUIEl.style.display = "none";
    combatUIEl.style.display    = "none";
    gameState.mode = "exploration";

    const lead = gameState.team[0];
    if (lead) {
        lead.hp = combat.player.hp;
    }

    if (combatContext.prevPlayerPos) {
        playerCollider.position = combatContext.prevPlayerPos;
    }

    if (!combatContext.isWild && combatContext.npcMesh && combatContext.prevNpcPos) {
        combatContext.npcMesh.position = combatContext.prevNpcPos;
    }
    if (combatContext.isWild && combatContext.npcMesh) {
        combatContext.npcMesh.isVisible = false;
    }

    if (combatContext.prevCamera) {
        camera.radius        = combatContext.prevCamera.radius;
        camera.heightOffset  = combatContext.prevCamera.heightOffset;
        camera.rotationOffset= combatContext.prevCamera.rotationOffset;
    }

    if (!gameState.menuOpen && !gameState.dialogOpen) {
        overlayEl.classList.remove("visible");
    }
}

function updateCombatRootSelection() {
    combatChoicesButtons.forEach((btn, idx) => {
        btn.classList.toggle("selected", idx === combatState.rootIndex);
    });
}

function showAttackMenu() {
    combatState.phase = "attacks";
    combatAttackListEl.style.display = "grid";
    combatAttackInfoEl.style.display = "block";

    const moves = combat.player.attacks || [];
    for (let i = 0; i < 4; i++) {
        const btn = attackButtons[i];
        const move = moves[i];
        if (move) {
            btn.textContent = move.name;
            btn.disabled = false;
        } else {
            btn.textContent = "-";
            btn.disabled = true;
        }
        btn.classList.remove("selected");
    }
    combatState.attackIndex = 0;
    updateAttackSelection();
    updateAttackInfo();
}

function hideAttackMenu() {
    combatState.phase = "root";
    combatAttackListEl.style.display  = "none";
    combatAttackInfoEl.style.display  = "none";
}

function updateAttackSelection() {
    attackButtons.forEach((btn, i) => {
        btn.classList.toggle("selected", i === combatState.attackIndex);
    });
}

function updateAttackInfo() {
    const moves = combat.player.attacks || [];
    const move  = moves[combatState.attackIndex];
    if (!move) {
        combatAttackInfoTextEl.textContent = "Pas d'attaque.";
    } else {
        let txt = `${move.name}\nPuissance: ${move.power}\nPrécision: ${move.accuracy}%`;
        if (move.effect) {
            txt += `\nEffet: ${move.effect}`;
        }
        combatAttackInfoTextEl.textContent = txt;
    }
}

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
    const moves = combat.player.attacks || [];
    const move  = moves[index];
    if (!move) return;
    const result = doCombatRound({type:"attack", index});
    updateCombatTopUI();
    setCombatLog(result.log);
    setCombatTurnLabel();
    return result;
}

// ========== BABYLON SCENE + ZONES ==========
function createScene() {
    const scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;

    console.log("🌍 Création de la scène avec zones + modèle 3D...");

    // Lumière
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0,1,0), scene);
    light.intensity = 1.2;

    // Player collider (adapté humain ~1m75)
    const playerCollider = BABYLON.MeshBuilder.CreateBox("pc", {width:0.8, height:1.8, depth:0.8}, scene);
    playerCollider.position = new BABYLON.Vector3(0,0.9,0);
    playerCollider.isVisible = false;
    playerCollider.checkCollisions = true;
    playerCollider.ellipsoid = new BABYLON.Vector3(0.4,0.9,0.4);
    playerCollider.ellipsoidOffset = new BABYLON.Vector3(0,0.9,0);

    // ---- Modèle 3D du joueur ----
    playerMeshRoot = new BABYLON.TransformNode("playerRoot", scene);
    playerMeshRoot.parent = playerCollider;
    // pivot aux pieds / collider au centre -> offset -0.9
    playerMeshRoot.position = new BABYLON.Vector3(0, -0.9, 0);

BABYLON.SceneLoader.ImportMesh(
    "",
    "Assets/models/animations/",
    "characterAnimation.glb",
    scene,
    (meshes, _ps, skeletons) => {
        const root = new BABYLON.TransformNode("playerVisualRoot", scene);
        root.parent = playerMeshRoot;
        root.position = BABYLON.Vector3.Zero();

        // On accroche tous les meshes au root visuel
        meshes.forEach(m => {
            if (m && m.parent === null) m.parent = root;
        });

        // Orientation de base du modèle (tu peux ajuster ici)
        playerMeshRoot.rotation.y = Math.PI / 2;
        playerMeshRoot.position.y = -1.0;

        playerSkeleton = skeletons[0] || null;
        if (playerSkeleton) {
            // Récupérer toutes les ranges pour debug
            const ranges = playerSkeleton.getAnimationRanges();
            console.log("🎞️ Ranges du joueur :", ranges.map(r => r.name));

            // Recherche intelligente des anims
            let idleRange = null;
            let runRange  = null;

            ranges.forEach(r => {
                const n = r.name.toLowerCase();
                if (!idleRange && n.includes("idle")) idleRange = r;
                if (!runRange  && (n.includes("run") || n.includes("course"))) runRange = r;
            });

            // Fallback si noms inattendus
            if (!idleRange && ranges.length > 0) idleRange = ranges[0];
            if (!runRange  && ranges.length > 1) runRange  = ranges[1];

            playerAnimRanges.idle    = idleRange;
            playerAnimRanges.running = runRange;

            // Lancer l'Idle par défaut
            if (playerAnimRanges.idle) {
                scene.beginAnimation(
                    playerSkeleton,
                    playerAnimRanges.idle.from,
                    playerAnimRanges.idle.to,
                    true,
                    1.0
                );
                currentPlayerAnim = "idle";
                currentPlayerSpeedRatio = 1.0;
            }

            console.log("✅ Idle =", idleRange ? idleRange.name : "❌ none");
            console.log("✅ Running =", runRange ? runRange.name : "❌ none");
        } else {
            console.warn("⚠️ Aucun skeleton trouvé pour le joueur");
        }
    }
);

    // Caméra (suivi)
    const camera = new BABYLON.FollowCamera("cam", new BABYLON.Vector3(0,17,-20), scene);
    camera.lockedTarget = playerCollider;
    camera.radius = 12;
camera.heightOffset = 10;
camera.rotationOffset = 90;


    // Contexte combat
    const combatContext = {
        prevPlayerPos: null,
        prevCamera: null,
        prevNpcPos: null,
        npcMesh: null,
        isWild: false
    };

    // ========= GESTION DES ZONES =========
    let currentZone = null;
    let zoneMeshes = [];
    let interactables = [];
    let tallGrassAreas = [];
    let npc = null;
    let npcIcon = null;
    let item = null;
    let wildEnemyMesh = null;

    function registerZoneMesh(mesh) {
        zoneMeshes.push(mesh);
        return mesh;
    }

    function clearZone() {
        zoneMeshes.forEach(m => {
            if (m && !m.isDisposed()) m.dispose();
        });
        zoneMeshes = [];
        interactables = [];
        tallGrassAreas = [];
        npc = null;
        if (npcIcon && !npcIcon.isDisposed()) npcIcon.dispose();
        npcIcon = null;
        item = null;
    }

    function addDoor(mesh, targetZone, targetPos) {
        mesh.isVisible = false;
        interactables.push({
            type: "door",
            mesh,
            targetZone,
            targetPos
        });
    }

    function addTalkNpc(mesh, text) {
        interactables.push({
            type: "npcTalk",
            mesh,
            text
        });
    }

    function addTallGrass(mesh) {
        mesh.isVisible = false;
        tallGrassAreas.push(mesh);
    }

    function wall(x,z,w,h,d) {
        const box = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("wall",{width:w,height:h,depth:d},scene)
        );
        box.position = new BABYLON.Vector3(x,h/2,z);
        box.checkCollisions = true;
        box.isVisible = false;
    }

    // ---- Helper : créer un PNJ avec ton modèle (Idle) ----
    function createNpcCharacter(parentNode) {
        parentNode.isVisible = false; // collider seulement
        BABYLON.SceneLoader.ImportMesh(
            "",
            "Assets/models/animations/",
            "characterAnimation.glb",
            scene,
            (meshes, _ps, skeletons) => {
                const root = new BABYLON.TransformNode("npcVisualRoot", scene);
                root.parent = parentNode;
                root.position = new BABYLON.Vector3(0, -0.9, 0); // pieds au sol

                meshes.forEach(m => {
                    if (m.parent === null) m.parent = root;
                });

                const skel = skeletons[0] || null;
                if (skel) {
                    const idleRange = skel.getAnimationRange("Idle");
                    if (idleRange) {
                        scene.beginAnimation(skel, idleRange.from, idleRange.to, true, 1.0);
                    }
                }
            }
        );
    }

    // ------- ZONE : VILLE -------
    function setupZoneVille() {
        currentZone = "ville";

        const ground = registerZoneMesh(
            BABYLON.MeshBuilder.CreateGround("ground_ville", {width:40, height:40}, scene)
        );
        const groundMat = new BABYLON.StandardMaterial("gmVille", scene);
        groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.7, 0.3);
        ground.material = groundMat;
        ground.checkCollisions = true;

        wall(0,20,40,3,1);
        wall(0,-20,40,3,1);
        wall(20,0,1,3,40);
        wall(-20,0,1,3,40);

        const house = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("houseBody", {
                width: 6,
                height: 3,
                depth: 6
            }, scene)
        );
        house.position = new BABYLON.Vector3(0, 1.5, -10);
        house.checkCollisions = true;

        const roof = registerZoneMesh(
            BABYLON.MeshBuilder.CreateCylinder("houseRoof", {
                diameterTop: 0,
                diameterBottom: 7,
                height: 2,
                tessellation: 4
            }, scene)
        );
        roof.rotation.z = Math.PI / 4;
        roof.position   = new BABYLON.Vector3(0, 4, -10);

        const doorMaison = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("doorVilleMaison1", {
                width: 2,
                height: 2.5,
                depth: 0.5
            }, scene)
        );
        doorMaison.position = new BABYLON.Vector3(0, 1.25, -7.3);
        addDoor(doorMaison, "maison1", new BABYLON.Vector3(0,0.9,3));

        const doorForet = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("doorVilleForet", {
                width: 4,
                height: 2.5,
                depth: 0.5
            }, scene)
        );
        doorForet.position = new BABYLON.Vector3(0, 1.25, -19.5);
        addDoor(doorForet, "foret", new BABYLON.Vector3(0,0.9,25));

        // PNJ combat (formateur/combat)
        npc = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("npcCombat", {
                height: 1.8,
                width: 0.8,
                depth: 0.8
            }, scene)
        );
        npc.position = new BABYLON.Vector3(5, 0.9, 5);
        npc.checkCollisions = true;
        createNpcCharacter(npc);

        // Icône
        npcIcon = registerZoneMesh(
            BABYLON.MeshBuilder.CreatePlane("npcIcon", {
                width: 0.7,
                height: 1.2
            }, scene)
        );
        npcIcon.position = npc.position.add(new BABYLON.Vector3(0, 1.9, 0));
        npcIcon.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const npcIconMat = new BABYLON.StandardMaterial("npcIconMat", scene);
        npcIconMat.diffuseTexture = new BABYLON.Texture("Assets/icons/Point-exclamation.png", scene);
        npcIconMat.diffuseTexture.hasAlpha = true;
        npcIconMat.backFaceCulling = false;
        npcIconMat.emissiveColor = new BABYLON.Color3(1,1,1);
        npcIcon.material = npcIconMat;
        npcIcon.isVisible = false;

        // PNJ dialogueur
        const npcTalk = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("npcTalk", {
                height: 1.8,
                width: 0.8,
                depth: 0.8
            }, scene)
        );
        npcTalk.position = new BABYLON.Vector3(-4, 0.9, 0);
        createNpcCharacter(npcTalk);
        addTalkNpc(
            npcTalk,
            "Salut ! Je suis le formateur.\nVas dans la maison pour découvrir ta formation sous forme de Pokémon !"
        );

        // Item
        item = registerZoneMesh(
            BABYLON.MeshBuilder.CreateSphere("item",{diameter:0.6},scene)
        );
        item.position = new BABYLON.Vector3(-5,0.4,-3);
        const itemMat = new BABYLON.StandardMaterial("itemMat",scene);
        itemMat.emissiveColor = new BABYLON.Color3(1,0.7,0,0);
        item.material = itemMat;
    }

    // ------- ZONE : MAISON 1 -------
    function setupZoneMaison1() {
        currentZone = "maison1";

        const floor = registerZoneMesh(
            BABYLON.MeshBuilder.CreateGround("floorMaison", {width:10, height:10}, scene)
        );
        floor.position.y = 0;
        floor.checkCollisions = true;

        const wallHeight = 3;
        const halfSize = 5;
        const wallThickness = 0.5;
        wall(0, halfSize, 10, wallHeight, wallThickness);
        wall(0,-halfSize,10, wallHeight, wallThickness);
        wall( halfSize,0, wallThickness, wallHeight, 10);
        wall(-halfSize,0, wallThickness, wallHeight, 10);

        const table = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("tableFormation", {
                width: 2,
                height: 0.6,
                depth: 1
            }, scene)
        );
        table.position = new BABYLON.Vector3(0, 0.3, 0.5);
        table.checkCollisions = true;

        const npcInside = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("npcInside", {
                width: 0.8,
                height: 1.8,
                depth: 0.8
            }, scene)
        );
        npcInside.position = new BABYLON.Vector3(0, 0.9, -2);
        createNpcCharacter(npcInside);
        addTalkNpc(
            npcInside,
            "Bienvenue dans la salle de formation !\nIci tu peux présenter ton parcours, tes compétences et tes objectifs."
        );

        const exitDoor = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("doorMaisonVille", {
                width: 2,
                height: 2.5,
                depth: 0.5
            }, scene)
        );
        exitDoor.position = new BABYLON.Vector3(0,1.25,4.5);
        addDoor(exitDoor, "ville", new BABYLON.Vector3(0,0.9,-6));
    }

    // ------- ZONE : FORÊT -------
    function setupZoneForet() {
        currentZone = "foret";

        const ground = registerZoneMesh(
            BABYLON.MeshBuilder.CreateGround("groundForet", {width:60, height:60}, scene)
        );
        const gMat = new BABYLON.StandardMaterial("gmForet", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.15, 0.5, 0.2);
        ground.material = gMat;
        ground.checkCollisions = true;

        wall(0,30,60,3,1);
        wall(0,-30,60,3,1);
        wall(30,0,1,3,60);
        wall(-30,0,1,3,60);

        for (let i = 0; i < 25; i++) {
            const tronc = registerZoneMesh(
                BABYLON.MeshBuilder.CreateCylinder("treeTrunk", {
                    height: 3,
                    diameter: 0.6
                }, scene)
            );
            const x = (Math.random() - 0.5) * 50;
            const z = (Math.random() - 0.5) * 50;
            tronc.position = new BABYLON.Vector3(x, 1.5, z);
            tronc.checkCollisions = true;
        }

        for (let gx = -2; gx <= 2; gx++) {
            for (let gz = -2; gz <= 2; gz++) {
                const grass = registerZoneMesh(
                    BABYLON.MeshBuilder.CreateBox("tallGrass", {
                        width: 4,
                        height: 1,
                        depth: 4
                    }, scene)
                );
                grass.position = new BABYLON.Vector3(gx * 4, 0.5, gz * 4);
                addTallGrass(grass);
            }
        }

        const npcForest = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("npcForest", {
                width: 0.8,
                height: 1.8,
                depth: 0.8
            }, scene)
        );
        npcForest.position = new BABYLON.Vector3(-8, 0.9, 10);
        createNpcCharacter(npcForest);
        addTalkNpc(
            npcForest,
            "Les herbes hautes cachent des Pokémon sauvages...\nAvance prudemment !"
        );

        const exitToVille = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("doorForetVille", {
                width: 4,
                height: 2.5,
                depth: 0.5
            }, scene)
        );
        exitToVille.position = new BABYLON.Vector3(0,1.25,29);
        addDoor(exitToVille, "ville", new BABYLON.Vector3(0,0.9,18));
    }

    async function switchZoneWithFade(targetZone, playerPos) {
        await fadeToBlack();
        switchZone(targetZone, playerPos);
        await fadeFromBlack();
    }

    function switchZone(targetZone, playerPos) {
        clearZone();
        if (targetZone === "ville") {
            setupZoneVille();
        } else if (targetZone === "maison1") {
            setupZoneMaison1();
        } else if (targetZone === "foret") {
            setupZoneForet();
        }
        if (playerPos) {
            playerCollider.position = playerPos.clone();
        }
    }

    // ===== MENUS HTML =====
    function openMainMenu() {
        if (gameState.mode === "combat") return;
        console.log("📋 Ouverture menu principal");
        gameState.menuOpen = true;
        overlayEl.classList.add("visible");
        mainMenuEl.classList.add("open");
        inventoryMenuEl.classList.remove("open");
        teamMenuEl.classList.remove("open");
        inventoryDetailEl.classList.remove("show");
        gameState.selectedItemIndex = null;
    }

    function closeAllMenus() {
        console.log("❌ Fermeture menus");
        gameState.menuOpen = false;
        mainMenuEl.classList.remove("open");
        inventoryMenuEl.classList.remove("open");
        teamMenuEl.classList.remove("open");
        inventoryDetailEl.classList.remove("show");
        gameState.selectedItemIndex = null;
        if (!gameState.dialogOpen && gameState.mode !== "combat") {
            overlayEl.classList.remove("visible");
        }
    }

    function toggleMenu() {
        if (gameState.mode === "combat") return;
        if (gameState.menuOpen) closeAllMenus();
        else openMainMenu();
    }

    // ===== INVENTAIRE HTML =====
    function renderInventory() {
        inventoryGridEl.innerHTML = "";
        gameState.playerInventory.forEach((it, idx) => {
            const card = document.createElement("div");
            card.className = "inv-item";
            card.innerHTML = `
                <div class="inv-icon">${it.icon}</div>
                <div class="inv-name">${it.name}</div>
                <div class="inv-count">x${it.count}</div>
            `;
            card.addEventListener("click", () => openItemDetail(idx));
            inventoryGridEl.appendChild(card);
        });
    }

    function openItemDetail(index) {
        const it = gameState.playerInventory[index];
        if (!it) return;
        gameState.selectedItemIndex = index;
        inventoryDetailTitleEl.textContent = `${it.icon} ${it.name}`;
        inventoryDetailDescEl.textContent = it.description || "Aucune description.";
        inventoryDetailEl.classList.add("show");
    }

    btnUseItemEl.addEventListener("click", () => {
        const idx = gameState.selectedItemIndex;
        if (idx == null) return;
        const it = gameState.playerInventory[idx];
        if (!it) return;

        showDialog(`Tu utilises ${it.name} !`);
        it.count--;
        if (it.count <= 0) {
            gameState.playerInventory.splice(idx, 1);
            gameState.selectedItemIndex = null;
            inventoryDetailEl.classList.remove("show");
        }
        renderInventory();
    });

    btnInfoItemEl.addEventListener("click", () => {
        const idx = gameState.selectedItemIndex;
        if (idx == null) return;
        const it = gameState.playerInventory[idx];
        showDialog(`${it.icon} ${it.name} : ${it.description || "Objet mystérieux."}`);
    });

    btnBackItemEl.addEventListener("click", () => {
        inventoryDetailEl.classList.remove("show");
        gameState.selectedItemIndex = null;
    });

    btnInventoryBackEl.addEventListener("click", () => {
        openMainMenu();
    });

    // ===== ÉQUIPE HTML =====
    function hpColorLocal(pct) {
        if (pct > 0.5) return "linear-gradient(90deg,#28c728,#8be628)";
        if (pct > 0.2) return "linear-gradient(90deg,#e6c228,#f6e46b)";
        return "linear-gradient(90deg,#e62828,#f66b6b)";
    }

    function renderTeam() {
        teamListEl.innerHTML = "";
        gameState.team.forEach(pk => {
            const pct = pk.hp / pk.maxHp;
            const card = document.createElement("div");
            card.className = "team-card";
            card.innerHTML = `
                <div class="team-icon">${pk.icon}</div>
                <div class="team-main">
                    <div class="team-name">${pk.name}</div>
                    <div class="team-level">Niv. ${pk.level} — ${pk.hp}/${pk.maxHp} PV</div>
                    <div class="team-hpbar-wrap">
                        <div class="team-hpbar" style="width:${pct*100}%;background:${hpColorLocal(pct)};"></div>
                    </div>
                </div>
                <div class="team-extra">${pk.status}</div>
            `;
            teamListEl.appendChild(card);
        });
    }

    btnTeamBackEl.addEventListener("click", () => {
        openMainMenu();
    });

    // ===== BOUTONS MENU PRINCIPAL =====
    trainerNameEl.textContent = gameState.playerName;
    trainerMoneyEl.textContent = gameState.money + "₽";

    btnMenuInventory.addEventListener("click", () => openInventoryMenu());
    btnMenuTeam.addEventListener("click", () => openTeamMenu());
    btnMenuMap.addEventListener("click", () => showDialog("🗺️ La carte n'est pas encore disponible."));
    btnMenuSave.addEventListener("click", () => showDialog("💾 Partie sauvegardée !"));
    btnMenuOptions.addEventListener("click", () => showDialog("⚙️ Options en développement."));
    btnMenuClose.addEventListener("click", () => closeAllMenus());

    function openInventoryMenu() {
        mainMenuEl.classList.remove("open");
        inventoryMenuEl.classList.add("open");
        inventoryDetailEl.classList.remove("show");
        renderInventory();
    }

    function openTeamMenu() {
        mainMenuEl.classList.remove("open");
        teamMenuEl.classList.add("open");
        renderTeam();
    }

    // ===== INTERACTION (E / B) =====
    async function interact() {
        if (gameState.menuOpen || gameState.dialogOpen) return;
        if (gameState.mode === "combat") return;

        const pos = playerCollider.position;

        let closestDoor = null;
        let closestDoorDist = gameState.interactionRange;
        for (const it of interactables) {
            if (it.type === "door") {
                const d = BABYLON.Vector3.Distance(pos, it.mesh.position);
                if (d < closestDoorDist) {
                    closestDoorDist = d;
                    closestDoor = it;
                }
            }
        }
        if (closestDoor) {
            await switchZoneWithFade(closestDoor.targetZone, closestDoor.targetPos);
            return;
        }

        if (npc) {
            const distNpc = BABYLON.Vector3.Distance(pos, npc.position);
            if (distNpc < gameState.interactionRange) {
                enterCombatFromWorld(playerCollider, npc, camera, combatContext, { isWild:false });
                return;
            }
        }

        let closestTalk = null;
        let closestTalkDist = gameState.interactionRange;
        for (const it of interactables) {
            if (it.type === "npcTalk") {
                const d = BABYLON.Vector3.Distance(pos, it.mesh.position);
                if (d < closestTalkDist) {
                    closestTalkDist = d;
                    closestTalk = it;
                }
            }
        }
        if (closestTalk) {
            showDialog(closestTalk.text);
            return;
        }

        if (item && item.isVisible) {
            const distItem = BABYLON.Vector3.Distance(pos, item.position);
            if (distItem < gameState.interactionRange) {
                showDialog("Tu trouves une Hyper Potion !");
                item.isVisible = false;
                gameState.playerInventory.push({
                    name:"Hyper Potion",
                    count:1,
                    icon:"🧪",
                    description:"Restaure beaucoup de PV (50 PV)."
                });
                renderInventory();
                return;
            }
        }
    }

    // ===== CLAVIER =====
    const inputMap = {};
    const keyJustPressed = {};

    scene.onKeyboardObservable.add(e => {
        const rawKey = e.event.key;
        const k = rawKey.toLowerCase();

        if (e.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            if (gameState.mode === "combat") {
                handleCombatKeyboard(rawKey, k, playerCollider, camera, combatContext);
                return;
            }

            if (!keyJustPressed[k]) {
                keyJustPressed[k] = true;
                inputMap[k] = true;

                if (k === "e") interact();
                if (k === "m") toggleMenu();
                if (rawKey === "Escape") closeAllMenus();
                if (rawKey === "Shift") gameState.isRunning = true;
            }
        }

        if (e.type === BABYLON.KeyboardEventTypes.KEYUP) {
            inputMap[k] = false;
            keyJustPressed[k] = false;
            if (rawKey === "Shift") gameState.isRunning = false;
        }
    });

    function handleCombatKeyboard(rawKey, k, playerCollider, camera, combatContext) {
        if (!combatState.active) {
            exitCombatToWorld(playerCollider, camera, combatContext);
            return;
        }

        if (combatState.phase === "root") {
            if (["arrowup","z","w"].includes(k)) {
                combatState.rootIndex = (combatState.rootIndex + combatChoicesButtons.length - 1) % combatChoicesButtons.length;
                updateCombatRootSelection();
            } else if (["arrowdown","s"].includes(k)) {
                combatState.rootIndex = (combatState.rootIndex + 1) % combatChoicesButtons.length;
                updateCombatRootSelection();
            } else if (["arrowleft","q"].includes(k)) {
                if (combatState.rootIndex === 1) combatState.rootIndex = 0;
                updateCombatRootSelection();
            } else if (["arrowright","d"].includes(k)) {
                if (combatState.rootIndex === 0) combatState.rootIndex = 1;
                updateCombatRootSelection();
            } else if (rawKey === "Enter") {
                const btn = combatChoicesButtons[combatState.rootIndex];
                const action = btn.dataset.action;
                const result = handlePlayerRootChoice(action);
                if (result && result.finished) {
                    setTimeout(() => {
                        exitCombatToWorld(playerCollider, camera, combatContext);
                    }, 500);
                }
            } else if (rawKey === "Escape") {
                const result = handlePlayerRootChoice("run");
                if (result && result.finished) {
                    setTimeout(() => {
                        exitCombatToWorld(playerCollider, camera, combatContext);
                    }, 500);
                }
            }
        } else if (combatState.phase === "attacks") {
            let idx = combatState.attackIndex;
            if (["arrowup","z","w"].includes(k)) {
                idx = (idx - 2 + 4) % 4;
            } else if (["arrowdown","s"].includes(k)) {
                idx = (idx + 2) % 4;
            } else if (["arrowleft","q"].includes(k)) {
                if (idx % 2 === 1) idx--;
            } else if (["arrowright","d"].includes(k)) {
                if (idx % 2 === 0) idx++;
            } else if (rawKey === "Enter") {
                const result = handlePlayerAttackChoice(combatState.attackIndex);
                if (result && result.finished) {
                    setTimeout(() => {
                        exitCombatToWorld(playerCollider, camera, combatContext);
                    }, 500);
                } else {
                    hideAttackMenu();
                    setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
                    updateCombatRootSelection();
                }
            } else if (rawKey === "Escape") {
                hideAttackMenu();
                setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
                updateCombatRootSelection();
            }
            combatState.attackIndex = idx;
            updateAttackSelection();
            updateAttackInfo();
        }
    }

    // ===== GAMEPAD =====
    const GP = {courir:0, interagir:1, menu:3};
    const pressed = {};
    let lastGPPress = {};

    new BABYLON.GamepadManager().onGamepadConnectedObservable.add(gp => {
        gamepad = gp;
        console.log("🎮 Manette connectée:", gp.id);

        gp.onButtonDownObservable.add(btn => {
            const b = typeof btn === "number" ? btn : btn.index || btn;
            if (pressed[b]) return;
            pressed[b] = true;
            const now = Date.now();

            if (gameState.mode === "combat") {
                if (b === GP.interagir) {
                    handleCombatKeyboard("ArrowDown", "arrowdown", playerCollider, camera, combatContext);
                } else if (b === GP.courir) {
                    handleCombatKeyboard("Enter", "enter", playerCollider, camera, combatContext);
                }
                return;
            }

            if (b === GP.menu && (!lastGPPress.menu || now - lastGPPress.menu > 300)) {
                lastGPPress.menu = now;
                toggleMenu();
            }

            if (!gameState.menuOpen) {
                if (b === GP.interagir) interact();
                if (b === GP.courir) gameState.isRunning = true;
            }
        });

        gp.onButtonUpObservable.add(btn => {
            const b = typeof btn === "number" ? btn : btn.index || btn;
            pressed[b] = false;
            if (b === GP.courir) gameState.isRunning = false;
        });
    });

    // ===== COMBATS SAUVAGES =====
    function tryStartWildEncounter() {
        if (gameState.mode !== "exploration") return;
        if (currentZone !== "foret") return;
        if (tallGrassAreas.length === 0) return;

        let insideGrass = false;
        for (const g of tallGrassAreas) {
            if (playerCollider.intersectsMesh(g, false)) {
                insideGrass = true;
                break;
            }
        }
        if (!insideGrass) return;

        const chance = 0.007;
        if (Math.random() < chance) {
            if (!wildEnemyMesh || wildEnemyMesh.isDisposed()) {
                wildEnemyMesh = BABYLON.MeshBuilder.CreateSphere("wildEnemy", {diameter:1.4}, scene);
                const wm = new BABYLON.StandardMaterial("wildMat", scene);
                wm.diffuseColor = new BABYLON.Color3(0.4,0.1,0.8);
                wildEnemyMesh.material = wm;
            }
            wildEnemyMesh.isVisible = true;

            enterCombatFromWorld(playerCollider, wildEnemyMesh, camera, combatContext, {
                isWild: true,
                enemy: {
                    name: "Pokémon sauvage",
                    level: 5,
                    maxHp: 25
                }
            });
        }
    }

    // ===== MOUVEMENT & UPDATE =====
    scene.onBeforeRenderObservable.add(() => {
        hudSpeedTextEl.textContent = gameState.isRunning ? "🏃 Course" : "🚶 Marche";

        if (npc && npcIcon) {
            const distNpc = BABYLON.Vector3.Distance(playerCollider.position, npc.position);
            npcIcon.position = npc.position.add(new BABYLON.Vector3(0,1.9,0));
            npcIcon.isVisible = (distNpc < gameState.interactionRange) && (gameState.mode !== "combat");
        } else if (npcIcon) {
            npcIcon.isVisible = false;
        }

        if (gameState.menuOpen || gameState.dialogOpen || gameState.mode === "combat") return;

        const spd = gameState.isRunning ? 0.2 : 0.1;
        let dx = 0, dz = 0;

        if (inputMap["z"] || inputMap["w"]) dx -= spd;
        if (inputMap["s"]) dx += spd;
        if (inputMap["d"]) dz += spd;
        if (inputMap["a"] || inputMap["q"]) dz -= spd;

        if (gamepad) {
            const D = 0.15;
            const lx = Math.abs(gamepad.leftStick.x) > D ? gamepad.leftStick.x : 0;
            const ly = Math.abs(gamepad.leftStick.y) > D ? gamepad.leftStick.y : 0;
            dz += lx * spd;
            dx -= ly * spd;
        }

        const moveVec = new BABYLON.Vector3(dx, 0, dz);
        const moveSpeed = moveVec.length();

        // Rotation du modèle joueur dans la direction de déplacement
        if (playerMeshRoot && moveSpeed > 0.0001) {
            const angle = Math.atan2(dz, dx);
            // Comme ton modèle est orienté différemment, ajuste ici si besoin :
            playerMeshRoot.rotation.y = - angle + Math.PI / 2;
        }

        // Choix de l'animation selon vitesse
        if (playerSkeleton) {
            if (moveSpeed < 0.0001) {
                playPlayerAnimation("idle", 1.0);
            } else {
                const animSpeed = gameState.isRunning ? 1.0 : 0.5; // Running ralenti -> marche
                playPlayerAnimation("running", animSpeed);
            }
        }

        playerCollider.moveWithCollisions(moveVec);

        tryStartWildEncounter();
    });

    // Zone de départ
    switchZone("ville", new BABYLON.Vector3(0,0.9,0));

    console.log("✅ Scène prête !");
    return scene;
}

const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

console.log("🎮 Jeu démarré ! Approche les PNJ, teste les portes (E) et marche dans la forêt pour des combats sauvages.");
