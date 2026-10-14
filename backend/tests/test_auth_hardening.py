"""鉴权与公开暴露面的回归测试。

这些用例覆盖「demo 能不能公开」的几条分界线：
验证码回显、管理员令牌兜底、测评/ML 端点匿名可调。
"""

import tempfile
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app.config import Settings
from app.database import Base, get_db
from app.main import app
from app.seed import seed_demo_data, seed_merchant_account
from app.startup_checks import ConfigError, validate_settings


def make_client(monkeypatch) -> TestClient:
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    merchant = seed_merchant_account(session)
    seed_demo_data(session, merchant.id)
    session.close()

    def override_get_db():
        session = sessionmaker(bind=engine)()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(main_module, "UPLOAD_DIR", Path(tempfile.mkdtemp(prefix="liantan-auth-test-")))
    # 默认令牌为空：任何请求都不应再靠它通行。
    monkeypatch.setattr(main_module.settings, "admin_token", "")
    return TestClient(app)


def test_admin_token_backdoor_is_disabled_by_default(monkeypatch):
    """config 里的 admin_token 默认必须是空串，且空串不会匹配任何请求。"""
    # 断言的是模型默认值本身：本机 .env 可能仍写着旧令牌，那属于个人配置而非代码默认值。
    assert Settings.model_fields["admin_token"].default == ""
    client = make_client(monkeypatch)
    for token in ["lantan-admin-demo-2025", "anything"]:
        response = client.get("/api/negotiations", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401, f"令牌 {token} 不应被接受"


def test_otp_is_not_echoed_when_demo_mode_is_off(monkeypatch):
    client = make_client(monkeypatch)
    monkeypatch.setattr(main_module.settings, "demo_mode", False)
    response = client.post("/api/auth/supplier/request-code", json={"phone": "13700000000"})
    # 没有接入短信服务时必须明确失败，而不是把验证码回给请求方。
    assert response.status_code == 503


def test_otp_is_echoed_only_in_demo_mode(monkeypatch):
    client = make_client(monkeypatch)
    monkeypatch.setattr(main_module.settings, "demo_mode", True)
    response = client.post("/api/auth/supplier/request-code", json={"phone": "13700000000"})
    assert response.status_code == 200
    body = response.json()
    assert body["demo_mode"] is True
    assert body["code"] and len(body["code"]) == 6


def test_evaluation_and_ml_endpoints_require_auth(monkeypatch):
    """这些端点会真实调用大模型 / 训练模型，匿名不可用。"""
    client = make_client(monkeypatch)
    protected = [
        ("get", "/api/evaluations/datasets"),
        ("post", "/api/evaluations/rules"),
        ("get", "/api/ml/status"),
        ("post", "/api/ml/train"),
        ("post", "/api/ml/evaluate"),
    ]
    for method, path in protected:
        response = getattr(client, method)(path)
        assert response.status_code == 401, f"{method.upper()} {path} 应要求鉴权"

    # 带商家 token 后放行（这里只验证鉴权通过，不真正跑评测）。
    login = client.post("/api/auth/merchant/login", json={"account": "admin", "password": "链谈Agent123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/api/evaluations/datasets", headers=headers).status_code == 200


def test_validate_settings_blocks_unsafe_production_config():
    unsafe = Settings(
        environment="prod",
        demo_mode=True,
        database_url="sqlite:///./liantan.db",
        admin_token="lantan-admin-demo-2025",
        merchant_password="链谈Agent123",
        frontend_origin="http://localhost:3000",
    )
    try:
        validate_settings(unsafe)
    except ConfigError as exc:
        message = str(exc)
        assert "DEMO_MODE" in message
        assert "DATABASE_URL" in message
        assert "ADMIN_TOKEN" in message
    else:
        raise AssertionError("生产环境的危险配置必须拒绝启动")


def test_validate_settings_accepts_safe_production_config():
    safe = Settings(
        environment="prod",
        demo_mode=False,
        database_url="postgresql+psycopg://user:pw@host:5432/postgres",
        admin_token="",
        merchant_password="a-strong-password-2026",
        frontend_origin="https://example.vercel.app",
    )
    assert validate_settings(safe) == []
