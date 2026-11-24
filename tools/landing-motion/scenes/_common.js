// Sahnelerin ortak parçaları: sık kullanılan adlar ve kayıt dışı (hızlı) gezinme
const vis = (p, text) => p.getByText(text, { exact: true }).filter({ visible: true });
const tab = (p, name) => p.getByRole('tab', { name }).filter({ visible: true }).last();
const card = (p, name) => p.getByRole('button', { name, exact: true }).filter({ visible: true });

async function openClient(p, name = 'Nazlı') {
  await vis(p, name).first().click();
  await p.waitForTimeout(1800);
}

module.exports = { vis, tab, card, openClient };
