'use client';

import { useEffect, useState, useRef } from 'react';
import { getToken, getUser } from '@/modules/core/lib/auth';
import { parsePermissions } from '@/modules/core/lib/roles';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

interface TelemetryPoint {
  latitude: number;
  longitude: number;
  speedKmh: number;
  timestamp: string;
}

interface DeviationAnalysis {
  isSpatialDeviated: boolean;
  distanceToRouteMeters: number;
  isTemporalDeviated: boolean;
  isSpeedAnomaly: boolean;
  riskScore: number;
  reason: string[];
}

interface PointAnalysis {
  point: TelemetryPoint;
  analysis: DeviationAnalysis;
}

interface BehaviorEvent {
  code: string;
  name: string;
  category: 'safety' | 'security' | 'maintenance' | 'eco_driving';
  severity: EventSeverity;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface DriverScoreCard {
  safetyScore: number;
  ecoDrivingScore: number;
  maintenanceScore: number;
  generalRating: 'A' | 'B' | 'C' | 'D' | 'E';
  infractionsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
  maxSpeedKmh: number;
  drivingTimeMinutes: number;
  idleTimeMinutes: number;
  maxCorneringGForce: number;
  harshEventsCount: {
    braking: number;
    acceleration: number;
    cornering: number;
    idling: number;
  };
}

interface SimulationData {
  scenarioName: string;
  description: string;
  trainingHistory: TelemetryPoint[];
  activeTripPoints: TelemetryPoint[];
  activeTripEvents: BehaviorEvent[];
  pointAnalyses: PointAnalysis[];
  scorecard: DriverScoreCard;
}

interface TrackerEventLibraryItem {
  code: string;
  name: string;
  category: string;
  severity: EventSeverity;
  description: string;
  aiAction: string;
}

const loadHtml2Pdf = () => {
  return new Promise<any>((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).html2pdf) {
      resolve((window as any).html2pdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
};

export default function SkyeyerPage() {
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [hasLoadedPerms, setHasLoadedPerms] = useState(false);
  const [activeTab, setActiveTab] = useState<'simulation' | 'behavior' | 'reports' | 'events'>('simulation');
  const [scenario, setScenario] = useState<'safe_routine' | 'route_deviation' | 'aggressive_driving'>('safe_routine');
  const [loading, setLoading] = useState(false);
  const [simData, setSimData] = useState<SimulationData | null>(null);
  
  // Estados da simulação ativa (player)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [livePoints, setLivePoints] = useState<PointAnalysis[]>([]);
  const [liveEvents, setLiveEvents] = useState<BehaviorEvent[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Estados da biblioteca de eventos de hardware
  const [eventsLib, setEventsLib] = useState<Record<string, TrackerEventLibraryItem[]>>({});
  const [selectedBrand, setSelectedBrand] = useState<string>('Suntech');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados do Monitoramento de Clientes Reais
  const [monitorMode, setMonitorMode] = useState<'simulation' | 'real'>('simulation');
  const [monitoredClients, setMonitoredClients] = useState<{ placa: string; clienteName: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('ROA8H30');
  const [realProfileData, setRealProfileData] = useState<any | null>(null);

  // Estados de Busca de Relatório de Frota Reais
  const [searchDoc, setSearchDoc] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [fleetReport, setFleetReport] = useState<any | null>(null);

  // Carregar dados iniciais e verificar permissões
  useEffect(() => {
    const user = getUser();
    const perms = parsePermissions(user?.permissions);
    setUserPermissions(perms);
    setHasLoadedPerms(true);

    const canSim = perms.includes('ADMIN') || perms.includes('SKYEYER_SIMULAR');
    const canReal = perms.includes('ADMIN') || perms.includes('SKYEYER_MONITORAR_REAL');

    if (!canSim && canReal) {
      setMonitorMode('real');
      fetchRealProfile('ROA8H30');
    } else if (canSim) {
      fetchSimulation(scenario);
    }
    
    fetchEventsLibrary();
    fetchMonitoredClients();
  }, []);

  const fetchMonitoredClients = async () => {
    try {
      const res = await fetch(`${API_URL}/api/skyeyer/monitored-clients`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setMonitoredClients(json.clients);
      }
    } catch (err) {
      console.error('Erro ao buscar clientes monitorados:', err);
    }
  };

  const fetchRealProfile = async (placa: string) => {
    setLoading(true);
    setIsPlaying(false);
    setCurrentIndex(0);
    setLivePoints([]);
    setLiveEvents([]);

    try {
      const res = await fetch(`${API_URL}/api/skyeyer/profile/${placa}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setRealProfileData(json.data);
        setSimData(json.data);
        
        // Renderizar todos os pontos históricos imediatamente
        setLivePoints(json.data.pointAnalyses);
        setLiveEvents(json.data.activeTripEvents);
        setCurrentIndex(json.data.pointAnalyses.length - 1);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil real:', err);
    } finally {
      setLoading(false);
    }
  };

  // Controlar o player de simulação
  useEffect(() => {
    if (isPlaying && simData) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= simData.pointAnalyses.length) {
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return prev;
          }
          
          // Adiciona ponto atual aos pontos exibidos na tela
          const nextPoint = simData.pointAnalyses[next];
          setLivePoints((p) => [...p, nextPoint]);

          // Adiciona qualquer evento de hardware que tenha acontecido até este timestamp
          const pointTime = new Date(nextPoint.point.timestamp).getTime();
          const occurredEvents = simData.activeTripEvents.filter(
            (e) => new Date(e.timestamp).getTime() <= pointTime
          );
          setLiveEvents(occurredEvents);

          return next;
        });
      }, 1200);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, simData]);

  // Função para buscar simulação do backend
  const fetchSimulation = async (targetScenario: typeof scenario) => {
    setLoading(true);
    setIsPlaying(false);
    setCurrentIndex(0);
    setLivePoints([]);
    setLiveEvents([]);

    try {
      const res = await fetch(`${API_URL}/api/skyeyer/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ scenario: targetScenario }),
      });
      const json = await res.json();
      if (json.success) {
        setSimData(json.data);
        // Inicializar com o primeiro ponto
        if (json.data.pointAnalyses.length > 0) {
          setLivePoints([json.data.pointAnalyses[0]]);
          const firstPointTime = new Date(json.data.pointAnalyses[0].point.timestamp).getTime();
          setLiveEvents(
            json.data.activeTripEvents.filter((e: any) => new Date(e.timestamp).getTime() <= firstPointTime)
          );
        }
      }
    } catch (err) {
      console.error('Erro ao buscar simulação:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buscar biblioteca de eventos
  const fetchEventsLibrary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/skyeyer/events`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setEventsLib(json.events);
      }
    } catch (err) {
      console.error('Erro ao buscar biblioteca de eventos:', err);
    }
  };

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as any;
    setScenario(val);
    fetchSimulation(val);
  };

  const resetPlayer = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    if (simData && simData.pointAnalyses.length > 0) {
      setLivePoints([simData.pointAnalyses[0]]);
      const firstPointTime = new Date(simData.pointAnalyses[0].point.timestamp).getTime();
      setLiveEvents(
        simData.activeTripEvents.filter((e) => new Date(e.timestamp).getTime() <= firstPointTime)
      );
    }
  };

  const handleSearchReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setSearchError('');
    setFleetReport(null);

    const clean = searchDoc.replace(/\D/g, '');
    if (clean.length !== 11 && clean.length !== 14) {
      setSearchError('CPF ou CNPJ inválido. Digite 11 dígitos para CPF ou 14 para CNPJ.');
      setSearching(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/skyeyer/report?q=${clean}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFleetReport(json);
      } else {
        setSearchError(json.error || 'Erro ao buscar o relatório da frota.');
      }
    } catch (err: any) {
      console.error('Erro na requisição do relatório:', err);
      setSearchError('Falha na comunicação com o servidor.');
    } finally {
      setSearching(false);
    }
  };

  const handleSaveHtmlReport = () => {
    if (!fleetReport) return;
    
    const clientName = fleetReport.client.nome;
    const documentFormatted = fleetReport.client.documento 
      ? fleetReport.client.documento.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
      : 'Não informado';
    
    let rowsHtml = '';
    fleetReport.reports.forEach((report: any) => {
      rowsHtml += `
        <div class="vehicle-card">
          <div class="card-header">
            <div class="header-left">
              <span class="plate-badge">🚗 ${report.placa}</span>
              <div class="vehicle-info">
                <h4>${report.nome || 'Veículo sem Nome'}</h4>
                <p>ID: ${report.veiculoId}</p>
              </div>
            </div>
            <div class="driver-badge">
              👤 Condutor: <strong>${report.motorista || 'Não identificado'}</strong>
            </div>
          </div>
          
          <div class="card-grid">
            <div class="grid-col">
              <div class="col-title">
                <span>Scorecard IA</span>
                <span class="rating-badge">${report.scorecard.generalRating}</span>
              </div>
              <div class="score-row">
                <div class="score-label"><span>Segurança (Safety):</span> <span>${report.scorecard.safetyScore}%</span></div>
                <div class="bar-wrapper"><div class="bar bg-purple" style="width: ${report.scorecard.safetyScore}%"></div></div>
              </div>
              <div class="score-row">
                <div class="score-label"><span>Economia (Eco):</span> <span>${report.scorecard.ecoDrivingScore}%</span></div>
                <div class="bar-wrapper"><div class="bar bg-emerald" style="width: ${report.scorecard.ecoDrivingScore}%"></div></div>
              </div>
              <div class="score-row">
                <div class="score-label"><span>Conservação (Mec):</span> <span>${report.scorecard.maintenanceScore}%</span></div>
                <div class="bar-wrapper"><div class="bar bg-indigo" style="width: ${report.scorecard.maintenanceScore}%"></div></div>
              </div>
            </div>

            <div class="grid-col">
              <div class="col-title">Telemetria Direta</div>
              <div class="stat-row">
                <span>Ignição:</span>
                <span class="font-bold ${report.status.ignicaoLigada ? 'text-emerald' : 'text-slate'}">
                  ${report.status.ignicaoLigada ? '🟢 Ligada' : '⚪ Desligada'}
                </span>
              </div>
              <div class="stat-row">
                <span>Velocidade Atual:</span>
                <span class="font-bold text-white">${report.status.velocidadeKmh !== null ? report.status.velocidadeKmh.toFixed(0) + ' km/h' : 'Parado'}</span>
              </div>
              <div class="stat-row">
                <span>Status Sinal:</span>
                <span class="font-bold ${report.status.online ? 'text-emerald' : 'text-rose'}">
                  ${report.status.online ? 'Conectado' : 'Sem sinal (' + report.status.minutosDesdeComunicacao + 'm)'}
                </span>
              </div>
            </div>

            <div class="grid-col">
              <div class="col-title">Métricas de Condução</div>
              <div class="metrics-grid">
                <div>Vel. Máx: <strong>${report.scorecard.maxSpeedKmh} km/h</strong></div>
                <div>Força G Curva: <strong>${report.scorecard.maxCorneringGForce}G</strong></div>
                <div>Frenagens: <strong>${report.scorecard.harshEventsCount.braking}</strong></div>
                <div>Acelerações: <strong>${report.scorecard.harshEventsCount.acceleration}</strong></div>
              </div>
            </div>
          </div>

          <div class="diagnostics-row ${report.guardianStatus}">
            <span class="emoji">${report.guardianStatus === 'danger' ? '🚨' : report.guardianStatus === 'warning' ? '⚠️' : '🛡️'}</span>
            <div class="diag-content">
              <strong>Diagnóstico Prévio:</strong>
              <span>${report.reasons && report.reasons.length > 0 ? report.reasons.join('; ') : 'Nenhum desvio de rota ou comportamento de risco detectado nos últimos 10 dias.'}</span>
            </div>
          </div>

          ${report.posicao ? `
            <div class="location-row">
              <span>📍 <strong>Último Local:</strong> ${report.posicao.endereco || 'Coordenadas: ' + report.posicao.latitude.toFixed(5) + ', ' + report.posicao.longitude.toFixed(5)}</span>
              <span class="loc-time">Atualizado em: ${report.posicao.atualizadoEm ? new Date(report.posicao.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/D'}</span>
            </div>
          ` : ''}
        </div>
      `;
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Frota - ${clientName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0c0414;
      color: #f1f5f9;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: #12071f;
      border: 1px solid #3b0764;
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #3b0764;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 900;
    }
    .header p {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #a78bfa;
    }
    .header-meta {
      text-align: right;
      font-size: 13px;
      color: #cbd5e1;
    }
    .header-meta p {
      margin: 4px 0;
    }
    .vehicle-card {
      background-color: #130722;
      border: 1px solid #2e1065;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #2e1065;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .plate-badge {
      background-color: #2563eb;
      color: white;
      font-family: monospace;
      font-weight: 900;
      font-size: 13px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #60a5fa;
      letter-spacing: 1px;
    }
    .vehicle-info h4 {
      margin: 0;
      font-size: 13px;
      font-weight: 800;
    }
    .vehicle-info p {
      margin: 2px 0 0 0;
      font-size: 10px;
      color: #a78bfa;
    }
    .driver-badge {
      background-color: rgba(124, 58, 237, 0.3);
      border: 1px solid rgba(139, 92, 246, 0.4);
      border-radius: 8px;
      padding: 4px 10px;
      font-size: 12px;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 14px;
    }
    .grid-col {
      background-color: rgba(24, 10, 43, 0.4);
      border: 1px solid rgba(46, 16, 101, 0.2);
      border-radius: 8px;
      padding: 12px;
    }
    .col-title {
      font-size: 10px;
      font-weight: bold;
      color: #a78bfa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(46, 16, 101, 0.3);
      padding-bottom: 6px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .rating-badge {
      color: #fbbf24;
      background-color: rgba(124, 58, 237, 0.6);
      border: 1px solid rgba(167, 139, 250, 0.4);
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 900;
    }
    .score-row {
      margin-bottom: 8px;
      font-size: 11px;
    }
    .score-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .bar-wrapper {
      background-color: #1e1b4b;
      height: 4px;
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 4px;
    }
    .bar {
      height: 100%;
    }
    .bg-purple { background-color: #8b5cf6; }
    .bg-emerald { background-color: #10b981; }
    .bg-indigo { background-color: #6366f1; }
    .stat-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 6px;
    }
    .font-bold { font-weight: bold; }
    .text-emerald { color: #10b981; }
    .text-slate { color: #64748b; }
    .text-rose { color: #f43f5e; }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 11px;
    }
    .diagnostics-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px;
      border-radius: 8px;
      font-size: 11px;
      border: 1px solid transparent;
    }
    .diagnostics-row.safe {
      background-color: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
      color: #a7f3d0;
    }
    .diagnostics-row.warning {
      background-color: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
      color: #fde68a;
    }
    .diagnostics-row.danger {
      background-color: rgba(244, 63, 94, 0.1);
      border-color: rgba(244, 63, 94, 0.3);
      color: #fecdd3;
    }
    .emoji {
      font-size: 13px;
    }
    .diag-content {
      flex: 1;
    }
    .location-row {
      background-color: #0e0417;
      border: 1px solid rgba(46, 16, 101, 0.2);
      border-radius: 8px;
      padding: 10px;
      font-size: 10px;
      color: #a78bfa;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
    }
    .no-print-btn {
      background-color: #7c3aed;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      float: right;
      margin-bottom: 20px;
    }
    .no-print-btn:hover {
      background-color: #6d28d9;
    }
    @media print {
      body {
        background-color: white;
        color: black;
        padding: 0;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print-btn {
        display: none;
      }
      .vehicle-card {
        background-color: #f8fafc;
        border: 1px solid #cbd5e1;
        color: black;
        page-break-inside: avoid !important;
      }
      .card-header {
        border-bottom: 1px solid #cbd5e1;
      }
      .driver-badge {
        background-color: #f1f5f9;
        border: 1px solid #cbd5e1;
      }
      .grid-col {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
      }
      .col-title {
        color: #475569;
        border-bottom: 1px solid #e2e8f0;
      }
      .rating-badge {
        background-color: #f1f5f9;
        border: 1px solid #cbd5e1;
        color: black;
      }
      .bar-wrapper {
        background-color: #e2e8f0;
      }
      .stat-row span, .score-row span, .metrics-grid div {
        color: #0f172a;
      }
      .diagnostics-row.safe {
        background-color: #f0fdf4;
        border-color: #bbf7d0;
        color: #14532d;
      }
      .diagnostics-row.warning {
        background-color: #fffbeb;
        border-color: #fef3c7;
        color: #78350f;
      }
      .diagnostics-row.danger {
        background-color: #fff5f5;
        border-color: #fed7d7;
        color: #742a2a;
      }
      .location-row {
        background-color: #f8fafc;
        border-color: #cbd5e1;
        color: #334155;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <button class="no-print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>
    <div class="header">
      <div>
        <h2>Skyeyer AI Fleet Telemetry</h2>
        <p>Relatório de Direção, Segurança e Gestão de Condutores</p>
      </div>
      <div class="header-meta">
        <p><strong>Cliente:</strong> ${clientName}</p>
        <p><strong>Documento:</strong> ${documentFormatted}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
    
    <div class="reports-list">
      ${rowsHtml}
    </div>
  </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_frota_${clientName.toLowerCase().replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSavePdfReport = async () => {
    if (!fleetReport) return;
    try {
      setSearching(true);
      const html2pdf = await loadHtml2Pdf();
      
      const originalElement = document.querySelector('.print-container');
      if (!originalElement) {
        setSearching(false);
        return;
      }
      
      // Clone original element so we don't mess with the screen view
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      // Inject CSS style overrides for the PDF export to display in light/high-contrast mode
      const styleBlock = document.createElement('style');
      styleBlock.innerHTML = `
        .pdf-export-container {
          background: white !important;
          color: #0f172a !important;
          padding: 24px !important;
          width: 800px !important;
          font-family: sans-serif !important;
        }
        .pdf-export-container h2, 
        .pdf-export-container h4,
        .pdf-export-container strong {
          color: #0f172a !important;
        }
        .pdf-export-container p, 
        .pdf-export-container span, 
        .pdf-export-container div {
          color: #1e293b !important;
        }
        .pdf-export-container .plate-badge {
          background-color: #2563eb !important;
          color: white !important;
          border-color: #60a5fa !important;
        }
        .pdf-export-container .plate-badge * {
          color: white !important;
        }
        .pdf-export-container .print-card {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          color: black !important;
          page-break-inside: avoid !important;
          page-break-after: auto !important;
          page-break-before: auto !important;
          margin-bottom: 20px !important;
        }
        .pdf-export-container div[class*="bg-[#180a2b]"] {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: black !important;
        }
        .pdf-export-container div[class*="bg-[#1b0a2c]"] {
          background-color: #e2e8f0 !important;
        }
        .pdf-export-container .bg-purple-500 {
          background-color: #8b5cf6 !important;
        }
        .pdf-export-container .bg-emerald-500 {
          background-color: #10b981 !important;
        }
        .pdf-export-container .bg-indigo-500 {
          background-color: #6366f1 !important;
        }
        .pdf-export-container div[class*="bg-[#0e0417]"] {
          background-color: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }
        .pdf-export-container div[class*="bg-rose-500/10"] {
          background-color: #fef2f2 !important;
          border: 1px solid #fecaca !important;
        }
        .pdf-export-container div[class*="bg-rose-500/10"] * {
          color: #991b1b !important;
        }
        .pdf-export-container div[class*="bg-amber-500/10"] {
          background-color: #fffbeb !important;
          border: 1px solid #fef3c7 !important;
        }
        .pdf-export-container div[class*="bg-amber-500/10"] * {
          color: #92400e !important;
        }
        .pdf-export-container div[class*="bg-emerald-500/10"] {
          background-color: #f0fdf4 !important;
          border: 1px solid #bbf7d0 !important;
        }
        .pdf-export-container div[class*="bg-emerald-500/10"] * {
          color: #166534 !important;
        }
        .pdf-export-container .text-emerald-400 {
          color: #16a34a !important;
        }
        .pdf-export-container .text-rose-400 {
          color: #dc2626 !important;
        }
        .pdf-export-container .text-ink-soft {
          color: #64748b !important;
        }
        .pdf-export-container .text-amber-400 {
          color: #d97706 !important;
        }
      `;
      clone.appendChild(styleBlock);
      clone.classList.add('pdf-export-container');
      
      // Position off screen
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '-9999px';
      clone.style.width = '800px';
      document.body.appendChild(clone);
      
      const clientName = fleetReport.client.nome;
      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `relatorio_frota_${clientName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };
      
      await html2pdf().set(opt).from(clone).save();
      document.body.removeChild(clone);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar o arquivo PDF. Por favor, tente novamente ou use o botão de Imprimir.');
    } finally {
      setSearching(false);
    }
  };

  // Tradução de severidades para badges
  const getSeverityBadge = (sev: EventSeverity) => {
    const classes = {
      low: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
      medium: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
      high: 'bg-orange-500/10 text-orange-400 ring-orange-500/20',
      critical: 'bg-rose-500/10 text-rose-400 ring-rose-500/30 animate-pulse',
    };
    const labels = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      critical: 'Crítica',
    };
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${classes[sev]}`}>
        {labels[sev]}
      </span>
    );
  };

  const getCategoryBadge = (cat: string) => {
    const labels: Record<string, string> = {
      safety: 'Segurança',
      security: 'Antifurto',
      maintenance: 'Manutenção',
      eco_driving: 'Economia',
    };
    const classes: Record<string, string> = {
      safety: 'bg-blue-500/10 text-blue-400',
      security: 'bg-purple-500/10 text-purple-400',
      maintenance: 'bg-slate-500/10 text-ink-faint',
      eco_driving: 'bg-emerald-500/10 text-emerald-400',
    };
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${classes[cat] || 'bg-slate-500/10'}`}>
        {labels[cat] || cat}
      </span>
    );
  };

