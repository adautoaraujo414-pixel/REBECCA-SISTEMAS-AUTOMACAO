// ========================================
// REBECA - REPOSITÓRIO DE CONFIGURAÇÕES
// Gerencia configurações do sistema (painel ADM)
// ========================================

const { query } = require('../connection');

// Chaves de configuração disponíveis
const CHAVES = {
  VALOR_CORRIDA: 'valor_corrida',
  VALOR_MINIMO: 'valor_minimo',
  VALOR_KM_ADICIONAL: 'valor_km_adicional',
  KM_INCLUSO: 'km_incluso',
  HORARIO_INICIO: 'horario_inicio',
  HORARIO_FIM: 'horario_fim',
  TAXA_NOTURNA: 'taxa_noturna',
  HORARIO_NOTURNO_INICIO: 'horario_noturno_inicio',
  HORARIO_NOTURNO_FIM: 'horario_noturno_fim',
  ACEITA_PIX: 'aceita_pix',
  ACEITA_CARTAO: 'aceita_cartao',
  ACEITA_DINHEIRO: 'aceita_dinheiro',
  CHAVE_PIX: 'chave_pix',
  NOME_FROTA: 'nome_frota',
  TELEFONE_SUPORTE: 'telefone_suporte',
  MENSAGEM_BOAS_VINDAS: 'mensagem_boas_vindas',
  MENSAGEM_FORA_HORARIO: 'mensagem_fora_horario',
};

// Valores padrão
const VALORES_PADRAO = {
  [CHAVES.VALOR_CORRIDA]: '13.00',
  [CHAVES.VALOR_MINIMO]: '13.00',
  [CHAVES.VALOR_KM_ADICIONAL]: '2.50',
  [CHAVES.KM_INCLUSO]: '5',
  [CHAVES.HORARIO_INICIO]: '06:00',
  [CHAVES.HORARIO_FIM]: '23:00',
  [CHAVES.TAXA_NOTURNA]: '0',
  [CHAVES.HORARIO_NOTURNO_INICIO]: '22:00',
  [CHAVES.HORARIO_NOTURNO_FIM]: '06:00',
  [CHAVES.ACEITA_PIX]: 'true',
  [CHAVES.ACEITA_CARTAO]: 'true',
  [CHAVES.ACEITA_DINHEIRO]: 'true',
  [CHAVES.CHAVE_PIX]: '',
  [CHAVES.NOME_FROTA]: 'UBMAX',
  [CHAVES.TELEFONE_SUPORTE]: '',
  [CHAVES.MENSAGEM_BOAS_VINDAS]: '',
  [CHAVES.MENSAGEM_FORA_HORARIO]: '',
};

