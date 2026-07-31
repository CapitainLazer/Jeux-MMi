// npcs.js
// Système complet de gestion des PNJ (création, dialogues, combats)

console.log("👥 Chargement npcs.js");

/**
 * 📚 BASE DE DONNÉES DES PNJ
 * Contient tous les PNJ du jeu avec leurs caractéristiques
 *
 * Densité cible (style Pokémon) :
 *  - house : 1 PNJ
 *  - ville : 3 PNJ (1 dresseur + 2 dialogues)
 *  - foret : 4 PNJ (1 guide + 2 dresseurs + 1 boss)
 *
 * `enabled: false` = présent en data mais pas spawné (évite la surcharge)
 */
export const NPCS_DATABASE = {
    // ========== MAISON (1 PNJ) ==========
    mentor_principal: {
        id: "mentor_principal",
        name: "Prof. Digital",
        zone: "house",
        // À côté du chemin lit ↔ porte (maison ~9×9, porte vers z négatif)
        position: { x: 2.2, y: 0.9, z: -1.0 },
        type: "talk",
        icon: "👨‍🏫",
        enabled: true,
        dialogue: {
            first: [
                "👨‍🏫 Bienvenue dans ta formation MMI !",
                "",
                "MMI = Métiers du Multimédia et de l'Internet",
                "",
                "Ici, tu vas apprendre à créer des expériences digitales :",
                "• Sites web et applications",
                "• Design et création graphique",
                "• Audiovisuel et animation",
                "• Stratégie de communication digitale",
                "",
                "Tes Digiters représentent tes compétences !",
                "Sors de la maison et explore la ville."
            ],
            repeat: [
                "N'oublie pas : en MMI, on apprend en pratiquant !",
                "Chaque projet est une nouvelle aventure."
            ]
        },
        hasBeenTalkedTo: false
    },

    // ========== VILLE (3 PNJ actifs) ==========
    // Chemin jouable approx. : maison (1.4, 5) ↔ place centrale ↔ gate forêt (-11, -8)
    guide_herbes: {
        id: "guide_herbes",
        name: "Ranger MMI",
        zone: "ville",
        // Près de la sortie maison, oriente vers les herbes
        position: { x: -2.5, y: 0.9, z: 3.5 },
        type: "talk",
        icon: "🌿",
        enabled: true,
        dialogue: {
            first: [
                "🌿 Attention aux hautes herbes !",
                "",
                "Les Digiters sauvages représentent les défis",
                "que tu rencontreras en formation :",
                "• Bugs de code",
                "• Deadlines serrées",
                "• Projets complexes",
                "",
                "Chaque combat te rendra plus fort !"
            ],
            repeat: [
                "Les hautes herbes cachent des défis...",
                "Sois toujours prêt à apprendre !"
            ]
        },
        hasBeenTalkedTo: false
    },

    combat_ville: {
        id: "combat_ville",
        name: "Rival MMI",
        zone: "ville",
        // Place centrale, sur le chemin maison → forêt
        position: { x: -4.0, y: 0.9, z: -1.5 },
        type: "combat",
        icon: "⚔️",
        enabled: true,
        dialogue: {
            intro: [
                "👊 Je suis ton rival MMI !",
                "",
                "Montre-moi ce que tu as appris en ville avant d'affronter la forêt !"
            ],
            victory: [
                "Pas mal ! Tu es prêt pour de nouveaux défis.",
                "Bonne chance dans la forêt !"
            ],
            defeat: [
                "Il te manque encore un peu d'expérience.",
                "Reviens me voir après avoir progressé !"
            ]
        },
        team: [
            {
                key: "Pedro",
                name: "Pedro",
                level: 5,
                attacks: [
                    { name: "HTML5", power: 18, accuracy: 95 },
                    { name: "CSS3", power: 15, accuracy: 100 }
                ]
            }
        ],
        reward: {
            money: 100,
            items: [{ name: "Potion", count: 1 }]
        },
        hasBeenDefeated: false
    },

    expert_dev_web: {
        id: "expert_dev_web",
        name: "Dev. Webmaster",
        zone: "ville",
        // Sur le chemin vers le gate forêt, hors collision
        position: { x: -8.5, y: 0.9, z: -5.0 },
        type: "talk",
        icon: "💻",
        enabled: true,
        dialogue: {
            first: [
                "💻 Développement Web - La base du MMI !",
                "",
                "Tu apprendras :",
                "• HTML/CSS : Structure et style des sites",
                "• JavaScript : Interactivité et dynamisme",
                "• PHP/MySQL : Bases de données",
                "",
                "Le chemin vers la forêt est juste derrière moi.",
                "Prépare bien ton équipe !"
            ],
            repeat: [
                "Le développement web, c'est créer l'internet de demain !",
                "Chaque ligne de code compte."
            ]
        },
        hasBeenTalkedTo: false
    },

    // --- Ville : désactivés (trop denses / hors zone jouable fiable) ---
    maitre_design: {
        id: "maitre_design",
        name: "Designer UX",
        zone: "ville",
        position: { x: 5.0, y: 0.9, z: 2.0 },
        type: "talk",
        icon: "🎨",
        enabled: false,
        dialogue: {
            first: ["🎨 Design UX/UI - L'art de l'expérience utilisateur !"],
            repeat: ["Le design, c'est résoudre des problèmes avec beauté."]
        },
        hasBeenTalkedTo: false
    },
    specialiste_av: {
        id: "specialiste_av",
        name: "Réalisateur AV",
        zone: "ville",
        position: { x: 3.0, y: 0.9, z: -4.0 },
        type: "talk",
        icon: "🎬",
        enabled: false,
        dialogue: {
            first: ["🎬 Audiovisuel & Motion Design !"],
            repeat: ["Chaque image raconte une histoire."]
        },
        hasBeenTalkedTo: false
    },
    expert_com: {
        id: "expert_com",
        name: "Com Manager",
        zone: "ville",
        position: { x: -1.0, y: 0.9, z: -3.5 },
        type: "talk",
        icon: "📱",
        enabled: false,
        dialogue: {
            first: ["📱 Communication Digitale - Parler au monde !"],
            repeat: ["La communication, c'est l'art de connecter."]
        },
        hasBeenTalkedTo: false
    },
    mentor_gestion: {
        id: "mentor_gestion",
        name: "Chef de Projet",
        zone: "ville",
        position: { x: 2.0, y: 0.9, z: 1.0 },
        type: "talk",
        icon: "📊",
        enabled: false,
        dialogue: {
            first: ["📊 Gestion de Projet - L'organisation qui fait la différence !"],
            repeat: ["L'organisation, c'est la clé du succès."]
        },
        hasBeenTalkedTo: false
    },

    // ========== FORÊT (4 PNJ actifs) ==========
    // Spawn joueur : (0, 26) — sortie ville au nord. Zone jouable ~±28.
    guide_foret_1: {
        id: "guide_foret_1",
        name: "Guide Forestier",
        zone: "foret",
        // Juste après l'entrée (sud du spawn z=26)
        position: { x: 2.5, y: 0.9, z: 20.0 },
        type: "talk",
        icon: "🌲",
        enabled: true,
        dialogue: {
            first: [
                "Bienvenue dans la forêt MMI !",
                "",
                "Des dresseurs plus coriaces t'attendent plus au sud.",
                "Les herbes hautes cachent aussi des Digiters sauvages.",
                "Avance prudemment !"
            ],
            repeat: [
                "La forêt regorge de défis à découvrir !",
                "Soigne tes Digiters si besoin avant d'aller plus loin."
            ]
        },
        hasBeenTalkedTo: false
    },

    combat_js: {
        id: "combat_js",
        name: "Expert JavaScript",
        zone: "foret",
        // Mi-chemin ouest, hors herbes procédurales
        position: { x: -10.0, y: 0.9, z: 10.0 },
        type: "combat",
        icon: "⚔️",
        enabled: true,
        dialogue: {
            intro: [
                "⚡ JavaScript est mon langage !",
                "",
                "Async/Await, Promises, ES6+...",
                "Tu es prêt pour ce combat technique ?"
            ],
            victory: [
                "Tu as de bonnes bases en programmation !",
                "Continue à coder chaque jour."
            ],
            defeat: [
                "JavaScript est complexe au début.",
                "La pratique rend meilleur !"
            ]
        },
        team: [
            {
                name: "Pedro",
                level: 7,
                attacks: [
                    { name: "Morsure", power: 30, accuracy: 90 },
                    { name: "Sifflement", power: 15, accuracy: 100 }
                ]
            }
        ],
        reward: {
            money: 200,
            items: [{ name: "Super Potion", count: 1 }]
        },
        hasBeenDefeated: false
    },

    combat_design: {
        id: "combat_design",
        name: "Designer UX/UI",
        zone: "foret",
        // Mi-chemin est
        position: { x: 9.0, y: 0.9, z: 2.0 },
        type: "combat",
        icon: "⚔️",
        enabled: true,
        dialogue: {
            intro: [
                "🎨 Le design, c'est mon art !",
                "",
                "Mes Digiters ont du style et de l'ergonomie.",
                "Montre-moi tes compétences !"
            ],
            victory: [
                "Tu as l'œil pour le design !",
                "L'UX est une compétence précieuse."
            ],
            defeat: [
                "Le design demande de l'observation.",
                "Étudie les interfaces autour de toi !"
            ]
        },
        team: [
            {
                name: "Adoubee",
                level: 8,
                attacks: [
                    { name: "After Effects", power: 28, accuracy: 92 },
                    { name: "Lightroom", power: 22, accuracy: 95 }
                ]
            }
        ],
        reward: {
            money: 220,
            items: [{ name: "Potion", count: 3 }]
        },
        hasBeenDefeated: false
    },

    boss_mmi: {
        id: "boss_mmi",
        name: "Expert MMI Ultime",
        zone: "foret",
        // Fond sud de la forêt (clairière)
        position: { x: 0.0, y: 0.9, z: -18.0 },
        type: "combat",
        icon: "⚔️",
        isBoss: true,
        enabled: true,
        dialogue: {
            intro: [
                "🌟 Je suis l'Expert MMI Ultime !",
                "",
                "Je maîtrise TOUTES les compétences MMI :",
                "Dev, Design, Audiovisuel, Communication...",
                "",
                "Es-tu prêt pour le défi final ?"
            ],
            victory: [
                "Incroyable ! Tu as prouvé ta maîtrise du MMI.",
                "Tu es prêt pour de grands projets !",
                "",
                "Félicitations, jeune expert !"
            ],
            defeat: [
                "Tu as encore du chemin à parcourir.",
                "Reviens quand tu auras plus d'expérience !",
                "",
                "La route vers l'excellence est longue."
            ]
        },
        team: [
            {
                name: "Adoubee",
                level: 12,
                attacks: [
                    { name: "Photoshop", power: 35, accuracy: 95 },
                    { name: "After Effects", power: 40, accuracy: 90 },
                    { name: "Illustrator", power: 30, accuracy: 100 }
                ]
            },
            {
                name: "Pedro",
                level: 12,
                attacks: [
                    { name: "Morsure", power: 38, accuracy: 92 },
                    { name: "Sifflement", power: 28, accuracy: 95 }
                ]
            }
        ],
        reward: {
            money: 500,
            items: [
                { name: "Hyper Potion", count: 3 },
                { name: "Master Ball", count: 1 }
            ]
        },
        hasBeenDefeated: false
    },

    // --- Forêt : désactivés (redondants / trop denses) ---
    guide_foret_2: {
        id: "guide_foret_2",
        name: "Guide Forêt 2",
        zone: "foret",
        position: { x: 6.0, y: 0.9, z: 14.0 },
        type: "talk",
        icon: "🌳",
        enabled: false,
        dialogue: {
            first: ["Attention aux Digiters sauvages !"],
            repeat: ["Soigne tes Digiters régulièrement."]
        },
        hasBeenTalkedTo: false
    },
    combat_av: {
        id: "combat_av",
        name: "Vidéaste Pro",
        zone: "foret",
        position: { x: -6.0, y: 0.9, z: -8.0 },
        type: "combat",
        icon: "⚔️",
        enabled: false,
        dialogue: {
            intro: ["🎬 Le montage vidéo n'a pas de secret pour moi !"],
            victory: ["Tu maîtrises bien l'audiovisuel !"],
            defeat: ["Le montage demande de la patience."]
        },
        team: [
            {
                name: "Pedro",
                level: 9,
                attacks: [
                    { name: "Premiere Rush", power: 32, accuracy: 88 },
                    { name: "InDesign", power: 25, accuracy: 93 }
                ]
            }
        ],
        reward: {
            money: 250,
            items: [{ name: "Super Potion", count: 2 }]
        },
        hasBeenDefeated: false
    }
};

