function login() {

    const user = document.getElementById("username").value; // Busca o valor digitado no campo de usuário.
    const pass = document.getElementById("password").value; // Busca o valor digitado no campo de senha.

    if (user === "Equipe" && pass === "3102") {

        document.getElementById("login-page").style.display = "none"; // Oculta a tela de login.
        document.getElementById("map-page").style.display = "block"; // Exibe a área principal do mapa.

    } else {

        alert("Usuário ou senha incorretos."); // Mostra uma mensagem quando o login falha.

    }
}

function openTab(tabId){

    const contents = document.querySelectorAll(".content"); // Seleciona todos os blocos de conteúdo das abas.
    contents.forEach(content => { // Remove a classe que deixa uma aba visível.
        content.classList.remove("active-content");
    });

    document
        .getElementById(tabId)
        .classList
        .add("active-content"); // Ativa apenas o conteúdo da aba escolhida.

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
    
    document
        .getElementById("report-modal")
        .style.display = "none";
}