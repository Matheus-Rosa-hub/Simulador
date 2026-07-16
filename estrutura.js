// ===== AUTENTICAÇÃO =====
const USUARIO_VALIDO = "Equipe";
const HASH_SENHA     = "9ec5adcb162fea7bdcefce818598776ef77423ee0f29bcbe8d5f564b7bd47703";
 
async function hashTexto(texto) {
    const data       = new TextEncoder().encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
 
async function login() {
    const user        = document.getElementById("username").value;
    const pass        = document.getElementById("password").value;
    const hashDigitado = await hashTexto(pass);
 
    if (user === USUARIO_VALIDO && hashDigitado === HASH_SENHA) {
        document.getElementById("login-page").style.display = "none";
        document.getElementById("map-page").style.display   = "flex";
        iniciarMapa();
        iniciarSimulacaoHistorico(); // ⚠️ SUBSTITUIR: trocar pela conexão MQTT real
        setTimeout(() => { mapa.invalidateSize(); }, 100);
    } else {
        alert("Usuário ou senha incorretos.");
    }
}
 
 
// ===== NAVEGAÇÃO =====
 
function openTab(tabId, event) {
    document.querySelectorAll(".content").forEach(c => c.classList.remove("active-content"));
    document.getElementById(tabId).classList.add("active-content");
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    event.target.classList.add("active");
 
    if (tabId === 'alertas') {
        contadorAlertas = 0;
        const badge = document.getElementById("badge-alertas");
        if (badge) badge.style.display = "none";
    }
 
    if (tabId === 'diagnostico') requestAnimationFrame(iniciarDiagnostico);
}
 
 
// ===== RELATÓRIOS =====
 
function abrirRelatorio() {
    document.getElementById("report-modal").style.display = "flex";
}
 
function fecharRelatorio() {
    document.getElementById("report-modal").style.display = "none";
}
 
function limparFormulario() {
    ["nome", "instituicao", "situacao", "documentacao"]
        .forEach(id => { document.getElementById(id).value = ""; });
}
 
function salvarRelatorio() {
    const nome         = document.getElementById("nome").value;
    const instituicao  = document.getElementById("instituicao").value;
    const situacao     = document.getElementById("situacao").value;
    const documentacao = document.getElementById("documentacao").value;
 
    const lista    = document.getElementById("lista-relatorios");
    const card     = document.createElement("div");
    card.className = "report-card";
    const n        = document.querySelectorAll(".report-card").length + 1;
 
    card.innerHTML = `
        <div class="report-title">Relatório ${n}</div>
        <div class="report-subtitle">${situacao}</div>
        <div class="report-date">${new Date().toLocaleDateString('pt-BR')}</div>
        <div class="report-details">
            <p><strong>Nome:</strong> ${nome}</p>
            <p><strong>Instituição:</strong> ${instituicao}</p>
            <p><strong>Documentação:</strong></p>
            <p class="doc-texto">${documentacao}</p>
        </div>
    `;
 
    const detalhes = card.querySelector(".report-details");
    detalhes.style.display = "none";
    card.onclick = () => {
        detalhes.style.display = detalhes.style.display === "none" ? "block" : "none";
    };
 
    lista.appendChild(card);
    limparFormulario();
    fecharRelatorio();
}
 
 
// ===== MAPA =====
 
let mapa;
 
function iniciarMapa() {
    if (mapa) return;
    mapa = L.map('mapa-regiao').setView([-22.3, -45.9], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapa);
    L.marker([-22.2473, -45.731]).addTo(mapa).bindPopup("Estação ARGOS-001"); // ⚠️ SUBSTITUIR: marcadores virão do MQTT
}
 
 
// ===== SIMULAÇÃO DE ALERTAS =====
/*
 * ⚠️ SUBSTITUIR ESTE BLOCO INTEIRO PELA CONEXÃO MQTT:
 *
 *   function iniciarSimulacaoAlertas() {
 *       const cliente = mqtt.connect('ws://SEU_BROKER_IP:9001');
 *       cliente.subscribe('argos/alertas/#');
 *       cliente.on('message', (topico, payload) => {
 *           registrarAlerta(JSON.parse(payload.toString()));
 *       });
 *   }
 *
 * A função registrarAlerta() não precisa ser alterada.
 */
 
let contadorAlertas = 0;
 
const LIMIAR_UMIDADE = 85;
const LIMIAR_VENTO   = 50;
const LIMIAR_CHUVA   = 25;
 
function registrarAlerta(dados) {
    const idColuna = "col-" + dados.estacao.replace(/\s+/g, '-').toLowerCase();
    let coluna = document.getElementById(idColuna);
 
    if (!coluna) {
        coluna = document.createElement("div");
        coluna.className = "coluna-estacao";
        coluna.id = idColuna;
 
        const titulo = document.createElement("div");
        titulo.className = "coluna-titulo";
        titulo.textContent = dados.estacao;
        coluna.appendChild(titulo);
 
        document.getElementById("lista-alertas").appendChild(coluna);
    }
 
    const card = document.createElement("div");
    card.className = "alerta-card";
 
    const agora     = new Date();
    const timestamp = agora.toLocaleDateString('pt-BR') + " — " + agora.toLocaleTimeString('pt-BR');
 
    card.innerHTML = `
        <div class="alerta-mensagem">Sensor ${dados.sensor}: ${dados.mensagem}</div>
        <div class="alerta-timestamp">${timestamp}</div>
    `;
 
    const primeiroCard = coluna.querySelector(".alerta-card");
    if (primeiroCard) {
        coluna.insertBefore(card, primeiroCard);
    } else {
        coluna.appendChild(card);
    }
 
    contadorAlertas++;
    const badge = document.getElementById("badge-alertas");
    if (badge) {
        badge.textContent   = contadorAlertas;
        badge.style.display = "flex";
    }
}
 
function iniciarSimulacaoAlertas() {
    if (simulacaoIniciada) return;
    simulacaoIniciada = true;
    setInterval(() => registrarAlerta(gerarAlertaSimulado()), 5000);
}
 
 
// ===== DIAGNÓSTICO DE REDE =====
/*
 * ⚠️ SUBSTITUIR: REDE_ESTACOES e REDE_CONEXOES virão do MQTT.
 * As funções renderizarDiagnostico() e desenharEstacaoSVG() não precisam ser alteradas.
 *
 * Exemplo de integração MQTT:
 *   cliente.on('message', (topico, payload) => {
 *       const { de, para, qualidade } = JSON.parse(payload.toString());
 *       const con = REDE_CONEXOES.find(c => c.de === de && c.para === para);
 *       if (con) con.qualidade = qualidade; else REDE_CONEXOES.push({ de, para, qualidade });
 *       renderizarDiagnostico();
 *   });
 */
 
let REDE_ESTACOES = [
    { id: 'Estação 001' },
    { id: 'Estação 002' },
    { id: 'Estação 003' },
    { id: 'Estação 004' },
];
 
let REDE_CONEXOES = [
    { de: 'Estação 001', para: 'Estação 002', qualidade: 'estavel'     },
    { de: 'Estação 001', para: 'Estação 003', qualidade: 'estavel'     },
    { de: 'Estação 002', para: 'Estação 003', qualidade: 'estavel'     },
    { de: 'Estação 001', para: 'Estação 004', qualidade: 'instavel'    },
    { de: 'Estação 002', para: 'Estação 004', qualidade: 'sem_conexao' },
    { de: 'Estação 003', para: 'Estação 004', qualidade: 'sem_conexao' },
];
 
const CORES_REDE = {
    estavel:     '#22c55e',
    instavel:    '#f59e0b',
    sem_conexao: '#ef4444'
};
 
function svgEl(tag, attrs) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
}
 
