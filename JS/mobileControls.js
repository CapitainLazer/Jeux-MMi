// mobileControls.js - Contrôles tactiles pour mobile
// Fournit : joystick virtuel, boutons d'action, détection mobile, plein écran

import { gameState, combatState } from "./state.js";
import { menuState, toggleMenu, closeAllMenus, navigateMenu, selectItem, selectMainMenuOption, selectSaveMenuOption, useItem } from "./menuSystem.js";
import { handleCombatKeyboard } from "./combat.js";

console.log("📱 Chargement mobileControls.js");

// ===== DÉTECTION MOBILE =====
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}

export function isTablet() {
    const ua = navigator.userAgent;
    return /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua);
}

// ===== VARIABLES GLOBALES =====
let joystickActive = false;
let joystickVector = { x: 0, y: 0 };
let joystickTouchId = null;

// Référence aux éléments DOM
let joystickContainer = null;
let joystickKnob = null;
let joystickBase = null;

// ===== EXPORT DU VECTEUR JOYSTICK =====
export function getJoystickVector() {
    return { ...joystickVector };
}

export function isJoystickActive() {
    return joystickActive;
}

// ===== CRÉATION DE L'UI MOBILE =====
export function initMobileControls() {
    if (!isMobile()) {
        console.log("💻 Mode PC détecté - contrôles mobiles désactivés");
        return false;
    }

    console.log("📱 Mode mobile détecté - initialisation des contrôles tactiles");

    // Masquer les instructions PC
    const instructions = document.getElementById("instructions");
    if (instructions) {
        instructions.style.display = "none";
    }

    // Créer le conteneur principal des contrôles mobiles
    createMobileUI();
    
    // Initialiser les event listeners
    initTouchListeners();
    
    // Ajouter le style CSS
    injectMobileStyles();

    return true;
}

function createMobileUI() {
    // Conteneur principal
    const mobileUI = document.createElement("div");
    mobileUI.id = "mobileControls";
    mobileUI.innerHTML = `
        <!-- Zone Joystick (gauche) -->
        <div id="joystickZone">
            <div id="joystickBase">
                <div id="joystickKnob"></div>
            </div>
        </div>

        <!-- Boutons d'action (droite) -->
        <div id="actionButtons">
            <button id="btnMobileA" class="mobile-action-btn btn-a">A</button>
            <button id="btnMobileB" class="mobile-action-btn btn-b">B</button>
        </div>

        <!-- Boutons du haut -->
        <div id="topButtons">
            <button id="btnMobileMenu" class="mobile-top-btn">☰</button>
            <button id="btnMobileFullscreen" class="mobile-top-btn">⛶</button>
        </div>

        <!-- Instructions mobiles (optionnel) -->
        <div id="mobileInstructions">
            <span>🕹️ Joystick: Déplacer</span>
            <span>🅰️ Courir / Valider</span>
            <span>🅱️ Interagir</span>
        </div>
    `;
    document.body.appendChild(mobileUI);

    // Stocker les références
    joystickContainer = document.getElementById("joystickZone");
    joystickBase = document.getElementById("joystickBase");
    joystickKnob = document.getElementById("joystickKnob");
}

