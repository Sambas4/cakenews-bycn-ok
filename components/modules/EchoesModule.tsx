
import React from 'react';
import { ExternalVoice } from '../../types';
import EchoList from './echoes/EchoList';
import { useModal } from '../../context/ModalContext';
import { useInteraction } from '../../context/InteractionContext';

interface EchoesModuleProps {
  voices: ExternalVoice[];
  accentColor: string;
  isEditable?: boolean;
  onVoicesUpdate?: (voices: ExternalVoice[]) => void;
}

const EchoesModule: React.FC<EchoesModuleProps> = ({ 
  voices, 
  accentColor,
  isEditable,
  onVoicesUpdate
}) => {
  const { openModal } = useModal();
  const { markAsRead } = useInteraction();

  const handleSelect = (voice: ExternalVoice) => {
    // Si on est en mode édition, on n'ouvre pas le viewer, on laisse EchoList gérer l'édit
    if (isEditable) return; 
    markAsRead(voice.id);
    openModal('ECHO_VIEWER', { voice, accentColor });
  };

  const handleEchoChange = (updatedVoice: ExternalVoice) => {
    if (!onVoicesUpdate) return;
    const newVoices = voices.map(v => v.id === updatedVoice.id ? updatedVoice : v);
    onVoicesUpdate(newVoices);
  };

  return (
    <div className="relative w-full">
      <EchoList 
        voices={voices} 
        onSelect={handleSelect} 
        accentColor={accentColor}
        isEditable={isEditable}
        onEchoUpdate={handleEchoChange}
      />
    </div>
  );
};

export default EchoesModule;
