import os
import tempfile

import pytest

_db_dir = tempfile.mkdtemp(prefix="vitalize-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_dir}/test.db"
os.environ["DELIVERY_FEE_MAD"] = "30"
os.environ["RUN_WORKER_IN_API"] = "false"
os.environ["APP_ENV"] = "test"

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as test_client:
        yield test_client
