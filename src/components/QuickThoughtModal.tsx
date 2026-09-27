import React from 'react';
import { NewNodeModal } from './NewNodeModal';
import { ThoughtNode } from '../types';

interface QuickThoughtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (thoughtData: Partial<ThoughtNode>, spotlightIn3D?: boolean) => Promise<ThoughtNode | null>;
}

export const QuickThoughtModal: React.FC<QuickThoughtModalProps> = props => {
  return <NewNodeModal {...props} />;
};

export { NewNodeModal };
