import React, { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Container, PlayIcon, Square, TrashIcon, RefreshCwIcon, PlusIcon, BarChartIcon } from 'lucide-react';
import ContainerList from './ContainerList';
import ImageList from './ImageList';
import NetworkList from './NetworkList';
import VolumeList from './VolumeList';
import ResourceStats from './ResourceStats';
import CreateContainerDialog from './CreateContainerDialog';
import podmanService from '../services/podmanService';
import './DockerManager.css';

const DockerManager = () => {
  const [activeTab, setActiveTab] = useState('containers');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dockerStatus, setDockerStatus] = useState('checking');
  const [isStartingPodman, setIsStartingPodman] = useState(false);
  const [isStoppingPodman, setIsStoppingPodman] = useState(false);
  const [startupMessage, setStartupMessage] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Verificar status do Docker/Podman
  useEffect(() => {
    const checkDockerStatus = async () => {
      setDockerStatus('checking');
      try {
        const isAvailable = await podmanService.isAvailable();
        setDockerStatus(isAvailable ? 'running' : 'stopped');
      } catch (error) {
        console.error('Error checking Podman status:', error);
        setDockerStatus('error');
      }
    };
    
    checkDockerStatus();
  }, []);

  const handleRefresh = async () => {
    setDockerStatus('checking');
    try {
      const isAvailable = await podmanService.isAvailable();
      setDockerStatus(isAvailable ? 'running' : 'stopped');
      
      // Forçar atualização das listas se estiver rodando
      if (isAvailable) {
        setRefreshCounter(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error refreshing Podman status:', error);
      setDockerStatus('error');
    }
  };

  const handleStartPodman = async () => {
    setIsStartingPodman(true);
    setStartupMessage('Verificando máquina Podman...');
    
    try {
      // Checar se a máquina existe
      const machineExists = await podmanService.checkMachineExists();
      
      if (!machineExists) {
        setStartupMessage('Inicializando máquina Podman...');
        await podmanService.initPodmanMachine();
      }
      
      setStartupMessage('Iniciando serviço Podman...');
      await podmanService.startPodmanService();
      
      // Verificar status novamente
      const isAvailable = await podmanService.isAvailable();
      setDockerStatus(isAvailable ? 'running' : 'error');
      setStartupMessage('');
      
      // Forçar atualização das listas
      if (isAvailable) {
        setRefreshCounter(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error starting Podman:', error);
      setDockerStatus('error');
      setStartupMessage('');
    } finally {
      setIsStartingPodman(false);
    }
  };

  const handleStopPodman = async () => {
    if (!window.confirm('Tem certeza que deseja parar o Podman? Isso encerrará todos os containers em execução.')) {
      return;
    }

    setIsStoppingPodman(true);
    
    try {
      await podmanService.stopPodmanService();
      
      // Verificar status novamente
      const isAvailable = await podmanService.isAvailable();
      setDockerStatus(isAvailable ? 'running' : 'stopped');
      
      // Forçar atualização das listas
      setRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error('Error stopping Podman:', error);
      setDockerStatus('error');
    } finally {
      setIsStoppingPodman(false);
    }
  };

  return (
    <div className="docker-manager">
      {/* Header */}
      <header className="manager-header">
        <div className="header-content">
          <div className="header-left">
            <Container className="header-icon" />
            <h1>Gerenciador Podman </h1>
            <div className={`status-badge ${dockerStatus}`}>
              <div className="status-dot"></div>
              {dockerStatus === 'checking' && 'Verificando...'}
              {dockerStatus === 'running' && 'Docker Ativo'}
              {dockerStatus === 'stopped' && 'Docker Parado'}
              {dockerStatus === 'error' && 'Erro'}
            </div>
          </div>
          <div className="header-actions">
            {dockerStatus === 'stopped' && (
              <button 
                className="action-btn primary"
                onClick={handleStartPodman}
                disabled={isStartingPodman}
              >
                <PlayIcon className={isStartingPodman ? 'spinning' : ''} />
                {isStartingPodman 
                  ? startupMessage || 'Iniciando...' 
                  : 'Iniciar Podman'}
              </button>
            )}
            {dockerStatus === 'running' && (
              <button 
                className="action-btn danger"
                onClick={handleStopPodman}
                disabled={isStoppingPodman}
              >
                <Square className={isStoppingPodman ? 'spinning' : ''} />
                {isStoppingPodman ? 'Parando...' : 'Parar Podman'}
              </button>
            )}
            <button 
              className="action-btn secondary"
              onClick={handleRefresh}
              disabled={dockerStatus === 'checking' || isStartingPodman || isStoppingPodman}
            >
              <RefreshCwIcon className={dockerStatus === 'checking' ? 'spinning' : ''} />
              Atualizar
            </button>
            <button 
              className="action-btn primary"
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={dockerStatus !== 'running' || isStoppingPodman}
            >
              <PlusIcon />
              Novo Container
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="tabs-root">
        <Tabs.List className="tabs-list">
          <Tabs.Trigger value="containers" className="tabs-trigger">
            <Container size={16} />
            Containers
          </Tabs.Trigger>
          <Tabs.Trigger value="images" className="tabs-trigger">
            <div className="image-icon"></div>
            Imagens
          </Tabs.Trigger>
          <Tabs.Trigger value="networks" className="tabs-trigger">
            <div className="network-icon"></div>
            Redes
          </Tabs.Trigger>
          <Tabs.Trigger value="volumes" className="tabs-trigger">
            <div className="volume-icon"></div>
            Volumes
          </Tabs.Trigger>
          <Tabs.Trigger value="stats" className="tabs-trigger">
            <BarChartIcon size={16} />
            Estatísticas
          </Tabs.Trigger>
        </Tabs.List>

        {/* Tab Contents */}
        <div className="tabs-content-wrapper">
          <Tabs.Content value="containers" className="tabs-content">
            <ContainerList 
              dockerStatus={dockerStatus} 
              refreshTrigger={refreshCounter} 
            />
          </Tabs.Content>
          
          <Tabs.Content value="images" className="tabs-content">
            <ImageList 
              dockerStatus={dockerStatus} 
              refreshTrigger={refreshCounter} 
            />
          </Tabs.Content>
          
          <Tabs.Content value="networks" className="tabs-content">
            <NetworkList 
              dockerStatus={dockerStatus} 
              refreshTrigger={refreshCounter} 
            />
          </Tabs.Content>
          
          <Tabs.Content value="volumes" className="tabs-content">
            <VolumeList 
              dockerStatus={dockerStatus} 
              refreshTrigger={refreshCounter} 
            />
          </Tabs.Content>
          
          <Tabs.Content value="stats" className="tabs-content">
            <ResourceStats 
              refreshInterval={dockerStatus === 'running' ? 5000 : 0} 
            />
          </Tabs.Content>
        </div>
      </Tabs.Root>

      {/* Create Container Dialog */}
      <CreateContainerDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
};

export default DockerManager;
