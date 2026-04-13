// ===================== CONFIGURACIÓN =====================
var YT_API_KEY = 'AIzaSyCqMTP8vPte4UMbRlfpxg5aRxdNrMUf5-A';

var musicaSeleccionada = null;
var musicaPausada      = false;
var ytPlayer           = null;
var ytReady            = false;
var ytCambiando        = false;
var colaMusica         = [];   // lista completa de resultados
var colaIndex          = 0;    // canción actual en la cola
var volumenActual      = 70;   // volumen en uso

// Cargar IFrame API
(function() {
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
})();

function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('yt-player', {
        height: '1', width: '1',
        playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
        events: {
            onReady: function() {
                ytReady = true;
                ytPlayer.setVolume(70);
            },
            onStateChange: function(e) {
                // Estado 1 = reproduciendo → ocultar ACTIVAR, mostrar controles
                if (e.data === 1) {
                    document.getElementById('btn-activar-musica').style.display = 'none';
                    document.getElementById('btn-ant-cancion').style.display    = 'inline-flex';
                    document.getElementById('btn-music-toggle').style.display   = 'inline-flex';
                    document.getElementById('btn-sig-cancion').style.display    = 'inline-flex';
                    document.getElementById('btn-music-toggle').textContent     = '⏸';
                }
                // Estado 0 = video terminado → pasar a la siguiente canción
                if (e.data === 0 && !ytCambiando) {
                    ytCambiando = true;
                    setTimeout(function() {
                        siguienteCancion();
                        setTimeout(function() { ytCambiando = false; }, 1500);
                    }, 300);
                }
                // Estado -1 = no iniciado (común en TV tras loadVideoById) → forzar play
                if (e.data === -1 && musicaSeleccionada && !musicaPausada) {
                    setTimeout(function() { ytPlayer.playVideo(); }, 200);
                }
            }
        }
    });
}

// ===================== BÚSQUEDA =====================
async function buscarMusica() {
    var query = document.getElementById('music-search').value.trim();
    if (!query) return;

    var estado     = document.getElementById('search-estado');
    var resultados = document.getElementById('search-resultados');

    estado.textContent   = 'Buscando...';
    resultados.innerHTML = '';

    try {
        var baseUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&q='
                + encodeURIComponent(query)
                + '&maxResults=50&type=video&key=' + YT_API_KEY;

        // Primera página
        var res1  = await fetch(baseUrl);
        var data1 = await res1.json();

        if (data1.error) {
            estado.textContent = '⚠️ ' + data1.error.message;
            return;
        }

        var todosItems = data1.items || [];

        estado.textContent = todosItems.length + ' canciones en cola';

        colaMusica = todosItems
            .filter(function(i) { return i.id.kind === 'youtube#video'; })
            .map(function(i) {
                return {
                    id:     i.id.videoId,
                    tipo:   'video',
                    titulo: i.snippet.title,
                    thumb:  (i.snippet.thumbnails.medium || i.snippet.thumbnails.default).url
                };
            });
        colaIndex = 0;
        mostrarResultados(todosItems);

    } catch(e) {
        estado.textContent = '⚠️ Sin conexión';
    }
}

function mostrarResultados(items) {
    var container = document.getElementById('search-resultados');
    container.innerHTML = '';

    items.forEach(function(item) {
        var esPlaylist = item.id.kind === 'youtube#playlist';
        var id         = esPlaylist ? item.id.playlistId : item.id.videoId;
        var titulo     = item.snippet.title;
        var thumb      = (item.snippet.thumbnails.medium || item.snippet.thumbnails.default).url;
        var canal      = item.snippet.channelTitle;

        var card = document.createElement('div');
        card.className = 'resultado-card';
        card.innerHTML =
            '<img src="' + thumb + '" alt="" class="resultado-thumb">' +
            '<div class="resultado-info">' +
                '<span class="resultado-tipo">' + (esPlaylist ? '📋 PLAYLIST' : '🎵 VIDEO') + '</span>' +
                '<span class="resultado-titulo">' + titulo + '</span>' +
                '<span class="resultado-canal">' + canal + '</span>' +
            '</div>' +
            '<span class="resultado-sel-mark">✓</span>';

        card.onclick = (function(info, el) {
            return function() { seleccionarMusica(info, el); };
        })({ id: id, tipo: esPlaylist ? 'playlist' : 'video', titulo: titulo, thumb: thumb }, card);

        container.appendChild(card);
    });
}

function seleccionarMusica(info, el) {
    musicaSeleccionada = info;

    // Sincronizar colaIndex con la canción elegida
    for (var i = 0; i < colaMusica.length; i++) {
        if (colaMusica[i].id === info.id) { colaIndex = i; break; }
    }

    document.querySelectorAll('.resultado-card').forEach(function(c) {
        c.classList.remove('seleccionado');
    });
    el.classList.add('seleccionado');

    document.getElementById('musica-seleccionada').style.display = 'flex';
    document.getElementById('sin-musica-msg').style.display       = 'none';
    document.getElementById('musica-sel-thumb').src               = info.thumb;
    document.getElementById('musica-sel-titulo').textContent      = info.titulo;
}

