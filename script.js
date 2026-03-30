// ==========================================
// 1. DATA & KONFIGURATION
// ==========================================

const DEFAULT_USERS = [
    {
        "user": "plan1",
        "pass": "123",
        "role": "Planerare",
        "name": "Anna Andersson",
        "email": "anna.andersson@ecxempel.se",
        "company": "BDX"
    },
    {
        "user": "mormag01",
        "pass": "123",
        "role": "Projektör",
        "name": "Magnus Moreskog",
        "email": "magnus.moreskog@trafikverket.se",
        "company": "Trafikverket"
    },
    {
        "user": "proj2",
        "pass": "123",
        "role": "Projektör",
        "name": "Berit Bengtsson",
        "email": "berit.bengtsson@excempel.se",
        "company": "WSP"
    },
    {
        "user": "tagl1",
        "pass": "123",
        "role": "Tågledare",
        "name": "Calle Carlsson",
        "email": "calle.carlsson@exemdpel.se",
        "company": "Trafikverket"
    },
    {
        "user": "tech",
        "pass": "tech",
        "role": "Admin",
		"name": "tech",
        "email": "admin@snigeltrv.se",
        "company": "Systemförvaltning"
    }
];

function getActiveUsers() {
    const stored = localStorage.getItem('app_users_v1');
    if (stored) {
        const users = JSON.parse(stored);
        
        // KOLL: Om datan verkar gammal (saknar email eller company), skriv över med default.
        if (users.length > 0 && (!users[0].hasOwnProperty('email') || !users[0].hasOwnProperty('company'))) {
            console.log("Upptäckte gammal dataformat. Uppdaterar till ny lista.");
            saveActiveUsers(DEFAULT_USERS);
            return DEFAULT_USERS;
        }
        return users;
    }
    return DEFAULT_USERS;
}

function saveActiveUsers(usersArray) {
    localStorage.setItem('app_users_v1', JSON.stringify(usersArray));
}

// HJÄLPFUNKTION FÖR STATUS
function getEntryStatus(entry) {
    if (entry.status) return entry.status; 
    return entry.projected ? 'projekterad' : 'planerad';
}

// Funktion för att spara SNR på en specifik post
window.saveSnr = function(index) {
    const inputField = document.getElementById(`snr-${index}`);
    const newValue = inputField.value;

    // Hämta all data
    const allData = StorageManager.getAll();
    
    // Uppdatera rätt post med SNR
    if (allData[index]) {
        allData[index].snr = newValue;
        StorageManager.saveAll(allData);
        showToast(`SNR "${newValue}" sparat för denna nedsättning.`, 'success');
    } else {
        showToast("Ett fel uppstod: Kunde inte hitta posten.", 'error');
    }
};

// ==========================================
// TOAST NOTIFICATIONS (Ersätter alert)
// ==========================================
window.showToast = function(message, type = 'success') {
    // 1. Skapa en container om den inte redan finns i DOM
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // 2. Skapa själva toast-rutan
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Välj ikon baserat på typ
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    // Lägg in HTML i toasten
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    // 3. Lägg till toasten i containern så den syns
    container.appendChild(toast);

    // 4. Sätt en timer för att ta bort den efter 4 sekunder
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        // Vänta tills animationen är klar innan vi tar bort elementet från DOM
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000); 
};


// ==========================================
// 2. STORAGE MANAGER & UTILS
// ==========================================

const StorageManager = {
    KEY: "hns_entries_v1",
    getAll: function() {
        try {
            const raw = localStorage.getItem(this.KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    },
    saveAll: function(data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
    },
    add: function(entry) {
        const data = this.getAll();
        data.push(entry);
        this.saveAll(data);
    },
    remove: function(index) {
        const data = this.getAll();
        data.splice(index, 1);
        this.saveAll(data);
    },
    clear: function() {
        localStorage.removeItem(this.KEY);
    }
};

const Utils = {
    toMeters: (val) => {
        if (!val) return 0;
        let s = String(val).replace(/\s+/g, '').replace(',', '.');
        if (s.includes('+')) {
            const [km, m] = s.split('+').map(n => parseInt(n, 10) || 0);
            return (km * 1000) + m;
        }
        return (parseFloat(s) || 0) * 1000;
    },
    escapeXml: (unsafe) => {
        if (!unsafe) return "";
        return unsafe.replace(/[<>&'"]/g, c => ({
            '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;'
        })[c]);
    }
};

// ==========================================
// 3. MAIN ROUTER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        initLoginPage(loginForm);
    } else {
        checkLoginStatus();
    }

    if (document.getElementById('planera-page')) initPlaneraPage();
    if (document.getElementById('projektera-page')) initProjekteraPage();
    if (document.getElementById('radera-page')) initRaderaPage();
    if (document.getElementById('users-page')) initUsersPage();
    if (document.getElementById('granska-page')) initGranskaPage();
    if (document.getElementById('aktiva-page')) initAktivaPage();
    
    // NY SIDA: Saved / Debug
    if (document.getElementById('saved-page')) initSavedPage();
});

// ==========================================
// 4. AUTENTISERING
// ==========================================

function initLoginPage(formElement) {
    formElement.addEventListener('submit', function(e) {
        e.preventDefault(); 
        const usernameInput = document.getElementById('username').value.toLowerCase();
        const passwordInput = document.getElementById('password').value;
        const errorMsg = document.getElementById('error-msg');
        
        const currentUsers = getActiveUsers();
        const foundUser = currentUsers.find(u => u.user === usernameInput && u.pass === passwordInput);

        if (foundUser) {
            sessionStorage.setItem('currentUser', JSON.stringify(foundUser));
            window.location.href = 'home.html'; 
        } else {
            if(errorMsg) errorMsg.style.display = 'block';
        }
    });
}

function checkLoginStatus() {
    const userData = sessionStorage.getItem('currentUser');
    
    // Om ingen är inloggad och vi inte är på inloggningssidan -> Gå till index
    if (!userData && !document.getElementById('loginForm')) {
         window.location.href = 'index.html'; 
         return;
    }

    if (userData) {
        const user = JSON.parse(userData);
        const path = window.location.pathname;

        // --- SÄKERHET FÖR TÅGLEDARE ---
        if (user.role === 'Tågledare') {
            // Spärra sidor
            if (document.getElementById('planera-page') || 
                document.getElementById('projektera-page') || 
                document.getElementById('radera-page') || 
                document.getElementById('users-page') ||
                document.getElementById('granska-page') ||
                document.getElementById('saved-page')) { 
                
                alert("Behörighet saknas.");
                window.location.href = 'home.html';
                return;
            }

            // Gråa ut menyval
            if (path.includes('home.html') || document.querySelector('.menu-grid')) {
                const links = document.querySelectorAll('.menu-grid a');
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && !href.includes('active.html')) {
                        link.style.opacity = '0.3';              
                        link.style.pointerEvents = 'none';       
                        link.style.cursor = 'default';           
                        link.style.filter = 'grayscale(100%)';   
                        link.style.boxShadow = 'none';           
                    }
                });
            }
        }

        // --- SÄKERHET FÖR PLANERARE ---
        if (user.role === 'Planerare') {
            // Spärra sidor (tillåter endast planera.html och active.html)
            if (document.getElementById('projektera-page') || 
                document.getElementById('radera-page') || 
                document.getElementById('users-page') ||
                document.getElementById('granska-page') ||
                document.getElementById('saved-page')) { 
                
                alert("Behörighet saknas. Endast åtkomst till planering och aktiva nedsättningar.");
                window.location.href = 'home.html';
                return;
            }

            // Gråa ut menyval i hemskärmen
            if (path.includes('home.html') || document.querySelector('.menu-grid')) {
                const links = document.querySelectorAll('.menu-grid a');
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    // Tillåt de specifika sidorna, gråa ut resten
                    if (href && !href.includes('planera.html') && !href.includes('active.html')) {
                        link.style.opacity = '0.3';              
                        link.style.pointerEvents = 'none';       
                        link.style.cursor = 'default';           
                        link.style.filter = 'grayscale(100%)';   
                        link.style.boxShadow = 'none';           
                    }
                });
            }
        }

        // --- SÄKERHET FÖR ADMIN (DEBUG-MENYN) ---
        if (user.role === 'Admin') {
            const debugLink = document.getElementById('admin-debug-link');
            if (debugLink) debugLink.style.display = 'flex';
			
            const visualLink = document.getElementById('admin-visual-link');
            if (visualLink) visualLink.style.display = 'flex';
        } 
        else if (document.getElementById('saved-page')) {
            alert("Åtkomst nekad: Endast för administratörer.");
            window.location.href = 'home.html';
            return;
        }

        // --- VISA INLOGGAD ANVÄNDARE ---
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) {
            userDisplay.innerHTML = `Inloggad som: <strong>${user.name}</strong> (${user.role}) | <a href="#" onclick="logout()">Logga ut</a>`;
        }
        
        const planerareInput = document.getElementById('planerare');
        if (planerareInput) planerareInput.value = user.name;

        // --- KOLLA NOTIFIERINGAR (BLINKA TAB) ---
        checkNotifications(user);
    }
}
window.logout = function() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
};

