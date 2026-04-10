from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
import hmac
import hashlib
import os

router = APIRouter()

WHATSAPP_SECRET = os.environ.get("WHATSAPP_APP_SECRET", "dummy_secret_for_interview")

def verify_whatsapp_signature(payload: bytes, signature: str) -> bool:
    if not signature or not signature.startswith('sha256='):
        return False
    
    hash_value = signature.split('sha256=')[1]
    expected_hash = hmac.new(
        key=WHATSAPP_SECRET.encode('utf-8'),
        msg=payload,
        digestmod=hashlib.sha256
    ).hexdigest()
    
    # hmac.compare_digest prevents timing attacks
    return hmac.compare_digest(hash_value, expected_hash)

@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook receiver for WhatsApp Meta API delivery receipts and incoming messages.
    """
    signature = request.headers.get("X-Hub-Signature-256")
    body_bytes = await request.body()
    
    if not verify_whatsapp_signature(body_bytes, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Queue parsing logic for async processing to unblock the Meta API quickly (timeout max: 15s)
    try:
        payload = await request.json()
        background_tasks.add_task(process_whatsapp_event, payload)
    except Exception:
        pass
    
    return {"status": "ok"}

@router.get("/whatsapp")
async def whatsapp_verify(request: Request):
    """
    Meta API Webhook verification challenge
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    if mode == "subscribe" and token == "acadmix_interview_token":
        return int(challenge)
    raise HTTPException(status_code=403, detail="Forbidden")


def process_whatsapp_event(payload: dict):
    # Log delivery receipt metrics or update StatusDB
    pass
