// Som do convite: narração, música, ambiente da floresta e efeitos dos animais.
//
// Regras:
// - Nada toca antes de um toque do visitante (exigência do Safari no iPhone/iPad).
// - Só elementos <audio>: no iPhone o Web Audio costuma ser silenciado pela chave de
//   silêncio do aparelho, e o volume não pode ser mudado por código. Por isso o equilíbrio
//   entre voz e música já vem pronto nos arquivos (masterização).
// - Arquivos separados (narração, música, ambiente, efeitos) para controlar cada um.
// - Se um arquivo falhar, a história continua sem ele, com as legendas.

const CHAVE_MUDO = 'convite-maria-alice:mudo';
const CHAVE_MUSICA = 'convite-maria-alice:musica';
const ler = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento: tudo bem */ } };

export function criarSom({ config, base = 'assets/audio/', aoMudar }) {
  const cfg = config.som || {};
  const criar = (arquivo, { loop = false } = {}) => {
    const a = new Audio();
    a.preload = 'none';
    a.loop = loop;
    a.src = base + arquivo;
    a.addEventListener('error', () => { a.dataset.erro = '1'; aoMudar?.(); });
    return a;
  };
  const el = {
    narracao: cfg.narracao !== false ? criar('narracao-conto.mp3') : null,
    fala: cfg.narracao !== false ? criar('narracao-passaro.mp3') : null,
    conto: cfg.musica !== false ? criar('trilha-conto.mp3') : null,
    floresta: cfg.musica !== false ? criar('trilha-floresta.mp3', { loop: true }) : null,
    ambiente: cfg.efeitos !== false ? criar('ambiente-floresta.mp3', { loop: true }) : null,
    coelho: cfg.efeitos !== false ? criar('efeito-coelho.mp3') : null,
    passaro: cfg.efeitos !== false ? criar('efeito-passaro.mp3') : null,
    flores: cfg.efeitos !== false ? criar('efeito-flores.mp3') : null,
  };
  const todos = () => Object.values(el).filter(Boolean);

  let mudo = ler(CHAVE_MUDO) === 'sim';
  let musicaLigada = ler(CHAVE_MUSICA) !== 'desligada';
  let historiaTocando = false;
  let suspensos = [];

  const ok = (a) => a && a.dataset.erro !== '1';
  function tocar(a, { doInicio = false } = {}) {
    if (!ok(a)) return Promise.resolve(false);
    a.muted = mudo;
    if (doInicio) { try { a.currentTime = 0; } catch { /* ainda sem dados */ } }
    a.dataset.usando = '1';
    try {
      const p = a.play();
      return (p && p.then ? p : Promise.resolve()).then(() => true, () => false);
    } catch {
      return Promise.resolve(false);
    }
  }
  function parar(a) {
    if (!a) return;
    delete a.dataset.usando;
    a.pause();
  }
  /** Dentro de um toque: "acorda" um elemento para poder tocar depois sem novo toque (iOS). */
  function acordar(a) {
    if (!ok(a) || a.dataset.usando) return;
    a.muted = true;
    try {
      const p = a.play();
      p?.then(() => { if (!a.dataset.usando) { a.pause(); try { a.currentTime = 0; } catch { /* ok */ } } a.muted = mudo; }, () => { a.muted = mudo; });
    } catch { a.muted = mudo; }
  }

  function iniciarHistoria() {
    historiaTocando = true;
    tocar(el.narracao, { doInicio: true });
    if (musicaLigada) tocar(el.conto, { doInicio: true });
    tocar(el.ambiente, { doInicio: true });
    acordar(el.floresta);
    aoMudar?.();
  }

  function pararHistoria() {
    historiaTocando = false;
    parar(el.narracao);
    parar(el.conto);
    aoMudar?.();
  }

  /** Depois da história (ou ao pular): a trilha da floresta em loop, se a música estiver ligada. */
  function musicaDaFloresta({ comAmbiente = true } = {}) {
    historiaTocando = false;
    parar(el.conto);
    if (musicaLigada) tocar(el.floresta);
    if (comAmbiente && el.ambiente?.dataset.usando) tocar(el.ambiente);
    aoMudar?.();
  }

  /** Avisa quando a narração precisa esperar dados (rede lenta), volta a tocar ou falha. */
  function observarNarracao({ aoEsperar, aoTocar, aoFalhar } = {}) {
    const a = el.narracao;
    if (!a) return;
    a.addEventListener('waiting', () => { if (a.dataset.usando) aoEsperar?.(); });
    a.addEventListener('playing', () => aoTocar?.());
    a.addEventListener('error', () => aoFalhar?.());
  }

  /** Leva a voz a um instante (quando a imagem não pode voltar atrás). */
  function irNarracao(t) {
    const a = el.narracao;
    if (!ok(a)) return;
    try { a.currentTime = t; } catch { /* ainda sem dados */ }
  }

  function narracaoTempo() {
    const a = el.narracao;
    if (!ok(a) || a.paused || a.readyState < 3) return null;
    return a.currentTime;
  }

  function efeito(nome) {
    const a = el[nome];
    if (!ok(a) || mudo) return;
    try { a.currentTime = 0; } catch { /* ok */ }
    tocar(a);
  }

  /** A fala do pássaro só toca se a narradora não estiver falando. */
  function falaPassaro() {
    if (!ok(el.fala) || mudo) return false;
    if (el.narracao && !el.narracao.paused && !el.narracao.ended) return false;
    try { el.fala.currentTime = 0; } catch { /* ok */ }
    tocar(el.fala);
    return true;
  }

  function definirMudo(v) {
    mudo = v;
    gravar(CHAVE_MUDO, v ? 'sim' : 'nao');
    for (const a of todos()) a.muted = v;
    aoMudar?.();
  }

  /** Botão de música: liga/desliga a música (história: trilha do conto; depois: trilha da floresta). */
  function alternarMusica() {
    musicaLigada = !musicaLigada;
    gravar(CHAVE_MUSICA, musicaLigada ? 'ligada' : 'desligada');
    if (musicaLigada) {
      if (historiaTocando) tocar(el.conto);
      else tocar(el.floresta);
    } else {
      parar(el.conto);
      parar(el.floresta);
    }
    aoMudar?.();
  }

  function suspender() {
    suspensos = todos().filter((a) => !a.paused);
    for (const a of suspensos) a.pause();
  }
  function retomar() {
    for (const a of suspensos) if (a.dataset.usando) tocar(a);
    suspensos = [];
  }
  function pararTudo() {
    for (const a of todos()) parar(a);
    historiaTocando = false;
    aoMudar?.();
  }

  return {
    iniciarHistoria, pararHistoria, musicaDaFloresta, narracaoTempo, observarNarracao, irNarracao, efeito, falaPassaro,
    definirMudo, alternarMusica, suspender, retomar, pararTudo,
    get mudo() { return mudo; },
    get musicaLigada() { return musicaLigada; },
    get musicaTocando() { return [el.conto, el.floresta].some((a) => a && !a.paused); },
    get disponivel() { return [el.conto, el.floresta].some(ok); },
  };
}
