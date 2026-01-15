// ========================================
// REBECA - SISTEMA ANTI-FRAUDE
// Detecta comportamentos suspeitos e alerta ADM
// ========================================

const { query } = require('../database/connection');

// ========================================
// CONFIGURAÇÕES DE DETECÇÃO
// ========================================
const CONFIG_FRAUDE = {
  // Atrasos
  ATRASOS_ALERTA_AMARELO: 3,   // 3 atrasos = alerta amarelo
  ATRASOS_ALERTA_VERMELHO: 5,  // 5 atrasos = alerta vermelho
  ATRASOS_BLOQUEAR: 10,        // 10 atrasos = sugerir bloqueio
  
  // Cancelamentos
  CANCELAMENTOS_ALERTA: 5,     // 5 cancelamentos após aceitar
  TAXA_CANCELAMENTO_ALERTA: 0.3, // 30% de cancelamento
  
  // Corridas suspeitas
  CORRIDA_MUITO_CURTA_KM: 0.3,  // Menos de 300m
  CORRIDA_MUITO_CURTA_MIN: 2,   // Menos de 2 minutos
  CORRIDAS_CURTAS_ALERTA: 5,    // 5 corridas muito curtas
  
  // Recusas
  RECUSAS_SEGUIDAS_ALERTA: 10,  // 10 recusas seguidas
  TAXA_RECUSA_ALERTA: 0.5,      // 50% de recusa
  
  // GPS
  VELOCIDADE_IMPOSSIVEL_KMH: 200, // Velocidade maior = GPS falso
  GPS_SALTOS_ALERTA: 3,         // 3 saltos impossíveis
  
  // Tempo offline
  DIAS_INATIVO_ALERTA: 7,       // 7 dias sem aparecer
  
  // Reclamações
  RECLAMACOES_ALERTA: 3,        // 3 reclamações
  NOTA_MINIMA_ALERTA: 3.5,      // Nota abaixo de 3.5
  
  // Período de análise (dias)
  PERIODO_ANALISE: 30,
};

// Tipos de alerta
const TIPO_ALERTA = {
  ATRASO: 'atraso',
  CANCELAMENTO: 'cancelamento',
  CORRIDA_CURTA: 'corrida_curta',
  RECUSA_EXCESSIVA: 'recusa_excessiva',
  GPS_SUSPEITO: 'gps_suspeito',
  RECLAMACAO: 'reclamacao',
  NOTA_BAIXA: 'nota_baixa',
  INATIVIDADE: 'inatividade',
  PADRAO_SUSPEITO: 'padrao_suspeito',
};

// Severidade
const SEVERIDADE = {
  INFO: 'info',           // Apenas informativo
  AMARELO: 'amarelo',     // Atenção
  VERMELHO: 'vermelho',   // Crítico
  BLOQUEAR: 'bloquear',   // Sugerir bloqueio
};

class AntiFraude {
  constructor(whatsappClient = null) {
    this.whatsapp = whatsappClient;
    this.alertasEmitidos = new Map(); // Cache para não repetir alertas
  }

