import React, { useState, useEffect } from 'react';
import './App.css';
import DockerManager from './components/DockerManager';
import CompactContainerList from './components/CompactContainerList';


function App() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [isCompact, setIsCompact] = useState(false);

  // Verificar o tamanho da janela ao iniciar e ao redimensionar
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Verificar o tamanho inicial

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Determinar se deve mostrar a versão compacta
  useEffect(() => {
    setIsCompact(windowWidth <= 400 || windowHeight <= 600);
  }, [windowWidth, windowHeight]);

  return (
    <div className="App">
      {isCompact ? (
        <CompactContainerList />
      ) : (
        <DockerManager />
      )}
    </div>
  );
}

export default App;
