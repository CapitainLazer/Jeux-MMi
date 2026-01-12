// world.js
import { gameState, combatState, combat, doCombatRound } from "./state.js";
import { overlayEl, showDialog, fadeToBlack, fadeFromBlack } from "./ui.js";
import { initiateCombat } from "./combat.js";
import { 
    menuState, toggleMenu, closeAllMenus, navigateMenu, selectItem, selectMainMenuOption, selectSaveMenuOption, useItem, infoItem, goBack, 
    attachButtonListeners, renderMenu, openMenu
} from "./menuSystem.js";

console.log("🌍 Chargement world.js");

let gamepad = null;

// ====== RÉFÉRENCES DOM UI (hors dialog/fade et menus qui sont dans ui.js/menuSystem.js) ======
const hudSpeedTextEl   = document.getElementById("hudSpeedText");

const trainerNameEl    = document.getElementById("trainerName");
const trainerMoneyEl   = document.getElementById("trainerMoney");

// ===== UTILS EXPLORATION =====
function hpColorLocal(pct) {
    if (pct > 0.5) return "linear-gradient(90deg,#28c728,#8be628)";
    if (pct > 0.2) return "linear-gradient(90deg,#e6c228,#f6e46b)";
    return "linear-gradient(90deg,#e62828,#f66b6b)";
}