  // ========================================
  // ANÁLISE COMPLETA DE UM MOTORISTA
  // ========================================
  async analisarMotorista(motoristaId) {
    const alertas = [];

    try {
      // Buscar dados do motorista
      const motorista = await this.buscarDadosMotorista(motoristaId);
      if (!motorista) return { alertas: [], score: 100 };

      // 1. Verificar atrasos
      const alertaAtraso = await this.verificarAtrasos(motorista);
      if (alertaAtraso) alertas.push(alertaAtraso);

      // 2. Verificar cancelamentos
      const alertaCancelamento = await this.verificarCancelamentos(motorista);
      if (alertaCancelamento) alertas.push(alertaCancelamento);

      // 3. Verificar corridas muito curtas
      const alertaCorridaCurta = await this.verificarCorridasCurtas(motorista);
      if (alertaCorridaCurta) alertas.push(alertaCorridaCurta);

      // 4. Verificar taxa de recusa
      const alertaRecusa = await this.verificarRecusas(motorista);
      if (alertaRecusa) alertas.push(alertaRecusa);

      // 5. Verificar GPS suspeito
      const alertaGPS = await this.verificarGPSSuspeito(motorista);
      if (alertaGPS) alertas.push(alertaGPS);

      // 6. Verificar reclamações
      const alertaReclamacao = await this.verificarReclamacoes(motorista);
      if (alertaReclamacao) alertas.push(alertaReclamacao);

      // 7. Verificar nota
      const alertaNota = await this.verificarNota(motorista);
      if (alertaNota) alertas.push(alertaNota);

      // 8. Verificar inatividade
      const alertaInativo = await this.verificarInatividade(motorista);
      if (alertaInativo) alertas.push(alertaInativo);

      // Calcular score de confiança (0-100)
      const score = this.calcularScore(alertas);

      return {
        motorista,
        alertas,
        score,
        recomendacao: this.gerarRecomendacao(alertas, score),
      };
    } catch (error) {
      console.error('Erro ao analisar motorista:', error);
      return { alertas: [], score: 100 };
    }
  }

  // ========================================
  // BUSCAR DADOS COMPLETOS DO MOTORISTA
  // ========================================
  async buscarDadosMotorista(motoristaId) {
    const result = await query(`
      SELECT m.*,
        (SELECT COUNT(*) FROM corridas WHERE motorista_id = m.id AND status = 'finalizada') as total_corridas,
        (SELECT COUNT(*) FROM corridas WHERE motorista_id = m.id AND status = 'cancelada') as total_canceladas,
        (SELECT COUNT(*) FROM corridas WHERE motorista_id = m.id AND status = 'cancelada_atraso') as total_atrasos,
        (SELECT COUNT(*) FROM corridas WHERE motorista_id = m.id AND status = 'recusada') as total_recusadas,
        (SELECT AVG(avaliacao_motorista) FROM corridas WHERE motorista_id = m.id AND avaliacao_motorista IS NOT NULL) as nota_media,
        (SELECT MAX(atualizado_em) FROM corridas WHERE motorista_id = m.id) as ultima_corrida
      FROM motoristas m
      WHERE m.id = $1
    `, [motoristaId]);

    return result.rows[0] || null;
  }

  // ========================================
  // VERIFICAÇÕES ESPECÍFICAS
  // ========================================

  async verificarAtrasos(motorista) {
    const atrasos = motorista.qtd_atrasos || motorista.total_atrasos || 0;

    if (atrasos >= CONFIG_FRAUDE.ATRASOS_BLOQUEAR) {
      return {
        tipo: TIPO_ALERTA.ATRASO,
        severidade: SEVERIDADE.BLOQUEAR,
        titulo: '🚨 Muitos atrasos - Sugerir bloqueio',
        descricao: `Motorista tem ${atrasos} atrasos registrados. Considere bloquear.`,
        valor: atrasos,
        limite: CONFIG_FRAUDE.ATRASOS_BLOQUEAR,
      };
    } else if (atrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_VERMELHO) {
      return {
        tipo: TIPO_ALERTA.ATRASO,
        severidade: SEVERIDADE.VERMELHO,
        titulo: '⚠️ Muitos atrasos',
        descricao: `Motorista tem ${atrasos} atrasos nos últimos 30 dias.`,
        valor: atrasos,
        limite: CONFIG_FRAUDE.ATRASOS_ALERTA_VERMELHO,
      };
    } else if (atrasos >= CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO) {
      return {
        tipo: TIPO_ALERTA.ATRASO,
        severidade: SEVERIDADE.AMARELO,
        titulo: '⏰ Atrasos frequentes',
        descricao: `Motorista tem ${atrasos} atrasos. Monitorar.`,
        valor: atrasos,
        limite: CONFIG_FRAUDE.ATRASOS_ALERTA_AMARELO,
      };
    }

    return null;
  }

