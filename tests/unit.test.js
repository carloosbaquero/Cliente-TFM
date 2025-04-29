require('dotenv').config({ path: '.env.test' });
const { generateDataBatch, enqueue, markAsConfirmed, getNextPending } = require('../index.js');
const db = require('../db.js');

describe('Unit tests', () => {
  beforeEach(() => {
    db.exec('DELETE FROM queue;');
  });

  afterAll(() => {
    db.exec('DELETE FROM queue;');
    db.close();
  });

  describe('generateDataBatch', () => {
    test('genera un lote con 12 arrays', () => {
      const batch = generateDataBatch();
      expect(batch).toHaveProperty('id');
      expect(typeof batch.patientId).toBe('string');
      expect(new Date(batch.timestamp)).toBeInstanceOf(Date);
      expect(Array.isArray(batch.data)).toBe(true);
      expect(batch.data.length).toBe(12);
      batch.data.forEach(array => {
        expect(Array.isArray(array)).toBe(true);
        expect(array.length).toBe(200);
        array.forEach(num => {
          expect(typeof num).toBe('number');
          expect(num).toBeLessThan(1000);
        });
      });
    });
  });

  describe('enqueue y markAsConfirmed', () => {
    const fakeBatch = {
      id: '123',
      patientId: 'p001',
      timestamp: Date.now(),
      data: []
    };

    test('enqueue agrega un registro en SQLite', () => {
      enqueue(fakeBatch);
      const row = db.prepare('SELECT * FROM queue WHERE id = ?').get(fakeBatch.id);
      expect(row).not.toBeUndefined();
      expect(row.id).toBe(fakeBatch.id);
    });

    test('markAsConfirmed elimina el registro de SQLite', () => {
      enqueue(fakeBatch);
      markAsConfirmed(fakeBatch.id);
      const row = db.prepare('SELECT * FROM queue WHERE id = ?').get(fakeBatch.id);
      expect(row).toBeUndefined();
    });
  });

  test('getNextPending devuelve el último batch encolado', () => {
    const batch1 = { id: '1', patientId: 'p001', timestamp: Date.now() - 1000, data: [] };
    const batch2 = { id: '2', patientId: 'p001', timestamp: Date.now(), data: [] };

    enqueue(batch1);
    enqueue(batch2);

    const next = getNextPending();
    expect(next).not.toBeUndefined();
    expect(next.id).toBe(batch2.id);
  });
});
