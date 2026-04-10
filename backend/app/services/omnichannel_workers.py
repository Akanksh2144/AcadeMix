import time
import asyncio
from typing import Optional

class TokenBucketRateLimiter:
    """
    In-memory Token Bucket stub to demonstrate 3rd-party API rate-limiting handling
    for WhatsApp (e.g. 50 msg/sec) and Telegram (e.g. 30 msg/sec) bounds.
    """
    def __init__(self, rate: float, capacity: int):
        self.rate = rate
        self.capacity = capacity
        self.tokens = float(capacity)
        self.last_refill = time.monotonic()
        
    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        added = elapsed * self.rate
        if added > 0:
            self.tokens = min(float(self.capacity), self.tokens + added)
            self.last_refill = now
            
    async def acquire(self, tokens: int = 1):
        """Wait until enough tokens are available."""
        while True:
            self._refill()
            if self.tokens >= tokens:
                self.tokens -= tokens
                return
            # Sleep briefly to wait for refill, preventing CPU spin
            await asyncio.sleep(0.05)

# Stubs for rate limiting external API egress
whatsapp_limiter = TokenBucketRateLimiter(rate=50.0, capacity=50)
telegram_limiter = TokenBucketRateLimiter(rate=30.0, capacity=30)

async def dispatch_whatsapp_message(phone: str, message: str):
    await whatsapp_limiter.acquire()
    # Egress: HTTP outward bound Meta API requests would go here
    print(f"Dispatched via WhatsApp Rate Limiter: {phone} -> {message}")

async def dispatch_telegram_message(chat_id: str, message: str):
    await telegram_limiter.acquire()
    # Egress: HTTP outward bound Telegram API requests would go here
    print(f"Dispatched via Telegram Rate Limiter: {chat_id} -> {message}")