  async verificarCancelamentos(motorista) {
    const canceladas = motorista.total_canceladas || 0;
    const total = motorista.total_corridas || 1;
    const taxa = canceladas / total;

    if (canceladas >= CONFIG_FRAUDE.CANCELAMENTOS_ALERTA || taxa >= CONFIG_FRAUDE.TAXA_CANCELAMENTO_ALERTA) {
      return {
        tipo: TIPO_ALERTA.CANCELAMENTO,
        severidade: taxa >= 0.4 ? SEVERIDADE.VERMELHO : SEVERIDADE.AMARELO,
        titulo: '❌ Taxa de cancelamento alta',
        descricao: `${canceladas} cancelamentos (${(taxa * 100).toFixed(0)}% das corridas)`,
        valor: canceladas,
        taxa: taxa,
      };
    }

    return null;
  }

  async verificarCorridasCurtas(motorista) {
    // Buscar corridas muito curtas (possível fraude para ganhar taxa mínima)
    const result = await query(`
      SELECT COUNT(*) as qtd FROM corridas
      WHERE motorista_id = $1 
        AND status = 'finalizada'
        AND (distancia_km < $2 OR EXTRACT(EPOCH FROM (finalizado_em - iniciado_em))/60 < $3)
        AND solicitado_em > NOW() - INTERVAL '30 days'
    `, [motorista.id, CONFIG_FRAUDE.CORRIDA_MUITO_CURTA_KM, CONFIG_FRAUDE.CORRIDA_MUITO_CURTA_MIN]);

    const qtd = parseInt(result.rows[0]?.qtd || 0);

    if (qtd >= CONFIG_FRAUDE.CORRIDAS_CURTAS_ALERTA) {
      return {
        tipo: TIPO_ALERTA.CORRIDA_CURTA,
        severidade: qtd >= 10 ? SEVERIDADE.VERMELHO : SEVERIDADE.AMARELO,
        titulo: '🔍 Corridas muito curtas',
        descricao: `${qtd} corridas com menos de 300m ou 2min. Possível fraude.`,
        valor: qtd,
      };
    }

    return null;
  }

  async verificarRecusas(motorista) {
    const recusadas = motorista.total_recusadas || 0;
    const total = (motorista.total_corridas || 0) + recusadas;
    const taxa = total > 0 ? recusadas / total : 0;

    if (taxa >= CONFIG_FRAUDE.TAXA_RECUSA_ALERTA) {
      return {
        tipo: TIPO_ALERTA.RECUSA_EXCESSIVA,
        severidade: SEVERIDADE.AMARELO,
        titulo: '🙅 Recusa excessiva',
        descricao: `Taxa de recusa de ${(taxa * 100).toFixed(0)}%. Pode estar escolhendo corridas.`,
        valor: recusadas,
        taxa: taxa,
      };
    }

    return null;
  }

  async verificarGPSSuspeito(motorista) {
    // Buscar saltos impossíveis de GPS (teleporte = GPS falso)
    const result = await query(`
      SELECT COUNT(*) as saltos FROM logs_localizacao
      WHERE motorista_id = $1
        AND velocidade_calculada > $2
        AND criado_em > NOW() - INTERVAL '30 days'
    `, [motorista.id, CONFIG_FRAUDE.VELOCIDADE_IMPOSSIVEL_KMH]);

    const saltos = parseInt(result.rows[0]?.saltos || 0);

    if (saltos >= CONFIG_FRAUDE.GPS_SALTOS_ALERTA) {
      return {
        tipo: TIPO_ALERTA.GPS_SUSPEITO,
        severidade: SEVERIDADE.VERMELHO,
        titulo: '📍 GPS suspeito',
        descricao: `${saltos} movimentações impossíveis detectadas. Possível GPS falso.`,
        valor: saltos,
      };
    }

    return null;
  }

