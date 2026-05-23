# Manual de Usuario: CivilNumeric 🌊

Bienvenido a **CivilNumeric**, una herramienta web interactiva diseñada para la simulación hidráulica y la resolución de ecuaciones en canales abiertos. Este manual te guiará paso a paso por todas las secciones del software, explicando los conceptos de ingeniería, el uso del panel de datos y cómo interpretar los gráficos y resultados.

---

## 1. ¿Qué es CivilNumeric?
En la ingeniería civil, diseñar canales de agua (como canales de riego, alcantarillados o ríos canalizados) requiere resolver fórmulas matemáticas complejas que no se pueden despejar a mano. **CivilNumeric** automatiza estos cálculos matemáticos.

El software calcula tres escenarios hidráulicos esenciales:
1. **Tirante Normal ($y_n$)**: La altura que alcanza el agua de forma constante bajo condiciones de flujo uniforme (usando la ecuación de Manning).
2. **Tirante Crítico ($y_c$)**: La altura donde el agua fluye con la mínima energía posible para un caudal dado. Es el límite entre un flujo tranquilo y uno rápido.
3. **Resalto Hidráulico**: El fenómeno que ocurre cuando el agua pasa de un flujo muy rápido (supercrítico) a uno lento (subcrítico), generando una turbulencia que disipa energía. El programa calcula la altura final que alcanzará el agua ($y_2$) después del resalto.

Para resolver estos problemas, el software ejecuta simultáneamente **tres métodos numéricos** (Bisección, Newton-Raphson y Secante) para que puedas ver cuál de ellos encuentra la respuesta de manera más eficiente.

---

## 2. El Tablero de Control (Interfaz de Usuario)

La pantalla de CivilNumeric está dividida en dos grandes zonas: el **Panel de Entrada de Datos** (a la izquierda) y el **Panel de Resultados (Dashboard)** (a la derecha).

### 2.1 Panel de Entrada de Datos (Izquierda)
Aquí configuras la geometría y los datos del flujo del canal:

* **Tipo de Sección de Canal**: Elige la forma geométrica de tu canal:
  * **Rectangular**: Canales de concreto típicos o canales de laboratorio.
  * **Trapezoidal**: Canales de tierra o revestidos, muy comunes en riego agrícola.
  * **Triangular**: Cunetas de carreteras para evacuación de lluvias.
  * **Circular**: Tuberías de alcantarillado pluvial o sanitario que trabajan parcialmente llenas (a gravedad).
* **Tipo de Ecuación Hidráulica**: Selecciona qué problema deseas resolver (Tirante Normal, Tirante Crítico o Resalto Hidráulico).
* **Parámetros Físicos**:
  * **Plantilla, $b$ (m)**: El ancho del fondo del canal (solo para secciones rectangulares y trapezoidales).
  * **Talud, $z$ (H:1V)**: La inclinación de las paredes laterales del canal (indica cuántos metros avanza horizontalmente la pared por cada metro que sube verticalmente. Solo para trapezoidal y triangular).
  * **Diámetro, $D$ (m)**: El diámetro interno de la tubería (solo para circular).
  * **Caudal, $Q$ ($m^3/s$)**: El volumen de agua que pasa por segundo (ej. $1.5$ equivale a 1500 litros por segundo).
  * **Manning, $n$**: Coeficiente que representa la rugosidad de las paredes del canal (cuanto más áspero el material, mayor es el número. Ver tabla de referencia más adelante).
  * **Pendiente, $S_0$ (m/m)**: La inclinación longitudinal del canal (ej. una pendiente del $1\%$ se escribe como `0.01`, y una de $1$ por mil como `0.001`).
  * **Tirante $y_1$ (m)**: La altura del agua antes de que ocurra el resalto hidráulico (solo se activa en el modo de Resalto Hidráulico).

