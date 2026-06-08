'use client';

import { Suspense, useEffect, useState } from 'react';
import { PageHeader } from '@/modules/core/components/ui/PageHeader';
import { iaApi, AiContext, AiPlan } from '@/modules/admin/api/ia';

function TreinamentoConteudo() {
  const [activeTab, setActiveTab] = useState<'contexts' | 'plans'>('contexts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contexts State
  const [contexts, setContexts] = useState<AiContext[]>([]);
  const [editingContextId, setEditingContextId] = useState<string | null>(null);
  const [contextTitle, setContextTitle] = useState('');
  const [contextContent, setContextContent] = useState('');
  const [contextIsActive, setContextIsActive] = useState(true);

  // Plans State
  const [plans, setPlans] = useState<AiPlan[]>([]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [planAdesao, setPlanAdesao] = useState('');
  const [planMensalidade, setPlanMensalidade] = useState('');
  const [planDetalhes, setPlanDetalhes] = useState('');
  const [planFaqItems, setPlanFaqItems] = useState<string[]>([]);
  const [newFaqInput, setNewFaqInput] = useState('');
  const [planIsActive, setPlanIsActive] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === 'contexts') {
        const data = await iaApi.getContexts();
        setContexts(data);
      } else {
        const data = await iaApi.getPlans();
        setPlans(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados da IA');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    handleCancelContext();
    handleCancelPlan();
  }, [activeTab]);

  // Context Actions
  function handleEditContext(ctx: AiContext) {
    setEditingContextId(ctx.id);
    setContextTitle(ctx.title);
    setContextContent(ctx.content);
    setContextIsActive(ctx.isActive);
  }

  function handleCancelContext() {
    setEditingContextId(null);
    setContextTitle('');
    setContextContent('');
    setContextIsActive(true);
  }

  async function handleSaveContext(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingContextId) {
        await iaApi.updateContext(editingContextId, { title: contextTitle, content: contextContent, isActive: contextIsActive });
      } else {
        await iaApi.createContext({ title: contextTitle, content: contextContent, isActive: contextIsActive });
      }
      await iaApi.clearSessions(); // Recarregar IA
      handleCancelContext();
      loadData();
      alert('Treinamento atualizado! O cérebro da Gina foi reiniciado com as novas regras.');
    } catch (e) {
      alert('Erro ao salvar contexto: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function handleDeleteContext(id: string) {
    if (!confirm('Deseja realmente excluir esta regra? A Gina esquecerá imediatamente dela.')) return;
    try {
      await iaApi.deleteContext(id);
      await iaApi.clearSessions();
      loadData();
    } catch (e) {
      alert('Erro ao excluir.');
    }
  }

  async function toggleActiveContext(ctx: AiContext) {
    try {
      await iaApi.updateContext(ctx.id, { isActive: !ctx.isActive });
      await iaApi.clearSessions();
      loadData();
    } catch (e) {
      alert('Erro ao alterar status.');
    }
  }

  // Plan Actions
  function handleAddFaqItem() {
    const val = newFaqInput.trim();
    if (val && !planFaqItems.includes(val)) {
      setPlanFaqItems([...planFaqItems, val]);
      setNewFaqInput('');
    }
  }

  function handleRemoveFaqItem(index: number) {
    setPlanFaqItems(planFaqItems.filter((_, i) => i !== index));
  }

  function handleEditPlan(plan: AiPlan) {
    setEditingPlanId(plan.id);
    setPlanName(plan.name);
    setPlanAdesao(plan.adesao);
    setPlanMensalidade(plan.mensalidade);
    setPlanDetalhes(plan.detalhes);
    setPlanFaqItems(plan.faq ? plan.faq.split('\n').filter(Boolean) : []);
    setPlanIsActive(plan.isActive);
  }

  function handleCancelPlan() {
    setEditingPlanId(null);
    setPlanName('');
    setPlanAdesao('');
    setPlanMensalidade('');
    setPlanDetalhes('');
    setPlanFaqItems([]);
    setNewFaqInput('');
    setPlanIsActive(true);
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    try {
      const faqText = planFaqItems.join('\n');
      if (editingPlanId) {
        await iaApi.updatePlan(editingPlanId, {
          name: planName,
          adesao: planAdesao,
          mensalidade: planMensalidade,
          detalhes: planDetalhes,
          faq: faqText,
          isActive: planIsActive
        });
      } else {
        await iaApi.createPlan({
          name: planName,
          adesao: planAdesao,
          mensalidade: planMensalidade,
          detalhes: planDetalhes,
          faq: faqText,
          isActive: planIsActive
        });
      }
      await iaApi.clearSessions(); // Recarregar IA
      handleCancelPlan();
      loadData();
      alert('Planos atualizados! A inteligência da Gina agora conhece estes planos de contratação.');
    } catch (e) {
      alert('Erro ao salvar plano: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function handleDeletePlan(id: string) {
    if (!confirm('Deseja realmente excluir este plano? A Gina esquecerá desta oferta de contratação.')) return;
    try {
      await iaApi.deletePlan(id);
      await iaApi.clearSessions();
      loadData();
    } catch (e) {
      alert('Erro ao excluir plano.');
    }
  }

  async function toggleActivePlan(plan: AiPlan) {
    try {
      await iaApi.updatePlan(plan.id, { isActive: !plan.isActive });
      await iaApi.clearSessions();
      loadData();
    } catch (e) {
      alert('Erro ao alterar status do plano.');
    }
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-subtle font-sans">
      <PageHeader
        title="Treinamento da IA (Bot Gina)"
        subtitle="Forneça regras gerais e planos comerciais para guiar a conversação da Gina"
        className="shrink-0 z-10"
      />

      {/* Tabs */}
      <div className="flex bg-surface border-b border-line shrink-0 px-6 z-10">
        <button
          type="button"
          onClick={() => setActiveTab('contexts')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'contexts'
              ? 'text-purple-700 border-purple-700 bg-purple-50/30'
              : 'text-ink-soft border-transparent hover:text-ink'
          }`}
        >
          Regras e Instruções Gerais
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'plans'
              ? 'text-purple-700 border-purple-700 bg-purple-50/30'
              : 'text-ink-soft border-transparent hover:text-ink'
          }`}
        >
          Planos e Preços
        </button>
      </div>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        {activeTab === 'contexts' ? (
          <>
            {/* CONTEXTS FORM */}
            <div className="w-full lg:w-1/3 bg-surface border border-line rounded-2xl p-6 shadow-sm h-fit shrink-0">
              <h2 className="font-bold text-ink text-lg mb-4">
                {editingContextId ? 'Editar Regra da IA' : 'Nova Regra da IA'}
              </h2>
              <form onSubmit={handleSaveContext} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wide mb-1">
                    Título / Assunto
                  </label>
                  <input
                    type="text"
                    required
                    value={contextTitle}
                    onChange={(e) => setContextTitle(e.target.value)}
                    placeholder="Ex: Regulamento de Fidelidade"
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-ink bg-subtle/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wide mb-1">
                    Instrução Exata para a Gina
                  </label>
                  <textarea
                    required
                    value={contextContent}
                    onChange={(e) => setContextContent(e.target.value)}
                    rows={6}
                    placeholder="Diga à IA como ela deve se comportar sobre este assunto, incluindo prazos, restrições ou termos."
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 resize-none text-sm text-ink bg-subtle/50"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={contextIsActive}
                    onChange={(e) => setContextIsActive(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-line-strong focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-ink">Ativar Regra Imediatamente</span>
                </label>

                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-purple-950 hover:bg-purple-900 text-white font-bold rounded-xl shadow-sm transition-all text-sm"
                  >
                    {editingContextId ? 'Salvar Alterações' : 'Treinar Gina'}
                  </button>
                  {editingContextId && (
                    <button
                      type="button"
                      onClick={handleCancelContext}
                      className="py-2 px-4 bg-subtle hover:bg-subtle text-ink font-bold rounded-xl transition-all text-sm"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* CONTEXTS LIST */}
            <div className="w-full lg:w-2/3 space-y-4">
              <h2 className="font-bold text-ink text-lg flex items-center gap-2">
                📂 Regras de Contexto Ativas
              </h2>
              {loading ? (
                <div className="flex justify-center p-8 bg-surface border border-line rounded-2xl">
                  <span className="text-ink-faint text-sm">Carregando contexto...</span>
                </div>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : contexts.length === 0 ? (
                <p className="text-ink-soft text-sm italic bg-surface p-6 rounded-2xl border border-line text-center shadow-sm">
                  Nenhuma instrução extra foi adicionada. A Gina está utilizando apenas as configurações base.
                </p>
              ) : (
                contexts.map((ctx) => (
                  <div
                    key={ctx.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      ctx.isActive
                        ? 'border-purple-100 bg-surface shadow-sm hover:shadow-md'
                        : 'border-line bg-subtle/80 opacity-75'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            ctx.isActive ? 'bg-green-500 shadow-sm shadow-green-500/35' : 'bg-slate-400'
                          }`}
                        ></span>
                        <h3 className="font-bold text-ink truncate">{ctx.title}</h3>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleActiveContext(ctx)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-subtle text-ink-soft hover:bg-subtle transition-colors"
                        >
                          {ctx.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditContext(ctx)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContext(ctx.id)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-ink-soft mt-3 bg-subtle p-4 rounded-xl border border-line leading-relaxed">
                      {ctx.content}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* PLANS FORM */}
            <div className="w-full lg:w-1/3 bg-surface border border-line rounded-2xl p-6 shadow-sm h-fit shrink-0">
              <h2 className="font-bold text-ink text-lg mb-4">
                {editingPlanId ? 'Editar Plano de Contratação' : 'Novo Plano Comercial'}
              </h2>
              <form onSubmit={handleSavePlan} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wide mb-1">
                    Nome do Plano
                  </label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Ex: Plano Moto VIP"
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-ink bg-subtle/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wide mb-1">
                      Taxa de Adesão
                    </label>
                    <input
                      type="text"
                      required
                      value={planAdesao}
                      onChange={(e) => setPlanAdesao(e.target.value)}
                      placeholder="Ex: R$ 50,00"
                      className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-ink bg-subtle/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wide mb-1">
                      Mensalidade
                    </label>
                    <input
                      type="text"
                      required
                      value={planMensalidade}
                      onChange={(e) => setPlanMensalidade(e.target.value)}
                      placeholder="Ex: R$ 49,90"
                      className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-ink bg-subtle/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wide mb-1">
                    Detalhes do Plano
                  </label>
                  <textarea
                    required
                    value={planDetalhes}
                    onChange={(e) => setPlanDetalhes(e.target.value)}
                    rows={4}
                    placeholder="Descrição dos serviços inclusos: bloqueio via aplicativo, rastreamento 24h, suporte, etc."
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 resize-none text-sm text-ink bg-subtle/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wide mb-1">
                    Dúvidas / Detalhes Adicionais (FAQ)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFaqInput}
                      onChange={(e) => setNewFaqInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFaqItem();
                        }
                      }}
                      placeholder="Ex: Sem fidelidade ou contrato mínimo"
                      className="flex-1 px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-sm text-ink bg-subtle/50"
                    />
                    <button
                      type="button"
                      onClick={handleAddFaqItem}
                      className="px-3 bg-purple-950 hover:bg-purple-900 text-white font-bold rounded-xl text-lg flex items-center justify-center shadow-sm"
                      title="Adicionar detalhe"
                    >
                      +
                    </button>
                  </div>

                  {planFaqItems.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto bg-subtle border border-line rounded-xl p-3">
                      {planFaqItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-start gap-2 text-xs bg-surface border border-line p-2 rounded-lg text-ink">
                          <span className="flex-1 leading-relaxed">{item}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFaqItem(index)}
                            className="text-red-500 font-bold hover:text-red-700 text-xs px-1 hover:bg-red-50 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={planIsActive}
                    onChange={(e) => setPlanIsActive(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-line-strong focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-ink">Ativar Plano Imediatamente</span>
                </label>

                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-purple-950 hover:bg-purple-900 text-white font-bold rounded-xl shadow-sm transition-all text-sm"
                  >
                    {editingPlanId ? 'Salvar Alterações' : 'Criar Plano'}
                  </button>
                  {editingPlanId && (
                    <button
                      type="button"
                      onClick={handleCancelPlan}
                      className="py-2 px-4 bg-subtle hover:bg-subtle text-ink font-bold rounded-xl transition-all text-sm"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* PLANS LIST */}
            <div className="w-full lg:w-2/3 space-y-4">
              <h2 className="font-bold text-ink text-lg flex items-center gap-2">
                💳 Planos e Preços Ativos
              </h2>
              {loading ? (
                <div className="flex justify-center p-8 bg-surface border border-line rounded-2xl">
                  <span className="text-ink-faint text-sm">Carregando planos...</span>
                </div>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : plans.length === 0 ? (
                <p className="text-ink-soft text-sm italic bg-surface p-6 rounded-2xl border border-line text-center shadow-sm">
                  Nenhum plano comercial cadastrado. Adicione um plano para que a Gina possa ofertá-lo aos clientes!
                </p>
              ) : (
                plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      plan.isActive
                        ? 'border-purple-100 bg-surface shadow-sm hover:shadow-md'
                        : 'border-line bg-subtle/80 opacity-75'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 border-b border-line pb-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            plan.isActive ? 'bg-green-500 shadow-sm shadow-green-500/35' : 'bg-slate-400'
                          }`}
                        ></span>
                        <h3 className="font-bold text-ink text-base truncate">{plan.name}</h3>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleActivePlan(plan)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-subtle text-ink-soft hover:bg-subtle transition-colors"
                        >
                          {plan.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditPlan(plan)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-purple-50/50 p-3 rounded-xl border border-purple-100/30 mb-3 text-sm">
                      <div>
                        <span className="text-ink-soft block text-xs font-semibold uppercase">Taxa de Adesão</span>
                        <span className="font-bold text-ink text-base">{plan.adesao}</span>
                      </div>
                      <div>
                        <span className="text-ink-soft block text-xs font-semibold uppercase">Mensalidade</span>
                        <span className="font-bold text-ink text-base">{plan.mensalidade}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-ink-faint text-xs font-bold uppercase tracking-wider block mb-1">Detalhes do Plano</span>
                        <p className="text-sm text-ink-soft bg-subtle/50 p-3 rounded-lg border border-line leading-relaxed font-medium">
                          {plan.detalhes}
                        </p>
                      </div>

                      {plan.faq && (
                        <div>
                          <span className="text-ink-faint text-xs font-bold uppercase tracking-wider block mb-1">Dúvidas Frequentes / Adicionais</span>
                          <div className="bg-subtle border border-line rounded-xl p-3.5 space-y-2">
                            {plan.faq.split('\n').filter(Boolean).map((faq, i) => (
                              <div key={i} className="flex gap-2 items-start text-xs text-ink-soft leading-relaxed font-medium">
                                <span className="text-purple-600 font-bold shrink-0">•</span>
                                <span>{faq}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function TreinamentoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-soft">Carregando...</div>}>
      <TreinamentoConteudo />
    </Suspense>
  );
}
