/**
 * Teste do PodmanService
 * 
 * Este arquivo demonstra como o podmanService funciona nos diferentes ambientes:
 * 
 * 1. Browser (React apenas):
 *    - isElectron: false
 *    - exec: null
 *    - isAvailable(): false (imediatamente)
 *    - Usa dados simulados
 * 
 * 2. Electron:
 *    - isElectron: true
 *    - exec: function (child_process.exec)
 *    - isAvailable(): testa comando 'podman version'
 *    - Usa dados reais do Podman se disponível
 * 
 * Para testar:
 * - Browser: Abra http://localhost:3000
 * - Electron: Execute 'npm run dev' ou 'npx electron .'
 */

import podmanService from './podmanService.js';

// Função de teste (não exportada, apenas para referência)
async function testPodmanService() {
  console.log('=== Teste do PodmanService ===');
  
  // Status do ambiente
  console.log('Environment check:', {
    isElectron: podmanService.isElectron,
    hasExecFunction: !!podmanService.exec
  });

  // Teste de disponibilidade
  const isAvailable = await podmanService.isAvailable();
  console.log('Podman available:', isAvailable);

  if (isAvailable) {
    // Testes com Podman real
    try {
      const containers = await podmanService.listContainers();
      console.log('Containers found:', containers.length);
      
      const images = await podmanService.listImages();
      console.log('Images found:', images.length);
    } catch (error) {
      console.error('Error testing Podman commands:', error);
    }
  } else {
    console.log('Running in simulation mode - using mock data');
  }
}

// Descomente a linha abaixo para executar o teste
// testPodmanService();

export default testPodmanService;
