// Convite "Era uma vez, Maria Alice…": monta a história, o cartão, o 3D/AR e o som.
// Sem rede própria, sem analytics; só preferências locais opcionais.
import config from './config.js';
import { contagem, mensagemRsvp, whatsappUrl, preencher, marcadores } from './core.js';
import { criarLinhaDoTempo, DURACAO, MOMENTOS } from './roteiro.js';
import { montarHistoria } from './historia.js';
import { criarAnimais } from './animais.js';
import { criarSom } from './som.js';

const $ = (sel) => document.querySelector(sel);
// se a rede de segurança do <head> já tiver voltado ao modo sem JavaScript, o conto retoma
document.documentElement.classList.add('js');
const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)');
const reduzir = reduzirMovimento.matches;
const CHAVE_EFEITOS = 'convite-maria-alice:efeitos';
const CHAVE_VISTO = 'convite-maria-alice:visto';
const CHAVE_REVER = 'convite-maria-alice:rever';
const nome = config.aniversariante?.nome || '';
const ler = (armazem, k) => { try { return armazem.getItem(k); } catch { return null; } };
const gravar = (armazem, k, v) => { try { armazem.setItem(k, v); } catch { /* ok */ } };

const palco = $('#palco');
const mundo = $('#mundo');
const cartao = $('#convite');
const legenda = $('#conto-legenda');
const mv = $('#miniatura');
const dica = $('#dica-3d');
const aviso = $('#aviso');
const botaoAr = $('#ver-ar');
const notaAr = $('#nota-ar');
const progresso = mv?.querySelector('.miniatura__progresso');
const srcOriginal = mv?.getAttribute('src');
const botaoEntrar = $('#entrar');
const botaoVerConvite = $('#ver-convite');
const botaoPular = $('#pular');
const alca = $('#cartao-alca');

const TEXTO = {
  dica: `Arraste a ${nome} para girar.`,
  dicaTeclado: `Use as setas do teclado para girar a ${nome}.`,
  arFalhou: 'A realidade aumentada não abriu neste aparelho. A miniatura continua aqui para você girar.',
  semWebgl: 'Este navegador não exibe 3D. Esta é uma foto da miniatura.',
  falhaModelo: 'A miniatura 3D não carregou agora. A foto continua aqui.',
};

let avisoTimer;
function mostrarAviso(texto) {
  if (!aviso) return;
  aviso.textContent = texto;
  aviso.classList.add('visivel');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => aviso.classList.remove('visivel'), 3800);
}
function setDica(texto, acao) {
  if (!dica) return;
  dica.textContent = texto;
  if (acao) {
    dica.append(' ');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = acao.rotulo;
    b.addEventListener('click', acao.onClick);
    dica.append(b);
  }
}

// ---------------------------------------------------------------- contagem --
const elContagem = $('#contagem');
if (elContagem) {
  try {
    const c = contagem(config);
    elContagem.textContent = c.texto;
    elContagem.dataset.estado = c.estado;
  } catch { /* mantém o texto gerado no build */ }
}

// ------------------------------------------------------------------- som --
const blocoSom = $('#som');
const botaoMusica = $('#som-musica');
const botaoMudo = $('#som-geral');
const rotuloMusica = $('#som-rotulo');
const som = criarSom({ config, aoMudar: atualizarSom });
function atualizarSom() {
  if (!blocoSom) return;
  const tocando = som.musicaTocando;
  blocoSom.dataset.musica = tocando ? 'tocando' : 'parada';
  blocoSom.dataset.estado = som.disponivel ? 'ok' : 'erro';
  botaoMusica?.setAttribute('aria-pressed', String(tocando));
  if (rotuloMusica) rotuloMusica.textContent = tocando ? 'Pausar música' : 'Tocar música';
  botaoMudo?.setAttribute('aria-pressed', String(som.mudo));
  botaoMudo?.setAttribute('aria-label', som.mudo ? 'Ativar o som' : 'Silenciar todo o som');
}
botaoMusica?.addEventListener('click', () => { som.alternarMusica(); atualizarSom(); });
botaoMudo?.addEventListener('click', () => { som.definirMudo(!som.mudo); atualizarSom(); });
['play', 'pause', 'ended'].forEach((tipo) => document.addEventListener(tipo, atualizarSom, true));
atualizarSom();

