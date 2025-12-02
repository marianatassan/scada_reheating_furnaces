// script.js — IHM Reheating Furnaces

// CONFIG
const API_BASE = "http://localhost:8000";
const FURNACE_ENDPOINT = "/furnace_data";
const SETPOINT_ENDPOINT = "/setpoint";
const MODE_ENDPOINT = "/mode";
const POLL_INTERVAL_MS = 2000;
const MAX_POINTS = 60;

// Limites
const TEMP_MIN = 500;   // °C
const TEMP_MAX = 1350;  // °C
const TEMP_MIN_Z1 = 840;
const VELOCIDADE_MIN = 20; // Em %
const VELOCIDADE_MAX = 90; // Em %

// Helpers para DOM
const $ = id => document.getElementById(id);

// Audio de alarme
const alarmAudio = $("somAlarme");

// ----------------------- Charts (Chart.js) -----------------------
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
            scales: { y: { min: 0, max: yMax } },
            plugins: { legend: { display: false } }
        }
    });
}

const charts = {
    f1: {
        z1: createLineChart("chart-hist-f1-z1", "F1 Z1 (°C)"),
        z2: createLineChart("chart-hist-f1-z2", "F1 Z2 (°C)"),
        v: createLineChart("chart-hist-f1-v", "F1 Velocidade Motor (rpm)"),
        sp: createLineChart("chart-hist-f1-sp", "F1 Setpoint (°C)")
    },
    f2: {
        z1: createLineChart("chart-hist-f2-z1", "F2 Z1 (°C)"),
        z2: createLineChart("chart-hist-f2-z2", "F2 Z2 (°C)"),
        v: createLineChart("chart-hist-f2-v", "F2 Velocidade Motor (rpm)"),
        sp: createLineChart("chart-hist-f2-sp", "F2 Setpoint (°C)")
    }
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

// ----------------------- Estado local e contadores -----------------------
const last = {
    f1: { z1: null, z2: null, v: null, setpoint: null, fuel: null, timestamp: null },
    f2: { z1: null, z2: null, v: null, setpoint: null, fuel: null, timestamp: null }
};

// Contadores para regras temporais
const counters = {
    f1: { deviation: 0, stable: 0 },
    f2: { deviation: 0, stable: 0 }
};

// ----------------------- Utilitários UI -----------------------
function showAlarmPopup(forno, message) {
    try { alarmAudio.currentTime = 0; alarmAudio.play(); } catch (e) {}
    alert(`⚠ Forno ${forno}: ${message}`);
}

// ----------------------- Requisições API -----------------------
async function getLatest() {
    const resp = await fetch(API_BASE + FURNACE_ENDPOINT);
    if (!resp.ok) throw new Error("Erro GET /furnace_data: " + resp.status);
    return resp.json();
}

// ----------------------- Atualização principal e regras -----------------------
async function updateDashboard() {
    try {
        const data = await getLatest();

        // populate last.* and UI for both furnaces (F1)
        if (data.f1_temp_zone1 != null) last.f1.z1 = Number(data.f1_temp_zone1);
        if (data.f1_temp_zone2 != null) last.f1.z2 = Number(data.f1_temp_zone2);
        if (data.f1_setpoint != null) last.f1.setpoint = Number(data.f1_setpoint);
        if (data.f1_fuel_state != null) last.f1.fuel = Number(data.f1_fuel_state);
        if (data.f1_vel_motor != null) last.f1.v = Number(data.f1_vel_motor);
        if (data.timestamp) last.f1.timestamp = data.timestamp;

        // F2
        if (data.f2_temp_zone1 != null) last.f2.z1 = Number(data.f2_temp_zone1);
        if (data.f2_temp_zone2 != null) last.f2.z2 = Number(data.f2_temp_zone2);
        if (data.f2_setpoint != null) last.f2.setpoint = Number(data.f2_setpoint);
        if (data.f2_fuel_state != null) last.f2.fuel = Number(data.f2_fuel_state);
        if (data.f2_vel_motor != null) last.f2.v = Number(data.f2_vel_motor);
        if (data.timestamp) last.f2.timestamp = data.timestamp;

        // Update UI numeric displays (HTML spans)
        if (last.f1.z1 != null) $("t_z1_f1").innerText = last.f1.z1.toFixed(1) + " °C";
        if (last.f1.z2 != null) $("t_z2_f1").innerText = last.f1.z2.toFixed(1) + " °C";
        if (last.f1.v != null) $("v_motor_f1").innerText = last.f1.v.toFixed(0) + " rpm";
        if (last.f1.setpoint != null) $("setpoint_f1").innerText = last.f1.setpoint.toFixed(1) + " °C";

        if (last.f2.z1 != null) $("t_z1_f2").innerText = last.f2.z1.toFixed(1) + " °C";
        if (last.f2.z2 != null) $("t_z2_f2").innerText = last.f2.z2.toFixed(1) + " °C";
        if (last.f2.v != null) $("v_motor_f2").innerText = last.f2.v.toFixed(0) + " rpm";
        if (last.f2.setpoint != null) $("setpoint_f2").innerText = last.f2.setpoint.toFixed(1) + " °C";

        // Update fuel text & icons
        if (last.f1.fuel != null) {
            $("combustivel1").innerText = last.f1.fuel === 1 ? "Ligado" : "Desligado";
            $("icon_comb1").src = last.f1.fuel === 1 ? "./icons/combustivel_ligado.png" : "./icons/combustivel_desligado.png";
        }
        if (last.f2.fuel != null) {
            $("combustivel2").innerText = last.f2.fuel === 1 ? "Ligado" : "Desligado";
            $("icon_comb2").src = last.f2.fuel === 1 ? "./icons/combustivel_ligado.png" : "./icons/combustivel_desligado.png";
        }

        // Update charts
        if (last.f1.z1 != null) updateChart(charts.f1.z1, last.f1.z1);
        if (last.f1.z2 != null) updateChart(charts.f1.z2, last.f1.z2);
        if (last.f1.v != null) updateChart(charts.f1.v, last.f1.v);
        if (last.f1.setpoint != null) updateChart(charts.f1.sp, last.f1.setpoint);

        if (last.f2.z1 != null) updateChart(charts.f2.z1, last.f2.z1);
        if (last.f2.z2 != null) updateChart(charts.f2.z2, last.f2.z2);
        if (last.f2.v != null) updateChart(charts.f2.v, last.f2.v);
        if (last.f2.setpoint != null) updateChart(charts.f2.sp, last.f2.setpoint);

        // -------------------- Regras de automação --------------------

        // -------- Regra 1: Temperatura das zonas do forno 1 fora dos seus limites -----------
        const f1z1Abnormal = (last.f1.z1 < 850 || last.f1.z1 > 1050);

        const f1z2Abnormal = (last.f1.z2 < 1050 || last.f1.z2 > 1260);

        if (f1z1Abnormal) {
            showAlarmPopup(1, `Temperatura da zona 1 fora do intervalo esperado (850 - 1050 °C). Verificar!`);
        }

        if (f1z2Abnormal) {
            showAlarmPopup(1, `Temperatura da zona 2 fora dos intervalo esperado (1050 - 1260 °C). Verificar!`);
        }

        // -------- Regra 2: Temperatura das zonas do forno 2 fora dos seus limites -----------
        const f2z1Abnormal = (last.f2.z1 < 850 || last.f2.z1 > 1050);

        const f2z2Abnormal = (last.f2.z2 < 1050 || last.f2.z2 > 1260);

        if (f2z1Abnormal) {
            showAlarmPopup(2, `Temperatura da zona 1 fora do intervalo esperado (850 - 1050 °C). Verificar!`);
        }

        if (f2z2Abnormal) {
            showAlarmPopup(2, `Temperatura da zona 2 fora dos intervalo esperado (1050 - 1260 °C). Verificar!`);
        }

        // -------- Regra 3: Setpoint fora dos limites -> Emergência -----------
        const f1Out = (last.f1.setpoint < TEMP_MIN) || (last.f1.setpoint > TEMP_MAX);
        if (f1Out) {
            showAlarmPopup(1, `EMERGÊNCIA: Setpoint fora dos limites de segurança (${TEMP_MIN}–${TEMP_MAX} °C). Verificar!`);
        }

        const f2Out = (last.f2.setpoint < TEMP_MIN) || (last.f2.setpoint > TEMP_MAX);
        if (f2Out) {
            showAlarmPopup(1, `EMERGÊNCIA: Setpoint fora dos limites de segurança (${TEMP_MIN}–${TEMP_MAX} °C). Verificar!`);
        }

        // -------- Regra 4: Velocidade do Motor do Combustível fora do ideal -----------
        // Forno 1
        const f1MotorLow = (last.f1.fuelMotorSpeed < VELOCIDADE_MIN);
        const f1MotorHigh = (last.f1.fuelMotorSpeed > VELOCIDADE_MAX);

        if (f1MotorLow) {
            showAlarmPopup(1, `Atenção: Velocidade do motor do combustível muito baixa (< ${VELOCIDADE_MIN}%). Verificar se há problemas de ignição/fluxo.`);
        }

        if (f1MotorHigh) {
            showAlarmPopup(1, `Atenção: Velocidade do motor do combustível muito alta (> ${VELOCIDADE_MAX}%). Verificar a eficiência e o setpoint.`);
        }

        // Forno 2
        const f2MotorLow = (last.f2.fuelMotorSpeed < VELOCIDADE_MIN);
        const f2MotorHigh = (last.f2.fuelMotorSpeed > VELOCIDADE_MAX);

        if (f2MotorLow) {
            showAlarmPopup(2, `Atenção: Velocidade do motor do combustível muito baixa (< ${VELOCIDADE_MIN}%). Verificar se há problemas de ignição/fluxo.`);
        }

        if (f2MotorHigh) {
            showAlarmPopup(2, `Atenção: Velocidade do motor do combustível muito alta (> ${VELOCIDADE_MAX}%). Verificar a eficiência e o setpoint.`);
        }

        // -------- Regra 5: Combustível Ligado, mas Zona 1 Crítica Baixa (Risco de Segurança) -----------
        // Forno 1
        const f1FuelOnAndCold = (last.f1.isFuelOn === true) && (last.f1.z1 < TEMP_MIN_Z1);

        if (f1FuelOnAndCold) {
            showAlarmPopup(1, `Atenção: Combustível ligado, mas a Temperatura da Zona 1 está abaixo do limite de segurança (${TEMP_MIN_SEGURANCA} °C). RISCO! Desligar imediatamente o combustível e verificar a ignição.`);
        }

        // Forno 2
        const f2FuelOnAndCold = (last.f2.isFuelOn === true) && (last.f2.z1 < TEMP_MIN_Z1);

        if (f2FuelOnAndCold) {
            showAlarmPopup(2, `Atenção: Combustível ligado, mas a Temperatura da Zona 1 está abaixo do limite de segurança (${TEMP_MIN_SEGURANCA} °C). RISCO! Desligar imediatamente o combustível e verificar a ignição.`);
        }

    } catch (err) {
        console.error("Erro updateDashboard:", err);
    }
}

// start polling
setInterval(updateDashboard, POLL_INTERVAL_MS);
updateDashboard();