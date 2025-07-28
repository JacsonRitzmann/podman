import React, { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { MoreHorizontalIcon, TrashIcon, PlusIcon, NetworkIcon, XIcon } from 'lucide-react';
import podmanService from '../services/podmanService';
import './NetworkList.css';

const NetworkList = ({ dockerStatus, refreshTrigger }) => {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [podmanAvailable, setPodmanAvailable] = useState(false);

      const loadNetworks = async () => {
        setLoading(true);
        setError(null);
        
        try {
          const isAvailable = await podmanService.isAvailable();
          setPodmanAvailable(isAvailable);
          
          if (isAvailable) {
            const networkData = await podmanService.listNetworks();
            console.log('Networks data:', networkData);
            
            const formattedNetworks = networkData.map(network => ({
              id: network.id,
              name: network.name || '',
              driver: network.driver || '',
              scope: 'local', // Geralmente as redes Podman são locais
              created: network.created ? new Date(network.created).toLocaleString() : 'N/A',
              containers: 0, // Isso pode ser atualizado se a API fornecer essa informação
              subnet: network.subnets && network.subnets.length > 0 ? network.subnets[0].subnet : '-',
              gateway: network.subnets && network.subnets.length > 0 ? network.subnets[0].gateway : '-',
              isDefault: network.name === 'bridge' || network.name.includes('default'),
              internal: network.internal || false,
              dnsEnabled: network.dns_enabled || false,
              networkInterface: network.network_interface || ''
            }));
            
            setNetworks(formattedNetworks);
          } else {
            // Dados simulados quando Podman não está disponível
            setNetworks(getMockNetWorks());
          }
        } catch (err) {
          console.error('Error loading networks:', err);
          setError('Erro ao carregar redes. Usando dados simulados.');
          setNetworks(getMockNetWorks());
          setLoading(false);
        } finally {
          setLoading(false);
        }
      };

  const getMockNetWorks = () => [
      // {
      //   id: 'net1',
      //   name: 'bridge',
      //   driver: 'bridge',
      //   scope: 'local',
      //   created: 'Sistema',
      //   containers: 3,
      //   subnet: '172.17.0.0/16',
      //   gateway: '172.17.0.1',
      //   isDefault: true
      // }
    ];


    useEffect(() => {
      loadNetworks();
    }, []);
    
    // Recarregar quando o status do Docker mudar para 'running' ou refreshTrigger mudar
    useEffect(() => {
      if (dockerStatus === 'running') {
        loadNetworks();
      }
    }, [dockerStatus, refreshTrigger]);

  const [isCreatingNetwork, setIsCreatingNetwork] = useState(false);
  const [newNetworkName, setNewNetworkName] = useState('');
  const [newNetworkDriver, setNewNetworkDriver] = useState('bridge');

  const handleCreateNetwork = async () => {
    if (!newNetworkName.trim()) {
      setError("Nome da rede é obrigatório");
      return;
    }
    
    setIsCreatingNetwork(true);
    setError(null);
    
    try {
      await podmanService.createNetwork(newNetworkName, newNetworkDriver);
      setNewNetworkName('');
      setNewNetworkDriver('bridge');
      setIsCreatingNetwork(false);
      loadNetworks(); // Recarrega a lista após criar
    } catch (error) {
      console.error('Erro ao criar rede:', error);
      setError(`Erro ao criar rede: ${error.message}`);
      setIsCreatingNetwork(false);
    }
  };

  const handleRemove = async (networkId) => {
    try {
      if (podmanAvailable) {
        await podmanService.removeNetwork(networkId);
        loadNetworks(); // Recarrega a lista após remover
      } else {
        // Modo simulado
        setNetworks(prev => prev.filter(network => network.id !== networkId));
      }
    } catch (error) {
      console.error('Erro ao remover rede:', error);
      setError(`Erro ao remover rede: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="network-list loading">
        <div className="loading-spinner"></div>
        <p>Carregando redes...</p>
      </div>
    );
  }

  return (
    <div className="network-list">
      {error && <div className="error-alert">{error}</div>}
      
      <div className="list-header">
        <h2>Redes {podmanAvailable ? 'Podman' : 'Docker'} ({networks.length})</h2>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button className="action-btn primary">
              <PlusIcon size={16} />
              Criar Rede
            </button>
          </Dialog.Trigger>
          
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="dialog-content network-dialog">
              <Dialog.Title className="dialog-title">Criar Nova Rede</Dialog.Title>
              <Dialog.Description className="dialog-description">
                Configure uma nova rede para conectar seus containers.
              </Dialog.Description>
              
              <div className="dialog-form">
                <div className="form-group">
                  <label htmlFor="network-name">Nome da Rede</label>
                  <input 
                    id="network-name" 
                    value={newNetworkName}
                    onChange={(e) => setNewNetworkName(e.target.value)}
                    placeholder="ex: app-network"
                    required
                    autoFocus
                  />
                  <small className="input-help">Um nome único para identificar sua rede.</small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="network-driver">Driver</label>
                  <select 
                    id="network-driver" 
                    value={newNetworkDriver}
                    onChange={(e) => setNewNetworkDriver(e.target.value)}
                  >
                    <option value="bridge">bridge - Rede isolada em um único host</option>
                    <option value="host">host - Usa a rede do host diretamente</option>
                    <option value="ipvlan">ipvlan - Redes baseadas em IPs</option>
                    <option value="macvlan">macvlan - Redes baseadas em MACs</option>
                  </select>
                  <small className="input-help">O driver determina como a rede funciona.</small>
                </div>
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <div className="dialog-footer">
                <Dialog.Close asChild>
                  <button className="btn secondary">Cancelar</button>
                </Dialog.Close>
                <button 
                  className="btn primary" 
                  onClick={handleCreateNetwork}
                  disabled={isCreatingNetwork || !newNetworkName.trim()}
                >
                  {isCreatingNetwork ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Criando...
                    </>
                  ) : (
                    'Criar Rede'
                  )}
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

      {networks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌐</div>
          <h3>Nenhuma rede encontrada</h3>
          <p>Crie redes personalizadas para isolar seus containers</p>
        </div>
      ) : (
        <div className="networks-grid">
          {networks.map(network => (
            <div key={network.id} className={`network-card ${network.isDefault ? 'default' : ''}`}>
              <div className="card-header">
                <div className="network-info">
                  <div className="network-name-row">
                    <NetworkIcon size={20} className="network-icon" />
                    <h3 className="network-name">{network.name}</h3>
                    {network.isDefault && <span className="default-badge">Padrão</span>}
                  </div>
                  <span className="network-driver">{network.driver} driver</span>
                </div>
                
                {!network.isDefault && (
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger className="menu-trigger">
                      <MoreHorizontalIcon size={16} />
                    </DropdownMenu.Trigger>
                    
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="dropdown-content">
                        <DropdownMenu.Item 
                          className="dropdown-item danger"
                          onClick={() => handleRemove(network.id)}
                        >
                          <TrashIcon size={14} />
                          Remover
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                )}
              </div>

              <div className="card-body">
                <div className="network-details">
                  <div className="detail-row">
                    <span className="label">Escopo:</span>
                    <span className="value">{network.scope}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Interface:</span>
                    <span className="value">{network.networkInterface || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Subnet:</span>
                    <code className="value">{network.subnet}</code>
                  </div>
                  <div className="detail-row">
                    <span className="label">Gateway:</span>
                    <code className="value">{network.gateway}</code>
                  </div>
                  <div className="detail-row">
                    <span className="label">DNS:</span>
                    <span className="value">{network.dnsEnabled ? 'Ativado' : 'Desativado'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Tipo:</span>
                    <span className="value">{network.internal ? 'Interna' : 'Externa'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Containers:</span>
                    <span className="value containers-count">
                      {network.containers} conectado{network.containers !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="created-info">
                  <span className="created-text">
                    {network.isDefault ? 'Rede do sistema' : `Criado em ${network.created}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NetworkList;
