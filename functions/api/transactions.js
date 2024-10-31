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

    // Get both regular transactions and those generated from templates
    const transactions = await env.DB.prepare(`
      SELECT 
        t.*,
        c.name as category_name,
        c.emoji as category_emoji,
        rt.recurrence_pattern,
        rt.end_date as recurrence_end_date,
        CASE WHEN rt.id IS NOT NULL THEN 1 ELSE 0 END as is_recurring
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN recurring_transaction_templates rt ON t.recurring_template_id = rt.id
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

    if (data.is_recurring) {
      try {
        // Create a recurring transaction template
        console.log('Creating recurring template with data:', {
          user_id: user.id,
          category_id: data.category_id,
          name: data.name,
          description: data.description || '',
          amount: data.amount,
          type: data.type,
          start_date: data.date,
          recurrence_pattern: data.recurrence_pattern,
          last_generated_date: data.date,
          end_date: data.recurrence_end_date || null
        });

        const templateResult = await env.DB.prepare(`
          INSERT INTO recurring_transaction_templates (
            user_id,
            category_id,
            name,
            description,
            amount,
            type,
            start_date,
            recurrence_pattern,
            last_generated_date,
            end_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id
        `).bind(
          user.id,
          data.category_id,
          data.name,
          data.description || '',
          data.amount,
          data.type,
          data.date,
          data.recurrence_pattern,
          data.date,
          data.recurrence_end_date || null
        ).first();

        if (!templateResult) {
          throw new Error('Failed to create recurring template');
        }

        console.log('Template created successfully:', templateResult);

        // Create the initial transaction
        const transactionResult = await env.DB.prepare(`
          INSERT INTO transactions (
            user_id,
            category_id,
            name,
            description,
            amount,
            type,
            date,
            recurring_template_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id
        `).bind(
          user.id,
          data.category_id,
          data.name,
          data.description || '',
          data.amount,
          data.type,
          data.date,
          templateResult.id
        ).first();

        if (!transactionResult) {
          throw new Error('Failed to create initial transaction');
        }

        console.log('Transaction created successfully:', transactionResult);

        return new Response(JSON.stringify({ 
          id: transactionResult.id,
          template_id: templateResult.id
        }));
      } catch (error) {
        console.error('Detailed error in recurring transaction creation:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to create recurring transaction',
          details: error.message
        }), { status: 500 });
      }
    } else {
      // Create a regular one-time transaction
      try {
        console.log('Creating regular transaction with data:', {
          user_id: user.id,
          category_id: data.category_id,
          name: data.name,
          description: data.description || '',
          amount: data.amount,
          type: data.type,
          date: data.date
        });

        const result = await env.DB.prepare(`
          INSERT INTO transactions (
            user_id,
            category_id,
            name,
            description,
            amount,
            type,
            date
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING id
        `).bind(
          user.id,
          data.category_id,
          data.name,
          data.description || '',
          data.amount,
          data.type,
          data.date
        ).first();

        if (!result) {
          throw new Error('Failed to create transaction');
        }

        console.log('Regular transaction created successfully:', result);

        return new Response(JSON.stringify({ id: result.id }));
      } catch (error) {
        console.error('Detailed error in regular transaction creation:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to create transaction',
          details: error.message
        }), { status: 500 });
      }
    }
  } catch (error) {
    console.error('CreateTransaction error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process request',
      details: error.message
    }), { status: 500 });
  }
}

export async function handleUpdateTransaction(env, request) {
  try {
    const user = await validateSession(env, request);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { id, ...data } = await request.json();

    // Check if this is a recurring transaction
    const transaction = await env.DB.prepare(`
      SELECT recurring_template_id 
      FROM transactions 
      WHERE id = ? AND user_id = ?
    `).bind(id, user.id).first();

    if (!transaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404 });
    }

    if (transaction.recurring_template_id && data.updateFuture) {
      // Update the template and all future transactions
      await env.DB.prepare(`
        UPDATE recurring_transaction_templates
        SET name = ?, description = ?, amount = ?, type = ?, category_id = ?
        WHERE id = ? AND user_id = ?
      `).bind(
        data.name,
        data.description || '',
        data.amount,
        data.type,
        data.category_id,
        transaction.recurring_template_id,
        user.id
      ).run();
    }

    // Update the current transaction
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
    const deleteFuture = url.searchParams.get('deleteFuture') === 'true';
    
    // Check if this is a recurring transaction
    const transaction = await env.DB.prepare(`
      SELECT recurring_template_id 
      FROM transactions 
      WHERE id = ? AND user_id = ?
    `).bind(id, user.id).first();

    if (!transaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404 });
    }

    if (transaction.recurring_template_id && deleteFuture) {
      // Delete the template (this will stop future generations)
      await env.DB.prepare(`
        UPDATE recurring_transaction_templates
        SET is_active = 0
        WHERE id = ? AND user_id = ?
      `).bind(transaction.recurring_template_id, user.id).run();
    }

    // Delete the current transaction
    const result = await env.DB.prepare(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).run();

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('DeleteTransaction error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function handleGenerateRecurring(env, request) {
  try {
    const user = await validateSession(env, request);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const templates = await env.DB.prepare(`
      SELECT * FROM recurring_transaction_templates
      WHERE user_id = ?
      AND is_active = 1 
      AND (end_date IS NULL OR end_date >= DATE('now'))
      AND (
        (recurrence_pattern = 'weekly' AND last_generated_date <= datetime('now', '-1 day'))
        OR
        (recurrence_pattern = 'monthly' AND last_generated_date <= datetime('now', '-27 days'))
        OR
        (recurrence_pattern = 'yearly' AND last_generated_date <= datetime('now', '-364 days'))
      )
    `).bind(user.id).all();

    let generatedCount = 0;
    const now = new Date();

    for (const template of templates.results || []) {
      const lastGenerated = new Date(template.last_generated_date);
      let nextDate = getNextDate(lastGenerated, template.recurrence_pattern);

      if (nextDate <= now) {
        // Generate the next transaction
        await env.DB.prepare(`
          INSERT INTO transactions (
            user_id,
            category_id,
            name,
            description,
            amount,
            type,
            date,
            recurring_template_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          template.user_id,
          template.category_id,
          template.name,
          template.description,
          template.amount,
          template.type,
          nextDate.toISOString().split('T')[0],
          template.id
        ).run();

        // Update the last generated date
        await env.DB.prepare(`
          UPDATE recurring_transaction_templates
          SET last_generated_date = ?
          WHERE id = ?
        `).bind(
          nextDate.toISOString().split('T')[0],
          template.id
        ).run();

        generatedCount++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      generated: generatedCount 
    }));
  } catch (error) {
    console.error('GenerateRecurring error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}