import { handleContact } from './contact.js';

// Static files are served straight from ./ by the assets binding; only requests
// that don't match a file reach this Worker.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
      }
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
