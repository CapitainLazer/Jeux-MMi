// monsters.js

/**
 * 🎮 SYSTÈME DE GESTION DES MONSTRES (DIGITERS)
 * 
 * Ce fichier contient :
 * - Base de données complète des monstres
 * - Génération de monstres sauvages selon la zone
 * - Création de l'équipe de départ
 * - Pools de rencontres par zone et rareté
 */

console.log("🐉 Chargement monsters.js");

/**
 * Dictionnaire de tous les monstres disponibles dans le jeu
 * Chaque monstre a des stats de base qui sont multipliées par le niveau
 */
export const MONSTERS_DATABASE = {
    // ===== MONSTRES COMMUNS (Niveau 1-10) =====
    Adoubee: {
        name: "Adoubee",
        type: "eau",
        rarity: "commun",
        baseStats: {
            hp: 20,
            attack: 5,
            defense: 3,
            speed: 4
        },
        skills: ["Tackle", "Splash"],
        description: "Un nuage flottant. Des yeux captivant.",
        icon: "💧",
        model: "./Assets/models/animations/Adoubee.gltf" 
    },
    
    poussin: {
        name: "Poussin",
        type: "feu",
        rarity: "commun",
        baseStats: {
            hp: 18,
            attack: 7,
            defense: 2,
            speed: 6
        },
        skills: ["Picorer", "Braise"],
        description: "Un jeune oiseau de feu. Rapide mais fragile.",
        icon: "🐣",
        model: null
    },
    
    slime: {
        name: "Slime",
        type: "eau",
        rarity: "commun",
        baseStats: {
            hp: 20,
            attack: 5,
            defense: 3,
            speed: 4
        },
        skills: ["Tackle", "Splash"],
        description: "Un petit slime visqueux. Faible mais abondant.",
        icon: "💧",
        model: null
    },
    
    ver: {
        name: "Ver de Terre",
        type: "terre",
        rarity: "commun",
        baseStats: {
            hp: 25,
            attack: 4,
            defense: 5,
            speed: 2
        },
        skills: ["Creuser", "Boue"],
        description: "Un ver robuste. Lent mais résistant.",
        icon: "🪱",
        model: null
    },
    
    // ===== MONSTRES INTERMÉDIAIRES (Niveau 10-20) =====
    loupGris: {
        name: "Loup Gris",
        type: "normal",
        rarity: "peu_commun",
        baseStats: {
            hp: 35,
            attack: 12,
            defense: 8,
            speed: 10
        },
        skills: ["Morsure", "Hurlement", "Griffe"],
        description: "Un prédateur agile des forêts.",
        icon: "🐺",
        model: null
    },
    
    renardFeu: {
        name: "Renard de Feu",
        type: "feu",
        rarity: "peu_commun",
        baseStats: {
            hp: 30,
            attack: 15,
            defense: 6,
            speed: 12
        },
        skills: ["Flamme", "Agilité", "Lance-Flammes"],
        description: "Un renard mystique entouré de flammes.",
        icon: "🦊",
        model: null
    },
    
    oiseau: {
        name: "Oiseau Tempête",
        type: "air",
        rarity: "peu_commun",
        baseStats: {
            hp: 28,
            attack: 13,
            defense: 7,
            speed: 15
        },
        skills: ["Tornade", "Vol Plané", "Rafale"],
        description: "Un oiseau rapide qui maîtrise le vent.",
        icon: "🦅",
        model: null
    },
    
    // ===== MONSTRES RARES (Niveau 20-30) =====
    dragon: {
        name: "Dragon",
        type: "feu",
        rarity: "rare",
        baseStats: {
            hp: 50,
            attack: 20,
            defense: 15,
            speed: 8
        },
        skills: ["Souffle de Feu", "Vol", "Queue de Dragon", "Rage"],
        description: "Un dragon légendaire cracheur de feu.",
        icon: "🐉",
        model: null
    },
    
    licorne: {
        name: "Licorne",
        type: "lumiere",
        rarity: "rare",
        baseStats: {
            hp: 45,
            attack: 18,
            defense: 12,
            speed: 14
        },
        skills: ["Rayon Sacré", "Soin", "Corne Magique", "Protection"],
        description: "Une créature mystique de lumière pure.",
        icon: "🦄",
        model: null
    },
    
    golem: {
        name: "Golem de Pierre",
        type: "terre",
        rarity: "rare",
        baseStats: {
            hp: 60,
            attack: 16,
            defense: 20,
            speed: 4
        },
        skills: ["Coup de Roc", "Armure de Pierre", "Tremblement de Terre"],
        description: "Un colosse de pierre quasi-invulnérable.",
        icon: "🗿",
        model: null
    },
    
    // ===== MONSTRES LÉGENDAIRES (Niveau 30+) =====
    phenix: {
        name: "Phénix",
        type: "feu",
        rarity: "legendaire",
        baseStats: {
            hp: 55,
            attack: 25,
            defense: 18,
            speed: 20
        },
        skills: ["Feu Sacré", "Renaissance", "Tempête de Feu", "Vol Rapide"],
        description: "L'oiseau de feu immortel qui renaît de ses cendres.",
        icon: "🔥",
        model: null
    },
    
    leviathan: {
        name: "Léviathan",
        type: "eau",
        rarity: "legendaire",
        baseStats: {
            hp: 70,
            attack: 22,
            defense: 20,
            speed: 12
        },
        skills: ["Raz-de-Marée", "Hydro-Canon", "Tourbillon", "Écailles d'Acier"],
        description: "Le seigneur des océans, une force de la nature.",
        icon: "🌊",
        model: null
    },
    
    spectre: {
        name: "Spectre des Ombres",
        type: "ombre",
        rarity: "legendaire",
        baseStats: {
            hp: 50,
            attack: 28,
            defense: 15,
            speed: 18
        },
        skills: ["Ombre Mortelle", "Disparition", "Drain de Vie", "Terreur"],
        description: "Une entité des ténèbres qui hante les âmes perdues.",
        icon: "👻",
        model: null
    }
};

