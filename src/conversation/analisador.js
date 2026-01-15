// ========================================
// REBECA - ANALISADOR DE MENSAGENS
// Entende a intenção do cliente
// ========================================

const analisador = {
  /**
   * Verifica se é uma saudação
   */
  ehSaudacao(texto) {
    const saudacoes = [
      'oi', 'olá', 'ola', 'hey', 'ei', 'eai', 'e ai', 'e aí',
      'opa', 'bom dia', 'boa tarde', 'boa noite', 'oie', 'oii',
      'hello', 'hi', 'fala', 'salve', 'eae'
    ];
    const textoLower = texto.toLowerCase().trim();
    return saudacoes.some(s => textoLower.includes(s)) || textoLower.length <= 5;
  },

  /**
   * Verifica se quer uma corrida
   */
  querCorrida(texto) {
    const palavras = [
      'corrida', 'carro', 'veículo', 'veiculo', 'motorista',
      'buscar', 'pegar', 'preciso', 'quero', 'queria',
      'chamar', 'mandar', 'enviar', 'solicitar', 'ir para',
      'ir pra', 'me leva', 'me busca', 'uber', 'viagem'
    ];
    const textoLower = texto.toLowerCase();
    return palavras.some(p => textoLower.includes(p));
  },

  /**
   * Verifica se é confirmação positiva
   */
  ehConfirmacao(texto) {
    const confirmacoes = [
      'sim', 's', 'ok', 'blz', 'beleza', 'pode', 'isso',
      'confirmo', 'confirmado', 'certo', 'certeza', 'claro',
      'positivo', 'afirmativo', 'bora', 'vamos', 'tá', 'ta',
      'tudo bem', 'pode ser', 'fechado', 'feito', 'isso mesmo',
      'exato', 'isso ai', 'isso aí', 'perfeito', 'ótimo', 'otimo',
      '👍', 'ss', 'sss', 'simmm', 'siim'
    ];
    const textoLower = texto.toLowerCase().trim();
    return confirmacoes.some(c => textoLower === c || textoLower.startsWith(c + ' '));
  },

  /**
   * Verifica se é negação
   */
  ehNegacao(texto) {
    const negacoes = [
      'não', 'nao', 'n', 'nunca', 'nope', 'negativo',
      'nem', 'de jeito nenhum', 'cancela', 'desisto',
      'deixa', 'esquece', 'para', 'parar'
    ];
    const textoLower = texto.toLowerCase().trim();
    return negacoes.some(n => textoLower === n || textoLower.startsWith(n + ' '));
  },

  /**
   * Verifica se pergunta sobre valor/preço
   */
  perguntaValor(texto) {
    const palavras = [
      'quanto', 'valor', 'preço', 'preco', 'custo',
      'custa', 'fica', 'sai', 'cobra', 'cobrar',
      'tarifa', 'taxa', 'R$', 'reais'
    ];
    const textoLower = texto.toLowerCase();
    return palavras.some(p => textoLower.includes(p));
  },

  /**
   * Verifica se quer cancelar
   */
  querCancelar(texto) {
    const palavras = [
      'cancelar', 'cancela', 'desistir', 'desisto',
      'não quero mais', 'nao quero mais', 'parar',
      'para', 'esquece', 'deixa pra lá', 'deixa pra la'
    ];
    const textoLower = texto.toLowerCase();
    return palavras.some(p => textoLower.includes(p));
  },

  /**
   * Verifica se parece um endereço
   */
  pareceEndereco(texto) {
    // Rua, Avenida, Av., R., número, bairro, etc.
    const padroes = [
      /rua\s/i,
      /avenida\s/i,
      /av\.\s/i,
      /r\.\s/i,
      /travessa\s/i,
      /alameda\s/i,
      /praça\s/i,
      /praca\s/i,
      /estrada\s/i,
      /rodovia\s/i,
      /\d{2,5}/, // números (número da casa/prédio)
      /bairro/i,
      /centro/i,
      /shopping/i,
      /hospital/i,
      /escola/i,
      /faculdade/i,
      /universidade/i,
      /terminal/i,
      /estação/i,
      /estacao/i,
      /aeroporto/i,
      /rodoviária/i,
      /rodoviaria/i,
    ];
    return padroes.some(p => p.test(texto)) || texto.length > 15;
  },

  /**
   * Verifica se é uma localização do WhatsApp
   */
  ehLocalizacao(mensagem) {
    // WhatsApp envia localização como objeto com latitude e longitude
    return mensagem.type === 'location' || 
           mensagem.hasMedia && mensagem.type === 'location';
  },

  /**
   * Verifica se quer falar com atendente humano
   */
  querAtendenteHumano(texto) {
    const palavras = [
      'atendente', 'humano', 'pessoa', 'falar com alguém',
      'falar com alguem', 'suporte', 'reclamação', 'reclamacao',
      'problema', 'gerente', 'responsável', 'responsavel'
    ];
    const textoLower = texto.toLowerCase();
    return palavras.some(p => textoLower.includes(p));
  },

  /**
   * Detecta palavrões ou conteúdo ofensivo
   */
  ehOfensivo(texto) {
    // Lista básica - pode ser expandida
    const palavroes = [
      'fdp', 'porra', 'merda', 'caralho', 'puta',
      'vsf', 'tnc', 'foda-se', 'foda se', 'vai se fuder'
    ];
    const textoLower = texto.toLowerCase();
    return palavroes.some(p => textoLower.includes(p));
  },

  /**
   * Pede desconto
   */
  pedeDesconto(texto) {
    const palavras = [
      'desconto', 'mais barato', 'abaixa', 'diminui',
      'promocao', 'promoção', 'cupom', 'voucher'
    ];
    const textoLower = texto.toLowerCase();
    return palavras.some(p => textoLower.includes(p));
  },
};

module.exports = analisador;
