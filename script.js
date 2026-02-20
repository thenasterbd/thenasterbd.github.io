let interval;
let timeSecs;
let roundActual = 1;
let roundTotal;
let isPaused = false;
let workTimeFijo, restTimeFijo;

// Cargar audio
const sonidoAlarma = new Audio('alarma.mp3');

function reproducirAlarma() {
    sonidoAlarma.pause();
    sonidoAlarma.currentTime = 0;
    sonidoAlarma.play().catch(e => console.log("Esperando interacción para audio..."));
}

function ejecutarAlarmaPersistente(segundos, callback) {
    let count = 0;
    reproducirAlarma();
    
    const alarmanInt = setInterval(() => {
        if (!isPaused) {
            document.body.classList.toggle('bg-dark-blink');
            count++;
            if (count >= segundos) {
                clearInterval(alarmanInt);
                document.body.classList.remove('bg-dark-blink');
                if (callback) callback();
            }
        }
    }, 1000);
}

function format(s) {
    const m = Math.floor(s / 60);
    const seg = s % 60;
    return `${m.toString().padStart(2,'0')}:${seg.toString().padStart(2,'0')}`;
}

function togglePausa() {
    isPaused = !isPaused;
    const btn = document.getElementById('btn-pausa');
    if (isPaused) {
        btn.textContent = "REANUDAR";
        btn.classList.replace('btn-primary', 'btn-success');
    } else {
        btn.textContent = "PAUSA";
        btn.classList.replace('btn-success', 'btn-primary');
    }
}

function prepararEntrenamiento() {
    const workIn = parseFloat(document.getElementById('inWork').value);
    const restIn = parseFloat(document.getElementById('inRest').value);
    const roundsIn = parseInt(document.getElementById('inRounds').value);

    if (isNaN(workIn) || workIn <= 0) return alert("Valores inválidos");

    workTimeFijo = Math.round(workIn * 60);
    restTimeFijo = Math.round(restIn * 60);
    roundTotal = roundsIn;

    document.getElementById('panel-config').style.display = 'none';
    document.getElementById('panel-timer').style.display = 'block';
    
    let prepTime = 3;
    document.getElementById('display-time').textContent = prepTime;
    document.getElementById('label-status').textContent = "PREPÁRATE";
    document.body.style.backgroundColor = "var(--prep-bg)";
    
    let prepInterval = setInterval(() => {
        if (!isPaused) {
            prepTime--;
            if (prepTime > 0) {
                document.getElementById('display-time').textContent = prepTime;
            } else {
                clearInterval(prepInterval);
                iniciarFase(workTimeFijo, true);
            }
        }
    }, 1000);
}

function iniciarFase(segundos, esTrabajo) {
    timeSecs = segundos;
    document.body.style.backgroundColor = esTrabajo ? 'var(--work-bg)' : 'var(--rest-bg)';
    document.getElementById('label-status').textContent = esTrabajo ? "¡PELEA!" : "DESCANSO";
    document.getElementById('label-round').textContent = `ROUND: ${roundActual} / ${roundTotal}`;
    
    if(interval) clearInterval(interval);
    interval = setInterval(() => {
        if (!isPaused) {
            timeSecs--;
            document.getElementById('display-time').textContent = format(timeSecs);

            if (timeSecs <= 0) {
                clearInterval(interval);
                if (esTrabajo) {
                    ejecutarAlarmaPersistente(3, () => {
                        iniciarFase(restTimeFijo, false);
                    });
                } else {
                    if (roundActual < roundTotal) {
                        ejecutarAlarmaPersistente(3, () => {
                            roundActual++;
                            iniciarFase(workTimeFijo, true);
                        });
                    } else {
                        finalizar();
                    }
                }
            }
        }
    }, 1000);
}

function finalizar() {
    document.body.style.backgroundColor = "#717171";
    document.getElementById('label-status').textContent = "FIN";
    document.getElementById('display-time').textContent = "OSS";
    document.getElementById('btn-pausa').style.display = "none";
    reproducirAlarma();
}