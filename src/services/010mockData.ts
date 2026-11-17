import { 
  Produto010, 
  Venda010, 
  MovimentacaoEstoque010, 
  ContaReceber010, 
  Caixa010, 
  AuditLog010, 
  Notificacao010,
  ConfigEmpresa
} from '../types/010types';

// Arrays de dados zerados para uso de dados reais
export const INITIAL_PRODUTOS_010: Produto010[] = [];
export const INITIAL_VENDAS_010: Venda010[] = [];
export const INITIAL_MOVIMENTACOES_010: MovimentacaoEstoque010[] = [];
export const INITIAL_CONTAS_RECEBER_010: ContaReceber010[] = [];
export const INITIAL_CAIXAS_010: Caixa010[] = [];
export const INITIAL_AUDIT_LOGS_010: AuditLog010[] = [];
export const INITIAL_NOTIFICACOES_010: Notificacao010[] = [];

export const INITIAL_CONFIG_EMPRESA: ConfigEmpresa = {
  nome: 'Bar do Lima',
  cnpj: '00.000.000/0001-00',
  telefone: '(63) 99999-0000',
  endereco: 'Centro',
  logo_url: '/logo.png'
};
