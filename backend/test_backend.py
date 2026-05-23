import pytest
import math
from backend.hydraulics import (
    rectangular_geometry,
    trapezoidal_geometry,
    triangular_geometry,
    circular_geometry
)

def test_rectangular_geometry():
    # Parameters: b = 2.0, y = 1.5
    b = 2.0
    y = 1.5
    geom = rectangular_geometry(b, y)
    
    assert geom["A"] == pytest.approx(3.0)
    assert geom["P"] == pytest.approx(5.0)
    assert geom["T"] == pytest.approx(2.0)
    assert geom["Ay_bar"] == pytest.approx(2.25)

def test_trapezoidal_geometry():
    # Parameters: b = 2.0, z = 1.5, y = 1.2
    b = 2.0
    z = 1.5
    y = 1.2
    geom = trapezoidal_geometry(b, z, y)
    
    assert geom["A"] == pytest.approx(4.56)
    assert geom["P"] == pytest.approx(6.3266615)
    assert geom["T"] == pytest.approx(5.6)
    assert geom["Ay_bar"] == pytest.approx(2.304)

def test_triangular_geometry():
    # Parameters: z = 1.5, y = 1.2
    z = 1.5
    y = 1.2
    geom = triangular_geometry(z, y)
    
    assert geom["A"] == pytest.approx(2.16)
    assert geom["P"] == pytest.approx(4.3266615)
    assert geom["T"] == pytest.approx(3.6)
    assert geom["Ay_bar"] == pytest.approx(0.864)

def test_circular_geometry():
    # Parameters: D = 2.0, y = 0.8
    D = 2.0
    y = 0.8
    geom = circular_geometry(D, y)
    
    assert geom["A"] == pytest.approx(1.17347925)
    assert geom["P"] == pytest.approx(2.7388768)
    assert geom["T"] == pytest.approx(1.9595918)
    assert geom["Ay_bar"] == pytest.approx(0.39237353)

# --- Solvers tests ---

import sympy as sp
from backend.solvers import bisection_solver, newton_raphson_solver, secant_solver

def test_solvers_standard_equation():
    # Solve x^2 - 4 = 0, root is 2.0
    x = sp.Symbol('x')
    f_expr = x**2 - 4.0
    
    # Bisection
    res_bi = bisection_solver(f_expr, x, 1.0, 3.0, tol=1e-6)
    assert res_bi["converged"] is True
    assert res_bi["root"] == pytest.approx(2.0, abs=1e-5)
    assert len(res_bi["iterations"]) > 0
    # Check that error is in iterations
    assert "error" in res_bi["iterations"][-1]
    
    # Newton-Raphson
    res_nr = newton_raphson_solver(f_expr, x, 3.0, tol=1e-6)
    assert res_nr["converged"] is True
    assert res_nr["root"] == pytest.approx(2.0, abs=1e-5)
    assert len(res_nr["iterations"]) > 0
    assert "error" in res_nr["iterations"][-1]
    
    # Secant
    res_sec = secant_solver(f_expr, x, 1.0, 3.0, tol=1e-6)
    assert res_sec["converged"] is True
    assert res_sec["root"] == pytest.approx(2.0, abs=1e-5)
    assert len(res_sec["iterations"]) > 0
    assert "error" in res_sec["iterations"][-1]

def test_solvers_manning_equation():
    # Channel rectangular normal depth
    # Q = (1/n) * A * R^(2/3) * S0^(1/2)
    # Q = 2.0, b = 2.0, n = 0.015, S0 = 0.001
    # Residual: (1/n) * A * (A/P)^(2/3) * S0^(1/2) - Q = 0
    y = sp.Symbol('y')
    b = 2.0
    n = 0.015
    S0 = 0.001
    Q = 2.0
    
    A = b * y
    P = b + 2.0 * y
    R = A / P
    f_expr = (1.0 / n) * A * (R**(2.0 / 3.0)) * (S0**0.5) - Q
    
    expected_root = 0.81054808
    
    # Bisection
    res_bi = bisection_solver(f_expr, y, 0.01, 5.0, tol=1e-6)
    assert res_bi["converged"] is True
    assert res_bi["root"] == pytest.approx(expected_root, abs=1e-5)
    
    # Newton-Raphson
    res_nr = newton_raphson_solver(f_expr, y, 0.5, tol=1e-6)
    assert res_nr["converged"] is True
    assert res_nr["root"] == pytest.approx(expected_root, abs=1e-5)
    
    # Secant
    res_sec = secant_solver(f_expr, y, 0.5, 1.0, tol=1e-6)
    assert res_sec["converged"] is True
    assert res_sec["root"] == pytest.approx(expected_root, abs=1e-5)


# --- API tests ---

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_api_solve_success():
    payload = {
        "channel_type": "rectangular",
        "calculation_type": "normal_depth",
        "b": 2.0,
        "Q": 2.0,
        "n": 0.015,
        "S0": 0.001,
        "bisect_a": 0.1,
        "bisect_b": 2.0,
        "newton_x0": 0.5,
        "secant_x0": 0.5,
        "secant_x1": 1.0,
        "tol": 1e-6,
        "max_iter": 100
    }
    response = client.post("/api/solve", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "bisection" in data
    assert "newton_raphson" in data
    assert "secant" in data
    assert "hydraulic_properties" in data
    assert data["newton_raphson"]["converged"] is True
    assert data["newton_raphson"]["root"] == pytest.approx(0.810548, abs=1e-4)

def test_api_solve_invalid_sign():
    payload = {
        "channel_type": "rectangular",
        "calculation_type": "normal_depth",
        "b": 2.0,
        "Q": 2.0,
        "n": 0.015,
        "S0": 0.001,
        "bisect_a": 1.5,
        "bisect_b": 3.0,
        "newton_x0": 0.5,
        "secant_x0": 0.5,
        "secant_x1": 1.0,
        "tol": 1e-6,
        "max_iter": 100
    }
    response = client.post("/api/solve", json=payload)
    assert response.status_code == 400
    assert "sign" in response.json()["detail"].lower() or "signo" in response.json()["detail"].lower()

def test_api_static_files():
    response = client.get("/")
    assert response.status_code == 200
    assert "html" in response.headers.get("content-type", "").lower()
    assert "CivilNumeric" in response.text
    
    # Verify that linked assets can also be retrieved
    import re
    match = re.search(r'href="(/assets/[^"]+)"', response.text)
    if match:
        asset_path = match.group(1)
        asset_response = client.get(asset_path)
        assert asset_response.status_code == 200
    else:
        # If no link stylesheet found, look for script tag
        script_match = re.search(r'src="(/assets/[^"]+)"', response.text)
        if script_match:
            asset_path = script_match.group(1)
            asset_response = client.get(asset_path)
            assert asset_response.status_code == 200




