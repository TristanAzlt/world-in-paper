import { NextRequest, NextResponse } from 'next/server';

interface IVerifyResponse {
  success: boolean;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  const { payload, action } = await req.json();
  const rp_id = process.env.RP_ID;

  if (!rp_id) {
    return NextResponse.json({ error: 'RP_ID not configured' }, { status: 500 });
  }

  // World ID 4.0: forward IDKit payload as-is to v4 endpoint
  const response = await fetch(
    `https://developer.world.org/api/v4/verify/${rp_id}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  const verifyRes = (await response.json()) as IVerifyResponse;
  console.log('Verify response:', JSON.stringify(verifyRes));

  if (verifyRes.success) {
    return NextResponse.json({ verifyRes, status: 200 });
  } else {
    return NextResponse.json({ verifyRes, status: 400 });
  }
}
