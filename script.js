// Variables globales
const CONST = 4;
const DURACION = 120;

// Solo 2 hojas (1er y 2º semestre)
const urls = {
  SUP1: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTb2p1IwuAK7jqnep9w4K5Vnmi-66ugFXv8JYTWRuDEIWDv7hGGlj7qk6SyU7ulW9DklaZ4-vIuehou/pub?gid=171014731&single=true&output=csv',
  SUP2: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTb2p1IwuAK7jqnep9w4K5Vnmi-66ugFXv8JYTWRuDEIWDv7hGGlj7qk6SyU7ulW9DklaZ4-vIuehou/pub?gid=839714858&single=true&output=csv'
};

let datos = [];
let seleccion = [];
let fragmentos = [];
let estados = [];
let audio = new Audio();
let actual = -1;
let finTimeout = null;

function loadCSV(clave) {
  // Detener audio activo si lo hay
  if (audio && !audio.paused) {
    audio.pause();
  }
  audio.src = ''; // limpia el recurso
  actual = -1;
  if (finTimeout) {
    clearTimeout(finTimeout);
    finTimeout = null;
  }

  document.getElementById('cargando').style.display = 'block';

  fetch(urls[clave])
    .then(res => res.text())
    .then(csv => {
      const parsed = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true
      }).data;

      // Acepta filas indefinidas: filtra filas sin contenido real
      datos = parsed
        .map(row => ({
          autor: (row.Autor ?? '').trim(),
          obra: (row.Obra ?? '').trim(),
          url: (row.URL_audio ?? '').trim()
        }))
        .filter(d => d.autor && d.obra && d.url);

      // Si hay menos obras que CONST, no se puede montar el juego bien
      if (datos.length < CONST) {
        document.getElementById('cargando').style.display = 'none';
        const audiciones = document.getElementById('audiciones');
        audiciones.innerHTML = '';
        const aviso = document.createElement('div');
        aviso.className = 'mensaje-final bajo';
        aviso.textContent = `No hay suficientes filas con Autor/Obra/URL_audio (hay ${datos.length}).`;
        audiciones.appendChild(aviso);
        return;
      }

      iniciarAudiciones();
    })
    .catch(() => {
      document.getElementById('cargando').style.display = 'none';
      const audiciones = document.getElementById('audiciones');
      audiciones.innerHTML = '';
      const aviso = document.createElement('div');
      aviso.className = 'mensaje-final bajo';
      aviso.textContent = 'Error al cargar el CSV.';
      audiciones.appendChild(aviso);
    });
}