function injectMobileStyles() {
    const style = document.createElement("style");
    style.id = "mobileControlsStyles";
    style.textContent = `
        /* ===== CONTENEUR PRINCIPAL ===== */
        #mobileControls {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 800;
            display: flex;
        }

        /* ===== ZONE JOYSTICK (GAUCHE) ===== */
        #joystickZone {
            position: absolute;
            left: 20px;
            bottom: 30px;
            width: 150px;
            height: 150px;
            pointer-events: auto;
            touch-action: none;
        }

        #joystickBase {
            position: relative;
            width: 130px;
            height: 130px;
            background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 70%, transparent 100%);
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(0,0,0,0.3), inset 0 0 30px rgba(255,255,255,0.05);
        }

        #joystickKnob {
            width: 60px;
            height: 60px;
            background: radial-gradient(circle at 30% 30%, rgba(255,215,0,0.9), rgba(255,165,0,0.7));
            border: 2px solid rgba(255,255,255,0.5);
            border-radius: 50%;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4), inset 0 -3px 8px rgba(0,0,0,0.2);
            transition: transform 0.05s ease-out;
            position: absolute;
        }

        /* ===== BOUTONS D'ACTION (DROITE) ===== */
        #actionButtons {
            position: absolute;
            right: 20px;
            bottom: 100px; /* Remonté pour éviter HUD vitesse */
            display: flex;
            flex-direction: column; /* Vertical pour plus de place */
            gap: 15px;
            pointer-events: auto;
        }

        .mobile-action-btn {
            width: 65px;
            height: 65px;
            border-radius: 50%;
            border: 3px solid rgba(255,255,255,0.4);
            font-size: 24px;
            font-weight: bold;
            color: white;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            cursor: pointer;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            transition: transform 0.1s ease, box-shadow 0.1s ease;
        }

        .mobile-action-btn:active {
            transform: scale(0.9);
        }

        .btn-a {
            background: radial-gradient(circle at 30% 30%, #4CAF50, #2E7D32);
            box-shadow: 0 6px 20px rgba(76,175,80,0.5), inset 0 -4px 10px rgba(0,0,0,0.3);
        }

        .btn-a:active {
            background: radial-gradient(circle at 30% 30%, #66BB6A, #43A047);
            box-shadow: 0 2px 10px rgba(76,175,80,0.5);
        }

        .btn-b {
            background: radial-gradient(circle at 30% 30%, #f44336, #c62828);
            box-shadow: 0 6px 20px rgba(244,67,54,0.5), inset 0 -4px 10px rgba(0,0,0,0.3);
        }

        .btn-b:active {
            background: radial-gradient(circle at 30% 30%, #ef5350, #e53935);
            box-shadow: 0 2px 10px rgba(244,67,54,0.5);
        }

        /* ===== BOUTONS DU HAUT ===== */
        #topButtons {
            position: absolute;
            top: 15px;
            right: 15px;
            display: flex;
            gap: 10px;
            pointer-events: auto;
        }

        .mobile-top-btn {
            width: 50px;
            height: 50px;
            border-radius: 12px;
            border: 2px solid rgba(255,255,255,0.3);
            background: rgba(0,0,0,0.6);
            color: white;
            font-size: 22px;
            cursor: pointer;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            backdrop-filter: blur(4px);
            transition: transform 0.1s ease, background 0.1s ease;
        }

        .mobile-top-btn:active {
            transform: scale(0.9);
            background: rgba(255,215,0,0.3);
        }

        /* ===== INSTRUCTIONS MOBILES ===== */
        #mobileInstructions {
            position: absolute;
            top: 15px;
            left: 15px;
            background: rgba(0,0,0,0.7);
            padding: 10px 15px;
            border-radius: 10px;
            color: white;
            font-size: 11px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            pointer-events: none;
            opacity: 0.8;
            max-width: 160px;
        }

        #mobileInstructions span {
            white-space: nowrap;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-height: 500px) {
            #joystickZone {
                bottom: 15px;
                left: 10px;
            }
            #joystickBase {
                width: 100px;
                height: 100px;
            }
            #joystickKnob {
                width: 45px;
                height: 45px;
            }
            #actionButtons {
                bottom: 15px;
                right: 10px;
            }
            .mobile-action-btn {
                width: 55px;
                height: 55px;
                font-size: 20px;
            }
            #mobileInstructions {
                display: none;
            }
        }

        /* ===== MASQUER SUR PC ===== */
        @media (hover: hover) and (pointer: fine) {
            #mobileControls {
                display: none !important;
            }
        }

        /* ===== ORIENTATION PAYSAGE CONSEILLÉE ===== */
        @media (orientation: portrait) and (max-width: 600px) {
            #mobileInstructions::after {
                content: "↻ Paysage recommandé";
                display: block;
                color: #FFD700;
                margin-top: 5px;
                font-weight: bold;
            }
        }
    `;
    document.head.appendChild(style);
}

