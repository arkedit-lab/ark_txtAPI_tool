export const config = {
  matcher: ['/((?!api/).*)'],
};

export default function middleware(req) {
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const [scheme, credentials] = basicAuth.split(' ');
    if (scheme === 'Basic' && credentials) {
      const decoded = atob(credentials);
      const colonIndex = decoded.indexOf(':');
      const user = decoded.substring(0, colonIndex);
      const pass = decoded.substring(colonIndex + 1);

      if (
        user === process.env.BASIC_AUTH_USER &&
        pass === process.env.BASIC_AUTH_PASSWORD
      ) {
        return;
      }
    }
  }

  return new Response('このページにアクセスするにはパスワードが必要です。', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Furigana Tool"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
