import { X, Calendar, DollarSign, User, FileText, MapPin, Percent, ExternalLink, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Parcela {
  id: string;
  numeroParcela: number;
  valorParcela: number;
  dataVencimento: string;
  status: string;
  boletoCoraId?: string | null;
  linhaDigitavel?: string | null;
  linkBoleto?: string | null;
}

interface Renegociacao {
  id: string;
  numeroAcordo: string;
  numeroContrato?: string | null;
  clienteId: string;
  contact?: { name: string; phone: string } | null;
  dataNegociacao: string;
  status: string;
  linkAssinaturaContrato?: string | null;
  valorTotal: number;
  qtdParcelas: number;
  dataPrimeiraParcela: string;
  intervaloDias: number;
  faturasIds: string[];
  devedorDados?: any;
  createdById?: string | null;
  createdBy?: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  parcelas: Parcela[];
}

interface DetalhesRenegociacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  acordo: Renegociacao | null;
}

export function DetalhesRenegociacaoModal({ isOpen, onClose, acordo }: DetalhesRenegociacaoModalProps) {
  if (!isOpen || !acordo) return null;

  const devedor = acordo.devedorDados || {};
  const statusLabels: Record<string, string> = {
    'AGUARDANDO_ASSINATURA': 'Aguardando Assinatura',
    'ATIVA': 'Ativa',
    'QUITADA': 'Quitada',
    'QUEBRADA': 'Quebrada',
    'CANCELADA': 'Cancelada'
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'AGUARDANDO_ASSINATURA': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ATIVA': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'QUITADA': return 'bg-green-100 text-green-800 border-green-200';
      case 'QUEBRADA': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-subtle text-ink border-line';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data Inválida';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-4xl overflow-hidden my-8 border border-line">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line bg-subtle">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-ink">Acordo #{acordo.numeroAcordo}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(acordo.status)}`}>
                {statusLabels[acordo.status] || acordo.status}
              </span>
            </div>
            <p className="text-sm text-ink-faint mt-1">Registrado em {formatDate(acordo.createdAt)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-faint hover:text-ink-soft rounded-full hover:bg-subtle transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bloco 1: Devedor */}
            <div className="md:col-span-2 space-y-4">
              
              <div className="border border-line rounded-lg p-4 bg-surface shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2 border-b border-line pb-2">
                  <User className="w-4 h-4 text-[#002f6c]" /> 
                  Dados do Devedor
                </h3>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                  <div>
                    <span className="text-ink-faint block">Nome / Razão Social</span>
                    <span className="font-semibold text-ink">{acordo.contact?.name || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block">CPF / CNPJ</span>
                    <span className="font-semibold text-ink">{acordo.clienteId}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block">RG</span>
                    <span className="font-semibold text-ink">{devedor.rg || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block">Profissão</span>
                    <span className="font-semibold text-ink">{devedor.profissao || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block">Nacionalidade</span>
                    <span className="font-semibold text-ink">{devedor.nacionalidade || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block">Estado Civil</span>
                    <span className="font-semibold text-ink">{devedor.estadoCivil || 'Não informado'}</span>
                  </div>
                  {devedor.nomeRepresentante && (
                    <div className="col-span-2">
                      <span className="text-ink-faint block">Representante Legal</span>
                      <span className="font-semibold text-ink">{devedor.nomeRepresentante}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div className="border border-line rounded-lg p-4 bg-surface shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2 border-b border-line pb-2">
                  <MapPin className="w-4 h-4 text-[#002f6c]" /> 
                  Endereço do Devedor
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-4 text-xs">
                  <div className="col-span-2">
                    <span className="text-ink-faint block">Logradouro</span>
                    <span className="font-medium text-ink">{devedor.endereco || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block">Número</span>
                    <span className="font-medium text-ink">{devedor.numero || 'S/N'}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block">Bairro</span>
                    <span className="font-medium text-ink">{devedor.bairro || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block">Cidade / UF</span>
                    <span className="font-medium text-ink">{devedor.cidade ? `${devedor.cidade}/${devedor.uf || 'MA'}` : 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint block">CEP</span>
                    <span className="font-medium text-ink">{devedor.cep || 'Não informado'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bloco 2: Lado Financeiro */}
            <div className="space-y-4">
              
              <div className="border border-line rounded-lg p-4 bg-surface shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2 border-b border-line pb-2">
                  <DollarSign className="w-4 h-4 text-[#002f6c]" /> 
                  Valores e Taxas
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Valor Total Negociado</span>
                    <span className="font-bold text-ink text-sm">{formatCurrency(acordo.valorTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Número de Parcelas</span>
                    <span className="font-semibold text-ink">{acordo.qtdParcelas}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Intervalo de Vencimento</span>
                    <span className="font-semibold text-ink">
                      {acordo.intervaloDias === 30 ? 'Mensal' : acordo.intervaloDias === 15 ? 'Quinzenal' : acordo.intervaloDias === 7 ? 'Semanal' : `${acordo.intervaloDias} dias`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-line pt-2">
                    <span className="text-ink-faint">Multa Moratória</span>
                    <span className="font-semibold text-ink">{devedor.multa ?? 10}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Juros de Mora</span>
                    <span className="font-semibold text-ink">{devedor.juros ?? 1}% / mês</span>
                  </div>
                  
                  {devedor.temEntrada && (
                    <div className="bg-blue-50 p-2.5 rounded border border-blue-100 mt-2 space-y-1">
                      <span className="font-semibold text-blue-900 block">Dados da Entrada</span>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-blue-700">Valor:</span>
                        <span className="font-bold text-blue-900">{formatCurrency(devedor.valorEntrada)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-blue-700">Vencimento:</span>
                        <span className="font-bold text-blue-900">{formatDate(devedor.dataEntrada)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Assinatura / Contrato */}
              <div className="border border-line rounded-lg p-4 bg-surface shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2 border-b border-line pb-2">
                  <FileText className="w-4 h-4 text-[#002f6c]" /> 
                  Contrato Digital
                </h3>
                <div className="space-y-3">
                  {acordo.linkAssinaturaContrato ? (
                    <a 
                      href={acordo.linkAssinaturaContrato} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-[#002f6c] text-white hover:bg-[#001f4c] rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver Contrato (Clicksign)
                    </a>
                  ) : (
                    <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-100 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Sem link de assinatura disponível para este acordo.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Operador de Fechamento */}
              <div className="border border-line rounded-lg p-4 bg-surface shadow-sm space-y-2 bg-subtle/50">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#002f6c]" />
                  Operador do Fechamento
                </span>
                {acordo.createdBy ? (
                  <div className="text-xs">
                    <div className="font-semibold text-ink">{acordo.createdBy.name}</div>
                    <div className="text-ink-faint text-[11px]">{acordo.createdBy.email}</div>
                  </div>
                ) : (
                  <div className="text-xs text-ink-faint italic">Não associado (Sistema)</div>
                )}
              </div>

            </div>

          </div>

          {/* Tabela de Parcelas */}
          <div className="border border-line rounded-lg overflow-hidden shadow-sm bg-surface">
            <div className="p-4 bg-subtle border-b border-line flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Cronograma de Parcelas</h3>
              <span className="text-xs text-ink-faint">{acordo.parcelas.length} parcelas geradas</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-subtle text-ink-faint uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Parcela</th>
                    <th className="px-4 py-2.5">Vencimento</th>
                    <th className="px-4 py-2.5">Valor</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Boleto Cora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {acordo.parcelas.map((p) => {
                    const statusColors: Record<string, string> = {
                      'PENDENTE': 'bg-yellow-50 text-yellow-800 border-yellow-100',
                      'PAGA': 'bg-green-50 text-green-800 border-green-100',
                      'ATRASADA': 'bg-red-50 text-red-800 border-red-100'
                    };

                    return (
                      <tr key={p.id} className="hover:bg-subtle/50">
                        <td className="px-4 py-3 font-semibold text-ink">
                          {p.numeroParcela} / {acordo.qtdParcelas}
                        </td>
                        <td className="px-4 py-3">
                          {formatDate(p.dataVencimento)}
                        </td>
                        <td className="px-4 py-3 font-bold text-ink">
                          {formatCurrency(p.valorParcela)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${statusColors[p.status] || 'bg-subtle text-ink-soft'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.linkBoleto ? (
                            <a 
                              href={p.linkBoleto} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[#002f6c] hover:text-[#001f4c] font-semibold hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Visualizar Boleto
                            </a>
                          ) : (
                            <span className="text-ink-faint italic">Sem boleto gerado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-line bg-subtle">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-ink-soft bg-surface border border-line rounded-lg hover:bg-subtle transition-colors shadow-sm"
          >
            Fechar Detalhes
          </button>
        </div>

      </div>
    </div>
  );
}
