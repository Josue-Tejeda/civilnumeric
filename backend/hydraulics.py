import math

class ChannelGeometry:
    """Base class or utilities for channel geometry calculations."""
    pass

def rectangular_geometry(b, y):
    """Calculates rectangular channel geometry."""
    A = b * y
    P = b + 2.0 * y
    T = b
    Ay_bar = 0.5 * b * y**2
    return {
        "A": A,
        "P": P,
        "T": T,
        "Ay_bar": Ay_bar
    }

def trapezoidal_geometry(b, z, y):
    """Calculates trapezoidal channel geometry."""
    A = (b + z * y) * y
    P = b + 2.0 * y * math.sqrt(1.0 + z**2)
    T = b + 2.0 * z * y
    Ay_bar = (b / 2.0 + z * y / 3.0) * y**2
    return {
        "A": A,
        "P": P,
        "T": T,
        "Ay_bar": Ay_bar
    }

def triangular_geometry(z, y):
    """Calculates triangular channel geometry."""
    A = z * y**2
    P = 2.0 * y * math.sqrt(1.0 + z**2)
    T = 2.0 * z * y
    Ay_bar = (z * y**3) / 3.0
    return {
        "A": A,
        "P": P,
        "T": T,
        "Ay_bar": Ay_bar
    }

def circular_geometry(D, y):
    """Calculates circular channel geometry."""
    # Ensure float safety for acos domain [-1, 1]
    cos_val = 1.0 - 2.0 * y / D
    if cos_val > 1.0:
        cos_val = 1.0
    elif cos_val < -1.0:
        cos_val = -1.0
        
    theta = 2.0 * math.acos(cos_val)
    A = (D**2 / 8.0) * (theta - math.sin(theta))
    P = (D * theta) / 2.0
    T = D * math.sin(theta / 2.0)
    Ay_bar = (D**3 / 12.0) * (math.sin(theta / 2.0))**3 - A * (D / 2.0 - y)
    
    return {
        "A": A,
        "P": P,
        "T": T,
        "Ay_bar": Ay_bar
    }