/** Limites dures par zone (filet de sécurité) */
export const ZONE_NPC_LIMITS = {
    house: 1,
    ville: 3,
    foret: 4,
    maison1: 1
};

/** Distance minimale entre deux PNJ spawnés (évite les collisions d'interaction) */
export const NPC_MIN_SEPARATION = 4.5;

/**
 * 🎭 GESTION DES DIALOGUES (style Pokémon : pages successives)
 */
export class DialogueManager {
    constructor() {
        this.currentDialogue = null;
        this.currentLine = 0;
        this.pages = [];
    }

    /**
     * Découpe le dialogue en pages (séparées par une ligne vide)
     */
    _buildPages(lines) {
        const pages = [];
        let buf = [];
        for (const line of lines) {
            if (line === "") {
                if (buf.length) {
                    pages.push(buf.join("\n"));
                    buf = [];
                }
            } else {
                buf.push(line);
            }
        }
        if (buf.length) pages.push(buf.join("\n"));
        return pages.length ? pages : [""];
    }

    /**
     * Démarre un dialogue avec un PNJ
     */
    startDialogue(npcData, variant = null) {
        let dialogueLines;

        if (variant && npcData.dialogue[variant]) {
            dialogueLines = npcData.dialogue[variant];
        } else if (npcData.type === "combat") {
            dialogueLines = npcData.hasBeenDefeated
                ? npcData.dialogue.victory
                : npcData.dialogue.intro;
        } else {
            if (npcData.hasBeenTalkedTo) {
                dialogueLines = npcData.dialogue.repeat;
            } else {
                dialogueLines = npcData.dialogue.first;
                npcData.hasBeenTalkedTo = true;
            }
        }

        this.pages = this._buildPages(dialogueLines || [""]);
        this.currentDialogue = dialogueLines;
        this.currentLine = 0;

        return this.getCurrentText();
    }

