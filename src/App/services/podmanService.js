class PodmanService {
  constructor() {
    this.isElectron = this.checkElectronEnvironment();
    this.exec = null;
    
    if (this.isElectron) {
      try {
        this.exec = window.require('child_process').exec;
      } catch (error) {
        console.warn('Failed to load child_process:', error);
        this.isElectron = false;
      }
    }

    // Debug log
    console.log('PodmanService initialized:', {
      isElectron: this.isElectron,
      hasExec: !!this.exec,
      windowRequire: typeof window !== 'undefined' && !!window.require,
      windowProcess: typeof window !== 'undefined' && !!window.process
    });
  }

  // Verifica se estamos no ambiente Electron
  checkElectronEnvironment() {
    try {
      return (
        typeof window !== 'undefined' &&
        window.require &&
        typeof window.require === 'function' &&
        window.process &&
        window.process.type
      );
    } catch (error) {
      console.log('Not in Electron environment:', error.message);
      return false;
    }
  }

  // Executa comando Podman
  async executeCommand(command) {
    if (!this.isElectron || !this.exec) {
      throw new Error('Podman commands only available in Electron environment');
    }

    return new Promise((resolve, reject) => {
      this.exec(`podman ${command}`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Error executing podman ${command}: ${error.message}`));
          return;
        }
        
        if (stderr) {
          console.warn('Podman stderr:', stderr);
        }

        try {
          // Tenta fazer parse JSON se possível
          const result = stdout.trim();
          if (result.startsWith('[') || result.startsWith('{')) {
            resolve(JSON.parse(result));
          } else {
            resolve(result);
          }
        } catch (parseError) {
          resolve(stdout.trim());
        }
      });
    });
  }

  // Lista containers
  async listContainers() {
    try {
      const result = await this.executeCommand('ps -a --format json');
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error listing containers:', error);
      return [];
    }
  }

  // Lista imagens
  async listImages() {
    try {
      const result = await this.executeCommand('images --format json');
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error listing images:', error);
      return [];
    }
  }

  // Lista redes
  async listNetworks() {
    try {
      const result = await this.executeCommand('network ls --format json');
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error listing networks:', error);
      return [];
    }
  }

  // Lista volumes
  async listVolumes() {
    try {
      const result = await this.executeCommand('volume ls --format json');
      
      // Para cada volume, obter informações detalhadas para verificar uso
      if (Array.isArray(result) && result.length > 0) {
        try {
          const volumesWithUsage = await Promise.all(
            result.map(async (volume) => {
              try {
                const details = await this.getVolumeDetails(volume.Name);
                return {
                  ...volume,
                  inUse: details && details.UsedBy && details.UsedBy.length > 0,
                  usedBy: details && details.UsedBy ? details.UsedBy : []
                };
              } catch (error) {
                // Se falhar ao obter detalhes de um volume específico, retorne o volume sem info de uso
                console.warn(`Error getting details for volume ${volume.Name}:`, error);
                return {
                  ...volume,
                  inUse: false,
                  usedBy: []
                };
              }
            })
          );
          
          return volumesWithUsage;
        } catch (detailsError) {
          // Se falhar ao obter detalhes, apenas retorne a lista básica
          console.warn("Error getting volume details:", detailsError);
          return result.map(volume => ({
            ...volume,
            inUse: false,
            usedBy: []
          }));
        }
      }
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error listing volumes:', error);
      return [];
    }
  }

  // Obtém detalhes de um volume específico
  async getVolumeDetails(volumeName) {
    try {
      const result = await this.executeCommand(`volume inspect ${volumeName}`);
      return Array.isArray(result) && result.length > 0 ? result[0] : null;
    } catch (error) {
      // Se não conseguir obter detalhes, não é um erro crítico
      console.warn(`Error getting details for volume ${volumeName}:`, error);
      return null;
    }
  }

  // Inicia um container
  async startContainer(containerId) {
    try {
      await this.executeCommand(`start ${containerId}`);
      return true;
    } catch (error) {
      console.error('Error starting container:', error);
      throw error;
    }
  }

  // Para um container
  async stopContainer(containerId) {
    try {
      await this.executeCommand(`stop ${containerId}`);
      return true;
    } catch (error) {
      console.error('Error stopping container:', error);
      throw error;
    }
  }

  // Reinicia um container
  async restartContainer(containerId) {
    try {
      await this.executeCommand(`restart ${containerId}`);
      return true;
    } catch (error) {
      console.error('Error restarting container:', error);
      throw error;
    }
  }

  // Remove um container
  async removeContainer(containerId, force = false) {
    try {
      const forceFlag = force ? '-f' : '';
      await this.executeCommand(`rm ${forceFlag} ${containerId}`);
      return true;
    } catch (error) {
      console.error('Error removing container:', error);
      throw error;
    }
  }

  // Cria um novo container
  async createContainer(options) {
    try {
      const {
        name,
        image,
        ports = [],
        environment = [],
        volumes = [],
        restartPolicy = 'no',
        detach = true
      } = options;

      let command = 'run';
      
      if (detach) command += ' -d';
      if (name) command += ` --name ${name}`;
      if (restartPolicy !== 'no') command += ` --restart ${restartPolicy}`;

      // Adiciona portas
      ports.forEach(port => {
        command += ` -p ${port}`;
      });

      // Adiciona variáveis de ambiente
      environment.forEach(env => {
        command += ` -e ${env}`;
      });

      // Adiciona volumes
      volumes.forEach(volume => {
        command += ` -v ${volume}`;
      });

      command += ` ${image}`;

      const result = await this.executeCommand(command);
      return result;
    } catch (error) {
      console.error('Error creating container:', error);
      throw error;
    }
  }

  // Remove uma imagem
  async removeImage(imageId, force = false) {
    try {
      const forceFlag = force ? '-f' : '';
      await this.executeCommand(`rmi ${forceFlag} ${imageId}`);
      return true;
    } catch (error) {
      console.error('Error removing image:', error);
      throw error;
    }
  }

  // Faz pull de uma imagem
  async pullImage(imageName) {
    try {
      await this.executeCommand(`pull ${imageName}`);
      return true;
    } catch (error) {
      console.error('Error pulling image:', error);
      throw error;
    }
  }

  // Remove uma rede
  async removeNetwork(networkId) {
    try {
      await this.executeCommand(`network rm ${networkId}`);
      return true;
    } catch (error) {
      console.error('Error removing network:', error);
      throw error;
    }
  }

  // Cria uma rede
  async createNetwork(name, driver = 'bridge') {
    try {
      await this.executeCommand(`network create --driver ${driver} ${name}`);
      return true;
    } catch (error) {
      console.error('Error creating network:', error);
      throw error;
    }
  }

  // Remove um volume
  async removeVolume(volumeName, force = false) {
    try {
      // Verificar primeiro se o volume está em uso (se não estiver forçando)
      if (!force) {
        try {
          const volumeDetails = await this.getVolumeDetails(volumeName);
          if (volumeDetails && volumeDetails.UsedBy && volumeDetails.UsedBy.length > 0) {
            throw new Error(`Volume "${volumeName}" está em uso por ${volumeDetails.UsedBy.length} container(s). Use force=true para remover mesmo assim.`);
          }
        } catch (inspectError) {
          // Se falhar ao verificar uso, seguimos com a remoção
          // O comando de remoção vai falhar de qualquer forma se o volume estiver em uso
          console.warn(`Could not verify if volume ${volumeName} is in use:`, inspectError);
        }
      }
      
      // Adiciona flag de força se necessário
      const forceFlag = force ? ' -f' : '';
      await this.executeCommand(`volume rm${forceFlag} ${volumeName}`);
      return true;
    } catch (error) {
      console.error('Error removing volume:', error);
      throw error;
    }
  }

  // Remove todos os volumes não utilizados
  async pruneVolumes(force = false) {
    try {
      const forceFlag = force ? ' -f' : '';
      const result = await this.executeCommand(`volume prune ${forceFlag}`);
      return result;
    } catch (error) {
      console.error('Error pruning volumes:', error);
      throw error;
    }
  }

  // Cria um volume
  async createVolume(name) {
    try {
      await this.executeCommand(`volume create ${name}`);
      return true;
    } catch (error) {
      console.error('Error creating volume:', error);
      throw error;
    }
  }

  // Obtém informações do sistema
  async getSystemInfo() {
    try {
      const result = await this.executeCommand('info --format json');
      return result;
    } catch (error) {
      console.error('Error getting system info:', error);
      return null;
    }
  }

  // Verifica se o Podman está disponível
  async isAvailable() {
    // Se não estamos no Electron, retorna falso imediatamente
    if (!this.isElectron || !this.exec) {
      return false;
    }

    try {
      await this.executeCommand('version');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Verifica se a máquina Podman já existe
  async checkMachineExists() {
    if (!this.isElectron || !this.exec) {
      throw new Error('Podman commands only available in Electron environment');
    }

    return new Promise((resolve, reject) => {
      this.exec('podman machine list --format json', (error, stdout, stderr) => {
        if (error) {
          console.error('Error checking Podman machines:', error);
          resolve(false);
          return;
        }
        
        try {
          const machines = JSON.parse(stdout.trim());
          resolve(machines && machines.length > 0);
        } catch (parseError) {
          console.error('Error parsing Podman machine list:', parseError);
          resolve(false);
        }
      });
    });
  }

  // Inicializa a máquina Podman
  async initPodmanMachine() {
    if (!this.isElectron || !this.exec) {
      throw new Error('Podman commands only available in Electron environment');
    }

    return new Promise((resolve, reject) => {
      console.log('Initializing Podman machine...');
      this.exec('podman machine init', (error, stdout, stderr) => {
        if (error) {
          console.error('Error initializing Podman machine:', error);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.warn('Podman init stderr:', stderr);
        }

        console.log('Podman machine initialized:', stdout);
        resolve(true);
      });
    });
  }

  // Inicia o serviço do Podman
  async startPodmanService() {
    if (!this.isElectron || !this.exec) {
      throw new Error('Podman commands only available in Electron environment');
    }

    try {
      // Primeiro, verifica se a máquina já existe
      const machineExists = await this.checkMachineExists();
      
      // Se não existir, inicializa primeiro
      if (!machineExists) {
        console.log('No Podman machine found, initializing first...');
        await this.initPodmanMachine();
      }

      // Agora inicia a máquina
      return new Promise((resolve, reject) => {
        console.log('Starting Podman machine...');
        this.exec('podman machine start', (error, stdout, stderr) => {
          if (error) {
            console.error('Error starting Podman service:', error);
            reject(error);
            return;
          }
          
          if (stderr) {
            console.warn('Podman stderr:', stderr);
          }

          console.log('Podman service started:', stdout);
          resolve(true);
        });
      });
    } catch (error) {
      console.error('Failed to start Podman service:', error);
      throw error;
    }
  }

  // Para o serviço do Podman
  async stopPodmanService() {
    if (!this.isElectron || !this.exec) {
      throw new Error('Podman commands only available in Electron environment');
    }

    return new Promise((resolve, reject) => {
      console.log('Stopping Podman machine...');
      this.exec('podman machine stop', (error, stdout, stderr) => {
        if (error) {
          console.error('Error stopping Podman service:', error);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.warn('Podman stderr:', stderr);
        }

        console.log('Podman service stopped:', stdout);
        resolve(true);
      });
    });
  }

  // Obtém estatísticas de uso de recursos dos containers
  async getContainerStats(containerIds = [], noStream = true) {
    try {
      let command = 'stats --format json';
      
      if (noStream) {
        command += ' --no-stream';
      }
      
      if (containerIds.length > 0) {
        command += ' ' + containerIds.join(' ');
      }
      
      const result = await this.executeCommand(command);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error getting container stats:', error);
      return [];
    }
  }

  // Obtém informações detalhadas sobre um container específico
  async getContainerDetails(containerId) {
    try {
      const result = await this.executeCommand(`inspect ${containerId}`);
      return Array.isArray(result) && result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Error getting details for container ${containerId}:`, error);
      return null;
    }
  }

  // Obtém informações detalhadas de recursos do sistema
  async getSystemResources() {
    try {
      const result = await this.executeCommand('info --format json');
      return result;
    } catch (error) {
      console.error('Error getting system resources:', error);
      return null;
    }
  }

  // Obtém logs de um container
  async getContainerLogs(containerId, tail = 100) {
    try {
      const result = await this.executeCommand(`logs --tail ${tail} ${containerId}`);
      return result;
    } catch (error) {
      console.error(`Error getting logs for container ${containerId}:`, error);
      return '';
    }
  }
}

export default new PodmanService();