// ------------------------------------------------------- efeitos da floresta --
const lerEfeitos = () => ler(localStorage, CHAVE_EFEITOS) !== 'desligados';
let efeitosLigados = lerEfeitos();
const botaoEfeitos = $('#alternar-efeitos');
function aplicarEfeitos() {
  document.documentElement.classList.toggle('sem-efeitos', !efeitosLigados);
  if (botaoEfeitos) {
    botaoEfeitos.hidden = false;
    botaoEfeitos.setAttribute('aria-pressed', String(!efeitosLigados));
    botaoEfeitos.textContent = efeitosLigados ? 'Parar animações da floresta' : 'Retomar animações da floresta';
  }
}
aplicarEfeitos();
botaoEfeitos?.addEventListener('click', () => {
  efeitosLigados = !efeitosLigados;
  gravar(localStorage, CHAVE_EFEITOS, efeitosLigados ? 'ligados' : 'desligados');
  aplicarEfeitos();
});

// ------------------------------------------------------------- suporte 3D --
function temWebgl() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
const suporta3d = !!mv && temWebgl();
let modeloCarregado = false;
let modeloFalhou = false;
let porTeclado = false;

if (!suporta3d && mv) {
  // Sem WebGL: fica a foto renderizada do próprio modelo, no mesmo lugar da clareira.
  const foto = mv.querySelector('.miniatura__poster');
  if (foto) {
    foto.removeAttribute('slot');
    foto.className = 'miniatura__foto';
    mv.replaceWith(foto);
  }
  setDica(TEXTO.semWebgl);
}

// ------------------------------------------------------------- história ---
const falas = (config.historia?.falas || []).map((f) => ({ ...f, texto: preencher(f.texto, marcadores(config)) }));
const linha = criarLinhaDoTempo(DURACAO);
cartao.inert = true;
let estado = 'inicial';
let estadoCartao = 'aberto';
// quem pula (botão, Esc, link) quer ir ao convite: o foco vai para o cartão.
// Na segunda visita o cartão já abre pronto e o foco fica onde o navegador colocou.
let pularParaOCartao = false;

const animais = criarAnimais({
  som,
  reduzir,
  efeitosLigados: () => efeitosLigados,
});

const historia = montarHistoria({
  linha, palco, mundo, cartao, legenda, falas, reduzir,
  aoRevelarCartao: ({ pulando }) => revelarCartao({ focar: !pulando || pularParaOCartao }),
});

linha.em(MOMENTOS.animaisAtivos, () => animais.habilitar());
linha.em(MOMENTOS.cartao, () => { botaoPular.hidden = true; });
if (mv) {
  // durante a história a miniatura não recebe arrastes (evita giros sem querer)
  mv.removeAttribute('camera-controls');
}

