import React, { useState, useEffect, useMemo } from "react";
import { StudentProfileState } from "@/types/profile";
import { SUPPORTED_LANGUAGES, normalizeLanguage } from "@/agent/codingStudioController";
import { audioEngine, startListening } from "@/agent/audioIO";
import { toast } from "sonner";

export type ArenaTrackId = "Amazon" | "Google" | "Deloitte" | "Microsoft" | "Core / Systems";

export interface ArenaChallenge {
  id: string;
  track: ArenaTrackId;
  company: string;
  role: string;
  title: string;
  difficulty: string;
  question: string;
  spokenPrompt: string;
  sampleInput: string;
  expectedOutput: string;
  expectedOutputTokens: string[];
  starterPython: string;
  solutionPython: string;
  complexityExplanation: string;
  expectedKeywords: string[];
}

export const ARENA_TRACKS: Array<{ id: ArenaTrackId; label: string; roleHint: string }> = [
  { id: "Amazon", label: "Amazon (SDE-1)", roleHint: "SDE-1" },
  { id: "Google", label: "Google (SWE)", roleHint: "SWE University Grad" },
  { id: "Deloitte", label: "Deloitte (Data & Tech)", roleHint: "Technology Consulting Analyst" },
  { id: "Microsoft", label: "Microsoft (Systems & DSA)", roleHint: "Software Engineer" },
  { id: "Core / Systems", label: "Core / Systems", roleHint: "Systems & Embedded Engineer" },
];

