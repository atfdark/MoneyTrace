import asyncio
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Transaction, Account, User

async def test_db():
    db_path = os.path.abspath("moneytrace_test.db").replace("\\", "/")
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Create a dummy user and account
        user = User(email="test@test.com", password_hash="pw", full_name="Test User", role="user")
        session.add(user)
        await session.commit()
        
        acc1 = Account(user_id=user.id, account_number="ACC_TEST_1", balance=100.0)
        acc2 = Account(user_id=user.id, account_number="ACC_TEST_2", balance=100.0)
        session.add_all([acc1, acc2])
        await session.commit()
        
        # Create a transaction WITHOUT specifying is_simulation
        txn = Transaction(
            transaction_id="TXN_TEST_001",
            sender_account_id=acc1.id,
            receiver_account_id=acc2.id,
            amount=50.0,
            status="completed"
        )
        session.add(txn)
        await session.commit()
        
        # Query it back
        stmt = select(Transaction).where(Transaction.transaction_id == "TXN_TEST_001")
        res = await session.execute(stmt)
        saved_txn = res.scalar_one()
        
        print(f"saved_txn.is_simulation = {saved_txn.is_simulation}")
        print(f"type(saved_txn.is_simulation) = {type(saved_txn.is_simulation)}")
        
        # Now query with SQLAlchemy boolean filter
        stmt2 = select(Transaction).where(Transaction.is_simulation == False)
        res2 = await session.execute(stmt2)
        found = res2.scalars().all()
        print(f"Found {len(found)} transactions where is_simulation == False")

if __name__ == "__main__":
    asyncio.run(test_db())
