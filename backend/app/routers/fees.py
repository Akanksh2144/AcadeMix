from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from database import get_db
from app.core.security import require_role
from app.services.fees_service import FeesService
from pydantic import BaseModel

router = APIRouter()

def get_fees_service(session: AsyncSession = Depends(get_db)):
    return FeesService(session)

# ─── STUDENT ROUTES ──────────────────────────────────────────────────────────

@router.get("/fees/due")
async def get_my_due_fees(
    user: dict = Depends(require_role("student", "parent")),
    svc: FeesService = Depends(get_fees_service)
):
    # Parents typically view fees too. Assume child_id logic could be wrapped here, defaulting to user id.
    # We will assume a simple user["id"] check for the student.
    student_id = user["id"]
    return {"data": await svc.get_student_due_fees(student_id, user["college_id"])}


class CreateOrderPayload(BaseModel):
    invoice_id: str
    amount_to_pay: float

@router.post("/fees/create-order")
async def create_fee_order(
    payload: CreateOrderPayload,
    user: dict = Depends(require_role("student", "parent")),
    svc: FeesService = Depends(get_fees_service)
):
    try:
        # Prevent zero or negative payments
        if payload.amount_to_pay <= 0:
            raise ValueError("Amount must be greater than zero")
            
        data = await svc.create_razorpay_order(
            student_id=user["id"], 
            college_id=user["college_id"],
            invoice_id=payload.invoice_id,
            amount_to_pay=payload.amount_to_pay
        )
        return {"success": True, "order": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class VerifyPaymentPayload(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/fees/verify-payment")
async def verify_fee_payment(
    payload: VerifyPaymentPayload,
    user: dict = Depends(require_role("student", "parent")),
    svc: FeesService = Depends(get_fees_service)
):
    is_valid = await svc.verify_payment_signature(
        student_id=user["id"],
        college_id=user["college_id"],
        payload=payload.model_dump()
    )
    if is_valid:
        return {"success": True, "message": "Payment verified successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

# ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

class BulkInvoicePayload(BaseModel):
    invoices: List[dict] # list of { student_id, fee_type, total_amount, academic_year, due_date (optional), description (optional) }

@router.post("/admin/fees/invoices/bulk")
async def create_bulk_invoices(
    payload: BulkInvoicePayload,
    user: dict = Depends(require_role("admin", "principal")),
    svc: FeesService = Depends(get_fees_service)
):
    created = await svc.create_invoice_bulk(user["college_id"], payload.invoices)
    return {"success": True, "created": created}
