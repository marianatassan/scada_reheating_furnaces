const tempChart = new Chart(document.getElementById("graficoTemp"), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'ºC',
            data: [],
            borderColor: 'red',
            tension: 0.3
        }]
    },
    options: {
        scales: { y: { min: 0, max: 60 } }
    }
});

const LumiChart = new Chart(document.getElementById("graficoLuminosidade"), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Lux',
            data: [],
            borderColor: 'yellow',
            tension: 0.3
        }]
    },
    options: {
        scales: { y: { min: 0, max: 1023 } }
    }
});

const UmiChart = new Chart(document.getElementById("graficoUmidade"), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: '%',
            data: [],
            borderColor: 'blue',
            tension: 0.3
        }]
    },
    options: {
        scales: { y: { min: 0, max: 100 } }
    }
});

function updateChart(chart, value) {
    const hora = new Date().toLocaleTimeString();

    chart.data.labels.push(hora);
    chart.data.datasets[0].data.push(value);

    // Limita a 10 pontos no gráfico
    if (chart.data.labels.length > 30) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update();
}

let ultimoValor = {
    temperature: "--",
    humidity: "--",
    luminosity: "--",
    movement: "Ausente",
    timestamp: "--:--:--"
};

async function updateDashboard() {
    try {
        const response = await fetch("http://localhost:8000/house_data");
        const data = await response.json();

        // Se algum valor vier inválido, mantém o anterior
        if (data.temperature != null) ultimoValor.temperature = data.temperature.toFixed(1);
        if (data.humidity != null) ultimoValor.humidity = data.humidity.toFixed(2);
        if (data.luminosity != null) ultimoValor.luminosity = data.luminosity;
        if (data.movement != null) ultimoValor.movement = data.movement ? "Detectado" : "Ausente";
        if (data.timestamp != null) ultimoValor.timestamp = data.timestamp;

        document.getElementById("temperatura").innerText = `${ultimoValor.temperature} °C`;
        document.getElementById("luminosidade").innerText = `${ultimoValor.luminosity} lx`;
        document.getElementById("umidade").innerText = `${ultimoValor.humidity} %`;
        document.getElementById("movimento").innerText = ultimoValor.movement;
        document.getElementById("horaAtualizacao").innerText = ultimoValor.timestamp;

        updateChart(tempChart, parseFloat(ultimoValor.temperature));
        updateChart(LumiChart, parseFloat(ultimoValor.luminosity));
        updateChart(UmiChart, parseFloat(ultimoValor.humidity));

        // Seletor dos atuadores
        const lampadaEstado = document.querySelector("#atuador_lampada .estado");
        const arEstado = document.querySelector("#atuador_ar .estado");
        const umidificadorEstado = document.querySelector("#atuador_umidificador .estado");
        const ventiladorEstado = document.querySelector("#atuador_ventilador .estado");
        const alarmeMovimentoTag = document.getElementById("alarmeMovimento");
        const alarmeSomTag = document.getElementById("somAlarme");
        
        // Regra 1: Movimento detectado → Liga alarme
        if (ultimoValor.movement === "Detectado") {
            alarmeMovimentoTag.style.display = 'block';
            alarmeSomTag.play();
        } else {
            alarmeMovimentoTag.style.display = 'none';
            alarmeSomTag.pause();
            alarmeSomTag.currentTime = 0;
        }

        // Regra 2: Temperatura > 30°C → Liga ar-condicionado
        if (parseFloat(ultimoValor.temperature) > 30) {
            arEstado.innerText = "Ligado";
            arEstado.style.color = "green";
            console.log("Ar-condicionado ligado");
        } else {
            arEstado.innerText = "Desligado";
            arEstado.style.color = "gray";
            console.log("Ar-condicionado desligado");
        }

        // Regra 3: Movimento detectado + Luminosidade baixa → Liga luz
        if (ultimoValor.movement === "Detectado" && parseFloat(ultimoValor.luminosity) < 200) {
            lampadaEstado.innerText = "Ligado";
            lampadaEstado.style.color = "green";
            console.log("Lâmpada ligada");
        } else {
            lampadaEstado.innerText = "Desligado";
            lampadaEstado.style.color = "gray";
            console.log("Lâmpada desligada");
        }

        // Regra 4: Umidade < 40 → Umidificador
        if (parseFloat(ultimoValor.humidity) < 40) {
            umidificadorEstado.innerText = "Ligado";
            umidificadorEstado.style.color = "green";
            console.log("Umidificador ligado");
        } else {
            umidificadorEstado.innerText = "Desligado";
            umidificadorEstado.style.color = "gray";
            console.log("Umidificador desligado");
        }

        // Regra 5: Temperatura > 28 + Umidade > 70 → Ventilador
        if (parseFloat(ultimoValor.temperature) > 28 && parseFloat(ultimoValor.humidity) > 70) {
            ventiladorEstado.innerText = "Ligado";
            ventiladorEstado.style.color = "green";
            console.log("Ventilador ligado");
        } else {
            ventiladorEstado.innerText = "Desligado";
            ventiladorEstado.style.color = "gray";
            console.log("Ventilador desligado");
        }

        function trocarIcone(ativo, imgId, srcOn, srcOff) {
        document.getElementById(imgId).src = ativo ? srcOn : srcOff;
        }

        // Troca de imagem lâmpada
        trocarIcone(
            (ultimoValor.movement==="Detectado" && parseFloat(ultimoValor.luminosity)<200),
            "img_lampada",
            "icons/lamp_on.png",
            "icons/lamp_off.png"
        );

        // Ar-condicionado
        trocarIcone(
            parseFloat(ultimoValor.temperature)>30,
            "img_ar",
            "icons/ac_on.png",
            "icons/ac_off.png"
        );

        // Umidificador
        trocarIcone(
            parseFloat(ultimoValor.humidity)<40,
            "img_umidificador",
            "icons/hum_on.png",
            "icons/hum_off.png"
        );

        // Ventilador
        trocarIcone(
            parseFloat(ultimoValor.temperature)>28 && parseFloat(ultimoValor.humidity)>70,
            "img_ventilador",
            "icons/fan_on.png",
            "icons/fan_off.png"
        );


    } catch (error) {
        console.error("Erro ao atualizar dashboard:", error);
    }
}

// Atualiza a cada 2 segundos
setInterval(updateDashboard, 2000);
