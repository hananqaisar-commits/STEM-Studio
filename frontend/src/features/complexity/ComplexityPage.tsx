import React, {useState, useEffect} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';
import './Complexity.css';

const sections = [
  { id: 'why', name: 'Why Complexity Analysis?', group: 'Foundations' },
  { id: 'notations', name: 'Asymptotic Notations', group: 'Foundations' },
  { id: 'rules', name: 'Simplification Rules', group: 'Foundations' },
  { id: 'loops', name: 'Analyzing Loops', group: 'Foundations' },
  { id: 'time', name: 'Time Complexity Classes', group: 'Analysis' },
  { id: 'space', name: 'Space Complexity', group: 'Analysis' },
  { id: 'cases', name: 'Best / Average / Worst Case', group: 'Analysis' },
  { id: 'recursion', name: 'Recursion & Master Theorem', group: 'Analysis' },
  { id: 'amortized', name: 'Amortized Analysis', group: 'Analysis' },
  { id: 'tradeoffs', name: 'Time-Space Tradeoffs', group: 'Analysis' },
  { id: 'ds-operations', name: 'Data Structure Operations', group: 'Reference' },
  { id: 'comparison', name: 'Algorithm Complexity Reference', group: 'Reference' },
  { id: 'empirical', name: 'Empirical vs Asymptotic', group: 'Reference' },
  { id: 'pnp', name: 'P, NP & NP-Completeness', group: 'Reference' },
  { id: 'pitfalls', name: 'Common Misconceptions', group: 'Reference' },
  { id: 'iteration', name: 'Iteration Method', group: 'Reference' },
];

