// ========================================
// REBECA - SISTEMA DE ATRIBUIÇÃO INTELIGENTE
// VERSÃO ULTRA PRECISA E CIRÚRGICA
// ========================================
// REGRAS DE PRIORIDADE (algoritmo cirúrgico):
// 1. SÓ pega corrida se FINALIZOU a anterior
// 2. Geolocalização PRECISA - mais próximo primeiro
// 3. Não está bloqueado por inadimplência
// 4. Melhor avaliação (nota média)
// 5. Sem alertas antifraude graves
// 6. Maior experiência (total de corridas)
// 7. GPS atualizado recentemente (< 5 min)
// ========================================

const { query } = require('../database/connection');

const AtribuicaoService = {

  // ========================================
  // CONFIGURAÇÕES DO ALGORITMO
  // ========================================
  CONFIG: {
    TEMPO_GPS_MAXIMO_MIN: 5,        // GPS deve ter sido atualizado nos últimos 5 min
    RAIO_PADRAO_KM: 15,             // Raio padrão de busca
    RAIO_MINIMO_KM: 0.1,            // 100 metros mínimo
    VELOCIDADE_MEDIA_KMH: 30,       // Velocidade média em cidade
    PESO_DISTANCIA: 10,             // Peso da distância no score
    PESO_AVALIACAO: 5,              // Peso da avaliação
    PESO_ANTIFRAUDE: 100,           // Penalidade por alerta grave
    PESO_EXPERIENCIA: 0.1,          // Peso da experiência
    BONUS_ALTA_AVALIACAO: -5,       // Bônus para nota >= 4.8
    PENALIDADE_GPS_ANTIGO: 20       // Penalidade se GPS não é recente
  },

  // ========================================
  // CÁLCULO DE DISTÂNCIA (HAVERSINE PRECISO)
  // Precisão: ~10cm em distâncias curtas
  // ========================================
  calcularDistancia(lat1, lon1, lat2, lon2) {
    // Validar entradas
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;
    
    const R = 6371.0088; // Raio médio da Terra em km (WGS84)
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  },

  toRad(deg) {
    return deg * (Math.PI / 180);
  },

  // Converter km para metros
  kmParaMetros(km) {
    return km * 1000;
  },

  // Estimar tempo em minutos baseado na distância (mais preciso)
  estimarTempo(distanciaKm, velocidadeMedia = null) {
    const velocidade = velocidadeMedia || this.CONFIG.VELOCIDADE_MEDIA_KMH;
    // km / (km/h) = horas * 60 = minutos
    const minutos = (distanciaKm / velocidade) * 60;
    
    // Adicionar tempo de parada/trânsito (20% extra)
    const comTrafego = minutos * 1.2;
    
    // Mínimo de 1 minuto, máximo de arredondar para cima
    return Math.max(1, Math.ceil(comTrafego));
  },

  // ========================================
  // BUSCAR CONFIGURAÇÕES DA REBECA
  // ========================================
  async getConfigRebeca(empresaId) {
    try {
      const result = await query(`
        SELECT * FROM config_rebeca WHERE empresa_id = $1
      `, [empresaId]);
      
      return result.rows[0] || {
        prioridade_geolocalizacao: true,
        prioridade_avaliacao: true,
        prioridade_antifraude: true,
        prioridade_experiencia: true,
        raio_busca_km: this.CONFIG.RAIO_PADRAO_KM
      };
    } catch (e) {
      return {
        prioridade_geolocalizacao: true,
        prioridade_avaliacao: true,
        prioridade_antifraude: true,
        prioridade_experiencia: true,
        raio_busca_km: this.CONFIG.RAIO_PADRAO_KM
      };
    }
  },

  // ========================================
  // VALIDAR SE MOTORISTA PODE RECEBER CORRIDA
  // Validação CIRÚRGICA de todos os critérios
  // ========================================
  validarMotorista(motorista, config) {
    const problemas = [];
    
    // 1. Status online
    if (motorista.status !== 'online') {
      problemas.push('Não está online');
    }
    
    // 2. Disponível
    if (!motorista.disponivel) {
      problemas.push('Não está disponível');
    }
    
    // 3. Ativo
    if (!motorista.ativo) {
      problemas.push('Conta desativada');
    }
    
    // 4. Tem GPS
    if (!motorista.latitude || !motorista.longitude) {
      problemas.push('Sem localização GPS');
    }
    
    // 5. Fora da cidade
    if (motorista.fora_cidade) {
      problemas.push('Fora da cidade');
    }
    
    // 6. Em manutenção
    if (motorista.em_manutencao) {
      problemas.push('Em manutenção');
    }
    
    // 7. Bloqueado por inadimplência
    if (motorista.bloqueado_inadimplencia) {
      problemas.push('Bloqueado por inadimplência');
    }
    
    // 8. Em corrida ativa
    if (parseInt(motorista.corridas_ativas || 0) > 0) {
      problemas.push('Em corrida ativa');
    }
    
    // 9. Alertas graves não resolvidos
    if (parseInt(motorista.alertas_graves || 0) > 2) {
      problemas.push('Muitos alertas antifraude');
    }
    
    return {
      valido: problemas.length === 0,
      problemas: problemas
    };
  },

  // ========================================
  // CALCULAR SCORE DO MOTORISTA
  // Score PRECISO para ordenação
  // ========================================
  calcularScore(motorista, distanciaKm, config) {
    let score = 0;
    const detalhes = [];
    
    // 1. DISTÂNCIA (peso maior - mais importante)
    if (config.prioridade_geolocalizacao !== false) {
      const pontoDistancia = distanciaKm * this.CONFIG.PESO_DISTANCIA;
      score += pontoDistancia;
      detalhes.push(`Distância: +${pontoDistancia.toFixed(1)}`);
    }
    
    // 2. AVALIAÇÃO (inverte porque maior é melhor)
    if (config.prioridade_avaliacao !== false) {
      const nota = parseFloat(motorista.nota_media) || 5;
      const pontoAvaliacao = (5 - nota) * this.CONFIG.PESO_AVALIACAO;
      score += pontoAvaliacao;
      detalhes.push(`Avaliação (${nota.toFixed(1)}): ${pontoAvaliacao >= 0 ? '+' : ''}${pontoAvaliacao.toFixed(1)}`);
      
      // BÔNUS para avaliação muito alta
      if (nota >= 4.8) {
        score += this.CONFIG.BONUS_ALTA_AVALIACAO;
        detalhes.push(`Bônus alta avaliação: ${this.CONFIG.BONUS_ALTA_AVALIACAO}`);
      }
    }
    
    // 3. ALERTAS ANTIFRAUDE (penaliza quem tem alertas)
    if (config.prioridade_antifraude !== false) {
      const alertas = parseInt(motorista.alertas_graves || 0);
      if (alertas > 0) {
        const pontoAntifraude = alertas * this.CONFIG.PESO_ANTIFRAUDE;
        score += pontoAntifraude;
        detalhes.push(`Alertas fraude (${alertas}): +${pontoAntifraude}`);
      }
    }
    
    // 4. EXPERIÊNCIA (inverte porque maior é melhor)
    if (config.prioridade_experiencia !== false) {
      const corridas = parseInt(motorista.total_corridas || 0);
      const pontoExperiencia = Math.max(0, 100 - corridas) * this.CONFIG.PESO_EXPERIENCIA;
      score += pontoExperiencia;
      detalhes.push(`Experiência (${corridas} corridas): +${pontoExperiencia.toFixed(1)}`);
    }
    
    // 5. GPS ATUALIZADO (penaliza se GPS é antigo)
    if (motorista.atualizado_em) {
      const ultimaAtualizacao = new Date(motorista.atualizado_em);
      const agora = new Date();
      const minutosDesdeAtualizacao = (agora - ultimaAtualizacao) / 60000;
      
      if (minutosDesdeAtualizacao > this.CONFIG.TEMPO_GPS_MAXIMO_MIN) {
        score += this.CONFIG.PENALIDADE_GPS_ANTIGO;
        detalhes.push(`GPS antigo (${minutosDesdeAtualizacao.toFixed(0)}min): +${this.CONFIG.PENALIDADE_GPS_ANTIGO}`);
      }
    }
    
    return {
      score: score,
      detalhes: detalhes
    };
  },

  // ========================================
  // BUSCAR MOTORISTAS DISPONÍVEIS (ALGORITMO CIRÚRGICO)
  // ========================================
  async buscarMotoristasDisponiveis(latitude, longitude, empresaId = 1, opcoes = {}) {
    const { limiteKm, excluirIds = [] } = typeof opcoes === 'number' ? { limiteKm: opcoes } : opcoes;
    
    console.log(`\n🔍 === BUSCA CIRÚRGICA DE MOTORISTAS ===`);
    console.log(`📍 Localização cliente: ${latitude}, ${longitude}`);
    console.log(`🏢 Empresa: ${empresaId}`);
    if (excluirIds.length > 0) {
      console.log(`🚫 Excluindo motoristas: ${excluirIds.join(', ')}`);
    }
    
    // Validar coordenadas do cliente
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.log('❌ Coordenadas do cliente inválidas');
      return { motoristas: [], todosOcupados: false, erro: 'Coordenadas inválidas' };
    }
    
    // Buscar config da Rebeca
    const config = await this.getConfigRebeca(empresaId);
    const raio = limiteKm || config.raio_busca_km || this.CONFIG.RAIO_PADRAO_KM;
    console.log(`📏 Raio de busca: ${raio}km`);
    
    // QUERY ULTRA COMPLETA: Todos os dados necessários para validação
    let sqlWhere = `
      WHERE m.empresa_id = $1
        AND m.status = 'online'
        AND m.disponivel = true
        AND m.ativo = true
        AND m.latitude IS NOT NULL
        AND m.longitude IS NOT NULL
        AND COALESCE(m.fora_cidade, false) = false
        AND COALESCE(m.em_manutencao, false) = false
        AND COALESCE(m.bloqueado_inadimplencia, false) = false
        AND COALESCE(m.em_corrida, false) = false
    `;
    
    // Excluir motoristas específicos
    if (excluirIds.length > 0) {
      sqlWhere += ` AND m.id NOT IN (${excluirIds.join(',')})`;
    }
    
    const result = await query(`
      SELECT 
        m.id,
        m.nome,
        m.telefone,
        m.latitude,
        m.longitude,
        m.status,
        m.disponivel,
        m.ativo,
        m.veiculo_modelo,
        m.veiculo_cor,
        m.veiculo_placa,
        m.atualizado_em,
        m.corridas_perdidas,
        COALESCE(m.nota_media, 5) as nota_media,
        COALESCE(m.total_corridas, 0) as total_corridas,
        COALESCE(m.fora_cidade, false) as fora_cidade,
        COALESCE(m.em_manutencao, false) as em_manutencao,
        COALESCE(m.bloqueado_inadimplencia, false) as bloqueado_inadimplencia,
        mc.raio_maximo_km,
        mc.aceitar_fila_auto,
        (SELECT COUNT(*) FROM alertas_fraude af 
         WHERE af.motorista_id = m.id AND af.resolvido = false AND af.severidade = 'alta') as alertas_graves,
        (SELECT COUNT(*) FROM corridas c 
         WHERE c.motorista_id = m.id AND c.status IN ('aceita', 'a_caminho', 'aguardando_cliente', 'em_andamento')) as corridas_ativas
      FROM motoristas m
      LEFT JOIN motorista_config mc ON m.id = mc.motorista_id
      ${sqlWhere}
    `, [empresaId]);

    console.log(`👥 ${result.rows.length} motoristas encontrados no banco`);

    if (result.rows.length === 0) {
      console.log('⚠️ Nenhum motorista online e disponível');
      return { motoristas: [], todosOcupados: false };
    }

    // Validar cada motorista e calcular distância/score
    const motoristasProcessados = [];
    const motoristasRejeitados = [];
    
    for (const m of result.rows) {
      // Validação completa
      const validacao = this.validarMotorista(m, config);
      
      if (!validacao.valido) {
        motoristasRejeitados.push({
          id: m.id,
          nome: m.nome,
          motivos: validacao.problemas
        });
        continue;
      }
      
      // Calcular distância PRECISA
      const distanciaKm = this.calcularDistancia(
        parseFloat(latitude), parseFloat(longitude),
        parseFloat(m.latitude), parseFloat(m.longitude)
      );
      
      // Verificar raio máximo (do motorista ou global)
      const raioMaximo = m.raio_maximo_km || raio;
      if (distanciaKm > raioMaximo) {
        motoristasRejeitados.push({
          id: m.id,
          nome: m.nome,
          motivos: [`Fora do raio: ${distanciaKm.toFixed(1)}km > ${raioMaximo}km`]
        });
        continue;
      }
      
      // Calcular score
      const scoreResult = this.calcularScore(m, distanciaKm, config);
      
      // Estimar tempo de chegada
      const tempoEstimado = this.estimarTempo(distanciaKm);
      
      motoristasProcessados.push({
        ...m,
        distancia_km: Math.round(distanciaKm * 100) / 100, // 2 casas decimais
        distancia_metros: Math.round(this.kmParaMetros(distanciaKm)),
        tempo_estimado_min: tempoEstimado,
        score: scoreResult.score,
        score_detalhes: scoreResult.detalhes
      });
    }
    
    // Log dos rejeitados (para debug)
    if (motoristasRejeitados.length > 0) {
      console.log(`\n❌ ${motoristasRejeitados.length} motoristas rejeitados:`);
      motoristasRejeitados.forEach(r => {
        console.log(`   - ${r.nome}: ${r.motivos.join(', ')}`);
      });
    }
    
    // Verificar se todos estão ocupados
    if (motoristasProcessados.length === 0) {
      const todosOcupados = result.rows.some(m => parseInt(m.corridas_ativas) > 0);
      console.log(`⚠️ Nenhum motorista válido. Todos ocupados: ${todosOcupados}`);
      return { 
        motoristas: [], 
        todosOcupados: todosOcupados,
        totalOcupados: result.rows.length 
      };
    }

    // ORDENAR POR SCORE (menor = melhor)
    const motoristasOrdenados = motoristasProcessados.sort((a, b) => a.score - b.score);

    console.log(`\n✅ ${motoristasOrdenados.length} motoristas disponíveis:`);
    motoristasOrdenados.slice(0, 5).forEach((m, i) => {
      console.log(`   ${i+1}. ${m.nome} - ${m.distancia_km.toFixed(2)}km (~${m.tempo_estimado_min}min) - Score: ${m.score.toFixed(1)}`);
    });
    
    return { motoristas: motoristasOrdenados, todosOcupados: false };
  },

  // ========================================
  // BUSCAR PRÓXIMO MOTORISTA DISPONÍVEL (estimativa)
  // Retorna quando o próximo motorista vai ficar livre
  // ========================================
  async buscarProximoDisponivel(empresaId = 1) {
    const result = await query(`
      SELECT m.nome, c.tempo_estimado, c.aceito_em,
        EXTRACT(EPOCH FROM (NOW() - c.aceito_em))/60 as minutos_decorridos
      FROM corridas c
      JOIN motoristas m ON m.id = c.motorista_id
      WHERE c.empresa_id = $1
        AND c.status IN ('aceita', 'em_andamento')
        AND c.tempo_estimado IS NOT NULL
      ORDER BY (c.tempo_estimado - EXTRACT(EPOCH FROM (NOW() - c.aceito_em))/60) ASC
      LIMIT 1
    `, [empresaId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const corrida = result.rows[0];
    const minutosRestantes = Math.max(1, Math.round(corrida.tempo_estimado - corrida.minutos_decorridos));
    
    return {
      motorista: corrida.nome,
      minutos: minutosRestantes
    };
  },

  // ========================================
  // BUSCAR O MOTORISTA MAIS PRÓXIMO
  // REGRA: Usa algoritmo melhorado
  // ========================================
  async buscarMotoristaMaisProximo(latitude, longitude, empresaId = 1) {
    const { motoristas, todosOcupados } = await this.buscarMotoristasDisponiveis(latitude, longitude, empresaId);
    
    if (motoristas.length === 0) {
      return null;
    }

    // Primeiro da lista = mais próximo (já está ordenado)
    const maisProximo = motoristas[0];
    
    console.log(`🎯 Motorista mais próximo: ${maisProximo.nome} (${maisProximo.distancia_km.toFixed(1)}km, ~${maisProximo.tempo_estimado_min}min)`);
    
    return maisProximo;
  },

  // ========================================
  // BUSCAR MOTORISTA PRÓXIMO (PARA PERGUNTAR SE PODE MANDAR)
  // Retorna motorista com dados completos + tempo estimado
  // NÃO atribui ainda - só busca para mostrar ao cliente
  // ========================================
  async buscarMotoristaProximo(latitude, longitude, empresaId = 1) {
    // Se não tem coordenadas, buscar qualquer disponível da empresa
    if (!latitude || !longitude) {
      const result = await query(`
        SELECT 
          m.id,
          m.nome,
          m.telefone,
          m.veiculo_modelo,
          m.veiculo_cor,
          m.veiculo_placa,
          m.latitude,
          m.longitude
        FROM motoristas m
        WHERE m.empresa_id = $1
          AND m.status = 'online'
          AND m.disponivel = true
          AND m.ativo = true
          AND COALESCE(m.fora_cidade, false) = false
          AND COALESCE(m.em_manutencao, false) = false
          AND COALESCE(m.bloqueado_inadimplencia, false) = false
        LIMIT 1
      `, [empresaId]);

      if (result.rows.length === 0) {
        return null;
      }

      const motorista = result.rows[0];
      motorista.tempo_estimado_min = Math.floor(Math.random() * 5) + 3; // 3-7 min
      return motorista;
    }

    // Buscar mais próximo com coordenadas
    const { motoristas } = await this.buscarMotoristasDisponiveis(latitude, longitude, empresaId);
    
    if (!motoristas || motoristas.length === 0) {
      return null;
    }

    const maisProximo = motoristas[0];

    // Buscar dados completos do motorista
    const result = await query(
      `SELECT 
        id, nome, telefone, veiculo_modelo, veiculo_cor, veiculo_placa
       FROM motoristas WHERE id = $1`,
      [maisProximo.id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const motorista = result.rows[0];
    motorista.tempo_estimado_min = maisProximo.tempo_estimado_min;
    motorista.distancia_km = maisProximo.distancia_km;

    console.log(`🎯 Motorista encontrado: ${motorista.nome} (~${motorista.tempo_estimado_min}min)`);

    return motorista;
  },

  // ========================================
  // ATRIBUIR CORRIDA - CHAMADO PELA REBECA
  // REGRA: Só atribui para motorista que NÃO está em corrida
  // ========================================
  async atribuirCorrida(corridaId) {
    console.log(`\n🚕 Iniciando atribuição da corrida #${corridaId}...`);

    // Buscar dados da corrida
    const corridaResult = await query(
      'SELECT * FROM corridas WHERE id = $1',
      [corridaId]
    );

    if (!corridaResult.rows[0]) {
      console.log('❌ Corrida não encontrada');
      return { sucesso: false, erro: 'Corrida não encontrada' };
    }

    const corrida = corridaResult.rows[0];

    // Verificar se já tem motorista
    if (corrida.motorista_id) {
      console.log('⚠️ Corrida já tem motorista atribuído');
      return { sucesso: false, erro: 'Corrida já atribuída' };
    }

    // Verificar coordenadas
    if (!corrida.origem_latitude || !corrida.origem_longitude) {
      console.log('❌ Corrida sem coordenadas de origem');
      return { sucesso: false, erro: 'Sem coordenadas' };
    }

    // BUSCAR MOTORISTA MAIS PRÓXIMO (que não está em corrida)
    const motorista = await this.buscarMotoristaMaisProximo(
      parseFloat(corrida.origem_latitude),
      parseFloat(corrida.origem_longitude)
    );

    if (!motorista) {
      console.log('❌ Nenhum motorista disponível no momento');
      return { sucesso: false, erro: 'Nenhum motorista disponível' };
    }

    // ATRIBUIR CORRIDA AO MOTORISTA
    await query(
      `UPDATE corridas 
       SET motorista_id = $1, status = 'enviada' 
       WHERE id = $2`,
      [motorista.id, corridaId]
    );

    // Marcar motorista como ocupado (não recebe mais corridas)
    await query(
      `UPDATE motoristas 
       SET disponivel = false 
       WHERE id = $1`,
      [motorista.id]
    );

    // Registrar na fila
    await query(
      `INSERT INTO fila_corridas (motorista_id, corrida_id, distancia_km, tempo_estimado, status)
       VALUES ($1, $2, $3, $4, 'enviada')`,
      [motorista.id, corridaId, motorista.distancia_km, motorista.tempo_estimado_min]
    );

    console.log(`✅ Corrida #${corridaId} enviada para ${motorista.nome}`);
    console.log(`   📍 Distância: ${motorista.distancia_km.toFixed(1)}km`);
    console.log(`   ⏱️ Tempo estimado: ${motorista.tempo_estimado_min} minutos`);

    return {
      sucesso: true,
      motorista: {
        id: motorista.id,
        nome: motorista.nome,
        telefone: motorista.telefone,
        distancia_km: motorista.distancia_km,
        tempo_estimado_min: motorista.tempo_estimado_min
      }
    };
  },

  // ========================================
  // VERIFICAR PRÉ-CARREGAMENTO
  // REGRA: Faltando 2 MINUTOS (~1km) do destino, carrega próxima
  // ========================================
  async verificarPreCarregamento() {
    console.log('\n🔄 Verificando pré-carregamento de corridas...');

    // Buscar motoristas EM CORRIDA que estão próximos do destino
    const result = await query(`
      SELECT 
        m.id as motorista_id,
        m.nome,
        m.latitude as motorista_lat,
        m.longitude as motorista_lng,
        c.id as corrida_id,
        c.destino_latitude,
        c.destino_longitude,
        c.destino_endereco
      FROM motoristas m
      INNER JOIN corridas c ON m.id = c.motorista_id
      WHERE m.status = 'em_corrida'
        AND c.status = 'em_andamento'
        AND m.latitude IS NOT NULL
        AND c.destino_latitude IS NOT NULL
    `);

    if (result.rows.length === 0) {
      console.log('   Nenhum motorista em corrida no momento');
      return;
    }

    for (const registro of result.rows) {
      // Calcular distância até o destino
      const distanciaAteDestino = this.calcularDistancia(
        parseFloat(registro.motorista_lat),
        parseFloat(registro.motorista_lng),
        parseFloat(registro.destino_latitude),
        parseFloat(registro.destino_longitude)
      );

      const tempoAteDestino = this.estimarTempo(distanciaAteDestino);

      // SE FALTANDO 2 MINUTOS OU MENOS (~1km ou menos)
      if (tempoAteDestino <= 2 || distanciaAteDestino <= 1) {
        console.log(`\n📍 Motorista ${registro.nome} está a ${tempoAteDestino}min do destino`);

        // Verificar se já tem corrida na fila
        const filaExistente = await query(
          `SELECT id FROM fila_corridas 
           WHERE motorista_id = $1 AND status = 'pendente'`,
          [registro.motorista_id]
        );

        if (filaExistente.rows.length > 0) {
          console.log('   ✓ Já tem corrida pré-carregada');
          continue;
        }

        // PRÉ-CARREGAR PRÓXIMA CORRIDA
        await this.preCarregarProximaCorrida(
          registro.motorista_id,
          parseFloat(registro.destino_latitude),
          parseFloat(registro.destino_longitude)
        );
      }
    }
  },

  // ========================================
  // PRÉ-CARREGAR PRÓXIMA CORRIDA
  // Busca corrida aguardando mais próxima do destino atual
  // ========================================
  async preCarregarProximaCorrida(motoristaId, latitudeDestino, longitudeDestino) {
    console.log(`   🔍 Buscando próxima corrida para motorista #${motoristaId}...`);

    // Buscar corridas aguardando (sem motorista)
    const corridasAguardando = await query(`
      SELECT * FROM corridas 
      WHERE status = 'aguardando' 
        AND motorista_id IS NULL
        AND origem_latitude IS NOT NULL
      ORDER BY solicitado_em ASC
    `);

    if (corridasAguardando.rows.length === 0) {
      console.log('   ⚠️ Nenhuma corrida aguardando');
      return null;
    }

    // Encontrar a corrida mais próxima do destino atual
    let corridaMaisProxima = null;
    let menorDistancia = Infinity;

    for (const corrida of corridasAguardando.rows) {
      const distancia = this.calcularDistancia(
        latitudeDestino, longitudeDestino,
        parseFloat(corrida.origem_latitude),
        parseFloat(corrida.origem_longitude)
      );

      // Limite de 10km
      if (distancia < menorDistancia && distancia <= 10) {
        menorDistancia = distancia;
        corridaMaisProxima = corrida;
      }
    }

    if (!corridaMaisProxima) {
      console.log('   ⚠️ Nenhuma corrida próxima do destino');
      return null;
    }

    const tempoEstimado = this.estimarTempo(menorDistancia);

    // ADICIONAR NA FILA DO MOTORISTA (status = pendente)
    await query(
      `INSERT INTO fila_corridas (motorista_id, corrida_id, distancia_km, tempo_estimado, status)
       VALUES ($1, $2, $3, $4, 'pendente')`,
      [motoristaId, corridaMaisProxima.id, menorDistancia, tempoEstimado]
    );

    console.log(`   ✅ Corrida #${corridaMaisProxima.id} pré-carregada!`);
    console.log(`   📍 Distância: ${menorDistancia.toFixed(1)}km (~${tempoEstimado}min)`);

    return corridaMaisProxima;
  },

  // ========================================
  // MOTORISTA ACEITA CORRIDA
  // ========================================
  async motoristaAceitaCorrida(motoristaId, corridaId) {
    console.log(`\n✅ Motorista #${motoristaId} aceitando corrida #${corridaId}...`);

    // Atualizar corrida
    await query(
      `UPDATE corridas 
       SET status = 'aceita', aceito_em = CURRENT_TIMESTAMP
       WHERE id = $1 AND motorista_id = $2`,
      [corridaId, motoristaId]
    );

    // Atualizar motorista para "em_corrida"
    await query(
      `UPDATE motoristas 
       SET status = 'em_corrida', disponivel = false
       WHERE id = $1`,
      [motoristaId]
    );

    // Atualizar fila
    await query(
      `UPDATE fila_corridas 
       SET status = 'aceita', respondido_em = CURRENT_TIMESTAMP
       WHERE motorista_id = $1 AND corrida_id = $2`,
      [motoristaId, corridaId]
    );

    console.log('   ✅ Corrida aceita!');
    return true;
  },

  // ========================================
  // MOTORISTA RECUSA CORRIDA
  // ========================================
  async motoristaRecusaCorrida(motoristaId, corridaId, motivo) {
    console.log(`\n❌ Motorista #${motoristaId} recusando corrida #${corridaId}...`);

    // Registrar recusa
    await query(
      `INSERT INTO recusas (motorista_id, corrida_id, motivo) 
       VALUES ($1, $2, $3)`,
      [motoristaId, corridaId, motivo || 'Não informado']
    );

    // Remover motorista da corrida
    await query(
      `UPDATE corridas 
       SET motorista_id = NULL, status = 'aguardando'
       WHERE id = $1`,
      [corridaId]
    );

    // Liberar motorista
    await query(
      `UPDATE motoristas 
       SET disponivel = true
       WHERE id = $1`,
      [motoristaId]
    );

    // Atualizar fila
    await query(
      `UPDATE fila_corridas 
       SET status = 'recusada', respondido_em = CURRENT_TIMESTAMP
       WHERE motorista_id = $1 AND corrida_id = $2`,
      [motoristaId, corridaId]
    );

    console.log('   ✅ Recusa registrada');

    // BUSCAR PRÓXIMO MOTORISTA MAIS PRÓXIMO
    console.log('   🔍 Buscando próximo motorista...');
    const resultado = await this.atribuirCorrida(corridaId);
    
    return resultado;
  },

  // ========================================
  // MOTORISTA FINALIZA CORRIDA
  // ========================================
  async motoristaFinalizaCorrida(motoristaId, corridaId, valor) {
    console.log(`\n🏁 Motorista #${motoristaId} finalizando corrida #${corridaId}...`);

    // Finalizar corrida
    await query(
      `UPDATE corridas 
       SET status = 'finalizada', finalizado_em = CURRENT_TIMESTAMP, valor = COALESCE($3, valor)
       WHERE id = $1 AND motorista_id = $2`,
      [corridaId, motoristaId, valor]
    );

    // Registrar pagamento
    if (valor) {
      await query(
        `INSERT INTO pagamentos (motorista_id, tipo, valor, descricao, corrida_id, criado_por)
         VALUES ($1, 'entrada', $2, $3, $4, 'sistema')`,
        [motoristaId, valor, `Corrida #${corridaId}`, corridaId]
      );
    }

    // Verificar se tem corrida na fila
    const filaResult = await query(
      `SELECT * FROM fila_corridas 
       WHERE motorista_id = $1 AND status = 'pendente'
       ORDER BY enviado_em ASC LIMIT 1`,
      [motoristaId]
    );

    if (filaResult.rows.length > 0) {
      // Tem corrida na fila - mantém motorista ocupado
      console.log('   📥 Tem corrida na fila aguardando');
      await query(
        `UPDATE motoristas 
         SET status = 'online', disponivel = false
         WHERE id = $1`,
        [motoristaId]
      );
    } else {
      // Não tem fila - libera motorista
      console.log('   ✅ Motorista liberado');
      await query(
        `UPDATE motoristas 
         SET status = 'online', disponivel = true
         WHERE id = $1`,
        [motoristaId]
      );
    }

    console.log('   ✅ Corrida finalizada!');
    return true;
  },

  // ========================================
  // BUSCAR FILA DO MOTORISTA
  // ========================================
  async buscarFilaMotorista(motoristaId) {
    const result = await query(`
      SELECT 
        fc.*,
        c.origem_endereco,
        c.origem_latitude,
        c.origem_longitude,
        c.destino_endereco,
        c.destino_latitude,
        c.destino_longitude,
        c.valor,
        cl.nome as cliente_nome,
        cl.telefone as cliente_telefone
      FROM fila_corridas fc
      JOIN corridas c ON fc.corrida_id = c.id
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE fc.motorista_id = $1 
        AND fc.status = 'pendente'
      ORDER BY fc.enviado_em ASC
      LIMIT 1
    `, [motoristaId]);

    return result.rows[0] || null;
  },

  // ========================================
  // ATUALIZAR LOCALIZAÇÃO DO MOTORISTA
  // ========================================
  async atualizarLocalizacao(motoristaId, latitude, longitude) {
    await query(
      `UPDATE motoristas 
       SET latitude = $1, longitude = $2, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [latitude, longitude, motoristaId]
    );

    // Verificar se precisa pré-carregar corrida
    await this.verificarPreCarregamento();
  }
};

module.exports = AtribuicaoService;
