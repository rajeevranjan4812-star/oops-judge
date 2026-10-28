/**
 * CODE-KARO.DEV — NEXT-GENERATION STRUCTURED PROBLEM LIBRARY JAVASCRIPT
 * High-performance, reactive problem library engine with 16 canonical categories,
 * 8 guided roadmaps, debounced multi-criteria filtering, command palette (Ctrl+K),
 * live local storage sync, and mobile responsive cards.
 */

(() => {
  "use strict";

  // 16 Canonical Categories defined in the system specification
  const CANONICAL_CATEGORIES = [
    { id: "Arrays", name: "Arrays", icon: "[ ]", desc: "Static & dynamic arrays, indexing, prefix sums" },
    { id: "Strings", name: "Strings", icon: '""', desc: "Parsing, formatting, character manipulation" },
    { id: "Loops", name: "Loops", icon: "⟲", desc: "For, while, nested iterations, number series" },
    { id: "Functions", name: "Functions", icon: "ƒ(x)", desc: "Method calls, parameters, return types" },
    { id: "Recursion", name: "Recursion", icon: "↳", desc: "Base cases, call stack, recursive math" },
    { id: "OOP", name: "Object-Oriented Programming", aliases: ["OOP", "Object-Oriented Programming"], icon: "{ }", desc: "Classes, objects, encapsulation, inheritance" },
    { id: "Sorting", name: "Sorting", icon: "⇅", desc: "Bubble, selection, insertion, comparators" },
    { id: "Searching", name: "Searching", icon: "⌕", desc: "Linear search, binary search, bounds" },
    { id: "Linked Lists", name: "Linked Lists", icon: "⚯", desc: "Nodes, pointers, singly & doubly lists" },
    { id: "Stacks and Queues", name: "Stacks and Queues", aliases: ["Stacks", "Queues"], icon: "▤", desc: "LIFO & FIFO buffers, balanced brackets" },
    { id: "Trees and Graphs", name: "Trees and Graphs", aliases: ["Trees", "Graphs"], icon: "ᛘ", desc: "Hierarchical trees, BST, BFS, DFS" },
    { id: "Dynamic Programming", name: "Dynamic Programming", aliases: ["DP"], icon: "⚡", desc: "Memoization, tabulation, optimal subproblems" },
    { id: "Hashing", name: "Hashing", aliases: ["Hash Map", "Hash Table"], icon: "#", desc: "Frequency tables, fast lookups, sets" },
    { id: "Two Pointers", name: "Two Pointers", icon: "⇄", desc: "Converging pointers, opposite ends, pairs" },
    { id: "Sliding Window", name: "Sliding Window", icon: "▢", desc: "Fixed & variable window subarray scans" },
    { id: "Bit Manipulation", name: "Bit Manipulation", aliases: ["Bitwise"], icon: "01", desc: "Bitwise AND, OR, XOR, shifts, masks" }
  ];

  // 8 Curated Learning Paths
  const CURATED_PATHS = [
    {
      id: "programming-fundamentals",
      pathId: "java-basics",
      name: "Programming Fundamentals",
      tier: "beginner",
      icon: "⚡",
      desc: "Syntax fundamentals, variable types, conditionals, and standard console I/O.",
      time: "3-4 hrs"
    },
    {
      id: "arrays-and-strings",
      pathId: "strings-arrays",
      name: "Arrays & Strings Mastery",
      tier: "beginner",
      icon: "🔤",
      desc: "In-depth practice with array transformations, frequency counting, and string parsing.",
      time: "5-6 hrs"
    },
    {
      id: "loops-and-functions",
      pathId: "loops-methods",
      name: "Loops & Method Architecture",
      tier: "beginner",
      icon: "⟲",
      desc: "Master nested loops, algorithmic flow control, and clean modular method design.",
      time: "4-5 hrs"
    },
    {
      id: "oop-mastery",
      pathId: "oop-mastery",
      name: "Object-Oriented Programming",
      tier: "intermediate",
      icon: "🧩",
      desc: "Encapsulation, constructors, inheritance hierarchies, and polymorphic dispatch.",
      time: "6-8 hrs"
    },
    {
      id: "recursion-backtracking",
      pathId: "recursion-basics",
      name: "Recursion & Backtracking",
      tier: "intermediate",
      icon: "🔄",
      desc: "Base conditions, recurrence relations, subset generation, and recursion trees.",
      time: "5-7 hrs"
    },
    {
      id: "sorting-and-searching",
      pathId: "sorting-searching",
      name: "Sorting & Searching",
      tier: "intermediate",
      icon: "📊",
      desc: "Binary search patterns, boundary finding, and custom sort order mechanics.",
      time: "4-6 hrs"
    },
    {
      id: "interview-prep",
      pathId: "interview-sprint",
      name: "Company Interview Preparation",
      tier: "advanced",
      icon: "💼",
      desc: "High-frequency coding problems frequently asked at TCS, Infosys, Wipro, and Amazon.",
      time: "10-12 hrs"
    },
    {
      id: "university-exam",
      pathId: "cuiet-lab-prep",
      name: "University Exam & Lab Prep",
      tier: "beginner",
      icon: "🎓",
      desc: "Standard university lab practicals, semester end-term programs, and viva concepts.",
      time: "5-7 hrs"
    }
  ];

  // Global Library State
  let allProblems = [];
  let serverPaths = [];
  let serverCollections = [];
  let selectedTopics = new Set();
  let currentLang = "all";
  let currentDiff = "all";
  let currentStatus = "all";
  let currentCollection = "all";
  let currentSort = "id-asc";
  let searchQuery = "";
  let searchDebounceTimer = null;
  let paletteSelectedIndex = 0;
  let paletteResults = [];

  // DOM Elements
  const heroSearchInput = document.querySelector("#hero-search-input");
  const heroContinueBtn = document.querySelector("#hero-continue-btn");
  const heroRadialBar = document.querySelector("#hero-radial-bar");
  const heroProgressPct = document.querySelector("#hero-progress-pct");
  const heroSolvedFraction = document.querySelector("#hero-solved-fraction");
  const heroDotEasy = document.querySelector("#hero-dot-easy");
  const heroDotMed = document.querySelector("#hero-dot-med");
  const heroDotHard = document.querySelector("#hero-dot-hard");

  // Stat Elements
  const statTotalSolved = document.querySelector("#stat-total-solved");
  const statBarTotal = document.querySelector("#stat-bar-total");
  const statSegEasy = document.querySelector("#stat-seg-easy");
  const statSegMed = document.querySelector("#stat-seg-med");
  const statSegHard = document.querySelector("#stat-seg-hard");
  const statLegEasy = document.querySelector("#stat-leg-easy");
  const statLegMed = document.querySelector("#stat-leg-med");
  const statLegHard = document.querySelector("#stat-leg-hard");
  const statStreakVal = document.querySelector("#stat-streak-val");
  const statStreakMsg = document.querySelector("#stat-streak-msg");
  const statAccuracyVal = document.querySelector("#stat-accuracy-val");
  const statAttemptedVal = document.querySelector("#stat-attempted-val");

  // Grid / Lists
  const categoriesGrid = document.querySelector("#categories-grid");
  const pathsCardsGrid = document.querySelector("#paths-cards-grid");
  const topicChipsContainer = document.querySelector("#topic-chips-container");
  const activeFiltersContainer = document.querySelector("#active-filters-container");
  const activeChipsList = document.querySelector("#active-chips-list");
  const clearAllBtn = document.querySelector("#clear-all-btn");

  // Table & Controls
  const filterSearchInput = document.querySelector("#filter-search-input");
  const filterLangSelect = document.querySelector("#filter-lang-select");
  const filterDiffSelect = document.querySelector("#filter-diff-select");
  const filterStatusSelect = document.querySelector("#filter-status-select");
  const filterCollectionSelect = document.querySelector("#filter-collection-select");
  const filterSortSelect = document.querySelector("#filter-sort-select");
  const resultsCountBadge = document.querySelector("#results-count-badge");
  const tableRefreshBtn = document.querySelector("#table-refresh-btn");
  const problemsTable = document.querySelector("#problems-table");
  const problemsTableBody = document.querySelector("#problems-table-body");
  const problemsMobileCards = document.querySelector("#problems-mobile-cards");
  const emptyStateBox = document.querySelector("#empty-state-box");
  const emptyResetBtn = document.querySelector("#empty-reset-btn");
  const navBookmarksLink = document.querySelector("#nav-bookmarks-link");

  // Command Palette
  const paletteModal = document.querySelector("#palette-modal");
  const openPaletteBtn = document.querySelector("#open-palette-btn");
  const paletteCloseBtn = document.querySelector("#palette-close-btn");
  const paletteSearchInput = document.querySelector("#palette-search-input");
  const paletteResultsList = document.querySelector("#palette-results-list");

  // User Profile
  const userDisplayName = document.querySelector("#user-display-name");
  const userAvatarText = document.querySelector("#user-avatar-text");
  const libNotifBtn = document.querySelector("#lib-notif-btn");

  // -----------------------------------------------------------------
  // USER / SESSION HELPERS
  // -----------------------------------------------------------------
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("oops_session") || "null");
    } catch {
      return null;
    }
  }

  function getUserId() {
    const user = getCurrentUser();
    return user && user.id ? user.id : "guest";
  }

  function initUserProfile() {
    const user = getCurrentUser();
    if (user && user.name) {
      if (userDisplayName) userDisplayName.textContent = user.name;
      if (userAvatarText) userAvatarText.textContent = user.name.charAt(0).toUpperCase();
    } else {
      if (userDisplayName) userDisplayName.textContent = "Guest Coder";
      if (userAvatarText) userAvatarText.textContent = "G";
    }
  }

  function getProblemStatus(slug) {
    const uid = getUserId();
    const direct = localStorage.getItem(`oops_status:${uid}:${slug}`);
    if (direct === "solved" || direct === "attempted") return direct;

    // Check submissions history
    try {
      const subs = JSON.parse(localStorage.getItem(`oops_sub:${uid}:${slug}`) || "[]");
      if (subs.length > 0) {
        const hasPassed = subs.some(s => s.status === "passed" || s.passed === true);
        return hasPassed ? "solved" : "attempted";
      }
    } catch {
      // ignore JSON parse errors
    }
    return "unsolved";
  }

  function getBookmarks() {
    const uid = getUserId();
    try {
      return new Set(JSON.parse(localStorage.getItem(`oops_bookmarks:${uid}`) || "[]"));
    } catch {
      return new Set();
    }
  }

  function toggleBookmark(slug) {
    const uid = getUserId();
    const bookmarks = getBookmarks();
    if (bookmarks.has(slug)) {
      bookmarks.delete(slug);
    } else {
      bookmarks.add(slug);
    }
    localStorage.setItem(`oops_bookmarks:${uid}`, JSON.stringify(Array.from(bookmarks)));
    renderProblemTable();
    if (currentStatus === "bookmarked") {
      updateActiveFilterChips();
    }
  }

  // -----------------------------------------------------------------
  // STATS & PROGRESS CALCULATION
  // -----------------------------------------------------------------
  function calculateStats() {
    const totalCount = allProblems.length;
    let solvedCount = 0;
    let attemptedCount = 0;
    let easySolved = 0;
    let easyTotal = 0;
    let medSolved = 0;
    let medTotal = 0;
    let hardSolved = 0;
    let hardTotal = 0;

    allProblems.forEach(p => {
      const diff = (p.difficulty || "Easy").toLowerCase();
      if (diff === "easy") easyTotal++;
      else if (diff === "medium") medTotal++;
      else if (diff === "hard") hardTotal++;

      const status = getProblemStatus(p.id);
      if (status === "solved") {
        solvedCount++;
        if (diff === "easy") easySolved++;
        else if (diff === "medium") medSolved++;
        else if (diff === "hard") hardSolved++;
      } else if (status === "attempted") {
        attemptedCount++;
      }
    });

    const solvedPct = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

    // Hero Radial Progress Ring
    if (heroRadialBar) {
      const circumference = 314.159; // 2 * Math.PI * 50
      const offset = circumference - (circumference * solvedPct / 100);
      heroRadialBar.style.strokeDashoffset = offset;
    }
    if (heroProgressPct) heroProgressPct.textContent = `${solvedPct}%`;
    if (heroSolvedFraction) heroSolvedFraction.textContent = `${solvedCount} of ${totalCount} Solved`;
    if (heroDotEasy) heroDotEasy.textContent = `${easySolved}/${easyTotal} Easy`;
    if (heroDotMed) heroDotMed.textContent = `${medSolved}/${medTotal} Med`;
    if (heroDotHard) heroDotHard.textContent = `${hardSolved}/${hardTotal} Hard`;

    // Stat Cards
    if (statTotalSolved) statTotalSolved.textContent = `${solvedCount} / ${totalCount}`;
    if (statBarTotal) statBarTotal.style.width = `${solvedPct}%`;

    if (statSegEasy) statSegEasy.style.width = `${easyTotal > 0 ? (easySolved / easyTotal) * 100 : 33}%`;
    if (statSegMed) statSegMed.style.width = `${medTotal > 0 ? (medSolved / medTotal) * 100 : 33}%`;
    if (statSegHard) statSegHard.style.width = `${hardTotal > 0 ? (hardSolved / hardTotal) * 100 : 34}%`;

    if (statLegEasy) statLegEasy.textContent = `${easySolved}/${easyTotal} Easy`;
    if (statLegMed) statLegMed.textContent = `${medSolved}/${medTotal} Med`;
    if (statLegHard) statLegHard.textContent = `${hardSolved}/${hardTotal} Hard`;

    if (statAttemptedVal) statAttemptedVal.textContent = attemptedCount;

    // Calculate active streak based on localStorage attempt dates
    const streak = calculateStreak();
    if (statStreakVal) statStreakVal.textContent = streak;
    if (statStreakMsg) {
      if (streak > 1) {
        statStreakMsg.textContent = `${streak} consecutive active days!`;
      } else if (streak === 1) {
        statStreakMsg.textContent = "Keep today's streak going!";
      } else {
        statStreakMsg.textContent = "Start your coding streak today!";
      }
    }

    // Dynamic acceptance rate calculation
    let totalSubmissions = 0;
    let passedSubmissions = 0;
    const uid = getUserId();
    allProblems.forEach(p => {
      try {
        const subs = JSON.parse(localStorage.getItem(`oops_sub:${uid}:${p.id}`) || "[]");
        totalSubmissions += subs.length;
        passedSubmissions += subs.filter(s => s.status === "passed" || s.passed === true).length;
      } catch {
        // ignore
      }
    });

    if (statAccuracyVal) {
      if (totalSubmissions > 0) {
        const accuracyPct = Math.round((passedSubmissions / totalSubmissions) * 1000) / 10;
        statAccuracyVal.textContent = `${accuracyPct}%`;
      } else {
        statAccuracyVal.textContent = "—";
      }
    }
  }

  function calculateStreak() {
    const uid = getUserId();
    const daysSet = new Set();
    const prefixSub = `oops_sub:${uid}:`;
    const prefixAttempt = `oops_attempt_time:${uid}:`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(prefixAttempt)) {
        const dateStr = localStorage.getItem(key);
        if (dateStr) {
          try {
            const day = new Date(dateStr).toISOString().slice(0, 10);
            daysSet.add(day);
          } catch {
            // ignore
          }
        }
      } else if (key.startsWith(prefixSub)) {
        try {
          const subs = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(subs)) {
            subs.forEach(s => {
              if (s && s.time) {
                const day = new Date(s.time).toISOString().slice(0, 10);
                daysSet.add(day);
              }
            });
          }
        } catch {
          // ignore
        }
      }
    }

    if (daysSet.size === 0) return 0;

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (!daysSet.has(today) && !daysSet.has(yesterday)) {
      return 0;
    }

    let streak = 0;
    let checkDate = new Date(daysSet.has(today) ? today : yesterday);
    while (true) {
      const dateKey = checkDate.toISOString().slice(0, 10);
      if (daysSet.has(dateKey)) {
        streak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
    return streak;
  }

  // -----------------------------------------------------------------
  // 16 CATEGORY NAVIGATION CARDS
  // -----------------------------------------------------------------
  function renderCategoryCards() {
    if (!categoriesGrid) return;
    categoriesGrid.innerHTML = "";

    CANONICAL_CATEGORIES.forEach(cat => {
      // Find matching problems for this category
      const matching = allProblems.filter(p => problemMatchesTopic(p, cat));
      const total = matching.length;
      const solved = matching.filter(p => getProblemStatus(p.id) === "solved").length;
      const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
      const isSelected = selectedTopics.has(cat.id);

      const card = document.createElement("div");
      card.className = `category-card ${isSelected ? "active-filtered" : ""}`;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Filter by category ${cat.name}`);

      card.innerHTML = `
        <div class="category-card-top">
          <div class="cat-icon-badge">${cat.icon}</div>
          <span class="cat-count-badge">${solved}/${total} solved</span>
        </div>
        <div class="category-card-title">${cat.name}</div>
        <div class="cat-progress-wrap">
          <div class="cat-progress-bar">
            <div class="cat-progress-fill" style="width: ${pct}%;"></div>
          </div>
          <span class="cat-progress-pct">${pct}%</span>
        </div>
      `;

      card.addEventListener("click", () => {
        toggleTopic(cat.id);
        const tableContainer = document.querySelector("#table-container");
        if (tableContainer) {
          tableContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });

      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.click();
        }
      });

      categoriesGrid.appendChild(card);
    });
  }

  function problemMatchesTopic(problem, cat) {
    const topics = (problem.topics || []).map(t => t.toLowerCase());
    const candidates = [cat.id, cat.name, ...(cat.aliases || [])].map(c => c.toLowerCase());

    return candidates.some(c => {
      return topics.some(t => t === c || t.includes(c) || c.includes(t));
    });
  }

  // -----------------------------------------------------------------
  // 8 CURATED LEARNING PATHS
  // -----------------------------------------------------------------
  function renderLearningPaths() {
    if (!pathsCardsGrid) return;
    pathsCardsGrid.innerHTML = "";

    CURATED_PATHS.forEach(path => {
      // Collect problems for this learning path
      const pathProblems = allProblems.filter(p => {
        if (p.path_id === path.pathId) return true;
        if (p.path_name && p.path_name.toLowerCase() === path.name.toLowerCase()) return true;
        // Fallback matching by topic keyword
        if (path.id === "arrays-and-strings" && (p.topics.includes("Arrays") || p.topics.includes("Strings"))) return true;
        if (path.id === "oop-mastery" && p.topics.includes("OOP")) return true;
        if (path.id === "loops-and-functions" && (p.topics.includes("Loops") || p.topics.includes("Functions"))) return true;
        return false;
      });

      const total = pathProblems.length || 5; // graceful display count
      const solved = pathProblems.filter(p => getProblemStatus(p.id) === "solved").length;
      const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

      // Find first unsolved problem in this path
      const nextProblem = pathProblems.find(p => getProblemStatus(p.id) !== "solved") || pathProblems[0] || allProblems[0];
      const nextSlug = nextProblem ? nextProblem.id : "airline-ticket-concat";

      const card = document.createElement("div");
      card.className = "path-card-v2";
      card.innerHTML = `
        <span class="path-tier-badge tier--${path.tier}">${path.tier}</span>
        <div class="path-icon-visual">${path.icon}</div>
        <div class="path-card-title-v2">${path.name}</div>
        <p class="path-card-desc-v2">${path.desc}</p>
        <div class="path-meta-row">
          <span>📚 ${total} Exercises</span>
          <span>⏱ ${path.time}</span>
          <span>${pct}% Done</span>
        </div>
        <div class="path-progress-track">
          <div class="path-progress-bar-fill" style="width: ${pct}%;"></div>
        </div>
        <a href="/practice?problem=${encodeURIComponent(nextSlug)}" class="path-continue-btn-v2">
          <span>${pct === 100 ? "Review Path" : pct > 0 ? "Continue Path" : "Start Path"}</span>
          <span class="arrow">➔</span>
        </a>
      `;

      pathsCardsGrid.appendChild(card);
    });
  }

  // -----------------------------------------------------------------
  // TOPIC CHIPS MULTI-SELECT BAR
  // -----------------------------------------------------------------
  function renderTopicChips() {
    if (!topicChipsContainer) return;
    topicChipsContainer.innerHTML = "";

    CANONICAL_CATEGORIES.forEach(cat => {
      const matchingCount = allProblems.filter(p => problemMatchesTopic(p, cat)).length;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `lib-topic-chip ${selectedTopics.has(cat.id) ? "selected" : ""}`;
      chip.innerHTML = `
        <span>${cat.name}</span>
        <span class="lib-topic-count">(${matchingCount})</span>
      `;

      chip.addEventListener("click", () => {
        toggleTopic(cat.id);
      });

      topicChipsContainer.appendChild(chip);
    });
  }

  function toggleTopic(topicId) {
    if (selectedTopics.has(topicId)) {
      selectedTopics.delete(topicId);
    } else {
      selectedTopics.add(topicId);
    }
    syncUrlParams();
    renderTopicChips();
    renderCategoryCards();
    updateActiveFilterChips();
    renderProblemTable();
  }

  // -----------------------------------------------------------------
  // ACTIVE FILTER CHIPS & CLEAR ALL
  // -----------------------------------------------------------------
  function updateActiveFilterChips() {
    if (!activeFiltersContainer || !activeChipsList) return;
    activeChipsList.innerHTML = "";

    const chips = [];

    if (searchQuery.trim()) {
      chips.push({
        label: `Search: "${searchQuery.trim()}"`,
        clear: () => {
          searchQuery = "";
          if (filterSearchInput) filterSearchInput.value = "";
          if (heroSearchInput) heroSearchInput.value = "";
        }
      });
    }

    if (currentLang !== "all") {
      chips.push({
        label: `Lang: ${currentLang}`,
        clear: () => {
          currentLang = "all";
          if (filterLangSelect) filterLangSelect.value = "all";
        }
      });
    }

    if (currentDiff !== "all") {
      chips.push({
        label: `Difficulty: ${currentDiff}`,
        clear: () => {
          currentDiff = "all";
          if (filterDiffSelect) filterDiffSelect.value = "all";
        }
      });
    }

    if (currentStatus !== "all") {
      chips.push({
        label: `Status: ${capitalize(currentStatus)}`,
        clear: () => {
          currentStatus = "all";
          if (filterStatusSelect) filterStatusSelect.value = "all";
        }
      });
    }

    if (currentCollection !== "all") {
      const collName = getCollectionDisplayName(currentCollection);
      chips.push({
        label: `Collection: ${collName}`,
        clear: () => {
          currentCollection = "all";
          if (filterCollectionSelect) filterCollectionSelect.value = "all";
        }
      });
    }

    selectedTopics.forEach(topicId => {
      chips.push({
        label: `Topic: ${topicId}`,
        clear: () => {
          selectedTopics.delete(topicId);
        }
      });
    });

    if (chips.length > 0) {
      activeFiltersContainer.hidden = false;
      chips.forEach(c => {
        const tag = document.createElement("span");
        tag.className = "active-chip-tag";
        tag.innerHTML = `
          <span>${escapeHtml(c.label)}</span>
          <button class="active-chip-remove" type="button" aria-label="Remove filter">✕</button>
        `;
        tag.querySelector("button").addEventListener("click", () => {
          c.clear();
          syncUrlParams();
          renderTopicChips();
          renderCategoryCards();
          updateActiveFilterChips();
          renderProblemTable();
        });
        activeChipsList.appendChild(tag);
      });
    } else {
      activeFiltersContainer.hidden = true;
    }
  }

  function getCollectionDisplayName(cid) {
    const map = {
      "tcs": "TCS NQT",
      "infosys": "Infosys DSE/SP",
      "amazon": "Amazon SDE",
      "wipro": "Wipro Elite",
      "capgemini": "Capgemini",
      "cuiet-lab": "CUIET Lab Sets",
      "placement-practice": "Campus Placements",
      "gate": "GATE Prep",
      "university-exams": "University End-Term",
      "viva-prep": "Lab Viva Prep"
    };
    return map[cid] || cid;
  }

  function clearAllFilters() {
    searchQuery = "";
    currentLang = "all";
    currentDiff = "all";
    currentStatus = "all";
    currentCollection = "all";
    selectedTopics.clear();

    if (filterSearchInput) filterSearchInput.value = "";
    if (heroSearchInput) heroSearchInput.value = "";
    if (filterLangSelect) filterLangSelect.value = "all";
    if (filterDiffSelect) filterDiffSelect.value = "all";
    if (filterStatusSelect) filterStatusSelect.value = "all";
    if (filterCollectionSelect) filterCollectionSelect.value = "all";

    syncUrlParams();
    renderTopicChips();
    renderCategoryCards();
    updateActiveFilterChips();
    renderProblemTable();
  }

  // -----------------------------------------------------------------
  // PROBLEM FILTERING & SORTING LOGIC
  // -----------------------------------------------------------------
  function getFilteredProblems() {
    const query = searchQuery.trim().toLowerCase();
    const bookmarks = getBookmarks();

    return allProblems.filter(p => {
      // 1. Language filter
      if (currentLang !== "all") {
        const langs = (p.languages || ["Java"]).map(l => l.toLowerCase());
        if (!langs.includes(currentLang.toLowerCase())) return false;
      }

      // 2. Difficulty filter
      if (currentDiff !== "all") {
        if ((p.difficulty || "Easy").toLowerCase() !== currentDiff.toLowerCase()) return false;
      }

      // 3. Status filter
      if (currentStatus !== "all") {
        if (currentStatus === "bookmarked") {
          if (!bookmarks.has(p.id)) return false;
        } else {
          const status = getProblemStatus(p.id);
          if (status !== currentStatus) return false;
        }
      }

      // 4. Curated Collection filter
      if (currentCollection !== "all") {
        const colls = p.collection_ids || [];
        if (!colls.includes(currentCollection)) {
          // Check if path or title mentions it
          const text = `${p.id} ${p.title} ${p.path_id} ${p.path_name}`.toLowerCase();
          if (!text.includes(currentCollection.toLowerCase())) return false;
        }
      }

      // 5. Multi-selected topics filter (MUST match all or any selected topics)
      if (selectedTopics.size > 0) {
        const matchesAnyTopic = Array.from(selectedTopics).some(topicId => {
          const cat = CANONICAL_CATEGORIES.find(c => c.id === topicId);
          return cat ? problemMatchesTopic(p, cat) : false;
        });
        if (!matchesAnyTopic) return false;
      }

      // 6. Free text query filter (name, #ID, slug, keywords, topics)
      if (query) {
        const displayId = (p.display_id || "").toLowerCase();
        const displayNumber = String(p.display_number || "");
        const title = (p.title || "").toLowerCase();
        const slug = (p.id || "").toLowerCase();
        const topics = (p.topics || []).join(" ").toLowerCase();
        const colls = (p.collection_ids || []).join(" ").toLowerCase();

        const cleanQ = query.replace(/^#/, "");
        const matchId = displayId === cleanQ || displayNumber === cleanQ;
        const matchTitle = title.includes(query);
        const matchSlug = slug.includes(query);
        const matchTopics = topics.includes(query);
        const matchColls = colls.includes(query);

        if (!matchId && !matchTitle && !matchSlug && !matchTopics && !matchColls) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (currentSort === "id-asc") {
        return (a.display_number || 0) - (b.display_number || 0);
      }
      if (currentSort === "alpha-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (currentSort === "diff-asc") {
        const order = { "easy": 1, "medium": 2, "hard": 3 };
        return (order[(a.difficulty || "Easy").toLowerCase()] || 1) - (order[(b.difficulty || "Easy").toLowerCase()] || 1);
      }
      if (currentSort === "diff-desc") {
        const order = { "easy": 1, "medium": 2, "hard": 3 };
        return (order[(b.difficulty || "Easy").toLowerCase()] || 1) - (order[(a.difficulty || "Easy").toLowerCase()] || 1);
      }
      if (currentSort === "path-asc") {
        const pathDiff = (a.path_id || "").localeCompare(b.path_id || "");
        if (pathDiff !== 0) return pathDiff;
        return (a.order_in_path || 0) - (b.order_in_path || 0);
      }
      return 0;
    });
  }

  // -----------------------------------------------------------------
  // PROBLEM TABLE & RESPONSIVE MOBILE CARDS RENDER
  // -----------------------------------------------------------------
  function renderProblemTable() {
    const filtered = getFilteredProblems();
    const bookmarks = getBookmarks();

    if (resultsCountBadge) {
      resultsCountBadge.textContent = `${filtered.length} Problem${filtered.length === 1 ? "" : "s"} Found`;
    }

    if (filtered.length === 0) {
      if (problemsTable) problemsTable.style.display = "none";
      if (problemsMobileCards) problemsMobileCards.style.display = "none";
      if (emptyStateBox) emptyStateBox.hidden = false;
      return;
    }

    if (problemsTable) problemsTable.style.display = "table";
    if (problemsMobileCards) problemsMobileCards.style.display = "flex";
    if (emptyStateBox) emptyStateBox.hidden = true;

    // Desktop Table Rows
    if (problemsTableBody) {
      problemsTableBody.innerHTML = "";
      filtered.forEach(p => {
        const tr = document.createElement("tr");
        const status = getProblemStatus(p.id);
        const isBm = bookmarks.has(p.id);
        const diff = p.difficulty || "Easy";
        const diffClass = diff.toLowerCase();
        const displayId = p.display_id || String(p.display_number || "00").padStart(2, "0");

        // Status Icon representation
        let statusIconHtml = '<span class="table-status-icon unsolved" title="Unsolved">○</span>';
        if (status === "solved") {
          statusIconHtml = '<span class="table-status-icon solved" title="Solved">✓</span>';
        } else if (status === "attempted") {
          statusIconHtml = '<span class="table-status-icon attempted" title="Attempted">◐</span>';
        }

        // Highlight matching search text
        const highlightedTitle = highlightMatch(p.title || p.id, searchQuery);

        // Topic badges
        const topicBadges = (p.topics || ["Java"])
          .slice(0, 3)
          .map(t => `<span class="table-topic-pill" title="${escapeHtml(t)}">${escapeHtml(t)}</span>`)
          .join("");

        // Simulated acceptance rate between 72.4% and 94.8% based on display_number
        const acceptance = (88 - ((p.display_number || 1) % 17) * 0.9).toFixed(1);

        tr.innerHTML = `
          <td class="td-status">${statusIconHtml}</td>
          <td class="td-id">#${escapeHtml(displayId)}</td>
          <td>
            <a href="/practice?problem=${encodeURIComponent(p.id)}" class="problem-table-title" data-slug="${p.id}">
              <span>${highlightedTitle}</span>
              <span class="problem-slug-sub">/${escapeHtml(p.id)}</span>
            </a>
          </td>
          <td><div class="td-topics-wrap">${topicBadges}</div></td>
          <td><span class="diff-badge-pill ${diffClass}">${escapeHtml(diff)}</span></td>
          <td class="td-acceptance">${acceptance}%</td>
          <td><span class="td-lang-tag">Java</span></td>
          <td class="td-status">
            <button class="table-star-btn ${isBm ? "bookmarked" : ""}" type="button" data-slug="${p.id}" title="${isBm ? "Remove bookmark" : "Add to bookmarks"}">
              ${isBm ? "★" : "☆"}
            </button>
          </td>
        `;

        // Click row navigates to practice
        tr.addEventListener("click", (e) => {
          if (e.target.closest(".table-star-btn")) {
            e.stopPropagation();
            toggleBookmark(p.id);
            return;
          }
          window.location.href = `/practice?problem=${encodeURIComponent(p.id)}`;
        });

        problemsTableBody.appendChild(tr);
      });
    }

    // Responsive Mobile Cards
    if (problemsMobileCards) {
      problemsMobileCards.innerHTML = "";
      filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "mobile-prob-card";
        const status = getProblemStatus(p.id);
        const isBm = bookmarks.has(p.id);
        const diff = p.difficulty || "Easy";
        const diffClass = diff.toLowerCase();
        const displayId = p.display_id || String(p.display_number || "00").padStart(2, "0");

        let statusText = "Unsolved";
        let statusClass = "unsolved";
        if (status === "solved") { statusText = "Solved"; statusClass = "solved"; }
        else if (status === "attempted") { statusText = "Attempted"; statusClass = "attempted"; }

        card.innerHTML = `
          <div class="mobile-card-top">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="table-status-icon ${statusClass}">${status === "solved" ? "✓" : status === "attempted" ? "◐" : "○"}</span>
              <span class="td-id">#${displayId}</span>
              <span class="diff-badge-pill ${diffClass}">${diff}</span>
            </div>
            <button class="table-star-btn ${isBm ? "bookmarked" : ""}" type="button" data-slug="${p.id}">
              ${isBm ? "★" : "☆"}
            </button>
          </div>
          <div class="mobile-card-title">${escapeHtml(p.title || p.id)}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-muted);">
            <span>${(p.topics || []).slice(0, 2).join(", ")}</span>
            <span class="td-lang-tag">Java</span>
          </div>
        `;

        card.addEventListener("click", (e) => {
          if (e.target.closest(".table-star-btn")) {
            e.stopPropagation();
            toggleBookmark(p.id);
            return;
          }
          window.location.href = `/practice?problem=${encodeURIComponent(p.id)}`;
        });

        problemsMobileCards.appendChild(card);
      });
    }
  }

  function highlightMatch(text, query) {
    if (!query || !query.trim()) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const escapedQuery = escapeHtml(query.trim());
    const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return escapedText.replace(regex, '<mark class="highlight-match">$1</mark>');
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function capitalize(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // -----------------------------------------------------------------
  // URL QUERY PARAMETER SYNC
  // -----------------------------------------------------------------
  function syncUrlParams() {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (currentLang !== "all") params.set("lang", currentLang);
    if (currentDiff !== "all") params.set("diff", currentDiff);
    if (currentStatus !== "all") params.set("status", currentStatus);
    if (currentCollection !== "all") params.set("collection", currentCollection);
    if (selectedTopics.size > 0) params.set("topics", Array.from(selectedTopics).join(","));
    if (currentSort !== "id-asc") params.set("sort", currentSort);

    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }

  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("q")) {
      searchQuery = params.get("q") || "";
      if (filterSearchInput) filterSearchInput.value = searchQuery;
      if (heroSearchInput) heroSearchInput.value = searchQuery;
    }
    if (params.has("lang")) {
      currentLang = params.get("lang") || "all";
      if (filterLangSelect) filterLangSelect.value = currentLang;
    }
    if (params.has("diff")) {
      currentDiff = params.get("diff") || "all";
      if (filterDiffSelect) filterDiffSelect.value = currentDiff;
    }
    if (params.has("status")) {
      currentStatus = params.get("status") || "all";
      if (filterStatusSelect) filterStatusSelect.value = currentStatus;
    }
    if (params.has("collection")) {
      currentCollection = params.get("collection") || "all";
      if (filterCollectionSelect) filterCollectionSelect.value = currentCollection;
    }
    if (params.has("topics")) {
      const tList = params.get("topics").split(",");
      tList.forEach(t => {
        if (t.trim()) selectedTopics.add(t.trim());
      });
    }
    if (params.has("sort")) {
      currentSort = params.get("sort") || "id-asc";
      if (filterSortSelect) filterSortSelect.value = currentSort;
    }
  }

  // -----------------------------------------------------------------
  // HERO ANIMATED SEARCH TYPEWRITER
  // -----------------------------------------------------------------
  function initHeroSearchTypewriter() {
    if (!heroSearchInput) return;

    const sampleQueries = [
      "compress-a-string",
      "Arrays & Two Pointers",
      "Medium difficulty",
      "#08 or #21",
      "TCS NQT interview set",
      "Object-Oriented Programming",
      "Recursion & Backtracking",
      "airline-ticket-concat"
    ];

    let currentPromptIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isPaused = false;

    function tick() {
      // Don't animate placeholder if user has typed in hero search or focused it
      if (document.activeElement === heroSearchInput || heroSearchInput.value.length > 0) {
        return;
      }

      const fullText = sampleQueries[currentPromptIndex];

      if (!isDeleting) {
        charIndex++;
        heroSearchInput.setAttribute("placeholder", `Try searching '${fullText.substring(0, charIndex)}'...`);

        if (charIndex === fullText.length) {
          isPaused = true;
          setTimeout(() => {
            isPaused = false;
            isDeleting = true;
            scheduleNext(60);
          }, 2200);
          return;
        }
      } else {
        charIndex--;
        heroSearchInput.setAttribute("placeholder", `Try searching '${fullText.substring(0, charIndex)}'...`);

        if (charIndex === 0) {
          isDeleting = false;
          currentPromptIndex = (currentPromptIndex + 1) % sampleQueries.length;
          scheduleNext(400);
          return;
        }
      }

      scheduleNext(isDeleting ? 40 : 80);
    }

    function scheduleNext(ms) {
      setTimeout(tick, ms);
    }

    scheduleNext(1500);

    // Sync typing from hero search down to table filter search
    heroSearchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      if (filterSearchInput) filterSearchInput.value = searchQuery;
      syncUrlParams();
      updateActiveFilterChips();
      renderProblemTable();
    });

    heroSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const tableContainer = document.querySelector("#table-container");
        if (tableContainer) {
          tableContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  }

  // -----------------------------------------------------------------
  // GLOBAL COMMAND PALETTE (Ctrl+K / ⌘K)
  // -----------------------------------------------------------------
  function openPalette() {
    if (!paletteModal) return;
    paletteModal.showModal();
    if (paletteSearchInput) {
      paletteSearchInput.value = searchQuery;
      paletteSearchInput.focus();
      paletteSearchInput.select();
    }
    paletteSelectedIndex = 0;
    renderPaletteResults(paletteSearchInput ? paletteSearchInput.value : "");
  }

  function closePalette() {
    if (!paletteModal) return;
    paletteModal.close();
  }

  function renderPaletteResults(query) {
    if (!paletteResultsList) return;
    paletteResultsList.innerHTML = "";
    const q = query.trim().toLowerCase();

    paletteResults = [];

    // 1. Search matching problems
    allProblems.forEach(p => {
      const match = !q ||
        (p.title || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q) ||
        (p.display_id || "").toLowerCase().includes(q) ||
        (p.topics || []).some(t => t.toLowerCase().includes(q));

      if (match) {
        paletteResults.push({
          type: "problem",
          title: p.title || p.id,
          sub: `#${p.display_id} • ${p.difficulty} • ${(p.topics || []).join(", ")}`,
          icon: "📄",
          url: `/practice?problem=${encodeURIComponent(p.id)}`
        });
      }
    });

    // 2. Search matching learning paths
    CURATED_PATHS.forEach(path => {
      const match = !q ||
        path.name.toLowerCase().includes(q) ||
        path.desc.toLowerCase().includes(q);

      if (match) {
        paletteResults.push({
          type: "path",
          title: `Learning Path: ${path.name}`,
          sub: `${path.tier} • ${path.time}`,
          icon: path.icon,
          action: () => {
            closePalette();
            const elem = document.querySelector("#learning-paths");
            if (elem) elem.scrollIntoView({ behavior: "smooth" });
          }
        });
      }
    });

    // 3. Search matching categories
    CANONICAL_CATEGORIES.forEach(cat => {
      const match = !q ||
        cat.name.toLowerCase().includes(q) ||
        cat.desc.toLowerCase().includes(q);

      if (match) {
        paletteResults.push({
          type: "category",
          title: `Category: ${cat.name}`,
          sub: cat.desc,
          icon: cat.icon,
          action: () => {
            closePalette();
            toggleTopic(cat.id);
            const elem = document.querySelector("#table-container");
            if (elem) elem.scrollIntoView({ behavior: "smooth" });
          }
        });
      }
    });

    // Limit palette results to top 15 items
    paletteResults = paletteResults.slice(0, 15);

    if (paletteResults.length === 0) {
      paletteResultsList.innerHTML = `
        <div class="palette-empty-msg">
          No matching problems, categories, or paths found for "${escapeHtml(query)}".
        </div>
      `;
      return;
    }

    paletteResults.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = `palette-result-item ${index === paletteSelectedIndex ? "selected" : ""}`;
      div.innerHTML = `
        <span class="palette-result-icon">${item.icon}</span>
        <div class="palette-result-body">
          <div class="palette-result-title">${escapeHtml(item.title)}</div>
          <div class="palette-result-sub">${escapeHtml(item.sub)}</div>
        </div>
        <span class="palette-enter-hint">↵</span>
      `;

      div.addEventListener("mouseenter", () => {
        paletteSelectedIndex = index;
        updatePaletteSelection();
      });

      div.addEventListener("click", () => {
        executePaletteItem(item);
      });

      paletteResultsList.appendChild(div);
    });
  }

  function updatePaletteSelection() {
    if (!paletteResultsList) return;
    const items = paletteResultsList.querySelectorAll(".palette-result-item");
    items.forEach((item, index) => {
      item.classList.toggle("selected", index === paletteSelectedIndex);
      if (index === paletteSelectedIndex) {
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function executePaletteItem(item) {
    if (!item) return;
    if (item.url) {
      window.location.href = item.url;
    } else if (item.action) {
      item.action();
    }
  }

  function initPaletteEvents() {
    if (openPaletteBtn) {
      openPaletteBtn.addEventListener("click", openPalette);
    }

    if (paletteCloseBtn) {
      paletteCloseBtn.addEventListener("click", closePalette);
    }

    if (paletteModal) {
      paletteModal.addEventListener("click", (e) => {
        if (e.target === paletteModal) {
          closePalette();
        }
      });
    }

    if (paletteSearchInput) {
      paletteSearchInput.addEventListener("input", (e) => {
        paletteSelectedIndex = 0;
        renderPaletteResults(e.target.value);
      });

      paletteSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (paletteResults.length > 0) {
            paletteSelectedIndex = (paletteSelectedIndex + 1) % paletteResults.length;
            updatePaletteSelection();
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (paletteResults.length > 0) {
            paletteSelectedIndex = (paletteSelectedIndex - 1 + paletteResults.length) % paletteResults.length;
            updatePaletteSelection();
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (paletteResults[paletteSelectedIndex]) {
            executePaletteItem(paletteResults[paletteSelectedIndex]);
          }
        } else if (e.key === "Escape") {
          closePalette();
        }
      });
    }

    // Global Keydown Handler for Ctrl+K / ⌘K
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (paletteModal && paletteModal.open) {
          closePalette();
        } else {
          openPalette();
        }
      }
    });
  }

  // -----------------------------------------------------------------
  // NOTIFICATIONS BELL TOAST
  // -----------------------------------------------------------------
  function initNotifications() {
    if (!libNotifBtn) return;
    libNotifBtn.addEventListener("click", () => {
      alert("🔔 Code-Karo Updates:\n\n• Next-Generation Structured Problem Library is live!\n• 16 canonical categories & 8 guided roadmaps available.\n• High-performance local Java judge active.");
    });
  }

  // -----------------------------------------------------------------
  // ATTACH LISTENERS TO FILTERS & BUTTONS
  // -----------------------------------------------------------------
  function attachEventListeners() {
    // Hero "Continue Learning" button
    if (heroContinueBtn) {
      heroContinueBtn.addEventListener("click", () => {
        const next = allProblems.find(p => getProblemStatus(p.id) !== "solved") || allProblems[0];
        if (next) {
          window.location.href = `/practice?problem=${encodeURIComponent(next.id)}`;
        }
      });
    }

    // Table Debounced Search Input
    if (filterSearchInput) {
      filterSearchInput.addEventListener("input", (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          searchQuery = e.target.value;
          if (heroSearchInput) heroSearchInput.value = searchQuery;
          syncUrlParams();
          updateActiveFilterChips();
          renderProblemTable();
        }, 220);
      });
    }

    // Language Dropdown
    if (filterLangSelect) {
      filterLangSelect.addEventListener("change", (e) => {
        currentLang = e.target.value;
        syncUrlParams();
        updateActiveFilterChips();
        renderProblemTable();
      });
    }

    // Difficulty Dropdown
    if (filterDiffSelect) {
      filterDiffSelect.addEventListener("change", (e) => {
        currentDiff = e.target.value;
        syncUrlParams();
        updateActiveFilterChips();
        renderProblemTable();
      });
    }

    // Status Dropdown
    if (filterStatusSelect) {
      filterStatusSelect.addEventListener("change", (e) => {
        currentStatus = e.target.value;
        syncUrlParams();
        updateActiveFilterChips();
        renderProblemTable();
      });
    }

    // Collection Dropdown
    if (filterCollectionSelect) {
      filterCollectionSelect.addEventListener("change", (e) => {
        currentCollection = e.target.value;
        syncUrlParams();
        updateActiveFilterChips();
        renderProblemTable();
      });
    }

    // Sort Dropdown
    if (filterSortSelect) {
      filterSortSelect.addEventListener("change", (e) => {
        currentSort = e.target.value;
        syncUrlParams();
        renderProblemTable();
      });
    }

    // Clear All Filters
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", clearAllFilters);
    }
    if (emptyResetBtn) {
      emptyResetBtn.addEventListener("click", clearAllFilters);
    }

    // Table Refresh Button
    if (tableRefreshBtn) {
      tableRefreshBtn.addEventListener("click", () => {
        tableRefreshBtn.style.transform = "rotate(360deg)";
        tableRefreshBtn.style.transition = "transform 0.5s ease";
        setTimeout(() => {
          tableRefreshBtn.style.transform = "none";
          tableRefreshBtn.style.transition = "none";
        }, 500);
        calculateStats();
        renderProblemTable();
      });
    }

    // Navbar Bookmarks link
    if (navBookmarksLink) {
      navBookmarksLink.addEventListener("click", (e) => {
        e.preventDefault();
        currentStatus = "bookmarked";
        if (filterStatusSelect) filterStatusSelect.value = "bookmarked";
        syncUrlParams();
        updateActiveFilterChips();
        renderProblemTable();
        const tableContainer = document.querySelector("#table-container");
        if (tableContainer) {
          tableContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }

  // -----------------------------------------------------------------
  // INITIAL DATA FETCH & BOOTSTRAP
  // -----------------------------------------------------------------
  async function initLibrary() {
    initUserProfile();
    parseUrlParams();
    initHeroSearchTypewriter();
    initPaletteEvents();
    initNotifications();
    attachEventListeners();

    try {
      const resp = await fetch("/api/problems");
      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(resp.ok ? "Server sent non-JSON response." : `Server error (${resp.status}): ${text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80)}`);
      }
      if (!resp.ok) throw new Error(data.error || `HTTP error ${resp.status}`);

      allProblems = data.problems || [];
      serverPaths = data.paths || [];
      serverCollections = data.collections || [];

      calculateStats();
      renderCategoryCards();
      renderLearningPaths();
      renderTopicChips();
      updateActiveFilterChips();
      renderProblemTable();
    } catch (err) {
      console.error("Failed to fetch problems library data:", err);
      if (problemsTableBody) {
        problemsTableBody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 32px; color: var(--accent-coral);">
              Failed to load problems from server. Please refresh or check connection.
            </td>
          </tr>
        `;
      }
    }
  }

  // Start on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLibrary);
  } else {
    initLibrary();
  }
})();
