"""
  Entry point: creates the MCP server, registers features from the other modules, and runs it.

  In 2026 (protocol version 2026-07-28), MCP was updated to become stateless: there is no
  initialize handshake and no MCP session ID attached to requests.

  Old MCP:
    Client ---initialize---> Server ---MCP_session_ID---> Client ---request + session_ID---> Server

  New MCP:
    Request_1 ---> Server_A, Request_2 ---> Server_B, Request_3 ---> Server_C

  No protocol session needs to tie calls together, so MCP moved from a bidirectional stateful
  protocol to a stateless request/response model, making load balancing easier.

  Note: the Python SDK still serves older clients (protocol versions 2024-11-05 through 2025,
  which start with an initialize handshake) over the legacy session-based path,
  so those clients still receive session IDs unless you pass stateless_http=True (see the
  commented-out lines for app and main() below). 2026-07-28 clients are always stateless,
  whatever the flag says.
"""

from mcp.server import MCPServer

from mcp_server_example import basket, knowledge_base

"""
  MCPServer is the high-level server API in the current Python SDK. For most servers, this is
  the API you want. The SDK also exposes a lower-level Server class, intended for cases where
  you need exact control over schemas, protocol metadata, or custom methods.
"""
mcp = MCPServer(
  "Developer Support KB",
  instructions=(
    "Use the knowledge-base tools to answer support questions. "
    "Prefer retrieved KB information over guessing."
  ),
)

"""
  Register the features. Calling mcp.tool()(fn) is exactly the same as writing @mcp.tool()
  above fn; doing it here keeps every registered feature visible in one place and lets the
  feature modules stay plain Python with no import of the server.
"""
mcp.tool()(knowledge_base.search_kb)
mcp.resource("kb://articles")(knowledge_base.get_articles)
mcp.prompt()(knowledge_base.draft_support_reply)

mcp.tool()(basket.create_basket)
mcp.tool()(basket.add_item)

"""
  ASGI (Asynchronous Server Gateway Interface) is the async interface between a web server
  like uvicorn and a Python web app like Starlette, which the SDK uses. This exposes the
  server as an ASGI app so an external server like uvicorn can run it.

  It must be defined at module level: uvicorn imports this file, so __name__ is not
  "__main__" and nothing inside the if-block at the bottom would run.

  stateless_http defaults to False, so older (pre-2026) clients get a session that lives in this
  process's memory. To make them stateless too, swap in the commented-out lines here and in
  main(). Set it in both places, since each one only affects its own way of running. The
  trade-off: older clients can no longer receive server-to-client requests such as sampling
  or elicitation, which this server does not use.
"""
app = mcp.streamable_http_app()
# app = mcp.streamable_http_app(stateless_http=True)


def main() -> None:
  mcp.run("streamable-http")
  # mcp.run("streamable-http", stateless_http=True)


if __name__ == "__main__":
  main()


"""
  How to run (from the project root):

  'uv run mcp dev src/mcp_server_example/server.py'
    Launches the server with the MCP Inspector, a UI for listing and invoking tools and other
    MCP features. Requires Node/npx to be installed. Note that the Inspector starts its own
    copy of the server over stdio (standard input/output) rather than HTTP: it finds the
    `mcp` object in this file and calls mcp.run() with the default stdio transport, so
    main() and the stateless_http setting are not used in this mode.

  'uv run mcp-server-example'  (or 'uv run src/mcp_server_example/server.py')
    Runs it as an HTTP server at http://127.0.0.1:8000/mcp.

  'uv run uvicorn mcp_server_example.server:app --port 8000'
    Runs the ASGI app with uvicorn directly. mcp.run("streamable-http") already uses uvicorn
    internally; the difference is who controls the server process. Here you do, so you can
    pass CLI flags like --port, --workers, or --reload.
"""

"""
  When you are scaling your server, the stateless core of MCP is particularly valuable (with
  load balancers). You can deploy multiple workers to handle requests, since a request no
  longer needs to return to the worker that handled the previous one.

  Client ---> Load Balancer ---> Worker 1
                            ---> Worker 2
                            ---> Worker 3
                            ---> Worker 4

  This only works if the server is stateless for every client. With stateless_http=False (the
  default), an older client's session lives in the memory of the worker that created it. If
  the load balancer sends its next request to a different worker, that worker does not
  recognise the session and rejects the request. Turn on stateless_http=True (see app and
  main() above) before running multiple workers, or configure the load balancer to send each
  session to the same worker (sticky sessions).

  Application state, such as the baskets in basket.py, must then live in a shared store that
  every worker can reach. There are additional considerations for advanced features such as
  multi-round-trip interactions, shared subscription events, authorization, and distributed
  state, but those are application architecture concerns rather than a requirement of basic
  MCP tool execution.
"""
