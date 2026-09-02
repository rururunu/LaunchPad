<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform scale-95 opacity-0"
    enter-to-class="transform scale-100 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform scale-100 opacity-100"
    leave-to-class="transform scale-95 opacity-0"
  >
    <div
      v-if="suggestions.length > 0 && props.visible"
      class="suggestions-panel dropdown-panel"
    >
      <div class="dropdown-header">
        <span>上下键选择填充 · 回车执行搜索</span>
      </div>
      <div
        ref="suggestionsContainer"
        class="dropdown-body dropdown-body--scroll"
      >
        <div
          v-for="(suggestion, index) in suggestions"
          :key="index"
          @click="selectSuggestion(suggestion)"
          @mouseenter="selectedIndex = index"
          class="dropdown-item"
          :class="{ 'dropdown-item--selected': index === selectedIndex }"
        >
          <div class="dropdown-item-text flex-grow min-w-0" v-html="highlightQuery(suggestion)" />
          <span v-if="index === selectedIndex" class="dropdown-badge">回车搜索</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import {
  hasDefaultEngineFilterPrefix,
  stripDefaultEngineFilterPrefix,
} from "@/utils/searchCommands";

const props = defineProps<{
  query: string;
  engineType: string;
  visible: boolean;
}>();

const emit = defineEmits(["select", "fill", "close"]);

const suggestions = ref<string[]>([]);
const selectedIndex = ref<number>(-1);
const abortController = ref<AbortController | null>(null);
const suggestionsContainer = ref<HTMLElement | null>(null);

// 高亮查询词
const highlightQuery = (suggestion: string): string => {
  if (!props.query) return suggestion;

  let displaySuggestion = suggestion;
  if (hasDefaultEngineFilterPrefix(displaySuggestion)) {
    displaySuggestion = stripDefaultEngineFilterPrefix(displaySuggestion);
  }

  const regex = new RegExp(`(${props.query})`, "gi");
  return displaySuggestion.replace(
    regex,
    '<span class="dropdown-highlight">$1</span>'
  );
};

// 选择建议（右键点击或回车）- 立即执行搜索
const selectSuggestion = (suggestion: string) => {
  emit("select", suggestion);
};

// 填充建议（左键点击）- 只填充到搜索框不执行搜索
const fillSuggestion = (suggestion: string) => {
  emit("fill", { suggestion, isFillAction: true });
};

// 处理键盘导航
const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.visible || suggestions.value.length === 0) return;

  switch (e.key) {
    case "ArrowUp":
      e.preventDefault();
      if (selectedIndex.value <= 0) {
        selectedIndex.value = suggestions.value.length - 1;
      } else {
        selectedIndex.value--;
      }
      if (selectedIndex.value >= 0) {
        fillSuggestion(suggestions.value[selectedIndex.value]);
        emit("fill", { suggestion: suggestions.value[selectedIndex.value], isFillAction: true, isKeyboardFill: true });
      }
      scrollToSelectedSuggestion();
      break;
    case "ArrowDown":
      e.preventDefault();
      if (selectedIndex.value >= suggestions.value.length - 1) {
        selectedIndex.value = 0;
      } else {
        selectedIndex.value++;
      }
      if (selectedIndex.value >= 0) {
        fillSuggestion(suggestions.value[selectedIndex.value]);
        emit("fill", { suggestion: suggestions.value[selectedIndex.value], isFillAction: true, isKeyboardFill: true });
      }
      scrollToSelectedSuggestion();
      break;
    case "Enter":
      if (
        selectedIndex.value >= 0 &&
        selectedIndex.value < suggestions.value.length
      ) {
        e.preventDefault();
        e.stopPropagation();
        selectSuggestion(suggestions.value[selectedIndex.value]);
      }
      break;
    case "Escape":
      closeSuggestions();
      break;
  }
};

// 获取搜索建议
const fetchSuggestions = async () => {
  if (!props.query || props.query.length < 2 || !props.engineType) {
    suggestions.value = [];
    selectedIndex.value = -1;
    return;
  }

  const queryText = hasDefaultEngineFilterPrefix(props.query)
    ? stripDefaultEngineFilterPrefix(props.query)
    : props.query;
  if (queryText.length < 1) {
    suggestions.value = [];
    selectedIndex.value = -1;
    return;
  }

  if (abortController.value) {
    abortController.value.abort();
  }

  abortController.value = new AbortController();
  selectedIndex.value = -1;

  let apiUrl = "";

  if (props.engineType === "bd" || props.engineType === "baidu") {
    apiUrl = `https://www.baidu.com/sugrec?prod=pc&wd=${encodeURIComponent(queryText)}`;
  } else if (props.engineType === "gg" || props.engineType === "google") {
    apiUrl = `https://www.google.com/complete/search?client=chrome&q=${encodeURIComponent(queryText)}`;
  } else if (props.engineType === "by" || props.engineType === "bing") {
    apiUrl = `https://api.bing.com/qsonhs.aspx?type=cb&q=${encodeURIComponent(queryText)}`;
  } else {
    suggestions.value = [];
    return;
  }

  try {
    const response = await fetch(apiUrl, {
      signal: abortController.value.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    let results = [];
    if (props.engineType.includes("bd") || props.engineType.includes("baidu")) {
      results = data.g?.map((item: { q: string }) => item.q) || [];
    } else if (props.engineType.includes("gg") || props.engineType.includes("google")) {
      results = data[1] || [];
    } else if (props.engineType.includes("by") || props.engineType.includes("bing")) {
      results = data.AS?.Results?.[0]?.Suggests?.map((suggest: { Txt: string }) => suggest.Txt) || [];
    }

    suggestions.value = results;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Fetch error:', error);
      suggestions.value = [];
    }
  }
};

watch(
  () => props.query,
  (newQuery) => {
    if (newQuery && newQuery.length > 0) {
      fetchSuggestions();
    } else {
      suggestions.value = [];
      selectedIndex.value = -1;
      emit("close");
    }
  },
  { immediate: true }
);

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      suggestions.value = [];
    } else if (props.query && props.query.length > 0) {
      fetchSuggestions();
    }
  }
);

watch(
  () => selectedIndex.value,
  () => {
    scrollToSelectedSuggestion();
  }
);

const scrollToSelectedSuggestion = () => {
  nextTick(() => {
    if (suggestionsContainer.value && selectedIndex.value >= 0) {
      const container = suggestionsContainer.value;
      const selectedElement = container.querySelector(
        `.dropdown-item:nth-child(${selectedIndex.value + 1})`
      );

      if (selectedElement) {
        const containerRect = container.getBoundingClientRect();
        const selectedRect = selectedElement.getBoundingClientRect();

        if (selectedRect.bottom > containerRect.bottom) {
          container.scrollTop += selectedRect.bottom - containerRect.bottom;
        } else if (selectedRect.top < containerRect.top) {
          container.scrollTop -= containerRect.top - selectedRect.top;
        }
      }
    }
  });
};

watch(
  () => props.engineType,
  () => {
    if (props.query && props.query.length > 0) {
      fetchSuggestions();
    }
  }
);

function closeSuggestions() {
  emit("close");
  suggestions.value = [];
  selectedIndex.value = -1;
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown, true);

  if (abortController.value) {
    abortController.value.abort();
  }
});
</script>
