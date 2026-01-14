# 🧪 Guide de Test : Système du Lit

## ✅ Checklist de Validation

### Phase 1: Démarrage du Jeu

- [ ] Lancer le jeu (accédez à index.html)
- [ ] Ouvrir la Console du Navigateur (F12)
- [ ] Vérifier les logs:
  ```
  ✅ HouseZone.glb chargé! [nombre] meshes importés
  🛏️ Lit détecté: [nom du mesh]
  🛏️ Position du lit mise à jour: Vector3 (x, y, z)
  ```
- [ ] Vérifier que le joueur spawne **devant le lit** (pas au centre de la pièce)
- [ ] Vérifier que la vue caméra est correcte

### Phase 2: Navigation et Exploration

- [ ] Vous pouvez marcher autour du lit
- [ ] Les collisions fonctionnent (murs, meubles)
- [ ] Vous ne pouvez pas entrer dans le lit

### Phase 3: Lancer un Combat

#### 3.1: Combat via PNJ (maison1)
- [ ] Accédez à la zone maison1 (si possible)
- [ ] Interagissez avec le PNJ (E)
- [ ] Vérifier le log:
  ```
  📞 Combat callback défini pour: [nom]
  ```

#### 3.2: Combat Sauvage (forêt)
- [ ] Allez dans la forêt
- [ ] Marchez dans les hautes herbes
- [ ] Laissez le timer augmenter jusqu'au combat
- [ ] Vérifier le même log de callback

### Phase 4: Victoire au Combat

- [ ] Le combat se termine (adversaire K.O.)
- [ ] La console affiche:
  ```
  🏁 Fin du combat
  🛏️ Retour au lit après la victoire...
  👤 Joueur repositionné au lit: Vector3 (x, y, z)
  ```
- [ ] **CRUCIAL:** Vous réapparaissez **devant le lit** automatiquement
- [ ] Le jeu revient à l'exploration sans transition

### Phase 5: Deuxième Combat

- [ ] Depuis la position au lit, lancez un nouveau combat
- [ ] Répétez les étapes 3 & 4
- [ ] Vérifiez que le cycle se répète correctement

---

## 🐛 Débogage: Si Quelque Chose Ne Fonctionne Pas

### Le lit n'est pas détecté
**Symptômes:** Pas de log "🛏️ Lit détecté"

**Solutions:**
1. Vérifiez le nom exact du mesh dans la console (cherchez "lit" ou "bed")
2. Ajoutez le nom à la condition ligne ~990:
   ```javascript
   else if (m.name.toLowerCase().includes("lit") || 
            m.name.toLowerCase().includes("bed") ||
            m.name.toLowerCase().includes("YOUR_MESH_NAME")) {
   ```

### Le joueur ne revient pas au lit
**Symptômes:** Pas de log "🛏️ Retour au lit..."

**Solutions:**
1. Vérifiez que `startCombat()` est appelé
2. Vérifiez la console pour les erreurs JS
3. Confirmez que `setCombatCallback` est bien importé
4. Testez dans la console:
   ```javascript
   console.log("bedPosition =", bedPosition);
   ```

### La position du lit est incorrecte
**Symptômes:** Spawn trop loin, trop proche, ou côté

**Solution:**
Modifiez l'offset ligne ~998:
```javascript
// Actuellement:
bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.9, bedWorldPos.z + 2);

// Essayez:
bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.9, bedWorldPos.z - 2);  // Derrière
bedPosition = new BABYLON.Vector3(bedWorldPos.x + 2, 0.9, bedWorldPos.z);  // À côté
bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.9, bedWorldPos.z + 3);  // Plus loin
```

---

## 📊 Résultats Attendus

### Console Output (Normal)

```
🌍 Chargement world.js
⚔️ Chargement combat.js
🧠 Chargement state.js
...
🏠 Configuration zone HOUSE - Chargement HouseZone.glb...
✅ HouseZone.glb chargé! 27 meshes importés
  - Mesh: floor
  - Mesh: lit
  - Mesh: door
  - Mesh: wall_north
  ...
🛏️ Lit détecté: lit
🛏️ Position du lit mise à jour: Vector3 (5, 0.9, -3.5)
📍 Première entrée dans house, utilisation targetPos: Vector3 (5, 0.9, -1.5)
👤 Joueur positionné à: Vector3 (5, 0.9, -1.5)
✅ Collisions de la maison activées
```

### Après un Combat

```
⚔️ Tour 3...
✅ Victoire! Vous avez gagné 150 XP
🏁 Fin du combat
📞 Combat callback défini pour: startCombat
🛏️ Retour au lit après la victoire...
👤 Joueur repositionné au lit: Vector3 (5, 0.9, -1.5)
✅ Retour à l'exploration COMPLÉTÉ
```

---

## 🎯 Test Avancé: Vérifier le Callback

### Dans la Console du Navigateur (F12):

```javascript
// Vérifier que bedPosition existe
console.log("bedPosition =", bedPosition);
// Résultat: bedPosition = Vector3 {x: 5, y: 0.9, z: -1.5}

// Vérifier la position du joueur
console.log("playerCollider.position =", playerCollider.position);
// Résultat: playerCollider.position = Vector3 {x: 5, y: 0.9, z: -1.5}

// Après un combat, ils devraient être identiques
```

---

## 📋 Cas de Test Avancés

### Test 1: Plusieurs Combats Consécutifs
1. Lancez un combat
2. Gagnez
3. Vérifiez le retour au lit
4. Lancez immédiatement un autre combat
5. Vérifiez que le callback fonctionne toujours

**Résultat attendu:** ✅ Chaque combat retourne au lit

### Test 2: Défaite au Combat
1. Lancez un combat
2. Perdez (tous les Pokémon K.O.)
3. Vérifiez le comportement

**Résultat attendu:** Selon votre implémentation (peut revenir au lit ou à l'écran de game over)

### Test 3: Changement de Callback
Dans la console:
```javascript
setCombatCallback(() => {
    console.log("Callback personnalisé!");
    playerCollider.position = new BABYLON.Vector3(0, 0.9, 0);
});
```

**Résultat attendu:** Le joueur revient au centre au lieu du lit

---

## 🎮 Simulation de Test Rapide

### Sans HouseZone.glb
Si le GLB ne se charge pas encore, testez manuellement:

```javascript
// Dans la console, après démarrage:
bedPosition = new BABYLON.Vector3(0, 0.9, -5);
playerCollider.position = bedPosition.clone();
console.log("Joueur repositionné au lit (test)");
```

---

## ✨ Points de Validation Clés

| Point | Critère | Status |
|-------|---------|--------|
| Démarrage du jeu | Joueur spawn devant le lit | ✓ |
| Détection du lit | Console affiche 🛏️ | ✓ |
| Callback défini | Console affiche 📞 | ✓ |
| Retour au lit | Après victoire, réapparait au lit | ✓ |
| Exploration | Peut marcher/interagir | ✓ |
| Collisions | Murs/meubles bloquent | ✓ |

---

## 🚀 Próximas Étapes Après Validation

- [ ] Implémenter un dialogue au retour au lit
- [ ] Ajouter régénération de santé
- [ ] Ajouter sauvegarde automatique
- [ ] Ajouter animation transition
- [ ] Tester avec d'autres zones

