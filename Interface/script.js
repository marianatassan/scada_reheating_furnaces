// script.js — IHM Reheating Furnaces

// CONFIG
const API_BASE = "http://localhost:8000";
const FURNACE_ENDPOINT = "/furnace_data";
const HISTORY_ENDPOINT = "/history"
const SETPOINT_ENDPOINT = "/setpoint";
const MODE_ENDPOINT = "/mode";
const POLL_INTERVAL_MS = 2000;
const MAX_POINTS = 60;

// Limites
const TEMP_MIN = 500;   // °C
const TEMP_MAX = 1350;  // °C
const TEMP_MIN_Z1 = 840;
const VELOCIDADE_MIN = 180;
const VELOCIDADE_MAX = 1620;

// Helpers para DOM
const $ = id => document.getElementById(id);

// Som do alarme
const alarmAudio = $("somAlarme");

// ======================================================
//  NOVO SISTEMA DE ALARMES POP-UP
// ======================================================

// Garante que existe o container de pop-up no DOM
let popupContainer = document.getElementById("popup-alarm-container");
if (!popupContainer) {
    popupContainer = document.createElement("div");
    popupContainer.id = "popup-alarm-container";
    document.body.appendChild(popupContainer);
}

// Função GENÉRICA de pop-up (moderna)
function showAlarm(message, duration = 6000) {
    try {
        alarmAudio.currentTime = 0;
        alarmAudio.play();
    } catch (e) {}

    const alarm = document.createElement("div");
    alarm.className = "popup-alarm";

    alarm.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;

    popupContainer.appendChild(alarm);
}

// Mantém compatibilidade com sua função antiga
function showAlarmPopup(forno, message) {
    showAlarm(`⚠ Forno ${forno}: ${message}`);
}

// ======================================================
//  CHARTS (Chart.js)
// ======================================================
function createLineChart(canvasId, label = "°C", yMax = TEMP_MAX + 50) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    return new Chart(el, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: "red",
                tension: 0.25,
                pointRadius: 2,
                fill: false
            }]
        },
        options: {
            animation: false,
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 6  // tamanho da fonte dos valores do eixo X
                        }
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 6  // tamanho da fonte dos valores do eixo Y
                        }
                    }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function createHistoryChart(canvasId, label) {
    const el = document.getElementById(canvasId);
    return new Chart(el, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label,
                data: [],
                borderColor: "blue",
                tension: 0.2,
                pointRadius: 0
            }]
        },
        options: {
            animation: false,
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 6  // tamanho da fonte dos valores do eixo X
                        }
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 6  // tamanho da fonte dos valores do eixo Y
                        }
                    }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}


const charts = {
    f1: {
        z1: createLineChart("chart-f1-z1", "F1 Z1 (°C)"),
        z2: createLineChart("chart-f1-z2", "F1 Z2 (°C)"),
        v: createLineChart("chart-f1-v", "F1 Velocidade Motor (rpm)"),
        sp: createLineChart("chart-f1-sp", "F1 Setpoint (°C)")
    }
};

const chartsHistory = {
    z1: createHistoryChart("chart-hist-f1-z1", "Histórico Zona 1"),
    z2: createHistoryChart("chart-hist-f1-z2", "Histórico Zona 2"),
    vel: createHistoryChart("chart-hist-f1-v", "Histórico Velocidade Motor"),
    sp: createHistoryChart("chart-hist-f1-sp", "Histórico Setpoint")
};


function updateChart(chart, value) {
    if (!chart) return;
    const now = new Date().toLocaleTimeString();
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(value);
    if (chart.data.labels.length > MAX_POINTS) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update("none");
}

// ======================================================
//  ESTADO LOCAL
// ======================================================
const last = {
    f1: { z1: null, z2: null, v: null, setpoint: null, fuel: null, timestamp: null }
};

// ======================================================
//  API
// ======================================================
async function getLatest() {
    const resp = await fetch(API_BASE + FURNACE_ENDPOINT);
    if (!resp.ok) throw new Error("Erro GET /furnace_data: " + resp.status);
    return resp.json();
}

async function loadHistory() {
    const resp = await fetch(API_BASE + HISTORY_ENDPOINT);
    if (!resp.ok) throw new Error("Erro GET /history");
    return resp.json();
}

