
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

key = os.getenv("NEBIUS_API_KEY")
if not key:
    raise SystemExit("NEBIUS_API_KEY is missing")

client = OpenAI(
    base_url="https://api.tokenfactory.nebius.com/v1/",
    api_key=key,
    timeout=30,
    max_retries=0,
)

try:
    response = client.chat.completions.create(
        model="nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
        messages=[
            {"role": "user", "content": "Say hello from Sage!"}
        ],
        max_tokens=100,
        extra_body={
            "chat_template_kwargs": {"enable_thinking": False}
        },
    )

    print("SUCCESS: Real Nebius inference completed")
    print("Model:", response.model)
    print("Response:", response.choices[0].message.content)
    print("Usage:", response.usage)

except Exception as e:
    print("FAILED:", type(e).__name__)
    print("Details:", str(e))
