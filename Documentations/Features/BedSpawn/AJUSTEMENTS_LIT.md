# 🔧 Ajustements et Personnalisation

## 🎯 Cas d'Usage Courants

### 1. Le Lit est Mal Détecté

**Symptôme:** Le message "🛏️ Lit détecté" n'apparaît pas

**Solution 1: Vérifier le nom du mesh**

Ouvrez la console (F12) et cherchez un log contenant "bed" ou "lit":
```
✅ HouseZone.glb chargé! 27 meshes importés
  - Mesh: floor
  - Mesh: wall_north
  - Mesh: furniture_01
  - Mesh: bed_wooden  ← C'est le lit!
  ...
```

**Solution 2: Ajouter le nom au code**

Modifiez ligne ~990 dans world.js:
```javascript
// Avant:
else if (m.name.toLowerCase().includes("lit") || 
         m.name.toLowerCase().includes("bed")) {

// Après:
else if (m.name.toLowerCase().includes("lit") || 
         m.name.toLowerCase().includes("bed") ||
         m.name.toLowerCase().includes("furniture_01")) {  // ← Ajoutez ici
```

---

### 2. La Position du Lit est Incorrecte

**Symptôme:** Le joueur spawn trop loin ou trop près du lit

**Diagnostic:**
Vérifiez la console:
```
🛏️ Position du lit mise à jour: Vector3 (5.2, 0.9, -3.5)
```

**Ajustements Possibles:**

#### Trop Loin du Lit? → Réduisez l'offset
```javascript
// Avant:
bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.9, bedWorldPos.z + 2);

// Après (plus proche):
bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.9, bedWorldPos.z + 0.5);
```

#### Trop Près? → Augmentez l'offset
```javascript
// Après (plus loin):
bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.9, bedWorldPos.z + 4);
```

#### Mauvais Côté? → Changez l'axe
```javascript
// À gauche du lit:
bedPosition = new BABYLON.Vector3(bedWorldPos.x - 2, 0.9, bedWorldPos.z);

// À droite du lit:
bedPosition = new BABYLON.Vector3(bedWorldPos.x + 2, 0.9, bedWorldPos.z);

// Derrière le lit:
bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.9, bedWorldPos.z - 2);
```

#### Trop Haut/Bas? → Ajustez Y
```javascript
// Plus haut:
bedPosition = new BABYLON.Vector3(bedWorldPos.x, 1.5, bedWorldPos.z + 2);

// Plus bas (sur le lit):
bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.5, bedWorldPos.z);
```

---

### 3. Le Joueur ne Revient Pas au Lit

**Symptôme:** Après une victoire, le joueur reste au même endroit

**Vérifications:**

#### Step 1: Callback Défini?
```javascript
// Dans la console, après démarrage:
console.log(typeof combatCallback);
// Devrait afficher: "function"
// Si "undefined" = problème!
```

#### Step 2: Combat Lancé Correctement?
Vérifiez que `startCombat()` est appelé:
- En interaction avec un PNJ
- En trouvant un Pokémon sauvage dans la forêt

#### Step 3: Importation Correcte?
Vérifiez ligne 4 de world.js:
```javascript
import { initiateCombat, setCombatCallback } from "./combat.js";
//                         ↑ Doit être présent
```

#### Step 4: Pas d'Erreur JS?
Vérifiez l'onglet "Console" pour les erreurs rouges

---

## 🎨 Personnalisations Avancées

### Ajouter une Animation au Retour

```javascript
function startCombat(options = {}) {
    setCombatCallback(async () => {
        // Fade to black
        await fadeToBlack();
        
        // Téléporter
        playerCollider.position = bedPosition.clone();
        
        // Message
        showDialog("Vous êtes retourné au lit...");
        
        // Fade back
        await fadeFromBlack();
    });
    
    initiateCombat(scene, camera, options);
}
```

### Régénération de Santé au Lit

```javascript
function startCombat(options = {}) {
    setCombatCallback(async () => {
        // Retour au lit
        playerCollider.position = bedPosition.clone();
        
        // Régénération
        const lead = gameState.team[0];
        if (lead) {
            lead.hp = lead.maxHp;
            showDialog("Vous avez dormi! Santé régénérée!");
        }
    });
    
    initiateCombat(scene, camera, options);
}
```

### Sauvegarde Automatique

```javascript
function startCombat(options = {}) {
    setCombatCallback(async () => {
        // Retour au lit
        playerCollider.position = bedPosition.clone();
        
        // Sauvegarde
        localStorage.setItem("lastGameState", JSON.stringify(gameState));
        showDialog("Jeu sauvegardé!");
    });
    
    initiateCombat(scene, camera, options);
}
```

### Plusieurs Spawn Points

```javascript
// Dans zoneSpawnPoints, ajouter plus de positions:
house: {
    fromVille: new BABYLON.Vector3(0, 0.9, -3),
    atBed: new BABYLON.Vector3(0, 0.9, -5),
    atChair: new BABYLON.Vector3(2, 0.9, -2),     // Nouvelle position
    atDesk: new BABYLON.Vector3(-2, 0.9, -2)      // Nouvelle position
}

// Puis changer de spawn selon le contexte:
function startCombat(options = {}) {
    const spawnLocation = Math.random() > 0.5 
        ? bedPosition 
        : zoneSpawnPoints.house.atChair;
    
    setCombatCallback(async () => {
        playerCollider.position = spawnLocation.clone();
    });
    
    initiateCombat(scene, camera, options);
}
```

---