    /**
     * Passe à la page suivante du dialogue
     */
    nextLine() {
        if (!this.pages.length) return null;

        this.currentLine++;
        if (this.currentLine >= this.pages.length) {
            this.endDialogue();
            return null;
        }

        return this.getCurrentText();
    }

    /**
     * Obtient le texte de la page actuelle
     */
    getCurrentText() {
        if (!this.pages.length) return null;
        return this.pages[this.currentLine];
    }

    /**
     * Termine le dialogue
     */
    endDialogue() {
        this.currentDialogue = null;
        this.pages = [];
        this.currentLine = 0;
    }

    /**
     * Vérifie si le dialogue est terminé
     */
    isFinished() {
        return this.currentDialogue === null;
    }
}

/**
 * 👤 CLASSE PNJ
 * Représente un PNJ instancié dans le monde
 */
export class NPC {
    constructor(data, scene) {
        this.data = data;
        this.scene = scene;
        this.mesh = null;
        this.icon = null;
        this.visualRoot = null;
    }

    /**
     * Crée le mesh du PNJ dans la scène
     */
    async create() {
        // Créer le collider invisible
        this.mesh = BABYLON.MeshBuilder.CreateBox(`npc_${this.data.id}`, {
            width: 0.8,
            height: 1.8,
            depth: 0.8
        }, this.scene);
        
        this.mesh.position = new BABYLON.Vector3(
            this.data.position.x,
            this.data.position.y,
            this.data.position.z
        );
        this.mesh.isVisible = false;
        this.mesh.checkCollisions = true;
        
        // Charger le modèle visuel
        await this.loadVisual();
        
        // Créer l'icône
        this.createIcon();
        
        return this;
    }

