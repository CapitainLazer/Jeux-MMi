// ui.js
import { gameState } from "./state.js";

console.log("🖼 Chargement ui.js");

// Références DOM utiles à plusieurs modules
export const overlayEl      = document.getElementById("menuOverlay");
export const dialogBoxEl    = document.getElementById("dialogBox");
export const dialogTextEl   = document.getElementById("dialogText");
export const fadeOverlayEl  = document.getElementById("fadeOverlay");
export const combatLogTextEl= document.getElementById("combatLogText");

// ===== ÉTAT DIALOGUE (anti-collision) =====
let _dialogKeyListener = null;
let _dialogSkipHandler = null;
let _dialogClosing = false;
let _dialogCooldownUntil = 0;
const DIALOG_COOLDOWN_MS = 280;

/**
 * true si un dialogue est ouvert ou en cooldown post-fermeture
 */
export function isDialogBusy() {
    return gameState.dialogOpen || _dialogClosing || Date.now() < _dialogCooldownUntil;
}

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

/**
 * Nettoie les écouteurs du dialogue courant (sans fermer l'UI)
 */
function detachDialogListeners() {
    if (_dialogKeyListener) {
        document.removeEventListener("keydown", _dialogKeyListener);
        _dialogKeyListener = null;
    }
    const mobileBtn = document.getElementById("mobile-interact-btn");
    if (mobileBtn) {
        mobileBtn.onclick = null;
        mobileBtn.ontouchend = null;
    }
    _dialogSkipHandler = null;
}

/**
 * Ferme le dialogue proprement avec petite transition
 * @param {boolean} startCooldown - empêche une nouvelle interaction immédiate
 */
export function closeDialog(startCooldown = true) {
    detachDialogListeners();
    if (!dialogBoxEl) {
        gameState.dialogOpen = false;
        return;
    }

    _dialogClosing = true;
    dialogBoxEl.classList.remove("show");
    dialogBoxEl.classList.add("hiding");
    gameState.dialogOpen = false;

    if (!gameState.menuOpen && gameState.mode !== "combat" && overlayEl) {
        overlayEl.classList.remove("visible");
    }

    setTimeout(() => {
        dialogBoxEl.classList.remove("hiding");
        _dialogClosing = false;
        if (startCooldown) {
            _dialogCooldownUntil = Date.now() + DIALOG_COOLDOWN_MS;
        }
    }, 180);
}

// ===== DIALOGUE GLOBAL (hors combat ou en combat) =====
/**
 * Affiche un dialogue. Si un skipCallback est fourni, E / Enter / bouton mobile avance.
 * Remplace tout dialogue précédent (anti-collision).
 */
export function showDialog(text, skipCallback) {
    if (gameState.mode === "combat") {
        if (combatLogTextEl) combatLogTextEl.textContent = text;
        return;
    }
    console.log("💬", text);
    if (!dialogBoxEl || !dialogTextEl || !overlayEl) return;

    // Annuler l'ancien dialogue / timers / listeners (évite double interaction)
    detachDialogListeners();
    if (_autoCloseTimer) {
        clearTimeout(_autoCloseTimer);
        _autoCloseTimer = null;
    }

    dialogTextEl.textContent = text;
    dialogBoxEl.classList.remove("hiding");
    // Relancer l'anim d'apparition
    dialogBoxEl.classList.remove("show");
    // force reflow
    void dialogBoxEl.offsetWidth;
    dialogBoxEl.classList.add("show");
    gameState.dialogOpen = true;
    overlayEl.classList.add("visible");
    _dialogClosing = false;

    if (typeof skipCallback === "function") {
        _dialogSkipHandler = skipCallback;

        const advance = (e) => {
            if (e) {
                e.preventDefault?.();
                e.stopPropagation?.();
            }
            // Empêcher que la même touche E déclenche aussi interact() dans world
            if (e && e.key) {
                e._dialogConsumed = true;
            }
            const handler = _dialogSkipHandler;
            closeDialog(true);
            // Laisse le cooldown / frame passer avant la page suivante
            requestAnimationFrame(() => {
                if (typeof handler === "function") handler();
            });
        };

        _dialogKeyListener = (e) => {
            if (!e.key) return;
            const k = e.key.toLowerCase();
            if (k === "e" || e.code === "KeyE" || e.key === "Enter") {
                advance(e);
            }
        };
        document.addEventListener("keydown", _dialogKeyListener);

        const mobileBtn = document.getElementById("mobile-interact-btn");
        if (mobileBtn) {
            mobileBtn.onclick = (e) => advance(e);
            mobileBtn.ontouchend = (e) => advance(e);
        }
    } else {
        // Timer auto pour les dialogues simples
        _autoCloseTimer = setTimeout(() => {
            _autoCloseTimer = null;
            closeDialog(true);
        }, 2600);
    }
}

let _autoCloseTimer = null;
