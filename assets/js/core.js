// Núcleo do convite: funções puras (sem DOM), usadas pelo navegador (main.js)
// e pelo build em Node (tools/build.mjs). Nenhuma rede, nenhum armazenamento.

const pad = (n, w = 2) => String(n).padStart(w, '0');

// ---------------------------------------------------------------------------
// Datas e fuso horário
// ---------------------------------------------------------------------------

export function parseDate(data) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data || ''));
  if (!m) throw new Error(`Data inválida: "${data}" (use AAAA-MM-DD)`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new Error(`Data inexistente: "${data}"`);
  }
  return { y, mo, d };
}

export function parseTime(hora) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hora || ''));
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error(`Horário inválido: "${hora}" (use HH:MM)`);
  return { h: Number(m[1]), mi: Number(m[2]) };
}

/** Diferença (minutos) entre o horário local do fuso e o UTC, no instante dado. */
export function tzOffsetMinutes(timeZone, instant) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(instant).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** Converte data + hora "de parede" no fuso indicado para um instante (Date em UTC). */
export function zonedTimeToUtc(data, hora, timeZone) {
  const { y, mo, d } = parseDate(data);
  const { h, mi } = parseTime(hora);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let off = tzOffsetMinutes(timeZone, new Date(guess));
  let instant = guess - off * 60000;
  const off2 = tzOffsetMinutes(timeZone, new Date(instant));
  if (off2 !== off) instant = guess - off2 * 60000;
  return new Date(instant);
}

/** "18:00" -> "18h"; "18:30" -> "18h30". */
export function formatHora(hora) {
  const { h, mi } = parseTime(hora);
  return mi ? `${h}h${pad(mi)}` : `${h}h`;
}

const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Datas por extenso em pt-BR, calculadas no fuso do evento. */
export function formatDatas(evento) {
  const meioDia = zonedTimeToUtc(evento.data, '12:00', evento.fusoHorario);
  const tz = evento.fusoHorario;
  const fmt = (opts) => new Intl.DateTimeFormat('pt-BR', { timeZone: tz, ...opts }).format(meioDia);
  const diaSemana = fmt({ weekday: 'long' });
  const diaMes = fmt({ day: 'numeric', month: 'long' });
  const ano = fmt({ year: 'numeric' });
  const { d, mo } = parseDate(evento.data);
  return {
    diaSemana,
    curta: `${pad(d)}/${pad(mo)}`, // 28/11
    diaMes, // 28 de novembro
    completa: `${capitalizar(diaSemana)}, ${diaMes} de ${ano}`, // Sábado, 28 de novembro de 2026
    resumo: `${capitalizar(diaSemana)}, ${diaMes}`, // Sábado, 28 de novembro
  };
}

// ---------------------------------------------------------------------------
// Textos com marcadores
// ---------------------------------------------------------------------------

export function marcadores(config) {
  return {
    aniversariante: config.aniversariante.nome,
    idade: String(config.aniversariante.idade),
    data: formatDatas(config.evento).curta,
    hora: formatHora(config.evento.inicio),
  };
}

export function preencher(texto, valores) {
  return String(texto ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in valores ? valores[k] : m));
}

// ---------------------------------------------------------------------------
// Links externos
// ---------------------------------------------------------------------------

export function normalizarWhatsapp(numero) {
  return String(numero ?? '').replace(/\D+/g, '');
}

/** Valida o número no formato aceito por wa.me (só dígitos, com código do país). */
export function whatsappValido(numero) {
  const n = normalizarWhatsapp(numero);
  return n.length >= 10 && n.length <= 15 && n === String(numero ?? '').trim();
}

export function mensagemRsvp(config, resposta, nome = '') {
  const v = marcadores(config);
  const r = config.rsvp;
  const partes = [preencher(r.saudacao, v)];
  const nomeLimpo = String(nome).replace(/\s+/g, ' ').trim().slice(0, 80);
  if (nomeLimpo) partes.push(preencher(r.identificacao, { ...v, nome: nomeLimpo }));
  partes.push(preencher(resposta === 'nao' ? r.mensagemNao : r.mensagemSim, v));
  return partes.filter(Boolean).join(' ');
}

export function whatsappUrl(numero, mensagem) {
  const n = normalizarWhatsapp(numero);
  if (!n) return '';
  return `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}`;
}

