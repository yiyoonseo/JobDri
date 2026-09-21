This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install dependencies and run the development server:

```bash
corepack pnpm install
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Analytics (Amplitude)

이벤트는 Amplitude 로 전송됩니다. 전송을 활성화하려면 `.env.local` (배포 환경은 각 환경변수 설정)에 아래 키를 추가하세요.

```bash
NEXT_PUBLIC_AMPLITUDE_API_KEY=your-amplitude-api-key
```

- 키가 없으면 전송은 비활성화되고, 개발 환경에서는 콘솔에만 이벤트가 찍힙니다.
- 이벤트 명과 속성 정의는 `src/lib/analytics/events.ts` 의 택소노미가 단일 출처입니다.
- 새 이벤트는 `events.ts` 에 먼저 정의한 뒤 `track()` 으로 호출합니다. (정의되지 않은 이벤트/속성은 타입 에러)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
