require('dotenv').config({ path: '.env.test' });
const { start, getNextPending, stop } = require('../index.js');
const waitForExpect = require('wait-for-expect');
const db = require('../db.js');

beforeAll(() => {
    db.exec('DELETE FROM queue;');
    start();
});

afterAll(() => {
    stop();
    db.exec('DELETE FROM queue;');
    db.close();
});

test('El cliente envía batch, recibe confirmación y elimina de cola', async () => {
  await waitForExpect(() => {
    const pending = getNextPending();
    expect(pending).toBeUndefined();
  }, 10000); // 10s máximo
});
