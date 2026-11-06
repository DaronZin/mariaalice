// Os três animais da clareira. Cada um tem um comportamento tranquilo enquanto ninguém
// toca nele e uma pequena surpresa ao toque (ou Enter/Espaço). Tudo é curto, repetível e
// volta sempre ao estado de repouso (animações sem "fill", que não se acumulam).

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const sorteio = (a, b) => a + Math.random() * (b - a);

export function criarAnimais({ som, reduzir, efeitosLigados, aoTocar }) {
  const botoes = {
    coelho: $('#toque-coelho'),
    passaro: $('#passaro'),
    borboleta: $('#toque-borboleta'),
  };
  if (!botoes.coelho && !botoes.passaro && !botoes.borboleta) {
    return { habilitar() {}, iniciarRotina() {}, pausar() {}, retomar() {} };
  }

  const coelho = $('#coelho');
  const orelhas = $('#coelho .c-orelhas');
  const pegadas = [...document.querySelectorAll('.pegada')];
  const passaro = $('#passaro .passaro');
  const asa = $('#passaro .p-asa');
  const asaTras = $('#passaro .p-asa-tras');
  const cabeca = $('#passaro .p-cabeca');
  const cauda = $('#passaro .p-cauda');
  const recado = $('#recado');
  const borboleta = $('#borboleta');
  const petalas = [...document.querySelectorAll('.flor__petalas')];

  const ocupado = { coelho: false, passaro: false, borboleta: false };
  let rotinaLigada = false;
  let pausado = false;
  const timers = new Set();
  const agendar = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };
  const pode = () => rotinaLigada && !pausado && !document.hidden && efeitosLigados();

  // posição da borboleta: frações do canteiro → translate em % do próprio desenho
  const pos = (px, py) => {
    const kx = Number(borboleta?.dataset.kx) || 5.3;
    const ky = Number(borboleta?.dataset.ky) || 4.6;
    return `translate(${(px * kx * 100 - 50).toFixed(1)}%, ${(py * ky * 100 - 50).toFixed(1)}%)`;
  };
  const PONTOS = { A: [0.39, 0.29], B: [0.62, 0.5], C: [0.79, 0.22] };
  let ondeBorboleta = 'A';

  // ------------------------------------------------------------- coelho ---
  async function surpresaCoelho() {
    if (ocupado.coelho || !coelho) return;
    ocupado.coelho = true;
    aoTocar?.('coelho');
    som.efeito('coelho');
    const dur = reduzir ? 2600 : 3300;
    if (!reduzir) {
      coelho.animate([
        { transform: 'translate(0%, 0%) scaleX(-1)' },
        { transform: 'translate(-55%, 34%) scaleX(-1)', offset: 0.14 },
        { transform: 'translate(-55%, 34%) scaleX(-1)', offset: 0.36 },
        { transform: 'translate(-88%, 6%) scaleX(-1)', offset: 0.44 },
        { transform: 'translate(-118%, 34%) scaleX(-1)', offset: 0.52 },
        { transform: 'translate(-118%, 34%) scaleX(-1)', offset: 0.7 },
        { transform: 'translate(-118%, 34%) scaleX(1)', offset: 0.74 },
        { transform: 'translate(0%, 0%) scaleX(1)', offset: 0.95 },
        { transform: 'translate(0%, 0%) scaleX(-1)' },
      ], { duration: dur, easing: 'ease-in-out' });
      agendar(() => coelho.classList.add('correndo'), dur * 0.36);
      agendar(() => coelho.classList.remove('correndo'), dur * 0.53);
      agendar(() => coelho.classList.add('correndo'), dur * 0.74);
      agendar(() => coelho.classList.remove('correndo'), dur * 0.96);
    }
    orelhas?.animate([
      { transform: 'none' }, { transform: 'rotate(-18deg)' }, { transform: 'rotate(10deg)' },
      { transform: 'rotate(-14deg)' }, { transform: 'rotate(6deg)' }, { transform: 'none' },
    ], { duration: 700, delay: reduzir ? 0 : dur * 0.15, easing: 'ease-in-out' });
    // a trilha secreta: pegadas aparecem uma a uma e somem devagar
    pegadas.forEach((p, i) => {
      p.animate([
        { opacity: 0 }, { opacity: 0.85, offset: 0.12 }, { opacity: 0.85, offset: 0.7 }, { opacity: 0 },
      ], { duration: 3400, delay: (reduzir ? 200 : dur * 0.4) + i * 140, easing: 'ease-out' });
    });
    await esperar(dur + 150);
    ocupado.coelho = false;
  }

  function rotinaCoelho() {
    if (pode() && !ocupado.coelho && orelhas) {
      orelhas.animate([{ transform: 'none' }, { transform: 'rotate(-12deg)' }, { transform: 'none' }, { transform: 'rotate(-8deg)' }, { transform: 'none' }],
        { duration: 900, easing: 'ease-in-out' });
      if (!reduzir && Math.random() < 0.4) {
        coelho.animate([{ transform: 'translate(0%, 0%) scaleX(-1)' }, { transform: 'translate(-14%, -10%) scaleX(-1)' }, { transform: 'translate(0%, 0%) scaleX(-1)' }],
          { duration: 1400, easing: 'ease-in-out' });
      }
    }
    agendar(rotinaCoelho, sorteio(5000, 9000));
  }

  // ------------------------------------------------------------- pássaro --
  async function surpresaPassaro() {
    if (ocupado.passaro || !passaro) return;
    ocupado.passaro = true;
    aoTocar?.('passaro');
    som.efeito('passaro');
    const fala = som.falaPassaro();
    if (!reduzir) {
      const bater = [{ transform: 'none' }];
      for (let i = 0; i < 4; i++) bater.push({ transform: 'rotate(-78deg)' }, { transform: 'rotate(-22deg)' });
      bater.push({ transform: 'none' });
      asa?.animate(bater, { duration: 1100, easing: 'ease-in-out' });
      const tras = [{ transform: 'rotate(30deg)', opacity: 0 }];
      for (let i = 0; i < 4; i++) tras.push({ transform: 'rotate(-18deg)', opacity: 1 }, { transform: 'rotate(18deg)', opacity: 1 });
      tras.push({ transform: 'rotate(30deg)', opacity: 0 });
      asaTras?.animate(tras, { duration: 1100, easing: 'ease-in-out' });
      passaro.animate([{ transform: 'none' }, { transform: 'translateY(-16%)', offset: 0.35 }, { transform: 'translateY(-10%)', offset: 0.7 }, { transform: 'none' }],
        { duration: 1100, easing: 'ease-out' });
    }
    if (recado) {
      recado.firstElementChild.textContent = recado.firstElementChild.textContent; // reanuncia
      recado.animate([
        { opacity: 0, transform: 'scaleX(.15)' }, { opacity: 1, transform: 'scaleX(1.04)', offset: 0.12 },
        { opacity: 1, transform: 'scaleX(1)', offset: 0.16 }, { opacity: 1, transform: 'scaleX(1)', offset: 0.88 },
        { opacity: 0, transform: 'scaleX(.15)' },
      ], { duration: reduzir ? 3800 : 4400, delay: reduzir ? 0 : 500, easing: 'ease-out' });
    }
    await esperar(Math.max(reduzir ? 3900 : 5000, fala ? 2600 : 0));
    ocupado.passaro = false;
  }

  function rotinaPassaro() {
    if (pode() && !ocupado.passaro && cabeca) {
      const lado = Math.random() < 0.5 ? -1 : 1;
      cabeca.animate([{ transform: 'none' }, { transform: `rotate(${lado * 14}deg)`, offset: 0.25 }, { transform: `rotate(${lado * 14}deg)`, offset: 0.7 }, { transform: 'none' }],
        { duration: 1600, easing: 'ease-in-out' });
      cauda?.animate([{ transform: 'none' }, { transform: 'rotate(-12deg)' }, { transform: 'none' }], { duration: 500, delay: 300 });
      if (!reduzir && Math.random() < 0.35) {
        passaro.animate([{ transform: 'none' }, { transform: 'translateY(-10%)' }, { transform: 'none' }], { duration: 420, delay: 900, easing: 'ease-out' });
      }
    }
    agendar(rotinaPassaro, sorteio(3500, 6500));
  }

  // ----------------------------------------------------------- borboleta --
  let vooAtual = null;
  function voar(caminho, duracao) {
    if (!borboleta) return null;
    borboleta.classList.remove('borboleta--pousada');
    const quadros = caminho.map(([px, py], i) => ({ transform: pos(px, py), offset: caminho.length > 1 ? i / (caminho.length - 1) : 1 }));
    // um voo por vez: o novo começa onde o anterior parou, e o anterior é descartado
    const a = borboleta.animate(quadros, { duration: duracao, easing: 'ease-in-out', fill: 'forwards' });
    vooAtual?.cancel();
    vooAtual = a;
    a.finished.then(() => borboleta.classList.add('borboleta--pousada'), () => {});
    return a;
  }

  function abrirFlores(atrasos) {
    petalas.forEach((p, i) => {
      p.animate([
        { transform: 'scale(.66) rotate(-4deg)' }, { transform: 'scale(1.1) rotate(3deg)', offset: 0.1 },
        { transform: 'scale(1) rotate(0deg)', offset: 0.16 }, { transform: 'scale(1) rotate(0deg)', offset: 0.85 },
        { transform: 'scale(.66) rotate(-4deg)' },
      ], { duration: reduzir ? 4200 : 5200, delay: atrasos[i] ?? i * 150, easing: 'ease-out' });
    });
  }

  async function surpresaBorboleta() {
    if (ocupado.borboleta || !borboleta) return;
    ocupado.borboleta = true;
    aoTocar?.('borboleta');
    som.efeito('flores');
    const [ax, ay] = PONTOS[ondeBorboleta];
    if (!reduzir) {
      voar([[ax, ay], [0.3, -0.05], [0.5, 0.25], [0.62, 0.5], [0.85, 0.1], [0.7, -0.15], [0.39, 0.29]], 2800);
      ondeBorboleta = 'A';
      // as flores se abrem quando a borboleta passa por cima delas
      abrirFlores([150, 700, 1700, 1000, 2100]);
    } else {
      abrirFlores([0, 0, 0, 0, 0]);
    }
    await esperar(reduzir ? 1500 : 3000);
    ocupado.borboleta = false;
  }

  function rotinaBorboleta() {
    if (pode() && !ocupado.borboleta && borboleta && !reduzir) {
      const opcoes = Object.keys(PONTOS).filter((k) => k !== ondeBorboleta);
      const destino = opcoes[Math.floor(Math.random() * opcoes.length)];
      const [x0, y0] = PONTOS[ondeBorboleta];
      const [x1, y1] = PONTOS[destino];
      voar([[x0, y0], [(x0 + x1) / 2, Math.min(y0, y1) - 0.18], [x1, y1]], 1500);
      ondeBorboleta = destino;
    }
    agendar(rotinaBorboleta, sorteio(4500, 8000));
  }

  // ------------------------------------------------------------ toques ----
  const ligar = (botao, fn) => botao?.addEventListener('click', (e) => { e.preventDefault(); fn(); });
  ligar(botoes.coelho, surpresaCoelho);
  ligar(botoes.passaro, surpresaPassaro);
  ligar(botoes.borboleta, surpresaBorboleta);

  return {
    habilitar() {
      for (const b of Object.values(botoes)) if (b) b.disabled = false;
    },
    iniciarRotina() {
      if (rotinaLigada) return;
      rotinaLigada = true;
      agendar(rotinaCoelho, 4000);
      agendar(rotinaPassaro, 2000);
      agendar(rotinaBorboleta, 3000);
    },
    pausar() { pausado = true; },
    retomar() { pausado = false; },
    surpresas: { coelho: surpresaCoelho, passaro: surpresaPassaro, borboleta: surpresaBorboleta },
  };
}
