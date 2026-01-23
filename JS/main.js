// Debug : Affichage brut des erreurs JS
window.addEventListener('error', function(e) {
    console.error('JS ERROR:', e.message, e.filename, e.lineno, e.colno, e.error);
    let overlay = document.getElementById('error-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'error-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = 'auto';
        overlay.style.zIndex = '99999';
        overlay.style.background = 'rgba(200,0,0,0.85)';
        overlay.style.color = '#fff';
        overlay.style.fontFamily = 'monospace';
        overlay.style.fontSize = '16px';
        overlay.style.padding = '12px';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);
    }
    overlay.innerText = '[JS ERROR] ' + e.message + '\n' + (e.filename || '') + ':' + (e.lineno || '') + ':' + (e.colno || '') + '\n' + (e.error ? e.error.stack : '');
});
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

// Affichage d'erreur JS global
window.addEventListener("error", function(e) {
    const overlay = document.getElementById("globalErrorOverlay");
    if (overlay) {
        overlay.style.display = "flex";
        const msg = document.getElementById("globalErrorMessage");
        if (msg) {
            msg.textContent = "Erreur JS : " + (e.message || "Erreur inconnue");
        }
    }
    console.error("[GLOBAL ERROR]", e.message, e);
});

// ===== SAUVEGARDE AUTOMATIQUE AVANT FERMETURE =====
window.addEventListener("beforeunload", () => {
    autoSave();
    console.log("💾 Sauvegarde automatique avant fermeture");
});

console.log("🎮 Jeu démarré ! Approche les PNJ, teste les portes (E) et marche dans la forêt pour des combats sauvages.");
