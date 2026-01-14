# 📝 CHANGELOG - Digiters Game

Tous les changements notables du projet seront documentés ici.

## [2.0] - 14 janvier 2026

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
