// functions/api/categories.js
import { validateSession } from '../auth/auth';

export async function handleListCategories(env, request) {
    try {
      const user = await validateSession(env, request);
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  
      const categories = await env.DB.prepare(
        'SELECT * FROM categories WHERE user_id = ?'
      ).bind(user.id).all();
  
      return new Response(JSON.stringify(categories.results || []), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Categories error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

export async function handleCreateCategory(env, request) {
  const user = await validateSession(env, request);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { name, emoji, description } = await request.json();
  if (!name || !emoji) {
    return new Response(JSON.stringify({ error: 'Name and emoji are required' }), { status: 400 });
  }

  const result = await env.DB.prepare(
    'INSERT INTO categories (user_id, name, emoji, description) VALUES (?, ?, ?, ?)'
  ).bind(user.id, name, emoji, description).run();

  return new Response(JSON.stringify({ id: result.lastRowId }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleUpdateCategory(env, request) {
  const user = await validateSession(env, request);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { id, name, emoji, description } = await request.json();
  if (!id || !name || !emoji) {
    return new Response(JSON.stringify({ error: 'Invalid data' }), { status: 400 });
  }

  const result = await env.DB.prepare(
    'UPDATE categories SET name = ?, emoji = ?, description = ? WHERE id = ? AND user_id = ?'
  ).bind(name, emoji, description, id, user.id).run();

  if (result.changes === 0) {
    return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ success: true }));
}

export async function handleDeleteCategory(env, request) {
  const user = await validateSession(env, request);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'Category ID required' }), { status: 400 });
  }

  const result = await env.DB.prepare(
    'DELETE FROM categories WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).run();

  if (result.changes === 0) {
    return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ success: true }));
}