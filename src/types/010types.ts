export type ModuleTab = 
  | 'dashboard'
  | 'pdv'
  | 'contas'
  | 'produtos'
  | 'estoque'
  | 'financeiro'
  | 'caixa'
  | 'relatorios'
  | 'fiscais'
  | 'historico'
  | 'notificacoes'
  | 'configuracoes';

export interface UserSession {
  username: string;
  pin?: string;
  email?: string;
  userId?: string;
  role: 'Administrador' | 'Operador';
  isAuthenticated: boolean;
}

export interface Produto010 {
  id: string;
  nome: string;
  codigo: string;
  codigo_barras?: string;
  categoria?: string;
  marca?: string;
  tipo_embalagem?: 'Unidade' | 'Caixa' | 'Fardo';
  unidades_por_caixa?: number;
  produto_pai_id?: string; // ID da unidade base compartilhada
  preco_fardo?: number;
  quantidade: number;
  preco: number;
  preco_custo?: number;
  estoque_minimo: number;
  controlar_estoque?: boolean;
  descricao?: string;
  created_at?: string;
}

export type StatusEstoque = 'Normal' | 'Estoque Baixo' | 'Sem Estoque';

export interface ItemCarrinho010 {
  produto_id: string;
  nome: string;
  codigo: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface PagamentoItem {
  forma: 'Dinheiro' | 'Pix' | 'Cartão de Débito' | 'Cartão de Crédito';
  valor: number;
  parcelas?: number;
}

export interface Venda010 {
  id: string;
  caixa_id?: string;
  numero_venda: number;
  data_hora: string;
  usuario: string;
  cliente_nome?: string;
  produtos: ItemCarrinho010[];
  subtotal: number;
  desconto_valor: number;
  desconto_porcentagem: number;
  taxa_deslocamento?: number;
  total: number;
  forma_pagamento: string; // Ex: "Pix", "Múltiplo (Dinheiro + Pix)", "Cartão de Crédito 3x"
  pagamentos?: PagamentoItem[];
  parcelas_credito?: number;
  valor_recebido?: number;
  troco?: number;
  comanda_id?: string;
  comanda_numero?: number;
  status: 'Concluída' | 'Cancelada';
}

export interface MovimentacaoEstoque010 {
  id: string;
  data_hora: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  tipo: 'Entrada' | 'Saída' | 'Ajuste';
  usuario: string;
  observacao?: string;
}

export interface ContaReceber010 {
  id: string;
  cliente_nome: string;
  venda_numero?: number;
  valor_total: number;
  valor_recebido: number;
  status: 'Recebido' | 'Em Aberto' | 'Vencido';
  data_vencimento: string;
  data_pagamento?: string;
}

export interface MovimentacaoCaixaDetalhe {
  id: string;
  hora: string;
  tipo: 'Venda' | 'Entrada' | 'Saída' | 'Despesa';
  descricao: string;
  valor: number;
  forma_pagamento?: string;
}

export interface Caixa010 {
  id: string;
  data: string; // YYYY-MM-DD
  status: 'Aberto' | 'Fechado';
  usuario_abertura: string;
  usuario_fechamento?: string;
  hora_abertura: string;
  hora_fechamento?: string;
  valor_inicial: number;
  valor_vendas: number;
  valor_entradas: number;
  valor_saidas: number;
  valor_despesas: number;
  saldo_esperado: number;
  valor_informado?: number;
  diferenca?: number;
  observacao?: string;
  movimentacoes: MovimentacaoCaixaDetalhe[];
}

export interface AuditLog010 {
  id: string;
  data_hora: string;
  usuario: string;
  acao: string;
  registro_relacionado: string;
  detalhes: string;
}

export interface Notificacao010 {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'alerta' | 'info' | 'sucesso';
  data_hora: string;
  lida: boolean;
}

export interface ConfigEmpresa {
  nome: string;
  cnpj: string;
  telefone: string;
  endereco: string;
  logo_url?: string;
}

export interface ItemCompraNFe {
  codigo_fornecedor: string;
  codigo_barras?: string;
  nome: string;
  ncm?: string;
  cfop?: string;
  unidade: string;
  quantidade: number;
  valor_unitario_custo: number;
  valor_total: number;
  produto_id?: string;
  status_associacao: 'existente' | 'novo';
}

export interface CompraEstoqueNFe {
  id: string;
  numero_nota: string;
  serie?: string;
  chave_acesso?: string;
  data_emissao: string;
  fornecedor_nome: string;
  fornecedor_cnpj?: string;
  valor_total: number;
  valor_produtos: number;
  itens: ItemCompraNFe[];
  created_at: string;
}

export interface ItemContaComanda010 {
  id: string;
  conta_id: string;
  produto_id: string;
  produto_nome: string;
  produto_codigo?: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  data_lancamento: string;
  usuario: string;
  created_at?: string;
}

export interface PagamentoContaComanda010 {
  id: string;
  conta_id: string;
  data_hora: string;
  valor: number;
  forma_pagamento: 'Dinheiro' | 'Pix' | 'Cartão de Débito' | 'Cartão de Crédito';
  usuario: string;
  venda_id?: string;
  venda_numero?: number;
  observacao?: string;
  created_at?: string;
}

export interface ItemPagoComanda {
  itemId: string;
  produtoId: string;
  nome: string;
  codigo?: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}


export interface ContaComanda010 {
  id: string;
  numero_conta: number; // Ex: 1001, 1002
  cliente_nome: string;
  status: 'ABERTA' | 'ENCERRADA' | 'CANCELADA';
  data_abertura: string;
  data_encerramento?: string;
  usuario_abertura: string;
  usuario_encerramento?: string;
  total: number;
  venda_id?: string;
  venda_numero?: number;
  observacao?: string;
  itens: ItemContaComanda010[];
  total_pago?: number;
  saldo_restante?: number;
  pagamentos?: PagamentoContaComanda010[];
  created_at?: string;
}
