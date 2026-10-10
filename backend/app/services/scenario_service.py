import asyncio
import uuid
from decimal import Decimal
from typing import List, Dict, Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.account import Account, AccountStatus
from app.models.scenario import ScenarioRun, ScenarioStatus
from app.models.transaction import Transaction
from app.core.security import hash_password
from app.services.transaction import TransactionService


SCENARIO_TYPES = {
    "mule_chain": {
        "id": "mule_chain",
        "name": "Mule-account chain",
        "description": "Simulates money flowing from a victim to a series of mule accounts.",
        "total_steps": 3
    },
    "circular": {
        "id": "circular",
        "name": "Circular transaction flow",
        "description": "Simulates money moving in a loop to obfuscate the source.",
        "total_steps": 4
    },
    "rapid_transfers": {
        "id": "rapid_transfers",
        "name": "Rapid transfers",
        "description": "Simulates immediate withdrawal/transfer of funds upon receipt.",
        "total_steps": 3
    },
    "fan_out": {
        "id": "fan_out",
        "name": "Fan-in/fan-out",
        "description": "Simulates a hub account splitting funds to many smaller accounts.",
        "total_steps": 5
    }
}

class ScenarioService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.transaction_service = TransactionService(session)

    def get_available_scenarios(self) -> List[Dict[str, Any]]:
        return list(SCENARIO_TYPES.values())

    async def _create_sim_user_account(self, name: str, initial_balance: Decimal = Decimal("0.00")) -> tuple[User, Account]:
        # Create a user and account for scenario isolation
        u_id = uuid.uuid4()
        user = User(
            id=u_id,
            email=f"sim_{u_id.hex[:8]}@moneytrace.dev",
            full_name=name,
            password_hash=hash_password("sim_password"),
            is_active=True,
            role="customer"
        )
        self.session.add(user)
        
        acc_number = await self.transaction_service._generate_unique_account_number()
        # Prefix with SIM to make them easily distinguishable
        acc_number = "SIM" + acc_number[3:]
        
        account = Account(
            id=uuid.uuid4(),
            account_number=acc_number,
            user_id=user.id,
            balance=initial_balance,
            status=AccountStatus.ACTIVE.value,
        )
        self.session.add(account)
        await self.session.commit()
        await self.session.refresh(user)
        await self.session.refresh(account)
        return user, account

    async def _setup_scenario_context(self, scenario_type: str) -> Dict[str, Any]:
        """Creates the necessary dummy accounts for a scenario and returns their info."""
        context = {}
        
        if scenario_type == "mule_chain":
            victim_u, victim_a = await self._create_sim_user_account("Sim Victim", Decimal("100000.00"))
            mule1_u, mule1_a = await self._create_sim_user_account("Sim Mule 1")
            mule2_u, mule2_a = await self._create_sim_user_account("Sim Mule 2")
            mule3_u, mule3_a = await self._create_sim_user_account("Sim Mule 3")
            
            context = {
                "nodes": [
                    {"user_id": str(victim_u.id), "acc": victim_a.account_number},
                    {"user_id": str(mule1_u.id), "acc": mule1_a.account_number},
                    {"user_id": str(mule2_u.id), "acc": mule2_a.account_number},
                    {"user_id": str(mule3_u.id), "acc": mule3_a.account_number}
                ],
                "amounts": [50000, 49000, 48000]
            }
        
        elif scenario_type == "circular":
            n1_u, n1_a = await self._create_sim_user_account("Sim Node A", Decimal("50000.00"))
            n2_u, n2_a = await self._create_sim_user_account("Sim Node B")
            n3_u, n3_a = await self._create_sim_user_account("Sim Node C")
            
            context = {
                "nodes": [
                    {"user_id": str(n1_u.id), "acc": n1_a.account_number},
                    {"user_id": str(n2_u.id), "acc": n2_a.account_number},
                    {"user_id": str(n3_u.id), "acc": n3_a.account_number},
                    {"user_id": str(n1_u.id), "acc": n1_a.account_number}  # Circle back
                ],
                "amounts": [10000, 9500, 9000, 8500]
            }
            
        elif scenario_type == "rapid_transfers":
            source_u, source_a = await self._create_sim_user_account("Sim Source", Decimal("200000.00"))
            mid_u, mid_a = await self._create_sim_user_account("Sim Middleman")
            dest1_u, dest1_a = await self._create_sim_user_account("Sim Dest 1")
            dest2_u, dest2_a = await self._create_sim_user_account("Sim Dest 2")
            
            context = {
                "steps": [
                    {"src_idx": 0, "dst_idx": 1, "amt": 100000},
                    {"src_idx": 1, "dst_idx": 2, "amt": 45000},
                    {"src_idx": 1, "dst_idx": 3, "amt": 50000}
                ],
                "nodes": [
                    {"user_id": str(source_u.id), "acc": source_a.account_number},
                    {"user_id": str(mid_u.id), "acc": mid_a.account_number},
                    {"user_id": str(dest1_u.id), "acc": dest1_a.account_number},
                    {"user_id": str(dest2_u.id), "acc": dest2_a.account_number}
                ]
            }
            
        elif scenario_type == "fan_out":
            hub_u, hub_a = await self._create_sim_user_account("Sim Hub", Decimal("500000.00"))
            spokes = []
            for i in range(5):
                u, a = await self._create_sim_user_account(f"Sim Spoke {i+1}")
                spokes.append({"user_id": str(u.id), "acc": a.account_number})
                
            context = {
                "hub": {"user_id": str(hub_u.id), "acc": hub_a.account_number},
                "spokes": spokes,
                "amount": 20000
            }

        return context

    async def start_scenario(self, scenario_type: str) -> ScenarioRun:
        if scenario_type not in SCENARIO_TYPES:
            raise ValueError(f"Unknown scenario type: {scenario_type}")
            
        scenario_id = f"SCEN_{uuid.uuid4().hex[:8].upper()}"
        
        # Ensure no other active run is modifying state (to keep UI simple)
        # But we'll allow multiple distinct scenarios if they want.
        
        # Setup DB run
        run = ScenarioRun(
            scenario_id=scenario_id,
            scenario_type=scenario_type,
            status=ScenarioStatus.RUNNING.value,
            current_step=0,
            total_steps=SCENARIO_TYPES[scenario_type]["total_steps"],
            context_data=await self._setup_scenario_context(scenario_type)
        )
        self.session.add(run)
        await self.session.commit()
        await self.session.refresh(run)
        return run

    async def get_run(self, scenario_id: str) -> Optional[ScenarioRun]:
        res = await self.session.execute(select(ScenarioRun).where(ScenarioRun.scenario_id == scenario_id))
        return res.scalar_one_or_none()

    async def update_status(self, scenario_id: str, status: str):
        run = await self.get_run(scenario_id)
        if run:
            run.status = status
            await self.session.commit()

    async def step_scenario(self, scenario_id: str) -> bool:
        """Executes one step of the scenario. Returns True if completed."""
        run = await self.get_run(scenario_id)
        if not run:
            raise ValueError("Scenario not found")
            
        if run.status in [ScenarioStatus.COMPLETED.value, ScenarioStatus.STOPPED.value, ScenarioStatus.FAILED.value]:
            return False
            
        if run.current_step >= run.total_steps:
            run.status = ScenarioStatus.COMPLETED.value
            await self.session.commit()
            return True
            
        try:
            # Execute step based on type
            ctx = run.context_data
            step = run.current_step
            
            if run.scenario_type == "mule_chain":
                sender = ctx["nodes"][step]
                receiver = ctx["nodes"][step + 1]
                amt = ctx["amounts"][step]
                
                await self.transaction_service.send_money(
                    sender_user_id=uuid.UUID(sender["user_id"]),
                    receiver_account_number=receiver["acc"],
                    amount=Decimal(amt),
                    remark=f"Simulated Transfer {step+1}",
                    is_simulation=True,
                    scenario_id=run.scenario_id
                )
                
            elif run.scenario_type == "circular":
                sender = ctx["nodes"][step]
                receiver = ctx["nodes"][step + 1]
                amt = ctx["amounts"][step]
                
                await self.transaction_service.send_money(
                    sender_user_id=uuid.UUID(sender["user_id"]),
                    receiver_account_number=receiver["acc"],
                    amount=Decimal(amt),
                    remark=f"Simulated Circular Transfer {step+1}",
                    is_simulation=True,
                    scenario_id=run.scenario_id
                )
                
            elif run.scenario_type == "rapid_transfers":
                step_def = ctx["steps"][step]
                sender = ctx["nodes"][step_def["src_idx"]]
                receiver = ctx["nodes"][step_def["dst_idx"]]
                amt = step_def["amt"]
                
                await self.transaction_service.send_money(
                    sender_user_id=uuid.UUID(sender["user_id"]),
                    receiver_account_number=receiver["acc"],
                    amount=Decimal(amt),
                    remark=f"Simulated Rapid Transfer {step+1}",
                    is_simulation=True,
                    scenario_id=run.scenario_id
                )
                
            elif run.scenario_type == "fan_out":
                hub = ctx["hub"]
                spoke = ctx["spokes"][step]
                amt = ctx["amount"]
                
                await self.transaction_service.send_money(
                    sender_user_id=uuid.UUID(hub["user_id"]),
                    receiver_account_number=spoke["acc"],
                    amount=Decimal(amt),
                    remark=f"Simulated Fan-out Transfer {step+1}",
                    is_simulation=True,
                    scenario_id=run.scenario_id
                )
            
            # Update step count
            run.current_step += 1
            if run.current_step >= run.total_steps:
                run.status = ScenarioStatus.COMPLETED.value
            
            await self.session.commit()
            return run.current_step >= run.total_steps
            
        except Exception as e:
            run.status = ScenarioStatus.FAILED.value
            await self.session.commit()
            raise e
