from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from typing import Optional
import sympy as sp
import numpy as np
import math
import os
from concurrent.futures import ThreadPoolExecutor

from backend.hydraulics import (
    rectangular_geometry,
    trapezoidal_geometry,
    triangular_geometry,
    circular_geometry
)
from backend.solvers import (
    bisection_solver,
    newton_raphson_solver,
    secant_solver
)

app = FastAPI(title="CivilNumeric API")

# Add CORS Middleware to support development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SolveRequest(BaseModel):
    channel_type: str = Field(..., description="rectangular, trapezoidal, triangular, circular")
    calculation_type: str = Field(..., description="normal_depth, critical_depth, hydraulic_jump")
    
    # Geometric parameters
    b: Optional[float] = None
    z: Optional[float] = None
    D: Optional[float] = None
    
    # Hydraulic parameters
    Q: Optional[float] = None
    n: Optional[float] = None
    S0: Optional[float] = None
    y1: Optional[float] = None # For hydraulic jump
    
    # Solver parameters
    bisect_a: float
    bisect_b: float
    newton_x0: float
    secant_x0: float
    secant_x1: float
    
    tol: Optional[float] = 1e-6
    max_iter: Optional[int] = 100

def get_symbolic_exprs(channel_type, y, b, z, D):
    if channel_type == "rectangular":
        A = b * y
        P = b + 2 * y
        T = b
        Ay_bar = 0.5 * b * y**2
    elif channel_type == "trapezoidal":
        A = (b + z * y) * y
        P = b + 2 * y * sp.sqrt(1 + z**2)
        T = b + 2 * z * y
        Ay_bar = (b / 2 + z * y / 3) * y**2
    elif channel_type == "triangular":
        A = z * y**2
        P = 2 * y * sp.sqrt(1 + z**2)
        T = 2 * z * y
        Ay_bar = (z * y**3) / 3
    elif channel_type == "circular":
        theta = 2 * sp.acos(1 - 2 * y / D)
        A = (D**2 / 8) * (theta - sp.sin(theta))
        P = (D * theta) / 2
        T = D * sp.sin(theta / 2)
        Ay_bar = (D**3 / 12) * sp.sin(theta / 2)**3 - A * (D / 2 - y)
    else:
        raise ValueError("Tipo de canal inválido.")
        
    return A, P, T, Ay_bar

def compute_jump_m1(channel_type, y1, b, z, D, Q):
    g = 9.81
    if channel_type == "rectangular":
        geom = rectangular_geometry(b, y1)
    elif channel_type == "trapezoidal":
        geom = trapezoidal_geometry(b, z, y1)
    elif channel_type == "triangular":
        geom = triangular_geometry(z, y1)
    elif channel_type == "circular":
        geom = circular_geometry(D, y1)
    else:
        raise ValueError("Tipo de canal inválido.")
        
    A1 = geom["A"]
    Ay_bar1 = geom["Ay_bar"]
    M1 = Q**2 / (g * A1) + Ay_bar1
    return M1

# Root endpoint is handled by static files mount or fallback below

