<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAccountStore } from '@/stores/account'
import { useCollectionsStore, type CollectionItemView, type CollectionSeriesView } from '@/stores/collections'
import BaseButton from '@/components/ui/BaseButton.vue'

const accountStore = useAccountStore()
const collectionsStore = useCollectionsStore()
const { currentAccountId } = storeToRefs(accountStore)
const { snapshot, loading, error } = storeToRefs(collectionsStore)

const activeSeries = ref<CollectionSeriesView | null>(null)
const detailItem = ref<CollectionItemView | null>(null)
const rulesOpen = ref<number | null>(null)

const seriesList = computed(() => snapshot.value?.series ?? [])
const milestones = computed(() => snapshot.value?.milestones ?? [])
const pedestals = computed(() => snapshot.value?.pedestals ?? [])
const summary = computed(() => {
  const s = snapshot.value
  if (!s) return { activated: 0, total: 0, score: 0, claimed: 0, next: null as number | null }
  return {
    activated: s.activatedCount,
    total: s.totalCount,
    score: s.score,
    claimed: s.claimedScore,
    next: s.nextRewardScore,
  }
})

const rarityClass: Record<string, string> = {
  普通: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  稀有: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  珍品: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  天工: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
}

function reload() {
  if (!currentAccountId.value) {
    collectionsStore.clear()
    return
  }
  void collectionsStore.fetchCollections()
}

function openSeries(series: CollectionSeriesView) {
  activeSeries.value = activeSeries.value?.id === series.id ? null : series
}

function openDetail(item: CollectionItemView) {
  detailItem.value = item
}

function toggleRules(seriesId: number) {
  rulesOpen.value = rulesOpen.value === seriesId ? null : seriesId
}

function starText(level: number) {
  return level > 0 ? '★'.repeat(Math.min(level, 5)) : '未激活'
}

watch(currentAccountId, () => {
  activeSeries.value = null
  detailItem.value = null
  reload()
})

onMounted(reload)

defineExpose({ reload })
</script>

