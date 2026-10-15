import os

# Local-test defaults, set before any app module is imported.
os.environ.setdefault("INTERVIA_AUTH", "off")
os.environ.setdefault("INTERVIA_STORE", "memory")
os.environ.setdefault("INTERVIA_LLM", "mock")