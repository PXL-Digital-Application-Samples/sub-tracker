const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { subscriptionValidation, validate } = require('../middleware/validate');
const logger = require('../logger');

const router = express.Router();

// Middleware to apply to all subscription routes
router.use(requireAuth);

router.get('/subscriptions/active', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const subscriptions = await db.getActiveSubscriptions(req.session.userId, limit, offset);
    const summaries = await db.getSubscriptionSummaries(req.session.userId);
    
    res.json({
      subscriptions,
      total: summaries.total_active,
      page,
      limit,
      totalPages: Math.ceil(summaries.total_active / limit),
      total_active: summaries.total_active,
      total_monthly_cost: summaries.total_monthly_cost,
      total_yearly_cost: summaries.total_yearly_cost,
    });
  } catch (error) {
    logger.error({ err: error }, 'Get active subscriptions error');
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/subscriptions/history', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const subscriptions = await db.getHistorySubscriptions(req.session.userId, limit, offset);
    const total = await db.countHistorySubscriptions(req.session.userId);

    res.json({
      subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error({ err: error }, 'Get subscription history error');
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/subscriptions', subscriptionValidation, validate, async (req, res) => {
  const { company_name, description, price, subscription_type, start_date } = req.body;

  try {
    const result = await db.insertSubscription(req.session.userId, {
      company_name,
      description,
      price,
      subscription_type,
      start_date
    });
    
    logger.info({ event: 'subscription_created', userId: req.session.userId }, 'New subscription created');
    res.status(201).json(result);
  } catch (error) {
    logger.error({ err: error }, 'Create subscription error');
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.put('/subscriptions/:id', subscriptionValidation, validate, async (req, res) => {
  const { id } = req.params;
  const { company_name, description, price, subscription_type, start_date } = req.body;
  
  try {
    const result = await db.updateSubscription(id, req.session.userId, {
      company_name,
      description,
      price,
      subscription_type,
      start_date
    });

    if ((result.changes ?? result.rowCount) === 0) {
      return res.status(404).json({ message: 'Subscription not found or you do not have permission to update it.' });
    }
    res.json({ message: 'Subscription updated successfully.' });
  } catch (error) {
    logger.error({ err: error }, 'Update subscription error');
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/subscriptions/:id/cancel', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.cancelSubscription(id, req.session.userId);
    if ((result.changes ?? result.rowCount) === 0) {
      return res.status(404).json({ message: 'Subscription not found or you do not have permission to cancel it.' });
    }
    res.json({ message: 'Subscription cancelled successfully.' });
  } catch (error) {
    logger.error({ err: error }, 'Cancel subscription error');
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.delete('/subscriptions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.deleteSubscription(id, req.session.userId);
    
    if ((result.changes ?? result.rowCount) === 0) {
      return res.status(404).json({ message: 'Subscription not found or you do not have permission to delete it.' });
    }
    logger.info({ event: 'subscription_deleted', userId: req.session.userId, subscriptionId: id }, 'Subscription deleted');
    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, 'Delete subscription error');
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
