'use client';

import type { StatusVeiculo } from '@/modules/monitoramento/api/rastreamento';

type ItemProps = {
  rotulo: string;
  valor: string;
  detalhe?: string | null;
  cor: 'verde' | 'vermelho' | 'ambar' | 'cinza' | 'azul';
};

const CORES = {
  verde: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  vermelho: 'bg-red-50 border-red-200 text-red-800',
  ambar: 'bg-amber-50 border-amber-200 text-amber-900',
  cinza: 'bg-subtle border-line text-ink-soft',
  azul: 'bg-sky-50 border-sky-200 text-sky-800',
} as const;

function ItemStatus({ rotulo, valor, detalhe, cor }: ItemProps) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${CORES[cor]}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">{rotulo}</p>
      <p className="text-sm font-semibold mt-0.5">{valor}</p>
      {detalhe ? <p className="text-[10px] mt-0.5 opacity-90">{detalhe}</p> : null}
    </div>
  );
}

function rotuloIgnicao(v: boolean | null): { valor: string; cor: ItemProps['cor'] } {
  if (v === true) return { valor: 'Ligada', cor: 'verde' };
  if (v === false) return { valor: 'Desligada', cor: 'cinza' };
  return { valor: '—', cor: 'cinza' };
}

function rotuloBloqueio(v: boolean | null): { valor: string; cor: ItemProps['cor'] } {
  if (v === true) return { valor: 'Bloqueado', cor: 'vermelho' };
  if (v === false) return { valor: 'Desbloqueado', cor: 'verde' };
  return { valor: '—', cor: 'cinza' };
}

function rotuloGps(v: boolean | null): { valor: string; cor: ItemProps['cor'] } {
  if (v === true) return { valor: 'Ativo', cor: 'verde' };
  if (v === false) return { valor: 'Inativo', cor: 'ambar' };
  return { valor: '—', cor: 'cinza' };
}

function rotuloComunicacao(s: StatusVeiculo): {
  valor: string;
  detalhe: string | null;
  cor: ItemProps['cor'];
} {
  const quando = s.ultimaComunicacao || s.ultimaComunicacaoServidor;
  if (s.online === true) {
    const min =
      s.minutosDesdeComunicacao != null && s.minutosDesdeComunicacao > 0
        ? `há ${s.minutosDesdeComunicacao} min`
        : 'agora';
    return { valor: 'Online', detalhe: quando ? `${quando} · ${min}` : min, cor: 'verde' };
  }
  if (s.online === false) {
    const min =
      s.minutosDesdeComunicacao != null ? `há ${s.minutosDesdeComunicacao} min` : null;
    return {
      valor: 'Sem sinal recente',
      detalhe: quando ? [quando, min].filter(Boolean).join(' · ') : min,
      cor: 'ambar',
    };
  }
  return { valor: '—', detalhe: quando, cor: 'cinza' };
}

type Props = {
  status: StatusVeiculo;
};

export function StatusVeiculoPanel({ status }: Props) {
  const ign = rotuloIgnicao(status.ignicaoLigada);
  const bloq = rotuloBloqueio(status.bloqueado);
  const gps = rotuloGps(status.gpsAtivo);
  const comm = rotuloComunicacao(status);
  const vel =
    status.ultimaVelocidadeKmh != null
      ? `${status.ultimaVelocidadeKmh} km/h`
      : '—';

  const extras: string[] = [];
  if (status.satelites != null) extras.push(`${status.satelites} sat`);
  if (status.gsmPercentual != null) extras.push(`GSM ${status.gsmPercentual}%`);
  if (status.alarme) extras.push(status.alarme);

  return (
    <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/80 to-white p-3">
      <h3 className="text-xs font-semibold text-ink mb-2">Status do equipamento</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <ItemStatus rotulo="Ignição" valor={ign.valor} cor={ign.cor} />
        <ItemStatus rotulo="Bloqueio" valor={bloq.valor} cor={bloq.cor} />
        <ItemStatus rotulo="GPS" valor={gps.valor} cor={gps.cor} />
        <ItemStatus
          rotulo="Última comunicação"
          valor={comm.valor}
          detalhe={comm.detalhe}
          cor={comm.cor}
        />
        <ItemStatus
          rotulo="Última velocidade"
          valor={vel}
          detalhe={extras.length ? extras.join(' · ') : null}
          cor="azul"
        />
      </div>
      <p className="text-[10px] text-ink-soft mt-2">
        Dados da API Rastro — atualize posições para refletir o estado real após comandos SMS.
      </p>
    </div>
  );
}
