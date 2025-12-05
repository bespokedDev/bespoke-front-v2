# 💻 [CONTEXTO DEL SISTEMA] PLATAFORMA EDUCATIVA NEXT.JS (V. 15.3.2)

## 1. MODO DE OPERACIÓN: INVESTIGACIÓN, FUNDAMENTACIÓN Y CAUTELA (MANDATORIO)

### A. Aprobación, Cautela y No-Intervención (NUEVO REFUERZO)
- **Aprobación Obligatoria:** NUNCA implemente código que modifique archivos existentes, cree nuevos archivos o implemente lógica compleja sin mi **APROBACIÓN EXPLICITA**. Presente el plan/snippet clave en el chat y espere la confirmación.
- **Modo Asesoramiento:** Si mi solicitud es una pregunta ("¿Por qué usar MSW?") o un cuestionamiento ("¿Deberíamos usar Client Components aquí?"), la IA **DEBE LIMITARSE a ANALIZAR, JUSTIFICAR y EXPLICAR la situación**. En este modo, la IA **NO GENERARÁ CÓDIGO** hasta que reciba una **orden de implementación** clara.

### B. Fundamentación e Investigación
- **Fundamentación Obligatoria:** Toda solución debe ser BASADA, FUNDAMENTADA y JUSTIFICADA.

### C. No Invención
- **Prohibido Inventar:** Prohibido inventar URLs de API o estructuras de datos. Si falta información, DEBE preguntar.

## 2. COMPATIBILIDAD Y OPTIMIZACIÓN VERCEL HOBBY (PRIORIDAD ALTA)

- **Estrategia Principal:** El código debe ser diseñado para minimizar las **Invocaciones de Funciones (Serverless)** y la **Transferencia de Datos** para mantenerse dentro de los límites del plan gratuito de Vercel.
- **Data Fetching:** Cuando se use `fetch()` en un Server Component, la IA DEBE considerar el potencial de **caching de Next.js** (revalidación basada en tiempo o a demanda) para evitar peticiones repetitivas a la API.
- **Reutilización:** La regla de reutilización de componentes se refuerza como medida de ahorro de recursos (*bundle* pequeño).

## 3. STACK TECNOLÓGICO Y ARQUITECTURA

| Tecnología | Rol | Directriz |
| :--- | :--- | :--- |
| **Framework** | Core | Next.js 15.3.2, App Router. |
| **Prioridad RSC** | Renderizado | **OBLIGATORIO: Server Components (RSC)** por defecto para todas las páginas y componentes que obtienen datos/renderizan UI. Usar `use client` SOLO cuando sea estrictamente necesario. |
| **Idioma** | Tipado | TypeScript (obligatorio). |
| **Componentes UI** | Estética | Exclusivamente **Shadcn UI** (usar `components/ui/*`). |
| **Fechas** | Utilidades | Exclusivamente **date-fns**. |
| **API** | Comunicación | Usar la API nativa `fetch()` para interactuar con el backend (Express API). |

## 4. ESTÁNDARES DE CÓDIGO

### A. Estructura y Nomenclatura
- **Organización de Rutas:** Seguir la estructura `app/accounting/report`, etc.
- **Manejo de Clases:** **OBLIGATORIO** usar la utilidad `cn()` para manejar todas las clases condicionales de Tailwind.
- **Estilos Inline:** Permitido solo cuando es estrictamente necesario para un valor dinámico.
- **Homogeneidad y Mejora (AUDITORÍA DE ESTILO):** La IA DEBE analizar el estilo y las convenciones de los archivos ya existentes en el proyecto. El código nuevo **DEBE SER ESTILÍSTICA Y FUNCIONALMENTE IDÉNTICO** a las implementaciones previas. SIN EMBARGO, si la IA detecta que una convención existente (ej. tipado, manejo asíncrono, estructura de componentes) está **mal implementada, es ineficiente o no sigue las mejores prácticas de Next.js/TypeScript**, debe **sugerir una refactorización de la convención actual** en el chat ANTES de generar código nuevo, esperando mi confirmación para el cambio.

### B. Dominio (Contabilidad/PDFs)
- **Lógica de PDFs:** La lógica de `html2canvas` y `jspdf` debe estar encapsulada en un **Client Component** para interactuar con el DOM, pero el *trigger* inicial y la obtención de datos deben ser eficientes.
- **Tipado Estricto:** Los datos de contabilidad, reportes y fechas deben usar interfaces TypeScript definidas en `/models/` o pasadas como *props* fuertemente tipadas.

### C. Diseño Web Responsivo (Requerido) 📱
| Prioridad | Rol | Directriz |
| :--- | :--- | :--- |
| **ALTA** | **Responsividad (RWD)** | **OBLIGATORIO: Diseño Web Responsivo (RWD).** Todo componente y *layout* debe diseñarse de forma ***mobile-first***. La IA debe usar prefijos de Tailwind (`sm:`, `md:`, `lg:`) para asegurar una experiencia óptima en todos los tamaños de pantalla. |

## 5. ESTRATEGIA DE TESTING (CALIDAD Y COBERTURA)

### A. Herramientas Obligatorias
- **Framework:** Usar **Jest** (o **Vitest** si se prefiere) para pruebas unitarias y de integración.
- **Librería de Componentes:** Usar **React Testing Library (RTL)** para pruebas de componentes.
- **Mocks:** Usar **Mock Service Worker (MSW)** para simular respuestas de la API de Express durante las pruebas de integración.

### B. Principios de Pruebas (Prioridad)
- **Regla RTL:** Priorizar las pruebas basadas en el **comportamiento del usuario** sobre la implementación interna.
- **Cobertura Contable:** Los *hooks* y las utilidades relacionadas con lógica **contable, reportes y manipulación de fechas (date-fns)** deben tener una cobertura de pruebas unitarias mínima del **90%**.
- **Pruebas de Integración:** Toda interacción con el *caching* de Next.js y las llamadas *fetch* deben ser probadas como pruebas de integración.

### C. Estructura de Archivos de Pruebas
- **Ubicación:** Los archivos de prueba deben residir en una carpeta **`__tests__`** adyacente al archivo que están probando, o usar la convención **`.test.ts` / `.test.tsx`**.
- **Nomenclatura:** Usar la descripción `describe('NombreComponente', () => { ... })` y el formato `it('should [comportamiento esperado]', () => { ... })` para claridad.