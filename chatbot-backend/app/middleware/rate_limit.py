# chatbot-backend/app/middleware/rate_limit.py
"""
Rate Limiting Middleware for FastAPI

Provides per-tenant rate limiting using Redis for request counting.
Rate limits are configurable per tenant tier (free, basic, pro).
"""

import redis
from fastapi import Request, HTTPException
from starlette.responses import JSONResponse
from typing import Optional, Dict, Tuple
from app.core.config import settings


class RateLimitMiddleware:
    """
    Redis-based rate limiting middleware for FastAPI.

    Limits requests per tenant with configurable thresholds for different endpoint types.
    Returns 429 Too Many Requests when limits are exceeded.
    """

    def __init__(self, app, redis_url: Optional[str] = None):
        """
        Initialize rate limiting middleware.

        Args:
            app: FastAPI application instance
            redis_url: Redis connection URL (defaults to settings.REDIS_URL)
        """
        self.app = app
        self.redis_url = redis_url or settings.REDIS_URL

        # Initialize Redis connection
        try:
            self.redis = redis.from_url(self.redis_url)
            # Test connection
            self.redis.ping()
        except redis.ConnectionError as e:
            print(f"Warning: Redis connection failed ({e}). Rate limiting disabled.")
            self.redis = None

        # Rate limit configuration (requests per window)
        # Format: {endpoint_type: (limit, window_seconds)}
        self.limits: Dict[str, Tuple[int, int]] = {
            "default": (100, 60),  # 100 requests per minute
            "chat": (50, 60),  # 50 requests per minute for chat endpoints
            "embed": (200, 60),  # 200 requests per minute for embed endpoints
            "admin": (30, 60),  # 30 requests per minute for admin endpoints
        }

        # Tier-based multipliers
        self.tier_multipliers = {
            "free": 0.5,
            "basic": 1.0,
            "pro": 2.0,
        }

    async def __call__(self, scope, receive, send):
        """
        Process incoming request through rate limiting.

        Args:
            scope: ASGI scope
            receive: ASGI receive callable
            send: ASGI send callable
        """
        # Only process HTTP requests
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Skip rate limiting if Redis is unavailable
        if not self.redis:
            await self.app(scope, receive, send)
            return

        request = Request(scope)

        # Extract tenant ID from header
        tenant_id = self._get_tenant_id(request)

        # Skip rate limiting if no tenant ID
        if not tenant_id:
            await self.app(scope, receive, send)
            return

        # Get endpoint type and rate limit configuration
        endpoint_type = self._get_endpoint_type(request.url.path)
        limit, window = self._get_rate_limit(tenant_id, endpoint_type)

        # Check if rate limited
        if self._is_rate_limited(tenant_id, endpoint_type, limit, window):
            response = self._create_rate_limit_response(
                tenant_id, endpoint_type, limit, window
            )
            await response(scope, receive, send)
            return

        # Add rate limit headers to request state for response modification
        scope["rate_limit"] = {
            "tenant_id": tenant_id,
            "endpoint_type": endpoint_type,
            "limit": limit,
            "remaining": limit - self._get_current_count(tenant_id, endpoint_type),
            "reset": window,
        }

        # Continue processing request
        await self.app(scope, receive, send)

    def _get_tenant_id(self, request: Request) -> Optional[str]:
        """
        Extract tenant ID from request headers.

        Args:
            request: FastAPI Request object

        Returns:
            Tenant ID string or None
        """
        # Check X-Tenant-ID header (set by API key validation middleware)
        tenant_id = request.headers.get("X-Tenant-ID")

        if tenant_id:
            return tenant_id

        # Fallback: Extract from API key (placeholder logic)
        api_key = request.headers.get("X-API-Key")
        if api_key and api_key.startswith("test_"):
            return "test_tenant"

        return None

    def _get_endpoint_type(self, path: str) -> str:
        """
        Determine endpoint type based on URL path.

        Args:
            path: Request URL path

        Returns:
            Endpoint type string
        """
        if "/chat" in path or "/v1/chat" in path:
            return "chat"
        elif "/embed" in path or "/widget" in path:
            return "embed"
        elif "/admin" in path:
            return "admin"
        else:
            return "default"

    def _get_rate_limit(self, tenant_id: str, endpoint_type: str) -> Tuple[int, int]:
        """
        Get rate limit for tenant and endpoint type.

        Args:
            tenant_id: Tenant identifier
            endpoint_type: Type of endpoint being accessed

        Returns:
            Tuple of (limit, window_seconds)
        """
        # Get base limit for endpoint type
        base_limit, window = self.limits.get(endpoint_type, self.limits["default"])

        # TODO: Fetch tenant tier from database
        # For now, use default tier
        tier = "basic"
        multiplier = self.tier_multipliers.get(tier, 1.0)

        # Apply tier multiplier
        limit = int(base_limit * multiplier)

        return limit, window

    def _is_rate_limited(
        self, tenant_id: str, endpoint_type: str, limit: int, window: int
    ) -> bool:
        """
        Check if request should be rate limited.

        Args:
            tenant_id: Tenant identifier
            endpoint_type: Type of endpoint
            limit: Maximum requests allowed
            window: Time window in seconds

        Returns:
            True if rate limited, False otherwise
        """
        key = f"ratelimit:{tenant_id}:{endpoint_type}"

        try:
            # Increment counter
            current = self.redis.incr(key)

            # Set expiry on first request
            if current == 1:
                self.redis.expire(key, window)

            # Check if over limit
            return current > limit

        except redis.RedisError as e:
            print(f"Redis error during rate limit check: {e}")
            # Fail open - allow request if Redis is having issues
            return False

    def _get_current_count(self, tenant_id: str, endpoint_type: str) -> int:
        """
        Get current request count for tenant and endpoint.

        Args:
            tenant_id: Tenant identifier
            endpoint_type: Type of endpoint

        Returns:
            Current request count
        """
        key = f"ratelimit:{tenant_id}:{endpoint_type}"

        try:
            count = self.redis.get(key)
            return int(count) if count else 0
        except redis.RedisError:
            return 0

    def _create_rate_limit_response(
        self, tenant_id: str, endpoint_type: str, limit: int, window: int
    ):
        """
        Create 429 response with rate limit information.

        Args:
            tenant_id: Tenant identifier
            endpoint_type: Type of endpoint
            limit: Rate limit that was exceeded
            window: Time window in seconds

        Returns:
            JSONResponse with 429 status
        """
        # Calculate retry-after
        try:
            ttl = self.redis.ttl(f"ratelimit:{tenant_id}:{endpoint_type}")
            retry_after = ttl if ttl > 0 else window
        except redis.RedisError:
            retry_after = window

        return JSONResponse(
            status_code=429,
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(retry_after),
                "X-RateLimit-Tenant": tenant_id,
            },
            content={
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Please retry in {retry_after} seconds.",
                "tenant_id": tenant_id,
                "endpoint_type": endpoint_type,
                "limit": limit,
                "retry_after": retry_after,
            },
        )

    def get_usage(self, tenant_id: str, endpoint_type: str = "default") -> Dict:
        """
        Get current usage statistics for a tenant.

        Args:
            tenant_id: Tenant identifier
            endpoint_type: Optional endpoint type filter

        Returns:
            Dictionary with usage statistics
        """
        if not self.redis:
            return {"error": "Redis unavailable"}

        try:
            if endpoint_type:
                key = f"ratelimit:{tenant_id}:{endpoint_type}"
                count = self.redis.get(key)
                limit, window = self._get_rate_limit(tenant_id, endpoint_type)

                return {
                    "tenant_id": tenant_id,
                    "endpoint_type": endpoint_type,
                    "current": int(count) if count else 0,
                    "limit": limit,
                    "remaining": max(0, limit - (int(count) if count else 0)),
                    "window": window,
                    "usage_percent": ((int(count) if count else 0) / limit * 100)
                    if limit > 0
                    else 0,
                }
            else:
                # Get all endpoint types
                usage = {}
                for ep_type in self.limits.keys():
                    key = f"ratelimit:{tenant_id}:{ep_type}"
                    count = self.redis.get(key)
                    limit, window = self._get_rate_limit(tenant_id, ep_type)

                    usage[ep_type] = {
                        "current": int(count) if count else 0,
                        "limit": limit,
                        "remaining": max(0, limit - (int(count) if count else 0)),
                        "window": window,
                    }

                return {
                    "tenant_id": tenant_id,
                    "usage": usage,
                }

        except redis.RedisError as e:
            return {"error": str(e)}

    def reset_limits(self, tenant_id: str, endpoint_type: str = None):
        """
        Reset rate limits for a tenant.

        Args:
            tenant_id: Tenant identifier
            endpoint_type: Optional specific endpoint type to reset
        """
        if not self.redis:
            return

        try:
            if endpoint_type:
                self.redis.delete(f"ratelimit:{tenant_id}:{endpoint_type}")
            else:
                # Reset all endpoint types for tenant
                pattern = f"ratelimit:{tenant_id}:*"
                keys = self.redis.keys(pattern)
                if keys:
                    self.redis.delete(*keys)
        except redis.RedisError as e:
            print(f"Redis error during rate limit reset: {e}")


def add_rate_limit_middleware(app, redis_url: str = None):
    """
    Convenience function to add rate limiting middleware to FastAPI app.

    Args:
        app: FastAPI application instance
        redis_url: Optional Redis connection URL

    Returns:
        Configured RateLimitMiddleware instance
    """
    middleware = RateLimitMiddleware(app, redis_url)
    app.add_middleware(RateLimitMiddleware)
    return middleware
