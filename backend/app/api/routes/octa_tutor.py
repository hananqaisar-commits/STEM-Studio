import os
import json
import logging
import re
from typing import List, Dict, Any, Tuple, Optional
import httpx
from fastapi import APIRouter, HTTPException, Request, status

try:
    from backend.app.api.schemas import (
        OctaTutorRequest,
        OctaTutorResponse,
        OctaTutorFunctionCall,
        OctaTutorTestRequest,
        OctaTutorTestResponse,
    )
    from backend.app.core.config import get_settings
    from backend.app.core.rate_limit import RateLimiter
except ModuleNotFoundError:
    from app.api.schemas import (
        OctaTutorRequest,
        OctaTutorResponse,
        OctaTutorFunctionCall,
        OctaTutorTestRequest,
        OctaTutorTestResponse,
    )
    from app.core.config import get_settings
    from app.core.rate_limit import RateLimiter

router = APIRouter(prefix="/api/octa-tutor", tags=["Octa AI Tutor"])
logger = logging.getLogger("octa_tutor")
tutor_rate_limiter = RateLimiter(max_requests=20, window_seconds=60)

DEFAULT_DASHSCOPE_ENDPOINT = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"

# ─────────────────────────────────────────────────────────────────────────────
# ALGORITHM ALIAS MAP — Fuzzy name resolution for natural conversation
# Maps common names, abbreviations, and informal references to (categoryId, topicId)
# ─────────────────────────────────────────────────────────────────────────────

ALGORITHM_ALIASES: Dict[str, Tuple[str, Optional[str]]] = {
    # ── Sorting ──
    "bubble sort": ("sorting", "bubble"), "bubble": ("sorting", "bubble"),
    "selection sort": ("sorting", "selection"), "selection": ("sorting", "selection"),
    "insertion sort": ("sorting", "insertion"), "insertion": ("sorting", "insertion"),
    "merge sort": ("sorting", "merge"), "merge": ("sorting", "merge"),
    "quick sort": ("sorting", "quick"), "quicksort": ("sorting", "quick"), "quick": ("sorting", "quick"),
    "heap sort": ("sorting", "heap"), "heapsort": ("sorting", "heap"),
    "shell sort": ("sorting", "shell"), "shell": ("sorting", "shell"),
    "counting sort": ("sorting", "counting"), "counting": ("sorting", "counting"),
    "radix sort": ("sorting", "radix"), "radix": ("sorting", "radix"),
    "bucket sort": ("sorting", "bucket"), "bucket": ("sorting", "bucket"),
    "sorting": ("sorting", None), "sorting algorithms": ("sorting", None),

    # ── Arrays ──
    "linear search": ("arrays", "linearSearch"),
    "kadane": ("arrays", "kadane"), "kadane's": ("arrays", "kadane"), "kadane's algorithm": ("arrays", "kadane"), "maximum subarray": ("arrays", "kadane"),
    "two pointer": ("arrays", "twoPointer"), "two pointers": ("arrays", "twoPointer"),
    "sliding window": ("arrays", "slidingWindow"),
    "array rotation": ("arrays", "rotation"), "rotation": ("arrays", "rotation"),
    "prefix sum": ("arrays", "prefixSum"),
    "arrays": ("arrays", None), "array": ("arrays", None),

    # ── Strings ──
    "palindrome": ("strings", "palindrome"), "palindrome check": ("strings", "palindrome"),
    "anagram": ("strings", "anagram"), "anagram check": ("strings", "anagram"),
    "string reversal": ("strings", "reverse"), "reverse string": ("strings", "reverse"),
    "frequency count": ("strings", "frequency"), "character frequency": ("strings", "frequency"),
    "strings": ("strings", None), "string": ("strings", None),

    # ── Linked List ──
    "singly linked list": ("linkedList", "singly"), "singly": ("linkedList", "singly"),
    "reverse linked list": ("linkedList", "reverse"),
    "middle node": ("linkedList", "middleNode"), "find middle": ("linkedList", "middleNode"),
    "cycle detection": ("linkedList", "detectCycle"), "floyd": ("linkedList", "detectCycle"), "floyd's": ("linkedList", "detectCycle"), "detect cycle": ("linkedList", "detectCycle"),
    "doubly linked list": ("linkedList", "doubly"), "doubly": ("linkedList", "doubly"),
    "circular linked list": ("linkedList", "circular"),
    "linked list": ("linkedList", None), "linkedlist": ("linkedList", None), "ll": ("linkedList", None),

    # ── Stack & Queue ──
    "stack": ("stackQueue", "stack"), "lifo": ("stackQueue", "stack"),
    "queue": ("stackQueue", "queue"), "fifo": ("stackQueue", "queue"),
    "valid parentheses": ("stackQueue", "validParentheses"), "parentheses": ("stackQueue", "validParentheses"),
    "min stack": ("stackQueue", "minStack"),
    "postfix": ("stackQueue", "postfixEval"), "rpn": ("stackQueue", "postfixEval"),
    "daily temperatures": ("stackQueue", "dailyTemperatures"),
    "trapping rain water": ("stackQueue", "trappingRainWater"), "rain water": ("stackQueue", "trappingRainWater"),
    "largest rectangle": ("stackQueue", "largestRectangle"), "histogram": ("stackQueue", "largestRectangle"),
    "circular queue": ("stackQueue", "circularQueue"),
    "sliding window maximum": ("stackQueue", "slidingWindow"), "sliding window max": ("stackQueue", "slidingWindow"),
    "task scheduler": ("stackQueue", "taskScheduler"),
    "rotting oranges": ("stackQueue", "rottingOranges"),
    "stack and queue": ("stackQueue", None), "stack queue": ("stackQueue", None), "stacks": ("stackQueue", None), "queues": ("stackQueue", None),

    # ── Binary Search ──
    "binary search": ("binarySearch", "binarySearch"), "classic binary search": ("binarySearch", "binarySearch"),
    "lower bound": ("binarySearch", "lowerBound"),
    "upper bound": ("binarySearch", "upperBound"),
    "search rotated array": ("binarySearch", "searchRotatedArray"), "rotated array": ("binarySearch", "searchRotatedArray"),
    "peak element": ("binarySearch", "findPeakElement"), "find peak": ("binarySearch", "findPeakElement"),

    # ── Hash Maps ──
    "two sum": ("hashMaps", "twoSum"), "2sum": ("hashMaps", "twoSum"),
    "duplicate detect": ("hashMaps", "duplicateDetect"), "find duplicates": ("hashMaps", "duplicateDetect"),
    "frequency map": ("hashMaps", "frequencyMap"),
    "subarray sum": ("hashMaps", "subarraySum"),
    "hash map": ("hashMaps", None), "hashmap": ("hashMaps", None), "hash maps": ("hashMaps", None),

    # ── Trees (BST) ──
    "bst": ("bst", "bst"), "binary search tree": ("bst", "bst"), "binary tree": ("bst", "bst"),
    "avl": ("bst", "avl"), "avl tree": ("bst", "avl"), "self balancing tree": ("bst", "avl"),
    "red black tree": ("bst", "rbt"), "red-black": ("bst", "rbt"), "rbt": ("bst", "rbt"),
    "heap": ("bst", "heap"), "binary heap": ("bst", "heap"), "priority queue": ("bst", "heap"),
    "segment tree": ("bst", "segTree"), "seg tree": ("bst", "segTree"),
    "trie tree": ("bst", "trie"), "prefix tree": ("bst", "trie"),
    "tree": ("bst", None), "trees": ("bst", None),

    # ── Graphs ──
    "bfs": ("graph", "bfs"), "breadth first search": ("graph", "bfs"), "breadth first": ("graph", "bfs"),
    "dfs": ("graph", "dfs"), "depth first search": ("graph", "dfs"), "depth first": ("graph", "dfs"),
    "dijkstra": ("graph", "dijkstra"), "dijkstra's": ("graph", "dijkstra"), "shortest path": ("graph", "dijkstra"), "dijkstra's algorithm": ("graph", "dijkstra"),
    "bellman ford": ("graph", "bellmanFord"), "bellman-ford": ("graph", "bellmanFord"),
    "prim": ("graph", "prim"), "prim's": ("graph", "prim"), "prim's algorithm": ("graph", "prim"),
    "kruskal": ("graph", "kruskal"), "kruskal's": ("graph", "kruskal"),
    "a star": ("graph", "aStar"), "a*": ("graph", "aStar"), "astar": ("graph", "aStar"), "pathfinding": ("graph", "aStar"),
    "topological sort": ("graph", "topoSort"), "topo sort": ("graph", "topoSort"), "kahn": ("graph", "topoSort"), "kahn's": ("graph", "topoSort"),
    "graph": ("graph", None), "graphs": ("graph", None),
    "minimum spanning tree": ("graph", "prim"), "mst": ("graph", "prim"),

    # ── Recursion ──
    "factorial": ("recursion", "factorial"),
    "fibonacci": ("recursion", "fibonacci"), "fib": ("recursion", "fibonacci"),
    "power": ("recursion", "power"), "exponentiation": ("recursion", "power"),
    "array sum": ("recursion", "arraySum"),
    "tower of hanoi": ("recursion", "towerOfHanoi"), "hanoi": ("recursion", "towerOfHanoi"),
    "recursion": ("recursion", None), "recursive": ("recursion", None),

    # ── Backtracking ──
    "subsets": ("backtracking", "subsets"),
    "permutations": ("backtracking", "permutations"), "permutation": ("backtracking", "permutations"),
    "n queens": ("backtracking", "nQueens"), "n-queens": ("backtracking", "nQueens"), "nqueens": ("backtracking", "nQueens"), "queens": ("backtracking", "nQueens"),
    "combination sum": ("backtracking", "combinationSum"),
    "backtracking": ("backtracking", None), "backtrack": ("backtracking", None),

    # ── Greedy ──
    "activity selection": ("greedy", "activitySelection"),
    "fractional knapsack": ("greedy", "fractionalKnapsack"), "knapsack greedy": ("greedy", "fractionalKnapsack"),
    "job scheduling": ("greedy", "jobScheduling"),
    "huffman": ("greedy", "huffmanCoding"), "huffman coding": ("greedy", "huffmanCoding"),
    "greedy": ("greedy", None), "greedy algorithm": ("greedy", None),

    # ── Dynamic Programming ──
    "fibonacci dp": ("dp", "fibonacciDP"), "fib dp": ("dp", "fibonacciDP"),
    "coin change": ("dp", "coinChange"),
    "house robber": ("dp", "houseRobber"),
    "0/1 knapsack": ("dp", "knapsack01"), "knapsack": ("dp", "knapsack01"), "01 knapsack": ("dp", "knapsack01"),
    "lcs": ("dp", "lcs"), "longest common subsequence": ("dp", "lcs"),
    "lis": ("dp", "lis"), "longest increasing subsequence": ("dp", "lis"),
    "edit distance": ("dp", "editDistance"), "levenshtein": ("dp", "editDistance"),
    "unique paths": ("dp", "uniquePaths"),
    "dynamic programming": ("dp", None), "dp": ("dp", None),

    # ── Trie ──
    "trie insert": ("trie", "trieInsert"),
    "trie search": ("trie", "trieSearch"),
    "prefix search": ("trie", "triePrefix"),
    "word dictionary": ("trie", "wordDictionary"),
    "autocomplete": ("trie", "autocomplete"),
    "trie": ("trie", None),

    # ── Complexity ──
    "complexity": ("complexity", None), "big o": ("complexity", None), "complexity analysis": ("complexity", None),
    "time complexity": ("complexity", "time"), "space complexity": ("complexity", "space"),
    "asymptotic": ("complexity", "notations"), "asymptotic notations": ("complexity", "notations"),
    "master theorem": ("complexity", "recursion"),
    "amortized": ("complexity", "amortized"), "amortized analysis": ("complexity", "amortized"),
}


