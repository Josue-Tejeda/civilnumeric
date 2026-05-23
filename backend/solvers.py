import sympy as sp
import numpy as np
import math

def _make_safe_functions(y_sym, f_expr, df_expr=None):
    """
    Helper to lambdify expressions and return functions that are safe from
    complex numbers, NaNs, and domain errors during out-of-bound iterations.
    """
    f_raw = sp.lambdify(y_sym, f_expr, 'numpy')
    
    def f_safe(val):
        if val <= 1e-12:
            return -999999.0
        try:
            res = f_raw(val)
            # Handle sympy/numpy complex results
            if isinstance(res, (complex, np.complexfloating)) or np.iscomplex(res):
                return -999999.0
            val_float = float(res)
            if math.isnan(val_float) or math.isinf(val_float):
                return -999999.0
            return val_float
        except Exception:
            return -999999.0
            
    if df_expr is not None:
        df_raw = sp.lambdify(y_sym, df_expr, 'numpy')
        
        def df_safe(val):
            if val <= 1e-12:
                return 1.0
            try:
                res = df_raw(val)
                if isinstance(res, (complex, np.complexfloating)) or np.iscomplex(res):
                    return 1.0
                val_float = float(res)
                if math.isnan(val_float) or math.isinf(val_float):
                    return 1.0
                return val_float
            except Exception:
                return 1.0
                
        return f_safe, df_safe
        
    return f_safe

def bisection_solver(f_expr, y_sym, a, b, tol=1e-6, max_iter=100):
    """
    Bisection method solver.
    """
    f = _make_safe_functions(y_sym, f_expr)
    
    a_val = float(a)
    b_val = float(b)
    
    f_a = f(a_val)
    f_b = f(b_val)
    
    if f_a * f_b > 0:
        raise ValueError("Intervalo inválido: f(a) y f(b) deben tener signos opuestos.")
        
    iterations = []
    converged = False
    c_old = None
    c = (a_val + b_val) / 2.0
    
    for k in range(max_iter):
        c = (a_val + b_val) / 2.0
        f_c = f(c)
        
        # Calculate relative error
        if k == 0:
            error = None
        else:
            error = abs(c - c_old) / abs(c) if abs(c) > 1e-12 else abs(c - c_old)
            
        iterations.append({
            "iteration": k,
            "x": float(c),
            "fx": float(f_c),
            "error": float(error) if error is not None else None
        })
        
        # Check convergence
        if abs(f_c) < tol or (error is not None and error < tol):
            converged = True
            break
            
        # Update interval
        if f_a * f_c < 0:
            b_val = c
            f_b = f_c
        else:
            a_val = c
            f_a = f_c
            
        c_old = c
        
    return {
        "root": float(c),
        "converged": converged,
        "iterations": iterations
    }

def newton_raphson_solver(f_expr, y_sym, y0, tol=1e-6, max_iter=100):
    """
    Newton-Raphson method solver using SymPy for symbolic differentiation.
    """
    df_expr = sp.diff(f_expr, y_sym)
    f, df = _make_safe_functions(y_sym, f_expr, df_expr)
    
    x = float(y0)
    iterations = []
    converged = False
    
    f_x = f(x)
    iterations.append({
        "iteration": 0,
        "x": x,
        "fx": f_x,
        "error": None
    })
    
    if abs(f_x) < tol:
        return {
            "root": x,
            "converged": True,
            "iterations": iterations
        }
        
    x_old = x
    for k in range(1, max_iter + 1):
        df_x = df(x_old)
        if abs(df_x) < 1e-12:
            break
            
        x = x_old - f_x / df_x
        f_x = f(x)
        
        error = abs(x - x_old) / abs(x) if abs(x) > 1e-12 else abs(x - x_old)
        
        iterations.append({
            "iteration": k,
            "x": float(x),
            "fx": float(f_x),
            "error": float(error)
        })
        
        if abs(f_x) < tol or error < tol:
            converged = True
            break
            
        x_old = x
        
    return {
        "root": float(x),
        "converged": converged,
        "iterations": iterations
    }

def secant_solver(f_expr, y_sym, y0, y1, tol=1e-6, max_iter=100):
    """
    Secant method solver.
    """
    f = _make_safe_functions(y_sym, f_expr)
    
    x0 = float(y0)
    x1 = float(y1)
    
    iterations = []
    converged = False
    
    f0 = f(x0)
    iterations.append({
        "iteration": 0,
        "x": x0,
        "fx": f0,
        "error": None
    })
    
    if abs(f0) < tol:
        return {
            "root": x0,
            "converged": True,
            "iterations": iterations
        }
        
    f1 = f(x1)
    error_1 = abs(x1 - x0) / abs(x1) if abs(x1) > 1e-12 else abs(x1 - x0)
    iterations.append({
        "iteration": 1,
        "x": x1,
        "fx": f1,
        "error": float(error_1)
    })
    
    if abs(f1) < tol or error_1 < tol:
        return {
            "root": x1,
            "converged": True,
            "iterations": iterations
        }
        
    x_prev = x0
    x_curr = x1
    f_prev = f0
    f_curr = f1
    
    for k in range(2, max_iter + 1):
        diff_f = f_curr - f_prev
        if abs(diff_f) < 1e-12:
            break
            
        x_next = x_curr - f_curr * (x_curr - x_prev) / diff_f
        f_next = f(x_next)
        
        error = abs(x_next - x_curr) / abs(x_next) if abs(x_next) > 1e-12 else abs(x_next - x_curr)
        
        iterations.append({
            "iteration": k,
            "x": float(x_next),
            "fx": float(f_next),
            "error": float(error)
        })
        
        if abs(f_next) < tol or error < tol:
            converged = True
            x_curr = x_next
            break
            
        x_prev = x_curr
        x_curr = x_next
        f_prev = f_curr
        f_curr = f_next
        
    return {
        "root": float(x_curr),
        "converged": converged,
        "iterations": iterations
    }


