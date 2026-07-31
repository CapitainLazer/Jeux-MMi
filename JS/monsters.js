// monsters.js

/**
 * 🎮 SYSTÈME DE GESTION DES MONSTRES (DIGITERS)
 *
 * - Base de données des monstres
 * - Table des types (style Pokémon)
 * - Attaques avec puissance / précision / type
 * - Génération sauvage & starters
 * - Construction d'instances pour dresseurs
 */

console.log("🐉 Chargement monsters.js");

/** Types disponibles */
export const TYPES = ["eau", "poison", "legendaire", "normal"];

/**
 * Table d'efficacité des types (attaquant → défenseur)
 * 2 = super efficace, 0.5 = peu efficace, 1 = neutre
 */
export const TYPE_CHART = {
    eau: { eau: 0.5, poison: 2, legendaire: 0.5, normal: 1 },
    poison: { eau: 2, poison: 0.5, legendaire: 0.5, normal: 1 },
    legendaire: { eau: 1, poison: 1, legendaire: 1, normal: 1.5 },
    normal: { eau: 1, poison: 1, legendaire: 0.5, normal: 1 }
};

/**
 * Catalogue des attaques (puissance / précision / type / effet optionnel)
 */
export const MOVE_DATABASE = {
    // Adoubee (Adobe)
    Photoshop:      { power: 40, accuracy: 95, type: "eau", effect: "Baisse la précision" },
    Illustrator:    { power: 55, accuracy: 85, type: "eau", effect: "Ignore la défense" },
    "After Effects":{ power: 45, accuracy: 90, type: "eau", effect: "30% étourdissement" },
    "Premiere Rush":{ power: 35, accuracy: 100, type: "eau", effect: "Boost vitesse" },
    Lightroom:      { power: 0, accuracy: 100, type: "eau", effect: "Soin ou +DEF" },
    InDesign:       { power: 30, accuracy: 95, type: "eau", effect: "Baisse l'attaque" },
    // Pedro
    Morsure:        { power: 50, accuracy: 90, type: "poison" },
    Sifflement:     { power: 0, accuracy: 100, type: "poison", effect: "Intimidation" },
    Poison:         { power: 40, accuracy: 95, type: "poison", effect: "Empoisonne" },
    "Croc Fatal":   { power: 65, accuracy: 80, type: "poison" },
    // Bases
    Tackle:         { power: 40, accuracy: 100, type: "normal" },
    Splash:         { power: 0, accuracy: 100, type: "eau", effect: "Sans effet..." },
    "Coup de chapeau": { power: 35, accuracy: 100, type: "normal" },
    Sourire:        { power: 0, accuracy: 100, type: "normal", effect: "Charme" },
    HTML5:          { power: 45, accuracy: 95, type: "normal" },
    CSS3:           { power: 40, accuracy: 100, type: "normal" },
    // Error (légendaire)
    "404":          { power: 55, accuracy: 90, type: "legendaire" },
    Crash:          { power: 70, accuracy: 75, type: "legendaire" },
    "Blue Screen":  { power: 60, accuracy: 85, type: "legendaire", effect: "30% étourdissement" },
    Glitch:         { power: 45, accuracy: 95, type: "legendaire" },
    Overflow:       { power: 80, accuracy: 70, type: "legendaire" }
};

/**
 * Dictionnaire de tous les monstres disponibles
 */
export const MONSTERS_DATABASE = {
    Pedro: {
        name: "Pedro",
        type: "poison",
        rarity: "commun",
        baseStats: {
            hp: 45,
            attack: 12,
            defense: 8,
            speed: 10
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
            hp: 70,
            attack: 22,
            defense: 16,
            speed: 14
        },
        skills: ["404", "Crash", "Blue Screen", "Glitch"],
        description: "Un bug s'est glissé dans la matrice...",
        icon: "❌",
        model: "./Assets/models/animations/error_text.glb",
        combatPosition: { x: 0, y: 0, z: 0 },
        combatRotation: 0
    },
    Adoubee: {
        name: "Adoubee",
        type: "eau",
        rarity: "commun",
        baseStats: {
            hp: 40,
            attack: 10,
            defense: 9,
            speed: 11
        },
        skills: [
            "Photoshop",
            "Illustrator",
            "After Effects",
            "Premiere Rush",
            "Lightroom",
            "InDesign"
        ],
        description: "Un nuage flottant. Des yeux captivants.",
        icon: "💧",
        model: "./Assets/models/animations/Adoubee.gltf",
        combatPosition: { x: 0, y: 0, z: 0 },
        combatRotation: 0
    }
};

/**
 * Pools de monstres par zone et rareté
 */
export const ZONE_ENCOUNTERS = {
    foret: {
        commun: ["Pedro", "Adoubee"],
        peu_commun: ["Pedro"],
        rare: ["Adoubee"],
        legendaire: ["Error"]
    },
    ville: {
        commun: ["Pedro", "Adoubee"],
        peu_commun: ["Adoubee"],
        rare: ["Pedro"],
        legendaire: [] // Pas de légendaire en ville
    }
};

/**
 * Multiplicateur d'efficacité de type
 */
export function getTypeEffectiveness(attackType, defenderType) {
    const atk = attackType || "normal";
    const def = defenderType || "normal";
    const row = TYPE_CHART[atk];
    if (!row) return 1;
    return row[def] !== undefined ? row[def] : 1;
}

/**
 * Construit une attaque à partir du catalogue
 */
