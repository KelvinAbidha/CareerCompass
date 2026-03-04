import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator

from app.events import subscribe

router = APIRouter(
    prefix="/stream",
    tags=["notifications"],
)

# A simple pub-sub mechanism using asyncio Queues for SSE
# Keep track of active client queues
active_queues = []

async def notify_clients(payload: dict):
    # This is the event listener registered with our custom dispatcher
    message = json.dumps(payload)
    for q in active_queues:
        await q.put(message)

# Subscribe to the core module event
subscribe("activity_logged", notify_clients)

async def event_generator(queue: asyncio.Queue) -> AsyncGenerator[str, None]:
    try:
        while True:
            # Wait for a new message to be put onto the queue
            data = await queue.get()
            # SSE format requires "data: <message>\n\n"
            yield f"data: {data}\n\n"
    except asyncio.CancelledError:
        # Client disconnected
        pass

@router.get("/updates")
async def sse_endpoint():
    # Create a new queue for this specific client connection
    q = asyncio.Queue()
    active_queues.append(q)
    
    async def cleanup_generator():
        try:
            async for event in event_generator(q):
                yield event
        finally:
            # Remove queue when client disconnects
            if q in active_queues:
                active_queues.remove(q)
                
    return StreamingResponse(cleanup_generator(), media_type="text/event-stream")