    /**
     * Charge le modèle 3D du PNJ
     */
    async loadVisual() {
        return new Promise((resolve) => {
            // Utilise uniquement NpcG.gltf (combat) et NpcP.gltf (talk)
            let modelFile = null;
            if (this.data.type === "combat") {
                modelFile = "NpcG.gltf";
            } else if (this.data.type === "talk") {
                modelFile = "NpcP.gltf";
            } else {
                // Si le type n'est pas reconnu, ne charge rien
                resolve();
                return;
            }
            BABYLON.SceneLoader.ImportMesh(
                "",
                "./Assets/models/animations/",
                modelFile,
                this.scene,
                (meshes, ps, skels, animationGroups) => {
                    this.visualRoot = new BABYLON.TransformNode(`npc_visual_${this.data.id}`, this.scene);
                    this.visualRoot.parent = this.mesh;
                    this.visualRoot.position = new BABYLON.Vector3(0, -0.9, 0);
                    this.visualRoot.rotation.y = Math.PI / 2;

                    meshes.forEach(m => {
                        if (!m.parent) m.parent = this.visualRoot;
                        m.isVisible = true; // Force l'affichage
                        m.setEnabled(true); // Active le mesh
                        if (m.material) {
                            m.material.alpha = 1; // Force l'opacité
                        }
                        // Debug: log nom et position
                        console.log(`[PNJ DEBUG] Mesh: ${m.name}, position:`, m.position);
                    });

                    // Animation idle
                    const idle = animationGroups.find(a => a.name.toLowerCase().includes("idle"));
                    if (idle) {
                        idle.reset();
                        idle.play(true);
                        idle.speedRatio = 1.0;
                    }

                    resolve();
                },
                null,
                (scene, message, exception) => {
                    // Callback d'erreur
                    console.error(`[PNJ ERREUR] Echec chargement GLTF: ${modelFile} - ${message}`, exception);
                    // Ajoute un placeholder visuel pour éviter l'écran blanc
                    this.visualRoot = new BABYLON.TransformNode(`npc_visual_${this.data.id}_placeholder`, this.scene);
                    this.visualRoot.parent = this.mesh;
                    this.visualRoot.position = new BABYLON.Vector3(0, -0.9, 0);
                    this.visualRoot.rotation.y = Math.PI / 2;
                    const placeholder = BABYLON.MeshBuilder.CreateBox(`npc_placeholder_${this.data.id}`, { size: 1 }, this.scene);
                    placeholder.parent = this.visualRoot;
                    placeholder.position = new BABYLON.Vector3(0, 0.5, 0);
                    placeholder.isVisible = true;
                    placeholder.material = new BABYLON.StandardMaterial(`npc_placeholder_mat_${this.data.id}`, this.scene);
                    placeholder.material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Rouge pour bien voir
                    resolve();
                }
            );
        });
    }

