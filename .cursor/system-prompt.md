# 💻 [CONTEXTO DEL SISTEMA] PLATAFORMA EDUCATIVA NEXT.JS (V. 15.3.2)
## 1. MODO DE OPERACIÓN: INVESTIGACIÓN, FUNDAMENTACIÓN Y CAUTELA (MANDATORIO)

### A. Aprobación, Cautela y No-Intervención

- **Aprobación Obligatoria:** NUNCA implemente código que modifique archivos existentes, cree nuevos archivos o implemente lógica compleja sin mi **APROBACIÓN EXPLICITA**. Presente el plan/snippet clave en el chat y espere la confirmación.
- **Modo Asesoramiento:** Si mi solicitud es una pregunta o cuestionamiento, la IA **DEBE LIMITARSE a ANALIZAR, JUSTIFICAR y EXPLICAR**. No se generará código hasta recibir una orden clara.
- **Prohibición de Documentación Física:** La IA tiene **ESTRICTAMENTE PROHIBIDO** generar o proponer la creación de archivos de documentación de tipo `.md`, `.txt` o cualquier otro formato de texto externo. Toda la información debe ser comunicada a través del chat.

### B. Fundamentación e Investigación

- **Fundamentación Obligatoria:** Toda solución debe ser BASADA, FUNDAMENTADA y JUSTIFICADA.

### C. No Invención

- **Prohibido Inventar:** Prohibido inventar URLs de API o estructuras de datos. Si falta información, DEBE preguntar.

## 2. COMPATIBILIDAD Y OPTIMIZACIÓN VERCEL HOBBY (PRIORIDAD ALTA)

- **Estrategia Principal:** El código debe ser diseñado para minimizar las Invocaciones de Funciones (Serverless) y la Transferencia de Datos.
- **Data Fetching:** Uso estratégico del caching de Next.js (revalidación basada en tiempo o a demanda) para evitar peticiones repetitivas.

## 3. STACK TECNOLÓGICO Y ARQUITECTURA

| Tecnología         | Rol          | Directriz                                                                                                        |
| :----------------- | :----------- | :--------------------------------------------------------------------------------------------------------------- |
| **Framework**      | Core         | Next.js 15.3.2, App Router.                                                                                      |
| **Prioridad RSC**  | Renderizado  | **OBLIGATORIO: Server Components (RSC)** por defecto. Usar `use client` SOLO cuando sea estrictamente necesario. |
| **Idioma**         | Tipado       | TypeScript (obligatorio).                                                                                        |
| **Componentes UI** | Estética     | Exclusivamente **Shadcn UI** (usar `components/ui/*`).                                                           |
| **Fechas**         | Utilidades   | Exclusivamente **date-fns**.                                                                                     |
| **API**            | Comunicación | Usar la API nativa `fetch()` para interactuar con el backend (Express API).                                      |

## 4. ESTÁNDARES DE CÓDIGO Y DISEÑO DE INTERFAZ

### A. Estructura y Nomenclatura

- **Organización de Rutas:** Seguir la estructura `app/accounting/report`, etc.
- **Manejo de Clases:** **OBLIGATORIO** usar la utilidad `cn()` para manejar todas las clases condicionales de Tailwind.
- **Auditoría de Estilo:** El código nuevo debe ser estilística y funcionalmente idéntico a las previas. Si se detecta una mala práctica existente, sugerir refactorización antes de proceder.

### B. Diseño de Interfaz y UI Lógica (NUEVO)

- **Estructura Visual Lógica:** Al agregar o modificar cualquier interfaz o componente visual, el cambio debe ser estéticamente coherente y estructuralmente lógico.
- **Optimización de Espacio:** Si dos campos o elementos contienen poca información, se deben posicionar de forma horizontal (uno al lado del otro) en lugar de vertical, optimizando el aprovechamiento del espacio sin sacrificar la legibilidad.

### C. Diseño Web Responsivo (Requerido) 📱

- **Mobile-First:** Todo componente debe diseñarse bajo la metodología mobile-first, utilizando prefijos de Tailwind (`sm:`, `md:`, `lg:`) para asegurar una experiencia fluida en todos los tamaños de pantalla.

### D. Dominio (Contabilidad/PDFs)

- **Lógica de PDFs:** Encapsulada en un **Client Component** para interactuar con el DOM, pero con obtención de datos eficiente desde el servidor.
- **Tipado Estricto:** Uso obligatorio de interfaces TypeScript en `/models/` o props fuertemente tipadas.

## 5. ESTRATEGIA DE TESTING (CALIDAD Y COBERTURA)

### A. Herramientas y Principios

- **Framework:** Jest o Vitest con React Testing Library (RTL).
- **Mocks:** Mock Service Worker (MSW) para simular la API de Express.
- **Cobertura Contable:** Cobertura mínima del **90%** en lógica contable, reportes y utilidades de fechas.

### B. Estructura de Pruebas

- **Ubicación:** Archivos en carpeta `__tests__` adyacente o convención `.test.ts/tsx`.
- **Nomenclatura:** Estructura clara usando `describe()` e `it('should...')`.
