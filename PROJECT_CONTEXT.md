# PROJECT_CONTEXT.md: CivilNumeric

## 1. Visión Técnica del Proyecto
**CivilNumeric** es un software interactivo de nivel profesional diseñado para resolver ecuaciones no lineales de hidráulica de canales abiertos. Su propósito principal es didáctico y de ingeniería práctica: permitir a estudiantes y profesionales comparar simultáneamente la velocidad, precisión y comportamiento de tres métodos numéricos clásicos:
1. **Bisección**
2. **Newton-Raphson**
3. **Secante**

El software no requiere que el usuario ingrese fórmulas matemáticas directas. En su lugar, cuenta con ecuaciones de ingeniería predefinidas (tirante normal, tirante crítico y resalto hidráulico) para diversas secciones geométricas de canal. El usuario solo provee los datos físicos del canal, y el sistema configura y resuelve las ecuaciones de manera automática y paralela.

---

## 2. Arquitectura del Sistema
El sistema utiliza una arquitectura cliente-servidor integrada de un solo proceso para simplicidad de despliegue y desarrollo:

```text
               +--------------------------------------+
               |          Navegador Cliente           |
               |  (React SPA + Chart.js + Vector SVG) |
               +------------------+-------------------+
                                  |
                      HTTP POST   |   Servir Archivos Estáticos
                     /api/solve   |   (frontend/dist/*)
                                  v
               +------------------+-------------------+
               |        FastAPI Backend (Python)      |
               | (Solvers + SymPy Sym-Diff + Uvicorn) |
               +--------------------------------------+
```

### Flujo de Datos
1. El usuario selecciona la geometría del canal y configura los datos del problema hidráulico en el cliente (React).
2. El cliente valida que las entradas sean lógicas y que no violen restricciones (ej. dimensiones o caudales menores o iguales a cero, o intervalos inválidos de Bisección).
3. El cliente envía un payload JSON al endpoint `/api/solve` de FastAPI.
4. El backend matemático evalúa las ecuaciones hidráulicas, realiza la diferenciación simbólica exacta para Newton-Raphson usando **SymPy**, ejecuta los tres resolvedores en paralelo y consolida los resultados.
5. El backend devuelve un JSON estructurado con la convergencia paso a paso, errores relativos y resultados hidráulicos calculados.
6. El cliente React renderiza un Dashboard Comparativo Unificado con gráficos, tablas comparativas y un diagrama SVG dinámico a escala.

---

## 3. Stack Tecnológico

