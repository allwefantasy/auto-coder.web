/**
 * Bridge script injected into the proxied iframe for communication
 * and interaction with the parent Auto-Coder window.
 */
(function() {
    console.log("Bridge script injected and running.");

    // --- Configuration ---
    const MARKER_CLASS = '__ac_bridge_marker__'; // Unique class for markers
    const EDITABLE_ATTRS = ['id', 'class', 'style']; // Attributes editable in the modal

    // --- State ---
    let isEditingEnabled = false; // Track contentEditable state

    // --- Helper Functions ---

    /**
     * Send a status message or data back to the parent window.
     * @param {string} type - Message type (e.g., 'status', 'domContent', 'commandResponse', 'error', 'elementSelected').
     * @param {any} payload - Data associated with the message.
     */
    function postMessageToParent(type, payload) {
        // Use '*' for targetOrigin during development/proxying if origin is complex,
        // but ideally restrict to the parent window's origin in production if possible.
        window.parent.postMessage({ type, ...payload }, '*');
        console.log(`Bridge: Sent message - Type: ${type}, Payload:`, payload);
    }

    /**
     * Finds an element in the document using an XPath expression.
     * @param {string} xpath - The XPath expression.
     * @returns {Node | null} - The found node or null.
     */
    function getElementByXpath(xpath) {
        try {
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            return result.singleNodeValue;
        } catch (error) {
            console.error("Bridge: Error evaluating XPath:", xpath, error);
            postMessageToParent('error', { message: `Error finding element with XPath: ${xpath}` });
            return null;
        }
    }

    /**
     * Generates an XPath expression for a given element.
     * Prefers using ID if available.
     * @param {Element} element - The element to generate XPath for.
     * @returns {string | null} - The XPath string or null if generation fails.
     */
    function getElementXPath(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }
        // Use ID if unique and present
        if (element.id) {
            // Verify ID uniqueness (optional but good practice)
            // const elementsWithSameId = document.querySelectorAll(`#${CSS.escape(element.id)}`);
            // if (elementsWithSameId.length === 1) {
                return `//*[@id="${element.id}"]`;
            // }
        }

        // Fallback to path generation
        const parts = [];
        let currentElement = element;
        while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE && currentElement !== document.body && currentElement !== document.documentElement) {
            let index = 0;
            let sibling = currentElement.previousSibling;
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === currentElement.nodeName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }

            const tagName = currentElement.nodeName.toLowerCase();
            const pathIndex = (index > 0) ? `[${index + 1}]` : ''; // XPath is 1-based index
            parts.unshift(`${tagName}${pathIndex}`);

            // Stop if we hit an element with an ID (potentially makes path shorter/more stable)
            // if (currentElement.id && document.querySelectorAll(`#${CSS.escape(currentElement.id)}`).length === 1) {
            //     parts.unshift(`//*[@id="${currentElement.id}"]`);
            //     return parts[0]; // Return just the ID part if found mid-path
            // }

            currentElement = currentElement.parentNode;
        }

        // If we reached body/html, construct the path from root
        if (parts.length > 0) {
            // Prepend /html/body if necessary (adjust based on where loop stopped)
             let prefix = '';
             if (document.documentElement === currentElement) prefix = '/html';
             if (document.body === currentElement) prefix = '/html/body'; // More common case
             return prefix ? `${prefix}/${parts.join('/')}` : `/${parts.join('/')}`; // Relative path if loop exited early? Or assume absolute.
        }

        return null; // Should not happen for elements within body
    }

    /**
     * Gets specified attributes from an element.
     * @param {Element} element - The element.
     * @returns {Object} - An object containing attribute key-value pairs.
     */
    function getElementAttributes(element) {
        const attrs = {};
        if (element && element.attributes) {
            EDITABLE_ATTRS.forEach(attrName => {
                 if (element.hasAttribute(attrName)) {
                    attrs[attrName] = element.getAttribute(attrName);
                 } else {
                     // Optionally include even if not present, with null/undefined value?
                     // attrs[attrName] = null;
                 }
            });
            // Include other attributes if needed, e.g., for display
            // for (let attr of element.attributes) {
            //     if (!attrs.hasOwnProperty(attr.name)) {
            //         attrs[attr.name] = attr.value;
            //     }
            // }
        }
        return attrs;
    }

    /**
     * Removes all existing hierarchy markers from the DOM.
     */
    function clearExistingMarkers() {
        document.querySelectorAll(`.${MARKER_CLASS}`).forEach(el => el.remove());
        console.log("Bridge: Cleared existing markers.");
    }

    /**
     * Shows visual markers for the hierarchy of a target element (only DIVs for now).
     * Adds click listeners to markers to select elements.
     * @param {Element} target - The initially clicked element.
     */
    function showElementHierarchy(target) {
        clearExistingMarkers();
        console.log("Bridge: Showing element hierarchy for", target);

        let current = target;
        const hierarchyElements = [];
        // Traverse up to find relevant parent elements (e.g., DIVs)
        while (current && current !== document.body && current !== document.documentElement) {
            // --- Logic to decide which elements get markers ---
            // Option 1: Only DIVs (as per original request)
            if (current.tagName.toLowerCase() === 'div') {
                 hierarchyElements.push(current);
            }
            // Option 2: Any element with significant size?
            // const rect = current.getBoundingClientRect();
            // if (rect.width > 10 && rect.height > 10) { // Example threshold
            //    hierarchyElements.push(current);
            // }
            // Option 3: All direct parents? (Could be too many)
            // hierarchyElements.push(current);
            // ----------------------------------------------------
            current = current.parentElement;
        }

        if (hierarchyElements.length === 0 && target && target !== document.body && target !== document.documentElement) {
             // If no specific parents found (e.g., clicked on text node's parent span),
             // maybe mark the target element itself if it's a block or significant?
             // For now, let's ensure the direct target gets a marker if it's missed by the loop.
             // Check if target itself should be marked based on criteria
             if (target.tagName && target.getBoundingClientRect().width > 5 && target.getBoundingClientRect().height > 5) { // Basic check
                 hierarchyElements.push(target);
             }
        }


        hierarchyElements.forEach((elem, index) => {
            const rect = elem.getBoundingClientRect();
            // Skip elements that are not visible or too small
            if (rect.width <= 1 || rect.height <= 1 || rect.top < 0 || rect.left < 0) {
                return;
            }

            const marker = document.createElement('div');
            marker.className = MARKER_CLASS; // Assign class for easy removal
            Object.assign(marker.style, {
                position: 'fixed', // Use fixed to overlay correctly regardless of scroll
                border: '1px dashed red',
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                pointerEvents: 'auto', // Make the marker clickable
                zIndex: 9999 + index, // Stagger z-index slightly if needed
                boxSizing: 'border-box', // Ensure border is included in size
                cursor: 'pointer'
            });

            marker.addEventListener('click', (evt) => {
                evt.stopPropagation(); // Prevent click from bubbling to document listener
                evt.preventDefault(); // Prevent any default action

                const elementPath = getElementXPath(elem);
                const elementAttrs = getElementAttributes(elem);

                if (elementPath) {
                    console.log(`Bridge: Marker clicked for element:`, elem);
                    console.log(`Bridge: Sending elementSelected - Path: ${elementPath}, Attrs:`, elementAttrs);
                    postMessageToParent('elementSelected', { path: elementPath, attributes: elementAttrs });
                } else {
                    console.warn("Bridge: Could not generate XPath for selected element:", elem);
                    postMessageToParent('error', { message: 'Could not determine path for the selected element.' });
                }
                clearExistingMarkers(); // Clear markers after selection
            });

            document.body.appendChild(marker);
        });
        console.log(`Bridge: Added ${document.querySelectorAll(`.${MARKER_CLASS}`).length} markers.`);
    }


    // --- Command Handlers ---

    /**
     * Enables or disables contentEditable mode for the body.
     * @param {boolean} enable - True to enable, false to disable.
     */
    function toggleContentEditable(enable) {
        try {
            document.body.contentEditable = enable.toString();
            document.body.style.cursor = enable ? 'text' : 'default';
            // Disabling designMode might be necessary if it was ever enabled
            if (!enable) {
                 if (document.designMode === "on") {
                     document.designMode = "off";
                 }
            } else {
                 // Optionally enable designMode? Might be too broad.
                 // document.designMode = "on";
            }
            isEditingEnabled = enable;
            console.log(`Bridge: Content editable ${enable ? 'enabled' : 'disabled'}.`);
            postMessageToParent('commandResponse', { command: enable ? 'enableEditing' : 'disableEditing', success: true });
        } catch (error) {
            console.error("Bridge: Error toggling contentEditable:", error);
            postMessageToParent('commandResponse', { command: enable ? 'enableEditing' : 'disableEditing', success: false, error: error.message });
        }
    }

    /**
     * Retrieves the current full HTML of the document.
     */
    function getDOMContent() {
        try {
            // Ensure edits are captured (browser might handle this automatically with contentEditable)
            // For safety, could potentially trigger a blur event or similar if needed
            const htmlContent = document.documentElement.outerHTML;
            console.log("Bridge: Retrieved DOM content.");
            postMessageToParent('domContent', { content: htmlContent });
            postMessageToParent('commandResponse', { command: 'getDOM', success: true }); // Also send command success
        } catch (error) {
            console.error("Bridge: Error getting DOM content:", error);
            postMessageToParent('commandResponse', { command: 'getDOM', success: false, error: error.message });
        }
    }

    /**
     * Applies specified attributes to an element found by XPath.
     * @param {string} xpath - XPath of the target element.
     * @param {Object} attributes - Key-value pairs of attributes to set.
     */
    function applyAttributesToElement(xpath, attributes) {
        const command = 'applyAttributes';
        try {
            const element = getElementByXpath(xpath);
            if (!element) {
                throw new Error(`Element not found for XPath: ${xpath}`);
            }

            console.log(`Bridge: Applying attributes to element [${xpath}]:`, attributes);
            Object.entries(attributes).forEach(([attr, value]) => {
                 // Only apply attributes that are part of the editable set for safety?
                 // Or allow any attribute passed? Let's allow any for now.
                // if (!EDITABLE_ATTRS.includes(attr)) return;

                const cleanValue = String(value).trim(); // Ensure string and trim
                if (cleanValue !== null && cleanValue !== undefined && cleanValue !== '') {
                    element.setAttribute(attr, cleanValue);
                    console.log(` - Set ${attr}="${cleanValue}"`);
                } else {
                    // Remove attribute if value is empty, null, or undefined
                    if (element.hasAttribute(attr)) {
                        element.removeAttribute(attr);
                        console.log(` - Removed ${attr}`);
                    }
                }
            });

            postMessageToParent('commandResponse', { command, success: true });
        } catch (error) {
            console.error(`Bridge: Error applying attributes for XPath ${xpath}:`, error);
            postMessageToParent('commandResponse', { command, success: false, error: error.message });
        }
    }


    // --- Event Listeners ---

    // Listen for messages from the parent window (commands)
    window.addEventListener('message', (event) => {
        // Basic security check: verify origin if possible and necessary
        // if (event.origin !== 'expected_parent_origin') return;

        const data = event.data;
        console.log("Bridge: Received message from parent:", data);

        if (data && data.type === 'command') {
            switch (data.command) {
                case 'enableEditing':
                    toggleContentEditable(true);
                    break;
                case 'disableEditing':
                    toggleContentEditable(false);
                    break;
                case 'getDOM':
                    getDOMContent();
                    break;
                case 'applyAttributes':
                    if (data.payload && data.payload.xpath && data.payload.attributes) {
                        applyAttributesToElement(data.payload.xpath, data.payload.attributes);
                    } else {
                         console.error("Bridge: Invalid payload for applyAttributes command:", data.payload);
                         postMessageToParent('commandResponse', { command: 'applyAttributes', success: false, error: 'Invalid payload' });
                    }
                    break;
                default:
                    console.warn("Bridge: Unknown command received:", data.command);
                    postMessageToParent('commandResponse', { command: data.command, success: false, error: 'Unknown command' });
            }
        }
    });

    // Listener for double-clicks to initiate element hierarchy selection
    window.addEventListener('dblclick', function(e) {
        // Only trigger if editing is NOT enabled to avoid conflict
        if (!isEditingEnabled) {
            e.preventDefault();
            e.stopPropagation(); // Stop event from bubbling further
            console.log("Bridge: Double-click detected, target:", e.target);
            showElementHierarchy(e.target);
        } else {
             console.log("Bridge: Double-click ignored while contentEditable is active.");
        }
    }, true); // Use capture phase to catch event early

    // Listener for single clicks on the document to clear markers
    document.addEventListener('click', function(e) {
        // Check if the click was outside any marker
        if (!e.target.closest(`.${MARKER_CLASS}`)) {
             // Check if any markers exist before clearing
             if (document.querySelector(`.${MARKER_CLASS}`)) {
                 clearExistingMarkers();
             }
        }
        // Do not stop propagation here, allow normal clicks to proceed
    }, true); // Use capture phase


    // --- Initialization ---

    // Signal to parent that the bridge script is ready
    // Use a slight delay to ensure the rest of the page is likely settled
    window.addEventListener('load', () => {
         setTimeout(() => {
             postMessageToParent('status', { status: 'ready' });
             console.log("Bridge: Sent ready status to parent.");
         }, 100); // Adjust delay if needed
    });

    // Fallback ready signal in case load event is missed or fires too early
    if (document.readyState === 'complete') {
        setTimeout(() => {
             postMessageToParent('status', { status: 'ready' });
             console.log("Bridge: Sent ready status to parent (document already complete).");
         }, 100);
    }


})();