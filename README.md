# CivilNumeric 🌊

**CivilNumeric** es un software interactivo de nivel profesional para la resolución de ecuaciones no lineales aplicadas a la **Hidráulica de Canales Abiertos**. Diseñado con un enfoque didáctico y científico, permite calcular variables críticas de canales y comparar en tiempo real el comportamiento y convergencia de tres métodos numéricos clásicos ejecutados en paralelo:
1. **Bisección**
2. **Newton-Raphson** (con diferenciación simbólica exacta usando SymPy)
3. **Secante**

La interfaz cuenta con un sofisticado tema **Tech Dark Mode** con efectos de *Glassmorphic*, visualizaciones gráficas de error en escala logarítmica y un esquema vectorial dinámico SVG del canal.

---

## 🚀 Características Clave

* **Cálculos Hidráulicos Integrados**:
  * **Tirante Normal ($y_n$)**: Solución a la ecuación de Manning.
  * **Tirante Crítico ($y_c$)**: Solución al estado crítico de flujo de energía mínima.
  * **Resalto Hidráulico**: Solución a la ecuación de conservación de momentum para encontrar el tirante conjugado $y_2$ a partir del tirante supercrítico $y_1$.
* **Secciones Geométricas Soportadas**: Rectangular, Trapezoidal, Triangular y Circular.
* **Dashboard Comparativo Unificado**:
  * **Tarjetas de Resumen**: Comparación instantánea de raíces encontradas, número de iteraciones y estado de convergencia.
  * **Gráfica de Errores Semilogarítmica**: Ploteo interactivo del error relativo vs. número de iteración para visualizar la tasa de convergencia de cada método.
  * **Canal SVG Dinámico**: Dibujo vectorial a escala del canal seleccionado con simulación animada de flujo de agua y etiquetas de cotas físicas.
  * **Tablas Detalladas**: Visualización lado a lado de las iteraciones completas de los tres resolvedores.
* **Validación Preventiva Robusta**: Comprobación del cambio de signo para Bisección ($f(a) \cdot f(b) \le 0$) e integridad física de los inputs antes de realizar el cómputo.

---

## 🛠️ Stack Tecnológico

* **Backend**:
  * **FastAPI** (Servidor API REST y servidor de estáticos de producción)
  * **SymPy** (Cálculo simbólico y derivadas analíticas exactas)
  * **NumPy** (Evaluaciones vectoriales matemáticas)
  * **pytest** (Pruebas unitarias y de integración)
* **Frontend**:
  * **React 18 (TypeScript)**
  * **Vite** (Herramienta de desarrollo y construcción)
  * **Recharts** (Visualizaciones gráficas interactivas)
  * **Lucide React** (Paquete de iconos vectoriales)
  * **Vanilla CSS** (Diseño y efectos Glassmorphic)

---

## 📋 Prerrequisitos

Para ejecutar este proyecto de forma local, necesitas tener instalado:
* **Python 3.10 o superior** (con pip)
* **Node.js 18 o superior** (con npm, opcional, requerido solo para desarrollo frontend)

---

## ⚙️ Pasos de Ejecución

### 🛠️ Configuración Inicial (Primer uso)
Instala de manera automática todas las dependencias requeridas (tanto del frontend en Node como del backend en Python):

1. **Instalar dependencias de Python (en la raíz)**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Instalar dependencias de Node (tanto raíz como frontend)**:
   Desde la raíz del proyecto, ejecuta:
   ```bash
   npm run setup
   ```

---

### Opción A: Modo Producción Integrado (Un solo comando)
En este modo, FastAPI sirve la interfaz de usuario React pre-compilada y procesa la API en el puerto `8000`. No requiere correr servidores de desarrollo.

1. **Compilar el frontend (si has hecho cambios)**:
   ```bash
   npm run build
   ```

2. **Iniciar la aplicación unificada**:
   ```bash
   npm start
   ```
   *Acceso:* Abre tu navegador en **[http://localhost:8000](http://localhost:8000)**.

---

### Opción B: Modo Desarrollo Concurrente (Un solo comando)
Si deseas modificar el código del backend o del frontend y ver las actualizaciones en tiempo real (*Hot-Reloading*), puedes correr ambos servidores simultáneamente con un solo comando:

1. **Iniciar servidores de desarrollo en paralelo**:
   ```bash
   npm run dev
   ```
   *Acceso:* Abre tu navegador en la dirección del frontend **[http://localhost:5173](http://localhost:5173)**. Los cambios en los archivos se reflejarán instantáneamente en pantalla y la API procesará las llamadas en segundo plano de manera transparente.


---

## 🧪 Ejecución de Pruebas

### Backend (`pytest`)
Para validar las ecuaciones geométricas, los resolvedores numéricos y el comportamiento del API REST, corre desde la raíz del proyecto:
```bash
python -m pytest
```

### Frontend (Compilación y Tipado)
Para comprobar que no existan errores de TypeScript, imports rotos o warnings en los componentes React de la interfaz de usuario:
```bash
cd frontend
npm run build
```

---

## 📂 Estructura del Proyecto

```text
civilnumeric/
├── backend/                  # Código Python (FastAPI)
│   ├── main.py               # Servidor Web y endpoints de cálculo
│   ├── solvers.py            # Resolvedores: Bisección, Newton-Raphson, Secante
│   ├── hydraulics.py         # Fórmulas geométricas e hidráulicas
│   └── test_backend.py       # Pruebas unitarias (pytest)
├── frontend/                 # Código React + TypeScript (Vite)
│   ├── src/
│   │   ├── App.tsx           # Componente React principal
│   │   └── App.css           # Estilos de interfaz (Glassmorphism / Modo Oscuro)
│   └── dist/                 # Carpeta compilada de producción (servida por FastAPI)
├── PROJECT_CONTEXT.md        # Especificación técnica del proyecto (PRD)
├── requirements.txt          # Dependencias de Python
└── README.md                 # Documentación del proyecto
```
