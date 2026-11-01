'use strict';

/**
 * 蓝晶藏品快照（worker 侧，需要游戏连接）
 * 移植自 qq-farm-bot v20261101 core/src/services/collections.ts
 *
 * 只读：本次只实现 GetCollections 读取，未实现激活/升星/领奖/许愿/切换展台。
 */
const { sendMsgAsync } = require('../utils/network');
const { types } = require('../utils/proto');
const { getItemById, getItemImageById } = require('../config/gameConfig');
const catalog = require('./collection-catalog');

const { CATEGORY, RARITY_NAMES, quantity, rewards, conditionText, buffDto, mutationRules } = catalog;

function normalizeCollections(reply) {
  const cfg = catalog.loadConfig();
  const detail = (reply.details || []).find((row) => Number(row.category) === CATEGORY);
  if (!detail) throw new Error('当前账号未返回蓝晶藏品信息');

  const owned = new Map((detail.collections || []).map((row) => [quantity(row.collection_id), row]));
  const display = (reply.display_slots || [])
    .find((row) => row.display && Number(row.display.category) === CATEGORY);

  const score = Number(detail.current_score) || 0;
  const claimedScore = Number(detail.claimed_reward_score) || 0;
  const displayInfo = display ? display.display : null;

  const series = cfg.series
    .filter((row) => Number(row.category) === CATEGORY)
    .sort((a, b) => a.display_order - b.display_order)
    .map((row) => {
      const items = cfg.items
        .filter((item) => item.series_id === row.series_id)
        .sort((a, b) => a.display_order - b.display_order)
        .map((item) => {
          const state = owned.get(String(item.item_id));
          const starLevel = state && state.star_level ? Number(state.star_level) : 0;
          const info = getItemById(item.item_id) || {};
          const nextStar = cfg.stars.find(
            (entry) => entry.series_id === row.series_id && entry.star_level === starLevel + 1,
          );
          const scoreRow = cfg.scores.find(
            (entry) => entry.star_level === starLevel && Number(entry.category) === CATEGORY,
          );
          const seriesScore = scoreRow ? Number(String(scoreRow.score).split(';')[row.series_rarity - 1]) : 0;
          return {
            id: item.item_id,
            name: info.name || ('藏品' + item.item_id),
            description: info.desc || '',
            image: getItemImageById(item.item_id),
            starLevel,
            maxStarLevel: 5,
            ownCount: quantity(state && state.own_count),
            activated: starLevel > 0,
            isNew: !!state && state.is_new === true,
            score: Number.isFinite(seriesScore) ? seriesScore : 0,
            displayed: displayInfo ? quantity(displayInfo.item_id) === String(item.item_id) : false,
            wished: (detail.wished || []).some((wish) => quantity(wish.collection_id) === String(item.item_id)),
            requirements: conditionText(item.unlock_condition_ids),
            nextStarCosts: rewards(nextStar ? nextStar.items_need : null, item.item_id),
          };
        });

      return {
        id: row.series_id,
        name: row.series_name,
        rarity: row.series_rarity,
        rarityName: RARITY_NAMES[row.series_rarity],
        description: row.desc || '',
        requirements: conditionText(row.unlock_condition_ids),
        mutationRules: mutationRules(row.series_id),
        items,
        activatedCount: items.filter((item) => item.activated).length,
        totalCount: items.length,
      };
    });

  const milestones = cfg.rewards
    .filter((row) => Number(row.category) === CATEGORY)
    .sort((a, b) => a.score - b.score)
    .map((row) => ({
      level: row.level,
      score: row.score,
      claimed: row.score <= claimedScore,
      reached: row.score <= score,
      rewards: rewards(row.rewards),
      buffs: cfg.buffs
        .filter((buff) => buff.source_type === '藏品属性' && Number(buff.source_param) === Number(row.level))
        .map(buffDto),
    }));

  const currentBuffs = new Map();
  for (const milestone of milestones.filter((row) => row.claimed)) {
    for (const buff of milestone.buffs) currentBuffs.set(buff.name, buff);
  }

  return {
    category: CATEGORY,
    score,
    claimedScore,
    activatedCount: series.reduce((sum, row) => sum + row.activatedCount, 0),
    totalCount: series.reduce((sum, row) => sum + row.totalCount, 0),
    nextRewardScore: (milestones.find((row) => !row.claimed) || {}).score || null,
    currentBuffs: Array.from(currentBuffs.values()),
    milestones,
    series,
    display: displayInfo && Number(displayInfo.item_id) > 0
      ? { itemId: quantity(displayInfo.item_id), pedestalId: quantity(displayInfo.pedestal_id) }
      : null,
    pedestals: cfg.pedestals
      .filter((row) => Number(row.category) === CATEGORY)
      .map((row) => ({
        id: row.pedestal_id,
        name: (getItemById(row.pedestal_id) || {}).name || '展台',
        image: getItemImageById(row.pedestal_id),
        owned: row.is_default === 1 ||
          (detail.pedestals || []).some((item) => quantity(item.pedestal_id) === String(row.pedestal_id)),
      })),
    updatedAt: Date.now(),
  };
}

let pendingSnapshot = null;

function getCollectionsSnapshot() {
  if (pendingSnapshot) return pendingSnapshot;
  const request = (async () => {
    const body = types.GetCollectionsRequest.encode({ categories: [CATEGORY] }).finish();
    const reply = await sendMsgAsync('gamepb.collectionpb.CollectionService', 'GetCollections', body);
    return normalizeCollections(types.GetCollectionsReply.decode(reply.body));
  })();
  pendingSnapshot = request;
  request
    .finally(() => { if (pendingSnapshot === request) pendingSnapshot = null; })
    .catch(() => {});
  return request;
}

module.exports = {
  getCollectionsSnapshot,
  normalizeCollections,
  getMutationCatalog: catalog.getMutationCatalog,
};
