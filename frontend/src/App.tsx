import React, { useState, useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Switch, Button } from 'antd';
import AutoModePage from './components/AutoMode';
import { ExpertModePage } from './components/ExpertMode';
import { getMessage, initLanguage } from './components/Sidebar/lang';
import FileSearch from './components/FileSearch';
import InitializationPage from './components/InitializationPage';
import './App.css';
import { TaskSplittingProvider } from './contexts/TaskSplittingContext';
import { FileMetadata } from './types/file_meta';
import HotkeyManager from './utils/HotkeyManager';


const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'todo' | 'code' | 'filegroup' | 'preview' | 'clipboard' | 'history' | 'settings'>('code');
  const [activeToolPanel, setActiveToolPanel] = useState<string>('terminal');
  const [clipboardContent, setClipboardContent] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [previewFiles, setPreviewFiles] = useState<{ path: string, content: string }[]>([]);
  const [requestId, setRequestId] = useState<string>('');
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>([]);
  const [isExpertMode, setIsExpertMode] = useState<boolean>(false);
  const [isModeToggleVisible, setIsModeToggleVisible] = useState(true);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isCheckingInitialization, setIsCheckingInitialization] = useState(true);

  const openFileInEditor = useCallback((path: string) => {
    setSelectedFiles([{ path, isSelected: true }]);
    setActivePanel('code');
  }, []);

  // Add global hotkey
  useHotkeys(
    ['meta+p', 'ctrl+p'],
    (event) => {
      event.preventDefault();
      setIsFileSearchOpen(true);
    },
    { 
      enableOnFormTags: true,
      preventDefault: true
    }
  );

  async function checkUiMode(){
   
    try {
         // Load saved mode preference
    const response = await  fetch('/api/config/ui/mode')
    const data = await response.json()
    setIsExpertMode(data.mode === 'expert');
    } catch (error) { console.error('Error loading mode preference:', error)
    }
       
  }

  useEffect(() => {
    
    // 初始化语言设置
    initLanguage().then(async () => {
      // 其他初始化逻辑
      fetch('/api/project-path')
        .then(response => response.json())
        .then(data => {
          const path = data.project_path;
          const name = path ? path.split('/').pop() : '';
          setProjectName(name);
        })
        .catch(error => console.error('Error fetching project path:', error));

        // setIsCheckingInitialization(true);
        Promise.allSettled([
            // Check initialization status
            checkInitializationStatus(),
            checkUiMode()
        ]).finally(() => {
          setIsCheckingInitialization(false);
        });

    });

    // 确保热键管理器在组件卸载时清理
    return () => {
      HotkeyManager.destroy();
    };
  }, []);

  // Check if project is initialized
  const checkInitializationStatus = async () => {
    try {
      const response = await fetch('/api/initialization-status');
      const data = await response.json();
      setIsInitialized(data.initialized);
    } catch (error) {
      console.error('Error checking initialization status:', error);
      setIsInitialized(false);
    } 
  };

  // Toggle between expert and auto modes
  const toggleMode = async () => {
    const newMode = !isExpertMode;
    setIsExpertMode(newMode);
    
    try {
      const response = await fetch('/api/config/ui/mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: newMode ? 'expert' : 'agent'
        })
      });
      if (!response.ok) {
        console.error('Failed to save mode preference');
      }
    } catch (error) {
      console.error('Error saving mode preference:', error);
    }
  };

  // Toggle the visibility of the mode switch panel
  const togglePanelVisibility = () => {
    setIsModeToggleVisible(!isModeToggleVisible);
  };
  
  // Handle initialization complete
  const handleInitializationComplete = () => {
    setIsInitialized(true);
  };

  // Render loading state while checking initialization
  if (isCheckingInitialization) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p>{getMessage('loadingProject') || 'Loading project...'}</p>
        </div>
      </div>
    );
  }

  // Render initialization page if not initialized
  if (!isInitialized) {
    return <InitializationPage onInitializationComplete={handleInitializationComplete} />;
  }

  return (
   
    <TaskSplittingProvider>
      <div className="h-screen flex flex-col bg-gray-900 relative">
      {/* Mode Toggle - Fixed Panel */}
      <div className="fixed top-0 right-0 z-10 flex items-center">
        <Button 
          type="text" 
          size="small" 
          onClick={togglePanelVisibility}
          className="bg-gray-700 text-gray-300 h-8 w-8 flex items-center justify-center rounded-bl-lg"
          icon={<span className="text-sm">{isModeToggleVisible ? '≫' : '≪'}</span>}
        />
        
        {isModeToggleVisible && (
          <div className="bg-gray-800 p-2 border-b border-l border-gray-700 flex items-center space-x-2 rounded-bl-lg shadow-md">
            <span className="text-gray-400 text-sm">{getMessage('autoMode')}</span>
            <Switch 
              checked={isExpertMode} 
              onChange={toggleMode} 
              size="small"
              className="bg-gray-600"
            />
            <span className="text-gray-400 text-sm">{getMessage('expertMode')}</span>
          </div>
        )}
      </div>

      {/* Auto Mode Interface */}
      {!isExpertMode && (
        <AutoModePage 
          projectName={projectName} 
          onSwitchToExpertMode={() => setIsExpertMode(true)} 
        />
      )}

      {/* Expert Mode Interface */}
      {isExpertMode && (
        <ExpertModePage
          projectName={projectName}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          clipboardContent={clipboardContent}
          setClipboardContent={setClipboardContent}
          previewFiles={previewFiles}
          setPreviewFiles={setPreviewFiles}
          requestId={requestId}
          setRequestId={setRequestId}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          onSwitchToAutoMode={() => setIsExpertMode(false)}
        />
      )}

      {/* File Search Component */}
      <FileSearch 
        isOpen={isFileSearchOpen}
        onClose={() => setIsFileSearchOpen(false)}
        onSelectFile={openFileInEditor}
      />
      </div>
    </TaskSplittingProvider>
  );
};

export default App;
