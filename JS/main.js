// main.js
import { createScene } from "./world.js";
import { autoSave } from "./menuSystem.js";

console.log("🎮 Démarrage du jeu (main.js)…");

const canvas = document.getElementById("renderCanvas");
let engine = null;
let scene = null;
let gameStarted = false;

// ===== GESTION DE L'ÉCRAN D'ACCUEIL =====
const welcomeScreen = document.getElementById("welcomeScreen");
const playButton = document.getElementById("playButton");

playButton.addEventListener("click", () => {
    console.log("▶️ Bouton JOUER cliqué - Démarrage du jeu...");
    
    // Masquer l'écran d'accueil avec animation
    welcomeScreen.classList.add("hidden");
    
    // Attendre la fin de l'animation avant de démarrer le jeu
    setTimeout(() => {
        welcomeScreen.style.display = "none";
        startGame();
    }, 500);
});

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    
    console.log("🎮 Initialisation du moteur BabylonJS...");
    
    // Initialiser le moteur et la scène
    engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
    });
    
    scene = createScene(engine);
    
    // Démarrer le rendu
    engine.runRenderLoop(() => {
        if (scene && scene.activeCamera) {
            scene.render();
        }
    });
    
    window.addEventListener("resize", () => engine.resize());
    
    console.log("✅ Jeu démarré avec succès !");
}

// Ne pas démarrer automatiquement - attendre le clic sur JOUER

// ===== SAUVEGARDE AUTOMATIQUE AVANT FERMETURE =====
window.addEventListener("beforeunload", () => {
    autoSave();
    console.log("💾 Sauvegarde automatique avant fermeture");
});

console.log("🎮 Jeu démarré ! Approche les PNJ, teste les portes (E) et marche dans la forêt pour des combats sauvages.");
