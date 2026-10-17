"""One small *real* Nebius Token Factory inference request, capturing the
evidence needed for a billing-attribution investigation.

Captured per call:
  * UTC start/end timestamp
  * model id (requested + served)
  * HTTP status
  * response request id (x-request-id / x-inference-id / completion.id)
  * upstream server (x-served-by) and rate-limit headers
  * token usage (prompt / completion / reasoning / total)

Security: the API key is NEVER printed. Only a non-reversible SHA-256
fingerprint (first 12 hex chars) and its length are shown.
"""

from __future__ import annotations

import hashlib
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from openai import OpenAI

# Load the same backend/.env the FastAPI app uses.
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(ENV_PATH)

BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1/").rstrip("/")
MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"
KEY = os.getenv("NEBIUS_API_KEY")


def fingerprint(secret: str) -> str:
    """Non-reversible id for a credential (safe to log/compare)."""
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()[:12]


if not KEY:
    raise SystemExit("NEBIUS_API_KEY is missing (checked %s)" % ENV_PATH)

print("=" * 64)
print("Nebius Token Factory - inference evidence capture")
print("=" * 64)
print(f"utc_start        : {datetime.now(timezone.utc).isoformat()}")
print(f"base_url         : {BASE_URL}")
print(f"requested_model  : {MODEL}")
print(f"api_key len      : {len(KEY)}")
print(f"api_key sha256   : {fingerprint(KEY)}  (non-reversible)")
print("-" * 64)

client = OpenAI(base_url=BASE_URL, api_key=KEY, timeout=30, max_retries=0)

try:
    started = datetime.now(timezone.utc)
    # with_raw_response exposes HTTP status + response headers to the caller.
    raw = client.chat.completions.with_raw_response.create(
        model=MODEL,
        messages=[{"role": "user", "content": "Reply with the single word: pong"}],
        max_tokens=16,
        extra_body={"chat_template_kwargs": {"enable_thinking": False}},
    )
    finished = datetime.now(timezone.utc)

    status = raw.status_code
    headers = raw.headers
    completion = raw.parse()

    usage = completion.usage
    details = getattr(usage, "completion_tokens_details", None) if usage else None
    reasoning = getattr(details, "reasoning_tokens", None) if details else None

    print("SUCCESS: real Nebius inference completed")
    print(f"utc_end          : {finished.isoformat()}")
    print(f"http_status      : {status}")
    print(f"served_model     : {completion.model}")
    print(f"x-request-id     : {headers.get('x-request-id')}")
    print(f"x-inference-id   : {headers.get('x-inference-id')}")
    print(f"completion.id    : {completion.id}")
    print(f"x-served-by      : {headers.get('x-served-by')}")
    print(f"x-ratelimit-limit-tokens     : {headers.get('x-ratelimit-limit-tokens')}")
    print(f"x-ratelimit-remaining-tokens : {headers.get('x-ratelimit-remaining-tokens')}")
    print(f"prompt_tokens    : {usage.prompt_tokens}")
    print(f"completion_tokens: {usage.completion_tokens}")
    print(f"total_tokens     : {usage.total_tokens}")
    print(f"reasoning_tokens : {reasoning}")
    print(f"reply            : {completion.choices[0].message.content!r}")
    print("-" * 64)
    print("EVIDENCE OK: request id + status + usage captured (key not exposed).")

except Exception as e:  # noqa: BLE001
    print("FAILED:", type(e).__name__)
    print("Details:", str(e))