def resolve_algorithm_name(text: str) -> Optional[Tuple[str, Optional[str]]]:
    """Fuzzy-match an algorithm name from natural language text."""
    text_lower = text.lower().strip()
    # Direct match first
    if text_lower in ALGORITHM_ALIASES:
        return ALGORITHM_ALIASES[text_lower]
    # Substring search — find the longest matching alias in the text
    best_match = None
    best_len = 0
    for alias, ids in ALGORITHM_ALIASES.items():
        if alias in text_lower and len(alias) > best_len:
            best_match = ids
            best_len = len(alias)
    return best_match


# ─────────────────────────────────────────────────────────────────────────────
# INTENT-BASED FALLBACK ENGINE
# Used when no API key is configured. Classifies intent from natural language.
# ─────────────────────────────────────────────────────────────────────────────

NAVIGATE_PATTERNS = [
    "open", "show", "go to", "take me", "navigate", "switch to", "let's do",
    "learn", "teach me", "want to see", "visualize", "run",
    "dikhao", "kholna", "kholein", "chalein", "seekhna", "dekhao", "dekhna",
    "打开", "显示", "转到", "我想看",
]

PLAYBACK_PATTERNS = [
    "play", "start", "begin", "run", "resume",
    "pause", "stop", "wait", "hold",
    "next step", "step forward", "next", "forward", "aage",
    "reset", "restart", "start over", "again", "phir se",
    "chalao", "shuru", "ruko", "band karo", "agla",
    "播放", "开始", "暂停", "停止", "下一步", "重置",
]

EXPLAIN_PATTERNS = [
    "explain", "what is", "what's", "how does", "how do", "why",
    "tell me", "teach", "describe", "help me understand", "what happens",
    "step", "current step", "this step",
    "samjhao", "samjha do", "batao", "kya hai", "kya ho raha", "kaise",
    "解释", "什么是", "为什么", "怎么", "这一步",
]

COMPARE_PATTERNS = [
    "compare", "vs", "versus", "difference", "which is better",
    "comparison", "similarities", "pros and cons", "trade off",
    "farq", "muqabla", "konsa behtar",
    "比较", "区别", "哪个好",
]

SPEED_PATTERNS = [
    "speed", "slow", "fast", "faster", "slower", "speed up", "slow down",
    "too fast", "too slow", "quickly", "rapid",
    "tez", "dheere", "raftaar", "speed kam", "speed zyada",
    "快", "慢", "速度", "快一点", "慢一点",
]

THEME_PATTERNS = [
    "dark", "light", "theme", "mode", "dark mode", "light mode",
    "night", "bright", "color scheme", "eyes hurt",
    "andhera", "roshni", "dark karo", "light karo",
    "暗", "亮", "主题", "深色", "浅色",
]

DEBUGGER_PATTERNS = [
    "debugger", "code panel", "code", "debug", "code view",
    "hide code", "show code", "hide debugger", "show debugger",
    "code hatao", "code dikhao",
    "调试", "代码", "显示代码", "隐藏代码",
]

QUIZ_PATTERNS = [
    "quiz", "test", "practice", "questions", "test me", "challenge",
    "exercise", "assessment", "evaluate",
    "quiz do", "sawaal", "imtihaan", "test karo",
    "测验", "考试", "练习", "测试",
]

API_HELP_PATTERNS = [
    "api", "api key", "connect", "setup", "configure", "settings",
    "how to connect", "byok", "bring your own", "model",
    "openai key", "anthropic key", "api lagana", "connection",
    "api密钥", "设置", "连接",
]

RECOMMEND_PATTERNS = [
    "what next", "what should i", "recommend", "suggest", "where to start",
    "beginner", "learning path", "what to learn", "after this",
    "next topic", "guide me", "roadmap",
    "kya seekhein", "aage kya", "shuru kahan se", "suggest karo",
    "推荐", "建议", "接下来", "学什么",
]