// Imagem e voz juntas.
// - Enquanto a narração carrega (rede lenta) ou trava no meio, a cena espera, no máximo 4 s;
//   depois segue sozinha, com as legendas. Se o som falhar, a cena segue na hora.
// - Com as duas tocando, a cena acompanha a voz. Para não "voltar no tempo" de forma visível,
//   uma diferença grande com a voz atrasada é corrigida adiantando a voz, não a imagem.
let esperandoVoz = false;
let limiteEspera = 0;
const seguirSemEsperar = () => {
  clearTimeout(limiteEspera);
  if (!esperandoVoz) return;
  esperandoVoz = false;
  if (estado === 'historia' && !document.hidden) linha.tocar();
};
som.observarNarracao({
  aoEsperar: () => {
    if (estado !== 'historia' || !linha.rodando) return;
    esperandoVoz = true;
    linha.pausar();
    clearTimeout(limiteEspera);
    limiteEspera = setTimeout(seguirSemEsperar, 4000);
  },
  aoTocar: () => {
    if (!esperandoVoz) return;
    const tv = som.narracaoTempo();
    if (tv != null && Math.abs(tv - linha.agora()) > 0.35) linha.ir(tv);
    seguirSemEsperar();
  },
  aoFalhar: seguirSemEsperar,
});
let ultimaSync = 0;
linha.aoQuadro((t) => {
  if (!linha.rodando || Math.abs(t - ultimaSync) < 0.5) return;
  ultimaSync = t;
  const tv = som.narracaoTempo();
  if (tv == null || tv >= DURACAO - 0.5 || Math.abs(tv - t) <= 0.35) return;
  if (tv < t - 1.5) som.irNarracao(t);
  else linha.ir(tv);
});

function revelarCartao({ focar = true } = {}) {
  cartao.classList.add('cartao--visivel');
  cartao.inert = false;
  if (alca) alca.hidden = false;
  if (focar) cartao.focus({ preventScroll: true });
}

function finalizar({ pulando = false } = {}) {
  if (estado === 'final') return;
  estado = 'final';
  palco.classList.add('palco--final');
  botaoPular.hidden = true;
  $('#pagina').hidden = true;
  revelarCartao({ focar: pulando && pularParaOCartao });
  animais.habilitar();
  animais.iniciarRotina();
  if (mv) {
    mv.setAttribute('camera-controls', '');
    mv.resetTurntableRotation?.(0);
  }
  if (estadoSomIniciado) som.musicaDaFloresta();
  atualizarSom();
  gravar(localStorage, CHAVE_VISTO, 'sim');
  const rever = $('#rever');
  if (rever) rever.hidden = false;
}
linha.aoTerminar(finalizar);

let estadoSomIniciado = false;
function entrarNoConto() {
  if (estado !== 'inicial') return;
  estado = 'historia';
  estadoSomIniciado = true;
  som.iniciarHistoria();
  atualizarSom();
  const acoes = $('.abertura__acoes');
  const nota = $('#abertura-nota');
  for (const el of [acoes, nota]) el?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
  botaoPular.hidden = false;
  linha.tocar();
  // foco num lugar útil: o botão de pular (o de entrar vai sumir)
  botaoPular.focus({ preventScroll: true });
}

function pular() {
  if (estado === 'final') return;
  pularParaOCartao = true;
  som.pararHistoria();
  estado = 'pulando';
  linha.terminar({ pulando: true });
}

botaoEntrar?.addEventListener('click', entrarNoConto);
botaoVerConvite?.addEventListener('click', (e) => { e.preventDefault(); pular(); });
botaoPular?.addEventListener('click', pular);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && estado === 'historia') pular();
});
$('.pular-link')?.addEventListener('click', (e) => { e.preventDefault(); pular(); });
$('#rever')?.addEventListener('click', () => {
  gravar(sessionStorage, CHAVE_REVER, 'sim');
  location.reload();
});

// aba em segundo plano: tudo pausa e volta de onde parou
document.addEventListener('visibilitychange', () => {
  palco.classList.toggle('palco--pausado', document.hidden);
  if (document.hidden) {
    if (linha.rodando) { linha.pausar(); palco.dataset.retomar = '1'; }
    som.suspender();
    animais.pausar();
  } else {
    if (palco.dataset.retomar) { delete palco.dataset.retomar; linha.tocar(); }
    som.retomar();
    animais.retomar();
  }
});

