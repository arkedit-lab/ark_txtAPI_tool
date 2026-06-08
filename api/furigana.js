export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();

    const yahooRes = await fetch(
      'https://jlp.yahooapis.jp/FuriganaService/V2/furigana',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Yahoo AppID: ${process.env.YAHOO_CLIENT_ID}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await yahooRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
