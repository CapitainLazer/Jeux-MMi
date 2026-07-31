// attackEffects.js
// Effets spéciaux pour les attaques (style Pokémon)

export function applyAttackEffect(attack, attacker, defender, logArr) {
    switch (attack.name) {
        case "Photoshop":
            defender.precisionDown = (defender.precisionDown || 0) + 1;
            logArr.push(`${defender.name} voit son apparence altérée ! Précision réduite.`);
            break;
        case "Illustrator":
            attack.ignoreDefense = true;
            logArr.push(`${attacker.name} utilise une attaque ultra précise ! Défense ignorée.`);
            break;
        case "After Effects":
        case "Blue Screen":
            if (Math.random() < 0.3) {
                defender.stunned = true;
                logArr.push(`${defender.name} est ébloui et rate son prochain tour !`);
            }
            break;
        case "Premiere Rush":
            attacker.speedBoost = true;
            logArr.push(`${attacker.name} devient super rapide !`);
            break;
        case "Lightroom":
            if (Math.random() < 0.5) {
                const heal = Math.max(10, Math.floor(attacker.maxHp * 0.25));
                attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
                logArr.push(`${attacker.name} récupère ${heal} PV grâce à Lightroom !`);
            } else {
                attacker.defense += 3;
                logArr.push(`${attacker.name} améliore sa défense avec Lightroom !`);
            }
            break;
        case "InDesign":
            defender.attack = Math.max(1, defender.attack - 3);
            logArr.push(`${defender.name} est désorganisé, son attaque baisse !`);
            break;
        case "Sifflement":
            defender.attack = Math.max(1, defender.attack - 2);
            logArr.push(`${defender.name} est intimidé ! Son attaque baisse.`);
            break;
        case "Poison":
            defender.poisoned = true;
            logArr.push(`${defender.name} est empoisonné !`);
            break;
        case "Splash":
            logArr.push("Mais rien ne se passe...");
            break;
        case "Sourire":
            defender.precisionDown = (defender.precisionDown || 0) + 1;
            logArr.push(`${defender.name} est charmé ! Précision réduite.`);
            break;
        default:
            break;
    }
}
