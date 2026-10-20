from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user
from backend.app.api.schemas import (
    SupportTicketCreateRequest,
    SupportTicketInboxItem,
    SupportTicketResponse,
    SupportTicketUpdateRequest,
)
from backend.app.core.config import get_settings
from backend.app.core.rate_limit import standard
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import SupportTicket, User

router = APIRouter(prefix="/api/support", tags=["Support"])
settings = get_settings()


def _is_owner(user: User) -> bool:
    allowed = {email.strip().lower() for email in settings.SUPPORT_OWNER_EMAILS.split(",") if email.strip()}
    return bool(allowed and user.email.strip().lower() in allowed)


def _require_owner(user: User) -> None:
    if not _is_owner(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access required")


@router.get("/capabilities")
def support_capabilities(current_user: User = Depends(get_current_user)):
    return {"is_owner": _is_owner(current_user)}


@router.post("/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: SupportTicketCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate: None = Depends(standard),
):
    ticket = SupportTicket(
        user_id=current_user.user_id,
        category=payload.category.strip(),
        subject=payload.subject.strip(),
        message=payload.message.strip(),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/tickets/mine", response_model=list[SupportTicketResponse])
def my_tickets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current_user.user_id)
        .order_by(SupportTicket.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/inbox", response_model=list[SupportTicketInboxItem])
def owner_inbox(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_owner(current_user)
    rows = (
        db.query(SupportTicket, User)
        .join(User, User.user_id == SupportTicket.user_id)
        .order_by(SupportTicket.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        SupportTicketInboxItem(
            **{field: getattr(ticket, field) for field in (
                "ticket_id", "category", "subject", "message", "status", "owner_reply", "created_at", "updated_at"
            )},
            user_id=user.user_id,
            username=user.username,
            email=user.email,
        )
        for ticket, user in rows
    ]


@router.patch("/inbox/{ticket_id}", response_model=SupportTicketInboxItem)
def update_ticket(
    ticket_id: int,
    payload: SupportTicketUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_owner(current_user)
    ticket = db.query(SupportTicket).filter(SupportTicket.ticket_id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support request not found")
    ticket.status = payload.status
    if payload.owner_reply is not None:
        ticket.owner_reply = payload.owner_reply.strip() or None
    db.commit()
    db.refresh(ticket)
    user = db.query(User).filter(User.user_id == ticket.user_id).first()
    return SupportTicketInboxItem(
        ticket_id=ticket.ticket_id,
        category=ticket.category,
        subject=ticket.subject,
        message=ticket.message,
        status=ticket.status,
        owner_reply=ticket.owner_reply,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        user_id=user.user_id,
        username=user.username,
        email=user.email,
    )
