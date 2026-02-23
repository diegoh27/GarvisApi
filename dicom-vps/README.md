# DICOM VPS — Orthanc + OHIF + Gateway

Archivos para desplegar en `/root/dicom/` del VPS.

## Uso

```bash
cd /root/dicom
docker compose up -d
```

## Backend (Express)

En el `.env` del API, configura:

```
ORTHANC_URL=http://127.0.0.1:8088/orthanc
OHIF_BASE_URL=https://ohif.garbis.online
ORTHANC_ADMIN_USER=admin
ORTHANC_ADMIN_PASS=zulfa12345
```

## Estructura

| Archivo           | Descripción                            |
|-------------------|----------------------------------------|
| docker-compose.yml| Orthanc, OHIF, gateway nginx           |
| nginx.conf        | Gateway: / → OHIF, /orthanc → Orthanc, /dicom-web → Orthanc |
| ohif-app-config.js| Config del viewer OHIF                 |
| orthanc.json      | Orthanc con auth (admin / zulfa12345)  |

## Nginx del VPS

El `vps.conf` debe tener un `server` para `ohif.garbis.online` que haga `proxy_pass http://127.0.0.1:8088/`.