export function buildAttack(skillName, level = 5) {
    const move = MOVE_DATABASE[skillName];
    if (!move) {
        return {
            name: skillName,
            power: 10 + level * 2,
            accuracy: 95,
            type: "normal",
            effect: null
        };
    }
    // Légère échelle avec le niveau (style Pokémon)
    const levelBonus = Math.floor(level / 5);
    return {
        name: skillName,
        power: move.power > 0 ? move.power + levelBonus : 0,
        accuracy: move.accuracy,
        type: move.type || "normal",
        effect: move.effect || null
    };
}

/**
 * Calcule les stats d'un Digiter à un niveau donné
 */
export function calcStats(baseStats, level) {
    return {
        maxHp: baseStats.hp + level * 3,
        attack: baseStats.attack + Math.floor(level * 1.2),
        defense: baseStats.defense + Math.floor(level * 1.0),
        speed: baseStats.speed + Math.floor(level * 1.1)
    };
}

/**
 * Construit une instance de monstre complète (sauvage, starter ou dresseur)
 * @param {string|Object} source - Clé DB ou template partiel { name, key, level, attacks... }
 * @param {number} [levelOverride]
 */
export function buildMonsterInstance(source, levelOverride) {
    let key;
    let template = {};

    if (typeof source === "string") {
        key = source;
    } else if (source && typeof source === "object") {
        template = source;
        key = source.key || source.name;
    } else {
        key = "Adoubee";
    }

    const monsterData = MONSTERS_DATABASE[key];
    const level = levelOverride || template.level || 5;

    if (!monsterData) {
        // Template libre (sans entrée DB)
        const hp = template.maxHp || template.hp || 30 + level * 3;
        const skills = template.skills || (template.attacks || []).map(a => a.name);
        return {
            key: key || "Unknown",
            name: template.name || "Inconnu",
            type: template.type || "normal",
            rarity: template.rarity || "commun",
            level,
            maxHp: hp,
            hp: template.hp !== undefined ? template.hp : hp,
            attack: template.attack || 10 + level,
            defense: template.defense || 8 + level,
            speed: template.speed || 8 + level,
            skills: skills.length ? skills : ["Tackle"],
            description: template.description || "",
            icon: template.icon || "❓",
            model: template.model || null,
            status: "OK",
            attacks: (template.attacks && template.attacks.length)
                ? template.attacks.map(a => ({
                    name: a.name,
                    power: a.power,
                    accuracy: a.accuracy ?? 95,
                    type: a.type || "normal",
                    effect: a.effect || null
                }))
                : [buildAttack("Tackle", level)],
            combatPosition: template.combatPosition || { x: 0, y: 0, z: 0 },
            combatRotation: template.combatRotation !== undefined ? template.combatRotation : 0
        };
    }

    const stats = calcStats(monsterData.baseStats, level);
    // 4 attaques max (style Pokémon) — les 2–4 premières skills selon le niveau
    const skillCount = Math.min(4, Math.max(2, 1 + Math.floor(level / 4)));
    const skills = monsterData.skills.slice(0, skillCount);

    // Attaques custom du template prioritaire si fournies
    let attacks;
    if (template.attacks && template.attacks.length) {
        attacks = template.attacks.map(a => {
            const catalog = MOVE_DATABASE[a.name];
            return {
                name: a.name,
                power: a.power ?? (catalog ? catalog.power : 30),
                accuracy: a.accuracy ?? (catalog ? catalog.accuracy : 95),
                type: a.type || (catalog ? catalog.type : monsterData.type),
                effect: a.effect || (catalog ? catalog.effect : null)
            };
        });
    } else {
        attacks = skills.map(s => buildAttack(s, level));
    }

    return {
        key,
        name: monsterData.name,
        type: monsterData.type,
        rarity: monsterData.rarity,
        level,
        maxHp: template.maxHp || stats.maxHp,
        hp: template.hp !== undefined ? template.hp : (template.maxHp || stats.maxHp),
        attack: template.attack || stats.attack,
        defense: template.defense || stats.defense,
        speed: template.speed || stats.speed,
        skills: [...monsterData.skills],
        description: monsterData.description,
        icon: monsterData.icon,
        model: monsterData.model,
        status: "OK",
        attacks,
        combatPosition: monsterData.combatPosition || { x: 0, y: 0, z: 0 },
        combatRotation: monsterData.combatRotation !== undefined ? monsterData.combatRotation : 0
    };
}

/**
 * Génère un monstre sauvage selon la zone et le niveau
 */
export function generateWildMonster(zone, playerLevel = 5) {
    const zonePool = ZONE_ENCOUNTERS[zone] || ZONE_ENCOUNTERS.foret;

    // 80% commun, 15% peu commun, 4.5% rare, 0.5% légendaire
    const rarityRoll = Math.random();
    let rarity;
    if (rarityRoll < 0.80) rarity = "commun";
    else if (rarityRoll < 0.95) rarity = "peu_commun";
    else if (rarityRoll < 0.995) rarity = "rare";
    else rarity = "legendaire";

    if (!zonePool[rarity] || zonePool[rarity].length === 0) {
        rarity = "commun";
    }

    const pool = zonePool[rarity];
    const monsterKey = pool[Math.floor(Math.random() * pool.length)];

    // Niveau ±2 autour du joueur, un peu plus haut en forêt
    const zoneBonus = zone === "foret" ? 1 : 0;
    const level = Math.max(2, playerLevel + zoneBonus + Math.floor(Math.random() * 5) - 2);

    return buildMonsterInstance(monsterKey, level);
}

/**
 * Crée l'équipe de départ du joueur
 */
export function createStarterTeam() {
    return ["Adoubee", "Pedro"].map(key => buildMonsterInstance(key, 5));
}
