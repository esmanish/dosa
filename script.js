// Handle Subsystem Tabs (index.html)
document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab).classList.add('active');
            });
        });
    }

    // Populate Cobot Table (index.html)
    const cobotData = [
        { name: "UR5e (Universal Robots)", payload: 5, reach: 850, ros2: "Yes", ip: "IP54" },
        { name: "Franka Production 3", payload: 3, reach: 855, ros2: "Yes", ip: "IP30 (Requires Jacket)" },
        { name: "KUKA LBR iisy 3", payload: 3, reach: 600, ros2: "No (iiQKA)", ip: "IP54" },
        { name: "Doosan H2017", payload: 20, reach: 1700, ros2: "Yes", ip: "IP54" }
    ];

    const tbody = document.querySelector('#cobotTable tbody');
    if (tbody) {
        cobotData.forEach(robot => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${robot.name}</strong></td>
                <td>${robot.payload} kg</td>
                <td>${robot.reach} mm</td>
                <td>${robot.ros2}</td>
                <td>${robot.ip}</td>
            `;
            tbody.appendChild(tr);
        });
    }
});

// --- GAMIFIED SIMULATOR ENGINE (architecture.html) ---
const STATE = {
    OFFLINE: 'OFFLINE',
    BOOTING: 'BOOTING',
    IDLE: 'READY',
    DISPENSING: 'DISPENSING',
    COOKING: 'COOKING',
    FOLDING: 'FOLDING',
    DELIVERY: 'DELIVERING',
    CLEANING: 'CLEANING'
};

let currentState = STATE.OFFLINE;

// Elements
const sysStateText = document.getElementById('sys-state-text');
const sysStateDot = document.getElementById('sys-state-dot');
const logList = document.getElementById('log-list');
const btnPower = document.getElementById('btn-power');
const btnReset = document.getElementById('btn-reset');
const recipeBtns = document.querySelectorAll('.recipe-btn');

const tawa = document.getElementById('tawa');
const tawaTemp = document.getElementById('tawa-temp');
const robotArm = document.getElementById('robot-arm');
const armText = document.getElementById('arm-action-text');
const conveyor = document.getElementById('conveyor');
const finishedDosa = document.getElementById('finished-dosa');
const factoryStage = document.querySelector('.factory-stage');

// Recipes Data
const recipes = {
    plain: { name: 'Plain / Sada Dosa', fluids: ['batter', 'oil'] },
    ghee: { name: 'Ghee Roast', fluids: ['batter', 'ghee'] },
    podi: { name: 'Podi Dosa', fluids: ['batter', 'oil', 'podi'] }
};

document.addEventListener('DOMContentLoaded', () => {
    if (btnPower) {
        btnPower.addEventListener('click', bootSystem);
        btnReset.addEventListener('click', resetSystem);
        
        recipeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recipeType = e.target.dataset.recipe;
                processOrder(recipeType);
            });
        });
    }
});

function updateState(newState, color, logMessage) {
    currentState = newState;
    if(sysStateText) sysStateText.textContent = newState;
    if(sysStateDot) {
        sysStateDot.style.background = color;
        sysStateDot.style.boxShadow = `0 0 10px ${color}`;
    }
    if (logMessage) log(logMessage);
}

function log(msg) {
    if(!logList) return;
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
    li.innerHTML = `<span class="text-muted">[${time}]</span> ${msg}`;
    logList.appendChild(li);
    logList.scrollTop = logList.scrollHeight;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function bootSystem() {
    btnPower.disabled = true;
    updateState(STATE.BOOTING, '#ff9f0a', 'Initializing hardware systems...');
    
    log('Pressurizing fluid reservoirs...');
    const fluids = ['batter', 'oil', 'ghee', 'podi'];
    fluids.forEach(f => {
        document.getElementById(`fluid-fill-${f}`).style.height = '80%';
    });
    
    await sleep(1000);
    
    log('Heating induction griddle to 180°C...');
    tawa.classList.add('tawa-heating');
    
    for(let temp = 24; temp <= 180; temp += 12) {
        tawaTemp.textContent = `${temp}°C`;
        await sleep(100);
    }
    tawaTemp.textContent = `180°C`;
    tawa.classList.remove('tawa-heating');
    
    updateState(STATE.IDLE, '#34c759', 'System Ready. Awaiting orders.');
    btnReset.disabled = false;
    recipeBtns.forEach(b => b.disabled = false);
    armText.textContent = 'Ready';
}

async function processOrder(type) {
    recipeBtns.forEach(b => b.disabled = true);
    recipeBtns.forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-recipe="${type}"]`).classList.add('active');
    
    const recipe = recipes[type];
    updateState(STATE.DISPENSING, '#0066cc', `Order Received: ${recipe.name}`);
    
    factoryStage.classList.add('is-dispensing');
    armText.textContent = 'Dispensing';
    recipe.fluids.forEach(f => {
        document.getElementById(`pipe-${f}`).style.opacity = '1';
    });
    
    await sleep(2500); 
    
    factoryStage.classList.remove('is-dispensing');
    recipe.fluids.forEach(f => {
        document.getElementById(`pipe-${f}`).style.opacity = '0';
    });
    
    updateState(STATE.COOKING, '#ff3b30', 'Executing thermal profile...');
    tawa.classList.add('tawa-cooking');
    armText.textContent = 'Monitoring...';
    
    await sleep(3000); 
    tawa.classList.remove('tawa-cooking');
    
    updateState(STATE.FOLDING, '#0066cc', 'Lifting and folding dosa...');
    robotArm.style.left = '45%'; 
    armText.textContent = 'Folding';
    
    await sleep(1000);
    
    finishedDosa.style.opacity = '1';
    finishedDosa.style.transform = 'scale(1)';
    
    await sleep(1000);
    
    updateState(STATE.DELIVERY, '#34c759', 'Transferring to handoff conveyor...');
    robotArm.style.left = '60%'; 
    armText.textContent = 'Plating';
    
    await sleep(1000);
    finishedDosa.style.left = '70%'; 
    robotArm.style.left = '10%'; 
    armText.textContent = 'Returning';
    
    await sleep(500);
    conveyor.classList.add('is-moving');
    finishedDosa.style.transition = 'left 2s linear, opacity 0.5s ease 1.5s';
    finishedDosa.style.left = '120%'; 
    finishedDosa.style.opacity = '0';
    
    await sleep(2000);
    conveyor.classList.remove('is-moving');
    
    finishedDosa.style.transition = 'none';
    finishedDosa.style.left = '45%';
    
    updateState(STATE.CLEANING, '#0066cc', 'Performing micro-sanitation...');
    tawa.classList.add('tawa-cleaning');
    armText.textContent = 'Steam Clean';
    tawaTemp.textContent = `160°C`; 
    
    await sleep(2000);
    tawa.classList.remove('tawa-cleaning');
    
    for(let temp = 160; temp <= 180; temp += 5) {
        tawaTemp.textContent = `${temp}°C`;
        await sleep(100);
    }
    
    updateState(STATE.IDLE, '#34c759', 'Cycle complete. System Ready.');
    armText.textContent = 'Ready';
    recipeBtns.forEach(b => b.disabled = false);
    recipeBtns.forEach(b => b.classList.remove('active'));
}

function resetSystem() {
    updateState(STATE.OFFLINE, '#86868b', 'System Reset. Offline.');
    btnPower.disabled = false;
    btnReset.disabled = true;
    recipeBtns.forEach(b => b.disabled = true);
    recipeBtns.forEach(b => b.classList.remove('active'));
    
    const fluids = ['batter', 'oil', 'ghee', 'podi'];
    fluids.forEach(f => {
        document.getElementById(`fluid-fill-${f}`).style.height = '0%';
        document.getElementById(`pipe-${f}`).style.opacity = '0';
    });
    
    tawaTemp.textContent = '24°C';
    tawa.classList.remove('tawa-heating', 'tawa-cooking', 'tawa-cleaning');
    robotArm.style.left = '10%';
    armText.textContent = 'Idle';
    conveyor.classList.remove('is-moving');
    finishedDosa.style.opacity = '0';
}
