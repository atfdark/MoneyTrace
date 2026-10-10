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
API_URL = f"http://127.0.0.1:{PORT}/api/v1"
WS_URL = f"ws://127.0.0.1:{PORT}/api/v1/ws/live"

async def test_e2e():
    print("Starting FastAPI server...", flush=True)
    server_log = open("e2e_server.log", "w", encoding="utf-8")
    server = subprocess.Popen(
        ["uvicorn", "app.main:app", "--port", str(PORT)],
        stdout=server_log,
        stderr=subprocess.STDOUT,
        env=os.environ.copy()
    )
    
    # Wait for server to start
    for _ in range(30):
        try:
            requests.get(f"http://127.0.0.1:{PORT}/docs", timeout=0.5)
            break
        except Exception:
            time.sleep(0.5)
    
    try:
        # Register test user
        test_email = f"admin_{int(time.time())}@test.com"
        print(f"Registering test user {test_email}...", flush=True)
        reg_res = requests.post(f"{API_URL}/auth/register", json={
            "full_name": "Admin Test",
            "email": test_email,
            "password": "Password123"
        }, timeout=5.0)
        assert reg_res.status_code == 201, reg_res.text
        token = reg_res.json()["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Upgrade role to admin via sqlite
        import sqlite3
        con = sqlite3.connect("moneytrace_test.db")
        con.execute("UPDATE users SET role='admin' WHERE email=?", (test_email,))
        con.commit()
        con.close()
        
        ws_events = []
        ws_connected_evt = asyncio.Event()
        
        async def listen_ws():
            try:
                print(f"Connecting to WS: {WS_URL}...", flush=True)
                async with websockets.connect(WS_URL) as ws:
                    print("WS connected successfully!", flush=True)
                    ws_connected_evt.set()
                    while True:
                        try:
                            msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                            if msg != "pong":
                                data = json.loads(msg)
                                print(f"Received WS message: {data.get('type')}", flush=True)
                                ws_events.append(data)
                        except asyncio.TimeoutError:
                            continue
            except Exception as e:
                print(f"WS Exception in listener: {type(e)} {e}", flush=True)
        
        print("Starting WebSocket listener...", flush=True)
        ws_task = asyncio.create_task(listen_ws())
        await asyncio.wait_for(ws_connected_evt.wait(), timeout=5.0)
        
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
            item = tx.get("data") or tx.get("payload")
            assert item["is_simulation"] is True, "Tx missing is_simulation=True"
            assert item["scenario_id"] == scenario_id, "Tx missing scenario_id"
            
        if len(alert_events) > 0:
            item = alert_events[0].get("data") or alert_events[0].get("payload")
            print(f"Fraud rule triggered! Alert type: {item.get('alert_type')}")
        else:
            print("No fraud alerts triggered by this scenario (which might be expected depending on the engine).")
        
        print("End to End Test Passed Successfully!", flush=True)
        ws_task.cancel()
        
    except Exception as e:
        print(f"Exception: {e}", flush=True)
        if 'ws_task' in locals():
            ws_task.cancel()
        server.terminate()
        server_log.close()
        with open("e2e_server.log", "r", encoding="utf-8") as f:
            print("Server log:\n", f.read())
        raise
        
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except Exception:
            server.kill()
        server_log.close()

if __name__ == "__main__":
    asyncio.run(test_e2e())
