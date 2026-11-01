<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMutationCatalogStore } from '@/stores/collections'
import BaseButton from '@/components/ui/BaseButton.vue'

const catalogStore = useMutationCatalogStore()
const { catalog, loading, error } = storeToRefs(catalogStore)

const tab = ref<'normal' | 'decoration' | 'collections'>('normal')
const rulesOpen = ref<number | null>(null)

const tabs = [
  { value: 'normal' as const, label: '常规' },
  { value: 'decoration' as const, label: '装扮' },
  { value: 'collections' as const, label: '藏品' },
]

const effects = computed(() => {
  if (!catalog.value) return []
  if (tab.value === 'normal') return catalog.value.normal
  if (tab.value === 'decoration') return catalog.value.decoration
  return []
})

const collectionSeries = computed(() => catalog.value?.collections ?? [])

function segmented(active: boolean) {
  return active
    ? 'text-white'
    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
}

function toggleRules(id: number) {
  rulesOpen.value = rulesOpen.value === id ? null : id
}

onMounted(() => {
  void catalogStore.fetchCatalog()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <div class="farm-segmented">
        <button
          v-for="item in tabs"
          :key="item.value"
          class="min-w-16 rounded-md px-3 text-sm font-medium transition"
          :class="segmented(tab === item.value)"
          :style="tab === item.value ? { backgroundColor: 'var(--theme-primary)' } : {}"
          @click="tab = item.value"
        >
          {{ item.label }}
        </button>
      </div>
      <BaseButton class="ml-auto w-24" variant="primary" :loading="loading" @click="catalogStore.fetchCatalog(true)">
        刷新
      </BaseButton>
    </div>

    <div v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
      {{ error }}
    </div>

    <div v-else-if="loading && !catalog" class="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
      正在读取变异宝典...
    </div>

    <template v-else>
      <!-- 常规 / 装扮 -->
      <div v-if="tab !== 'collections'" class="space-y-3">
        <div v-if="effects.length === 0" class="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
          暂无数据
        </div>
        <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
          <div
            v-for="item in effects"
            :key="item.id"
            class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/30"
          >
            <div class="flex items-start gap-3">
              <img v-if="item.image" :src="item.image" class="h-14 w-14 shrink-0 object-contain" alt="">
              <div class="min-w-0">
                <div class="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{{ item.name }}</div>
                <div v-if="item.effect" class="text-xs text-amber-600 dark:text-amber-400">{{ item.effect }}</div>
                <div class="mt-1 line-clamp-2 text-[11px] text-gray-500 dark:text-gray-400">{{ item.description }}</div>
              </div>
            </div>
            <div v-if="item.probabilities?.length" class="mt-2 flex flex-wrap gap-1 text-[11px]">
              <span
                v-for="p in item.probabilities"
                :key="p.rarity"
                class="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                {{ p.rarity }} {{ p.percent }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 藏品系列（宝典视角） -->
      <div v-else class="space-y-3">
        <div
          v-for="series in collectionSeries"
          :key="series.id"
          class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/30"
        >
          <div class="flex flex-wrap items-center gap-2 px-4 py-3">
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ series.name }}</span>
            <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {{ series.rarityName }}
            </span>
            <button
              class="ml-auto rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              @click="toggleRules(series.id)"
            >
              {{ rulesOpen === series.id ? '收起概率' : '查看概率' }}
            </button>
          </div>
          <div v-if="rulesOpen === series.id" class="border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-300">
            <div class="mb-1 text-gray-400">系列变异概率（不是单款藏品概率）</div>
            <div class="flex flex-wrap gap-3">
              <span v-for="rule in series.mutationRules" :key="rule.name">
                {{ rule.name }}：<b>{{ rule.probability }}%</b>，保底 {{ rule.guarantee }} 次
              </span>
            </div>
          </div>
          <div class="border-t border-gray-100 p-4 dark:border-gray-800">
            <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));">
              <div v-for="item in series.items" :key="item.id" class="rounded-lg border border-gray-200 p-2 text-center dark:border-gray-700">
                <img v-if="item.image" :src="item.image" class="mx-auto h-12 w-12 object-contain" alt="">
                <div class="mt-1 truncate text-xs text-gray-700 dark:text-gray-200">{{ item.name }}</div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="collectionSeries.length === 0" class="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
          暂无藏品系列
        </div>
      </div>
    </template>
  </div>
</template>