## 🛡️ Sécurité et Validation

### Vérifier que bedPosition Existe

```javascript
function startCombat(options = {}) {
    // Validation de bedPosition
    if (!bedPosition || bedPosition === null) {
        console.error("❌ bedPosition non définie!");
        return;
    }
    
    // Callback sécurisé
    setCombatCallback(async () => {
        if (playerCollider && bedPosition) {
            playerCollider.position = bedPosition.clone();
        }
    });
    
    initiateCombat(scene, camera, options);
}
```

### Valider après Chaque Modification

```javascript
// Ajouter au début de createScene():
console.log("✅ Variables globales:");
console.log("  - bedPosition:", bedPosition);
console.log("  - playerCollider:", playerCollider);
console.log("  - scene:", scene);
```

---

## 📝 Modification du Lit Dynamiquement

### Changer de Lit Pendant le Jeu

```javascript
// Créer une fonction pour changer le lit actif:
function setActiveBed(newBedPosition) {
    bedPosition = newBedPosition.clone();
    zoneSpawnPoints.house.atBed = newBedPosition.clone();
    console.log("🛏️ Lit actif changé:", bedPosition);
}

// Usage:
setActiveBed(new BABYLON.Vector3(10, 0.9, 5));  // Nouveau lit
```

### Détecter Plusieurs Lits

```javascript
// Dans setupZoneHouse():
let beds = [];  // Tableau de lits

meshes.forEach((m) => {
    if (m.name.toLowerCase().includes("lit") || 
        m.name.toLowerCase().includes("bed")) {
        
        const pos = m.getAbsolutePosition();
        beds.push({
            mesh: m,
            position: pos,
            name: m.name
        });
        
        console.log(`🛏️ Lit détecté: ${m.name} à ${pos}`);
    }
});

// Utiliser le premier lit par défaut:
if (beds.length > 0) {
    bedPosition = beds[0].position;
}

// Accéder à d'autres lits:
// beds[1].position, beds[2].position, etc.
```

---

## 🔄 Cycles de Combat

### Combat à Intervalle Régulier

```javascript
function startCombat(options = {}) {
    setCombatCallback(async () => {
        playerCollider.position = bedPosition.clone();
        
        // Planifier un prochain combat
        setTimeout(() => {
            startCombat({ isWild: true });
        }, 5000);  // Prochain combat dans 5 secondes
    });
    
    initiateCombat(scene, camera, options);
}
```

### Compteur de Victoires

```javascript
let victoryCount = 0;

function startCombat(options = {}) {
    setCombatCallback(async () => {
        victoryCount++;
        console.log(`🏆 Victoires: ${victoryCount}`);
        
        playerCollider.position = bedPosition.clone();
        
        // Afficher un message spécial tous les 5 combats
        if (victoryCount % 5 === 0) {
            showDialog(`Excellent! ${victoryCount} victoires!`);
        }
    });
    
    initiateCombat(scene, camera, options);
}
```

---

## 🎭 Scénarios Avancés

### Mode de Difficulté Basé sur Lits

```javascript
const bedModes = {
    easy: {
        name: "Lit Confortable",
        position: new BABYLON.Vector3(0, 0.9, -5),
        hpRegenMultiplier: 1.5  // +50% santé
    },
    hard: {
        name: "Lit Inconfortable",
        position: new BABYLON.Vector3(5, 0.9, 0),
        hpRegenMultiplier: 0.5   // -50% santé
    }
};

function setDifficulty(mode) {
    bedPosition = bedModes[mode].position;
    console.log(`📍 Mode: ${bedModes[mode].name}`);
}
```

### Transitions Between Beds

```javascript
async function moveToNewBed(newBedPosition) {
    await fadeToBlack();
    bedPosition = newBedPosition.clone();
    playerCollider.position = bedPosition.clone();
    await fadeFromBlack();
    showDialog("Vous avez changé de lit!");
}
```

---

## 📊 Debugging Avancé

### Afficher la Vraie Position du Lit en Temps Réel

```javascript
// Dans la boucle d'update (scene.onBeforeRenderObservable):
let debugCounter = 0;
scene.onBeforeRenderObservable.add(() => {
    debugCounter++;
    if (debugCounter % 300 === 0) {  // Tous les 300 frames
        console.log("📍 Positions actuelles:");
        console.log("  bedPosition:", bedPosition);
        console.log("  player:", playerCollider.position);
        console.log("  distance:", BABYLON.Vector3.Distance(bedPosition, playerCollider.position));
    }
});
```

### Créer un Marqueur Visible au Lit

```javascript
// Dans setupZoneHouse(), après détection du lit:
if (bedMesh) {
    const marker = registerZoneMesh(
        BABYLON.MeshBuilder.CreateSphere("bedMarker", { diameter: 1 }, scene)
    );
    marker.position = bedPosition;
    const mat = new BABYLON.StandardMaterial("bedMarkerMat", scene);
    mat.emissiveColor = new BABYLON.Color3(1, 0, 0);  // Rouge
    mat.alpha = 0.3;
    marker.material = mat;
    
    console.log("📍 Marqueur du lit visible en rouge");
}
```

---

## ✅ Checklist de Personnalisation

- [ ] Position du lit ajustée correctement
- [ ] Lit détecté (console affiche le message)
- [ ] Callback fonctionne après combat
- [ ] Animation ajoutée (optionnel)
- [ ] Régénération implémentée (optionnel)
- [ ] Sauvegarde automatique (optionnel)
- [ ] Tests effectués