const ConfiguracaoRepository = {
  CHAVES,

  /**
   * Busca uma configuração pelo nome da chave
   */
  async buscar(chave) {
    const result = await query(
      'SELECT valor FROM configuracoes WHERE chave = $1',
      [chave]
    );
    
    if (result.rows[0]) {
      return result.rows[0].valor;
    }
    
    // Retorna valor padrão se não existir
    return VALORES_PADRAO[chave] || null;
  },

  /**
   * Busca valor numérico
   */
  async buscarNumero(chave) {
    const valor = await this.buscar(chave);
    return parseFloat(valor) || 0;
  },

  /**
   * Busca valor booleano
   */
  async buscarBoolean(chave) {
    const valor = await this.buscar(chave);
    return valor === 'true' || valor === '1';
  },

  /**
   * Salva ou atualiza uma configuração
   */
  async salvar(chave, valor, descricao = null) {
    // Verificar se já existe
    const existe = await query('SELECT id FROM configuracoes WHERE chave = $1', [chave]);
    
    let result;
    if (existe.rows.length > 0) {
      result = await query(
        `UPDATE configuracoes SET valor = $1, descricao = COALESCE($2, descricao), atualizado_em = CURRENT_TIMESTAMP WHERE chave = $3 RETURNING *`,
        [String(valor), descricao, chave]
      );
    } else {
      result = await query(
        `INSERT INTO configuracoes (chave, valor, descricao, atualizado_em) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *`,
        [chave, String(valor), descricao]
      );
    }
    return result.rows[0];
  },

  /**
   * Busca todas as configurações
   */
  async buscarTodas() {
    const result = await query(
      'SELECT chave, valor, descricao, atualizado_em FROM configuracoes ORDER BY chave'
    );
    
    // Mesclar com valores padrão
    const configMap = {};
    
    // Primeiro, adiciona os padrões
    for (const [chave, valor] of Object.entries(VALORES_PADRAO)) {
      configMap[chave] = { chave, valor, descricao: null };
    }
    
    // Depois, sobrescreve com os do banco
    for (const row of result.rows) {
      configMap[row.chave] = row;
    }
    
    return Object.values(configMap);
  },

  /**
   * Busca configurações agrupadas por categoria
   */
  async buscarAgrupadas() {
    const todas = await this.buscarTodas();
    
    return {
      valores: {
        valor_corrida: todas.find(c => c.chave === CHAVES.VALOR_CORRIDA)?.valor || VALORES_PADRAO[CHAVES.VALOR_CORRIDA],
        valor_minimo: todas.find(c => c.chave === CHAVES.VALOR_MINIMO)?.valor || VALORES_PADRAO[CHAVES.VALOR_MINIMO],
        valor_km_adicional: todas.find(c => c.chave === CHAVES.VALOR_KM_ADICIONAL)?.valor || VALORES_PADRAO[CHAVES.VALOR_KM_ADICIONAL],
        km_incluso: todas.find(c => c.chave === CHAVES.KM_INCLUSO)?.valor || VALORES_PADRAO[CHAVES.KM_INCLUSO],
      },
      horarios: {
        inicio: todas.find(c => c.chave === CHAVES.HORARIO_INICIO)?.valor || VALORES_PADRAO[CHAVES.HORARIO_INICIO],
        fim: todas.find(c => c.chave === CHAVES.HORARIO_FIM)?.valor || VALORES_PADRAO[CHAVES.HORARIO_FIM],
        taxa_noturna: todas.find(c => c.chave === CHAVES.TAXA_NOTURNA)?.valor || VALORES_PADRAO[CHAVES.TAXA_NOTURNA],
        noturno_inicio: todas.find(c => c.chave === CHAVES.HORARIO_NOTURNO_INICIO)?.valor || VALORES_PADRAO[CHAVES.HORARIO_NOTURNO_INICIO],
        noturno_fim: todas.find(c => c.chave === CHAVES.HORARIO_NOTURNO_FIM)?.valor || VALORES_PADRAO[CHAVES.HORARIO_NOTURNO_FIM],
      },
      pagamentos: {
        aceita_pix: todas.find(c => c.chave === CHAVES.ACEITA_PIX)?.valor === 'true',
        aceita_cartao: todas.find(c => c.chave === CHAVES.ACEITA_CARTAO)?.valor === 'true',
        aceita_dinheiro: todas.find(c => c.chave === CHAVES.ACEITA_DINHEIRO)?.valor === 'true',
        chave_pix: todas.find(c => c.chave === CHAVES.CHAVE_PIX)?.valor || '',
      },
      geral: {
        nome_frota: todas.find(c => c.chave === CHAVES.NOME_FROTA)?.valor || VALORES_PADRAO[CHAVES.NOME_FROTA],
        telefone_suporte: todas.find(c => c.chave === CHAVES.TELEFONE_SUPORTE)?.valor || '',
      }
    };
  },

  /**
   * Salva várias configurações de uma vez
   */
  async salvarVarias(configs) {
    const resultados = [];
    for (const [chave, valor] of Object.entries(configs)) {
      const resultado = await this.salvar(chave, valor);
      resultados.push(resultado);
    }
    return resultados;
  },

  /**
   * ========================================
   * MÉTODOS ESPECÍFICOS PARA A REBECA
   * ========================================
   */

  /**
   * Busca o valor da corrida configurado no painel ADM
   * Considera: horário atual, dia da semana, cidade destino
   */
  async getValorCorrida(empresa_id = 1, cidadeDestino = null) {
    // 1. Se tem cidade destino, verificar valores fixos
    if (cidadeDestino) {
      const valorCidade = await query(`
        SELECT valor_fixo, distancia_km, tempo_estimado_min
        FROM valores_cidade
        WHERE empresa_id = $1 AND LOWER(cidade_destino) = LOWER($2) AND ativo = true
      `, [empresa_id, cidadeDestino]);
      
      if (valorCidade.rows.length > 0) {
        return {
          valor: parseFloat(valorCidade.rows[0].valor_fixo),
          tipo: 'cidade_fixa',
          cidade: cidadeDestino,
          distancia_km: valorCidade.rows[0].distancia_km,
          tempo_min: valorCidade.rows[0].tempo_estimado_min
        };
      }
    }
    
    // 2. Buscar valor por horário atual
    const agora = new Date();
    const diaSemana = agora.getDay(); // 0 = domingo
    const horaAtual = agora.toTimeString().substring(0, 5); // "HH:MM"
    
    const valorHorario = await query(`
      SELECT valor_base, valor_km_adicional, km_incluso
      FROM valores_horario
      WHERE empresa_id = $1 
        AND dia_semana = $2 
        AND horario_inicio <= $3 
        AND horario_fim > $3
        AND ativo = true
      ORDER BY horario_inicio DESC
      LIMIT 1
    `, [empresa_id, diaSemana, horaAtual]);
    
    if (valorHorario.rows.length > 0) {
      return {
        valor: parseFloat(valorHorario.rows[0].valor_base),
        tipo: 'horario',
        valor_km_adicional: parseFloat(valorHorario.rows[0].valor_km_adicional),
        km_incluso: parseInt(valorHorario.rows[0].km_incluso)
      };
    }
    
    // 3. Fallback: valor padrão da tabela configuracoes
    const valorPadrao = await this.buscarNumero(CHAVES.VALOR_CORRIDA);
    return {
      valor: valorPadrao || 13.00,
      tipo: 'padrao'
    };
  },

  /**
   * Busca o valor mínimo da corrida
   */
  async getValorMinimo() {
    return await this.buscarNumero(CHAVES.VALOR_MINIMO);
  },

  /**
   * Busca configurações de horário
   */
  async getHorarioFuncionamento() {
    return {
      inicio: await this.buscar(CHAVES.HORARIO_INICIO),
      fim: await this.buscar(CHAVES.HORARIO_FIM),
    };
  },

  /**
   * Busca formas de pagamento aceitas
   */
  async getFormasPagamento() {
    return {
      pix: await this.buscarBoolean(CHAVES.ACEITA_PIX),
      cartao: await this.buscarBoolean(CHAVES.ACEITA_CARTAO),
      dinheiro: await this.buscarBoolean(CHAVES.ACEITA_DINHEIRO),
      chave_pix: await this.buscar(CHAVES.CHAVE_PIX),
    };
  },

  /**
   * Calcula valor da corrida baseado na distância e configurações do ADM
   */
  async calcularValorCorrida(distanciaKm = 0, empresa_id = 1, cidadeDestino = null) {
    // Buscar configuração de valor
    const config = await this.getValorCorrida(empresa_id, cidadeDestino);
    
    // Se é valor fixo por cidade, retorna direto
    if (config.tipo === 'cidade_fixa') {
      return config.valor;
    }
    
    // Calcular baseado em distância
    const valorBase = config.valor;
    const valorKmAdicional = config.valor_km_adicional || await this.buscarNumero(CHAVES.VALOR_KM_ADICIONAL);
    const kmIncluso = config.km_incluso || await this.buscarNumero(CHAVES.KM_INCLUSO);
    const valorMinimo = await this.buscarNumero(CHAVES.VALOR_MINIMO);

    let valorFinal = valorBase;

    // Se a distância exceder o km incluso, adiciona valor por km
    if (distanciaKm > kmIncluso) {
      const kmExcedente = distanciaKm - kmIncluso;
      valorFinal += kmExcedente * valorKmAdicional;
    }

    // Garantir valor mínimo
    if (valorFinal < valorMinimo) {
      valorFinal = valorMinimo;
    }

    return Math.round(valorFinal * 100) / 100; // Arredondar para 2 casas
  },

  /**
   * Inicializa configurações padrão no banco
   */
  async inicializarPadroes() {
    console.log('🔧 Inicializando configurações padrão...');
    
    for (const [chave, valor] of Object.entries(VALORES_PADRAO)) {
      // Só insere se não existir
      const existe = await query(
        'SELECT 1 FROM configuracoes WHERE chave = $1',
        [chave]
      );
      
      if (existe.rows.length === 0) {
        await this.salvar(chave, valor);
        console.log(`   ✓ ${chave} = ${valor}`);
      }
    }
    
    console.log('✅ Configurações inicializadas!');
  }
};

module.exports = ConfiguracaoRepository;
