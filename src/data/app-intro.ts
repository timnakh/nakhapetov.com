/**
 * Playbook intro: «The app behind this playbook».
 * Field-notes copy only — no icons, no extra claims.
 */

export const appIntro = {
  title: 'The app behind this playbook',
  paragraph:
    'Life Journey RPG is a dark-fantasy productivity app: quests, habits, a focus timer and an AI chronicler that writes a diary entry about your day. It runs on the web and on Android through Google Play. We built it with AI coding assistants in about eleven months, and this playbook is what we learned getting it paid for.',
  stack: {
    label: 'The stack',
    body: 'Web app: React 19 with Vite. Android: the same web app wrapped with Capacitor, plus a few small native plugins (push notifications, native Google sign-in, Play Billing). Server: Node.js with Express. Firebase Authentication and Firestore for accounts and data. Payments: Paddle on the web, Google Play Billing in the Play build. AI in the product: OpenAI, called from the server only. One model writes the chronicles, and OpenAI\'s free moderation model checks the text before anyone sees it. A typical daily chronicle costs about $0.0015, estimated from prompt size and OpenAI\'s list prices in November 2026.',
  },
  built: {
    label: 'How it was built',
    body: 'Almost all of the code was written with AI coding assistants, mainly Cursor. About four fifths of the tokens went through its Auto mode, where Cursor picks the model, and the rest through Composer, Grok, Claude and Gemini models. The human did the deciding, the accounts and the secrets. That split is the subject of this playbook.',
  },
  lessons: {
    label: 'Four things the app taught us',
    body: 'Google blocks its sign-in page inside a WebView, so a wrapped web app needs native sign-in (Step 4). A release build can fail where a debug build does not: code shrinking removed plugin annotations and crashed the app on a real phone. Payment webhooks can arrive more than once, so handlers must be idempotent (Step 2). Play Console will not let you create subscriptions until you have uploaded a build that declares the billing permission (Step 6).',
  },
} as const;
