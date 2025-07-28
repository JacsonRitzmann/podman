import React, { useState, useEffect } from 'react';
import { PlayIcon, Square, RefreshCwIcon, BarChartIcon } from 'lucide-react';
import podmanService from '../services/podmanService';
import './CompactContainerList.css';

// Função para formatar bytes
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};


const CompactContainerList = () => {
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dockerStatus, setDockerStatus] = useState('checking');
    const [isStartingPodman, setIsStartingPodman] = useState(false);
    const [isStoppingPodman, setIsStoppingPodman] = useState(false);
    const [startupMessage, setStartupMessage] = useState('');
    const [podmanAvailable, setPodmanAvailable] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [containerStats, setContainerStats] = useState([]);
    const [loadingStats, setLoadingStats] = useState(false);

    // Função para carregar os containers
    const loadContainers = async () => {
        setLoading(true);
        setError(null);

        try {
            const isAvailable = await podmanService.isAvailable();
            setPodmanAvailable(isAvailable);

            if (isAvailable) {
                const containerData = await podmanService.listContainers();
                const formattedContainers = containerData.map(container => ({
                    id: container.Id || container.ID,
                    name: container.Names ? container.Names[0] : (container.Name || 'unnamed'),
                    image: container.Image,
                    status: container.State || container.Status,
                    created: container.Created ? new Date(container.Created * 1000).toLocaleString() : 'N/A',
                }));
                setContainers(formattedContainers);
                if (showStats) {
                    loadContainerStats();
                }
            } else {
                // Dados simulados quando Podman não está disponível
                setContainers(getMockContainers());
            }
        } catch (err) {
            console.error('Erro ao carregar containers:', err);
            setError('Falha ao carregar containers');
            setContainers(getMockContainers());
        } finally {
            setLoading(false);
        }
    };



    // Dados simulados de containers
    const getMockContainers = () => [
        // {
        //   id: 'c1',
        //   name: 'nginx-web',
        //   image: 'nginx:latest',
        //   status: 'running',
        //   created: '2 horas atrás',
        // },
    ];

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

    // Carregar containers quando o componente montar ou status mudar
    useEffect(() => {
        if (dockerStatus === 'running') {
            loadContainers();
        } else {
            setContainers([]);
            setLoading(false);
        }
    }, [dockerStatus]);

    // Funções para gerenciar o Podman
    const handleRefresh = async () => {
        setDockerStatus('checking');
        try {
            const isAvailable = await podmanService.isAvailable();
            setDockerStatus(isAvailable ? 'running' : 'stopped');
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

            setStartupMessage('Iniciando..');
            await podmanService.startPodmanService();

            // Verificar status novamente
            const isAvailable = await podmanService.isAvailable();
            setDockerStatus(isAvailable ? 'running' : 'error');
            setStartupMessage('');
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
        } catch (error) {
            console.error('Error stopping Podman:', error);
            setDockerStatus('error');
        } finally {
            setIsStoppingPodman(false);
        }
    };

    // Funções para ações de container
    const handleStart = async (id) => {
        console.log(`Iniciando container ${id}`);
        try {
            if (podmanAvailable) {
                await podmanService.startContainer(id);
                await loadContainers(); // Recarrega a lista
            } else {
                // Simulação para modo offline
                setContainers(containers.map(c =>
                    c.id === id ? { ...c, status: 'running' } : c
                ));
            }
        } catch (error) {
            console.error('Erro ao iniciar container:', error);
            setError(`Erro ao iniciar container: ${error.message}`);
        }
    };

    const handleStop = async (id) => {
        console.log(`Parando container ${id}`);
        try {
            if (podmanAvailable) {
                await podmanService.stopContainer(id);
                await loadContainers(); // Recarrega a lista
            } else {
                // Simulação para modo offline
                setContainers(containers.map(c =>
                    c.id === id ? { ...c, status: 'exited' } : c
                ));
            }
        } catch (error) {
            console.error('Erro ao parar container:', error);
            setError(`Erro ao parar container: ${error.message}`);
        }
    };

    const handleRemove = async (id) => {
        console.log(`Removendo container ${id}`);
        if (!window.confirm('Tem certeza que deseja remover este container?')) {
            return;
        }

        try {
            if (podmanAvailable) {
                await podmanService.removeContainer(id, true);
                await loadContainers(); // Recarrega a lista
            } else {
                // Simulação para modo offline
                setContainers(containers.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error('Erro ao remover container:', error);
            setError(`Erro ao remover container: ${error.message}`);
        }
    };

    // Função para carregar estatísticas dos containers
    const loadContainerStats = async () => {
        if (!podmanAvailable || dockerStatus !== 'running') {
            return;
        }

        setLoadingStats(true);
        try {
            const stats = await podmanService.getContainerStats();
            setContainerStats(stats);
        } catch (err) {
            console.error('Erro ao carregar estatísticas:', err);
        } finally {
            setLoadingStats(false);
        }
    };

    // Função para formatar bytes
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // Carregar estatísticas quando showStats mudar
    useEffect(() => {
        if (showStats && dockerStatus === 'running') {
            loadContainerStats();
        }
    }, [showStats, dockerStatus]);

    if (loading) {
        return (
            <div className="compact-container-loading">
                <div className="compact-spinner"></div>
                <p>Carregando containers...</p>
            </div>
        );
    }

    return (
        <div className="compact-container-list">
            <div className="compact-header">
                <div className="compact-title-status">
                    <div className={`compact-status-badge ${dockerStatus}`}>
                        <div className="compact-status-dot"></div>
                        {dockerStatus === 'checking' && 'Verificando...'}
                        {dockerStatus === 'running' && 'Podman Ativo'}
                        {dockerStatus === 'stopped' && 'Podman Parado'}
                        {dockerStatus === 'error' && 'Erro'}
                    </div>
                </div>
                <div className="compact-action-buttons">
                    {dockerStatus === 'stopped' && (
                        <button
                            className="compact-action-btn primary"
                            onClick={handleStartPodman}
                            disabled={isStartingPodman}
                        >
                            <PlayIcon size={16} className={isStartingPodman ? 'spinning' : ''} />
                            {isStartingPodman
                                ? startupMessage || 'Iniciando...'
                                : 'Iniciar'}
                        </button>
                    )}
                    {dockerStatus === 'running' && (
                        <button
                            className="compact-action-btn danger"
                            onClick={handleStopPodman}
                            disabled={isStoppingPodman}
                        >
                            <Square size={16} className={isStoppingPodman ? 'spinning' : ''} />
                            {isStoppingPodman ? 'Parando...' : 'Parar'}
                        </button>
                    )}
                    {dockerStatus === 'running' && (
                        <button
                            className={`compact-refresh-button ${showStats ? 'active' : ''}`}
                            onClick={() => {
                                if (!showStats) {
                                    loadContainerStats();
                                }
                                setShowStats(!showStats);
                            }}
                            title={showStats ? "Ocultar estatísticas" : "Mostrar estatísticas"}
                        >
                            <BarChartIcon size={16} />
                        </button>
                    )}
                    <button
                        className="compact-refresh-button"
                        onClick={handleRefresh}
                        disabled={dockerStatus === 'checking' || isStartingPodman || isStoppingPodman}
                    >
                        <RefreshCwIcon size={16} className={dockerStatus === 'checking' ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="compact-error">
                    <p>{error}</p>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}
            <div className='container'>
                {showStats && dockerStatus === 'running' && (
                    <div className="compact-stats-section">
                        <h3>Estatísticas de Containers</h3>
                        {loadingStats ? (
                            <div className="compact-stats-loading">
                                <div className="compact-spinner small"></div>
                                <p>Carregando estatísticas...</p>
                            </div>
                        ) : containerStats.length === 0 ? (
                            <div className="compact-stats-empty">
                                <p>Nenhum container em execução para mostrar estatísticas</p>
                            </div>
                        ) : (
                            <ul className="compact-stats-list">
                                {containerStats.map(stat => (
                                    <li key={stat.id} className="compact-stats-item">
                                        <div className="compact-stats-name">
                                            {stat.name ?
                                                `${stat.name.substring(0, 15)}${stat.name.length > 15 ? '...' : ''}` :
                                                (stat.id ? stat.id.substring(0, 10) : 'Desconhecido')
                                            }
                                        </div>
                                        <div className="compact-stats-metrics">
                                            <div className="compact-stat">
                                                <span className="compact-stat-label">CPU:</span>
                                                <span className="compact-stat-value">{stat.cpu_percent || '0%'}</span>
                                            </div>
                                            <div className="compact-stat">
                                                <span className="compact-stat-label">MEM:</span>
                                                <span className="compact-stat-value">{stat.mem_percent || '0%'}</span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="compact-stats-refresh">
                            <button
                                className="compact-refresh-button small"
                                onClick={loadContainerStats}
                                disabled={loadingStats}
                            >
                                <RefreshCwIcon size={12} className={loadingStats ? 'spinning' : ''} />
                            </button>
                        </div>
                    </div>
                )}

                {containers.length === 0 ? (
                    <div className="compact-empty">
                        <p>Nenhum container encontrado</p>
                    </div>
                ) : (
                    <ul className="compact-container-items">
                        {containers.map(container => (
                            <li
                                key={container.id}
                                className={`compact-container-item ${container.status}`}
                            >
                                <div className="compact-container-info">
                                    <div className="compact-container-name-row">
                                        <span className="compact-status-dot"></span>
                                        <h3 className="compact-container-name">{container.name}</h3>
                                    </div>
                                    <p className="compact-container-image">{container.image}</p>
                                    <p className="compact-container-created">{container.created}</p>
                                </div>

                                <div className="compact-container-actions">
                                    {container.status === 'running' ? (
                                        <button
                                            className="compact-stop-button"
                                            onClick={() => handleStop(container.id)}
                                            title="Parar"
                                        >
                                            ■
                                        </button>
                                    ) : (
                                        <button
                                            className="compact-start-button"
                                            onClick={() => handleStart(container.id)}
                                            title="Iniciar"
                                        >
                                            ▶
                                        </button>
                                    )}
                                    <button
                                        className="compact-remove-button"
                                        onClick={() => handleRemove(container.id)}
                                        title="Remover"
                                    >
                                        🗑
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default CompactContainerList;