FULLSCREEN_PATTERNS = [
    "fullscreen", "full screen", "bigger", "maximize", "enlarge",
    "exit fullscreen", "smaller", "minimize",
    "bada karo", "chota karo", "poori screen",
    "全屏", "放大", "缩小",
]

INPUT_PATTERNS = [
    "use array", "input", "try with", "set values", "set array",
    "custom input", "use these numbers", "random",
    "array do", "yeh values", "yeh numbers",
    "输入", "数组", "使用",
]

GREETING_PATTERNS = [
    "hi", "hello", "hlo", "hey", "yo", "howdy", "sup",
    "who are you", "what can you do", "help", "how to use",
    "salam", "kya hal", "kaisa hai", "kaisa ho", "kaise ho", "kya haal", "kaise hain", "kese ho", "aoa",
    "你好", "你是谁", "帮助",
]

REALWORLD_PATTERNS = [
    "real world", "real life", "real-world", "application", "applications",
    "where is it used", "use case", "use cases", "practical use", "used in",
    "kahan use hota", "asli zindagi", "real world mein",
    "实际应用", "应用场景",
]


def classify_intent(text: str) -> str:
    """Classify user message intent using multi-language pattern matching."""
    text_lower = text.lower().strip()

    # Check patterns in priority order
    intent_map = [
        ("recommend", RECOMMEND_PATTERNS),
        ("real_world", REALWORLD_PATTERNS),
        ("navigate", NAVIGATE_PATTERNS),
        ("compare", COMPARE_PATTERNS),
        ("speed", SPEED_PATTERNS),
        ("input", INPUT_PATTERNS),
        ("playback", PLAYBACK_PATTERNS),
        ("fullscreen", FULLSCREEN_PATTERNS),
        ("theme", THEME_PATTERNS),
        ("debugger", DEBUGGER_PATTERNS),
        ("quiz", QUIZ_PATTERNS),
        ("api_help", API_HELP_PATTERNS),
        ("greeting", GREETING_PATTERNS),
        ("explain", EXPLAIN_PATTERNS),
    ]

    # Check if user mentions a specific algorithm — strong signal for navigate
    alg_match = resolve_algorithm_name(text)
    has_algorithm_mention = alg_match is not None

    for intent, patterns in intent_map:
        for pattern in patterns:
            # For short/ASCII patterns, enforce word boundary so 'hi' doesn't match 'hide'
            if pattern.isalnum() and len(pattern) <= 3:
                matched = bool(re.search(rf"\b{re.escape(pattern)}\b", text_lower))
            else:
                matched = pattern in text_lower

            if matched:
                if has_algorithm_mention and intent in ("navigate", "explain", "playback"):
                    nav_verbs = ["open", "show", "go", "take", "switch", "navigate", "dikhao", "kholna", "打开"]
                    if any(v in text_lower for v in nav_verbs):
                        return "navigate"
                return intent

    if has_algorithm_mention:
        return "navigate"

    return "general"


def get_real_world_explanation(alg_name: str, category: str) -> str:
    """Generate detailed real-world application breakdown for algorithms."""
    alg_lower = alg_name.lower()
    cat_lower = (category or "").lower()

    if "palindrome" in alg_lower or "string" in cat_lower:
        return (
            f"**Real-World Applications of {alg_name}:** 🌐\n\n"
            f"1. **Bioinformatics & Genetics**: DNA sequence analysis — finding palindromic sequences where restriction enzymes cut DNA.\n"
            f"2. **Natural Language Processing (NLP)**: Spell checkers, pattern matching, and text processing algorithms.\n"
            f"3. **Data Integrity & Cryptography**: Symmetric packet verification and cryptographic hash checks.\n"
            f"4. **Text Editors & Search Engines**: Fast pattern symmetry checks using two pointers."
        )
    elif "hanoi" in alg_lower or "recursion" in cat_lower:
        return (
            f"**Real-World Applications of {alg_name}:** 🗼\n\n"
            f"1. **Call Stack & Compiler Design**: Recursive function execution and stack frame allocation in operating systems.\n"
            f"2. **Backup & Disaster Recovery**: Moving multi-tiered data storage volumes without overwriting active data.\n"
            f"3. **Robotics & Automated Warehouses**: Moving stacked cargo items between limited holding pegs or bays."
        )
    elif "graph" in cat_lower or "dijkstra" in alg_lower or "bfs" in alg_lower or "dfs" in alg_lower:
        return (
            f"**Real-World Applications of {alg_name}:** 🗺️\n\n"
            f"1. **GPS & Navigation Systems**: Finding shortest routes on Google Maps / Apple Maps.\n"
            f"2. **Social Networks**: LinkedIn / Facebook friend recommendation engines ('people you may know').\n"
            f"3. **Network Packet Routing**: OSPF protocol routing internet traffic between routers."
        )
    elif "sort" in alg_lower or "sorting" in cat_lower:
        return (
            f"**Real-World Applications of {alg_name}:** 📊\n\n"
            f"1. **E-Commerce**: Sorting millions of products by price, rating, or relevance.\n"
            f"2. **Database Systems**: Indexing and quick retrieval in SQL/NoSQL databases.\n"
            f"3. **3D Graphics Rendering**: Sorting polygons by depth (Z-buffer algorithm)."
        )
    else:
        return (
            f"**Real-World Applications of {alg_name}:** 🚀\n\n"
            f"1. **High-Performance Software**: Optimizing time and memory efficiency in production backend APIs.\n"
            f"2. **Database Querying**: Fast searching, indexing, and data filtering.\n"
            f"3. **System Engineering**: Operating system task scheduling and memory management."
        )


