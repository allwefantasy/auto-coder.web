import React from 'react';
import RagSelector from './RagSelector';
import MCPsSelector from './MCPsSelector';

interface ProviderSelectorsProps {
    isWriteMode: boolean; // To conditionally render RagSelector
}

const ProviderSelectors: React.FC<ProviderSelectorsProps> = ({ isWriteMode }) => {
  return (
    <div className="w-full">
      {!isWriteMode && (
        <div className="flex space-x-2 w-full">
          <div className="flex-1">
            <RagSelector />
          </div>
          <div className="flex-1">
            <MCPsSelector />
          </div>
        </div>
      )}
      {/* Render only MCPsSelector or nothing if in write mode and RAG shouldn't show */}
      {isWriteMode && (
         <div className="w-full"> {/* Or adjust layout as needed for write mode */}
            {/* Optionally show MCPs or other selectors in write mode */}
            {/* <MCPsSelector /> */}
         </div>
      )}
    </div>
  );
};

export default ProviderSelectors;