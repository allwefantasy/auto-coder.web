/**
 * Bridge script injected into the proxied iframe to enable communication
 * with the parent window (EditablePreviewPanel).
 */
(function() {
  console.log("Bridge script loaded into iframe.");

  // --- Configuration ---
  // IMPORTANT: Set this to the origin of your React app for security
  const ALLOWED_PARENT_ORIGIN = window.location.origin; // Or a more specific origin like 'http://localhost:3000' in dev
  // --- End Configuration ---

  let isEditingEnabled = false;
  let originalBodyOverflow = ''; // Store original overflow style

  // Function to safely send messages to the parent
  function sendMessageToParent(message) {
    if (window.parent && window.parent !== window) {
      // Always specify the target origin for security
      window.parent.postMessage(message, ALLOWED_PARENT_ORIGIN);
      console.log("Bridge: Sent message to parent:", message);
    } else {
      console.warn("Bridge: Cannot send message, no parent window detected or same window.");
    }
  }

  // Function to enable/disable editing
  function setEditingMode(enable) {
    try {
      if (enable) {
        // Option 1: designMode (simpler, makes whole document editable)
        // document.designMode = 'on';

        // Option 2: contentEditable on body (more common)
        if (document.body) {
          document.body.contentEditable = 'true';
          // Make it visually clear editing is on
          document.body.style.outline = '2px solid blue';
          // Prevent accidental navigation while editing
          originalBodyOverflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden'; // Or handle links differently
          isEditingEnabled = true;
          console.log("Bridge: Editing enabled.");
        } else {
           console.error("Bridge: Cannot enable editing, document.body not found.");
           return false; // Indicate failure
        }

      } else {
        // document.designMode = 'off';
        if (document.body) {
          document.body.contentEditable = 'false';
          document.body.style.outline = 'none';
          document.body.style.overflow = originalBodyOverflow; // Restore original overflow
          isEditingEnabled = false;
          console.log("Bridge: Editing disabled.");
        } else {
           console.error("Bridge: Cannot disable editing, document.body not found.");
           return false; // Indicate failure
        }
      }
       return true; // Indicate success
    } catch (error) {
      console.error("Bridge: Error setting editing mode:", error);
      sendMessageToParent({ type: 'error', message: 'Failed to set editing mode: ' + error.message });
      return false; // Indicate failure
    }
  }

  // Function to get the current full HTML of the document
  function getCurrentDOM() {
    try {
      // Ensure scripts (like this bridge) are not included in the saved DOM if desired
      // Temporarily remove the bridge script before getting HTML? (More complex)
      // Or the parent can strip it after receiving.

      // Get the full HTML structure
      const html = document.documentElement.outerHTML;
      return html;
    } catch (error) {
      console.error("Bridge: Error getting current DOM:", error);
      sendMessageToParent({ type: 'error', message: 'Failed to get DOM: ' + error.message });
      return null;
    }
  }

  // Listen for messages from the parent window
  window.addEventListener('message', (event) => {
    // --- Security Check ---
    // IMPORTANT: Always verify the origin of the message
    if (event.origin !== ALLOWED_PARENT_ORIGIN) {
      console.warn(`Bridge: Ignored message from unexpected origin: ${event.origin}. Expected: ${ALLOWED_PARENT_ORIGIN}`);
      return;
    }
    // --- End Security Check ---

    const message = event.data;
    console.log("Bridge: Received message from parent:", message);

    if (message && typeof message === 'object') {
      switch (message.type) {
        case 'command':
          handleCommand(message.command, message.payload);
          break;
        // Handle other message types if needed
        default:
          console.log("Bridge: Unknown message type received:", message.type);
      }
    }
  });

  // Handle commands from the parent
  function handleCommand(command, payload) {
    console.log(`Bridge: Handling command: ${command}`, payload);
    switch (command) {
      case 'enableEditing':
        const enabled = setEditingMode(true);
        sendMessageToParent({ type: 'commandResponse', command: command, success: enabled });
        break;
      case 'disableEditing':
        const disabled = setEditingMode(false);
         sendMessageToParent({ type: 'commandResponse', command: command, success: disabled });
        break;
      case 'getDOM':
        const dom = getCurrentDOM();
        if (dom !== null) {
          sendMessageToParent({ type: 'domContent', content: dom });
        } else {
           sendMessageToParent({ type: 'commandResponse', command: command, success: false, error: 'Failed to retrieve DOM' });
        }
        break;
      // Add more commands as needed (e.g., highlight element, apply style)
      default:
        console.warn(`Bridge: Unknown command received: ${command}`);
        sendMessageToParent({ type: 'error', message: `Unknown command: ${command}` });
    }
  }

  // Optional: Inform the parent when the iframe content (including this script) is ready
  // Using DOMContentLoaded or window.onload
  window.addEventListener('DOMContentLoaded', () => {
     console.log("Bridge: DOMContentLoaded fired.");
     sendMessageToParent({ type: 'status', status: 'ready' });
  });

  // Fallback if DOMContentLoaded is too early for some complex pages
  window.addEventListener('load', () => {
     console.log("Bridge: window.load fired.");
     // Avoid sending 'ready' twice if DOMContentLoaded already fired
     // This might need a flag or smarter logic if both events are important
     // sendMessageToParent({ type: 'status', status: 'fullyLoaded' });
  });


  // --- Optional: MutationObserver to notify parent of changes ---
  /*
  const observer = new MutationObserver((mutationsList) => {
    // Debounce or throttle this to avoid flooding the parent
    console.log("Bridge: DOM mutations detected.");
    // Example: Send a simple notification
    // sendMessageToParent({ type: 'domChanged' });

    // More advanced: Send specific changes (can be complex and verbose)
    // const changes = mutationsList.map(m => ({ type: m.type, target: m.target.nodeName }));
    // sendMessageToParent({ type: 'domChanges', changes: changes });
  });

  // Start observing the body for changes in subtree and attributes
  // Make sure body exists before observing
  const startObserving = () => {
      if(document.body){
           observer.observe(document.body, {
                attributes: true,
                childList: true,
                subtree: true,
                characterData: true // Observe text changes
            });
            console.log("Bridge: MutationObserver started.");
      } else {
          // If body is not ready yet, try again shortly
          setTimeout(startObserving, 100);
      }
  }
  // Start observing after the initial load
  window.addEventListener('load', startObserving);
  */
  // --- End Optional MutationObserver ---

})();