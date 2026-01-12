// menuSystem.js
// Système centralisé de gestion des menus avec navigation
import { gameState } from "./state.js";
import { showDialog } from "./ui.js";

console.log("📋 Chargement menuSystem.js");

export const menuState = {
    isOpen: false,
    currentScreen: null,        // "main" | "inventory" | "team" | "save"
    mainMenuIndex: 0,           // Index du bouton sélectionné au menu principal
    inventoryIndex: 0,
    teamIndex: 0,
    saveMenuIndex: 0,           // 0 = Save, 1 = Load, 2 = Back
    inventoryDetailMode: false, // Si on affiche les détails d'un item
    inventoryTeamIndex: 0,      // Index du Pokémon sélectionné quand on utilise un objet
};

// ===== RÉFÉRENCES DOM =====
export const mainMenuEl       = document.getElementById("mainMenu");
export const inventoryMenuEl  = document.getElementById("inventoryMenu");
export const teamMenuEl       = document.getElementById("teamMenu");
export const overlayEl        = document.getElementById("menuOverlay");

export const inventoryGridEl       = document.getElementById("inventoryGrid");
export const inventoryDetailEl     = document.getElementById("inventoryDetail");
export const inventoryDetailTitleEl= document.getElementById("inventoryDetailTitle");
export const inventoryDetailDescEl = document.getElementById("inventoryDetailDesc");
export const btnUseItemEl          = document.getElementById("btnUseItem");
export const btnInfoItemEl         = document.getElementById("btnInfoItem");
export const btnBackItemEl         = document.getElementById("btnBackItem");
export const btnInventoryBackEl    = document.getElementById("btnInventoryBack");

export const teamListEl     = document.getElementById("teamList");
export const btnTeamBackEl  = document.getElementById("btnTeamBack");

export const btnMenuInventory  = document.getElementById("btnMenuInventory");
export const btnMenuTeam       = document.getElementById("btnMenuTeam");
export const btnMenuMap        = document.getElementById("btnMenuMap");
export const btnMenuSave       = document.getElementById("btnMenuSave");
export const btnMenuOptions    = document.getElementById("btnMenuOptions");
export const btnMenuClose      = document.getElementById("btnMenuClose");

// ===== UTILS =====
function hpColorLocal(pct) {
    if (pct > 0.5) return "linear-gradient(90deg,#28c728,#8be628)";
    if (pct > 0.2) return "linear-gradient(90deg,#e6c228,#f6e46b)";
    return "linear-gradient(90deg,#e62828,#f66b6b)";
}

// ===== OUVERTURE / FERMETURE =====
export function openMenu() {
    if (gameState.mode === "combat") return;
    console.log("📋 Ouverture menu principal");
    menuState.isOpen = true;
    menuState.currentScreen = "main";
    menuState.inventoryDetailMode = false;
    menuState.inventoryIndex = 0;
    menuState.teamIndex = 0;
    gameState.menuOpen = true;
    overlayEl.classList.add("visible");
    renderMenu();
}

export function closeAllMenus() {
    console.log("❌ Fermeture menus");
    menuState.isOpen = false;
    menuState.currentScreen = null;
    menuState.inventoryDetailMode = false;
    gameState.menuOpen = false;
    mainMenuEl.classList.remove("open");
    inventoryMenuEl.classList.remove("open");
    teamMenuEl.classList.remove("open");
    inventoryDetailEl.classList.remove("show");
    gameState.selectedItemIndex = null;
    if (!gameState.dialogOpen && gameState.mode !== "combat") {
        overlayEl.classList.remove("visible");
    }
}

export function toggleMenu() {
    if (gameState.mode === "combat") return;
    if (menuState.isOpen) closeAllMenus();
    else openMenu();
}

