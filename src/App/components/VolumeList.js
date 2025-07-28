import React, { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { MoreHorizontalIcon, TrashIcon, PlusIcon, HardDriveIcon, XIcon, Trash2Icon } from 'lucide-react';
import podmanService from '../services/podmanService';
import './VolumeList.css';

const VolumeList = ({ dockerStatus, refreshTrigger }) => {
  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [podmanAvailable, setPodmanAvailable] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [isCreatingVolume, setIsCreatingVolume] = useState(false);
  const [newVolumeName, setNewVolumeName] = useState('');

  const loadVolumes = async () => {
    setLoading(true);
    setError(null);

    try {
      const isAvailable = await podmanService.isAvailable();
      setPodmanAvailable(isAvailable);

      if (isAvailable) {
        const volumeData = await podmanService.listVolumes();
        console.log('Volumes data:', volumeData);

        const formattedVolumes = volumeData.map(volume => ({
          id: volume.Name,
          name: volume.Name,
          driver: volume.Driver || 'local',
          mountpoint: volume.Mountpoint || '',
          created: new Date(volume.CreatedAt || Date.now()).toLocaleString(),
          size: volume.Size || 'Desconhecido',
          inUse: volume.inUse || false,
          usedBy: volume.usedBy || [],
          labels: volume.Labels || {}
        }));

        setVolumes(formattedVolumes);
      } else {
        // Dados simulados quando Podman não está disponível
        setVolumes(getMockVolumes());
      }
    } catch (err) {
      console.error('Error loading volumes:', err);
      setError('Erro ao carregar volumes. Usando dados simulados.');
      setVolumes(getMockVolumes());
    } finally {
      setLoading(false);
    }
  };

  const getMockVolumes = () => [
    // {
    //   id: 'vol1',
    //   name: 'postgres_data',
    //   driver: 'local',
    //   mountpoint: '/var/lib/docker/volumes/postgres_data/_data',
    //   created: '1 semana atrás',
    //   size: '245MB',
    //   inUse: true,
    //   containers: ['postgres-db']
    // }
  ];

  const handleCreateVolume = async () => {
    if (!newVolumeName.trim()) {
      setError("Nome do volume é obrigatório");
      return;
    }

    setIsCreatingVolume(true);
    setError(null);

    try {
      await podmanService.createVolume(newVolumeName);
      setNewVolumeName('');
      setIsCreatingVolume(false);
      loadVolumes(); // Recarrega a lista após criar
    } catch (error) {
      console.error('Erro ao criar volume:', error);
      setError(`Erro ao criar volume: ${error.message}`);
      setIsCreatingVolume(false);
    }
  };

  const handlePruneVolumes = async () => {
    setLoading(true);
    setIsPruning(true)
    try {
      await podmanService.pruneVolumes(true);
      setLoading(false);
      setIsPruning(false)
    } catch (error) {
      console.error('Erro ao prune volume:', error);
      setError(`Erro ao prune volume: ${error.message}`);
      setLoading(false);
      setIsPruning(false)
    }

  }

  const handleRemove = async (volumeId, force = false) => {
    if (force) {
      if (!window.confirm(`Tem certeza que deseja forçar a remoção do volume "${volumeId}"? Isso pode causar perda de dados.`)) {
        return;
      }
    }

    try {
      if (podmanAvailable) {
        await podmanService.removeVolume(volumeId, force);
        loadVolumes(); // Recarrega a lista após remover
      } else {
        // Modo simulado
        setVolumes(prev => prev.filter(volume => volume.id !== volumeId));
      }
    } catch (error) {
      console.error('Erro ao remover volume:', error);

      // Se o erro for porque o volume está em uso, perguntar se quer forçar a remoção
      if (!force && error.message && error.message.includes('em uso')) {
        if (window.confirm(`${error.message}\n\nDeseja forçar a remoção?`)) {
          handleRemove(volumeId, true);
          return;
        }
      }

      setError(`Erro ao remover volume: ${error.message}`);
    }
  };

  useEffect(() => {
    loadVolumes();
  }, []);

  // Recarregar quando o status do Docker mudar para 'running' ou refreshTrigger mudar
  useEffect(() => {
    if (dockerStatus === 'running') {
      loadVolumes();
    }
  }, [dockerStatus, refreshTrigger]);

  if (loading) {
    return (
      <div className="volume-list loading">
        <div className="loading-spinner"></div>
        <p>Carregando volumes...</p>
      </div>
    );
  }

  return (
    <div className="volume-list">
      {error && <div className="error-alert">{error}</div>}

      <div className="list-header">
        <h2>Volumes {podmanAvailable ? 'Podman' : 'Docker'} ({volumes.length})</h2>

        <div className="list-header-action">
          <button
            className="action-btn secondary"
            onClick={handlePruneVolumes}
            disabled={isPruning || !podmanAvailable || volumes.length === 0}
            title="Remove todos os volumes não utilizados"
          >
            <Trash2Icon size={16} />
            {isPruning ? 'Limpando...' : 'Limpar Volumes Não Utilizados'}
          </button>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="action-btn primary">
                <PlusIcon size={16} />
                Criar Volume
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className="dialog-content volume-dialog">
                <Dialog.Title className="dialog-title">Criar Novo Volume</Dialog.Title>
                <Dialog.Description className="dialog-description">
                  Crie um novo volume para persistir dados de containers.
                </Dialog.Description>

                <div className="dialog-form">
                  <div className="form-group">
                    <label htmlFor="volume-name">Nome do Volume</label>
                    <input
                      id="volume-name"
                      value={newVolumeName}
                      onChange={(e) => setNewVolumeName(e.target.value)}
                      placeholder="ex: app_data"
                      required
                    />
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="dialog-footer">
                  <Dialog.Close asChild>
                    <button className="btn secondary">Cancelar</button>
                  </Dialog.Close>
                  <button
                    className="btn primary"
                    onClick={handleCreateVolume}
                    disabled={isCreatingVolume || !newVolumeName.trim()}
                  >
                    {isCreatingVolume ? 'Criando...' : 'Criar Volume'}
                  </button>
                </div>

                <Dialog.Close asChild>
                  <button className="close-button" aria-label="Close">
                    <XIcon size={16} />
                  </button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>


      </div>

      {volumes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💾</div>
          <h3>Nenhum volume encontrado</h3>
          <p>Crie volumes para persistir dados dos containers</p>
        </div>
      ) : (
        <div className="volumes-grid">
          {volumes.map(volume => (
            <div key={volume.id} className={`volume-card ${volume.inUse ? 'in-use' : ''}`}>
              <div className="card-header">
                <div className="volume-info">
                  <div className="volume-name-row">
                    <HardDriveIcon size={20} className="volume-icon" />
                    <h3 className="volume-name">[{volume.name.substring(0, 20)}...]</h3>
                    {volume.inUse && <span className="in-use-badge">Em uso</span>}
                  </div>
                  <span className="volume-driver">{volume.driver} driver</span>
                </div>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger className="menu-trigger">
                    <MoreHorizontalIcon size={16} />
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className="dropdown-content">
                      <DropdownMenu.Item
                        className="dropdown-item danger"
                        onClick={() => handleRemove(volume.id)}
                        disabled={false}
                      >
                        <TrashIcon size={14} />
                        Remover
                      </DropdownMenu.Item>
                      {volume.inUse && (
                        <DropdownMenu.Item
                          className="dropdown-item danger"
                          onClick={() => handleRemove(volume.id, true)}
                        >
                          <TrashIcon size={14} />
                          Forçar Remoção
                        </DropdownMenu.Item>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>

              <div className="card-body">
                <div className="volume-details">
                  <div className="detail-row">
                    <span className="label">Tamanho:</span>
                    <span className="value size">{volume.size}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Mountpoint:</span>
                    <code className="value mountpoint">{volume.mountpoint}</code>
                  </div>
                  <div className="detail-row">
                    <span className="label">Containers:</span>
                    <div className="value containers">
                      {!volume.inUse || volume.usedBy.length === 0 ? (
                        <span className="no-containers">Nenhum</span>
                      ) : (
                        volume.usedBy.map((container, idx) => (
                          <span key={idx} className="container-tag">
                            {typeof container === 'string' ? container : (container.Name || container.Id || 'Container')}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="created-info">
                  <span className="created-text">Criado em {volume.created}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolumeList;
