# 🎓 Guide Pédagogique : Comprendre le Système du Lit

## 👋 Introduction Simple

### Votre Demande:
> "Lors de la mort de tous les monstres, j'aimerais que le joueur apparaisse devant le lit, j'aimerais également que le jeu démarre à cet endroit"

### Ce que nous avons fait:
1. **Détecté automatiquement le lit** dans votre modèle 3D (HouseZone.glb)
2. **Positionné le joueur devant le lit** au démarrage
3. **Fait revenir le joueur au lit** après chaque victoire au combat

---

## 🏗️ Comment Ça Fonctionne: Les 3 Étapes

### Étape 1️⃣ : Démarrage du Jeu

```
┌──────────────────────────────────────────────────┐
│ Jeu Lance                                        │
└───────────────────┬──────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────────┐
│ HouseZone.glb se charge                          │
│ (Tous les objets du modèle 3D importés)          │
└───────────────────┬──────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────────┐
│ Recherche du mesh "lit"                          │
│ "Est-ce que tu vois un lit?                      │
│  Oui? Mémorise sa position!"                     │
└───────────────────┬──────────────────────────────┘
                    ▼
         ┌──────────────────────┐
         │ bedPosition trouvée   │ ← Sauvegardée
         └──────────────────────┘
                    ▼
┌──────────────────────────────────────────────────┐
│ Joueur spawne DEVANT le lit                      │
│ Position = bedPosition + 2 unités vers l'avant   │
└──────────────────────────────────────────────────┘
```

**Code associé:**
```javascript
// Détection du lit
if (m.name.toLowerCase().includes("lit") || m.name.toLowerCase().includes("bed")) {
    bedMesh = m;
    bedPosition = new BABYLON.Vector3(bedWorldPos.x, 0.9, bedWorldPos.z + 2);
}

// Démarrage au lit
switchZone("house", bedPosition.clone());
```

---

### Étape 2️⃣ : Pendant l'Exploration

```
┌─────────────────────────────────────┐
│ Joueur explore la maison            │
│ • Marche autour                     │
│ • Parle aux PNJ                     │
│ • Entre en combat                   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Lancer un combat?                   │
├─────────────────────────────────────┤
│ OUI → fonction startCombat()         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│ AVANT le combat: Définir le callback                │
│                                                     │
│ "Après le combat, tu exécuteras ceci:"             │
│ → Ramène le joueur au lit                          │
└────────────┬────────────────────────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Combat Commence    │
    └────────────────────┘
```

**Code associé:**
```javascript
function startCombat(options = {}) {
    // Avant le combat, définir le callback
    setCombatCallback(async () => {
        console.log("🛏️ Retour au lit après victoire...");
        playerCollider.position = bedPosition.clone();
    });
    
    // Puis lancer le combat
    initiateCombat(scene, camera, options);
}
```

---

### Étape 3️⃣ : Après la Victoire

```
┌─────────────────────────────────────┐
│ Combat en cours                     │
│ Attaques, tours, stratégie...       │
└────────────┬────────────────────────┘
             │
             ▼
      ┌──────────────────┐
      │ Vous gagnez!     │
      │ Ennemi K.O.      │
      └────────┬─────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ endCombat() s'exécute                       │
│ • Ferme la UI du combat                     │
│ • Met à jour les HP                         │
│ • Exécute le callback!                      │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│ Le Callback s'Exécute:                             │
│ ────────────────────────────────────────────────    │
│ playerCollider.position = bedPosition.clone()      │
│ ────────────────────────────────────────────────    │
│ "Téléporte le joueur au lit!"                      │
└────────────┬────────────────────────────────────────┘
             │
             ▼
     ┌──────────────────────┐
     │ Joueur de retour     │
     │ Devant le lit        │
     │ En exploration       │
     └──────────────────────┘
```

**Code associé:**
```javascript
async function endCombat() {
    console.log("🏁 Fin du combat");
    
    // ... mises à jour ...
    
    if (combatCallback) {
        await combatCallback();  // ← Exécute le callback!
    }
}
```

---

## 🔑 Les Concepts Clés

### 1️⃣ La Variable `bedPosition`

```javascript
// C'est juste une position (X, Y, Z)
let bedPosition = new BABYLON.Vector3(5, 0.9, -1.5);
                                      ↑   ↑   ↑
                                      |   |   └─ Profondeur (Z)
                                      |   └───── Hauteur (Y)
                                      └───────── Position gauche/droite (X)

// On peut la cloner (dupliquer):
let newPosition = bedPosition.clone();
// newPosition = Vector3 {x: 5, y: 0.9, z: -1.5}
```

### 2️⃣ Le Callback (fonction de rappel)

Un callback, c'est une fonction qu'on dit au combat:
> "Quand tu termines, exécute cette fonction"

