from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from app.models.scenario import ScenarioStatus

class ScenarioTypeResponse(BaseModel):
    id: str
    name: str
    description: str
    total_steps: int

class ScenarioRunResponse(BaseModel):
    scenario_id: str
    scenario_type: str
    status: ScenarioStatus
    current_step: int
    total_steps: int
    context_data: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)

class ScenarioStartRequest(BaseModel):
    scenario_type: str

class ScenarioCommandRequest(BaseModel):
    command: str  # pause, resume, step, stop
