"""
  Basket tools: an example of application-owned state in a stateless protocol.

  The new MCP protocol is stateless, but that does not mean your application can never
  maintain state. It just means MCP itself no longer hides application state inside a
  protocol session. The old idea is that the protocol remembers the state; the new idea
  is that the application owns the state and identifiers travel explicitly (the
  explicit-handle pattern).

  How the model ends up passing basket_id around:
    1. The model calls create_basket. The result {"basket_id": "..."} is returned as
       tool output, which the host places into the model's conversation context. (The
       SDK sends it twice: as structured_content, and as a JSON text copy in content
       for hosts that only read text.)
    2. add_item's input schema marks basket_id as a required string, so when the model
       wants to add an item, it copies the id from its context into the call arguments.

  The conversation carries the handle between calls, not the protocol. That is why the
  docstrings below matter: they are the tool descriptions that tell the model to call
  create_basket first and reuse its id.
"""

import uuid

from mcp.server.mcpserver.exceptions import ToolError

"""
  BASKETS lives in this process's memory, which is fine for learning locally. If you run
  multiple workers behind a load balancer (see server.py), each worker would have its own
  dict, so a basket created on Worker 1 would not exist on Worker 2. In that case, move
  this into a shared store such as Redis or a database.

  The basket_id is a random uuid4, so it is practically impossible to guess. Anyone holding the id can modify
  the basket, so in a real app you would also tie baskets to an authenticated user.
"""
BASKETS: dict[str, list[str]] = {}


def create_basket() -> dict[str, str]:
  """
    Create a new empty basket. Call this first, then pass the returned
    basket_id to add_item for every item added to this basket.
  """

  basket_id = str(uuid.uuid4())
  BASKETS[basket_id] = []

  return {
    "basket_id": basket_id
  }


def add_item(basket_id: str, product_id: str) -> dict[str, str | list[str]]:
  """
    Add a product to an existing basket.

    Args:
      basket_id: The id returned by create_basket
      product_id: The product to add
  """

  # The model can mistype or invent an id, so return a clear error it can recover from.
  # Raise ToolError for failures you anticipate: the model reads this message. Any other
  # exception is treated as a crash, and the model only sees "Error executing tool add_item".
  if basket_id not in BASKETS:
    raise ToolError(f"Unknown basket_id '{basket_id}'. Call create_basket first.")

  BASKETS[basket_id].append(product_id)

  return {
    "basket_id": basket_id,
    "items": BASKETS[basket_id],
  }
