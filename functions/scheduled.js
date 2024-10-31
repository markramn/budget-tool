// functions/scheduled.js
export async function scheduled(event, env, ctx) {
    try {
      console.log('Running recurring transactions check at:', new Date().toISOString());
      await generateRecurringTransactions(env);
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  }
  
  async function generateRecurringTransactions(env) {
    try {
      // Only get templates that need processing
      // This query is optimized to only select templates that might need new transactions
      const templates = await env.DB.prepare(`
        SELECT * FROM recurring_transaction_templates
        WHERE is_active = 1 
        AND (end_date IS NULL OR end_date >= DATE('now'))
        AND (
          -- For weekly recurrence
          (recurrence_pattern = 'weekly' AND last_generated_date <= datetime('now', '-1 day'))
          OR
          -- For monthly recurrence
          (recurrence_pattern = 'monthly' AND last_generated_date <= datetime('now', '-27 days'))
          OR
          -- For yearly recurrence
          (recurrence_pattern = 'yearly' AND last_generated_date <= datetime('now', '-364 days'))
        )
      `).all();
  
      let generatedCount = 0;
      const now = new Date();
  
      for (const template of templates.results || []) {
        const lastGenerated = new Date(template.last_generated_date);
        let nextDate = getNextDate(lastGenerated, template.recurrence_pattern);
  
        // Only generate if we've actually passed the next date
        if (nextDate <= now) {
          // We'll only generate one transaction per template per run to avoid overwhelming the system
          await env.DB.prepare(`
            INSERT INTO transactions (
              user_id, category_id, name, description, amount, type, date, recurring_template_id
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
  
      if (generatedCount > 0) {
        console.log(`Generated ${generatedCount} recurring transactions`);
      }
    } catch (error) {
      console.error('GenerateRecurring error:', error);
      throw error;
    }
  }
  
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