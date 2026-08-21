# VALOR MÁXIMO
# MANUAL DE USUARIO & GUÍA OPERATIVA
## Panel de Administración del Catálogo de Inmuebles Comerciales (CMS)
*Versión 3.0 | Guía Completa de Operación, Plantillas e Importación Automatizada*

---

## 1. Introducción y Arquitectura del Sistema
El presente manual documenta de manera exhaustiva el funcionamiento del **Panel de Administración de Valor Máximo** (`admin.html`). Este centro de control permite gestionar de forma integral el inventario de plazas, locales y propiedades comerciales que se presentan en el portal web público.

### Capacidades Principales:
- **Gestión Visual de Catálogo**: Alta, edición, activación/ocultamiento y eliminación de inmuebles comerciales.
- **Jerarquía Fija Inteligente**: Posicionamiento prioritario automático (Plaza Riva Palacio siempre en posición #1).
- **Importación Automatizada Multi-Formato**: Lector de archivos **Excel (.xlsx, .csv)**, **Word (.docx)** y **PDF (.pdf)** que extrae simultáneamente fotografías, tablas de locales y fichas técnicas.
- **Doble Esquema de Tablas**:
  1. *Locales y Espacios*: 4 columnas estándar (`No. Local`, `Giro / Inquilino`, `Superficie m²`, `Precio`).
  2. *Datos Generales / Ficha Técnica*: 2 columnas (`Concepto / Característica`, `Valor / Descripción`).
- **Extractor de Fotografías en Alta Definición**: Importación masiva de fotos desde equipo o directamente desde folletos PDF/Word.
- **Geolocalización Universal con Live Preview**: Conversión automática de cualquier enlace de Google Maps en un mapa interactivo satelital y urbano.
- **Alta Resiliencia**: Sincronización en la nube con Supabase y respaldo de seguridad local (LocalStorage) sin pérdida de datos.

---

## 2. Acceso al Panel de Administración (Login & Seguridad)

### 2.1 Acceso al Sistema
1. Abra su navegador web e ingrese a la dirección del panel (ejemplo: `https://valormaximo.com/admin.html` o entorno local `http://localhost:8085/admin.html`).
2. **Fondo Visual DriftWall 3D**: La pantalla de acceso cuenta con un fondo tridimensional interactivo de la colección exclusiva *Valor Máximo Art*.

### 2.2 Credenciales de Acceso
- **Correo Electrónico**: `admin@valormaximo.com`
- **Contraseña Inicial**: `admin123` *(o la contraseña personalizada que haya configurado)*.
- Pulse el botón **Iniciar Sesión**.

### 2.3 Cambio de Contraseña
1. Una vez dentro del panel, en la barra superior haga clic en **🔑 Cambiar Contraseña**.
2. Ingrese su nueva clave y confirme. La contraseña se actualizará de inmediato.

### 2.4 Cierre de Sesión
- En la esquina superior derecha, haga clic en **🚪 Salir** para cerrar la sesión administrativa de forma segura.

---

## 3. Dashboard Principal y Gestión de Inmuebles

Al ingresar al panel se despliega el centro de mando:

### 3.1 Métricas en Vivo
- **Inmuebles Registrados**: Total de plazas comerciales dadas de alta en el sistema.
- **Inmuebles Activos**: Plazas actualmente visibles en el portal público.
- **Locales Disponibles**: Suma acumulada de todos los locales comerciales con estatus `DISPONIBLE`.

### 3.2 Jerarquía y Tarjetas de Inmuebles
- **Plaza Riva Palacio**: Cuenta con fijación prioritaria automática permanente en el puesto #1 del catálogo.
- Cada tarjeta muestra:
  - Fotografía de portada.
  - Título y dirección.
  - Indicador de estado: `🟢 Activa` (visible al público) o `⚪ Inactiva` (borrador privado).
  - Badge de disponibilidad (ej. `4 DISPONIBLES` en verde o `0 DISPONIBLES` en naranja).
  - Número de locales y metros cuadrados totales.

### 3.3 Acciones por Inmueble
- **✏️ Editar**: Abre la ventana completa de edición con todos los datos y fotos cargados.
- **👁️ Activar / Desactivar**: Alterna la visibilidad del inmueble en la web pública con un solo clic.
- **🗑️ Eliminar**: Elimina la propiedad tras confirmación de seguridad.

---

## 4. Estructura de la Ficha del Inmueble

Al crear un nuevo inmueble o editar uno existente, la ventana modal se organiza en pestañas de navegación rápida:

### 4.1 📝 Datos Básicos
- **Nombre del Inmueble**: Título comercial de la plaza (ej. *Plaza Riva Palacio*, *Paseo Central*, *Plaza Villada*).
- **Estatus**: `🟢 Activa (Visible al público)` o `⚪ Inactiva (Borrador oculto)`.
- **Estatus / Badge**:
  - *Automático*: El sistema calcula y asigna en tiempo real según los locales disponibles en la tabla.
  - *Personalizado*: Permite seleccionar insignias como *100% Ocupado*, *Próxima Apertura*, *Preventa*, etc.
- **Tipo de Propiedad**: Plaza Comercial, Strip Mall, Centro Comercial, Local Individual, Nave / Bodega, Terreno Comercial.
- **Descripción Comercial**: Resumen de alto impacto, ubicación estratégica, flujos peatonales y vehiculares.

### 4.2 📸 Galería de Fotografías
- **Carga desde Equipo**: Clic en **`📸 Seleccionar Fotos desde tu Equipo`** para subir imágenes en JPG, PNG o WEBP.
- **Extracción Automática**: Si sube un folleto PDF o documento Word, el sistema extrae automáticamente todas las fotografías.
- **Selección de Portada**: Haga clic en la estrella (**★**) sobre cualquier foto para designarla como la portada principal de la tarjeta.
- **Eliminación**: Pulse la **×** en la esquina superior de cualquier fotografía para removerla.

### 4.3 📍 Ubicación y Google Maps Interactivo
- **Campo Único Inteligente**: Pegue cualquier formato de enlace de Google Maps:
  - Enlaces cortos: `https://maps.app.goo.gl/...`
  - Enlaces completos: `https://www.google.com/maps/place/...`
  - Coordenadas geográficas: `19.28456, -99.65432`
  - Código de inserción HTML: `<iframe src="..."></iframe>`
- **Live Preview en Vivo**: El sistema procesa el enlace y muestra de inmediato el mapa satelital y urbano interactivo con el pin de ubicación exacto.

---

## 5. Locales y Espacios Comerciales (Tabla de 4 Columnas)

Ubicada en la sección central de la ficha. Gestiona el desglose individual de cada espacio comercial.

### 5.1 Estructura Oficial de Columnas:
| No. Local | Giro / Inquilino | Superficie (m²) | Precio |
| :--- | :--- | :--- | :--- |
| **1 PB** | House Roll | 61.95 | $450.00 |
| **2 PB** | Helados Dolphy | 61.48 | $450.00 |
| **3 PB** | DISPONIBLE | 50.00 | $450.00 |

### 5.2 Métodos de Llenado:
1. **`+ Agregar 1 Local`**: Añade una fila en blanco para captura manual directa.
2. **`📋 Pegar Celdas`**: Permite copiar un rango de celdas desde Excel (`Ctrl + C`) y pegarlas en el modal de pegado rápido.
3. **`📄 Arrastrar Archivo (Dropzone)`**: Suelte su archivo Excel, Word o PDF para procesar toda la tabla en menos de 1 segundo.
4. **Cálculo Automático de Disponibilidad**: Cada vez que una fila contenga la palabra **DISPONIBLE** en la columna *Giro*, el contador y la insignia del inmueble se actualizan en automático.

---

## 6. Datos Generales y Ficha Técnica (Tabla de 2 Columnas)

Ubicada inmediatamente debajo de la tabla de locales. Permite detallar las especificaciones físicas, legales, operativas y de equipamiento del inmueble.

### 6.1 Estructura Oficial (2 Columnas):
| Concepto / Característica | Valor / Descripción |
| :--- | :--- |
| **Superficie Total de Terreno** | 3,500.00 m² |
| **Superficie Construida** | 2,450.00 m² |
| **Niveles Comerciales** | 2 niveles (Planta Baja y Planta Alta) |
| **Cajones de Estacionamiento** | 65 cajones en sótano y exterior |
| **Marcas Ancla** | Starbucks, OXXO, Farmacias del Ahorro |
| **Uso de Suelo** | Comercial y Servicios |
| **Seguridad y Vigilancia** | Circuito cerrado CCTV 24/7 y acceso controlado |
| **Servicios e Instalaciones** | Subestación eléctrica, cisterna 50,000L, elevador |

### 6.2 Métodos de Llenado:
1. **`+ Agregar 1 Dato`**: Añade filas individuales para captura manual.
2. **`📋 Pegar Datos`**: Abre una ventana para pegar dos columnas de Excel o texto con formato `Concepto: Valor`.
3. **Auto-Importación Inteligente**: Al subir un archivo Excel, Word o PDF al dropzone, el sistema extrae e inserta estas especificaciones automáticamente.
4. **`🗑️ Limpiar`**: Reinicia la tabla de datos generales.

---

## 7. Plantilla Oficial de Excel (Doble Pestaña)

Para facilitar la captura masiva y estandarizada, el panel incluye un generador de plantilla oficial accesible desde el botón **`📥 Plantilla Excel`**.

### Estructura del Archivo (`plantilla_inmueble_completo_valormaximo.xlsx`):

#### • Hoja 1: `Locales`
Contiene el formato de 4 columnas para el inventario de espacios comerciales:
- `NO. LOCAL`
- `INQUILINO / GIRO COMERCIAL`
- `SUPERFICIE (m²)`
- `PRECIO POR m²`
- `NOTAS / ESTATUS`

#### • Hoja 2: `Datos Generales`
Contiene el formato de 2 columnas para la ficha técnica completa:
- `CONCEPTO / CARACTERÍSTICA`
- `VALOR / DESCRIPCIÓN`
*(Viene prellenada con los 8 conceptos clave más utilizados en el sector inmobiliario comercial).*

---

## 8. Guía de Importación por Tipo de Archivo

El área de arrastrar y soltar (**Dropzone**) procesa archivos de tres extensiones principales:

### 8.1 Archivos Excel (`.xlsx`, `.xls`, `.csv`)
- **Con 2 Hojas**: Lee la hoja de *Locales* para la tabla de 4 columnas y la hoja de *Datos Generales / Ficha Técnica* para la tabla de 2 columnas.
- **Con 1 Hoja**: Si solo tiene una hoja, detecta por encabezados y número de columnas qué filas corresponden a locales y cuáles a especificaciones técnicas.

### 8.2 Archivos Word (`.docx`)
- **Tablas**: Convierte automáticamente las tablas de 2 columnas en Datos Generales y las tablas de 3 o más columnas en Locales.
- **Texto con Viñetas**: Si las especificaciones están escritas en texto con dos puntos (ej. `Estacionamiento: 60 cajones`), el parser las identifica e inserta en la ficha técnica.
- **Fotografías**: Extrae todas las imágenes incrustadas en el documento Word y las añade directamente a la galería de fotos.

### 8.3 Archivos PDF (`.pdf`)
- **Extracción de Tablas y Textos**: Analiza el diseño de página, extrayendo las tablas de locales y las parejas `Concepto: Valor`.
- **Extracción de Fotos**: Escanea las páginas del PDF y extrae todas las fotos en alta resolución directamente a la galería.

---

## 9. Guardado, Respaldos y Sincronización

### 9.1 Guardado de Inmuebles
- Al hacer clic en **Guardar Inmueble**, los datos se consolidan de inmediato.
- Los cambios se sincronizan en la nube con Supabase y se actualizan al instante en el portal web público sin necesidad de recargar la página.

### 9.2 Respaldos de Seguridad (Exportar / Importar JSON)
- **📥 Exportar Catálogo JSON**: Descarga una copia de seguridad completa con todos los inmuebles, fotos, locales y fichas técnicas en un solo archivo `catalogo_valormaximo.json`.
- **📤 Importar Catálogo JSON**: Permite restaurar el catálogo completo en cualquier momento o migrar datos entre entornos de trabajo.

---

## 10. Resumen de Buenas Prácticas
1. **Imágenes de Alta Calidad**: Se recomienda que las fotos de portada tengan una resolución mínima de 1200x800 px y una relación de aspecto 16:9 o 4:3.
2. **Estatus de Disponibilidad**: Utilice siempre la palabra `DISPONIBLE` en el campo de giro cuando un local esté desocupado para que los contadores funcionen automáticamente.
3. **Ubicación en Google Maps**: Utilice el enlace que apunta al pin exacto de la plaza para que los clientes puedan trazar rutas GPS sin errores.
4. **Respaldos Periódicos**: Utilice la función *Exportar JSON* antes de realizar cambios masivos en el catálogo.

---
*Manual elaborado por el Equipo de Desarrollo de Valor Máximo | Versión 3.0 Oficial*
