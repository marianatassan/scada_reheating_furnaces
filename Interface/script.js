// script.js — IHM Reheating Furnaces (integrado ao seu HTML)
// Requisitos cumpridos: polling -> GET /furnace_data, POST /setpoint, POST /mode
// Charts: 3 zonas + setpoint por forno (8 gráficos)
// Regras de automação implementadas (alarme sonoro + popup + mensagens)

// CONFIG
const API_BASE = "http://localhost:8000";
const FURNACE_ENDPOINT = "/furnace_data";
const SETPOINT_ENDPOINT = "/setpoint";
const MODE_ENDPOINT = "/mode";
const POLL_INTERVAL_MS = 2000;
const MAX_POINTS = 60;

// Limites realísticos (ajuste se necessário)
const TEMP_MIN = 500;   // °C
const TEMP_MAX = 1250;  // °C

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
        z3: createLineChart("chart-hist-f1-z3", "F1 Z3 (°C)"),
        sp: createLineChart("chart-hist-f1-sp", "F1 Setpoint (°C)")
    },
    f2: {
        z1: createLineChart("chart-hist-f2-z1", "F2 Z1 (°C)"),
        z2: createLineChart("chart-hist-f2-z2", "F2 Z2 (°C)"),
        z3: createLineChart("chart-hist-f2-z3", "F2 Z3 (°C)"),
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
    f1: { z1: null, z2: null, z3: null, setpoint: null, mode: null, fuel: null, timestamp: null },
    f2: { z1: null, z2: null, z3: null, setpoint: null, mode: null, fuel: null, timestamp: null }
};

// Contadores para regras temporais
const counters = {
    f1: { deviation: 0, stable: 0 },
    f2: { deviation: 0, stable: 0 }
};

// ----------------------- Utilitários UI -----------------------
function showAlarmDiv(forno, message) {
    const id = forno === 1 ? "alarme_f1" : "alarme_f2";
    const el = $(id);
    if (el) {
        el.style.display = "block";
        el.innerText = `⚠ ${message}`;
        try { alarmAudio.currentTime = 0; alarmAudio.play(); } catch (e) { /* autoplay bloqueado possivelmente */ }
    } else {
        // fallback popup
        try { alarmAudio.play(); } catch (e) {}
        alert(`Forno ${forno} — ${message}`);
    }
}

function hideAlarmDiv(forno) {
    const id = forno === 1 ? "alarme_f1" : "alarme_f2";
    const el = $(id);
    if (el) {
        el.style.display = "none";
        // não para o áudio aqui porque outro forno pode estar em alarme; controle externo poderia gerenciar isso
    }
}

function applyModeUI(forno, modeNum, setpointFromServer) {
    // modeNum: numeric from server (1 = auto, 2 = manual) — in your api we used 1=auto,2=manual
    const setElem = $(`setpoint_f${forno}`);
    const modoElem = $(`modo_f${forno}`);

    // set select value to strings 'auto'|'manual' for user's HTML
    if (modoElem) modoElem.value = (modeNum === 1) ? "auto" : "manual";

    if (setElem) {
        if (modeNum === 1) { // automatic
            setElem.disabled = true;
            // show server setpoint (readonly)
            if (setpointFromServer != null) setElem.value = setpointFromServer;
            setElem.classList.add("locked");
        } else {
            setElem.disabled = false;
            setElem.classList.remove("locked");
        }
    }
}

// ----------------------- Requisições API -----------------------
async function getLatest() {
    const resp = await fetch(API_BASE + FURNACE_ENDPOINT);
    if (!resp.ok) throw new Error("Erro GET /furnace_data: " + resp.status);
    return resp.json();
}

async function postSetpoint(forne, value) {
    const resp = await fetch(API_BASE + SETPOINT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forno: forne, setpoint: Number(value) }) // note: 'forne' bug prevention below
    });
    return resp;
}

async function postSetpointFixed(forne, value) {
    // helper that uses correct key name 'forno' (typo safe)
    return await fetch(API_BASE + SETPOINT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forno: forne, setpoint: Number(value) }) // will still fail if 'forne' not defined
    });
}

// We'll not use the above broken helpers. Use explicit implementation in event handlers.

// Mode change
async function postMode(forne, modoNum) {
    const resp = await fetch(API_BASE + MODE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forno: forne, modo: Number(modoNum) })
    });
    return resp;
}

