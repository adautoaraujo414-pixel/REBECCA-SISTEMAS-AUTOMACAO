// ========================================
// REBECA - MENSAGENS PADRÃO
// Todas as mensagens que a Rebeca envia
// ========================================

const mensagens = {
  // Saudação inicial
  boasVindas: () => 'Oi, tudo bem?',

  // Pedir localização
  pedirLocalizacao: () => 'Pode me enviar o endereço ou a localização atual?',
  
  // Pedir localização (cliente recorrente - mais direto)
  pedirLocalizacaoRecorrente: () => 'Pode mandar o endereço de novo, por favor?',

  // Confirmação de recebimento
  confirmacaoRecebimento: () => 'Claro 👍',
  
  // Buscando motorista
  buscandoMotorista: () => 'Só um instante que vou verificar o motorista mais próximo.',
  
  // Alternativa de busca
  verificandoMotorista: () => 'Só um instante que vou verificar o motorista mais próximo pra você.',

  // Motorista encontrado e a caminho
  motoristaACaminho: (nome, modelo, cor) => {
    return `Prontinho 🚗\nSeu motorista já está a caminho.\n\nNome: ${nome}\nVeículo: ${modelo} ${cor}`;
  },

  // Motorista a caminho com link de localização
  motoristaACaminhoComLink: (nome, modelo, cor, link) => {
    return `Prontinho 🚗\nSeu motorista já está a caminho.\n\nNome: ${nome}\nVeículo: ${modelo} ${cor}\n\nAcompanhe a localização em tempo real por aqui:\n${link}`;
  },

  // Valor da corrida
  valorCorrida: (valor) => {
    return `O valor estimado para esse trajeto é de R$ ${valor.toFixed(2).replace('.', ',')}, conforme o valor definido pela frota.`;
  },

  // Sem desconto
  semDesconto: () => 'Esse valor é o que está configurado no sistema no momento.',

  // Sem motorista disponível
  semMotorista: () => 'No momento não temos motorista disponível na sua região. Pode tentar novamente em alguns minutos?',

  // Corrida cancelada
  corridaCancelada: () => 'Corrida cancelada. Se precisar de outra, é só chamar.',

  // Corrida finalizada
  corridaFinalizada: () => 'Corrida finalizada! Obrigada por usar nosso serviço 👍',

  // Fora do horário
  foraDoHorario: (inicio, fim) => {
    return `Oi! No momento estamos fora do horário de atendimento.\nFuncionamos das ${inicio} às ${fim}.\nMande uma mensagem nesse período que te atendo 👍`;
  },

  // Não entendi
  naoEntendi: () => 'Desculpa, não consegui entender. Pode me enviar o endereço ou a localização?',

  // Já tem corrida em andamento
  corridaEmAndamento: () => 'Você já tem uma corrida em andamento. Quer que eu cancele ela pra solicitar outra?',

  // Confirmação de cancelamento
  confirmarCancelamento: () => 'Tem certeza que quer cancelar a corrida atual?',

  // Aguardando motorista aceitar
  aguardandoAceite: () => 'Estou aguardando o motorista confirmar. Só um instante.',

  // Motorista chegou
  motoristaChegou: (nome) => `${nome} chegou no local de embarque.`,

  // Sem autorização (quando cliente pede algo fora do escopo)
  semAutorizacao: () => 'Não tenho autorização pra fazer isso. Posso te ajudar com uma corrida?',

  // Resposta genérica para manter conversa
  entendi: () => 'Entendi.',
  
  // Perfeito
  perfeito: () => 'Perfeito.',
  
  // Ok
  ok: () => 'Ok 👍',
};

module.exports = mensagens;