// ===== RENDU DES MENUS =====
export function renderMenu() {
    console.log("🖼️ Rendu menu - Screen:", menuState.currentScreen, "| isOpen:", menuState.isOpen);
    if (!menuState.isOpen) return;
    
    if (menuState.currentScreen === "inventory") {
        renderInventoryScreen();
    } else if (menuState.currentScreen === "team") {
        renderTeamScreen();
    } else if (menuState.currentScreen === "save") {
        renderSaveMenu();
    } else {
        renderMainScreen();
    }
}

function renderMainScreen() {
    mainMenuEl.classList.add("open");
    inventoryMenuEl.classList.remove("open");
    teamMenuEl.classList.remove("open");
    
    // Récupérer les boutons du menu principal
    const buttons = [
        btnMenuInventory,
        btnMenuTeam,
        btnMenuMap,
        btnMenuSave,
        btnMenuOptions,
        btnMenuClose
    ];
    
    // Appliquer la classe selected au bouton actuel
    buttons.forEach((btn, idx) => {
        if (idx === menuState.mainMenuIndex) {
            btn.classList.add("selected");
        } else {
            btn.classList.remove("selected");
        }
    });
}

function renderSaveMenu() {
    // Cacher le menu principal, afficher un overlay pour le save
    mainMenuEl.classList.add("open");
    inventoryMenuEl.classList.remove("open");
    teamMenuEl.classList.remove("open");
    
    // Ne PAS toucher à .menu-buttons ! Créer un overlay séparé
    let saveOverlay = mainMenuEl.querySelector(".save-menu-overlay");
    if (!saveOverlay) {
        saveOverlay = document.createElement("div");
        saveOverlay.className = "save-menu-overlay";
        saveOverlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            border: 3px solid gold;
            padding: 20px;
            z-index: 10;
            min-width: 300px;
            text-align: center;
        `;
        mainMenuEl.appendChild(saveOverlay);
    }
    
    saveOverlay.innerHTML = `
        <h3 style="color: gold; margin-bottom: 15px;">Sauvegarder/Charger</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="menu-btn save-btn ${menuState.saveMenuIndex === 0 ? "selected" : ""}" data-action="save">💾 Sauvegarder</button>
            <button class="menu-btn save-btn ${menuState.saveMenuIndex === 1 ? "selected" : ""}" data-action="load">📂 Charger</button>
            <button class="menu-btn save-btn ${menuState.saveMenuIndex === 2 ? "selected" : ""}" data-action="back">⬅️ Retour</button>
        </div>
    `;
    
    // Ajouter les event listeners
    const saveButtons = saveOverlay.querySelectorAll(".save-btn");
    saveButtons.forEach((btn, idx) => {
        btn.addEventListener("click", () => {
            menuState.saveMenuIndex = idx;
            const action = btn.dataset.action;
            if (action === "save") {
                saveGameToFile();
                renderMenu();
            } else if (action === "load") {
                loadGameFromFile();
                renderMenu();
            } else if (action === "back") {
                goBack(); // goBack() appelle déjà renderMenu()
                return;  // Ne pas rappeler renderMenu() ici
            }
        });
    });
}

function renderInventoryScreen() {
    mainMenuEl.classList.remove("open");
    inventoryMenuEl.classList.add("open");
    teamMenuEl.classList.remove("open");
    
    // Grille d'items
    inventoryGridEl.innerHTML = "";
    gameState.playerInventory.forEach((it, idx) => {
        const card = document.createElement("div");
        card.className = "inv-item";
        
        // Ajouter la classe selected si cet item est sélectionné
        if (idx === menuState.inventoryIndex && !menuState.inventoryDetailMode) {
            card.classList.add("selected");
        }
        
        card.innerHTML = `
            <div class="inv-icon">${it.icon}</div>
            <div class="inv-name">${it.name}</div>
            <div class="inv-count">x${it.count}</div>
        `;
        
        card.addEventListener("click", () => {
            menuState.inventoryIndex = idx;
            menuState.inventoryDetailMode = true;
            renderMenu();
        });
        
        inventoryGridEl.appendChild(card);
    });
    
    // Panneau de détails avec choix du Pokémon
    if (menuState.inventoryDetailMode) {
        const item = gameState.playerInventory[menuState.inventoryIndex];
        if (item) {
            inventoryDetailTitleEl.textContent = `${item.icon} ${item.name}`;
            inventoryDetailDescEl.textContent = item.description || "Aucune description.";
            inventoryDetailEl.classList.add("show");
            
            // Afficher l'équipe pour choisir à qui donner l'objet
            const teamChoiceDiv = inventoryDetailEl.querySelector(".team-choice") || document.createElement("div");
            teamChoiceDiv.className = "team-choice";
            teamChoiceDiv.style.cssText = `
                margin-top: 15px;
                padding: 10px;
                background: rgba(0,0,0,0.3);
                border: 2px solid #666;
                border-radius: 5px;
            `;
            
            teamChoiceDiv.innerHTML = "<p style='color: gold; font-size: 0.9em; margin-bottom: 10px;'>À qui l'utiliser ?</p>";
            
            const teamButtonsDiv = document.createElement("div");
            teamButtonsDiv.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 8px;
            `;
            
            gameState.team.forEach((pk, idx) => {
                const btn = document.createElement("button");
                btn.className = "detail-btn";
                btn.textContent = `${pk.icon} ${pk.name}`;
                
                if (idx === menuState.inventoryTeamIndex) {
                    btn.classList.add("selected");
                }
                
                btn.addEventListener("click", () => {
                    menuState.inventoryTeamIndex = idx;
                    renderMenu();
                });
                
                // Ajouter le hover pour changer la sélection à la souris
                btn.addEventListener("mouseover", () => {
                    menuState.inventoryTeamIndex = idx;
                    renderMenu();
                });
                
                teamButtonsDiv.appendChild(btn);
            });
            
            // Remplacer ou ajouter les boutons d'équipe
            const existingTeamButtons = teamChoiceDiv.querySelector(".team-buttons");
            if (existingTeamButtons) {
                existingTeamButtons.replaceWith(teamButtonsDiv);
            } else {
                teamChoiceDiv.appendChild(teamButtonsDiv);
            }
            teamButtonsDiv.className = "team-buttons";
            
            if (!inventoryDetailEl.querySelector(".team-choice")) {
                inventoryDetailEl.appendChild(teamChoiceDiv);
            }
        }
    } else {
        inventoryDetailEl.classList.remove("show");
    }
}

