import React from 'react';
import { Activity } from 'lucide-react';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import './Complexity.css';

const sections = [
  { id: 'notations', name: 'Asymptotic Notations', group: 'Foundations' },
  { id: 'time', name: 'Time Complexity', group: 'Foundations' },
  { id: 'space', name: 'Space Complexity', group: 'Foundations' },
  { id: 'cases', name: 'Best / Average / Worst Case', group: 'Analysis' },
  { id: 'recursion', name: 'Recursion Complexity', group: 'Analysis' },
  { id: 'comparison', name: 'Algorithm Comparison', group: 'Reference' },
];

export const ComplexityPage: React.FC = () => {
  return (
    <div className="complexity-page">
      <VisualizerHeader
        icon={<Activity size={22} />}
        title="Complexity Analysis"
        subtitle="Understanding algorithmic efficiency through asymptotic notation and empirical analysis"
        items={sections}
        onSelect={(id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
        placeholder="Search complexity topics..."
      />

      {/* Section 1: Asymptotic Notations */}
      <section id="notations" className="complexity-section">
        <h2>Asymptotic Notations</h2>
        <p className="section-intro">
          Asymptotic notations describe how an algorithm's runtime or space grows as input size n approaches infinity. They abstract away constants and lower-order terms to focus on growth rate.
        </p>
        <div className="notation-grid">
          <div className="notation-card">
            <div className="notation-symbol">O(n)</div>
            <div className="notation-name">Big O — Upper Bound</div>
            <div className="notation-def">
              Describes the worst-case growth rate. f(n) = O(g(n)) means f grows no faster than g asymptotically.
            </div>
            <div className="notation-formula">
              f(n) = O(g(n)) ⟺ ∃ c &gt; 0, n₀ such that f(n) ≤ c·g(n) for all n ≥ n₀
            </div>
            <div className="notation-example">
              <strong>Example:</strong> 3n² + 5n = O(n²) — the n² term dominates
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-symbol">Ω(n)</div>
            <div className="notation-name">Omega — Lower Bound</div>
            <div className="notation-def">
              Describes the best-case growth rate. f(n) = Ω(g(n)) means f grows at least as fast as g asymptotically.
            </div>
            <div className="notation-formula">
              f(n) = Ω(g(n)) ⟺ ∃ c &gt; 0, n₀ such that f(n) ≥ c·g(n) for all n ≥ n₀
            </div>
            <div className="notation-example">
              <strong>Example:</strong> 3n² + 5n = Ω(n²) — it never grows slower than n²
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-symbol">Θ(n)</div>
            <div className="notation-name">Theta — Tight Bound</div>
            <div className="notation-def">
              Describes exact growth rate. f(n) = Θ(g(n)) means f is bounded both above and below by g.
            </div>
            <div className="notation-formula">
              f(n) = Θ(g(n)) ⟺ f(n) = O(g(n)) AND f(n) = Ω(g(n))
            </div>
            <div className="notation-example">
              <strong>Example:</strong> 3n² + 5n = Θ(n²) — grows exactly as n²
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Time Complexity */}
      <section id="time" className="complexity-section">
        <h2>Time Complexity Classes</h2>
        <p className="section-intro">
          Time complexity measures how runtime scales with input size n. The following table shows common complexity classes with approximate operation counts.
        </p>
        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Name</th>
                <th>Example</th>
                <th>n = 10</th>
                <th>n = 100</th>
                <th>n = 1,000</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>O(1)</code></td>
                <td>Constant</td>
                <td>Array access, hash lookup</td>
                <td>1</td>
                <td>1</td>
                <td>1</td>
              </tr>
              <tr>
                <td><code>O(log n)</code></td>
                <td>Logarithmic</td>
                <td>Binary search</td>
                <td>~3</td>
                <td>~7</td>
                <td>~10</td>
              </tr>
              <tr>
                <td><code>O(n)</code></td>
                <td>Linear</td>
                <td>Linear search, BFS/DFS</td>
                <td>10</td>
                <td>100</td>
                <td>1,000</td>
              </tr>
              <tr>
                <td><code>O(n log n)</code></td>
                <td>Linearithmic</td>
                <td>Merge sort, heap sort</td>
                <td>~33</td>
                <td>~664</td>
                <td>~9,966</td>
              </tr>
              <tr>
                <td><code>O(n²)</code></td>
                <td>Quadratic</td>
                <td>Bubble sort, nested loops</td>
                <td>100</td>
                <td>10,000</td>
                <td>1,000,000</td>
              </tr>
              <tr>
                <td><code>O(2ⁿ)</code></td>
                <td>Exponential</td>
                <td>Subset generation, recursive fib</td>
                <td>1,024</td>
                <td>~10³⁰</td>
                <td>~10³⁰¹</td>
              </tr>
              <tr>
                <td><code>O(n!)</code></td>
                <td>Factorial</td>
                <td>Permutations, TSP brute force</td>
                <td>3.6M</td>
                <td>~10¹⁵⁷</td>
                <td>~10²⁵⁶⁷</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="growth-visual">
          <div className="growth-title">Relative Growth (operations vs input size n)</div>
          <pre className="growth-chart">{`
Operations
  │
  │                                              O(n!) ← explodes
  │                                            ╱
  │                                          ╱
  │                                        ╱
  │                                     O(2ⁿ)
  │                                   ╱╱
  │                                ╱╱
  │                             ╱╱
  │                          O(n²)
  │                       ╱╱╱
  │                   ╱╱╱╱
  │              O(n log n)
  │          ╱╱╱╱╱
  │     O(n)╱╱
  │   ╱╱╱╱╱  O(log n)
  │ ╱╱    O(1) ────────────────────────
  └──────────────────────────────────── n (input size)
`}</pre>
        </div>
      </section>

      {/* Section 3: Space Complexity */}
      <section id="space" className="complexity-section">
        <h2>Space Complexity</h2>
        <p className="section-intro">
          Space complexity measures total memory an algorithm needs relative to input size. <strong>Total space</strong> includes input + auxiliary (extra) space. <strong>Auxiliary space</strong> is only the extra memory the algorithm allocates.
        </p>
        <div className="space-cards">
          <div className="notation-card">
            <div className="notation-symbol">O(1)</div>
            <div className="notation-name">In-Place</div>
            <div className="notation-def">
              Uses constant extra memory regardless of input size. Modifies input array directly.
            </div>
            <div className="notation-example">
              <strong>Examples:</strong> Selection sort, heap sort, swapping variables, two-pointer techniques
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-symbol">O(log n)</div>
            <div className="notation-name">Recursion Stack</div>
            <div className="notation-def">
              Logarithmic stack depth from divide-and-conquer recursion. Each call adds a frame to the call stack.
            </div>
            <div className="notation-example">
              <strong>Examples:</strong> Merge sort stack depth, balanced BST traversal, binary search (recursive)
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-symbol">O(n)</div>
            <div className="notation-name">Linear Copy</div>
            <div className="notation-def">
              Allocates memory proportional to input size. Common when creating copies or auxiliary data structures.
            </div>
            <div className="notation-example">
              <strong>Examples:</strong> Merge sort (merge arrays), BFS queue, DFS visited set, hash map construction
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Best / Average / Worst Case */}
      <section id="cases" className="complexity-section">
        <h2>Best, Average & Worst Case Analysis</h2>
        <p className="section-intro">
          An algorithm's performance varies based on input arrangement. <strong>Best case</strong> is the optimal input, <strong>worst case</strong> is the most unfavorable, and <strong>average case</strong> is expected over all possible inputs.
        </p>
        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Best Case</th>
                <th>Average Case</th>
                <th>Worst Case</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bubble Sort</td>
                <td><code>O(n)</code></td>
                <td><code>O(n²)</code></td>
                <td><code>O(n²)</code></td>
                <td>Best when already sorted (with early exit)</td>
              </tr>
              <tr>
                <td>Selection Sort</td>
                <td><code>O(n²)</code></td>
                <td><code>O(n²)</code></td>
                <td><code>O(n²)</code></td>
                <td>Always scans all remaining elements</td>
              </tr>
              <tr>
                <td>Insertion Sort</td>
                <td><code>O(n)</code></td>
                <td><code>O(n²)</code></td>
                <td><code>O(n²)</code></td>
                <td>Best when nearly sorted — adaptive</td>
              </tr>
              <tr>
                <td>Merge Sort</td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n log n)</code></td>
                <td>Always divides and merges — consistent</td>
              </tr>
              <tr>
                <td>Quick Sort</td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n²)</code></td>
                <td>Worst when pivot is min/max (sorted input)</td>
              </tr>
              <tr>
                <td>Heap Sort</td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n log n)</code></td>
                <td>Heapify guarantees log n per extraction</td>
              </tr>
              <tr>
                <td>Binary Search</td>
                <td><code>O(1)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td>Best when target is at mid initially</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5: Recursion Complexity */}
      <section id="recursion" className="complexity-section">
        <h2>Recursion Complexity</h2>
        <p className="section-intro">
          Recursive algorithms divide problems into subproblems. Their complexity is expressed as recurrence relations, solved using the <strong>Master Theorem</strong> or recursion trees.
        </p>

        <div className="master-theorem">
          <h3>Master Theorem (Simplified)</h3>
          <p>For recurrences of the form: <code>T(n) = a·T(n/b) + O(nᵈ)</code></p>
          <ul>
            <li>If <code>d &lt; log_b(a)</code> → <code>T(n) = O(n^(log_b(a)))</code> — work dominated by leaves</li>
            <li>If <code>d = log_b(a)</code> → <code>T(n) = O(nᵈ · log n)</code> — balanced work</li>
            <li>If <code>d &gt; log_b(a)</code> → <code>T(n) = O(nᵈ)</code> — work dominated by root</li>
          </ul>
        </div>

        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Recurrence</th>
                <th>a, b, d</th>
                <th>Solution</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Merge Sort</td>
                <td><code>T(n) = 2T(n/2) + O(n)</code></td>
                <td>a=2, b=2, d=1</td>
                <td><code>O(n log n)</code> — d = log₂(2) = 1</td>
              </tr>
              <tr>
                <td>Binary Search</td>
                <td><code>T(n) = T(n/2) + O(1)</code></td>
                <td>a=1, b=2, d=0</td>
                <td><code>O(log n)</code> — d &gt; log₂(1) = 0</td>
              </tr>
              <tr>
                <td>Strassen's Matrix</td>
                <td><code>T(n) = 7T(n/2) + O(n²)</code></td>
                <td>a=7, b=2, d=2</td>
                <td><code>O(n^2.81)</code> — d &lt; log₂(7) ≈ 2.81</td>
              </tr>
              <tr>
                <td>Karatsuba Multiply</td>
                <td><code>T(n) = 3T(n/2) + O(n)</code></td>
                <td>a=3, b=2, d=1</td>
                <td><code>O(n^1.58)</code> — d &lt; log₂(3) ≈ 1.58</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="call-tree">
          <h3>Recursion Tree: Merge Sort T(n) = 2T(n/2) + O(n)</h3>
          <pre>{`
Level 0:              [n]                  cost: n
                    /     \\
Level 1:         [n/2]   [n/2]            cost: n/2 + n/2 = n
                 / \\     / \\
Level 2:    [n/4][n/4][n/4][n/4]          cost: 4 × n/4 = n
              ...    ...    ...
Level log n: [1][1][1]...[1]  (n leaves)  cost: n × 1 = n

Total: n × (log n + 1) levels = O(n log n)
`}</pre>
        </div>
      </section>

      {/* Section 6: Comparison Table */}
      <section id="comparison" className="complexity-section">
        <h2>Algorithm Complexity Reference</h2>
        <p className="section-intro">
          Quick reference for common algorithms. Use this table to choose the right algorithm based on your constraints.
        </p>
        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Time (Best)</th>
                <th>Time (Avg)</th>
                <th>Time (Worst)</th>
                <th>Space</th>
                <th>Stable</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bubble Sort</td>
                <td><code>O(n)</code></td>
                <td><code>O(n²)</code></td>
                <td><code>O(n²)</code></td>
                <td><code>O(1)</code></td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Selection Sort</td>
                <td><code>O(n²)</code></td>
                <td><code>O(n²)</code></td>
                <td><code>O(n²)</code></td>
                <td><code>O(1)</code></td>
                <td>No</td>
              </tr>
              <tr>
                <td>Insertion Sort</td>
                <td><code>O(n)</code></td>
                <td><code>O(n²)</code></td>
                <td><code>O(n²)</code></td>
                <td><code>O(1)</code></td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Merge Sort</td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n)</code></td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Quick Sort</td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n²)</code></td>
                <td><code>O(log n)</code></td>
                <td>No</td>
              </tr>
              <tr>
                <td>Heap Sort</td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n log n)</code></td>
                <td><code>O(n log n)</code></td>
                <td><code>O(1)</code></td>
                <td>No</td>
              </tr>
              <tr>
                <td>Binary Search</td>
                <td><code>O(1)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(1)</code></td>
                <td>—</td>
              </tr>
              <tr>
                <td>BFS</td>
                <td><code>O(V + E)</code></td>
                <td><code>O(V + E)</code></td>
                <td><code>O(V + E)</code></td>
                <td><code>O(V)</code></td>
                <td>—</td>
              </tr>
              <tr>
                <td>DFS</td>
                <td><code>O(V + E)</code></td>
                <td><code>O(V + E)</code></td>
                <td><code>O(V + E)</code></td>
                <td><code>O(V)</code></td>
                <td>—</td>
              </tr>
              <tr>
                <td>Dijkstra (min-heap)</td>
                <td><code>O((V+E) log V)</code></td>
                <td><code>O((V+E) log V)</code></td>
                <td><code>O((V+E) log V)</code></td>
                <td><code>O(V)</code></td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
