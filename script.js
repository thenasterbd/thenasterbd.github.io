// Variables globales
let interval;
let timeSecs;
let roundActual = 1;
let roundTotal;
let isPaused = false;
let workTimeFijo, restTimeFijo;

// Carga de archivos de sonido
const sonidoFinal = new Audio('alarma.mp3');
const sonidoPitido = new Audio('pitido.mp3');
const sonidoAplausos = new Audio('aplausos.mp3');

/**
 * Reproduce un sonido reiniciándolo si ya estaba sonando
 */
function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Interacción requerida para audio"));
}

/**
 * Formatea segundos a formato MM:SS
 */
function format(s) {
    const m = Math.floor(s / 60);
    const seg = s % 60;
    return `${m.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
}

/**
 * Controla la pausa y reanudación
 */
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

/**
 * Prepara los valores iniciales y lanza la cuenta regresiva de 5 segundos
 */
function prepararEntrenamiento() {
    const workVal = parseFloat(document.getElementById('inWork').value);
    const restVal = parseFloat(document.getElementById('inRest').value);
    const roundsVal = parseInt(document.getElementById('inRounds').value);

    // MEJORA: Validación estricta de números positivos
    if (workVal <= 0 || restVal < 0 || roundsVal <= 0 || isNaN(workVal)) {
        alert("¡OSS! Por favor ingresa tiempos válidos y mayores a cero.");
        return;
    }

    // Activa clase para achicar el logo en CSS y entra en pantalla completa
    document.body.classList.add('timer-active');

    workTimeFijo = Math.round(workVal * 60);
    restTimeFijo = Math.round(restVal * 60);
    roundTotal = roundsVal;
    roundActual = 1;

    document.getElementById('panel-config').style.display = 'none';
    document.getElementById('panel-timer').style.display = 'block';
    
    // Fase de Preparación inicial (5 segundos)
    let prepTime = 10;
    document.getElementById('label-status').textContent = "PREPÁRATE";
    document.body.style.background = "var(--prep-bg)";
    
    let prepInterval = setInterval(() => {
        if (!isPaused) {
            document.getElementById('display-time').textContent = format(prepTime);
            
            // Pitidos en los últimos 3 segundos de preparación
            if (prepTime <= 3 && prepTime > 0) playSound(sonidoPitido);
            
            if (prepTime <= 0) {
                clearInterval(prepInterval);
                iniciarFase(workTimeFijo, true);
            }
            prepTime--;
        }
    }, 1000);
}

/**
 * Gestiona los ciclos de combate y descanso
 */
function iniciarFase(segundos, esTrabajo) {
    timeSecs = segundos;
    document.getElementById('label-round').textContent = `ROUND: ${roundActual} / ${roundTotal}`;
    
    // Suena la campana al iniciar cualquier fase
    playSound(sonidoFinal);

    if (interval) clearInterval(interval);
    
    interval = setInterval(() => {
        if (!isPaused) {
            document.getElementById('display-time').textContent = format(timeSecs);
            
            if (esTrabajo) {
                document.getElementById('label-status').textContent = "¡COMBATE!";
                // Cambia a rojo en los últimos 10 segundos
                document.body.style.background = (timeSecs <= 10) ? "var(--danger-bg)" : "var(--work-bg)";
                
                // MEJORA: Sonidos específicos
                if (timeSecs === 10) playSound(sonidoAplausos); // Palmadas aviso 10 seg
                if (timeSecs <= 3 && timeSecs > 0) playSound(sonidoPitido); // Cuenta final
            } else {
                document.getElementById('label-status').textContent = "DESCANSO";
                document.body.style.background = "var(--rest-bg)";
                // Pitidos al final del descanso para avisar que vuelvan al centro
                if (timeSecs <= 3 && timeSecs > 0) playSound(sonidoPitido);
            }

            if (timeSecs <= 0) {
                clearInterval(interval);
                
                if (esTrabajo) {
                    iniciarFase(restTimeFijo, false);
                } else {
                    if (roundActual < roundTotal) {
                        roundActual++;
                        iniciarFase(workTimeFijo, true);
                    } else {
                        finalizar();
                    }
                }
            }
            timeSecs--;
        }
    }, 1000);
}

/**
 * Pantalla final al terminar todos los rounds
 */
function finalizar() {
    playSound(sonidoFinal);
    document.body.classList.remove('timer-active'); // El logo vuelve a su tamaño original
    document.body.style.background = "radial-gradient(circle, #4d4d4d 0%, #1a1a1a 100%)";
    document.getElementById('label-status').textContent = "SESIÓN COMPLETADA";
    document.getElementById('display-time').textContent = "OSS";
    document.getElementById('btn-pausa').style.display = "none";
}