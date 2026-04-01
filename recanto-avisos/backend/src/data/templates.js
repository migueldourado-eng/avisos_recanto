const TEMPLATES = [

  // ─── AULAS ───────────────────────────────────────────────────────────────────
  {
    id: 1,
    categoria: 'Aulas',
    titulo: 'Não haverá aula',
    mensagem: 'Não haverá aula na turma [TURMA] no dia [DATA]. Motivo: [MOTIVO]. Amanhã, aula normal.',
    urgente: false,
  },
  {
    id: 2,
    categoria: 'Aulas',
    titulo: 'Antecipação do término das aulas',
    mensagem: 'As aulas da turma [TURMA] vão terminar mais cedo hoje, às [HORÁRIO]. Venha buscar seu filho antes desse horário.',
    urgente: true,
  },
  {
    id: 3,
    categoria: 'Aulas',
    titulo: 'Buscar a criança mais cedo',
    mensagem: 'Precisamos que [NOME DO ALUNO] seja buscado(a) hoje até às [HORÁRIO]. Motivo: [MOTIVO]. Se não puder vir, ligue agora: [TELEFONE].',
    urgente: true,
  },
  {
    id: 4,
    categoria: 'Aulas',
    titulo: 'Fechamento emergencial da escola',
    mensagem: 'A Escola Recanto das Margaridas está encerrando as atividades de hoje por [MOTIVO]. Por favor, venha buscar seu filho o quanto antes.',
    urgente: true,
  },
  {
    id: 5,
    categoria: 'Aulas',
    titulo: 'Suspensão de aulas por chuva',
    mensagem: 'As aulas estão suspensas hoje devido às fortes chuvas. A escola estará aberta para quem já estiver no caminho. Amanhã, informaremos sobre o retorno.',
    urgente: true,
  },
  {
    id: 6,
    categoria: 'Aulas',
    titulo: 'Atividade diferenciada hoje',
    mensagem: 'A turma [TURMA] terá uma atividade especial hoje: [DESCRIÇÃO]. Não é necessária nenhuma preparação prévia.',
    urgente: false,
  },
  {
    id: 7,
    categoria: 'Aulas',
    titulo: 'Início do período letivo',
    mensagem: 'As aulas da turma [TURMA] começam no dia [DATA], às [HORÁRIO]. Estamos felizes em receber seu filho(a)!',
    urgente: false,
  },
  {
    id: 8,
    categoria: 'Aulas',
    titulo: 'Recesso e retorno das aulas',
    mensagem: 'Informamos que haverá recesso de [DATA INÍCIO] a [DATA FIM]. As aulas retornam no dia [DATA RETORNO]. Boas férias!',
    urgente: false,
  },
  {
    id: 34,
    categoria: 'Aulas',
    titulo: 'Dia de avaliação',
    mensagem: 'A turma [TURMA] terá avaliação no dia [DATA], das [HORÁRIO INÍCIO] às [HORÁRIO FIM]. Incentive seu(sua) filho(a) a revisar o conteúdo e a descansar bem na véspera. Qualquer dúvida, entre em contato: [TELEFONE].',
    urgente: false,
  },

  // ─── INFRAESTRUTURA ──────────────────────────────────────────────────────────
  {
    id: 9,
    categoria: 'Infraestrutura',
    titulo: 'Falta de água',
    mensagem: 'A escola está sem água neste momento. Estamos resolvendo. Se necessário, entraremos em contato.',
    urgente: true,
  },
  {
    id: 10,
    categoria: 'Infraestrutura',
    titulo: 'Falta de energia',
    mensagem: 'A escola está sem energia elétrica agora. Estamos aguardando a normalização. Se necessário, entraremos em contato.',
    urgente: true,
  },
  {
    id: 11,
    categoria: 'Infraestrutura',
    titulo: 'Obras ou manutenção na escola',
    mensagem: 'A escola realizará manutenção em [DATA]. As atividades ocorrerão normalmente, mas pode haver algum barulho. Agradecemos a compreensão.',
    urgente: false,
  },

  // ─── FREQUÊNCIA ──────────────────────────────────────────────────────────────
  {
    id: 12,
    categoria: 'Frequência',
    titulo: 'Criança não veio à escola',
    mensagem: '[NOME DO ALUNO] não veio à escola hoje. Se você já sabe o motivo, não precisa fazer nada. Se não sabia, entre em contato: [TELEFONE].',
    urgente: false,
  },
  {
    id: 13,
    categoria: 'Frequência',
    titulo: 'Aviso de faltas',
    mensagem: '[NOME DO ALUNO] acumula [NÚMERO] falta(s) em [MÊS]. Gostaríamos de entender o que está acontecendo e ajudar. Entre em contato com a escola: [TELEFONE].',
    urgente: false,
  },

  // ─── SAÚDE ───────────────────────────────────────────────────────────────────
  {
    id: 14,
    categoria: 'Saúde',
    titulo: 'Criança se machucou — sem gravidade',
    mensagem: '[NOME DO ALUNO] se machucou levemente hoje na escola. Já está sendo cuidado(a) e passa bem. Você saberá mais detalhes na hora de buscar.',
    urgente: false,
  },
  {
    id: 15,
    categoria: 'Saúde',
    titulo: 'Criança se machucou — ligue urgente',
    mensagem: '[NOME DO ALUNO] sofreu um acidente na escola e já está sendo atendido(a). Entre em contato agora: [TELEFONE], ou venha buscá-lo(a) o quanto antes.',
    urgente: true,
  },
  {
    id: 16,
    categoria: 'Saúde',
    titulo: 'Ligue para a escola — urgente',
    mensagem: 'Sua criança está bem e segura na escola. Precisamos falar com você com urgência sobre um assunto importante. Ligue agora: [TELEFONE].',
    urgente: true,
  },
  {
    id: 17,
    categoria: 'Saúde',
    titulo: 'Alerta de saúde na turma',
    mensagem: 'Identificamos uma situação de saúde na turma [TURMA] que requer atenção. Por precaução, fique atento(a) ao estado de saúde de seu filho(a) nos próximos dias. Em caso de sintomas, procure uma unidade de saúde.',
    urgente: false,
  },
  {
    id: 18,
    categoria: 'Saúde',
    titulo: 'Orientação sobre pediculose',
    mensagem: 'Identificamos casos de piolho em algumas crianças da escola. Pedimos que verifique a cabeça de seu filho(a) e, se necessário, realize o tratamento. A escola segue com as orientações de higiene. Não há necessidade de afastar a criança.',
    urgente: false,
  },
  {
    id: 19,
    categoria: 'Saúde',
    titulo: 'Vacinação na escola',
    mensagem: 'Haverá vacinação na escola no dia [DATA]. Verifique a caderneta de vacinação de [NOME DO ALUNO] e traga-a no dia. Mais informações: [TELEFONE].',
    urgente: false,
  },

  {
    id: 35,
    categoria: 'Saúde',
    titulo: 'Criança com febre — buscar na escola',
    mensagem: '[NOME DO ALUNO] está com febre neste momento. Por favor, venha buscá-lo(a) o quanto antes ou envie alguém de sua confiança. Em caso de dúvida, ligue: [TELEFONE].',
    urgente: true,
  },
  {
    id: 36,
    categoria: 'Saúde',
    titulo: 'Criança não se alimentou hoje',
    mensagem: '[NOME DO ALUNO] não se alimentou hoje na escola. Pedimos que venha buscá-lo(a) mais cedo, às [HORÁRIO], pois pode não estar bem. Se precisar de mais informações, ligue: [TELEFONE].',
    urgente: true,
  },

  // ─── COMPORTAMENTO ───────────────────────────────────────────────────────────
  {
    id: 20,
    categoria: 'Comportamento',
    titulo: 'Precisamos conversar',
    mensagem: 'Gostaríamos de conversar com a família de [NOME DO ALUNO] sobre o dia de hoje na escola. Entre em contato com a coordenação: [TELEFONE]. É uma conversa de apoio.',
    urgente: false,
  },
  {
    id: 21,
    categoria: 'Comportamento',
    titulo: 'Elogio — bom comportamento',
    mensagem: '[NOME DO ALUNO] se destacou hoje pelo ótimo comportamento e dedicação. Parabéns à família! 🎉',
    urgente: false,
  },

  // ─── REUNIÕES ────────────────────────────────────────────────────────────────
  {
    id: 22,
    categoria: 'Reuniões',
    titulo: 'Reunião de pais',
    mensagem: 'Reunião de pais da turma [TURMA]: dia [DATA] às [HORÁRIO]. Sua presença é muito importante para acompanhar o desenvolvimento de seu filho(a). Contamos com você!',
    urgente: false,
  },
  {
    id: 23,
    categoria: 'Reuniões',
    titulo: 'Solicitação de reunião com a família',
    mensagem: 'Gostaríamos de conversar com o responsável por [NOME DO ALUNO]. Por favor, entre em contato com a escola para agendarmos: [TELEFONE].',
    urgente: false,
  },

  // ─── ADMINISTRATIVO ──────────────────────────────────────────────────────────
  {
    id: 24,
    categoria: 'Administrativo',
    titulo: 'Documentação pendente',
    mensagem: 'Há um documento pendente de [NOME DO ALUNO] na secretaria. Por favor, venha à escola para regularizar. Dúvidas: [TELEFONE].',
    urgente: false,
  },
  {
    id: 25,
    categoria: 'Administrativo',
    titulo: 'Retirada de material',
    mensagem: 'O responsável por [NOME DO ALUNO] deve vir à escola no dia [DATA], das [HORÁRIO INÍCIO] às [HORÁRIO FIM], para retirar: [DESCRIÇÃO]. Procure a secretaria.',
    urgente: false,
  },
  {
    id: 26,
    categoria: 'Administrativo',
    titulo: 'Entrega de boletim ou relatório',
    mensagem: 'O boletim de [NOME DO ALUNO] está disponível para retirada na escola a partir do dia [DATA]. Procure a secretaria no horário das [HORÁRIO INÍCIO] às [HORÁRIO FIM].',
    urgente: false,
  },
  {
    id: 27,
    categoria: 'Administrativo',
    titulo: 'Material escolar necessário',
    mensagem: 'Solicitamos que [NOME DO ALUNO] traga [DESCRIÇÃO] a partir do dia [DATA]. Em caso de dúvida, entre em contato: [TELEFONE].',
    urgente: false,
  },
  {
    id: 28,
    categoria: 'Administrativo',
    titulo: 'Foto escolar',
    mensagem: 'A foto escolar da turma [TURMA] será realizada no dia [DATA]. Se quiser, capricha no uniforme! 📸',
    urgente: false,
  },
  {
    id: 29,
    categoria: 'Administrativo',
    titulo: 'Passeio escolar — autorização necessária',
    mensagem: 'A turma [TURMA] realizará um passeio no dia [DATA] para [DESCRIÇÃO]. É necessária a assinatura da autorização. Por favor, procure a escola até o dia [DATA LIMITE]. Dúvidas: [TELEFONE].',
    urgente: false,
  },

  // ─── UNIFORME ────────────────────────────────────────────────────────────────
  {
    id: 30,
    categoria: 'Uniforme',
    titulo: 'Lembrete de uniforme',
    mensagem: 'O uso do uniforme completo é obrigatório todos os dias. Contamos com sua colaboração!',
    urgente: false,
  },
  {
    id: 31,
    categoria: 'Uniforme',
    titulo: 'Criança sem uniforme',
    mensagem: '[NOME DO ALUNO] veio hoje sem o uniforme completo. O uso do fardamento é obrigatório. Por favor, garanta o uniforme correto nos próximos dias.',
    urgente: false,
  },

  // ─── MERENDA ─────────────────────────────────────────────────────────────────
  {
    id: 32,
    categoria: 'Merenda',
    titulo: 'Cardápio especial',
    mensagem: 'A turma [TURMA] terá um cardápio especial no dia [DATA]: [DESCRIÇÃO]. Se seu filho tiver alguma restrição alimentar, entre em contato: [TELEFONE].',
    urgente: false,
  },
  {
    id: 33,
    categoria: 'Merenda',
    titulo: 'Sem merenda hoje',
    mensagem: 'Informamos que hoje não haverá merenda na escola. Por favor, envie um lanche para [NOME DO ALUNO].',
    urgente: false,
  },
];

// Retorna templates agrupados por categoria
function templatesPorCategoria() {
  return TEMPLATES.reduce((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = [];
    acc[t.categoria].push(t);
    return acc;
  }, {});
}

module.exports = { TEMPLATES, templatesPorCategoria };
