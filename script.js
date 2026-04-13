// ===================== CONFIGURACIÓN =====================
var YT_API_KEY = 'AIzaSyCqMTP8vPte4UMbRlfpxg5aRxdNrMUf5-A';

var musicaSeleccionada = null;
var musicaPausada      = false;
var ytPlayer           = null;
var ytReady            = false;
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
                // Cuando termina la canción (estado 0), pasa a la siguiente
                if (e.data === 0) siguienteCancion();
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
    volumenActual = parseInt(document.getElementById('music-volume-timer').value);
    ytPlayer.setVolume(volumenActual);
    ytPlayer.loadVideoById(musicaSeleccionada.id); // loadVideoById ya inicia la reproducción
    musicaPausada = false;
    // Actualizar barra con canción actual
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

// Web Audio API — genera los sonidos con osciladores, sin depender de archivos mp3
var audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playSound(nombre) {
    var ctx = getAudioCtx();
    var now = ctx.currentTime;

    if (nombre === 'alarma') {
        // Campana de ring de boxeo: 4 golpes metálicos con armónicos
        // Cada golpe usa 3 osciladores desafinados para lograr el timbre metálico
        var parciales = [
            { freq: 820,  gain: 1.0,  decay: 1.6 },
            { freq: 1640, gain: 0.5,  decay: 1.1 },
            { freq: 2257, gain: 0.25, decay: 0.7 }
        ];
        var golpeGap = 0.9; // segundos entre cada golpe

        for (var g = 0; g < 4; g++) {
            var t = now + g * golpeGap;
            parciales.forEach(function(p) {
                var osc  = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = p.freq;
                gain.gain.setValueAtTime(p.gain, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + p.decay);
                osc.start(t); osc.stop(t + p.decay);
            });
        }

    } else if (nombre === 'pitido') {
        // Pitido corto y agudo
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);

    } else if (nombre === 'aplausos') {
        // 3 pitidos ascendentes (aviso de últimos 10 segundos)
        [660, 880, 1100].forEach(function(freq, i) {
            var osc  = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            var t = now + i * 0.18;
            gain.gain.setValueAtTime(0.7, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.start(t); osc.stop(t + 0.15);
        });
    }
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

    // Desbloquear AudioContext con el clic del usuario
    getAudioCtx();

    document.getElementById('panel-config').style.display = 'none';
    document.getElementById('panel-timer').style.display  = 'flex';
    document.getElementById('btn-reiniciar').disabled     = true;

    // Iniciar música automáticamente si hay canción seleccionada
    if (musicaSeleccionada) {
        document.getElementById('music-bar').style.display           = 'flex';
        document.getElementById('music-bar-thumb').src               = musicaSeleccionada.thumb;
        document.getElementById('music-bar-titulo').textContent      = musicaSeleccionada.titulo;
        document.getElementById('btn-activar-musica').style.display  = 'none';
        document.getElementById('btn-ant-cancion').style.display     = 'inline-flex';
        document.getElementById('btn-music-toggle').style.display    = 'inline-flex';
        document.getElementById('btn-sig-cancion').style.display     = 'inline-flex';
        document.getElementById('btn-music-toggle').textContent      = '⏸';
        reproducir();
    }

    var prepTime = 40;
    document.getElementById('label-status').textContent = 'PREPÁRATE';
    document.getElementById('label-round').textContent  = 'COMBATE: 1 / ' + roundTotal;

    var prepInterval = setInterval(function() {
        if (!isPaused) {
            document.getElementById('display-time').textContent = format(prepTime);
            if (prepTime <= 3 && prepTime > 0) playSound('pitido');
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
    playSound('alarma');
    if (interval) clearInterval(interval);

    interval = setInterval(function() {
        if (!isPaused) {
            document.getElementById('display-time').textContent = format(timeSecs);

            if (esTrabajo) {
                document.getElementById('label-status').textContent = '¡COMBATE!';
                document.body.style.background = timeSecs <= 10 ? 'var(--danger-bg)' : 'var(--work-bg)';
                if (timeSecs === 10) playSound('aplausos');
                if (timeSecs <= 3 && timeSecs > 0) playSound('pitido');
            } else {
                document.getElementById('label-status').textContent = 'DESCANSO';
                document.body.style.background = 'var(--rest-bg)';
                if (timeSecs <= 3 && timeSecs > 0) playSound('pitido');
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
    playSound('alarma');
    if (ytPlayer && musicaSeleccionada) ytPlayer.stopVideo();
    document.body.style.background = 'var(--default-bg)';
    document.getElementById('label-status').textContent    = 'COMBATES COMPLETADOS';
    document.getElementById('display-time').textContent    = 'OSS';
    document.getElementById('btn-pausa').style.display     = 'none';
    document.getElementById('btn-reiniciar').style.display = 'none';
    document.getElementById('music-bar').style.display     = 'none';
}
