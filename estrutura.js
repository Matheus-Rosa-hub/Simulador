function login() {

    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if (user === "AAAA" && pass === "aaaa") {

        document.body.innerHTML = `
            <h1>Map</h1>
        `;

    } else {

        alert("Usuário ou senha incorretos.");

    }
}

function openTab(tabId){

    const contents =
        document.querySelectorAll(".content");

    contents.forEach(content => {
        content.classList.remove("active-content");
    });

    document
        .getElementById(tabId)
        .classList
        .add("active-content");

    const tabs =
        document.querySelectorAll(".tab");

    tabs.forEach(tab => {
        tab.classList.remove("active");
    });

    event.target.classList.add("active");
}