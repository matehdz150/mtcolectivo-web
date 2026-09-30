This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Conexión con el backend

La app usa el backend de `../mtcolectivo-infra` (API Gateway + Cognito). Copia `.env.example` a `.env.local` y llena
los valores con `terraform output` de ese proyecto:

- `NEXT_PUBLIC_API_URL` — URL del API.
- `NEXT_PUBLIC_COGNITO_CLIENT_ID` y `NEXT_PUBLIC_COGNITO_REGION` — login.

El login corre en el navegador (el sitio es una exportación estática), y las peticiones llevan el token de Cognito.
Para que el web funcione desde otra URL, agrégala a `cors_origins` en `mtcolectivo-infra/terraform/mtcolectivo.tfvars`.

## Código compartido con el backend

La vista previa de la orden se dibuja en el navegador con el mismo código que arma el PDF real. Ese código vive en
`../mtcolectivo-infra/packages/{core,pdf}` y se copia a `src/shared` (no editar ahí). Después de cambiar precios,
variables, plantillas o el generador de PDF en infra, corre `npm run sync:shared`.