// ----------------------- Atualização principal e regras -----------------------
async function updateDashboard() {
    try {
        const data = await getLatest();

        // populate last.* and UI for both furnaces (F1)
        if (data.f1_temp_zone1 != null) last.f1.z1 = Number(data.f1_temp_zone1);
        if (data.f1_temp_zone2 != null) last.f1.z2 = Number(data.f1_temp_zone2);
        if (data.f1_temp_zone3 != null) last.f1.z3 = Number(data.f1_temp_zone3);
        if (data.f1_setpoint != null) last.f1.setpoint = Number(data.f1_setpoint);
        if (data.f1_mode_operation != null) last.f1.mode = Number(data.f1_mode_operation);
        if (data.f1_fuel_state != null) last.f1.fuel = Number(data.f1_fuel_state);
        if (data.timestamp) last.f1.timestamp = data.timestamp;

        // F2
        if (data.f2_temp_zone1 != null) last.f2.z1 = Number(data.f2_temp_zone1);
        if (data.f2_temp_zone2 != null) last.f2.z2 = Number(data.f2_temp_zone2);
        if (data.f2_temp_zone3 != null) last.f2.z3 = Number(data.f2_temp_zone3);
        if (data.f2_setpoint != null) last.f2.setpoint = Number(data.f2_setpoint);
        if (data.f2_mode_operation != null) last.f2.mode = Number(data.f2_mode_operation);
        if (data.f2_fuel_state != null) last.f2.fuel = Number(data.f2_fuel_state);
        if (data.timestamp) last.f2.timestamp = data.timestamp;

        // Update UI numeric displays (HTML spans)
        if (last.f1.z1 != null) $("t_z1_f1").innerText = last.f1.z1.toFixed(1) + "°C";
        if (last.f1.z2 != null) $("t_z2_f1").innerText = last.f1.z2.toFixed(1) + "°C";
        if (last.f1.z3 != null) $("t_z3_f1").innerText = last.f1.z3.toFixed(1) + "°C";
        if (last.f1.setpoint != null) $("setpoint_f1").value = Math.round(last.f1.setpoint);

        if (last.f2.z1 != null) $("t_z1_f2").innerText = last.f2.z1.toFixed(1) + "°C";
        if (last.f2.z2 != null) $("t_z2_f2").innerText = last.f2.z2.toFixed(1) + "°C";
        if (last.f2.z3 != null) $("t_z3_f2").innerText = last.f2.z3.toFixed(1) + "°C";
        if (last.f2.setpoint != null) $("setpoint_f2").value = Math.round(last.f2.setpoint);

        // Update fuel text & icons
        if (last.f1.fuel != null) {
            $("combustivel1").innerText = last.f1.fuel === 1 ? "Ligado" : "Desligado";
            $("icon_comb1").src = last.f1.fuel === 1 ? "icons/combustivel_ligado.png" : "icons/combustivel_desligado.png";
        }
        if (last.f2.fuel != null) {
            $("combustivel2").innerText = last.f2.fuel === 1 ? "Ligado" : "Desligado";
            $("icon_comb2").src = last.f2.fuel === 1 ? "icons/combustivel_ligado.png" : "icons/combustivel_desligado.png";
        }

        // apply mode UI (block/unblock input)
        if (last.f1.mode != null) applyModeUI(1, last.f1.mode, last.f1.setpoint);
        if (last.f2.mode != null) applyModeUI(2, last.f2.mode, last.f2.setpoint);

        // Update charts
        if (last.f1.z1 != null) updateChart(charts.f1.z1, last.f1.z1);
        if (last.f1.z2 != null) updateChart(charts.f1.z2, last.f1.z2);
        if (last.f1.z3 != null) updateChart(charts.f1.z3, last.f1.z3);
        if (last.f1.setpoint != null) updateChart(charts.f1.sp, last.f1.setpoint);

        if (last.f2.z1 != null) updateChart(charts.f2.z1, last.f2.z1);
        if (last.f2.z2 != null) updateChart(charts.f2.z2, last.f2.z2);
        if (last.f2.z3 != null) updateChart(charts.f2.z3, last.f2.z3);
        if (last.f2.setpoint != null) updateChart(charts.f2.sp, last.f2.setpoint);

        // -------------------- Regras de automação --------------------

        // -------- Regra 1: Alarme crítico (fora de [TEMP_MIN, TEMP_MAX]) -----------
        const f1Critical = (last.f1.z1 < TEMP_MIN || last.f1.z1 > TEMP_MAX) ||
                           (last.f1.z2 < TEMP_MIN || last.f1.z2 > TEMP_MAX) ||
                           (last.f1.z3 < TEMP_MIN || last.f1.z3 > TEMP_MAX);

        const f2Critical = (last.f2.z1 < TEMP_MIN || last.f2.z1 > TEMP_MAX) ||
                           (last.f2.z2 < TEMP_MIN || last.f2.z2 > TEMP_MAX) ||
                           (last.f2.z3 < TEMP_MIN || last.f2.z3 > TEMP_MAX);

        if (f1Critical) {
            showAlarmDiv(1, `Temperatura fora dos limites (${TEMP_MIN}–${TEMP_MAX} °C). Verificar!`);
        } else {
            hideAlarmDiv(1);
        }

        if (f2Critical) {
            showAlarmDiv(2, `Temperatura fora dos limites (${TEMP_MIN}–${TEMP_MAX} °C). Verificar!`);
        } else {
            hideAlarmDiv(2);
        }

        // -------- Regra 2: Zona > setpoint + 50°C -> Emergência -----------
        if (last.f1.setpoint != null) {
            const f1Over = (last.f1.z1 > last.f1.setpoint + 50) ||
                           (last.f1.z2 > last.f1.setpoint + 50) ||
                           (last.f1.z3 > last.f1.setpoint + 50);
            if (f1Over) {
                showAlarmDiv(1, `EMERGÊNCIA F1: Zona excedeu setpoint em +50°C.`);
            }
        }

        if (last.f2.setpoint != null) {
            const f2Over = (last.f2.z1 > last.f2.setpoint + 50) ||
                           (last.f2.z2 > last.f2.setpoint + 50) ||
                           (last.f2.z3 > last.f2.setpoint + 50);
            if (f2Over) {
                showAlarmDiv(2, `EMERGÊNCIA F2: Zona excedeu setpoint em +50°C.`);
            }
        }

        // -------- Regra 3: Desvio persistente em automático -> manutenção -----------
        const devThreshold = 30;
        const devConsecLimit = 3;

        if (last.f1.setpoint != null) {
            const devF1 = Math.max(
                Math.abs(last.f1.z1 - last.f1.setpoint),
                Math.abs(last.f1.z2 - last.f1.setpoint),
                Math.abs(last.f1.z3 - last.f1.setpoint)
            );
            if (last.f1.mode === 1 && devF1 > devThreshold) {
                counters.f1.deviation++;
                if (counters.f1.deviation >= devConsecLimit) {
                    showAlarmDiv(1, "ALERTA MANUTENÇÃO F1: desvios persistentes em automático.");
                }
            } else {
                counters.f1.deviation = 0;
            }
        }

        if (last.f2.setpoint != null) {
            const devF2 = Math.max(
                Math.abs(last.f2.z1 - last.f2.setpoint),
                Math.abs(last.f2.z2 - last.f2.setpoint),
                Math.abs(last.f2.z3 - last.f2.setpoint)
            );
            if (last.f2.mode === 1 && devF2 > devThreshold) {
                counters.f2.deviation++;
                if (counters.f2.deviation >= devConsecLimit) {
                    showAlarmDiv(2, "ALERTA MANUTENÇÃO F2: desvios persistentes em automático.");
                }
            } else {
                counters.f2.deviation = 0;
            }
        }

        // -------- Regra 4: Estabilidade -> ±5°C por 10 leituras consecutivas -----------
        const stableThreshold = 5;
        const stableCountNeeded = 10;

        if (last.f1.setpoint != null) {
            const stableF1 = Math.max(
                Math.abs(last.f1.z1 - last.f1.setpoint),
                Math.abs(last.f1.z2 - last.f1.setpoint),
                Math.abs(last.f1.z3 - last.f1.setpoint)
            ) <= stableThreshold;
            if (stableF1) {
                counters.f1.stable++;
                if (counters.f1.stable >= stableCountNeeded) {
                    // Exibe mensagem não intrusiva no div de alarme (pode trocar para outro elemento)
                    const el = $("alarme_f1");
                    if (el) {
                        el.style.display = "block";
                        el.innerText = "F1: Estável (±5°C do setpoint)";
                        el.style.backgroundColor = "#2ecc71"; // verde suave
                        setTimeout(() => { if (el) { el.style.backgroundColor = ""; } }, 5000);
                    }
                }
            } else {
                counters.f1.stable = 0;
            }
        }

        if (last.f2.setpoint != null) {
            const stableF2 = Math.max(
                Math.abs(last.f2.z1 - last.f2.setpoint),
                Math.abs(last.f2.z2 - last.f2.setpoint),
                Math.abs(last.f2.z3 - last.f2.setpoint)
            ) <= stableThreshold;
            if (stableF2) {
                counters.f2.stable++;
                if (counters.f2.stable >= stableCountNeeded) {
                    const el = $("alarme_f2");
                    if (el) {
                        el.style.display = "block";
                        el.innerText = "F2: Estável (±5°C do setpoint)";
                        el.style.backgroundColor = "#2ecc71";
                        setTimeout(() => { if (el) { el.style.backgroundColor = ""; } }, 5000);
                    }
                }
            } else {
                counters.f2.stable = 0;
            }
        }

        // -------- Regra 5: Bloqueio do input em automático (já aplicado via applyModeUI) --------
        // (no modo manual o operador pode digitar; no modo automático o input é atualizado pelo servidor)

        // (Regra extra já aplicada: ícones de combustível e textos)

    } catch (err) {
        console.error("Erro updateDashboard:", err);
    }
}