    /**
     * Crée l'icône au-dessus du PNJ
     */
    createIcon() {
        let iconTexture;
        
        if (this.data.type === "combat") {
            iconTexture = "./Assets/icons/Point-exclamation.png";
        } else {
            iconTexture = "./Assets/icons/Point-interrogation.png";
        }

        this.icon = BABYLON.MeshBuilder.CreatePlane(`icon_${this.data.id}`, {
            width: 0.3,
            height: 0.6
        }, this.scene);
        
        this.icon.position = this.mesh.position.add(new BABYLON.Vector3(0, 1.9, 0));
        this.icon.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        const iconMat = new BABYLON.StandardMaterial(`iconMat_${this.data.id}`, this.scene);
        iconMat.diffuseTexture = new BABYLON.Texture(iconTexture, this.scene);
        iconMat.diffuseTexture.hasAlpha = true;
        iconMat.backFaceCulling = false;
        iconMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        this.icon.material = iconMat;
        this.icon.isVisible = false;
    }

    /**
     * Met à jour la visibilité de l'icône
     * @param {boolean} [isFocused] - si true, icône mise en avant (seule interaction active)
     */
    updateIcon(playerPosition, interactionRange, isInCombat, isMenuOpen, isFocused = false) {
        if (!this.icon) return;

        const distance = BABYLON.Vector3.Distance(playerPosition, this.mesh.position);
        const inRange = distance < interactionRange;
        this.icon.position = this.mesh.position.add(new BABYLON.Vector3(0, 1.9, 0));

        // Exclusive focus : seule l'icône focusée est visible à portée
        const show = inRange && !isInCombat && !isMenuOpen && isFocused;
        this.icon.isVisible = show;

        if (show) {
            const pulse = 1 + 0.08 * Math.sin(performance.now() / 200);
            this.icon.scaling.set(pulse, pulse, pulse);
        } else {
            this.icon.scaling.set(1, 1, 1);
        }
    }

