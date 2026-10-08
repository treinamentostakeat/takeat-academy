import 'server-only';
import { registrar } from './fila';

/* HubSpot: registra inscrição e presença como nota na empresa (achada pelo CNPJ).
   Requer HUBSPOT_TOKEN (app privado com escopos crm.objects.companies.read e crm.objects.notes.write).
   HUBSPOT_PROP_CNPJ = nome interno da propriedade de CNPJ na empresa (padrão "cnpj"). */

const API = 'https://api.hubapi.com';
const token = () => process.env.HUBSPOT_TOKEN || '';
const PROP_CNPJ = () => process.env.HUBSPOT_PROP_CNPJ || 'cnpj';

async function hs(path: string, body: unknown) {
  const r = await fetch(API + path, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HubSpot ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function empresaPorCnpj(cnpj: string): Promise<string | null> {
  const res = await hs('/crm/v3/objects/companies/search', { filterGroups: [{ filters: [{ propertyName: PROP_CNPJ(), operator: 'EQ', value: cnpj }] }], properties: ['name'], limit: 1 });
  return res.results?.[0]?.id ?? null;
}

async function nota(cnpj: string, texto: string) {
  const empresa = await empresaPorCnpj(cnpj);
  if (!empresa) throw new Error(`Empresa com CNPJ ${cnpj} não encontrada no HubSpot`);
  await hs('/crm/v3/objects/notes', {
    properties: { hs_timestamp: new Date().toISOString(), hs_note_body: texto },
    associations: [{ to: { id: empresa }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 190 }] }],
  });
}

type Evento = { cnpj: string; restaurante: string; pessoa: string; tema: string; quando: string };

export const hubspotInscricao = (e: Evento) =>
  registrar('hubspot', 'inscricao', e, token() ? () => nota(e.cnpj, `Takeat Academy: ${e.pessoa} se inscreveu na aula ao vivo de ${e.tema} (${e.quando}).`) : undefined);

export const hubspotPresenca = (e: Evento & { presente: boolean }) =>
  registrar('hubspot', 'presenca', e, token() ? () => nota(e.cnpj, `Takeat Academy: ${e.pessoa} ${e.presente ? 'participou' : 'faltou'} da aula ao vivo de ${e.tema} (${e.quando}).`) : undefined);
