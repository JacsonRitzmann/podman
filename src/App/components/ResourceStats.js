import React, { useState, useEffect } from 'react';
import './ResourceStats.css';
import podmanService from '../services/podmanService';
import { PlayIcon } from 'lucide-react';

const ResourceStats = ({ containerId, refreshInterval = 5000 }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);

  // Função para carregar estatísticas
  const loadStats = async () => {
    try {
      setRefreshing(true);
      
      // Se um containerId foi especificado, busca stats apenas desse container
      if (containerId) {
        const containerStats = await podmanService.getContainerStats([containerId]);
        setStats(containerStats.length > 0 ? containerStats[0] : null);
      } else {
        // Caso contrário, busca todos os containers
        const allStats = await podmanService.getContainerStats();
        setStats(allStats);
      }
      
      // Busca informações do sistema
      const sysInfo = await podmanService.getSystemResources();
      setSystemInfo(sysInfo);
      
      setError(null);
    } catch (err) {
      setError(`Erro ao carregar estatísticas: ${err.message}`);
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carrega estatísticas na montagem do componente
  useEffect(() => {
    loadStats();
    
    // Configura refresh automático se o intervalo for maior que 0
    let intervalId = null;
    if (refreshInterval > 0) {
      intervalId = setInterval(loadStats, refreshInterval);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [containerId, refreshInterval]);

  // Formata bytes para um formato legível
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Formata a porcentagem para um formato legível
  const formatPercentage = (value) => {
    if (!value) return '0.00%';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="resource-stats-loading">
        <div className="resource-spinner"></div>
        <p>Carregando estatísticas de recursos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="resource-stats-error">
        <p>{error}</p>
        <button onClick={loadStats}>Tentar novamente</button>
      </div>
    );
  }

  // Renderiza as estatísticas de um container específico
  const renderContainerStats = (containerStat) => {
    if (!containerStat) return null;
    
    return (
      <div className="container-stat-card">
        <div className="container-stat-header">
          <h3>{containerStat.name || (containerStat.id ? containerStat.id.substring(0, 12) : 'Desconhecido')}</h3>
        </div>
        
        <div className="container-stat-grid">
          <div className="stat-item">
            <div className="stat-label">CPU</div>
            <div className="stat-value">{formatPercentage(containerStat.cpu_percent || '0')}</div>
            <div className="stat-bar">
              <div 
                className="stat-bar-fill cpu" 
                style={{ width: `${parseFloat(containerStat.cpu_percent || '0')}%` }}
              ></div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Memória</div>
            <div className="stat-value">
              {containerStat.mem_usage ? 
                `${containerStat.mem_usage.split('/')[0].trim()} / 
                 ${containerStat.mem_usage.split('/')[1].trim()}` : 
                '0 B / 0 B'
              }
            </div>
            <div className="stat-bar">
              <div 
                className="stat-bar-fill memory" 
                style={{ width: `${parseFloat(containerStat.mem_percent || '0')}%` }}
              ></div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Network I/O</div>
            <div className="stat-value">
              {containerStat.net_io ? 
                `↓ ${containerStat.net_io.split('/')[0].trim()} / 
                 ↑ ${containerStat.net_io.split('/')[1].trim()}` : 
                '↓ 0 B / ↑ 0 B'
              }
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Block I/O</div>
            <div className="stat-value">
              {containerStat.block_io ? 
                `↓ ${containerStat.block_io.split('/')[0].trim()} / 
                 ↑ ${containerStat.block_io.split('/')[1].trim()}` : 
                '↓ 0 B / ↑ 0 B'
              }
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">PIDs</div>
            <div className="stat-value">{containerStat.pids || '0'}</div>
          </div>
        </div>
      </div>
    );
  };

  // Renderiza estatísticas do sistema
  const renderSystemStats = () => {
    if (!systemInfo) return null;
    
    return (
      <div className="system-stats-section">
        <h3>Informações do Sistema</h3>
        
        <div className="system-stats-grid">
          {systemInfo.host && (
            <>
              <div className="system-stat-item">
                <div className="system-stat-label">Sistema Operacional</div>
                <div className="system-stat-value">{systemInfo.host.os}</div>
              </div>
              
              <div className="system-stat-item">
                <div className="system-stat-label">Kernel</div>
                <div className="system-stat-value">{systemInfo.host.kernel}</div>
              </div>
              
              <div className="system-stat-item">
                <div className="system-stat-label">Arch</div>
                <div className="system-stat-value">{systemInfo.host.arch}</div>
              </div>
              
              <div className="system-stat-item">
                <div className="system-stat-label">CPUs</div>
                <div className="system-stat-value">{systemInfo.host.cpus}</div>
              </div>
              
              <div className="system-stat-item">
                <div className="system-stat-label">Memória</div>
                <div className="system-stat-value">{formatBytes(systemInfo.host.memTotal)}</div>
              </div>
            </>
          )}
          
          {systemInfo.store && (
            <div className="system-stat-item wide">
              <div className="system-stat-label">Armazenamento</div>
              <div className="system-stat-value">
                Driver: {systemInfo.store.graphDriverName}, 
                Containers: {systemInfo.store.containerStore.number}, 
                Imagens: {systemInfo.store.imageStore.number}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderiza uma lista de containers ou um container específico
  const renderStats = () => {
    // Se temos um containerId específico e stats, renderiza apenas esse container
    if (containerId && stats) {
      return renderContainerStats(stats);
    } 
    // Se não temos containerId, mas temos uma array de stats, renderiza todos
    else if (Array.isArray(stats)) {
      return (
        <div className="container-stats-list">
          {stats.length === 0 ? (
            <div className="no-container-stats">
              <p>Nenhum container em execução para mostrar estatísticas</p>
            </div>
          ) : (
            stats.map(containerStat => (
              <div key={containerStat.ID} className="container-stat-item">
                {renderContainerStats(containerStat)}
              </div>
            ))
          )}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="resource-stats-container">
      <div className="resource-stats-header">
        <h2>Estatísticas de Recursos</h2>
        <button 
          className={`refresh-stats-button ${refreshing ? 'spinning' : ''}`} 
          onClick={loadStats}
          disabled={refreshing}
        >
            <PlayIcon className={refreshing ? 'spinning' : ''} />
        </button>
      </div>
      
      {renderSystemStats()}
      {renderStats()}
      
      <div className="resource-stats-footer">
        <span>Auto-atualização: {refreshInterval > 0 ? `${refreshInterval/1000}s` : 'Desativada'}</span>
      </div>
    </div>
  );
};

export default ResourceStats;
