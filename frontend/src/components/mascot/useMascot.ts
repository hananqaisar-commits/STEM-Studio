import { useContext } from 'react';
import { MascotContext } from './MascotContext';
import type { MascotApi } from './MascotState';

export const useMascot = (): MascotApi => {
  const ctx = useContext(MascotContext);
  if (!ctx) {
    throw new Error('useMascot must be used within a MascotProvider');
  }
  return ctx;
};
