// Trilha sonora: tenta tocar sozinha; se o navegador bloquear, começa no primeiro toque.
// Nada é enviado a servidores. A preferência "música desligada" fica só neste navegador.

const CHAVE = 'convite-maria-alice:musica';
const ler = () => { try { return localStorage.getItem(CHAVE); } catch { return null; } };
const gravar = (v) => { try { localStorage.setItem(CHAVE, v); } catch { /* modo privado: ignora */ } };

export function iniciarMusica({ config, mostrarAviso }) {
  const cfg = config.efeitos?.musica || {};
  const caixa = document.getElementById('musica');
  const audio = document.getElementById('trilha');
  if (!caixa || !audio || cfg.ativa === false) return { tentarAutoplay() {} };

  const botao = document.getElementById('musica-tocar');
  const som = document.getElementById('musica-som');
  const rotulo = document.getElementById('musica-rotulo');
  const dica = document.getElementById('musica-dica');
  const volumeAlvo = Math.min(1, Math.max(0, Number(cfg.volume ?? 0.55)));

  // parada | tocando | pausada | bloqueada | suspensa (aba em segundo plano) | erro
  let estado = 'parada';
  let rampa = 0;
  let dicaTimer;

  function definir(novo) {
    estado = novo;
    caixa.dataset.estado = novo;
    const tocando = novo === 'tocando';
    botao.setAttribute('aria-pressed', String(tocando));
    rotulo.textContent = tocando ? 'Pausar música' : novo === 'bloqueada' ? 'Ouvir a trilha' : 'Tocar música';
  }

  function rampaVolume(destino, ms, depois) {
    cancelAnimationFrame(rampa);
    let inicio;
    let origem;
    try { origem = audio.volume; } catch { origem = destino; }
    const passo = (t) => {
      inicio ??= t;
      const k = Math.min(1, (t - inicio) / ms);
      try { audio.volume = origem + (destino - origem) * k; } catch { /* iOS: volume é do aparelho */ }
      if (k < 1) rampa = requestAnimationFrame(passo);
      else depois?.();
    };
    rampa = requestAnimationFrame(passo);
  }

  async function tocar() {
    if (estado === 'erro') return false;
    if (audio.preload !== 'auto') audio.preload = 'auto';
    try { audio.volume = 0; } catch { /* iOS */ }
    try {
      await audio.play();
      definir('tocando');
      esconderDica();
      rampaVolume(volumeAlvo, 2600);
      return true;
    } catch (erro) {
      // NotAllowedError = bloqueio de reprodução automática. Não é erro para o convidado.
      if (erro?.name === 'NotAllowedError') definir('bloqueada');
      else if (erro?.name === 'NotSupportedError' || audio.error) definir('erro');
      else definir('pausada');
      return false;
    }
  }

  function pausar(novoEstado = 'pausada', imediato = false) {
    definir(novoEstado);
    if (audio.paused) return;
    if (imediato) { cancelAnimationFrame(rampa); audio.pause(); return; }
    rampaVolume(0, 450, () => audio.pause());
  }

  function mostrarDica() {
    if (!dica) return;
    dica.hidden = false;
    clearTimeout(dicaTimer);
    dicaTimer = setTimeout(esconderDica, 7000);
  }
  function esconderDica() { if (dica) dica.hidden = true; clearTimeout(dicaTimer); }

  // ---------------------------------------------------------------- controles
  botao.addEventListener('click', async () => {
    if (estado === 'tocando') {
      pausar();
      gravar('desligada');
    } else {
      gravar('ligada');
      const ok = await tocar();
      if (!ok && estado !== 'erro') mostrarAviso?.('Não foi possível tocar a música agora.');
    }
  });
  som.addEventListener('click', () => {
    audio.muted = !audio.muted;
    som.setAttribute('aria-pressed', String(audio.muted));
    som.setAttribute('aria-label', audio.muted ? 'Ativar som da música' : 'Silenciar música');
  });

  // Primeiro toque/tecla em qualquer lugar: começa a música se o autoplay foi bloqueado.
  function primeiroGesto(ev) {
    if (caixa.contains(ev.target)) return; // os botões da música tratam o próprio clique
    if (estado !== 'bloqueada' || ler() === 'desligada') return;
    tocar();
  }
  for (const tipo of ['pointerup', 'keydown', 'touchend']) {
    document.addEventListener(tipo, primeiroGesto, { capture: true, passive: true });
  }

  // Aba em segundo plano, AR aberta, outro app: pausa; ao voltar, retoma.
  // (pausa imediata: em aba escondida o navegador não roda a animação da rampa de volume)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && estado === 'tocando') pausar('suspensa', true);
    else if (!document.hidden && estado === 'suspensa') tocar();
  });
  addEventListener('pagehide', () => { if (estado === 'tocando') pausar('suspensa', true); });

  // Arquivo indisponível: com <source>, o erro chega no próprio <source>.
  const falhou = () => { if (estado !== 'tocando') definir('erro'); };
  audio.addEventListener('error', falhou);
  audio.querySelector('source')?.addEventListener('error', falhou);

  definir('parada');

  return {
    async tentarAutoplay() {
      if (cfg.tentarAutoplay === false || ler() === 'desligada' || estado === 'tocando') return;
      const ok = await tocar();
      if (!ok && estado === 'bloqueada') mostrarDica();
    },
    estado: () => estado,
  };
}
