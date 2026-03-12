const COMMENTS_API_BASE_URL = import.meta.env.VITE_COMMENTS_API_URL || 'https://movtv.fun/api/v1';
const COMMENTS_AUTH_STORAGE_KEY = 'movtv-comments-auth';

function buildHeaders(token, hasBody = false) {
  const headers = {};

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function parseResponse(response) {
  if (response.ok) {
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  let message = `HTTP ${response.status}`;

  try {
    const payload = await response.json();
    if (payload?.detail) {
      message = payload.detail;
    }
  } catch {
    // Ignore invalid JSON bodies.
  }

  throw new Error(message);
}

export function getLaunchParamsString() {
  const raw = window.location.search.replace(/^\?/, '');

  if (!raw || !raw.includes('vk_app_id=') || !raw.includes('sign=')) {
    return '';
  }

  return raw;
}

export function loadStoredCommentsAuth() {
  try {
    const raw = window.sessionStorage.getItem(COMMENTS_AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeCommentsAuth(auth) {
  window.sessionStorage.setItem(COMMENTS_AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearCommentsAuth() {
  window.sessionStorage.removeItem(COMMENTS_AUTH_STORAGE_KEY);
}

export async function authenticateCommentsUser(launchParams) {
  const response = await fetch(`${COMMENTS_API_BASE_URL}/auth/vk`, {
    method: 'POST',
    headers: buildHeaders('', true),
    body: JSON.stringify({ launch_params: launchParams }),
  });

  return parseResponse(response);
}

export async function fetchComments(postId, token = '') {
  const response = await fetch(`${COMMENTS_API_BASE_URL}/posts/${postId}/comments`, {
    headers: buildHeaders(token),
  });

  return parseResponse(response);
}

export async function createComment(postId, body, token) {
  const response = await fetch(`${COMMENTS_API_BASE_URL}/posts/${postId}/comments`, {
    method: 'POST',
    headers: buildHeaders(token, true),
    body: JSON.stringify({ body }),
  });

  return parseResponse(response);
}

export async function likeComment(commentId, token) {
  const response = await fetch(`${COMMENTS_API_BASE_URL}/comments/${commentId}/like`, {
    method: 'POST',
    headers: buildHeaders(token),
  });

  return parseResponse(response);
}

export async function unlikeComment(commentId, token) {
  const response = await fetch(`${COMMENTS_API_BASE_URL}/comments/${commentId}/like`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  });

  return parseResponse(response);
}