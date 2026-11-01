import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

/** 藏品（蓝晶） */
export interface CollectionItemView {
  id: number
  name: string
  description: string
  image?: string
  starLevel: number
  maxStarLevel: number
  ownCount: string
  activated: boolean
  isNew: boolean
  score: number
  displayed: boolean
  wished: boolean
  requirements: string[]
  nextStarCosts: Array<{ itemId: number, count: string, name: string, image?: string }>
}

export interface CollectionSeriesView {
  id: number
  name: string
  rarity: number
  rarityName: string
  description: string
  requirements: string[]
  mutationRules: Array<{ name: string, probability: number, guarantee: number }>
  items: CollectionItemView[]
  activatedCount: number
  totalCount: number
}

export interface CollectionsSnapshot {
  category: number
  score: number
  claimedScore: number
  activatedCount: number
  totalCount: number
  nextRewardScore: number | null
  currentBuffs: Array<{ id: number, name: string, value: number, description: string }>
  milestones: Array<{ level: number, score: number, claimed: boolean, reached: boolean, rewards: any[], buffs: any[] }>
  series: CollectionSeriesView[]
  display: { itemId: string, pedestalId: string } | null
  pedestals: Array<{ id: number, name: string, image?: string, owned: boolean }>
  updatedAt: number
}

export const useCollectionsStore = defineStore('collections', () => {
  const snapshot = ref<CollectionsSnapshot | null>(null)
  const loading = ref(false)
  const error = ref('')
  let requestSeq = 0

  async function fetchCollections() {
    const seq = ++requestSeq
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/api/collections')
      if (seq !== requestSeq) return
      snapshot.value = data?.data ?? null
    }
    catch (err: any) {
      if (seq !== requestSeq) return
      snapshot.value = null
      error.value = String(err?.response?.data?.error || err?.message || '藏品读取失败')
    }
    finally {
      if (seq === requestSeq) loading.value = false
    }
  }

  function clear() {
    requestSeq++
    snapshot.value = null
    error.value = ''
    loading.value = false
  }

  return { snapshot, loading, error, fetchCollections, clear }
})

/** 变异宝典（本地配置，不需要账号） */
export interface MutationCatalog {
  normal: Array<any>
  decoration: Array<any>
  collections: Array<any>
}

export const useMutationCatalogStore = defineStore('mutationCatalog', () => {
  const catalog = ref<MutationCatalog | null>(null)
  const loading = ref(false)
  const error = ref('')

  async function fetchCatalog(force = false) {
    if (catalog.value && !force) return
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/api/illustrated/mutations')
      catalog.value = data?.data ?? null
    }
    catch (err: any) {
      error.value = String(err?.response?.data?.error || err?.message || '变异宝典读取失败')
    }
    finally {
      loading.value = false
    }
  }

  return { catalog, loading, error, fetchCatalog }
})