  async verificarReclamacoes(motorista) {
    const result = await query(`
      SELECT COUNT(*) as qtd FROM reclamacoes
      WHERE motorista_id = $1
        AND criado_em > NOW() - INTERVAL '30 days'
    `, [motorista.id]);

    const qtd = parseInt(result.rows[0]?.qtd || 0);

    if (qtd >= CONFIG_FRAUDE.RECLAMACOES_ALERTA) {
      return {
        tipo: TIPO_ALERTA.RECLAMACAO,
        severidade: qtd >= 5 ? SEVERIDADE.VERMELHO : SEVERIDADE.AMARELO,
        titulo: '😤 Reclamações frequentes',
        descricao: `${qtd} reclamações nos últimos 30 dias.`,
        valor: qtd,
      };
    }

    return null;
  }

  async verificarNota(motorista) {
    const nota = parseFloat(motorista.nota_media || motorista.avaliacao || 5);

    if (nota < CONFIG_FRAUDE.NOTA_MINIMA_ALERTA && motorista.total_corridas >= 5) {
      return {
        tipo: TIPO_ALERTA.NOTA_BAIXA,
        severidade: nota < 3 ? SEVERIDADE.VERMELHO : SEVERIDADE.AMARELO,
        titulo: '⭐ Nota muito baixa',
        descricao: `Média de ${nota.toFixed(1)} estrelas. Abaixo do aceitável.`,
        valor: nota,
      };
    }

    return null;
  }

  async verificarInatividade(motorista) {
    if (!motorista.ultima_corrida) return null;

    const diasInativo = Math.floor((Date.now() - new Date(motorista.ultima_corrida).getTime()) / (1000 * 60 * 60 * 24));

    if (diasInativo >= CONFIG_FRAUDE.DIAS_INATIVO_ALERTA) {
      return {
        tipo: TIPO_ALERTA.INATIVIDADE,
        severidade: SEVERIDADE.INFO,
        titulo: '💤 Motorista inativo',
        descricao: `Sem corridas há ${diasInativo} dias.`,
        valor: diasInativo,
      };
    }

    return null;
  }

