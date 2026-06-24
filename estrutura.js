function login() {

    const user = document.getElementById("username").value; // Busca o valor digitado no campo de usuário.
    const pass = document.getElementById("password").value; // Busca o valor digitado no campo de senha.

    if (user === "Equipe" && pass === "3102") {

        document.getElementById("login-page").style.display = "none"; // Oculta a tela de login.
        document.getElementById("map-page").style.display = "block"; // Exibe a área principal do mapa.

    } else {

        alert("Usuário ou senha incorretos."); // Mostra uma mensagem quando o login falha.

    }

    document.getElementById("map-page").style.display = "block";
    iniciarMapa();
    setTimeout(() => {mapa.invalidateSize();}, 100);
}

function openTab(tabId){

    const contents = document.querySelectorAll(".content"); // Seleciona todos os blocos de conteúdo das abas.
    contents.forEach(content => { // Remove a classe que deixa uma aba visível.
        content.classList.remove("active-content");
    });

    document.getElementById(tabId).classList.add("active-content"); // Ativa apenas o conteúdo da aba escolhida.

    const tabs = document.querySelectorAll(".tab"); // Seleciona todos os botões de aba.

    tabs.forEach(tab => { // Remove o estado visual de aba ativa de todos os botões.
        tab.classList.remove("active");
    });

    event.target.classList.add("active"); // Adiciona o estilo de ativo ao botão clicado.
}

function abrirRelatorio(){

    document.getElementById("report-modal").style.display = "flex";
}

function fecharRelatorio(){
    
    document.getElementById("report-modal").style.display = "none";
}

function limparFormulario(){

    document.getElementById("nome").value = "";
    document.getElementById("instituicao").value = "";
    document.getElementById("situacao").value = "";
    document.getElementById("documentacao").value = "";
}

function salvarRelatorio(){

    const nome =document.getElementById("nome").value;

    const instituicao = document.getElementById("instituicao").value;

    const situacao =document.getElementById("situacao").value;

    const documentacao = document.getElementById("documentacao").value;

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
            ${new Date().toLocaleDateString()}
        </div>
    `;

    card.onclick = function(){

        alert(
            "Nome: " + nome + "\n\n" +
            "Instituição: " + instituicao + "\n\n" +
            "Situação: " + situacao + "\n\n" +
            "Documentação:\n" + documentacao
        );
    };

    lista.appendChild(card);
    limparFormulario();
    fecharRelatorio();
}

let mapa;

function iniciarMapa(){

    if(mapa) return;

    mapa = L.map('mapa-regiao').setView([-22.3, -45.9], 8); // Inicializa o mapa com a posição central e o nível de zoom.

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(mapa);
    
    L.marker([-22.689, -45.731]).addTo(mapa).bindPopup("Estação ARGOS-001");
}