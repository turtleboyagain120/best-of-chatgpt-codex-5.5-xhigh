# Signal Garden Auth Demo

This project is a dependency-free Node.js authentication demo with a protected, user-specific simulation called Signal Garden.

## What is included

- Server-side sessions with `HttpOnly` cookies
- CSRF checks for authenticated POST actions
- Password hashing with Node's built-in `crypto.scryptSync`
- Login and account creation with server-side validation
- Basic login and registration rate limiting
- Bounded request bodies and strict security headers
- Protected `/dashboard`, `/api/me`, and `/api/world` routes
- Per-user Signal Garden state stored in `data/worlds.json`

## Run it

```bash
node server.js
```

Open:

```text
http://localhost:3000
```

## Demo account

If `data/users.json` does not already contain users, the server creates:

```text
admin / Admin!2026
```

You can also create a new account from the sign-in page.

## Notes

- Sessions and rate limits are in memory, so they reset when the server restarts.
- User and world data are local JSON files for demo purposes.
- In production, move sessions and users to durable stores, serve over HTTPS, and set `NODE_ENV=production` so cookies use the `Secure` flag.
