const $ = id => document.getElementById(id), $$ = q => document.querySelectorAll(q);

let locs = JSON.parse(localStorage.getItem('locs') || '[]');
let conns = JSON.parse(localStorage.getItem('conns') || '[]');
let st = { s: 1, x: 0, y: 0, drag: 0, sel: null, sLine: null };
const w = $('map-wrapper'), svg = $('route-svg'), mc = $('map-container');
const tr = { 'Kereta': [100, 2500], 'Bus': [60, 1000], 'Pesawat': [500, 10000] };

const save = () => {
    try {
        localStorage.setItem('locs', JSON.stringify(locs));
        localStorage.setItem('conns', JSON.stringify(conns));
        render();
    } catch (err) {
        console.error("Gagal menyimpan data:", err);
    }
};
const upMap = () =>  w.style.transform = `translate(${st.x}px, ${st.y}px) scale(${st.s})`;

mc.onwheel = e => {
    if (!e.ctrlKey) return; e.preventDefault();
    let ds = e.deltaY > 0 ? 0.9 : 1.1, r = w.getBoundingClientRect();
    st.x += (e.clientX - r.left) / st.s * st.s * (1 - ds);
    st.y += (e.clientY - r.top) / st.s * st.s * (1 - ds);
    st.s = Math.max(0.5, Math.min(st.s * ds, 5)); upMap();
};

mc.onmousedown = e => {
    e.preventDefault();
    st.drag = 1;
    st.sx = e.clientX - st.x;
    st.sy = e.clientY - st.y;
    mc.style.cursor = 'grabbing';
};

window.onmousemove = e => {
    if (st.drag) {
        st.x = e.clientX - st.sx;
        st.y = e.clientY - st.sy;
        upMap();
    }
};

window.onmouseup = () => {
    st.drag = 0;
    mc.style.cursor = 'default';
};

w.ondblclick = e => {
    let r = w.getBoundingClientRect();
    let n = prompt("Nama Perusahaan/Lokasi:");
    if (n) {
        // Menambahkan input tambahan untuk info spesifik
        let addr = prompt("Alamat Lengkap:");
        let jam = prompt("Jam Operasional (contoh: 08:00 - 16:00):");
        let telp = prompt("Nomor Telepon:");

        locs.push({
            id: Date.now(),
            n,
            addr: addr || "Alamat tidak tersedia",
            jam: jam || "08:00 - 17:00",
            telp: telp || "-",
            x: (e.clientX - r.left) / st.s,
            y: (e.clientY - r.top) / st.s
        });
        save();
    }
};

function render() {
    $$('.pin').forEach(e => e.remove()); svg.innerHTML = '';
    let pairs = {};

    conns.forEach(c => {
        let l1 = locs.find(x => x.id == c.a), l2 = locs.find(x => x.id == c.b);
        if (!l1 || !l2) return;

        let k = [c.a, c.b].sort().join('-'); pairs[k] = (pairs[k] || 0) + 1;
        let off = (pairs[k] - 1) * 40;
        let col = c.t == 'Kereta' ? '#33E339' : c.t == 'Bus' ? '#A83BE8' : '#000000';
        let mx = (l1.x + l2.x) / 2, my = (l1.y + l2.y) / 2;

        svg.innerHTML += `
        <path d="M${l1.x},${l1.y} Q${mx},${my + off * 2} ${l2.x},${l2.y}" fill="none" stroke="${st.sLine == c.id ? 'red' : col}" stroke-width="5" 
            onclick="st.sLine=${c.id}; render();" style="pointer-events:all; cursor:pointer" />
        <text x="${mx}" y="${my + off}" fill="${col}" font-weight="bold" font-size="14" text-anchor="middle">${c.d}km (${c.t[0]})</text>`;
    });

    locs.forEach(l => {
        w.insertAdjacentHTML('beforeend', `
        <div class="pin" style="left:${l.x}px; top:${l.y}px; position:absolute; width:15px; height:15px; background:red; border-radius:50%; z-index:10; transform:translate(-50%,-50%); cursor:pointer;" onclick="showInfo(${l.id})">
            <div style="position:absolute; top:-30px; left:-25px; background:#fff; border:1px solid #000; padding:4px; display:flex; gap:5px; white-space:nowrap;">
                <b>${l.n}</b> 
                <button onclick="conn(${l.id})" style="background:${st.sel == l.id ? 'yellow' : ''}">${st.sel == l.id ? 'Batal' : '🔗'}</button>
                <button onclick="delLoc(${l.id})">🗑️</button>
            </div>
        </div>`);
    });
}

window.conn = id => {
    if (!st.sel) return st.sel = id, render();
    if (st.sel == id) return st.sel = null, render();

    try {
        let d = prompt("Jarak (KM):"), t = prompt("Transport (Kereta/Bus/Pesawat):");

        if (!d || isNaN(d) || d <= 0) throw new Error("Input jarak tidak valid!");
        if (!tr[t]) throw new Error("Moda transportasi tidak tersedia!");

        conns.push({ id: Date.now(), a: st.sel, b: id, d: parseFloat(d), t });
        st.sel = null; save();
    } catch (err) {
        alert(err.message); 
        st.sel = null;
        render();
    }
};

window.delLoc = id => { locs = locs.filter(x => x.id != id); conns = conns.filter(x => x.a != id && x.b != id); save(); };

