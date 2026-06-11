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