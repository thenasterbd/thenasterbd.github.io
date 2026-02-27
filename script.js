let interval;
let timeSecs;
let roundActual = 1;
let roundTotal;
let isPaused = false;
let workTimeFijo, restTimeFijo;
let esFaseTrabajo = true;

const sonidoFinal = new Audio('alarma.mp3');
const sonidoPitido = new Audio('pitido.mp3');
const sonidoAplausos = new Audio('aplausos.mp3');

function actualizarReloj() {
    const ahora = new Date();
    const opciones = { 
        timeZone: 'America/Caracas', 
        hour: '2-digit', minute: '2-digit', second: '2-digit', 
        hour12: true 
    };
    
    const elHora = document.getElementById('hora-actual');
    if(elHora) {
        let cadena = ahora.toLocaleTimeString('es-VE', opciones)
                          .replace(/\./g, '')
                          .toUpperCase();
        
        // Separamos la hora ("12:45:30") del sufijo ("AM")
        let partes = cadena.split(' '); 
        let numeros = partes[0];
        let sufijo = partes[1];

        // Insertamos el HTML con el sufijo en un span para controlarlo
        elHora.innerHTML = `${numeros}<span class="sufijo">${sufijo}</span>`;
    }
}
setInterval(actualizarReloj, 1000);
actualizarReloj();

function mostrarConfiguracion() {
    document.getElementById('pantalla-inicio').style.display = 'none';
    document.getElementById('panel-config').style.display = 'block';
}

function playSound(audio) {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setTimeout(() => {
        audio.play().catch(e => console.log("Audio bloqueado"));
    }, 100);
}

function format(s) {
    const m = Math.floor(s / 60);
    const seg = s % 60;
    return `${m.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
}

function togglePausa() {
    isPaused = !isPaused;
    const btn = document.getElementById('btn-pausa');
    btn.textContent = isPaused ? "REANUDAR" : "PAUSA";
    btn.className = isPaused ? "btn btn-success btn-lg w-100 py-4 fw-bold fs-2 shadow" : "btn btn-primary btn-lg w-100 py-4 fw-bold fs-2 shadow";
}

function reiniciarRound() {
    if(document.getElementById('btn-reiniciar').disabled) return;
    clearInterval(interval);
    iniciarFase(esFaseTrabajo ? workTimeFijo : restTimeFijo, esFaseTrabajo);
    if(isPaused) togglePausa();
}

function prepararEntrenamiento() {
    const workVal = parseFloat(document.getElementById('inWork').value);
    const restVal = parseFloat(document.getElementById('inRest').value);
    const roundsVal = parseInt(document.getElementById('inRounds').value);

    if (workVal <= 0 || isNaN(workVal)) return alert("¡OSS! Datos inválidos.");

    workTimeFijo = Math.round(workVal * 60);
    restTimeFijo = Math.round(restVal * 60);
    roundTotal = roundsVal;
    roundActual = 1;

    document.getElementById('panel-config').style.display = 'none';
    document.getElementById('panel-timer').style.display = 'block';
    
    // Bloqueo del botón reiniciar durante la preparación
    document.getElementById('btn-reiniciar').disabled = true;
    
    // TIEMPO DE PREPARACIÓN (puedes cambiarlo a 5 si prefieres menos tiempo)
    let prepTime = 40; 
    document.getElementById('label-status').textContent = "PREPÁRATE";
    document.getElementById('label-round').textContent = `COMBATE: 1 / ${roundTotal}`;
    
    let prepInterval = setInterval(() => {
        if (!isPaused) {
            document.getElementById('display-time').textContent = format(prepTime);
            if (prepTime <= 3 && prepTime > 0) playSound(sonidoPitido);
            
            if (prepTime <= 0) {
                clearInterval(prepInterval);
                document.getElementById('btn-reiniciar').disabled = false;
                iniciarFase(workTimeFijo, true);
            }
            prepTime--;
        }
    }, 1000);
}

function iniciarFase(segundos, esTrabajo) {
    timeSecs = segundos;
    esFaseTrabajo = esTrabajo;
    document.getElementById('label-round').textContent = `ROUND: ${roundActual} / ${roundTotal}`;
    
    playSound(sonidoFinal);

    if (interval) clearInterval(interval);
    
    interval = setInterval(() => {
        if (!isPaused) {
            document.getElementById('display-time').textContent = format(timeSecs);
            
            if (esTrabajo) {
                document.getElementById('label-status').textContent = "¡COMBATE!";
                document.body.style.background = (timeSecs <= 10) ? "var(--danger-bg)" : "var(--work-bg)";
                if (timeSecs === 10) playSound(sonidoAplausos);
                if (timeSecs <= 3 && timeSecs > 0) playSound(sonidoPitido);
            } else {
                document.getElementById('label-status').textContent = "DESCANSO";
                document.body.style.background = "var(--rest-bg)";
                if (timeSecs <= 3 && timeSecs > 0) playSound(sonidoPitido);
            }

            if (timeSecs <= 0) {
                clearInterval(interval);
                if (esTrabajo) {
                    restTimeFijo > 0 ? iniciarFase(restTimeFijo, false) : pasarSiguienteRound();
                } else {
                    pasarSiguienteRound();
                }
            }
            timeSecs--;
        }
    }, 1000);
}

function pasarSiguienteRound() {
    if (roundActual < roundTotal) {
        roundActual++;
        iniciarFase(workTimeFijo, true);
    } else {
        finalizar();
    }
}

function finalizar() {
    playSound(sonidoFinal);
    document.body.style.background = "var(--default-bg)";
    document.getElementById('label-status').textContent = "COMBATES COMPLETADOS";
    document.getElementById('display-time').textContent = "OSS";
    document.getElementById('btn-pausa').style.display = "none";
    document.getElementById('btn-reiniciar').style.display = "none";
}