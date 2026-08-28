/**
 * Fallback reference-code snippets for algorithms that don't have a dedicated
 * snippet file yet. These are shown in the debugger so the panel never falls
 * back to the empty "Reference code coming soon" state.
 *
 * Each entry is a language-keyed set of code lines. Only Python is provided as
 * the canonical default; other languages can be added per category later.
 */

export type FallbackSnippetSet = Partial<Record<string, string[]>>;

export const FALLBACK_SNIPPETS: Record<string, FallbackSnippetSet> = {
  /* ── Arrays ───────────────────────────────────────────────────────── */
  linearSearch: {
    python: [
      'def linear_search(arr, target):',
      '    for i in range(len(arr)):',
      '        if arr[i] == target:',
      '            return i',
      '    return -1',
    ],
  },
  twoPointer: {
    python: [
      'def two_sum_sorted(arr, target):',
      '    left, right = 0, len(arr) - 1',
      '    while left < right:',
      '        s = arr[left] + arr[right]',
      '        if s == target:',
      '            return [left, right]',
      '        elif s < target:',
      '            left += 1',
      '        else:',
      '            right -= 1',
      '    return []',
    ],
  },
  kadane: {
    python: [
      'def max_subarray_sum(arr):',
      '    best = float("-inf")',
      '    current = 0',
      '    for x in arr:',
      '        current = max(x, current + x)',
      '        best = max(best, current)',
      '    return best',
    ],
  },
  slidingWindow: {
    python: [
      'def max_sum_window(arr, k):',
      '    if not arr or k > len(arr):',
      '        return 0',
      '    window = sum(arr[:k])',
      '    best = window',
      '    for i in range(k, len(arr)):',
      '        window += arr[i] - arr[i - k]',
      '        best = max(best, window)',
      '    return best',
    ],
  },
  prefixSum: {
    python: [
      'def build_prefix_sum(arr):',
      '    prefix = [0] * (len(arr) + 1)',
      '    for i in range(len(arr)):',
      '        prefix[i + 1] = prefix[i] + arr[i]',
      '    return prefix',
    ],
  },
  rotateArray: {
    python: [
      'def rotate_array(arr, k):',
      '    k = k % len(arr)',
      '    reverse(arr, 0, len(arr) - 1)',
      '    reverse(arr, 0, k - 1)',
      '    reverse(arr, k, len(arr) - 1)',
    ],
  },

  /* ── Hash Maps ────────────────────────────────────────────────────── */
  twoSum: {
    python: [
      'def two_sum(nums, target):',
      '    seen = {}',
      '    for i, x in enumerate(nums):',
      '        complement = target - x',
      '        if complement in seen:',
      '            return [seen[complement], i]',
      '        seen[x] = i',
      '    return []',
    ],
  },
  validAnagram: {
    python: [
      'def is_anagram(s, t):',
      '    if len(s) != len(t):',
      '        return False',
      '    counts = {}',
      '    for ch in s:',
      '        counts[ch] = counts.get(ch, 0) + 1',
      '    for ch in t:',
      '        counts[ch] = counts.get(ch, 0) - 1',
      '        if counts[ch] < 0:',
      '            return False',
      '    return True',
    ],
  },
  firstUnique: {
    python: [
      'def first_unique_char(s):',
      '    count = {}',
      '    for ch in s:',
      '        count[ch] = count.get(ch, 0) + 1',
      '    for i, ch in enumerate(s):',
      '        if count[ch] == 1:',
      '            return i',
      '    return -1',
    ],
  },
  subarraySum: {
    python: [
      'def subarray_sum_equals_k(nums, k):',
      '    prefix_counts = {0: 1}',
      '    total = 0',
      '    result = 0',
      '    for x in nums:',
      '        total += x',
      '        result += prefix_counts.get(total - k, 0)',
      '        prefix_counts[total] = prefix_counts.get(total, 0) + 1',
      '    return result',
    ],
  },

  duplicateDetect: {
    python: [
      'def contains_duplicate(nums):',
      '    seen = set()',
      '    for x in nums:',
      '        if x in seen:',
      '            return True',
      '        seen.add(x)',
      '    return False',
    ],
  },
  frequencyMap: {
    python: [
      'def frequency_map(items):',
      '    freq = {}',
      '    for x in items:',
      '        freq[x] = freq.get(x, 0) + 1',
      '    return freq',
    ],
  },

  /* ── Strings ──────────────────────────────────────────────────────── */
  anagram: {
    python: [
      'def is_anagram(s, t):',
      '    if len(s) != len(t):',
      '        return False',
      '    return sorted(s) == sorted(t)',
    ],
  },
  palindrome: {
    python: [
      'def is_palindrome(s):',
      '    left, right = 0, len(s) - 1',
      '    while left < right:',
      '        if s[left] != s[right]:',
      '            return False',
      '        left += 1',
      '        right -= 1',
      '    return True',
    ],
  },
  longestSubstring: {
    python: [
      'def length_of_longest_substring(s):',
      '    last_seen = {}',
      '    start = 0',
      '    best = 0',
      '    for i, ch in enumerate(s):',
      '        if ch in last_seen and last_seen[ch] >= start:',
      '            start = last_seen[ch] + 1',
      '        best = max(best, i - start + 1)',
      '        last_seen[ch] = i',
      '    return best',
    ],
  },
  kmp: {
    python: [
      'def kmp_search(text, pattern):',
      '    if not pattern:',
      '        return 0',
      '    lps = build_lps(pattern)',
      '    i = j = 0',
      '    while i < len(text):',
      '        if text[i] == pattern[j]:',
      '            i += 1',
      '            j += 1',
      '            if j == len(pattern):',
      '                return i - j',
      '        elif j > 0:',
      '            j = lps[j - 1]',
      '        else:',
      '            i += 1',
      '    return -1',
    ],
  },

  frequency: {
    python: [
      'def char_frequency(s):',
      '    freq = {}',
      '    for ch in s:',
      '        freq[ch] = freq.get(ch, 0) + 1',
      '    return freq',
    ],
  },
  reverse: {
    python: [
      'def reverse_string(s):',
      '    chars = list(s)',
      '    left, right = 0, len(s) - 1',
      '    while left < right:',
      '        chars[left], chars[right] = chars[right], chars[left]',
      '        left += 1',
      '        right -= 1',
      '    return "".join(chars)',
    ],
  },

  /* ── Recursion ─────────────────────────────────────────────────────── */
  factorial: {
    python: [
      'def factorial(n):',
      '    if n <= 1:',
      '        return 1',
      '    return n * factorial(n - 1)',
    ],
  },
  fibonacci: {
    python: [
      'def fibonacci(n):',
      '    if n <= 1:',
      '        return n',
      '    return fibonacci(n - 1) + fibonacci(n - 2)',
    ],
  },
  power: {
    python: [
      'def power(base, exp):',
      '    if exp == 0:',
      '        return 1',
      '    half = power(base, exp // 2)',
      '    if exp % 2 == 0:',
      '        return half * half',
      '    return base * half * half',
    ],
  },
  towerOfHanoi: {
    python: [
      'def hanoi(n, source, target, aux):',
      '    if n == 0:',
      '        return',
      '    hanoi(n - 1, source, aux, target)',
      '    move_disk(source, target)',
      '    hanoi(n - 1, aux, target, source)',
    ],
  },

  arraySum: {
    python: [
      'def array_sum(arr):',
      '    if not arr:',
      '        return 0',
      '    return arr[0] + array_sum(arr[1:])',
    ],
  },

  /* ── Backtracking ──────────────────────────────────────────────────── */
  nQueens: {
    python: [
      'def solve_n_queens(n):',
      '    board = [["."] * n for _ in range(n)]',
      '    solve(board, 0)',
      '',
      'def solve(board, row):',
      '    if row == len(board):',
      '        record_solution(board)',
      '        return',
      '    for col in range(len(board)):',
      '        if is_safe(board, row, col):',
      '            board[row][col] = "Q"',
      '            solve(board, row + 1)',
      '            board[row][col] = "."',
    ],
  },
  sudoku: {
    python: [
      'def solve_sudoku(board):',
      '    empty = find_empty(board)',
      '    if not empty:',
      '        return True',
      '    row, col = empty',
      '    for num in range(1, 10):',
      '        if is_valid(board, row, col, num):',
      '            board[row][col] = num',
      '            if solve_sudoku(board):',
      '                return True',
      '            board[row][col] = 0',
      '    return False',
    ],
  },
  subsets: {
    python: [
      'def generate_subsets(nums):',
      '    result = []',
      '    backtrack(nums, 0, [])',
      '    return result',
      '',
      'def backtrack(nums, start, path):',
      '    result.append(path[:])',
      '    for i in range(start, len(nums)):',
      '        path.append(nums[i])',
      '        backtrack(nums, i + 1, path)',
      '        path.pop()',
    ],
  },
  permutations: {
    python: [
      'def generate_permutations(nums):',
      '    result = []',
      '    backtrack(nums, [])',
      '    return result',
      '',
      'def backtrack(nums, path):',
      '    if len(path) == len(nums):',
      '        result.append(path[:])',
      '        return',
      '    for num in nums:',
      '        if num not in path:',
      '            path.append(num)',
      '            backtrack(nums, path)',
      '            path.pop()',
    ],
  },
  combinationSum: {
    python: [
      'def combination_sum(candidates, target):',
      '    result = []',
      '    backtrack(candidates, target, 0, [])',
      '    return result',
      '',
      'def backtrack(candidates, target, start, path):',
      '    if target == 0:',
      '        result.append(path[:])',
      '        return',
      '    if target < 0:',
      '        return',
      '    for i in range(start, len(candidates)):',
      '        path.append(candidates[i])',
      '        backtrack(candidates, target - candidates[i], i, path)',
      '        path.pop()',
    ],
  },

  /* ── Dynamic Programming ───────────────────────────────────────────── */
  fibonacci_dp: {
    python: [
      'def fibonacci(n):',
      '    if n <= 1:',
      '        return n',
      '    dp = [0] * (n + 1)',
      '    dp[1] = 1',
      '    for i in range(2, n + 1):',
      '        dp[i] = dp[i - 1] + dp[i - 2]',
      '    return dp[n]',
    ],
  },
  knapsack: {
    python: [
      'def knapsack(weights, values, capacity):',
      '    n = len(weights)',
      '    dp = [[0] * (capacity + 1) for _ in range(n + 1)]',
      '    for i in range(1, n + 1):',
      '        for w in range(capacity + 1):',
      '            if weights[i - 1] <= w:',
      '                dp[i][w] = max(dp[i - 1][w],',
      '                               values[i - 1] + dp[i - 1][w - weights[i - 1]])',
      '            else:',
      '                dp[i][w] = dp[i - 1][w]',
      '    return dp[n][capacity]',
    ],
  },
  coinChange: {
    python: [
      'def coin_change(coins, amount):',
      '    dp = [float("inf")] * (amount + 1)',
      '    dp[0] = 0',
      '    for a in range(1, amount + 1):',
      '        for c in coins:',
      '            if a - c >= 0:',
      '                dp[a] = min(dp[a], dp[a - c] + 1)',
      '    return dp[amount] if dp[amount] != float("inf") else -1',
    ],
  },
  lcs: {
    python: [
      'def longest_common_subsequence(a, b):',
      '    m, n = len(a), len(b)',
      '    dp = [[0] * (n + 1) for _ in range(m + 1)]',
      '    for i in range(1, m + 1):',
      '        for j in range(1, n + 1):',
      '            if a[i - 1] == b[j - 1]:',
      '                dp[i][j] = dp[i - 1][j - 1] + 1',
      '            else:',
      '                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])',
      '    return dp[m][n]',
    ],
  },
  lis: {
    python: [
      'def longest_increasing_subsequence(nums):',
      '    if not nums:',
      '        return 0',
      '    dp = [1] * len(nums)',
      '    for i in range(1, len(nums)):',
      '        for j in range(i):',
      '            if nums[i] > nums[j]:',
      '                dp[i] = max(dp[i], dp[j] + 1)',
      '    return max(dp)',
    ],
  },

  houseRobber: {
    python: [
      'def rob(nums):',
      '    prev, curr = 0, 0',
      '    for x in nums:',
      '        prev, curr = curr, max(curr, prev + x)',
      '    return curr',
    ],
  },
  editDistance: {
    python: [
      'def min_distance(a, b):',
      '    m, n = len(a), len(b)',
      '    dp = [[0] * (n + 1) for _ in range(m + 1)]',
      '    for i in range(m + 1):',
      '        dp[i][0] = i',
      '    for j in range(n + 1):',
      '        dp[0][j] = j',
      '    for i in range(1, m + 1):',
      '        for j in range(1, n + 1):',
      '            if a[i - 1] == b[j - 1]:',
      '                dp[i][j] = dp[i - 1][j - 1]',
      '            else:',
      '                dp[i][j] = 1 + min(dp[i - 1][j - 1],',
      '                                   dp[i - 1][j], dp[i][j - 1])',
      '    return dp[m][n]',
    ],
  },
  uniquePaths: {
    python: [
      'def unique_paths(m, n):',
      '    dp = [1] * n',
      '    for _ in range(1, m):',
      '        for j in range(1, n):',
      '            dp[j] += dp[j - 1]',
      '    return dp[-1]',
    ],
  },

  /* ── Greedy ────────────────────────────────────────────────────────── */
  activitySelection: {
    python: [
      'def activity_selection(activities):',
      '    activities.sort(key=lambda x: x[1])',
      '    selected = [activities[0]]',
      '    for act in activities[1:]:',
      '        if act[0] >= selected[-1][1]:',
      '            selected.append(act)',
      '    return selected',
    ],
  },
  fractionalKnapsack: {
    python: [
      'def fractional_knapsack(items, capacity):',
      '    items.sort(key=lambda x: x.value / x.weight, reverse=True)',
      '    total_value = 0.0',
      '    for item in items:',
      '        if capacity >= item.weight:',
      '            total_value += item.value',
      '            capacity -= item.weight',
      '        else:',
      '            total_value += item.value * (capacity / item.weight)',
      '            break',
      '    return total_value',
    ],
  },
  huffman: {
    python: [
      'def build_huffman_tree(chars, freqs):',
      '    heap = [Node(c, f) for c, f in zip(chars, freqs)]',
      '    heapify(heap)',
      '    while len(heap) > 1:',
      '        left = heappop(heap)',
      '        right = heappop(heap)',
      '        parent = Node(None, left.freq + right.freq)',
      '        parent.left, parent.right = left, right',
      '        heappush(heap, parent)',
      '    return heap[0]',
    ],
  },
  jobSequencing: {
    python: [
      'def job_sequencing(jobs, max_deadline):',
      '    jobs.sort(key=lambda x: x.profit, reverse=True)',
      '    slots = [None] * max_deadline',
      '    total_profit = 0',
      '    for job in jobs:',
      '        for slot in range(job.deadline - 1, -1, -1):',
      '            if slots[slot] is None:',
      '                slots[slot] = job.id',
      '                total_profit += job.profit',
      '                break',
      '    return total_profit',
    ],
  },

  /* ── BST / Trees ───────────────────────────────────────────────────── */
  bst: {
    python: [
      'def bst_search(root, target):',
      '    while root:',
      '        if target == root.val:',
      '            return root',
      '        root = root.left if target < root.val else root.right',
      '    return None',
    ],
  },
  avl: {
    python: [
      'def avl_insert(root, key):',
      '    if not root:',
      '        return Node(key)',
      '    if key < root.key:',
      '        root.left = avl_insert(root.left, key)',
      '    else:',
      '        root.right = avl_insert(root.right, key)',
      '    root.height = 1 + max(height(root.left), height(root.right))',
      '    balance = get_balance(root)',
      '    return rebalance(root, balance)',
    ],
  },
  heap: {
    python: [
      'def sift_up(heap, i):',
      '    parent = (i - 1) // 2',
      '    while i > 0 and heap[i] < heap[parent]:',
      '        heap[i], heap[parent] = heap[parent], heap[i]',
      '        i = parent',
      '        parent = (i - 1) // 2',
    ],
  },
  trieInsert: {
    python: [
      'def trie_insert(root, word):',
      '    node = root',
      '    for ch in word:',
      '        if ch not in node.children:',
      '            node.children[ch] = TrieNode()',
      '        node = node.children[ch]',
      '    node.is_end = True',
    ],
  },
  trieSearch: {
    python: [
      'def trie_search(root, word):',
      '    node = root',
      '    for ch in word:',
      '        if ch not in node.children:',
      '            return False',
      '        node = node.children[ch]',
      '    return node.is_end',
    ],
  },
  wordDictionary: {
    python: [
      'def search_with_wildcard(node, word, i):',
      '    if i == len(word):',
      '        return node.is_end',
      '    ch = word[i]',
      '    if ch == ".":',
      '        return any(search_with_wildcard(child, word, i + 1)',
      '                   for child in node.children.values())',
      '    if ch not in node.children:',
      '        return False',
      '    return search_with_wildcard(node.children[ch], word, i + 1)',
    ],
  },
  triePrefix: {
    python: [
      'def starts_with(root, prefix):',
      '    node = root',
      '    for ch in prefix:',
      '        if ch not in node.children:',
      '            return False',
      '        node = node.children[ch]',
      '    return True',
    ],
  },
  autocomplete: {
    python: [
      'def autocomplete(root, prefix):',
      '    node = root',
      '    for ch in prefix:',
      '        if ch not in node.children:',
      '            return []',
      '        node = node.children[ch]',
      '    words = []',
      '    def collect(node, path):',
      '        if node.is_end:',
      '            words.append(prefix + path)',
      '        for ch, child in node.children.items():',
      '            collect(child, path + ch)',
      '    collect(node, "")',
      '    return words',
    ],
  },
};

/**
 * Key aliases — some category pages use different algorithm ids than the
 * canonical snippet keys above. Alias them so the debugger code panel never
 * falls back to the empty "Reference code coming soon" state.
 */
Object.assign(FALLBACK_SNIPPETS, {
  rotation: FALLBACK_SNIPPETS.rotateArray,
  fibonacciDP: FALLBACK_SNIPPETS.fibonacci_dp,
  knapsack01: FALLBACK_SNIPPETS.knapsack,
  huffmanCoding: FALLBACK_SNIPPETS.huffman,
  jobScheduling: FALLBACK_SNIPPETS.jobSequencing,
  trie: FALLBACK_SNIPPETS.trieInsert,
});
