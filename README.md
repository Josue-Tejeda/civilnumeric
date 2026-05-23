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
* **Node.js 18 o superior** (el cual incluye **npm**).

### 🛠️ Cómo instalar Node.js y npm:
1. **Windows / macOS**:
   * Ve a la página oficial de [nodejs.org](https://nodejs.org/).
   * Descarga la versión **LTS (Long Term Support)** recomendada para la mayoría de los usuarios.
   * Ejecuta el instalador descargado y sigue los pasos del asistente (asegúrate de marcar la opción para agregar Node al PATH, seleccionada por defecto).
2. **Linux (Ubuntu/Debian)**:
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```
3. **Verificar la instalación**:
   Abre una terminal/consola y ejecuta:
   ```bash
   node -v
   npm -v
   ```
   *Deberías ver las versiones de Node y npm instaladas en tu terminal.*

---

## ⚙️ Pasos de Ejecución

### 🅰️ Opción A: Configuración Automática en Windows (Recomendada)
Si estás en una máquina de Windows que solo tiene Python instalado y quieres configurar y arrancar todo en un solo paso:

1. Abre una terminal de **PowerShell** en la carpeta raíz del proyecto.
2. Ejecuta el script de instalación automática (este script descargará e instalará Node.js si no lo tienes, instalará dependencias de Python y Node, compilará la UI e iniciará la aplicación):
   ```powershell
   powershell -ExecutionPolicy Bypass -File setup_windows.ps1
   ```
3. *Acceso:* Una vez que finalice la ejecución, abre tu navegador en **[http://localhost:8000](http://localhost:8000)**.

---

### 🅱️ Opción B: Configuración Manual paso a paso
Si prefieres instalar las dependencias y realizar el build de manera manual:

1. **Instalar dependencias de Python (en la raíz)**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Instalar dependencias de Node**:
   Desde la raíz del proyecto, ejecuta:
   ```bash
   npm run setup
   ```


---

### 🖥️ Iniciar la Aplicación (Un solo comando)
FastAPI servirá la interfaz de usuario de React y procesará la API en el puerto `8000`.

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

### ⚠️ Solución de Problemas en Windows (Execution Policy)
Si al ejecutar comandos de npm (`npm run setup`, `npm start`) o entornos virtuales en PowerShell obtienes un error indicando que **"la ejecución de scripts está deshabilitada en este sistema"**:

Esto se debe a las políticas de seguridad por defecto de Windows. Para solucionarlo, abre una terminal de **PowerShell** y ejecuta:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Confirma el cambio escribiendo `S` (o `Y`) y presionando Enter. Esto habilitará la ejecución de scripts locales firmados para tu usuario sin comprometer la seguridad global del sistema.

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
