'use strict';

/**
 * 藏品与变异宝典路由（移植自 v20261101 controllers/admin）
 *  - GET /api/collections            需要 x-account-id，读蓝晶藏品（只读）
 *  - GET /api/illustrated/mutations  纯本地配置，不需要账号
 */

function getAuthorizedAccountId(req, res, { getAccountIdFromRequest, canAccessAccount }) {
  const accountId = getAccountIdFromRequest(req);
  if (!accountId) {
    res.status(400).json({ ok: false, error: 'Missing x-account-id' });
    return null;
  }
  if (!canAccessAccount(req, accountId)) {
    res.status(403).json({ ok: false, error: '无权访问此账号' });
    return null;
  }
  return accountId;
}

function registerAdminCollectionsRoutes({
  app,
  provider,
  adminLogger,
  getAccountIdFromRequest,
  canAccessAccount,
  sendProviderError,
}) {
  app.get('/api/collections', async (req, res) => {
    const accountId = getAuthorizedAccountId(req, res, { getAccountIdFromRequest, canAccessAccount });
    if (!accountId) return;
    try {
      const data = await provider.getCollections(accountId);
      res.json({ ok: true, data });
    } catch (err) {
      adminLogger.warn('获取藏品失败', { accountId, error: err && err.message ? err.message : String(err) });
      if (typeof sendProviderError === 'function') return sendProviderError(res, err);
      res.status(502).json({ ok: false, error: (err && err.message) || '藏品读取失败' });
    }
  });

  app.get('/api/illustrated/mutations', (req, res) => {
    try {
      const { getMutationCatalog } = require('../services/collection-catalog');
      res.json({ ok: true, data: getMutationCatalog() });
    } catch (err) {
      adminLogger.warn('获取变异宝典失败', { error: err && err.message ? err.message : String(err) });
      res.status(500).json({ ok: false, error: (err && err.message) || '变异宝典读取失败' });
    }
  });
}

module.exports = { registerAdminCollectionsRoutes };
