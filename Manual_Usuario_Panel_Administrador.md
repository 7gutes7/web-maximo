# VALOR MÁXIMO
# MANUAL DE USUARIO & GUÍA OPERATIVA
## Panel de Administración del Catálogo Inmobiliario (CMS)
*Versión 4.5 Oficial Definitiva | Con Capturas de Pantalla y Guía Operativa Completa*

---

## 1. Introducción y Arquitectura del Sistema

El **Panel de Administración** (`admin.html`) es el centro de mando integral para gestionar el catálogo de plazas y propiedades comerciales de **Valor Máximo**.

### Capacidades Principales:
- **Gestión Visual de Catálogo**: Alta, edición modular, activación/ocultamiento y eliminación de inmuebles comerciales.
- **Jerarquía Prioritaria Inteligente**: Posicionamiento automático permanente con **Plaza Riva Palacio siempre en el puesto #1**.
- **Guardado y Publicación en Servidor en Tiempo Real**: Al guardar un inmueble, los cambios se escriben de inmediato en el servidor web (`save_catalog.php` / `data/catalogo.json`) y en la memoria local, reflejándose al instante para todos los visitantes en internet.
- **Importación Automatizada Multi-Formato**: Lector de archivos **Excel (.xlsx, .csv)**, **Word (.docx)** y **PDF (.pdf)** que extrae en un solo paso fotos en alta resolución, inventario de locales y fichas técnicas de 2 columnas.
- **Doble Esquema de Tablas**:
  1. *Locales y Espacios (4 Columnas)*: `No. Local`, `Giro / Inquilino`, `Superficie m²`, `Precio`.
  2. *Datos Generales / Ficha Técnica (2 Columnas)*: `Concepto / Característica`, `Valor / Descripción`.
- **Geolocalización Universal con Live Preview**: Conversión de cualquier enlace de Google Maps en un mapa interactivo satelital y urbano en vivo.
- **Respaldos Instantáneos**: Botones dedicados para descargar (`📥 Descargar JSON`) y restaurar (`📤 Cargar Catálogo JSON`) toda la base de datos con 0ms de pérdida.

---

## 2. Acceso al Panel de Administración (Login & Seguridad)

### 2.1 Acceso al Sistema
1. Abra su navegador web e ingrese a la dirección del panel (ejemplo: `https://valormaximo.com/admin.html` o `http://localhost:8085/admin.html` en local).
2. La pantalla de acceso cuenta con un fondo interactivo 3D (*DriftWall*) compuesto por fotografías de la colección *Valor Máximo Art*.
3. Ingrese las credenciales de acceso oficiales:
   - **Correo Electrónico**: `admin@valormaximo.com`
   - **Contraseña Inicial**: `admin123` *(o su clave personalizada)*
4. Pulse el botón **Iniciar Sesión**.

![Pantalla de Inicio de Sesión con Fondo 3D DriftWall](manual_assets/01_login_driftwall.png)

---

## 3. Dashboard Principal y Métricas en Vivo

Al autenticarse, el sistema presenta el centro de mando general con el catálogo completo de inmuebles:

![Dashboard Principal con Métricas en Vivo y Catálogo de Inmuebles](manual_assets/02_dashboard_overview.png)

### 3.1 Componentes de la Barra Superior
- **Logotipo de Valor Máximo**: Identidad corporativa de la plataforma.
- **`📤 Cargar Catálogo JSON`**: Permite restaurar o subir una copia de seguridad completa con todas las plazas en 1 solo clic.
- **`📥 Descargar JSON`**: Descarga un respaldo integral del catálogo (`catalogo.json`).
- **`+ Nuevo Inmueble`**: Abre el formulario en blanco para registrar una nueva propiedad comercial.
- **`🔑 Cambiar Contraseña`**: Abre la ventana de actualización de credenciales.
- **`🚪 Salir`**: Cierra la sesión activa de forma segura.

### 3.2 Métricas en Vivo
- **Inmuebles Registrados**: Total de plazas dadas de alta en el sistema.
- **Inmuebles Activos**: Plazas actualmente visibles en el portal web público.
- **Locales Disponibles**: Suma acumulada de todos los locales comerciales con estatus `DISPONIBLE`.

