"""VK launch params signature validation.

Docs: https://dev.vk.com/mini-apps/development/launch-params/sign
"""

import hashlib
import hmac
import base64
from typing import Dict
from urllib.parse import parse_qs, urlencode

import httpx
from fastapi import HTTPException, status

from app.config import get_settings

settings = get_settings()


def _parse_launch_params(raw: str) -> Dict[str, str]:
    """Parse URL-encoded launch params string into a flat dict."""
    parsed = parse_qs(raw, keep_blank_values=True)
    return {k: v[0] for k, v in parsed.items()}


def validate_vk_launch_params(launch_params: str) -> Dict[str, str]:
    """
    Validate VK Mini App launch params signature.

    Steps:
    1. Parse query string into dict.
    2. Filter keys that start with 'vk_'.
    3. Sort alphabetically and rebuild query string.
    4. Compute HMAC-SHA256 with VK_APP_SECRET, base64url-encode (no padding).
    5. Compare with the `sign` param.

    Returns the parsed params dict on success, raises HTTPException on failure.
    """
    params = _parse_launch_params(launch_params)
    sign = params.get("sign")
    if not sign:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing sign param")

    # Collect only vk_* keys, sorted
    vk_params = sorted(
        ((k, v) for k, v in params.items() if k.startswith("vk_")),
        key=lambda x: x[0],
    )
    query_string = urlencode(vk_params)

    secret = settings.VK_APP_SECRET
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="VK_APP_SECRET is not configured",
        )

    digest = hmac.new(
        secret.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    computed_sign = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

    if not hmac.compare_digest(computed_sign, sign):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid VK signature",
        )

    return params


async def fetch_vk_user_profile(vk_user_id: int) -> Dict[str, str]:
    if not settings.VK_SERVICE_TOKEN:
        return {}

    request_params = {
        "user_ids": str(vk_user_id),
        "fields": "photo_100,screen_name",
        "access_token": settings.VK_SERVICE_TOKEN,
        "v": settings.VK_API_VERSION,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://api.vk.com/method/users.get", params=request_params)
            response.raise_for_status()
    except httpx.HTTPError:
        return {}

    payload = response.json()
    users = payload.get("response") or []
    if not users:
        return {}

    user = users[0]
    return {
        "first_name": user.get("first_name") or "",
        "last_name": user.get("last_name") or "",
        "screen_name": user.get("screen_name") or "",
        "photo_100": user.get("photo_100") or "",
    }
