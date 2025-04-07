import React from 'react';
import RagSelector from './RagSelector';
import MCPsSelector from './MCPsSelector';
import CodeModelSelector from './CodeModelSelector'; // Import the new component

interface ProviderSelectorsProps {
    isWriteMode: boolean; // Keep this prop if needed for RagSelector visibility
}

const ProviderSelectors: React.FC<ProviderSelectorsProps> = ({ isWriteMode }) => {
  return (
    <div className="w-full"> 
      <div className="flex space-x-2 w-full">        
       
                
        <div className="flex-1">
          <CodeModelSelector />
        </div>

         {!isWriteMode && (
            <div className="flex-1">
              <RagSelector />
            </div>
        )}
        <div className="flex-1">
          <MCPsSelector />
        </div>
      </div>
    </div>
  );
};

export default ProviderSelectors;