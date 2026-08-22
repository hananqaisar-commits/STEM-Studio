export interface AlgorithmExecution<T> {
  steps: T[];
  title: string;
  category: string;
  timeComplexity: {
    best: string;
    average: string;
    worst: string;
  };
  spaceComplexity: string;
  pseudocode: string[];
}
