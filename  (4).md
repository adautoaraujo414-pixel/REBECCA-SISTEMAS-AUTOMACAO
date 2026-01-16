# 📋 REGRAS DO SISTEMA REBECA

## 🏢 ARQUITETURA - CADA EMPRESA TEM SUA REBECA

A Rebeca **não é uma só**! Cada empresa (ADM) configura SEU número da Rebeca e ela opera exclusivamente para aquela empresa.

```
┌─────────────────────────────────────────────────────────────┐
│                    MASTER (Você - SaaS)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   EMPRESA A     │  │   EMPRESA B     │  │  EMPRESA C  │ │
│  │   (ADM João)    │  │   (ADM Maria)   │  │  (ADM Pedro)│ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────┤ │
│  │ 🤖 Rebeca A     │  │ 🤖 Rebeca B     │  │ 🤖 Rebeca C │ │
│  │ Tel: 5514...001 │  │ Tel: 5511...002 │  │ Tel: 5521...│ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────┤ │
│  │ 🚗 Motoristas A │  │ 🚗 Motoristas B │  │ 🚗 Motor. C │ │
│  │ 👥 Clientes A   │  │ 👥 Clientes B   │  │ 👥 Client. C│ │
│  │ 📊 Corridas A   │  │ 📊 Corridas B   │  │ 📊 Corr. C  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                             │
│        TOTALMENTE ISOLADOS - NÃO SE MISTURAM!              │
└─────────────────────────────────────────────────────────────┘
```

### Como funciona:

| Componente | Descrição |
|------------|-----------|
| **ADM** | É uma EMPRESA que contrata o SaaS |
| **Rebeca da Empresa** | Número próprio configurado pelo ADM |
| **Motoristas** | Pertencem APENAS àquela empresa |
| **Clientes** | Atendidos APENAS pela Rebeca daquela empresa |
| **Dados** | 100% isolados, ninguém vê de outra empresa |

### Exemplo Prático:

```
EMPRESA "UBMAX Transportes" (ADM João)
├── WhatsApp Rebeca: 5514999990001
├── WhatsApp ADM: 5514999990002
├── Motoristas: João, Pedro, Maria
└── Clientes: Apenas quem manda msg pro 5514999990001

EMPRESA "Táxi Rápido" (ADM Maria)  
├── WhatsApp Rebeca: 5511888880001  ← OUTRO NÚMERO
├── WhatsApp ADM: 5511888880002
├── Motoristas: Carlos, Ana, Roberto
└── Clientes: Apenas quem manda msg pro 5511888880001

❌ Cliente da UBMAX NÃO aparece na Táxi Rápido
❌ Motorista da Táxi Rápido NÃO recebe corrida da UBMAX
```

---

## 📞 REGRAS DE COMUNICAÇÃO

### REGRA PRINCIPAL:
> **Cliente ↔ Rebeca DA EMPRESA ↔ Motorista**
> 
> Cliente e Motorista **NUNCA** falam diretamente!

---

## 🔐 PRIVACIDADE

- Cliente NÃO vê telefone do motorista
- Motorista NÃO vê telefone do cliente
- CVS (Central) para ligações sem expor números

---

_Sistema REBECA - Multi-tenant • Cada Empresa = Sua Rebeca_
