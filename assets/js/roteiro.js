// Linha do tempo da história ("Era uma vez…").
//
// Todas as animações da introdução são criadas de uma vez, com o atraso de cada uma, e
// ficam presas a um relógio único. Isso permite pausar (aba em segundo plano), sincronizar
// com a voz da narradora e pular direto para o final sem estados quebrados: pular = levar
// todas as animações ao fim, onde cada uma deixa o seu estado final.

/**
 * Relógio + animações (Web Animations API) + marcos (funções chamadas num instante).
 * Estados: parada (no instante 0, esperando o toque) → tocando ⇄ pausada → terminada.
 */
export function criarLinhaDoTempo(duracao) {
  const animacoes = [];
  const marcos = [];
  let proximo = 0;
  let rodando = false;
  let t0 = 0;
  let tParado = 0;
  let quadro = 0;
  let relogio = 0;
  let terminada = false;
  const aoQuadro = new Set();
  const aoTerminar = new Set();

  const agora = () => (rodando ? (performance.now() - t0) / 1000 : tParado);

  function animar(el, keyframes, { inicio = 0, duracao: dur, easing = 'linear', fill = 'both' } = {}) {
    if (!el || typeof el.animate !== 'function') return null;
    const total = dur ?? duracao - inicio;
    const a = el.animate(keyframes, { duration: Math.max(1, total * 1000), delay: inicio * 1000, easing, fill });
    const item = { a, fim: (inicio + total) * 1000 };
    a.pause();
    a.currentTime = Math.min(agora() * 1000, item.fim);
    if (rodando && a.currentTime < item.fim) a.play();
    animacoes.push(item);
    return a;
  }

  function remover(a) {
    const i = animacoes.findIndex((it) => it.a === a);
    if (i >= 0) animacoes.splice(i, 1);
    a?.cancel();
  }

  /** Agenda uma função para o instante t. `som: true` = não executa quando se pula a história. */
  function em(t, fn, { som = false } = {}) {
    marcos.push({ t, fn, som });
    marcos.sort((a, b) => a.t - b.t);
  }

  function disparar(t, { pulando = false } = {}) {
    while (proximo < marcos.length && marcos[proximo].t <= t) {
      const m = marcos[proximo++];
      if (pulando && m.som) continue;
      try { m.fn(t, { pulando }); } catch (erro) { console.error(erro); }
    }
  }

  function passo() {
    quadro = 0;
    if (!rodando) return;
    const t = agora();
    disparar(t);
    for (const f of aoQuadro) f(t);
    if (t >= duracao) {
      terminar();
      return;
    }
    quadro = requestAnimationFrame(passo);
  }

  // Os marcos (legendas, cartão, fim) também andam por um relógio de 100 ms: num aparelho
  // lento, em que os quadros atrasam, a legenda e o cartão chegam na hora mesmo assim.
  function tique() {
    if (!rodando) return;
    const t = agora();
    disparar(t);
    if (t >= duracao) terminar();
  }

  function tocar() {
    if (rodando || terminada) return;
    t0 = performance.now() - tParado * 1000;
    rodando = true;
    for (const it of animacoes) {
      it.a.currentTime = Math.min(tParado * 1000, it.fim);
      if (it.a.currentTime < it.fim) it.a.play();
    }
    quadro = requestAnimationFrame(passo);
    clearInterval(relogio);
    relogio = setInterval(tique, 100);
  }

  function pausar() {
    if (!rodando) return;
    tParado = agora();
    rodando = false;
    cancelAnimationFrame(quadro);
    clearInterval(relogio);
    for (const it of animacoes) {
      it.a.pause();
      it.a.currentTime = Math.min(tParado * 1000, it.fim);
    }
  }

  /** Leva tudo para o instante t (usado para sincronizar com a voz, pular e testar). */
  function ir(t, opcoes = {}) {
    t = Math.max(0, Math.min(duracao, t));
    tParado = t;
    if (rodando) t0 = performance.now() - t * 1000;
    for (const it of animacoes) {
      it.a.currentTime = Math.min(t * 1000, it.fim);
      if (rodando && it.a.currentTime < it.fim) it.a.play();
      else it.a.pause();
    }
    disparar(t, opcoes);
    for (const f of aoQuadro) f(t);
  }

  function terminar({ pulando = false } = {}) {
    if (terminada) return;
    if (agora() < duracao || !rodando) ir(duracao, { pulando });
    rodando = false;
    cancelAnimationFrame(quadro);
    clearInterval(relogio);
    terminada = true;
    for (const f of aoTerminar) f({ pulando });
  }

  return {
    animar, remover, em, tocar, pausar, ir, terminar,
    agora,
    get duracao() { return duracao; },
    get rodando() { return rodando; },
    get terminada() { return terminada; },
    get iniciada() { return rodando || tParado > 0 || terminada; },
    aoQuadro: (f) => aoQuadro.add(f),
    aoTerminar: (f) => aoTerminar.add(f),
  };
}

export const DURACAO = 33;

// Momentos do roteiro (segundos desde "Entrar no conto").
export const MOMENTOS = {
  livro: 0,          // Cena 1: a página do livro
  transicao: 5,      // Cena 2: a ilustração ganha profundidade
  floresta: 12,      // Cena 3: a floresta ganha vida
  apresentacao: 20,  // Cena 4: a Maria Alice aparece
  cartao: 27,        // Cena 5: o convite
  animaisAtivos: 24.5,
};
