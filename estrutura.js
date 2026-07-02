const USUARIO_VALIDO = "Equipe";

// Para uma nova senha (F12):
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('SUA_SENHA'))
//     .then(h => console.log(
//       Array.from(new Uint8Array(h))
//         .map(b => b.toString(16).padStart(2, '0'))
//         .join('')
//     ));

const HASH_SENHA = "9ec5adcb162fea7bdcefce818598776ef77423ee0f29bcbe8d5f564b7bd47703"; // SHA-256 da senha "3102".

async function hashTexto(texto) {

    const encoder   = new TextEncoder();        // Converte string - bytes (Uint8Array).
    const data      = encoder.encode(texto);     // Bytes da senha digitada.
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function login() {

    const user = document.getElementById("username").value; 
    const pass = document.getElementById("password").value; 

    const hashDigitado = await hashTexto(pass); // Calcula o hash da senha digitada.

    if (user === USUARIO_VALIDO && hashDigitado === HASH_SENHA) {

        document.getElementById("login-page").style.display = "none";
        document.getElementById("map-page").style.display   = "flex"; 

        iniciarMapa();

        setTimeout(() => { mapa.invalidateSize(); }, 100);

    } else {
        alert("Usuário ou senha incorretos.");
    }
}

function openTab(tabId, event) {

    const contents = document.querySelectorAll(".content");
    contents.forEach(content => {content.classList.remove("active-content");});

    document.getElementById(tabId).classList.add("active-content");

    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => {tab.classList.remove("active");});

    event.target.classList.add("active");
}

function abrirRelatorio() {
    document.getElementById("report-modal").style.display = "flex";
}

function fecharRelatorio() {
    document.getElementById("report-modal").style.display = "none";
}

function limparFormulario() {
    document.getElementById("nome").value          = "";
    document.getElementById("instituicao").value   = "";
    document.getElementById("situacao").value      = "";
    document.getElementById("documentacao").value  = "";
}

function salvarRelatorio() {

    const nome          = document.getElementById("nome").value;
    const instituicao   = document.getElementById("instituicao").value;
    const situacao      = document.getElementById("situacao").value;
    const documentacao  = document.getElementById("documentacao").value;

    const lista = document.getElementById("lista-relatorios");

    const card = document.createElement("div");
    card.className = "report-card";

    const quantidade = document.querySelectorAll(".report-card").length + 1;

    card.innerHTML = `
        <div class="report-title">
            Relatório ${quantidade}
        </div>

        <div class="report-subtitle">
            ${situacao}
        </div>

        <div class="report-date">
            ${new Date().toLocaleDateString('pt-BR')}
        </div>

        <div class="report-details">
            <p><strong>Nome:</strong> ${nome}</p>
            <p><strong>Instituição:</strong> ${instituicao}</p>
            <p><strong>Documentação:</strong></p>
            <p class="doc-texto">${documentacao}</p>
        </div>
    `;

    const detalhes = card.querySelector(".report-details");

    detalhes.style.display = "none";

    card.onclick = function () {
        detalhes.style.display =
            detalhes.style.display === "none" ? "block" : "none";
    };

    lista.appendChild(card);

    limparFormulario();
    fecharRelatorio();
}


let mapa;

function iniciarMapa() {

    if (mapa) return;
    mapa = L.map('mapa-regiao').setView([-22.3, -45.9], 8);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19}).addTo(mapa);

    // Marcador de exemplo da primeira estação ARGOS.
    // Futuramente, este marcador virá dos dados do broker MQTT.
    L.marker([-22.2473, -45.731]).addTo(mapa).bindPopup("Estação ARGOS-001");
}
