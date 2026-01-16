# 📝 CHANGELOG - Digiters Game

Tous les changements notables du projet seront documentés ici.

## [2.2.0] - 16 janvier 2026 - Session 5 : Interactions Avancées

### 🌟 Nouvelles Fonctionnalités

#### 🖥️ PC Interactif
- **Interaction avec le PC** : Ouvre une iframe plein écran avec un site web
- **Animation de caméra** : Transition fluide vers le PC avant l'ouverture
- **Détection automatique** : Trouve le mesh "pcScreen" dans le GLB
- **Controles** : Echap, E ou B pour quitter la vue PC

#### 🛏️ Lit Interactif
- **Dialogue de confirmation** : "Veux-tu te reposer et soigner tes Digiters ?"
- **Animation de soin** : Fondu au noir pendant 1.5s
- **Soin complet** : Tous les Digiters soignés à HP max
- **Sauvegarde automatique** après le soin

#### 🎯 Système d'Interaction par Direction
- **Priorité intelligente** : L'objet face au joueur est prioritaire
- **Calcul du champ de vision** : Angle de 70° devant le joueur
- **Gestion des espaces étroits** : Plus de conflits entre objets proches

#### 👤 Nouveau Modèle Joueur
- **Mcharacter.gltf** : Remplacement du modèle de personnage

#### 🏠 Améliorations Maison
- **Murs de collision** : Ajout mur droit et mur bas
- **Remplacement Pokémon → Digiters** : Dans tous les dialogues

### 🔧 Technique
- `addComputer()` : Nouvelle fonction pour PC interactables
- `addBed()` : Nouvelle fonction pour lits interactables  
- `getInteractionPriority()` : Calcul de priorité par direction
- `showHealConfirmation()` : Dialogue de confirmation
- `healAtBed()` : Animation de soin avec fondu
- `showFullscreenIframe()` / `hideFullscreenIframe()` : Gestion iframe

**Statut:** ✅ Stable

---

## [2.1.1] - 14 janvier 2026 (Soir) - Patch Mobile

### 🎯 Bugfixes & Optimisations Mobiles

#### 🐛 Corrigé
- **Boutons d'action superposés au HUD vitesse** : Remontés à `bottom: 100px` (était 30px)
- **HUD vitesse masqué sur mobile** : Utilise les boutons à la place
- **Interface combat trop grande sur mobile** : Compactée (hauteur 190px → 130px)
- **Téléportation hors map au changement de zone** : Anti-spam augmenté 1.5s → 3s

#### 🔄 Modifié
- **JS/mobileControls.js** : Boutons disposés verticalement + taille réduite (70px → 65px)
- **CSS/style.css** : HUD masqué mobile + combat responsive + interface compacte
- **JS/world.js** : Cooldown transition zone 1.5s → 3s (protection téléportation)

#### 📚 Documentation
- Mise à jour `CHANGELOG.md` : Patch 2.1.1 documenté
- Mise à jour `README.md` : Version → 2.1.1
- Mise à jour `SESSION_4_MOBILE.md` : Ajout section bugfixes

**Statut:** ✅ Mobile optimisé et stable

---

## [2.1] - 14 janvier 2026 (PM)

### 🎯 Session 4 - Version Mobile Complète ⭐

#### ✅ Nouveau
- **Détection Mobile Automatique** : Activation des contrôles tactiles sur mobile/tablet
- **Joystick Virtuel** : Zone tactile gauche avec knob doré (déplacement + navigation)
- **Boutons d'Action** : 🅰️ Courir/Valider + 🅱️ Interagir/Retour
- **Mode Plein Écran** : Bouton fullscreen + verrouillage orientation paysage
- **Support Combat Mobile** : Navigation joystick + boutons A/B en combat
- **Optimisations Mobile** : Meta viewport, safe areas iOS, hauteur dynamique (dvh)

#### 🔄 Modifié
- **JS/mobileControls.js** : ⭐ Nouveau fichier (615 lignes) - Système complet tactile
- **JS/world.js** : Import mobileControls, initialisation, joystick dans boucle mouvement
- **JS/combat.js** : Export `handleCombatKeyboard()` pour appels mobiles
- **index.html** : Meta viewport mobile + PWA support
- **CSS/style.css** : Touch-action, safe areas, responsive, 100dvh

#### 📚 Documentation
- ⭐ Création `SESSION_4_MOBILE.md` (Documentation complète Session 4)
- Mise à jour `README.md` : Ajout contrôles mobiles + fichiers modifiés
- Mise à jour `CHANGELOG.md` : Session 4 documentée
- Mise à jour `INDEX_DOCUMENTATION.md` : Navigation Session 4

**Voir:** [SESSION_4_MOBILE.md](SESSION_4_MOBILE.md) pour détails techniques complets

---

## [2.0] - 14 janvier 2026 (AM)

### 🎯 Session 3 - Corrections Critiques et Sauvegarde

#### ✅ Nouveau
- **Sauvegarde Complète** : Position, zone, inventaire, équipe, objets collectés
- **Auto-sauvegarde** : localStorage toutes les 30s + avant fermeture page
- **Sauvegarde/Chargement Fichier** : Export JSON + restauration
- **Indicateur Pokémon Amélioré** : Flèche + couleur PV + infos complètes
- **Callbacks Victoire/Défaite** : Séparation claire `setDefeatCallback()` / `setVictoryCallback()`