// --- FUNKTIONER FÖR NOTIFIERINGAR (BLINKA TAB) ---
function checkNotifications(user) {
    // Endast Planerare och Admin ska se notiser
    if (user.role === 'Planerare' || user.role === 'Admin') {
        const allData = StorageManager.getAll();
        
        // UPPDATERAT: Räkna endast poster med status 'planerad'. 
        // Ignorerar 'projekterad' och 'granskad'.
        const unhandledCount = allData.filter(e => getEntryStatus(e) === 'planerad').length;

        if (unhandledCount > 0) {
            startBlinkingTitle(unhandledCount);
        }
    }
}

let titleInterval = null;
function startBlinkingTitle(count) {
    if (titleInterval) clearInterval(titleInterval); // Rensa om den redan körs
    
    const originalTitle = document.title;
    let isAlert = false;

    titleInterval = setInterval(() => {
        if (isAlert) {
            document.title = `(${count}) 🔔 ÅTGÄRD KRÄVS! - ${originalTitle}`;
        } else {
            document.title = originalTitle;
        }
        isAlert = !isAlert;
    }, 1000); // Växla varje sekund
}


// ==========================================
// 5. SIDA: PLANERA
// ==========================================
function initPlaneraPage() {

    const fromInput = document.getElementById("from");
    if (fromInput) {
        // Skapa nuvarande tidpunkt och formatera den till YYYY-MM-DDThh:mm
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');

        fromInput.value = `${year}-${month}-${day}T${hour}:${minute}`;
    }

    // Hämta XML-data för dropdowns
    const xmlScript = document.getElementById("xmlData");
    if (xmlScript) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlScript.textContent.trim(), "text/xml");
        const populate = (tag, elId) => {
            const el = document.getElementById(elId);
            const items = xml.getElementsByTagName(tag)[0]?.getElementsByTagName("option");
            if (!el || !items) return;
            for (let opt of items) {
                const o = document.createElement("option");
                o.value = opt.getAttribute("value") || opt.textContent;
                o.textContent = opt.textContent;
                el.appendChild(o);
            }
        };
        populate("axellast", "axellast");
        populate("riktning", "riktning");
        populate("taglangd", "taglangd");
    }

    const form = document.getElementById("hnsForm");

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const entry = Object.fromEntries(fd.entries());

            entry.timestamp = new Date().toISOString();
            entry.status = "planerad"; 

            // --- HÄMTA INLOGGAD ANVÄNDARE & E-POST ---
            const currentUserJson = sessionStorage.getItem('currentUser');
            let userEmail = "okänd e-post";
            let userName = entry.planerare;

            if (currentUserJson) {
                const u = JSON.parse(currentUserJson);
                if(u.email) userEmail = u.email;
                userName = u.name;
            }
            
            // Spara datan
            StorageManager.add(entry);
            
            // SIMULERA EMAIL-BEKRÄFTELSE
            const mailSubject = `Beställning Mottagen: ${entry.identitet || 'Nedsättning'}`;
            const mailBody = `Hej ${userName}!\n\nDin beställning av nedsättning på sträcka ${entry.start_km} - ${entry.slut_km} är mottagen.\nOrsak: ${entry.orsak}`;

            console.group("📧 E-POST SIMULERING");
            console.log(`Till: ${userEmail}`);
            console.log(`Ämne: ${mailSubject}`);
            console.log(`Meddelande: \n${mailBody}`);
            console.groupEnd();
            
            // Visa snygg toast istället för alert
            const msg = `Beställning skickad!\nEn bekräftelse har skickats till ${userName}.`;
            showToast(msg, 'success');
            
            // Återställ formuläret
            form.reset();
            document.getElementById('planerare').value = userName;
            document.getElementById("to").value = "Tillsvidare"; 
            if (fromInput) fromInput.valueAsDate = new Date();
        });
    }

    const toInput = document.getElementById("to");
    if (toInput) {
        toInput.addEventListener("focus", function() {
            if (this.value === "Tillsvidare") {
                this.type = "date";
                this.value = "";
                if('showPicker' in this) try { this.showPicker(); } catch(e){}
            }
        });
        toInput.addEventListener("blur", function() {
            if (!this.value) { this.type = "text"; this.value = "Tillsvidare"; }
        });
    }
}

// ==========================================
// NY SIDA: SAVED (Debug)
// ==========================================
function initSavedPage() {
    const container = document.getElementById("savedDataDisplay");
    const data = StorageManager.getAll();
    
    if (data.length === 0) {
        container.textContent = "// Inga poster sparade.";
    } else {
        container.textContent = JSON.stringify(data, null, 4);
    }

    window.copySavedData = function() {
        navigator.clipboard.writeText(JSON.stringify(data, null, 4))
            .then(() => showToast("Data kopierad till urklipp!", "success"))
            .catch(err => showToast("Kunde inte kopiera data.", "error"));
    };
}


