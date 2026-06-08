import { useState, useEffect } from 'react';
import { getToken } from '@/modules/core/lib/auth';
import { X, Save, HelpCircle, FileText } from 'lucide-react';

interface ConfigurarContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigurarContratoModal({ isOpen, onClose }: ConfigurarContratoModalProps) {
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplate();
    }
  }, [isOpen]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/renegociacoes/template', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
      }
    } catch (error) {
      console.error('Erro ao buscar template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/renegociacoes/template', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ template })
      });

      if (response.ok) {
        alert('Modelo de contrato salvo com sucesso!');
        onClose();
      } else {
        const err = await response.json();
        alert(`Erro: ${err.error || 'Falha ao salvar template'}`);
      }
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      alert('Erro interno ao salvar template.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line bg-subtle">
          <div>
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#002f6c]" />
              Configurar Modelo do Contrato
            </h2>
            <p className="text-sm text-ink-faint">Defina o texto padrão e as cláusulas usadas para as renegociações.</p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-faint hover:text-ink-soft rounded-full hover:bg-subtle transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Editor Area */}
          <div className="flex-1 p-6 flex flex-col space-y-3">
            <label className="block text-sm font-semibold text-ink-soft">Texto do Contrato (Termo de Confissão de Dívida) *</label>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-ink-faint">
                Carregando modelo...
              </div>
            ) : (
              <textarea
                className="flex-1 w-full p-4 border border-line rounded-lg focus:ring-2 focus:ring-[#002f6c] focus:border-[#002f6c] outline-none font-mono text-sm resize-none bg-subtle/50"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Insira o texto do contrato aqui..."
              />
            )}
          </div>

          {/* Placeholders Cheat Sheet */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-line bg-subtle p-6 overflow-y-auto">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5 mb-4">
              <HelpCircle className="w-4 h-4 text-[#002f6c]" />
              Placeholders Disponíveis
            </h3>
            <p className="text-xs text-ink-faint mb-4">Esses códigos serão substituídos automaticamente pelos dados do acordo antes de gerar o PDF:</p>
            
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-ink-soft uppercase tracking-wider mb-1.5 text-[10px]">Credor (Fixo no Sistema)</h4>
                <p className="text-[11px] text-ink-faint">RS TRAK / BOM RASTREAR (F Dutra Comercio & Serviços)</p>
              </div>

              <div>
                <h4 className="font-semibold text-ink-soft uppercase tracking-wider mb-1.5 text-[10px]">Dados do Devedor</h4>
                <ul className="space-y-1 bg-surface p-2 rounded border border-line font-mono">
                  <li><span className="text-[#002f6c] font-bold">{"{{nome_devedor}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{nacionalidade_devedor}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{estado_civil_devedor}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{profissao_devedor}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{rg_devedor}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{cpf_devedor}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{cnpj_devedor}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{nome_representante}}"}</span> <span className="text-[10px] text-ink-faint font-sans">(para PJ)</span></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-ink-soft uppercase tracking-wider mb-1.5 text-[10px]">Endereço</h4>
                <ul className="space-y-1 bg-surface p-2 rounded border border-line font-mono">
                  <li><span className="text-[#002f6c] font-bold">{"{{endereco_devedor}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{numero}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{bairro}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{cidade}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{uf}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{cep}}"}</span></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-ink-soft uppercase tracking-wider mb-1.5 text-[10px]">Valores e Datas</h4>
                <ul className="space-y-1 bg-surface p-2 rounded border border-line font-mono">
                  <li><span className="text-[#002f6c] font-bold">{"{{valor_total_debito}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{valor_total_por_extenso}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{data_inicio_atraso}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{data_fim_atraso}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{valor_entrada}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{data_entrada}}"}</span></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-ink-soft uppercase tracking-wider mb-1.5 text-[10px]">Parcelamento</h4>
                <ul className="space-y-1 bg-surface p-2 rounded border border-line font-mono">
                  <li><span className="text-[#002f6c] font-bold">{"{{numero_parcelas}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{valor_parcela}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{valor_parcela_por_extenso}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{data_vencimento_primeira_parcela}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{dia_vencimento}}"}</span></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-ink-soft uppercase tracking-wider mb-1.5 text-[10px]">Outras Variáveis</h4>
                <ul className="space-y-1 bg-surface p-2 rounded border border-line font-mono">
                  <li><span className="text-[#002f6c] font-bold">{"{{forma_pagamento}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{chave_pix}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{indice_correcao}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{dias_tolerancia}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{cidade_emissao}}"}</span></li>
                  <li><span className="text-[#002f6c] font-bold">{"{{data_atual}}"}</span></li>
                </ul>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-line bg-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-ink-soft bg-surface border border-line rounded-lg hover:bg-subtle transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#002f6c] hover:bg-[#001f4c] rounded-lg transition-colors disabled:opacity-70 flex items-center gap-2 font-semibold"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Modelo'}
          </button>
        </div>

      </div>
    </div>
  );
}