export function mapaUrl(local) {
  if (local.mapaUrl && /^https:\/\//.test(local.mapaUrl)) return local.mapaUrl;
  if (!local.endereco) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local.endereco)}`;
}

export function wazeUrl(local) {
  if (!local.endereco) return '';
  return `https://waze.com/ul?q=${encodeURIComponent(local.endereco)}&navigate=yes`;
}

const icsData = (data, hora) => {
  const { y, mo, d } = parseDate(data);
  const { h, mi } = parseTime(hora);
  return `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`;
};

export function googleAgendaUrl(config) {
  const e = config.evento;
  const v = marcadores(config);
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: preencher(e.titulo, v),
    dates: `${icsData(e.data, e.inicio)}/${icsData(e.data, e.fim || e.inicio)}`,
    ctz: e.fusoHorario,
    details: preencher(e.descricaoAgenda, v),
  });
  if (config.local.endereco) p.set('location', config.local.endereco);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// ---------------------------------------------------------------------------
// Arquivo de agenda (.ics) — RFC 5545
// ---------------------------------------------------------------------------

export function escaparIcs(texto) {
  return String(texto)
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** Dobra linhas em 75 octetos (UTF-8), sem quebrar caracteres multibyte. */
export function dobrarLinhaIcs(linha) {
  const enc = new TextEncoder();
  if (enc.encode(linha).length <= 75) return linha;
  const out = [];
  let atual = '';
  let bytes = 0;
  let limite = 75;
  for (const ch of linha) {
    const b = enc.encode(ch).length;
    if (bytes + b > limite) {
      out.push(atual);
      atual = '';
      bytes = 0;
      limite = 74; // linhas de continuação começam com um espaço
    }
    atual += ch;
    bytes += b;
  }
  out.push(atual);
  return out.join('\r\n ');
}

const offsetIcs = (min) => {
  const s = min < 0 ? '-' : '+';
  const a = Math.abs(min);
  return `${s}${pad(Math.floor(a / 60))}${pad(a % 60)}`;
};

export function gerarIcs(config, { agora = new Date(), url = '' } = {}) {
  const e = config.evento;
  const tz = e.fusoHorario;
  const v = marcadores(config);
  const inicio = zonedTimeToUtc(e.data, e.inicio, tz);
  const fim = e.fim ? zonedTimeToUtc(e.data, e.fim, tz) : inicio;
  if (e.fim && !(fim > inicio)) throw new Error('O horário de término precisa ser depois do início.');
  const offIni = tzOffsetMinutes(tz, inicio);
  const offFim = tzOffsetMinutes(tz, fim);
  const utc = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const descricao = [preencher(e.descricaoAgenda, v), url ? `Convite: ${url}` : ''].filter(Boolean).join('\n');
  const uid = `${e.data.replace(/-/g, '')}-${normalizarSlug(config.aniversariante.nome)}-${config.aniversariante.idade}-anos@convite`;

  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Convite Maria Alice//Convite digital//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    `TZID:${tz}`,
    `X-LIC-LOCATION:${tz}`,
    'BEGIN:STANDARD',
    `TZOFFSETFROM:${offsetIcs(offIni)}`,
    `TZOFFSETTO:${offsetIcs(offIni)}`,
    `TZNAME:${offsetIcs(offIni).slice(0, 3)}`,
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utc(agora)}`,
    `DTSTART;TZID=${tz}:${icsData(e.data, e.inicio)}`,
    `SUMMARY:${escaparIcs(preencher(e.titulo, v))}`,
    `DESCRIPTION:${escaparIcs(descricao)}`,
  ];
  if (config.local.endereco) linhas.push(`LOCATION:${escaparIcs(config.local.endereco)}`);
  if (url) linhas.push(`URL:${url}`);
  if (e.fim) linhas.splice(linhas.findIndex((l) => l.startsWith('DTSTART;')) + 1, 0, `DTEND;TZID=${tz}:${icsData(e.data, e.fim)}`);
  linhas.push('STATUS:CONFIRMED', 'TRANSP:OPAQUE', 'END:VEVENT', 'END:VCALENDAR');
  if (offIni !== offFim) {
    // O VTIMEZONE simplificado assume um único deslocamento durante a festa.
    throw new Error(`O fuso ${tz} muda de horário durante o evento; revise o gerador de .ics.`);
  }
  return linhas.map(dobrarLinhaIcs).join('\r\n') + '\r\n';
}

export function normalizarSlug(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Contagem regressiva (dias de calendário no fuso do evento)
// ---------------------------------------------------------------------------

export function contagem(config, agora = new Date()) {
  const e = config.evento;
  const tz = e.fusoHorario;
  const hojeTxt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
  const hoje = parseDate(hojeTxt);
  const dia = parseDate(e.data);
  const dias = Math.round((Date.UTC(dia.y, dia.mo - 1, dia.d) - Date.UTC(hoje.y, hoje.mo - 1, hoje.d)) / 86400000);
  // sem término definido, a festa conta como "já aconteceu" só depois do fim do dia
  const fim = zonedTimeToUtc(e.data, e.fim || '23:59', tz);
  if (agora >= fim) return { estado: 'depois', dias, texto: 'A festa já aconteceu. Obrigado por celebrar com a gente!' };
  if (dias <= 0) return { estado: 'hoje', dias: 0, texto: 'É hoje!' };
  if (dias === 1) return { estado: 'antes', dias, texto: 'É amanhã!' };
  return { estado: 'antes', dias, texto: `Faltam ${dias} dias` };
}

// ---------------------------------------------------------------------------
// Validação da configuração (usada no build)
// ---------------------------------------------------------------------------

export function validarConfig(config) {
  const erros = [];
  const avisos = [];
  const e = config.evento || {};
  try { parseDate(e.data); } catch (err) { erros.push(err.message); }
  try { parseTime(e.inicio); if (e.fim) parseTime(e.fim); } catch (err) { erros.push(err.message); }
  try { new Intl.DateTimeFormat('en-US', { timeZone: e.fusoHorario }); } catch { erros.push(`Fuso horário inválido: "${e.fusoHorario}"`); }
  if (!erros.length && e.fim) {
    const ini = zonedTimeToUtc(e.data, e.inicio, e.fusoHorario);
    const fim = zonedTimeToUtc(e.data, e.fim, e.fusoHorario);
    if (!(fim > ini)) erros.push('evento.fim precisa ser depois de evento.inicio.');
  }
  if (!config.aniversariante?.nome) erros.push('aniversariante.nome está vazio.');

  const w = config.rsvp?.whatsapp ?? '';
  if (!w) avisos.push('rsvp.whatsapp está vazio: os botões de confirmação mostrarão "em breve".');
  else if (!whatsappValido(w)) erros.push(`rsvp.whatsapp deve ter somente dígitos com código do país e DDD (ex.: 5585999999999). Valor atual: "${w}"`);
  else if (w.startsWith('55') && !config.rsvp?.numeroConfirmado) {
    const local = w.slice(4);
    if (w.length === 12 && /^[6-9]/.test(local)) {
      avisos.push(`rsvp.whatsapp (${w}) tem 8 dígitos após o DDD. Celulares brasileiros costumam ter 9 (ex.: 9 ${local.slice(0, 4)}-${local.slice(4)}). O wa.me geralmente aceita os dois formatos, mas confirme tocando no botão antes de enviar o convite.`);
    }
  }

  if (!config.local?.endereco) avisos.push('local.endereco está vazio: a seção de local mostrará "endereço em breve".');
  if (config.local?.mapaUrl && !/^https:\/\//.test(config.local.mapaUrl)) erros.push('local.mapaUrl precisa começar com https://');
  if (config.site?.url && !/^https:\/\/.+\/$/.test(config.site.url)) avisos.push('site.url deve começar com https:// e terminar com "/" (ex.: https://exemplo.com/convite/).');
  if (!config.site?.url) avisos.push('site.url está vazio: a prévia do link no WhatsApp ficará sem imagem.');

  const falas = config.historia?.falas || [];
  let anterior = 0;
  falas.forEach((f, i) => {
    const n = i + 1;
    if (!f?.texto) erros.push(`historia.falas[${n}] está sem texto.`);
    if (!(Number.isFinite(f?.inicio) && Number.isFinite(f?.fim) && f.fim > f.inicio)) erros.push(`historia.falas[${n}]: "fim" precisa ser maior que "inicio".`);
    else if (f.inicio < anterior) erros.push(`historia.falas[${n}] começa antes do fim da fala anterior.`);
    else anterior = f.fim;
  });
  if (anterior > 35) avisos.push(`A história passa de 35 s (última fala termina em ${anterior} s).`);
  return { erros, avisos };
}