def get_conceptual_explanation(alg_name: str, topic_id: str = "") -> str:
    """Generate clear, natural conceptual explanations for DSA topics across all 15 categories."""
    name_lower = alg_name.lower()
    t_id = (topic_id or "").lower()

    if "hanoi" in name_lower or t_id == "towerofhanoi":
        return (
            "**Tower of Hanoi** 🗼\n\n"
            "Tower of Hanoi is a classic mathematical puzzle and recursive algorithm!\n\n"
            "• **The Setup**: You have 3 pegs (Source, Auxiliary, Target) and N disks of different sizes stacked on the Source peg in decreasing order of size.\n"
            "• **The Goal**: Move all N disks from the Source peg to the Target peg.\n"
            "• **The Rules**:\n"
            "  1. Move only one disk at a time.\n"
            "  2. Only the top disk of a peg can be moved.\n"
            "  3. Never place a larger disk on top of a smaller disk.\n\n"
            "• **How Algorithm Works Recursively**:\n"
            "  - Move top N-1 disks from Source → Auxiliary peg.\n"
            "  - Move the N-th (largest) disk from Source → Target peg.\n"
            "  - Move the N-1 disks from Auxiliary → Target peg.\n\n"
            "• **Complexity**: Minimum moves = 2^n - 1. Time Complexity: O(2^n), Space: O(n) (recursion stack)."
        )
    elif "nqueens" in name_lower or "n-queens" in name_lower or t_id == "nqueens":
        return (
            "**N-Queens Problem** 👑\n\n"
            "N-Queens is a classic Backtracking algorithm problem!\n\n"
            "• **The Challenge**: Place N chess queens on an N×N chessboard so that no two queens attack each other.\n"
            "• **Rule**: Two queens attack if they share the same row, column, or diagonal.\n"
            "• **Backtracking Logic**: Place one queen per row. For each cell, check if placing a queen is valid. If valid, recursively proceed to the next row. If stuck, backtrack and try the next column!"
        )
    elif "dijkstra" in name_lower or t_id == "dijkstra":
        return (
            "**Dijkstra's Algorithm** 🗺️\n\n"
            "Dijkstra's is a Greedy Graph algorithm used to find the shortest path from a single source node to all other nodes in a weighted graph with non-negative edge weights.\n\n"
            "• **Key Concept**: Maintains tentative distances for all nodes (infinity initially). Uses a Priority Queue (Min-Heap) to pick the closest unvisited node at each step and relaxes its neighbors.\n"
            "• **Time Complexity**: O((V + E) log V) with Min-Heap."
        )
    elif "merge sort" in name_lower or t_id == "merge":
        return (
            "**Merge Sort** 📊\n\n"
            "Merge Sort is a Divide-and-Conquer sorting algorithm!\n\n"
            "• **Process**: Divide array in half recursively until sub-arrays have 1 element, then merge sorted sub-arrays back together in order.\n"
            "• **Time Complexity**: O(N log N) in all cases (Best, Average, Worst).\n"
            "• **Space Complexity**: O(N) extra memory. Stable sort."
        )
    elif "quick sort" in name_lower or t_id == "quick":
        return (
            "**Quick Sort** ⚡\n\n"
            "Quick Sort is an efficient Divide-and-Conquer in-place sorting algorithm!\n\n"
            "• **Process**: Select a 'Pivot' element. Partition array so elements smaller than pivot go left, larger go right. Recursively sort left and right partitions.\n"
            "• **Time Complexity**: Average O(N log N), Worst O(N^2) if pivot selection is bad. Space: O(log N)."
        )
    elif "binary search" in name_lower or t_id == "binarysearch":
        return (
            "**Binary Search** 🔍\n\n"
            "Binary Search efficiently finds a target value in a SORTED array!\n\n"
            "• **How it works**: Compare target with middle element. If match, done! If target is smaller, search left half; if larger, search right half.\n"
            "• **Time Complexity**: O(log N) — exponentially faster than linear O(N) search."
        )
    elif "kadane" in name_lower or t_id == "kadane":
        return (
            "**Kadane's Algorithm** 💡\n\n"
            "Kadane's finds the Maximum Sum Contiguous Subarray in a given 1D array.\n\n"
            "• **Logic**: Iterate through array, keeping track of current max sum. If current sum drops below 0, reset it to 0.\n"
            "• **Time Complexity**: O(N) single-pass algorithm! Space: O(1)."
        )
    elif "avl" in name_lower or t_id == "avl":
        return (
            "**AVL Tree** 🌲\n\n"
            "AVL Tree is a Self-Balancing Binary Search Tree!\n\n"
            "• **Property**: The height difference (Balance Factor = Height(Left) - Height(Right)) for any node is at most -1, 0, or +1.\n"
            "• **Rotations**: Performs Left, Right, Left-Right, or Right-Left rotations when unbalanced.\n"
            "• **Time Complexity**: Guarantees O(log N) search, insertion, and deletion."
        )
    elif "trie" in name_lower or "trie" in t_id:
        return (
            "**Trie (Prefix Tree)** 🔤\n\n"
            "Trie is a tree data structure optimized for fast string retrieval and prefix matching!\n\n"
            "• **Use Cases**: Autocomplete search bars, dictionary lookups, spell checkers.\n"
            "• **Time Complexity**: O(L) where L is the length of the search word."
        )
    elif "lis" in name_lower or t_id == "lis":
        return (
            "**Longest Increasing Subsequence (LIS)** 📈\n\n"
            "LIS finds the length of the longest subsequence in an array such that all elements are strictly increasing.\n\n"
            "• **DP Approach**: dp[i] stores LIS ending at index i. Time: O(N^2) or O(N log N) with Binary Search."
        )
    elif "trapping" in name_lower or "rain" in name_lower or "water" in name_lower or t_id == "trappingrainwater":
        return (
            "**Trapping Rain Water Algorithm** 🌊\n\n"
            "The Trapping Rain Water problem calculates how much water is trapped between elevation bars after raining.\n\n"
            "• **Core Intuition**:\n"
            "  - The amount of water above bar `i` is bounded by the highest bar to its left and the highest bar to its right.\n"
            "  - Formula: `Water[i] = max(0, min(max_left[i], max_right[i]) - height[i])`.\n\n"
            "• **Key Approaches**:\n"
            "  1. **Two Pointer Technique (Optimal)**: Maintain `left` and `right` pointers with `left_max` and `right_max`. Move the pointer with the smaller boundary inward. Time: O(N), Space: O(1).\n"
            "  2. **Monotonic Stack**: Store bar indices in a stack of decreasing heights. When encountering a taller bar, pop elements to compute trapped water volume layer-by-layer. Time: O(N), Space: O(N).\n"
            "  3. **Recursive / Divide & Conquer**: Identify peak height index in subarray and recursively solve left and right segments.\n\n"
            "• **Complexity Breakdown**:\n"
            "  - Time Complexity: **O(N)** single-pass.\n"
            "  - Space Complexity: **O(1)** using two pointers."
        )
    else:
        return (
            f"**{alg_name} Concept Guide** 💡\n\n"
            f"{alg_name} is a fundamental Data Structure & Algorithm topic.\n\n"
            f"• **Core Intuition**: Designed to process, transform, search, or optimize data efficiently.\n"
            f"• **How to Master It**:\n"
            f"  1. Understand the problem statement and constraints.\n"
            f"  2. Identify base cases, invariants, and edge conditions.\n"
            f"  3. Trace through sample inputs step-by-step.\n"
            f"  4. Compare time and space complexity trade-offs.\n\n"
            f"• **Interactive Learning**: Use the STEM Studio controls above to watch real-time step execution, code lines, and variable updates!"
        )


