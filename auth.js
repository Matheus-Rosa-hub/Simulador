// ===== AUTENTICAÇÃO COMPARTILHADA =====
// Este arquivo é carregado por TODAS as páginas.
 
const USUARIO_VALIDO = "Equipe";
const HASH_SENHA     = "559aead08264d5795d3909718cdd05abd49572e84fe55590eef31a88a08fdffd";
 
// Para gerar hash de nova senha (F12 → Console):
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('SUA_SENHA'))
//     .then(h => console.log(Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('')));
 
async function hashTexto(texto) {
    const data       = new TextEncoder().encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
 
// Chamado por login.html ao clicar em "Entrar"
async function login() {
    const user         = document.getElementById("username").value;
    const pass         = document.getElementById("password").value;
    const hashDigitado = await hashTexto(pass);
 
    if (user === USUARIO_VALIDO && hashDigitado === HASH_SENHA) {
        sessionStorage.setItem('argos_auth', '1'); // Persiste a sessão entre páginas
        window.location.href = 'mapa.html';
    } else {
        alert("Usuário ou senha incorretos.");
    }
}
 
// ✅ MANTER: chamado no topo de cada página protegida
// Se o usuário não estiver autenticado, redireciona para o login
function checkAuth() {
    if (!sessionStorage.getItem('argos_auth')) {
        window.location.href = 'login.html';
    }
}
 