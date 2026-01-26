# Scripts para crear usuarios Admin y Moderador

## Opción 1: Script SQL directo (requiere generar hash primero)

### Paso 1: Generar hash bcrypt

Ejecuta el siguiente comando en la terminal desde la carpeta `api`:

```bash
node src/utils/generate_user_hashes.js
```

Esto generará los hashes bcrypt para las contraseñas. Por defecto usa "admin123".

### Paso 2: Actualizar el script SQL

1. Abre `create_admin_moderador.sql`
2. Copia los hashes generados
3. Reemplaza los hashes en las líneas de `contrasena` (líneas 50 y 86)
4. Ejecuta el script en DBeaver

## Opción 2: Usar el script Node.js completo (recomendado)

Si prefieres crear los usuarios directamente desde Node.js con hashes generados automáticamente, puedes modificar el script `seed.js` o crear un script similar.

## Credenciales por defecto

- **Admin:**
  - Correo: `admin@garvis.com`
  - Contraseña: `admin123`

- **Moderador:**
  - Correo: `moderador@garvis.com`
  - Contraseña: `admin123`

## Notas importantes

- Los hashes bcrypt son únicos cada vez que se generan, incluso para la misma contraseña
- Puedes usar el mismo hash para ambos usuarios si usan la misma contraseña
- Cambia las contraseñas después del primer inicio de sesión por seguridad
