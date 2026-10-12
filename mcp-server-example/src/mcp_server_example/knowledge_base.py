"""
  Knowledge-base features: one tool, one resource, and one prompt.

  The three MCP primitives differ in who decides to use them:
    - Tool:     a function the MODEL decides to call (performs work for the client).
    - Resource: information the HOST APPLICATION can load into context, addressed by a URI.
    - Prompt:   a reusable prompt template, generally initiated by the USER or host
                rather than the model itself.

  Nothing in this file imports the server. The functions are plain Python and are
  registered as MCP features in server.py.
"""

ARTICLES = [
    {
        "id": "python-env",
        "title": "Creating a Python virtual environment",
        "body": (
            "Create a virtual environment with `python -m venv .venv`, "
            "then activate it before installing dependencies."
        ),
    },
    {
        "id": "reset-password",
        "title": "Resetting your password",
        "body": (
            "Open Account Settings, choose Security, and select "
            "Reset Password. A verification email will be sent."
        ),
    },
    {
        "id": "api-rate-limit",
        "title": "Understanding API rate limits",
        "body": (
            "API rate limits restrict the number of requests allowed "
            "within a time window. Clients should retry using "
            "exponential backoff after receiving a rate-limit response."
        ),
    },
]


def search_kb(query: str, limit: int = 3) -> list[dict[str, str]]:
  """
    Search the knowledge base for articles matching the query.
    An article matches when every word in the query appears in its title
    or body, in any order and ignoring case.

    Args:
      query: Words to search for, e.g. "password reset"
      limit: Maximum number of results to return (default is 3)
  """

  # Notice there is no JSON Schema, no manually written tool manifest, and no argument
  # parser. The SDK derives the tool definition from the function itself:
  #   - Input schema: from the parameter names and type hints (limit becomes optional
  #     because it has a default).
  #   - Description: the whole docstring above, Args section included, is sent as one
  #     block of text. The SDK does not split Args into per-parameter descriptions; for
  #     that, use Annotated[str, Field(description="...")] from pydantic.
  #   - Output: a list is not a JSON object, so the SDK wraps it as {"result": [...]}
  #     in the result's structured_content.

  query_words = query.lower().split()

  matches = []

  for article in ARTICLES:
    searchable_text = (
      article["title"] + " " + article["body"]
    ).lower()

    if all(word in searchable_text for word in query_words):
      matches.append(article)

  return matches[:limit]


def get_articles() -> str:
  """
    Return the available knowledge-base articles.
  """

  lines = []

  for article in ARTICLES:
    lines.append(
      f"{article['id']}: {article['title']}"
    )

  return "\n".join(lines)


def draft_support_reply(customer_message: str) -> str:
  """
    Create a prompt for drafting a concise support response.
  """

  return f"""
    You are a technical support assistant.

    Write a concise and helpful response to this customer message:

    {customer_message}

    Use the support knowledge base when relevant.
    Do not invent product policies.
  """.strip()