function renderTeamScreen() {
    mainMenuEl.classList.remove("open");
    inventoryMenuEl.classList.remove("open");
    teamMenuEl.classList.add("open");
    
    teamListEl.innerHTML = "";
    gameState.team.forEach((pk, idx) => {
        const pct = pk.hp / pk.maxHp;
        const card = document.createElement("div");
        card.className = "team-card";
        
        // Ajouter la classe selected si ce pokémon est sélectionné
        if (idx === menuState.teamIndex) {
            card.classList.add("selected");
        }
        
        card.innerHTML = `
            <div class="team-icon">${pk.icon}</div>
            <div class="team-main">
                <div class="team-name">${pk.name}</div>
                <div class="team-level">Niv. ${pk.level} — ${pk.hp}/${pk.maxHp} PV</div>
                <div class="team-hpbar-wrap">
                    <div class="team-hpbar" style="width:${pct*100}%;background:${hpColorLocal(pct)};"></div>
                </div>
            </div>
            <div class="team-extra">${pk.status}</div>
        `;
        
        card.addEventListener("click", () => {
            menuState.teamIndex = idx;
            renderMenu();
        });
        
        teamListEl.appendChild(card);
    });
}

// ===== NAVIGATION =====
export function navigateMenu(direction) {
    console.log("📍 Navigation :", direction, "| Screen:", menuState.currentScreen, "| MainIndex:", menuState.mainMenuIndex);
    
    if (!menuState.isOpen) {
        console.log("❌ Menu pas ouvert");
        return;
    }
    
    if (menuState.currentScreen === "main") {
        const maxButtons = 6; // 6 boutons au menu
        
        if (direction === "up") {
            menuState.mainMenuIndex = Math.max(0, menuState.mainMenuIndex - 1);
            console.log("⬆️ Menu haut → Index:", menuState.mainMenuIndex);
        }
        if (direction === "down") {
            menuState.mainMenuIndex = Math.min(maxButtons - 1, menuState.mainMenuIndex + 1);
            console.log("⬇️ Menu bas → Index:", menuState.mainMenuIndex);
        }
        if (direction === "left") {
            menuState.mainMenuIndex = Math.max(0, menuState.mainMenuIndex - 1);
            console.log("⬅️ Menu gauche → Index:", menuState.mainMenuIndex);
        }
        if (direction === "right") {
            menuState.mainMenuIndex = Math.min(maxButtons - 1, menuState.mainMenuIndex + 1);
            console.log("➡️ Menu droite → Index:", menuState.mainMenuIndex);
        }
        if (direction === "back") {
            closeAllMenus();
            return;
        }
        renderMenu();
    } else if (menuState.currentScreen === "save") {
        const maxButtons = 3; // Save, Load, Back
        
        if (direction === "up") {
            menuState.saveMenuIndex = Math.max(0, menuState.saveMenuIndex - 1);
            console.log("⬆️ Save menu haut → Index:", menuState.saveMenuIndex);
        }
        if (direction === "down") {
            menuState.saveMenuIndex = Math.min(maxButtons - 1, menuState.saveMenuIndex + 1);
            console.log("⬇️ Save menu bas → Index:", menuState.saveMenuIndex);
        }
        if (direction === "back") {
            goBack();
            return;
        }
        renderMenu();
    } else if (menuState.currentScreen === "inventory") {
        if (menuState.inventoryDetailMode) {
            // En mode détail, naviguer entre les Pokémon pour utiliser l'objet
            const teamCount = gameState.team.length;
            
            if (direction === "up") {
                menuState.inventoryTeamIndex = Math.max(0, menuState.inventoryTeamIndex - 1);
                console.log("⬆️ Équipe vers le haut → Index:", menuState.inventoryTeamIndex);
            }
            if (direction === "down") {
                menuState.inventoryTeamIndex = Math.min(teamCount - 1, menuState.inventoryTeamIndex + 1);
                console.log("⬇️ Équipe vers le bas → Index:", menuState.inventoryTeamIndex);
            }
            if (direction === "back") {
                console.log("🔙 Sortir du mode détail");
                menuState.inventoryDetailMode = false;
                menuState.inventoryTeamIndex = 0; // Réinitialiser la sélection d'équipe
                renderMenu();
                return; // Important: ne pas rappeler renderMenu() après
            }
            renderMenu();
        } else {
            // Navigation dans la grille (4 colonnes)
            const cols = 4;
            const itemCount = gameState.playerInventory.length;
            
            if (direction === "up") {
                menuState.inventoryIndex = Math.max(0, menuState.inventoryIndex - cols);
                console.log("⬆️ Vers le haut → Index:", menuState.inventoryIndex);
            }
            if (direction === "down") {
                menuState.inventoryIndex = Math.min(itemCount - 1, menuState.inventoryIndex + cols);
                console.log("⬇️ Vers le bas → Index:", menuState.inventoryIndex);
            }
            if (direction === "left") {
                menuState.inventoryIndex = Math.max(0, menuState.inventoryIndex - 1);
                console.log("⬅️ Vers la gauche → Index:", menuState.inventoryIndex);
            }
            if (direction === "right") {
                menuState.inventoryIndex = Math.min(itemCount - 1, menuState.inventoryIndex + 1);
                console.log("➡️ Vers la droite → Index:", menuState.inventoryIndex);
            }
            if (direction === "back") {
                goBack();
                return;
            }
            renderMenu();
        }
    } else if (menuState.currentScreen === "team") {
        const teamCount = gameState.team.length;
        
        if (direction === "up") {
            menuState.teamIndex = Math.max(0, menuState.teamIndex - 1);
            console.log("⬆️ Équipe vers le haut → Index:", menuState.teamIndex);
        }
        if (direction === "down") {
            menuState.teamIndex = Math.min(teamCount - 1, menuState.teamIndex + 1);
            console.log("⬇️ Équipe vers le bas → Index:", menuState.teamIndex);
        }
        if (direction === "back") {
            goBack();
            return;
        }
        renderMenu();
    }
}

