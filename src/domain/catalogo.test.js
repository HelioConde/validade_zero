import { CATALOG_STORAGE_KEY, findProductByCode, loadCatalog, parseDelimitedCsv, parseProductCatalogCsv, saveCatalog } from './catalogo';

test('interpreta csv com aspas, BOM, acentuação e zero inicial no código', () => {
  const content = '\uFEFFcodigo;nome;setor_sugerido;revisar\r\n"07890123456780";"BISCOITO; CHOCOLATE";"Mercearia";"OK"\r\n"7891111111111";"BEBIDA LÁCTEA ""ESPECIAL""";"Frios e laticínios";"Revisar"\r\n';
  const result = parseProductCatalogCsv(content);
  expect(result.products).toEqual([
    { code: '07890123456780', name: 'BISCOITO; CHOCOLATE', sector: 'Mercearia', review: false },
    { code: '7891111111111', name: 'BEBIDA LÁCTEA "ESPECIAL"', sector: 'Frios e laticínios', review: true }
  ]);
  expect(result.invalid).toBe(0);
});

test('não inventa setor e remove EAN duplicado', () => {
  const result = parseProductCatalogCsv('codigo;nome;setor_sugerido\n472;CASTANHA; \n472;CASTANHA NOVA;Outros\n789;PRODUTO;Setor inexistente\n');
  expect(result.products).toHaveLength(2);
  expect(result.duplicates).toBe(1);
  expect(result.products[0].sector).toBe('');
  expect(result.products[1].sector).toBe('');
});

test('recusa arquivo sem colunas, CSV inválido e valores perigosos', () => {
  expect(() => parseProductCatalogCsv('nome;setor\nProduto;Bebidas')).toThrow(/codigo/);
  expect(() => parseDelimitedCsv('"sem fechamento')).toThrow(/aspas/);
  expect(() => parseProductCatalogCsv('codigo;nome\nabc;=IMPORTXML("X")')).toThrow(/Nenhum produto válido/);
});

test('preserva códigos entre sessões sem afetar o estoque', () => {
  const storage = { data: {}, getItem(k) { return this.data[k] || null; }, setItem(k, v) { this.data[k] = v; } };
  const items = [{ code: '000123', name: 'BISCOITO', sector: '', review: false }];
  saveCatalog(storage, items);
  expect(JSON.parse(storage.data[CATALOG_STORAGE_KEY]).version).toBe(1);
  expect(findProductByCode(loadCatalog(storage), '000123')).toEqual(items[0]);
  expect(findProductByCode(loadCatalog(storage), '123')).toBeNull();
});