// ==========================================
// 6. SIDA: HANTERA / RADERA
// ==========================================
function initRaderaPage() {
    const listContainer = document.getElementById("listContainer");

    const labels = {
        identitet: "Identitet",
        start_km: "Start Kilometer",
        slut_km: "Slut Kilometer",
		start_m: "Start Meter",
		slut_m: "Slut Meter",
        sth: "Hastighet (STH)",
        orsaktext: "Orsak",
        planerare: "Planerare",
        status: "Status",
        granskadAv: "Granskad Av",
		taglangd: "Tåglängdsfördröjning",
		nedstracka: "Nedsättningssträcka",
		riktning: "Riktning",
		spar: "Spårval",
		orsak: "Orsak",
		from: "Starttid",
		to: "Sluttid",
		axellast: "Axellast",
		textmeddelande: "Textmeddelande till tåg",
		etcs: "ETCS-kategori",
		stallverkstyp: "Ställverkstyp",
		passerar: "Passerar nedsattningen RBC-Gräns?",
		rbc: "RBC-ID",
		timestamp: "Inskickad",
		systeminfo: "Information till systemtekniker",
		granskadDatum: "Datum för granskning",
		snr: "SNR"
    };

window.toggleDetails = (idx) => {
        const div = document.getElementById(`details-${idx}`);
        const icon = document.getElementById(`icon-${idx}`);
        if (!div) return;

        if (div.style.display === "none") {
            const entry = StorageManager.getAll()[idx];
            let html = `<table style="width:100%; font-size:0.9em; border-collapse:collapse;">`;

            // --- 1. FÖRBERED DATA & FORMATERING ---
            const startStr = `${entry.start_km || ''}+${entry.start_m || ''}`;
            const slutStr = `${entry.slut_km || ''}+${entry.slut_m || ''}`;
            
            // Fixa datumformat (Byt 'T' mot mellanslag för läsbarhet)
            const fromDate = entry.from ? entry.from.replace('T', ' ') : '-';
            
            // FIX: Kontrollera om det är "Tillsvidare" innan vi ersätter 'T'
            let toDate = entry.to || '-';
            if (toDate !== 'Tillsvidare') {
                toDate = toDate.replace('T', ' ');
            }
            
            const orsakVal = entry.orsak || entry.orsaktext || '-';

            // --- 2. SKAPA MANUELLA RADER I RÄTT ORDNING ---
            
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:bold; padding:6px 0; width:40%; color:#444;">Planerare</td>
                    <td style="padding:6px 0;">${entry.planerare || '-'}</td>
                </tr>
                <tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:bold; padding:6px 0; width:40%; color:#444;">Orsak</td>
                    <td style="padding:6px 0;">${orsakVal}</td>
                </tr>
                <tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:bold; padding:6px 0; width:40%; color:#444;">Starttid</td>
                    <td style="padding:6px 0;">${fromDate}</td>
                </tr>
                <tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:bold; padding:6px 0; width:40%; color:#444;">Sluttid</td>
                    <td style="padding:6px 0;">${toDate}</td>
                </tr>
                <tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:bold; padding:6px 0; width:40%; color:#444;">Nedsättningssträcka</td>
                    <td style="padding:6px 0;">${entry.nedstracka || '-'}</td>
                </tr>
                <tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:bold; padding:6px 0; width:40%; color:#444;">Start (Km+m)</td>
                    <td style="padding:6px 0;">${startStr}</td>
                </tr>
                <tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:bold; padding:6px 0; width:40%; color:#444;">Slut (Km+m)</td>
                    <td style="padding:6px 0;">${slutStr}</td>
                </tr>`;

            // --- 3. LOOPA RESTEN (MEN HOPPA ÖVER DE VI REDAN LAGT TILL) ---
            const excludeKeys = [
                'routeData', 'projectedDate', 'projected', 
                'start_km', 'start_m', 'slut_km', 'slut_m', 
                'planerare', 'orsak', 'orsaktext', 'from', 'to', 'nedstracka'
            ];

            Object.keys(entry).forEach(key => {
                if (excludeKeys.includes(key)) return;

                let value = entry[key];
                if (key === 'timestamp' && value) value = value.replace('T', ' ').slice(0, 16);
                
                if (key === 'status') {
                     if (value === 'planerad') value = "⭕ Planerad";
                     if (value === 'projekterad') value = "⚒️ Projekterad";
                     if (value === 'granskad') value = "✅ Granskad & Klar";
                }

                const label = labels[key] || key;
                html += `<tr style="border-bottom:1px solid #eee;">
                            <td style="font-weight:bold; padding:6px 0; width:40%; color:#444;">${label}</td>
                            <td style="padding:6px 0;">${value}</td>
                         </tr>`;
            });

            html += `</table>`;
            div.innerHTML = html;
            div.style.display = "block";
            if(icon) icon.className = "fa-solid fa-chevron-up";
        } else {
            div.style.display = "none";
            if(icon) icon.className = "fa-solid fa-chevron-down";
        }
    };

 window.renderDeleteList = () => {
        const entries = StorageManager.getAll();
        listContainer.innerHTML = "";
        
        if (!entries.length) {
            listContainer.innerHTML = `<div class="empty-message" style="text-align:center; padding:40px; color:#666;">Inga sparade poster.</div>`;
            return;
        }

        const ul = document.createElement("ul");
        ul.className = "delete-list";
        ul.style.listStyle = "none";
        ul.style.padding = "0";
        
        entries.forEach((e, idx) => {
            const li = document.createElement("li");
            li.style.cssText = "background:#fff; border:1px solid #ddd; border-radius:8px; margin-bottom:10px; padding:15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);";
            
            let mainTitle = e.identitet || `Utkast (Km ${e.start_km || '?'} - ${e.slut_km || '?'})`;
            const date = e.timestamp ? e.timestamp.slice(0,10) : 'Datum saknas';
            
            const currentStatus = getEntryStatus(e);
            let statusIcon = '';
            
            if (currentStatus === 'granskad') {
                statusIcon = '<span style="color:green; font-weight:bold; background:#e6f9e6; padding:2px 8px; border-radius:10px;"><i class="fa-solid fa-check-double"></i> Granskad</span>';
            } else if (currentStatus === 'projekterad') {
                statusIcon = '<span style="color:#d63384; font-weight:bold; background:#fceef5; padding:2px 8px; border-radius:10px;"><i class="fa-solid fa-helmet-safety"></i> Projekterad</span>';
            } else {
                statusIcon = '<span style="color:#666; font-weight:bold; background:#eee; padding:2px 8px; border-radius:10px;"><i class="fa-regular fa-circle"></i> Planerad</span>';
            }

            li.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div onclick="toggleDetails(${idx})" style="cursor:pointer; flex-grow:1;">
                        <div style="font-size:1.1em; margin-bottom:4px;">
                            <strong>${mainTitle}</strong>
                        </div>
                        <div style="color:#666; font-size:0.9em;">
                            ${statusIcon} &nbsp;|&nbsp; ${date} &nbsp;|&nbsp; ${e.planerare || 'Okänd'}
                            <span style="float:right; margin-right:15px; font-size:0.8em; color:#999;">Mer info <i id="icon-${idx}" class="fa-solid fa-chevron-down"></i></span>
                        </div>
                    </div>
                    <button class="btn-ghost btn-danger" onclick="deleteEntry(${idx})" style="margin-left:10px; font-size:1.2em;" title="Radera">🗑️</button>
                </div>
                <div id="details-${idx}" style="display:none; margin-top:15px; padding-top:15px; border-top:1px dashed #ccc;"></div>
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    };

    window.deleteEntry = (idx) => {
        if(confirm("Vill du verkligen ta bort denna post permanent?")) {
            StorageManager.remove(idx);
            renderDeleteList();
            showToast("Post raderad", "success");
        }
    };

    window.deleteAll = () => {
        if(confirm("VARNING: Detta tar bort ALLA sparade poster!")) {
            StorageManager.clear();
            renderDeleteList();
            showToast("Alla poster raderade", "success");
        }
    };

    renderDeleteList();
}

// ==========================================
// 7. SIDA: PROJEKTERA
// ==========================================
let allCsvItems = [];
let mainStartMeters = 0, mainEndMeters = 0;

function initProjekteraPage() {
    setupProjekteraUI();
    initCsvData();
    initRouteTables();

    document.getElementById("searchKm")?.addEventListener("input", function() {
        const val = this.value.trim();
        const dropdown = document.getElementById("entryDropdown"); 
        if (!val || !dropdown) return;
        
        const target = Utils.toMeters(val);
        const sorted = allCsvItems
            .map(i => ({...i, dist: Math.abs(i.sortKey - target)}))
            .sort((a,b) => a.dist - b.dist)
            .slice(0, 10);
        
        dropdown.innerHTML = sorted.map(i => `<option value='${i.value}'>${i.label}</option>`).join("");
    });
}

function setupProjekteraUI() {
    const select = document.getElementById("entrySelect");
    const saveBtn = document.getElementById("saveProjekteringBtn"); 
    let currentEntryIndex = null;

    const loadDropdown = () => {
        const entries = StorageManager.getAll();
        if (entries.length) {
            select.innerHTML = "<option value=''>Välj post...</option>" + 
            entries.map((e, i) => {
                const status = getEntryStatus(e);
                
                if (status === 'granskad') return '';

                let icon = "⭕"; 
                if(status === 'projekterad') icon = "⚒️"; 
                
                return `<option value="${i}">${icon} ${e.timestamp?.slice(0,10)} — ${e.planerare} (${e.nedstracka || '?'})</option>`;
            }).join("");
        } else {
            select.innerHTML = "<option>Ingen data hittades</option>";
        }
    };
    loadDropdown();

    select.addEventListener("change", (e) => {
        const idx = e.target.value;
        const allData = StorageManager.getAll();

        if (idx === "") {
            currentEntryIndex = null;
            if(saveBtn) saveBtn.disabled = true;
            document.getElementById("routes-container").innerHTML = "";
            window.addNewRouteBlock(); 
            return;
        }
        
        currentEntryIndex = parseInt(idx);
        const entry = allData[currentEntryIndex];
        
        const set = (id, v) => { const el = document.getElementById(id); if(el) el.value = v || ''; };
        
        set("orsaktext", entry.textmeddelande);
        set("sth", entry.sth);
        set("axellast", entry.axellast);
        set("taglangd", entry.taglangd);
        set("riktning", entry.riktning);
        set("spar", entry.spar);
        set("identitet", `${entry.start_km}${entry.start_m}_${entry.slut_km}${entry.slut_m}_${entry.sth}`);
        set("stracka", `${entry.start_km}+${entry.start_m} - ${entry.slut_km}+${entry.slut_m}`);

        if (entry.stallverkstyp) set("stallverkstyp", entry.stallverkstyp);
        if (entry.rbc) set("rbc", entry.rbc);
        if (entry.passerar) set("passerar", entry.passerar);

        restoreRoutes(entry.routeData);

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.cursor = "pointer";
            saveBtn.style.backgroundColor = "#007bff";
        }
        mainStartMeters = Utils.toMeters(`${entry.start_km}+${entry.start_m}`);
        mainEndMeters = Utils.toMeters(`${entry.slut_km}+${entry.slut_m}`);
        
        document.getElementById('passerarText').style.display = (entry.passerar === 'Ja') ? 'block' : 'none';
        recalcAllRows();
    });

    document.getElementById('passerar').addEventListener('change', function() {
        document.getElementById('passerarText').style.display = (this.value === 'Ja') ? 'block' : 'none';
    });

    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            if (currentEntryIndex === null) return;

            const currentData = StorageManager.getAll();
            const entryToUpdate = currentData[currentEntryIndex];

            entryToUpdate.stallverkstyp = document.getElementById("stallverkstyp").value;
            entryToUpdate.rbc = document.getElementById("rbc").value;
            entryToUpdate.passerar = document.getElementById("passerar").value;
			entryToUpdate.identitet = document.getElementById("identitet").value;
			
            const savedBlocks = [];
            document.querySelectorAll(".route-block").forEach(block => {
                const rows = [];
                block.querySelectorAll("tbody tr").forEach(tr => {
                    const selects = tr.querySelectorAll("select");
                    const inputs = tr.querySelectorAll("input");
                    rows.push({
                        pos: selects[0].value,
                        type: selects[1].value,
                        objVal: selects[2].value,
                        dir: selects[3].value,
                        side: selects[4].value,
                        km: inputs[0].value,
                        offset: inputs[1].value
                    });
                });
                savedBlocks.push(rows);
            });
            entryToUpdate.routeData = savedBlocks;

            entryToUpdate.status = "projekterad";
            entryToUpdate.projectedDate = new Date().toISOString();

            StorageManager.saveAll(currentData);
            showToast("Projektering sparad! Status ändrad till 'Projekterad'.", "success");

            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) selectedOption.innerHTML = selectedOption.innerHTML.replace("⭕", "⚒️");
        });
    }
}
// ==========================================
// 8. SIDA: GRANSKA (Review)
// ==========================================

// Hjälpfunktion för att visa/dölja detaljer
window.toggleGranskaDetails = function(index) {
    const el = document.getElementById(`granska-details-${index}`);
    const icon = document.getElementById(`granska-icon-${index}`);
    
    if (el.style.display === 'none') {
        el.style.display = 'block';
        if(icon) icon.className = "fa-solid fa-chevron-up";
    } else {
        el.style.display = 'none';
        if(icon) icon.className = "fa-solid fa-chevron-down";
    }
};

function initGranskaPage() {
    const listContainer = document.getElementById("granskaListContainer");
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

window.renderGranskaList = () => {
        const entries = StorageManager.getAll();
        const reviewables = entries.map((e, i) => ({...e, originalIndex: i}))
                                   .filter(e => getEntryStatus(e) === 'projekterad');

        const listContainer = document.getElementById("granskaListContainer");
        listContainer.innerHTML = "";

        if (reviewables.length === 0) {
            listContainer.innerHTML = `<div class="empty-message" style="text-align:center; padding:40px; color:#666;">Inga nedsättningar väntar på granskning.</div>`;
            return;
        }

        // ==========================================
        // POC KART-DATA (Kopierat exakt från scriptdp.js)
        // Detta garanterar att Granska-sidan ser exakt ut som "Visa Snigelspår"
        // ==========================================
        const PX_PER_M = 0.6;
        const TRACK_GAP = 60;
        const SLOPE_PX = 20;
        const Y_BASE = 150; 
        
        const pocStations = [
            { name: "Harrå", km: 1357640, yOffset: -120 },
            { name: "Fjällåsen", km: 1370750, yOffset: -80 }
        ];

        const pocTracks = [
            { id: 'h2', start: 1357123, end: 1358052, levelFrom: 0, levelTo: -1 }, 
            { id: 'h1', start: 1357546, end: 1357717, levelFrom: -1, levelTo: -2 },
            { id: 'f1', start: 1370400, end: 1371063, levelFrom: 0, levelTo: 1 }
        ];

        const pocSymbols = [
            { id: "102",  pos: 1356797, track: 0, dir: 1,  labelPos: -1 }, 
            { id: "L201", pos: 1356964, track: 0, dir: -1, labelPos: 1 },  
            { id: "151",  pos: 1357227, track: 0, dir: -1, labelPos: 1 },  
            { id: "141",  pos: 1357339, track: 0, dir: -1, labelPos: 1 },  
            { id: "142",  pos: 1357902, track: 0, dir: 1,  labelPos: -1 }, 
            { id: "152",  pos: 1358003, track: 0, dir: 1,  labelPos: -1 }, 
            { id: "L202", pos: 1358229, track: 0, dir: 1,  labelPos: -1 }, 
            { id: "101",  pos: 1358447, track: 0, dir: -1, labelPos: 1 },  
            { id: "153",  pos: 1357227, track: -1, dir: -1, labelPos: 1 },
            { id: "143",  pos: 1357339, track: -1, dir: -1, labelPos: 1 },  
            { id: "123",  pos: 1357619, track: -1, dir: -1, labelPos: 1 },  
            { id: "120",  pos: 1357674, track: -1, dir: 1,  labelPos: -1 }, 
            { id: "140",  pos: 1357901, track: -1, dir: 1,  labelPos: -1 }, 
            { id: "150",  pos: 1358003, track: -1, dir: 1,  labelPos: -1 }, 
            { id: "125",  pos: 1357611, track: -2, dir: -1, labelPos: 1 }, 
            { id: "118",  pos: 1357674, track: -2, dir: 1,  labelPos: -1 }, 
            { id: "L212", pos: 1359704, track: 0, dir: 1,  labelPos: -1 },
            { id: "L241", pos: 1359704, track: 0, dir: -1, labelPos: 1 },
            { id: "L222", pos: 1362918, track: 0, dir: 1,  labelPos: -1 },
            { id: "L231", pos: 1362918, track: 0, dir: -1, labelPos: 1 },
            { id: "L222", pos: 1365100, track: 0, dir: 1,  labelPos: -1 },
            { id: "L231", pos: 1365100, track: 0, dir: -1, labelPos: 1 },
            { id: "L242", pos: 1369000, track: 0, dir: 1,  labelPos: -1 },
            { id: "L211", pos: 1369000, track: 0, dir: -1, labelPos: 1 },
            { id: "102",  pos: 1370008, track: 0, dir: 1,  labelPos: -1 }, 
            { id: "L201", pos: 1370184, track: 0, dir: -1, labelPos: 1 },  
            { id: "151",  pos: 1370485, track: 0, dir: -1, labelPos: 1 },  
            { id: "141",  pos: 1370598, track: 0, dir: -1, labelPos: 1 },  
            { id: "142",  pos: 1370918, track: 0, dir: 1,  labelPos: -1 },  
            { id: "152",  pos: 1371018, track: 0, dir: 1,  labelPos: -1 },  
            { id: "L202", pos: 1371280, track: 0, dir: 1,  labelPos: -1 },  
            { id: "149",  pos: 1370484, track: 1, dir: -1, labelPos: 1 },  
            { id: "139",  pos: 1370598, track: 1, dir: -1, labelPos: 1 },  
            { id: "144",  pos: 1370918, track: 1, dir: 1,  labelPos: -1 },  
            { id: "154",  pos: 1371019, track: 1, dir: 1,  labelPos: -1 },  
            { id: "101",  pos: 1371486, track: 0, dir: -1, labelPos: 1 }
        ];

        reviewables.forEach(e => {
            const div = document.createElement("div");
            div.style.cssText = "background:#fff; border-left: 5px solid #d63384; border-radius:8px; margin-bottom:20px; padding:20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); max-width: 100%; box-sizing: border-box;";
            
            let routeInfo = e.routeData && e.routeData.length ? `${e.routeData.length} st delsträckor` : "Ingen sträckdata";
            const customStracka = `${e.nedstracka ? e.nedstracka + ' ' : ''}${e.start_km}+${e.start_m} - ${e.slut_km}+${e.slut_m}`;

            const excludeKeys = ['routeData', 'originalIndex', 'timestamp', 'status', 'granskadAv', 'granskadDatum', 'snr', 'start_km', 'start_m', 'slut_km', 'slut_m', 'projecteddate'];
            let detailsHtml = `<table style="width:100%; font-size:0.9em; border-collapse:collapse; margin-top:10px;">`;
            
            if (e.start_km !== undefined) {
                detailsHtml += `<tr><td style="padding:6px 0; font-weight:600; color:#555; width:40%;">Position:</td><td style="padding:6px 0; color:#000;">${e.start_km}+${e.start_m} - ${e.slut_km}+${e.slut_m}</td></tr>`;
            }
            Object.keys(e).forEach(key => {
                if (excludeKeys.includes(key)) return;
                detailsHtml += `<tr><td style="padding:6px 0; font-weight:600; color:#555; width:40%;">${key.charAt(0).toUpperCase() + key.slice(1)}:</td><td style="padding:6px 0; color:#000;">${e[key] || '-'}</td></tr>`;
            });

            if (e.routeData && e.routeData.length > 0) {
                detailsHtml += `<tr><td colspan="2" style="padding-top:20px; padding-bottom:5px; font-weight:bold; border-bottom:2px solid #ddd; color:#d63384; text-transform:uppercase; font-size:0.85em;">Projekterade Objekt</td></tr>`;
                e.routeData.forEach((block, blockIdx) => {
                    detailsHtml += `<tr><td colspan="2" style="background:#f1f3f5; padding:8px; font-weight:bold; font-size:0.9em; border-top:1px solid #ccc; color:#333;">Delsträcka ${blockIdx + 1}</td></tr>`;
                    block.forEach(row => {
                        let positionInfo = (row.dir === "Med" ? "Medriktad" : (row.dir === "Mot" ? "Motriktad" : "")) + (row.side === "H" ? ", Höger" : (row.side === "V" ? ", Vänster" : ""));
                        let cleanObjName = row.objVal;
                        try { const parsed = JSON.parse(row.objVal); if (parsed.objekt) cleanObjName = `${parsed.plstr} ${parsed.objekt}`; } catch (err) {}
                        
                        detailsHtml += `
                            <tr style="font-size:0.9em; border-bottom:1px solid #eee;">
                                <td colspan="2" style="padding:6px 10px;">
                                    <div style="display:flex; justify-content:space-between;">
                                        <strong style="color:#000;">${row.type} <span style="font-weight:normal; color:#d63384; margin-left:5px;">${cleanObjName}</span></strong> 
                                        <span style="color:#666; font-family:monospace;">${row.pos}</span>
                                    </div>
                                    <div style="color:#555; margin-top:2px;">KM: ${row.km} <span style="color:#ccc;">|</span> Offset: ${row.offset}m</div>
                                    <div style="color:#777; font-size:0.85em;">${positionInfo}</div>
                                </td>
                            </tr>`;
                    });
                });
            }
            detailsHtml += `</table>`;

            // ==========================================
            // KARTA: EXAKT KOPIA AV "VISA SNIGELSPÅR"
            // ==========================================
            let miniMapHtml = '';
            if (e.start_km !== undefined && e.slut_km !== undefined) {
                const sM = parseInt(e.start_km) * 1000 + parseInt(e.start_m || 0);
                const eM = parseInt(e.slut_km) * 1000 + parseInt(e.slut_m || 0);
                
                if (!isNaN(sM) && !isNaN(eM)) {
                    const minM = Math.min(sM, eM);
                    const maxM = Math.max(sM, eM);
                    
                    const paddingMeters = 1500; 
                    const viewStart = minM - paddingMeters;
                    const viewEnd = maxM + paddingMeters;
                    const W_meters = viewEnd - viewStart;
                    const W_px = Math.round(W_meters * PX_PER_M); 
                    const getX = (m) => Math.round((m - viewStart) * PX_PER_M);

                    let tracksSvg = '';
                    
                    // 1. Huvudspår (går genom hela rutan)
                    tracksSvg += `<line x1="0" y1="${Y_BASE}" x2="${W_px}" y2="${Y_BASE}" stroke="#374151" stroke-width="4" stroke-linecap="square" />`;
                    
                    // 2. Sidospår från TRACK_DEFINITIONS
                    pocTracks.forEach(def => {
                        const xStart = getX(def.start);
                        const xEnd = getX(def.end);
                        const yFrom = Y_BASE + (def.levelFrom * TRACK_GAP);
                        const yTo = Y_BASE + (def.levelTo * TRACK_GAP);
                        
                        // Rita bara om spåret är synligt i fönstret
                        if (xEnd > 0 && xStart < W_px) {
                            tracksSvg += `<line x1="${xStart + SLOPE_PX}" y1="${yTo}" x2="${xEnd - SLOPE_PX}" y2="${yTo}" stroke="#374151" stroke-width="4" stroke-linecap="square" />`;
                            tracksSvg += `<line x1="${xStart}" y1="${yFrom}" x2="${xStart + SLOPE_PX}" y2="${yTo}" stroke="#374151" stroke-width="4" stroke-linecap="square" />`;
                            tracksSvg += `<line x1="${xEnd}" y1="${yFrom}" x2="${xEnd - SLOPE_PX}" y2="${yTo}" stroke="#374151" stroke-width="4" stroke-linecap="square" />`;
                        }
                    });

                    // 3. Stationer
                    let stationSvg = '';
                    pocStations.forEach(st => {
                        const x = getX(st.km);
                        if (x > -100 && x < W_px + 100) {
                            stationSvg += `<text x="${x}" y="${Y_BASE + st.yOffset}" fill="#000" opacity="0.1" font-weight="900" font-size="45" font-family="sans-serif" text-anchor="middle" letter-spacing="3">${st.name}</text>`;
                        }
                    });

                    // 4. Gul nedsättningsruta
                    const selStartX = getX(minM);
                    const selEndX = getX(maxM);
                    const boxMinY = 20;
                    const boxMaxY = 280;
                    
                    let rangeSvg = `
                        <rect x="${selStartX}" y="${boxMinY}" width="${selEndX - selStartX}" height="${boxMaxY - boxMinY}" fill="#fef08a" opacity="0.5" />
                        <line x1="${selStartX}" y1="${boxMinY}" x2="${selStartX}" y2="${boxMaxY}" stroke="#dc3545" stroke-width="2" stroke-dasharray="6,6" />
                        <line x1="${selEndX}" y1="${boxMinY}" x2="${selEndX}" y2="${boxMaxY}" stroke="#dc3545" stroke-width="2" stroke-dasharray="6,6" />
                        <text x="${selStartX + 15}" y="${boxMinY + 20}" fill="#dc3545" font-weight="bold" font-size="14" font-family="sans-serif">Längd: ${maxM - minM} m</text>
                    `;

                    // 5. Signaler
                    let signalsSvg = '';
                    pocSymbols.forEach(sym => {
                        const x = getX(sym.pos);
                        if (x > -100 && x < W_px + 100) {
                            const y = Y_BASE + (sym.track * TRACK_GAP);
                            
                            const kmPart = Math.floor(sym.pos / 1000); 
                            const mPart = sym.pos % 1000; 
                            const kmStr = `${kmPart}+${mPart.toString().padStart(3, '0')}`;
                            
                            let fillColor = "#9ca3af"; // Grå standard
                            let textColor = "#111827";
                            let textWeight = "700";

                            // Kolla om signalen finns i routeData och är Start eller Slut
                            if (e.routeData) {
                                e.routeData.forEach(block => {
                                    block.forEach(row => {
                                        try {
                                            let parsed = JSON.parse(row.objVal);
                                            // Måste matcha både namn och kilometer för säkerhet
                                            if (parsed.objekt.includes(sym.id) && parsed.kmtal === kmStr) {
                                                if (row.pos === "Start") { fillColor = "#22c55e"; textColor = "#047857"; textWeight = "900"; }
                                                if (row.pos === "Slut") { fillColor = "#ef4444"; textColor = "#b91c1c"; textWeight = "900"; }
                                            }
                                        } catch(err) {}
                                    });
                                });
                            }

                            const pathD = sym.dir === 1 ? "M -7 -6 L 7 0 L -7 6 Z" : "M 7 -6 L -7 0 L 7 6 Z";
                            const labelY = (sym.labelPos === 1) ? 22 : -12;
                            const kmLabelY = (sym.labelPos === -1) ? -25 : 35;

                            signalsSvg += `
                                <g transform="translate(${x}, ${y})">
                                    <text x="0" y="${kmLabelY}" font-size="10" fill="#999" text-anchor="middle" font-family="monospace">${kmStr}</text>
                                    <path d="${pathD}" fill="${fillColor}" stroke="#4b5563" stroke-width="1.5" />
                                    <text x="0" y="${labelY}" font-size="11" font-weight="${textWeight}" fill="${textColor}" text-anchor="middle" font-family="monospace">${sym.id}</text>
                                </g>
                            `;
                        }
                    });

                    miniMapHtml = `
                    <div style="margin-top: 30px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 1em; border-bottom: 2px solid #eee; padding-bottom: 5px;">
                            <i class="fa-solid fa-map"></i> Spårkarta
                        </h4>
                        
                        <div style="width: 100%; max-width: 100%; overflow-x: auto; background-color: #fff; border: 1px solid #e2e8f0; border-radius: 4px; box-sizing: border-box; touch-action: pan-x;"> 
                            
                            <svg width="${W_px}" height="300" style="display: block; min-width: 100%;">
                                ${stationSvg}
                                ${rangeSvg}
                                ${tracksSvg}
                                ${signalsSvg}
                            </svg>
                            
                        </div>
                    </div>`;
                }
            }

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; max-width: 100%;">
                    <div style="flex-grow:1; min-width: 0;"> 
                        <h3 style="margin-top:0;">${e.identitet || 'Saknar ID'}</h3>
                        <p style="color:#666; margin:5px 0;">Sträcka: <strong>${customStracka}</strong></p>
                        <p style="color:#666; margin:5px 0;">Planerare: ${e.planerare} | Datum: ${e.timestamp?.slice(0,10)}</p>
                        
                        <div onclick="window.toggleGranskaDetails(${e.originalIndex})" 
                             style="margin-top:10px; font-size:0.9em; background:#f8f9fa; padding:10px; border-radius:4px; cursor:pointer; border:1px solid #eee; transition: background 0.2s;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong><i class="fa-solid fa-microchip"></i> Teknisk data & Karta (Klicka för info):</strong>
                                <i id="granska-icon-${e.originalIndex}" class="fa-solid fa-chevron-down"></i>
                            </div>
                            <div style="margin-top:5px; color:#555;">
                                RBC: ${e.rbc || '-'}, ${routeInfo}
                            </div>
                        </div>

                        <div id="granska-details-${e.originalIndex}" style="display:none; margin-top:15px; border-top:1px dashed #ccc; padding-top:10px;">
                            ${detailsHtml}
                            ${miniMapHtml}
                        </div>
                    </div>
                    <div style="text-align:right; margin-left:20px; flex-shrink: 0;">
                        <button onclick="approveEntry(${e.originalIndex})" class="btn-primary" style="background-color:#28a745; border:none; padding:10px 20px;">
                            <i class="fa-solid fa-check-double"></i> Godkänn
                        </button>
                    </div>
                </div>
            `;
            listContainer.appendChild(div);
        });
    };


    window.approveEntry = (index) => {
        if(!confirm("Jag intygar att denna nedsättning är korrekt granskad.")) return;
        const allData = StorageManager.getAll();
        const entry = allData[index];
        
        entry.status = "granskad";
        entry.granskadAv = currentUser.name || "Okänd";
        entry.granskadDatum = new Date().toISOString();
        
        StorageManager.saveAll(allData);
        showToast("Nedsättningen är nu granskad och Aktiv!", "success");
        window.renderGranskaList();
    };

    window.renderGranskaList();
}