// cartão: recolher / abrir
alca?.addEventListener('click', () => {
  estadoCartao = estadoCartao === 'aberto' ? 'recolhido' : 'aberto';
  cartao.classList.toggle('cartao--recolhido', estadoCartao === 'recolhido');
  alca.setAttribute('aria-expanded', String(estadoCartao === 'aberto'));
  alca.querySelector('.cartao__alca-texto').textContent = estadoCartao === 'aberto' ? 'Recolher o convite' : 'Abrir o convite';
  if (estado === 'final') historia.reenquadrar(estadoCartao);
});

// tela girou / mudou de tamanho: refaz as medidas da câmera e do enquadramento
let redim = 0;
addEventListener('resize', () => {
  clearTimeout(redim);
  redim = setTimeout(() => {
    const t = linha.agora();
    historia.reconstruir();
    linha.ir(t, { pulando: true });
    if (estado === 'final') historia.reenquadrar(estadoCartao, { animar: false });
  }, 160);
});

// início: primeira visita mostra a página do livro; quem já viu vai direto ao convite
const jaViu = ler(localStorage, CHAVE_VISTO) === 'sim';
const quisRever = ler(sessionStorage, CHAVE_REVER) === 'sim';
if (quisRever) { try { sessionStorage.removeItem(CHAVE_REVER); } catch { /* ok */ } }
if (config.historia?.ativa === false || (jaViu && config.historia?.segundaVisitaDiretoNoCartao !== false && !quisRever)) {
  linha.terminar({ pulando: true });
} else {
  linha.ir(0);
  if (botaoEntrar) botaoEntrar.hidden = false;
  const nota = $('#abertura-nota');
  if (nota) nota.hidden = false;
}
// a floresta só aparece já na composição certa (antes disso, a janela mostra só o céu)
requestAnimationFrame(() => document.documentElement.classList.add('conto-pronto'));

// ------------------------------------------------------ eventos do modelo --
function atualizarDica() {
  if (!suporta3d || modeloFalhou) return;
  setDica(porTeclado ? TEXTO.dicaTeclado : TEXTO.dica);
}
function atualizarAr() {
  if (!botaoAr || !mv) return;
  const pode = suporta3d && mv.canActivateAR === true;
  botaoAr.hidden = !pode;
  if (notaAr) notaAr.hidden = pode || !(suporta3d && modeloCarregado);
  atualizarDica();
}

if (suporta3d) {
  mv.addEventListener('progress', (ev) => {
    const total = ev.detail?.totalProgress ?? 0;
    if (progresso && !modeloCarregado) {
      progresso.style.setProperty('--progresso', `${Math.round(total * 100)}%`);
      progresso.classList.toggle('concluido', total >= 1);
    }
  });
  const aoCarregar = () => {
    modeloCarregado = true;
    modeloFalhou = false;
    progresso?.classList.add('concluido');
    setTimeout(atualizarAr, 0);
    setTimeout(atualizarAr, 600);
  };
  const aoFalhar = (detalhe) => {
    progresso?.classList.add('concluido');
    if (detalhe?.type === 'webglcontextlost') { setDica(TEXTO.semWebgl); return; }
    modeloFalhou = true;
    setDica(TEXTO.falhaModelo, {
      rotulo: 'Tentar de novo',
      onClick: () => {
        const url = new URL(srcOriginal, location.href);
        url.searchParams.set('tentativa', String(Date.now()));
        modeloFalhou = false;
        setDica('Carregando a miniatura…');
        progresso?.classList.remove('concluido');
        mv.setAttribute('src', url.href);
      },
    });
  };
  mv.addEventListener('load', aoCarregar);
  mv.addEventListener('error', (ev) => aoFalhar(ev.detail));
  // O modelo pode ter carregado (ou falhado) antes deste script: o <head> guardou o evento.
  if (mv.loaded || window.__miniaturaCarregou) aoCarregar();
  else if (window.__miniaturaErro) aoFalhar(window.__miniaturaErro);
  mv.addEventListener('ar-status', (ev) => {
    if (ev.detail?.status === 'failed') {
      setDica(TEXTO.arFalhou);
      mostrarAviso(TEXTO.arFalhou);
      setTimeout(atualizarAr, 400);
    }
  });
  // fase de captura: o model-viewer trata as setas dentro do próprio shadow DOM
  mv.addEventListener('keydown', (e) => {
    if (e.key.startsWith('Arrow') && !porTeclado) { porTeclado = true; atualizarDica(); }
  }, true);
  // Botão do banner do AR Quick Look (iPhone): volta para a confirmação de presença.
  mv.addEventListener('quick-look-button-tapped', () => {
    if (estadoCartao === 'recolhido') alca?.click();
    $('#rsvp-sim')?.focus({ preventScroll: true });
  });
}

