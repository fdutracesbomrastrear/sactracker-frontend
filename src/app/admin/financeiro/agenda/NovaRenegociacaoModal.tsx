import { useState, useEffect } from 'react';
import { getToken } from '@/modules/core/lib/auth';
import { X, Calendar, DollarSign, User, FileText, MapPin, Percent, HelpCircle } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  cpfCnpj?: string;
}

interface Fatura {
  id: string;
  valorCalculado: string;
  dataVencimento: string;
  dataFormatada: string;
  status: string;
  statusTexto: string;
  diasAtraso: number;
}

interface NovaRenegociacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function parseEnderecoRastro(enderecoStr: string) {
  if (!enderecoStr) return null;
  // Formato: "65.470-000 - SAO PEDRO - 60 - AIRTON SENNA - São Mateus do Maranhão - MA"
  const parts = enderecoStr.split(' - ').map(p => p.trim());
  if (parts.length >= 6) {
    return {
      cep: parts[0],
      bairro: parts[1],
      numero: parts[2],
      logradouro: parts[3],
      cidade: parts[4],
      uf: parts[5]
    };
  }
  return null;
}

export function NovaRenegociacaoModal({ isOpen, onClose, onSuccess }: NovaRenegociacaoModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Form State - Base
  const [contactId, setContactId] = useState('');
  const [clienteId, setClienteId] = useState(''); // CPF/CNPJ
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [qtdParcelas, setQtdParcelas] = useState('1');
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState('');
  const [intervaloDias, setIntervaloDias] = useState('30');

  // Devedor Info (Template placeholders)
  const [nacionalidade, setNacionalidade] = useState('brasileiro(a)');
  const [estadoCivil, setEstadoCivil] = useState('solteiro(a)');
  const [profissao, setProfissao] = useState('autônomo(a)');
  const [rg, setRg] = useState('');
  const [nomeRepresentante, setNomeRepresentante] = useState('');
  const [enderecoLogradouro, setEnderecoLogradouro] = useState('');
  const [enderecoNumero, setEnderecoNumero] = useState('');
  const [enderecoBairro, setEnderecoBairro] = useState('');
  const [enderecoCidade, setEnderecoCidade] = useState('');
  const [enderecoUf, setEnderecoUf] = useState('MA');
  const [enderecoCep, setEnderecoCep] = useState('');

  // Entrada e Outros
  const [temEntrada, setTemEntrada] = useState(false);
  const [valorEntrada, setValorEntrada] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('boleto bancário / chave PIX');
  const [chavePix, setChavePix] = useState('55.474.736/0001-93'); // CNPJ Credor default
  const [indiceCorrecao, setIndiceCorrecao] = useState('IGPM/IPCA');
  const [diasTolerancia, setDiasTolerancia] = useState('5');
  const [cidadeEmissao, setCidadeEmissao] = useState('Miranda do Norte');
  const [multa, setMulta] = useState('10');
  const [juros, setJuros] = useState('1');

  // Faturas State
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [selectedFaturaIds, setSelectedFaturaIds] = useState<string[]>([]);
  const [loadingFaturas, setLoadingFaturas] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const response = await fetch('/api/contacts', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data.data || data);
      }
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    const cleanId = clienteId.replace(/\D/g, '');
    if (cleanId.length === 11 || cleanId.length === 14) {
      fetchFaturas(cleanId);
    } else {
      setFaturas([]);
      setSelectedFaturaIds([]);
    }
  }, [clienteId]);

  // Debounce para pesquisa de clientes no Rastro System
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery === selectedClientName) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const response = await fetch(`/api/financeiro/faturas?q=${encodeURIComponent(searchQuery)}&take=20`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.clientes || []);
        }
      } catch (error) {
        console.error('Erro ao buscar clientes da Rastro:', error);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedClientName]);

  const handleSelectRastroClient = async (clientGroup: any) => {
    const p = clientGroup.pessoa;
    setClienteId(p.documento || '');
    setSelectedClientName(p.nome || '');
    setClientPhone(p.celular || p.telefone || '');
    setIsSearchDropdownOpen(false);
    setSearchQuery(p.nome);
    setRg(p.documento || '');

    // Salvar as faturas do cliente
    setFaturas(clientGroup.faturas || []);
    setSelectedFaturaIds([]);
    
    // Auto-preencher endereço com fallback
    if (p.endereco) {
      const parsed = parseEnderecoRastro(p.endereco);
      if (parsed) {
        setEnderecoCep(parsed.cep || '');
        setEnderecoBairro(parsed.bairro || '');
        setEnderecoNumero(parsed.numero || '');
        setEnderecoLogradouro(parsed.logradouro || '');
        setEnderecoCidade(parsed.cidade || '');
        setEnderecoUf(parsed.uf || 'MA');
      } else {
        setEnderecoLogradouro(p.endereco);
        setEnderecoCep('');
        setEnderecoBairro('');
        setEnderecoNumero('');
        setEnderecoCidade('');
        setEnderecoUf('MA');
      }
    } else {
      setEnderecoCep('');
      setEnderecoBairro('');
      setEnderecoNumero('');
      setEnderecoLogradouro('');
      setEnderecoCidade('');
      setEnderecoUf('MA');
    }

    // Verificar se já existe esse contato no SacTracker
    try {
      const docClean = (p.documento || '').replace(/\D/g, '');
      const telClean = (p.celular || p.telefone || '').replace(/\D/g, '');
      
      const response = await fetch(`/api/contacts?q=${encodeURIComponent(docClean || telClean)}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const list = await response.json();
        if (list && list.length > 0) {
          setContactId(list[0].id);
        } else {
          setContactId('');
        }
      }
    } catch (err) {
      console.error('Erro ao verificar contato existente:', err);
    }
  };

  const fetchFaturas = async (documento: string) => {
    setLoadingFaturas(true);
    try {
      const response = await fetch(`/api/financeiro/consulta/${documento}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFaturas(data.faturas || []);

        // Pré-preenche endereço do Rastro System se encontrado
        if (data.pessoa && data.pessoa.endereco) {
          const parsed = parseEnderecoRastro(data.pessoa.endereco);
          if (parsed) {
            setEnderecoCep(parsed.cep || '');
            setEnderecoBairro(parsed.bairro || '');
            setEnderecoNumero(parsed.numero || '');
            setEnderecoLogradouro(parsed.logradouro || '');
            setEnderecoCidade(parsed.cidade || '');
            setEnderecoUf(parsed.uf || 'MA');
          }
        }
      } else {
        setFaturas([]);
      }
    } catch (error) {
      console.error('Erro ao buscar faturas:', error);
      setFaturas([]);
    } finally {
      setLoadingFaturas(false);
    }
  };

  const handleToggleFatura = (fatura: Fatura) => {
    setSelectedFaturaIds(prev => {
      const isSelected = prev.includes(fatura.id);
      let newSelected = prev;
      if (isSelected) {
        newSelected = prev.filter(id => id !== fatura.id);
      } else {
        newSelected = [...prev, fatura.id];
      }
      
      const faturasSelecionadas = faturas.filter(f => newSelected.includes(f.id));
      const soma = faturasSelecionadas.reduce((acc, f) => {
        const vStr = f.valorCalculado.replace(/\./g, '').replace(',', '.');
        return acc + parseFloat(vStr || '0');
      }, 0);
      
      setValorTotal(soma > 0 ? soma.toFixed(2) : '');
      return newSelected;
    });
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedContactId = e.target.value;
    setContactId(selectedContactId);
    
    const contact = contacts.find(c => c.id === selectedContactId);
    if (contact && contact.cpfCnpj) {
      setClienteId(contact.cpfCnpj);
    } else {
      setClienteId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || !valorTotal || !qtdParcelas || !dataPrimeiraParcela) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoadingSubmit(true);

    // Encontra datas inicial e final do atraso das faturas selecionadas
    let dataInicioAtraso = '';
    let dataFimAtraso = '';
    if (selectedFaturaIds.length > 0) {
      const selecionadas = faturas.filter(f => selectedFaturaIds.includes(f.id));
      const datas = selecionadas.map(f => new Date(f.dataVencimento).getTime()).sort((a, b) => a - b);
      dataInicioAtraso = new Date(datas[0]).toISOString();
      dataFimAtraso = new Date(datas[datas.length - 1]).toISOString();
    }

    try {
      const response = await fetch('/api/renegociacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          contactId,
          clienteId: clienteId || 'N/A',
          valorTotal: parseFloat(valorTotal.replace(',', '.')),
          qtdParcelas: parseInt(qtdParcelas, 10),
          dataPrimeiraParcela,
          intervaloDias: parseInt(intervaloDias, 10),
          faturasIds: selectedFaturaIds,
          devedorDados: {
            nome: selectedClientName,
            telefone: clientPhone,
            nacionalidade,
            estadoCivil,
            profissao,
            rg,
            cpfCnpj: clienteId,
            nomeRepresentante: clienteId.replace(/\D/g, '').length > 11 ? nomeRepresentante : '',
            endereco: enderecoLogradouro,
            numero: enderecoNumero,
            bairro: enderecoBairro,
            cidade: enderecoCidade,
            uf: enderecoUf,
            cep: enderecoCep,
            temEntrada,
            valorEntrada: temEntrada ? parseFloat(valorEntrada || '0') : null,
            dataEntrada: temEntrada ? dataEntrada : null,
            chavePix,
            indiceCorrecao,
            diasTolerancia: parseInt(diasTolerancia, 10) || 5,
            cidadeEmissao,
            multa: parseFloat(multa) || 10,
            juros: parseFloat(juros) || 1,
            dataInicioAtraso,
            dataFimAtraso
          }
        })
      });

      if (response.ok) {
        onSuccess();
        onClose();
        // Limpar form
        setContactId('');
        setClienteId('');
        setValorTotal('');
        setQtdParcelas('1');
        setDataPrimeiraParcela('');
        setIntervaloDias('30');
        setFaturas([]);
        setSelectedFaturaIds([]);
        setSearchQuery('');
        setSearchResults([]);
        setIsSearchDropdownOpen(false);
        setSelectedClientName('');
        setClientPhone('');
        
        // Limpar Devedor
        setRg('');
        setNomeRepresentante('');
        setEnderecoLogradouro('');
        setEnderecoNumero('');
        setEnderecoBairro('');
        setEnderecoCidade('');
        setEnderecoUf('MA');
        setEnderecoCep('');
        setTemEntrada(false);
        setValorEntrada('');
        setDataEntrada('');
        setMulta('10');
        setJuros('1');
      } else {
        const err = await response.json();
        alert(`Erro: ${err.error || 'Falha ao criar acordo'}`);
      }
    } catch (error) {
      console.error(error);
      alert('Erro interno ao criar acordo.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (!isOpen) return null;

  const isPJ = clienteId.replace(/\D/g, '').length > 11;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-3xl overflow-hidden my-8">
        <div className="flex items-center justify-between p-6 border-b border-line bg-subtle">
          <div>
            <h2 className="text-xl font-bold text-ink">Novo Acordo Financeiro</h2>
            <p className="text-sm text-ink-faint">Crie uma renegociação e envie o termo para assinatura eletrônica.</p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-faint hover:text-ink-soft rounded-full hover:bg-subtle transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* SEÇÃO 1: DADOS DO CLIENTE */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2 border-b border-line pb-2">
              <User className="w-4 h-4 text-[#002f6c]" /> 
              Dados Principais do Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-medium text-ink-soft mb-1">Pesquisar Cliente (Rastro System) *</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-line rounded focus:ring-1 focus:ring-[#002f6c] focus:border-[#002f6c] outline-none text-sm"
                  placeholder="Nome, CPF/CNPJ ou telefone..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  required
                />
                
                {isSearchDropdownOpen && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full bg-surface border border-line mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto text-sm">
                    {searchResults.map((c: any) => (
                      <button
                        key={c.pessoa.id}
                        type="button"
                        className="w-full text-left p-2.5 hover:bg-subtle border-b border-line flex justify-between items-center transition-colors"
                        onClick={() => handleSelectRastroClient(c)}
                      >
                        <div className="pr-2">
                          <div className="font-semibold text-ink">{c.pessoa.nome}</div>
                          <div className="text-xs text-ink-faint">{c.pessoa.documento}</div>
                        </div>
                        {c.pessoa.celular && (
                          <div className="text-xs text-ink-faint font-mono shrink-0">{c.pessoa.celular}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {loadingSearch && (
                  <div className="absolute right-3 top-7 text-xs text-ink-faint">Buscando...</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">CPF/CNPJ (Cliente ID) *</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-line rounded focus:ring-1 focus:ring-[#002f6c] focus:border-[#002f6c] outline-none text-sm bg-subtle"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  placeholder="Preenchido automaticamente"
                  readOnly
                  required
                />
              </div>
            </div>

            {/* Listagem das Faturas */}
            {clienteId.replace(/\D/g, '').length >= 11 && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-ink-soft mb-2">Selecione as Faturas em Atraso para Renegociar:</label>
                {loadingFaturas ? (
                  <div className="text-xs text-ink-faint">Buscando faturas do cliente no sistema...</div>
                ) : faturas.length > 0 ? (
                  <div className="border border-line rounded max-h-36 overflow-y-auto bg-subtle p-2 space-y-2">
                    {faturas.map(f => (
                      <label key={f.id} className="flex items-center gap-3 p-2 bg-surface border border-line rounded cursor-pointer hover:bg-subtle transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedFaturaIds.includes(f.id)}
                          onChange={() => handleToggleFatura(f)}
                          className="w-4 h-4 text-[#002f6c] border-line rounded focus:ring-[#002f6c]"
                        />
                        <div className="flex-1 text-xs">
                          <div className="font-semibold text-ink">
                            Fatura #{f.id} <span className="text-ink-faint font-normal">({f.statusTexto})</span>
                          </div>
                          <div className="text-ink-faint">Vencimento: {f.dataFormatada}</div>
                        </div>
                        <div className="text-xs font-bold text-[#002f6c]">
                          R$ {f.valorCalculado}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-ink-faint bg-yellow-50 p-2.5 rounded border border-yellow-100 text-yellow-800">
                    Nenhuma fatura em atraso encontrada para este CPF/CNPJ no sistema.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO 2: DADOS CADASTRAIS DO CONTRATO */}
          {clienteId.replace(/\D/g, '').length >= 11 && (
            <div className="space-y-4 pt-4 border-t border-line">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2 border-b border-line pb-2">
                <FileText className="w-4 h-4 text-[#002f6c]" /> 
                Informações de Registro do Devedor (Contrato)
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-ink-soft mb-1">Nacionalidade *</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-line rounded outline-none"
                    value={nacionalidade} 
                    onChange={e => setNacionalidade(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1">Estado Civil *</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-line rounded outline-none" 
                    value={estadoCivil} 
                    onChange={e => setEstadoCivil(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1">Profissão *</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-line rounded outline-none" 
                    value={profissao} 
                    onChange={e => setProfissao(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1">CPF / CNPJ (Devedor) *</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-line rounded outline-none" 
                    value={rg} 
                    onChange={e => setRg(e.target.value)} 
                    placeholder="000.000.000-00" 
                    required 
                  />
                </div>
                
                {isPJ && (
                  <div className="col-span-2 md:col-span-4 bg-blue-50/50 p-3 rounded border border-blue-100 space-y-2">
                    <label className="block text-ink font-medium">Representante Legal (para Pessoa Jurídica) *</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-line rounded outline-none bg-surface" 
                      value={nomeRepresentante} 
                      onChange={e => setNomeRepresentante(e.target.value)} 
                      placeholder="Nome completo do sócio-administrador" 
                      required={isPJ} 
                    />
                  </div>
                )}
              </div>

              {/* Endereço */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-semibold text-ink-soft flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-ink-faint" />
                  Endereço do Devedor
                </span>
                
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                  <div className="col-span-2 md:col-span-4">
                    <label className="block text-ink-soft mb-1">Rua / Logradouro *</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-line rounded outline-none" 
                      value={enderecoLogradouro} 
                      onChange={e => setEnderecoLogradouro(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-ink-soft mb-1">Número *</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-line rounded outline-none" 
                      value={enderecoNumero} 
                      onChange={e => setEnderecoNumero(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-ink-soft mb-1">CEP *</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-line rounded outline-none" 
                      value={enderecoCep} 
                      onChange={e => setEnderecoCep(e.target.value)} 
                      placeholder="65000-000"
                      required 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-ink-soft mb-1">Bairro *</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-line rounded outline-none" 
                      value={enderecoBairro} 
                      onChange={e => setEnderecoBairro(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-ink-soft mb-1">Cidade *</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-line rounded outline-none" 
                      value={enderecoCidade} 
                      onChange={e => setEnderecoCidade(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="col-span-2 md:col-span-2">
                    <label className="block text-ink-soft mb-1">UF (Estado) *</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-line rounded outline-none" 
                      value={enderecoUf} 
                      onChange={e => setEnderecoUf(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 3: DADOS DA NEGOCIAÇÃO */}
          <div className="space-y-4 pt-4 border-t border-line">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2 border-b border-line pb-2">
              <DollarSign className="w-4 h-4 text-[#002f6c]" /> 
              Condições da Negociação
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Valor Total do Acordo (R$) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-ink-faint" />
                  </div>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full pl-10 p-2 border border-line rounded focus:ring-1 focus:ring-[#002f6c] focus:border-[#002f6c] outline-none text-sm"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Quantidade de Parcelas *</label>
                <select 
                  className="w-full p-2 border border-line rounded focus:ring-1 focus:ring-[#002f6c] focus:border-[#002f6c] outline-none text-sm bg-surface"
                  value={qtdParcelas}
                  onChange={(e) => setQtdParcelas(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36].map(n => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Data Vencimento 1ª Parcela *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-ink-faint" />
                  </div>
                  <input 
                    type="date" 
                    className="w-full pl-10 p-2 border border-line rounded focus:ring-1 focus:ring-[#002f6c] focus:border-[#002f6c] outline-none text-sm"
                    value={dataPrimeiraParcela}
                    onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Intervalo entre Parcelas</label>
                <select 
                  className="w-full p-2 border border-line rounded focus:ring-1 focus:ring-[#002f6c] focus:border-[#002f6c] outline-none text-sm bg-surface"
                  value={intervaloDias}
                  onChange={(e) => setIntervaloDias(e.target.value)}
                >
                  <option value="30">Mensal (30 dias)</option>
                  <option value="15">Quinzenal (15 dias)</option>
                  <option value="7">Semanal (7 dias)</option>
                </select>
              </div>
            </div>

            {/* Configuração da Entrada */}
            <div className="bg-subtle p-4 rounded border border-line space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-ink-soft">
                <input 
                  type="checkbox" 
                  checked={temEntrada}
                  onChange={(e) => setTemEntrada(e.target.checked)}
                  className="w-4 h-4 text-[#002f6c] border-line rounded focus:ring-[#002f6c]"
                />
                Exige pagamento de entrada?
              </label>

              {temEntrada && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-ink-soft mb-1">Valor da Entrada (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full p-2 border border-line rounded outline-none text-xs bg-surface"
                      value={valorEntrada} 
                      onChange={e => setValorEntrada(e.target.value)} 
                      placeholder="0.00"
                      required={temEntrada}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-ink-soft mb-1">Data Vencimento da Entrada</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-line rounded outline-none text-xs bg-surface"
                      value={dataEntrada} 
                      onChange={e => setDataEntrada(e.target.value)} 
                      required={temEntrada}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Outros Detalhes de Configuração do Contrato */}
            <div className="bg-subtle/50 p-4 rounded border border-line">
              <span className="text-xs font-semibold text-ink-soft flex items-center gap-1.5 mb-3">
                <Percent className="w-4 h-4 text-[#002f6c]" />
                Variáveis Especiais do Contrato
              </span>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="block text-ink-soft mb-1">Forma de Pagamento (Texto)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-line rounded bg-surface outline-none" 
                    value={formaPagamento} 
                    onChange={e => setFormaPagamento(e.target.value)} 
                    placeholder="boleto bancário / PIX"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-ink-soft mb-1">Chave PIX do Contrato</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-line rounded bg-surface outline-none" 
                    value={chavePix} 
                    onChange={e => setChavePix(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1">Índice Correção</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-line rounded bg-surface outline-none" 
                    value={indiceCorrecao} 
                    onChange={e => setIndiceCorrecao(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1">Dias Tolerância</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border border-line rounded bg-surface outline-none" 
                    value={diasTolerancia} 
                    onChange={e => setDiasTolerancia(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1">Multa Moratória (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full p-2 border border-line rounded bg-surface outline-none" 
                    value={multa} 
                    onChange={e => setMulta(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1">Juros de Mora (% / mês)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full p-2 border border-line rounded bg-surface outline-none" 
                    value={juros} 
                    onChange={e => setJuros(e.target.value)} 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-ink-soft mb-1">Cidade Emissão Contrato</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-line rounded bg-surface outline-none" 
                    value={cidadeEmissao} 
                    onChange={e => setCidadeEmissao(e.target.value)} 
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-line">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-ink-soft bg-surface border border-line rounded-lg hover:bg-subtle transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loadingSubmit}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#002f6c] hover:bg-[#001f4c] rounded-lg transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {loadingSubmit ? (
                <>Gerando Acordo...</>
              ) : (
                <>Gerar e Enviar para Assinatura</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
