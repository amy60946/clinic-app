// Sahnelerin ortak parçaları: sık kullanılan adlar ve kayıt dışı (hızlı) gezinme
const T = 'Ebeveyn zorlayıcı davranışları ABC ile kaydeder ve tetikleyicileri tanır';   // Nazlı'nın etkin eğitimi
const vis = (p, text) => p.getByText(text, { exact: true }).filter({ visible: true });
const tab = (p, name) => p.getByRole('tab', { name }).filter({ visible: true }).last();
const card = (p, name) => p.getByRole('button', { name, exact: true }).filter({ visible: true });

async function openClient(p, name = 'Nazlı') {
  await vis(p, name).first().click();
  await p.waitForTimeout(1800);
}
async function openTraining(p) {
  await card(p, T).first().click();
  await p.waitForTimeout(1300);
}

module.exports = { T, vis, tab, card, openClient, openTraining };