### 3.3 Tarjetas del Catálogo
- **Plaza Riva Palacio**: Fijada permanentemente en el puesto #1 del catálogo.
- Cada tarjeta muestra: Foto de portada, título, dirección, estado (`🟢 Activa` o `⚪ Inactiva`), badge de disponibilidad (`X DISPONIBLES` en verde / `0 DISPONIBLES` en naranja), número de locales y metros cuadrados totales.
- **Acciones en Tarjeta**:
  - **`✏️ Editar`**: Abre la ventana de configuración del inmueble.
  - **`👁️ Activar / Ocultar`**: Alterna la visibilidad pública con un solo clic.
  - **`🗑️ Eliminar`**: Elimina la propiedad tras confirmación de seguridad.

---

## 4. Configuración de la Ficha del Inmueble

Al hacer clic en **`+ Nuevo Inmueble`** o **`✏️ Editar`**, se abre la ventana modular organizada en 5 pestañas de navegación rápida:

![Ventana Modal de Edición - Pestañas y Datos Básicos](manual_assets/03_modal_datos_basicos.png)

### 4.1 Datos Básicos
- **Nombre del Inmueble**: Título comercial de la plaza (ej. *Plaza Riva Palacio*, *Paseo Central*).
- **Subtítulo / Tipo**: Categoría comercial (ej. *Back Shops*, *Anchor*, *Strip Mall*).
- **Estatus**: `🟢 Activa (Visible al público)` o `⚪ Inactiva (Borrador)`.
- **Estatus / Badge**:
  - *Automático*: Calculado en tiempo real según los locales vacantes en la tabla de locales.
  - *Personalizado*: Insignias como *100% Ocupado*, *Próxima Apertura*, *Preventa*.
- **Tipo de Propiedad**: Plaza Comercial, Strip Mall, Centro Comercial, Local Individual, Nave / Bodega, Terreno Comercial.
- **Descripción Comercial**: Resumen de atributos, flujos peatonales, vehiculares y ventajas comerciales.

---

## 5. Galería de Fotografías

![Galería de Fotos con Selector de Portada y Botones de Eliminación](manual_assets/04_modal_galeria_fotos.png)

### 5.1 Operación de la Galería
1. **Carga desde Equipo**: Haga clic en **`📸 Seleccionar Fotos desde tu Equipo`** para subir múltiples imágenes (JPG, PNG, WEBP).
2. **Extracción desde Documentos**: Al arrastrar un archivo Word o PDF al dropzone, todas las fotos incrustadas en HD se extraen y se integran automáticamente.
3. **Selección de Portada Principal (★)**: Haga clic en la estrella sobre cualquier foto para fijarla como la portada principal de la tarjeta en el catálogo público.
4. **Eliminación**: Pulse la **×** roja en la esquina superior de cualquier fotografía para descartarla.

---

## 6. Ubicación y Google Maps Interactivo con Live Preview

![Parser Universal de Google Maps con Previsualización en Vivo](manual_assets/05_modal_mapa_preview.png)

### 6.1 Entrada Universal de Enlaces
Pegue cualquier formato de enlace de Google Maps en el campo **Ubicación Google Maps**:
- **Enlaces cortos**: `https://maps.app.goo.gl/...`
- **URLs completas**: `https://www.google.com/maps/place/...`
- **Coordenadas GPS**: `19.28456, -99.65432`
- **Código HTML de inserción**: `<iframe src="..."></iframe>`

### 6.2 Previsualización Interactiva en Vivo
El sistema procesa el enlace y muestra inmediatamente el mapa interactivo satelital y urbano con el pin exacto de la ubicación antes de guardar.

---

## 7. Locales y Espacios Comerciales (Tabla de 4 Columnas)

![Tabla de Locales (4 Columnas) y Dropzone Multi-Formato](manual_assets/06_modal_tabla_locales.png)

