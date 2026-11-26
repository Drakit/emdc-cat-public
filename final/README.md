# EMDC-LD01 V2.0 FINAL — preparación de producción
**Estado: candidato sin catálogo autorizado (26-11-2026).** No sustituye RC2b ni B01. No contiene datos ficticios ni importa archivos privados.
- Entrada: index.html. Integración: blogger.html?embed=1 y blogger-embed.txt.
- catalog-source.json es el índice central. PENDING_APPROVAL con segments vacío muestra un catálogo pendiente, no una demostración.
- Para publicar: revisar y aprobar explícitamente la proyección de datos, derechos y campos; generar los segmentos con el exportador local de revisión. No subir el intercambio CAT ni el paquete privado de revisión.
- Los segmentos tienen rutas data/<sha256>.json (o URL HTTPS de un alojamiento aprobado), conteos por nivel e identidad de fabricante. Se comprueba SHA-256 de los bytes recibidos y se bloquea la carga si falla. El modo Todos descarga los segmentos en lotes de cuatro; la primera visita descarga solo el índice. Reutiliza segmentos en memoria durante la sesión.
- Versionado: subir primero los nuevos segmentos inmutables, verificar sus hashes y solo entonces cambiar el manifiesto activo. Conservar una copia de los manifiestos anteriores fuera de la ruta activa y sus segmentos mientras sean necesarios para restaurar. No duplicar archivos idénticos. Para una fuente remota, configurar HTTPS, CORS y evitar autenticación con secretos en el navegador.
- Los registros públicos conservan IDs, relaciones, estados documentales y perfiles explícitos. No se promociona un candidato a perfil activo. El motor admite campos escalares, listas simples y determinados objetos de medida. No equivale a la implementación completa de UNI.
- Las fichas se enlazan solo mediante URL explícitas de EMDC. No se han encontrado asociaciones en la versión examinada. No se publican fotos automáticamente.
- Biblioteca administrable: el manifiesto admite listas de criterios compatibles con EMDC-LD01-2.0 y su ámbito scope. Los enlaces compartibles conservan criterios y ámbito, no filas.
- Integración B01 con ajuste de altura y comunicación restringida a los dos blogs autorizados. No se ha instalado FINAL en Blogger ni verificado su despliegue gráfico.
- Reversión: mantener RC2b y su fragmento anterior; restablecer un manifiesto público compatible previamente verificado. Nunca sustituir un fallo de producción con datos ficticios.