export const ARENA_CHALLENGES: ArenaChallenge[] = [
  // --- AMAZON (3) ---
  {
    id: "amzn-1-binary-search",
    track: "Amazon",
    company: "Amazon",
    role: "SDE-1",
    title: "1. Binary Search First Occurrence",
    difficulty: "Medium",
    question:
      "Write first_occurrence(arr, target) to find the earliest index of target=20 in a sorted array in O(log n) time and O(1) space, then explain why searching continues left on match.",
    spokenPrompt:
      "Amazon SDE-1 Coding Round. Find the first index of target 20 in a sorted array in Big O of log n time and Big O of 1 space, and explain how the left boundary moves.",
    sampleInput: "arr = [10, 20, 20, 20, 30, 40], target = 20",
    expectedOutput: "First index of 20: 1",
    expectedOutputTokens: ["1"],
    starterPython:
      'def first_occurrence(arr, target):\n    # TODO: write your binary search solution here\n    pass\n\nprint("First index of 20:", first_occurrence([10, 20, 20, 20, 30, 40], 20))',
    solutionPython:
      'def first_occurrence(arr, target):\n    lo, hi, ans = 0, len(arr) - 1, -1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            ans = mid\n            hi = mid - 1\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return ans\n\nprint("First index of 20:", first_occurrence([10, 20, 20, 20, 30, 40], 20))',
    complexityExplanation:
      "Time: O(log n) because each comparison halves the sorted search interval. Space: O(1) iterative pointers. Recording mid and tightening hi = mid - 1 locates the leftmost match.",
    expectedKeywords: ["O(log n)", "O(1)", "binary search", "sorted", "mid", "left"],
  },
  {
    id: "amzn-2-valid-parentheses",
    track: "Amazon",
    company: "Amazon",
    role: "SDE-1",
    title: "2. Valid Parentheses Stack Validator",
    difficulty: "Easy-Medium",
    question:
      "Write is_valid_brackets(s) to check whether parentheses (), [], {} are balanced and properly nested using a stack in O(n) time, and explain stack space complexity.",
    spokenPrompt:
      "Amazon SDE-1 Coding Round. Validate balanced parentheses, square brackets, and curly braces in Big O of n time using a stack.",
    sampleInput: '"({[]})" and "([)]"',
    expectedOutput: "True False",
    expectedOutputTokens: ["True False"],
    starterPython:
      'def is_valid_brackets(s):\n    # TODO: validate balanced brackets using a stack\n    pass\n\nprint(is_valid_brackets("({[]})"), is_valid_brackets("([)]"))',
    solutionPython:
      'def is_valid_brackets(s):\n    pairs = {")": "(", "]": "[", "}": "{"}\n    stack = []\n    for ch in s:\n        if ch in "([{":\n            stack.append(ch)\n        else:\n            if not stack or stack.pop() != pairs.get(ch):\n                return False\n    return len(stack) == 0\n\nprint(is_valid_brackets("({[]})"), is_valid_brackets("([)]"))',
    complexityExplanation:
      "Time: O(n) single pass pushing/popping each bracket at most once. Space: O(n) worst-case stack depth when all characters are opening brackets.",
    expectedKeywords: ["stack", "O(n)", "LIFO", "mapping", "empty check"],
  },
  {
    id: "amzn-3-kadane",
    track: "Amazon",
    company: "Amazon",
    role: "SDE-1",
    title: "3. Maximum Subarray Sum (Kadane)",
    difficulty: "Medium",
    question:
      "Implement max_subarray_sum(nums) using Kadane's algorithm in O(n) time and O(1) space on [-2, 1, -3, 4, -1, 2, 1, -5, 4], and explain the local-vs-global recurrence.",
    spokenPrompt:
      "Amazon SDE-1 Coding Round. Compute maximum contiguous subarray sum in Big O of n time and Big O of 1 space using Kadane's algorithm.",
    sampleInput: "nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]",
    expectedOutput: "6",
    expectedOutputTokens: ["6"],
    starterPython:
      "def max_subarray_sum(nums):\n    # TODO: implement Kadane's O(n) algorithm\n    pass\n\nprint(max_subarray_sum([-2, 1, -3, 4, -1, 2, 1, -5, 4]))",
    solutionPython:
      "def max_subarray_sum(nums):\n    curr = best = nums[0]\n    for x in nums[1:]:\n        curr = max(x, curr + x)\n        best = max(best, curr)\n    return best\n\nprint(max_subarray_sum([-2, 1, -3, 4, -1, 2, 1, -5, 4]))",
    complexityExplanation:
      "Time: O(n) single pass deciding at each index whether to extend the running subarray or restart at x. Space: O(1) constant variables.",
    expectedKeywords: ["Kadane", "O(n)", "O(1)", "dynamic programming", "contiguous"],
  },

  // --- GOOGLE (3) ---
  {
    id: "goog-1-two-sum",
    track: "Google",
    company: "Google",
    role: "SWE University Grad",
    title: "1. Hash Map Two-Sum",
    difficulty: "Medium",
    question:
      "Implement two_sum(nums, target) in O(n) time for nums=[2, 7, 11, 15], target=9, and defend the time-space trade-off versus O(n^2) brute force or sorting.",
    spokenPrompt:
      "Google SWE Round. Return the pair of indices summing to target in Big O of n time using a hash map and explain the time space trade-off.",
    sampleInput: "nums = [2, 7, 11, 15], target = 9",
    expectedOutput: "[0, 1]",
    expectedOutputTokens: ["[0, 1]"],
    starterPython:
      "def two_sum(nums, target):\n    # TODO: use a hash map to achieve O(n) lookup\n    pass\n\nprint(two_sum([2, 7, 11, 15], 9))",
    solutionPython:
      "def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        comp = target - x\n        if comp in seen:\n            return [seen[comp], i]\n        seen[x] = i\n    return []\n\nprint(two_sum([2, 7, 11, 15], 9))",
    complexityExplanation:
      "Time: O(n) average-case dictionary lookup per element vs O(n^2) nested loops. Space: O(n) hash table storing index mappings.",
    expectedKeywords: ["O(n)", "hash map", "complement", "trade-off", "space"],
  },
  {
    id: "goog-2-longest-substring",
    track: "Google",
    company: "Google",
    role: "SWE University Grad",
    title: "2. Longest Substring Without Repeats",
    difficulty: "Medium",
    question:
      "Write length_of_longest_substring(s) returning the max length of a substring with unique characters in O(n) time on 'abcabcbb', and explain why left never moves backward.",
    spokenPrompt:
      "Google SWE Round. Find the longest substring without repeating characters in Big O of n time using a sliding window.",
    sampleInput: "s = 'abcabcbb'",
    expectedOutput: "3",
    expectedOutputTokens: ["3"],
    starterPython:
      "def length_of_longest_substring(s):\n    # TODO: write O(n) sliding window solution\n    pass\n\nprint(length_of_longest_substring('abcabcbb'))",
    solutionPython:
      "def length_of_longest_substring(s):\n    last_seen = {}\n    left = 0\n    best = 0\n    for right, ch in enumerate(s):\n        if ch in last_seen and last_seen[ch] >= left:\n            left = last_seen[ch] + 1\n        last_seen[ch] = right\n        best = max(best, right - left + 1)\n    return best\n\nprint(length_of_longest_substring('abcabcbb'))",
    complexityExplanation:
      "Time: O(n) single pass because left = max(left, prev + 1) jumps directly past stale duplicates. Space: O(min(n, k)) for character positions.",
    expectedKeywords: ["sliding window", "O(n)", "hash map", "two pointer", "invariant"],
  },
  {
    id: "goog-3-merge-intervals",
    track: "Google",
    company: "Google",
    role: "SWE University Grad",
    title: "3. Merge Overlapping Intervals",
    difficulty: "Medium",
    question:
      "Write merge_intervals(intervals) sorting and merging all overlapping pairs on [[1,3],[2,6],[8,10],[15,18]], and analyze sorting bottleneck complexity.",
    spokenPrompt:
      "Google SWE Round. Merge overlapping time intervals efficiently and explain why sorting dominates at Big O of n log n time.",
    sampleInput: "intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]",
    expectedOutput: "[[1, 6], [8, 10], [15, 18]]",
    expectedOutputTokens: ["[[1, 6], [8, 10], [15, 18]]"],
    starterPython:
      "def merge_intervals(intervals):\n    # TODO: sort by start and merge overlapping intervals\n    pass\n\nprint(merge_intervals([[1, 3], [2, 6], [8, 10], [15, 18]]))",
    solutionPython:
      "def merge_intervals(intervals):\n    if not intervals:\n        return []\n    intervals.sort(key=lambda iv: iv[0])\n    merged = [intervals[0][:]]\n    for start, end in intervals[1:]:\n        if start <= merged[-1][1]:\n            merged[-1][1] = max(merged[-1][1], end)\n        else:\n            merged.append([start, end])\n    return merged\n\nprint(merge_intervals([[1, 3], [2, 6], [8, 10], [15, 18]]))",
    complexityExplanation:
      "Time: O(n log n) due to initial start-time sort followed by an O(n) greedy scan. Space: O(n) output storage.",
    expectedKeywords: ["O(n log n)", "sort", "greedy", "overlap", "interval"],
  },

  // --- DELOITTE (3) ---
  {
    id: "del-1-dept-avg",
    track: "Deloitte",
    company: "Deloitte",
    role: "Technology Consulting Analyst",
    title: "1. Department Average Package Sort",
    difficulty: "Medium",
    question:
      "Aggregate average salary per department sorted descending from placements data, and explain how composite B-Tree indexes speed up SQL GROUP BY aggregations.",
    spokenPrompt:
      "Deloitte Consulting Round. Compute department average salary sorted highest first and explain how B-Tree indexing optimizes group by queries.",
    sampleInput: '[("CSE", 16.0), ("CSE", 14.0), ("AIML", 22.0), ("AIML", 18.0), ("ECE", 9.0)]',
    expectedOutput: "AIML: 20.0 LPA | CSE: 15.0 LPA | ECE: 9.0 LPA",
    expectedOutputTokens: ["AIML: 20.0", "CSE: 15.0"],
    starterPython:
      'from collections import defaultdict\n\ndef print_dept_averages(records):\n    # TODO: group packages by department and print sorted highest average first\n    pass\n\nprint_dept_averages([("CSE", 16.0), ("CSE", 14.0), ("AIML", 22.0), ("AIML", 18.0), ("ECE", 9.0)])',
    solutionPython:
      'from collections import defaultdict\n\ndef print_dept_averages(records):\n    dept_map = defaultdict(list)\n    for dept, pkg in records:\n        dept_map[dept].append(pkg)\n    ranked = sorted(dept_map.items(), key=lambda kv: -sum(kv[1]) / len(kv[1]))\n    for dept, pkgs in ranked:\n        print(f"{dept}: {sum(pkgs)/len(pkgs):.1f} LPA")\n\nprint_dept_averages([("CSE", 16.0), ("CSE", 14.0), ("AIML", 22.0), ("AIML", 18.0), ("ECE", 9.0)])',
    complexityExplanation:
      "Time: O(n + k log k) where k is number of departments. In PostgreSQL, indexing GROUP BY + ORDER BY columns turns full table sorts into ordered index scans.",
    expectedKeywords: ["GROUP BY", "B-Tree", "index", "aggregation", "O(n log n)", "PostgreSQL"],
  },
  {
    id: "del-2-top-k-dept",
    track: "Deloitte",
    company: "Deloitte",
    role: "Technology Consulting Analyst",
    title: "2. Top-2 Offers per Branch Partition",
    difficulty: "Medium",
    question:
      "Group offers by branch and print the top 2 highest packages for each branch sorted alphabetically by branch, comparing this to SQL DENSE_RANK / ROW_NUMBER window functions.",
    spokenPrompt:
      "Deloitte Consulting Round. Print the top 2 highest packages per engineering branch and explain how SQL window functions partition this cleanly.",
    sampleInput: '[("CSE", 12.0), ("CSE", 24.0), ("CSE", 18.0), ("ECE", 9.0), ("ECE", 11.5)]',
    expectedOutput: "CSE: [24.0, 18.0] | ECE: [11.5, 9.0]",
    expectedOutputTokens: ["24.0", "18.0", "11.5"],
    starterPython:
      'from collections import defaultdict\n\ndef top_two_per_branch(records):\n    # TODO: compute top 2 packages per branch\n    pass\n\ntop_two_per_branch([("CSE", 12.0), ("CSE", 24.0), ("CSE", 18.0), ("ECE", 9.0), ("ECE", 11.5)])',
    solutionPython:
      'from collections import defaultdict\n\ndef top_two_per_branch(records):\n    groups = defaultdict(list)\n    for branch, pkg in records:\n        groups[branch].append(pkg)\n    for branch in sorted(groups):\n        top2 = sorted(groups[branch], reverse=True)[:2]\n        print(f"{branch}: {top2}")\n\ntop_two_per_branch([("CSE", 12.0), ("CSE", 24.0), ("CSE", 18.0), ("ECE", 9.0), ("ECE", 11.5)])',
    complexityExplanation:
      "Time: O(n log n) or O(n) using bounded heap of size 2 per partition. In SQL this maps directly to ROW_NUMBER() OVER (PARTITION BY branch ORDER BY pkg DESC).",
    expectedKeywords: ["PARTITION BY", "window function", "heap", "O(n log n)", "sorting"],
  },
  {
    id: "del-3-dedup-emails",
    track: "Deloitte",
    company: "Deloitte",
    role: "Technology Consulting Analyst",
    title: "3. Deduplicate Candidate Emails",
    difficulty: "Easy-Medium",
    question:
      "Count case-insensitive unique student email records while handling leading/trailing whitespace in O(n) time, and discuss UNIQUE indexes & idempotency in data pipelines.",
    spokenPrompt:
      "Deloitte Consulting Round. Deduplicate student email strings ignoring case and spaces in Big O of n time and explain database uniqueness constraints.",
    sampleInput: '["Asha@Edu.in", " asha@edu.in ", "Raj@Edu.in", "RAJ@edu.in", "Kiran@Edu.in"]',
    expectedOutput: "3",
    expectedOutputTokens: ["3"],
    starterPython:
      'def count_unique_emails(emails):\n    # TODO: normalize and count unique emails in O(n)\n    pass\n\nprint(count_unique_emails(["Asha@Edu.in", " asha@edu.in ", "Raj@Edu.in", "RAJ@edu.in", "Kiran@Edu.in"]))',
    solutionPython:
      'def count_unique_emails(emails):\n    seen = set()\n    for raw in emails:\n        norm = raw.strip().lower()\n        if norm:\n            seen.add(norm)\n    return len(seen)\n\nprint(count_unique_emails(["Asha@Edu.in", " asha@edu.in ", "Raj@Edu.in", "RAJ@edu.in", "Kiran@Edu.in"]))',
    complexityExplanation:
      "Time: O(n * L) across n normalized emails using O(1) hash set insertions. Space: O(n). In Postgres, LOWER(email) unique indexes prevent duplicate ingestion.",
    expectedKeywords: ["hash set", "O(n)", "unique constraint", "idempotency", "normalization"],
  },

  // --- MICROSOFT (3) ---
  {
    id: "msft-1-rotate-array",
    track: "Microsoft",
    company: "Microsoft",
    role: "Software Engineer",
    title: "1. Rotate Array Right In-Place",
    difficulty: "Medium",
    question:
      "Rotate nums = [1, 2, 3, 4, 5, 6, 7] right by k = 3 steps in-place with O(1) extra memory and explain the three-reversal proof.",
    spokenPrompt:
      "Microsoft SWE Round. Rotate an array right by k steps in place using Big O of 1 space and explain why three reversals work.",
    sampleInput: "nums = [1, 2, 3, 4, 5, 6, 7], k = 3",
    expectedOutput: "[5, 6, 7, 1, 2, 3, 4]",
    expectedOutputTokens: ["[5, 6, 7, 1, 2, 3, 4]"],
    starterPython:
      "def rotate_right(nums, k):\n    # TODO: rotate array in-place in O(n) time and O(1) space\n    pass\n\narr = [1, 2, 3, 4, 5, 6, 7]\nrotate_right(arr, 3)\nprint(arr)",
    solutionPython:
      "def rotate_right(nums, k):\n    n = len(nums)\n    if n == 0:\n        return\n    k %= n\n    def rev(l, r):\n        while l < r:\n            nums[l], nums[r] = nums[r], nums[l]\n            l += 1\n            r -= 1\n    rev(0, n - 1)\n    rev(0, k - 1)\n    rev(k, n - 1)\n\narr = [1, 2, 3, 4, 5, 6, 7]\nrotate_right(arr, 3)\nprint(arr)",
    complexityExplanation:
      "Time: O(n) with three linear two-pointer swaps. Space: O(1) auxiliary memory, avoiding slice allocations of size n.",
    expectedKeywords: ["O(n)", "O(1)", "in-place", "reversal", "modulo"],
  },
  {
    id: "msft-2-group-anagrams",
    track: "Microsoft",
    company: "Microsoft",
    role: "Software Engineer",
    title: "2. Group Anagrams Cluster Count",
    difficulty: "Medium",
    question:
      'Group ["eat", "tea", "tan", "ate", "nat", "bat"] into anagram buckets and print the total number of distinct groups, comparing sorted-key vs 26-char frequency tuple complexity.',
    spokenPrompt:
      "Microsoft SWE Round. Group anagram strings into distinct buckets and compare sorted key versus character frequency tuple time complexity.",
    sampleInput: 'words = ["eat", "tea", "tan", "ate", "nat", "bat"]',
    expectedOutput: "3",
    expectedOutputTokens: ["3"],
    starterPython:
      'def count_anagram_groups(words):\n    # TODO: bucket words by canonical signature and return group count\n    pass\n\nprint(count_anagram_groups(["eat", "tea", "tan", "ate", "nat", "bat"]))',
    solutionPython:
      'from collections import defaultdict\n\ndef count_anagram_groups(words):\n    buckets = defaultdict(list)\n    for w in words:\n        key = tuple(sorted(w))\n        buckets[key].append(w)\n    return len(buckets)\n\nprint(count_anagram_groups(["eat", "tea", "tan", "ate", "nat", "bat"]))',
    complexityExplanation:
      "Time: O(N * K log K) with sorted tuples or O(N * K) using a 26-element count tuple signature. Space: O(N * K).",
    expectedKeywords: ["hash map", "canonical key", "O(N * K)", "anagram", "sorting"],
  },
  {
    id: "msft-3-lru-cache",
    track: "Microsoft",
    company: "Microsoft",
    role: "Software Engineer",
    title: "3. O(1) LRU Cache Operations",
    difficulty: "Hard",
    question:
      "Implement a capacity-2 LRUCache supporting O(1) get(key) and put(key, val), execute put(1,1), put(2,2), get(1), put(3,3), get(2), and explain why HashMap + Doubly Linked List gives O(1).",
    spokenPrompt:
      "Microsoft SWE Round. Implement an LRU cache with Big O of 1 get and put operations and explain how a hash map pairs with eviction order.",
    sampleInput: "capacity=2: put(1,1), put(2,2), get(1), put(3,3), get(2)",
    expectedOutput: "1 -1",
    expectedOutputTokens: ["1 -1"],
    starterPython:
      "from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity):\n        # TODO: initialize cache state\n        pass\n    def get(self, key):\n        pass\n    def put(self, key, value):\n        pass\n\ncache = LRUCache(2)\ncache.put(1, 1); cache.put(2, 2)\nr1 = cache.get(1)\ncache.put(3, 3)\nr2 = cache.get(2)\nprint(r1, r2)",
    solutionPython:
      "from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity):\n        self.cap = capacity\n        self.od = OrderedDict()\n    def get(self, key):\n        if key not in self.od:\n            return -1\n        self.od.move_to_end(key)\n        return self.od[key]\n    def put(self, key, value):\n        if key in self.od:\n            self.od.move_to_end(key)\n        self.od[key] = value\n        if len(self.od) > self.cap:\n            self.od.popitem(last=False)\n\ncache = LRUCache(2)\ncache.put(1, 1); cache.put(2, 2)\nr1 = cache.get(1)\ncache.put(3, 3)\nr2 = cache.get(2)\nprint(r1, r2)",
    complexityExplanation:
      "Time: O(1) for both get and put because a HashMap locates nodes in O(1) while a Doubly Linked List / OrderedDict relinks recency in O(1). Space: O(capacity).",
    expectedKeywords: ["O(1)", "hash map", "doubly linked list", "eviction", "recency"],
  },

  // --- CORE / SYSTEMS (3) ---
  {
    id: "sys-1-bit-ops",
    track: "Core / Systems",
    company: "Core / Systems",
    role: "Systems & Embedded Engineer",
    title: "1. Bitwise Set Bits & Power-of-Two Check",
    difficulty: "Easy-Medium",
    question:
      "Write count_bits(n) using Kernighan's trick and is_power_of_two(p) in O(1) bitwise operations, run on n=11 and p=16, and explain n & (n - 1).",
    spokenPrompt:
      "Core Systems Round. Count set bits and check power of two using constant time bitwise operations, and explain what n bitwise and n minus 1 clears.",
    sampleInput: "n = 11, p = 16",
    expectedOutput: "3 True",
    expectedOutputTokens: ["3 True"],
    starterPython:
      "def count_bits(n):\n    # TODO: use bitwise ops\n    pass\n\ndef is_power_of_two(p):\n    # TODO: check power of two in O(1)\n    pass\n\nprint(count_bits(11), is_power_of_two(16))",
    solutionPython:
      "def count_bits(n):\n    cnt = 0\n    while n > 0:\n        n &= (n - 1)\n        cnt += 1\n    return cnt\n\ndef is_power_of_two(p):\n    return p > 0 and (p & (p - 1)) == 0\n\nprint(count_bits(11), is_power_of_two(16))",
    complexityExplanation:
      "n & (n - 1) zeroes the lowest set bit. count_bits runs in O(k) bit transitions (at most O(log n)) with O(1) space; is_power_of_two is strictly O(1).",
    expectedKeywords: ["bitwise", "O(1)", "set bits", "power of two", "lowest bit"],
  },
  {
    id: "sys-2-moving-avg",
    track: "Core / Systems",
    company: "Core / Systems",
    role: "Systems & Embedded Engineer",
    title: "2. Sensor Sliding Window Moving Average",
    difficulty: "Medium",
    question:
      "Compute rolling window averages of size k=2 over telemetry stream [10, 20, 30, 40] in O(n) time instead of O(n*k), and relate this to edge firmware ring buffers.",
    spokenPrompt:
      "Core Systems Round. Compute a sliding window moving average over sensor telemetry in Big O of n time instead of Big O of n times k.",
    sampleInput: "readings = [10, 20, 30, 40], k = 2",
    expectedOutput: "[15.0, 25.0, 35.0]",
    expectedOutputTokens: ["15.0", "25.0", "35.0"],
    starterPython:
      "def moving_average(readings, k):\n    # TODO: maintain running window sum in O(n)\n    pass\n\nprint(moving_average([10, 20, 30, 40], 2))",
    solutionPython:
      "def moving_average(readings, k):\n    if k <= 0 or k > len(readings):\n        return []\n    win = sum(readings[:k])\n    res = [win / k]\n    for i in range(k, len(readings)):\n        win += readings[i] - readings[i - k]\n        res.append(win / k)\n    return res\n\nprint(moving_average([10, 20, 30, 40], 2))",
    complexityExplanation:
      "Time: O(n) by adding incoming sample and subtracting outgoing sample in O(1) per tick. Space: O(1) extra state with a circular ring buffer.",
    expectedKeywords: ["sliding window", "O(n)", "ring buffer", "telemetry", "O(1)"],
  },
  {
    id: "sys-3-token-bucket",
    track: "Core / Systems",
    company: "Core / Systems",
    role: "Systems & Embedded Engineer",
    title: "3. Token Bucket Rate Limiter Simulation",
    difficulty: "Medium",
    question:
      "Simulate a Token Bucket (capacity=2, initial=2, rate=1/sec) over request timestamps [0, 0, 0], printing ALLOW or DENY for each request, and compare token bucket vs fixed window.",
    spokenPrompt:
      "Core Systems Round. Implement a token bucket rate limiter simulation and explain why token bucket handles bursts smoothly.",
    sampleInput: "capacity=2, rate=1/s, request timestamps=[0, 0, 0]",
    expectedOutput: "ALLOW ALLOW DENY",
    expectedOutputTokens: ["ALLOW ALLOW DENY"],
    starterPython:
      "def simulate_rate_limiter(timestamps, capacity=2, rate=1.0):\n    # TODO: refill tokens based on elapsed time and return decisions\n    pass\n\nprint(' '.join(simulate_rate_limiter([0, 0, 0])))",
    solutionPython:
      "def simulate_rate_limiter(timestamps, capacity=2, rate=1.0):\n    tokens = float(capacity)\n    last_t = timestamps[0] if timestamps else 0\n    out = []\n    for t in timestamps:\n        tokens = min(float(capacity), tokens + max(0, t - last_t) * rate)\n        last_t = t\n        if tokens >= 1.0:\n            tokens -= 1.0\n            out.append('ALLOW')\n        else:\n            out.append('DENY')\n    return out\n\nprint(' '.join(simulate_rate_limiter([0, 0, 0])))",
    complexityExplanation:
      "Time: O(1) per request decision storing just tokens and timestamp. Space: O(1) per client key vs storing full timestamp queues in sliding logs.",
    expectedKeywords: ["token bucket", "O(1)", "burst", "rate limiting", "refill"],
  },
];

