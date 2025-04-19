import React from 'react';
import RagSelector from './RagSelector';
import MCPsSelector from './MCPsSelector';
import CodeModelSelector from './CodeModelSelector';

interface ProviderSelectorsProps {
    isWriteMode: boolean;
}

const ProviderSelectors: React.FC<ProviderSelectorsProps> = ({ isWriteMode }) => {
  return (
    <div className="w-full px-1"> 
      <div className="flex space-x-1 w-full border-b border-gray-100 pb-1 mb-1">
        <div className={`${isWriteMode ? 'flex-[3]' : 'flex-[2]'} min-w-0`}>
          <CodeModelSelector />
        </div>

        {!isWriteMode && (
          <div className="flex-1 min-w-0 mx-1">
            <RagSelector />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <MCPsSelector />
        </div>
      </div>
    </div>
  );
};

export default ProviderSelectors;