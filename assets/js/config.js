// ARQUIVO GERADO por tools/build.mjs a partir de convite.config.js.
// Para mudar algo, edite convite.config.js na raiz do projeto e rode o build de novo.

// =============================================================================
//  CONFIGURAÇÃO DO CONVITE — ÚNICO ARQUIVO A EDITAR
// =============================================================================
//  Depois de alterar qualquer valor, gere a pasta dist de novo:
//      node tools/build.mjs
//  e copie o conteúdo de dist/ para o NAS (veja docs/DEPLOY-SYNOLOGY.md).
//
//  Nada aqui é enviado para servidores: os valores viram texto na página,
//  no arquivo de agenda (.ics) e nos links de WhatsApp/mapas.
// =============================================================================

export default {
  aniversariante: {
    nome: 'Maria Alice',
    idade: 2,
  },

  evento: {
    // Título usado na agenda e na aba do navegador.
    // Marcadores aceitos em todos os textos deste arquivo: {aniversariante} {idade} {data} {hora}
    titulo: '{idade} anos da {aniversariante}',
    // Data no formato AAAA-MM-DD e horários no formato HH:MM (24 h).
    data: '2026-11-28',
    inicio: '18:30',
    // Término opcional: vazio ('') = mostra só o horário de início.
    fim: '',
    // Fuso horário IANA do local da festa.
    fusoHorario: 'America/Fortaleza',
    // Texto curto que aparece na descrição do evento na agenda.
    descricaoAgenda: 'Festa de {idade} anos da {aniversariante}. Vamos adorar ter você com a gente!',
  },

  local: {
    // Endereço exatamente como deve aparecer para os convidados (confirmado em 20/10/2026).
    // Deixe vazio ('') para mostrar "endereço em breve" e esconder os botões de mapa.
    endereco: 'R. Cel. Virgílio Távora, 376 - Bela Cruz - CE',
    // Opcional: ponto de referência, nome do salão, bloco etc.
    complemento: '',
    // Opcional, mas recomendado: link de "Compartilhar" do Google Maps apontando o local exato
    // (ex.: https://maps.app.goo.gl/...). Se vazio, o botão faz uma busca pelo endereço acima.
    mapaUrl: '',
  },

  rsvp: {
    // WhatsApp que recebe as confirmações: código do país + DDD + número, SOMENTE dígitos.
    // Ex.: +55 (85) 9191-9249  ->  '558591919249'
    // Deixe vazio ('') para mostrar "confirmação em breve" no lugar dos botões.
    whatsapp: '558591919249',
    // true = número conferido pela família (desliga o aviso de "8 dígitos" no build).
    numeroConfirmado: true,
    // Mensagens pré-preenchidas. O convidado pode editar antes de enviar.
    saudacao: 'Olá!',
    // Usada só quando o convidado digita o nome (marcador {nome}).
    identificacao: 'Aqui é {nome}.',
    mensagemSim: 'Confirmo minha presença na festa de {idade} anos da {aniversariante}, dia {data}, às {hora}.',
    mensagemNao: 'Infelizmente não vou conseguir ir à festa de {idade} anos da {aniversariante}. Mando um abraço!',
  },

  textos: {
    convite: 'Venha comemorar meus {idade} anos comigo!',
    assinatura: 'Com carinho, família da {aniversariante}',
  },

  // A história narrada ("Era uma vez…"). Os tempos são em segundos, contados a partir do
  // toque em "Entrar no conto". Cada texto vira legenda E voz: se mudar um texto, gere a
  // voz e a música do conto de novo (veja docs/HISTORIA-E-SOM.md):
  //     python tools/audio/narracao.py --modelos <pasta do Kokoro>
  //     python tools/audio/sons.py conto
  historia: {
    ativa: true,
    falas: [
      { inicio: 0.6, fim: 5.0, texto: 'Era uma vez, em uma floresta cheia de encantos…' },
      { inicio: 6.0, fim: 11.0, texto: '…uma menina muito especial.' },
      { inicio: 13.0, fim: 19.5, texto: 'Num dia muito esperado, a floresta inteira se preparou para uma surpresa.' },
      { inicio: 21.0, fim: 27.0, texto: 'Seu nome é {aniversariante}, e ela vai celebrar seus dois aninhos!' },
      { inicio: 28.0, fim: 33.0, texto: 'Mas faltava uma coisa muito importante… Você!' },
    ],
    // Frase do pássaro ao ser tocado (sem dados do evento).
    passaro: 'Psiu! Tem festa na floresta!',
    // Quem já viu a história uma vez abre direto no convite (lembrado só no navegador da pessoa).
    segundaVisitaDiretoNoCartao: true,
  },

  som: {
    // Tudo começa só depois do toque em "Entrar no conto" (ou no botão de música).
    narracao: true,
    musica: true,
    efeitos: true,
  },

  efeitos: {
    // Coelho, pássaro e borboleta que respondem ao toque.
    animais: true,
    // Folhas caindo, vaga-lumes e brisa na copa das árvores.
    ambiente: true,
  },

  ar: {
    // Realidade aumentada: AR Quick Look (iPhone/iPad) e Scene Viewer (Android).
    ativa: true,
    // WebXR (AR dentro do Chrome no Android): desligado por padrão.
    webxr: false,
  },

  site: {
    // Endereço público FINAL do convite, com https (ex.: 'https://convite.seudominio.com.br/maria-alice/').
    // Usado na prévia do link no WhatsApp (imagem e título). Pode ficar vazio:
    // o convite funciona igual, só a prévia do WhatsApp fica sem imagem.
    url: 'https://mariaalice.cloudflare-ftkbd.workers.dev/',
  },
};
