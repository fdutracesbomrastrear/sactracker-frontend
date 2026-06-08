'use client';

import { useEffect, useState } from 'react';
import { fetchSaudeFrota, avisarClienteSaude, VeiculoSaude, ProblemaSaude } from '@/modules/monitoramento/api/rastreamento';
import { StatusVeiculoPanel } from '@/modules/monitoramento/components/StatusVeiculoPanel';
import { canBloquearVeiculo, parsePermissions } from '@/modules/core/lib/roles';
import { getUser } from '@/modules/core/lib/auth';

function renderProblema(p: ProblemaSaude) {
  let color = 'text-ink-soft bg-subtle';
  if (p.tipo === 'bateria_violada' || p.tipo === 'offline_longo') {
    color = 'text-red-700 bg-red-100 border border-red-200';
  } else if (p.tipo === 'bateria_fraca' || p.tipo === 'offline_curto') {
    color = 'text-amber-700 bg-amber-100 border border-amber-200';
  }
  return (
    <span key={p.tipo} className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {p.descricao}
    </span>
  );
}

export function SaudeFrotaPanel() {
  const [criticos, setCriticos] = useState<VeiculoSaude[]>([]);
  const [atencao, setAtencao] = useState<VeiculoSaude[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [avisoEnviado, setAvisoEnviado] = useState<string | null>(null);

  const userPermissions = parsePermissions(getUser()?.permissions);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const saude = await fetchSaudeFrota(true);
      setCriticos(saude.criticos);
      setAtencao(saude.atencao);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar saúde da frota');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleAvisar(veiculo: VeiculoSaude, problema: ProblemaSaude) {
    if (!veiculo.telefoneContato) {
      alert('Telefone do cliente não encontrado no CRM/Faturas.');
      return;
    }
    const chave = `${veiculo.id}-${problema.tipo}`;
    setEnviando(chave);
    try {
      await avisarClienteSaude({
        telefone: veiculo.telefoneContato,
        nomeCliente: veiculo.cliente || veiculo.nome || undefined,
        mensagem: problema.templateMensagem,
        placa: veiculo.placa,
      });
      setAvisoEnviado(chave);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao enviar aviso ao cliente');
    } finally {
      setEnviando(null);
    }
  }

  function VeiculoCard({ veiculo }: { veiculo: VeiculoSaude }) {
    return (
      <div className="bg-surface rounded-xl border border-line p-4 shadow-sm flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-ink">{veiculo.placa}</h3>
            <p className="text-sm text-ink-soft">{veiculo.cliente || veiculo.nome || 'Cliente não identificado'}</p>
          </div>
          <div className="flex gap-2">
            {veiculo.problemas.map(renderProblema)}
          </div>
        </div>
        
        <div className="text-xs text-ink-soft bg-subtle p-2 rounded border border-line">
          Última comunicação: {veiculo.status.ultimaComunicacao || 'Desconhecida'} 
          {veiculo.status.minutosDesdeComunicacao != null ? ` (${Math.floor(veiculo.status.minutosDesdeComunicacao / 60)}h atrás)` : ''}
        </div>

        <div className="flex flex-wrap gap-2 mt-auto pt-2">
          {veiculo.problemas.map((p) => {
            const chave = `${veiculo.id}-${p.tipo}`;
            const isEnviando = enviando === chave;
            const isEnviado = avisoEnviado === chave;
            const baseLabel =
              p.tipo === 'bateria_violada' || p.tipo === 'bateria_fraca'
                ? 'Avisar Bateria'
                : 'Avisar Offline';
            return (
              <button
                key={`btn-${p.tipo}`}
                type="button"
                disabled={isEnviando}
                onClick={() => handleAvisar(veiculo, p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-bold rounded shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.347-.272.271-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                {isEnviando ? 'Enviando…' : isEnviado ? 'Enviado ✓' : baseLabel}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-subtle">
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={carregar}
          disabled={carregando}
          className="px-4 py-2 bg-surface border border-line rounded-lg text-sm font-semibold text-ink shadow-sm hover:bg-subtle disabled:opacity-50"
        >
          {carregando ? 'Atualizando...' : 'Atualizar Dados'}
        </button>
      </div>

      {erro && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {erro}
        </div>
      )}

      {carregando && criticos.length === 0 && atencao.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-ink-soft">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
          <p>Analisando frota e cruzando dados de telemetria...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Seção Crítica */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <h3 className="text-lg font-bold text-ink">Alertas Críticos</h3>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                {criticos.length}
              </span>
            </div>
            {criticos.length === 0 ? (
              <p className="text-sm text-ink-soft italic">Nenhum veículo em estado crítico.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {criticos.map((v) => (
                  <VeiculoCard key={v.id} veiculo={v} />
                ))}
              </div>
            )}
          </section>

          {/* Seção Atenção */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <h3 className="text-lg font-bold text-ink">Atenção</h3>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                {atencao.length}
              </span>
            </div>
            {atencao.length === 0 ? (
              <p className="text-sm text-ink-soft italic">Nenhum veículo em atenção.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {atencao.map((v) => (
                  <VeiculoCard key={v.id} veiculo={v} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
