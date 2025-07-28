import React, { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontalIcon, TrashIcon, PlayIcon, DownloadIcon, RefreshCwIcon } from 'lucide-react';
import podmanService from '../services/podmanService';
import './ImageList.css';

const ImageList = ({ dockerStatus, refreshTrigger }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [podmanAvailable, setPodmanAvailable] = useState(false);

  // Carrega imagens do Podman
  const loadImages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const isAvailable = await podmanService.isAvailable();
      setPodmanAvailable(isAvailable);
      
      if (isAvailable) {
        const imageData = await podmanService.listImages();
        console.log(imageData)
        const formattedImages = imageData.map(image => ({
          id: image.Id || image.ID || image.id,
          repository: image.Repository || image.Names || 'unknown',
          tag: image.Tag || image.tag || 'latest',
          size: image.Size || image.size || 'N/A',
          created: image.Created ? new Date(image.Created * 1000).toLocaleString() : 'N/A'
        }));
        setImages(formattedImages);
      } else {
        // Dados simulados quando Podman não está disponível
        setImages(getMockImages());
      }
    } catch (err) {
      console.error('Error loading images:', err);
      setError('Erro ao carregar imagens. Usando dados simulados.');
      setImages(getMockImages());
    } finally {
      setLoading(false);
    }
  };

  // Dados simulados de imagens
  const getMockImages = () => [
    // {
    //   id: 'img1',
    //   repository: 'nginx',
    //   tag: 'latest',
    //   size: '133MB',
    //   created: '2 dias atrás'
    // }
  ];

  useEffect(() => {
    loadImages();
  }, []);
  
  // Recarregar quando o status do Docker mudar para 'running' ou refreshTrigger mudar
  useEffect(() => {
    if (dockerStatus === 'running') {
      loadImages();
    }
  }, [dockerStatus, refreshTrigger]);

  // Função para formatar o tamanho da imagem para MB/GB
  const formatImageSize = (size) => {
    // Se o tamanho já for uma string formatada (ex: "133MB"), retorna como está
    if (typeof size === 'string' && (size.includes('MB') || size.includes('GB') || size.includes('KB'))) {
      return size;
    }
    
    // Converte para número se for string numérica
    const sizeInBytes = typeof size === 'string' ? parseInt(size) : size;
    
    // Se não for um número válido, retorna 'N/A'
    if (isNaN(sizeInBytes) || sizeInBytes === 0) {
      return 'N/A';
    }
    
    // Converte para MB
    if (sizeInBytes < 1024 * 1024 * 1024) {
      return (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
    } 
    // Converte para GB se for maior que 1GB
    else {
      return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
  };

  const handleRemoveImage = async (imageId) => {
    if (!window.confirm('Tem certeza que deseja remover esta imagem?')) {
      return;
    }

    try {
      if (podmanAvailable) {
        await podmanService.removeImage(imageId, true);
        await loadImages(); // Recarrega a lista
      } else {
        // Simulação para modo offline
        setImages(prev => prev.filter(image => image.id !== imageId));
      }
    } catch (err) {
      console.error('Error removing image:', err);
      setError('Erro ao remover imagem: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="image-list loading">
        <div className="loading-spinner"></div>
        <p>Carregando imagens...</p>
      </div>
    );
  }

  return (
    <div className="image-list">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <div className="list-header">
        <h2>Imagens ({images.length})</h2>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={loadImages}
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
      </div>

      <div className="image-grid">
        {images.map((image) => (
          <div key={image.id} className="image-card">
            <div className="card-header">
              <div className="image-info">
                <h3 className="image-name">{image.repository}:{image.tag}</h3>
                <span className="image-id">{image.id.substring(0, 12)}</span>
              </div>
              
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="menu-trigger">
                    <MoreHorizontalIcon size={16} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="dropdown-content">
                    <DropdownMenu.Item className="dropdown-item">
                      <PlayIcon size={14} />
                      Executar
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className="dropdown-item">
                      <DownloadIcon size={14} />
                      Fazer Pull
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="dropdown-separator" />
                    <DropdownMenu.Item 
                      className="dropdown-item danger"
                      onClick={() => handleRemoveImage(image.id)}
                    >
                      <TrashIcon size={14} />
                      Remover
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>

            <div className="card-body">
              <div className="image-details">
                <div className="detail-row">
                  <span className="label">Tamanho:</span>
                  <span className="value">{formatImageSize(image.size)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Criado:</span>
                  <span className="value">{image.created}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <div className="empty-state">
          <p>Nenhuma imagem encontrada</p>
        </div>
      )}
    </div>
  );
};

export default ImageList;
