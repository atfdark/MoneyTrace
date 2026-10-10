import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.scenario import ScenarioRun, ScenarioStatus
from app.models.user import User
from app.core.security import create_access_token


from app.database import async_session

@pytest.fixture
async def auth_token():
    async with async_session() as session:
        res = await session.execute(select(User).limit(1))
        user = res.scalars().first()
        assert user is not None
        return create_access_token(user.id)


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://testserver")


@pytest.mark.asyncio
async def test_scenario_flow(client: AsyncClient, auth_token: str):
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # 1. List scenarios
    res = await client.get("/api/v1/scenarios/types", headers=headers)
    assert res.status_code == 200
    types = res.json()
    assert len(types) > 0
    
    # 2. Start a scenario
    start_req = {"scenario_type": "mule_chain"}
    res = await client.post("/api/v1/scenarios/start", json=start_req, headers=headers)
    assert res.status_code == 200
    run = res.json()
    assert run["scenario_type"] == "mule_chain"
    assert run["status"] == ScenarioStatus.RUNNING.value
    scenario_id = run["scenario_id"]
    
    # 3. Step scenario
    res = await client.post(f"/api/v1/scenarios/{scenario_id}/command", json={"command": "step"}, headers=headers)
    assert res.status_code == 200
    run = res.json()
    assert run["current_step"] == 1
    
    # 4. Pause scenario
    res = await client.post(f"/api/v1/scenarios/{scenario_id}/command", json={"command": "pause"}, headers=headers)
    assert res.status_code == 200
    run = res.json()
    assert run["status"] == ScenarioStatus.PAUSED.value
    
    # 5. Resume scenario
    res = await client.post(f"/api/v1/scenarios/{scenario_id}/command", json={"command": "resume"}, headers=headers)
    assert res.status_code == 200
    run = res.json()
    assert run["status"] == ScenarioStatus.RUNNING.value
    
    # 6. Stop scenario
    res = await client.post(f"/api/v1/scenarios/{scenario_id}/command", json={"command": "stop"}, headers=headers)
    assert res.status_code == 200
    run = res.json()
    assert run["status"] == ScenarioStatus.STOPPED.value
    
    # 7. Reset scenarios
    res = await client.post("/api/v1/scenarios/reset", headers=headers)
    assert res.status_code == 200