export const ComplexityPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic) {
      document.getElementById(topic)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searchParams]);

  const [activeCategoryId, setActiveCategoryId] = useState('complexity');

  const handleSelectCategory = (catId: string) => {
    setActiveCategoryId(catId);
    if (catId !== 'complexity') {
      navigate(`/dashboard/${catId}`);
    }
  };

  const handleSelectTopic = (topicId: string) => {
    if (activeCategoryId === 'complexity') {
      document.getElementById(topicId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="complexity-page">
      <VisualizerHeader
        icon={<Activity size={22} />}
        title="Complexity Analysis"
        subtitle="Understanding algorithmic efficiency through asymptotic notation and empirical analysis"
        items={sections}
        activeId={undefined}
        onSelect={handleSelectTopic}
        placeholder="Search complexity topics..."
        categories={CATEGORY_TOPICS}
        activeCategoryId={activeCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* Section: Why Complexity Analysis? */}
      <section id="why" className="complexity-section">
        <h2>Why Complexity Analysis?</h2>
        <p className="section-intro">
          Complexity analysis provides a mathematical framework to predict how an algorithm scales
          without running it on actual hardware. It abstracts away machine-specific constants and
          focuses on how runtime and memory grow as input size <strong>n</strong> increases.
        </p>

        <h3>The RAM Model</h3>
        <p className="section-intro">
          We assume a <strong>Random Access Machine (RAM)</strong> model where each basic operation
          (arithmetic, comparison, assignment, array access) takes exactly <strong>O(1)</strong> time.
          This lets us count operations instead of measuring wall-clock seconds, making analysis
          portable across all hardware.
        </p>

        <h3>Input Size &amp; Growth Rates</h3>
        <p className="section-intro">
          The <strong>input size n</strong> is the parameter that grows — array length, number of
          graph vertices, number of bits, etc. We care about the <strong>growth rate</strong> of
          the running time T(n) as n → ∞. An algorithm that runs in O(n) time doubles its work
          when the input doubles; one in O(n²) quadruples.
        </p>
        <pre className="code-block">{`Why growth rate matters:
  Algorithm A: T(n) = 100·n        → 1 billion ops at n = 10⁷
  Algorithm B: T(n) = 0.01·n²      → 1 billion ops at n = 10⁵

Even though B has a smaller constant, its quadratic growth
makes it 100× slower than A for large n.`}</pre>
      </section>

      {/* Section: Asymptotic Notations */}
      <section id="notations" className="complexity-section">
        <h2>Asymptotic Notations</h2>
        <p className="section-intro">
          Asymptotic notations describe how an algorithm&apos;s runtime or space grows as input size
          n approaches infinity. They abstract away constants and lower-order terms to focus on
          growth rate. There are five standard notations:
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
            <div className="notation-symbol">&Omega;(n)</div>
            <div className="notation-name">Big-Omega — Lower Bound</div>
            <div className="notation-def">
              Describes the best-case growth rate. f(n) = &Omega;(g(n)) means f grows at least as fast as g asymptotically.
            </div>
            <div className="notation-formula">
              f(n) = &Omega;(g(n)) ⟺ ∃ c &gt; 0, n₀ such that f(n) ≥ c·g(n) for all n ≥ n₀
            </div>
            <div className="notation-example">
              <strong>Example:</strong> 3n² + 5n = &Omega;(n²) — it never grows slower than n²
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-symbol">&Theta;(n)</div>
            <div className="notation-name">Big-Theta — Tight Bound</div>
            <div className="notation-def">
              Describes exact growth rate. f(n) = &Theta;(g(n)) means f is bounded both above and below by g.
            </div>
            <div className="notation-formula">
              f(n) = &Theta;(g(n)) ⟺ f(n) = O(g(n)) AND f(n) = &Omega;(g(n))
            </div>
            <div className="notation-example">
              <strong>Example:</strong> 3n² + 5n = &Theta;(n²) — grows exactly as n²
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-symbol">o(n)</div>
            <div className="notation-name">Little-o — Strict Upper Bound</div>
            <div className="notation-def">
              f(n) = o(g(n)) means f grows strictly slower than g. The bound is not tight.
            </div>
            <div className="notation-formula">
              f(n) = o(g(n)) ⟺ lim(n→∞) f(n)/g(n) = 0
            </div>
            <div className="notation-example">
              <strong>Example:</strong> 3n² + 5n = o(n³) — n² grows strictly slower than n³
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-symbol">&omega;(n)</div>
            <div className="notation-name">Little-omega — Strict Lower Bound</div>
            <div className="notation-def">
              f(n) = &omega;(g(n)) means f grows strictly faster than g. The bound is not tight.
            </div>
            <div className="notation-formula">
              f(n) = &omega;(g(n)) ⟺ lim(n→∞) f(n)/g(n) = ∞
            </div>
            <div className="notation-example">
              <strong>Example:</strong> 3n² + 5n = &omega;(n) — n² grows strictly faster than n
            </div>
          </div>
        </div>
      </section>

      {/* Section: Simplification Rules */}
      <section id="rules" className="complexity-section">
        <h2>Simplification Rules</h2>
        <p className="section-intro">
          When analyzing algorithms, we simplify complexity expressions using a set of rules
          that preserve the dominant growth behavior while discarding irrelevant details.
        </p>

        <div className="notation-grid">
          <div className="notation-card">
            <div className="notation-name">Rule 1: Drop Constants</div>
            <div className="notation-def">
              Constant multipliers do not affect growth rate. O(c·f(n)) = O(f(n)) for any constant c &gt; 0.
            </div>
            <div className="notation-example">
              <strong>Example:</strong> O(5n) → O(n), O(100·log n) → O(log n)
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-name">Rule 2: Drop Lower-Order Terms</div>
            <div className="notation-def">
              When multiple terms exist, keep only the fastest-growing one. Lower-order terms become negligible for large n.
            </div>
            <div className="notation-example">
              <strong>Example:</strong> O(n² + n + log n) → O(n²), O(n·log n + n) → O(n·log n)
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-name">Rule 3: Dominant Term</div>
            <div className="notation-def">
              The dominant term is the one that grows fastest. In a polynomial, it&apos;s the highest-degree term.
            </div>
            <div className="notation-example">
              <strong>Example:</strong> In 4n³ + 2n² + 7n + 1, the dominant term is n³
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-name">Rule 4: Product Rule</div>
            <div className="notation-def">
              If an algorithm performs f(n) iterations of work g(n) each, total = O(f(n)·g(n)).
            </div>
            <div className="notation-example">
              <strong>Example:</strong> n iterations of an O(log n) binary search → O(n·log n)
            </div>
          </div>

          <div className="notation-card">
            <div className="notation-name">Rule 5: Sum Rule</div>
            <div className="notation-def">
              If two independent steps run sequentially, total = O(max(f(n), g(n))).
            </div>
            <div className="notation-example">
              <strong>Example:</strong> O(n) pass then O(log n) search → O(n)
            </div>
          </div>
        </div>

        <pre className="code-block">{`Simplification walkthrough:
  T(n) = 3n² + 5n + 2·log(n) + 7

  Step 1: Drop constants     → n² + n + log(n) + 1
  Step 2: Drop lower-order   → n²
  Result: T(n) = O(n²)`}</pre>
      </section>

      {/* Section: Analyzing Loops */}
      <section id="loops" className="complexity-section">
        <h2>Analyzing Loops</h2>
        <p className="section-intro">
          Most iterative algorithms derive their complexity from loop structures. Here are the
          common patterns with code examples and analysis.
        </p>

        <h3>Single Loop — O(n)</h3>
        <pre className="code-block">{`for (let i = 0; i < n; i++) {
  // O(1) work
}
// Runs n times × O(1) = O(n)`}</pre>

        <h3>Nested Loops (independent) — O(n²)</h3>
        <pre className="code-block">{`for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    // O(1) work
  }
}
// Outer n × Inner n × O(1) = O(n²)`}</pre>

        <h3>Nested Loops (dependent) — O(n²)</h3>
        <pre className="code-block">{`for (let i = 0; i < n; i++) {
  for (let j = i + 1; j < n; j++) {
    // O(1) work  (e.g., comparing pairs)
  }
}
// Iterations: n-1 + n-2 + ... + 1 = n(n-1)/2 = O(n²)`}</pre>

        <h3>Logarithmic Loop — O(log n)</h3>
        <pre className="code-block">{`for (let i = n; i > 0; i = Math.floor(i / 2)) {
  // O(1) work
}
// i halves each time: n, n/2, n/4, ..., 1 → log₂(n) iterations`}</pre>

        <h3>Log-Linear Loop — O(n log n)</h3>
        <pre className="code-block">{`for (let i = 0; i < n; i++) {          // outer: n
  for (let j = 1; j < n; j *= 2) {    // inner: log n
    // O(1) work
  }
}
// n × log n = O(n log n)`}</pre>

        <h3>Two-Pointer / Linear Scan — O(n)</h3>
        <pre className="code-block">{`let left = 0, right = n - 1;
while (left < right) {
  // O(1) work
  left++;
  right--;
}
// left + right moves = n total → O(n)`}</pre>

        <h3>While with Square Root — O(√n)</h3>
        <pre className="code-block">{`let i = 1, sum = 0;
while (sum < n) {
  sum += i;
  i++;
}
// sum = 1 + 2 + ... + k = k(k+1)/2 ≈ n
// k ≈ √(2n) → O(√n)`}</pre>
      </section>

      {/* Section: Time Complexity Classes */}
      <section id="time" className="complexity-section">
        <h2>Time Complexity Classes</h2>
        <p className="section-intro">
          Time complexity measures how runtime scales with input size n. The following table shows
          common complexity classes with approximate operation counts and real-world examples.
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
                <td>Array access, hash lookup, stack push</td>
                <td>1</td>
                <td>1</td>
                <td>1</td>
              </tr>
              <tr>
                <td><code>O(log n)</code></td>
                <td>Logarithmic</td>
                <td>Binary search, balanced BST ops</td>
                <td>~3</td>
                <td>~7</td>
                <td>~10</td>
              </tr>
              <tr>
                <td><code>O(√n)</code></td>
                <td>Square Root</td>
                <td>Sieve of Eratosthenes, trial division</td>
                <td>~3</td>
                <td>10</td>
                <td>~32</td>
              </tr>
              <tr>
                <td><code>O(n)</code></td>
                <td>Linear</td>
                <td>Linear search, BFS, DFS</td>
                <td>10</td>
                <td>100</td>
                <td>1,000</td>
              </tr>
              <tr>
                <td><code>O(n log n)</code></td>
                <td>Linearithmic</td>
                <td>Merge sort, heap sort, priority queue sort</td>
                <td>~33</td>
                <td>~664</td>
                <td>~9,966</td>
              </tr>
              <tr>
                <td><code>O(n²)</code></td>
                <td>Quadratic</td>
                <td>Bubble sort, selection sort, nested loops</td>
                <td>100</td>
                <td>10,000</td>
                <td>1,000,000</td>
              </tr>
              <tr>
                <td><code>O(n³)</code></td>
                <td>Cubic</td>
                <td>Naive matrix multiply, Floyd-Warshall</td>
                <td>1,000</td>
                <td>1,000,000</td>
                <td>10⁹</td>
              </tr>
              <tr>
                <td><code>O(2ⁿ)</code></td>
                <td>Exponential</td>
                <td>Subset generation, recursive Fibonacci</td>
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
          <pre className="growth-chart">{`Operations
  │
  │                                              O(n!) ← explodes
  │                                            ╱
  │                                          ╱
  │                                        ╱
  │                                     O(2ⁿ)
  │                                   ╱╱
  │                                ╱╱
  │                             ╱╱
  │                          O(n³)
  │                       ╱╱╱
  │                    O(n²)
  │                  ╱╱
  │              O(n log n)
  │          ╱╱╱╱
  │     O(n)╱╱   O(√n)
  │   ╱╱╱╱╱  O(log n)
  │ ╱╱    O(1) ────────────────────────
  └──────────────────────────────────── n (input size)`}</pre>
        </div>
      </section>

      {/* Section: Space Complexity */}
      <section id="space" className="complexity-section">
        <h2>Space Complexity</h2>
        <p className="section-intro">
          Space complexity measures total memory an algorithm needs relative to input size.
          <strong> Total space</strong> includes input + auxiliary (extra) space.
          <strong> Auxiliary space</strong> is only the extra memory the algorithm allocates.
        </p>
        <div className="space-cards">
          <div className="notation-card">
            <div className="notation-symbol">O(1)</div>
            <div className="notation-name">In-Place (Constant Extra)</div>
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

        <h3>Auxiliary vs Total Space</h3>
        <p className="section-intro">
          Merge sort on an array of size n uses O(n) auxiliary space for the temporary arrays
          but O(n) total space as well (the input itself is O(n)). In contrast, heap sort uses
          O(1) auxiliary space but O(n) total space (the input array still occupies memory).
        </p>

        <h3>Recursion Stack Space</h3>
        <pre className="code-block">{`// Each recursive call adds a stack frame
function factorial(n) {        // Stack depth: n → O(n) space
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

function binarySearch(arr, lo, hi, target) {
  if (lo > hi) return -1;      // Stack depth: log n → O(log n) space
  const mid = (lo + hi) / 2;
  if (arr[mid] === target) return mid;
  return arr[mid] < target
    ? binarySearch(arr, mid + 1, hi, target)
    : binarySearch(arr, lo, mid - 1, target);
}`}</pre>

        <h3>Memoization Tables</h3>
        <p className="section-intro">
          Dynamic programming with memoization stores results for overlapping subproblems. A 1-D
          memo table of size n costs O(n) space; a 2-D table of size n×m costs O(n·m). The
          recursion stack adds additional space on top.
        </p>
        <pre className="code-block">{`// Fibonacci with memoization
const memo = new Array(n + 1);  // O(n) extra space
function fib(n) {               // Stack depth: O(n)
  if (n <= 1) return n;
  if (memo[n]) return memo[n];
  return memo[n] = fib(n-1) + fib(n-2);
}
// Total auxiliary space: O(n) memo + O(n) stack = O(n)`}</pre>
      </section>

      {/* Section: Best / Average / Worst Case */}
      <section id="cases" className="complexity-section">
        <h2>Best, Average &amp; Worst Case Analysis</h2>
        <p className="section-intro">
          An algorithm&apos;s performance varies based on input arrangement. <strong>Best case</strong> is
          the optimal input, <strong>worst case</strong> is the most unfavorable, and <strong>average
          case</strong> is expected over all possible inputs (assuming uniform distribution).
        </p>

        <h3>Definitions</h3>
        <div className="notation-grid">
          <div className="notation-card">
            <div className="notation-name">Best Case</div>
            <div className="notation-def">
              Minimum running time over all inputs of size n. Rarely used alone because it can be misleadingly optimistic.
            </div>
            <div className="notation-example">
              <strong>Example:</strong> Linear search finds target at index 0 → O(1)
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-name">Average Case</div>
            <div className="notation-def">
              Expected running time over all inputs of size n, weighted by probability. Requires a probability model.
            </div>
            <div className="notation-example">
              <strong>Example:</strong> Linear search average → O(n/2) = O(n)
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-name">Worst Case</div>
            <div className="notation-def">
              Maximum running time over all inputs of size n. Most commonly used because it provides a guaranteed upper bound.
            </div>
            <div className="notation-example">
              <strong>Example:</strong> Linear search target not found → O(n)
            </div>
          </div>
        </div>

        <h3>Complexity by Algorithm</h3>
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
                <td>Linear Search</td>
                <td><code>O(1)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td>Best when target is first element</td>
              </tr>
              <tr>
                <td>Binary Search</td>
                <td><code>O(1)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td>Best when target is at mid initially</td>
              </tr>
              <tr>
                <td>Hash Table Lookup</td>
                <td><code>O(1)</code></td>
                <td><code>O(1)</code></td>
                <td><code>O(n)</code></td>
                <td>Worst when all keys collide</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section: Recursion & Master Theorem */}
      <section id="recursion" className="complexity-section">
        <h2>Recursion &amp; Master Theorem</h2>
        <p className="section-intro">
          Recursive algorithms divide problems into subproblems. Their complexity is expressed as
          <strong> recurrence relations</strong>, which can be solved using the Master Theorem,
          recursion trees, or the substitution method.
        </p>

        <div className="master-theorem">
          <h3>Master Theorem</h3>
          <p>
            For recurrences of the form: <code>T(n) = a·T(n/b) + O(n&sup1;)</code> where a ≥ 1, b &gt; 1, and d ≥ 0:
          </p>
          <ul>
            <li>
              <strong>Case 1:</strong> If <code>d &lt; log_b(a)</code> → <code>T(n) = O(n^(log_b(a)))</code>
              — work dominated by leaves (subproblem cost wins)
            </li>
            <li>
              <strong>Case 2:</strong> If <code>d = log_b(a)</code> → <code>T(n) = O(nᵈ · log n)</code>
              — balanced work at every level
            </li>
            <li>
              <strong>Case 3:</strong> If <code>d &gt; log_b(a)</code> → <code>T(n) = O(nᵈ)</code>
              — work dominated by root (combine cost wins)
            </li>
          </ul>
        </div>

        <h3>Recurrence Examples</h3>
        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Recurrence</th>
                <th>a, b, d</th>
                <th>Case</th>
                <th>Solution</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Binary Search</td>
                <td><code>T(n) = T(n/2) + O(1)</code></td>
                <td>1, 2, 0</td>
                <td>Case 2</td>
                <td><code>O(log n)</code></td>
              </tr>
              <tr>
                <td>Merge Sort</td>
                <td><code>T(n) = 2T(n/2) + O(n)</code></td>
                <td>2, 2, 1</td>
                <td>Case 2</td>
                <td><code>O(n log n)</code></td>
              </tr>
              <tr>
                <td>Max Subarray (D&amp;C)</td>
                <td><code>T(n) = 2T(n/2) + O(n)</code></td>
                <td>2, 2, 1</td>
                <td>Case 2</td>
                <td><code>O(n log n)</code></td>
              </tr>
              <tr>
                <td>Strassen&apos;s Matrix</td>
                <td><code>T(n) = 7T(n/2) + O(n²)</code></td>
                <td>7, 2, 2</td>
                <td>Case 1</td>
                <td><code>O(n^2.81)</code></td>
              </tr>
              <tr>
                <td>Karatsuba Multiply</td>
                <td><code>T(n) = 3T(n/2) + O(n)</code></td>
                <td>3, 2, 1</td>
                <td>Case 1</td>
                <td><code>O(n^1.58)</code></td>
              </tr>
              <tr>
                <td>Naive Matrix Mult (D&amp;C)</td>
                <td><code>T(n) = 8T(n/2) + O(n²)</code></td>
                <td>8, 2, 2</td>
                <td>Case 1</td>
                <td><code>O(n³)</code></td>
              </tr>
              <tr>
                <td>Closest Pair (D&amp;C)</td>
                <td><code>T(n) = 2T(n/2) + O(n)</code></td>
                <td>2, 2, 1</td>
                <td>Case 2</td>
                <td><code>O(n log n)</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="call-tree">
          <h3>Recursion Tree: Merge Sort T(n) = 2T(n/2) + O(n)</h3>
          <pre>{`Level 0:              [n]                  cost: n
                    /     \\
Level 1:         [n/2]   [n/2]            cost: n/2 + n/2 = n
                 / \\     / \\
Level 2:    [n/4][n/4][n/4][n/4]          cost: 4 × n/4 = n
              ...    ...    ...
Level log n: [1][1][1]...[1]  (n leaves)  cost: n × 1 = n

Total: n × (log n + 1) levels = O(n log n)`}</pre>
        </div>

        <div className="call-tree">
          <h3>Recursion Tree: T(n) = 3T(n/2) + O(n) (Karatsuba)</h3>
          <pre>{`Level 0:              [n]                    cost: n
                   /  |  \\
Level 1:     [n/2] [n/2] [n/2]              cost: 3n/2
               ...    ...    ...
Level k:     3^k nodes, each cost n/2^k     cost: n·(3/2)^k

Levels = log₂(n). Sum = n · Σ(3/2)^k for k=0..log₂n
     = n · ( (3/2)^(log₂n + 1) - 1 ) / (3/2 - 1)
     = O(n^log₂(3)) = O(n^1.58)     ← Case 1: leaves dominate`}</pre>
        </div>

        <h3>Substitution Method</h3>
        <p className="section-intro">
          Guess the solution, then prove by induction. Useful when the Master Theorem does not apply.
        </p>
        <pre className="code-block">{`Example: T(n) = 2T(n/2) + n,  guess T(n) = O(n log n)

Inductive step: assume T(k) ≤ c·k·log(k) for k < n.
  T(n) = 2T(n/2) + n
       ≤ 2·c·(n/2)·log(n/2) + n
       = c·n·(log n - 1) + n
       = c·n·log n - c·n + n
       = c·n·log n - (c-1)·n
       ≤ c·n·log n      ✓ (for c ≥ 1)`}</pre>

        <h3>Akra-Bazzi Method (Brief Mention)</h3>
        <p className="section-intro">
          The <strong>Akra-Bazzi theorem</strong> generalizes the Master Theorem for recurrences
          where subproblems have different sizes, e.g.,
          <code> T(n) = T(n/3) + T(2n/3) + O(n)</code>. It solves
          <code> T(n) = Σ aᵢ·T(bᵢ·n) + g(n)</code> by finding p such that
          <code> Σ aᵢ·bᵢ^p = 1</code>, then <code> T(n) = Θ(n^p · (1 + ∫g(u)/u^(p+1) du))</code>.
        </p>
      </section>

      {/* Section: Amortized Analysis */}
      <section id="amortized" className="complexity-section">
        <h2>Amortized Analysis</h2>
        <p className="section-intro">
          Amortized analysis computes the <strong>average cost per operation over a sequence</strong>,
          even when individual operations may be expensive. Unlike average-case analysis, it makes
          no probabilistic assumptions — it guarantees the worst-case average.
        </p>

        <h3>Dynamic Array (e.g., std::vector, ArrayList, Python list)</h3>
        <p className="section-intro">
          When a dynamic array is full, it allocates a new array of double the size and copies
          all elements. Most pushes are O(1), but every doubling triggers an O(n) copy.
        </p>
        <pre className="code-block">{`// Push sequence: 1, 2, 3, 4, 5, 6, 7, 8
// Copy costs:   1, 2, -, 4, -, -, -, 8
// Total copy cost for n pushes:
//   1 + 2 + 4 + 8 + ... + n = 2n - 1 = O(n)
// Amortized cost per push: O(n) / n = O(1)`}</pre>

        <h3>Binary Counter</h3>
        <p className="section-intro">
          Incrementing a k-bit binary counter flips bit 0 every time, bit 1 every other time,
          bit 2 every 4th time, etc.
        </p>
        <pre className="code-block">{`Counter   Bits flipped
000→001   1
001→010   2
010→011   1
011→100   3
100→101   1
101→110   2
110→111   1
111→1000  4

Total flips for n increments:
  n + n/2 + n/4 + n/8 + ... = 2n = O(n)
Amortized per increment: O(n)/n = O(1)`}</pre>

        <h3>Three Methods</h3>
        <div className="notation-grid">
          <div className="notation-card">
            <div className="notation-name">Aggregate Method</div>
            <div className="notation-def">
              Compute total cost T(n) for n operations, then amortized = T(n)/n. Simplest approach — used above for dynamic arrays.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-name">Accounting Method</div>
            <div className="notation-def">
              Assign amortized cost to each operation. Cheap operations &quot;save credits&quot; that pay for future expensive ones. E.g., push costs 2 credits: 1 for the push, 1 saved for a future copy.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-name">Potential Method</div>
            <div className="notation-def">
              Define a potential function Φ(D) mapping data structure state to a real number. Amortized cost = actual cost + ΔΦ. Common choice: Φ = number of elements above half-capacity.
            </div>
          </div>
        </div>
      </section>


      {/* Section: Time-Space Tradeoffs */}
      <section id="tradeoffs" className="complexity-section">
        <h2>Time-Space Tradeoffs</h2>
        <p className="section-intro">
          Many algorithmic choices involve trading time for space or vice versa. Understanding
          these tradeoffs is key to choosing the right approach for a given constraint.
        </p>

        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>More Time, Less Space</th>
                <th>Less Time, More Space</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sorting vs Hashing</td>
                <td>Sort in-place O(n log n), search O(log n), O(1) extra space</td>
                <td>Build hash table O(n), search O(1), O(n) extra space</td>
              </tr>
              <tr>
                <td>Fibonacci</td>
                <td>Recursive (naive) O(2ⁿ) time, O(n) stack space</td>
                <td>Memoized O(n) time, O(n) table space</td>
              </tr>
              <tr>
                <td>Iterative vs Recursive</td>
                <td>Recursive: cleaner code, O(stack depth) space</td>
                <td>Iterative: O(1) stack space, sometimes more verbose</td>
              </tr>
              <tr>
                <td>Lookup Tables</td>
                <td>Compute on the fly: O(computation) time, O(1) space</td>
                <td>Precompute table: O(1) lookup, O(table) space</td>
              </tr>
              <tr>
                <td>BFS vs DFS</td>
                <td>DFS: O(V) stack space, may explore deep paths</td>
                <td>BFS: O(V) queue space, finds shortest path first</td>
              </tr>
              <tr>
                <td>Compression</td>
                <td>Store uncompressed: O(1) decode, more space</td>
                <td>Store compressed: O(decode) time, less space</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Example: Memoization Tradeoff</h3>
        <pre className="code-block">{`// Without memoization: O(2ⁿ) time, O(n) space (stack only)
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

// With memoization: O(n) time, O(n) space (table + stack)
const memo = {};
function fibMemo(n) {
  if (n <= 1) return n;
  if (memo[n] !== undefined) return memo[n];
  return memo[n] = fibMemo(n - 1) + fibMemo(n - 2);
}

// Iterative DP: O(n) time, O(1) space
function fibIter(n) {
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}`}</pre>
      </section>

      {/* Section: Data Structure Operations */}
      <section id="ds-operations" className="complexity-section">
        <h2>Data Structure Operations</h2>
        <p className="section-intro">
          Reference table for worst-case (and average-case) time complexity of fundamental
          operations across common data structures.
        </p>
        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Data Structure</th>
                <th>Access</th>
                <th>Search</th>
                <th>Insert</th>
                <th>Delete</th>
                <th>Space</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Array</td>
                <td><code>O(1)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>Sorted Array</td>
                <td><code>O(1)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>Linked List</td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(1)*</code></td>
                <td><code>O(1)*</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>Stack</td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(1)</code></td>
                <td><code>O(1)</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>Queue</td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(1)</code></td>
                <td><code>O(1)</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>Hash Table (avg)</td>
                <td>—</td>
                <td><code>O(1)</code></td>
                <td><code>O(1)</code></td>
                <td><code>O(1)</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>Hash Table (worst)</td>
                <td>—</td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>BST (unbalanced)</td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>BST (avg)</td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>AVL / Red-Black Tree</td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>Min/Max Heap</td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(n)</code></td>
              </tr>
              <tr>
                <td>Heap (find-min/max)</td>
                <td><code>O(1)</code></td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Trie</td>
                <td>—</td>
                <td><code>O(m)</code></td>
                <td><code>O(m)</code></td>
                <td><code>O(m)</code></td>
                <td><code>O(m·|Σ|)</code></td>
              </tr>
              <tr>
                <td>Disjoint Set (Union-Find)</td>
                <td>—</td>
                <td><code>O(α(n))</code></td>
                <td><code>O(α(n))</code></td>
                <td>—</td>
                <td><code>O(n)</code></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="section-intro">
          <strong>Notes:</strong> *Linked list insert/delete O(1) assumes you already have a pointer
          to the node. Trie operations are O(m) where m is the key length. Union-Find with path
          compression and union by rank achieves nearly O(1) amortized — O(&alpha;(n)) where
          &alpha; is the inverse Ackermann function.
        </p>
      </section>

      {/* Section: Algorithm Complexity Reference */}
      <section id="comparison" className="complexity-section">
        <h2>Algorithm Complexity Reference</h2>
        <p className="section-intro">
          Comprehensive reference for common algorithms across sorting, searching, graph, tree,
          and dynamic programming domains.
        </p>

        <h3>Sorting Algorithms</h3>
        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Best</th>
                <th>Average</th>
                <th>Worst</th>
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
                <td>Counting Sort</td>
                <td><code>O(n + k)</code></td>
                <td><code>O(n + k)</code></td>
                <td><code>O(n + k)</code></td>
                <td><code>O(k)</code></td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Radix Sort</td>
                <td><code>O(d·(n+k))</code></td>
                <td><code>O(d·(n+k))</code></td>
                <td><code>O(d·(n+k))</code></td>
                <td><code>O(n + k)</code></td>
                <td>Yes</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Searching Algorithms</h3>
        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Best</th>
                <th>Average</th>
                <th>Worst</th>
                <th>Space</th>
                <th>Requirement</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Linear Search</td>
                <td><code>O(1)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(1)</code></td>
                <td>None</td>
              </tr>
              <tr>
                <td>Binary Search</td>
                <td><code>O(1)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td><code>O(1)</code></td>
                <td>Sorted input</td>
              </tr>
              <tr>
                <td>Hash Table</td>
                <td><code>O(1)</code></td>
                <td><code>O(1)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td>Hash function</td>
              </tr>
              <tr>
                <td>Interpolation Search</td>
                <td><code>O(1)</code></td>
                <td><code>O(log log n)</code></td>
                <td><code>O(n)</code></td>
                <td><code>O(1)</code></td>
                <td>Uniform distribution</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Graph Algorithms</h3>
        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Time</th>
                <th>Space</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>BFS</td>
                <td><code>O(V + E)</code></td>
                <td><code>O(V)</code></td>
                <td>Shortest path in unweighted graphs</td>
              </tr>
              <tr>
                <td>DFS</td>
                <td><code>O(V + E)</code></td>
                <td><code>O(V)</code></td>
                <td>Topological sort, cycle detection</td>
              </tr>
              <tr>
                <td>Dijkstra (min-heap)</td>
                <td><code>O((V+E) log V)</code></td>
                <td><code>O(V)</code></td>
                <td>Shortest path, non-negative weights</td>
              </tr>
              <tr>
                <td>Dijkstra (array)</td>
                <td><code>O(V²)</code></td>
                <td><code>O(V)</code></td>
                <td>Better for dense graphs</td>
              </tr>
              <tr>
                <td>Bellman-Ford</td>
                <td><code>O(V·E)</code></td>
                <td><code>O(V)</code></td>
                <td>Handles negative weights, detects cycles</td>
              </tr>
              <tr>
                <td>Floyd-Warshall</td>
                <td><code>O(V³)</code></td>
                <td><code>O(V²)</code></td>
                <td>All-pairs shortest paths</td>
              </tr>
              <tr>
                <td>Kruskal&apos;s MST</td>
                <td><code>O(E log E)</code></td>
                <td><code>O(V)</code></td>
                <td>Union-Find based, edge-centric</td>
              </tr>
              <tr>
                <td>Prim&apos;s MST (min-heap)</td>
                <td><code>O((V+E) log V)</code></td>
                <td><code>O(V)</code></td>
                <td>Vertex-centric, good for dense graphs</td>
              </tr>
              <tr>
                <td>Topological Sort (DFS)</td>
                <td><code>O(V + E)</code></td>
                <td><code>O(V)</code></td>
                <td>DAG only</td>
              </tr>
              <tr>
                <td>Tarjan&apos;s SCC</td>
                <td><code>O(V + E)</code></td>
                <td><code>O(V)</code></td>
                <td>Finds all strongly connected components</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Tree &amp; DP Algorithms</h3>
        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Time</th>
                <th>Space</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tree Traversal (in/pre/post)</td>
                <td><code>O(n)</code></td>
                <td><code>O(h)</code></td>
                <td>h = height; O(log n) balanced, O(n) skewed</td>
              </tr>
              <tr>
                <td>AVL Insert / Delete</td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td>Rotations keep balance factor in [-1, 0, 1]</td>
              </tr>
              <tr>
                <td>Red-Black Insert / Delete</td>
                <td><code>O(log n)</code></td>
                <td><code>O(log n)</code></td>
                <td>Color flips + rotations</td>
              </tr>
              <tr>
                <td>Segment Tree Build</td>
                <td><code>O(n)</code></td>
                <td><code>O(n)</code></td>
                <td>Range queries in O(log n)</td>
              </tr>
              <tr>
                <td>Fenwick Tree (BIT) Update/Query</td>
                <td><code>O(log n)</code></td>
                <td><code>O(n)</code></td>
                <td>Point update, prefix sum query</td>
              </tr>
              <tr>
                <td>Knapsack (0/1 DP)</td>
                <td><code>O(n·W)</code></td>
                <td><code>O(n·W)</code></td>
                <td>Pseudo-polynomial; W = capacity</td>
              </tr>
              <tr>
                <td>LCS (Longest Common Subsequence)</td>
                <td><code>O(m·n)</code></td>
                <td><code>O(m·n)</code></td>
                <td>2-D DP table</td>
              </tr>
              <tr>
                <td>Edit Distance</td>
                <td><code>O(m·n)</code></td>
                <td><code>O(m·n)</code></td>
                <td>Levenshtein distance via DP</td>
              </tr>
              <tr>
                <td>Matrix Chain Multiplication</td>
                <td><code>O(n³)</code></td>
                <td><code>O(n²)</code></td>
                <td>Optimal parenthesization</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section: Empirical vs Asymptotic Analysis */}
      <section id="empirical" className="complexity-section">
        <h2>Empirical vs Asymptotic Analysis</h2>
        <p className="section-intro">
          Asymptotic analysis tells us how an algorithm scales, while empirical analysis measures
          actual running time on real hardware. Both are useful, and they often complement each
          other when choosing or tuning an implementation.
        </p>

        <div className="notation-grid">
          <div className="notation-card">
            <div className="notation-name">Asymptotic Analysis</div>
            <div className="notation-def">
              Mathematical characterization of growth rate as n → ∞. Ignores constants and
              lower-order terms.
            </div>
            <div className="notation-example">
              <strong>Use when:</strong> Comparing algorithms, proving scalability, interviews.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-name">Empirical Analysis</div>
            <div className="notation-def">
              Timing the actual implementation on specific inputs and hardware. Reveals cache
              effects, constant factors, and language/runtime overhead.
            </div>
            <div className="notation-example">
              <strong>Use when:</strong> Tuning performance, validating predictions, choosing
              constants.
            </div>
          </div>
        </div>

        <h3>Benchmarking Best Practices</h3>
        <pre className="code-block">{
`1. Warm up the CPU / JIT compiler before measuring.
2. Run many iterations and report the median, not a single run.
3. Vary input sizes and plot time vs n.
4. Keep the machine idle; avoid background processes.
5. Compare the same language/runtime for fairness.`}</pre>
      </section>

      {/* Section: P, NP, NP-Complete, NP-Hard */}
      <section id="pnp" className="complexity-section">
        <h2>P, NP &amp; NP-Completeness</h2>
        <p className="section-intro">
          Complexity classes classify problems by the resources needed to solve or verify them.
          Understanding P vs NP is fundamental to knowing which problems have efficient algorithms
          and which are believed to be intractable.
        </p>

        <div className="notation-grid">
          <div className="notation-card">
            <div className="notation-symbol">P</div>
            <div className="notation-name">Polynomial Time</div>
            <div className="notation-def">
              Decision problems solvable in O(n^k) time for some constant k. Considered efficiently
              solvable.
            </div>
            <div className="notation-example">
              <strong>Examples:</strong> Sorting, shortest path, MST, linear systems.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-symbol">NP</div>
            <div className="notation-name">Nondeterministic Polynomial</div>
            <div className="notation-def">
              Decision problems whose yes-instances can be verified in polynomial time given a
              certificate.
            </div>
            <div className="notation-example">
              <strong>Examples:</strong> SAT, Hamiltonian cycle, subset sum, Sudoku.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-symbol">NP-C</div>
            <div className="notation-name">NP-Complete</div>
            <div className="notation-def">
              Problems in NP to which every NP problem can be reduced in polynomial time. If any
              NP-Complete problem is in P, then P = NP.
            </div>
            <div className="notation-example">
              <strong>Examples:</strong> 3-SAT, vertex cover, clique, traveling salesman decision.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-symbol">NP-H</div>
            <div className="notation-name">NP-Hard</div>
            <div className="notation-def">
              Problems at least as hard as the hardest NP problems, but not necessarily in NP
              themselves (may be optimization or undecidable problems).
            </div>
            <div className="notation-example">
              <strong>Examples:</strong> TSP optimization, halting problem, chess.
            </div>
          </div>
        </div>

        <h3>The P vs NP Question</h3>
        <p className="section-intro">
          It is unknown whether P = NP. Most computer scientists believe P ≠ NP, meaning there are
          problems whose solutions are easy to verify but hard to find. This is one of the seven
          Millennium Prize Problems.
        </p>
      </section>

      {/* Section: Common Misconceptions */}
      <section id="pitfalls" className="complexity-section">
        <h2>Common Misconceptions</h2>
        <p className="section-intro">
          Asymptotic notation is powerful but easy to misuse. Here are frequent mistakes and how to
          avoid them.
        </p>

        <div className="notation-grid">
          <div className="notation-card">
            <div className="notation-name">Ignoring Constants</div>
            <div className="notation-def">
              Big O drops constants, but in practice an O(n) algorithm with a huge constant may be
              slower than another O(n log n) algorithm for realistic input sizes.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-name">Forgetting Input Constraints</div>
            <div className="notation-def">
              O(n²) can be fine for n = 10³ but unacceptable for n = 10⁶. Always consider the
              expected input size.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-name">Mixing Up Best, Average, Worst</div>
            <div className="notation-def">
              Quick sort is O(n log n) average but O(n²) worst. Hash maps are O(1) average but
              O(n) worst with collisions.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-name">Treating Big O as Runtime</div>
            <div className="notation-def">
              Big O describes growth rate, not exact runtime. It says nothing about wall-clock
              seconds on a specific machine.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-name">Ignoring Space</div>
            <div className="notation-def">
              An O(n) time algorithm with O(n²) space may be worse than an O(n log n) algorithm
              with O(1) space under memory constraints.
            </div>
          </div>
          <div className="notation-card">
            <div className="notation-name">Assuming Balanced Input</div>
            <div className="notation-def">
              Algorithms that assume uniformly distributed data (bucket sort, hash tables) can
              degrade badly on adversarial inputs.
            </div>
          </div>
        </div>
      </section>

      {/* Section: Iteration Method */}
      <section id="iteration" className="complexity-section">
        <h2>Iteration Method for Recurrences</h2>
        <p className="section-intro">
          The iteration method expands the recurrence step by step until a pattern emerges, then
          sums the resulting series. It is especially useful when the Master Theorem does not apply.
        </p>

        <h3>Example 1: T(n) = 2T(n/2) + n</h3>
        <pre className="code-block">{
`T(n) = 2T(n/2) + n
     = 2[2T(n/4) + n/2] + n = 4T(n/4) + 2n
     = 4[2T(n/8) + n/4] + 2n = 8T(n/8) + 3n
     ...
     = 2^k T(n/2^k) + k·n

Set n/2^k = 1  →  k = log₂(n), T(1) = Θ(1)

T(n) = n·Θ(1) + n·log₂(n) = Θ(n log n)`}</pre>

        <h3>Example 2: T(n) = T(n/3) + T(2n/3) + n</h3>
        <p className="section-intro">
          This recurrence is unbalanced, so the Master Theorem does not apply. The recursion tree
          has variable-length paths, but the longest path is log_{3/2}(n) and the work at each
          level is at most n. Therefore T(n) = O(n log n).
        </p>

        <h3>Common Series Used in Iteration</h3>
        <div className="complexity-table-wrapper">
          <table className="complexity-table">
            <thead>
              <tr>
                <th>Series</th>
                <th>Closed Form</th>
                <th>Asymptotic</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1 + 1 + ... (k times)</td>
                <td>k</td>
                <td>O(k)</td>
              </tr>
              <tr>
                <td>1 + 2 + 4 + ... + 2^k</td>
                <td>2^{'{k+1}'} − 1</td>
                <td>O(2^k)</td>
              </tr>
              <tr>
                <td>1 + 1/2 + 1/4 + ...</td>
                <td>2</td>
                <td>O(1)</td>
              </tr>
              <tr>
                <td>1 + 2 + 3 + ... + n</td>
                <td>n(n+1)/2</td>
                <td>O(n²)</td>
              </tr>
              <tr>
                <td>log 1 + log 2 + ... + log n</td>
                <td>log(n!)</td>
                <td>O(n log n)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
