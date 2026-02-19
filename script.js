let interval;
let timeSecs;
let roundActual = 1;
let roundTotal;
let isPaused = false;
let audioCtx;

// Generador de audio profesional
function playSound(freq, duration) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function ejecutarAlarmaPersistente(segundos, callback) {
    let count = 0;
    const alarmanInt = setInterval(() => {
        if (!isPaused) {
            playSound(600, 0.7); 
            document.body.classList.toggle('bg-dark'); // Efecto visual simple
            count++;
            if (count >= segundos) {
                clearInterval(alarmanInt);
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
    const work = parseFloat(document.getElementById('inWork').value);
    const rest = parseFloat(document.getElementById('inRest').value);
    const rounds = parseInt(document.getElementById('inRounds').value);

    if (work <= 0 || rest <= 0 || rounds <= 0) return alert("Valores inválidos");

    roundTotal = rounds;
    document.getElementById('panel-config').style.display = 'none';
    document.getElementById('logo-container').style.display = 'none';
    document.getElementById('panel-timer').style.display = 'block';
    
    let prepTime = 3;
    document.getElementById('display-time').textContent = prepTime;
    document.body.style.backgroundColor = "var(--prep-bg)";
    
    let prepInterval = setInterval(() => {
        if (!isPaused) {
            prepTime--;
            playSound(440, 0.2);
            if (prepTime > 0) {
                document.getElementById('display-time').textContent = prepTime;
            } else {
                clearInterval(prepInterval);
                iniciarFase(Math.round(work * 60), true);
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
                if (esTrabajo || roundActual < roundTotal) {
                    ejecutarAlarmaPersistente(3, () => {
                        if (esTrabajo) {
                            iniciarFase(Math.round(parseFloat(document.getElementById('inRest').value)*60), false);
                        } else {
                            roundActual++;
                            iniciarFase(Math.round(parseFloat(document.getElementById('inWork').value)*60), true);
                        }
                    });
                } else {
                    finalizar();
                }
            }
        }
    }, 1000);
}

function finalizar() {
    document.body.style.backgroundColor = "#000";
    document.getElementById('label-status').textContent = "FIN";
    document.getElementById('display-time').textContent = "OSS";
    document.getElementById('btn-pausa').style.display = "none";
    ejecutarAlarmaPersistente(5);
}