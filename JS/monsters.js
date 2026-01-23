// monsters.js

/**
 * 🎮 SYSTÈME DE GESTION DES MONSTRES (DIGITERS)
 * 
 * Ce fichier contient :
 * - Base de données complète des monstres
 * - Génération de monstres sauvages selon la zone
 * - Création de l'équipe de départ
 * - Pools de rencontres par zone et rareté
 * - Positions et rotations des monstres en combat
 */

console.log("🐉 Chargement monsters.js");

/**
 * Dictionnaire de tous les monstres disponibles dans le jeu
 * Chaque monstre a des stats de base qui sont multipliées par le niveau
 * ✅ AJOUT: combatPosition et combatRotation pour le placement en combat
 */
export const MONSTERS_DATABASE = {
    Pedro: {
        name: "Pedro",
        type: "poison",
        rarity: "commun",
        baseStats: {
            hp: 50,
            attack: 12,
            defense: 8,
            speed: 7
        },
        skills: ["Morsure", "Sifflement", "Poison", "Croc Fatal"],
        description: "Pedro, le serpent mystérieux.",
        icon: "🐍",
        model: "./Assets/models/animations/Pedro.gltf",
        combatPosition: { x: 0, y: 0, z: 0 },
        combatRotation: 180
    },
    Error: {
        name: "Error",
        type: "legendaire",
        rarity: "legendaire",
        baseStats: {
            hp: 999,
            attack: 999,
            defense: 999,
            speed: 1
        },
        skills: ["404", "Crash", "Blue Screen", "Glitch", "Overflow"],
        description: "Un bug s'est glissé dans la matrice...",
        icon: "❌",
        model: "./Assets/models/animations/error_text.glb",
        combatPosition: { x: 0, y: 0, z: 0 },
        combatRotation: 0
    },
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
        skills: [
            "Photoshop",      // altère l'apparence de l'ennemi
            "Illustrator",    // attaque de précision
            "After Effects",  // attaque animée, effet visuel
            "Premiere Rush",  // attaque rapide
            "Lightroom",      // soigne ou booste la défense
            "InDesign"        // attaque stratégique, désorganise l'ennemi
        ],
        description: "Un nuage flottant. Des yeux captivant.",
        icon: "💧",
        model: "./Assets/models/animations/Adoubee.gltf",
        combatPosition: { x: 0, y: 0, z: 0 },
        combatRotation: 0
    },
    
    // ===== MONSTRES INTERMÉDIAIRES (Niveau 10-20) =====
    // (Tous les monstres sans model ont été retirés)
};

/**
 * Pools de monstres par zone et rareté
 */
export const ZONE_ENCOUNTERS = {
    foret: {
        commun: ["Pedro", "Adoubee"],
        peu_commun: [],
        rare: [],
        legendaire: ["Error"]
    },
    ville: {
        commun: ["Pedro", "Adoubee"],
        peu_commun: [],
        rare: [],
        legendaire: ["Error"]
    }
};

/**
 * Génère un monstre sauvage selon la zone et le niveau
 * ✅ AJOUT: Inclut combatPosition et combatRotation
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
        })),
        // ✅ Inclure les données de position/rotation
        combatPosition: monsterData.combatPosition || { x: 0, y: 0, z: 0 },
        combatRotation: monsterData.combatRotation !== undefined ? monsterData.combatRotation : 0
    };
}

/**
 * Crée l'équipe de départ du joueur
 * ✅ MODIFIÉ: Uniquement Pedro et Adoubee
 * @returns {Array} Équipe de 2 monstres de niveau 5
 */
export function createStarterTeam() {
    const starters = ["Adoubee", "Pedro"];
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
            status: "OK",
            attacks: data.skills.map(skill => ({ 
                name: skill, 
                power: 10 + (level * 2), 
                accuracy: 100 
            })),
            // ✅ Inclure les données de position/rotation
            combatPosition: data.combatPosition || { x: 0, y: 0, z: 0 },
            combatRotation: data.combatRotation !== undefined ? data.combatRotation : 180
        };
    });
}