// ==========================================
// 9. SIDA: AKTIVA
// ==========================================
function initAktivaPage() {
    const listContainer = document.getElementById("activeListContainer");

    const render = () => {
        const entries = StorageManager.getAll();
        
        const active = entries
            .map((e, i) => ({ ...e, originalIndex: i })) 
            .filter(e => getEntryStatus(e) === 'granskad');

        listContainer.innerHTML = "";

        if (active.length === 0) {
            listContainer.innerHTML = `<div class="empty-message" style="text-align:center; padding:40px; color:#666;">Inga aktiva nedsättningar just nu.</div>`;
            return;
        }

        active.forEach(e => {
            const div = document.createElement("div");
            div.style.cssText = "background:#fff; border-left: 6px solid #28a745; border-radius:8px; margin-bottom:20px; padding:20px; box-shadow: 0 4px 6px rgba(0,0,0,0.08);";

            const validFrom = e.from ? e.from : "Ospecificerat";
            const validTo = e.to ? e.to : "Tillsvidare";
            
            const currentSnr = e.snr || ""; 

            // --- NY LOGIK FÖR ATT VISA BÅDE STRÄCKA OCH KM ---
            const kmPos = `${e.start_km}+${e.start_m} - ${e.slut_km}+${e.slut_m}`;
            
            // Om "nedstracka" finns: Visa "Namn | Km". Annars bara "Km".
            const displayStracka = e.nedstracka 
                ? `${e.nedstracka} <span style="color:#ccc; margin:0 5px;">|</span> ${kmPos}` 
                : kmPos;

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap;">
                    <div style="flex: 1; min-width: 300px;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                            <h2 style="margin:0; color:#333;">${e.sth || '--'} km/h</h2>
                            <span style="background:#e6f9e6; color:#155724; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:0.8em;">AKTIV</span>
                        </div>
                        <h3 style="margin:0 0 5px 0; font-size:1.1em;">${e.identitet || 'Saknar ID'}</h3>
                        
                        <p style="margin:0; color:#555;"><strong>Sträcka:</strong> ${displayStracka}</p>
                        
                        <p style="margin:5px 0 0 0; color:#666;">Orsak: ${e.orsaktext || e.orsak || '-'}</p>
                        
                        <div style="margin-top: 15px; background: #f8f9fa; padding: 10px; border-radius: 5px; border: 1px solid #e9ecef; display: inline-block;">
                            <label style="font-size: 0.85em; font-weight: bold; display: block; margin-bottom: 5px;">SNR (Identitet):</label>
                            <div style="display: flex; gap: 5px;">
                                <input type="text" id="snr-${e.originalIndex}" value="${currentSnr}" placeholder="Ange SNR" style="margin:0; padding: 5px; width: 120px;">
                                <button onclick="saveSnr(${e.originalIndex})" class="btn-primary" style="padding: 5px 10px; font-size: 0.85em;">Spara</button>
                            </div>
                        </div>

                    </div>
                    
                    <div style="flex: 1; border-left:1px solid #eee; padding-left:20px; margin-left:20px; min-width: 200px;">
                        <p style="font-size:0.9em; color:#555; margin-bottom:5px;"><strong>Giltighetstid:</strong></p>
                        <div style="font-family:monospace; font-size:1.1em; color:#333;">
                            Från: ${validFrom}<br>
                            Till: ${validTo}
                        </div>
                        <div style="margin-top:15px; font-size:0.85em; color:#888;">
                            Granskad av: ${e.granskadAv || '-'} <br>
                            Datum: ${e.granskadDatum ? e.granskadDatum.slice(0,10) : '-'}
                        </div>
                    </div>
                </div>
            `;
            listContainer.appendChild(div);
        });
    };

    render();
}

// ==========================================
// 10. HELPER FUNCTIONS
// ==========================================
function restoreRoutes(savedBlocks) {
    const container = document.getElementById("routes-container");
    container.innerHTML = "";
    if (!savedBlocks || savedBlocks.length === 0) {
        window.addNewRouteBlock();
        return;
    }
    savedBlocks.forEach((blockRows, blockIndex) => {
        const num = blockIndex + 1;
        const div = document.createElement("div");
        div.className = "route-block";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #eee; margin:30px 0 10px 0;">
                <h3>Sträcka <span class="route-number">${num}</span></h3>
                <button type="button" class="btn-ghost btn-danger no-print" onclick="deleteRouteBlock(this)">🗑️ Ta bort</button>
            </div>
            <table class="control-table route-table">
                <thead><tr>
                    <th width="10%">Start/Via/Slut</th> 
                    <th width="15%">Typ</th> <th width="25%">Beteckning</th>
                    <th width="10%">Med/mot</th> 
                    <th width="7%">H/V</th> 
                    <th width="14%">Km</th> 
                    <th width="14%">Offset</th> 
                    <th width="5%"></th>
                </tr></thead>
                <tbody class="route-body"></tbody>
            </table>
            <div class="no-print" style="margin:10px 0 20px;"><button type="button" onclick="addRouteRow(this)" class="btn-ghost">+ Rad</button></div>
        `;
        container.appendChild(div);
        const tbody = div.querySelector("tbody");
        blockRows.forEach(rowData => {
            createRow(tbody, rowData.pos);
            const tr = tbody.lastElementChild;
            const selects = tr.querySelectorAll("select");
            const inputs = tr.querySelectorAll("input");
            selects[0].value = rowData.pos;
            selects[1].value = rowData.type;
            window.updateObjOpts(selects[1]); 
            selects[2].value = rowData.objVal;
            selects[3].value = rowData.dir;
            selects[4].value = rowData.side;
            inputs[0].value = rowData.km;
            inputs[1].value = rowData.offset;
        });
    });
}

function initCsvData() {
    if (typeof CSV_DATA === 'undefined') return;
    const lines = CSV_DATA.split(/\r?\n/).filter(r => r.trim());
    const delimiter = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
    
    // NYTT: Nu hämtar vi även Spår (spr) för att kunna rita flera parallella spår på kartan!
    const idx = { 
        plstr: headers.indexOf("pl/str"), 
        km: headers.indexOf("bdl kmtal till"), 
        obj: headers.indexOf("objekt"), 
        type: headers.indexOf("objekttyp"),
        spr: headers.indexOf("spr") 
    };
    
    if (idx.plstr === -1) return;
    allCsvItems = lines.slice(1).map(line => {
        const cols = line.split(delimiter).map(c => c.replace(/['"]+/g, '').trim());
        if (!cols[idx.plstr]) return null;
        const shortTxt = `${cols[idx.plstr]} ${cols[idx.obj]}`;
        const longTxt = `${shortTxt} (${cols[idx.km]})`;
        return {
            label: longTxt, shortLabel: shortTxt,
            value: JSON.stringify({ plstr: cols[idx.plstr], kmtal: cols[idx.km], objekt: cols[idx.obj] }),
            sortKey: Utils.toMeters(cols[idx.km]), 
            type: cols[idx.type] || "", 
            name: cols[idx.obj] || "",
            track: cols[idx.spr] || "2", // Sparar vilket spår (1, 2, 3) objektet ligger på
            kmText: cols[idx.km] || "",
            station: cols[idx.plstr] || ""
        };
    }).filter(Boolean).sort((a,b) => a.sortKey - b.sortKey);
}

// Global UI functions
window.addNewRouteBlock = function() {
    const container = document.getElementById("routes-container");
    const num = container.children.length + 1;
    const div = document.createElement("div");
    div.className = "route-block";
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #eee; margin:30px 0 10px 0;">
            <h3>Sträcka <span class="route-number">${num}</span></h3>
            <button type="button" class="btn-ghost btn-danger no-print" onclick="deleteRouteBlock(this)">🗑️ Ta bort</button>
        </div>
        <table class="control-table route-table">
            <thead><tr><th width="10%">Start/Via/Slut</th><th width="15%">Typ</th><th width="25%">Beteckning</th><th width="10%">Med/mot</th><th width="7%">H/V</th><th width="14%">Km</th><th width="14%">Offset</th><th width="5%"></th></tr></thead>
            <tbody class="route-body"></tbody>
        </table>
        <div class="no-print" style="margin:10px 0 20px;"><button type="button" onclick="addRouteRow(this)" class="btn-ghost">+ Rad</button></div>
    `;
    container.appendChild(div);
    const tbody = div.querySelector("tbody");
    createRow(tbody, "Start");
    createRow(tbody, "Slut");
};

window.deleteRouteBlock = function(btn) {
    if (document.querySelectorAll(".route-block").length > 1 && confirm("Ta bort sträcka?")) {
        btn.closest(".route-block").remove();
        document.querySelectorAll(".route-number").forEach((el, i) => el.textContent = i + 1);
    }
};

window.addRouteRow = function(btn) { createRow(btn.closest(".route-block").querySelector("tbody"), "Via"); };

function createRow(tbody, posType) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><select onchange="calcOffset(this)"><option>${posType}</option><option>Start</option><option>Via</option><option>Slut</option></select></td>
        <td><select onchange="updateObjOpts(this)"><option value="Signal">Signal</option><option value="Växel">Växel</option><option value="Stoppbock">Stoppbock</option></select></td>
        <td><select onfocus="expandDropdown(this)" onblur="shrinkDropdown(this)" onchange="fillKm(this); shrinkDropdown(this)"><option value="">Välj...</option></select></td>
        <td><select><option></option><option value="Med">Med</option><option value="Mot">Mot</option></select></td>
        <td><select><option></option><option value="H">H</option><option value="V">V</option></select></td>
        <td><input type="text" oninput="calcOffset(this)"></td>
        <td><input type="text"></td>
        <td class="no-print"><button type="button" style="border:none;background:none;cursor:pointer;" onclick="this.closest('tr').remove()">🗑️</button></td>
    `;
    tbody.appendChild(tr);
    updateObjOpts(tr.querySelector('select')); 
}

window.updateObjOpts = function(el) {
    const tr = el.closest("tr");
    const type = tr.cells[1].querySelector("select").value;
    const target = tr.cells[2].querySelector("select");
    const matches = allCsvItems.filter(i => {
        if (type === "Signal") return i.type.toLowerCase().includes("signal");
        if (type === "Växel") return i.name.toLowerCase().includes("vxl");
        if (type === "Stoppbock") return i.name.toLowerCase().includes("stopp");
        return true;
    });
    target.innerHTML = "<option value=''>Välj...</option>" + matches.map(i => `<option value='${i.value}' data-short='${i.shortLabel}' data-long='${i.label}'>${i.label}</option>`).join("");
};

window.expandDropdown = function(sel) { for (let opt of sel.options) { if (opt.dataset.long) opt.textContent = opt.dataset.long; } };
window.shrinkDropdown = function(sel) { 
    for (let opt of sel.options) { if (opt.dataset.short) opt.textContent = opt.dataset.short; } 
    const selectedOpt = sel.options[sel.selectedIndex];
    if (selectedOpt && selectedOpt.dataset.short) selectedOpt.textContent = selectedOpt.dataset.short;
};

window.fillKm = function(el) {
    if (!el.value) return;
    const data = JSON.parse(el.value);
    const input = el.closest("tr").cells[5].querySelector("input");
    input.value = data.kmtal;
    calcOffset(input);
};

window.calcOffset = function(el) {
    const tr = el.closest("tr");
    const pos = tr.cells[0].querySelector("select").value;
    const kmVal = tr.cells[5].querySelector("input").value;
    const offInput = tr.cells[6].querySelector("input");
    if (pos === "Via" || !kmVal) { offInput.value = ""; return; }
    const m = Utils.toMeters(kmVal);
    let diff = 0;
    if (pos === "Start" && mainStartMeters) diff = m - mainStartMeters;
    if (pos === "Slut" && mainEndMeters) diff = m - mainEndMeters;
    offInput.value = diff;
};

function recalcAllRows() {
    document.querySelectorAll(".route-table tbody tr").forEach(tr => {
        const inp = tr.cells[5].querySelector("input");
        if (inp) calcOffset(inp);
    });
}

function initRouteTables() { if (!document.querySelector(".route-block")) window.addNewRouteBlock(); }

window.generateXML = function() {
    const val = (id) => Utils.escapeXml(document.getElementById(id)?.value || "");
    let xml = `<?xml version="1.0" encoding="iso-8859-1"?>\r\n<TSRXML xmlns="http://www.bombardier.com/rcs/OPS">\r\n`;
    ["rbc", "identitet", "sth", "orsaktext", "axellast", "taglangd", "riktning"].forEach(f => {
        const map = { rbc:"RBCName", identitet:"Identity", sth:"STH", orsaktext:"Cause", axellast:"WeightPerAxle", taglangd:"Front", riktning:"Direction" };
        xml += `\t<${map[f]}>${val(f)}</${map[f]}>\r\n`;
    });
    xml += `\t<DistanceToShow>1500</DistanceToShow>\r\n\t<TSRLine>\r\n`;
    document.querySelectorAll(".route-body tr").forEach(tr => {
        const sels = tr.querySelectorAll("select");
        const objData = sels[2].value ? JSON.parse(sels[2].value) : null;
        if (!objData) return;
        const type = Utils.escapeXml(sels[1].value);
        const dir = sels[3].value === "Med" ? "Medriktad" : (sels[3].value === "Mot" ? "Motriktad" : "");
        const side = sels[4].value;
        const dirFull = (type === "Växel" && side) ? `${dir} ${side}` : dir;
        const offset = tr.cells[6].querySelector("input").value || "0";
        xml += `\t\t<TSRObj>\r\n\t\t\t<Name>${Utils.escapeXml(objData.objekt)}</Name>\r\n\t\t\t<Type>${type}</Type>\r\n\t\t\t<Direction>${dirFull}</Direction>\r\n\t\t\t<Offset>${offset}</Offset>\r\n\t\t</TSRObj>\r\n`;
    });
    xml += `\t</TSRLine>\r\n</TSRXML>`;
    let rawId = document.getElementById('identitet').value.trim();
    let filename = rawId ? rawId.replace(/[^a-z0-9_\-\.]/gi, '_') : "nedsattning";
    downloadFile(filename + ".xml", xml, "application/xml");
};

window.printPage = function() { window.print(); };

function downloadFile(name, content, type) {
    const blob = new Blob([new Uint8Array([...content].map(c => c.charCodeAt(0)))], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

function initUsersPage() {
    const form = document.getElementById('userForm');
    const tableBody = document.getElementById('userTableBody');
    const editIndexInput = document.getElementById('editIndex');
    let userList = getActiveUsers();

    const renderTable = () => {
        tableBody.innerHTML = '';
        userList.forEach((u, index) => {
            const tr = document.createElement('tr');
            // Uppdaterad HTML för raden med Företag
            tr.innerHTML = `
                <td><strong>${u.name}</strong></td>
                <td>${u.company || '-'}</td>
                <td><a href="mailto:${u.email}" style="color:#0078d4;">${u.email || ''}</a></td>
                <td>${u.user}</td>
                <td><code>${u.pass}</code></td>
                <td><span style="background:#eee; padding:2px 6px; border-radius:4px; font-size:0.9em;">${u.role}</span></td>
                <td style="text-align:right;">
                    <button type="button" class="btn-ghost" onclick="editUser(${index})" title="Redigera">✏️</button>
                    <button type="button" class="btn-ghost btn-danger" onclick="removeUser(${index})" title="Ta bort">🗑️</button>
                </td>`;
            tableBody.appendChild(tr);
        });
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUser = {
            name: document.getElementById('u_name').value, 
            email: document.getElementById('u_email').value,
            user: document.getElementById('u_user').value.toLowerCase(),
            pass: document.getElementById('u_pass').value, 
            role: document.getElementById('u_role').value,
            company: document.getElementById('u_company').value // Nytt fält
        };
        const index = parseInt(editIndexInput.value);
        if (index >= 0) { 
            userList[index] = newUser; 
            editIndexInput.value = "-1"; 
            document.getElementById('userFormTitle').innerText = "Lägg till ny användare"; 
        } else { 
            userList.push(newUser); 
        }
        saveActiveUsers(userList); 
        renderTable(); 
        form.reset();
    });

    window.removeUser = (index) => { if(confirm('Ta bort användare?')) { userList.splice(index, 1); saveActiveUsers(userList); renderTable(); } };
    
    window.editUser = (index) => {
        const u = userList[index];
        document.getElementById('u_name').value = u.name; 
        document.getElementById('u_email').value = u.email || "";
        document.getElementById('u_user').value = u.user;
        document.getElementById('u_pass').value = u.pass; 
        document.getElementById('u_role').value = u.role;
        document.getElementById('u_company').value = u.company || ""; // Hämta företag
        
        editIndexInput.value = index; 
        document.getElementById('userFormTitle').innerText = `Redigera: ${u.name}`;
    };

    window.exportUsersToCode = () => {
        const jsonContent = JSON.stringify(userList, null, 4);
        const jsCode = `// Kopiera allt nedan och ersätt "DEFAULT_USERS" i din script.js:\n\nconst DEFAULT_USERS = ${jsonContent};`;
        navigator.clipboard.writeText(jsCode)
            .then(() => { showToast("Koden kopierad till urklipp!", "success"); })
            .catch(err => { showToast("Kunde inte kopiera", "error"); });
    };
    renderTable();
}