### 7.1 Estructura Oficial de Columnas
| No. Local | Giro / Inquilino | Superficie (m²) | Precio |
| :--- | :--- | :--- | :--- |
| **1 PB** | House Roll | 61.95 | $450.00 |
| **2 PB** | Helados Dolphy | 61.48 | $450.00 |
| **3 PB** | DISPONIBLE | 50.00 | $450.00 |

### 7.2 Métodos de Captura
- **`+ Agregar 1 Local`**: Añade una fila en blanco para captura manual.
- **`📋 Pegar Celdas`**: Abre el modal para pegar un rango de celdas copiadas directamente desde Excel.
- **`📥 Plantilla Excel`**: Descarga la plantilla oficial prellenada con las 2 hojas (*Locales* y *Datos Generales*).
- **Cálculo Automático de Disponibilidad**: Cualquier fila que tenga la palabra **`DISPONIBLE`** en la columna *Giro* suma automáticamente al contador de vacantes y actualiza el badge público de la plaza.

![Modal de Pegado Rápido de Celdas de Excel](manual_assets/07_modal_pegar_locales.png)

---

## 8. Datos Generales y Ficha Técnica (Tabla de 2 Columnas)

Ubicada inmediatamente debajo de la tabla de locales. Permite registrar las especificaciones técnicas y operativas completas:

![Tabla de Datos Generales y Ficha Técnica (2 Columnas)](manual_assets/08_modal_ficha_tecnica.png)

### 8.1 Estructura Oficial (2 Columnas)
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

### 8.2 Métodos de Captura
- **`+ Agregar 1 Dato`**: Añade una fila para captura manual.
- **`📋 Pegar Datos`**: Abre el modal de pegado rápido para insertar 2 columnas desde Excel o texto con formato `Concepto: Valor`.
- **Auto-Extracción**: El dropzone lee automáticamente estas especificaciones desde hojas de Excel, tablas Word o párrafos PDF.

![Modal para Pegar Datos Generales (2 Columnas)](manual_assets/09_modal_pegar_ficha.png)

---

## 9. Plantilla Oficial de Excel (Doble Pestaña) y Dropzone Multi-Formato

Al pulsar el botón **`📥 Plantilla Excel`**, se descarga el archivo `plantilla_inmueble_completo_valormaximo.xlsx` estructurado en 2 hojas oficiales:
1. **Hoja 1 (`Locales` - 4 Columnas)**: Formato para el desglose de espacios comerciales.
2. **Hoja 2 (`Datos Generales` - 2 Columnas)**: Formato para la ficha técnica y especificaciones de la plaza.

### Compatibilidad del Dropzone:
- **Excel (`.xlsx`, `.csv`)**: Procesa ambas hojas o divisiones automáticamente en un solo paso.
- **Word (`.docx`)**: Convierte tablas de 2 columnas en Ficha Técnica, tablas de 3+ columnas en Locales, extrae pares `Concepto: Valor` y todas las fotografías incrustadas en HD.
- **PDF (`.pdf`)**: Extrae tablas de locales, datos generales en texto y todas las fotografías incrustadas.

---

## 10. Guardado, Publicación en Internet y Seguridad

### 10.1 Doble Botón de Guardado
Para agilizar la captura, la ventana modal cuenta con dos botones de guardado:
- **Botón Superior Fijo**: Ubicado en la cabecera modal (`💾 Guardar Inmueble`), siempre a la vista sin importar cuánto te desplaces.
- **Botón Inferior**: Ubicado en el pie del formulario.

Al pulsar cualquiera de los dos botones, los datos se consolidan, se guardan en el servidor de tu dominio vía `save_catalog.php` y se reflejan de inmediato en la web pública para todos los visitantes.

### 10.2 Cambio de Contraseña de Administrador
![Modal de Cambio de Contraseña](manual_assets/10_modal_cambiar_password.png)

1. En la barra superior, pulse **`🔑 Cambiar Contraseña`**.
2. Ingrese su nueva clave en el campo correspondiente y pulse **Guardar Contraseña**.
3. La nueva credencial tendrá efecto inmediato.

---
*Manual Oficial de Operación | Valor Máximo CMS v4.5 | Todos los derechos reservados*
