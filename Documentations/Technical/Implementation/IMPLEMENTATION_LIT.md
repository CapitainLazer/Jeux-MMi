# 🛏️ Implémentation : Le Joueur Apparaît devant le Lit

## 📋 Résumé des Modifications

Votre jeu a été modifié pour:
1. **Démarrer devant le lit** au lieu de la ville
2. **Revenir devant le lit** après chaque victoire au combat

---

## 🔍 Changements Détaillés

### 1. **world.js** - Détection et Positionnement du Lit

#### Ajout du spawn point du lit (ligne ~270):
```javascript
// ✅ Position du lit (sera mise à jour dynamiquement au chargement du GLB)
let bedPosition = new BABYLON.Vector3(0, 0.9, -5);
```

Et dans les spawn points par zone:
```javascript
house: {  
    fromVille: new BABYLON.Vector3(0, 0.9, -3),   
    atBed: new BABYLON.Vector3(0, 0.9, -5)  // ✅ Position devant le lit
}
```

#### Détection du lit dans setupZoneHouse() (ligne ~972-1000):
```javascript
let bedMesh = null;  // ✅ Nouveau

// Dans la boucle des meshes:
else if (m.name.toLowerCase().includes("lit") || m.name.toLowerCase().includes("bed")) {
    bedMesh = m;
    m.checkCollisions = false;
    console.log(`🛏️ Lit détecté: ${m.name}`);
}

// ✅ Mise à jour dynamique de la position du lit si trouvé:
if (bedMesh) {
    bedMesh.computeWorldMatrix(true);
    bedMesh.refreshBoundingInfo();
    const bedWorldPos = bedMesh.getAbsolutePosition();
    bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.9, bedWorldPos.z + 2);
    zoneSpawnPoints.house.atBed = bedPosition.clone();
    console.log(`🛏️ Position du lit mise à jour: ${bedPosition.toString()}`);
}
```

#### Démarrage du jeu devant le lit (ligne ~1868):
**Avant:**
```javascript
switchZone("ville", new BABYLON.Vector3(0,0.9,0));
```

**Après:**
```javascript
// Zone de départ : MAISON (devant le lit)
switchZone("house", bedPosition.clone());
```

#### Callback après victoire au combat (ligne ~1328):
```javascript
function startCombat(options = {}) {
    // ✅ Définir le callback pour revenir au lit après une victoire
    setCombatCallback(async () => {
        console.log("🛏️ Retour au lit après la victoire...");
        playerCollider.position = bedPosition.clone();
        console.log(`👤 Joueur repositionné au lit: ${bedPosition.toString()}`);
    });
    
    initiateCombat(scene, camera, options);
}
```

---

### 2. **combat.js** - Système de Callback

#### Nouvelle fonction d'export (ligne ~12):
```javascript
// ✅ Fonction pour définir le callback après une victoire au combat
export function setCombatCallback(callback) {
    combatCallback = callback;
    console.log("📞 Combat callback défini pour:", callback.name || "anonymous");
}
```

---

### 3. **Import dans world.js** (ligne 4):
```javascript
import { initiateCombat, setCombatCallback } from "./combat.js";
//                                  ↑ Nouveau
```

---

## 🎮 Comment Ça Fonctionne

### Démarrage du Jeu:
1. Le jeu appelle `createScene()`
2. Le HouseZone.glb se charge
3. Le lit est **automatiquement détecté** si le mesh contient "lit" ou "bed" dans son nom
4. La position du lit est mise à jour vers les vraies coordonnées du GLB
5. Le joueur **spawne devant le lit** (`bedPosition + offset Z = 2`)

### Après une Victoire au Combat:
1. Le combat se termine via `endCombat()`
2. Le `combatCallback` est exécuté
3. Le joueur est **repositionné devant le lit**
4. Il est prêt pour un nouveau combat

---

## 🔧 Ajustements Possibles

### Si le lit est mal détecté:
- Vérifiez que le mesh du lit dans le GLB contient **"lit"** ou **"bed"** (insensible à la casse)
- Sinon, ajoutez le nom exact à la condition ligne ~990

### Si la position devant le lit est incorrecte:
- Changez l'offset `Z + 2` à une autre valeur (ligne ~998)
- Exemple: `bedWorldPos.z - 2` pour l'opposé, `bedWorldPos.z + 3` pour plus loin, etc.

### Pour revenir ailleurs après un combat:
- Modifiez le callback dans `startCombat()` (ligne ~1328)
- Exemple: `playerCollider.position = new BABYLON.Vector3(x, y, z);`

---

## ✅ Validation

**Vérifications à faire:**

1. ✅ Le jeu démarre-t-il dans la maison?
2. ✅ Console affiche-t-elle "🛏️ Lit détecté: ..."?
3. ✅ Après un combat, êtes-vous repositionné au lit?
4. ✅ La console affiche-t-elle "🛏️ Retour au lit après la victoire..."?

---

## 📝 Notes Importantes

- **bedPosition** est une variable globale accessible partout dans `world.js`
- **Le callback se déclenche automatiquement** après chaque victoire
- **Les coordonnées du lit sont dynamiques** - elles s'ajustent au vrai GLB
- **Le lit doit avoir une collision** si vous voulez qu'il bloque le joueur (voir la liste `objectsWithCollision`)

---

## 🚀 Prochaines Étapes Optionnelles

1. Ajouter une animation ou un dialogue quand le joueur revient au lit
2. Implémenter un système de santé qui se régénère au lit
3. Sauvegarder automatiquement le jeu au lit
4. Ajouter des interactions spéciales au lit (dormir, voir les stats, etc.)