addEventListener('hashchange', () => {
  if (location.hash === '#model-viewer-no-ar-fallback') {
    mostrarAviso(TEXTO.arFalhou);
    setTimeout(atualizarAr, 400);
  }
});

botaoAr?.addEventListener('click', () => {
  // Precisa ser chamado direto do toque (exigência do Scene Viewer e do Quick Look).
  som.suspender();
  mv.activateAR();
});

// iPhone/iPad: o Quick Look exige o tipo model/vnd.usdz+zip. Se o servidor não enviar,
// removemos ios-src e o model-viewer gera o USDZ no próprio aparelho a partir do GLB.
const ehIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ehAndroid = /Android/i.test(navigator.userAgent);
if (suporta3d && ehIos && mv.getAttribute('ios-src')) {
  const usdz = new URL(mv.getAttribute('ios-src'), location.href);
  usdz.hash = '';
  fetch(usdz, { method: 'HEAD', cache: 'no-store' })
    .then((r) => {
      const tipo = r.headers.get('content-type') || '';
      if (!r.ok || !/usdz/i.test(tipo)) mv.removeAttribute('ios-src');
    })
    .catch(() => { /* sem rede: mantém o arquivo pronto */ });
}

// "Salvar na agenda": no Android abre o Google Agenda; nos demais, o arquivo .ics
const salvarAgenda = $('#salvar-agenda');
if (salvarAgenda && ehAndroid && salvarAgenda.dataset.google) {
  salvarAgenda.href = salvarAgenda.dataset.google;
  salvarAgenda.removeAttribute('download');
  salvarAgenda.target = '_blank';
  salvarAgenda.rel = 'noopener noreferrer';
}

// ------------------------------------------------------------------ RSVP ---
const campoNome = $('#nome-convidado');
const rsvpSim = $('#rsvp-sim');
const rsvpNao = $('#rsvp-nao');
function atualizarRsvp() {
  const numero = config.rsvp?.whatsapp;
  if (!numero) return;
  const n = campoNome?.value ?? '';
  if (rsvpSim) rsvpSim.href = whatsappUrl(numero, mensagemRsvp(config, 'sim', n));
  if (rsvpNao) rsvpNao.href = whatsappUrl(numero, mensagemRsvp(config, 'nao', n));
}
campoNome?.addEventListener('input', atualizarRsvp);
campoNome?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); campoNome.blur(); }
});
atualizarRsvp();

// ----------------------------------------------------------- copiar endereço
const copiar = $('#copiar-endereco');
if (copiar && navigator.clipboard && window.isSecureContext && config.local?.endereco) {
  copiar.hidden = false;
  copiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(config.local.endereco);
      mostrarAviso('Endereço copiado');
    } catch {
      mostrarAviso('Não foi possível copiar. Toque e segure o endereço para copiar.');
    }
  });
}

// --------------------------------------------------------------- testes ---
// Com ?teste na URL, expõe o relógio da história para os testes automáticos.
if (new URLSearchParams(location.search).has('teste')) {
  window.__conto = {
    linha,
    ir: (t) => linha.ir(t, { pulando: true }),
    estado: () => estado,
    animais,
    som,
  };
}