// ===================== REPRODUCCIÓN =====================
function activarMusica() {
    if (!musicaSeleccionada || !ytReady) return;
    reproducir();
}

function reproducir() {
    if (!ytPlayer || !musicaSeleccionada) return;
    volumenActual = parseInt(document.getElementById('music-volume-timer').value);
    ytPlayer.setVolume(volumenActual);
    ytPlayer.loadVideoById(musicaSeleccionada.id);
    // Doble intento: el TV a veces necesita más tiempo para responder
    setTimeout(function() { ytPlayer.playVideo(); }, 400);
    setTimeout(function() {
        if (ytPlayer.getPlayerState() !== 1) ytPlayer.playVideo();
    }, 1500);
    musicaPausada = false;
    document.getElementById('music-bar-thumb').src          = musicaSeleccionada.thumb;
    document.getElementById('music-bar-titulo').textContent = musicaSeleccionada.titulo;
}

function toggleMusica() {
    if (!ytPlayer || !musicaSeleccionada) return;
    if (musicaPausada) {
        ytPlayer.playVideo();
        document.getElementById('btn-music-toggle').textContent = '⏸';
    } else {
        ytPlayer.pauseVideo();
        document.getElementById('btn-music-toggle').textContent = '▶';
    }
    musicaPausada = !musicaPausada;
}

function anteriorCancion() {
    if (!ytPlayer || colaMusica.length === 0) return;
    colaIndex = (colaIndex - 1 + colaMusica.length) % colaMusica.length;
    musicaSeleccionada = colaMusica[colaIndex];
    reproducir();
    musicaPausada = false;
    document.getElementById('btn-music-toggle').textContent = '⏸';
}

function siguienteCancion() {
    if (!ytPlayer || colaMusica.length === 0) return;
    colaIndex = (colaIndex + 1) % colaMusica.length;
    musicaSeleccionada = colaMusica[colaIndex];
    reproducir();
    musicaPausada = false;
    document.getElementById('btn-music-toggle').textContent = '⏸';
}

function cambiarVolumen(val) {
    volumenActual = parseInt(val);
    if (ytPlayer) ytPlayer.setVolume(volumenActual);
}

// ===================== RELOJ =====================
function actualizarReloj() {
    var ahora   = new Date();
    var opciones = { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };

    var elHora = document.getElementById('hora-actual');
    if (elHora) {
        var cadena = ahora.toLocaleTimeString('es-VE', opciones).replace(/\./g, '').toUpperCase();
        var partes = cadena.split(' ');
        elHora.innerHTML = partes[0] + '<span class="sufijo">' + partes[1] + '</span>';
    }

    var elHoraTimer = document.getElementById('hora-timer');
    if (elHoraTimer) {
        var mini = ahora.toLocaleTimeString('es-VE', {
            timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: true
        }).replace(/\./g, '').toUpperCase();
        elHoraTimer.textContent = mini;
    }
}
setInterval(actualizarReloj, 1000);
actualizarReloj();

// ===================== MODOS PRESET =====================
var MODOS = {
    clase1: { work: 6,  rest: 1, rounds: 6 },
    clase2: { work: 8,  rest: 2, rounds: 8 },
    comp:   { work: 10, rest: 0, rounds: 1 }
};

function aplicarModo(modo) {
    var cfg = MODOS[modo];
    document.getElementById('inWork').value   = cfg.work;
    document.getElementById('inRest').value   = cfg.rest;
    document.getElementById('inRounds').value = cfg.rounds;
    document.querySelectorAll('.modo-btn').forEach(function(b) { b.classList.remove('activo'); });
    document.getElementById('modo-' + modo).classList.add('activo');
}

// ===================== NAVEGACIÓN =====================
function mostrarConfiguracion() {
    initAudio(); // Inicializar con el gesto del usuario antes de que empiece todo
    document.getElementById('pantalla-inicio').style.display = 'none';
    document.getElementById('panel-config').style.display    = 'flex';
    aplicarModo('clase1');
}

// ===================== TIMER =====================
var interval;
var timeSecs;
var roundActual   = 1;
var roundTotal;
var isPaused      = false;
var workTimeFijo, restTimeFijo;
var esFaseTrabajo = true;

// ===================== AUDIO (Web Audio API — no conflicta con YouTube en TV) =====================
var audioCtx = null;

function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
}

function beep(freq, dur, vol, type, delay) {
    if (!audioCtx) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        var t    = audioCtx.currentTime + (delay || 0);
        var osc  = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type           = type || 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol || 0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    } catch(e) {}
}