function qualidadeEstacao(id) {
    const cx = REDE_CONEXOES.filter(c => c.de === id || c.para === id);
    if (cx.some(c => c.qualidade === 'estavel'))  return 'estavel';
    if (cx.some(c => c.qualidade === 'instavel')) return 'instavel';
    return 'sem_conexao';
}
 
function calcularPosicoes(W, H) {
    const cx = W / 2, cy = H / 2;
    const rx = Math.min(W * 0.35, 220);
    const ry = Math.min(H * 0.38, 170);
    const n  = REDE_ESTACOES.length;
 
    return REDE_ESTACOES.map((est, i) => ({
        ...est,
        x: cx + rx * Math.cos((2 * Math.PI * i / n) - Math.PI / 2),
        y: cy + ry * Math.sin((2 * Math.PI * i / n) - Math.PI / 2)
    }));
}
 
function desenharEstacaoSVG(svg, x, y, id, qualidade) {
    const cor = CORES_REDE[qualidade] || '#9ca3af';
    const g   = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const ic  = '#374151';
 
    function lin(x1, y1, x2, y2) {
        g.appendChild(svgEl('line', { x1, y1, x2, y2, stroke: ic, 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
    }
 
    // Caixa de fundo com borda colorida conforme qualidade da conexão
    g.appendChild(svgEl('rect', {
        x: x-28, y: y-28, width: 56, height: 50, rx: 6,
        fill: '#f9fafb', stroke: cor, 'stroke-width': 2.5
    }));
 
    // ── Espigão superior ──
    lin(x, y-26, x, y-21);
 
    // ── Barra horizontal do anemômetro ──
    lin(x-14, y-21, x+14, y-21);
 
    // ── Copos em L (esquerda e direita) ──
    lin(x-14, y-21, x-14, y-25);  lin(x-14, y-25, x-10, y-25);
    lin(x+14, y-21, x+14, y-25);  lin(x+10, y-25, x+14, y-25);
 
    // ── Mastro principal ──
    lin(x, y-21, x, y+2);
 
    // ── Caixa do sensor no mastro ──
    g.appendChild(svgEl('rect', {
        x: x-6, y: y-11, width: 12, height: 10, rx: 1,
        stroke: ic, 'stroke-width': 1.8, fill: '#e5e7eb'
    }));
 
    // ── Indicadores laterais esquerdo (3 sinais de +) ──
    [-18, -11, -4].forEach(dy => {
        lin(x-22, y+dy,   x-14, y+dy);
        lin(x-18, y+dy-3, x-18, y+dy+3);
    });
 
    // ── Sensor adicional à direita ──
    g.appendChild(svgEl('rect', {
        x: x+11, y: y-17, width: 9, height: 8, rx: 1,
        stroke: ic, 'stroke-width': 1.8, fill: 'none'
    }));
 
    // ── Pernas do tripé ──
    lin(x, y+2, x-14, y+19);
    lin(x, y+2, x+14, y+19);
    lin(x, y+2, x,    y+19);
 
    // ── Label abaixo da caixa ──
    const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lbl.setAttribute('x',           x);
    lbl.setAttribute('y',           y + 34);
    lbl.setAttribute('text-anchor', 'middle');
    lbl.setAttribute('font-size',   '11');
    lbl.setAttribute('font-weight', 'bold');
    lbl.setAttribute('fill',        'white');
    lbl.textContent = id;
    g.appendChild(lbl);
 
    svg.appendChild(g);
}
 
function renderizarDiagnostico() {
    const svg = document.getElementById("rede-svg");
    if (!svg || !svg.parentElement) return;
 
    const W = svg.parentElement.clientWidth  || 800;
    const H = svg.parentElement.clientHeight || 500;
 
    svg.setAttribute('width',   W);
    svg.setAttribute('height',  H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
 
    const pos = calcularPosicoes(W, H);
    const map = Object.fromEntries(pos.map(p => [p.id, p]));
 
    // Desenha 7 dots ao longo de cada caminho de conexão
    REDE_CONEXOES.forEach(({ de, para, qualidade }) => {
        const A = map[de], B = map[para];
        if (!A || !B) return;
        const cor = CORES_REDE[qualidade] || CORES_REDE.sem_conexao;
 
        for (let i = 1; i <= 7; i++) {
            const t = i / 8;
            svg.appendChild(svgEl('circle', {
                cx:   A.x + (B.x - A.x) * t,
                cy:   A.y + (B.y - A.y) * t,
                r:    6,
                fill: cor
            }));
        }
    });
 
    // Estações renderizadas por cima dos dots; borda reflete melhor conexão ativa
    pos.forEach(({ id, x, y }) => desenharEstacaoSVG(svg, x, y, id, qualidadeEstacao(id)));
}
 
function simularVariacaoRede(qualidade) {
    const tabela = {
        estavel:     ['estavel', 'estavel', 'estavel', 'instavel'],
        instavel:    ['instavel', 'instavel', 'estavel', 'sem_conexao'],
        sem_conexao: ['sem_conexao', 'sem_conexao', 'instavel'],
    };
    const opcoes = tabela[qualidade] || tabela.sem_conexao;
    return opcoes[Math.floor(Math.random() * opcoes.length)];
}
 
let diagnosticoIniciado = false;
 
function iniciarDiagnostico() {
    if (diagnosticoIniciado) return;
    diagnosticoIniciado = true;
 
    renderizarDiagnostico();
    window.addEventListener('resize', renderizarDiagnostico);
 
    let ciclo = 0;
 
    // ⚠️ SUBSTITUIR: intervalo e dados simulados serão removidos quando MQTT fornecer conectividade real
    setInterval(() => {
        ciclo++;
 
        // ⚠️ SUBSTITUIR: bloco abaixo simula adição dinâmica de estação — virá do MQTT
        // if (ciclo === 3) {
        //     REDE_ESTACOES.push({ id: 'Estação 005' });
        //     REDE_CONEXOES.push(
        //         { de: 'Estação 001', para: 'Estação 005', qualidade: 'instavel'    },
        //         { de: 'Estação 002', para: 'Estação 005', qualidade: 'sem_conexao' },
        //     );
        // }
 
        REDE_CONEXOES.forEach(con => {
            if (Math.random() < 0.25) con.qualidade = simularVariacaoRede(con.qualidade);
        });
 
        renderizarDiagnostico();
    }, 4000);
}
 