def generate_fallback_response(req_data: OctaTutorRequest) -> OctaTutorResponse:
    """Intelligent intent-based fallback response for offline / unconfigured API states."""
    msg = req_data.message or ""
    msg_lower = msg.lower().strip()

    # Extract algorithm mentioned in user prompt if present
    alg_match = resolve_algorithm_name(msg)
    topic_id = ""
    if alg_match:
        cat_id, topic_id_matched = alg_match
        topic_id = topic_id_matched or ""
        alg_name = (topic_id or cat_id).replace("_", " ").replace("-", " ").title()
        if topic_id == "towerOfHanoi":
            alg_name = "Tower of Hanoi"
        elif topic_id == "palindrome":
            alg_name = "Palindrome Check"
        elif topic_id == "avl":
            alg_name = "AVL Tree"
    else:
        alg_name = req_data.algorithm_name or "this algorithm"

    step_num = (req_data.current_step_index + 1) if req_data.total_steps > 0 else 1
    total_steps = req_data.total_steps or 1
    step_desc = req_data.current_step_description or "evaluating elements"

    intent = classify_intent(msg)
    function_calls: List[OctaTutorFunctionCall] = []
    mascot_expr = "happy"

    # ── GREETING ──
    if intent == "greeting":
        if any(w in msg_lower for w in ["kaisa", "kaise", "kese", "haal", "hlo", "bhai", "kya haal", "kaisa ho"]):
            reply = "Main bilkul theek hoon! Aap kaise hain? Aaj konsa algorithm seekhein? 🐙"
        elif any(char for char in msg_lower if '\u4e00' <= char <= '\u9fff'):
            reply = "您好！我很好，谢谢！今天想学习什么算法呢？ 🐙"
        else:
            reply = (
                f"Hello! I'm Octa Tutor, your personal DSA teaching assistant! 🐙\n\n"
                f"Here's what I can do for you:\n"
                f"• Navigate: Say 'open merge sort' or 'show me graphs'\n"
                f"• Explain: Ask 'what is {alg_name}?' or 'explain step {step_num}'\n"
                f"• Control: Say 'play', 'pause', 'next step', 'slow down'\n"
                f"• Compare: Ask 'compare bubble sort vs quick sort'\n"
                f"• Quiz: Say 'test me' or 'generate quiz'\n"
                f"• Theme: Say 'dark mode' or 'light mode'\n"
                f"• Voice: Use the 🎤 mic button (English, Urdu, Chinese)\n"
                f"• API Setup: Ask 'how do I connect my API?'\n\n"
                f"Currently viewing: {alg_name} (step {step_num}/{total_steps})"
            )
        mascot_expr = "happy"

    # ── REAL WORLD APPLICATIONS ──
    elif intent == "real_world":
        reply = get_real_world_explanation(alg_name, req_data.category)
        mascot_expr = "reading"

    # ── NAVIGATE ──
    elif intent == "navigate":
        if alg_match:
            cat_id, topic_id = alg_match
            function_calls.append(OctaTutorFunctionCall(
                name="navigate_to_algorithm",
                args={"category_id": cat_id, "topic_id": topic_id or ""}
            ))
            # If user also asked to run/visualize/play
            if any(w in msg_lower for w in ["play", "run", "visualize", "step", "chalao"]):
                function_calls.append(OctaTutorFunctionCall(name="control_playback", args={"action": "play"}))
                reply = f"Opening {alg_name} and starting visualization step-by-step for you! 🚀"
            else:
                reply = f"Taking you to {alg_name} right now! 🚀"
            mascot_expr = "excited"
        else:
            reply = (
                f"I'd love to help you navigate! I know 110+ algorithms across 15 categories.\n"
                f"Try saying: 'open AVL tree', 'show me graphs', or 'teach me merge sort'."
            )
            mascot_expr = "helping"

    # ── PLAYBACK ──
    elif intent == "playback":
        action = "play"
        if any(w in msg_lower for w in ["pause", "stop", "wait", "hold", "ruko", "band", "暂停", "停止"]):
            action = "pause"
        elif any(w in msg_lower for w in ["next", "step", "forward", "aage", "agla", "下一步"]):
            action = "step_forward"
        elif any(w in msg_lower for w in ["reset", "restart", "over", "again", "phir", "重置"]):
            action = "reset"

        # If an algorithm was specified (e.g. "run palindrome and visualize me")
        if alg_match:
            cat_id, topic_id = alg_match
            function_calls.append(OctaTutorFunctionCall(
                name="navigate_to_algorithm",
                args={"category_id": cat_id, "topic_id": topic_id or ""}
            ))

        function_calls.append(OctaTutorFunctionCall(name="control_playback", args={"action": action}))
        action_text = {"play": "Playing", "pause": "Pausing", "step_forward": "Moving to next step", "reset": "Resetting"}
        reply = f"{action_text.get(action, 'Controlling')} {alg_name} visualization for you! ▶️"
        mascot_expr = "excited"

    # ── QUIZ ──
    elif intent == "quiz":
        difficulty = "medium"
        if any(w in msg_lower for w in ["easy", "simple", "basic", "aasan"]):
            difficulty = "easy"
        elif any(w in msg_lower for w in ["hard", "difficult", "tough", "challenge", "mushkil"]):
            difficulty = "hard"

        # If user specified an algorithm (e.g., "quiz lo mera for Tower of hanoi")
        if alg_match:
            cat_id, topic_id = alg_match
            function_calls.append(OctaTutorFunctionCall(
                name="navigate_to_algorithm",
                args={"category_id": cat_id, "topic_id": topic_id or ""}
            ))

        function_calls.append(OctaTutorFunctionCall(name="generate_quiz", args={"count": 5, "difficulty": difficulty}))
        reply = f"Awesome! Creating a {difficulty} practice quiz on {alg_name} right now! 📝"
        mascot_expr = "review"

    # ── SPEED ──
    elif intent == "speed":
        if any(w in msg_lower for w in ["slow", "dheere", "慢"]):
            function_calls.append(OctaTutorFunctionCall(name="set_speed", args={"speed": 0.5}))
            reply = "Slowing down the visualization so you can follow each step clearly! 🐢"
        else:
            function_calls.append(OctaTutorFunctionCall(name="set_speed", args={"speed": 2.0}))
            reply = "Speeding up! Let me know if it's still too fast or slow. ⚡"
        mascot_expr = "happy"

    # ── INPUT ──
    elif intent == "input":
        numbers = re.findall(r'\d+', msg)
        if numbers:
            values = [int(n) for n in numbers[:20]]
            function_calls.append(OctaTutorFunctionCall(name="set_input", args={"values": values}))
            reply = f"Setting input to [{', '.join(map(str, values))}] and getting ready! 🎯"
        else:
            function_calls.append(OctaTutorFunctionCall(name="set_input", args={"values": [8, 3, 5, 1, 9, 2, 7, 4]}))
            reply = "Using a sample array [8, 3, 5, 1, 9, 2, 7, 4] for you! 🎲"
        mascot_expr = "excited"

    # ── THEME ──
    elif intent == "theme":
        target_mode = "dark" if any(w in msg_lower for w in ["dark", "night", "andhera", "暗", "深色"]) else "light"
        function_calls.append(OctaTutorFunctionCall(name="switch_theme", args={"mode": target_mode}))
        reply = f"Switching to {target_mode} mode for you! {'🌙' if target_mode == 'dark' else '☀️'}"
        mascot_expr = "happy"

    # ── DEBUGGER ──
    elif intent == "debugger":
        visible = not any(w in msg_lower for w in ["hide", "close", "off", "hatao", "remove", "隐藏"])
        function_calls.append(OctaTutorFunctionCall(name="toggle_debugger", args={"visible": visible}))
        reply = f"{'Showing' if visible else 'Hiding'} the code debugger panel! {'👀' if visible else '🙈'}"
        mascot_expr = "happy"

    # ── FULLSCREEN ──
    elif intent == "fullscreen":
        enter = not any(w in msg_lower for w in ["exit", "leave", "close", "small", "minimize", "chota", "缩小"])
        function_calls.append(OctaTutorFunctionCall(name="toggle_fullscreen", args={"enter": enter}))
        reply = f"{'Entering' if enter else 'Exiting'} fullscreen mode! {'🖥️' if enter else '📱'}"
        mascot_expr = "excited"

    # ── COMPARE ──
    elif intent == "compare":
        reply = (
            f"Great question! Here's a quick comparison framework for algorithms:\n\n"
            f"When comparing any two algorithms, consider:\n"
            f"• **Time Complexity**: Best, average, and worst case\n"
            f"• **Space Complexity**: In-place vs extra memory\n"
            f"• **Stability**: Does it preserve equal element order?\n"
            f"• **Use Cases**: When is each one preferred?\n\n"
            f"To get a detailed comparison, connect your AI API key in Settings ⚙️ "
            f"and ask me 'compare X vs Y' — I'll give you a full breakdown!"
        )
        mascot_expr = "reading"

    # ── API HELP ──
    elif intent == "api_help":
        reply = (
            f"Setting up your AI API is super easy! Here's how:\n\n"
            f"1. Click the **⚙️ Settings** icon in the tutor panel header\n"
            f"2. Choose your **Provider**: OpenAI, Anthropic, OpenRouter, DashScope, or Custom\n"
            f"3. Paste your **API Key** from the provider's dashboard\n"
            f"4. The Base URL and Model Name auto-fill (you can customize them)\n"
            f"5. Click **Test Connection** to verify it works\n\n"
            f"**Recommended providers:**\n"
            f"• **OpenAI**: `gpt-4o-mini` — great balance of quality and speed\n"
            f"• **Anthropic**: `claude-3-haiku` — fast and affordable\n"
            f"• **OpenRouter**: Access 100+ models with one key\n"
            f"• **DashScope**: `qwen-plus` — solid default performance\n\n"
            f"Once connected, I can give you deep AI explanations, comparisons, and personalized help!"
        )
        mascot_expr = "helping"

    # ── RECOMMEND ──
    elif intent == "recommend":
        reply = (
            f"Here's my recommended learning path! 📚\n\n"
            f"**🟢 Beginner:**\n"
            f"1. Complexity Analysis → Understand Big O notation\n"
            f"2. Arrays → Master the foundation\n"
            f"3. Strings → Pattern matching basics\n"
            f"4. Sorting → See algorithms in action\n\n"
            f"**🟡 Intermediate:**\n"
            f"5. Linked Lists → Pointer concepts\n"
            f"6. Stack & Queue → Essential structures\n"
            f"7. Binary Search → Efficient searching\n"
            f"8. Hash Maps → O(1) lookups\n"
            f"9. Recursion → Thinking recursively\n\n"
            f"**🔴 Advanced:**\n"
            f"10. Trees (BST, AVL) → Hierarchical data\n"
            f"11. Graphs (BFS, DFS, Dijkstra) → Network algorithms\n"
            f"12. Backtracking → Decision trees\n"
            f"13. Greedy → Optimization\n"
            f"14. Dynamic Programming → The ultimate skill\n"
            f"15. Trie → String-optimized trees\n\n"
            f"Want me to open any of these? Just say the name!"
        )
        mascot_expr = "happy"

    # ── EXPLAIN / CONCEPT ──
    elif intent in ["explain", "general"]:
        step_match = re.search(r'step\s*(\d+)', msg_lower)
        if req_data.mode == "interactive" and step_match:
            s_idx = int(step_match.group(1))
            reply = (
                f"**Step {s_idx} Execution Trace for {alg_name}:**\n\n"
                f"• **Step Overview**: {step_desc}\n"
                f"• **Live Variables & State**: {req_data.step_data or 'Evaluating active data elements'}\n\n"
                f"Watch the highlighted elements in the visualizer — they show what's being compared or updated right now!"
            )
        else:
            reply = get_conceptual_explanation(alg_name, topic_id)
        mascot_expr = "reading"

    # ── ROMAN URDU catch-all ──
    elif any(w in msg_lower for w in ["kya", "kaise", "batao", "samjhao", "kaam", "yeh", "kia", "hai", "mein", "hlo", "kaisa", "kese"]):
        reply = get_conceptual_explanation(alg_name, topic_id)
        mascot_expr = "helping"

    # ── CHINESE catch-all ──
    elif any(char for char in msg_lower if '\u4e00' <= char <= '\u9fff'):
        reply = (
            f"关于 **{alg_name}** 的概念详解：\n\n"
            f"• 核心思想：以极高效率处理和组织数据。\n"
            f"• 时间复杂度：请在 STEM Studio 可视化窗口中观察实时分布！"
        )
        mascot_expr = "happy"

    else:
        reply = get_conceptual_explanation(alg_name, topic_id)
        mascot_expr = "thinking"

    # ── GENERAL FALLBACK ──
    else:
        reply = (
            f"Great question! 🐙\n\n"
            f"You're currently viewing **{alg_name}** (step {step_num}/{total_steps}).\n"
            f"**Current step:** {step_desc}\n\n"
            f"I can help you:\n"
            f"• Explain any step or concept\n"
            f"• Navigate to a different algorithm\n"
            f"• Control the visualization (play/pause/speed)\n"
            f"• Generate a practice quiz\n"
            f"• Switch themes or toggle the debugger\n\n"
            f"For AI-powered deep explanations, connect your API key in Settings ⚙️"
        )
        mascot_expr = "helping"

    return OctaTutorResponse(
        reply=reply,
        function_calls=function_calls,
        mascot_expression=mascot_expr,
    )


# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT — The "brain training" for the LLM
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT_TEMPLATE = """You are Octa Tutor, a brilliant, masterclass Data Structures & Algorithms (DSA) professor and interactive visualizer teaching assistant for STEM Studio.

═══ YOUR PERSONALITY & STYLE ═══
• Be encouraging, articulate, clear, and pedagogically rich (like ChatGPT or Claude!).
• Use real-world analogies, code snippets, step-by-step logic, and clean Markdown structure.
• Format all responses with clean GitHub Markdown (headers `###`, bold `**text**`, bullet points `•`, monospaced `code`, and fenced code blocks).

═══ LANGUAGE MATCHING (CRITICAL) ═══
ALWAYS respond in the EXACT language the student uses:
• English → English
• Roman Urdu (e.g., "yeh kya hai?") → Roman Urdu
• Native Urdu (اردو) → Native Urdu
• Chinese (中文) → Chinese
• Mixed (e.g., "explain karo") → Match the mix naturally
NEVER default to English if the student is using another language.

═══ ACTIVE TUTOR MODE: {tutor_mode} ═══
• NATURAL CONCEPT MODE ("natural"):
  - Teach like ChatGPT or Claude! Provide high-quality, engaging, natural conversational explanations.
  - Break down algorithm intuition, time/space complexity, core idea, step-by-step logic, edge cases, and real-world applications naturally.
  - Do NOT give fixed or robotic template responses. Answer direct questions thoroughly with deep pedagogical impact!
  - If asked conceptual questions ("what is Tower of Hanoi?", "how does N-Queens work?", "explain Dijkstra"), provide a comprehensive, intuitive, friendly explanation!

• INTERACTIVE STEP MODE ("interactive"):
  - Focus on real-time visualization steps, predicting the next move, evaluating elements at step {step_num}, and guiding playback controls.

═══ CURRENT CONTEXT (LIVE DATA) ═══
• Active Algorithm: {algorithm_name} (ID: {algorithm_id}, Category: {category})
• Timeline: Step {step_num} of {total_steps}
• Step Description: "{current_step_description}"
• Step Data: {step_data}
YOU ALREADY KNOW what the student is looking at — they don't need to tell you.
If they ask "what's happening?" → explain the current step using the data above.

═══ COMPLETE ALGORITHM CATALOG ═══
You can navigate to ANY of these. Use navigate_to_algorithm with the exact category_id and topic_id.

SORTING (category_id: "sorting"):
  bubble, selection, insertion, merge, quick, heap, shell, counting, radix, bucket

ARRAYS (category_id: "arrays"):
  linearSearch, kadane, twoPointer, slidingWindow, rotation, prefixSum

STRINGS (category_id: "strings"):
  palindrome, anagram, reverse, frequency

LINKED LIST (category_id: "linkedList"):
  singly, reverse, middleNode, detectCycle, doubly, circular

STACK & QUEUE (category_id: "stackQueue"):
  stack, queue, validParentheses, minStack, postfixEval, dailyTemperatures,
  simplifyPath, removeAdjacentDuplicates, basicCalculator, decodeString,
  trappingRainWater, largestRectangle, queueViaStacks, stackViaQueues,
  circularQueue, circularDeque, slidingWindow, firstNonRepeating,
  movingAverage, taskScheduler, rottingOranges, dota2Senate

BINARY SEARCH (category_id: "binarySearch"):
  binarySearch, lowerBound, upperBound, searchRotatedArray, findPeakElement

HASH MAPS (category_id: "hashMaps"):
  twoSum, duplicateDetect, frequencyMap, subarraySum

TREES (category_id: "bst"):
  bst, avl, rbt, heap, segTree, trie

GRAPHS (category_id: "graph"):
  bfs, dfs, dijkstra, bellmanFord, prim, kruskal, aStar, topoSort

RECURSION (category_id: "recursion"):
  factorial, fibonacci, power, arraySum, towerOfHanoi

BACKTRACKING (category_id: "backtracking"):
  subsets, permutations, nQueens, combinationSum

GREEDY (category_id: "greedy"):
  activitySelection, fractionalKnapsack, jobScheduling, huffmanCoding

DYNAMIC PROGRAMMING (category_id: "dp"):
  fibonacciDP, coinChange, houseRobber, knapsack01, lcs, lis, editDistance, uniquePaths

TRIE (category_id: "trie"):
  trieInsert, trieSearch, triePrefix, wordDictionary, autocomplete

COMPLEXITY ANALYSIS (category_id: "complexity"):
  why, notations, rules, loops, time, space, cases, recursion, amortized, tradeoffs, ds-operations, comparison

═══ YOUR CAPABILITIES (FUNCTION CALLING) ═══
Use these tools based on the student's INTENT — not specific words:

1. navigate_to_algorithm(category_id, topic_id)
   → When: student wants to see, open, learn, or visualize a different algorithm
   → Examples: "open AVL", "show me graphs", "I want to learn merge sort", "BST dikhao"

2. control_playback(action: "play"|"pause"|"step_forward"|"reset")
   → When: student wants to control the visualization
   → Examples: "play it", "pause", "next step", "start over", "chalao", "ruko"

3. set_speed(speed: number 0.25-4.0)
   → When: student says it's too fast/slow
   → Examples: "slow down", "faster please", "speed 0.5x", "bahut tez hai"

4. set_input(values: number[])
   → When: student wants to try custom data
   → Examples: "use array 5,3,8", "try with these numbers", "random input"

5. switch_theme(mode: "light"|"dark")
   → When: student wants to change the look
   → Examples: "dark mode", "light karo", "eyes hurt", "太亮了"

6. toggle_debugger(visible: boolean)
   → When: student wants to show/hide the code panel
   → Examples: "hide code", "show debugger", "code panel hatao"

7. toggle_fullscreen(enter: boolean)
   → When: student wants bigger/smaller view
   → Examples: "go fullscreen", "exit fullscreen", "maximize"

8. generate_quiz(count: int, difficulty: "easy"|"medium"|"hard")
   → When: student wants to practice
   → Examples: "test me", "quiz do", "hard questions please"

═══ SPECIAL CAPABILITIES (NO TOOL NEEDED) ═══
Answer these from your knowledge — no function call required:

• COMPARE algorithms: "Compare merge sort vs quick sort" → give time/space complexity table, stability, use cases, when to prefer which
• EXPLAIN complexity: "Why is this O(n log n)?" → explain with examples
• REAL-WORLD uses: "Where is BFS used?" → social networks, GPS, web crawling
• LEARNING PATH: "I'm a beginner" → recommend order: Complexity → Arrays → Sorting → ...
• API SETUP: "How do I connect my API?" → guide through Settings panel step by step
• CONCEPT DEEP-DIVE: "What is a balanced tree?" → thorough educational explanation

═══ CONVERSATION EXAMPLES ═══

Student: "yeh kya ho raha hai?"
You: "Abhi {algorithm_name} step {step_num} pe hai. {current_step_description}. Dekhein highlighted elements — yeh woh hain jo compare ya modify ho rahe hain!"

Student: "I don't understand merge sort"
You: "Think of it like sorting a deck of cards — split in half, sort each half, merge back together! Want me to open it and walk through step by step?"
→ call navigate_to_algorithm("sorting", "merge")
→ call control_playback("play")

Student: "compare quick sort and merge sort"
You: [Give detailed table with time/space, stability, in-place, use cases]

Student: "I'm a beginner, where should I start?"
You: [Recommend learning path from Complexity → Arrays → Sorting → ... → DP]

Student: "how do I connect my API?"
You: [Step-by-step guide: Settings ⚙️ → Provider → API Key → Test Connection]

Student: "too fast"
You: "No problem! Slowing it down so you can follow each step."
→ call set_speed(0.5)

═══ OUT OF SCOPE ═══
• Account actions (create account, sign in/out): Politely explain that account management is in the top-right menu.
• Non-DSA topics: Gently redirect to DSA content, but be helpful if it's tangentially related.
"""