function stripCodeForCheck(src: string): string {
  return (src || "")
    .replace(/#.*$/gm, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, "");
}

function isStarterOrBlank(candidate: string, starter: string, genericStarter?: string): boolean {
  const cNorm = stripCodeForCheck(candidate);
  if (!cNorm) return true;
  if (starter && cNorm === stripCodeForCheck(starter)) return true;
  if (genericStarter && cNorm === stripCodeForCheck(genericStarter)) return true;
  return false;
}

function verifyExpectedOutput(actualOutput: string, expectedTokens: string[]): boolean {
  const cleanOut = (actualOutput || "").trim();
  if (!cleanOut || /no standard output|no output|unavailable|error/i.test(cleanOut)) return false;
  if (!expectedTokens.length) return cleanOut.length > 0;
  return expectedTokens.every((tok) => cleanOut.includes(tok));
}

interface LiveCodingInterviewArenaProps {
  profile: StudentProfileState;
  apiBase: string;
  onAskCoach?: (query: string) => void;
  customChallenge?: {
    company: string;
    role: string;
    question: string;
    starterCode: string;
    expectedKeywords: string[];
  } | null;
}

export const LiveCodingInterviewArena: React.FC<LiveCodingInterviewArenaProps> = ({
  apiBase,
  onAskCoach,
  customChallenge,
}) => {
  const [challenges, setChallenges] = useState<ArenaChallenge[]>(ARENA_CHALLENGES);
  const [activeTrack, setActiveTrack] = useState<ArenaTrackId>("Amazon");
  const [selectedId, setSelectedId] = useState<string>(ARENA_CHALLENGES[0].id);
  const [language, setLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>(ARENA_CHALLENGES[0].starterPython);
  const [compilerOutput, setCompilerOutput] = useState<string>("");
  const [runStatus, setRunStatus] = useState<"idle" | "empty" | "error" | "wrong_output" | "passed">("idle");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isGeneratingProblem, setIsGeneratingProblem] = useState<boolean>(false);
  const [showCorrectProgram, setShowCorrectProgram] = useState<boolean>(false);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);

  // NEVER pre-fill candidate viva answers (zero-fake policy)
  const [explanation, setExplanation] = useState<string>("");
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [stopListenerFn, setStopListenerFn] = useState<(() => void) | null>(null);

  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [verdictResult, setVerdictResult] = useState<{
    overallScore: number;
    codeScore: number;
    vivaScore: number;
    decision: string;
    verdictText: string;
    codeFeedback: string;
    vivaFeedback: string;
    matchedKeywords: string[];
    missingKeywords: string[];
  } | null>(null);

  const trackChallenges = useMemo(
    () => challenges.filter((c) => c.track === activeTrack),
    [challenges, activeTrack]
  );

  const activeChallenge = useMemo(() => {
    return (
      challenges.find((c) => c.id === selectedId) ||
      trackChallenges[0] ||
      challenges[0]
    );
  }, [challenges, selectedId, trackChallenges]);

  const activeIndexInTrack = useMemo(() => {
    const idx = trackChallenges.findIndex((c) => c.id === activeChallenge.id);
    return idx >= 0 ? idx : 0;
  }, [trackChallenges, activeChallenge.id]);

  const resetForChallenge = (ch: ArenaChallenge) => {
    setActiveTrack(ch.track);
    setSelectedId(ch.id);
    setLanguage("python");
    setCode(ch.starterPython);
    setExplanation("");
    setCompilerOutput("");
    setRunStatus("idle");
    setShowCorrectProgram(false);
    setVerdictResult(null);
  };

  useEffect(() => {
    if (customChallenge) {
      const customId = `custom-${Date.now()}`;
      const matchedTrack =
        ARENA_TRACKS.find((t) =>
          customChallenge.company.toLowerCase().includes(t.id.toLowerCase())
        )?.id || "Amazon";
      const customObj: ArenaChallenge = {
        id: customId,
        track: matchedTrack,
        company: customChallenge.company || matchedTrack,
        role: customChallenge.role || "SWE",
        title: `Custom: ${customChallenge.company} Round`,
        difficulty: "Medium",
        question: customChallenge.question,
        spokenPrompt: customChallenge.question,
        sampleInput: "Run with provided test input or custom print assertions",
        expectedOutput: "Valid compiled output satisfying prompt requirements",
        expectedOutputTokens: [],
        starterPython: customChallenge.starterCode || "# Write your Python solution here\n",
        solutionPython: customChallenge.starterCode || "# Write your optimal Python solution\n",
        complexityExplanation: "Explain optimal Time and Space complexity alongside edge cases.",
        expectedKeywords: customChallenge.expectedKeywords || ["O(n)", "complexity"],
      };
      setChallenges((prev) => [...prev.filter((c) => !c.id.startsWith("custom-")), customObj]);
      resetForChallenge(customObj);
    }
  }, [customChallenge]);

  const handleSelectTrack = (track: ArenaTrackId) => {
    setActiveTrack(track);
    const firstInTrack = challenges.find((c) => c.track === track);
    if (firstInTrack) resetForChallenge(firstInTrack);
  };

  const handleStepChallenge = (delta: number) => {
    if (trackChallenges.length === 0) return;
    const nextIdx = (activeIndexInTrack + delta + trackChallenges.length) % trackChallenges.length;
    resetForChallenge(trackChallenges[nextIdx]);
  };

  const handleGenerateFreshProblem = async () => {
    setIsGeneratingProblem(true);
    try {
      const trackInfo = ARENA_TRACKS.find((t) => t.id === activeTrack) || ARENA_TRACKS[0];
      const resp = await fetch(`${apiBase}/api/ai/generate-coding-problem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: activeTrack,
          role: trackInfo.roleHint,
          difficulty: "Medium",
          existing_titles: challenges.map((c) => c.title),
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const newNum = trackChallenges.length + 1;
      const newProblem: ArenaChallenge = {
        id: data.id || `gen-${activeTrack.toLowerCase()}-${Date.now()}`,
        track: activeTrack,
        company: activeTrack,
        role: data.role || trackInfo.roleHint,
        title: `${newNum}. ${data.title}`,
        difficulty: data.difficulty || "Medium",
        question: data.question,
        spokenPrompt: data.spoken_prompt || data.question,
        sampleInput: data.sample_input || "See test case inside starter code",
        expectedOutput: data.expected_output || "",
        expectedOutputTokens: Array.isArray(data.expected_output_tokens)
          ? data.expected_output_tokens
          : [],
        starterPython: data.starter_python,
        solutionPython: data.solution_python,
        complexityExplanation: data.complexity_explanation || "Discuss optimal Time and Space complexity.",
        expectedKeywords: Array.isArray(data.expected_keywords) ? data.expected_keywords : ["O(n)"],
      };
      setChallenges((prev) => [...prev, newProblem]);
      resetForChallenge(newProblem);
      toast.success(`New ${activeTrack} challenge generated!`);
    } catch (err: any) {
      toast.error(`Could not generate new challenge: ${err?.message || "Please retry."}`);
    } finally {
      setIsGeneratingProblem(false);
    }
  };

  const handleSpeakQuestionAloud = () => {
    const cleanPrompt = (activeChallenge.spokenPrompt || activeChallenge.question).trim();
    audioEngine.unlockAudio();
    audioEngine.clearAudioQueue();
    window.dispatchEvent(
      new CustomEvent("das-interviewer-prompt", {
        detail: { question: cleanPrompt, track: "arena" },
      })
    );
    void audioEngine.speakTextPuckOrLocal(cleanPrompt, apiBase);
  };

  const handleToggleVoiceViva = () => {
    if (isListeningVoice && stopListenerFn) {
      stopListenerFn();
      setIsListeningVoice(false);
      setStopListenerFn(null);
      return;
    }
    const stop = startListening(
      "en-IN",
      (interim) => setExplanation(interim),
      (finalText) => setExplanation(finalText),
      () => {
        setIsListeningVoice(false);
        setStopListenerFn(null);
      }
    );
    if (stop) {
      setIsListeningVoice(true);
      setStopListenerFn(() => stop);
    } else {
      toast.info("Type your complexity & architecture explanation in the viva box.");
    }
  };

  const runCodeOnBackend = async (): Promise<{
    compileOk: boolean;
    outputMatched: boolean;
    out: string;
    isBlankOrStarter: boolean;
  }> => {
    const langSpec = SUPPORTED_LANGUAGES.find((l) => l.id === language);
    const blankCheck = isStarterOrBlank(
      code,
      language === "python" ? activeChallenge.starterPython : "",
      langSpec?.starter
    );

    if (blankCheck) {
      const msg =
        "No solution implemented yet — write your logic inside the editor before executing tests.";
      setCompilerOutput(msg);
      setRunStatus("empty");
      return { compileOk: false, outputMatched: false, out: msg, isBlankOrStarter: true };
    }

    setIsCompiling(true);
    try {
      const resp = await fetch(`${apiBase}/api/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });
      const data = await resp.json();
      const out = String(data.output || data.stderr || data.error || "").trim();
      const compileOk = Boolean(resp.ok && data.success);

      if (!compileOk) {
        setCompilerOutput(out || "Compile or runtime error occurred.");
        setRunStatus("error");
        return { compileOk: false, outputMatched: false, out, isBlankOrStarter: false };
      }

      const enforcePythonTokens = language === "python" && activeChallenge.expectedOutputTokens.length > 0;
      const outputMatched = enforcePythonTokens
        ? verifyExpectedOutput(out, activeChallenge.expectedOutputTokens)
        : Boolean(out && !/no standard output|no output/i.test(out));

      if (outputMatched) {
        setCompilerOutput(out || "Executed cleanly.");
        setRunStatus("passed");
        setSolvedIds((prev) => (prev.includes(activeChallenge.id) ? prev : [...prev, activeChallenge.id]));
      } else {
        setCompilerOutput(
          out
            ? `Output mismatch:\nExpected: ${activeChallenge.expectedOutput}\nActual:   ${out}`
            : `No standard output produced.\nExpected: ${activeChallenge.expectedOutput}`
        );
        setRunStatus("wrong_output");
      }

      return { compileOk, outputMatched, out, isBlankOrStarter: false };
    } catch (err: any) {
      const msg = `Compiler network error: ${err?.message || "Failed"}`;
      setCompilerOutput(msg);
      setRunStatus("error");
      return { compileOk: false, outputMatched: false, out: msg, isBlankOrStarter: false };
    } finally {
      setIsCompiling(false);
    }
  };

  const handleEvaluateCodingAndViva = async () => {
    setIsEvaluating(true);
    try {
      const runRes = await runCodeOnBackend();

      const resp = await fetch(`${apiBase}/api/ai/evaluate-coding-arena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: activeChallenge.company,
          role: activeChallenge.role,
          title: activeChallenge.title,
          question: activeChallenge.question,
          language,
          candidate_code: code,
          starter_code:
            language === "python"
              ? activeChallenge.starterPython
              : SUPPORTED_LANGUAGES.find((l) => l.id === language)?.starter || "",
          viva_explanation: explanation.trim(),
          compile_success: runRes.compileOk,
          compiler_output: runRes.out,
          expected_output: activeChallenge.expectedOutput,
          output_matched: runRes.outputMatched,
          expected_keywords: activeChallenge.expectedKeywords,
          reference_solution: activeChallenge.solutionPython,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const resultObj = {
        overallScore: Number(data.overall_score ?? 0),
        codeScore: Number(data.code_score ?? 0),
        vivaScore: Number(data.viva_score ?? 0),
        decision: String(data.decision || "NO HIRE"),
        verdictText: String(data.verdict_text || ""),
        codeFeedback: String(data.code_feedback || ""),
        vivaFeedback: String(data.viva_feedback || ""),
        matchedKeywords: Array.isArray(data.matched_keywords) ? data.matched_keywords : [],
        missingKeywords: Array.isArray(data.missing_keywords) ? data.missing_keywords : [],
      };
      setVerdictResult(resultObj);

      const verdictSpeech = `Hiring Verdict for ${activeChallenge.company}: ${resultObj.decision}, score ${resultObj.overallScore} out of 100. ${resultObj.verdictText}`;
      audioEngine.unlockAudio();
      audioEngine.clearAudioQueue();
      window.dispatchEvent(
        new CustomEvent("das-interviewer-prompt", {
          detail: { question: verdictSpeech, track: "verdict" },
        })
      );
      void audioEngine.speakTextPuckOrLocal(verdictSpeech, apiBase);
    } catch (err: any) {
      toast.error(`Evaluation error: ${err?.message || "Unable to grade right now"}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="pf-titanium-card space-y-8 rounded-2xl p-8 sm:p-10">
      {/* Arena Header */}
      <div className="flex flex-col justify-between gap-5 border-b border-white/[0.08] pb-6 lg:flex-row lg:items-center">
        <div>
          <span className="inline-block rounded-md border border-white/[0.1] bg-[#141418] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA]">
            Live Coding &amp; Viva Arena
          </span>
          <h2
            className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-[28px]"
            style={{ textWrap: "balance" }}
          >
            Technical Coding &amp; Voice Defense Arena
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-[1.65] text-[#A1A1AA] sm:text-sm">
            Solve real interview problems across company tracks, execute code across 11 runtimes,
            or generate fresh challenges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onAskCoach && (
            <button
              type="button"
              onClick={() =>
                onAskCoach(
                  `For the coding challenge '${activeChallenge.question}' (${activeChallenge.company} ${activeChallenge.role}), give me a concise intuition hint on the optimal approach without spoiling all code.`
                )
              }
              className="pf-btn-secondary inline-flex h-10 items-center rounded-xl px-4 text-xs font-medium cursor-pointer"
            >
              Ask Coach Hint
            </button>
          )}

          <button
            type="button"
            onClick={handleSpeakQuestionAloud}
            className="pf-btn-secondary inline-flex h-10 items-center rounded-xl px-4 text-xs font-medium cursor-pointer"
          >
            Have DAS Ask Aloud
          </button>
        </div>
      </div>

      {/* Company Track Tabs + Challenge Switcher */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {ARENA_TRACKS.map((trk) => {
              const active = trk.id === activeTrack;
              return (
                <button
                  key={trk.id}
                  type="button"
                  onClick={() => handleSelectTrack(trk.id)}
                  className={`h-9 rounded-lg border px-4 text-xs font-medium transition-colors cursor-pointer ${active
                    ? "border-white/[0.28] bg-[#18181F] text-[#FAFAFA]"
                    : "border-white/[0.07] bg-[#0E0E12] text-[#A1A1AA] hover:border-white/[0.16] hover:text-[#FAFAFA]"
                    }`}
                >
                  {trk.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleStepChallenge(-1)}
              className="pf-btn-secondary inline-flex h-9 items-center rounded-lg px-3.5 text-xs font-medium cursor-pointer"
              title="Previous challenge in track"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => handleStepChallenge(1)}
              className="pf-btn-secondary inline-flex h-9 items-center rounded-lg px-3.5 text-xs font-medium cursor-pointer"
              title="Move to next challenge in this track"
            >
              Next Problem
            </button>
            <button
              type="button"
              disabled={isGeneratingProblem}
              onClick={() => void handleGenerateFreshProblem()}
              className="pf-btn-secondary inline-flex h-9 items-center rounded-lg px-4 text-xs font-medium disabled:opacity-50 cursor-pointer"
              title="Generate an infinite new AI coding challenge for this track"
            >
              {isGeneratingProblem ? "Generating..." : "New AI Problem"}
            </button>
          </div>
        </div>

        {/* Problem Pills Inside Active Track */}
        <div className="flex flex-wrap items-center gap-2.5">
          {trackChallenges.map((ch) => {
            const active = ch.id === activeChallenge.id;
            const isSolved = solvedIds.includes(ch.id);
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => resetForChallenge(ch)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-xs font-medium transition-colors cursor-pointer ${active
                  ? "border-white/[0.28] bg-[#18181F] text-[#FAFAFA]"
                  : "border-white/[0.07] bg-[#0E0E12] text-[#A1A1AA] hover:border-white/[0.16] hover:text-[#FAFAFA]"
                  }`}
              >
                <span>{ch.title}</span>
                {isSolved && (
                  <span className="rounded border border-white/[0.12] bg-black/50 px-1.5 py-0.5 font-mono text-[9px] text-[#FAFAFA]">
                    PASSED
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacious Split-Screen Grid */}
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left 5 cols: Problem + Clean Viva Box */}
        <div className="space-y-6 lg:col-span-5">
          <div className="pf-subpanel space-y-4 rounded-2xl p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="rounded-md border border-white/[0.1] bg-black/50 px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#FAFAFA]">
                {activeChallenge.company} · {activeChallenge.role}
              </span>
              <span className="font-mono text-[11px] text-[#A1A1AA]">
                {activeChallenge.difficulty}
              </span>
            </div>
            <p className="text-xs font-medium leading-[1.65] text-[#FAFAFA] sm:text-sm">
              {activeChallenge.question}
            </p>

            <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/45 p-4 font-mono text-[11px]">
              <div className="text-[#A1A1AA]">
                <span className="font-semibold text-[#FAFAFA]">Sample Input: </span>
                {activeChallenge.sampleInput}
              </div>
              <div className="text-[#A1A1AA]">
                <span className="font-semibold text-[#FAFAFA]">Expected Output: </span>
                {activeChallenge.expectedOutput}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeChallenge.expectedKeywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-md border border-white/[0.08] bg-black/45 px-2.5 py-1 font-mono text-[10px] text-[#A1A1AA]"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Clean Text / Voice Viva Box */}
          <div className="pf-subpanel space-y-3.5 rounded-2xl p-6 sm:p-7">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="arena-viva-explanation"
                className="text-xs font-medium text-[#FAFAFA]"
              >
                Complexity &amp; Approach Explanation
              </label>
              <button
                type="button"
                onClick={handleToggleVoiceViva}
                className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-medium transition-colors cursor-pointer ${isListeningVoice
                  ? "border-[#FAFAFA] bg-[#FAFAFA] text-[#09090B]"
                  : "pf-btn-secondary"
                  }`}
              >
                {isListeningVoice ? "Stop Mic" : "Speak"}
              </button>
            </div>

            <textarea
              id="arena-viva-explanation"
              name="arenaVivaExplanation"
              rows={4}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain your algorithm, time complexity O(...), space complexity O(...), and edge cases in your own words..."
              className="pf-input w-full rounded-xl p-4 text-xs leading-relaxed text-[#FAFAFA] placeholder-[#52525B]"
            />
          </div>

          {/* Verdict Card */}
          {verdictResult && (
            <div className="pf-subpanel space-y-4 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-[#FAFAFA]">
                  Live Hiring Verdict
                </span>
                <span className="rounded-md border border-white/[0.16] bg-[#16161C] px-3 py-1 font-mono text-xs font-semibold text-[#FAFAFA] tabular-nums">
                  {verdictResult.decision} · {verdictResult.overallScore}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div className="rounded-xl border border-white/[0.07] bg-black/45 p-3.5">
                  <span className="block text-[10px] text-[#A1A1AA]">Verified Code Score</span>
                  <span className="mt-1 block font-mono text-base font-semibold text-[#FAFAFA] tabular-nums">
                    {verdictResult.codeScore}/100
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-black/45 p-3.5">
                  <span className="block text-[10px] text-[#A1A1AA]">Viva Explanation Score</span>
                  <span className="mt-1 block font-mono text-base font-semibold text-[#FAFAFA] tabular-nums">
                    {verdictResult.vivaScore}/100
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                <p className="font-medium text-[#FAFAFA]">{verdictResult.verdictText}</p>
                {verdictResult.codeFeedback && (
                  <p>
                    <strong className="text-[#D4D4D8]">Code Review:</strong>{" "}
                    {verdictResult.codeFeedback}
                  </p>
                )}
                {verdictResult.vivaFeedback && (
                  <p>
                    <strong className="text-[#D4D4D8]">Viva Review:</strong>{" "}
                    {verdictResult.vivaFeedback}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowCorrectProgram(true)}
                  className="text-xs font-medium text-[#FAFAFA] underline underline-offset-4 hover:text-[#D4D4D8] cursor-pointer"
                >
                  Compare with optimal program
                </button>
                <button
                  type="button"
                  onClick={() => handleStepChallenge(1)}
                  className="pf-btn-secondary inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium cursor-pointer"
                >
                  Next Problem
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 7 cols: Machined 11-Language IDE Sandbox */}
        <div className="space-y-5 lg:col-span-7">
          <div className="pf-subpanel space-y-5 rounded-2xl p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="arena-language-select"
                  className="text-xs font-medium text-[#FAFAFA]"
                >
                  11-Language Compiler
                </label>
                <select
                  id="arena-language-select"
                  name="arenaLanguageSelect"
                  value={language}
                  onChange={(e) => {
                    const nextLang = normalizeLanguage(e.target.value);
                    setLanguage(nextLang);
                    if (nextLang === "python") {
                      setCode(activeChallenge.starterPython);
                    } else {
                      const found = SUPPORTED_LANGUAGES.find((l) => l.id === nextLang);
                      if (found) setCode(found.starter);
                    }
                    setCompilerOutput("");
                    setRunStatus("idle");
                  }}
                  className="pf-input h-9 rounded-lg px-3 font-mono text-xs text-[#FAFAFA] cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id} className="bg-[#09090B] text-[#FAFAFA]">
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCorrectProgram((prev) => !prev)}
                  className="pf-btn-secondary inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium cursor-pointer"
                >
                  {showCorrectProgram ? "Hide Solution" : "Show Solution"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLanguage("python");
                    setCode(activeChallenge.starterPython);
                    setCompilerOutput("");
                    setRunStatus("idle");
                  }}
                  className="pf-btn-secondary inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
                  title="Reset editor back to starter skeleton"
                >
                  Reset
                </button>

                <button
                  type="button"
                  disabled={isCompiling}
                  onClick={() => void runCodeOnBackend()}
                  className="pf-btn-secondary inline-flex h-9 items-center rounded-lg px-4 text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {isCompiling ? "Running..." : "Run Code"}
                </button>

                <button
                  type="button"
                  disabled={isEvaluating || isCompiling}
                  onClick={() => void handleEvaluateCodingAndViva()}
                  className="pf-btn-primary inline-flex h-9 items-center rounded-lg px-4 text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  {isEvaluating ? "Grading..." : "Submit Code & Viva"}
                </button>
              </div>
            </div>

            {/* Clean IDE Code Container */}
            <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#08080B]">
              <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0E0E13] px-4 py-2 font-mono text-[11px] text-[#71717A]">
                <span className="text-[#D4D4D8]">solution.{language === "python" ? "py" : language}</span>
                <span>Sandbox Execution Ready</span>
              </div>
              <textarea
                id="arena-code-editor"
                name="arenaCodeEditor"
                aria-label="Arena Source Code Editor"
                rows={12}
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-transparent p-5 font-mono text-xs leading-[1.7] text-[#FAFAFA] outline-none"
              />
            </div>

            {showCorrectProgram && (
              <div className="space-y-3 rounded-xl border border-white/[0.1] bg-black/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#FAFAFA]">
                    Optimal Reference Program (Python 3.11)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(activeChallenge.solutionPython);
                          toast.success("Reference program copied.");
                        } catch { }
                      }}
                      className="pf-btn-secondary inline-flex h-8 items-center rounded-lg px-3 text-[11px] font-medium cursor-pointer"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage("python");
                        setCode(activeChallenge.solutionPython);
                        setCompilerOutput("");
                        setRunStatus("idle");
                        toast.info("Loaded optimal reference program — click Run Code to test.");
                      }}
                      className="pf-btn-primary inline-flex h-8 items-center rounded-lg px-3 text-[11px] font-medium cursor-pointer"
                    >
                      Load into editor
                    </button>
                  </div>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-white/[0.07] bg-[#09090B] p-4 font-mono text-xs leading-relaxed text-[#FAFAFA]">
                  {activeChallenge.solutionPython}
                </pre>
                <p className="text-[11px] leading-relaxed text-[#A1A1AA]">
                  <strong className="font-medium text-[#FAFAFA]">Complexity Walkthrough:</strong>{" "}
                  {activeChallenge.complexityExplanation}
                </p>
              </div>
            )}

            {/* Execution Output Terminal */}
            <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/55 p-4.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-medium text-[#FAFAFA]">
                  Live Execution Output
                </span>
                {runStatus === "passed" && (
                  <span className="font-mono text-[#FAFAFA]">Sample Checks Passed</span>
                )}
                {runStatus === "wrong_output" && (
                  <span className="font-mono text-[#D4D4D8]">Wrong / Missing Output</span>
                )}
                {runStatus === "empty" && (
                  <span className="font-mono text-[#A1A1AA]">No Solution Written</span>
                )}
                {runStatus === "error" && (
                  <span className="font-mono text-[#D4D4D8]">Compile / Runtime Error</span>
                )}
              </div>
              <pre className="max-h-36 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#A1A1AA]">
                {compilerOutput ||
                  "Write your solution and click 'Run Code' or 'Submit Code & Viva' to test."}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
