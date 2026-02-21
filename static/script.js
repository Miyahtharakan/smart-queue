console.log("TEST SCRIPT LOADED");
// ------------------------------------------------------------
// DATA
// ------------------------------------------------------------
const USERS = {
    user:  { pass: 'user123', role: 'user',  name: 'John Doe' },
    admin: { pass: 'admin123', role: 'admin', name: 'Admin' },
};


let gTok = 100;             // next token id
let session = null;         // { username, role, name }
let myTokens = [];          // tokens owned by current user (user role only)

// seed initial queue states


// ------------------------------------------------------------
// HELPER FUNCTIONS (queue metrics)
// ------------------------------------------------------------
const wc = c => c.tokens.filter(t => t.status === 'waiting').length;
const avs = c => c.totalServed === 0 ? c.avgSvc : Math.round((c.totalSvcTime / c.totalServed) * 10) / 10;
const ew = c => Math.max(1, Math.round(wc(c) * avs(c)));
const sc = w => w <= 8 ? 'g' : w <= 18 ? 'a' : 'r';
const sl = s => s === 'g' ? 'FAST' : s === 'a' ? 'MODERATE' : 'BUSY';
async function getRecommendation() {

    const response = await fetch(
        "http://127.0.0.1:8000/recommend/1"
    );

    return await response.json();
}

// ------------------------------------------------------------
// AUTH & LOGIN
// ------------------------------------------------------------
function switchTab(t) {
    document.getElementById('lt-user').classList.toggle('on', t === 'user');
    document.getElementById('lt-admin').classList.toggle('on', t === 'admin');
    document.getElementById('lp-user').style.display = t === 'user' ? '' : 'none';
    document.getElementById('lp-admin').style.display = t === 'admin' ? '' : 'none';
    document.getElementById('lerr').style.display = 'none';
}

function quick(t, u, p) {
    switchTab(t);
    if (t === 'user') {
        document.getElementById('uu').value = u;
        document.getElementById('up').value = p;
    } else {
        document.getElementById('au').value = u;
        document.getElementById('ap').value = p;
    }
    doLogin(t);
}

function doLogin(t) {
    const u = t === 'user' ? document.getElementById('uu').value : document.getElementById('au').value;
    const p = t === 'user' ? document.getElementById('up').value : document.getElementById('ap').value;
    const rec = USERS[u];
    const err = document.getElementById('lerr');
   
    if (!rec || rec.pass !== p || rec.role !== t) {
        err.style.display = 'block';
        return;
    }
   
    err.style.display = 'none';
    session = { username: u, role: t, name: rec.name };
   
    // clear any previous myTokens for a fresh user session
    if (t === 'user') myTokens = [];
   
    document.getElementById('s-login').classList.remove('on');
    document.getElementById('s-app').classList.add('on');
    setupNav();
    goPage('dashboard');
    startClock();
}

function logout() {
    session = null;
    myTokens = [];
    if (window._sim) clearInterval(window._sim);
    if (window._clk) clearInterval(window._clk);
    document.getElementById('s-app').classList.remove('on');
    document.getElementById('s-login').classList.add('on');
}

// ------------------------------------------------------------
// NAVIGATION SETUP
// ------------------------------------------------------------
function setupNav() {
    const av = document.getElementById('uav');
    document.getElementById('uname').textContent = session.name;
    document.getElementById('urole').textContent = session.role.toUpperCase();
    av.textContent = session.name[0].toUpperCase();

    const links = session.role === 'admin'
        ? [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'admin', label: 'Admin Panel' },
            { id: 'mytokens', label: 'Tokens' }
        ]
        : [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'mytokens', label: 'My Tokens' }
        ];

    document.getElementById('navlinks').innerHTML = links.map(l =>
        `<button class="nlink" id="nl-${l.id}" onclick="goPage('${l.id}')">${l.label}</button>`
    ).join('');
}