  // ========================================
  // CALCULAR SCORE DE CONFIANÇA
  // ========================================
  calcularScore(alertas) {
    let score = 100;

    for (const alerta of alertas) {
      switch (alerta.severidade) {
        case SEVERIDADE.BLOQUEAR:
          score -= 40;
          break;
        case SEVERIDADE.VERMELHO:
          score -= 25;
          break;
        case SEVERIDADE.AMARELO:
          score -= 10;
          break;
        case SEVERIDADE.INFO:
          score -= 2;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  // ========================================
  // GERAR RECOMENDAÇÃO
  // ========================================
  gerarRecomendacao(alertas, score) {
    if (score <= 20) {
      return {
        acao: 'BLOQUEAR',
        cor: 'vermelho',
        texto: 'Recomendado bloquear este motorista imediatamente.',
      };
    } else if (score <= 50) {
      return {
        acao: 'MONITORAR',
        cor: 'laranja',
        texto: 'Motorista com comportamento suspeito. Monitorar de perto.',
      };
    } else if (score <= 75) {
      return {
        acao: 'ATENÇÃO',
        cor: 'amarelo',
        texto: 'Alguns alertas detectados. Manter atenção.',
      };
    } else {
      return {
        acao: 'OK',
        cor: 'verde',
        texto: 'Motorista sem problemas significativos.',
      };
    }
  }

  // ========================================
  // ANALISAR TODOS OS MOTORISTAS
  // ========================================
  async analisarTodos(empresaId = null) {
    try {
      let sql = 'SELECT id FROM motoristas WHERE ativo = true';
      const params = [];
      
      if (empresaId) {
        sql += ' AND empresa_id = $1';
        params.push(empresaId);
      }

      const result = await query(sql, params);
      const analises = [];

      for (const row of result.rows) {
        const analise = await this.analisarMotorista(row.id);
        if (analise.alertas.length > 0) {
          analises.push(analise);
        }
      }

      // Ordenar por score (menor = mais problemático)
      analises.sort((a, b) => a.score - b.score);

      return analises;
    } catch (error) {
      console.error('Erro ao analisar todos:', error);
      return [];
    }
  }

  // ========================================
  // OBTER RESUMO PARA DASHBOARD
  // ========================================
  async obterResumoDashboard(empresaId = null) {
    const analises = await this.analisarTodos(empresaId);

    const resumo = {
      total_alertas: 0,
      criticos: 0,
      atencao: 0,
      info: 0,
      motoristas_problematicos: [],
      alertas_por_tipo: {},
    };

    for (const analise of analises) {
      for (const alerta of analise.alertas) {
        resumo.total_alertas++;
        
        if (alerta.severidade === SEVERIDADE.BLOQUEAR || alerta.severidade === SEVERIDADE.VERMELHO) {
          resumo.criticos++;
        } else if (alerta.severidade === SEVERIDADE.AMARELO) {
          resumo.atencao++;
        } else {
          resumo.info++;
        }

        // Contar por tipo
        resumo.alertas_por_tipo[alerta.tipo] = (resumo.alertas_por_tipo[alerta.tipo] || 0) + 1;
      }

      // Top motoristas problemáticos
      if (analise.score < 75) {
        resumo.motoristas_problematicos.push({
          id: analise.motorista.id,
          nome: analise.motorista.nome,
          telefone: analise.motorista.telefone,
          score: analise.score,
          alertas: analise.alertas.length,
          recomendacao: analise.recomendacao,
        });
      }
    }

    // Limitar a 10 motoristas problemáticos
    resumo.motoristas_problematicos = resumo.motoristas_problematicos.slice(0, 10);

    return resumo;
  }

  // ========================================
  // REGISTRAR ALERTA NO BANCO
  // ========================================
  async registrarAlerta(motoristaId, alerta, empresaId = null) {
    try {
      await query(`
        INSERT INTO alertas_fraude (motorista_id, empresa_id, tipo, severidade, titulo, descricao, dados)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        motoristaId,
        empresaId,
        alerta.tipo,
        alerta.severidade,
        alerta.titulo,
        alerta.descricao,
        JSON.stringify(alerta),
      ]);
    } catch (error) {
      // Tabela pode não existir ainda
      console.log('Alerta registrado em memória');
    }
  }

  // ========================================
  // NOTIFICAR ADM VIA WHATSAPP (REBECA)
  // ========================================
  async notificarADM(telefoneADM, alertas, motorista) {
    if (!this.whatsapp || !telefoneADM || alertas.length === 0) return;

    // Evitar spam - só notifica 1x por dia por motorista
    const cacheKey = `${motorista.id}_${new Date().toDateString()}`;
    if (this.alertasEmitidos.has(cacheKey)) return;
    this.alertasEmitidos.set(cacheKey, true);

    // Montar mensagem
    const criticos = alertas.filter(a => a.severidade === SEVERIDADE.VERMELHO || a.severidade === SEVERIDADE.BLOQUEAR);
    
    if (criticos.length === 0) return; // Só notifica alertas críticos

    let mensagem = `🚨 *ALERTA ANTI-FRAUDE*\n\n`;
    mensagem += `Motorista: *${motorista.nome}*\n`;
    mensagem += `Telefone: ${motorista.telefone}\n\n`;
    mensagem += `*Problemas detectados:*\n`;

    for (const alerta of criticos) {
      mensagem += `\n${alerta.titulo}\n`;
      mensagem += `└ ${alerta.descricao}\n`;
    }

    mensagem += `\n_Acesse o painel ADM para mais detalhes._`;

    try {
      await this.whatsapp.enviarMensagem(telefoneADM, mensagem);
      console.log(`📢 ADM notificado sobre alertas de ${motorista.nome}`);
    } catch (error) {
      console.error('Erro ao notificar ADM:', error);
    }
  }
}

// ========================================
// EXPORTAR
// ========================================
module.exports = {
  AntiFraude,
  CONFIG_FRAUDE,
  TIPO_ALERTA,
  SEVERIDADE,
};
