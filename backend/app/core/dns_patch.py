"""
DNS resolution patch for Supabase hostnames that only have IPv6 (AAAA) records.
Some institutional networks can't resolve these via the system DNS.
This module resolves via Google Public DNS (8.8.8.8) over HTTPS as a fallback.
"""
import socket
import json
import urllib.request
import logging

logger = logging.getLogger("acadmix.dns")

_original_getaddrinfo = socket.getaddrinfo
_SUPABASE_SUFFIX = "supabase.co"
_cache = {}


def _resolve_via_doh(hostname: str) -> str | None:
    """Resolve hostname via Google DNS-over-HTTPS, returning first IPv4 address."""
    if hostname in _cache:
        return _cache[hostname]
    try:
        url = f"https://dns.google/resolve?name={hostname}&type=A"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        for answer in data.get("Answer", []):
            if answer.get("type") == 1:  # A record
                ip = answer["data"]
                _cache[hostname] = ip
                logger.info("DNS-over-HTTPS resolved %s → %s", hostname, ip)
                return ip
    except Exception as e:
        logger.debug("DNS-over-HTTPS fallback failed for %s: %s", hostname, e)
    return None


def _patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    """Try system resolver first; if it fails for Supabase hosts, use DoH fallback."""
    try:
        return _original_getaddrinfo(host, port, family, type, proto, flags)
    except socket.gaierror:
        if isinstance(host, str) and host.endswith(_SUPABASE_SUFFIX):
            ip = _resolve_via_doh(host)
            if ip:
                return _original_getaddrinfo(ip, port, socket.AF_INET, type, proto, flags)
        raise


def install():
    """Monkey-patch socket.getaddrinfo with our DoH fallback."""
    if socket.getaddrinfo is not _patched_getaddrinfo:
        socket.getaddrinfo = _patched_getaddrinfo
        logger.info("DNS fallback patch installed for *%s hostnames", _SUPABASE_SUFFIX)
