# mcp-server-example

A basic local MCP (Model Context Protocol) server, built to learn how MCP servers work with the
official Python SDK (`mcp` 2.3.0). It shows:

- The three MCP primitives (a **tool**, a **resource**, and a **prompt**) on a small support
  knowledge base.
- **Application-owned state** in a stateless protocol: basket tools that pass a `basket_id`
  handle between calls.
- Three ways to run the server, including as an ASGI app under uvicorn.
- A client that connects over HTTP and calls the tools.

The source files are heavily commented. This README is the map; the comments explain the details.

## Project layout

```
src/mcp_server_example/
  server.py          Creates the MCPServer, registers every feature, exposes `app` for uvicorn,
                     and holds the notes on the stateless protocol, running, and scaling
  knowledge_base.py  search_kb tool, kb://articles resource, draft_support_reply prompt
  basket.py          create_basket and add_item tools (the explicit-handle pattern)
  client.py          Test client that calls the tools over HTTP
```

The feature modules are plain Python and never import the server. `server.py` registers them
with `mcp.tool()(fn)`, which is the same as putting `@mcp.tool()` above `fn`. Keeping the
imports one way avoids loading `server.py` twice (once as `__main__`, once as a module), which
would create two separate servers.

## Requirements

- Python 3.14+
- [uv](https://docs.astral.sh/uv/)
- Node.js / `npx`, only for the MCP Inspector (`mcp dev`)

Install the dependencies from this folder:

```
uv sync
```

## Running the server

Run every command from this folder (`mcp-server-example/`).

| Command | What it does |
|---|---|
| `uv run mcp-server-example` | Starts the HTTP server at `http://127.0.0.1:8000/mcp` (calls `main()` in `server.py`) |
| `uv run src/mcp_server_example/server.py` | Same as above, running the file directly |
| `uv run uvicorn mcp_server_example.server:app --port 8000` | Runs the ASGI `app` with uvicorn directly, so you can pass flags like `--workers` or `--reload` |
| `uv run mcp dev src/mcp_server_example/server.py` | Opens the MCP Inspector, a UI for listing and calling tools, resources, and prompts |

**`mcp.run()` vs. uvicorn:** `mcp.run("streamable-http")` already builds the same ASGI app and
starts uvicorn internally. The only difference is who controls the server process: the SDK, or
you from the command line.

**`mcp dev`:** the Inspector starts its own copy of the server over stdio (standard
input/output), not HTTP. `main()` and the `stateless_http` setting are not used in this mode.

## Testing with the client

Start the server with one of the HTTP commands above, then in a second terminal:

```
uv run src/mcp_server_example/client.py
```

Expected output (the basket id is random):

```
Protocol: 2026-07-28

Available tools:
- search_kb
- create_basket
- add_item

search_kb result:
{'result': [{'id': 'api-rate-limit', 'title': 'Understanding API rate limits', ...}]}

add_item result:
{'basket_id': '1f93acd9-...', 'items': ['keyboard']}
```

## Key concepts

### Tools, resources, and prompts

| Primitive | Who decides to use it | Example here |
|---|---|---|
| Tool | The model | `search_kb`, `create_basket`, `add_item` |
| Resource | The host application, which loads it into context by URI | `kb://articles` |
| Prompt | The user or host | `draft_support_reply` |

The SDK builds each tool definition from the Python function: the input schema from the type
hints, and the description from the docstring. That's why the docstrings are written for the
model to read.

### Stateless MCP and the `stateless_http` flag

Protocol version `2026-07-28` made MCP stateless: no `initialize` handshake and no
`Mcp-Session-Id`. Each request stands alone, so any server worker can handle it.

The SDK still supports older clients (protocol versions `2024-11-05` through 2025) over the
legacy path, which **does** create a session for each client in the server's memory. The
`stateless_http` flag controls only that legacy path:

- `False` (default): older clients get a session ID.
- `True`: older clients are handled statelessly too. They can no longer receive
  server-to-client requests (sampling, elicitation), which this server does not use.

`2026-07-28` clients, such as `client.py`, are always stateless, whatever the flag says. To turn
it on, swap in the commented-out lines next to `app` and inside `main()` in `server.py`, in both
places.

### Application-owned state (the basket tools)

A stateless protocol doesn't stop your application from keeping state. The application stores
it and hands out an explicit identifier:

1. The model calls `create_basket` and gets back `{"basket_id": "..."}` in its context.
2. `add_item` requires `basket_id`, so the model copies the id into its next call.

The conversation carries the handle between calls, not the protocol. If the id is unknown,
`add_item` raises the SDK's `ToolError`, so the model sees a message it can recover from. Any
other exception would only show it `Error executing tool add_item`.

## Scaling notes

Behind a load balancer with several workers (for example `uvicorn ... --workers 4`):

- Set `stateless_http=True`, or older clients' sessions break when a request reaches a worker
  that didn't create the session. Sticky sessions at the load balancer are the alternative.
- Move application state out of process memory. `BASKETS` in `basket.py` is an in-memory dict,
  so each worker would have its own. Use a shared store such as Redis or a database.