// ===== MENUS : Gérés par menuSystem.js =====
// Les fonctions de rendu sont maintenant dans menuSystem.js
// On utilise uniquement les fonctions importées

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
    let interactableIcons = []; // ✅ Stocker toutes les icônes d'interactables

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
        
        // ✅ Nettoyer les icônes d'interactables
        interactableIcons.forEach(iconData => {
            if (iconData.icon && !iconData.icon.isDisposed()) {
                iconData.icon.dispose();
            }
        });
        interactableIcons = [];
        
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
        mesh.checkCollisions = true; // ✅ Ajouter collision
        // ❌ PAS d'icône pour les portes (changements de zones)
        interactables.push({
            type: "door",
            mesh,
            targetZone,
            targetPos,
            icon: null
        });
    }

    function addTalkNpc(mesh, text) {
        mesh.checkCollisions = true; // ✅ Ajouter collision
        const icon = createInteractableIcon(mesh, "PNJ");
        interactables.push({
            type: "npcTalk",
            mesh,
            text,
            icon
        });
    }

    function createInteractableIcon(targetMesh, type = "Objet") {
        // ✅ Créer une icône au-dessus d'un objet interactable
        const iconPlane = registerZoneMesh(
            BABYLON.MeshBuilder.CreatePlane("icon_" + type, {
                width: 0.3,
                height: 0.6
            }, scene)
        );
        iconPlane.position = targetMesh.position.add(new BABYLON.Vector3(0, 1.9, 0));
        iconPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        const iconMat = new BABYLON.StandardMaterial("iconMat_" + type + Math.random(), scene);
        iconMat.diffuseTexture = new BABYLON.Texture("../Assets/icons/Point-interrogation.png", scene);
        iconMat.diffuseTexture.hasAlpha = true;
        iconMat.backFaceCulling = false;
        iconMat.emissiveColor = new BABYLON.Color3(1,1,1);
        iconPlane.material = iconMat;
        iconPlane.isVisible = false;
        
        interactableIcons.push({
            icon: iconPlane,
            targetMesh: targetMesh
        });
        
        return iconPlane;
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
        item.checkCollisions = true; // ✅ Ajouter collision pour l'item
        const itemMat = new BABYLON.StandardMaterial("itemMat",scene);
        itemMat.emissiveColor = new BABYLON.Color3(1,0.7,0);
        item.material = itemMat;
        
        // ✅ Créer une icône pour l'item
        const itemIcon = createInteractableIcon(item, "Item");
        item.icon = itemIcon;
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

    // ===== COMBAT : TRANSITION VERS LA SCÈNE DÉDIÉE =====
    function startCombat(options = {}) {
        // Appelle la fonction de combat.js pour initialiser une scène complètement indépendante
        initiateCombat(scene, camera, options);
    }

    // ===== INTERACTION (E / B) =====
    async function interact() {
        if (menuState.isOpen || gameState.dialogOpen) return;
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
                startCombat({ isWild: false });
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
            console.log("⌨️ KEY DOWN :", rawKey, "| Menu:", menuState.isOpen, "| Screen:", menuState.currentScreen, "| Combat:", gameState.mode);
            
            // ✅ Le combat est maintenant géré dans une scène indépendante
            if (gameState.mode === "combat") {
                console.log("   → Ignorer (combat)");
                return;
            }

            // ===== GESTION DES MENUS (PRIORITÉ) =====
            if (menuState.isOpen) {
                console.log("   → Menu ouvert, traiter menu");
                console.log("   → Touche:", rawKey);
                
                // Navigation dans les menus au clavier
                if (rawKey === "ArrowUp") {
                    console.log("      ↑ ArrowUp détecté!");
                    navigateMenu("up");
                    return;
                }
                if (rawKey === "ArrowDown") {
                    console.log("      ↓ ArrowDown détecté!");
                    navigateMenu("down");
                    return;
                }
                if (rawKey === "ArrowLeft") {
                    console.log("      ← ArrowLeft détecté!");
                    navigateMenu("left");
                    return;
                }
                if (rawKey === "ArrowRight") {
                    console.log("      → ArrowRight détecté!");
                    navigateMenu("right");
                    return;
                }
                if (k === "enter") {
                    console.log("      ⏎ Enter détecté!");
                    if (menuState.currentScreen === "main") {
                        selectMainMenuOption();
                    } else if (menuState.currentScreen === "save") {
                        selectSaveMenuOption();
                    } else if (menuState.currentScreen === "inventory") {
                        if (menuState.inventoryDetailMode) {
                            useItem();
                        } else {
                            selectItem();
                        }
                    }
                    return;
                }
                if (k === "backspace") {
                    console.log("      ← Backspace détecté!");
                    navigateMenu("back");
                    return;
                }
                if (rawKey === "Escape") {
                    console.log("      ✕ Escape détecté!");
                    closeAllMenus();
                    return;
                }
                console.log("   → Touche ignorée en menu:", rawKey);
                return; // Important : rien d'autre en menu
            }

            // ===== GESTION DE L'EXPLORATION (hors menu) =====
            console.log("   → Menu fermé, traiter exploration");
            
            // ✅ Bloquer les flèches pour éviter que Babylon.js les utilise pour la caméra
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(rawKey)) {
                console.log("   → Flèche ignorée en exploration (réservées pour les menus)");
                return;
            }
            
            if (!keyJustPressed[k]) {
                keyJustPressed[k] = true;
                inputMap[k] = true;

                if (k === "e") interact();
                if (k === "m") toggleMenu();
                if (k === "c") toggleDebugCollisions();
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
    let lastStickInput = {}; // Tracking pour chaque direction du stick

    new BABYLON.GamepadManager().onGamepadConnectedObservable.add(gp => {
        gamepad = gp;
        console.log("🎮 Manette connectée:", gp.id);

        gp.onButtonDownObservable.add(btn => {
            const b = typeof btn === "number" ? btn : btn.index || btn;
            if (pressed[b]) return;
            pressed[b] = true;
            const now = Date.now();

            // ===== D-PAD NAVIGATION =====
            // D-pad buttons: 12=Up, 13=Down, 14=Left, 15=Right
            if (b === 12) {  // D-pad Up
                if (menuState.isOpen) {
                    navigateMenu("up");
                    console.log("🎮 D-pad ↑");
                }
                return;
            } else if (b === 13) {  // D-pad Down
                if (menuState.isOpen) {
                    navigateMenu("down");
                    console.log("🎮 D-pad ↓");
                }
                return;
            } else if (b === 14) {  // D-pad Left
                if (menuState.isOpen) {
                    navigateMenu("left");
                    console.log("🎮 D-pad ←");
                }
                return;
            } else if (b === 15) {  // D-pad Right
                if (menuState.isOpen) {
                    navigateMenu("right");
                    console.log("🎮 D-pad →");
                }
                return;
            }

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

            // ===== GESTION DES MENUS À LA MANETTE =====
            if (menuState.isOpen) {
                if (b === GP.courir) {
                    // A = Valider/Utiliser
                    if (menuState.currentScreen === "inventory") {
                        if (menuState.inventoryDetailMode) {
                            useItem();
                        } else {
                            selectItem();
                        }
                    }
                } else if (b === GP.interagir) {
                    // B = Retour
                    navigateMenu("back");
                }
                return;
            }

            if (!menuState.isOpen) {
                if (b === GP.interagir) interact();
                if (b === GP.courir) gameState.isRunning = true;
            }
        });

        gp.onButtonUpObservable.add(btn => {
            const b = typeof btn === "number" ? btn : btn.index || btn;
            pressed[b] = false;
            if (b === GP.courir) gameState.isRunning = false;
        });

        // ===== NAVIGATION À LA MANETTE (STICKS) =====
        gp.onPadValuesChangedObservable.add(() => {
            const deadzone = 0.3; // ✅ Réduit de 0.5 à 0.3 pour meilleure sensibilité
            const lx = gp.leftStick.x;
            const ly = gp.leftStick.y;
            const now = Date.now();
            const debounceDelay = 200; // Délai entre deux inputs stick
            
            // ===== EN COMBAT =====
            if (gameState.mode === "combat") {
                // Navigation au stick en phase combat
                if (combatState.active && combatState.phase === "attacks") {
                    // Gauche/Droite pour navigation horizontale
                    if (lx < -deadzone && (!lastStickInput.left || now - lastStickInput.left > debounceDelay)) {
                        lastStickInput.left = now;
                        handleCombatKeyboard("ArrowLeft", "arrowleft");
                        console.log("🎮 Combat stick ← (gauche)");
                    } else if (lx > deadzone && (!lastStickInput.right || now - lastStickInput.right > debounceDelay)) {
                        lastStickInput.right = now;
                        handleCombatKeyboard("ArrowRight", "arrowright");
                        console.log("🎮 Combat stick → (droite)");
                    }
                    
                    // Haut/Bas pour navigation verticale
                    if (ly < -deadzone && (!lastStickInput.up || now - lastStickInput.up > debounceDelay)) {
                        lastStickInput.up = now;
                        handleCombatKeyboard("ArrowUp", "arrowup");
                        console.log("🎮 Combat stick ↑ (haut)");
                    } else if (ly > deadzone && (!lastStickInput.down || now - lastStickInput.down > debounceDelay)) {
                        lastStickInput.down = now;
                        handleCombatKeyboard("ArrowDown", "arrowdown");
                        console.log("🎮 Combat stick ↓ (bas)");
                    }
                }
                return;
            }

            // ===== EN MENU =====
            if (!menuState.isOpen) return;

            // Navigation horizontale (left stick X)
            if (lx < -deadzone && (!lastStickInput.left || now - lastStickInput.left > debounceDelay)) {
                lastStickInput.left = now;
                navigateMenu("left");
                console.log("🎮 Menu stick ← (gauche)");
            } else if (lx > deadzone && (!lastStickInput.right || now - lastStickInput.right > debounceDelay)) {
                lastStickInput.right = now;
                navigateMenu("right");
                console.log("🎮 Menu stick → (droite)");
            }

            // Navigation verticale (left stick Y)
            if (ly < -deadzone && (!lastStickInput.up || now - lastStickInput.up > debounceDelay)) {
                lastStickInput.up = now;
                navigateMenu("up");
                console.log("🎮 Menu stick ↑ (haut)");
            } else if (ly > deadzone && (!lastStickInput.down || now - lastStickInput.down > debounceDelay)) {
                lastStickInput.down = now;
                navigateMenu("down");
                console.log("🎮 Menu stick ↓ (bas)");
            }
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
                        // ✅ Le combat se fera dans une scène indépendante
                        // Réinitialiser le timer après la rencontre
                        grassInstance.resetTimer();

                        startCombat({
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

    // Attacher les event listeners des boutons via menuSystem
    attachButtonListeners();

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
        
        // ✅ Gérer la visibilité des icônes d'interactables
        interactableIcons.forEach(iconData => {
            if (!iconData.icon || !iconData.targetMesh) return;
            
            const distObj = BABYLON.Vector3.Distance(playerCollider.position, iconData.targetMesh.position);
            iconData.icon.position = iconData.targetMesh.position.add(new BABYLON.Vector3(0, 1.9, 0));
            iconData.icon.isVisible = (distObj < gameState.interactionRange) && (gameState.mode !== "combat") && !menuState.isOpen;
        });
        
        // ✅ Gérer la visibilité de l'icône de l'item
        if (item && item.icon && item.isVisible) {
            const distItem = BABYLON.Vector3.Distance(playerCollider.position, item.position);
            item.icon.position = item.position.add(new BABYLON.Vector3(0, 1.1, 0));
            item.icon.isVisible = (distItem < gameState.interactionRange) && (gameState.mode !== "combat") && !menuState.isOpen;
        } else if (item && item.icon) {
            item.icon.isVisible = false;
        }

        if (menuState.isOpen || gameState.dialogOpen || gameState.mode === "combat") return;

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
