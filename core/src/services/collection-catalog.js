'use strict';

/**
 * 藏品/变异宝典 本地配置读取（纯读文件，不依赖游戏连接）
 * 移植自 qq-farm-bot v20261101 core/src/services/collections.ts
 */
const fs = require('node:fs');
const { getResourcePath } = require('../config/runtime-paths');
const { getItemById, getItemImageById } = require('../config/gameConfig');

const CATEGORY = 1;
const RARITY_NAMES = ['', '普通', '稀有', '珍品', '天工'];

let cache = null;

function readCollectionsJson(name) {
  return JSON.parse(fs.readFileSync(getResourcePath('gameConfig', 'collections', name + '.json'), 'utf8'));
}

function loadConfig() {
  if (cache) return cache;
  cache = {
    series: readCollectionsJson('CollectionSeries'),
    items: readCollectionsJson('CollectionItem'),
    stars: readCollectionsJson('CollectionStarLevelNeed'),
    scores: readCollectionsJson('CollectionScore'),
    rewards: readCollectionsJson('CollectionScoreReward'),
    conditions: readCollectionsJson('CollectionCondition'),
    pedestals: readCollectionsJson('CollectionPedestal'),
    groups: readCollectionsJson('CollectionGroup'),
    buffs: JSON.parse(fs.readFileSync(getResourcePath('gameConfig', 'BuffCfg.json'), 'utf8')),
    mutants: JSON.parse(fs.readFileSync(getResourcePath('gameConfig', 'MutantEffect.json'), 'utf8')),
    probabilities: readCollectionsJson('MutantPublicity'),
  };
  return cache;
}

function quantity(value) {
  return value == null ? '0' : String(value);
}

function rewards(value, collectionId) {
  if (!value) return [];
  return String(value).split(';').filter(Boolean).map((part) => {
    const [id, count] = part.split(':');
    const itemId = id === '0' ? collectionId : Number(id);
    const info = getItemById(itemId) || {};
    return { itemId, count, name: info.name || ('物品' + itemId), image: getItemImageById(itemId) };
  });
}

function conditionText(value) {
  if (!value) return [];
  const cfg = loadConfig();
  return String(value).split(';').filter(Boolean).map((id) => {
    const condition = cfg.conditions.find((row) => row.condition_id === Number(id));
    if (!condition) return '解锁条件待确认';
    const series = cfg.series.find((row) => row.series_id === condition.target_series_id);
    if (condition.condition_type === 3) {
      return (series ? series.series_name : '指定系列') + '中' + condition.required_count +
        '款藏品达到' + condition.required_star_level + '星';
    }
    return '解锁条件待确认';
  });
}

function buffDto(row) {
  const value = Number(row.attr_value) / 100;
  return {
    id: row.id,
    name: row.attr_id,
    value,
    description: row.attr_id === '节省10%肥料' ? value + '%概率节省10%肥料' : row.attr_id + ' +' + value + '%',
  };
}

function mutationRules(seriesId) {
  const cfg = loadConfig();
  return cfg.groups
    .filter((row) => row.series_id === seriesId)
    .sort((a, b) => a.display_order - b.display_order)
    .map((row) => ({
      name: row.group_name,
      probability: Number((row.public_probability / 100).toFixed(1)),
      guarantee: row.display_guarantee,
    }));
}

/** 变异宝典：常规 / 装扮 / 藏品 三类，不需要账号 */
function getMutationCatalog() {
  const cfg = loadConfig();
  const effects = cfg.mutants
    .filter((row) => !row.hide_ui)
    .sort((a, b) => a.sort - b.sort)
    .map((row) => {
      const parts = String(row.actions == null ? '' : row.actions).split(':').map(Number);
      const action = parts[0];
      const value = parts[1];
      const effect = action === 2 ? '数量 ×' + value
        : action === 3 ? '售价 ×' + value
          : action === 4 ? '产出 ' + row.fruit_name
            : '';
      return {
        id: row.id,
        name: row.effect_name,
        tag: row.tag,
        image: '/game-config/seed_images_named/mutant/' + row.id + '.png',
        effect,
        description: row.tips || '',
        probabilities: cfg.probabilities
          .filter((entry) => entry.mutant_id === row.id)
          .map((entry) => ({ rarity: entry.rarity, percent: entry.public_probability / 100 })),
      };
    });

  return {
    normal: effects.filter((row) => row.tag === '无'),
    decoration: effects.filter((row) => row.tag === '装扮'),
    collections: cfg.series
      .filter((row) => Number(row.category) === CATEGORY && !row.display)
      .sort((a, b) => a.display_order - b.display_order)
      .map((row) => ({
        id: row.series_id,
        name: row.series_name,
        rarityName: RARITY_NAMES[row.series_rarity],
        description: row.desc,
        mutationRules: mutationRules(row.series_id),
        items: cfg.items
          .filter((item) => item.series_id === row.series_id)
          .sort((a, b) => a.display_order - b.display_order)
          .map((item) => {
            const info = getItemById(item.item_id) || {};
            return {
              id: item.item_id,
              name: info.name || ('藏品' + item.item_id),
              image: getItemImageById(item.item_id),
            };
          }),
      })),
  };
}

module.exports = {
  CATEGORY,
  RARITY_NAMES,
  loadConfig,
  quantity,
  rewards,
  conditionText,
  buffDto,
  mutationRules,
  getMutationCatalog,
};
