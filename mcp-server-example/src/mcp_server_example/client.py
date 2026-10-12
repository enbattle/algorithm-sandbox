"""
  Client to verify the server by interacting with it.

  To test this client, start the HTTP server on port 8000 (see "How to run" in server.py),
  then run from the project root:

  'uv run src/mcp_server_example/client.py'

  This client speaks the newest protocol (2026-07-28), so it always uses the stateless path.
  It does not exercise the legacy session path that stateless_http controls in server.py.
"""

import asyncio
from mcp import Client


async def main() -> None:
  async with Client("http://127.0.0.1:8000/mcp") as client:
    print("Protocol:", client.protocol_version)

    tools = await client.list_tools()

    print("\nAvailable tools:")

    for tool in tools.tools:
      print("-", tool.name)

    result = await client.call_tool(
      "search_kb",
      {
        "query": "rate limit",
        "limit": 2,
      },
    )

    # structured_content holds the JSON result; content holds the same result as text.
    print("\nsearch_kb result:")
    print(result.structured_content or result.content)

    # The explicit-handle pattern: we read basket_id from the first result and pass it
    # back ourselves, the same way a model would copy it from its context.
    created = await client.call_tool("create_basket", {})

    # A failed tool call does not raise on the client. It comes back with is_error=True
    # and the error message in content, so check before reading the result.
    if created.is_error:
      raise RuntimeError(f"create_basket failed: {created.content}")

    basket_id = created.structured_content["basket_id"]

    added = await client.call_tool(
      "add_item",
      {
        "basket_id": basket_id,
        "product_id": "keyboard",
      },
    )

    print("\nadd_item result:")
    print(added.structured_content or added.content)


if __name__ == "__main__":
  asyncio.run(main())