<template>
  <div class="space-y-4">
    <div v-if="!currentAccountId" class="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
      请先选择账号，再查看藏品。
    </div>

    <div v-else-if="loading && !snapshot" class="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
      正在读取蓝晶藏品...
    </div>

    <div v-else-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
      {{ error }}
      <button class="ml-2 underline" @click="reload">重试</button>
    </div>

    <template v-else-if="snapshot">
      <!-- 概览 -->
      <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/30">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="flex h-8 items-center rounded-lg bg-emerald-50 px-3 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            已激活 {{ summary.activated }}/{{ summary.total }}
          </span>
          <span class="flex h-8 items-center rounded-lg bg-blue-50 px-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            评分 {{ summary.score }}
          </span>
          <span class="flex h-8 items-center rounded-lg bg-gray-50 px-3 text-xs text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
            已领奖励 {{ summary.claimed }} 分
          </span>
          <span v-if="summary.next !== null" class="flex h-8 items-center rounded-lg bg-amber-50 px-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            下一档 {{ summary.next }} 分
          </span>
          <BaseButton class="ml-auto w-24" variant="primary" :loading="loading" @click="reload">刷新</BaseButton>
        </div>
        <div v-if="snapshot.currentBuffs.length" class="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300">
          <span class="text-gray-400">当前生效：</span>
          <span v-for="buff in snapshot.currentBuffs" :key="buff.id" class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
            {{ buff.description }}
          </span>
        </div>
      </div>

      <!-- 系列 -->
      <div class="space-y-3">
        <div
          v-for="series in seriesList"
          :key="series.id"
          class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/30"
        >
          <div
            class="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3"
            @click="openSeries(series)"
          >
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ series.name }}</span>
            <span class="rounded px-2 py-0.5 text-xs" :class="rarityClass[series.rarityName] || rarityClass.普通">
              {{ series.rarityName }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ series.activatedCount }}/{{ series.totalCount }} 已激活
            </span>
            <button
              class="ml-auto rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              @click.stop="toggleRules(series.id)"
            >
              概率说明
            </button>
            <span class="text-xs text-gray-400">{{ activeSeries?.id === series.id ? '收起' : '展开' }}</span>
          </div>

          <div v-if="rulesOpen === series.id" class="border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-300">
            <div class="mb-1 text-gray-400">系列变异概率（不是单款藏品概率）</div>
            <div class="flex flex-wrap gap-3">
              <span v-for="rule in series.mutationRules" :key="rule.name">
                {{ rule.name }}：<b>{{ rule.probability }}%</b>，保底 {{ rule.guarantee }} 次
              </span>
            </div>
            <div v-if="series.requirements.length" class="mt-2 text-gray-400">
              解锁条件：{{ series.requirements.join('；') }}
            </div>
          </div>

          <div v-if="activeSeries?.id === series.id" class="border-t border-gray-100 p-4 dark:border-gray-800">
            <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));">
              <button
                v-for="item in series.items"
                :key="item.id"
                class="group rounded-lg border p-2 text-left transition hover:shadow-sm"
                :class="item.activated
                  ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-900/10'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/20'"
                @click="openDetail(item)"
              >
                <div class="flex items-center justify-center rounded bg-gray-50 p-2 dark:bg-gray-800/40">
                  <img v-if="item.image" :src="item.image" :alt="item.name" class="h-16 w-16 object-contain">
                  <span v-else class="text-xs text-gray-400">无图</span>
                </div>
                <div class="mt-1 truncate text-xs font-medium text-gray-700 dark:text-gray-200">{{ item.name }}</div>
                <div class="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span :class="item.activated ? 'text-amber-500' : ''">{{ starText(item.starLevel) }}</span>
                  <span v-if="Number(item.ownCount) > 0">×{{ item.ownCount }}</span>
                </div>
                <div class="mt-0.5 flex gap-1 text-[10px]">
                  <span v-if="item.displayed" class="rounded bg-blue-100 px-1 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">展示中</span>
                  <span v-if="item.wished" class="rounded bg-pink-100 px-1 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300">已许愿</span>
                  <span v-if="item.isNew" class="rounded bg-emerald-100 px-1 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">NEW</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 评分里程碑 -->
      <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/30">
        <div class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">评分奖励</div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="m in milestones"
            :key="m.score"
            class="min-w-28 rounded-lg border px-3 py-2 text-xs"
            :class="m.claimed
              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10'
              : m.reached
                ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10'
                : 'border-gray-200 dark:border-gray-700'"
          >
            <div class="font-medium text-gray-700 dark:text-gray-200">{{ m.score }} 分</div>
            <div class="text-gray-400">{{ m.claimed ? '已领取' : m.reached ? '可领取' : '未达成' }}</div>
          </div>
        </div>
      </div>

      <!-- 展台 -->
      <div v-if="pedestals.length" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/30">
        <div class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">展台</div>
        <div class="flex flex-wrap gap-3">
          <div v-for="p in pedestals" :key="p.id" class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <img v-if="p.image" :src="p.image" class="h-8 w-8 object-contain" alt="">
            <span>{{ p.name }}</span>
            <span :class="p.owned ? 'text-emerald-500' : 'text-gray-400'">{{ p.owned ? '已拥有' : '未拥有' }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 详情 -->
    <div v-if="detailItem" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="detailItem = null">
      <div class="w-full max-w-md rounded-xl bg-white p-5 dark:bg-gray-900">
        <div class="flex items-start gap-3">
          <img v-if="detailItem.image" :src="detailItem.image" class="h-20 w-20 object-contain" alt="">
          <div class="min-w-0">
            <div class="text-base font-semibold text-gray-800 dark:text-gray-100">{{ detailItem.name }}</div>
            <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ detailItem.description || '暂无描述' }}</div>
            <div class="mt-1 text-xs text-amber-500">{{ starText(detailItem.starLevel) }} / {{ detailItem.maxStarLevel }} 星</div>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
          <div>持有数量：{{ detailItem.ownCount }}</div>
          <div>单件评分：{{ detailItem.score }}</div>
          <div>状态：{{ detailItem.activated ? '已激活' : '未激活' }}</div>
          <div>展示：{{ detailItem.displayed ? '是' : '否' }}</div>
        </div>
        <div v-if="detailItem.requirements.length" class="mt-3 text-xs text-gray-500 dark:text-gray-400">
          解锁条件：{{ detailItem.requirements.join('；') }}
        </div>
        <div v-if="detailItem.nextStarCosts.length" class="mt-3">
          <div class="mb-1 text-xs text-gray-400">升星材料</div>
          <div class="flex flex-wrap gap-2">
            <span v-for="c in detailItem.nextStarCosts" :key="c.itemId" class="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
              {{ c.name }} ×{{ c.count }}
            </span>
          </div>
        </div>
        <div class="mt-4 text-right">
          <BaseButton variant="primary" @click="detailItem = null">关闭</BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