function iniciarAudiciones() {
  seleccion = [];
  fragmentos = [];
  estados = Array(CONST).fill('stop');
  actual = -1;

  const audiciones = document.getElementById('audiciones');
  audiciones.innerHTML = '';

  const contenedor = document.createElement('div');
  contenedor.className = 'audiciones-columna';

  while (seleccion.length < CONST) {
    const idx = Math.floor(Math.random() * datos.length);
    if (!seleccion.includes(idx)) {
      seleccion.push(idx);
      fragmentos.push(null);
    }
  }

  seleccion.forEach((idx, i) => {
    const caja = document.createElement('div');
    caja.className = 'audicion-caja';

    const boton = document.createElement('button');
    boton.className = 'boton-audicion';
    boton.textContent = `Audición ${i + 1}`;
    boton.onclick = () => reproducir(i, datos[idx].url, boton);
    caja.appendChild(boton);

    const zona = document.createElement('div');
    zona.className = 'zona-solucion';

    const selector = document.createElement('select');
    selector.className = 'selector-solucion';

    const opcionVacia = document.createElement('option');
    opcionVacia.value = '';
    opcionVacia.textContent = '—';
    opcionVacia.disabled = false;
    opcionVacia.selected = true;
    selector.appendChild(opcionVacia);

    datos.forEach(d => {
      const opcion = document.createElement('option');
      opcion.value = `${d.autor}: ${d.obra}`;
      opcion.textContent = `${d.autor}: ${d.obra}`;
      selector.appendChild(opcion);
    });

    zona.appendChild(selector);
    caja.appendChild(zona);

    contenedor.appendChild(caja);
  });

  audiciones.appendChild(contenedor);

  const btnSoluciones = document.createElement('button');
  btnSoluciones.id = 'mostrar-soluciones';
  btnSoluciones.textContent = 'Soluciones';
  btnSoluciones.className = 'boton-solucion';

  btnSoluciones.onclick = () => {
    const zonas = document.querySelectorAll('.zona-solucion');
    let aciertos = 0;

    zonas.forEach((zona, i) => {
      const selector = zona.querySelector('select');
      const correcta = `${datos[seleccion[i]].autor}: ${datos[seleccion[i]].obra}`;
      const elegida = selector.value;

      selector.classList.remove('correcto', 'incorrecto');
      if (elegida === correcta) {
        selector.classList.add('correcto');
        aciertos++;
      } else {
        selector.classList.add('incorrecto');
      }

      selector.disabled = true;
    });

    btnSoluciones.disabled = true;

    const mensaje = document.getElementById('mensaje-final');
    mensaje.className = 'mensaje-final';

    if (aciertos === CONST) {
      mensaje.textContent = `✔️ ¡Perfecto! ${aciertos} de ${CONST} respuestas correctas.`;
      mensaje.classList.add('exito');
    } else if (aciertos >= CONST - 1) {
      mensaje.textContent = `👍 Muy bien: ${aciertos} de ${CONST} aciertos.`;
      mensaje.classList.add('bien');
    } else if (aciertos >= CONST / 2) {
      mensaje.textContent = `➗ Has acertado ${aciertos} de ${CONST}. ¡Sigue practicando!`;
      mensaje.classList.add('medio');
    } else {
      mensaje.textContent = `❗ Solo ${aciertos} de ${CONST} aciertos. Intenta repasarlo.`;
      mensaje.classList.add('bajo');
    }
  };

  audiciones.appendChild(btnSoluciones);

  const mensajeFinal = document.createElement('div');
  mensajeFinal.id = 'mensaje-final';
  mensajeFinal.className = 'mensaje-final';
  audiciones.appendChild(mensajeFinal);

  document.getElementById('cargando').style.display = 'none';
}

function reproducir(i, url, btn) {
  if (finTimeout) {
    clearTimeout(finTimeout);
    finTimeout = null;
  }

  if (actual === i) {
    if (!audio.paused) {
      audio.pause();
      estados[i] = 'pause';
      btn.classList.remove('activo');
      btn.classList.add('pausado');
    } else {
      audio.play();
      estados[i] = 'play';
      btn.classList.remove('pausado');
      btn.classList.add('activo');
    }
    return;
  }

  if (actual !== -1) {
    estados[actual] = 'stop';
    const btnAnt = document.querySelectorAll('.boton-audicion')[actual];
    btnAnt.classList.remove('activo', 'pausado');
    audio.pause();
  }

  audio = new Audio(url);
  audio.addEventListener('loadedmetadata', () => {
    if (!fragmentos[i]) {
      const maxInicio = Math.max(0, audio.duration - DURACION);
      fragmentos[i] = Math.random() * maxInicio;
    }
    audio.currentTime = fragmentos[i];
    audio.play();
    estados[i] = 'play';
    btn.classList.add('activo');
    actual = i;

    finTimeout = setTimeout(() => {
      audio.pause();
      btn.classList.remove('activo', 'pausado');
      estados[i] = 'stop';
      actual = -1;
    }, DURACION * 1000);
  });

  audio.addEventListener('ended', () => {
    if (finTimeout) {
      clearTimeout(finTimeout);
      finTimeout = null;
    }
    btn.classList.remove('activo', 'pausado');
    estados[i] = 'stop';
    actual = -1;
  });
}
