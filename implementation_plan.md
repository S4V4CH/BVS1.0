# Plan de Implementación: Frontend del Emisor de Tickets

Este plan detalla la construcción de una interfaz gráfica (Frontend) aisalda y enfocada en demostrar exhaustivamente la funcionalidad plena del Microservicio de Emisión de Tickets, sin romper su filosofía arquitectónica asíncrona.

## 1. Alineación con la Lógica de Negocio (El "Qué")

Hay que recordar un principio clave del negocio: **Este módulo (Emisor) NO lo usa directamente el estudiante**. En el flujo real de BVS, el Emisor es un servicio backend secundario; se comunica de servidor-a-servidor con el "Censo KYC".  
Por lo tanto, este frontend será un **"Admin Dashboard / Simulador de Censo"**. Su objetivo es demostrar visualmente que el microservicio funciona.

**Características de la Interfaz:**
1. **Generador de Cargas (Payload Builder):** Tendrá botones visuales para auto-generar UUIDs V4 válidos (simulando los `voteId`) y generar tokens anónimos aleatorios (`voterToken`).
2. **Terminal Visual de Trazabilidad:** Al presionar "Emitir", una consola gráfica lateral mostrará el avance: el envío del POST, la validación del Backend (Código 202 Aceptado) y dejará un botón rápido para verificar el recibo.
3. **Consumo de Stellar Explorer:** Una vez que el TxHash sea generado (vía polling suave o captura manual), el frontend desplegará un hipervínculo que abra Horizon o Stellar Expert.

## 2. Decisiones Técnicas y Estéticas (El "Cómo")

- **Tecnología Frontend:** Vanilla JavaScript puro amarrado con HTML semántico y **Vanilla CSS**. Todo empaquetado ultra-rápido usando **Vite**.
- **Estética "Premium Web 3.0":** Dado que hablamos de Blockchain, el diseño no será básico. Aplicaremos una paleta oscura sofisticada (Sleek Dark Mode), efectos *Glassmorphism* (paneles semitransparentes translúcidos), micro-animaciones al presionar botones (efecto de grabado) y tipografías puras como *Inter* o *Outfit*.
- **Estructura del Repositorio:** El código nacerá en su propio espacio independiente. Se instanciará una carpeta paralela (ej: `bvs-frontend-tester/`) que levantará su propio puerto de UI.

## 3. ¿Modificaremos el `src` del Backend y la Arquitectura Hexagonal?
**¡Absolutamente NO!** El `src` del backend emisor permanecerá intacto, inmaculado y puro. 

*El Problema Oculto:* Normalmente, cuando intentas comunicar un frontend moderno local (`puerto 5173`) contra tu backend local (`puerto 3000`), el navegador salta con un error mundial de seguridad llamado **CORS Strict Block**. Muchos programadores modificarían el backend metiendo middlewares feos (`@fastify/cors`) para solucionar el testeo local.  
*Nuestra Solución Limpia:* Configuraremos un **Proxy reverso** dentro del propio empaquetador del Frontend (`vite.config.ts`). El frontend creerá que habla consigo mismo, pero detrás de la cortina, Vite redirigirá elegantemente la conexión hacia tu API en Fastify.

## User Review Required

> [!IMPORTANT]
> **Aprobación de Diseño Frontend**  
> Tu backend actual está corriendo a salvo en la carpeta `bvs-ticket-issuer`. Voy a pararme fuera de ella y ejecutaré un comando para crear una app web de pruebas. 
>  ¿Apruebas la vía de usar **VanillaJS + Vite** con una atmósfera gráfica *Dark Mode/Blockchain* y que evite por completo manipular tu código puro Backend existente?
