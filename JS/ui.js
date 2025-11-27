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

    setTimeout(() => {
        dialogBoxEl.classList.remove("show");
        gameState.dialogOpen = false;
        if (!gameState.menuOpen && gameState.mode !== "combat") {
            overlayEl.classList.remove("visible");
        }
    }, 2800);
}
