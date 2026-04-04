import { NextRequest, NextResponse } from 'next/server';

const UNISWAP_API_KEY = process.env.NEXT_PUBLIC_UNISWAP_API_KEY || '';
const UNISWAP_API_URL = 'https://trade-api.gateway.uniswap.org/v1';

const HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': UNISWAP_API_KEY,
  'x-universal-router-version': '2.1.1',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Quote + Swap in one call (minimize deadline issues)
    if (body._quoteAndSwap) {
      delete body._quoteAndSwap;

      // Step 1: Quote
      const quoteRes = await fetch(`${UNISWAP_API_URL}/quote`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(body),
      });
      const quoteData = await quoteRes.json();

      if (!quoteData.quote) {
        return NextResponse.json({ error: 'No quote', detail: quoteData });
      }

      // Step 2: Swap immediately
      const swapRes = await fetch(`${UNISWAP_API_URL}/swap`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ quote: quoteData.quote }),
      });
      const swapData = await swapRes.json();

      return NextResponse.json(swapData);
    }

    // Swap only
    if (body._swap) {
      delete body._swap;
      const res = await fetch(`${UNISWAP_API_URL}/swap`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ quote: body.quote }),
      });
      return NextResponse.json(await res.json());
    }

    // Quote only
    const res = await fetch(`${UNISWAP_API_URL}/quote`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('Swap API error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