#### ⚙️ Configuración de Solvers (Ajustes Avanzados)
Al dar clic en este botón colapsable, puedes personalizar cómo los métodos matemáticos buscan la respuesta. **El programa calcula estos valores automáticamente por defecto**, pero puedes editarlos si lo deseas:
* **Bisección Límite a y b**: El rango de alturas (m) donde el programa buscará la raíz. El agua debe pasar obligatoriamente por este intervalo.
* **Newton y Secante (Semillas)**: La altura inicial estimada donde los resolvedores comenzarán a buscar (ej. comenzar la búsqueda estimando que la altura del agua será de $1.0\text{ m}$).
* **Tolerancia**: El nivel de precisión requerido (ej. `0.000001` significa que queremos una precisión de un micrómetro en la altura del agua).
* **Máx Iteraciones**: El límite de intentos que tiene el programa para encontrar la solución antes de detenerse (por seguridad).

---

### 2.2 Panel de Resultados y Dashboard (Derecha)

Una vez que haces clic en el botón azul **Calcular**, el lado derecho se activa y te muestra:

#### A. Tarjetas de Resumen de Métodos (Arriba)
Tres tarjetas que muestran en paralelo el resultado obtenido por la **Bisección**, **Newton-Raphson** y la **Secante**. Te indican:
* **Estado de Convergencia**: "Convergente" (en verde si encontró la respuesta exacta) o "No converge" (en rojo si falló).
* **Raíz ($y$)**: La altura final calculada para el agua en metros.
* **Iteraciones**: Cuántos pasos/intentos le tomó al método llegar a la respuesta. *¡El que tenga menos iteraciones es el más rápido!*

#### B. Pestañas de Visualización (Abajo)
Puedes alternar entre tres formas de visualizar los datos de tu canal:

1. **Canal (Sección SVG)**: 
   * Muestra un dibujo interactivo a escala de tu canal con las proporciones reales ingresadas.
   * El agua se dibuja de color azul a la altura exacta del tirante calculado.
   * Cuenta con etiquetas visuales dinámicas que te indican las cotas físicas ($b$, $D$, $y$).
   * A la derecha del gráfico, se muestra un cuadro con las **Propiedades Hidráulicas Finales** (Área mojada, Perímetro mojado, Radio hidráulico, Velocidad del agua, Energía, y el **Número de Froude** que te indica si el agua fluye de forma lenta y tranquila - *Subcrítico* o rápida y torrencial - *Supercrítico*).

2. **Convergencia (Error)**:
   * Un gráfico científico que compara la velocidad de los tres métodos.
   * El eje vertical muestra el error en escala logarítmica (cada división hacia abajo es 10 veces más pequeña).
   * **Cómo leerlo**: La línea que caiga más verticalmente y llegue más rápido al fondo es el método más eficiente. Newton-Raphson suele ser el más rápido (línea verde), seguido de la Secante (línea violeta) y la Bisección (línea naranja).

3. **Tablas de Iteración**:
   * Muestra el paso a paso detallado de los cálculos numéricos de cada método (puedes alternar entre ellos con botones).
   * Columnas:
     * **Iteración ($k$)**: El número del paso.
     * **Valor ($x_k$)**: La estimación de la altura del agua en ese paso.
     * **Residuo ($f(x_k)$)**: Qué tan lejos está la estimación de cumplir la ecuación (debe acercarse a cero).
     * **Error Relativo**: La diferencia porcentual de cambio respecto al paso anterior. El cálculo se detiene cuando este valor es menor a la tolerancia.

---

## 3. Guía Rápida de Parámetros Físicos y Coeficientes

### Coeficiente de Rugosidad de Manning ($n$)
Es un valor adimensional que representa la resistencia que oponen las paredes del canal al movimiento del agua. Utiliza estos valores de referencia estándar al ingresar tus datos:

| Material del Canal | Valor de Manning ($n$) recomendado |
| :--- | :--- |
| Plástico / Vidrio (Laboratorio) | 0.009 - 0.010 |
| Metal liso / Tubería PVC | 0.011 - 0.012 |
| Concreto bien terminado / Cemento liso | 0.013 - 0.014 |
| Concreto rugoso / Albañilería de piedra | 0.015 - 0.018 |
| Canales de tierra limpios y uniformes | 0.020 - 0.025 |
| Canales de tierra con vegetación y maleza | 0.030 - 0.040 |
| Ríos naturales limpios y rectos | 0.030 - 0.035 |