// ===== GESTION DU JOYSTICK =====
function initTouchListeners() {
    const joystickZone = document.getElementById("joystickZone");
    
    // Touch Start - Joystick
    joystickZone.addEventListener("touchstart", handleJoystickStart, { passive: false });
    joystickZone.addEventListener("touchmove", handleJoystickMove, { passive: false });
    joystickZone.addEventListener("touchend", handleJoystickEnd, { passive: false });
    joystickZone.addEventListener("touchcancel", handleJoystickEnd, { passive: false });

    // Boutons d'action
    const btnA = document.getElementById("btnMobileA");
    const btnB = document.getElementById("btnMobileB");
    const btnMenu = document.getElementById("btnMobileMenu");
    const btnFullscreen = document.getElementById("btnMobileFullscreen");

    // Bouton A (Courir / Valider)
    btnA.addEventListener("touchstart", (e) => {
        e.preventDefault();
        handleButtonA(true);
    }, { passive: false });
    btnA.addEventListener("touchend", (e) => {
        e.preventDefault();
        handleButtonA(false);
    }, { passive: false });

    // Bouton B (Interagir)
    btnB.addEventListener("touchstart", (e) => {
        e.preventDefault();
        handleButtonB();
    }, { passive: false });

    // Bouton Menu
    btnMenu.addEventListener("touchstart", (e) => {
        e.preventDefault();
        handleMenuButton();
    }, { passive: false });

    // Bouton Fullscreen
    btnFullscreen.addEventListener("touchstart", (e) => {
        e.preventDefault();
        toggleFullscreen();
    }, { passive: false });
}

function handleJoystickStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    joystickTouchId = touch.identifier;
    joystickActive = true;
    updateJoystickPosition(touch);
}

function handleJoystickMove(e) {
    e.preventDefault();
    if (!joystickActive) return;

    for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === joystickTouchId) {
            updateJoystickPosition(e.touches[i]);
            break;
        }
    }
}

function handleJoystickEnd(e) {
    e.preventDefault();
    
    // Vérifier si c'est le bon touch
    let found = false;
    for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === joystickTouchId) {
            found = true;
            break;
        }
    }

    if (!found) {
        joystickActive = false;
        joystickTouchId = null;
        joystickVector = { x: 0, y: 0 };
        
        // Reset visuel du knob
        if (joystickKnob) {
            joystickKnob.style.transform = "translate(0px, 0px)";
        }
    }
}

function updateJoystickPosition(touch) {
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;

    // Limiter au rayon du joystick
    const maxRadius = rect.width / 2 - 30; // Marge pour le knob
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxRadius) {
        const ratio = maxRadius / distance;
        deltaX *= ratio;
        deltaY *= ratio;
    }

    // Mettre à jour la position visuelle du knob
    joystickKnob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Calculer le vecteur normalisé (-1 à 1)
    joystickVector = {
        x: deltaX / maxRadius,
        y: deltaY / maxRadius
    };

    // Navigation dans les menus avec le joystick
    if (menuState.isOpen) {
        handleMenuNavigation();
    }
    
    // Navigation en combat avec le joystick
    if (gameState.mode === "combat" && combatState.active) {
        handleCombatNavigation();
    }
}

// ===== NAVIGATION MENU AU JOYSTICK =====
let lastMenuNavTime = 0;
const MENU_NAV_DELAY = 200; // ms entre deux navigations

function handleMenuNavigation() {
    const now = Date.now();
    if (now - lastMenuNavTime < MENU_NAV_DELAY) return;

    const threshold = 0.5;

    if (joystickVector.y < -threshold) {
        navigateMenu("up");
        lastMenuNavTime = now;
    } else if (joystickVector.y > threshold) {
        navigateMenu("down");
        lastMenuNavTime = now;
    } else if (joystickVector.x < -threshold) {
        navigateMenu("left");
        lastMenuNavTime = now;
    } else if (joystickVector.x > threshold) {
        navigateMenu("right");
        lastMenuNavTime = now;
    }
}

// ===== NAVIGATION COMBAT AU JOYSTICK =====
let lastCombatNavTime = 0;
const COMBAT_NAV_DELAY = 200;

