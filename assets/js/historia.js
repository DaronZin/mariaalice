// O roteiro da introdução: cria, numa linha do tempo, todas as animações das 5 cenas.
//
//   0 s   Cena 1  a página do livro (narração começa)
//   5 s   Cena 2  as bordas de papel abrem e a ilustração ganha profundidade
//   12 s  Cena 3  a câmera avança pelo caminho; coelho, pássaro e borboleta aparecem
//   20 s  Cena 4  a clareira: luz dourada e a Maria Alice aparece, virando para nós
//   27 s  Cena 5  o convite sobe; a cena se reenquadra para o cartão não cobrir nada
//   33 s  fim: tudo parado no estado final, animais respondendo ao toque
//
// Com "reduzir movimento", a mesma história acontece com cortes e esmaecimentos, sem
// câmera, sem corrida e sem voos.

import { CAMERA, keyframesDaCamera, medirPlanos, encaixar, comoTransform } from './camera.js';
import { DURACAO, MOMENTOS as M } from './roteiro.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);

export function montarHistoria({ linha, palco, mundo, cartao, legenda, falas, reduzir, aoRevelarCartao }) {
  const pagina = $('#pagina');
  const modelo = $('.plano--modelo');
  const mv = $('#miniatura');
  const cartaoEl = cartao;
  let dinamicas = [];
  let estadoCartao = 'aberto';

  // ------------------------------------------------- partes que dependem da tela --
  function geometria() {
    const largura = palco.clientWidth;
    const altura = palco.clientHeight;
    const lateral = cartaoEl.offsetWidth < largura * 0.7;
    return { largura, altura, lateral };
  }

  /** Área livre (sem o cartão e sem os controles do topo) onde a cena deve caber. */
  function areaLivre(g, estado = estadoCartao) {
    const topo = 60;
    const margem = 8;
    if (g.lateral) {
      return { x: 0, y: topo, largura: Math.max(120, cartaoEl.offsetLeft - margem), altura: g.altura - topo - margem };
    }
    const alturaCartao = estado === 'recolhido' ? cartaoEl.offsetHeight : cartaoEl.offsetHeight;
    return { x: 0, y: topo, largura: g.largura, altura: Math.max(160, g.altura - alturaCartao - topo - margem) };
  }

  /** Retângulo (em px, sem transformação) do grupo Maria Alice + animais na clareira. */
  function grupoDaClareira(g) {
    const H = g.altura;
    return { x: g.largura / 2 - 0.4 * H, y: 0.27 * H, largura: 0.8 * H, altura: 0.72 * H };
  }

  function enquadramento(estado = estadoCartao) {
    const g = geometria();
    return encaixar(grupoDaClareira(g), areaLivre(g, estado));
  }

  /** Deslocamento do mundo na Cena 1: a composição centrada na "janela" da página. */
  function deslocamentoDaPagina(g) {
    const j = $('.pagina__janela');
    if (!j) return { tx: 0, ty: 0, cx: g.largura / 2, cy: g.altura / 2 };
    const cx = j.offsetLeft + j.offsetWidth / 2;
    const cy = j.offsetTop + j.offsetHeight / 2;
    return { tx: cx - g.largura / 2, ty: Math.min(0.14 * g.altura, cy - g.altura * (CAMERA.focoY + 0.04)), cx, cy };
  }

  /** Com o cartão ao lado (telas largas), folhas e vaga-lumes ficam só na área livre,
   *  para nunca passarem na frente do rosto da Maria Alice reenquadrada. */
  function areaDasParticulas(g = geometria()) {
    const area = areaLivre(g);
    const direita = g.lateral ? Math.max(0, g.largura - (area.x + area.largura)) : 0;
    palco.style.setProperty('--particulas-direita', `${Math.round(direita)}px`);
  }

  function construirDinamicas() {
    for (const a of dinamicas) linha.remover(a);
    dinamicas = [];
    const g = geometria();
    palco.style.setProperty('--h', `${g.altura}px`);
    areaDasParticulas(g);
    const add = (a) => { if (a) dinamicas.push(a); };

    // câmera: um conjunto de keyframes por plano
    const planos = medirPlanos(mundo);
    if (!reduzir) {
      for (const k of keyframesDaCamera(planos, { largura: g.largura, altura: g.altura, duracao: DURACAO })) {
        add(linha.animar(k.plano.el, k.transform, { inicio: 0, duracao: DURACAO }));
        if (k.opacidade) add(linha.animar(k.plano.el, k.opacidade, { inicio: 0, duracao: DURACAO }));
      }
    } else {
      for (const p of planos) if (p.entrada) add(linha.animar(p.el, [{ opacity: 0 }, { opacity: 0 }], { inicio: 0, duracao: DURACAO }));
    }

    // o mundo inteiro: centrado na página (Cena 1), depois livre, e no fim reenquadrado
    const pg = deslocamentoDaPagina(g);
    const F = enquadramento('aberto');
    const T = (s, tx, ty) => `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s})`;
    const kb = 1.03; // leve aproximação da página, ainda "plana"
    const kbTx = pg.tx + pg.cx * (1 - kb);
    const kbTy = pg.ty + pg.cy * (1 - kb);
    const off = (t) => t / DURACAO;
    const quadros = reduzir
      ? [
        { offset: 0, transform: T(1, pg.tx, pg.ty), easing: 'step-end' },
        { offset: off(M.transicao + 1), transform: T(1, 0, 0), easing: 'step-end' },
        { offset: off(M.cartao), transform: T(1, 0, 0), easing: 'step-end' },
        { offset: off(M.cartao + 0.6), transform: comoTransform(F) },
        { offset: 1, transform: comoTransform(F) },
      ]
      : [
        { offset: 0, transform: T(1, pg.tx, pg.ty) },
        { offset: off(M.transicao), transform: T(kb, kbTx, kbTy), easing: 'cubic-bezier(.45,0,.25,1)' },
        { offset: off(M.transicao + 2.6), transform: T(1, 0, 0) },
        { offset: off(M.cartao), transform: T(1, 0, 0), easing: 'cubic-bezier(.3,0,.2,1)' },
        { offset: off(M.cartao + 1.2), transform: comoTransform(F) },
        { offset: 1, transform: comoTransform(F) },
      ];
    add(linha.animar(mundo, quadros, { inicio: 0, duracao: DURACAO }));

    // o cartão sobe (retrato) ou entra pela direita (paisagem)
    const fora = g.lateral ? 'translateX(110%)' : 'translateY(105%)';
    add(linha.animar(cartaoEl, reduzir
      ? [{ opacity: 0, transform: 'none' }, { opacity: 1, transform: 'none' }]
      : [{ transform: fora }, { transform: 'none' }],
    { inicio: M.cartao, duracao: reduzir ? 0.8 : 1.2, easing: 'cubic-bezier(.2,.8,.2,1)' }));

    posicionarLegenda(linha.agora());
  }

  // ------------------------------------------------------------ legenda ----
  function posicionarLegenda(t) {
    const g = geometria();
    let x = g.largura / 2;
    let y = 70;
    if (t < M.transicao + 0.4 && !pagina.hidden) {
      const j = $('.pagina__janela');
      x = j.offsetLeft + j.offsetWidth / 2;
      y = j.offsetTop + 12;
    } else if (t >= M.cartao - 0.1) {
      const area = areaLivre(g);
      x = area.x + area.largura / 2;
      y = 66;
    }
    palco.style.setProperty('--legenda-x', `${x}px`);
    palco.style.setProperty('--legenda-topo', `${y}px`);
  }
  linha.em(M.transicao + 0.4, (t) => posicionarLegenda(t));
  linha.em(M.cartao - 0.1, (t) => posicionarLegenda(t));

  let falaAtual = -1;
  falas.forEach((f, i) => {
    linha.em(f.inicio, (_, { pulando }) => {
      if (pulando) return;
      falaAtual = i;
      legenda.textContent = f.texto;
      legenda.classList.add('visivel');
    });
    linha.em(f.fim, () => {
      if (falaAtual !== i) return;
      legenda.classList.remove('visivel');
    });
  });
  linha.aoTerminar(() => { legenda.classList.remove('visivel'); legenda.textContent = ''; });

  // ---------------------------------------------------- partes fixas -------
  const animar = (sel, quadros, opcoes) => {
    const el = typeof sel === 'string' ? $(sel) : sel;
    return el ? linha.animar(el, quadros, opcoes) : null;
  };
  const ease = 'cubic-bezier(.45,0,.25,1)';

  // Cena 1 → 2: a página abre
  if (reduzir) {
    for (const s of ['.pagina__papel--topo', '.pagina__papel--base', '.pagina__papel--esq', '.pagina__papel--dir', '.pagina__janela', '.pagina__grao', '#abertura']) {
      animar(s, [{ opacity: 1 }, { opacity: 0 }], { inicio: M.transicao, duracao: 1.2 });
    }
  } else {
    animar('.pagina__papel--topo', [{ transform: 'none' }, { transform: 'translateY(-102%)' }], { inicio: M.transicao, duracao: 2.2, easing: ease });
    animar('.pagina__papel--base', [{ transform: 'none' }, { transform: 'translateY(102%)' }], { inicio: M.transicao, duracao: 2.2, easing: ease });
    animar('.pagina__papel--esq', [{ transform: 'none' }, { transform: 'translateX(-102%)' }], { inicio: M.transicao, duracao: 2.2, easing: ease });
    animar('.pagina__papel--dir', [{ transform: 'none' }, { transform: 'translateX(102%)' }], { inicio: M.transicao, duracao: 2.2, easing: ease });
    // a moldura e o grão da janela somem antes de as bordas andarem: senão sobra uma "emenda"
    // clara no lugar da janela enquanto a floresta já aparece em volta
    animar('.pagina__janela', [{ opacity: 1 }, { opacity: 0 }], { inicio: M.transicao - 0.2, duracao: 0.6 });
    animar('.pagina__grao', [{ opacity: 1 }, { opacity: 0 }], { inicio: M.transicao - 0.2, duracao: 0.7 });
    animar('#abertura', [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-18px)' }], { inicio: M.transicao, duracao: 0.7, easing: 'ease-in' });
    // flores da entrada "saltam" da página, como num livro pop-up
    animar('.plano--e-frente-esq > img', [
      { transform: 'scaleY(1)' }, { transform: 'scaleY(.86)', offset: 0.3 }, { transform: 'scaleY(1.07)', offset: 0.7 }, { transform: 'scaleY(1)' },
    ], { inicio: M.transicao + 0.5, duracao: 0.9, easing: 'ease-out' });
    animar('.plano--e-frente-dir > img', [
      { transform: 'scaleY(1)' }, { transform: 'scaleY(.86)', offset: 0.3 }, { transform: 'scaleY(1.07)', offset: 0.7 }, { transform: 'scaleY(1)' },
    ], { inicio: M.transicao + 0.8, duracao: 0.9, easing: 'ease-out' });
  }
  linha.em(M.transicao + 2.4, () => { if (pagina) pagina.hidden = true; });

  // luz e ar da floresta
  animar('.plano--raios', [{ opacity: 0.35 }, { opacity: 1 }], { inicio: M.transicao + 1, duracao: 3 });
  animar('.particulas', [{ opacity: 0 }, { opacity: 1 }], { inicio: M.transicao + 2, duracao: 2 });
  animar('.plano--luz', [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0.75 }], { inicio: M.apresentacao, duracao: 6 });

  // Cena 3: o coelho cruza o caminho e se esconde atrás do arbusto (medidas em larguras do coelho)
  const coelho = $('#coelho');
  if (coelho && !reduzir) {
    // começa fora da tela mesmo em telas largas (e invisível até a corrida começar)
    linha.animar(coelho, [
      { transform: 'translate(-1500%, 52%) scaleX(1)', opacity: 0 },
      { transform: 'translate(-1380%, 52%) scaleX(1)', opacity: 1, offset: 0.06 },
      { transform: 'translate(-40%, 52%) scaleX(1)', offset: 0.72 },
      { transform: 'translate(0%, 0%) scaleX(1)', offset: 0.86 },
      { transform: 'translate(0%, 0%) scaleX(-1)', opacity: 1 },
    ], { inicio: M.floresta + 1.2, duracao: 3.0, easing: 'linear' });
    linha.em(M.floresta + 1.2, () => { coelho.style.setProperty('--passo', '.36s'); coelho.classList.add('correndo'); }, { som: false });
    linha.em(M.floresta + 3.9, () => coelho.classList.remove('correndo'));
  } else if (coelho) {
    coelho.style.transform = 'scaleX(-1)';
  }

  // o pássaro se mexe no galho
  const passaro = $('#passaro .passaro');
  if (passaro && !reduzir) {
    linha.animar(passaro, [
      { transform: 'none' }, { transform: 'translateY(-12%)', offset: 0.2 }, { transform: 'none', offset: 0.4 },
      { transform: 'translateY(-8%)', offset: 0.6 }, { transform: 'none', offset: 0.8 }, { transform: 'none' },
    ], { inicio: M.floresta + 3, duracao: 1.2, easing: 'ease-in-out' });
    animar('#passaro .p-cabeca', [
      { transform: 'none' }, { transform: 'rotate(-14deg)', offset: 0.3 }, { transform: 'rotate(10deg)', offset: 0.7 }, { transform: 'none' },
    ], { inicio: M.floresta + 3.3, duracao: 1.6, easing: 'ease-in-out' });
  }

  // a borboleta chega às flores e pousa
  const borboleta = $('#borboleta');
  if (borboleta) {
    const plano = $('.plano--flores');
    const kx = plano.offsetWidth / borboleta.offsetWidth || 5.3;
    const ky = plano.offsetHeight / borboleta.offsetHeight || 4.6;
    const pos = (px, py) => `translate(${(px * kx * 100 - 50).toFixed(1)}%, ${(py * ky * 100 - 50).toFixed(1)}%)`;
    borboleta.dataset.kx = kx;
    borboleta.dataset.ky = ky;
    if (!reduzir) {
      linha.animar(borboleta, [
        { transform: pos(-0.6, -0.4), opacity: 0 },
        { transform: pos(-0.1, 0.1), opacity: 1, offset: 0.25 },
        { transform: pos(0.62, 0.5), offset: 0.6 },
        { transform: pos(0.39, 0.29) },
      ], { inicio: M.floresta + 4.5, duracao: 2.2, easing: 'ease-in-out' });
      linha.em(M.floresta + 6.7, () => borboleta.classList.add('borboleta--pousada'));
    } else {
      borboleta.style.transform = pos(0.39, 0.29);
      borboleta.classList.add('borboleta--pousada');
    }
  }

  // Cena 4: a Maria Alice aparece num clarão suave (luz, subida leve e meia-volta para nós)
  const clarao = $('.aparicao');
  if (clarao) {
    animar(clarao, reduzir
      ? [{ opacity: 0 }, { opacity: 0.85, offset: 0.35 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'scale(.45)' }, { opacity: 1, transform: 'scale(.9)', offset: 0.32 },
         { opacity: 0.9, transform: 'scale(1)', offset: 0.5 }, { opacity: 0, transform: 'scale(1.18)' }],
    { inicio: M.apresentacao + 0.6, duracao: 2.2, easing: 'ease-out' });
  }
  animar(modelo, [{ opacity: 0 }, { opacity: 1 }], { inicio: M.apresentacao + 1, duracao: reduzir ? 1 : 0.7, easing: 'ease-out' });
  if (!reduzir) animar(mv || modelo.firstElementChild, [{ transform: 'translateY(4%)' }, { transform: 'none' }], { inicio: M.apresentacao + 1, duracao: 1.8, easing: 'cubic-bezier(.2,.8,.2,1)' });
  const giroInicial = (150 * Math.PI) / 180;
  linha.aoQuadro((t) => {
    if (!mv?.resetTurntableRotation) return;
    const p = Math.min(1, Math.max(0, (t - (M.apresentacao + 1.2)) / 3));
    const e = 1 - Math.pow(1 - p, 3);
    mv.resetTurntableRotation(reduzir ? 0 : giroInicial * (1 - e));
    const q = Math.min(1, Math.max(0, (t - (M.apresentacao + 0.5)) / 2.5));
    mv.exposure = 0.72 + 0.13 * q;
  });

  // Cena 5: o convite
  linha.em(M.cartao - 0.1, () => {
    cartaoEl.classList.add('cartao--visivel');
    cartaoEl.inert = false;
    palco.classList.add('palco--com-cartao');
  });
  linha.em(M.cartao + 1.3, (_, { pulando }) => aoRevelarCartao?.({ pulando }));

  construirDinamicas();

  return {
    reconstruir: construirDinamicas,
    posicionarLegenda,
    /** Reenquadra a cena quando o cartão é recolhido ou aberto (ou a tela muda depois da história). */
    reenquadrar(estado, { animar: comAnimacao = true } = {}) {
      estadoCartao = estado;
      const F = enquadramento(estado);
      const alvo = comoTransform(F);
      const atual = getComputedStyle(mundo).transform;
      mundo.getAnimations().filter((a) => a.id === 'reenquadrar').forEach((a) => a.cancel());
      const a = mundo.animate([{ transform: atual === 'none' ? 'none' : atual }, { transform: alvo }],
        { duration: comAnimacao && !reduzir ? 500 : 1, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' });
      a.id = 'reenquadrar';
      posicionarLegenda(DURACAO);
      areaDasParticulas();
    },
  };
}