    /**
     * Vérifie si le joueur peut interagir avec ce PNJ
     */
    canInteract(playerPosition, interactionRange) {
        const distance = BABYLON.Vector3.Distance(playerPosition, this.mesh.position);
        return distance < interactionRange;
    }

    /**
     * Nettoie les ressources
     */
    dispose() {
        if (this.mesh) this.mesh.dispose();
        if (this.icon) this.icon.dispose();
        if (this.visualRoot) this.visualRoot.dispose();
    }
}

/**
 * 🎮 GESTIONNAIRE DE PNJ
 * Gère tous les PNJ du jeu
 */
export class NPCManager {
    constructor(scene) {
        this.scene = scene;
        this.npcs = new Map(); // Map<npcId, NPC>
        this.dialogueManager = new DialogueManager();
        this.currentZone = null;
    }

    /**
     * Charge tous les PNJ d'une zone (enabled seulement, densité limitée)
     */
    async loadZoneNPCs(zoneName) {
        this.clearZone();
        this.currentZone = zoneName;

        const limit = ZONE_NPC_LIMITS[zoneName] ?? 3;

        let zoneNPCs = Object.values(NPCS_DATABASE).filter(
            npcData =>
                npcData.zone === zoneName &&
                npcData.enabled !== false
        );

        // Priorité : boss > combat > talk, puis ordre de déclaration
        const typePriority = { combat: 0, talk: 1, shop: 2, quest: 3 };
        zoneNPCs.sort((a, b) => {
            if (a.isBoss && !b.isBoss) return -1;
            if (!a.isBoss && b.isBoss) return 1;
            const pa = typePriority[a.type] ?? 9;
            const pb = typePriority[b.type] ?? 9;
            if (pa !== pb) return pa - pb;
            return 0;
        });

        // Restaurer l'état vaincu
        if (this._defeatedIds && this._defeatedIds.size) {
            zoneNPCs.forEach(n => {
                if (this._defeatedIds.has(n.id)) n.hasBeenDefeated = true;
            });
        }

        // Filtrer par séparation minimale (évite 2 PNJ collés)
        const placed = [];
        const selected = [];
        for (const npcData of zoneNPCs) {
            if (selected.length >= limit) break;
            const tooClose = placed.some(p => {
                const dx = p.x - npcData.position.x;
                const dz = p.z - npcData.position.z;
                return dx * dx + dz * dz < NPC_MIN_SEPARATION * NPC_MIN_SEPARATION;
            });
            if (tooClose) {
                console.warn(`⚠️ PNJ ${npcData.id} trop proche d'un autre — ignoré`);
                continue;
            }
            selected.push(npcData);
            placed.push(npcData.position);
        }

        console.log(`👥 Chargement de ${selected.length}/${zoneNPCs.length} PNJ pour ${zoneName} (limite ${limit})`);

        for (const npcData of selected) {
            const npc = new NPC(npcData, this.scene);
            await npc.create();
            this.npcs.set(npcData.id, npc);
            console.log(`   ✓ ${npcData.name} @ (${npcData.position.x}, ${npcData.position.z}) [${npcData.type}]`);
        }

        console.log(`✅ ${this.npcs.size} PNJ chargés sur la zone jouable`);
    }

    /**
     * Synchronise les PNJ vaincus depuis gameState
     */
    syncDefeatedFrom(defeatedList = []) {
        this._defeatedIds = new Set(defeatedList || []);
        for (const npc of this.npcs.values()) {
            if (this._defeatedIds.has(npc.data.id)) {
                npc.data.hasBeenDefeated = true;
            }
        }
    }