window.onkeydown = e => {
    if ((e.key == 'Delete' || e.key == 'Backspace') && st.sLine) conns = conns.filter(c => c.id != st.sLine), st.sLine = null, save();
    if (e.key == '+' || e.key == '-') st.s = Math.max(0.5, Math.min(st.s * (e.key == '+' ? 1.1 : 0.9), 5)), upMap();
};

window.findRoute = () => {
    if (!$('rt-ui')) document.body.insertAdjacentHTML('beforeend', `
        <div id="rt-ui" style="position:fixed; top:20px; left:20px; background:#fff; padding:15px; border:3px solid #000; border-radius:8px; z-index:999; box-shadow: 4px 4px 0 #000;">
            <h4>🔍 Cari Rute</h4><br>
            <input id="rF" placeholder="Dari Lokasi..." onkeyup="chk()"> <input id="rT" placeholder="Ke Lokasi..." onkeyup="chk()"><br><br>
            Sort: <select id="rS" onchange="if(!$('rB').disabled) calc()"><option value="time">Tercepat (Waktu)</option><option value="cost">Termurah (Biaya)</option></select><br><br>
            <button id="rB" disabled onclick="calc()">Cari</button> <button onclick="$('rt-ui').remove()">Tutup</button>
            <div id="rR" style="max-height:300px; overflow-y:auto; margin-top:15px;"></div>
        </div>`);
};

window.chk = () => {
    let f = locs.find(l => l.n.toLowerCase() == $('rF').value.toLowerCase());
    let t = locs.find(l => l.n.toLowerCase() == $('rT').value.toLowerCase());
    $('rB').disabled = !(f && t);
};

window.calc = () => {
    let f = locs.find(l => l.n.toLowerCase() == $('rF').value.toLowerCase());
    let t = locs.find(l => l.n.toLowerCase() == $('rT').value.toLowerCase());

    if (!f || !t) return;

    let paths = [], q = [[f.id, [], 0, 0]];
    let tc = { 'Kereta': [100, 2500], 'Bus': [60, 1000], 'Pesawat': [500, 10000] };

    while (q.length) {
        let [cur, pth, tm, cst] = q.pop();
        if (cur == t.id) { paths.push({ pth, tm, cst }); continue; }
        if (pth.length > 7) continue;

        conns.filter(c => c.a == cur || c.b == cur).forEach(c => {
            let nx = c.a == cur ? c.b : c.a;
            if (!pth.some(p => p.node == nx)) {
                let [s, p] = tc[c.t];
                q.push([nx, [...pth, { node: nx, t: c.t, nm: locs.find(l => l.id == nx).n }], tm + (c.d / s), cst + (c.d * p)]);
            }
        });
    }

    let sby = $('rS').value;
    paths.sort((a, b) => sby == 'time' ? a.tm - b.tm : a.cst - b.cst);

    $('rR').innerHTML = paths.length ? paths.slice(0, 10).map((p, i) =>
        `<div style="border-bottom:1px solid #ccc; padding:5px 0;">
            <b>Rute ${i + 1}</b>: ${f.n} -> ${p.pth.map(x => `${x.t} ke ${x.nm}`).join(' -> ')}<br>
            ⏱ ${p.tm.toFixed(1)} Jam | 💰 Rp${p.cst.toLocaleString()}
        </div>`
    ).join('') : '<b style="color:red">Tidak ada rute!</b>';
};

window.showInfo = id => {
    let l = locs.find(x => x.id == id);
    if (!l) return;
    
    if (!$('info-ui')) {
        document.body.insertAdjacentHTML('beforeend', `<div id="info-ui" style="position:fixed; bottom:20px; left:20px; background:#fff; padding:15px; border:3px solid #000; border-radius:8px; z-index:999; box-shadow: 4px 4px 0 #000; min-width: 280px;"></div>`);
    }

    $('info-ui').innerHTML = `
        <h4 style="margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 5px;">🏢 ${l.n}</h4>
        <p style="font-size: 13px; margin-bottom: 4px;"><b>Alamat:</b> ${l.addr}</p>
        <p style="font-size: 13px; margin-bottom: 4px;"><b>Operasional:</b> ${l.jam}</p>
        <p style="font-size: 13px; margin-bottom: 15px;"><b>Telepon:</b> ${l.telp}</p>
        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            <button onclick="daftarPKL('${l.n}')" style="padding: 5px; background: #33E339; border: 1px solid #000; cursor:pointer; font-weight:bold;">Daftar PKL</button>
            <button onclick="$('info-ui').remove()" style="padding: 5px; border: 2px solid #000; cursor:pointer;">Tutup</button>
        </div>
    `;
};

window.daftarPKL = (namaPerusahaan) => {
    let confirmDaftar = confirm(`Kirim profil pendaftaran PKL Anda ke ${namaPerusahaan}?`);
    if (confirmDaftar) {
        // Simulasi submit loading dan keputusan perusahaan (50% diterima / 50% ditolak)
        let isAccepted = Math.random() > 0.5; 
        
        setTimeout(() => {
            if (isAccepted) {
                alert(`SELAMAT! Pendaftaran PKL Anda di ${namaPerusahaan} DITERIMA.`);
            } else {
                alert(`Mohon maaf, pendaftaran PKL Anda di ${namaPerusahaan} DITOLAK.`);
            }
        }, 1000); // Jeda sejenak untuk simulasi proses input perusahaan
    }
};

upMap(); render();
