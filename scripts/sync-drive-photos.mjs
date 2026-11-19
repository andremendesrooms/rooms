/**
 * André Mendes Rooms | importador seguro de fotos validadas do Drive.
 * Executa SOMENTE no servidor/CI com segredos de ambiente; nunca no browser.
 * Não muda status, disponibilidade, preço ou publicação dos imóveis.
 *
 * Requer:
 *   GOOGLE_DRIVE_SA_CLIENT_EMAIL
 *   GOOGLE_DRIVE_SA_PRIVATE_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Opcional:
 *   MAX_FILES_PER_RUN (1..30; padrão 10)
 */
import { createSign, createHash } from 'node:crypto';

const keys = [
  'GOOGLE_DRIVE_SA_CLIENT_EMAIL',
  'GOOGLE_DRIVE_SA_PRIVATE_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const missing = keys.filter((key) => !process.env[key]);
if (missing.length) {
  console.error('[sync] Credenciais de produção ainda não configuradas:', missing.join(', '));
  process.exit(2);
}
const BASE = process.env.SUPABASE_URL.replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'property-images';
const MAX = Math.max(1, Math.min(30, Number(process.env.MAX_FILES_PER_RUN || '10') || 10));
const types = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const base64url = (v) => Buffer.from(v).toString('base64url');

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const email = process.env.GOOGLE_DRIVE_SA_CLIENT_EMAIL;
  const jwtHeader = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const jwtPayload = base64url(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3000,
  }));
  const unsigned = jwtHeader + '.' + jwtPayload;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(process.env.GOOGLE_DRIVE_SA_PRIVATE_KEY.replace(/\\n/g, '\n')).toString('base64url');
  const assertion = unsigned + '.' + signature;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error('Falha de autenticação no Drive (HTTP ' + response.status + ')');
  const data = await response.json();
  if (!data.access_token) throw new Error('Drive não retornou token de leitura.');
  return data.access_token;
}

async function supabase(path, init = {}) {
  const response = await fetch(BASE + path, {
    ...init,
    headers: {
      apikey: KEY,
      authorization: 'Bearer ' + KEY,
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error('Supabase HTTP ' + response.status + ': ' + body);
  }
  const txt = await response.text();
  return txt ? JSON.parse(txt) : null;
}
function restPath(table, params) {
  return '/rest/v1/' + table + '?' + new URLSearchParams(params);
}
function normalized(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

async function downloadDrive(accessToken, file) {
  const url = 'https://www.googleapis.com/drive/v3/files/' +
    encodeURIComponent(file.drive_file_id) + '?alt=media&supportsAllDrives=true';
  const response = await fetch(url, {
    headers: { authorization: 'Bearer ' + accessToken },
  });
  if (!response.ok) throw new Error('Drive HTTP ' + response.status);
  const expected = file.mime_type;
  if (!types.has(expected)) throw new Error('Formato não permitido ' + expected);
  const actual = response.headers.get('content-type')?.split(';')[0]?.trim();
  if (actual && actual !== expected && actual !== 'application/octet-stream') {
    throw new Error('Tipo de arquivo inesperado no Drive: ' + actual);
  }
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > 8 * 1024 * 1024) throw new Error('Imagem com mais de 8 MB.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('Imagem vazia ou maior que 8 MB.');
  return bytes;
}

async function safeDestination(folder) {
  if (folder.match_status !== 'exact' || !folder.linked_property_id || !folder.unit_label) return null;
  const properties = await supabase(restPath('properties', {
    select: 'id,postcode,unit_label,status,hidden,validation_status',
    id: 'eq.' + folder.linked_property_id,
    limit: '1',
  }));
  const p = properties?.[0];
  if (!p || p.status !== 'inactive' || p.hidden !== true ||
      p.validation_status !== 'incomplete' ||
      normalized(p.postcode) !== normalized(folder.postcode) ||
      normalized(p.unit_label) !== normalized(folder.unit_label)) return null;
  return p;
}

async function countPhotos(propertyId) {
  const existing = await supabase(restPath('property_photos', {
    select: 'sort_order',
    property_id: 'eq.' + propertyId,
    order: 'sort_order.desc',
    limit: '1',
  }));
  return existing?.length ? Number(existing[0].sort_order) + 1 : 0;
}

async function transferOne(accessToken, folder, property, file) {
  const bytes = await downloadDrive(accessToken, file);
  const suffix = types.get(file.mime_type);
  const hash = createHash('sha256').update(file.drive_file_id).digest('hex');
  const uuid = [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    'a' + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
  const storagePath = 'properties/' + property.id + '/' + uuid + '.' + suffix;
  const objectUrl = BASE + '/storage/v1/object/' + BUCKET + '/' + storagePath;
  const upload = await fetch(objectUrl, {
    method: 'POST',
    headers: {
      apikey: KEY,
      authorization: 'Bearer ' + KEY,
      'content-type': file.mime_type,
      'x-upsert': 'false',
    },
    body: bytes,
  });
  // 409 é seguro se a execução anterior já tiver gravado o MESMO caminho
  // determinístico e o banco não tiver recebido a confirmação.
  if (!upload.ok && upload.status !== 409) {
    throw new Error('Storage HTTP ' + upload.status + ': ' + (await upload.text()).slice(0, 300));
  }
  const publicUrl = BASE + '/storage/v1/object/public/' + BUCKET + '/' + storagePath;
  await supabase('/rest/v1/property_photos?on_conflict=property_id,url', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({
      property_id: property.id,
      url: publicUrl,
      sort_order: await countPhotos(property.id),
    }),
  });
  await supabase(restPath('drive_media_files', {
    drive_file_id: 'eq.' + file.drive_file_id,
    folder_id: 'eq.' + folder.folder_id,
    transfer_status: 'eq.pending',
  }), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transfer_status: 'uploaded', storage_path: storagePath }),
  });
}

async function main() {
  const accessToken = await token();
  const folders = await supabase(restPath('drive_media_folders', {
    select: 'folder_id,postcode,unit_label,match_status,linked_property_id',
    match_status: 'eq.exact',
    linked_property_id: 'not.is.null',
  }));
  let uploaded = 0;
  let failures = 0;
  for (const folder of folders || []) {
    if (uploaded >= MAX) break;
    const property = await safeDestination(folder);
    if (!property) {
      console.warn('[sync] Destino não aprovado para upload:', folder.folder_id);
      continue;
    }
    const files = await supabase(restPath('drive_media_files', {
      select: 'drive_file_id,mime_type,original_filename',
      folder_id: 'eq.' + folder.folder_id,
      transfer_status: 'eq.pending',
      order: 'original_filename.asc',
      limit: String(MAX - uploaded),
    }));
    for (const file of files || []) {
      try {
        await transferOne(accessToken, folder, property, file);
        uploaded++;
        console.log('[sync] Foto transferida para rascunho:', property.id);
      } catch (e) {
        failures++;
        console.error('[sync] Falha, item continua pendente:', file.drive_file_id, e.message);
      }
    }
  }
  console.log('[sync] Finalizado. Fotos enviadas:', uploaded, 'falhas:', failures);
  if (failures) process.exitCode = 1;
}
await main();
