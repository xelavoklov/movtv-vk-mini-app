import vkBridge from '@vkontakte/vk-bridge';

const COMMENTS_API_BASE_URL = import.meta.env.VITE_COMMENTS_API_URL || 'https://movtv.fun/api/v1';
const COMMENTS_AUTH_STORAGE_KEY = 'movtv-comments-auth';

class CommentsApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'CommentsApiError';
    this.status = options.status || 0;
    this.detail = options.detail || '';
    this.url = options.url || '';
    this.method = options.method || 'GET';
    this.kind = options.kind || 'api';
  }
}

function normalizeLaunchParamsObject(rawParams) {
  return Object.entries(rawParams || {}).reduce((result, [key, value]) => {
    if (typeof value === 'undefined' || value === null) {
      return result;
    }

    result[key] = String(value);
    return result;
  }, {});
}

function stringifyLaunchParams(rawParams) {
  const params = normalizeLaunchParamsObject(rawParams);
  return new URLSearchParams(params).toString();
}

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

async function parseResponse(response, requestInfo = {}) {
  if (response.ok) {
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  let detail = '';

  try {
    const payload = await response.json();
    if (payload?.detail) {
      detail = payload.detail;
    }
  } catch {
    // Ignore invalid JSON bodies.
  }

  const message = detail ? `API ${response.status}: ${detail}` : `API ${response.status}: ошибка сервера комментариев`;
  throw new CommentsApiError(message, {
    status: response.status,
    detail,
    url: requestInfo.url || response.url || '',
    method: requestInfo.method || 'GET',
    kind: 'api',
  });
}

function normalizeRequestError(error, requestInfo = {}) {
  if (error instanceof CommentsApiError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new CommentsApiError(
      'Сеть/CORS: не удалось подключиться к API комментариев. Проверь сервер и CORS.',
      {
        url: requestInfo.url || '',
        method: requestInfo.method || 'GET',
        kind: 'network',
      },
    );
  }

  return new CommentsApiError(
    error instanceof Error ? error.message : 'Неизвестная ошибка комментариев',
    {
      url: requestInfo.url || '',
      method: requestInfo.method || 'GET',
      kind: 'unknown',
    },
  );
}

function logRequestError(error) {
  console.error('[comments-api]', {
    kind: error.kind,
    status: error.status,
    detail: error.detail,
    method: error.method,
    url: error.url,
    message: error.message,
  });
}

async function requestJson(url, init = {}) {
  const requestInfo = {
    url,
    method: init.method || 'GET',
  };

  try {
    const response = await fetch(url, init);
    return await parseResponse(response, requestInfo);
  } catch (error) {
    const normalizedError = normalizeRequestError(error, requestInfo);
    logRequestError(normalizedError);
    throw normalizedError;
  }
}

export function getLaunchParamsString() {
  const raw = window.location.search.replace(/^\?/, '');

  if (!raw || !raw.includes('vk_app_id=') || !raw.includes('sign=')) {
    return '';
  }

  return raw;
}

export async function getBridgeLaunchParamsString() {
  try {
    const params = await vkBridge.send('VKWebAppGetLaunchParams');
    const launchParams = stringifyLaunchParams(params);
    return launchParams.includes('sign=') ? launchParams : '';
  } catch {
    return '';
  }
}

export async function getBridgeUserProfile() {
  try {
    const user = await vkBridge.send('VKWebAppGetUserInfo');

    return {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      screen_name: user?.screen_name || '',
      photo_100: user?.photo_100 || user?.photo_200 || '',
    };
  } catch {
    return null;
  }
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

export async function authenticateCommentsUser(launchParams, userProfile = null) {
  return requestJson(`${COMMENTS_API_BASE_URL}/auth/vk`, {
    method: 'POST',
    headers: buildHeaders('', true),
    body: JSON.stringify({
      launch_params: launchParams,
      ...(userProfile || {}),
    }),
  });
}

export async function fetchComments(postId, token = '', options = {}) {
  const params = new URLSearchParams();

  if (typeof options.limit !== 'undefined') {
    params.set('limit', String(options.limit));
  }

  if (typeof options.offset !== 'undefined') {
    params.set('offset', String(options.offset));
  }

  const querySuffix = params.toString() ? `?${params.toString()}` : '';
  return requestJson(`${COMMENTS_API_BASE_URL}/posts/${postId}/comments${querySuffix}`, {
    headers: buildHeaders(token),
  });
}

export async function createComment(postId, body, token) {
  return requestJson(`${COMMENTS_API_BASE_URL}/posts/${postId}/comments`, {
    method: 'POST',
    headers: buildHeaders(token, true),
    body: JSON.stringify({ body }),
  });
}

export async function likeComment(commentId, token) {
  return requestJson(`${COMMENTS_API_BASE_URL}/comments/${commentId}/like`, {
    method: 'POST',
    headers: buildHeaders(token),
  });
}

export async function unlikeComment(commentId, token) {
  return requestJson(`${COMMENTS_API_BASE_URL}/comments/${commentId}/like`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  });
}

export async function fetchPostStats(postId) {
  return requestJson(`${COMMENTS_API_BASE_URL}/posts/${postId}/stats`);
}

export async function recordPostView(postId, token) {
  return requestJson(`${COMMENTS_API_BASE_URL}/posts/${postId}/view`, {
    method: 'POST',
    headers: buildHeaders(token),
  });
}