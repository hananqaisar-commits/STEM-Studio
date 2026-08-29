import React from 'react';
import type { CategoryTopics } from '../../data/categoryTopics';

export interface VisualizerSearchItem {
  id: string;
  name: string;
  description?: string;
  group?: string;
}

interface VisualizerHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: VisualizerSearchItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  actions?: React.ReactNode;
  categories?: CategoryTopics[];
  activeCategoryId?: string;
  onSelectCategory?: (categoryId: string) => void;
  categorySelectorOnly?: boolean;
}

/**
 * Compatibility boundary for every category page.
 * Category selection belongs in course navigation, not in a duplicate
 * algorithm strip above the visualizer. Returning no element reclaims the
 * space for every existing and future visualizer.
 */
export const VisualizerHeader: React.FC<VisualizerHeaderProps> = () => null;
