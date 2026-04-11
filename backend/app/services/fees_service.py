import razorpay
import os
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any

from app.models.administration import StudentFeeInvoice, FeePayment

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_dummykey_acadmix")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "dummysecret_acadmixtesting")

class FeesService:
    def __init__(self, db: AsyncSession):
        self.db = db
        # Initialize Razorpay Client
        self.rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

    async def get_student_due_fees(self, student_id: str, college_id: str) -> List[Dict[str, Any]]:
        # 1. Fetch all invoices for student
        invoices_query = await self.db.execute(
            select(StudentFeeInvoice).where(
                StudentFeeInvoice.student_id == student_id,
                StudentFeeInvoice.college_id == college_id,
                StudentFeeInvoice.is_deleted == False
            )
        )
        invoices = invoices_query.scalars().all()
        
        # 2. Fetch successful or pending payments
        payments_query = await self.db.execute(
            select(FeePayment).where(
                FeePayment.student_id == student_id,
                FeePayment.college_id == college_id,
                FeePayment.is_deleted == False
            )
        )
        payments = payments_query.scalars().all()

        due_list = []
        for inv in invoices:
            # calculate paid amount
            paid = sum(p.amount_paid for p in payments if p.invoice_id == inv.id and p.status == "success")
            has_pending = any(p for p in payments if p.invoice_id == inv.id and p.status == "pending")
            
            amount_remaining = inv.total_amount - paid
            if amount_remaining > 0:
                due_list.append({
                    "invoice_id": inv.id,
                    "fee_type": inv.fee_type,
                    "total_amount": inv.total_amount,
                    "amount_paid": paid,
                    "amount_due": amount_remaining,
                    "academic_year": inv.academic_year,
                    "due_date": inv.due_date.isoformat() if inv.due_date else None,
                    "status": "pending_gateway" if has_pending else "unpaid",
                    "description": inv.description
                })
        return due_list

    async def create_razorpay_order(self, student_id: str, college_id: str, invoice_id: str, amount_to_pay: float) -> Dict[str, Any]:
        """Creates an order in Razorpay and logs a pending payment."""
        # Convert INR to paise for Razorpay API
        amount_in_paise = int(amount_to_pay * 100)
        
        order_data = {
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": f"receipt_{invoice_id[:8]}"
        }
        
        rzp_order = await run_in_threadpool(self.rzp_client.order.create, data=order_data)

        # Store pending intent
        pending_payment = FeePayment(
            college_id=college_id,
            student_id=student_id,
            invoice_id=invoice_id,
            amount_paid=amount_to_pay,
            status="pending",
            transaction_reference=rzp_order["id"] # storing Razorpay order_id here
        )
        self.db.add(pending_payment)
        await self.db.commit()

        return {
            "order_id": rzp_order["id"],
            "amount": rzp_order["amount"],
            "currency": rzp_order["currency"],
            "key_id": RAZORPAY_KEY_ID
        }

    async def verify_payment_signature(self, student_id: str, college_id: str, payload: dict) -> bool:
        """Verifies HMAC signature securely on the backend."""
        try:
            # required payload format from razorpay web hook / frontend checkout handler
            await run_in_threadpool(
                self.rzp_client.utility.verify_payment_signature,
                {
                    'razorpay_order_id': payload.get('razorpay_order_id'),
                    'razorpay_payment_id': payload.get('razorpay_payment_id'),
                    'razorpay_signature': payload.get('razorpay_signature')
                }
            )
            
            # Signature valid, fetch the pending order based on order_id
            order_id = payload.get('razorpay_order_id')
            query = await self.db.execute(
                select(FeePayment).where(
                    FeePayment.transaction_reference == order_id,
                    FeePayment.status == "pending"
                )
            )
            payment = query.scalars().first()
            if payment:
                payment.status = "success"
                payment.transaction_reference = f"{order_id}::{payload.get('razorpay_payment_id')}"
                await self.db.commit()
                return True
                
        except razorpay.errors.SignatureVerificationError:
            print("Razorpay Signature Verification Failed")
            return False
            
        return False

    async def create_invoice_bulk(self, college_id: str, invoices_data: List[dict]):
        created = 0
        for data in invoices_data:
            inv = StudentFeeInvoice(
                college_id=college_id,
                student_id=data["student_id"],
                fee_type=data["fee_type"],
                total_amount=data["total_amount"],
                academic_year=data["academic_year"],
                due_date=data.get("due_date"),
                description=data.get("description")
            )
            self.db.add(inv)
            created += 1
        await self.db.commit()
        return created

    async def get_payment_history(self, student_id: str, college_id: str) -> List[Dict[str, Any]]:
        """Returns all payments (successful + pending) for a student, most recent first."""
        payments_query = await self.db.execute(
            select(FeePayment).where(
                FeePayment.student_id == student_id,
                FeePayment.college_id == college_id,
                FeePayment.is_deleted == False
            ).order_by(FeePayment.created_at.desc())
        )
        payments = payments_query.scalars().all()

        # Build invoice lookup for fee_type
        invoice_ids = list(set(p.invoice_id for p in payments if p.invoice_id))
        invoices_map = {}
        if invoice_ids:
            inv_query = await self.db.execute(
                select(StudentFeeInvoice).where(StudentFeeInvoice.id.in_(invoice_ids))
            )
            for inv in inv_query.scalars().all():
                invoices_map[inv.id] = inv

        history = []
        for p in payments:
            inv = invoices_map.get(p.invoice_id)
            history.append({
                "payment_id": str(p.id),
                "invoice_id": str(p.invoice_id) if p.invoice_id else None,
                "fee_type": inv.fee_type if inv else "Fee Payment",
                "academic_year": inv.academic_year if inv else "",
                "amount": p.amount_paid,
                "status": p.status,
                "transaction_ref": p.transaction_reference or "",
                "paid_at": p.created_at.isoformat() if p.created_at else None,
            })
        return history

