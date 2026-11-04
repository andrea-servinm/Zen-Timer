# Calma — Temporizador de meditación

Calma es una aplicación web minimalista para acompañar sesiones de meditación y respiración. El temporizador es el centro de la experiencia: muestra el tiempo restante y, en las prácticas guiadas, indica la fase de respiración sin llenar la pantalla de distracciones.

La interfaz está en español y funciona en escritorio y dispositivos móviles. No requiere una cuenta; las preferencias se guardan localmente en el navegador.

## Qué incluye

- **Atención plena:** temporizador libre para volver la atención a la respiración.
- **Respiración en caja:** ciclos de inhalar, sostener, exhalar y sostener, con una cuenta de 4 segundos por fase.
- **Respiración 4–7–8:** inhalar durante 4 segundos, sostener durante 7 y exhalar durante 8.
- **Respiración pausada:** inhalar durante 4 segundos y exhalar durante 6.
- **Temporizador configurable:** duraciones predefinidas de 5, 10, 15, 20 y 25 minutos, además de una duración personalizada de 1 a 120 minutos.
- **Controles de sesión:** comenzar, pausar, reanudar y reiniciar el temporizador.
- **Campana:** sonido al completar la sesión; está activada inicialmente y se puede desactivar.
- **Avisos intermedios:** opción de recibir un sonido cada 5, 10 o 15 minutos. Para oírlos, la campana debe estar activada.
- **Preferencias locales:** se recuerdan la práctica, duración, campana y frecuencia de avisos en el navegador.
- **Información y seguridad:** incluye referencias sobre las prácticas y una indicación para detenerse si aparece incomodidad.

## Cómo usar el temporizador

1. Elige una práctica de meditación o respiración.
2. Selecciona una duración predefinida o introduce una duración personalizada y pulsa **Aplicar**.
3. Si quieres escuchar sonidos, deja activa **Campana**. Opcionalmente, selecciona un intervalo en **Avisos**.
4. Pulsa **Comenzar**. Puedes pausar y reanudar la sesión, o reiniciarla cuando quieras.

En las prácticas de respiración, la indicación de fase acompaña el ciclo mientras el temporizador está en marcha. La campana también suena al finalizar, siempre que esté activada.

## Desarrollo local

El temporizador está en `artifacts/calma-timer` dentro de este workspace de pnpm.

```bash
pnpm install
pnpm --filter @workspace/calma-timer run dev
```

Para comprobar los tipos y generar la compilación de producción:

```bash
pnpm --filter @workspace/calma-timer run typecheck
pnpm --filter @workspace/calma-timer run build
```

## Tecnologías

- React
- TypeScript
- Vite
- CSS

## Autoría

Este proyecto fue realizado con **Replit** en el marco del curso **Vibe Coding con Replit** de DataCamp:

https://www.datacamp.com/courses/vibe-coding-with-replit
