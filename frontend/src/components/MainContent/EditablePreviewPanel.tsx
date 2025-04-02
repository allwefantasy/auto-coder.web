import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import Split from 'react-split';
import { LeftOutlined, RightOutlined, EditOutlined, SaveOutlined, EyeOutlined, LoadingOutlined } from '@ant-design/icons';
import { Button, Input, message, Spin, Tooltip } from 'antd';
import './PreviewPanel.css'; // Reuse existing styles if applicable, or create new ones
import { getLanguageByFileName } from '../../utils/fileUtils';
import axios from 'axios';

interface EditablePreviewPanelProps {
  files: { path: string; content: string }[]; // Files to show in the code viewer (left panel)
  initialUrl?: string; // Optional initial URL for the preview
}

const EditablePreviewPanel: React.FC<EditablePreviewPanelProps> = ({ files, initialUrl = '' }) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(initialUrl || 'http://127.0.0.1:3000'); // Default or saved URL
  const [iframeSrc, setIframeSrc] = useState(''); // The actual URL for the iframe (proxy URL)
  const [isUrlFocused, setIsUrlFocused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state for iframe/saving
  const [isIframeReady, setIsIframeReady] = useState(false); // Track if bridge script is ready
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Store edited HTML temporarily if needed, or just save directly
  // const [editedHtml, setEditedHtml] = useState<string | null>(null);

  const [debouncedPreviewUrl, setDebouncedPreviewUrl] = useState('');

  // --- Fetch and Save Preview URL ---
   useEffect(() => {
    const fetchPreviewUrl = async () => {
      if(initialUrl) return; // Skip fetch if URL provided by prop
      try {
        const response = await axios.get('/api/config/ui/preview-url');
        if (response.data && response.data.preview_url) {
          setPreviewUrl(response.data.preview_url);
        } else {
           setPreviewUrl('http://127.0.0.1:3000'); // Default if not found
        }
      } catch (error) {
        console.error('Failed to fetch preview URL:', error);
        setPreviewUrl('http://127.0.0.1:3000'); // Default on error
      }
    };
    fetchPreviewUrl();
  }, [initialUrl]); // Re-fetch if initialUrl changes (though unlikely needed)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPreviewUrl(previewUrl);
    }, 1000);
    return () => clearTimeout(timer);
  }, [previewUrl]);

  useEffect(() => {
    if (debouncedPreviewUrl && debouncedPreviewUrl !== 'http://127.0.0.1:3000' && !initialUrl) { // Only save if not using initialUrl prop
      const savePreviewUrl = async () => {
        try {
          await axios.put('/api/config/ui/preview-url', {
            preview_url: debouncedPreviewUrl
          });
        } catch (error) {
          console.error('Failed to save preview URL:', error);
        }
      };
      savePreviewUrl();
    }
  }, [debouncedPreviewUrl, initialUrl]);
  // --- End Fetch and Save Preview URL ---


  // --- Iframe Communication Logic ---

  // Function to send commands to the iframe
  const sendCommandToIframe = useCallback((command: string, payload?: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow && isIframeReady) {
      // IMPORTANT: Specify the target origin for security
      // This should be the origin the iframe *thinks* it has, which is our proxy origin.
      const targetOrigin = new URL(iframeSrc, window.location.origin).origin;
      iframeRef.current.contentWindow.postMessage({ type: 'command', command, payload }, targetOrigin);
       console.log(`EditablePreviewPanel: Sent command '${command}' to iframe. Target Origin: ${targetOrigin}`);
    } else {
      console.warn(`EditablePreviewPanel: Cannot send command '${command}'. Iframe ref or contentWindow missing, or iframe not ready.`);
       message.error(`Cannot send command '${command}'. Iframe not ready or inaccessible.`);
    }
  }, [iframeSrc, isIframeReady]); // Depend on iframeSrc to get the correct targetOrigin

  // Effect to setup message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
       // IMPORTANT: Security check - verify the origin of the message
       // It should come from the same origin as our proxy serves the iframe content
       if (!iframeSrc) return; // Don't process if iframe source isn't set
       const expectedOrigin = new URL(iframeSrc, window.location.origin).origin;

       if (event.origin !== expectedOrigin) {
         console.warn(`EditablePreviewPanel: Ignored message from unexpected origin: ${event.origin}. Expected: ${expectedOrigin}`);
         return;
       }

      const data = event.data;
      console.log("EditablePreviewPanel: Received message from iframe:", data);

      if (data && typeof data === 'object') {
        switch (data.type) {
          case 'status':
            if (data.status === 'ready') {
              setIsIframeReady(true);
              setIsLoading(false); // Assume ready means loaded
              message.success('Preview loaded and ready.');
              // If editing was toggled before ready, apply it now
              if(isEditing){
                  sendCommandToIframe('enableEditing');
              }
            }
            break;
          case 'domContent':
            // Handle the received DOM content - likely save it
            saveDOM(data.content);
            break;
          case 'commandResponse':
             console.log(`EditablePreviewPanel: Received command response for '${data.command}':`, data);
             if (!data.success) {
                message.error(`Iframe command '${data.command}' failed: ${data.error || 'Unknown error'}`);
                // Revert state if command failed (e.g., if enableEditing failed)
                if(data.command === 'enableEditing') setIsEditing(false);
                if(data.command === 'disableEditing') setIsEditing(true);
             }
             // Optionally show success messages for commands
             // else { message.success(`Iframe command '${data.command}' successful.`); }
            break;
          case 'error':
            console.error("EditablePreviewPanel: Error message from iframe:", data.message);
            message.error(`Error from preview: ${data.message}`);
            break;
          // Handle other message types like 'domChanged' if using MutationObserver
          default:
            console.log("EditablePreviewPanel: Unknown message type received from iframe:", data.type);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [sendCommandToIframe, iframeSrc, isEditing]); // Add dependencies

  // --- End Iframe Communication Logic ---


  // --- URL and Iframe Loading ---

  // Update iframe source when previewUrl changes
  useEffect(() => {
    if (previewUrl) {
      // Construct the proxy URL
      const encodedUrl = encodeURIComponent(previewUrl);
      const proxyUrl = `/api/editable-preview/proxy?url=${encodedUrl}`;
      console.log("Setting iframe src to:", proxyUrl);
      setIsLoading(true); // Set loading state when URL changes
      setIsIframeReady(false); // Reset ready state
      setIframeSrc(proxyUrl); // Update the src for the iframe
       // Reset editing state when URL changes
       if(isEditing) {
           setIsEditing(false);
           // No need to send disable command here, new iframe won't be editable anyway
       }
    } else {
      setIframeSrc(''); // Clear src if no URL
    }
  }, [previewUrl]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreviewUrl(e.target.value);
  };

  const reloadIframe = () => {
    setIsLoading(true);
    setIsIframeReady(false);
    // Reset editing state on reload
    if(isEditing) {
        setIsEditing(false);
    }
    // Force reload by changing the src slightly or using iframeRef.current.src = ...
    if (iframeRef.current) {
      // Option 1: Set src again (might not always work due to caching)
      // iframeRef.current.src = iframeSrc;
      // Option 2: Reload method
       iframeRef.current.contentWindow?.location.reload();
       // Option 3: Change src slightly (append timestamp/random string) - more reliable cache busting
       // const bustUrl = `${iframeSrc}&_cb=${Date.now()}`;
       // setIframeSrc(bustUrl); // This will trigger the useEffect for iframeSrc
    }
    // Setting isLoading will show the spinner until the 'ready' message is received
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      reloadIframe();
    }
  };

  // --- Editing Actions ---

  const toggleEditing = () => {
    if (!isIframeReady) {
      message.warn('Preview is not ready yet.');
      return;
    }
    const newState = !isEditing;
    sendCommandToIframe(newState ? 'enableEditing' : 'disableEditing');
    setIsEditing(newState); // Update state optimistically, revert if command fails (handled in message listener)
  };

  const requestDOM = () => {
    if (!isIframeReady) {
      message.warn('Preview is not ready yet.');
      return;
    }
    if (!isEditing) {
       message.info('Enable editing before saving changes.');
       // Or should we allow saving even if not editing? Decide based on UX.
       // If allowing, just send 'getDOM' directly.
       // sendCommandToIframe('getDOM');
       // setIsLoading(true); // Show loading while waiting for DOM
       return;
    }
     setIsLoading(true); // Show loading spinner while waiting for DOM
     message.
=======
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import Split from 'react-split';
import { LeftOutlined, RightOutlined, EditOutlined, SaveOutlined, EyeOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Input, message, Spin, Tooltip } from 'antd';
import './PreviewPanel.css'; // Reuse existing styles if applicable, or create new ones
import { getLanguageByFileName } from '../../utils/fileUtils';
import axios from 'axios';

interface EditablePreviewPanelProps {
  files: { path: string; content: string }[]; // Files to show in the code viewer (left panel)
  initialUrl?: string; // Optional initial URL for the preview
}

const EditablePreviewPanel: React.FC<EditablePreviewPanelProps> = ({ files, initialUrl = '' }) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(initialUrl || ''); // Start empty if no initial, let fetch fill it
  const [iframeSrc, setIframeSrc] = useState(''); // The actual URL for the iframe (proxy URL)
  const [isUrlFocused, setIsUrlFocused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state for iframe/saving
  const [isIframeReady, setIsIframeReady] = useState(false); // Track if bridge script is ready
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [debouncedPreviewUrl, setDebouncedPreviewUrl] = useState('');

  // --- Fetch and Save Preview URL ---
   useEffect(() => {
    const fetchPreviewUrl = async () => {
      if(initialUrl) {
          setPreviewUrl(initialUrl); // Use prop value directly
          return;
      }
      // Fetch only if not provided by prop
      try {
        setIsLoading(true); // Show loading while fetching URL
        const response = await axios.get('/api/config/ui/preview-url');
        if (response.data && response.data.preview_url) {
          setPreviewUrl(response.data.preview_url);
        } else {
           setPreviewUrl('http://127.0.0.1:3000'); // Default if not found
        }
      } catch (error) {
        console.error('Failed to fetch preview URL:', error);
        setPreviewUrl('http://127.0.0.1:3000'); // Default on error
      } finally {
          // setIsLoading(false); // Loading will be stopped by iframe load later
      }
    };
    fetchPreviewUrl();
  }, [initialUrl]); // Re-run if initialUrl prop changes

  // Debounce URL saving
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only set debounced URL if it's different and not the initial prop value
      if (previewUrl !== debouncedPreviewUrl && previewUrl !== initialUrl) {
         setDebouncedPreviewUrl(previewUrl);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [previewUrl, initialUrl, debouncedPreviewUrl]);

  // Save debounced URL to backend
  useEffect(() => {
    // Only save if debounced URL exists, is not the default, and not the initial prop
    if (debouncedPreviewUrl && debouncedPreviewUrl !== 'http://127.0.0.1:3000' && !initialUrl) {
      const savePreviewUrl = async () => {
        try {
          console.log("Saving preview URL:", debouncedPreviewUrl);
          await axios.put('/api/config/ui/preview-url', {
            preview_url: debouncedPreviewUrl
          });
        } catch (error) {
          console.error('Failed to save preview URL:', error);
          // Optional: message.error('Could not save preview URL preference.');
        }
      };
      savePreviewUrl();
    }
  }, [debouncedPreviewUrl, initialUrl]);
  // --- End Fetch and Save Preview URL ---


  // --- Iframe Communication Logic ---

  // Function to send commands to the iframe
  const sendCommandToIframe = useCallback((command: string, payload?: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
       if (!isIframeReady && command !== 'getDOM' && command !== 'disableEditing') {
           // Allow getDOM/disableEditing even if not fully "ready" but contentWindow exists
           // Might be useful in edge cases, but generally check readiness
           console.warn(`EditablePreviewPanel: Iframe might not be fully ready for command '${command}'.`);
           // message.warn(`Preview might not be fully ready for command '${command}'.`);
           // return; // Uncomment this line to strictly enforce readiness
       }

      // IMPORTANT: Specify the target origin for security
      // This should be the origin the iframe *thinks* it has, which is our proxy origin.
      let targetOrigin = '*'; // Default to wildcard ONLY if absolutely necessary and risks understood
      try {
          // Calculate origin based on the *current* iframeSrc
          targetOrigin = new URL(iframeSrc, window.location.origin).origin;
      } catch(e) {
          console.error("Could not determine iframe target origin from src:", iframeSrc, e);
          message.error("Error determining iframe origin. Cannot send command securely.");
          return; // Prevent sending with '*' if calculation fails
      }

      iframeRef.current.contentWindow.postMessage({ type: 'command', command, payload }, targetOrigin);
      console.log(`EditablePreviewPanel: Sent command '${command}' to iframe. Target Origin: ${targetOrigin}`);
    } else {
      console.warn(`EditablePreviewPanel: Cannot send command '${command}'. Iframe ref or contentWindow missing.`);
      message.error(`Cannot send command '${command}'. Preview window not available.`);
    }
  }, [iframeSrc, isIframeReady]); // Depend on iframeSrc to get the correct targetOrigin and readiness

  // Function to handle saving the DOM content
  const saveDOM = async (htmlContent: string) => {
    if (!htmlContent) {
      message.error('Received empty content from preview. Cannot save.');
      setIsLoading(false);
      return;
    }
    console.log("EditablePreviewPanel: Received DOM content, attempting to save...");
    // setIsLoading(true); // Already set by requestDOM

    try {
      const response = await axios.post('/api/editable-preview/save', {
        url: previewUrl, // The original URL that was previewed
        html_content: htmlContent,
      });
      message.success(`Preview saved successfully! (ID: ${response.data.save_id})`);
      console.log("Save response:", response.data);
      // Optionally, disable editing after save?
      // toggleEditing(); // This would call disableEditing command
    } catch (error: any) {
      console.error('Failed to save edited preview:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error saving preview.';
      message.error(`Failed to save preview: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };


  // Effect to setup message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
       // IMPORTANT: Security check - verify the origin of the message
       // It should come from the same origin as our proxy serves the iframe content
       if (!iframeSrc) return; // Don't process if iframe source isn't set

       let expectedOrigin = '';
       try {
           expectedOrigin = new URL(iframeSrc, window.location.origin).origin;
       } catch (e) {
            console.error("Could not determine expected origin from iframe src:", iframeSrc, e);
            return; // Cannot verify origin, ignore message
       }


       if (event.origin !== expectedOrigin) {
         // Allow messages from 'null' origin ONLY if the iframe src is 'about:blank' initially
         if (!(event.origin === 'null' && iframeRef.current?.getAttribute('src') === 'about:blank')) {
             console.warn(`EditablePreviewPanel: Ignored message from unexpected origin: ${event.origin}. Expected: ${expectedOrigin}`);
             return;
         }
       }

      const data = event.data;
      console.log("EditablePreviewPanel: Received message from iframe:", data);

      if (data && typeof data === 'object') {
        switch (data.type) {
          case 'status':
            if (data.status === 'ready') {
              setIsIframeReady(true);
              setIsLoading(false); // Assume ready means loaded
              console.log('EditablePreviewPanel: Iframe reported ready.');
             // message.success('Preview loaded and ready.'); // Maybe too noisy
              // If editing was toggled before ready, apply it now
              if(isEditing){
                  console.log("EditablePreviewPanel: Iframe ready, applying pending edit state.");
                  sendCommandToIframe('enableEditing');
              }
            }
            break;
          case 'domContent':
            // Handle the received DOM content - likely save it
            saveDOM(data.content);
            break;
          case 'commandResponse':
             console.log(`EditablePreviewPanel: Received command response for '${data.command}':`, data);
             if (!data.success) {
                message.error(`Preview command '${data.command}' failed: ${data.error || 'Unknown error'}`);
                // Revert state if command failed (e.g., if enableEditing failed)
                if(data.command === 'enableEditing') setIsEditing(false);
                if(data.command === 'disableEditing') setIsEditing(true);
                setIsLoading(false); // Stop loading if save command failed here
             }
             // Optionally show success messages for commands
             // else { message.success(`Preview command '${data.command}' successful.`); }
            break;
          case 'error':
            console.error("EditablePreviewPanel: Error message from iframe:", data.message);
            message.error(`Error from preview: ${data.message}`);
            setIsLoading(false); // Stop loading on error
            break;
          // Handle other message types like 'domChanged' if using MutationObserver
          default:
            console.log("EditablePreviewPanel: Unknown message type received from iframe:", data.type);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('message', handleMessage);
    };
    // Added saveDOM to dependency array if it relies on state/props, but it seems self-contained
  }, [sendCommandToIframe, iframeSrc, isEditing, previewUrl]); // Added previewUrl dependency for saveDOM

  // --- End Iframe Communication Logic ---


  // --- URL and Iframe Loading ---

  // Update iframe source when previewUrl changes and is valid
  useEffect(() => {
    // Basic validation
    if (previewUrl && previewUrl.match(/^https?:\/\//)) {
      // Construct the proxy URL
      const encodedUrl = encodeURIComponent(previewUrl);
      const proxyUrl = `/api/editable-preview/proxy?url=${encodedUrl}`;

      // Only update if the proxy URL is different to prevent unnecessary reloads
      if (proxyUrl !== iframeSrc) {
          console.log("EditablePreviewPanel: Setting iframe src to:", proxyUrl);
          setIsLoading(true); // Set loading state when URL changes
          setIsIframeReady(false); // Reset ready state
          setIframeSrc(proxyUrl); // Update the src for the iframe
           // Reset editing state when URL changes
           if(isEditing) {
               setIsEditing(false);
               // No need to send disable command here, new iframe won't be editable anyway
           }
      }
    } else if (!previewUrl && iframeSrc !== 'about:blank') {
      // If URL is cleared, load blank page
      console.log("EditablePreviewPanel: Clearing iframe src.");
      setIsLoading(false);
      setIsIframeReady(false);
      setIframeSrc('about:blank');
      if(isEditing) setIsEditing(false);
    }
    // Intentionally not depending on iframeSrc here to avoid loop
  }, [previewUrl, isEditing]); // Added isEditing dependency

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreviewUrl(e.target.value);
  };

  const reloadIframe = () => {
     if (!iframeSrc || iframeSrc === 'about:blank') {
         message.info("Enter a valid URL to load the preview.");
         return;
     }
    console.log("EditablePreviewPanel: Reloading iframe...");
    setIsLoading(true);
    setIsIframeReady(false);
    // Reset editing state on reload
    if(isEditing) {
        setIsEditing(false);
    }
    // Force reload using the iframe's contentWindow
    if (iframeRef.current && iframeRef.current.contentWindow) {
       try {
            iframeRef.current.contentWindow.location.reload();
       } catch (e) {
           console.error("Error trying to reload iframe:", e);
           // Fallback: Reset src with cache buster if reload fails (e.g., cross-origin issues before load)
           const bustUrl = `${iframeSrc.split('&_cb=')[0]}&_cb=${Date.now()}`;
           setIframeSrc(bustUrl);
       }
    } else {
        console.warn("EditablePreviewPanel: iframe ref or contentWindow not available for reload.");
        // Fallback: try resetting src anyway
        const currentSrc = iframeSrc;
        setIframeSrc('about:blank'); // Briefly set to blank
        setTimeout(() => setIframeSrc(currentSrc), 50); // Then set back
    }
    // Setting isLoading will show the spinner until the 'ready' message is received
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Trigger reload or update based on current URL vs input value?
      // For now, just reload the current iframeSrc derived from previewUrl state
      reloadIframe();
    }
  };

  // --- Editing Actions ---

  const toggleEditing = () => {
    if (!isIframeReady) {
      message.warn('Preview is not ready yet. Cannot toggle editing.');
      return;
    }
    const newState = !isEditing;
    // Send command first
    sendCommandToIframe(newState ? 'enableEditing' : 'disableEditing');
    // Update state optimistically - message listener will correct if command fails
    setIsEditing(newState);
    message.info(newState ? 'Editing enabled' : 'Editing disabled');
  };

  const requestDOM = () => {
    if (!isIframeReady) {
      message.warn('Preview is not ready yet. Cannot save.');
      return;
    }
    // Allow saving even if not actively editing? UX Decision.
    // Let's require editing mode to be ON to save, avoids accidental saves of pristine state.
    if (!isEditing) {
       message.info('Enable editing mode first before saving changes.');
       return;
    }

    console.log("EditablePreviewPanel: Requesting DOM content from iframe...");
    setIsLoading(true); // Show loading spinner while waiting for DOM
    message.loading({ content: 'Getting content from preview...', key: 'getDOM' }); // Show antd loading message
    sendCommandToIframe('getDOM');

    // Add a timeout in case the iframe doesn't respond
    setTimeout(() => {
        if (isLoading) { // Check if still loading after timeout
             message.destroy('getDOM');
             message.error('Timeout waiting for content from preview.');
             setIsLoading(false);
        }
    }, 10000); // 10 second timeout
  };

  // --- Render Logic ---
  const currentFile = files && files.length > activeFileIndex ? files[activeFileIndex] : null;

  return (
    <div className="flex flex-col" style={{ height: '650px' }}>
      <div className="flex-1 overflow-hidden">
        <Split
          className="split-container"
          sizes={(isCollapsed && [0, 100]) || [50, 50]} // Collapse left panel fully
          minSize={(isCollapsed && 0) || 200}
          expandToMin={false}
          gutterSize={8}
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
          style={{ display: 'flex', flexDirection: 'row', height: '100%' }}
        >
          {/* Left Panel - Code Preview */}
           <div className={`flex flex-col relative ${isCollapsed ? 'hidden' : ''}`}>
            {(files.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No code changes to display
              </div>
            )) || (
              <>
                <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto">
                  {files.map((file, index) => (
                    <button
                      key={file.path}
                      className={`px-4 py-2 text-sm whitespace-nowrap ${
                        (index === activeFileIndex && 'bg-gray-700 text-white') || 'text-gray-300 hover:bg-gray-600'
                      }`}
                      onClick={() => setActiveFileIndex(index)}
                      title={file.path}
                    >
                      {file.path.split('/').pop()}
                    </button>
                  ))}
                </div>
                <div className="flex-1 h-full">
                  {currentFile ? (
                    <Editor
                      height="100%" // Ensure editor takes full height
                      language={getLanguageByFileName(currentFile.path)}
                      theme="vs-dark"
                      value={currentFile.content}
                      options={{
                        readOnly: true,
                        minimap: { enabled: true },
                        fontSize: 14,
                        lineNumbers: 'on',
                        folding: true,
                        automaticLayout: true, // Important for resizing
                      }}
                    />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-400">
                        Select a file to view its content
                     </div>
                  )}
                </div>
              </>
            )}
          </div>


          {/* Right Panel - Editable Web Preview */}
          <div className="flex flex-col border-l border-gray-700 relative">
             {/* Collapse/Expand Toggle Button */}
             <Tooltip title={isCollapsed ? "Show Code" : "Hide Code"}>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 z-20
                            bg-gray-700 rounded-l-md p-1 hover:bg-gray-600 transition-colors"
                  style={{ marginLeft: '-1px' }} // Adjust position slightly over the gutter
                 >
                  {(isCollapsed && <RightOutlined />) || <LeftOutlined />}
                </button>
             </Tooltip>

            {/* URL Input and Controls Bar */}
            <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center space-x-2">
              <div className={`flex-grow flex items-center px-2 py-1 bg-gray-900 rounded-lg border ${(isUrlFocused && 'border-blue-500') || 'border-gray-700'}`}>
                 {/* Loading indicator inside URL bar */}
                 {isLoading && <Spin size="small" className="px-1 text-gray-400" />}
                 {!isLoading && <EyeOutlined className="px-1 text-gray-400" />} {/* Placeholder icon */}

                <input
                  type="url"
                  value={previewUrl}
                  onChange={handleUrlChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsUrlFocused(true)}
                  onBlur={() => setIsUrlFocused(false)}
                  className="flex-1 px-2 py-1 bg-transparent text-white text-sm focus:outline-none"
                  placeholder="Enter URL to preview (e.g., http://localhost:3000)"
                  disabled={isLoading} // Disable input while loading
                />
                <Tooltip title="Reload Preview">
                    <button
                      onClick={reloadIframe}
                      className="px-2 text-gray-400 hover:text-white disabled:text-gray-600"
                      disabled={isLoading || !iframeSrc || iframeSrc === 'about:blank'}
                     >
                       <ReloadOutlined />
                    </button>
                </Tooltip>
              </div>
               {/* Edit and Save Buttons */}
               <Tooltip title={isEditing ? "Disable Editing" : "Enable Editing"}>
                  <Button
                    icon={<EditOutlined />}
                    onClick={toggleEditing}
                    type={isEditing ? "primary" : "default"}
                    disabled={!isIframeReady || isLoading} // Disable if not ready or loading
                    ghost={!isEditing} // Make it ghost when not active
                  />
               </Tooltip>
               <Tooltip title="Save Edited HTML">
                  <Button
                    icon={<SaveOutlined />}
                    onClick={requestDOM}
                    disabled={!isEditing || !isIframeReady || isLoading} // Must be editing and ready
                  />
               </Tooltip>
            </div>

             {/* Iframe Container */}
            <div className="flex-1 relative bg-gray-900">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900 bg-opacity-75">
                  <Spin size="large" tip="Loading Preview..." />
                </div>
              )}
              {(iframeSrc && iframeSrc !== 'about:blank') ? (
                <iframe
                  ref={iframeRef}
                  src={iframeSrc}
                  title="Editable Preview"
                  width="100%"
                  height="100%"
                  className={`border-0 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}
                  // IMPORTANT Sandbox attributes:
                  // allow-scripts: Needed for the bridge script and the page's own JS.
                  // allow-same-origin: Crucial! Allows the script inside the iframe (served from our proxy) to communicate back via postMessage, treating it as same-origin relative to the proxy endpoint. It does NOT make it same-origin with the parent window. Also needed for scripts within the iframe to potentially access their own origin's resources if they make requests.
                  // allow-forms: If the page has forms.
                  // allow-popups, allow-modals: If the page uses these features.
                  // allow-top-navigation: Risky, allows iframe to potentially navigate the top window. Consider removing if not needed. Use 'allow-top-navigation-by-user-activation' for slightly more safety. Or 'allow-popups-to-escape-sandbox'.
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  onError={(e) => {
                      console.error("Iframe loading error event:", e);
                      message.error('Failed to load the preview content. Check the URL and browser console.');
                      setIsLoading(false); // Stop loading on error
                      setIsIframeReady(false);
                  }}
                  onLoad={() => {
                      console.log("EditablePreviewPanel: Iframe onLoad event fired.");
                      // The 'ready' message from the bridge script is a more reliable indicator
                      // but onLoad can signal the basic frame structure is loaded.
                      // Setting isLoading(false) here might be too early if the bridge isn't ready.
                      // Rely on the 'ready' message from the bridge script instead.
                      // setIsLoading(false);
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  { previewUrl ? 'Loading preview...' : 'Enter a URL above to start the preview' }
                </div>
              )}
            </div>
          </div>
        </Split>
      </div>
    </div>
  );
};

export default EditablePreviewPanel;