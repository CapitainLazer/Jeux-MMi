// ui.js
import { gameState } from "./state.js";

console.log("🖼 Chargement ui.js");

// Références DOM utiles à plusieurs modules
export const overlayEl      = document.getElementById("menuOverlay");
export const dialogBoxEl    = document.getElementById("dialogBox");
export const dialogTextEl   = document.getElementById("dialogText");
export const fadeOverlayEl  = document.getElementById("fadeOverlay");
export const combatLogTextEl= document.getElementById("combatLogText");

// ===== FADE NOIR =====
export function fadeToBlack() {
    if (!fadeOverlayEl) return Promise.resolve();
    return new Promise(resolve => {
        fadeOverlayEl.classList.add("show");
        setTimeout(resolve, 400);
    });
}

export function fadeFromBlack() {
    if (!fadeOverlayEl) return Promise.resolve();
    return new Promise(resolve => {
        fadeOverlayEl.classList.remove("show");
        setTimeout(resolve, 400);
    });
}

// ===== DIALOGUE GLOBAL (hors combat ou en combat) =====
export function showDialog(text) {
    if (gameState.mode === "combat") {
        if (combatLogTextEl) combatLogTextEl.textContent = text;
        return;
    }
    console.log("💬", text);
    if (!dialogBoxEl || !dialogTextEl || !overlayEl) return;

    dialogTextEl.textContent = text;
    dialogBoxEl.classList.add("show");
    gameState.dialogOpen = true;
    overlayEl.classList.add("visible");

    // Supporte le skip manuel si un callback est fourni (pour PNJ talk)
    let skipHandler = null;
    if (typeof arguments[1] === "function") {
        skipHandler = arguments[1];
        // Desktop : touche E
        const keyListener = (e) => {
            if (e.key && (e.key.toLowerCase() === "e" || e.code === "KeyE")) {
                cleanup();
                skipHandler();
            }
        };
        document.addEventListener("keydown", keyListener);
        // Mobile : bouton d'interaction
        const mobileBtn = document.getElementById('mobile-interact-btn');
        if (mobileBtn) {
            mobileBtn.onclick = null;
            mobileBtn.ontouchend = null;
            mobileBtn.onclick = () => { cleanup(); skipHandler(); };
            mobileBtn.ontouchend = (e) => { e.preventDefault(); cleanup(); skipHandler(); };
        }
        // Nettoyage listeners
        function cleanup() {
            document.removeEventListener("keydown", keyListener);
            if (mobileBtn) {
                mobileBtn.onclick = null;
                mobileBtn.ontouchend = null;
            }
            dialogBoxEl.classList.remove("show");
            gameState.dialogOpen = false;
            if (!gameState.menuOpen && gameState.mode !== "combat") {
                overlayEl.classList.remove("visible");
            }
        }
    } else {
        // Timer auto pour les autres dialogues
        setTimeout(() => {
            dialogBoxEl.classList.remove("show");
            gameState.dialogOpen = false;
            if (!gameState.menuOpen && gameState.mode !== "combat") {
                overlayEl.classList.remove("visible");
            }
        }, 2800);
    }
}