function handleCombatNavigation() {
    const now = Date.now();
    if (now - lastCombatNavTime < COMBAT_NAV_DELAY) return;

    const threshold = 0.5;

    if (joystickVector.y < -threshold) {
        handleCombatKeyboard("ArrowUp", "arrowup");
        lastCombatNavTime = now;
        console.log("📱 Combat ↑");
    } else if (joystickVector.y > threshold) {
        handleCombatKeyboard("ArrowDown", "arrowdown");
        lastCombatNavTime = now;
        console.log("📱 Combat ↓");
    } else if (joystickVector.x < -threshold) {
        handleCombatKeyboard("ArrowLeft", "arrowleft");
        lastCombatNavTime = now;
        console.log("📱 Combat ←");
    } else if (joystickVector.x > threshold) {
        handleCombatKeyboard("ArrowRight", "arrowright");
        lastCombatNavTime = now;
        console.log("📱 Combat →");
    }
}

// ===== GESTION DES BOUTONS =====
let buttonAPressed = false;

function handleButtonA(pressed) {
    buttonAPressed = pressed;

    if (pressed) {
        // En menu : Valider
        if (menuState.isOpen) {
            if (menuState.currentScreen === "main") {
                selectMainMenuOption();
            } else if (menuState.currentScreen === "save") {
                selectSaveMenuOption();
            } else if (menuState.currentScreen === "inventory") {
                if (menuState.inventoryDetailMode) {
                    useItem();
                } else {
                    selectItem();
                }
            }
        } else if (gameState.mode === "combat" && combatState.active) {
            // En combat : Valider
            handleCombatKeyboard("Enter", "enter");
            console.log("📱 Combat: Valider (A)");
        } else if (gameState.mode === "exploration") {
            // En exploration : Courir
            gameState.isRunning = true;
        }
    } else {
        // Relâché
        if (gameState.mode === "exploration") {
            gameState.isRunning = false;
        }
    }
}

// Callback pour interaction (doit être défini par world.js)
let interactCallback = null;
export function setInteractCallback(callback) {
    interactCallback = callback;
}

function handleButtonB() {
    if (menuState.isOpen) {
        // En menu : Retour
        navigateMenu("back");
    } else if (gameState.mode === "combat" && combatState.active) {
        // En combat : Retour/Fuite
        handleCombatKeyboard("Escape", "escape");
        console.log("📱 Combat: Retour (B)");
    } else if (gameState.mode === "exploration") {
        // En exploration : Interagir
        if (interactCallback) {
            interactCallback();
        }
    }
}

function handleMenuButton() {
    if (menuState.isOpen) {
        closeAllMenus();
    } else {
        toggleMenu();
    }
}

// ===== PLEIN ÉCRAN =====
export function toggleFullscreen() {
    const elem = document.documentElement;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        // Entrer en plein écran
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
        
        // Verrouiller l'orientation en paysage si possible
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("landscape").catch(() => {
                console.log("📱 Impossible de verrouiller l'orientation");
            });
        }
        
        console.log("📱 Mode plein écran activé");
    } else {
        // Quitter le plein écran
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        console.log("📱 Mode plein écran désactivé");
    }
}

// ===== EXPORT POUR VÉRIFIER SI LE BOUTON A EST PRESSÉ =====
export function isButtonAPressed() {
    return buttonAPressed;
}

// ===== GESTION COMBAT MOBILE =====
let combatInputCallback = null;

export function setCombatInputCallback(callback) {
    combatInputCallback = callback;
}

// Adapter les boutons pour le combat
export function updateMobileControlsForCombat(inCombat) {
    const actionButtons = document.getElementById("actionButtons");
    const joystickZone = document.getElementById("joystickZone");
    
    if (!actionButtons || !joystickZone) return;

    if (inCombat) {
        // En combat : joystick pour navigation, A pour valider, B pour retour
        console.log("📱 Contrôles mobiles adaptés pour le combat");
    } else {
        // En exploration : comportement normal
        console.log("📱 Contrôles mobiles mode exploration");
    }
}

// ===== INITIALISATION AUTOMATIQUE =====
// Sera appelé depuis main.js ou world.js
console.log("📱 mobileControls.js prêt - appeler initMobileControls() pour activer");
