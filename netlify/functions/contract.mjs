/**
 * netlify/functions/contract.mjs   (the page calls it as /api/contract)
 * -----------------------------------------------------------------------
 * The signed contracts from the contract signer (/contract-signer/), kept in Netlify Blobs (store "contracts").
 *   POST  (the signed PDF as the body; headers X-Name = who signed, X-File = the file name)  -> { id, url }
 *   GET   ?id=...   -> the signed PDF (the link in the email)
 * The id is long and random, so only someone with the link can open a contract.
 * -----------------------------------------------------------------------
 */
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const MAX_BYTES = 5.5 * 1024 * 1024; // CHANGE HERE: the biggest contract (Netlify takes about 6 MB per request)
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const header = (req, name, max) => { try { return decodeURIComponent(req.headers.get(name) || '').slice(0, max); } catch { return ''; } };

export default async (req) => {
  const store = getStore({ name: 'contracts', consistency: 'strong' });
  const url = new URL(req.url);
  try {
    if (req.method === 'GET') {
      const id = url.searchParams.get('id') || '';
      if (!/^[a-f0-9]{32}$/.test(id)) return reply({ error: 'Not found.' }, 404);
      const found = await store.getWithMetadata(id, { type: 'arrayBuffer' });
      if (!found) return reply({ error: 'Not found.' }, 404);
      const file = String(found.metadata?.file || 'contract.pdf').replace(/[^\w .()-]/g, '_');
      return new Response(found.data, { headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${file}"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      } });
    }
    if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);

    const body = new Uint8Array(await req.arrayBuffer());
    if (body.length > MAX_BYTES) return reply({ error: 'The contract is too big.' }, 413);
    if (new TextDecoder().decode(body.slice(0, 5)) !== '%PDF-') return reply({ error: 'That is not a PDF.' }, 400);
    const id = crypto.randomBytes(16).toString('hex');
    const metadata = { name: header(req, 'x-name', 80), file: header(req, 'x-file', 160) || 'contract.pdf', at: new Date().toISOString() };
    await store.set(id, body, { metadata });
    console.log(`[CONTRACT] stored ${id}: ${metadata.file}, signed by ${metadata.name}, ${body.length} bytes.`);
    return reply({ id, url: `${url.origin}/api/contract?id=${id}` });
  } catch (err) {
    console.error('[CONTRACT] error:', err);
    return reply({ error: 'The contract could not be stored. Try again in a moment.' }, 500);
  }
};
