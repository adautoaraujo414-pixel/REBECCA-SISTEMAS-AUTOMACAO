// ========================================
// REBECA - SERVIÇO DE GEOCODING
// VERSÃO CORRIGIDA - USA CIDADE DA EMPRESA
// ========================================

const https = require('https');
const http = require('http');

const GeocodingService = {

  // Timeout e retry
  TIMEOUT_MS: 15000,
  MAX_TENTATIVAS: 3,
  DELAY_ENTRE_TENTATIVAS: 1000,

  /**
   * Converte endereço em coordenadas
   * @param {string} endereco - Endereço digitado pelo cliente
   * @param {string} cidadeEmpresa - Cidade da empresa/frota (vem do banco)
   * @param {string} estadoEmpresa - Estado da empresa (opcional)
   */
  async geocodificar(endereco, cidadeEmpresa = null, estadoEmpresa = 'SP') {
    try {
      if (!endereco || endereco.length < 3) {
        console.log('⚠️ Endereço muito curto para geocodificar');
        return null;
      }

      // Se não passar cidade, usar vazia (vai tentar geocodificar só com endereço)
      const cidade = cidadeEmpresa || '';
      const estado = estadoEmpresa || 'SP';

      console.log(`\n🌍 === GEOCODING ===`);
      console.log(`📝 Entrada: "${endereco}"`);
      if (cidade) console.log(`🏙️ Cidade da empresa: "${cidade}"`);

      // Limpar e preparar endereço
      let enderecoLimpo = this.limparEndereco(endereco);
      console.log(`🧹 Limpo: "${enderecoLimpo}"`);
      
      // Se tem cidade da empresa, adicionar
      if (cidade && !this.temCidade(enderecoLimpo)) {
        enderecoLimpo = `${enderecoLimpo}, ${cidade}`;
        if (estado) enderecoLimpo = `${enderecoLimpo}, ${estado}`;
        console.log(`📍 Com cidade da empresa: "${enderecoLimpo}"`);
      }

      // Tentar múltiplas variações em ordem de precisão
      const variacoes = this.gerarVariacoes(endereco, enderecoLimpo, cidade, estado);
      
      for (let i = 0; i < variacoes.length; i++) {
        const variacao = variacoes[i];
        console.log(`\n🔍 Tentativa ${i + 1}/${variacoes.length}: "${variacao}"`);
        
        const resultado = await this.buscarComRetry(variacao);
        
        if (resultado) {
          console.log(`✅ ENCONTRADO: ${resultado.enderecoFormatado}`);
          console.log(`   📍 Coordenadas: ${resultado.latitude.toFixed(7)}, ${resultado.longitude.toFixed(7)}`);
          return resultado;
        }
      }

      console.log('❌ Endereço não encontrado em nenhuma tentativa');
      return null;

    } catch (error) {
      console.error('❌ Erro no geocoding:', error.message);
      return null;
    }
  },

  /**
   * Gerar variações do endereço para múltiplas tentativas
   */
  gerarVariacoes(original, limpo, cidade, estado) {
    const variacoes = [];
    
    // 1. Endereço limpo completo
    variacoes.push(limpo);
    
    // 2. Com estado explícito
    if (estado && !limpo.toLowerCase().includes(estado.toLowerCase())) {
      variacoes.push(`${limpo}, ${estado}`);
    }
    
    // 3. Com país
    variacoes.push(`${limpo}, Brazil`);
    
    // 4. Original com cidade da empresa
    if (cidade && !this.temCidade(original)) {
      variacoes.push(`${original}, ${cidade}, ${estado || 'SP'}`);
    }
    
    // 5. Sem número (às vezes ajuda)
    const semNumero = original.replace(/,?\s*\d+\s*$/, '').trim();
    if (semNumero !== original && cidade) {
      variacoes.push(`${semNumero}, ${cidade}`);
    }
    
    // 6. Só primeira parte + cidade
    const partes = original.split(',').map(p => p.trim());
    if (partes.length > 1 && cidade) {
      variacoes.push(`${partes[0]}, ${cidade}, ${estado || 'SP'}, Brasil`);
    }
    
    // Remover duplicatas
    return [...new Set(variacoes)];
  },

  /**
   * Buscar com retry
   */
  async buscarComRetry(endereco) {
    for (let tentativa = 1; tentativa <= this.MAX_TENTATIVAS; tentativa++) {
      try {
        const resultado = await this.buscarNominatim(endereco);
        if (resultado) return resultado;
        
        if (tentativa < this.MAX_TENTATIVAS) {
          await this.delay(this.DELAY_ENTRE_TENTATIVAS);
        }
      } catch (error) {
        console.log(`   ⚠️ Tentativa ${tentativa} falhou: ${error.message}`);
        if (tentativa < this.MAX_TENTATIVAS) {
          await this.delay(this.DELAY_ENTRE_TENTATIVAS);
        }
      }
    }
    return null;
  },

  /**
   * Buscar no Nominatim (OpenStreetMap)
   */
  async buscarNominatim(endereco) {
    return new Promise((resolve, reject) => {
      const query = encodeURIComponent(endereco);
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=3&countrycodes=br&addressdetails=1`;
      
      const options = {
        headers: {
          'User-Agent': 'UBMAX-Rebeca/1.0',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        }
      };

      const req = https.get(url, options, (res) => {
        let data = '';
        
        res.on('data', chunk => { data += chunk; });
        
        res.on('end', () => {
          try {
            const resultados = JSON.parse(data);
            
            if (resultados && resultados.length > 0) {
              const melhor = resultados[0];
              
              resolve({
                latitude: parseFloat(melhor.lat),
                longitude: parseFloat(melhor.lon),
                enderecoFormatado: melhor.display_name,
                bairro: melhor.address?.suburb || melhor.address?.neighbourhood || '',
                cidade: melhor.address?.city || melhor.address?.town || melhor.address?.municipality || '',
                estado: melhor.address?.state || '',
                cep: melhor.address?.postcode || '',
                tipo: melhor.type,
                confianca: melhor.importance > 0.5 ? 'alta' : 'media'
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(this.TIMEOUT_MS, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  },

  /**
   * Reverso: coordenadas → endereço
   */
  async reverso(latitude, longitude) {
    return new Promise((resolve, reject) => {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
      
      const options = {
        headers: {
          'User-Agent': 'UBMAX-Rebeca/1.0',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        }
      };

      const req = https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const resultado = JSON.parse(data);
            if (resultado && resultado.display_name) {
              resolve({
                enderecoFormatado: resultado.display_name,
                rua: resultado.address?.road || '',
                numero: resultado.address?.house_number || '',
                bairro: resultado.address?.suburb || resultado.address?.neighbourhood || '',
                cidade: resultado.address?.city || resultado.address?.town || '',
                estado: resultado.address?.state || '',
                cep: resultado.address?.postcode || ''
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(this.TIMEOUT_MS, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  },

  /**
   * Limpar endereço
   */
  limparEndereco(endereco) {
    return endereco
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s,.-áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/gi, '')
      .trim();
  },

  /**
   * Verificar se endereço já tem cidade
   */
  temCidade(endereco) {
    const lower = endereco.toLowerCase();
    // Lista de indicadores de que já tem cidade
    const indicadores = [' sp', ' mg', ' rj', ' pr', ' sc', ' rs', ' ba', ' pe', ' ce', 
      'são paulo', 'rio de janeiro', 'belo horizonte', 'curitiba', 'porto alegre',
      ' - ', ', sp', ',sp', '/ sp', '/sp'];
    return indicadores.some(ind => lower.includes(ind));
  },

  /**
   * Delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

module.exports = GeocodingService;
