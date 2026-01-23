// attackEffects.js
// Effets spéciaux pour les attaques personnalisées (Adobe suite, etc.)

export function applyAttackEffect(attack, attacker, defender, logArr) {
    switch (attack.name) {
        case "Photoshop":
            // Altère l'apparence : baisse la précision de l'ennemi
            defender.precisionDown = (defender.precisionDown || 0) + 1;
            logArr.push(`${defender.name} voit son apparence altérée ! Précision réduite.`);
            break;
        case "Illustrator":
            // Attaque de précision : ignore la défense
            attack.ignoreDefense = true;
            logArr.push(`${attacker.name} utilise une attaque ultra précise ! Défense ignorée.`);
            break;
        case "After Effects":
            // Effet visuel : chance d'étourdir
            if (Math.random() < 0.3) {
                defender.stunned = true;
                logArr.push(`${defender.name} est ébloui par les effets et rate son prochain tour !`);
            }
            break;
        case "Premiere Rush":
            // Attaque rapide : double la vitesse ce tour
            attacker.speedBoost = true;
            logArr.push(`${attacker.name} devient super rapide !`);
            break;
        case "Lightroom":
            // Soigne ou booste la défense
            if (Math.random() < 0.5) {
                attacker.hp = Math.min(attacker.maxHp, attacker.hp + 15);
                logArr.push(`${attacker.name} se soigne grâce à Lightroom !`);
            } else {
                attacker.defense += 3;
                logArr.push(`${attacker.name} améliore sa défense avec Lightroom !`);
            }
            break;
        case "InDesign":
            // Désorganise l'ennemi : baisse l'attaque de l'ennemi
            defender.attack = Math.max(1, defender.attack - 3);
            logArr.push(`${defender.name} est désorganisé, son attaque baisse !`);
            break;
        default:
            // Pas d'effet spécial
            break;
    }
}
