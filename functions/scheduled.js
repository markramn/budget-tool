// functions/scheduled.js

function getNextDate(lastDate, pattern) {
    const date = new Date(lastDate);
    
    switch (pattern) {
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            throw new Error(`Unknown recurrence pattern: ${pattern}`);
    }
    
    return date;
}

export async function scheduled(event, env, ctx) {
  const executionId = crypto.randomUUID();
  console.log(`[${executionId}] Starting scheduled execution at: ${new Date().toISOString()}`);
  
  try {
      // Log the environment check
      console.log(`[${executionId}] Checking environment...`);
      if (!env.DB) {
          throw new Error('Database binding not found');
      }

      // Log before querying templates
      console.log(`[${executionId}] Querying recurring transaction templates...`);
      const startTime = performance.now();
      
      await generateRecurringTransactions(env, executionId);
      
      const executionTime = (performance.now() - startTime).toFixed(2);
      console.log(`[${executionId}] Scheduled task completed successfully in ${executionTime}ms`);
  } catch (error) {
      console.error(`[${executionId}] Scheduled task error:`, error);
      // You might want to report this to your error tracking service
      throw error; // Re-throw to ensure Cloudflare marks this as a failed execution
  }
}

async function generateRecurringTransactions(env, executionId) {
  try {
      const templates = await env.DB.prepare(`
          SELECT * FROM recurring_transaction_templates
          WHERE is_active = 1 
          AND (end_date IS NULL OR end_date >= DATE('now'))
          AND (
              (recurrence_pattern = 'weekly' AND last_generated_date <= datetime('now', '-1 day'))
              OR
              (recurrence_pattern = 'monthly' AND last_generated_date <= datetime('now', '-27 days'))
              OR
              (recurrence_pattern = 'yearly' AND last_generated_date <= datetime('now', '-364 days'))
          )
      `).all();

      console.log(`[${executionId}] Found ${templates.results?.length || 0} templates to process`);

      let generatedCount = 0;
      const now = new Date();

      for (const template of templates.results || []) {
          console.log(`[${executionId}] Processing template ID: ${template.id}`);
          
          const lastGenerated = new Date(template.last_generated_date);
          let nextDate = getNextDate(lastGenerated, template.recurrence_pattern);

          if (nextDate <= now) {
              console.log(`[${executionId}] Generating transaction for template ${template.id}, next date: ${nextDate.toISOString()}`);
              
              // Insert new transaction
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

              // Update template
              await env.DB.prepare(`
                  UPDATE recurring_transaction_templates
                  SET last_generated_date = ?
                  WHERE id = ?
              `).bind(
                  nextDate.toISOString().split('T')[0],
                  template.id
              ).run();

              generatedCount++;
              console.log(`[${executionId}] Successfully generated transaction for template ${template.id}`);
          } else {
              console.log(`[${executionId}] Skipping template ${template.id}, next date (${nextDate.toISOString()}) is in the future`);
          }
      }

      console.log(`[${executionId}] Completed processing. Generated ${generatedCount} transactions`);
      return generatedCount;
  } catch (error) {
      console.error(`[${executionId}] GenerateRecurring error:`, error);
      throw error;
  }
}