@app.post("/api/solve")
def solve_hydraulics(request: SolveRequest):
    # 1. Pre-validation of inputs
    errors = []
    if request.Q is None or request.Q <= 0:
        errors.append("El caudal Q debe ser mayor que cero.")
        
    if request.calculation_type == "normal_depth":
        if request.n is None or request.n <= 0:
            errors.append("La rugosidad n de Manning debe ser mayor que cero.")
        if request.S0 is None or request.S0 <= 0:
            errors.append("La pendiente S0 debe ser mayor que cero.")
    elif request.calculation_type == "hydraulic_jump":
        if request.y1 is None or request.y1 <= 0:
            errors.append("El tirante inicial y1 debe ser mayor que cero.")
            
    if request.channel_type == "rectangular":
        if request.b is None or request.b <= 0:
            errors.append("La plantilla b debe ser mayor que cero.")
    elif request.channel_type == "trapezoidal":
        if request.b is None or request.b <= 0:
            errors.append("La plantilla b debe ser mayor que cero.")
        if request.z is None or request.z < 0:
            errors.append("El talud z debe ser mayor o igual a cero.")
    elif request.channel_type == "triangular":
        if request.z is None or request.z <= 0:
            errors.append("El talud z debe ser mayor que cero.")
    elif request.channel_type == "circular":
        if request.D is None or request.D <= 0:
            errors.append("El diámetro D debe ser mayor que cero.")
            
    # Check solver boundaries (tirante > 0)
    if request.bisect_a <= 0 or request.bisect_b <= 0 or request.newton_x0 <= 0 or request.secant_x0 <= 0 or request.secant_x1 <= 0:
        errors.append("Todos los valores iniciales y límites de los solucionadores deben ser estrictamente positivos.")
        
    if request.bisect_a >= request.bisect_b:
        errors.append("El límite inferior de Bisección (bisect_a) debe ser menor que el límite superior (bisect_b).")
        
    if request.channel_type == "circular" and request.D is not None and request.D > 0:
        D = request.D
        if request.bisect_a >= D or request.bisect_b >= D or request.newton_x0 >= D or request.secant_x0 >= D or request.secant_x1 >= D:
            errors.append(f"Todos los valores iniciales y límites de los solucionadores deben ser menores que el diámetro D ({D}).")
            
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
        
    # 2. Build Symbolic Expression
    y = sp.Symbol('y')
    b = request.b or 0.0
    z = request.z or 0.0
    D = request.D or 0.0
    Q = request.Q or 0.0
    n = request.n or 0.0
    S0 = request.S0 or 0.0
    y1 = request.y1 or 0.0
    
    g = 9.81
    
    try:
        A_sym, P_sym, T_sym, Ay_bar_sym = get_symbolic_exprs(request.channel_type, y, b, z, D)
        
        if request.calculation_type == "normal_depth":
            f_expr = (1.0 / n) * A_sym * (A_sym / P_sym)**(2.0 / 3.0) * (S0**0.5) - Q
        elif request.calculation_type == "critical_depth":
            f_expr = g * A_sym**3 - (Q**2) * T_sym
        elif request.calculation_type == "hydraulic_jump":
            M1 = compute_jump_m1(request.channel_type, y1, b, z, D, Q)
            f_expr = Q**2 / (g * A_sym) + Ay_bar_sym - M1
        else:
            raise HTTPException(status_code=400, detail="Tipo de cálculo inválido.")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error formulando la ecuación: {str(e)}")

    # 3. Check sign change for Bisection
    # Lambdify to check sign changes safely
    f_check = sp.lambdify(y, f_expr, 'numpy')
    try:
        f_a = float(f_check(request.bisect_a))
        f_b = float(f_check(request.bisect_b))
        
        # If any of the evaluated boundaries results in complex/nan/inf, handle it
        if math.isnan(f_a) or math.isinf(f_a) or math.isnan(f_b) or math.isinf(f_b):
            # Fallback or allow the solver to handle
            pass
        elif f_a * f_b > 0:
            raise HTTPException(
                status_code=400,
                detail=f"El intervalo de Bisección [{request.bisect_a}, {request.bisect_b}] no contiene un cambio de signo (f(a) = {f_a:.4f}, f(b) = {f_b:.4f})."
            )
    except HTTPException:
        raise
    except Exception as e:
        # If evaluation fails, it might be due to division by zero, allow the solver to run or report
        pass

    # 4. Execute calculations in parallel
    tol = request.tol or 1e-6
    max_iter = request.max_iter or 100
    
    with ThreadPoolExecutor() as executor:
        future_bi = executor.submit(bisection_solver, f_expr, y, request.bisect_a, request.bisect_b, tol, max_iter)
        future_nr = executor.submit(newton_raphson_solver, f_expr, y, request.newton_x0, tol, max_iter)
        future_sec = executor.submit(secant_solver, f_expr, y, request.secant_x0, request.secant_x1, tol, max_iter)
        
        try:
            res_bi = future_bi.result()
        except Exception as e:
            res_bi = {"root": 0.0, "converged": False, "iterations": [], "error": str(e)}
            
        try:
            res_nr = future_nr.result()
        except Exception as e:
            res_nr = {"root": 0.0, "converged": False, "iterations": [], "error": str(e)}
            
        try:
            res_sec = future_sec.result()
        except Exception as e:
            res_sec = {"root": 0.0, "converged": False, "iterations": [], "error": str(e)}

    # 5. Determine final root and calculate properties
    # Default to NR root if converged, then Secant, then Bisection
    y_final = None
    if res_nr.get("converged"):
        y_final = res_nr["root"]
    elif res_sec.get("converged"):
        y_final = res_sec["root"]
    elif res_bi.get("converged"):
        y_final = res_bi["root"]
    else:
        # Fallback to the last available root estimate
        y_final = res_nr.get("root") or res_sec.get("root") or res_bi.get("root") or 0.0

    # Ensure y_final is positive
    y_final = max(1e-5, y_final)
    if request.channel_type == "circular" and request.D is not None:
        y_final = min(request.D - 1e-5, y_final)

    # 6. Calculate hydraulic properties
    if request.channel_type == "rectangular":
        geom = rectangular_geometry(b, y_final)
    elif request.channel_type == "trapezoidal":
        geom = trapezoidal_geometry(b, z, y_final)
    elif request.channel_type == "triangular":
        geom = triangular_geometry(z, y_final)
    elif request.channel_type == "circular":
        geom = circular_geometry(D, y_final)
        
    A = geom["A"]
    P = geom["P"]
    T = geom["T"]
    
    Rh = A / P if P > 0 else 0.0
    v = Q / A if A > 0 else 0.0
    E = y_final + (v**2) / (2.0 * g)
    Fr = v / math.sqrt(g * A / T) if (T > 0 and A > 0) else 0.0

    return {
        "bisection": res_bi,
        "newton_raphson": res_nr,
        "secant": res_sec,
        "hydraulic_properties": {
            "y": float(y_final),
            "A": float(A),
            "P": float(P),
            "T": float(T),
            "Rh": float(Rh),
            "v": float(v),
            "E": float(E),
            "Fr": float(Fr)
        }
    }

# Serve static files from the built frontend
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="static")
else:
    @app.get("/")
    def read_root_fallback():
        return HTMLResponse(
            "<h1>Welcome to CivilNumeric API</h1>"
            "<p>Frontend is not built yet. Run <code>npm run build</code> in the frontend folder.</p>"
        )