// Golpe de campana: múltiples armónicos inarmónicos con ataque rápido y resonancia larga
function campanada(delay) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    // Parciales típicos de una campana real (relaciones inarmónicas)
    var base = 620;
    var parciales = [
        { mult: 1,     vol: 0.38, dur: 3.5 },
        { mult: 2,     vol: 0.30, dur: 2.8 },
        { mult: 2.756, vol: 0.26, dur: 2.2 },
        { mult: 3.0,   vol: 0.22, dur: 1.8 },
        { mult: 4.0,   vol: 0.16, dur: 1.3 },
        { mult: 5.404, vol: 0.12, dur: 0.9 }
    ];
    parciales.forEach(function(p) {
        try {
            var t    = audioCtx.currentTime + (delay || 0);
            var osc  = audioCtx.createOscillator();
            var gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type            = 'sine';
            osc.frequency.value = base * p.mult;
            // Ataque muy rápido (golpe) + decaimiento exponencial largo (resonancia)
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(p.vol, t + 0.004);
            gain.gain.exponentialRampToValueAtTime(0.001, t + p.dur);
            osc.start(t);
            osc.stop(t + p.dur + 0.1);
        } catch(e) {}
    });
}

// 3 campanadas con separación de 1 segundo
function playAlarma() {
    campanada(0.0);
    campanada(1.0);
    campanada(2.0);
}

// Pitido corto de cuenta regresiva (últimos 3 segundos)
function playPitido() {
    beep(1100, 0.12, 0.75, 'sine', 0);
}

// Aviso de 10 segundos restantes: dos tonos ascendentes
function playAplausos() {
    beep(660, 0.15, 0.7, 'sine', 0.00);
    beep(990, 0.15, 0.7, 'sine', 0.22);
}

function format(s) {
    var m   = Math.floor(s / 60);
    var seg = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (seg < 10 ? '0' : '') + seg;
}

function togglePausa() {
    isPaused = !isPaused;
    var btn = document.getElementById('btn-pausa');
    if (isPaused) {
        btn.textContent = 'REANUDAR';
        btn.className   = 'tbtn tbtn-success';
    } else {
        btn.textContent = 'PAUSA';
        btn.className   = 'tbtn tbtn-primary';
    }
    // La música sigue sonando siempre, independiente del timer
}

function reiniciarRound() {
    if (document.getElementById('btn-reiniciar').disabled) return;
    clearInterval(interval);
    iniciarFase(esFaseTrabajo ? workTimeFijo : restTimeFijo, esFaseTrabajo);
    if (isPaused) togglePausa();
}

function prepararEntrenamiento() {
    var workVal   = parseFloat(document.getElementById('inWork').value);
    var restVal   = parseFloat(document.getElementById('inRest').value);
    var roundsVal = parseInt(document.getElementById('inRounds').value);
    if (workVal <= 0 || isNaN(workVal)) return alert('¡OSS! Datos inválidos.');

    workTimeFijo = Math.round(workVal * 60);
    restTimeFijo = Math.round(restVal * 60);
    roundTotal   = roundsVal;
    roundActual  = 1;

    document.getElementById('panel-config').style.display = 'none';
    document.getElementById('panel-timer').style.display  = 'flex';
    document.getElementById('btn-reiniciar').disabled     = true;

    // Iniciar música automáticamente si hay canción seleccionada
    // Los controles (⏮⏸⏭) se mostrarán solos cuando onStateChange confirme que está sonando
    if (musicaSeleccionada) {
        document.getElementById('music-bar').style.display      = 'flex';
        document.getElementById('music-bar-thumb').src          = musicaSeleccionada.thumb;
        document.getElementById('music-bar-titulo').textContent = musicaSeleccionada.titulo;
        reproducir();
    }

    var prepTime = 40;
    document.getElementById('label-status').textContent = 'PREPÁRATE';
    document.getElementById('label-round').textContent  = 'COMBATE: 1 / ' + roundTotal;

    var prepInterval = setInterval(function() {
        if (!isPaused) {
            document.getElementById('display-time').textContent = format(prepTime);
            if (prepTime <= 3 && prepTime > 0) playPitido();
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
    timeSecs      = segundos;
    esFaseTrabajo = esTrabajo;
    document.getElementById('label-round').textContent = 'ROUND: ' + roundActual + ' / ' + roundTotal;
    playAlarma();
    if (interval) clearInterval(interval);

    interval = setInterval(function() {
        if (!isPaused) {
            document.getElementById('display-time').textContent = format(timeSecs);

            if (esTrabajo) {
                document.getElementById('label-status').textContent = '¡COMBATE!';
                document.body.style.background = timeSecs <= 10 ? 'var(--danger-bg)' : 'var(--work-bg)';
                if (timeSecs === 10) playAplausos();
                if (timeSecs <= 3 && timeSecs > 0) playPitido();
            } else {
                document.getElementById('label-status').textContent = 'DESCANSO';
                document.body.style.background = 'var(--rest-bg)';
                if (timeSecs <= 3 && timeSecs > 0) playPitido();
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
    playAlarma();
    if (ytPlayer && musicaSeleccionada) ytPlayer.stopVideo();
    document.body.style.background = 'var(--default-bg)';
    document.getElementById('label-status').textContent    = 'COMBATES COMPLETADOS';
    document.getElementById('display-time').textContent    = 'OSS';
    document.getElementById('btn-pausa').style.display     = 'none';
    document.getElementById('btn-reiniciar').style.display = 'none';
    document.getElementById('music-bar').style.display     = 'none';
}