// start polling
setInterval(updateDashboard, POLL_INTERVAL_MS);
updateDashboard();

// ----------------------- Eventos de botões (OK) -----------------------
// Os botões OK no HTML não têm IDs; determinamos por posição:
// cada .forno tem dois .linha-ajuste com um botão OK cada (setpoint, modo)
function wireButtons() {
    const fornos = document.querySelectorAll(".forno");
    if (!fornos || fornos.length < 2) return;

    // Forno 1 buttons
    const f1Btns = fornos[0].querySelectorAll(".btn-inline");
    if (f1Btns[0]) f1Btns[0].addEventListener("click", async () => {
        // antes de enviar, verifica se modo manual
        const modeVal = (last.f1.mode === 1) ? "auto" : "manual";
        if (last.f1.mode === 1) {
            alert("Forno 1 está em modo AUTOMÁTICO. Alteração de setpoint não permitida.");
            return;
        }
        const value = Number($("setpoint_f1").value);
        if (isNaN(value)) { alert("Setpoint inválido."); return; }
        // POST /setpoint
        try {
            const resp = await fetch(API_BASE + SETPOINT_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ forno: 1, setpoint: value })
            });
            if (!resp.ok) {
                const err = await resp.json();
                alert("Erro: " + (err.detail || JSON.stringify(err)));
            } else {
                alert("Setpoint enviado para Forno 1.");
            }
        } catch (e) { console.error(e); alert("Erro ao enviar setpoint."); }
    });

    if (f1Btns[1]) f1Btns[1].addEventListener("click", async () => {
        // modo select value is 'manual' or 'auto' in HTML; convert to numeric for API: auto=1, manual=2
        const htmlVal = $("modo_f1").value;
        const modoNum = (htmlVal === "auto") ? 1 : 2;
        try {
            const resp = await fetch(API_BASE + MODE_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ forno: 1, modo: modoNum })
            });
            if (!resp.ok) {
                const err = await resp.json();
                alert("Erro: " + (err.detail || JSON.stringify(err)));
            } else {
                alert("Modo enviado para Forno 1.");
            }
        } catch (e) { console.error(e); alert("Erro ao enviar modo."); }
    });

    // Forno 2 buttons
    const f2Btns = fornos[1].querySelectorAll(".btn-inline");
    if (f2Btns[0]) f2Btns[0].addEventListener("click", async () => {
        if (last.f2.mode === 1) {
            alert("Forno 2 está em modo AUTOMÁTICO. Alteração de setpoint não permitida.");
            return;
        }
        const value = Number($("setpoint_f2").value);
        if (isNaN(value)) { alert("Setpoint inválido."); return; }
        try {
            const resp = await fetch(API_BASE + SETPOINT_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ forno: 2, setpoint: value })
            });
            if (!resp.ok) {
                const err = await resp.json();
                alert("Erro: " + (err.detail || JSON.stringify(err)));
            } else {
                alert("Setpoint enviado para Forno 2.");
            }
        } catch (e) { console.error(e); alert("Erro ao enviar setpoint."); }
    });

    if (f2Btns[1]) f2Btns[1].addEventListener("click", async () => {
        const htmlVal = $("modo_f2").value;
        const modoNum = (htmlVal === "auto") ? 1 : 2;
        try {
            const resp = await fetch(API_BASE + MODE_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ forno: 2, modo: modoNum })
            });
            if (!resp.ok) {
                const err = await resp.json();
                alert("Erro: " + (err.detail || JSON.stringify(err)));
            } else {
                alert("Modo enviado para Forno 2.");
            }
        } catch (e) { console.error(e); alert("Erro ao enviar modo."); }
    });
}

window.addEventListener("load", () => {
    wireButtons();
});
