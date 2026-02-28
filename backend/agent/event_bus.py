"""
In-memory pub/sub event bus for the city intelligence agent.
Broadcasts agent activity to SSE subscribers (dashboard).
"""

import asyncio
import time
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class AgentEvent:
    timestamp: float
    agent: str  # "discovery", "regenerator", "evaluator", "system"
    action: str
    poi_name: Optional[str] = None
    details: Optional[dict] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class TourEvent:
    timestamp: float
    event_type: str  # "status", "reasoning", "outline", "segment", "complete"
    data: dict

    def to_dict(self) -> dict:
        return asdict(self)


class EventBus:
    _instance: Optional["EventBus"] = None

    def __init__(self):
        self._subscribers: list[asyncio.Queue] = []
        self._history: list[AgentEvent] = []
        self._max_history = 200
        self._stats = {
            "total_events": 0,
            "discoveries": 0,
            "regenerations": 0,
            "evaluations": 0,
            "cycles_completed": 0,
        }
        self._tour_subscribers: list[asyncio.Queue] = []
        self._tour_history: list[TourEvent] = []

    @classmethod
    def get(cls) -> "EventBus":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def emit(self, agent: str, action: str, poi_name: str = None, details: dict = None):
        event = AgentEvent(
            timestamp=time.time(),
            agent=agent,
            action=action,
            poi_name=poi_name,
            details=details or {},
        )
        self._history.append(event)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]

        self._stats["total_events"] += 1
        if agent == "discovery":
            self._stats["discoveries"] += 1
        elif agent == "regenerator":
            self._stats["regenerations"] += 1
        elif agent == "evaluator":
            self._stats["evaluations"] += 1
        if action == "cycle_complete":
            self._stats["cycles_completed"] += 1

        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue[AgentEvent] = asyncio.Queue(maxsize=100)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._subscribers:
            self._subscribers.remove(q)

    def get_history(self) -> list[dict]:
        return [e.to_dict() for e in self._history]

    def get_stats(self) -> dict:
        return dict(self._stats)

    # --- Tour event channel ---

    def emit_tour(self, event_type: str, data: dict):
        event = TourEvent(
            timestamp=time.time(),
            event_type=event_type,
            data=data or {},
        )
        self._tour_history.append(event)
        if len(self._tour_history) > self._max_history:
            self._tour_history = self._tour_history[-self._max_history:]

        for q in self._tour_subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass

    def subscribe_tours(self) -> asyncio.Queue:
        q: asyncio.Queue[TourEvent] = asyncio.Queue(maxsize=100)
        self._tour_subscribers.append(q)
        return q

    def unsubscribe_tours(self, q: asyncio.Queue):
        if q in self._tour_subscribers:
            self._tour_subscribers.remove(q)

    def get_tour_history(self) -> list[dict]:
        return [e.to_dict() for e in self._tour_history]
