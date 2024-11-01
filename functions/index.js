import { handleLogin, handleRegister, handleLogout, handleValidateSession } from './auth/auth';
import {
  handleListCategories,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory
} from './api/categories';
import { 
  handleListTransactions, 
  handleCreateTransaction, 
  handleUpdateTransaction, 
  handleDeleteTransaction 
} from './api/transactions';
import { scheduled } from './scheduled.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Handle API routes
      if (url.pathname.startsWith('/api/')) {
        let response;

        switch (url.pathname) {
          case '/api/auth/login':
            response = await handleLogin(env, request);
            break;
          case '/api/auth/signup':
            response = await handleRegister(env, request);
            break;
          case '/api/auth/logout':
            response = await handleLogout(env, request);
            break;
          case '/api/auth/validate':
            response = await handleValidateSession(env, request);
            break;
          case '/api/categories':
            switch (request.method) {
              case 'GET':
                response = await handleListCategories(env, request);
                break;
              case 'POST':
                response = await handleCreateCategory(env, request);
                break;
              case 'PUT':
                response = await handleUpdateCategory(env, request);
                break;
              case 'DELETE':
                response = await handleDeleteCategory(env, request);
                break;
              default:
                response = new Response('Method not allowed', { status: 405 });
            }
            break;
          case '/api/transactions':
            switch (request.method) {
              case 'GET':
                response = await handleListTransactions(env, request);
                break;
              case 'POST':
                response = await handleCreateTransaction(env, request);
                break;
              case 'PUT':
                response = await handleUpdateTransaction(env, request);
                break;
              case 'DELETE':
                response = await handleDeleteTransaction(env, request);
                break;
              default:
                response = new Response('Method not allowed', { status: 405 });
            }
            break;
          default:
            response = new Response('Not Found', { status: 404 });
        }

        // Add CORS headers to API responses
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      }

      // Serve static assets
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  },

  // Add the scheduled handler to the default export
  scheduled
};