---

## 4. Ejemplo Práctico: Diseño de un Canal Trapezoidal de Riego

Supongamos que deseas calcular qué altura alcanzará el agua (Tirante Normal) en un canal de riego de concreto con las siguientes características:
* Caudal de diseño ($Q$): **$1.8\text{ m}^3\text{/s}$**
* Plantilla del fondo ($b$): **$1.5\text{ m}$**
* Pendiente del terreno ($S_0$): **$0.2\%$** (se escribe como **`0.002`**)
* Talud lateral ($z$): **$1.0$** (paredes inclinadas a 45 grados)
* Material: Concreto semi-rugoso ($n$): **`0.015`**

### Pasos en la Pantalla:
1. En **Tipo de Sección**, selecciona `Trapezoidal`.
2. En **Tipo de Ecuación**, selecciona `Tirante Normal (Manning)`.
3. En el formulario de parámetros, escribe:
   * Plantilla, b (m): `1.5`
   * Talud, z (H:1V): `1.0`
   * Caudal, Q (m³/s): `1.8`
   * Manning, n: `0.015`
   * Pendiente, S₀ (m/m): `0.002`
4. Observa el panel de alertas. Si todo está correcto, no habrá mensajes rojos y las semillas iniciales se habrán calculado solas.
5. Haz clic en el botón azul **Calcular**.
6. **Resultados obtenidos**:
   * En la pestaña **Canal (Sección SVG)** verás el dibujo del canal trapezoidal con agua. Verás que el tirante normal es de **$0.7397\text{ m}$**. El canal tiene un régimen *Subcrítico* (flujo lento y tranquilo, Froude $\approx 0.69$).
   * En la pestaña **Convergencia** verás cómo Newton-Raphson resolvió el problema en apenas 4 iteraciones, mientras que a la Bisección le tomó 19 pasos.

---

## 5. Solución de Problemas y Mensajes de Advertencia

### ⚠️ Mensaje: "Sin cambio de signo. El intervalo de Bisección no contiene un cambio de signo..."
* **Qué significa**: El método de Bisección requiere obligatoriamente que la respuesta correcta se encuentre dentro del intervalo que definiste en `bisect_a` y `bisect_b`. Si la altura real del agua está fuera de ese rango (por ejemplo, el agua alcanzará $2.5\text{ m}$ de altura, pero tu intervalo de búsqueda configurado es de $0.01$ a $2.0\text{ m}$), el programa no puede calcular.
* **Cómo solucionarlo**: Abre la **Configuración de Solvers**, marca la casilla "Personalizar semillas de búsqueda" y amplía el intervalo de búsqueda. Por ejemplo, si el límite superior `bisect_b` estaba en `2.0`, súbelo a `5.0` o `10.0`. El botón "Calcular" se habilitará de nuevo en cuanto el intervalo encierre la respuesta.

### ⚠️ Mensaje: "El tirante inicial y1 debe ser menor que el diámetro D"
* **Qué significa**: Estás en un canal circular (tubería) y has ingresado una altura de agua ($y_1$) mayor que el diámetro físico de la tubería, lo cual es físicamente imposible.
* **Cómo solucionarlo**: Reduce el valor de $y_1$ o aumenta el diámetro $D$ de la tubería.

### ❌ Las tres tarjetas se marcan como "No converge" tras presionar Calcular
* **Qué significa**: Los resolvedores matemáticos no pudieron encontrar un valor de altura estable en el número máximo de iteraciones configurado.
* **Cómo solucionarlo**: Esto suele ocurrir si la pendiente ($S_0$) o el caudal ($Q$) son exageradamente grandes o pequeños, lo que genera ecuaciones muy inestables. Revisa que no hayas olvidado un decimal al escribir (ej. escribir pendiente `0.2` en lugar de `0.002` hace que el canal sea 100 veces más empinado de lo real).
* **Segunda solución**: Aumenta el valor de "Máx Iteraciones" a `200` o `300` en el panel avanzado.
