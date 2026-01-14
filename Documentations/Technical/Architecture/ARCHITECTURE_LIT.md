# 🎮 Architecture du Système Lit

## 📊 Flux Général

```
┌─────────────────────────────────────────────────────────────────┐
│                   DÉMARRAGE DU JEU                              │
├─────────────────────────────────────────────────────────────────┤
│  1. main.js appelle createScene()                               │
│  2. HouseZone.glb se charge dans setupZoneHouse()               │
│  3. Détection du lit (mesh.name inclut "lit" ou "bed")          │
│  4. bedPosition = position du lit + offset (Z+2 = devant)      │
│  5. Joueur spawne à bedPosition                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
            ┌──────────────────────────┐
            │   JOUEUR EN EXPLORATION   │
            │  Position: devant le lit  │
            └────────────┬─────────────┘
                         │
           ┌─────────────┴──────────────┐
           │                            │
           ▼                            ▼
    ┌─────────────┐            ┌──────────────┐
    │ Marche      │ ou        │ Combat       │
    │ Explore     │           │ Sauvage/PNJ  │
    └─────────────┘           └───────┬──────┘
                                      │
                        ┌─────────────┴──────────────┐
                        │                            │
                        ▼                            ▼
                   ┌──────────┐            ┌────────────────┐
                   │ VICTOIRE │            │ DÉFAITE        │
                   └────┬─────┘            └────────────────┘
                        │
                        ▼
              ┌────────────────────────┐
              │ combatCallback() exécuté│
              │ playerCollider.position│
              │   = bedPosition        │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Joueur retour au lit  │
              │  Prêt pour nouveau     │
              │  combat                │
              └────────────────────────┘
```

---

## 🗂️ Structure des Fichiers Modifiés

```
JS/
├── world.js
│   ├── ligne 4: Import setCombatCallback
│   ├── ligne ~255: zoneSpawnPoints avec atBed
│   ├── ligne ~272: Déclaration bedPosition
│   ├── ligne ~990: Détection du lit dans setupZoneHouse()
│   ├── ligne ~998: Mise à jour dynamique de bedPosition
│   ├── ligne ~1335: Callback dans startCombat()
│   └── ligne ~1868: Démarrage au lit au lieu de la ville
│
└── combat.js
    ├── ligne 4: Import { fadeToBlack, fadeFromBlack }
    ├── ligne 12: Fonction export setCombatCallback()
    └── ligne 862-870: Appel de combatCallback() dans endCombat()
```

---

## 🔄 Détail du Système de Callback

### Phase 1: Initialisation
```javascript
// world.js, fonction startCombat()
setCombatCallback(async () => {
    playerCollider.position = bedPosition.clone();
    // ↑ Ceci sera exécuté après la victoire
});
```

### Phase 2: Combat Termine
```javascript
// combat.js, fonction endCombat()
if (combatCallback) {
    await combatCallback();  // ← Exécution du callback
}
await returnToExploration(savedExplorationState);
```

### Phase 3: Retour au Lit
```
Le joueur réapparaît automatiquement devant le lit
✓ Sans fade (déjà dans la même zone)
✓ Avec les PV mis à jour du Pokémon
✓ Prêt pour un nouveau combat
```

---

## 🧪 Variables Clés

| Variable | Scope | Type | Description |
|----------|-------|------|-------------|
| `bedPosition` | global (world.js) | Vector3 | Position du lit détectée du GLB |
| `zoneSpawnPoints.house.atBed` | global | Vector3 | Clone de bedPosition |
| `combatCallback` | global (combat.js) | Function | Callback exécuté après victoire |
| `bedMesh` | local (setupZoneHouse) | Mesh | Référence au mesh du lit |
| `playerCollider.position` | global | Vector3 | Position actuelle du joueur |

---

## 🎯 Points Critiques

### 1. Détection du Lit
- ✅ Sensible à la casse (toLowerCase)
- ✅ Accepte "lit" OU "bed"
- ❌ Échoue si mesh a un nom différent

**Solution:** Ajouter le nom exact à la condition

### 2. Positionnement du Lit
- ✅ Utilise getAbsolutePosition() pour les vraies coordonnées
- ✅ Offset Z+2 pour "devant" le lit
- ⚠️ Basé sur la géométrie du GLB

**Ajustement:** Modifiez l'offset si le spawn est mal placé

### 3. Callback Post-Combat
- ✅ Appelé après chaque victoire
- ✅ Async-compatible pour futures extensions
- ⚠️ Ne se déclenche QUE si combatCallback est défini

**Sécurité:** Vérifier que startCombat() est toujours appelé

---

## 🚨 Débogage

### Logs à Vérifier

1. **Au démarrage:**
   ```
   🛏️ Lit détecté: [nom du mesh]
   🛏️ Position du lit mise à jour: Vector3 (x, y, z)
   ```

2. **Au lancer un combat:**
   ```
   📞 Combat callback défini pour: [nom de la fonction]
   ```

3. **À la fin du combat:**
   ```
   🛏️ Retour au lit après la victoire...
   👤 Joueur repositionné au lit: Vector3 (x, y, z)
   ```

### Si les Logs n'Apparaissent Pas

1. Ouvrir la Console du Navigateur (F12)
2. Vérifier l'onglet "Console" pour les erreurs
3. Rechercher les messages avec 🛏️ ou 📞
4. Si manquants = vérifier le nom du mesh du lit dans le GLB

---

## 💡 Optimisations Futures

### 1. Détection Robuste
```javascript
// Rechercher le lit même s'il est caché dans un groupe
const findBedMesh = (meshes) => {
    return meshes.find(m => 
        m.name.toLowerCase().match(/(lit|bed|lit.*mesh|bed.*mesh)/i)
    );
};
```

### 2. Régénération au Lit
```javascript
if (bedMesh) {
    // Ajouter à la liste des objets interactables
    bedMesh.checkCollisions = true;
    addInteractable(bedMesh, "bed", () => {
        gameState.team[0].hp = gameState.team[0].maxHp;
        showDialog("Vous avez dormi confortablement...");
    });
}
```

### 3. Sauvegarde Automatique
```javascript
// Dans le callback
localStorage.setItem("lastSpawnPos", JSON.stringify(bedPosition));
```

---

## ✨ Améliorations Suggérées

### A Court Terme
- [ ] Tester avec le vrai HouseZone.glb
- [ ] Ajuster l'offset Z selon la vraie position du lit
- [ ] Ajouter des logs console détaillés

### A Moyen Terme
- [ ] Interaction lit (dormir, sauvegarder)
- [ ] Animation transition lit → battle
- [ ] Régénération de santé au lit

### A Long Terme
- [ ] Plusieurs chambres avec spawn points
- [ ] Système de zones sauvegardées
- [ ] Gestion des Pokémon au repos

---

## 📚 Références Code

- [setupZoneHouse()](<path/to/world.js#L962>)
- [startCombat()](<path/to/world.js#L1328>)
- [endCombat()](<path/to/combat.js#L854>)
- [setCombatCallback()](<path/to/combat.js#L12>)

