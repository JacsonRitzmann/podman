import React, { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { PlayIcon, Square, TrashIcon, MoreHorizontalIcon, EyeIcon, TerminalIcon, RefreshCwIcon } from 'lucide-react';
import podmanService from '../services/podmanService';
import './ContainerList.css';

const ContainerList = ({ dockerStatus, refreshTrigger }) => {
  const [containers, setContainers] = useState([]);
  const [filteredContainers, setFilteredContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [podmanAvailable, setPodmanAvailable] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Carrega containers do Podman
  const loadContainers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const isAvailable = await podmanService.isAvailable();
      setPodmanAvailable(isAvailable);
      console.log("isAvailable: ", isAvailable)
      
      if (isAvailable) {
        const containerData = await podmanService.listContainers();
        const formattedContainers = containerData.map(container => ({
          id: container.Id || container.ID,
          name: container.Names ? container.Names[0] : (container.Name || 'unnamed'),
          image: container.Image,
          status: container.State || container.Status,
          created: container.Created ? new Date(container.Created * 1000).toLocaleString() : 'N/A',
          ports: container.Ports ? container.Ports.map(p => `${p.HostPort || p.hostPort || ''}:${p.PrivatePort || p.privatePort || p.containerPort || ''}`) : [],
          uptime: container.Status || container.State || 'N/A'
        }));
        setContainers(formattedContainers);
      } else {
        // Dados simulados quando Podman não está disponível
        setContainers(getMockContainers());
      }
    } catch (err) {
      console.error('Error loading containers:', err);
      setError('Erro ao carregar containers. Usando dados simulados.');
      setContainers(getMockContainers());
    } finally {
      setLoading(false);
    }
  };
  
  const [runningCount, setRunningCount] = useState(0);
  const [stoppedCount, setStoppedCount] = useState(0);

  // Atualiza os containers filtrados quando o filtro ou a lista de containers muda
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredContainers(containers);
    } else if (activeFilter === 'running') {
      setFilteredContainers(containers.filter(container => container.status === 'running'));
    } else if (activeFilter === 'stopped') {
      setFilteredContainers(containers.filter(container => container.status === 'stopped' || container.status === 'exited'));
    }
    
    // Atualiza os contadores
    setRunningCount(containers.filter(container => container.status === 'running').length);
    setStoppedCount(containers.filter(container => container.status === 'stopped' || container.status === 'exited').length);
  }, [containers, activeFilter]);

  // Dados simulados de containers
  const getMockContainers = () => [
    // {
    //   id: 'c1',
    //   name: 'nginx-web',
    //   image: 'nginx:latest',
    //   status: 'running',
    //   created: '2 horas atrás',
    //   ports: ['80:80', '443:443'],
    //   uptime: '2h 15m'
    // }
  ];

  useEffect(() => {
    loadContainers();
  }, []);
  
  // Recarregar quando o status do Docker mudar para 'running' ou refreshTrigger mudar
  useEffect(() => {
    if (dockerStatus === 'running') {
      loadContainers();
    }
  }, [dockerStatus, refreshTrigger]);
  
  // Função para alterar o filtro ativo
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleStart = async (containerId) => {
    try {
      if (podmanAvailable) {
        await podmanService.startContainer(containerId);
        await loadContainers(); // Recarrega a lista
      } else {
        // Simulação para modo offline
        setContainers(prev => 
          prev.map(container => 
            container.id === containerId 
              ? { ...container, status: 'running', uptime: '0m' }
              : container
          )
        );
      }
    } catch (err) {
      console.error('Error starting container:', err);
      setError('Erro ao iniciar container: ' + err.message);
    }
  };

  const handleStop = async (containerId) => {
    try {
      if (podmanAvailable) {
        await podmanService.stopContainer(containerId);
        await loadContainers(); // Recarrega a lista
      } else {
        // Simulação para modo offline
        setContainers(prev => 
          prev.map(container => 
            container.id === containerId 
              ? { ...container, status: 'stopped', uptime: '-' }
              : container
          )
        );
      }
    } catch (err) {
      console.error('Error stopping container:', err);
      setError('Erro ao parar container: ' + err.message);
    }
  };

  const handleRestart = async (containerId) => {
    try {
      if (podmanAvailable) {
        await podmanService.restartContainer(containerId);
        await loadContainers(); // Recarrega a lista
      } else {
        // Simulação para modo offline
        setContainers(prev => 
          prev.map(container => 
            container.id === containerId 
              ? { ...container, status: 'running', uptime: '0m' }
              : container
          )
        );
      }
    } catch (err) {
      console.error('Error restarting container:', err);
      setError('Erro ao reiniciar container: ' + err.message);
    }
  };

  const handleDelete = async (containerId) => {
    if (!window.confirm('Tem certeza que deseja remover este container?')) {
      return;
    }

    try {
      if (podmanAvailable) {
        await podmanService.removeContainer(containerId, true);
        await loadContainers(); // Recarrega a lista
      } else {
        // Simulação para modo offline
        setContainers(prev => prev.filter(container => container.id !== containerId));
      }
    } catch (err) {
      console.error('Error deleting container:', err);
      setError('Erro ao remover container: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="container-list loading">
        <div className="loading-spinner"></div>
        <p>Carregando containers...</p>
      </div>
    );
  }

  return (
    <Tooltip.Provider>
      <div className="container-list">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
        
        <div className="list-header">
          <h2>Containers ({containers.length})</h2>
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={loadContainers}
              disabled={loading}
            >
              <RefreshCwIcon size={16} />
              Atualizar
            </button>
            {!podmanAvailable && (
              <span className="status-indicator offline">
                Modo Simulação
              </span>
            )}
          </div>
          <div className="status-filters">
            <button 
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              Todos ({containers.length})
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'running' ? 'active' : ''}`}
              onClick={() => handleFilterChange('running')}
            >
              Rodando ({runningCount})
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'stopped' ? 'active' : ''}`}
              onClick={() => handleFilterChange('stopped')}
            >
              Parados ({stoppedCount})
            </button>
          </div>
        </div>

        {containers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>Nenhum container encontrado</h3>
            <p>Crie seu primeiro container para começar</p>
          </div>
        ) : filteredContainers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Nenhum container {activeFilter === 'running' ? 'rodando' : 'parado'}</h3>
            <p>Não há containers que correspondam ao filtro selecionado</p>
          </div>
        ) : (
          <div className="containers-grid">
            {filteredContainers.map(container => (
              <div key={container.id} className={`container-card ${container.status}`}>
                <div className="card-header">
                  <div className="container-info">
                    <h3 className="container-name">{container.name}</h3>
                    <span className="container-image">{container.image}</span>
                  </div>
                  
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger className="menu-trigger">
                      <MoreHorizontalIcon size={16} />
                    </DropdownMenu.Trigger>
                    
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="dropdown-content">
                        <DropdownMenu.Item className="dropdown-item">
                          <EyeIcon size={14} />
                          Ver Logs
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className="dropdown-item">
                          <TerminalIcon size={14} />
                          Terminal
                        </DropdownMenu.Item>
                        <DropdownMenu.Item 
                          className="dropdown-item"
                          onClick={() => handleRestart(container.id)}
                        >
                          <RefreshCwIcon size={14} />
                          Reiniciar
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="dropdown-separator" />
                        <DropdownMenu.Item 
                          className="dropdown-item danger"
                          onClick={() => handleDelete(container.id)}
                        >
                          <TrashIcon size={14} />
                          Remover
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>

                <div className="card-body">
                  <div className="status-row">
                    <div className={`status-indicator ${container.status}`}>
                      <div className="status-dot"></div>
                      <span className="status-text">
                        {container.status === 'running' && 'Rodando'}
                        {container.status === 'stopped' && 'Parado'}
                        {container.status === 'error' && 'Erro'}
                      </span>
                    </div>
                    <span className="uptime">{container.uptime}</span>
                  </div>

                  <div className="ports-row">
                    <span className="label">Portas:</span>
                    <div className="ports">
                      {container.ports.map(port => (
                        <span key={port} className="port-badge">{port}</span>
                      ))}
                    </div>
                  </div>

                  <div className="created-row">
                    <span className="created-text">Criado {container.created}</span>
                  </div>
                </div>

                <div className="card-actions">
                  {container.status === 'running' ? (
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button 
                          className="action-btn stop"
                          onClick={() => handleStop(container.id)}
                        >
                          <Square size={16} />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content className="tooltip-content">
                          Parar Container
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  ) : (
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button 
                          className="action-btn start"
                          onClick={() => handleStart(container.id)}
                        >
                          <PlayIcon size={16} />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content className="tooltip-content">
                          Iniciar Container
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
};

export default ContainerList;
