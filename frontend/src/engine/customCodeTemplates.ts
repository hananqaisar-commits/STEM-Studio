/**
 * Custom Code Starter Templates for Multi-Language Execution
 * 
 * Pre-filled templates for JavaScript, Python, C++, C#, Java, Ruby, Go, and Rust.
 */

export type CustomLanguage = 'javascript' | 'python' | 'cpp' | 'csharp' | 'java' | 'ruby' | 'go' | 'rust';

export const MULTI_LANG_SORTING_TEMPLATES: Record<CustomLanguage, Record<string, string>> = {
  javascript: {
    bubble: `// Bubble Sort in JavaScript — modify and click Run Code
for (let i = 0; i < n - 1; i++) {
  for (let j = 0; j < n - i - 1; j++) {
    if (compare(j, j + 1)) {
      swap(j, j + 1);
    }
  }
  markSorted(n - i - 1);
}`,
    selection: `// Selection Sort in JavaScript
for (let i = 0; i < n - 1; i++) {
  let minIdx = i;
  for (let j = i + 1; j < n; j++) {
    if (compare(minIdx, j)) minIdx = j;
  }
  if (minIdx !== i) swap(i, minIdx);
  markSorted(i);
}`,
    insertion: `// Insertion Sort in JavaScript
for (let i = 1; i < n; i++) {
  let j = i;
  while (j > 0 && compare(j - 1, j)) {
    swap(j - 1, j);
    j--;
  }
  markSorted(i);
}`,
  },

  python: {
    bubble: `# Bubble Sort in Python — modify and click Run Code
# Helpers: compare(i, j) returns True if arr[i] > arr[j]
#          swap(i, j) swaps elements
#          mark_sorted(i) marks index as sorted

for i in range(n - 1):
    for j in range(n - i - 1):
        if compare(j, j + 1):
            swap(j, j + 1)
    mark_sorted(n - i - 1)`,
    selection: `# Selection Sort in Python
for i in range(n - 1):
    min_idx = i
    for j in range(i + 1, n):
        if compare(min_idx, j):
            min_idx = j
    if min_idx != i:
        swap(i, min_idx)
    mark_sorted(i)`,
    insertion: `# Insertion Sort in Python
for i in range(1, n):
    j = i
    while j > 0 and compare(j - 1, j):
        swap(j - 1, j)
        j -= 1
    mark_sorted(i)`,
  },

  cpp: {
    bubble: `// Bubble Sort in C++ — modify and click Run Code
for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
        if (compare(j, j + 1)) {
            swap(j, j + 1);
        }
    }
    markSorted(n - i - 1);
}`,
    selection: `// Selection Sort in C++
for (int i = 0; i < n - 1; i++) {
    int minIdx = i;
    for (int j = i + 1; j < n; j++) {
        if (compare(minIdx, j)) minIdx = j;
    }
    if (minIdx != i) swap(i, minIdx);
    markSorted(i);
}`,
    insertion: `// Insertion Sort in C++
for (int i = 1; i < n; i++) {
    int j = i;
    while (j > 0 && compare(j - 1, j)) {
        swap(j - 1, j);
        j--;
    }
    markSorted(i);
}`,
  },

  csharp: {
    bubble: `// Bubble Sort in C# — modify and click Run Code
for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
        if (compare(j, j + 1)) {
            swap(j, j + 1);
        }
    }
    markSorted(n - i - 1);
}`,
    selection: `// Selection Sort in C#
for (int i = 0; i < n - 1; i++) {
    int minIdx = i;
    for (int j = i + 1; j < n; j++) {
        if (compare(minIdx, j)) minIdx = j;
    }
    if (minIdx != i) swap(i, minIdx);
    markSorted(i);
}`,
    insertion: `// Insertion Sort in C#
for (int i = 1; i < n; i++) {
    int j = i;
    while (j > 0 && compare(j - 1, j)) {
        swap(j - 1, j);
        j--;
    }
    markSorted(i);
}`,
  },

  java: {
    bubble: `// Bubble Sort in Java — modify and click Run Code
for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
        if (compare(j, j + 1)) {
            swap(j, j + 1);
        }
    }
    markSorted(n - i - 1);
}`,
    selection: `// Selection Sort in Java
for (int i = 0; i < n - 1; i++) {
    int minIdx = i;
    for (int j = i + 1; j < n; j++) {
        if (compare(minIdx, j)) minIdx = j;
    }
    if (minIdx != i) swap(i, minIdx);
    markSorted(i);
}`,
    insertion: `// Insertion Sort in Java
for (int i = 1; i < n; i++) {
    int j = i;
    while (j > 0 && compare(j - 1, j)) {
        swap(j - 1, j);
        j--;
    }
    markSorted(i);
}`,
  },

  ruby: {
    bubble: `# Bubble Sort in Ruby — modify and click Run Code
(0...(n - 1)).each do |i|
  (0...(n - i - 1)).each do |j|
    if compare(j, j + 1)
      swap(j, j + 1)
    end
  end
  mark_sorted(n - i - 1)
end`,
    selection: `# Selection Sort in Ruby
(0...(n - 1)).each do |i|
  min_idx = i
  ((i + 1)...n).each do |j|
    min_idx = j if compare(min_idx, j)
  end
  swap(i, min_idx) if min_idx != i
  mark_sorted(i)
end`,
    insertion: `# Insertion Sort in Ruby
(1...n).each do |i|
  j = i
  while j > 0 && compare(j - 1, j)
    swap(j - 1, j)
    j -= 1
  end
  mark_sorted(i)
end`,
  },

  go: {
    bubble: `// Bubble Sort in Go — modify and click Run Code
for i := 0; i < n-1; i++ {
    for j := 0; j < n-i-1; j++ {
        if compare(j, j+1) {
            swap(j, j+1)
        }
    }
    markSorted(n - i - 1)
}`,
    selection: `// Selection Sort in Go
for i := 0; i < n-1; i++ {
    minIdx := i
    for j := i + 1; j < n; j++ {
        if compare(minIdx, j) { minIdx = j }
    }
    if minIdx != i { swap(i, minIdx) }
    markSorted(i)
}`,
    insertion: `// Insertion Sort in Go
for i := 1; i < n; i++ {
    j := i
    for j > 0 && compare(j-1, j) {
        swap(j-1, j)
        j--
    }
    markSorted(i)
}`,
  },

  rust: {
    bubble: `// Bubble Sort in Rust — modify and click Run Code
for i in 0..(n - 1) {
    for j in 0..(n - i - 1) {
        if compare(j, j + 1) {
            swap(j, j + 1);
        }
    }
    mark_sorted(n - i - 1);
}`,
    selection: `// Selection Sort in Rust
for i in 0..(n - 1) {
    let mut min_idx = i;
    for j in (i + 1)..n {
        if compare(min_idx, j) { min_idx = j; }
    }
    if min_idx != i { swap(i, min_idx); }
    mark_sorted(i);
}`,
    insertion: `// Insertion Sort in Rust
for i in 1..n {
    let mut j = i;
    while j > 0 && compare(j - 1, j) {
        swap(j - 1, j);
        j -= 1;
    }
    mark_sorted(i);
}`,
  },
};

export function getStarterTemplate(algorithmKey: string, lang: CustomLanguage = 'javascript'): string {
  const langTemplates = MULTI_LANG_SORTING_TEMPLATES[lang] || MULTI_LANG_SORTING_TEMPLATES.javascript;
  return langTemplates[algorithmKey] || langTemplates.bubble;
}
