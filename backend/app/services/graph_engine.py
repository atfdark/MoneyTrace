"""Graph Engine Service — Phase 6 Money Flow Graph Analysis using NetworkX."""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID

import networkx as nx
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import exceptions
from app.models.account import Account
from app.models.transaction import Transaction, TransactionStatus
from app.schemas.graph import (
    GraphEdge,
    GraphNode,
    MoneyTraceHop,
    MoneyTraceResponse,
    NetworkGraphResponse,
    SuspiciousNetworkResponse,
)


class GraphEngine:
    """Graph Engine powered by NetworkX for money flow tracing and network analysis."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def build_networkx_graph(
        self, limit: int = 2000
    ) -> Tuple[nx.MultiDiGraph, Dict[str, Account], Dict[str, Transaction]]:
        """
        Construct a NetworkX MultiDiGraph from database accounts and completed transactions.

        Nodes = Accounts
        Edges = Transactions
        """
        # Fetch accounts with user relationship
        acc_stmt = select(Account).options(selectinload(Account.user))
        acc_res = await self.session.execute(acc_stmt)
        accounts_list = acc_res.scalars().all()
        accounts_map: Dict[str, Account] = {a.account_number: a for a in accounts_list}

        # Fetch completed transactions
        txn_stmt = (
            select(Transaction)
            .where(Transaction.status == TransactionStatus.COMPLETED.value)
            .order_by(Transaction.timestamp.desc())
            .limit(limit)
            .options(
                selectinload(Transaction.sender_account).selectinload(Account.user),
                selectinload(Transaction.receiver_account).selectinload(Account.user),
            )
        )
        txn_res = await self.session.execute(txn_stmt)
        transactions_list = txn_res.scalars().all()
        transactions_map: Dict[str, Transaction] = {t.transaction_id: t for t in transactions_list}

        G = nx.MultiDiGraph()

        # Add account nodes
        for acc in accounts_list:
            user_name = acc.user.full_name if acc.user else "Unknown"
            user_email = acc.user.email if acc.user else None
            G.add_node(
                acc.account_number,
                account_id=str(acc.id),
                account_number=acc.account_number,
                user_name=user_name,
                user_email=user_email,
                balance=float(acc.balance),
                status=acc.status,
                created_at=acc.created_at,
            )

        # Add transaction edges
        for t in transactions_list:
            sender_acc = t.sender_account.account_number if t.sender_account else None
            receiver_acc = t.receiver_account.account_number if t.receiver_account else None

            if sender_acc and receiver_acc:
                # Ensure nodes exist in case of unmapped accounts
                if not G.has_node(sender_acc):
                    G.add_node(sender_acc, account_number=sender_acc, balance=0.0, status="active")
                if not G.has_node(receiver_acc):
                    G.add_node(receiver_acc, account_number=receiver_acc, balance=0.0, status="active")

                G.add_edge(
                    sender_acc,
                    receiver_acc,
                    key=t.transaction_id,
                    transaction_id=t.transaction_id,
                    amount=float(t.amount),
                    timestamp=t.timestamp,
                    risk_score=t.risk_score or 0.0,
                    is_flagged=t.is_flagged,
                    remark=t.remark,
                )

        return G, accounts_map, transactions_map

    async def trace_money_flow(
        self, identifier: str, max_hops: int = 10
    ) -> MoneyTraceResponse:
        """
        Trace money flow path downstream starting from a transaction_id or account_number.

        Returns MoneyTraceResponse:
        {
            "source_account": "ACC1001",
            "money_path": ["ACC1002", "ACC1003", "ACC1004"],
            "current_holder": "ACC1004",
            "total_hops": 3,
            "initial_amount": 100000.0,
            "remaining_amount": 95000.0,
            "hops": [...]
        }
        """
        # 1. Determine starting transaction or initial account
        start_txn: Optional[Transaction] = None

        # Check if identifier matches a transaction
        is_uuid = False
        try:
            UUID(identifier)
            is_uuid = True
        except ValueError:
            pass

        if is_uuid or identifier.startswith("TXN"):
            txn_stmt = (
                select(Transaction)
                .where(or_(Transaction.transaction_id == identifier, Transaction.id == (UUID(identifier) if is_uuid else None)))
                .options(
                    selectinload(Transaction.sender_account),
                    selectinload(Transaction.receiver_account),
                )
            )
            txn_res = await self.session.execute(txn_stmt)
            start_txn = txn_res.scalar_one_or_none()

        if start_txn is None and not identifier.startswith("ACC"):
            raise exceptions.NotFoundError(f"Transaction or account '{identifier}' not found")

        # Build full network graph for hop navigation
        G, accounts_map, transactions_map = await self.build_networkx_graph(limit=3000)

        hops: List[MoneyTraceHop] = []
        visited_nodes: List[str] = []

        if start_txn:
            source_acc_num = start_txn.sender_account.account_number if start_txn.sender_account else "UNKNOWN"
            first_recipient = start_txn.receiver_account.account_number if start_txn.receiver_account else "UNKNOWN"
            initial_amount = float(start_txn.amount)

            visited_nodes.append(first_recipient)

            hop_1 = MoneyTraceHop(
                hop_number=1,
                from_account=source_acc_num,
                to_account=first_recipient,
                transaction_id=start_txn.transaction_id,
                amount=initial_amount,
                timestamp=start_txn.timestamp,
                delay_seconds=0.0,
                risk_score=start_txn.risk_score or 0.0,
            )
            hops.append(hop_1)

            current_account = first_recipient
            current_timestamp = start_txn.timestamp
            current_amount = initial_amount
        else:
            # Identifier is an account_number
            source_acc_num = identifier
            current_account = identifier
            initial_amount = 0.0
            current_timestamp = datetime.min.replace(tzinfo=timezone.utc)
            current_amount = 0.0

        def _dt_val(dt):
            if dt is None:
                return datetime.min
            if isinstance(dt, str):
                try:
                    dt = datetime.fromisoformat(dt)
                except Exception:
                    return datetime.min
            if hasattr(dt, "tzinfo") and dt.tzinfo is not None:
                return dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt

        # Multi-hop forward tracking loop
        for hop_idx in range(len(hops) + 1, max_hops + 1):
            if not G.has_node(current_account):
                break

            # Find downstream outbound edges from current_account after current_timestamp
            out_edges = list(G.out_edges(current_account, data=True, keys=True))
            if not out_edges:
                break

            # Filter edges occurring after current_timestamp
            valid_next_hops = []
            for u, v, k, data in out_edges:
                e_time = data.get("timestamp")
                if e_time and _dt_val(e_time) >= _dt_val(current_timestamp) and v not in visited_nodes and v != source_acc_num:
                    valid_next_hops.append((u, v, k, data))

            if not valid_next_hops:
                break

            # Sort by timestamp ascending (earliest next transfer)
            valid_next_hops.sort(key=lambda x: _dt_val(x[3].get("timestamp")))
            next_u, next_v, next_k, next_data = valid_next_hops[0]

            # Calculate delay in seconds between hops
            delay = (_dt_val(next_data["timestamp"]) - _dt_val(current_timestamp)).total_seconds() if _dt_val(current_timestamp) != datetime.min else 0.0

            if initial_amount == 0.0:
                initial_amount = next_data["amount"]

            new_hop = MoneyTraceHop(
                hop_number=len(hops) + 1,
                from_account=next_u,
                to_account=next_v,
                transaction_id=next_data["transaction_id"],
                amount=next_data["amount"],
                timestamp=next_data["timestamp"],
                delay_seconds=max(delay, 0.0),
                risk_score=next_data.get("risk_score", 0.0),
            )
            hops.append(new_hop)
            visited_nodes.append(next_v)

            current_account = next_v
            current_timestamp = next_data["timestamp"]
            current_amount = next_data["amount"]

        current_holder = visited_nodes[-1] if visited_nodes else source_acc_num

        return MoneyTraceResponse(
            source_account=source_acc_num,
            money_path=visited_nodes,
            current_holder=current_holder,
            total_hops=len(hops),
            initial_amount=initial_amount,
            remaining_amount=current_amount if hops else initial_amount,
            hops=hops,
        )

    async def get_network_graph(self, limit: int = 1000) -> NetworkGraphResponse:
        """Get nodes and edges for full graph visualization."""
        G, accounts_map, transactions_map = await self.build_networkx_graph(limit=limit)

        nodes: List[GraphNode] = []
        for n, attrs in G.nodes(data=True):
            max_risk = 0.0
            is_flagged = False

            # Calculate max risk score of transactions involving this node
            for u, v, data in G.edges(n, data=True):
                if data.get("risk_score", 0.0) > max_risk:
                    max_risk = data["risk_score"]
                if data.get("is_flagged"):
                    is_flagged = True

            in_deg = G.in_degree(n)
            out_deg = G.out_degree(n)
            is_mule = (in_deg >= 1 and out_deg >= 1)

            nodes.append(
                GraphNode(
                    id=n,
                    label=n,
                    user_name=attrs.get("user_name"),
                    user_email=attrs.get("user_email"),
                    balance=attrs.get("balance", 0.0),
                    status=attrs.get("status", "active"),
                    risk_score=max_risk,
                    is_flagged=is_flagged,
                    is_mule=is_mule,
                )
            )

        edges: List[GraphEdge] = []
        for u, v, k, data in G.edges(data=True, keys=True):
            edges.append(
                GraphEdge(
                    id=data.get("transaction_id", k),
                    source=u,
                    target=v,
                    amount=data.get("amount", 0.0),
                    timestamp=data.get("timestamp", datetime.now(timezone.utc)),
                    risk_score=data.get("risk_score", 0.0),
                    is_flagged=data.get("is_flagged", False),
                )
            )

        return NetworkGraphResponse(
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=len(edges),
        )

    async def get_account_subgraph(
        self, account_number: str, radius: int = 2
    ) -> NetworkGraphResponse:
        """Get N-hop neighborhood subgraph around a specific account."""
        G, accounts_map, transactions_map = await self.build_networkx_graph()

        if not G.has_node(account_number):
            raise exceptions.NotFoundError(f"Account '{account_number}' not found in network graph")

        # Convert to undirected graph for radius neighborhood extraction
        G_undirected = G.to_undirected()
        subgraph_nodes = set(
            nx.single_source_shortest_path_length(G_undirected, account_number, cutoff=radius).keys()
        )

        sub_G = G.subgraph(subgraph_nodes)

        nodes: List[GraphNode] = []
        for n in sub_G.nodes():
            attrs = G.nodes[n]
            in_deg = G.in_degree(n)
            out_deg = G.out_degree(n)
            is_mule = (in_deg >= 1 and out_deg >= 1)

            nodes.append(
                GraphNode(
                    id=n,
                    label=n,
                    user_name=attrs.get("user_name"),
                    user_email=attrs.get("user_email"),
                    balance=attrs.get("balance", 0.0),
                    status=attrs.get("status", "active"),
                    risk_score=0.0,
                    is_mule=is_mule,
                )
            )

        edges: List[GraphEdge] = []
        for u, v, k, data in sub_G.edges(data=True, keys=True):
            edges.append(
                GraphEdge(
                    id=data.get("transaction_id", k),
                    source=u,
                    target=v,
                    amount=data.get("amount", 0.0),
                    timestamp=data.get("timestamp", datetime.now(timezone.utc)),
                    risk_score=data.get("risk_score", 0.0),
                    is_flagged=data.get("is_flagged", False),
                )
            )

        return NetworkGraphResponse(
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=len(edges),
        )

    async def detect_suspicious_patterns(self) -> SuspiciousNetworkResponse:
        """
        Detect graph-level fraud patterns:
        1. Circular Money Laundering Chains (cycles)
        2. Mule Accounts (Rapid pass-through: Inbound & Outbound transfers)
        3. Collector Accounts (High Fan-in hubs)
        """
        G, accounts_map, transactions_map = await self.build_networkx_graph()

        # 1. Circular Chains (Cycles)
        simple_digraph = nx.DiGraph(G)
        valid_cycles = []
        try:
            for cycle in nx.simple_cycles(simple_digraph, length_bound=6):
                if 2 <= len(cycle) <= 6:
                    cycle_set = set(cycle)
                    # Ensure distinct cycle (not just rotated permutation)
                    if not any(set(vc[:-1]) == cycle_set for vc in valid_cycles):
                        valid_cycles.append(cycle + [cycle[0]])
                if len(valid_cycles) >= 5:
                    break
        except Exception:
            for cycle in nx.simple_cycles(simple_digraph):
                if 2 <= len(cycle) <= 6:
                    cycle_set = set(cycle)
                    if not any(set(vc[:-1]) == cycle_set for vc in valid_cycles):
                        valid_cycles.append(cycle + [cycle[0]])
                if len(valid_cycles) >= 5:
                    break

        mule_accounts: List[GraphNode] = []
        collector_accounts: List[GraphNode] = []

        for n in G.nodes():
            in_deg = G.in_degree(n)
            out_deg = G.out_degree(n)
            attrs = G.nodes[n]

            in_amount = sum(d.get("amount", 0.0) for _, _, d in G.in_edges(n, data=True))
            out_amount = sum(d.get("amount", 0.0) for _, _, d in G.out_edges(n, data=True))

            node_obj = GraphNode(
                id=n,
                label=n,
                user_name=attrs.get("user_name"),
                user_email=attrs.get("user_email"),
                balance=attrs.get("balance", 0.0),
                status=attrs.get("status", "active"),
                risk_score=75.0 if (in_deg >= 1 and out_deg >= 1) else 30.0,
                is_mule=True if (in_deg >= 1 and out_deg >= 1) else False,
            )

            # Mule criteria: receives money and forwards > 70% outbound
            if in_deg >= 1 and out_deg >= 1 and in_amount > 0 and (out_amount / in_amount) >= 0.7:
                mule_accounts.append(node_obj)

            # Collector criteria: In degree >= 3 and in_degree > 2 * out_degree
            if in_deg >= 3 and in_deg >= 2 * max(out_deg, 1):
                collector_accounts.append(node_obj)

        return SuspiciousNetworkResponse(
            circular_chains=valid_cycles,
            mule_accounts=mule_accounts,
            collector_accounts=collector_accounts,
            total_suspicious_chains=len(valid_cycles),
        )
