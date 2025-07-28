import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import * as Tabs from '@radix-ui/react-tabs';
import { XIcon, ChevronDownIcon, CheckIcon, PlusIcon, TrashIcon } from 'lucide-react';
import podmanService from '../services/podmanService';
import './CreateContainerDialog.css';

const CreateContainerDialog = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    ports: [{ host: '', container: '' }],
    volumes: [{ host: '', container: '' }],
    environment: [{ key: '', value: '' }],
    network: 'bridge',
    restartPolicy: 'no',
    command: ''
  });

  const [availableImages, setAvailableImages] = useState([
    'nginx:latest',
    'postgres:13',
    'redis:alpine',
    'node:16-alpine',
    'ubuntu:latest',
    'python:3.9',
    'mysql:8.0'
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [podmanAvailable, setPodmanAvailable] = useState(false);

  // Carrega imagens disponíveis do Podman
  useEffect(() => {
    const loadAvailableImages = async () => {
      try {
        const isAvailable = await podmanService.isAvailable();
        setPodmanAvailable(isAvailable);
        
        if (isAvailable) {
          const imageData = await podmanService.listImages();
          const imageNames = imageData.map(image => 
            `${image.Repository || image.repository}:${image.Tag || image.tag}`
          );
          if (imageNames.length > 0) {
            setAvailableImages(imageNames);
          }
        }
      } catch (err) {
        console.error('Error loading available images:', err);
      }
    };

    if (open) {
      loadAvailableImages();
    }
  }, [open]);
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, index, key, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => 
        i === index ? { ...item, [key]: value } : item
      )
    }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], field === 'environment' ? { key: '', value: '' } : { host: '', container: '' }]
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepara os dados para o Podman
      const ports = formData.ports
        .filter(p => p.host && p.container)
        .map(p => `${p.host}:${p.container}`);

      const environment = formData.environment
        .filter(env => env.key && env.value)
        .map(env => `${env.key}=${env.value}`);

      const volumes = formData.volumes
        .filter(v => v.host && v.container)
        .map(v => `${v.host}:${v.container}`);

      const containerOptions = {
        name: formData.name,
        image: formData.image,
        ports,
        environment,
        volumes,
        restartPolicy: formData.restartPolicy,
        detach: true
      };

      if (podmanAvailable) {
        await podmanService.createContainer(containerOptions);
        console.log('Container created successfully');
      } else {
        console.log('Simulating container creation:', containerOptions);
      }

      // Reset form
      setFormData({
        name: '',
        image: '',
        ports: [{ host: '', container: '' }],
        volumes: [{ host: '', container: '' }],
        environment: [{ key: '', value: '' }],
        network: 'bridge',
        restartPolicy: 'no',
        command: ''
      });

      onOpenChange(false);
    } catch (err) {
      console.error('Error creating container:', err);
      setError('Erro ao criar container: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">
              Criar Novo Container
            </Dialog.Title>
            <Dialog.Close className="dialog-close">
              <XIcon size={20} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="container-form">
            <Tabs.Root defaultValue="basic" className="form-tabs">
              <Tabs.List className="tabs-list">
                <Tabs.Trigger value="basic" className="tab-trigger">
                  Básico
                </Tabs.Trigger>
                <Tabs.Trigger value="network" className="tab-trigger">
                  Rede & Portas
                </Tabs.Trigger>
                <Tabs.Trigger value="volumes" className="tab-trigger">
                  Volumes
                </Tabs.Trigger>
                <Tabs.Trigger value="environment" className="tab-trigger">
                  Ambiente
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="basic" className="tab-content">
                <div className="form-group">
                  <label className="form-label">Nome do Container</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ex: meu-container"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Imagem Docker</label>
                  <Select.Root
                    value={formData.image}
                    onValueChange={(value) => handleInputChange('image', value)}
                    required
                  >
                    <Select.Trigger className="select-trigger">
                      <Select.Value placeholder="Selecione uma imagem" />
                      <Select.Icon>
                        <ChevronDownIcon size={16} />
                      </Select.Icon>
                    </Select.Trigger>
                    
                    <Select.Portal>
                      <Select.Content className="select-content">
                        <Select.Viewport>
                          {availableImages.map(image => (
                            <Select.Item key={image} value={image} className="select-item">
                              <Select.ItemText>{image}</Select.ItemText>
                              <Select.ItemIndicator>
                                <CheckIcon size={16} />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                <div className="form-group">
                  <label className="form-label">Política de Reinício</label>
                  <Select.Root
                    value={formData.restartPolicy}
                    onValueChange={(value) => handleInputChange('restartPolicy', value)}
                  >
                    <Select.Trigger className="select-trigger">
                      <Select.Value />
                      <Select.Icon>
                        <ChevronDownIcon size={16} />
                      </Select.Icon>
                    </Select.Trigger>
                    
                    <Select.Portal>
                      <Select.Content className="select-content">
                        <Select.Viewport>
                          <Select.Item value="no" className="select-item">
                            <Select.ItemText>Não reiniciar</Select.ItemText>
                            <Select.ItemIndicator>
                              <CheckIcon size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                          <Select.Item value="always" className="select-item">
                            <Select.ItemText>Sempre</Select.ItemText>
                            <Select.ItemIndicator>
                              <CheckIcon size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                          <Select.Item value="unless-stopped" className="select-item">
                            <Select.ItemText>A menos que parado</Select.ItemText>
                            <Select.ItemIndicator>
                              <CheckIcon size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                          <Select.Item value="on-failure" className="select-item">
                            <Select.ItemText>Em caso de falha</Select.ItemText>
                            <Select.ItemIndicator>
                              <CheckIcon size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                <div className="form-group">
                  <label className="form-label">Comando (opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ex: /bin/bash -c 'npm start'"
                    value={formData.command}
                    onChange={(e) => handleInputChange('command', e.target.value)}
                  />
                </div>
              </Tabs.Content>

              <Tabs.Content value="network" className="tab-content">
                <div className="form-group">
                  <label className="form-label">Rede</label>
                  <Select.Root
                    value={formData.network}
                    onValueChange={(value) => handleInputChange('network', value)}
                  >
                    <Select.Trigger className="select-trigger">
                      <Select.Value />
                      <Select.Icon>
                        <ChevronDownIcon size={16} />
                      </Select.Icon>
                    </Select.Trigger>
                    
                    <Select.Portal>
                      <Select.Content className="select-content">
                        <Select.Viewport>
                          <Select.Item value="bridge" className="select-item">
                            <Select.ItemText>bridge</Select.ItemText>
                            <Select.ItemIndicator>
                              <CheckIcon size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                          <Select.Item value="host" className="select-item">
                            <Select.ItemText>host</Select.ItemText>
                            <Select.ItemIndicator>
                              <CheckIcon size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                          <Select.Item value="app-network" className="select-item">
                            <Select.ItemText>app-network</Select.ItemText>
                            <Select.ItemIndicator>
                              <CheckIcon size={16} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                <div className="form-group">
                  <div className="group-header">
                    <label className="form-label">Mapeamento de Portas</label>
                    <button
                      type="button"
                      className="add-btn"
                      onClick={() => addArrayItem('ports')}
                    >
                      <PlusIcon size={14} />
                      Adicionar
                    </button>
                  </div>
                  {formData.ports.map((port, index) => (
                    <div key={index} className="array-item">
                      <input
                        type="text"
                        className="form-input small"
                        placeholder="Porta host"
                        value={port.host}
                        onChange={(e) => handleArrayChange('ports', index, 'host', e.target.value)}
                      />
                      <span className="separator">:</span>
                      <input
                        type="text"
                        className="form-input small"
                        placeholder="Porta container"
                        value={port.container}
                        onChange={(e) => handleArrayChange('ports', index, 'container', e.target.value)}
                      />
                      {formData.ports.length > 1 && (
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeArrayItem('ports', index)}
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Tabs.Content>

              <Tabs.Content value="volumes" className="tab-content">
                <div className="form-group">
                  <div className="group-header">
                    <label className="form-label">Volumes</label>
                    <button
                      type="button"
                      className="add-btn"
                      onClick={() => addArrayItem('volumes')}
                    >
                      <PlusIcon size={14} />
                      Adicionar
                    </button>
                  </div>
                  {formData.volumes.map((volume, index) => (
                    <div key={index} className="array-item">
                      <input
                        type="text"
                        className="form-input small"
                        placeholder="Caminho host"
                        value={volume.host}
                        onChange={(e) => handleArrayChange('volumes', index, 'host', e.target.value)}
                      />
                      <span className="separator">:</span>
                      <input
                        type="text"
                        className="form-input small"
                        placeholder="Caminho container"
                        value={volume.container}
                        onChange={(e) => handleArrayChange('volumes', index, 'container', e.target.value)}
                      />
                      {formData.volumes.length > 1 && (
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeArrayItem('volumes', index)}
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Tabs.Content>

              <Tabs.Content value="environment" className="tab-content">
                <div className="form-group">
                  <div className="group-header">
                    <label className="form-label">Variáveis de Ambiente</label>
                    <button
                      type="button"
                      className="add-btn"
                      onClick={() => addArrayItem('environment')}
                    >
                      <PlusIcon size={14} />
                      Adicionar
                    </button>
                  </div>
                  {formData.environment.map((env, index) => (
                    <div key={index} className="array-item">
                      <input
                        type="text"
                        className="form-input small"
                        placeholder="Chave"
                        value={env.key}
                        onChange={(e) => handleArrayChange('environment', index, 'key', e.target.value)}
                      />
                      <span className="separator">=</span>
                      <input
                        type="text"
                        className="form-input small"
                        placeholder="Valor"
                        value={env.value}
                        onChange={(e) => handleArrayChange('environment', index, 'value', e.target.value)}
                      />
                      {formData.environment.length > 1 && (
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeArrayItem('environment', index)}
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Tabs.Content>
            </Tabs.Root>

            <div className="dialog-footer">
              <Dialog.Close className="btn secondary">
                Cancelar
              </Dialog.Close>
              <button type="submit" className="btn primary">
                Criar Container
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CreateContainerDialog;
