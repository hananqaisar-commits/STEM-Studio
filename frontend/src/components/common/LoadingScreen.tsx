import React from 'react';
import { MascotLoading } from '../mascot';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return <MascotLoading message={message} />;
};
