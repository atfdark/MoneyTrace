import os
import sys
import time
import subprocess
import asyncio
import requests
import websockets
import json

# Setup
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{os.path.abspath('moneytrace_test.db')}"
PORT = 8001
API_URL = f"http://localhost:{PORT}/api/v1"
WS_URL = f"ws://localhost:{PORT}/api/v1/ws/live"

async def test_e2e():
    print("Starting FastAPI server...")
    server = subprocess.Popen(
        ["uvicorn", "app.main:app", "--port", str(PORT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=os.environ.copy()
    )
    
    # Wait for server to start
    time.sleep(3)
    
    try:
        # Register test user
        print("Registering test user...")
        reg_res = requests.post(f"{API_URL}/auth/register", json={
            "full_name": "Admin Test",
            "email": "admin@test.com",
            "password": "Password123"
        }, timeout=5.0)
        assert reg_res.status_code == 201, reg_res.text
        token = reg_res.json()["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Upgrade role to admin via sqlite
        import sqlite3
        con = sqlite3.connect("moneytrace_test.db")
        con.execute("UPDATE users SET role='admin' WHERE email='admin@test.com'")
        con.commit()
        con.close()
        
        ws_events = []
        
        async def listen_ws():
            async with websockets.connect(WS_URL) as ws:
                while True:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                        if msg != "pong":
                            data = json.loads(msg)
                            ws_events.append(data)
                    except asyncio.TimeoutError:
                        break
        
        print("Starting WebSocket listener...")
        ws_task = asyncio.create_task(listen_ws())
        time.sleep(1) # wait for ws connection
        
        # Start scenario
        print("Starting scenario 'mule_chain'...")
        start_res = requests.post(f"{API_URL}/scenarios/start", json={"scenario_type": "mule_chain"}, headers=headers)
        assert start_res.status_code == 200, start_res.text
        scenario = start_res.json()
        scenario_id = scenario["scenario_id"]
        print(f"Scenario ID: {scenario_id}")
        
        # Step through scenario
        for i in range(scenario["total_steps"]):
            print(f"Executing step {i+1}...")
            step_res = requests.post(f"{API_URL}/scenarios/{scenario_id}/command", json={"command": "step"}, headers=headers)
            assert step_res.status_code == 200, step_res.text
        
        # Wait for WS events to settle
        print("Waiting for WS events...")
        await asyncio.sleep(2)
        
        print(f"Received {len(ws_events)} WS events.")
        
        tx_events = [e for e in ws_events if e["type"] == "TRANSACTION_CREATED"]
        alert_events = [e for e in ws_events if e["type"] == "FRAUD_ALERT_CREATED"]
        
        print(f"Tx events: {len(tx_events)}, Alert events: {len(alert_events)}")
        
        assert len(tx_events) == scenario["total_steps"], "Expected one WS tx event per step"
        for tx in tx_events:
            assert tx["payload"]["is_simulation"] is True, "Tx missing is_simulation=True"
            assert tx["payload"]["scenario_id"] == scenario_id, "Tx missing scenario_id"
            
        if len(alert_events) > 0:
            print(f"Fraud rule triggered! Alert type: {alert_events[0]['payload']['alert_type']}")
        else:
            print("No fraud alerts triggered by this scenario (which might be expected depending on the engine).")
        
        print("End to End Test Passed Successfully!")
        
    except Exception as e:
        print(f"Exception: {e}")
        server.terminate()
        out, err = server.communicate()
        print("Server stdout:", out.decode('utf-8', errors='ignore'))
        print("Server stderr:", err.decode('utf-8', errors='ignore'))
        raise
        
    finally:
        server.terminate()
        server.wait()

if __name__ == "__main__":
    asyncio.run(test_e2e())
