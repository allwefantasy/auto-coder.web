import React from 'react';
import RagSelector from './RagSelector';
import MCPs from './MCPs';
import './providerSelectorStyles.css';

const ProviderSelector: React.FC = () => {
  return (
    <div className="provider-selector-container">
      <div className="provider-item">
        <RagSelector />
      </div>
      <div className="provider-item">
        <MCPs />
      </div>
    </div>
  );
};

export default ProviderSelector;