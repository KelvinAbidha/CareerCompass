import asyncio
from typing import Callable, Dict, List, Any
import logging

logger = logging.getLogger(__name__)

# Basic Event Dispatcher
_subscribers: Dict[str, List[Callable]] = {}

def subscribe(event_type: str, handler: Callable):
    """Register a handler for a specific event type."""
    if event_type not in _subscribers:
         _subscribers[event_type] = []
    _subscribers[event_type].append(handler)
    logger.info(f"Subscribed handler {handler.__name__} to event {event_type}")

async def emit(event_type: str, payload: Any):
    """Emit an event to all registered handlers without blocking."""
    handlers = _subscribers.get(event_type, [])
    if not handlers:
        return
        
    for handler in handlers:
        try:
            # We assume handlers are async functions
            asyncio.create_task(handler(payload))
        except Exception as e:
            logger.error(f"Error dispatching event {event_type} to {handler.__name__}: {e}")