function setActiveLink(p) {
    document.querySelectorAll('.nlink').forEach(n => n.classList.remove('on'));
    const el = document.getElementById('nl-' + p);
    if (el) el.classList.add('on');
}

// ------------------------------------------------------------
// PAGE RENDERING
// ------------------------------------------------------------
function goPage(p) {
    setActiveLink(p);
    if (p === 'dashboard') renderDashboard();
    else if (p === 'admin') renderAdmin();
    else if (p === 'mytokens') renderMyTokens();
}

async function renderDashboard() {

    const countersResponse = await fetch("http://127.0.0.1:8000/counters/1");
    const counters = await countersResponse.json();

    const recResponse = await fetch("http://127.0.0.1:8000/recommend/1");
    const rec = await recResponse.json();

    const cards = await Promise.all(
        counters.map(async (c, index) => {

            const tokensResponse = await fetch(
                `http://127.0.0.1:8000/tokens/${c.id}`
            );

            const tokens = await tokensResponse.json();

            const waitingCount = tokens.filter(
                t => t.status === "waiting"
            ).length;

            const estimatedWait = waitingCount * 5;

            const isBest = c.name === rec.recommended_counter;

            return `
            <div class="ccard ${isBest ? 'best' : ''}"
                 style="animation:fu .4s ${index * .08}s ease both"
                 onclick="joinQueue(${c.id})">

                ${isBest ? '<div class="ribbon">✦ BEST CHOICE</div>' : ''}

                <div class="ctop">
                    <div>
                        <div class="cid">${c.id}</div>
                        <div class="cname">${c.name}</div>
                    </div>
                </div>

                <div class="wlbl">ESTIMATED WAIT</div>
                <div class="wnum">${estimatedWait} <span class="wu">min</span></div>

                <div class="brow">
                    <span class="blbl">WAITING</span>
                    <span class="blbl">${waitingCount}</span>
                </div>

                <button class="cjoin">JOIN →</button>

            </div>
            `;
        })
    );

    document.getElementById('pcontent').innerHTML = `
        <div class="phead ani">
            <div class="pey">// Intelligent Queue System</div>
            <div class="ptitle">Smart<span>Queue</span> Dashboard</div>
            <div class="psub">
                Real-time AI queue optimization — join any counter,
                get directed to the fastest one
            </div>
        </div>

        <div class="sgrid ani d1">
            <div class="scard">
                <div class="slbl">Active Counters</div>
                <div class="sval g">${counters.length}</div>
            </div>
            <div class="scard">
                <div class="slbl">Best Counter</div>
                <div class="sval g">${rec.recommended_counter}</div>
            </div>
            <div class="scard">
                <div class="slbl">Estimated Wait</div>
                <div class="sval a">${rec.estimated_wait_minutes} min</div>
            </div>
        </div>

        <div class="cgrid ani d3">
            ${cards.join("")}
        </div>
    `;
}
async function renderAdmin() {

    const countersResponse = await fetch("http://127.0.0.1:8000/counters/1");
    const counters = await countersResponse.json();

    let totalTokens = 0;
    let totalServed = 0;
    let totalWaiting = 0;

    const cards = await Promise.all(
        counters.map(async (c) => {

            const tokensResponse = await fetch(
                `http://127.0.0.1:8000/tokens/${c.id}`
            );

            const tokens = await tokensResponse.json();

            const waiting = tokens.filter(t => t.status === "waiting");
            const serving = tokens.find(t => t.status === "serving");
            const completed = tokens.filter(t => t.status === "completed");

            totalTokens += tokens.length;
            totalServed += completed.length;
            totalWaiting += waiting.length;

            const rows = tokens.slice(-8).reverse().map(t => `
                <div class="tli ${t.status}">
                    <div class="tlil">
                        <div class="tlinum">#${t.id}</div>
                        <div class="badge">
                            ${t.status.toUpperCase()}
                        </div>
                    </div>
                </div>
            `).join('');

            return `
            <div class="acard">
                <div class="ahead">
                    <div>
                        <div class="aid">${c.id}</div>
                        <div class="aname">${c.name}</div>
                    </div>
                </div>

                <div class="astats">
                    <div class="astat">
                        <div class="asv">${waiting.length}</div>
                        <div class="asl">WAITING</div>
                    </div>
                    <div class="astat">
                        <div class="asv">${completed.length}</div>
                        <div class="asl">SERVED</div>
                    </div>
                </div>

                <div class="nowserv">
                    ${serving
                        ? `<div class="nslbl">NOW SERVING</div><div class="nstok">#${serving.id}</div>`
                        : `<div class="nsempty">No token currently serving</div>`
                    }
                </div>

                <div class="tscroll">
                    ${rows || '<div>No tokens yet</div>'}
                </div>

                <div class="aacts">
                    <button class="abtn next" onclick="nextTok(${c.id})">
                        ▶ NEXT TOKEN
                    </button>
                </div>
            </div>
            `;
        })
    );

    document.getElementById('pcontent').innerHTML = `
    <div class="phead ani">
        <div class="pey">// Admin Control Center</div>
        <div class="ptitle">Admin <span>Panel</span></div>
        <div class="psub">Manage counters, serve tokens, monitor queue performance</div>
    </div>

    <div class="sgrid ani d1">
        <div class="scard">
            <div class="slbl">Total Tokens</div>
            <div class="sval g">${totalTokens}</div>
        </div>
        <div class="scard">
            <div class="slbl">Served</div>
            <div class="sval g">${totalServed}</div>
        </div>
        <div class="scard">
            <div class="slbl">Waiting</div>
            <div class="sval a">${totalWaiting}</div>
        </div>
    </div>

    <div class="sechead ani d2">
        <div class="seclbl">// Counter Management</div>
    </div>

    <div class="agrid ani d3">
        ${cards.join("")}
    </div>`;
}
function renderMyTokens() {
    let html;
    if (!myTokens.length) {
        html = `<div class="empty ani">
            <div class="emico">🎟</div>
            <div class="emtit">No Tokens Yet</div>
            <div class="emsub">Go to Dashboard and join a queue to get your token</div>
        </div>`;
    } else {
        html = `<div class="mtlist">` + myTokens.map(t => {
            const c = counters.find(x => x.id === t.cid);
            if (!c) return '';
            const w = ew(c);
            const tokenObj = c.tokens.find(x => x.id === t.tid);
            const pos = c.tokens.filter(x => x.status === 'waiting').indexOf(tokenObj) + 1;
            const isLive = tokenObj && tokenObj.status === 'waiting';
            return `<div class="mtcard ${isLive ? 'live' : ''}">
                <div class="mtl">
                    <div class="mtn">#${t.tid}</div>
                    <div>
                        <div class="mtctr">${c.name}</div>
                        <div class="mttm">${t.time}</div>
                    </div>
                </div>
                <div class="mtr">
                    <div class="mtwv">${w} min</div>
                    <div class="mtwl">${isLive ? `POS #${pos || '—'} • WAITING` : 'SERVED / DONE'}</div>
                </div>
            </div>`;
        }).join('') + `</div>`;
    }
    document.getElementById('pcontent').innerHTML = `
    <div class="phead ani">
        <div class="pey">// Your Tokens</div>
        <div class="ptitle">My <span>Tokens</span></div>
        <div class="psub">Track all your queue assignments and live positions</div>
    </div>
    ${html}`;
}

// ------------------------------------------------------------
// JOIN QUEUE (user action)
// ------------------------------------------------------------
async function joinQueue(counterId) {

    const response = await fetch(
        `http://127.0.0.1:8000/tokens?counter_id=${counterId}`,
        { method: "POST" }
    );

    const data = await response.json();

    alert("Token Created: #" + data.id);

    renderDashboard();
}

   

function closeModal() {
    document.getElementById('tokmod').classList.remove('on');
    document.getElementById('mBar').style.width = '0%';
}

// ------------------------------------------------------------
// ADMIN ACTIONS
// ------------------------------------------------------------
function nextTok(cid) {
    const c = counters.find(x => x.id === cid);
    const waiting = c.tokens.filter(t => t.status === 'waiting');
   
    if (!waiting.length) {
        toast('NO TOKENS', c.name + ' queue is empty', 'a');
        return;
    }
   
    // mark previous serving as done (if any)
    c.tokens.filter(t => t.status === 'serving').forEach(t => {
        t.status = 'done';
        const dur = Math.round((Date.now() - t.arrivedAt) / 60000) || c.avgSvc;
        c.totalSvcTime += dur;
        c.totalServed++;
    });
   
    waiting[0].status = 'serving';
    toast('NEXT TOKEN', `Now serving #${waiting[0].id} at ${c.name}`, '');
   
    if (document.querySelector('.nlink.on')?.id === 'nl-admin') renderAdmin();
}

function markDone(cid) {
    const c = counters.find(x => x.id === cid);
    const s = c.tokens.find(t => t.status === 'serving');
   
    if (!s) {
        toast('NO ACTIVE TOKEN', 'Press Next Token first', 'a');
        return;
    }
   
    const dur = Math.round((Date.now() - s.arrivedAt) / 60000) || c.avgSvc;
    c.totalSvcTime += dur;
    c.totalServed++;
    s.status = 'done';
   
    toast('DONE', `#${s.id} served at ${c.name} in ~${dur} min`, '');
   
    if (document.querySelector('.nlink.on')?.id === 'nl-admin') renderAdmin();
}

// ------------------------------------------------------------
// TOAST NOTIFICATION
// ------------------------------------------------------------
function toast(title, msg, type) {
    const tw = document.getElementById('tw');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="tt">${title}</div><div class="tm">${msg}</div>`;
    tw.appendChild(el);
   
    requestAnimationFrame(() => el.classList.add('on'));
   
    setTimeout(() => {
        el.classList.remove('on');
        setTimeout(() => el.remove(), 450);
    }, 3500);
}

// ------------------------------------------------------------
// CLOCK & SIMULATION
// ------------------------------------------------------------
function startClock() {
    const upd = () => {
        document.getElementById('clk').textContent = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    upd();
    if (window._clk) clearInterval(window._clk);
    window._clk = setInterval(upd, 1000);
}

function startSim() {
    if (window._sim) clearInterval(window._sim);
   
    window._sim = setInterval(() => {
        // random new tokens or service completions
        counters.forEach(c => {
            if (Math.random() > 0.45) {
                const d = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
                if (d > 0) {
                    // add a waiting token
                    c.tokens.push({
                        id: ++gTok,
                        status: 'waiting',
                        arrivedAt: Date.now()
                    });
                } else if (d < 0 && wc(c) > 0) {
                    // complete one waiting token (mark done directly)
                    const f = c.tokens.find(t => t.status === 'waiting');
                    if (f) {
                        f.status = 'done';
                        c.totalServed++;
                        c.totalSvcTime += c.avgSvc;
                    }
                }
            }
        });

        // re-render current page if it's dashboard (live updates)
        const curActive = document.querySelector('.nlink.on');
        if (curActive && session) {
            const pg = curActive.id.replace('nl-', '');
            if (pg === 'dashboard') renderDashboard();
        }
    }, 5000);
}

// Make functions globally available
window.switchTab = switchTab;
window.quick = quick;
window.doLogin = doLogin;
window.logout = logout;
window.goPage = goPage;
window.joinQueue = joinQueue;
window.closeModal = closeModal;
window.nextTok = nextTok;
window.markDone = markDone;
setInterval(() => {
    if (document.querySelector('.nlink.on')?.id === 'nl-dashboard') {
        renderDashboard();
    }
}, 5000);