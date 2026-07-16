// ===== MAPA =====
checkAuth(); // Redireciona para login.html se não autenticado
 
let mapa;
 
function iniciarMapa() {
    if (mapa) return;
 
    mapa = L.map('mapa-regiao').setView([-22.3, -45.9], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapa);
 
    // ⚠️ SUBSTITUIR: marcadores virão dos dados do broker MQTT
    L.marker([-22.2473, -45.731]).addTo(mapa).bindPopup("Estação ARGOS-001");
    L.marker([-22.3961, -45.737]).addTo(mapa).bindPopup("Estação ARGOS-002");
    L.marker([-22.2500, -45.619]).addTo(mapa).bindPopup("Estação ARGOS-003");
    L.marker([-22.2627, -45.805]).addTo(mapa).bindPopup("Estação ARGOS-004");
}
 
iniciarMapa();
