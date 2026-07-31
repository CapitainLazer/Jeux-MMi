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
        // ===== ERROR — easter egg bug (effets "cheat") =====
        case "404":
            defender.stunned = true;
            logArr.push(`404 — ${defender.name} introuvable ! Il rate son prochain tour.`);
            break;
        case "Crash":
            // Dégâts déjà élevés ; chance de "kernel panic"
            if (Math.random() < 0.45) {
                defender.stunned = true;
                logArr.push("💥 KERNEL PANIC — le système plante un tour !");
            } else {
                logArr.push("Segmentation fault (core dumped)...");
            }
            break;
        case "Blue Screen":
            if (Math.random() < 0.55) {
                defender.stunned = true;
                logArr.push(`💻 BSOD ! ${defender.name} affiche un écran bleu et freeze.`);
            } else {
                logArr.push("Un écran bleu clignote…");
            }
            break;
        case "Glitch":
            // Corruption : shuffle stats + petit heal Error
            {
                const roll = Math.random();
                if (roll < 0.34) {
                    const tmp = defender.attack;
                    defender.attack = Math.max(1, defender.defense);
                    defender.defense = Math.max(1, tmp);
                    logArr.push(`🌀 GLITCH — stats de ${defender.name} corrompues (ATK↔DEF) !`);
                } else if (roll < 0.67) {
                    defender.precisionDown = (defender.precisionDown || 0) + 2;
                    logArr.push(`🌀 GLITCH — mémoire de ${defender.name} fragmentée !`);
                } else {
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + 40);
                    logArr.push("🌀 GLITCH — Error se régénère via un leak mémoire (+40 PV) !");
                }
            }
            break;
        case "Overflow":
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + 80);
            defender.defense = Math.max(1, defender.defense - 5);
            logArr.push("📈 OVERFLOW — buffer débordé ! Error récupère 80 PV, DEF adverse -5.");
            break;
        default:
            break;
    }
}
