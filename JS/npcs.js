// npcs.js
// Système complet de gestion des PNJ (création, dialogues, combats)

console.log("👥 Chargement npcs.js");

/**
 * 📚 BASE DE DONNÉES DES PNJ
 * Contient tous les PNJ du jeu avec leurs caractéristiques
 */
export const NPCS_DATABASE = {
    // ========== MAISON ==========
    mentor_principal: {
        id: "mentor_principal",
        name: "Prof. Digital",
        zone: "house",
        position: { x: 0, y: 0.9, z: -1.5 }, // Devant la porte
        type: "talk", // talk, combat, shop, quest
        icon: "👨‍🏫",
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
                "Explore la ville pour en découvrir plus."
            ],
            repeat: [
                "N'oublie pas : en MMI, on apprend en pratiquant !",
                "Chaque projet est une nouvelle aventure."
            ]
        },
        hasBeenTalkedTo: false
    },

    // ========== VILLE ========== 
    // Ajout d'un PNJ de combat dans la ville (réduction à 1 seul)
    combat_ville: {
           id: "combat_ville",
           name: "Rival MMI",
           zone: "ville",
           position: { x: -6, y: 0.9, z: 6 }, // À gauche du second bâtiment
            type: "combat",
            icon: "⚔️",
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
                    key: "Pedro", // Fournit un vrai monstre
                    name: "Pedro",
                    type: "poison",
                    level: 5,
                    maxHp: 50,
                    hp: 50,
                    attack: 12,
                    defense: 8,
                    speed: 7,
                    skills: ["HTML5", "CSS3"],
                    description: "Un Digiter de type poison.",
                    icon: "🐍",
                    model: "Pedro.glb",
                    status: "OK",
                    attacks: [
                        { name: "HTML5", power: 18, accuracy: 95 },
                        { name: "CSS3", power: 15, accuracy: 100 }
                    ],
                    combatPosition: { x: 0, y: 0, z: 0 },
                    combatRotation: 0
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
        position: { x: -8, y: 0.9, z: -2 },
        type: "talk",
        icon: "💻",
        dialogue: {
            first: [
                "💻 Développement Web - La base du MMI !",
                "",
                "Tu apprendras :",
                "• HTML/CSS : Structure et style des sites",
                "• JavaScript : Interactivité et dynamisme",
                "• PHP/MySQL : Bases de données",
                "• React/Vue : Frameworks modernes",
                "",
                "Le web est partout aujourd'hui.",
                "C'est une compétence indispensable !"
            ],
            repeat: [
                "Le développement web, c'est créer l'internet de demain !",
                "Chaque ligne de code compte."
            ]
        },
        hasBeenTalkedTo: false
    },

    maitre_design: {
        id: "maitre_design",
        name: "Designer UX",
        zone: "ville",
        position: { x: 8, y: 0.9, z: -2 },
        type: "talk",
        icon: "🎨",
        dialogue: {
            first: [
                "🎨 Design UX/UI - L'art de l'expérience utilisateur !",
                "",
                "En MMI, tu maîtriseras :",
                "• Figma & Adobe XD : Prototypage",
                "• Photoshop & Illustrator : Création graphique",
                "• Design thinking : Méthodologie",
                "• Accessibilité : Design pour tous",
                "",
                "Un bon design, c'est invisible.",
                "Il guide l'utilisateur sans qu'il s'en rende compte !"
            ],
            repeat: [
                "Le design, c'est résoudre des problèmes avec beauté.",
                "Pense toujours à l'utilisateur !"
            ]
        },
        hasBeenTalkedTo: false
    },

    specialiste_av: {
        id: "specialiste_av",
        name: "Réalisateur AV",
        zone: "ville",
        position: { x: 0, y: 0.9, z: 8 },
        type: "talk",
        icon: "🎬",
        dialogue: {
            first: [
                "🎬 Audiovisuel & Motion Design !",
                "",
                "Le multimédia, c'est aussi :",
                "• Montage vidéo (Premiere Pro)",
                "• Animation (After Effects)",
                "• Prise de vue et cadrage",
                "• Sound design et mixage audio",
                "",
                "La vidéo est le format roi du web.",
                "YouTube, TikTok, Instagram... partout !"
            ],
            repeat: [
                "Chaque image raconte une histoire.",
                "Apprends à capturer l'émotion !"
            ]
        },
        hasBeenTalkedTo: false
    },

    expert_com: {
        id: "expert_com",
        name: "Com Manager",
        zone: "ville",
        position: { x: -5, y: 0.9, z: 3 },
        type: "talk",
        icon: "📱",
        dialogue: {
            first: [
                "📱 Communication Digitale - Parler au monde !",
                "",
                "Tu découvriras :",
                "• Stratégie de contenu",
                "• Community management",
                "• SEO & Référencement",
                "• Analytics & Data",
                "",
                "Créer c'est bien, être vu c'est mieux !",
                "Apprends à faire connaître tes projets."
            ],
            repeat: [
                "La communication, c'est l'art de connecter.",
                "Parle à ton audience avec authenticité !"
            ]
        },
        hasBeenTalkedTo: false
    },

    guide_herbes: {
        id: "guide_herbes",
        name: "Ranger MMI",
        zone: "ville",
        position: { x: -8, y: 0.9, z: 10 },
        type: "talk",
        icon: "🌿",
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
                "Chaque combat te rendra plus fort !",
                "C'est en pratiquant qu'on progresse."
            ],
            repeat: [
                "Les hautes herbes cachent des défis...",
                "Sois toujours prêt à apprendre !"
            ]
        },
        hasBeenTalkedTo: false
    },

    mentor_gestion: {
        id: "mentor_gestion",
        name: "Chef de Projet",
        zone: "ville",
        position: { x: 5, y: 0.9, z: 0 },
        type: "talk",
        icon: "📊",
        dialogue: {
            first: [
                "📊 Gestion de Projet - L'organisation qui fait la différence !",
                "",
                "En MMI, tu apprendras :",
                "• Méthodes Agile & Scrum",
                "• Gestion d'équipe",
                "• Planning et budgets",
                "• Outils collaboratifs (Trello, Notion...)",
                "",
                "Un projet bien géré, c'est un projet réussi !"
            ],
            repeat: [
                "L'organisation, c'est la clé du succès.",
                "Planifie tes projets avec rigueur !"
            ]
        },
        hasBeenTalkedTo: false
    },

    // ========== FORÊT - PNJ COMBATTANTS ET DIALOGUE ========== 
    // PNJ de dialogue dans la forêt
    guide_foret_1: {
        id: "guide_foret_1",
        name: "Guide Forêt 1",
        zone: "foret",
        position: { x: -10, y: 0.9, z: 2 },
        type: "talk",
        icon: "🌲",
        dialogue: {
            first: [
                "Bienvenue dans la forêt MMI !",
                "Ici, tu trouveras des défis plus complexes et des secrets cachés.",
                "N'hésite pas à explorer chaque recoin."
            ],
            repeat: [
                "La forêt regorge de mystères à découvrir !"
            ]
        },
        hasBeenTalkedTo: false
    },
    guide_foret_2: {
        id: "guide_foret_2",
        name: "Guide Forêt 2",
        zone: "foret",
        position: { x: 8, y: 0.9, z: -10 },
        type: "talk",
        icon: "🌳",
        dialogue: {
            first: [
                "Attention aux Digiters sauvages !",
                "Certains combats ici sont plus difficiles qu'en ville.",
                "Prépare bien ton équipe avant d'avancer."
            ],
            repeat: [
                "Soigne tes Digiters régulièrement pour survivre dans la forêt."
            ]
        },
        hasBeenTalkedTo: false
    },

    combat_js: {
        id: "combat_js",
        name: "Expert JavaScript",
        zone: "foret",
        position: { x: 10, y: 0.9, z: -8 },
        type: "combat",
        icon: "⚔️",
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
        position: { x: -5, y: 0.9, z: -15 },
        type: "combat",
        icon: "⚔️",
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

    combat_av: {
        id: "combat_av",
        name: "Vidéaste Pro",
        zone: "foret",
        position: { x: 15, y: 0.9, z: 10 },
        type: "combat",
        icon: "⚔️",
        dialogue: {
            intro: [
                "🎬 Le montage vidéo n'a pas de secret pour moi !",
                "",
                "After Effects, Premiere... C'est parti !"
            ],
            victory: [
                "Tu maîtrises bien l'audiovisuel !",
                "La vidéo est un outil puissant."
            ],
            defeat: [
                "Le montage demande de la patience.",
                "Regarde des tutoriels et pratique !"
            ]
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
    },

    boss_mmi: {
        id: "boss_mmi",
        name: "Expert MMI Ultime",
        zone: "foret",
        position: { x: 0, y: 0.9, z: -20 },
        type: "combat",
        icon: "⚔️",
        isBoss: true,
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
    }
};

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
     */
    updateIcon(playerPosition, interactionRange, isInCombat, isMenuOpen) {
        if (!this.icon) return;
        
        const distance = BABYLON.Vector3.Distance(playerPosition, this.mesh.position);
        this.icon.position = this.mesh.position.add(new BABYLON.Vector3(0, 1.9, 0));
        this.icon.isVisible = (distance < interactionRange) && !isInCombat && !isMenuOpen;
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
     * Charge tous les PNJ d'une zone
     */
    async loadZoneNPCs(zoneName) {
        // Nettoyer les PNJ de la zone précédente
        this.clearZone();

        this.currentZone = zoneName;

        // Filtrer les PNJ de cette zone
        let zoneNPCs = Object.values(NPCS_DATABASE).filter(
            npcData => npcData.zone === zoneName
        );

        // Restaurer l'état vaincu depuis la sauvegarde
        if (typeof window !== "undefined") {
            try {
                // gameState injecté via syncDefeatedFrom
            } catch (_) { /* ignore */ }
        }
        if (this._defeatedIds && this._defeatedIds.size) {
            zoneNPCs.forEach(n => {
                if (this._defeatedIds.has(n.id)) n.hasBeenDefeated = true;
            });
        }

        console.log(`👥 Chargement de ${zoneNPCs.length} PNJ pour la zone ${zoneName}`);

        // Créer chaque PNJ
        for (const npcData of zoneNPCs) {
            const npc = new NPC(npcData, this.scene);
            await npc.create();
            this.npcs.set(npcData.id, npc);
        }

        console.log(`✅ ${this.npcs.size} PNJ chargés`);
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
     */
    update(playerPosition, interactionRange, isInCombat, isMenuOpen) {
        for (const npc of this.npcs.values()) {
            npc.updateIcon(playerPosition, interactionRange, isInCombat, isMenuOpen);
        }
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