```javascript
// Avant le combat:
setCombatCallback(async () => {
    console.log("Je reviens au lit!");
    playerCollider.position = bedPosition.clone();
});
              ↑
    "Dans mon callback, je reviens au lit"

// Après le combat:
if (combatCallback) {
    await combatCallback();  // ← S'exécute ici!
}
```

### 3️⃣ La Détection du Lit

```javascript
// On regarde tous les meshes du GLB
meshes.forEach((m) => {
    // On demande: "Est-ce que le nom contient 'lit' ou 'bed'?"
    if (m.name.toLowerCase().includes("lit") || 
        m.name.toLowerCase().includes("bed")) {
        
        bedMesh = m;  // ← C'est le lit!
        
        // On récupère sa vraie position du modèle 3D
        const bedWorldPos = bedMesh.getAbsolutePosition();
        
        // On crée une position "devant" le lit (Z + 2)
        bedPosition = new BABYLON.Vector3(
            bedWorldPos.x,
            0.9,  // À la hauteur du joueur
            bedWorldPos.z + 2  // 2 unités devant
        );
    }
});
```

---

## 📊 Tableau de Correspondance

| Événement | Code | Action |
|-----------|------|--------|
| Jeu démarre | `switchZone("house", bedPosition)` | Joueur spawn au lit |
| Combat lancé | `setCombatCallback(...)` | Définit le callback |
| Combat gagnné | `endCombat()` → `combatCallback()` | Revient au lit |
| Joueur marche | `playerCollider.moveWithCollisions()` | Position change |

---

## 🎯 La Logique Générale

```
┌─────────────────────────────────────────────┐
│ CHAQUE COMBAT SUIT CE CYCLE:                │
├─────────────────────────────────────────────┤
│                                             │
│  1. startCombat() appelé                    │
│     ↓                                       │
│  2. Callback défini: "reviens au lit"       │
│     ↓                                       │
│  3. Combat commence                        │
│     ↓                                       │
│  4. Victoire                                │
│     ↓                                       │
│  5. endCombat() exécute le callback        │
│     ↓                                       │
│  6. Joueur de retour au lit                 │
│     ↓                                       │
│  7. Prêt pour le prochain combat            │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 💭 Analogie dans le Monde Réel

Imaginez:

> **Avant le combat:**
> "Hé Pokémon! Si tu gagnes, **promis je te ramène à la maison**!"
> 
> **Pendant le combat:**
> Le Pokémon se bat, gagne...
> 
> **Après le combat:**
> Le Pokémon : "J'ai gagné!"
> Maître : "Promesse tenue, retour à la maison!" 
> 🏠 Le Pokémon revient à la maison

C'est exactement ce que le callback fait!

---

## 🧠 Questions/Réponses

### Q: Pourquoi ajouter Z + 2?
**R:** Pour que le joueur soit devant le lit et non dedans.
```
          Lit (Z = -3)
           |
           |
           v
           [Lit]        ← Si Z = -3
           
         Joueur
           |
           v
           [P]          ← Si Z = -1 (= -3 + 2)
```

### Q: Et si le lit n'est pas détecté?
**R:** Vérifiez que le mesh du lit s'appelle:
- "lit" (français)
- "bed" (anglais)
- Ou modifiez la condition

### Q: Peut-on changer la position?
**R:** Oui! Modifiez le callback:
```javascript
setCombatCallback(async () => {
    playerCollider.position = new BABYLON.Vector3(0, 0.9, 0);  // Centre
    // playerCollider.position = new BABYLON.Vector3(5, 0.9, 5);  // Ailleurs
});
```

### Q: Le callback marche une seule fois?
**R:** Non! Il se réexécute avant chaque combat.

---

## ✅ Résumé Final

| Quoi | Où | Pourquoi |
|------|-----|----------|
| Détection lit | setupZoneHouse() | Trouver la vraie position du lit |
| Spawn initial | switchZone("house", bedPosition) | Démarrer devant le lit |
| Callback défini | startCombat() | Préparer le retour au lit |
| Callback exécuté | endCombat() | Revenir au lit après victoire |

---

## 🚀 La Magie du Code

Ce qui arrive "magiquement" maintenant:

```javascript
// 1. Le jeu sait où est le lit
bedPosition = "Position du lit du vrai modèle 3D"

// 2. Le joueur spawn devant
playerCollider.position = bedPosition

// 3. Après chaque combat, il revient
playerCollider.position = bedPosition

// 4. Et ça se répète infiniment!
// Victoire → Lit → Prochain combat → Victoire → Lit → ...
```

---

## 🎉 Vous avez maintenant:

✅ **Jeu qui démarre devant le lit**
✅ **Détection automatique du lit du modèle 3D**
✅ **Retour au lit après chaque victoire**
✅ **Système extensible et réutilisable**

Bravo! 🎮

