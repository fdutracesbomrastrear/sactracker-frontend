'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/modules/core/lib/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NovaRenegociacaoModal } from './NovaRenegociacaoModal';
import { ConfigurarContratoModal } from './ConfigurarContratoModal';
import { DetalhesRenegociacaoModal } from './DetalhesRenegociacaoModal';

interface Renegociacao {
  id: string;
  numeroAcordo: string;
  clienteId: string;
  contact: { name: string; phone: string };
  dataNegociacao: string;
  status: string;
  valorTotal: number;
  qtdParcelas: number;
}

export default function AgendaFinanceiraPage() {
  const [renegociacoes, setRenegociacoes] = useState<Renegociacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedAcordo, setSelectedAcordo] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    fetchRenegociacoes();
  }, []);

  const fetchRenegociacoes = async () => {
    try {
      const response = await fetch('/api/renegociacoes', {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRenegociacoes(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGUARDANDO_ASSINATURA': return 'bg-yellow-100 text-yellow-800';
      case 'ATIVA': return 'bg-blue-100 text-blue-800';
      case 'QUITADA': return 'bg-green-100 text-green-800';
      default: return 'bg-subtle text-ink';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink">Agenda Financeira</h1>
          <p className="text-sm text-ink-soft mt-0.5">Gestão de Acordos e Renegociações</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="bg-surface hover:bg-subtle text-ink-soft px-4 py-2 border border-line rounded-md font-medium transition-colors flex items-center gap-2" 
            onClick={() => setIsTemplateModalOpen(true)}
          >
            <svg className="w-5 h-5 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Configurar Contrato
          </button>
          <button 
            className="bg-[#002f6c] hover:bg-[#001f4c] text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2" 
            onClick={() => setIsModalOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Novo Acordo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl shadow-sm border border-line p-6 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-faint">Acordos Ativos</p>
            <h3 className="text-2xl font-bold">{renegociacoes.filter(r => r.status === 'ATIVA').length}</h3>
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-line p-6 flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-faint">Aguardando Assinatura</p>
            <h3 className="text-2xl font-bold">{renegociacoes.filter(r => r.status === 'AGUARDANDO_ASSINATURA').length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
        <div className="p-6 border-b border-line">
          <h2 className="text-lg font-bold">Histórico de Renegociações</h2>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="text-center py-8 text-ink-faint">Carregando agenda...</div>
          ) : renegociacoes.length === 0 ? (
            <div className="text-center py-8 text-ink-faint">Nenhum acordo registrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-ink-soft uppercase bg-subtle">
                  <tr>
                    <th className="px-6 py-3">Nº Acordo</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Valor Total</th>
                    <th className="px-6 py-3">Parcelas</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {renegociacoes.map((r) => (
                    <tr 
                      key={r.id} 
                      className="bg-surface border-b border-line hover:bg-subtle cursor-pointer"
                      onClick={() => {
                        setSelectedAcordo(r);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <td className="px-6 py-4 font-medium text-ink">{r.numeroAcordo}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-ink">{r.contact?.name || 'Desconhecido'}</div>
                        <div className="text-ink-faint">{r.clienteId}</div>
                      </td>
                      <td className="px-6 py-4">{format(new Date(r.dataNegociacao), 'dd/MM/yyyy', { locale: ptBR })}</td>
                      <td className="px-6 py-4">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.valorTotal)}
                      </td>
                      <td className="px-6 py-4">{r.qtdParcelas}x</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <NovaRenegociacaoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchRenegociacoes} 
      />

      <ConfigurarContratoModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      <DetalhesRenegociacaoModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedAcordo(null);
        }}
        acordo={selectedAcordo}
      />
    </div>
  );
}
