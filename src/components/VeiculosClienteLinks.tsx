'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchVeiculosMonitoramento, VeiculoMonitoramento } from '@/lib/rastreamento';

export function VeiculosClienteLinks({ nomeCliente }: { nomeCliente: string }) {
  const [veiculos, setVeiculos] = useState<VeiculoMonitoramento[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!nomeCliente.trim()) return;
    setCarregando(true);
    void fetchVeiculosMonitoramento({ cliente: nomeCliente, atualizar: false })
      .then((r) => setVeiculos(r.veiculos.slice(0, 8)))
      .catch(() => setVeiculos([]))
      .finally(() => setCarregando(false));
  }, [nomeCliente]);

  if (carregando) {
    return <p className="text-[10px] text-slate-500 mt-2">Carregando veículos…</p>;
  }
  if (veiculos.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] font-semibold text-slate-600 mb-1">Monitoramento</p>
      <div className="flex flex-wrap gap-1">
        {veiculos.map((v) => (
          <Link
            key={v.id}
            href={`/monitoramento?placa=${encodeURIComponent(v.placa)}`}
            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-800 hover:bg-purple-100"
          >
            {v.placa}
          </Link>
        ))}
      </div>
    </div>
  );
}
