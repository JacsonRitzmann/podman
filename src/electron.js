const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { menubar } = require('menubar');
let mainWindow;
let mb;

function createWindow() {
  // Criar a janela do navegador
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, 'icon/icon.png'),
    show: false, // Inicialmente não mostrar a janela
  });

  // Carregar a aplicação
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000' // Desenvolvimento
      : `file://${path.join(__dirname, '../build/index.html')}` // Produção
  );

  // Abrir DevTools em desenvolvimento
  if (isDev) {
    console.log('Iniciando em modo de desenvolvimento');
    //mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });
}

function createMenubar() {
  // Define o ícone da barra de menu
  // Para menubar, o tamanho recomendado é 20x20 e 40x40 (retina) com sufixo @2x
  const iconPath = path.join(__dirname, 'public/icon/icon.png');
  
  console.log('Criando menubar com ícone:', iconPath);
  
  // Cria o menubar
  mb = menubar({
    index: isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../build/index.html')}`,
    icon: iconPath,
    browserWindow: {
      width: 400,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      }
    },
    tooltip: 'Podman Manager',
    preloadWindow: true,
    showOnAllWorkspaces: true,
    showDockIcon: false,
    showOnRightClick: true
  });

  mb.on('ready', () => {
    console.log('Menubar app is ready');
    
    // Criar o menu de contexto para o ícone da barra de menu
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Abrir Podman', 
        click: () => {
          mb.showWindow();
        } 
      },
      { type: 'separator' },
      { 
        label: 'Abrir em Janela Separada', 
        click: () => {
          if (!mainWindow) {
            createWindow();
          } else {
            mainWindow.show();
          }
        } 
      },
      { type: 'separator' },
      { 
        label: 'Sair', 
        click: () => {
          app.quit();
        } 
      }
    ]);
    
    mb.tray.setContextMenu(contextMenu);
    console.log('Menu de contexto configurado com sucesso');
    
    // Garante que o ícone do dock no macOS não seja exibido quando estiver no menubar
    if (process.platform === 'darwin') {
      try {
        app.dock.hide();
        console.log('Dock oculto no macOS');
      } catch (err) {
        console.error('Erro ao ocultar dock:', err.message);
      }
    }
  });
  
  mb.on('after-create-window', () => {
    console.log('Janela do menubar criada');
  });
  
  mb.on('after-show', () => {
    console.log('Menubar mostrado');
  });
  
  mb.on('after-hide', () => {
    console.log('Menubar ocultado');
  });
  
  mb.on('after-close', () => {
    console.log('Menubar fechado');
  });
}

// Este método será chamado quando o Electron terminar de inicializar
app.whenReady().then(() => {
  console.log('App is ready, initializing menubar');
  
  try {
    // Verifica se o arquivo do ícone existe
    const fs = require('fs');
    const iconPath = path.join(__dirname, 'icon/icon.png');
    
    if (!fs.existsSync(iconPath)) {
      console.error(`Ícone não encontrado: ${iconPath}`);
      throw new Error('Ícone não encontrado');
    }
    
    createMenubar();
    console.log('Menubar criado com sucesso');
  } catch (err) {
    console.error('Erro ao criar menubar:', err);
    console.log('Criando janela convencional como fallback');
    createWindow();
  }
});

// Sair quando todas as janelas estiverem fechadas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // No macOS, deixamos o app continuar rodando com o ícone na barra de menu
    // mesmo se todas as janelas estiverem fechadas
    if (!mb) {
      app.quit();
    }
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && !mb) {
    createWindow();
  }
});

// Adiciona suporte para quando o usuário clica no dock icon no macOS
app.on('activate-with-no-open-windows', () => {
  if (mb) {
    mb.showWindow();
  } else if (!mainWindow) {
    createWindow();
  }
});
