// functions/auth.js
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { addDays } from 'date-fns';

export async function createUser(env, email, password, name) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const { success, error } = await env.DB.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  )
    .bind(email, passwordHash, name)
    .run();

  if (!success) {
    throw new Error(error || 'Failed to create user');
  }

  const user = await env.DB.prepare('SELECT id, email, name FROM users WHERE email = ?')
    .bind(email)
    .first();

  return user;
}

export async function createSession(env, userId) {
  const token = nanoid(32);
  const expiresAt = addDays(new Date(), 7);

  await env.DB.prepare(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
  )
    .bind(userId, token, expiresAt.toISOString())
    .run();

  return { token, expiresAt };
}

export async function validateSession(env, request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const session = await env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first();

  if (!session) return null;

  const user = await env.DB.prepare(
    'SELECT id, email, name FROM users WHERE id = ?'
  ).bind(session.user_id).first();

  // Return just the id for database operations
  return user ? { id: user.id } : null;
}

export async function validateCredentials(env, email, password) {
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  )
    .bind(email)
    .first();

  if (!user) {
    return null;
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
}

export async function deleteSession(env, token) {
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?')
    .bind(token)
    .run();
}

// Route handlers
export async function handleLogin(env, request) {
  const { email, password } = await request.json();
  
  const user = await validateCredentials(env, email, password);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { token, expiresAt } = await createSession(env, user.id);

  return new Response(JSON.stringify({ user, token, expiresAt }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleRegister(env, request) {
  const { email, password, name } = await request.json();

  try {
    const user = await createUser(env, email, password, name);
    const { token, expiresAt } = await createSession(env, user.id);

    return new Response(JSON.stringify({ user, token, expiresAt }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Email already exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleLogout(env, request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(null, { status: 204 });
  }

  const token = authHeader.split(' ')[1];
  await deleteSession(env, token);

  return new Response(null, { status: 204 });
}

export async function handleValidateSession(env, request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.split(' ')[1];
  const user = await validateSession(env, token);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}