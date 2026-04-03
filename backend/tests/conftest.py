"""pytest configuration — ensure the backend root is importable."""
import sys
import os

# Add the backend root to sys.path so that `import utils` and
# `from sip.handler import handler` work in tests.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
