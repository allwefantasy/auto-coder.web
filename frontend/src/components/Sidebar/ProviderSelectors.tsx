import React from 'react';
import RagSelector from './RagSelector';
import MCPsSelector from './MCPsSelector';
import CodeModelSelector from './CodeModelSelector'; // Import the new component

interface ProviderSelectorsProps {
    isWriteMode: boolean; // Keep this prop if needed for RagSelector visibility
}

const ProviderSelectors: React.FC<ProviderSelectorsProps> = ({ isWriteMode }) => {
  return (
    <div className="w-full space-y-2"> {/* Add vertical spacing */}
      {/* Conditionally render RAG based on write mode */}
      {!isWriteMode && (
          <RagSelector />
      )}

      {/* Always render MCPs and Code Model selectors (or adjust based on requirements) */}
      {/* Use flex layout for MCPs and Code Model if they should be side-by-side */}
      {/* Or stack them vertically */}
      
      {/* Example: Stacking them vertically */}
      <MCPsSelector />
      <CodeModelSelector />

      {/* Example: Placing them side-by-side (adjust flex properties as needed) */}
      {/* <div className="flex space-x-2 w-full">
        <div className="flex-1"> <MCPsSelector /> </div>
        <div className="flex-1"> <CodeModelSelector /> </div>
      </div> */}
      
    </div>
  );
};

export default ProviderSelectors;