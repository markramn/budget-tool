// functions/api/transactions.js
import { validateSession } from '../auth/auth';

function getNextDate(date, pattern) {
  const next = new Date(date);
  switch (pattern) {
    case 'weekly':
      next.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(date.getFullYear() + 1);
      break;
  }
  return next;
}

export async function handleListTransactions(env, request) {
  try {
    const user = await validateSession(env, request);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const transactions = await env.DB.prepare(`
      SELECT t.*, c.name as category_name, c.emoji as category_emoji 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.date DESC
    `).bind(user.id).all();

    return new Response(JSON.stringify(transactions.results || []), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('ListTransactions error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function handleCreateTransaction(env, request) {
  try {
    const user = await validateSession(env, request);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const data = await request.json();
    console.log('Creating transaction with data:', data);

    // Insert the main transaction
    const mainResult = await env.DB.prepare(`
      INSERT INTO transactions (
        user_id, name, description, amount, type, category_id, date,
        is_recurring, recurrence_pattern, recurrence_end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      data.name,
      data.description || '',  // Handle null
      data.amount,
      data.type,
      data.category_id,
      data.date,
      data.is_recurring ? 1 : 0,
      data.recurrence_pattern || null,  // Handle null
      data.recurrence_end_date || null  // Handle null
    ).run();

    console.log('Main transaction result:', mainResult);

    if (data.is_recurring && data.recurrence_pattern && data.recurrence_end_date) {
      await createRecurringTransactions(env, {
        ...data,
        user_id: user.id,
        parent_transaction_id: mainResult.lastRowId
      });
    }

    return new Response(JSON.stringify({ id: mainResult.lastRowId }));
  } catch (error) {
    console.error('CreateTransaction error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

async function createRecurringTransactions(env, data) {
  try {
    const startDate = new Date(data.date);
    const endDate = new Date(data.recurrence_end_date);
    let currentDate = getNextDate(startDate, data.recurrence_pattern);

    console.log('Creating recurring transactions:', {
      startDate,
      endDate,
      firstRecurrence: currentDate,
      data
    });

    while (currentDate <= endDate) {
      await env.DB.prepare(`
        INSERT INTO transactions (
          user_id, parent_transaction_id, name, description, amount, type,
          category_id, date, is_recurring
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.user_id,
        data.parent_transaction_id,
        data.name,
        data.description || '',
        data.amount,
        data.type,
        data.category_id,
        currentDate.toISOString().split('T')[0],
        0
      ).run();

      currentDate = getNextDate(currentDate, data.recurrence_pattern);
    }
  } catch (error) {
    console.error('CreateRecurring error:', error);
    throw error;
  }
}

export async function handleUpdateTransaction(env, request) {
  try {
    const user = await validateSession(env, request);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { id, ...data } = await request.json();

    const result = await env.DB.prepare(`
      UPDATE transactions 
      SET name = ?, description = ?, amount = ?, type = ?, 
          category_id = ?, date = ?
      WHERE id = ? AND user_id = ?
    `).bind(
      data.name,
      data.description || '',
      data.amount,
      data.type,
      data.category_id,
      data.date,
      id,
      user.id
    ).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('UpdateTransaction error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function handleDeleteTransaction(env, request) {
  try {
    const user = await validateSession(env, request);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    const result = await env.DB.prepare(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('DeleteTransaction error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}