    /**
     * Nettoie tous les PNJ de la zone actuelle
     */
    clearZone() {
        for (const npc of this.npcs.values()) {
            npc.dispose();
        }
        this.npcs.clear();
    }

    /**
     * Met à jour tous les PNJ (icônes, etc.)
     * @param {string|null} focusedNpcId - id du PNJ focusé (icône exclusive)
     */
    update(playerPosition, interactionRange, isInCombat, isMenuOpen, focusedNpcId = null) {
        for (const npc of this.npcs.values()) {
            const focused = focusedNpcId != null && npc.data.id === focusedNpcId;
            npc.updateIcon(playerPosition, interactionRange, isInCombat, isMenuOpen, focused);
        }
    }

    /**
     * Liste tous les PNJ à portée (pour le système de focus exclusif)
     */
    getNPCsInRange(playerPosition, interactionRange) {
        const result = [];
        for (const npc of this.npcs.values()) {
            if (!npc.mesh) continue;
            const distance = BABYLON.Vector3.Distance(playerPosition, npc.mesh.position);
            if (distance < interactionRange) {
                result.push({ npc, distance });
            }
        }
        return result;
    }

    /**
     * Trouve le PNJ le plus proche avec lequel le joueur peut interagir
     */
    findInteractableNPC(playerPosition, interactionRange) {
        let closestNPC = null;
        let closestDistance = interactionRange;

        for (const npc of this.npcs.values()) {
            const distance = BABYLON.Vector3.Distance(playerPosition, npc.mesh.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestNPC = npc;
            }
        }

        return closestNPC;
    }

    /**
     * Déclenche une interaction avec un PNJ
     * Pour les dresseurs : dialogue page par page puis combat au confirm final
     */
    interact(npc, showDialogCallback, startCombatCallback) {
        if (!npc) return;

        if (npc.data.type === "talk") {
            this.dialogueManager.startDialogue(npc.data);

            const advance = () => {
                const next = this.dialogueManager.nextLine();
                if (next) {
                    showDialogCallback(next, advance);
                }
                // sinon le dialogue est fermé par showDialog cleanup
            };

            showDialogCallback(this.dialogueManager.getCurrentText(), advance);
        } else if (npc.data.type === "combat") {
            if (npc.data.hasBeenDefeated) {
                const text = this.dialogueManager.startDialogue(npc.data, "victory");
                showDialogCallback(text);
                return;
            }

            this.dialogueManager.startDialogue(npc.data, "intro");
            let combatStarted = false;

            const advance = () => {
                if (combatStarted) return;
                const next = this.dialogueManager.nextLine();
                if (next) {
                    showDialogCallback(next, advance);
                } else {
                    combatStarted = true;
                    startCombatCallback(npc.data);
                }
            };

            showDialogCallback(this.dialogueManager.getCurrentText(), advance);
        }
    }

    /**
     * Marque un PNJ comme vaincu et donne les récompenses
     */
    defeatNPC(npcId, playerInventory, playerMoney) {
        // Chercher dans la DB même si hors zone
        const npcLive = this.npcs.get(npcId);
        const npcData = npcLive ? npcLive.data : NPCS_DATABASE[npcId];
        if (!npcData || npcData.type !== "combat") return null;

        npcData.hasBeenDefeated = true;
        if (!this._defeatedIds) this._defeatedIds = new Set();
        this._defeatedIds.add(npcId);

        const reward = npcData.reward || { money: 0, items: [] };
        let newMoney = playerMoney + (reward.money || 0);

        (reward.items || []).forEach(rewardItem => {
            const existingItem = playerInventory.find(i => i.name === rewardItem.name);
            if (existingItem) {
                existingItem.count += rewardItem.count;
            } else {
                playerInventory.push({
                    name: rewardItem.name,
                    count: rewardItem.count,
                    icon: rewardItem.name.includes("Potion") ? "🧪" : "⚾",
                    description: "Objet obtenu en combat."
                });
            }
        });

        return {
            money: newMoney,
            items: reward.items || [],
            dialogue: npcData.dialogue?.victory || []
        };
    }
}

console.log("✅ npcs.js chargé avec succès");