TOOLS_SPEC = [
    {
        "type": "function",
        "function": {
            "name": "navigate_to_algorithm",
            "description": "Navigate the user to a specific algorithm's visualizer page in STEM Studio. Use this when the student wants to open, see, learn, or visualize a different algorithm. Always use exact category_id and topic_id from the Algorithm Catalog.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category_id": {
                        "type": "string",
                        "description": "The category route ID (e.g., 'sorting', 'bst', 'graph', 'dp')"
                    },
                    "topic_id": {
                        "type": "string",
                        "description": "The specific topic/algorithm ID within the category (e.g., 'bubble', 'avl', 'dijkstra'). Leave empty to open the category's default view."
                    }
                },
                "required": ["category_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "control_playback",
            "description": "Control the algorithm visualization playback. Use when the student wants to play, pause, step through, or reset the visualization.",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["play", "pause", "step_forward", "reset"],
                        "description": "The playback action to perform."
                    }
                },
                "required": ["action"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "set_speed",
            "description": "Adjust the visualization playback speed. Use when the student says it's too fast, too slow, or asks for a specific speed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "speed": {
                        "type": "number",
                        "description": "Speed multiplier (0.25 = quarter speed, 0.5 = half, 1.0 = normal, 2.0 = double, 4.0 = max)."
                    }
                },
                "required": ["speed"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "set_input",
            "description": "Set custom input values for the algorithm visualizer. Use when the student provides specific numbers, asks for random input, or wants to try different data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "values": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Array of numerical values to use as algorithm input."
                    }
                },
                "required": ["values"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "switch_theme",
            "description": "Switch the STEM Studio UI theme between light and dark mode.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mode": {
                        "type": "string",
                        "enum": ["light", "dark"],
                        "description": "The target theme mode."
                    }
                },
                "required": ["mode"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_debugger",
            "description": "Show or hide the multi-language code debugger panel.",
            "parameters": {
                "type": "object",
                "properties": {
                    "visible": {
                        "type": "boolean",
                        "description": "True to show the debugger, False to hide it."
                    }
                },
                "required": ["visible"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_fullscreen",
            "description": "Enter or exit the fullscreen visualization view.",
            "parameters": {
                "type": "object",
                "properties": {
                    "enter": {
                        "type": "boolean",
                        "description": "True to enter fullscreen, False to exit."
                    }
                },
                "required": ["enter"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_quiz",
            "description": "Generate custom quiz questions for the current algorithm to test the student's understanding.",
            "parameters": {
                "type": "object",
                "properties": {
                    "count": {
                        "type": "integer",
                        "description": "Number of questions to generate (default 5).",
                        "default": 5
                    },
                    "difficulty": {
                        "type": "string",
                        "enum": ["easy", "medium", "hard"],
                        "description": "Difficulty level of the quiz questions."
                    }
                },
                "required": []
            }
        }
    }
]


def resolve_llm_config(
    provider: str,
    user_api_key: str,
    user_base_url: str,
    user_model_name: str
) -> Tuple[str, str, str, str]:
    """
    Resolves (endpoint_url, api_key, model_name, provider_type) based on user's BYOK settings or system defaults.
    """
    settings = get_settings()
    provider_clean = (provider or "dashscope").lower().strip()

    # Determine API key
    if user_api_key and user_api_key.strip():
        api_key = user_api_key.strip()
    elif provider_clean == "dashscope":
        api_key = getattr(settings, "DASHSCOPE_API_KEY", "") or os.getenv("DASHSCOPE_API_KEY", "")
    else:
        api_key = ""

    # Determine Base URL and Model Name
    if provider_clean == "openai":
        base_url = user_base_url.strip() if user_base_url else "https://api.openai.com/v1/chat/completions"
        model_name = user_model_name.strip() if user_model_name else "gpt-4o-mini"
    elif provider_clean == "openrouter":
        base_url = user_base_url.strip() if user_base_url else "https://openrouter.ai/api/v1/chat/completions"
        model_name = user_model_name.strip() if user_model_name else "openai/gpt-4o-mini"
    elif provider_clean == "anthropic":
        base_url = user_base_url.strip() if user_base_url else "https://api.anthropic.com/v1/messages"
        model_name = user_model_name.strip() if user_model_name else "claude-3-haiku-20240307"
    elif provider_clean == "custom":
        base_url = user_base_url.strip() if user_base_url else "http://localhost:11434/v1/chat/completions"
        model_name = user_model_name.strip() if user_model_name else "llama3"
    else:
        # Default: DashScope / Qwen
        provider_clean = "dashscope"
        base_url = user_base_url.strip() if user_base_url else DEFAULT_DASHSCOPE_ENDPOINT
        model_name = user_model_name.strip() if user_model_name else "qwen-plus"

    # Ensure full URL for chat completions if user provided base host
    if base_url.endswith("/v1") or base_url.endswith("/v1/"):
        base_url = base_url.rstrip("/") + "/chat/completions"

    return base_url, api_key, model_name, provider_clean


@router.post("/test", response_model=OctaTutorTestResponse)
async def test_octa_tutor_connection(req_data: OctaTutorTestRequest, request: Request):
    """
    Test connection to user's configured LLM provider & API key.
    """
    endpoint_url, api_key, model_name, provider_type = resolve_llm_config(
        req_data.provider,
        req_data.api_key,
        req_data.base_url,
        req_data.model_name
    )

    if not api_key and provider_type != "custom":
        return OctaTutorTestResponse(
            success=False,
            message=f"API key is missing for provider '{provider_type}'. Please enter your API key.",
            model_used=model_name
        )

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": "Hi Octa Tutor! Please respond with 'OK'."}
        ],
        "max_tokens": 15,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(endpoint_url, json=payload, headers=headers)

        if resp.status_code == 200:
            return OctaTutorTestResponse(
                success=True,
                message=f"Connection successful! Connected to {provider_type.upper()} ({model_name}).",
                model_used=model_name
            )
        else:
            err_msg = resp.text[:200]
            return OctaTutorTestResponse(
                success=False,
                message=f"Provider returned HTTP {resp.status_code}: {err_msg}",
                model_used=model_name
            )
    except Exception as e:
        return OctaTutorTestResponse(
            success=False,
            message=f"Connection failed: {str(e)}",
            model_used=model_name
        )


@router.post("", response_model=OctaTutorResponse)
async def handle_octa_tutor(req_data: OctaTutorRequest, request: Request):
    """
    Context-aware AI Tutor. Supports Bring-Your-Own-Key (BYOK) for OpenAI, Qwen, OpenRouter, Anthropic, or Custom LLMs.
    """
    settings = get_settings()

    # Rate limiting: 20 requests per minute per IP
    client_ip = request.client.host if request.client else "unknown"
    if not tutor_rate_limiter.is_allowed(f"tutor:{client_ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests to Octa AI Tutor. Please wait a minute before asking again."
        )

    endpoint_url, api_key, model_name, provider_type = resolve_llm_config(
        req_data.provider,
        req_data.api_key,
        req_data.base_url,
        req_data.model_name
    )

    if not api_key and provider_type != "custom":
        logger.info(f"API key not configured for '{provider_type}'. Returning smart fallback response.")
        return generate_fallback_response(req_data)

    # Format system prompt
    step_num = req_data.current_step_index + 1 if req_data.total_steps > 0 else 0
    system_content = SYSTEM_PROMPT_TEMPLATE.format(
        tutor_mode=req_data.mode or "natural",
        algorithm_name=req_data.algorithm_name or "DSA Concept",
        algorithm_id=req_data.algorithm_id or "general",
        category=req_data.category or "dsa",
        step_num=step_num,
        total_steps=req_data.total_steps or 0,
        current_step_description=req_data.current_step_description or "No step selected",
        step_data=req_data.step_data or "{}"
    )

    # Build message list
    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_content}]

    for msg in req_data.conversation_history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": req_data.message})

    payload: Dict[str, Any] = {
        "model": model_name,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    # Attach tool spec for OpenAI-compatible providers
    if provider_type in ["dashscope", "openai", "openrouter", "custom"]:
        payload["tools"] = TOOLS_SPEC
        payload["tool_choice"] = "auto"

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(endpoint_url, json=payload, headers=headers)

        if resp.status_code != 200:
            logger.warning(f"LLM Provider ({provider_type}) returned HTTP {resp.status_code}. Returning smart tutor engine fallback response.")
            return generate_fallback_response(req_data)

        data = resp.json()
        choices = data.get("choices", [])
        if not choices and "content" not in data:
            return OctaTutorResponse(
                reply="I'm having a brief moment of confusion. Could you ask me that again?",
                mascot_expression="confused"
            )

        message_obj = choices[0].get("message", {}) if choices else data
        reply_text = message_obj.get("content") or ""
        tool_calls_raw = message_obj.get("tool_calls", [])

        function_calls: List[OctaTutorFunctionCall] = []
        mascot_expr = "helping"

        for tool_call in tool_calls_raw:
            fn_data = tool_call.get("function", {})
            name = fn_data.get("name")
            args_str = fn_data.get("arguments", "{}")
            try:
                args_dict = json.loads(args_str) if isinstance(args_str, str) else args_str
            except json.JSONDecodeError:
                args_dict = {}

            if name:
                function_calls.append(OctaTutorFunctionCall(name=name, args=args_dict))
                if name in ["switch_theme", "toggle_debugger", "toggle_fullscreen"]:
                    mascot_expr = "happy"
                elif name in ["navigate_to_algorithm", "control_playback", "set_input"]:
                    mascot_expr = "excited"
                elif name == "generate_quiz":
                    mascot_expr = "review"
                elif name == "set_speed":
                    mascot_expr = "happy"

        # Auto-generate reply text when LLM only returned tool calls
        if not reply_text and function_calls:
            first_fn = function_calls[0].name
            if first_fn == "navigate_to_algorithm":
                cat = function_calls[0].args.get("category_id", "")
                topic = function_calls[0].args.get("topic_id", "")
                reply_text = f"Taking you to {topic or cat}! 🚀"
            elif first_fn == "control_playback":
                action = function_calls[0].args.get("action", "play")
                action_msgs = {
                    "play": "Playing the visualization! Watch the steps unfold. ▶️",
                    "pause": "Paused! Take your time to study the current state. ⏸️",
                    "step_forward": "Moving to the next step! 👉",
                    "reset": "Reset! Starting fresh. 🔄",
                }
                reply_text = action_msgs.get(action, "Controlling the visualization!")
            elif first_fn == "set_speed":
                speed = function_calls[0].args.get("speed", 1.0)
                reply_text = f"Speed set to {speed}x! {'🐢' if speed < 1 else '⚡' if speed > 1 else '▶️'}"
            elif first_fn == "set_input":
                vals = function_calls[0].args.get("values", [])
                reply_text = f"Setting input to [{', '.join(map(str, vals))}] — let's see how it runs! 🎯"
            elif first_fn == "switch_theme":
                mode = function_calls[0].args.get("mode", "requested")
                reply_text = f"Switched to {mode} mode! {'🌙' if mode == 'dark' else '☀️'}"
            elif first_fn == "toggle_debugger":
                vis = function_calls[0].args.get("visible", True)
                reply_text = f"{'Showing' if vis else 'Hiding'} the code debugger! {'👀' if vis else '🙈'}"
            elif first_fn == "toggle_fullscreen":
                enter = function_calls[0].args.get("enter", True)
                reply_text = f"{'Entering' if enter else 'Exiting'} fullscreen mode! 🖥️"
            elif first_fn == "generate_quiz":
                reply_text = "Creating a quiz for you! Let's test your knowledge! 📝"

        if not reply_text:
            reply_text = "I'm looking closely at your request! 🐙"

        # Mood tuning based on reply content
        reply_lower = reply_text.lower()
        if mascot_expr == "helping":
            if any(w in reply_lower for w in ["great job", "correct", "perfect", "shabash", "mubarak", "excellent", "exactly right"]):
                mascot_expr = "happy"
            elif any(w in reply_lower for w in ["sorry", "unfortunately", "error", "coming soon", "can't"]):
                mascot_expr = "sad"
            elif any(w in reply_lower for w in ["curious", "interesting", "why", "how come", "think about"]):
                mascot_expr = "thinking"
            elif any(w in reply_lower for w in ["step ", "index ", "comparison", "complexity", "time:"]):
                mascot_expr = "reading"

        return OctaTutorResponse(
            reply=reply_text,
            function_calls=function_calls,
            mascot_expression=mascot_expr
        )

    except httpx.TimeoutException:
        logger.warning(f"LLM Provider API call to {provider_type} timed out. Falling back to smart tutor engine.")
        return generate_fallback_response(req_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Error in LLM call ({str(e)}). Falling back to smart tutor engine.")
        return generate_fallback_response(req_data)
