"""Encryption helpers for account-owned Octa provider credentials."""

from __future__ import annotations

import base64
import hashlib
import ipaddress
import socket
from urllib.parse import urlsplit

from cryptography.fernet import Fernet, InvalidToken

try:
    from backend.app.core.config import get_settings
except ModuleNotFoundError:
    from app.core.config import get_settings


def _cipher() -> Fernet:
    settings = get_settings()
    # Production requires a stable high-entropy JWT secret. Domain separation
    # keeps this encryption key distinct from the JWT signing use; every API
    # replica can decrypt the same account records without another secret.
    material = hashlib.sha256(
        b"stem-studio/user-llm-credentials/v1\0" + settings.JWT_SECRET_KEY.encode("utf-8")
    ).digest()
    return Fernet(base64.urlsafe_b64encode(material))


def encrypt_user_api_key(api_key: str) -> str:
    return _cipher().encrypt(api_key.encode("utf-8")).decode("ascii")


def decrypt_user_api_key(encrypted_api_key: str) -> str:
    try:
        return _cipher().decrypt(encrypted_api_key.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeEncodeError, UnicodeDecodeError, ValueError) as exc:
        raise RuntimeError("The saved Octa API credential could not be decrypted") from exc


_PROVIDER_HOSTS = {
    "dashscope": {"dashscope-intl.aliyuncs.com", "dashscope.aliyuncs.com"},
    "openai": {"api.openai.com"},
    "openrouter": {"openrouter.ai"},
    "anthropic": {"api.anthropic.com"},
}


def validate_provider_endpoint(provider: str, endpoint: str, *, debug: bool) -> str:
    """Reject unsafe schemes/hosts before the backend sends a user's key."""
    value = endpoint.strip()
    try:
        parts = urlsplit(value)
        _ = parts.port
    except ValueError as exc:
        raise ValueError("Enter a valid provider endpoint") from exc
    hostname = (parts.hostname or "").rstrip(".").lower()
    if not hostname or parts.username or parts.password or parts.fragment or parts.query:
        raise ValueError("Enter a valid provider endpoint without credentials, a query, or a fragment")

    local_host = hostname == "localhost" or hostname.endswith((".localhost", ".local", ".internal"))
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        local_host = True

    if debug and parts.scheme == "http" and local_host:
        return value
    if parts.scheme != "https":
        raise ValueError("Provider endpoints must use HTTPS")
    if local_host:
        raise ValueError("Private and local provider endpoints are not available from the hosted API")

    allowed_hosts = _PROVIDER_HOSTS.get(provider)
    if allowed_hosts and hostname not in allowed_hosts:
        raise ValueError("Use the official HTTPS endpoint for the selected provider")
    if provider == "custom":
        try:
            records = socket.getaddrinfo(hostname, parts.port or 443, type=socket.SOCK_STREAM)
        except OSError as exc:
            raise ValueError("Custom provider endpoint must resolve to a public host") from exc
        addresses = {ipaddress.ip_address(record[4][0]) for record in records}
        if not addresses or any(not address.is_global for address in addresses):
            raise ValueError("Custom provider endpoints must resolve only to public IP addresses")
    return value