### Backend (Cálculo y API)
- **Runtime**: Python 3.10+
- **Framework Web**: **FastAPI** (con Uvicorn como servidor ASGI)
- **Librería de Cálculo Simbólico**: **SymPy** (para analizar la ecuación y calcular $f'(y)$ analíticamente)
- **Librería de Cálculo Numérico**: **NumPy** (para evaluaciones vectoriales de soporte)

### Frontend (UI/UX)
- **Build Tool / Bundler**: **Vite** (configuración rápida, hot-reloading)
- **Biblioteca UI**: **React (TypeScript)**
- **Estilos**: **Vanilla CSS (CSS Modules / CSS nativo moderno)** (evitando TailwindCSS, control total de transiciones y diseño)
- **Visualización Gráfica**: **Chart.js** o **Recharts** (con escala logarítmica en el eje Y para los errores de convergencia)

---

## 4. Modelado Matemático e Hidráulico (Sistema Internacional - Métrico)

Las ecuaciones se resuelven bajo el Sistema Internacional de Unidades (SI), con gravedad constante $g = 9.81 \text{ m/s}^2$ y constante hidráulica de Manning $K_f = 1.0$.

### Sección Rectangular
- Parámetros: Plantilla ($b$), Tirante ($y$)
- Área Mojada ($A$): $A = b \cdot y$
- Perímetro Mojado ($P$): $P = b + 2y$
- Espejo de Agua ($T$): $T = b$
- Momento Estático de Área ($A \bar{y}$): $A \bar{y} = \frac{1}{2} b y^2$

### Sección Trapezoidal
- Parámetros: Plantilla ($b$), Talud horizontal ($z$ horizontal : 1 vertical), Tirante ($y$)
- Área Mojada ($A$): $A = (b + z y) y$
- Perímetro Mojado ($P$): $P = b + 2y\sqrt{1 + z^2}$
- Espejo de Agua ($T$): $T = b + 2 z y$
- Momento Estático de Área ($A \bar{y}$): $A \bar{y} = \left(\frac{b}{2} + \frac{z y}{3}\right) y^2$

### Sección Triangular
- Parámetros: Talud horizontal ($z$ horizontal : 1 vertical), Tirante ($y$)
- Área Mojada ($A$): $A = z y^2$
- Perímetro Mojado ($P$): $P = 2y\sqrt{1 + z^2}$
- Espejo de Agua ($T$): $T = 2 z y$
- Momento Estático de Área ($A \bar{y}$): $A \bar{y} = \frac{1}{3} z y^3$

### Sección Circular
- Parámetros: Diámetro ($D$), Tirante ($y$)
- Ángulo central ($\theta$ en radianes): $\theta = 2 \arccos\left(1 - \frac{2y}{D}\right)$
- Área Mojada ($A$): $A = \frac{D^2}{8} (\theta - \sin\theta)$
- Perímetro Mojado ($P$): $P = \frac{D \theta}{2}$
- Espejo de Agua ($T$): $T = D \sin\left(\frac{\theta}{2}\right)$
- Momento Estático de Área ($A \bar{y}$): $A \bar{y} = \frac{D^3}{12} \sin^3\left(\frac{\theta}{2}\right) - A \left(\frac{D}{2} - y\right)$

---

## 5. Reglas de Estilo y UI (Modo Oscuro Técnico)

### Paleta de Colores
- **Fondo de Aplicación**: Gris grafito profundo / azul pizarra oscuro (`#0b0f19` a `#111827`).
- **Paneles y Tarjetas (Glassmorphism)**: Fondos semitransparentes (`rgba(31, 41, 55, 0.6)`) con desenfoque de fondo (`backdrop-filter: blur(12px)`) y bordes muy delgados en colores claros transparentes (`border: 1px solid rgba(255, 255, 255, 0.08)`).
- **Esquema de Canales (SVG)**:
  - Estructura del canal: Línea gris claro brillante.
  - Agua: Azul cian brillante (`#0ea5e9` o `#38bdf8`) con opacidad media y animación de oleaje ligero.
- **Identificación de Métodos**:
  - **Bisección**: Naranja brillante (`#f97316`).
  - **Newton-Raphson**: Verde esmeralda o menta (`#10b981`).
  - **Secante**: Violeta eléctrico (`#8b5cf6`).

### Directivas de UI/UX
- **Tipografía**: Fuentes modernas Sans-Serif sans (ej. `Inter` u `Outfit`) combinadas con fuentes Mono (ej. `Fira Code` o `JetBrains Mono`) para las tablas e iteraciones numéricas.
- **Gráficas de Convergencia**: Eje Y configurado estrictamente en escala logarítmica para ver la tasa de convergencia del error absoluto. Las 3 líneas deben plotearse juntas para comparación instantánea.
- **Interactividad del Canal (SVG)**: El esquema visual de la sección del canal debe redibujarse inmediatamente en SVG al cambiar los parámetros de entrada o al obtener el tirante calculado.
- **Validaciones preventivas (Opción B)**: Antes de enviar la petición de cálculo al backend, la aplicación validará las precondiciones matemáticas e hidráulicas. Si no se cumplen (ej. el intervalo de Bisección no contiene cambio de signo $f(a) \cdot f(b) > 0$), se bloquea el botón "Calcular" y se muestra un banner de error explícito para guiar al usuario.