// ===== ACTIONS =====
export function selectMainMenuOption() {
    if (menuState.currentScreen !== "main") return;
    
    const options = [
        "inventory",  // 0
        "team",       // 1
        "map",        // 2
        "save",       // 3
        "options",    // 4
        "close"       // 5
    ];
    
    const action = options[menuState.mainMenuIndex];
    console.log("✅ Validation menu :", action);
    
    if (action === "inventory") {
        menuState.currentScreen = "inventory";
        menuState.inventoryIndex = 0;
        menuState.inventoryDetailMode = false;
        renderMenu();
    } else if (action === "team") {
        menuState.currentScreen = "team";
        menuState.teamIndex = 0;
        renderMenu();
    } else if (action === "map") {
        showDialog("🗺️ La carte n'est pas encore disponible.");
    } else if (action === "save") {
        menuState.currentScreen = "save";
        menuState.saveMenuIndex = 0;
        renderMenu();
    } else if (action === "options") {
        showDialog("⚙️ Options en développement.");
    } else if (action === "close") {
        closeAllMenus();
    }
}

export function selectSaveMenuOption() {
    if (menuState.currentScreen !== "save") return;
    
    const options = ["save", "load", "back"];
    const action = options[menuState.saveMenuIndex];
    console.log("✅ Validation save menu :", action);
    
    if (action === "save") {
        saveGameToFile();
    } else if (action === "load") {
        loadGameFromFile();
    } else if (action === "back") {
        goBack();
    }
}

