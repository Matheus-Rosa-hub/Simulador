function login() {

    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if (user !== "A" && pass !== "B") {

        document.getElementById("login-page").style.display = "none";

        document.getElementById("map-page").style.display = "flex";

    } else {

        alert("Preencha usuário e senha.");

    }
}