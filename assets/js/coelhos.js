// Surpresa da floresta: um trio de coelhos atravessa a cena alguns segundos depois de abrir.
// Uma vez por visita. Com "reduzir movimento", um coelho aparece parado, espiando do arbusto.

export function iniciarCoelhos({ config, cena, reduzir, efeitosLigados, cenaPronta = Promise.resolve() }) {
  const cfg = config.efeitos?.coelhos || {};
  const perto = cena?.querySelector('.coelho--perto');
  const meio = cena?.querySelector('.coelho--meio');
  const longe = cena?.querySelector('.coelho--longe');
  if (!cena || !perto || cfg.ativo === false) return { correr() {} };

  // performance.now() conta desde a abertura da página: o atraso vale a partir da entrada,
  // mesmo que este script tenha carregado tarde num aparelho lento.
  const atraso = Math.max(2, Number(cfg.atrasoSegundos ?? 5.5)) * 1000;
  const animacoes = new Set();
  let visivel = false;
  let jaCorreu = false;
  let agendado = 0;
  let pronta = false;
  let prontaEm = 0;
  // Só depois que a cena estiver estável (modelo 3D carregado ou com alternativa).
  cenaPronta.then(() => { pronta = true; prontaEm = performance.now(); agendar(); });

  const obs = new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting && e.intersectionRatio >= 0.35;
    if (visivel) agendar();
  }, { threshold: [0, 0.35, 0.6] });
  obs.observe(cena);

  document.addEventListener('visibilitychange', () => {
    for (const a of animacoes) document.hidden ? a.pause() : a.play();
    if (!document.hidden) agendar();
  });

  function agendar() {
    if (jaCorreu || agendado || !pronta) return;
    const falta = Math.max(900, atraso - performance.now(), prontaEm + 1200 - performance.now());
    agendado = setTimeout(() => {
      agendado = 0;
      if (jaCorreu) return;
      if (!visivel || document.hidden || !efeitosLigados()) return; // tenta de novo quando voltar
      jaCorreu = true;
      if (reduzir()) espiar();
      else correr();
    }, falta);
  }

  function espiar() {
    perto.classList.add('coelho--espiando');
  }

  function atravessar(el, { atrasoMs, velocidade, direcao = 1, aoPassar }) {
    if (!el) return;
    const largura = cena.clientWidth;
    const w = el.getBoundingClientRect().width || 80;
    const x0 = direcao > 0 ? -w * 1.25 : largura + w * 0.25;
    const x1 = direcao > 0 ? largura + w * 0.25 : -w * 1.25;
    const duracao = (Math.abs(x1 - x0) / velocidade) * 1000;
    const passo = Math.min(0.5, Math.max(0.26, (w * 1.1) / velocidade));
    const espelho = direcao > 0 ? '' : ' scaleX(-1)';
    el.style.setProperty('--passo', `${passo.toFixed(3)}s`);
    setTimeout(() => {
      el.classList.add('correndo');
      const a = el.animate([
        { transform: `translateX(${x0}px)${espelho}`, opacity: 0 },
        { opacity: 1, offset: 0.05 },
        { opacity: 1, offset: 0.95 },
        { transform: `translateX(${x1}px)${espelho}`, opacity: 0 },
      ], { duration: duracao, easing: 'linear', fill: 'none' });
      animacoes.add(a);
      aoPassar?.(duracao);
      const fim = () => { animacoes.delete(a); el.classList.remove('correndo'); };
      a.finished.then(fim, fim);
    }, atrasoMs);
  }

  function balancar(seletor, emMs) {
    const alvo = cena.querySelector(seletor);
    if (!alvo || typeof alvo.animate !== 'function') return;
    setTimeout(() => {
      const a = alvo.animate([
        { transform: 'rotate(0deg)' }, { transform: 'rotate(-1.6deg)' }, { transform: 'rotate(1.2deg)' },
        { transform: 'rotate(-0.6deg)' }, { transform: 'rotate(0deg)' },
      ], { duration: 700, easing: 'ease-out' });
      animacoes.add(a);
      a.finished.then(() => animacoes.delete(a), () => animacoes.delete(a));
    }, emMs);
  }

  function correr() {
    const largura = cena.clientWidth;
    const v = Math.max(300, largura * 0.42); // px/s do coelho da frente
    atravessar(perto, {
      atrasoMs: 0, velocidade: v,
      aoPassar: (d) => { balancar('.cena__frente--esq', d * 0.08); balancar('.cena__frente--dir', d * 0.86); },
    });
    atravessar(meio, { atrasoMs: 420, velocidade: v * 0.78 });
    atravessar(longe, { atrasoMs: 950, velocidade: v * 0.5, direcao: -1 });
  }

  return { correr: () => { jaCorreu = true; correr(); } };
}
