import React, { createContext, useState, useContext, useEffect } from 'react';
import podmanService from '../services/podmanService';

// Criar o contexto
const ContainerContext = createContext();

// Hook personalizado para usar o contexto
export const useContainers = () => useContext(ContainerContext);

// Provedor do contexto
export const ContainerProvider = ({ children }) => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [podmanAvailable, setPodmanAvailable] = useState(false);

  // Carregar containers
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

  // Dados simulados de containers
  const getMockContainers = () => [
    {
      id: 'c1',
      name: 'nginx-web',
      image: 'nginx:latest',
      status: 'running',
      created: '2 horas atrás',
      ports: ['80:80', '443:443'],
      uptime: '2h 15m'
    },
    {
      id: 'c2',
      name: 'postgres-db',
      image: 'postgres:13',
      status: 'stopped',
      created: '3 horas atrás',
      ports: ['5432:5432'],
      uptime: '-'
    },
    {
      id: 'c3',
      name: 'redis-cache',
      image: 'redis:alpine',
      status: 'running',
      created: '1 dia atrás',
      ports: ['6379:6379'],
      uptime: '1d 2h 30m'
    }
  ];

  // Ações de containers
  const startContainer = async (id) => {
    try {
      if (podmanAvailable) {
        await podmanService.startContainer(id);
        await loadContainers(); // Recarrega a lista
      } else {
        // Simulação para modo offline
        setContainers(prev => 
          prev.map(container => 
            container.id === id 
              ? { ...container, status: 'running', uptime: '0m' }
              : container
          )
        );
      }
    } catch (err) {
      console.error('Error starting container:', err);
      throw new Error('Erro ao iniciar container: ' + err.message);
    }
  };

  const stopContainer = async (id) => {
    try {
      if (podmanAvailable) {
        await podmanService.stopContainer(id);
        await loadContainers(); // Recarrega a lista
      } else {
        // Simulação para modo offline
        setContainers(prev => 
          prev.map(container => 
            container.id === id 
              ? { ...container, status: 'stopped', uptime: '-' }
              : container
          )
        );
      }
    } catch (err) {
      console.error('Error stopping container:', err);
      throw new Error('Erro ao parar container: ' + err.message);
    }
  };

  const removeContainer = async (id) => {
    try {
      if (podmanAvailable) {
        await podmanService.removeContainer(id, true);
        await loadContainers(); // Recarrega a lista
      } else {
        // Simulação para modo offline
        setContainers(prev => prev.filter(container => container.id !== id));
      }
    } catch (err) {
      console.error('Error removing container:', err);
      throw new Error('Erro ao remover container: ' + err.message);
    }
  };

  // Carregar containers quando o contexto for montado
  useEffect(() => {
    loadContainers();
  }, []);

  // Valores para disponibilizar no contexto
  const value = {
    containers,
    loading,
    error,
    podmanAvailable,
    loadContainers,
    startContainer,
    stopContainer,
    removeContainer
  };

  return (
    <ContainerContext.Provider value={value}>
      {children}
    </ContainerContext.Provider>
  );
};

export default ContainerContext;