#### 🐛 Corrigé
- **Écran noir persistant** : `returnToExploration()` maintenant appelé dans `endCombat()`
- **Menu ne fermant pas** : Nettoyage overlay après chargement sauvegarde
- **Objets respawning** : Système de `collectedItems` pour mémoriser objets ramassés
- **Fade noir en combat** : Lissage des transitions noir à l'entrée et sortie

#### 🔄 Modifié
- `JS/combat.js` : Callbacks séparés, savedExplorationState global, endCombat amélioré
- `JS/world.js` : Exposition getters/setters, marquage items collectés, auto-sauvegarde
- `JS/menuSystem.js` : Sauvegarde complète, indicateur visuel amélioré, fermeture menu fixe
- `JS/state.js` : Ajout champs position, zone, collectedItems, callbacks globaux
- `JS/main.js` : Hook beforeunload pour sauvegarde avant fermeture

#### 📚 Documentation
- Ajout `BugFix/SESSION_3_CORRECTIONS.md` (corrections détaillées)
- Mise à jour `README.md` (vue générale Session 3)
- Mise à jour `INDEX_DOCUMENTATION.md` (structure révisée)

---

## [1.1] - 13 janvier 2026

### 🎯 Session 2 - Système de Défaite et Retour au Lit

#### ✅ Nouveau
- **Callback Victoire/Défaite** : `setCombatCallback()` pour actions après combat
- **Retour au Lit Automatique** : Défaite → repositionnement au lit
- **Logique Inversée Fixée** : Maintenant retour au lit sur DÉFAITE (tous Pokémon KO)

#### 🐛 Corrigé
- Confusion victoire/défaite dans la logique callback
- Callback déclenchait sur TOUS les combats au lieu de défaite uniquement

#### 🔄 Modifié
- `JS/combat.js` : Ajout `setCombatCallback()` export
- `JS/world.js` : Callback défini dans `startCombat()`, utilise position du lit

#### 📚 Documentation
- Création 14 fichiers documentation détaillée
- Guides pour débutants, architecture technique, tests

---

## [1.0] - 12 janvier 2026


### 🎯 Session 1 - Système du Lit et Spawn

#### ✅ Nouveau
- **Détection Automatique du Lit** : HouseZone.glb scanné à l'import
- **Spawn au Lit** : Joueur démarre devant le lit au lieu de la ville
- **Position Persistante** : Lit repositionne le joueur après combat victoire

#### 🎮 Mécanique
- Chargement zone `house` au démarrage
- Détection mesh contenant "lit" ou "bed"
- Callback pour combat post-victoire

#### 📂 Fichiers Créés
- Système de callback pour communication world.js ↔ combat.js
- Variable globale `bedPosition` pour spawn

#### 📚 Documentation
- 13 fichiers documentation
- Guides d'implémentation et de test

---

## [0.5] - Avant le projet

### 🎮 Système de Base
- BabylonJS scene setup
- Exploration 3 zones (house, ville, forêt)
- Combat système basique
- Menu d'inventaire
- Rencontres sauvages

---

## 📊 Résumé des Versions

| Version | Date | Focus |
|---------|------|-------|
| 2.0 | 14 jan 2026 | Sauvegarde + Corrections bugs |
| 1.1 | 13 jan 2026 | Logique victoire/défaite |
| 1.0 | 12 jan 2026 | Système du lit |
| 0.5 | Avant | Base du jeu |

---

## 🚀 Statut Actuel

| Composant | Statut |
|-----------|--------|
| 🌍 Exploration | ✅ Stable |
| ⚔️ Combat | ✅ Stable |
| 💾 Sauvegarde | ✅ Stable |
| 🛏️ Lit System | ✅ Stable |
| 📦 Inventaire | ✅ Stable |
| 🎯 Indicateurs | ✅ Stable |
| 📚 Documentation | ✅ Complète |

---

## 🔮 Prochaines Sessions Prévues

### Session 4 (Anticipé)
- [ ] Plus de zones
- [ ] Pokémon variés
- [ ] Système d'expérience
- [ ] Évolutions

### Session 5 (Anticipé)
- [ ] Capture système
- [ ] Pokédex
- [ ] Dresseurs
- [ ] Badges

### Session 6+ (Anticipé)
- [ ] Ligue Pokémon
- [ ] Trading
- [ ] Cloud save
- [ ] Multijoueur

---

## 🎓 Concepts Appris

### Session 1
✅ Détection dynamique de meshes  
✅ Système de callbacks  
✅ Manipulation Vector3  

### Session 2
✅ Logique victoire/défaite  
✅ Async/await  
✅ Communication modules  

### Session 3
✅ Sauvegarde localStorage  
✅ Gestion d'état complexe  
✅ Restauration de session  
✅ Gestion d'erreurs  

---

**Format:** [Semantic Versioning](https://semver.org/)  
**Statut:** Actif  
**Dernière mise à jour:** 14 janvier 2026  
**Mainteneur:** GitHub Copilot