  // Cálculo de coordenadas relativas para desenho do mapa em SVG
  // Mapeia coordenadas geográficas reais para coordenadas de tela de 0 a 400
  const getRelativeCoords = (lat: number, lng: number) => {
    if (!simData) return { x: 200, y: 200 };
    
    // Encontrar limites geográficos dos pontos do cenário
    const allPts = [
      ...simData.trainingHistory,
      ...simData.activeTripPoints
    ];
    
    const lats = allPts.map(p => p.latitude);
    const lngs = allPts.map(p => p.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    // Adicionar margem de 10%
    const margin = 0.1;
    
    // Invertemos o Y porque latitude cresce para cima, mas SVG cresce para baixo
    const x = 40 + ((lng - (minLng - lngRange * margin)) / (lngRange * (1 + 2 * margin))) * 320;
    const y = 360 - ((lat - (minLat - latRange * margin)) / (latRange * (1 + 2 * margin))) * 320;

    return { x, y };
  };

  const activePoint = livePoints[livePoints.length - 1];

  const canSim = userPermissions.includes('ADMIN') || userPermissions.includes('SKYEYER_SIMULAR');
  const canReal = userPermissions.includes('ADMIN') || userPermissions.includes('SKYEYER_MONITORAR_REAL');
  const canEmergencia = userPermissions.includes('ADMIN') || userPermissions.includes('SKYEYER_PROTOCOLO_EMERGENCIA');
  const canAlerta = userPermissions.includes('ADMIN') || userPermissions.includes('SKYEYER_ALERTA_RISCO');

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0c0414] text-slate-100 overflow-y-auto skyeyer-light-page">
      <style dangerouslySetInnerHTML={{__html: `
        /* Theme overrides for screen viewing (Clean light theme) */
        @media screen {
          .skyeyer-light-page {
            background-color: #f8fafc !important;
            color: #1e293b !important;
          }
          .skyeyer-light-page header {
            background-color: #ffffff !important;
            border-bottom: 1px solid #e2e8f0 !important;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
          }
          .skyeyer-light-page header h1 {
            color: #0f172a !important;
          }
          .skyeyer-light-page header p {
            color: #64748b !important;
          }
          .skyeyer-light-page header span {
            background-color: #f1f5f9 !important;
            color: #6d28d9 !important;
            border-color: #e2e8f0 !important;
          }
          .skyeyer-light-page header div[class*="bg-purple-950"] {
            background-color: #e2e8f0 !important;
            border-color: #cbd5e1 !important;
          }
          .skyeyer-light-page header button:not([class*="bg-purple-600"]) {
            color: #475569 !important;
          }
          .skyeyer-light-page header button:not([class*="bg-purple-600"]):hover {
            color: #0f172a !important;
          }
          .skyeyer-light-page div[class*="bg-[#12071f]"],
          .skyeyer-light-page div[class*="bg-[#11061e]"] {
            background-color: #ffffff !important;
            border-color: #e2e8f0 !important;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
            color: #1e293b !important;
          }
          .skyeyer-light-page h2, 
          .skyeyer-light-page h3, 
          .skyeyer-light-page h4 {
            color: #0f172a !important;
          }
          .skyeyer-light-page p, 
          .skyeyer-light-page span {
            color: #334155 !important;
          }
          .skyeyer-light-page .text-purple-300,
          .skyeyer-light-page .text-purple-400 {
            color: #6d28d9 !important;
          }
          .skyeyer-light-page .text-ink-faint {
            color: #64748b !important;
          }
          .skyeyer-light-page .text-ink-faint {
            color: #475569 !important;
          }
          .skyeyer-light-page .text-white {
            color: #0f172a !important;
          }
          .skyeyer-light-page div[class*="bg-[#1b0d2d]"],
          .skyeyer-light-page div[class*="bg-[#1b0a2d]"] {
            background-color: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
          }
          .skyeyer-light-page div[class*="bg-[#1b0d2d]"] button:not([class*="bg-purple-600"]),
          .skyeyer-light-page div[class*="bg-[#1b0a2d]"] button:not([class*="bg-purple-600"]) {
            color: #475569 !important;
          }
          .skyeyer-light-page div[class*="bg-[#1b0a2c]"] {
            background-color: #e2e8f0 !important;
          }
          .skyeyer-light-page strong.text-white {
            color: #0f172a !important;
          }
          .skyeyer-light-page strong.text-purple-300 {
            color: #7c3aed !important;
          }
          .skyeyer-light-page div[class*="bg-[#0e0417]"],
          .skyeyer-light-page div[class*="bg-[#0e0515]"] {
            background-color: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
            color: #475569 !important;
          }
          .skyeyer-light-page circle.stroke-purple-950 {
            stroke: #f1f5f9 !important;
          }
          .skyeyer-light-page tbody tr {
            border-bottom: 1px solid #f1f5f9 !important;
          }
          .skyeyer-light-page tbody tr:hover {
            background-color: #f8fafc !important;
          }
          .skyeyer-light-page table thead tr {
            border-bottom: 1px solid #cbd5e1 !important;
            color: #475569 !important;
          }
          .skyeyer-light-page div[class*="bg-[#090210]/95"] {
            background-color: rgba(255, 255, 255, 0.95) !important;
          }
          .skyeyer-light-page input[type="text"] {
            background-color: #ffffff !important;
            border-color: #cbd5e1 !important;
            color: #0f172a !important;
          }
          .skyeyer-light-page input[type="text"]::placeholder {
            color: #94a3b8 !important;
          }
        }
      `}} />
      {/* Header */}
      <header className="h-[76px] shrink-0 border-b border-purple-950/40 bg-[#12071f]/80 backdrop-blur-md flex items-center px-6 justify-between shadow-lg relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-purple-900/30">
            👁️
          </div>
          <div>
            <h1 className="font-extrabold text-[18px] text-white tracking-tight leading-tight flex items-center gap-2">
              Skyeyer AI <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Protótipo</span>
            </h1>
            <p className="text-[11px] text-purple-300/70 font-medium">Análise preditiva de rotina e comportamento por IA</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-purple-950/30 border border-purple-900/40 rounded-xl p-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('simulation')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'simulation'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            Simulador de Rotina
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('behavior')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'behavior'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            Modo de Direção
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'reports'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            Relatório de Frota
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'events'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            Biblioteca de Eventos
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        
        {/* Tab 1: Simulation */}
        {activeTab === 'simulation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Control Panel (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-purple-950/40 pb-3">
                  <h2 className="text-xs font-black text-purple-300 uppercase tracking-wider">Painel Skyeyer</h2>
                  
                  {/* Toggle Mode */}
                  {(canSim || canReal) && (
                    <div className="flex bg-[#1b0d2d] border border-purple-900/50 rounded-lg p-0.5 select-none">
                      {canSim && (
                        <button
                          type="button"
                          onClick={() => {
                            setMonitorMode('simulation');
                            fetchSimulation(scenario);
                          }}
                          className={`px-2.5 py-1 rounded text-[9.5px] font-extrabold transition-all uppercase tracking-wide ${
                            monitorMode === 'simulation'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-purple-300 hover:text-white'
                          }`}
                        >
                          Simulado
                        </button>
                      )}
                      {canReal && (
                        <button
                          type="button"
                          onClick={() => {
                            setMonitorMode('real');
                            fetchRealProfile(selectedClient);
                          }}
                          className={`px-2.5 py-1 rounded text-[9.5px] font-extrabold transition-all uppercase tracking-wide ${
                            monitorMode === 'real'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-purple-300 hover:text-white'
                          }`}
                        >
                          Real (10d)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {monitorMode === 'simulation' ? (
                  !canSim ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center border border-purple-900/30 rounded-xl bg-purple-950/15">
                      <span className="text-2xl mb-2">🔒</span>
                      <p className="text-xs font-bold text-purple-300">Acesso Restrito</p>
                      <p className="text-[10px] text-purple-400 mt-1">Você não possui permissão para simular cenários de telemetria.</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-purple-200 font-medium">Selecione o Cenário de Direção:</label>
                        <select
                          value={scenario}
                          onChange={handleScenarioChange}
                          className="w-full bg-[#1b0d2d] border border-purple-900/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-medium"
                        >
                          <option value="safe_routine">Rotina Padrão Segura (Trabalho-Casa)</option>
                          <option value="route_deviation">Desvio de Rota & Risco Noturno</option>
                          <option value="aggressive_driving">Condução Agressiva & Desperdício</option>
                        </select>
                      </div>

                      {simData && (
                        <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-3.5 space-y-2 text-xs">
                          <p className="font-bold text-white text-[13px]">{simData.scenarioName}</p>
                          <p className="text-purple-300/80 leading-relaxed text-[11px]">{simData.description}</p>
                        </div>
                      )}

                      {/* Player Controls */}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsPlaying(!isPlaying)}
                          disabled={loading || !simData}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                            isPlaying
                              ? 'bg-amber-500 text-ink hover:bg-amber-400'
                              : 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-900/30'
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <span>⏸️</span> Pausar
                            </>
                          ) : (
                            <>
                              <span>▶️</span> Iniciar Viagem
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={resetPlayer}
                          disabled={loading || !simData}
                          className="px-4 py-2.5 rounded-xl border border-purple-900/60 text-purple-300 hover:text-white hover:bg-purple-950/30 text-xs font-bold"
                        >
                          Reset
                        </button>
                      </div>

                      {/* Progress bar */}
                      {simData && (
                        <div className="space-y-1.5 pt-2">
                          <div className="flex justify-between text-[10px] text-purple-300 font-medium">
                            <span>Progresso da Simulação</span>
                            <span>{currentIndex + 1} / {simData.pointAnalyses.length} pontos</span>
                          </div>
                          <div className="w-full h-1.5 bg-purple-950/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                              style={{
                                width: `${((currentIndex + 1) / simData.pointAnalyses.length) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  !canReal ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center border border-purple-900/30 rounded-xl bg-purple-950/15">
                      <span className="text-2xl mb-2">🔒</span>
                      <p className="text-xs font-bold text-purple-300">Acesso Restrito</p>
                      <p className="text-[10px] text-purple-400 mt-1">Você não possui permissão para monitorar telemetria real.</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-purple-200 font-medium">Selecionar Cliente Monitorado:</label>
                        <select
                          value={selectedClient}
                          onChange={(e) => {
                            setSelectedClient(e.target.value);
                            fetchRealProfile(e.target.value);
                          }}
                          className="w-full bg-[#1b0d2d] border border-purple-900/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-medium"
                        >
                          {monitoredClients.map((c) => (
                            <option key={c.placa} value={c.placa}>
                              {c.clienteName} ({c.placa})
                            </option>
                          ))}
                        </select>
                      </div>

                      {realProfileData && (
                        <div className="space-y-3.5 pt-1">
                          {/* Status do Guardião IA */}
                          <div className={`border rounded-2xl p-4 text-xs leading-relaxed ${
                            realProfileData.status === 'danger'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              : realProfileData.status === 'warning'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          }`}>
                            <div className="flex items-center gap-2 font-bold text-[13px] mb-2">
                              <span>
                                {realProfileData.status === 'danger' ? '🚨' : realProfileData.status === 'warning' ? '⚠️' : '🛡️'}
                              </span>
                              <span>
                                {realProfileData.status === 'danger'
                                  ? 'Guardião IA: Risco Crítico!'
                                  : realProfileData.status === 'warning'
                                  ? 'Guardião IA: Alerta de Atenção'
                                  : 'Guardião IA: Ativo e Seguro'}
                              </span>
                            </div>
                            
                            {realProfileData.reasons && realProfileData.reasons.length > 0 ? (
                              <div className="space-y-1.5">
                                <p className="font-semibold text-[10px] uppercase tracking-wider opacity-75">Motivos sinalizados:</p>
                                <ul className="list-disc pl-4 space-y-1 text-ink-faint">
                                  {realProfileData.reasons.map((r: string, idx: number) => (
                                    <li key={idx} className="leading-snug">{r}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p className="text-ink-faint leading-snug">
                                Nenhuma anormalidade de comportamento ou desvio de rota detectada nos últimos 10 dias.
                              </p>
                            )}
                            <div className="text-[9px] mt-3 opacity-60 text-right italic font-medium">
                              Skyeyer Guardiã 24h · Ativo
                            </div>
                          </div>

                          {/* Botões de Ação de Intervenção */}
                          <div className="space-y-2 pt-1 border-t border-purple-950/40">
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Ações de Intervenção</p>
                            
                            <button
                              type="button"
                              disabled={!canEmergencia}
                              onClick={() => {
                                alert('Protocolo de Emergência ativado de forma simulada. (Sem ação configurada - stub do operador)');
                              }}
                              className={`w-full py-2.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 border ${
                                canEmergencia
                                  ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white hover:from-red-500 hover:to-rose-600 border-red-500/30 animate-pulse shadow-red-950/20'
                                  : 'bg-slate-800/40 text-ink-soft border-slate-700/30 cursor-not-allowed opacity-50'
                              }`}
                            >
                              {canEmergencia ? '🚨 PROTOCOLO DE EMERGÊNCIA' : '🔒 PROTOCOLO DE EMERGÊNCIA (Bloqueado)'}
                            </button>
                            
                            <button
                              type="button"
                              disabled={!canAlerta}
                              onClick={() => {
                                alert('Alerta de risco de atenção registrado e logado no painel. (Sem ação configurada - stub do operador)');
                              }}
                              className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 border ${
                                canAlerta
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 border-amber-500/30 shadow-amber-950/25'
                                  : 'bg-slate-800/40 text-ink-soft border-slate-700/30 cursor-not-allowed opacity-50'
                              }`}
                            >
                              {canAlerta ? '⚠️ ATENÇÃO POSSÍVEL RISCO' : '🔒 ATENÇÃO POSSÍVEL RISCO (Bloqueado)'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )
                )}
              </div>

              {/* Status Box */}
              {activePoint && (
                <div className="bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-5 space-y-4 shadow-xl">
                  <h2 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-2">Telemetria ao Vivo</h2>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-purple-950/20 rounded-xl p-3 border border-purple-900/20">
                      <span className="text-[10px] text-purple-400 block mb-0.5">Velocidade Atual</span>
                      <span className="text-xl font-black text-white">{activePoint.point.speedKmh.toFixed(0)} <span className="text-xs font-normal text-purple-300">km/h</span></span>
                    </div>
                    <div className="bg-purple-950/20 rounded-xl p-3 border border-purple-900/20">
                      <span className="text-[10px] text-purple-400 block mb-0.5">Horário Telemetria</span>
                      <span className="text-[15px] font-bold text-white">
                        {new Date(activePoint.point.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Detalhes de Desvio e Alertas de Risco */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-purple-950/10 border border-purple-900/30 rounded-xl px-3 py-2 text-xs">
                      <span className="text-purple-300 font-medium">Desvio de Caminho:</span>
                      {activePoint.analysis.isSpatialDeviated ? (
                        <span className="text-rose-400 font-black animate-pulse">DETECTADO (+{(activePoint.analysis.distanceToRouteMeters / 1000).toFixed(1)}km)</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">Dentro da Rota usual</span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center bg-purple-950/10 border border-purple-900/30 rounded-xl px-3 py-2 text-xs">
                      <span className="text-purple-300 font-medium">Horário Anômalo:</span>
                      {activePoint.analysis.isTemporalDeviated ? (
                        <span className="text-amber-400 font-bold">SIM (Fora de Padrão)</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">Normal</span>
                      )}
                    </div>

                    <div className="bg-[#1b0a2d] border border-purple-900/60 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white font-bold">Nível de Risco Geral:</span>
                        <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                          activePoint.analysis.riskScore >= 70 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          activePoint.analysis.riskScore >= 30 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {activePoint.analysis.riskScore} / 100
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-purple-900/40 text-[10.5px] leading-relaxed text-purple-300">
                        <p className="font-bold text-purple-200 mb-1">Motivos indicados:</p>
                        <ul className="list-disc pl-3.5 space-y-1">
                          {activePoint.analysis.reason.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Map & Live Log (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Live Map Panel */}
              <div className="bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-purple-300 uppercase tracking-wider">Mapa Vetorial da Simulação</h2>
                  <div className="flex gap-4 text-[10px] text-purple-400">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded bg-purple-800/40 border border-purple-500/20" /> Rotas Usuais (Grade)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3.5 h-0.5 bg-amber-500" /> Trajeto Atual
                    </span>
                  </div>
                </div>

                {/* SVG Map Canvas */}
                <div className="w-full aspect-[4/3] max-h-[460px] bg-[#090210] border border-purple-950/70 rounded-xl relative overflow-hidden flex items-center justify-center">
                  {/* Grid Lines background */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b0d2d_1px,transparent_1px),linear-gradient(to_bottom,#1b0d2d_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

                  {((monitorMode === 'simulation' && canSim) || (monitorMode === 'real' && canReal)) && simData ? (
                    <svg className="w-full h-full" viewBox="0 0 400 400">
                      {/* 1. Desenhar Células de Rotas Aprendidas (Histórico de Treinamento) */}
                      {simData.trainingHistory.map((pt, idx) => {
                        const rel = getRelativeCoords(pt.latitude, pt.longitude);
                        return (
                          <rect
                            key={`hist-${idx}`}
                            x={rel.x - 4}
                            y={rel.y - 4}
                            width={8}
                            height={8}
                            rx={1}
                            className="fill-purple-700/15 stroke-purple-600/10"
                          />
                        );
                      })}

                      {/* 2. Desenhar Trajeto da Viagem Ativa (Linha conectora) */}
                      {livePoints.length > 1 && (
                        <path
                          d={livePoints
                            .map((p, idx) => {
                              const rel = getRelativeCoords(p.point.latitude, p.point.longitude);
                              return `${idx === 0 ? 'M' : 'L'} ${rel.x} ${rel.y}`;
                            })
                            .join(' ')}
                          fill="none"
                          className="stroke-amber-500"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* 3. Desenhar Marcadores de Pontos já percorridos */}
                      {livePoints.map((p, idx) => {
                        const rel = getRelativeCoords(p.point.latitude, p.point.longitude);
                        
                        // Determinar cor do ponto com base em anomalias
                        let fillClass = 'fill-amber-500';
                        if (p.analysis.isSpatialDeviated) {
                          fillClass = 'fill-rose-500';
                        } else if (p.analysis.isSpeedAnomaly) {
                          fillClass = 'fill-orange-500';
                        }

                        return (
                          <circle
                            key={`live-${idx}`}
                            cx={rel.x}
                            cy={rel.y}
                            r={3}
                            className={`${fillClass}`}
                          />
                        );
                      })}

                      {/* 4. Desenhar os alertas/eventos no mapa com ícone interativo */}
                      {liveEvents.map((ev, idx) => {
                        // Encontrar ponto mais próximo do evento pelo timestamp
                        const point = simData.activeTripPoints.find(
                          p => new Date(p.timestamp).getTime() === new Date(ev.timestamp).getTime()
                        );
                        if (!point) return null;
                        const rel = getRelativeCoords(point.latitude, point.longitude);
                        
                        return (
                          <g key={`map-ev-${idx}`} className="animate-pulse">
                            <circle
                              cx={rel.x}
                              cy={rel.y}
                              r={9}
                              className="fill-rose-500/20 stroke-rose-500/60"
                              strokeWidth={1}
                            />
                            <text
                              x={rel.x}
                              y={rel.y + 3}
                              className="text-[9px] fill-rose-300 font-bold"
                              textAnchor="middle"
                            >
                              ⚠
                            </text>
                          </g>
                        );
                      })}

                      {/* 5. Desenhar o Ícone do Carro (Ativo/Atual) no último ponto */}
                      {activePoint && (() => {
                        const rel = getRelativeCoords(activePoint.point.latitude, activePoint.point.longitude);
                        return (
                          <g>
                            {/* Halo animado de pulso */}
                            <circle
                              cx={rel.x}
                              cy={rel.y}
                              r={12}
                              className="fill-purple-500/20 stroke-purple-500/40 animate-ping"
                            />
                            {/* Ponto central */}
                            <circle
                              cx={rel.x}
                              cy={rel.y}
                              r={6}
                              className="fill-purple-400 stroke-purple-100"
                              strokeWidth={1.5}
                            />
                          </g>
                        );
                      })()}
                    </svg>
                  ) : (
                    <div className="absolute inset-0 bg-[#090210]/95 backdrop-blur-[1.5px] flex flex-col items-center justify-center text-center p-4">
                      <span className="text-3xl mb-2">🔒</span>
                      <p className="text-xs font-bold text-purple-300 font-sans">Visualização Bloqueada</p>
                      <p className="text-[10px] text-purple-400 mt-1 max-w-[240px]">Você não possui permissão para visualizar o mapa de telemetria no modo ativo.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Real-time Hardware Event Log */}
              <div className="bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-5 shadow-xl space-y-4">
                <h2 className="text-sm font-bold text-purple-300 uppercase tracking-wider">Eventos de Hardware & Ações Preventivas do Robô</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-purple-950 text-purple-400 font-semibold">
                        <th className="py-2.5">Código / Nome</th>
                        <th className="py-2.5">Categoria</th>
                        <th className="py-2.5">Severidade</th>
                        <th className="py-2.5">Descrição</th>
                        <th className="py-2.5 text-right">Ação Automática (Robô)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/30">
                      {!((monitorMode === 'simulation' && canSim) || (monitorMode === 'real' && canReal)) ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-ink-soft font-medium font-sans">
                            🔒 Visualização de telemetria bloqueada por falta de privilégios.
                          </td>
                        </tr>
                      ) : liveEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-ink-soft font-medium">
                            Nenhum evento crítico de hardware disparado nesta seção da rota.
                          </td>
                        </tr>
                      ) : (
                        liveEvents.map((ev, idx) => (
                          <tr key={idx} className="hover:bg-purple-950/10">
                            <td className="py-3 font-bold text-white">
                              <span className="font-mono text-purple-400 text-[10px] block">{ev.code}</span>
                              {ev.name}
                            </td>
                            <td className="py-3">{getCategoryBadge(ev.category)}</td>
                            <td className="py-3">{getSeverityBadge(ev.severity)}</td>
                            <td className="py-3 text-ink-faint max-w-xs">{ev.metadata?.description || 'Alerta disparado por telemetria.'}</td>
                            <td className="py-3 text-right text-purple-300 font-medium max-w-xs">
                              {ev.metadata?.aiAction || 'Analisando evento.'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Driver behavior scorecards */}
        {activeTab === 'behavior' && (
          <div className="space-y-6">
            {simData ? (
              <>
                {/* Score Indicators Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Gauge 1: Safety */}
                  <div className="bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-6 flex flex-col items-center shadow-xl">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-4">Segurança (Safety)</span>
                    
                    {/* SVG Gauge */}
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="72"
                          cy="72"
                          r="56"
                          className="stroke-purple-950 fill-none"
                          strokeWidth="10"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="56"
                          className="stroke-purple-500 fill-none"
                          strokeWidth="10"
                          strokeDasharray={351.8}
                          strokeDashoffset={351.8 - (351.8 * simData.scorecard.safetyScore) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-black text-white">{simData.scorecard.safetyScore}</span>
                        <span className="text-[10px] text-purple-300 font-semibold">Pontos</span>
                      </div>
                    </div>

                    <p className="text-xs text-ink-faint text-center mt-5 leading-relaxed max-w-xs">
                      Avaliação de trancos, frenagens rápidas, curvas abusivas e excesso de velocidade fatal.
                    </p>
                  </div>

                  {/* Gauge 2: Eco-Driving */}
                  <div className="bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-6 flex flex-col items-center shadow-xl">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-4">Economia (Eco-Driving)</span>
                    
                    {/* SVG Gauge */}
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="72"
                          cy="72"
                          r="56"
                          className="stroke-purple-950 fill-none"
                          strokeWidth="10"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="56"
                          className="stroke-emerald-500 fill-none"
                          strokeWidth="10"
                          strokeDasharray={351.8}
                          strokeDashoffset={351.8 - (351.8 * simData.scorecard.ecoDrivingScore) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-black text-white">{simData.scorecard.ecoDrivingScore}</span>
                        <span className="text-[10px] text-purple-300 font-semibold">Pontos</span>
                      </div>
                    </div>

                    <p className="text-xs text-ink-faint text-center mt-5 leading-relaxed max-w-xs">
                      Economia de combustível analisada por marcha lenta prolongada e acelerações excessivas.
                    </p>
                  </div>

                  {/* Gauge 3: Preventative maintenance */}
                  <div className="bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-6 flex flex-col items-center shadow-xl">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-4">Manutenção Preventiva</span>
                    
                    {/* SVG Gauge */}
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="72"
                          cy="72"
                          r="56"
                          className="stroke-purple-950 fill-none"
                          strokeWidth="10"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="56"
                          className="stroke-indigo-500 fill-none"
                          strokeWidth="10"
                          strokeDasharray={351.8}
                          strokeDashoffset={351.8 - (351.8 * simData.scorecard.maintenanceScore) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-black text-white">{simData.scorecard.maintenanceScore}</span>
                        <span className="text-[10px] text-purple-300 font-semibold">Pontos</span>
                      </div>
                    </div>

                    <p className="text-xs text-ink-faint text-center mt-5 leading-relaxed max-w-xs">
                      Conservação de pneus e mecânica geral com base em fricção de curvas e estresse elétrico/do motor.
                    </p>
                  </div>
                </div>

                {/* AI Scorecard Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Rating overview (4 cols) */}
                  <div className="lg:col-span-4 bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-5 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Classificação de Direção</span>
                    <div className="w-24 h-24 rounded-full bg-purple-950/40 border-2 border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-950/80">
                      <span className="text-5xl font-black text-amber-400">{simData.scorecard.generalRating}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">Categoria Geral de Condução</p>
                      <p className="text-xs text-ink-faint">Classificação baseada em todos os eventos da rota atual.</p>
                    </div>

                    {/* Infractions count */}
                    <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-purple-950/60 text-xs">
                      <div className="bg-purple-950/10 rounded-xl py-2 px-3 border border-purple-900/10">
                        <span className="text-purple-300 font-medium block">Eventos Graves</span>
                        <span className="text-lg font-bold text-rose-400">{simData.scorecard.infractionsCount.critical + simData.scorecard.infractionsCount.high}</span>
                      </div>
                      <div className="bg-purple-950/10 rounded-xl py-2 px-3 border border-purple-900/10">
                        <span className="text-purple-300 font-medium block">Eventos Leves</span>
                        <span className="text-lg font-bold text-amber-400">{simData.scorecard.infractionsCount.medium + simData.scorecard.infractionsCount.low}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI recommendations (8 cols) */}
                  <div className="lg:col-span-8 bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col">
                    <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                      💡 Recomendações e Dicas de Condução IA
                    </h3>
                    
                    <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
                      {simData.scorecard.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-3 bg-purple-950/20 border border-purple-900/30 rounded-xl p-3.5 items-start">
                          <span className="text-lg">🤖</span>
                          <p className="text-xs leading-relaxed text-purple-100 font-medium">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-[#12071f]/40 border border-purple-950/20 rounded-2xl p-12 text-center text-ink-soft text-xs">
                Inicie uma viagem no simulador para gerar a análise de comportamento.
              </div>
            )}
          </div>
        )}

        {/* Tab 2.5: Printable Fleet Driver Performance Report */}
        {/* Tab 2.5: Printable Fleet Driver Performance Report */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                html, body, #__next {
                  background: white !important;
                  color: black !important;
                  height: auto !important;
                  overflow: visible !important;
                }
                /* Reset AppShell layout wrappers to allow printing all pages */
                div.flex.h-screen.overflow-hidden,
                main.flex-1.min-w-0.overflow-hidden,
                div.flex-1.flex.flex-col.min-w-0.overflow-y-auto {
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                  position: static !important;
                  display: block !important;
                }
                aside, header, nav, button, .no-print { display: none !important; }
                main { padding: 0 !important; margin: 0 !important; }
                .print-container {
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  border: none !important;
                  padding: 20px !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                  position: static !important;
                }
                .print-card {
                  background: #f8fafc !important;
                  border: 1px solid #e2e8f0 !important;
                  color: black !important;
                  page-break-inside: avoid !important;
                }
                .print-text-dark { color: #0f172a !important; }
                .print-text-muted { color: #475569 !important; }
                .print-border-muted { border-color: #cbd5e1 !important; }
              }
            `}} />

            {/* Form de Busca no Topo */}
            <div className="max-w-4xl mx-auto bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-5 shadow-xl no-print">
              <h3 className="text-xs font-black text-purple-300 uppercase tracking-wider mb-3">Busca de Frota por Cliente</h3>
              <form onSubmit={handleSearchReport} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-purple-400">🔍</span>
                  <input
                    type="text"
                    placeholder="Digite o CPF ou CNPJ do cliente para buscar veículos..."
                    value={searchDoc}
                    onChange={(e) => setSearchDoc(e.target.value)}
                    className="w-full bg-[#1b0d2d] border border-purple-900/50 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-purple-400/50 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:opacity-75 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md shadow-purple-900/25 flex items-center justify-center gap-1.5 transition-all"
                >
                  {searching ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Buscando...
                    </>
                  ) : (
                    'Gerar Relatório'
                  )}
                </button>
              </form>

              {searchError && (
                <div className="mt-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span> {searchError}
                </div>
              )}
            </div>

            {/* Spinner de Busca */}
            {searching && (
              <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-16 space-y-4">
                <div className="w-12 h-12 border-4 border-purple-950/80 border-t-purple-500 rounded-full animate-spin shadow-md shadow-purple-900/10" />
                <div className="text-center">
                  <p className="text-xs font-bold text-purple-200">Skyeyer AI processando dados da frota...</p>
                  <p className="text-[10px] text-purple-400 mt-1">Carregando telemetria de 10 dias e cruzando condutores.</p>
                </div>
              </div>
            )}

            {/* Relatório Encontrado */}
            {!searching && fleetReport && (
              <div className="space-y-6 max-w-4xl mx-auto font-sans">
                {/* Print action header */}
                <div className="flex justify-between items-center bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-4 shadow-xl no-print">
                  <div>
                    <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Exportar Relatório Consolidado</h3>
                    <p className="text-[11px] text-ink-faint">Gere um documento executivo da frota de <span className="font-semibold text-purple-200">{fleetReport.client.nome}</span>.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="bg-[#1b0d2d] border border-purple-900/60 hover:bg-purple-950/40 text-purple-300 hover:text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <span>🖨️</span> Imprimir Relatório
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePdfReport}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-900/20"
                    >
                      <span>💾</span> Salvar Relatório (PDF)
                    </button>
                  </div>
                </div>

                {/* Printable Document Container */}
                <div className="bg-[#12071f]/60 border border-purple-950/40 rounded-3xl p-8 shadow-2xl print-container space-y-8">
                  
                  {/* Document Header */}
                  <div className="flex justify-between items-start border-b border-purple-950/60 pb-6 print-border-muted font-sans">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl print-text-dark">👁️</span>
                        <h2 className="text-xl font-black text-white print-text-dark">Skyeyer AI Fleet Telemetry</h2>
                      </div>
                      <p className="text-xs text-purple-300/80 print-text-muted">Relatório de Direção, Segurança e Gestão de Condutores</p>
                    </div>
                    <div className="text-right text-xs space-y-1 text-ink-faint print-text-muted">
                      <p><span className="font-semibold text-white print-text-dark">Cliente:</span> {fleetReport.client.nome}</p>
                      <p><span className="font-semibold text-white print-text-dark">Documento:</span> {fleetReport.client.documento ? fleetReport.client.documento.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : 'Não informado'}</p>
                      <p><span className="font-semibold text-white print-text-dark">Data Emissão:</span> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  {fleetReport.reports.length === 0 ? (
                    <div className="bg-purple-950/10 border border-purple-900/30 rounded-2xl p-12 text-center text-ink-faint text-xs font-sans">
                      🔒 Nenhum veículo ativo rastreado para o cliente informado na API Rastro.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {fleetReport.reports.map((report: any, index: number) => (
                        <div key={report.placa} className={`p-4 bg-[#11061e] border border-purple-900/40 rounded-xl space-y-3.5 print-card ${index > 0 ? 'print:break-before-page' : ''}`}>
                          
                          {/* Vehicle Header - 1 row */}
                          <div className="flex justify-between items-center border-b border-purple-900/30 pb-2 print-border-muted">
                            <div className="flex items-center gap-2.5">
                              <span className="bg-blue-600 text-white font-mono font-black text-xs px-2.5 py-1 rounded border border-blue-400 tracking-wider shadow-sm flex items-center justify-center">
                                🚗 {report.placa}
                              </span>
                              <div>
                                <h4 className="font-extrabold text-xs text-white print-text-dark">{report.nome || 'Veículo sem Nome'}</h4>
                                <p className="text-[10px] text-purple-400 print-text-muted">ID: {report.veiculoId}</p>
                              </div>
                            </div>
                            
                            {/* Driver info */}
                            <div className="flex items-center gap-1.5 bg-purple-950/30 border border-purple-900/40 rounded-lg px-2.5 py-1 text-xs">
                              <span>👤</span>
                              <span className="font-semibold text-ink-faint print-text-dark">
                                Condutor: <strong className="text-purple-300 font-extrabold">{report.motorista || 'Não identificado'}</strong>
                              </span>
                            </div>
                          </div>

                          {/* 3-column Compact Dashboard Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* Column 1: AI Score & Rating */}
                            <div className="bg-[#180a2b]/40 border border-purple-900/20 rounded-lg p-3 space-y-2.5 flex flex-col justify-between">
                              <div className="flex items-center justify-between border-b border-purple-900/20 pb-1.5">
                                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Scorecard IA</span>
                                <span className="text-xs font-black text-amber-400 bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded-lg">{report.scorecard.generalRating}</span>
                              </div>
                              <div className="space-y-2 text-[10px]">
                                <div>
                                  <div className="flex justify-between font-semibold mb-0.5 text-ink-faint">
                                    <span>Segurança (Safety):</span>
                                    <span>{report.scorecard.safetyScore}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-[#1b0a2c] rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{ width: `${report.scorecard.safetyScore}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between font-semibold mb-0.5 text-ink-faint">
                                    <span>Economia (Eco):</span>
                                    <span>{report.scorecard.ecoDrivingScore}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-[#1b0a2c] rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${report.scorecard.ecoDrivingScore}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between font-semibold mb-0.5 text-ink-faint">
                                    <span>Conservação (Mec):</span>
                                    <span>{report.scorecard.maintenanceScore}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-[#1b0a2c] rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: `${report.scorecard.maintenanceScore}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Column 2: Live Status */}
                            <div className="bg-[#180a2b]/40 border border-purple-900/20 rounded-lg p-3 space-y-2 text-[10px] flex flex-col justify-between">
                              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider border-b border-purple-900/20 pb-1.5">Telemetria Direta</span>
                              <div className="space-y-1.5">
                                <div className="flex justify-between">
                                  <span className="text-ink-faint">Ignição:</span>
                                  <span className={`font-bold ${report.status.ignicaoLigada ? 'text-emerald-400' : 'text-ink-soft'}`}>
                                    {report.status.ignicaoLigada ? '🟢 Ligada' : '⚪ Desligada'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-ink-faint">Velocidade Atual:</span>
                                  <span className="font-bold text-white">{report.status.velocidadeKmh !== null ? `${report.status.velocidadeKmh.toFixed(0)} km/h` : 'Parado'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-ink-faint">Status Sinal:</span>
                                  <span className={`font-bold ${report.status.online ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {report.status.online ? 'Conectado' : `Sem sinal (${report.status.minutosDesdeComunicacao}m)`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Column 3: Critical Telemetry Events */}
                            <div className="bg-[#180a2b]/40 border border-purple-900/20 rounded-lg p-3 space-y-2 text-[10px] flex flex-col justify-between">
                              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider border-b border-purple-900/20 pb-1.5">Métricas de Condução</span>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-ink-faint">
                                <div>Vel. Máx: <strong className="text-white font-extrabold">{report.scorecard.maxSpeedKmh} km/h</strong></div>
                                <div>Força G Curva: <strong className="text-white font-extrabold">{report.scorecard.maxCorneringGForce}G</strong></div>
                                <div>Frenagens: <strong className="text-white font-extrabold">{report.scorecard.harshEventsCount.braking}</strong></div>
                                <div>Acelerações: <strong className="text-white font-extrabold">{report.scorecard.harshEventsCount.acceleration}</strong></div>
                              </div>
                            </div>

                          </div>

                          {/* Guardian IA Diagnostics Row */}
                          <div className={`p-2.5 rounded-lg border text-[10.5px] leading-relaxed flex items-start gap-2 ${
                            report.guardianStatus === 'danger'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              : report.guardianStatus === 'warning'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          }`}>
                            <span className="text-[13px]">{report.guardianStatus === 'danger' ? '🚨' : report.guardianStatus === 'warning' ? '⚠️' : '🛡️'}</span>
                            <div className="flex-1">
                              <span className="font-extrabold mr-1">Diagnóstico Prévio:</span>
                              {report.reasons && report.reasons.length > 0 ? (
                                <span className="text-slate-200 font-medium">{report.reasons.join('; ')}</span>
                              ) : (
                                <span className="text-ink-faint font-medium">Nenhum desvio de rota ou comportamento de risco detectado nos últimos 10 dias.</span>
                              )}
                            </div>
                          </div>

                          {/* Last Known Location */}
                          {report.posicao && (
                            <div className="bg-[#0e0417] border border-purple-900/20 rounded-lg p-2.5 text-[9.5px] text-purple-300 flex justify-between items-center">
                              <span>📍 <span className="font-semibold text-ink-faint">Último Local:</span> {report.posicao.endereco || `Coordenadas: ${report.posicao.latitude.toFixed(5)}, ${report.posicao.longitude.toFixed(5)}`}</span>
                              <span className="opacity-60 font-medium">Atualizado em: {report.posicao.atualizadoEm ? new Date(report.posicao.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/D'}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer signature line */}
                  <div className="pt-6 border-t border-purple-950/60 print-border-muted flex justify-between text-[9px] text-ink-faint print-text-muted">
                    <span>Módulo de IA Skyeyer - SacTracker</span>
                    <span>Auditoria de Frota RS Trak · Relatório Consolidado de Clientes</span>
                  </div>

                </div>
              </div>
            )}

            {/* Estado Inicial de Aguardando Busca */}
            {!searching && !fleetReport && (
              <div className="max-w-4xl mx-auto bg-[#12071f]/40 border border-purple-950/20 rounded-2xl p-12 text-center text-ink-soft text-xs">
                Digite um CPF/CNPJ acima para consultar a frota, motoristas vinculados e pontuação comportamental de IA do cliente.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Hardware Events Library */}
        {activeTab === 'events' && (
          <div className="bg-[#12071f]/60 border border-purple-950/40 rounded-2xl p-5 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <h2 className="text-sm font-bold text-purple-300 uppercase tracking-wider">Biblioteca de Eventos de Hardwares</h2>
                <p className="text-xs text-ink-faint">Classificação inteligente para comandos brutos de diferentes modelos de rastreadores.</p>
              </div>

              {/* Brand filter buttons */}
              <div className="flex bg-[#1b0d2d] border border-purple-900/50 rounded-xl p-1 shrink-0">
                {Object.keys(eventsLib).map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedBrand === brand
                        ? 'bg-purple-600 text-white'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-purple-400">🔍</span>
              <input
                type="text"
                placeholder="Pesquisar código, nome ou ação preventiva..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1b0d2d] border border-purple-900/50 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-purple-400/50 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-medium"
              />
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventsLib[selectedBrand] ? (
                eventsLib[selectedBrand]
                  .filter((item) => {
                    const q = searchQuery.toLowerCase();
                    return (
                      item.code.toLowerCase().includes(q) ||
                      item.name.toLowerCase().includes(q) ||
                      item.description.toLowerCase().includes(q) ||
                      item.aiAction.toLowerCase().includes(q)
                    );
                  })
                  .map((item, idx) => (
                    <div key={idx} className="bg-purple-950/20 border border-purple-900/40 rounded-2xl p-4.5 space-y-3.5 shadow-md flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className="font-mono text-[10px] text-purple-400 block font-bold">{item.code}</span>
                            <h4 className="text-xs font-bold text-white leading-tight">{item.name}</h4>
                          </div>
                          {getSeverityBadge(item.severity)}
                        </div>
                        <p className="text-[11px] text-ink-faint leading-relaxed">{item.description}</p>
                      </div>

                      <div className="bg-[#0e0515] border border-purple-900/50 rounded-xl p-3 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-purple-300">
                          <span>Ação Automática IA</span>
                          {getCategoryBadge(item.category)}
                        </div>
                        <p className="text-[10.5px] leading-relaxed text-purple-200">{item.aiAction}</p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="col-span-2 py-12 text-center text-ink-soft text-xs">
                  Nenhum hardware cadastrado ou carregando...
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
