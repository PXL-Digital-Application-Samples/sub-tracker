const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { subscriptionValidation, validate } = require('../middleware/validate');

const router = express.Router();

// Middleware to apply to all subscription routes
router.use(requireAuth);

router.get('/subscriptions/active', async (req, res) => {
  try {
    const activeSubsQuery = process.env.DB_TYPE === 'postgres'
      ? `SELECT * FROM subscriptions
         WHERE user_id = $1 AND
               (subscription_type = 'lifetime' OR
                (subscription_type = 'monthly' AND start_date + interval '1 month' >= NOW()) OR
                (subscription_type = 'yearly' AND start_date + interval '1 year' >= NOW()))`
      : `SELECT *
         FROM subscriptions
         WHERE user_id = ? AND
               (subscription_type = 'lifetime' OR
                (subscription_type = 'monthly' AND date(start_date, '+1 month') >= date('now')) OR
                (subscription_type = 'yearly' AND date(start_date, '+1 year') >= date('now')))`

    const subscriptions = await db.query(activeSubsQuery, [req.session.userId]);
    
    const total_active = subscriptions.length;
    const total_monthly_cost = subscriptions.reduce((acc, sub) => sub.subscription_type === 'monthly' ? acc + sub.price : acc, 0);
    const total_yearly_cost = subscriptions.reduce((acc, sub) => sub.subscription_type === 'yearly' ? acc + sub.price : acc, 0);

    res.json({
      subscriptions,
      total_active,
      total_monthly_cost,
      total_yearly_cost,
    });
  } catch (error) {
    console.error('Get active subscriptions error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/subscriptions/history', async (req, res) => {
  try {
    const historySubsQuery = process.env.DB_TYPE === 'postgres'
    ? `SELECT * FROM subscriptions
       WHERE user_id = $1 AND
             NOT (subscription_type = 'lifetime' OR
                  (subscription_type = 'monthly' AND start_date + interval '1 month' >= NOW()) OR
                  (subscription_type = 'yearly' AND start_date + interval '1 year' >= NOW()))`
    : `SELECT * FROM subscriptions
       WHERE user_id = ? AND
             NOT (subscription_type = 'lifetime' OR
                  (subscription_type = 'monthly' AND date(start_date, '+1 month') >= date('now')) OR
                  (subscription_type = 'yearly' AND date(start_date, '+1 year') >= date('now')))`
    const subscriptions = await db.query(historySubsQuery, [req.session.userId]);
    res.json(subscriptions);
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/subscriptions', subscriptionValidation, validate, async (req, res) => {
  const { company_name, description, price, subscription_type, start_date } = req.body;

  try {
    const insertSubQuery = process.env.DB_TYPE === 'postgres'
      ? 'INSERT INTO subscriptions (user_id, company_name, description, price, subscription_type, start_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *'
      : 'INSERT INTO subscriptions (user_id, company_name, description, price, subscription_type, start_date) VALUES (?, ?, ?, ?, ?, ?)'
    const params = [req.session.userId, company_name, description, parseFloat(price), subscription_type, start_date];
    const result = await db.run(insertSubQuery, params);
    
    console.log(`New subscription created for user ${req.session.userId}`);
    
    if (process.env.DB_TYPE === 'postgres') {
      res.status(201).json(result.rows[0]);
    } else {
      // For SQLite, we need to fetch the newly created record
      const newSub = await db.query('SELECT * FROM subscriptions WHERE id = ?', [result.lastInsertRowid]);
      res.status(201).json(newSub[0]);
    }
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.put('/subscriptions/:id', subscriptionValidation, validate, async (req, res) => {
  const { id } = req.params;
  const { company_name, description, price, subscription_type, start_date } = req.body;
  
  try {
    const updateSubQuery = process.env.DB_TYPE === 'postgres'
    ? 'UPDATE subscriptions SET company_name = $1, description = $2, price = $3, subscription_type = $4, start_date = $5 WHERE id = $6 AND user_id = $7'
    : 'UPDATE subscriptions SET company_name = ?, description = ?, price = ?, subscription_type = ?, start_date = ? WHERE id = ? AND user_id = ?'

    const params = [company_name, description, parseFloat(price), subscription_type, start_date, id, req.session.userId];
    const result = await db.run(updateSubQuery, params);

    if (result.changes === 0 && result.rowCount === 0) {
      return res.status(404).json({ message: 'Subscription not found or you do not have permission to update it.' });
    }
    res.json({ message: 'Subscription updated successfully.' });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.delete('/subscriptions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleteSubQuery = process.env.DB_TYPE === 'postgres'
      ? 'DELETE FROM subscriptions WHERE id = $1 AND user_id = $2'
      : 'DELETE FROM subscriptions WHERE id = ? AND user_id = ?'
    const result = await db.run(deleteSubQuery, [id, req.session.userId]);
    
    if (result.changes === 0 && result.rowCount === 0) {
      return res.status(404).json({ message: 'Subscription not found or you do not have permission to delete it.' });
    }
    console.log(`Subscription ${id} deleted by user ${req.session.userId}`);
    res.status(204).send();
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
