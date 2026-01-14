// main.js
import { createScene } from "./world.js";
import { autoSave } from "./menuSystem.js";

console.log("🎮 Démarrage du jeu (main.js)…");

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true
});

const scene = createScene(engine);

engine.runRenderLoop(() => {
    if (scene && scene.activeCamera) {
        scene.render();
    }
});

window.addEventListener("resize", () => engine.resize());

// ===== SAUVEGARDE AUTOMATIQUE AVANT FERMETURE =====
window.addEventListener("beforeunload", () => {
    autoSave();
    console.log("💾 Sauvegarde automatique avant fermeture");
});

console.log("🎮 Jeu démarré ! Approche les PNJ, teste les portes (E) et marche dans la forêt pour des combats sauvages.");
