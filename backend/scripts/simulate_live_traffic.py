"""Live Background Traffic Simulator for Demo Presentations."""

import asyncio
import random
import logging
from decimal import Decimal
from datetime import datetime, timezone
import aiohttp

API_BASE = "http://127.0.0.1:8000/api/v1"

USERS = [
    {"name": "Rahul Sharma", "email": "rahul@moneytrace.dev", "acc": "ACC1001"},
    {"name": "Sneha Patel", "email": "sneha@moneytrace.dev", "acc": "ACC1002"},
    {"name": "Aman Verma", "email": "aman@moneytrace.dev", "acc": "ACC1003"},
    {"name": "Priya Nair", "email": "priya@moneytrace.dev", "acc": "ACC1004"},
    {"name": "Karan Malhotra", "email": "karan@moneytrace.dev", "acc": "ACC1005"},
    {"name": "Vikram Singh", "email": "vikram@moneytrace.dev", "acc": "ACC1006"},
    {"name": "Neha Gupta", "email": "neha@moneytrace.dev", "acc": "ACC1007"},
    {"name": "Rohit Joshi", "email": "rohit@moneytrace.dev", "acc": "ACC1008"},
    {"name": "Anita Desai", "email": "anita@moneytrace.dev", "acc": "ACC1009"},
    {"name": "Rajesh Kumar", "email": "rajesh@moneytrace.dev", "acc": "ACC1010"},
]

PRESETS = [
    {"amount": 1500.0, "remark": "Coffee & Lunch settlement", "scenario": "normal"},
    {"amount": 4200.0, "remark": "Grocery store bill", "scenario": "normal"},
    {"amount": 12000.0, "remark": "Freelance design payment", "scenario": "normal"},
    {"amount": 65000.0, "remark": "Urgent crypto offramp transfer", "scenario": "high_risk"},
    {"amount": 85000.0, "remark": "High-velocity layer hop #2", "scenario": "velocity"},
    {"amount": 120000.0, "remark": "Unverified rapid liquidation", "scenario": "drain"},
]


async def run_traffic_simulator(interval_seconds: float = 3.5, total_iterations: int = 50):
    print(f"[*] Starting MoneyTrace Live Traffic Simulation ({total_iterations} events, ~{interval_seconds}s interval)...")

    async with aiohttp.ClientSession() as session:
        # First authenticate as admin to get token
        login_url = f"{API_BASE}/auth/login"
        async with session.post(login_url, json={"email": "admin@moneytrace.dev", "password": "Admin@123456"}) as resp:
            if resp.status != 200:
                print(f"[!] Login failed with status {resp.status}. Ensure backend server is running on port 8000.")
                return
            data = await resp.json()
            token = data["tokens"]["access_token"]

        headers = {"Authorization": f"Bearer {token}"}

        for i in range(1, total_iterations + 1):
            preset = random.choice(PRESETS)
            sender = random.choice(USERS)
            receiver = random.choice([u for u in USERS if u["acc"] != sender["acc"]])

            print(f"[{i}/{total_iterations}] Simulating: {sender['name']} -> {receiver['name']} (₹{preset['amount']:,.2f}) [{preset['scenario']}]")

            sim_url = f"{API_BASE}/simulation/transaction?scenario={preset['scenario']}"
            try:
                async with session.post(sim_url, headers=headers) as resp:
                    if resp.status == 200:
                        res = await resp.json()
                        risk = res.get("risk_score", 0)
                        flag = "🚨 FLAGGED" if res.get("is_flagged") else "✓ NORMAL"
                        print(f"    ↳ Result: TXN {res.get('transaction_id')} | Risk: {risk}% | {flag}")
                    else:
                        print(f"    ↳ Error: HTTP {resp.status}")
            except Exception as e:
                print(f"    ↳ Exception: {e}")

            await asyncio.sleep(interval_seconds)

    print("[*] Traffic simulation run complete.")


if __name__ == "__main__":
    asyncio.run(run_traffic_simulator())
