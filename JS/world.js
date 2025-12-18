// world.js
import { gameState, combatState, combat, doCombatRound } from "./state.js";
import { overlayEl, showDialog, fadeToBlack, fadeFromBlack } from "./ui.js";

console.log("🌍 Chargement world.js");

let gamepad = null;

// ====== RÉFÉRENCES DOM UI (hors dialog/fade qui sont dans ui.js) ======
const mainMenuEl       = document.getElementById("mainMenu");
const inventoryMenuEl  = document.getElementById("inventoryMenu");
const teamMenuEl       = document.getElementById("teamMenu");
const hudSpeedTextEl   = document.getElementById("hudSpeedText");

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

// ===== UTILS COMBAT UI =====
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

function updateCombatRootSelection() {
    combatChoicesButtons.forEach((btn, idx) => {
        if (!btn) return;
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
        if (!btn) continue;
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
        if (!btn) return;
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
        if (move.effect) txt += `\nEffet: ${move.effect}`;
        combatAttackInfoTextEl.textContent = txt;
    }
}

// ===== INVENTAIRE & ÉQUIPE =====
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

// ===== JOUEUR & PNJ (GLTF + animations via AnimationGroups) =====
let playerMeshRoot = null;
let playerIdleAnim = null;
let playerRunAnim  = null;
let currentPlayerAnim = null;

function playPlayerAnimation(name, speed = 1) {
    if (!playerIdleAnim && !playerRunAnim) return;

    if (currentPlayerAnim === name) {
        // Juste mettre à jour la vitesse
        if (name === "idle" && playerIdleAnim) playerIdleAnim.speedRatio = speed;
        if (name === "running" && playerRunAnim) playerRunAnim.speedRatio = speed;
        return;
    }

    if (playerIdleAnim) playerIdleAnim.stop();
    if (playerRunAnim)  playerRunAnim.stop();

    if (name === "idle" && playerIdleAnim) {
        playerIdleAnim.reset();
        playerIdleAnim.play(true);
        playerIdleAnim.speedRatio = speed;
    }
    if (name === "running" && playerRunAnim) {
        playerRunAnim.reset();
        playerRunAnim.play(true);
        playerRunAnim.speedRatio = speed;
    }

    currentPlayerAnim = name;
}

// Création d’un PNJ basé sur le même modèle, Idle seulement
function createNpcCharacter(scene, parentNode) {
    parentNode.isVisible = false; // collider only

    BABYLON.SceneLoader.ImportMesh(
        "",
        "../Assets/models/animations/",
        "characterAnimation.glb",
        scene,
        (meshes, ps, skels, animationGroups) => {
            const root = new BABYLON.TransformNode("npcVisualRoot", scene);
            root.parent = parentNode;
            root.position = new BABYLON.Vector3(0, -0.9, 0);
            root.rotation.y = Math.PI / 2;

            meshes.forEach(m => {
                if (!m.parent) m.parent = root;
            });

            const idle = animationGroups.find(a => a.name.toLowerCase().includes("idle"));
            if (idle) {
                idle.reset();
                idle.play(true);
                idle.speedRatio = 1.0;
            }
        }
    );
}

// ===== CLASSE : HAUTES HERBES AVEC TIMER =====
class TallGrass {
    constructor(mesh, scene, playerCollider) {
        this.mesh = mesh;
        this.scene = scene;
        this.playerCollider = playerCollider;
        this.timeInside = 0;
        this.lastPlayerPos = null;
        this.isPlayerInside = false;
        
        // Créer une boîte de collision invisible
        this.collisionBox = BABYLON.MeshBuilder.CreateBox("grassCollisionBox", {
            width: mesh.scaling.x * 4,
            height: mesh.scaling.y * 1,
            depth: mesh.scaling.z * 4
        }, scene);
        this.collisionBox.position = mesh.position.clone();
        this.collisionBox.isVisible = false;
        this.collisionBox.checkCollisions = false;
    }

    // Vérifier si le joueur est à l'intérieur et mettre à jour le timer
    updateTimer(playerPos) {
        // Vérifier si le joueur intersecte la boîte de collision
        if (playerPos && this.collisionBox.intersectsMesh(this.playerCollider, false)) {
            this.isPlayerInside = true;

            // Vérifier le mouvement du joueur
            if (this.lastPlayerPos) {
                const distance = BABYLON.Vector3.Distance(playerPos, this.lastPlayerPos);
                if (distance > 0.1) {
                    this.timeInside += 2000; // Ajouter 2 secondes
                    console.log(`✅ Mouvement détecté | ⏱️ Temps: ${this.timeInside}ms`);
                } else {
                    console.log(`⏸️ Immobile | ⏱️ Timer gelé à ${this.timeInside}ms`);
                }
            } else {
                console.log(`📍 Entrée dans l'herbe | Timer initialisé`);
            }
            this.lastPlayerPos = playerPos.clone();
        } else {
            if (this.isPlayerInside) {
                console.log(`🚪 Sortie de l'herbe | Timer réinitialisé`);
            }
            this.isPlayerInside = false;
            this.timeInside = 0;
            this.lastPlayerPos = null;
        }
    }

    // Obtenir la chance de rencontre selon le temps passé
    getEncounterChance() {
        if (this.timeInside >= 20000) return 0.80;
        if (this.timeInside >= 15000) return 0.60;
        if (this.timeInside >= 10000) return 0.40;
        if (this.timeInside >= 5000) return 0.20;
        return 0;
    }

    // Réinitialiser le timer (après une rencontre ou sortie)
    resetTimer() {
        this.timeInside = 0;
        this.lastPlayerPos = null;
    }

    // Nettoyer les ressources
    dispose() {
        if (this.collisionBox && !this.collisionBox.isDisposed()) {
            this.collisionBox.dispose();
        }
    }
}

// ========== BABYLON SCENE + ZONES ==========
export function createScene(engine) {
    const scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;

    console.log("🌍 Création de la scène (zones + modèle 3D)…");

    // Lumière
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0,1,0), scene);
    light.intensity = 1.2;

    // Player collider (humain ~1m75)
    const playerCollider = BABYLON.MeshBuilder.CreateBox("pc", {width:0.8, height:1.8, depth:0.8}, scene);
    playerCollider.position = new BABYLON.Vector3(0,0.9,0);
    playerCollider.isVisible = false;
    playerCollider.checkCollisions = true;
    playerCollider.ellipsoid = new BABYLON.Vector3(0.4,0.9,0.4);
    playerCollider.ellipsoidOffset = new BABYLON.Vector3(0,0.9,0);

    // Racine visuelle du joueur
    playerMeshRoot = new BABYLON.TransformNode("playerRoot", scene);
    playerMeshRoot.parent = playerCollider;

    // Chargement GLTF joueur
    BABYLON.SceneLoader.ImportMesh(
        "",
        "../Assets/models/animations/",
        "characterAnimation.glb",
        scene,
        (meshes, ps, skels, animationGroups) => {
            const visualRoot = new BABYLON.TransformNode("playerVisualRoot", scene);
            visualRoot.parent = playerMeshRoot;
            visualRoot.position = new BABYLON.Vector3(0, -0.9, 0); // pieds au sol
            visualRoot.rotation.y = Math.PI / 2; // regarde dans la bonne direction

            meshes.forEach(m => {
                if (!m.parent) m.parent = visualRoot;
            });

            playerIdleAnim = animationGroups.find(a => a.name.toLowerCase().includes("idle"));
            playerRunAnim  = animationGroups.find(a => a.name.toLowerCase().includes("run"));
            if (!playerRunAnim) {
                playerRunAnim = animationGroups.find(a => a.name.toLowerCase().includes("running"));
            }

            console.log("🎞 Animations joueur :", animationGroups.map(a => a.name));
            console.log("Idle =", playerIdleAnim ? playerIdleAnim.name : "❌");
            console.log("Running =", playerRunAnim ? playerRunAnim.name : "❌");

            playPlayerAnimation("idle", 1.0);
        }
    );

    // Caméra de suivi
    const camera = new BABYLON.FollowCamera("cam", new BABYLON.Vector3(0,17,-20), scene);
    camera.lockedTarget = playerCollider;
    camera.radius = 8;
    camera.heightOffset = 6;
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
    let tallGrassAreas = []; // Tableau pour stocker les instances TallGrass
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
        
        // Nettoyer les instances TallGrass
        tallGrassAreas.forEach(grass => {
            if (grass instanceof TallGrass) {
                grass.dispose();
            }
        });
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
        const grassInstance = new TallGrass(mesh, scene, playerCollider);
        tallGrassAreas.push(grassInstance);
    }

    function wall(x,z,w,h,d) {
        const box = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("wall",{width:w,height:h,depth:d},scene)
        );
        box.position = new BABYLON.Vector3(x,h/2,z);
        box.checkCollisions = true;
        box.isVisible = false;
    }

    // ------- ZONE : VILLE -------
    function setupZoneVille() {
        currentZone = "ville";

        // Remplacer le sol créé par défaut par un GLB (Assets/models/zones/FloorZone1.glb)
        const groundRoot = new BABYLON.TransformNode("ground_ville_root", scene);
        BABYLON.SceneLoader.ImportMesh(
            "",
            "../Assets/models/zones/",
            "FloorZone1.glb",
            scene,
            (meshes, particleSystems, skeletons, animationGroups) => {
                meshes.forEach(m => {
                    // Certains éléments du GLB ne sont pas des Mesh (ex: lights) — on filtre
                    if (m instanceof BABYLON.Mesh) {
                        m.parent = groundRoot;
                        registerZoneMesh(m);
                        m.checkCollisions = true;
                    }
                });
                // --- Ajustements : position / rotation / échelle ---
                groundRoot.position = new BABYLON.Vector3(-8, 0, -17);
                groundRoot.rotation = new BABYLON.Vector3(0, Math.PI / 2, Math.PI);
                groundRoot.scaling = new BABYLON.Vector3(1.5, 1.2, 1.8);
            }
        );

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

        // PNJ combat
        npc = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("npcCombat", {
                height: 1.8,
                width: 0.8,
                depth: 0.8
            }, scene)
        );
        npc.position = new BABYLON.Vector3(5, 0.9, 5);
        npc.checkCollisions = true;
        createNpcCharacter(scene, npc);

        // Icône exclamation
        npcIcon = registerZoneMesh(
            BABYLON.MeshBuilder.CreatePlane("npcIcon", {
                width: 0.3,
                height: 0.6
            }, scene)
        );
        npcIcon.position = npc.position.add(new BABYLON.Vector3(0, 1.9, 0));
        npcIcon.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const npcIconMat = new BABYLON.StandardMaterial("npcIconMat", scene);
        npcIconMat.diffuseTexture = new BABYLON.Texture("../Assets/icons/Point-exclamation.png", scene);
        npcIconMat.diffuseTexture.hasAlpha = true;
        npcIconMat.backFaceCulling = false;
        npcIconMat.emissiveColor = new BABYLON.Color3(1,1,1);
        npcIcon.material = npcIconMat;
        npcIcon.isVisible = false;

        // PNJ dialog
        const npcTalk = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("npcTalk", {
                height: 1.8,
                width: 0.8,
                depth: 0.8
            }, scene)
        );
        npcTalk.position = new BABYLON.Vector3(-4, 0.9, 0);
        createNpcCharacter(scene, npcTalk);
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
        itemMat.emissiveColor = new BABYLON.Color3(1,0.7,0);
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
        createNpcCharacter(scene, npcInside);
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
        createNpcCharacter(scene, npcForest);
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

    // ===== COMBAT : ENTRÉE / SORTIE & INPUT =====
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
        gameState.dialogOpen = false;

        updateCombatTopUI();
        setCombatQuestion(`Que doit faire ${combat.player.name} ?`);
        setCombatLog(isWild ? "Un Pokémon sauvage apparaît !" : "Un combat commence !");
        setCombatTurnLabel();
        updateCombatRootSelection();
        hideAttackMenu();

        // Joueur en Idle pendant le combat
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

    function handleCombatKeyboard(rawKey, k) {
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
                    setTimeout(() => exitCombatToWorld(playerCollider, camera, combatContext), 500);
                }
            } else if (rawKey === "Escape") {
                const result = handlePlayerRootChoice("run");
                if (result && result.finished) {
                    setTimeout(() => exitCombatToWorld(playerCollider, camera, combatContext), 500);
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
                    setTimeout(() => exitCombatToWorld(playerCollider, camera, combatContext), 500);
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

    // ===== INTERACTION (E / B) =====
    async function interact() {
        if (gameState.menuOpen || gameState.dialogOpen) return;
        if (gameState.mode === "combat") return;

        const pos = playerCollider.position;

        // 1) Porte
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

        // 2) PNJ combat
        if (npc) {
            const distNpc = BABYLON.Vector3.Distance(pos, npc.position);
            if (distNpc < gameState.interactionRange) {
                enterCombatFromWorld(playerCollider, npc, camera, combatContext, { isWild:false });
                return;
            }
        }

        // 3) PNJ dialogues
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

        // 4) Item
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

    // ===== DEBUG MODE - AFFICHAGE DES COLLISION BOXES =====
    let debugMode = false;
    const debugCollisionBoxes = [];
    const debugOriginalStates = []; // Stocker les états originaux

    function toggleDebugCollisions() {
        debugMode = !debugMode;
        
        if (debugMode) {
            console.log("🐛 DEBUG MODE ACTIVÉ - Affichage des collision boxes");
            
            // Afficher les collision boxes des hautes herbes
            tallGrassAreas.forEach((grass, idx) => {
                // Sauvegarder l'état original
                debugOriginalStates.push({
                    mesh: grass.collisionBox,
                    wasVisible: grass.collisionBox.isVisible,
                    originalMaterial: grass.collisionBox.material
                });
                
                grass.collisionBox.isVisible = true;
                const mat = new BABYLON.StandardMaterial(`grassDebugMat_${idx}`, scene);
                mat.wireframe = true;
                mat.emissiveColor = new BABYLON.Color3(0, 1, 0); // Vert
                mat.alpha = 0.7;
                grass.collisionBox.material = mat;
                debugCollisionBoxes.push(grass.collisionBox);
            });

            // Afficher les collision boxes des interactables
            interactables.forEach((it, idx) => {
                if (it.mesh && !it.mesh.isDisposed()) {
                    debugOriginalStates.push({
                        mesh: it.mesh,
                        wasVisible: it.mesh.isVisible,
                        originalMaterial: it.mesh.material
                    });
                    
                    it.mesh.isVisible = true;
                    const mat = new BABYLON.StandardMaterial(`interactableDebugMat_${idx}`, scene);
                    mat.wireframe = true;
                    mat.emissiveColor = new BABYLON.Color3(1, 1, 0); // Jaune
                    mat.alpha = 0.7;
                    it.mesh.material = mat;
                    debugCollisionBoxes.push(it.mesh);
                }
            });

            // Afficher le playerCollider
            debugOriginalStates.push({
                mesh: playerCollider,
                wasVisible: playerCollider.isVisible,
                originalMaterial: playerCollider.material
            });
            
            const playerMat = new BABYLON.StandardMaterial("playerDebugMat", scene);
            playerMat.wireframe = true;
            playerMat.emissiveColor = new BABYLON.Color3(1, 0, 0); // Rouge
            playerMat.alpha = 0.7;
            playerCollider.isVisible = true;
            playerCollider.material = playerMat;
            debugCollisionBoxes.push(playerCollider);

            // Afficher tous les zone meshes (murs, portes, etc)
            zoneMeshes.forEach((mesh, idx) => {
                if (mesh && !mesh.isDisposed() && mesh.checkCollisions) {
                    debugOriginalStates.push({
                        mesh: mesh,
                        wasVisible: mesh.isVisible,
                        originalMaterial: mesh.material
                    });
                    
                    mesh.isVisible = true;
                    const mat = new BABYLON.StandardMaterial(`zoneDebugMat_${idx}`, scene);
                    mat.wireframe = true;
                    mat.emissiveColor = new BABYLON.Color3(0, 1, 1); // Cyan
                    mat.alpha = 0.5;
                    mesh.material = mat;
                    debugCollisionBoxes.push(mesh);
                }
            });

            console.log(`✅ ${debugCollisionBoxes.length} collision boxes affichées`);
        } else {
            console.log("🐛 DEBUG MODE DÉSACTIVÉ");
            
            // Restaurer les états originaux
            debugOriginalStates.forEach(state => {
                if (state.mesh && !state.mesh.isDisposed()) {
                    state.mesh.isVisible = state.wasVisible;
                    
                    // Supprimer le matériau debug et restaurer l'original
                    if (state.mesh.material) {
                        state.mesh.material.dispose();
                    }
                    state.mesh.material = state.originalMaterial;
                }
            });
            
            debugOriginalStates.length = 0;
            debugCollisionBoxes.length = 0;

            console.log("✅ Mode graphique restauré");
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
                handleCombatKeyboard(rawKey, k);
                return;
            }

            if (!keyJustPressed[k]) {
                keyJustPressed[k] = true;
                inputMap[k] = true;

                if (k === "e") interact();
                if (k === "m") toggleMenu();
                if (k === "c") toggleDebugCollisions(); // DEBUG : Affiche/cache les collision boxes
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
                    handleCombatKeyboard("ArrowDown", "arrowdown");
                } else if (b === GP.courir) {
                    handleCombatKeyboard("Enter", "enter");
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

    // ===== COMBATS SAUVAGES (SYSTÈME INDÉPENDANT) =====
    let wildEncounterInterval = null;
    
    function initWildEncounterSystem() {
        // Vérification toutes les 2 secondes
        wildEncounterInterval = setInterval(() => {
            if (gameState.mode !== "exploration" || tallGrassAreas.length === 0) {
                return;
            }

            const playerPos = playerCollider.position;

            // Mettre à jour tous les timers des hautes herbes
            for (const grassInstance of tallGrassAreas) {
                grassInstance.updateTimer(playerPos);

                // Si le joueur est dedans et a une chance de rencontre
                if (grassInstance.isPlayerInside && grassInstance.getEncounterChance() > 0) {
                    const encounterChance = grassInstance.getEncounterChance();
                    
                    console.log(`🚶 Herbe ${grassInstance.mesh.name} | ⏱️ Temps: ${grassInstance.timeInside}ms | Chance: ${(encounterChance * 100).toFixed(0)}%`);

                    if (Math.random() < encounterChance) {
                        if (!wildEnemyMesh || wildEnemyMesh.isDisposed()) {
                            wildEnemyMesh = BABYLON.MeshBuilder.CreateSphere("wildEnemy", {diameter:1.4}, scene);
                            const wm = new BABYLON.StandardMaterial("wildMat", scene);
                            wm.diffuseColor = new BABYLON.Color3(0.4,0.1,0.8);
                            wildEnemyMesh.material = wm;
                        }
                        wildEnemyMesh.isVisible = true;

                        // Réinitialiser le timer après la rencontre
                        grassInstance.resetTimer();

                        enterCombatFromWorld(playerCollider, wildEnemyMesh, camera, combatContext, {
                            isWild: true,
                            enemy: {
                                name: "Pokémon sauvage",
                                level: 5,
                                maxHp: 25
                            }
                        });
                        break; // Une seule rencontre à la fois
                    }
                }
            }
        }, 2000); // Vérification toutes les 2 secondes
    }

    // ===== BOUTONS UI =====
    trainerNameEl.textContent = gameState.playerName;
    trainerMoneyEl.textContent = gameState.money + "₽";

    btnMenuInventory.addEventListener("click", () => openInventoryMenu());
    btnMenuTeam.addEventListener("click", () => openTeamMenu());
    btnMenuMap.addEventListener("click", () => showDialog("🗺️ La carte n'est pas encore disponible."));
    btnMenuSave.addEventListener("click", () => showDialog("💾 Partie sauvegardée !"));
    btnMenuOptions.addEventListener("click", () => showDialog("⚙️ Options en développement."));
    btnMenuClose.addEventListener("click", () => closeAllMenus());

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

    btnTeamBackEl.addEventListener("click", () => {
        openMainMenu();
    });

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

        if (playerMeshRoot && moveSpeed > 0.0001) {
            const angle = Math.atan2(dz, dx);
            // Ton modèle étant orienté sur Y, on ajuste
            playerMeshRoot.rotation.y =  -angle;
        }

        if (moveSpeed < 0.001) {
            playPlayerAnimation("idle", 1.0);
        } else {
            const speedFactor = gameState.isRunning ? 1.0 : 0.5;
            playPlayerAnimation("running", speedFactor);
        }

        playerCollider.moveWithCollisions(moveVec);
    });

    // Zone de départ
    switchZone("ville", new BABYLON.Vector3(0,0.9,0));
    
    // Démarrer le système de rencontres sauvages
    initWildEncounterSystem();

    console.log("✅ Scène prête !");
    return scene;
}
