'use client';

import { Suspense, useEffect, useState } from 'react';
import { PageHeader } from '@/modules/core/components/ui/PageHeader';
import { Campaign, fetchCampaigns, createCampaign, updateCampaignStatus } from '@/modules/campanhas/api';

function CampanhasConteudo() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  const [newCampTemplate, setNewCampTemplate] = useState('Olá {{nome}}! Temos uma novidade...');
  const [pastedData, setPastedData] = useState('');

  async function loadCampaigns() {
    try {
      setLoading(true);
      const data = await fetchCampaigns();
      setCampaigns(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
    const interval = setInterval(() => {
      loadCampaigns(); // Auto refresh para ver o progresso
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleToggleStatus(campaign: Campaign) {
    try {
      const nextStatus = campaign.status === 'RUNNING' ? 'PAUSED' : 'RUNNING';
      await updateCampaignStatus(campaign.id, nextStatus);
      loadCampaigns();
    } catch (e) {
      alert('Erro ao alterar status da campanha');
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newCampName.trim() || !newCampTemplate.trim() || !pastedData.trim()) {
      alert('Preencha todos os campos!');
      return;
    }

    try {
      // Parse pasted data (Excel or CSV)
      const lines = pastedData.split('\n').filter(l => l.trim() !== '');
      const messages = [];

      for (const line of lines) {
        // Separa por tabulação (Cópia do Excel) ou ponto e vírgula/vírgula
        const parts = line.split(/[\t;,]/).map(p => p.trim());
        
        let nome = '';
        let telefone = '';

        if (parts.length >= 2) {
          nome = parts[0];
          telefone = parts[1];
        } else {
          // Se tiver só uma coluna, assume que é o telefone
          telefone = parts[0];
        }

        if (telefone) {
          const content = newCampTemplate.replace(/\{\{nome\}\}/gi, nome || 'Cliente');
          messages.push({ phone: telefone, content });
        }
      }

      if (messages.length === 0) {
        alert('Nenhum telefone válido encontrado nos dados inseridos.');
        return;
      }

      await createCampaign(newCampName, messages);
      setShowModal(false);
      setNewCampName('');
      setPastedData('');
      setNewCampTemplate('Olá {{nome}}! Temos uma novidade...');
      loadCampaigns();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao criar campanha');
    }
  }

  return (
    <>
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <PageHeader
          title="Campanhas em Massa"
          subtitle="Disparo de mensagens via WhatsApp com proteção antibanimento"
          className="shrink-0"
        />
        
        <main className="flex-1 overflow-y-auto p-6 max-w-5xl">
            <div className="mb-6 flex justify-between items-center">
              <p className="text-sm text-ink-soft">
                O intervalo de disparo está configurado para <b>1 mensagem a cada 27 segundos</b>.
              </p>
              <button 
                onClick={() => setShowModal(true)} 
                className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow text-sm font-bold hover:bg-purple-700"
              >
                + Nova Campanha
              </button>
            </div>

            {loading && campaigns.length === 0 ? (
              <p className="text-ink-soft">Carregando campanhas...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : campaigns.length === 0 ? (
              <div className="p-8 text-center bg-surface border border-line rounded-xl">
                <p className="text-ink-soft font-medium">Nenhuma campanha criada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((camp) => {
                  const progress = camp.totalCount > 0 ? ((camp.sentCount + camp.failedCount) / camp.totalCount) * 100 : 0;
                  
                  return (
                    <div key={camp.id} className="bg-surface border border-line rounded-xl p-5 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-ink text-lg">{camp.name}</h3>
                          <p className="text-xs text-ink-soft">Criado em {new Date(camp.createdAt).toLocaleString('pt-BR')} por {camp.createdBy?.name || 'Desconhecido'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            camp.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            camp.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                            camp.status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
                            'bg-subtle text-ink-soft'
                          }`}>
                            {camp.status}
                          </span>
                          
                          {camp.status !== 'COMPLETED' && (
                            <button 
                              onClick={() => handleToggleStatus(camp)}
                              className="px-3 py-1.5 text-xs font-semibold bg-subtle hover:bg-subtle rounded text-ink"
                            >
                              {camp.status === 'RUNNING' ? 'Pausar' : 'Iniciar'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-ink-soft mb-1 font-medium">
                          <span>Progresso: {camp.sentCount + camp.failedCount} de {camp.totalCount}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-subtle rounded-full h-2.5 overflow-hidden flex">
                          <div className="bg-emerald-500 h-2.5" style={{ width: `${(camp.sentCount / camp.totalCount) * 100}%` }}></div>
                          <div className="bg-red-500 h-2.5" style={{ width: `${(camp.failedCount / camp.totalCount) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs mt-1 text-ink-faint">
                          <span className="text-emerald-600 font-medium">{camp.sentCount} entregues</span>
                          {camp.failedCount > 0 && <span className="text-red-500 font-medium">{camp.failedCount} falhas</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-line">
              <h2 className="text-lg font-bold text-ink">Nova Campanha</h2>
            </div>
            
            <form onSubmit={handleCreateCampaign} className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">Nome da Campanha</label>
                <input 
                  type="text" 
                  required
                  value={newCampName}
                  onChange={e => setNewCampName(e.target.value)}
                  className="w-full p-2 border border-line-strong rounded focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ex: Cobrança Maio 2026, Black Friday..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1">Modelo de Mensagem</label>
                <p className="text-xs text-ink-soft mb-2">Use <code className="bg-subtle px-1 rounded text-purple-600">{'{{'+'nome'+'}}'}</code> para inserir o nome do cliente na mensagem.</p>
                <textarea 
                  required
                  value={newCampTemplate}
                  onChange={e => setNewCampTemplate(e.target.value)}
                  className="w-full p-2 border border-line-strong rounded focus:ring-2 focus:ring-purple-500 outline-none h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1">Contatos (Copiar do Excel ou CSV)</label>
                <p className="text-xs text-ink-soft mb-2">Cole os dados em colunas: a 1ª coluna deve ser o <b>Nome</b>, a 2ª coluna o <b>Telefone</b> (separados por tabulação, vírgula ou ponto-e-vírgula).</p>
                <textarea 
                  required
                  value={pastedData}
                  onChange={e => setPastedData(e.target.value)}
                  className="w-full p-2 border border-line-strong rounded focus:ring-2 focus:ring-purple-500 outline-none h-40 font-mono text-sm"
                  placeholder="João Silva&#9;5511999999999&#10;Maria Santos&#9;5511888888888"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-line">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-ink-soft bg-subtle hover:bg-subtle rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
                >
                  Criar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function CampanhasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-soft">Carregando...</div>}>
      <CampanhasConteudo />
    </Suspense>
  );
}
