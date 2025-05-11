
import React, { useState, useEffect, useRef } from 'react';
import { EditorDidMount, monaco } from 'react-monaco-editor';
import EditorComponent from '@/components/Editor';
import { Button, Tooltip } from 'antd';
import { SendOutlined, StopOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { useHotkeys } from 'react-hotkeys-hook';
import { eventBus } from '@/lib/event';
import { getMessage } from '@/lib/i18n';
import { translations } from './PromptInput.lang';
import { Monaco } from '@monaco-editor/react';

interface PromptInputProps {
  initialValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onSendMessage: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  onEditorDidMount?: (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  panelId?: string; // For eventBus context if needed
  editorMaxHeight?: string | number; // Max height for the editor in non-fullscreen
  editorMinHeight?: string | number; // Min height for the editor
  showSendButton?: boolean;
  showStopButton?: boolean;
  showFullScreenButton?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const PromptInput: React.FC<PromptInputProps> = ({
  initialValue = '',
  value: controlledValue,
  onValueChange,
  onSendMessage,
  isLoading = false,
  placeholder,
  onEditorDidMount,
  isFullScreen = false,
  onToggleFullScreen,
  panelId,
  editorMaxHeight = '300px',
  editorMinHeight = '100px',
  showSendButton = true,
  showStopButton = true,
  showFullScreenButton = true,
  className = '',
  style = {},
}) => {
  const [internalValue, setInternalValue] = useState(initialValue);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const currentValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleEditorChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  const handleSend = () => {
    if (!currentValue.trim() || isLoading) return;
    onSendMessage(currentValue);
    if (controlledValue === undefined) { // Only clear if not controlled
        setInternalValue('');
    }
  };

  const handleStop = () => {
    if (panelId) {
        eventBus.emit(`${panelId}-stop-generate`, {});
    } else {
        eventBus.emit('stop-generate', {});
    }    
  };

  const handleEditorMount: EditorDidMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    if (onEditorDidMount) {
      onEditorDidMount(editor, monacoInstance);
    }

    // Basic hotkey for sending message (Enter to send, Shift+Enter for new line)
    editor.addCommand(monacoInstance.KeyCode.Enter, () => {
      if (!editor.getOption(monacoInstance.editor.EditorOption.quickSuggestions)) {
        handleSend();
      }
    }, '!suggestWidgetVisible');

    editor.addCommand(monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.Enter, () => {
        editor.trigger('keyboard', 'type', { text: '\n' });
    });
  };

  // Hotkey for sending message, using panelId for context if available
  const sendHotkey = panelId ? `enter+${panelId}` : 'enter';
  useHotkeys(sendHotkey, (e) => {
      e.preventDefault();
      // This global hotkey might conflict with editor's internal one if not managed.
      // For now, we rely on editor's internal command.
      // Consider if a more robust solution via EventBus is needed per hotkey_management.md
  }, { enableOnTags: ['TEXTAREA', 'INPUT'], preventDefault: true }, [panelId, handleSend]);


  useEffect(() => {
    if (editorRef.current && controlledValue !== undefined && controlledValue !== editorRef.current.getValue()) {
      editorRef.current.setValue(controlledValue);
    }
  }, [controlledValue]);

  return (
    <div className={`prompt-input-container ${className}`} style={style}>
      <div
        className="editor-wrapper"
        style={{
          height: isFullScreen ? '100%' : 'auto',
          maxHeight: isFullScreen ? 'none' : editorMaxHeight,
          minHeight: isFullScreen ? 'auto' : editorMinHeight,
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          padding: '5px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <EditorComponent
          value={currentValue}
          onChange={handleEditorChange}
          language="markdown"
          editorDidMount={handleEditorMount}
          options={{
            wordWrap: 'on',
            minimap: { enabled: false },
            lineNumbers: 'off',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 14,
            renderLineHighlight: 'none',
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            ...(placeholder && !currentValue ? {
                extraEditorClassName: 'placeholder-editor',
                // Quick hack for placeholder, ideally use content widget
                // This requires CSS to style .placeholder-editor::before
              } : {})
          }}
          height={isFullScreen ? 'calc(100% - 40px)' : '100%'} // Adjust height to leave space for buttons if needed
        />
         {placeholder && !currentValue && (
            <div 
                style={{ 
                    position: 'absolute', 
                    top: '10px', // Adjust as per editor padding
                    left: '10px', // Adjust as per editor padding
                    color: '#aaa', 
                    pointerEvents: 'none',
                    fontSize: '14px', // Match editor font size
                 }}
            >
                {getMessage(translations, 'placeholder')}
            </div>
        )}
      </div>
      <div className="prompt-input-actions" style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        {showFullScreenButton && onToggleFullScreen && (
          <Tooltip title={isFullScreen ? getMessage(translations, 'minimizeInput') : getMessage(translations, 'maximizeInput')}>
            <Button icon={isFullScreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={onToggleFullScreen} />
          </Tooltip>
        )}
        {showStopButton && isLoading && (
          <Button icon={<StopOutlined />} onClick={handleStop} danger>
            {getMessage(translations, 'stopGenerating')}
          </Button>
        )}
        {showSendButton && !isLoading && (
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend} disabled={!currentValue.trim()}>
            {getMessage(translations, 'send')}
          </Button>
        )}
      </div>
      <style jsx global>{`
        .placeholder-editor .monaco-editor .view-lines {
          opacity: 0.6; /* Or any other styling for placeholder */
        }
      `}</style>
    </div>
  );
};

export default PromptInput;

