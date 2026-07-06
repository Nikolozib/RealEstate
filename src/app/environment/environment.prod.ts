export const environment = {
  production: true,
  siteUrl: 'https://realsang.netlify.app',
  // n8n webhook endpoints (Render free tier — may cold-start for ~50s).
  // The token is a shared secret checked by every workflow; it ships in the
  // client bundle by design, so nothing sensitive sits behind these hooks.
  n8n: {
    token: 'ed8c78864524d802776eae2a3d7cf4e50e0dc37f597fa547',
    leadUrl: 'https://realsang-n8n.onrender.com/webhook/lead',
    adminAlertUrl: 'https://realsang-n8n.onrender.com/webhook/admin-alert',
    chatUrl: 'https://realsang-n8n.onrender.com/webhook/chat',
  },
  firebase: {
    apiKey: 'AIzaSyAnMZlkNfLQHzBwWEy74VwclXBmsQr99FM',
    authDomain: 'real-estate-app-9f947.firebaseapp.com',
    projectId: 'real-estate-app-9f947',
    storageBucket: 'real-estate-app-9f947.firebasestorage.app',
    messagingSenderId: '568071630391',
    appId: '1:568071630391:web:1d17ba78c0b5187c2919b2',
  },
};