export function selectItem() {
    if (menuState.currentScreen !== "inventory") return;
    menuState.inventoryDetailMode = true;
    renderMenu();
}

export function useItem() {
    if (menuState.currentScreen !== "inventory" || !menuState.inventoryDetailMode) return;
    
    const idx = menuState.inventoryIndex;
    const item = gameState.playerInventory[idx];
    if (!item) return;
    
    const pkIdx = menuState.inventoryTeamIndex;
    const pk = gameState.team[pkIdx];
    if (!pk) return;
    
    showDialog(`Tu utilises ${item.name} sur ${pk.name} !`);
    item.count--;
    
    // Simuler l'effet de l'objet (augmenter les PV par exemple)
    pk.hp = Math.min(pk.maxHp, pk.hp + 20);
    
    if (item.count <= 0) {
        gameState.playerInventory.splice(idx, 1);
        menuState.inventoryIndex = Math.max(0, idx - 1);
    }
    
    menuState.inventoryDetailMode = false;
    menuState.inventoryTeamIndex = 0; // Réinitialiser la sélection d'équipe
    renderMenu();
}

export function infoItem() {
    if (menuState.currentScreen !== "inventory" || !menuState.inventoryDetailMode) return;
    
    const item = gameState.playerInventory[menuState.inventoryIndex];
    if (item) {
        showDialog(`${item.icon} ${item.name} : ${item.description || "Objet mystérieux."}`);
    }
}