// ======================================================
//  ATUALIZAÇÃO PRINCIPAL + REGRAS
// ======================================================
async function updateDashboard() {
    try {
        const data = await getLatest();

        // populate last.* and UI for both furnaces (F1)
        if (data.f1_temp_zone1 != null) last.f1.z1 = Number(data.f1_temp_zone1);
        if (data.f1_temp_zone2 != null) last.f1.z2 = Number(data.f1_temp_zone2);
        if (data.f1_setpoint != null) last.f1.setpoint = Number(data.f1_setpoint);
        if (data.f1_fuel_state != null) last.f1.fuel = Number(data.f1_fuel_state);
        if (data.f1_vel_motor != null) last.f1.v = Number(data.f1_vel_motor);

        // Update UI
        if (last.f1.z1 != null) $("t_z1_f1").innerText = last.f1.z1.toFixed(1) + " °C";
        if (last.f1.z2 != null) $("t_z2_f1").innerText = last.f1.z2.toFixed(1) + " °C";
        if (last.f1.v != null) $("v_motor_f1").innerText = last.f1.v.toFixed(0) + " rpm";
        if (last.f1.setpoint != null) $("setpoint_f1").innerText = last.f1.setpoint.toFixed(1) + " °C";

        if (last.f1.fuel != null) {
            $("combustivel1").innerText = last.f1.fuel === 1 ? "Ligado" : "Desligado";
            $("icon_comb1").src = last.f1.fuel === 1 ? "./icons/combustivel_ligado.png" : "./icons/combustivel_desligado.png";
        }

        // -------------------- Regras de automação --------------------

        const f1z1Abnormal = (last.f1.z1 < 850 || last.f1.z1 > 1050);
        const f1z2Abnormal = (last.f1.z2 < 1050 || last.f1.z2 > 1260);

       // if (f1z1Abnormal) showAlarmPopup(1, `Temperatura da zona 1 fora do intervalo esperado (850 - 1050 °C). Verificar!`);
       // if (f1z2Abnormal) showAlarmPopup(1, `Temperatura da zona 2 fora do intervalo esperado (1050 - 1260 °C). Verificar!`);

        const f1Out = (last.f1.setpoint < TEMP_MIN) || (last.f1.setpoint > TEMP_MAX);
        //if (f1Out) showAlarmPopup(1, `EMERGÊNCIA: Setpoint fora dos limites de segurança (${TEMP_MIN}–${TEMP_MAX} °C). Verificar!`);

        const f1MotorLow = last.f1.v < VELOCIDADE_MIN;
        const f1MotorHigh = last.f1.v > VELOCIDADE_MAX;

       // if (f1MotorLow) showAlarmPopup(1, `Velocidade do motor muito baixa (< ${VELOCIDADE_MIN}%).`);
       // if (f1MotorHigh) showAlarmPopup(1, `Velocidade do motor muito alta (> ${VELOCIDADE_MAX}%).`);

        const f1FuelOnAndCold = (last.f1.fuel === 1) && (last.f1.z1 < TEMP_MIN_Z1);
        //if (f1FuelOnAndCold) showAlarmPopup(1, `Combustível ligado e temperatura baixa (< ${TEMP_MIN_Z1} °C). RISCO!`);

        // Charts
        if (last.f1.z1 != null) updateChart(charts.f1.z1, last.f1.z1);
        if (last.f1.z2 != null) updateChart(charts.f1.z2, last.f1.z2);
        if (last.f1.v != null) updateChart(charts.f1.v, last.f1.v);
        if (last.f1.setpoint != null) updateChart(charts.f1.sp, last.f1.setpoint);

    } catch (err) {
        console.error("Erro updateDashboard:", err);
    }
}

function populateHistoryCharts(history) {
    const labels = history.map(x => x.timestamp);

    chartsHistory.z1.data.labels = labels;
    chartsHistory.z1.data.datasets[0].data = history.map(x => x.f1_temp_zone1);

    chartsHistory.z2.data.labels = labels;
    chartsHistory.z2.data.datasets[0].data = history.map(x => x.f1_temp_zone2);

    chartsHistory.vel.data.labels = labels;
    chartsHistory.vel.data.datasets[0].data = history.map(x => x.f1_vel_motor);

    chartsHistory.sp.data.labels = labels;
    chartsHistory.sp.data.datasets[0].data = history.map(x => x.f1_setpoint);

    chartsHistory.z1.update();
    chartsHistory.z2.update();
    chartsHistory.vel.update();
    chartsHistory.sp.update();
}

loadHistory()
    .then(history => {
        populateHistoryCharts(history);
        console.log("Histórico carregado:", history.length, "registros");
    })
    .catch(err => console.error("Erro ao carregar histórico:", err));

// start polling
setInterval(updateDashboard, POLL_INTERVAL_MS);
updateDashboard();
