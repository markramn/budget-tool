-- -- First create a test user
-- INSERT INTO users (email, password_hash, name) 
-- VALUES ('test@example.com', 'dummy_hash', 'Test User');

-- -- Create a test category
-- INSERT INTO categories (user_id, name, emoji, description)
-- VALUES (
--     (SELECT id FROM users WHERE email = 'test@example.com'),
--     'Test Category',
--     '💰',
--     'Test Category Description'
-- );

-- -- Create the recurring transaction template
-- INSERT INTO recurring_transaction_templates (
--     user_id,
--     category_id,
--     name,
--     description,
--     amount,
--     type,
--     start_date,
--     recurrence_pattern,
--     last_generated_date,
--     is_active
-- ) 
-- VALUES (
--     (SELECT id FROM users WHERE email = 'test@example.com'),
--     (SELECT id FROM categories WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')),
--     'Weekly Test Transaction',
--     'This should trigger in the next minute',
--     50.00,
--     'expense',
--     datetime('now', '-8 days'),
--     'weekly',
--     datetime('now', '-8 days'),
--     1
-- );

-- Check the template was created
SELECT 
    t.*,
    u.email as user_email,
    c.name as category_name
FROM recurring_transaction_templates t
JOIN users u ON t.user_id = u.id
JOIN categories c ON t.category_id = c.id;

-- After a minute, check if a transaction was generated
SELECT 
    t.*,
    rt.name as template_name,
    c.name as category_name
FROM transactions t
JOIN recurring_transaction_templates rt ON t.recurring_template_id = rt.id
JOIN categories c ON t.category_id = c.id
ORDER BY t.created_at DESC
LIMIT 1;