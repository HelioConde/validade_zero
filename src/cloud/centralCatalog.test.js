import { canSearchCentralCatalog, findCentralProduct } from './centralCatalog';

const options = { url: 'https://example.supabase.co', key: 'sb_publishable_exemplo' };

test('pesquisa EAN como visitante, com apikey publicável e só colunas públicas', async () => {
  const fetcher = jest.fn(async () => ({
    ok: true,
    json: async () => [{
      code:'7898276970072',name:'ESPUMANTE CASA VALDUGA 750ML 130 ANOS',
      sector:'Bebidas',needs_review:false
    }]
  }));
  const result = await findCentralProduct('7898276970072', { ...options, fetcher });
  expect(result).toEqual({
    code:'7898276970072',name:'ESPUMANTE CASA VALDUGA 750ML 130 ANOS',
    sector:'Bebidas',review:false,source:'central'
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url,request] = fetcher.mock.calls[0];
  expect(url).toContain('code=eq.7898276970072');
  expect(url).toContain('select=code,name,sector,needs_review');
  expect(url).not.toMatch(/user_id|photo_path|expiration/);
  expect(request.method).toBe('GET');
  expect(request.headers.apikey).toBe(options.key);
  expect(request.headers).not.toHaveProperty('Authorization');
  expect(request).not.toHaveProperty('body');
});

test('não pesquisa código inválido nem tenta gravar no servidor', async () => {
  const fetcher = jest.fn();
  expect(await findCentralProduct('EAN ERRADO', { ...options, fetcher })).toBeNull();
  expect(await findCentralProduct('123456789012345', { ...options, fetcher })).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});

test('suporta ausência de produto e falha de servidor com erro compreensível', async () => {
  const empty = jest.fn(async () => ({ok:true,json:async()=>[]}));
  expect(await findCentralProduct('000123', { ...options,fetcher:empty })).toBeNull();
  const down = jest.fn(async () => ({ok:false,status:503}));
  await expect(findCentralProduct('000123',{...options,fetcher:down}))
    .rejects.toThrow(/indisponível/);
});

test('rejeita resposta com código diferente do pesquisado', async () => {
  const fetcher=jest.fn(async()=>({ok:true,json:async()=>[{code:'123',name:'OUTRO'}]}));
  await expect(findCentralProduct('000123',{...options,fetcher}))
    .rejects.toThrow(/não corresponde/);
});
