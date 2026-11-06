// Câmera virtual da cena 2,5D.
//
// Cada .plano tem uma profundidade (data-z). A câmera avança pelo caminho (distância d) e
// cada plano é escalado e deslocado em relação ao ponto de fuga, como numa perspectiva real:
// planos próximos crescem e passam rápido; os distantes quase não mudam.
//
//   planos da clareira (desenhados no enquadramento final):  escala = (z - D) / (z - d)
//   planos da entrada (desenhados no enquadramento inicial): escala = z / (z - d)
//
// Tudo vira keyframes da Web Animations API (transformações 2D, que o navegador anima
// fora da thread principal), para o movimento ficar suave mesmo em celulares.

export const CAMERA = {
  D: 6,          // distância percorrida até a clareira
  focoY: 0.62,   // ponto de fuga (fração da altura): o centro da clareira
  Z0: 12,        // escala do deslocamento lateral (paralaxe)
  passo: 0.25,   // segundos entre keyframes
};

const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const limitar = (v, a, b) => Math.min(b, Math.max(a, v));

/** Distância da câmera (d) e deslocamento lateral (em frações da altura) no instante t. */
export function trajeto(t) {
  const p = limitar((t - 5) / (24 - 5), 0, 1);
  const d = CAMERA.D * easeInOutCubic(p);
  // a trilha faz uma curva: a câmera desliza um pouco para os lados e volta ao centro
  const env = limitar((t - 9) / 2, 0, 1) * limitar((24 - t) / 3, 0, 1);
  const pan = 0.035 * Math.sin((2 * Math.PI * (t - 9)) / 15) * env;
  return { d, pan };
}

/** Lê a geometria de cada plano (centro, em px, em relação ao mundo, sem transformações). */
export function medirPlanos(mundo) {
  return [...mundo.querySelectorAll('.plano')].map((el) => ({
    el,
    z: Number(el.dataset.z) || 30,
    entrada: el.hasAttribute('data-entrada'),
    cx: el.offsetLeft + el.offsetWidth / 2,
    cy: el.offsetTop + el.offsetHeight / 2,
  }));
}

function escala(p, d) {
  const dist = Math.max(0.35, p.z - d);
  return p.entrada ? p.z / dist : (p.z - CAMERA.D) / dist;
}

function transformacao(p, d, pan, foco, H) {
  const S = escala(p, d);
  const k = CAMERA.Z0 / Math.max(0.35, p.z - d);
  const x = foco.x + (p.cx - foco.x) * S - pan * H * k;
  const y = foco.y + (p.cy - foco.y) * S;
  return `translate(${(x - p.cx).toFixed(2)}px, ${(y - p.cy).toFixed(2)}px) scale(${S.toFixed(4)})`;
}

/** Keyframes de transformação (e de opacidade, nos planos da entrada) para a história toda. */
export function keyframesDaCamera(planos, { largura, altura, duracao }) {
  const foco = { x: largura / 2, y: altura * CAMERA.focoY };
  const n = Math.round(duracao / CAMERA.passo);
  const tempos = Array.from({ length: n + 1 }, (_, i) => i * CAMERA.passo);
  return planos.map((p) => {
    const transform = tempos.map((t) => {
      const { d, pan } = trajeto(t);
      return { offset: t / duracao, transform: transformacao(p, d, pan, foco, altura) };
    });
    let opacidade = null;
    if (p.entrada) {
      opacidade = tempos.map((t) => {
        const S = escala(p, trajeto(t).d);
        return { offset: t / duracao, opacity: limitar(1 - (S - 1.7) / 0.8, 0, 1) };
      });
    }
    return { plano: p, transform, opacidade };
  });
}

/** Transformação (translate + scale, origem 0 0) que leva o retângulo `de` para caber em `para`. */
export function encaixar(de, para, { escalaMax = 1 } = {}) {
  const s = Math.min(escalaMax, para.altura / de.altura);
  const tx = para.x + para.largura / 2 - s * (de.x + de.largura / 2);
  const ty = para.y + para.altura / 2 - s * (de.y + de.altura / 2);
  return { s, tx, ty };
}

export const comoTransform = ({ s, tx, ty }) => `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`;