export function goBack() {
    console.log("🔙 Retour demandé, currentScreen:", menuState.currentScreen);
    
    if (menuState.currentScreen === "inventory") {
        if (menuState.inventoryDetailMode) {
            menuState.inventoryDetailMode = false;
        } else {
            menuState.currentScreen = "main";
            menuState.mainMenuIndex = 0;
        }
        renderMenu();
    } else if (menuState.currentScreen === "team") {
        menuState.currentScreen = "main";
        menuState.mainMenuIndex = 0;
        renderMenu();
    } else if (menuState.currentScreen === "save") {
        // Nettoyer l'overlay du save menu
        const saveOverlay = mainMenuEl.querySelector(".save-menu-overlay");
        if (saveOverlay) saveOverlay.remove();
        
        menuState.currentScreen = "main";
        menuState.mainMenuIndex = 3; // Retour sur Save
        renderMenu();
    }
}

// ===== ATTACHERS LES BOUTONS =====
export function attachButtonListeners() {
    // Menu principal
    btnMenuInventory.addEventListener("click", () => {
        menuState.currentScreen = "inventory";
        menuState.inventoryIndex = 0;
        menuState.inventoryDetailMode = false;
        renderMenu();
    });
    btnMenuInventory.addEventListener("mouseover", () => {
        menuState.mainMenuIndex = 0;
        renderMenu();
    });
    
    btnMenuTeam.addEventListener("click", () => {
        menuState.currentScreen = "team";
        menuState.teamIndex = 0;
        renderMenu();
    });
    btnMenuTeam.addEventListener("mouseover", () => {
        menuState.mainMenuIndex = 1;
        renderMenu();
    });
    
    btnMenuMap.addEventListener("click", () => showDialog("🗺️ La carte n'est pas encore disponible."));
    btnMenuMap.addEventListener("mouseover", () => {
        menuState.mainMenuIndex = 2;
        renderMenu();
    });
    
    btnMenuSave.addEventListener("click", () => {
        menuState.currentScreen = "save";
        menuState.saveMenuIndex = 0;
        renderMenu();
    });
    btnMenuSave.addEventListener("mouseover", () => {
        menuState.mainMenuIndex = 3;
        renderMenu();
    });
    
    btnMenuOptions.addEventListener("click", () => showDialog("⚙️ Options en développement."));
    btnMenuOptions.addEventListener("mouseover", () => {
        menuState.mainMenuIndex = 4;
        renderMenu();
    });
    
    btnMenuClose.addEventListener("click", () => closeAllMenus());
    btnMenuClose.addEventListener("mouseover", () => {
        menuState.mainMenuIndex = 5;
        renderMenu();
    });
    
    // Détails inventaire
    btnUseItemEl.addEventListener("click", useItem);
    btnInfoItemEl.addEventListener("click", infoItem);
    btnBackItemEl.addEventListener("click", () => {
        menuState.inventoryDetailMode = false;
        renderMenu();
    });
    
    btnInventoryBackEl.addEventListener("click", () => {
        menuState.currentScreen = "main";
        menuState.inventoryDetailMode = false;
        renderMenu();
    });
    
    btnTeamBackEl.addEventListener("click", () => {
        menuState.currentScreen = "main";
        renderMenu();
    });
}

// ===== SAUVEGARDE / CHARGEMENT =====
export function saveGameToFile() {
    const saveData = {
        playerName: gameState.playerName,
        money: gameState.money,
        playerInventory: gameState.playerInventory,
        team: gameState.team,
        timestamp: new Date().toLocaleString()
    };
    
    const dataStr = JSON.stringify(saveData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `save_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showDialog("💾 Partie sauvegardée dans " + link.download);
}

export function loadGameFromFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const saveData = JSON.parse(event.target.result);
                
                // Restaurer les données
                gameState.playerName = saveData.playerName;
                gameState.money = saveData.money;
                gameState.playerInventory = saveData.playerInventory;
                gameState.team = saveData.team;
                
                showDialog("✅ Partie chargée !");
                console.log("📂 Données chargées :", saveData);
                closeAllMenus();
            } catch (error) {
                showDialog("❌ Erreur lors du chargement du fichier !");
                console.error("Erreur parse JSON :", error);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