/**
 * Pools de monstres par zone et rareté
 */
export const ZONE_ENCOUNTERS = {
    foret: {
        commun: ["Adoubee", "slime", "poussin", "ver"],
        peu_commun: ["loupGris", "renardFeu", "oiseau"],
        rare: ["dragon", "licorne"],
        legendaire: ["phenix"]
    },
    ville: {
        commun: ["Adoubee", "slime", "ver"],
        peu_commun: ["loupGris"],
        rare: [],
        legendaire: []
    },
    maison: {
        commun: ["slime", "ver"],
        peu_commun: [],
        rare: [],
        legendaire: []
    },
    grotte: {  // Pour future extension
        commun: ["ver", "slime"],
        peu_commun: ["golem"],
        rare: ["dragon", "golem"],
        legendaire: ["leviathan"]
    }
};

/**
 * Génère un monstre sauvage selon la zone et le niveau
 * @param {string} zone - Zone actuelle (foret, ville, etc.)
 * @param {number} playerLevel - Niveau moyen de l'équipe du joueur
 * @returns {Object} Monstre généré avec stats calculées
 */
export function generateWildMonster(zone, playerLevel = 5) {
    const zonePool = ZONE_ENCOUNTERS[zone] || ZONE_ENCOUNTERS.foret;
    
    // Déterminer la rareté (85% commun, 12% peu commun, 2.5% rare, 0.5% légendaire)
    const rarityRoll = Math.random();
    let rarity;
    if (rarityRoll < 0.85) rarity = "commun";
    else if (rarityRoll < 0.97) rarity = "peu_commun";
    else if (rarityRoll < 0.995) rarity = "rare";
    else rarity = "legendaire";
    
    // Fallback si pas de monstre de cette rareté
    if (!zonePool[rarity] || zonePool[rarity].length === 0) {
        rarity = "commun";
    }
    
    // Choisir un monstre aléatoire de cette rareté
    const pool = zonePool[rarity];
    const monsterKey = pool[Math.floor(Math.random() * pool.length)];
    const monsterData = MONSTERS_DATABASE[monsterKey];
    
    // Calculer le niveau (±2 du niveau du joueur)
    const level = Math.max(1, playerLevel + Math.floor(Math.random() * 5) - 2);
    
    // Calculer les stats finales
    const hp = monsterData.baseStats.hp + (level * 2);
    const attack = monsterData.baseStats.attack + Math.floor(level * 1.5);
    const defense = monsterData.baseStats.defense + Math.floor(level * 1.2);
    const speed = monsterData.baseStats.speed + level;
    
    return {
        key: monsterKey,
        name: monsterData.name,
        type: monsterData.type,
        rarity: monsterData.rarity,
        level: level,
        maxHp: hp,
        hp: hp,
        attack: attack,
        defense: defense,
        speed: speed,
        skills: [...monsterData.skills],
        description: monsterData.description,
        icon: monsterData.icon,
        model: monsterData.model,
        status: "OK",
        attacks: monsterData.skills.map(skill => ({ 
            name: skill, 
            power: 10 + (level * 2), 
            accuracy: 100 
        }))
    };
}

/**
 * Crée l'équipe de départ du joueur
 * @returns {Array} Équipe de 3 monstres de niveau 5
 */
export function createStarterTeam() {
    const starters = ["Adoubee", "poussin", "ver"];
    return starters.map(key => {
        const data = MONSTERS_DATABASE[key];
        const level = 5;
        const hp = data.baseStats.hp + (level * 2);
        
        return {
            key: key,
            name: data.name,
            type: data.type,
            rarity: data.rarity,
            level: level,
            maxHp: hp,
            hp: hp,
            attack: data.baseStats.attack + Math.floor(level * 1.5),
            defense: data.baseStats.defense + Math.floor(level * 1.2),
            speed: data.baseStats.speed + level,
            skills: [...data.skills],
            description: data.description,
            icon: data.icon,
            model: data.model,
            status: "OK", // Statut du monstre (OK, empoisonné, etc.)
            attacks: data.skills.map(skill => ({ 
                name: skill, 
                power: 10 + (level * 2), 
                accuracy: 100 
            }))
        };
    });
}
