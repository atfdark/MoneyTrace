from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from app.database import get_session
from app.core.deps import get_current_active_user
from app.models.user import User, UserRole
from app.models.scenario import ScenarioStatus, ScenarioRun
from app.schemas.scenario import ScenarioTypeResponse, ScenarioRunResponse, ScenarioStartRequest, ScenarioCommandRequest
from app.services.scenario_service import ScenarioService
from app.models.audit_log import AuditLog, AuditAction
from datetime import datetime, timezone
import uuid

router = APIRouter()

async def log_scenario_audit(session: AsyncSession, user: User, action: AuditAction, scenario_id: str, details: dict):
    log = AuditLog(
        id=uuid.uuid4(),
        user_id=user.id,
        user_name=user.full_name,
        user_email=user.email,
        user_role=user.role,
        action=action.value,
        target_type="SCENARIO",
        target_id=scenario_id,
        details=details,
        timestamp=datetime.now(timezone.utc)
    )
    session.add(log)
    await session.commit()

@router.get("/types", response_model=List[ScenarioTypeResponse])
async def list_scenario_types(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """List all available scenario types."""
    svc = ScenarioService(session)
    return svc.get_available_scenarios()

@router.get("/run/{scenario_id}", response_model=ScenarioRunResponse)
async def get_scenario_run(
    scenario_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get the status of a specific scenario run."""
    svc = ScenarioService(session)
    run = await svc.get_run(scenario_id)
    if not run:
        raise HTTPException(status_code=404, detail="Scenario run not found")
    return run

@router.post("/start", response_model=ScenarioRunResponse)
async def start_scenario(
    req: ScenarioStartRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Start a new scenario run."""
    if current_user.role not in [UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]:
        raise HTTPException(status_code=403, detail="Not authorized to start scenarios")
        
    svc = ScenarioService(session)
    try:
        run = await svc.start_scenario(req.scenario_type)
        await log_scenario_audit(session, current_user, AuditAction.SCENARIO_STARTED, run.scenario_id, {"type": req.scenario_type})
        return run
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{scenario_id}/command", response_model=ScenarioRunResponse)
async def command_scenario(
    scenario_id: str,
    req: ScenarioCommandRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Send a command (pause, resume, step, stop) to a scenario run."""
    if current_user.role not in [UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    svc = ScenarioService(session)
    run = await svc.get_run(scenario_id)
    if not run:
        raise HTTPException(status_code=404, detail="Scenario not found")
        
    if req.command == "pause":
        if run.status != ScenarioStatus.RUNNING.value:
            raise HTTPException(status_code=400, detail="Cannot pause a non-running scenario")
        await svc.update_status(scenario_id, ScenarioStatus.PAUSED.value)
        await log_scenario_audit(session, current_user, AuditAction.SCENARIO_PAUSED, scenario_id, {})
        
    elif req.command == "resume":
        if run.status != ScenarioStatus.PAUSED.value:
            raise HTTPException(status_code=400, detail="Cannot resume a non-paused scenario")
        await svc.update_status(scenario_id, ScenarioStatus.RUNNING.value)
        await log_scenario_audit(session, current_user, AuditAction.SCENARIO_RESUMED, scenario_id, {})
        
    elif req.command == "step":
        if run.status not in [ScenarioStatus.RUNNING.value, ScenarioStatus.PAUSED.value]:
            raise HTTPException(status_code=400, detail="Cannot step from current status")
        try:
            completed = await svc.step_scenario(scenario_id)
            await log_scenario_audit(session, current_user, AuditAction.SCENARIO_STEPPED, scenario_id, {"completed": completed})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Step failed: {str(e)}")
            
    elif req.command == "stop":
        if run.status in [ScenarioStatus.COMPLETED.value, ScenarioStatus.FAILED.value]:
            raise HTTPException(status_code=400, detail="Scenario already finished")
        await svc.update_status(scenario_id, ScenarioStatus.STOPPED.value)
        await log_scenario_audit(session, current_user, AuditAction.SCENARIO_STOPPED, scenario_id, {})
        
    else:
        raise HTTPException(status_code=400, detail="Invalid command")
        
    return await svc.get_run(scenario_id)

@router.post("/reset")
async def reset_scenarios(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Reset all scenarios. In a real system, this stops all active runs but keeps history."""
    if current_user.role not in [UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    from sqlalchemy import update
    stmt = update(ScenarioRun).where(
        ScenarioRun.status.in_([ScenarioStatus.RUNNING.value, ScenarioStatus.PAUSED.value])
    ).values(status=ScenarioStatus.STOPPED.value)
    
    await session.execute(stmt)
    await session.commit()
    
    await log_scenario_audit(session, current_user, AuditAction.SCENARIO_RESET, "ALL", {})
    return {"message": "Active scenarios stopped. Controller reset."}
