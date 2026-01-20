// world.js
import { gameState, combatState, combat, doCombatRound } from "./state.js";
import { overlayEl, showDialog, fadeToBlack, fadeFromBlack } from "./ui.js";
import { initiateCombat, setDefeatCallback } from "./combat.js";
import { 
    menuState, toggleMenu, closeAllMenus, navigateMenu, selectItem, selectMainMenuOption, selectSaveMenuOption, useItem, infoItem, goBack, 
    attachButtonListeners, renderMenu, openMenu, autoSave, loadAutoSave, applyLoadedPosition
} from "./menuSystem.js";
import { 
    isMobile, initMobileControls, getJoystickVector, isJoystickActive, 
    setInteractCallback, toggleFullscreen 
} from "./mobileControls.js";

console.log("🌍 Chargement world.js");

let gamepad = null;
let mobileControlsEnabled = false;

// ===== NORMALISATION VITESSE (60 FPS référence) =====
const TARGET_FRAME_TIME = 16.67; // ms à 60 FPS

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
        "./Assets/models/animations/",
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
            width: mesh.scaling.x * 16,
            height: mesh.scaling.y * 1,
            depth: mesh.scaling.z * 9.14
        }, scene);
        this.collisionBox.position = mesh.position.clone();
        this.collisionBox.position.x =- 1; 
        this.collisionBox.position.z =- 3;
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
        if (this.timeInside >= 12000) return 0.80;
        if (this.timeInside >= 8000) return 0.60;
        if (this.timeInside >= 5000) return 0.40;
        if (this.timeInside >= 3000) return 0.20;
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
        "./Assets/models/animations/",
        "Mcharacter.gltf",
        scene,
        (meshes, ps, skels, animationGroups) => {
            const visualRoot = new BABYLON.TransformNode("playerVisualRoot", scene);
            visualRoot.parent = playerMeshRoot;
            visualRoot.position = new BABYLON.Vector3(0, -0.9, 0); // pieds au sol
            visualRoot.rotation.y = 0; // Orientation de base alignée avec Z

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
    camera.rotationOffset = 0; // Vue depuis le nord, personnage regarde sud

    // Contexte combat
    const combatContext = {
        prevPlayerPos: null,
        prevCamera: null,
        prevNpcPos: null,
        npcMesh: null,
        isWild: false
    };
        const MAX_ATTEMPTS = 30;
    // ========= GESTION DES ZONES =========
    let currentZone = null;
    let zoneMeshes = [];
    let interactables = [];
    let tallGrassAreas = []; // Tableau pour stocker les instances TallGrass
    let npc = null;
    let npcIcon = null;
    let item = null;
    let interactableIcons = []; // ✅ Stocker toutes les icônes d'interactables
    
    // Système de sauvegarde de position pour retour aux zones
    let lastDoorUsed = null;  // Porte utilisée pour quitter la zone
    let lastDoorPosition = null; // Position de la porte pour revenir
    let lastZoneVisited = null;  // Zone qu'on vient de quitter
    let returnPositionOffset = new BABYLON.Vector3(0, 0, 2); // Offset devant la porte
    
    // ✅ EXPOSITION DES DONNÉES POUR LE SYSTÈME DE SAUVEGARDE
    gameState._getPlayerPosition = () => {
        return {
            x: playerCollider.position.x,
            y: playerCollider.position.y,
            z: playerCollider.position.z
        };
    };
    
    gameState._setPlayerPosition = (pos) => {
        if (pos && typeof pos.x === 'number') {
            playerCollider.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);
            console.log(`📍 Position restaurée:`, playerCollider.position.toString());
        }
    };
    
    gameState._getCurrentZone = () => currentZone;
    
    gameState._switchZone = (zoneName, position) => {
        const pos = position ? new BABYLON.Vector3(position.x, position.y, position.z) : null;
        switchZone(zoneName, pos);
    };
    
    // ✅ Spawn points fixes pour chaque zone (indépendant du chargement asynchrone)
    const zoneSpawnPoints = {
        ville: {  // Spawn points dans la zone VILLE
            fromForet: new BABYLON.Vector3(-11.335284318140054, 0.9, -7.871087340013265),  // Position exacte du cylindre devant le gate
            fromHouse: new BABYLON.Vector3(1.4, 0.9, 5)  // Position avancée vers les hautes herbes
        },
        foret: {  // Spawn points dans la zone FORET
            fromVille: new BABYLON.Vector3(0, 0.9, 26)    // Position devant la porte de sortie
        },
        house: {  // Spawn points dans la zone HOUSE (intérieur maison)
            fromVille: new BABYLON.Vector3(0, 0.9, -3),   // Position devant "door" dans le GLB
            atBed: new BABYLON.Vector3(0, 0.9, -5)  // ✅ Position devant le lit (à ajuster selon les coordonnées du lit)
        }
    };
    
    // ✅ Position du lit (sera mise à jour dynamiquement au chargement du GLB)
    let bedPosition = new BABYLON.Vector3(0, 0.9, -5);

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

    function addDoor(mesh, targetZone, targetPos, spawnPoint = null) {
        mesh.isVisible = false;
        mesh.checkCollisions = true; // ✅ Ajouter collision
        // ❌ PAS d'icône pour les portes (changements de zones)
        interactables.push({
            type: "door",
            mesh,
            targetZone,
            targetPos,
            spawnPoint: spawnPoint || targetPos, // Utiliser targetPos par défaut
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

    // ========= SYSTÈME PC INTERACTIF AVEC IFRAME =========
    let pcViewActive = false;
    let currentPCMesh = null;
    let savedCameraSettings = null;
    
    /**
     * Ajoute un PC interactable avec iframe plein écran
     * @param {BABYLON.Mesh} mesh - Le mesh du PC (zone d'interaction)
     * @param {string} websiteUrl - URL du site web à afficher
     */
    function addComputer(mesh, websiteUrl) {
        mesh.checkCollisions = true;
        const icon = createInteractableIcon(mesh, "PC");
        interactables.push({
            type: "computer",
            mesh,
            websiteUrl,
            icon
        });
    }
    
    /**
     * Ajoute un lit interactable pour soigner les Digiters
     * @param {BABYLON.Mesh} mesh - Le mesh du lit (zone d'interaction)
     */
    function addBed(mesh) {
        mesh.checkCollisions = true;
        const icon = createInteractableIcon(mesh, "Lit");
        interactables.push({
            type: "bed",
            mesh,
            icon
        });
    }
    
    /**
     * Calcule si un objet est devant le joueur (dans son champ de vision)
     * @returns {number} Score de priorité (plus petit = plus prioritaire)
     */
    function getInteractionPriority(playerPos, targetPos, playerRotation) {
        // Vecteur du joueur vers la cible
        const toTarget = targetPos.subtract(playerPos);
        toTarget.y = 0; // Ignorer la hauteur
        const distance = toTarget.length();
        toTarget.normalize();
        
        // Direction du joueur (basée sur sa rotation Y)
        const playerDir = new BABYLON.Vector3(
            Math.sin(playerRotation),
            0,
            Math.cos(playerRotation)
        );
        
        // Produit scalaire pour déterminer si c'est devant (-1 = derrière, 1 = devant)
        const dot = BABYLON.Vector3.Dot(playerDir, toTarget);
        
        // Si l'objet est derrière ou trop sur le côté (angle > 70°), score très élevé
        if (dot < 0.3) return 9999;
        
        // Score : privilégier ce qui est devant ET proche
        // Plus dot est proche de 1 (face à face) et distance faible, meilleur score
        return distance / (dot + 0.1);
    }
    
    /**
     * Active la vue PC : anime la caméra puis affiche l'iframe
     */
    function enterPCView(pcData) {
        if (pcViewActive) return;
        pcViewActive = true;
        currentPCMesh = pcData.mesh;
        
        // Sauvegarder les paramètres actuels de la caméra
        savedCameraSettings = {
            lockedTarget: camera.lockedTarget,
            radius: camera.radius,
            heightOffset: camera.heightOffset,
            rotationOffset: camera.rotationOffset,
            position: camera.position.clone()
        };
        
        // Calculer la position de la caméra devant le PC
        const pcPos = pcData.mesh.position;
        const cameraTargetPos = pcPos.clone();
        const cameraPos = pcPos.add(new BABYLON.Vector3(0, 0.5, 2)); // Légèrement en hauteur et devant
        
        // Désactiver le suivi du joueur
        camera.lockedTarget = null;
        
        // Animer la caméra vers le PC
        const animCamera = new BABYLON.Animation(
            "pcCameraAnim",
            "position",
            30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        animCamera.setKeys([
            { frame: 0, value: camera.position.clone() },
            { frame: 30, value: cameraPos }
        ]);
        
        camera.animations = [animCamera];
        scene.beginAnimation(camera, 0, 30, false, 1, () => {
            // Une fois la caméra en position, la faire regarder le PC
            camera.setTarget(cameraTargetPos);
            
            // Puis afficher l'iframe après un court délai
            setTimeout(() => {
                showFullscreenIframe(pcData.websiteUrl);
            }, 300);
        });
        
        console.log("🖥️ Transition vers le PC...");
    }
    
    /**
     * Quitte la vue PC : ferme l'iframe et restaure la caméra
     */
    function exitPCView() {
        if (!pcViewActive) return;
        
        // Fermer l'iframe
        hideFullscreenIframe();
        
        // Restaurer la caméra
        if (savedCameraSettings) {
            const animCamera = new BABYLON.Animation(
                "pcCameraExitAnim",
                "position",
                30,
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            // Position de retour vers le joueur
            const returnPos = playerCollider.position.add(new BABYLON.Vector3(0, 6, -8));
            
            animCamera.setKeys([
                { frame: 0, value: camera.position.clone() },
                { frame: 30, value: returnPos }
            ]);
            
            camera.animations = [animCamera];
            scene.beginAnimation(camera, 0, 30, false, 1, () => {
                // Restaurer le suivi du joueur
                camera.lockedTarget = savedCameraSettings.lockedTarget;
                camera.radius = savedCameraSettings.radius;
                camera.heightOffset = savedCameraSettings.heightOffset;
                camera.rotationOffset = savedCameraSettings.rotationOffset;
                savedCameraSettings = null;
            });
        }
        
        pcViewActive = false;
        currentPCMesh = null;
        
        console.log("🖥️ Vue PC désactivée");
    }
    
    /**
     * Affiche une iframe plein écran avec le site web
     */
    function showFullscreenIframe(websiteUrl) {
        let iframeContainer = document.getElementById("pc-iframe-container");
        if (!iframeContainer) {
            iframeContainer = document.createElement("div");
            iframeContainer.id = "pc-iframe-container";
            iframeContainer.innerHTML = `
                <style>
                    #pc-iframe-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        z-index: 9999;
                        background: #000;
                        display: flex;
                        flex-direction: column;
                    }
                    #pc-iframe-container iframe {
                        flex: 1;
                        width: 100%;
                        border: none;
                    }
                    #pc-iframe-header {
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                        padding: 10px 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 2px solid #0f3460;
                    }
                    #pc-iframe-header span {
                        color: #e94560;
                        font-family: 'Segoe UI', Arial, sans-serif;
                        font-size: 14px;
                        font-weight: bold;
                    }
                    #pc-exit-btn {
                        background: #e74c3c;
                        color: white;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                        transition: all 0.2s;
                    }
                    #pc-exit-btn:hover {
                        background: #c0392b;
                        transform: scale(1.05);
                    }
                </style>
                <div id="pc-iframe-header">
                    <span>🖥️ Mode PC - Appuyez sur Echap ou B pour quitter</span>
                    <button id="pc-exit-btn">✕ Quitter</button>
                </div>
                <iframe id="pc-iframe" src="" allow="fullscreen; autoplay; encrypted-media"></iframe>
            `;
            document.body.appendChild(iframeContainer);
            
            const exitBtn = document.getElementById("pc-exit-btn");
            // Support desktop ET mobile
            exitBtn.addEventListener("click", exitPCView);
            exitBtn.addEventListener("touchend", (e) => {
                e.preventDefault();
                exitPCView();
            });
        }
        
        // Charger le site web dans l'iframe
        const iframe = document.getElementById("pc-iframe");
        iframe.src = websiteUrl;
        
        iframeContainer.style.display = "flex";
        
        console.log("🌐 Iframe ouverte:", websiteUrl);
    }
    
    /**
     * Ferme l'iframe plein écran
     */
    function hideFullscreenIframe() {
        const iframeContainer = document.getElementById("pc-iframe-container");
        if (iframeContainer) {
            // Arrêter le chargement de l'iframe
            const iframe = document.getElementById("pc-iframe");
            if (iframe) {
                iframe.src = "about:blank";
            }
            iframeContainer.style.display = "none";
        }
        console.log("🌐 Iframe fermée");
    }

    function createInteractableIcon(targetMesh, type = "Objet") {
        // ✅ Créer une icône au-dessus d'un objet interactable
        const iconPlane = registerZoneMesh(
            BABYLON.MeshBuilder.CreatePlane("icon_" + type, {
                width: 0.3,
                height: 0.6
            }, scene)
        );
        
        // Ajuster la hauteur selon le type
        let heightOffset = 1.9; // Hauteur par défaut
        if (type === "PC") {
            heightOffset = 0.5; // Hauteur réduite pour le PC
        }
        
        iconPlane.position = targetMesh.position.add(new BABYLON.Vector3(0, heightOffset, 0));
        iconPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        const iconMat = new BABYLON.StandardMaterial("iconMat_" + type + Math.random(), scene);
        iconMat.diffuseTexture = new BABYLON.Texture("./Assets/icons/Point-interrogation.png", scene);
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

        console.log("🏘️ Configuration zone VILLE - Chargement Zone1Export.glb...");

        // Charger tout le GLB en un bloc (contient: sol, maisons, arbres, barrières)
        BABYLON.SceneLoader.ImportMesh(
            "",
            "./Assets/models/zones/",
            "Zone1Export.glb",
            scene,
            (meshes) => {
                console.log(`✅ Zone1Export.glb chargé! ${meshes.length} meshes importés`);
                
                // Grouper les éléments pour créer des collisions uniques
                const collisionGroups = {
                    treesBack: { meshes: [] },
                    treesLeft: { meshes: [] },
                    treesRight: { meshes: [] },
                    house1: { meshes: [] },
                    house2: { meshes: [] }
                };
                
                const individualFences = []; // Fences traitées individuellement
                let gateForForest = null; // Portail vers la forêt
                const grassMeshes = []; // Tous les meshes d'herbe
                
                meshes.forEach((m) => {
                    if (m instanceof BABYLON.Mesh && m.name !== "__root__") {
                        registerZoneMesh(m);
                        
                        // Portail vers la forêt
                        if (m.name === "gate") {
                            gateForForest = m;
                            m.checkCollisions = false; // Traité séparément
                        }
                        // Zone de hautes herbes - collecter TOUS les meshes grass
                        else if (m.name.includes("grassField") || m.name.includes("GrassField") || m.name.includes("grass")) {
                            grassMeshes.push(m);
                            m.isVisible = true; // Garder visible
                            m.checkCollisions = false; // Pas de collision physique
                        }
                        // Regrouper les éléments par type
                        else if (m.name.startsWith("TreeLineBack")) {
                            collisionGroups.treesBack.meshes.push(m);
                            m.checkCollisions = false; // Désactiver collision individuelle
                        }
                        else if (m.name.startsWith("TreeLineLeft")) {
                            collisionGroups.treesLeft.meshes.push(m);
                            m.checkCollisions = false;
                        }
                        else if (m.name.startsWith("TreeLineRight")) {
                            collisionGroups.treesRight.meshes.push(m);
                            m.checkCollisions = false;
                        }
                        else if (m.name.startsWith("house1")) {
                            collisionGroups.house1.meshes.push(m);
                            m.checkCollisions = false;
                        }
                        else if (m.name.startsWith("house2")) {
                            collisionGroups.house2.meshes.push(m);
                            m.checkCollisions = false;
                        }
                        else if (m.name.startsWith("fence")) {
                            individualFences.push(m); // Chaque fence a sa propre collision
                            m.checkCollisions = false;
                        }
                        // Autres meshes: collisions normales
                        else {
                            m.checkCollisions = true;
                        }
                    }
                });
                
                // Mode debug pour voir les boîtes de collision
                const DEBUG_COLLISIONS = false;
                
                // Créer des boîtes de collision individuelles pour chaque fence
                // ⚠️ DÉSACTIVÉ - Fences sans collision
                /*
                individualFences.forEach((fenceMesh, index) => {
                    fenceMesh.computeWorldMatrix(true);
                    const bounds = fenceMesh.getBoundingInfo();
                    const worldMin = bounds.boundingBox.minimumWorld;
                    const worldMax = bounds.boundingBox.maximumWorld;
                    
                    const width = worldMax.x - worldMin.x || 1;
                    const depth = worldMax.z - worldMin.z || 1;
                    const height = (worldMax.y - worldMin.y) || 2;
                    
                    const collisionBox = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox(`collision_fence_${index}`, {
                            width: width,
                            height: height,
                            depth: depth
                        }, scene)
                    );
                    
                    collisionBox.position = new BABYLON.Vector3(
                        (worldMin.x + worldMax.x) / 2,
                        (worldMin.y + worldMax.y) / 2,
                        (worldMin.z + worldMax.z) / 2
                    );
                    collisionBox.checkCollisions = true;
                    collisionBox.isVisible = DEBUG_COLLISIONS;
                    
                    if (DEBUG_COLLISIONS) {
                        const mat = new BABYLON.StandardMaterial(`debugMat_fence_${index}`, scene);
                        mat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
                        mat.alpha = 0.4;
                        collisionBox.material = mat;
                    }
                    
                    console.log(`🚧 Collision fence[${index}]:`, {
                        name: fenceMesh.name,
                        size: `${width.toFixed(2)} x ${height.toFixed(2)} x ${depth.toFixed(2)}`,
                        position: collisionBox.position.toString()
                    });
                });
                */
                
                // Créer la collision pour le portail vers la forêt (gate)
                if (gateForForest) {
                    gateForForest.computeWorldMatrix(true);
                    const gateBounds = gateForForest.getBoundingInfo();
                    const gateMin = gateBounds.boundingBox.minimumWorld;
                    const gateMax = gateBounds.boundingBox.maximumWorld;
                    
                    const gateCollision = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox("collision_gate", {
                            width: (gateMax.x - gateMin.x) || 2,
                            height: (gateMax.y - gateMin.y) || 3,
                            depth: (gateMax.z - gateMin.z) || 2
                        }, scene)
                    );
                    
                    gateCollision.position = new BABYLON.Vector3(
                        (gateMin.x + gateMax.x) / 2,
                        (gateMin.y + gateMax.y) / 2,
                        (gateMin.z + gateMax.z) / 2
                    );
                    
                    // Créer la zone d'interaction pour la porte
                    // spawnPoint: où apparaître dans la VILLE en revenant de la forêt (3 unités devant le gate)
                    const gateSpawnPoint = new BABYLON.Vector3(
                        gateCollision.position.x,
                        0.9,
                        gateCollision.position.z + 3  // 3 unités devant le gate (côté ville)
                    );
                    addDoor(gateCollision, "foret", new BABYLON.Vector3(0, 0.9, -25), gateSpawnPoint);

                    // Créer un cylindre de point de spawn/retour devant le gate
                    const gateSpawnMarker = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateCylinder("spawnPoint_gate", {
                            diameter: 1.5,
                            height: 0.2
                        }, scene)
                    );
                    gateSpawnMarker.position = gateSpawnPoint.clone();
                    gateSpawnMarker.isVisible = false; // Invisible en production
                    gateSpawnMarker.checkCollisions = false; // Pas de collision
                    
                    console.log(`📍 Point de spawn créé devant le gate:`, {
                        position: gateSpawnMarker.position.toString()
                    });
                    
                    console.log(`🚪 Collision gate (vers forêt):`, {
                        size: `${(gateMax.x - gateMin.x).toFixed(2)} x ${(gateMax.y - gateMin.y).toFixed(2)} x ${(gateMax.z - gateMin.z).toFixed(2)}`,
                        position: gateCollision.position.toString()
                    });
                }
                
                // Hauteurs uniformes pour chaque type
                const uniformHeights = {
                    treesBack: 5,    // Collision active maintenant
                    treesLeft: 5,
                    treesRight: 5,
                    house1: 4,
                    house2: 4
                };
                
                // Créer des boîtes de collision pour chaque groupe
                let treesLeftBounds = null;
                let treesRightBounds = null;
                
                Object.keys(collisionGroups).forEach(groupName => {
                    const group = collisionGroups[groupName];
                    if (group.meshes.length === 0) return;
                    
                    // Calculer les bounds du groupe
                    let minX = Infinity, minY = Infinity, minZ = Infinity;
                    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
                    
                    group.meshes.forEach(m => {
                        m.computeWorldMatrix(true);
                        const bounds = m.getBoundingInfo();
                        const worldMin = bounds.boundingBox.minimumWorld;
                        const worldMax = bounds.boundingBox.maximumWorld;
                        
                        minX = Math.min(minX, worldMin.x);
                        minY = Math.min(minY, worldMin.y);
                        minZ = Math.min(minZ, worldMin.z);
                        maxX = Math.max(maxX, worldMax.x);
                        maxY = Math.max(maxY, worldMax.y);
                        maxZ = Math.max(maxZ, worldMax.z);
                    });
                    
                    // Sauvegarder les bounds de treesLeft et treesRight
                    if (groupName === 'treesLeft') {
                        treesLeftBounds = { minX, minY, minZ, maxX, maxY, maxZ };
                    } else if (groupName === 'treesRight') {
                        treesRightBounds = { minX, minY, minZ, maxX, maxY, maxZ };
                    }
                    
                    // Paramètres spécifiques selon le type
                    let width = maxX - minX;
                    let depth = maxZ - minZ;
                    const height = uniformHeights[groupName];
                    
                    // Réductions spécifiques par groupe
                    if (groupName === 'treesBack') {
                        width *= 1;   // Moitié moins large
                        depth *= 0.333; // Réduit de 2/3
                    } else if (groupName === 'treesLeft' || groupName === 'treesRight') {
                        width *= 0.4;
                    }
                    
                    // Créer une boîte invisible pour la collision
                    const collisionBox = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox(`collision_${groupName}`, {
                            width: width,
                            height: height,
                            depth: depth
                        }, scene)
                    );
                    
                    // Position adaptée selon le type
                    let posX = (minX + maxX) / 2;  // Centré par défaut
                    if (groupName === 'treesBack') {
                        posX = minX + width/1.05;   // Décaler vers la gauche
                    }
                    
                    collisionBox.position = new BABYLON.Vector3(
                        posX,
                        minY + height / 2,  // Positionner depuis le sol
                        (minZ + maxZ) / 2
                    );
                    collisionBox.checkCollisions = true;
                    collisionBox.isVisible = DEBUG_COLLISIONS;
                    
                    if (DEBUG_COLLISIONS) {
                        const mat = new BABYLON.StandardMaterial(`debugMat_${groupName}`, scene);
                        mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
                        mat.alpha = 0.3;
                        collisionBox.material = mat;
                    }
                    
                    // Dupliquer la barrière treesBack à minX
                    if (groupName === 'treesBack') {
                        const collisionBox3 = registerZoneMesh(
                            BABYLON.MeshBuilder.CreateBox(`collision_${groupName}_3`, {
                                width: width,
                                height: height,
                                depth: depth
                            }, scene)
                        );
                        
                        collisionBox3.position = new BABYLON.Vector3(
                            minX - 5,  // Position à minX exactement
                            minY + height / 2,
                            (minZ + maxZ) / 2
                        );
                        collisionBox3.checkCollisions = true;
                        collisionBox3.isVisible = DEBUG_COLLISIONS;
                        
                        if (DEBUG_COLLISIONS) {
                            const mat3 = new BABYLON.StandardMaterial(`debugMat_${groupName}_3`, scene);
                            mat3.diffuseColor = new BABYLON.Color3(1, 1, 0);
                            mat3.alpha = 0.3;
                            collisionBox3.material = mat3;
                        }
                        
                        console.log(`🌳 Collision ${groupName}_3:`, {
                            position: collisionBox3.position.toString()
                        });
                    }
                    
                    const icon = groupName.startsWith('trees') ? '🌳' : 
                                 groupName.startsWith('house') ? '🏠' : '🚧';
                    console.log(`${icon} Collision ${groupName}:`, {
                        meshes: group.meshes.length,
                        size: `${width.toFixed(1)} x ${height} x ${depth.toFixed(1)}`,
                        position: collisionBox.position.toString()
                    });
                });
                
                // Créer une barrière derrière les maisons reliant treesLeft à treesRight
                if (treesLeftBounds && treesRightBounds) {
                    const backBarrier = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox("collision_backBarrier", {
                            width: Math.abs(treesRightBounds.maxX - treesLeftBounds.minX),  // De left à right
                            height: 5,  // Hauteur standard
                            depth: 1    // Fine profondeur
                        }, scene)
                    );
                    
                    backBarrier.position = new BABYLON.Vector3(
                        (treesLeftBounds.minX + treesRightBounds.maxX)/1.7,  // Entre left et right
                        3,  // Milieu de la hauteur
                        8   // Derrière les maisons
                    );
                    backBarrier.checkCollisions = true;
                    backBarrier.isVisible = DEBUG_COLLISIONS;
                    
                    if (DEBUG_COLLISIONS) {
                        const mat = new BABYLON.StandardMaterial("debugMat_backBarrier", scene);
                        mat.diffuseColor = new BABYLON.Color3(1, 0, 1);  // Magenta
                        mat.alpha = 0.3;
                        backBarrier.material = mat;
                    }
                    
                    console.log(`🚪 Barrière arrière:`, {
                        position: backBarrier.position.toString(),
                        width: Math.abs(treesRightBounds.maxX - treesLeftBounds.minX).toFixed(1)
                    });
                }
                
                // Créer zone de hautes herbes si des meshes grass existent
                if (grassMeshes.length > 0) {
                    console.log(`🌿 ${grassMeshes.length} meshes d'herbe détectés`);
                    
                    // Calculer les limites globales en parcourant tous les meshes grass
                    let globalMin = new BABYLON.Vector3(Infinity, Infinity, Infinity);
                    let globalMax = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
                    
                    grassMeshes.forEach((gMesh) => {
                        gMesh.computeWorldMatrix(true);
                        gMesh.refreshBoundingInfo();
                        
                        // Obtenir les limites de chaque mesh
                        const bounds = gMesh.getBoundingInfo();
                        const min = bounds.boundingBox.minimumWorld;
                        const max = bounds.boundingBox.maximumWorld;
                        
                        // Étendre les limites globales
                        globalMin.x = Math.min(globalMin.x, min.x);
                        globalMin.y = Math.min(globalMin.y, min.y);
                        globalMin.z = Math.min(globalMin.z, min.z);
                        
                        globalMax.x = Math.max(globalMax.x, max.x);
                        globalMax.y = Math.max(globalMax.y, max.y);
                        globalMax.z = Math.max(globalMax.z, max.z);
                    });
                    
                    const width = globalMax.x - globalMin.x;
                    const height = globalMax.y - globalMin.y;
                    const depth = globalMax.z - globalMin.z;
                    
                    // Augmenter la largeur et la profondeur de 50% pour une meilleure couverture
                    const expandedWidth = width * 1.5;
                    const expandedDepth = depth * 1.5;
                    
                    // Créer une boîte invisible pour la détection de hautes herbes
                    const grassCollisionZone = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox("grassZone", {
                            width: expandedWidth,
                            height: height,
                            depth: expandedDepth
                        }, scene)
                    );
                    
                    grassCollisionZone.position = new BABYLON.Vector3(
                        (globalMin.x + globalMax.x) / 2,
                        (globalMin.y + globalMax.y) / 2,
                        (globalMin.z + globalMax.z) / 2
                    );
                    grassCollisionZone.isVisible = false; // Invisible
                    grassCollisionZone.checkCollisions = false; // Pas de collision physique
                    
                    console.log(`🌿 Zone hautes herbes globale créée:`, {
                        meshCount: grassMeshes.length,
                        dimensions: `${expandedWidth.toFixed(2)} x ${height.toFixed(2)} x ${expandedDepth.toFixed(2)}`,
                        originalDimensions: `${width.toFixed(2)} x ${height.toFixed(2)} x ${depth.toFixed(2)}`,
                        expansion: '150%',
                        position: grassCollisionZone.position.toString(),
                        min: globalMin.toString(),
                        max: globalMax.toString()
                    });
                    
                    // Appliquer la mécanique TallGrass à la zone invisible
                    addTallGrass(grassCollisionZone);
                }
                
                // ✅ Créer la porte d'entrée de la maison de droite (house1)
                // Position basée sur house1: {X: 1.3931178462252944 Y: 1.9839543960821402 Z: 8.63677465349598}
                const houseDoor = registerZoneMesh(
                    BABYLON.MeshBuilder.CreateBox("doorVilleHouse", {
                        width: 2,
                        height: 2.5,
                        depth: 0.5
                    }, scene)
                );
                houseDoor.position = new BABYLON.Vector3(1.4, 1.25, 6.5);  // Devant la maison de droite
                
                // Créer le cylindre de spawn devant la maison
                const houseVilleSpawnMarker = registerZoneMesh(
                    BABYLON.MeshBuilder.CreateCylinder("spawnPoint_villeHouse", {
                        diameter: 1.5,
                        height: 0.2
                    }, scene)
                );
                houseVilleSpawnMarker.position = new BABYLON.Vector3(1.4, 0.9, 5);
                houseVilleSpawnMarker.isVisible = false;
                houseVilleSpawnMarker.checkCollisions = false;
                
                console.log(`🚪 Porte maison de droite créée:`, {
                    position: houseDoor.position.toString(),
                    spawnPoint: houseVilleSpawnMarker.position.toString()
                });
                
                // Ajouter la porte vers la zone house (intérieur)
                addDoor(houseDoor, "house", new BABYLON.Vector3(0, 0.9, -3), houseVilleSpawnMarker.position.clone());
            },
            null,
            (scene, msg, err) => console.error("❌ Erreur GLB:", msg, err)
        );

        /* ⚠️ GÉOMÉTRIES MANUELLES DÉSACTIVÉES - Le GLB contient tout
        // Créer une maison simple (à retirer si le GLB en contient une)
        const house = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("houseBody", {
                width: 6,
                height: 3,
                depth: 6
            }, scene)
        );
        house.position = new BABYLON.Vector3(0, 1.5, -10);
        house.checkCollisions = true;
        console.log("🏠 Maison créée à:", house.position.toString());

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
        */

        // ⚠️ PORTES TEMPORAIREMENT DÉSACTIVÉES - À repositionner selon le GLB
        /* const doorMaison = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("doorVilleMaison1", {
                width: 2,
                height: 2.5,
                depth: 0.5
            }, scene)
        );
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
        */

        /* ⚠️ NPCs ET ITEMS TEMPORAIREMENT DÉSACTIVÉS - À repositionner après ajustement du GLB
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
        npcIconMat.diffuseTexture = new BABYLON.Texture("./Assets/icons/Point-exclamation.png", scene);
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
            "Salut ! Je suis le formateur.\nVas dans la maison pour découvrir ta formation sous forme de Digiters !"
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
        */
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
        // spawnPoint: 3 unités devant la porte pour apparaître devant la maison
        addDoor(exitDoor, "ville", new BABYLON.Vector3(0,0.9,-6), new BABYLON.Vector3(0,0.9,1.5));
    }

    // ------- ZONE : HOUSE (Intérieur maison de droite) -------
    function setupZoneHouse() {
        currentZone = "house";

        console.log("🏠 Configuration zone HOUSE - Chargement HouseZone.glb...");

        // Charger le GLB de l'intérieur de la maison
        BABYLON.SceneLoader.ImportMesh(
            "",
            "./Assets/models/zones/",
            "HouseZone.glb",
            scene,
            (meshes) => {
                console.log(`✅ HouseZone.glb chargé! ${meshes.length} meshes importés`);
                
                let doorMesh = null;
                let bedMesh = null;  // ✅ Détecter le lit
                
                let pcMesh = null;  // ✅ Détecter le PC
                let pcScreenMesh = null;  // ✅ Détecter l'écran du PC
                
                // D'abord, parcourir les meshes pour identifier la porte, le lit et le PC
                meshes.forEach((m) => {
                    if (m instanceof BABYLON.Mesh && m.name !== "__root__") {
                        registerZoneMesh(m);
                        console.log(`  - Mesh: ${m.name}`);
                        
                        const nameLower = m.name.toLowerCase();
                        
                        // Détecter le mesh "door" pour positionner la porte de sortie
                        if (nameLower.includes("door")) {
                            doorMesh = m;
                            m.checkCollisions = false;
                        } 
                        // ✅ Détecter le lit
                        else if (nameLower.includes("lit") || nameLower.includes("bed")) {
                            bedMesh = m;
                            m.checkCollisions = false;
                            console.log(`🛏️ Lit détecté: ${m.name}`);
                        }
                        // ✅ Détecter l'écran du PC (prioritaire)
                        else if (nameLower.includes("pcscreen") || nameLower.includes("pc_screen") || nameLower.includes("screen")) {
                            pcScreenMesh = m;
                            m.checkCollisions = false;
                            console.log(`🖥️ Écran PC détecté: ${m.name}`);
                        }
                        // ✅ Détecter le PC/ordinateur (fallback)
                        else if (nameLower.includes("pc") || nameLower.includes("computer") || nameLower.includes("ordi")) {
                            pcMesh = m;
                            m.checkCollisions = false;
                            console.log(`🖥️ PC détecté: ${m.name}`);
                        }
                        else if (nameLower.includes("floor") || nameLower.includes("ground")) {
                            m.checkCollisions = false;
                        } else {
                            m.checkCollisions = false;
                        }
                    }
                });
                
                // ✅ Créer le PC interactable - priorité à l'écran, sinon le PC
                const targetPCMesh = pcScreenMesh || pcMesh;
                if (targetPCMesh) {
                    targetPCMesh.computeWorldMatrix(true);
                    targetPCMesh.refreshBoundingInfo();
                    
                    // Utiliser le bounding box pour obtenir le centre réel en coordonnées monde
                    const bounds = targetPCMesh.getBoundingInfo();
                    const bMin = bounds.boundingBox.minimumWorld;
                    const bMax = bounds.boundingBox.maximumWorld;
                    
                    // Centre du bounding box en coordonnées monde
                    const pcCenterX = (bMin.x + bMax.x) / 2;
                    const pcCenterY = (bMin.y + bMax.y) / 2;
                    const pcCenterZ = (bMin.z + bMax.z) / 2;
                    const pcWorldPos = new BABYLON.Vector3(pcCenterX, pcCenterY, pcCenterZ);
                    
                    console.log(`🖥️ Mesh ${targetPCMesh.name} bounds:`, {
                        min: `(${bMin.x.toFixed(2)}, ${bMin.y.toFixed(2)}, ${bMin.z.toFixed(2)})`,
                        max: `(${bMax.x.toFixed(2)}, ${bMax.y.toFixed(2)}, ${bMax.z.toFixed(2)})`,
                        center: pcWorldPos.toString()
                    });
                    
                    // Créer une zone d'interaction autour du PC/écran
                    const pcInteraction = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox("pc_interaction", {
                            width: 1.5,
                            height: 0.5,
                            depth: 1.5
                        }, scene)
                    );
                    pcInteraction.position = pcWorldPos.clone();
                    pcInteraction.isVisible = false;
                    
                    // 🌐 URL du site web à afficher (MODIFIEZ ICI)
                    addComputer(pcInteraction, "https://www.interface-media.com/");
                    
                    console.log(`🖥️ PC interactable créé à: ${pcWorldPos.toString()} (basé sur ${targetPCMesh.name})`);
                }
                
                // ✅ Mettre à jour la position du lit si trouvé
                if (bedMesh) {
                    bedMesh.computeWorldMatrix(true);
                    bedMesh.refreshBoundingInfo();
                    
                    // Utiliser le bounding box pour le centre du lit
                    const bedBounds = bedMesh.getBoundingInfo();
                    const bedMin = bedBounds.boundingBox.minimumWorld;
                    const bedMax = bedBounds.boundingBox.maximumWorld;
                    
                    const bedCenterX = (bedMin.x + bedMax.x) / 2;
                    const bedCenterY = (bedMin.y + bedMax.y) / 2;
                    const bedCenterZ = (bedMin.z + bedMax.z) / 2;
                    const bedWorldPos = new BABYLON.Vector3(bedCenterX, bedCenterY, bedCenterZ);
                    
                    // Position de spawn au pied du lit
                    bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.9, bedWorldPos.z + 2);
                    zoneSpawnPoints.house.atBed = bedPosition.clone();
                    
                    // Créer la zone d'interaction pour le lit (petite hauteur)
                    const bedInteraction = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox("bed_interaction", {
                            width: Math.abs(bedMax.x - bedMin.x) || 1.5,
                            height: 0.5,
                            depth: Math.abs(bedMax.z - bedMin.z) || 1.5
                        }, scene)
                    );
                    bedInteraction.position = bedWorldPos.clone();
                    bedInteraction.isVisible = false;
                    
                    // Ajouter le lit comme interactable
                    addBed(bedInteraction);
                    
                    console.log(`🛏️ Lit interactable créé à: ${bedWorldPos.toString()}`);
                }
                
                // Créer la porte de sortie et positionner le joueur D'ABORD
                let spawnPosition = new BABYLON.Vector3(0, 0.9, 0); // Position par défaut au centre
                
                if (doorMesh) {
                    doorMesh.computeWorldMatrix(true);
                    doorMesh.refreshBoundingInfo();
                    const doorBounds = doorMesh.getBoundingInfo();
                    const doorWorldPos = doorMesh.getAbsolutePosition();
                    
                    console.log(`🚪 Mesh door trouvé à:`, doorWorldPos.toString());
                    
                    // Créer la zone d'interaction pour la porte de sortie (petite profondeur)
                    const exitDoor = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox("doorHouseVille", {
                            width: doorBounds.boundingBox.extendSize.x * 2 || 1.5,
                            height: doorBounds.boundingBox.extendSize.y * 2 || 2.5,
                            depth: 0.3
                        }, scene)
                    );
                    exitDoor.position = doorWorldPos.clone();
                    exitDoor.isVisible = false;
                    
                    // Le spawn point est DEVANT la porte (vers l'intérieur de la pièce)
                    // La porte est généralement vers Z positif, donc l'intérieur est vers Z négatif
                    spawnPosition = new BABYLON.Vector3(
                        doorWorldPos.x,
                        0.9,
                        doorWorldPos.z + 2  // 2 unités vers l'intérieur (Z positif = intérieur)
                    );
                    
                    const houseSpawnMarker = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateCylinder("spawnPoint_house", {
                            diameter: 1.5,
                            height: 0.2
                        }, scene)
                    );
                    houseSpawnMarker.position = spawnPosition.clone();
                    houseSpawnMarker.isVisible = false;
                    houseSpawnMarker.checkCollisions = false;
                    
                    console.log(`📍 Point de spawn dans house:`, {
                        position: houseSpawnMarker.position.toString()
                    });
                    
                    addDoor(exitDoor, "ville", new BABYLON.Vector3(1.4, 0.9, 5), spawnPosition.clone());
                } else {
                    console.log("⚠️ Mesh door non trouvé, création porte par défaut");
                    
                    const exitDoor = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox("doorHouseVille", {
                            width: 2,
                            height: 2.5,
                            depth: 0.3
                        }, scene)
                    );
                    exitDoor.position = new BABYLON.Vector3(0, 1.25, 4.5);
                    exitDoor.isVisible = false;
                    
                    spawnPosition = new BABYLON.Vector3(0, 0.9, 2.5);
                    
                    const houseSpawnMarker = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateCylinder("spawnPoint_house", {
                            diameter: 1.5,
                            height: 0.2
                        }, scene)
                    );
                    houseSpawnMarker.position = spawnPosition.clone();
                    houseSpawnMarker.isVisible = false;
                    houseSpawnMarker.checkCollisions = false;
                    
                    addDoor(exitDoor, "ville", new BABYLON.Vector3(1.4, 0.9, 5), spawnPosition.clone());
                }
                
                // Positionner le joueur AU CENTRE de la pièce (loin des murs)
                playerCollider.position = spawnPosition.clone();
                console.log(`👤 Joueur positionné à:`, playerCollider.position.toString());
                
                // Collisions uniquement pour les objets spécifiques (à définir manuellement)
                // Liste des objets qui doivent avoir des collisions
                const objectsWithCollision = [
                    // Murs (séparés des meubles)
                    "wall", "mur", "walls", "murs",
                    // Fenêtres
                    "window", "fenetre", "fenêtre", "windows",
                    // Tables
                    "table", "tables", "desk", "bureau",
                    // Bibliothèque/Librairie/Meubles (séparés des murs)
                    "librairie", "library", "biblio", "shelf", "bookshelf", "etagere", "étagère",
                    "meuble", "furniture", "armoire", "commode", "buffet", "placard",
                    // Cabinet
                    "cabinet",
                    // Lit
                    "lit", "bed",
                    // Évier
                    "evier", "sink",
                    // Tabourets (chaque tabouret aura sa propre collision)
                    "tabouret", "stool", "chair", "chaise", "siege", "siège",
                    // Porte (pour collision)
                    "door", "porte"
                ];
                
                // Variables pour stocker les limites du sol
                let floorMinX = Infinity, floorMinZ = Infinity;
                let floorMaxX = -Infinity, floorMaxZ = -Infinity;
                let floorFound = false;
                
                // Trouver les limites du sol
                meshes.forEach((m) => {
                    if (m instanceof BABYLON.Mesh && m.name !== "__root__") {
                        const nameLower = m.name.toLowerCase();
                        
                        if (nameLower.includes("floor") || nameLower.includes("ground") || nameLower.includes("sol")) {
                            m.computeWorldMatrix(true);
                            m.refreshBoundingInfo();
                            const bounds = m.getBoundingInfo();
                            const bMin = bounds.boundingBox.minimumWorld;
                            const bMax = bounds.boundingBox.maximumWorld;
                            
                            floorMinX = Math.min(floorMinX, bMin.x);
                            floorMinZ = Math.min(floorMinZ, bMin.z);
                            floorMaxX = Math.max(floorMaxX, bMax.x);
                            floorMaxZ = Math.max(floorMaxZ, bMax.z);
                            floorFound = true;
                            
                            console.log(`📐 Sol détecté (${m.name}):`, {
                                min: `(${bMin.x.toFixed(2)}, ${bMin.z.toFixed(2)})`,
                                max: `(${bMax.x.toFixed(2)}, ${bMax.z.toFixed(2)})`
                            });
                        }
                    }
                });
                
                setTimeout(() => {
                    // ✅ Mur à droite (hardcodé)
                    const rightWall = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox("wall_right_manual", {
                            width: 0.5,
                            height: 3,
                            depth: 6
                        }, scene)
                    );
                    rightWall.position = new BABYLON.Vector3(-6.2, 1.5, -1);
                    rightWall.checkCollisions = true;
                    rightWall.isVisible = true;
                    rightWall.material = new BABYLON.StandardMaterial("rightWallMat", scene);
                    rightWall.material.diffuseColor = new BABYLON.Color3(0, 0, 0);
                    rightWall.material.alpha = 0;
                    console.log(`🧱 Mur droit créé à X=-4.5`);
                    
                    // ✅ Mur en bas (hardcodé)
                    const bottomWall = registerZoneMesh(
                        BABYLON.MeshBuilder.CreateBox("wall_bottom_manual", {
                            width: 15,
                            height: 3,
                            depth: 0.5
                        }, scene)
                    );
                    bottomWall.position = new BABYLON.Vector3(0, 1.5, 2);
                    bottomWall.checkCollisions = true;
                    bottomWall.isVisible = true;
                    bottomWall.material = new BABYLON.StandardMaterial("bottomWallMat", scene);
                    bottomWall.material.diffuseColor = new BABYLON.Color3(0, 0, 0);
                    bottomWall.material.alpha = 0;
                    console.log(`🧱 Mur bas créé à Z=4.5`);
                    
                    // Créer les collisions INDIVIDUELLES pour chaque mesh spécifique
                    meshes.forEach((m) => {
                        if (m instanceof BABYLON.Mesh && m.name !== "__root__") {
                            const nameLower = m.name.toLowerCase();
                            
                            // Vérifier si ce mesh doit avoir une collision
                            const shouldHaveCollision = objectsWithCollision.some(obj => nameLower.includes(obj));
                            
                            if (!shouldHaveCollision) {
                                console.log(`❌ Pas de collision pour: ${m.name}`);
                                return;
                            }
                            
                            m.computeWorldMatrix(true);
                            m.refreshBoundingInfo();
                            const bounds = m.getBoundingInfo();
                            const bMin = bounds.boundingBox.minimumWorld;
                            const bMax = bounds.boundingBox.maximumWorld;
                            
                            let width = Math.abs(bMax.x - bMin.x) || 0.5;
                            let depth = Math.abs(bMax.z - bMin.z) || 0.5;
                            const height = 3;  // Hauteur fixe de 3m
                            
                            // Pour les murs, augmenter l'épaisseur minimum
                            const isWall = nameLower.includes("wall") || nameLower.includes("mur");
                            if (isWall) {
                                // Épaisseur minimum de 0.6 pour les murs
                                if (width < 0.6) width = 0.6;
                                if (depth < 0.6) depth = 0.6;
                            }
                            
                            const boxCenterX = (bMin.x + bMax.x) / 2;
                            const boxCenterZ = (bMin.z + bMax.z) / 2;
                            
                            const collisionBox = registerZoneMesh(
                                BABYLON.MeshBuilder.CreateBox(`collision_${m.name}`, {
                                    width: width,
                                    height: height,
                                    depth: depth
                                }, scene)
                            );
                            
                            collisionBox.position = new BABYLON.Vector3(
                                boxCenterX,
                                height / 2,
                                boxCenterZ
                            );
                            collisionBox.checkCollisions = true;
                            collisionBox.isVisible = false;
                            
                            console.log(`🧱 Collision créée pour ${m.name}:`, {
                                size: `${width.toFixed(2)} x ${height} x ${depth.toFixed(2)}`,
                                position: collisionBox.position.toString()
                            });
                        }
                    });
                    console.log(`✅ Collisions de la maison activées`);
                }, 100);
            },
            null,
            (scene, msg, err) => console.error("❌ Erreur GLB HouseZone:", msg, err)
        );
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

        // ✅ Modèles pour la forêt quantique
        const forestModels = [
            "rock.glb",
            "pine.glb",
            "oak.glb",
            "cyprus.glb"
        ];

        // ✅ Créer les murs de collision avec des noms spécifiques
        const mapSize = 60;
        const halfMap = mapSize / 2;
        const wallHeight = 3;
        
        // Mur du fond (Back) - Z positif
        const wallBack = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("wallBack", {width: mapSize, height: wallHeight, depth: 1}, scene)
        );
        wallBack.position = new BABYLON.Vector3(0, wallHeight/2, halfMap);
        wallBack.checkCollisions = true;
        wallBack.isVisible = false;

        // Mur de devant (Front) - Z négatif
        const wallFront = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("wallFront", {width: mapSize, height: wallHeight, depth: 1}, scene)
        );
        wallFront.position = new BABYLON.Vector3(0, wallHeight/2, -halfMap);
        wallFront.checkCollisions = true;
        wallFront.isVisible = false;

        // Mur de droite (Right) - X positif
        const wallRight = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("wallRight", {width: 1, height: wallHeight, depth: mapSize}, scene)
        );
        wallRight.position = new BABYLON.Vector3(halfMap, wallHeight/2, 0);
        wallRight.checkCollisions = true;
        wallRight.isVisible = false;

        // Mur de gauche (Left) - X négatif
        const wallLeft = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("wallLeft", {width: 1, height: wallHeight, depth: mapSize}, scene)
        );
        wallLeft.position = new BABYLON.Vector3(-halfMap, wallHeight/2, 0);
        wallLeft.checkCollisions = true;
        wallLeft.isVisible = false;

        // ✅ Charger les murs visuels alignés sur les boîtes de collision
        const wallSpacing = 12; // Espacement entre chaque modèle de mur

        // Murs horizontaux (ForestWallL) - Back et Front (étendus en largeur)
        for (let x = -halfMap; x <= halfMap; x += wallSpacing) {
            // Mur du fond (wallBack)
            BABYLON.SceneLoader.ImportMesh("", "./Assets/models/quantic-forest/", "ForestWallL.glb", scene, (meshes) => {
                if (meshes.length > 0) {
                    const root = meshes[0];
                    root.position = new BABYLON.Vector3(x-10, 0, 50);
                    root.checkCollisions = false;
                    registerZoneMesh(root);
                }
            });
            // Mur de devant (wallFront)
            BABYLON.SceneLoader.ImportMesh("", "./Assets/models/quantic-forest/", "ForestWallL.glb", scene, (meshes) => {
                if (meshes.length > 0) {
                    const root = meshes[0];
                    root.position = new BABYLON.Vector3(x -30, 0, -15);
                    root.rotation.y = Math.PI; // Tourné vers l'intérieur
                    root.checkCollisions = false;
                    registerZoneMesh(root);
                }
            });
        }

        // Murs verticaux (ForestWallH) - Left et Right (étendus en profondeur)
        for (let z = -halfMap; z <= halfMap; z += wallSpacing) {
            // Mur de droite (wallRight)
            BABYLON.SceneLoader.ImportMesh("", "./Assets/models/quantic-forest/", "ForestWallH.glb", scene, (meshes) => {
                if (meshes.length > 0) {
                    const root = meshes[0];
                    root.position = new BABYLON.Vector3(37, 0, z + 20);
                    root.rotation.y = -Math.PI / 2; // Orienté vers l'intérieur
                    root.checkCollisions = false;
                    registerZoneMesh(root);
                }
            });
            // Mur de gauche (wallLeft)
            BABYLON.SceneLoader.ImportMesh("", "./Assets/models/quantic-forest/", "ForestWallH.glb", scene, (meshes) => {
                if (meshes.length > 0) {
                    const root = meshes[0];
                    root.position = new BABYLON.Vector3(-30, 0, z +20);
                    root.rotation.y = Math.PI / 2; // Orienté vers l'intérieur
                    root.checkCollisions = false;
                    registerZoneMesh(root);
                }
            });
        }

        // ✅ Charger les arbres/rochers sans collision
        // Placer les objets en respectant les 4 coins fournis :
        // haut gauche  : x=29.10  y=0.90 z=-29.10
        // haut droite  : x=-29.10 y=0.90 z=-29.10
        // bas droite   : x=-29.10 y=0.90 z=29.10
        // bas gauche   : x=29.10  y=0.90 z=29.10
        const minX = -60, maxX = 0;
        const minZ = -29.10, maxZ = 39;
        const SPAWN_Y = 0; // hauteur demandée

        // Eviter les doublons : garder une liste des positions placées
        const MIN_SEPARATION = 3.0; // distance minimale entre objets
        const MIN_SEPARATION_SQ = MIN_SEPARATION * MIN_SEPARATION;
        const MAX_ATTEMPTS = 20;
        const placed = [];

        for (let i = 0; i < 50; i++) {
            let posX, posZ;
            let placedOk = false;
            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                posX = Math.random() * (maxX - minX) + minX;
                posZ = Math.random() * (maxZ - minZ) + minZ;

                let collide = false;
                for (let p of placed) {
                    const dx = posX - p.x;
                    const dz = posZ - p.z;
                    if (dx*dx + dz*dz < MIN_SEPARATION_SQ) { collide = true; break; }
                }
                if (!collide) { placedOk = true; break; }
            }

            if (!placedOk) continue; // skip if we couldn't find a free spot

            placed.push({x: posX, z: posZ});
            const randomModel = forestModels[Math.floor(Math.random() * forestModels.length)];

            BABYLON.SceneLoader.ImportMesh("", "./Assets/models/quantic-forest/", randomModel, scene, (meshes) => {
                if (meshes.length > 0) {
                    const root = meshes[0];
                    root.position = new BABYLON.Vector3(posX, SPAWN_Y, posZ);
                    root.rotation.y = Math.random() * Math.PI * 2;
                    root.checkCollisions = false;
                    registerZoneMesh(root);
                    
                    // Créer un cylindre de collision basé sur le bounding box du mesh
                    root.computeWorldMatrix(true);
                    const boundingVectors = root.getHierarchyBoundingVectors(true);
                    
                    // Calculer le diamètre (max entre largeur X et profondeur Z)
                    const sizeX = boundingVectors.max.x - boundingVectors.min.x;
                    const sizeZ = boundingVectors.max.z - boundingVectors.min.z;
                    const sizeY = boundingVectors.max.y - boundingVectors.min.y;
                    const diameter = Math.max(sizeX, sizeZ) * 0.4; // 60% du max pour un cylindre plus serré
                    
                    // Créer le cylindre de collision
                    const collisionCylinder = BABYLON.MeshBuilder.CreateCylinder("collision_tree_" + i, {
                        diameter: diameter,
                        height: sizeY
                    }, scene);
                    
                    // Positionner le cylindre au centre du mesh
                    const centerX = (boundingVectors.min.x + boundingVectors.max.x) / 2;
                    const centerZ = (boundingVectors.min.z + boundingVectors.max.z) / 2;
                    collisionCylinder.position = new BABYLON.Vector3(
                        centerX,
                        sizeY / 2,
                        centerZ
                    );
                    
                    collisionCylinder.checkCollisions = true;
                    collisionCylinder.isVisible = false; // Invisible
                    registerZoneMesh(collisionCylinder);
                }
            });
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
            "Les herbes hautes cachent des Digiters sauvages...\nAvance prudemment !"
        );

        // === PORTE DE SORTIE VERS LA VILLE ===
        // Position de la zone de collision (invisible) pour déclencher le changement de zone
        const GATE_POSITION = new BABYLON.Vector3(0, 1.25, 29);
        
        const exitToVille = registerZoneMesh(
            BABYLON.MeshBuilder.CreateBox("doorForetVille", {
                width: 4,
                height: 2.5,
                depth: 0.5
            }, scene)
        );
        exitToVille.position = GATE_POSITION.clone();
        // spawnPoint: où apparaître dans la FORÊT en revenant de la ville (devant exitToVille)
        addDoor(exitToVille, "ville", new BABYLON.Vector3(0, 0.9, 18), new BABYLON.Vector3(0, 0.9, 26));
        
        // Charger le visuel du portail (gate.glb) et le positionner sur la porte
        BABYLON.SceneLoader.ImportMesh("", "./Assets/models/quantic-forest/", "gate.glb", scene, (gmeshes) => {
            if (gmeshes.length > 0) {
                const gRoot = gmeshes[0];
                
                // Calculer le bounding box du GLB pour connaître ses dimensions
                gRoot.computeWorldMatrix(true);
                const boundingVectors = gRoot.getHierarchyBoundingVectors(true);
                const glbMinY = boundingVectors.min.y;
                const glbCenterX = (boundingVectors.min.x + boundingVectors.max.x) / 2;
                const glbCenterZ = (boundingVectors.min.z + boundingVectors.max.z) / 2;
                
                // Calculer l'offset pour centrer le GLB sur GATE_POSITION
                // et placer sa base (minY) au sol (Y=0)
                const offsetX = GATE_POSITION.x - glbCenterX;
                const offsetY = -glbMinY; // Placer la base au sol
                const offsetZ = GATE_POSITION.z - glbCenterZ;
                
                gRoot.position = new BABYLON.Vector3(offsetX, offsetY, offsetZ);
                gRoot.checkCollisions = false;
                registerZoneMesh(gRoot);
                
                console.log("🚪 Gate GLB - Bounding:", {
                    min: boundingVectors.min.toString(),
                    max: boundingVectors.max.toString()
                });
                console.log("🚪 Gate GLB positionné à:", gRoot.position.toString());
            }
        });
    }

    // ===== ANTI-SPAM CHANGEMENT DE ZONE =====
    let isZoneTransitioning = false;
    const ZONE_TRANSITION_COOLDOWN = 2000; // 2 secondes minimum entre deux transitions (protection téléportation hors map)

    // ===== AFFICHAGE NOM DE ZONE =====
    const zoneNames = {
        "ville": "🏘️ Village",
        "maison1": "🏠 Maison",
        "house": "🏠 Maison",
        "foret": "🌲 Forêt Quantique"
    };

    function showZoneName(zoneName) {
        const zoneNameEl = document.getElementById("zoneName");
        if (!zoneNameEl) return;

        const displayName = zoneNames[zoneName] || zoneName;
        zoneNameEl.textContent = displayName;
        
        // Afficher avec animation
        zoneNameEl.classList.add("show");
        
        // Masquer après 3 secondes
        setTimeout(() => {
            zoneNameEl.classList.remove("show");
        }, 3000);
    }

    async function switchZoneWithFade(targetZone, playerPos) {
        // Anti-spam : bloquer si déjà en transition
        if (isZoneTransitioning) {
            console.log("⏳ Transition en cours, action ignorée");
            return;
        }
        
        isZoneTransitioning = true;
        console.log(`🚀 Début transition vers ${targetZone}`);
        
        await fadeToBlack();
        switchZone(targetZone, playerPos);
        await fadeFromBlack();
        
        // Afficher le nom de la zone
        showZoneName(targetZone);
        
        // Cooldown avant de permettre une nouvelle transition
        setTimeout(() => {
            isZoneTransitioning = false;
            console.log("✅ Transition terminée, interactions réactivées");
        }, ZONE_TRANSITION_COOLDOWN);
    }

    function switchZone(targetZone, playerPos) {
        clearZone();
        if (targetZone === "ville") {
            setupZoneVille();
        } else if (targetZone === "maison1") {
            setupZoneMaison1();
        } else if (targetZone === "foret") {
            setupZoneForet();
        } else if (targetZone === "house") {
            setupZoneHouse();
        }
        
        // Positionner le joueur en utilisant les spawn points fixes
        if (lastZoneVisited && zoneSpawnPoints[targetZone]) {
            // Chercher le spawn point correspondant à la zone d'origine
            const spawnKey = `from${lastZoneVisited.charAt(0).toUpperCase() + lastZoneVisited.slice(1)}`;
            const spawnPoint = zoneSpawnPoints[targetZone][spawnKey];
            
            if (spawnPoint) {
                playerCollider.position = spawnPoint.clone();
                console.log(`📍 Retour de ${lastZoneVisited} vers ${targetZone}, spawn à:`, spawnPoint.toString());
            } else {
                playerCollider.position = playerPos.clone();
                console.log(`📍 Spawn point non trouvé pour from${lastZoneVisited}, utilisation targetPos`);
            }
            lastZoneVisited = null; // Effacer pour la prochaine transition
        } else if (playerPos) {
            // Première entrée dans la zone
            playerCollider.position = playerPos.clone();
            console.log(`📍 Première entrée dans ${targetZone}, utilisation targetPos:`, playerPos.toString());
        }
    }

    // ===== COMBAT : TRANSITION VERS LA SCÈNE DÉDIÉE =====
    function startCombat(options = {}) {
        // ✅ Définir le callback pour revenir au lit après une DÉFAITE (tous les Digiters KO)
        setDefeatCallback(async () => {
            console.log("🛏️ Retour au lit après la défaite...");
            playerCollider.position = bedPosition.clone();
            console.log(`👤 Joueur repositionné au lit: ${bedPosition.toString()}`);
        });
        
        // Appelle la fonction de combat.js pour initialiser une scène complètement indépendante
        initiateCombat(scene, camera, options);
    }

    // ===== SOIN AU LIT AVEC ANIMATION =====
    /**
     * Affiche un dialogue de confirmation pour le soin
     */
    function showHealConfirmation() {
        return new Promise((resolve) => {
            // Créer l'overlay de confirmation
            const confirmDiv = document.createElement("div");
            confirmDiv.id = "heal-confirm";
            confirmDiv.innerHTML = `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 3px solid #0f3460;
                    border-radius: 15px;
                    padding: 30px;
                    z-index: 1000;
                    text-align: center;
                    min-width: 300px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                ">
                    <p style="
                        color: #e94560;
                        font-size: 18px;
                        margin-bottom: 20px;
                        font-family: Arial, sans-serif;
                    "> Veux-tu te reposer et soigner tes Digiters ?</p>
                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <button id="heal-yes" style="
                            background: #2ecc71;
                            color: white;
                            border: none;
                            padding: 12px 30px;
                            border-radius: 8px;
                            font-size: 16px;
                            cursor: pointer;
                            font-weight: bold;
                            transition: all 0.2s;
                        ">✓ Oui</button>
                        <button id="heal-no" style="
                            background: #e74c3c;
                            color: white;
                            border: none;
                            padding: 12px 30px;
                            border-radius: 8px;
                            font-size: 16px;
                            cursor: pointer;
                            font-weight: bold;
                            transition: all 0.2s;
                        ">✗ Non</button>
                    </div>
                </div>
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    z-index: 999;
                "></div>
            `;
            document.body.appendChild(confirmDiv);
            
            // Gérer les clics
            const yesBtn = document.getElementById("heal-yes");
            const noBtn = document.getElementById("heal-no");
            
            const cleanup = () => {
                if (confirmDiv.parentNode) {
                    document.body.removeChild(confirmDiv);
                }
            };
            
            // Support desktop ET mobile pour Oui
            yesBtn.addEventListener("click", () => {
                cleanup();
                resolve(true);
            });
            yesBtn.addEventListener("touchend", (e) => {
                e.preventDefault();
                cleanup();
                resolve(true);
            });
            
            // Support desktop ET mobile pour Non
            noBtn.addEventListener("click", () => {
                cleanup();
                resolve(false);
            });
            noBtn.addEventListener("touchend", (e) => {
                e.preventDefault();
                cleanup();
                resolve(false);
            });
            
            // Ajouter effet hover
            yesBtn.addEventListener("mouseover", () => yesBtn.style.transform = "scale(1.1)");
            yesBtn.addEventListener("mouseout", () => yesBtn.style.transform = "scale(1)");
            noBtn.addEventListener("mouseover", () => noBtn.style.transform = "scale(1.1)");
            noBtn.addEventListener("mouseout", () => noBtn.style.transform = "scale(1)");
        });
    }
    
    async function healAtBed() {
        console.log("🛏️ Début du soin au lit...");
        
        // Demander confirmation
        const wantsToHeal = await showHealConfirmation();
        
        if (!wantsToHeal) {
            console.log("❌ Soin annulé par l'utilisateur");
            return;
        }
        
        // Bloquer les interactions pendant le soin
        isZoneTransitioning = true;
        
        try {
            // Fondu au noir
            await fadeToBlack();
            
            // Attendre un peu pour l'effet de repos (1.5 secondes)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Soigner tous les Digiters (qu'ils soient KO ou non)
            gameState.playerTeam.forEach(p => {
                p.hp = p.maxHp;
            });
            console.log("💚 Tous les Digiters soignés à HP max");
            
            // Sauvegarder
            autoSave();
            
            // Forcer un rendu de la scène
            scene.render();
            
            // Revenir du noir
            await fadeFromBlack();
            
            // Petit délai avant d'afficher le message
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Afficher le message
            showDialog("Tes Digiters ont été soignés !\nTu te sens en pleine forme !");
            
            console.log("✅ Soin terminé");
        } catch (error) {
            console.error("❌ Erreur pendant le soin:", error);
            // Forcer le retour du noir en cas d'erreur
            const fadeOverlay = document.getElementById("fadeOverlay");
            if (fadeOverlay) fadeOverlay.classList.remove("show");
        } finally {
            // Débloquer les interactions après un délai
            setTimeout(() => {
                isZoneTransitioning = false;
            }, 500);
        }
    }

    // ===== INTERACTION (E / B) =====
    async function interact() {
        // ✅ Si on est en vue PC, quitter la vue PC
        if (pcViewActive) {
            exitPCView();
            return;
        }
        
        if (menuState.isOpen || gameState.dialogOpen) return;
        if (gameState.mode === "combat") return;
        
        // Anti-spam : bloquer si une transition de zone est en cours
        if (isZoneTransitioning) {
            console.log("⏳ Transition en cours, interaction ignorée");
            return;
        }

        const pos = playerCollider.position;
        const playerRot = playerCollider.rotation.y;

        // ========= SYSTÈME DE PRIORITÉ PAR DIRECTION =========
        // Au lieu de vérifier chaque type séparément, on collecte tous les interactables
        // à portée et on choisit celui qui est le plus devant le joueur
        
        const candidatesInRange = [];
        
        // 1) Portes
        for (const it of interactables) {
            if (it.type === "door") {
                const d = BABYLON.Vector3.Distance(pos, it.mesh.position);
                if (d < gameState.interactionRange) {
                    const priority = getInteractionPriority(pos, it.mesh.position, playerRot);
                    candidatesInRange.push({ priority, type: "door", data: it });
                }
            }
        }
        
        // 2) PNJ combat
        if (npc) {
            const distNpc = BABYLON.Vector3.Distance(pos, npc.position);
            if (distNpc < gameState.interactionRange) {
                const priority = getInteractionPriority(pos, npc.position, playerRot);
                candidatesInRange.push({ priority, type: "npc", data: npc });
            }
        }
        
        // 3) PNJ dialogues
        for (const it of interactables) {
            if (it.type === "npcTalk") {
                const d = BABYLON.Vector3.Distance(pos, it.mesh.position);
                if (d < gameState.interactionRange) {
                    const priority = getInteractionPriority(pos, it.mesh.position, playerRot);
                    candidatesInRange.push({ priority, type: "npcTalk", data: it });
                }
            }
        }
        
        // 4) PC / Ordinateur
        if (!pcViewActive) {
            for (const it of interactables) {
                if (it.type === "computer") {
                    const d = BABYLON.Vector3.Distance(pos, it.mesh.position);
                    if (d < gameState.interactionRange) {
                        const priority = getInteractionPriority(pos, it.mesh.position, playerRot);
                        candidatesInRange.push({ priority, type: "computer", data: it });
                    }
                }
            }
        }
        
        // 5) Lit (soin)
        for (const it of interactables) {
            if (it.type === "bed") {
                const d = BABYLON.Vector3.Distance(pos, it.mesh.position);
                if (d < gameState.interactionRange) {
                    const priority = getInteractionPriority(pos, it.mesh.position, playerRot);
                    candidatesInRange.push({ priority, type: "bed", data: it });
                }
            }
        }
        
        // 6) Item
        if (item && item.isVisible) {
            const distItem = BABYLON.Vector3.Distance(pos, item.position);
            if (distItem < gameState.interactionRange) {
                const priority = getInteractionPriority(pos, item.position, playerRot);
                candidatesInRange.push({ priority, type: "item", data: item });
            }
        }
        
        // Trier par priorité (le plus petit score = le plus prioritaire)
        candidatesInRange.sort((a, b) => a.priority - b.priority);
        
        // Exécuter l'interaction la plus prioritaire
        if (candidatesInRange.length > 0) {
            const best = candidatesInRange[0];
            
            if (best.type === "door") {
                lastZoneVisited = currentZone;
                console.log(`🚪 Porte vers ${best.data.targetZone} depuis ${currentZone}`);
                await switchZoneWithFade(best.data.targetZone, best.data.targetPos);
                return;
            }
            
            if (best.type === "npc") {
                startCombat({ isWild: false });
                return;
            }
            
            if (best.type === "npcTalk") {
                showDialog(best.data.text);
                return;
            }
            
            if (best.type === "computer") {
                enterPCView(best.data);
                return;
            }
            
            if (best.type === "bed") {
                // Animation de soin avec fondu au noir
                await healAtBed();
                return;
            }
            
            if (best.type === "item") {
                // Générer un ID unique pour cet item basé sur sa position et zone
                const itemId = `${currentZone}_item_${Math.round(best.data.position.x)}_${Math.round(best.data.position.z)}`;
                
                // Vérifier si déjà collecté
                if (gameState.collectedItems && gameState.collectedItems.includes(itemId)) {
                    return; // Déjà ramassé
                }
                
                showDialog("Tu trouves une Hyper Potion !");
                best.data.isVisible = false;
                
                // Marquer comme collecté
                if (!gameState.collectedItems) gameState.collectedItems = [];
                gameState.collectedItems.push(itemId);
                
                // Ajouter à l'inventaire
                const existingItem = gameState.playerInventory.find(i => i.name === "Hyper Potion");
                if (existingItem) {
                    existingItem.count++;
                } else {
                    gameState.playerInventory.push({
                        name:"Hyper Potion",
                        count:1,
                        icon:"🧪",
                        description:"Restaure beaucoup de PV (50 PV)."
                    });
                }
                
                renderInventory();
                autoSave();
                return;
            }
        }
    }

    // ===== DEBUG MODE - AFFICHAGE DES COLLISION BOXES =====
    let debugMode = 0; // 0: off, 1: all meshes, 2: collisions only
    const debugCollisionBoxes = [];
    const debugOriginalStates = []; // Stocker les états originaux

    function toggleDebugCollisions() {
        debugMode = (debugMode + 1) % 3; // Cycle entre 0, 1, 2
        
        // D'abord, restaurer tout
        debugOriginalStates.forEach(state => {
            if (state.mesh && !state.mesh.isDisposed()) {
                state.mesh.isVisible = state.wasVisible;
                
                if (state.mesh.material) {
                    state.mesh.material.dispose();
                }
                state.mesh.material = state.originalMaterial;
            }
        });
        
        debugOriginalStates.length = 0;
        debugCollisionBoxes.length = 0;
        
        if (debugMode === 0) {
            console.log("🐛 DEBUG MODE DÉSACTIVÉ");
            console.log("✅ Mode graphique restauré");
        } else if (debugMode === 1) {
            console.log("🐛 DEBUG MODE 1: Affichage de TOUTES les meshes");
            
            // Parcourir toutes les meshes de la scène
            scene.meshes.forEach((mesh, idx) => {
                if (mesh.isDisposed() || !mesh.name) return;
                
                // Sauvegarder l'état original
                debugOriginalStates.push({
                    mesh: mesh,
                    wasVisible: mesh.isVisible,
                    originalMaterial: mesh.material,
                    wasWireframe: mesh.wireframe || false
                });
                
                mesh.isVisible = true;
                
                // Créer un matériau de debug
                const mat = new BABYLON.StandardMaterial(`debugMat_${idx}`, scene);
                mat.wireframe = true;
                mat.emissiveColor = new BABYLON.Color3(
                    Math.random(),
                    Math.random(),
                    Math.random()
                );
                mat.alpha = 0.6;
                mesh.material = mat;
                debugCollisionBoxes.push(mesh);
            });

            console.log(`✅ ${debugCollisionBoxes.length} meshes affichées (toutes les meshes)`);
            console.log("💡 Appuyez sur C pour voir uniquement les collisions");
        } else if (debugMode === 2) {
            console.log("🐛 DEBUG MODE 2: Affichage des collisions uniquement");
            
            // Parcourir toutes les meshes et afficher seulement celles avec checkCollisions
            scene.meshes.forEach((mesh, idx) => {
                if (mesh.isDisposed() || !mesh.name) return;
                
                // Sauvegarder l'état original
                debugOriginalStates.push({
                    mesh: mesh,
                    wasVisible: mesh.isVisible,
                    originalMaterial: mesh.material,
                    wasWireframe: mesh.wireframe || false
                });
                
                if (mesh.checkCollisions) {
                    // C'est une mesh de collision
                    mesh.isVisible = true;
                    
                    const mat = new BABYLON.StandardMaterial(`collisionDebugMat_${idx}`, scene);
                    mat.wireframe = true;
                    mat.emissiveColor = new BABYLON.Color3(1, 0, 0); // Rouge
                    mat.alpha = 0.7;
                    mesh.material = mat;
                    debugCollisionBoxes.push(mesh);
                } else {
                    // Masquer les meshes sans collision
                    mesh.isVisible = false;
                }
            });

            console.log(`✅ ${debugCollisionBoxes.length} meshes de collision affichées`);
            console.log("💡 Appuyez sur C pour désactiver le debug");
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
                return; // Les scènes de combat gèrent leurs propres inputs
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
            
            // ✅ Gestion de la vue PC : Escape ou B pour quitter
            if (pcViewActive) {
                if (rawKey === "Escape" || k === "b" || k === "e") {
                    exitPCView();
                    return;
                }
                return; // Bloquer les autres touches en vue PC
            }
            
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
                                name: "Digiters sauvage",
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

    // ===== INITIALISATION CONTRÔLES MOBILES =====
    mobileControlsEnabled = initMobileControls();
    if (mobileControlsEnabled) {
        // Définir le callback d'interaction pour le bouton B mobile
        setInteractCallback(() => interact());
        console.log("📱 Contrôles mobiles activés avec succès");
    }

    // ===== MOUVEMENT & UPDATE =====
    // Debug: afficher les coordonnées du joueur dans la console (tous les `PLAYER_LOG_INTERVAL` ms)
    const DEBUG_PLAYER_POSITION = true; // passer à false pour désactiver
    const PLAYER_LOG_INTERVAL = 4000; // ms
    let _lastPlayerLogTs = 0;
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
       // ===== NORMALISATION VITESSE PAR DELTATIME =====
        // Calcule un facteur pour que la vitesse soit identique quel que soit le FPS
        // À 60 FPS: deltaTime ≈ 16.67ms → factor = 1.0
        // À 120 FPS: deltaTime ≈ 8.33ms → factor = 0.5
        // À 30 FPS: deltaTime ≈ 33.33ms → factor = 2.0
        const deltaFactor = (scene.deltaTime || TARGET_FRAME_TIME) / TARGET_FRAME_TIME;
        
        const baseSpd = gameState.isRunning ? 0.2 : 0.1;
        const spd = baseSpd * deltaFactor;
        let dx = 0, dz = 0;

        // Mouvements alignés avec la caméra
        if (inputMap["z"] || inputMap["w"]) dz -= spd;   // Avant
        if (inputMap["s"]) dz += spd;                    // Arrière
        if (inputMap["d"]) dx -= spd;                    // Droite
        if (inputMap["a"] || inputMap["q"]) dx += spd;  // Gauche

        // ===== JOYSTICK MOBILE =====
        if (mobileControlsEnabled && isJoystickActive()) {
            const joystick = getJoystickVector();
            const D = 0.15; // Dead zone
            if (Math.abs(joystick.x) > D || Math.abs(joystick.y) > D) {
                dx -= joystick.x * spd;  // Joystick X
                dz += joystick.y * spd;  // Joystick Y
            }
        }

        // ===== GAMEPAD PHYSIQUE =====
        if (gamepad) {
            const D = 0.15;
            const lx = Math.abs(gamepad.leftStick.x) > D ? gamepad.leftStick.x : 0;
            const ly = Math.abs(gamepad.leftStick.y) > D ? gamepad.leftStick.y : 0;
            dx -= lx * spd;  // Stick X
            dz += ly * spd;  // Stick Y inversé
        }

        const moveVec = new BABYLON.Vector3(dx, 0, dz);
        const moveSpeed = moveVec.length();

        if (playerMeshRoot && moveSpeed > 0.0001) {
            const angle = Math.atan2(dx, dz);
            playerMeshRoot.rotation.y = angle;
        }

        if (moveSpeed < 0.001) {
            playPlayerAnimation("idle", 1.0);
        } else {
            const speedFactor = gameState.isRunning ? 1.5 : 0.8;
            playPlayerAnimation("running", speedFactor);
        }

        playerCollider.moveWithCollisions(moveVec);
        // Debug logging throttled
        if (DEBUG_PLAYER_POSITION) {
            const _now = Date.now();
            if (_now - _lastPlayerLogTs >= PLAYER_LOG_INTERVAL) {
                _lastPlayerLogTs = _now;
                console.log(`📍 PlayerPos: x=${playerCollider.position.x.toFixed(2)} y=${playerCollider.position.y.toFixed(2)} z=${playerCollider.position.z.toFixed(2)}`);
            }
        }
    });

    // ===== CHARGEMENT DE LA SAUVEGARDE AUTOMATIQUE =====
    // Vérifier si c'est le premier lancement (depuis l'écran d'accueil)
    const isFirstLaunch = !sessionStorage.getItem("gameLoaded");
    
    if (isFirstLaunch) {
        // Premier lancement : toujours démarrer à la maison
        console.log("🏠 Premier lancement - Démarrage à la maison");
        sessionStorage.setItem("gameLoaded", "true");
        switchZone("house", bedPosition.clone());
    } else {
        // Rechargement de page : charger la sauvegarde
        const hasSavedGame = loadAutoSave();
        
        if (hasSavedGame && gameState.currentZone && gameState.playerPosition) {
            // Charger la zone et position sauvegardées
            console.log(`🔄 Restauration de la partie: zone=${gameState.currentZone}`);
            const savedZone = gameState.currentZone;
            const savedPos = gameState.playerPosition;
            switchZone(savedZone, new BABYLON.Vector3(savedPos.x, savedPos.y, savedPos.z));
        } else {
            // Zone de départ par défaut : MAISON (devant le lit)
            switchZone("house", bedPosition.clone());
        }
    }
    
    // Démarrer le système de rencontres sauvages
    initWildEncounterSystem();
    
    // ===== AUTO-SAUVEGARDE PÉRIODIQUE (toutes les 30 secondes) =====
    setInterval(() => {
        if (gameState.mode === "exploration" && !menuState.isOpen) {
            autoSave();
        }
    }, 30000);

    console.log("✅ Scène prête !");
    return scene;
}
