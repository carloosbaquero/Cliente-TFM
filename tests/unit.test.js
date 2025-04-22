const { generateDataBatch, enqueue, markAsConfirmed } = require('../index.js');
const db = require('../db.js');

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
    const fakeBatch = { id: '123', patientId: 'p001', date: new Date(), data: [] };
  
    test('enqueue agrega un registro en SQLite', async () => {
        enqueue(fakeBatch);
        const row = db.prepare('SELECT * FROM queue WHERE id = ?').get(fakeBatch.id);
        expect(row).not.toBeUndefined();
        expect(row.id).toBe(fakeBatch.id);
    });
  
    test('markAsConfirmed elimina el registro de SQLite', async () => {
        markAsConfirmed(fakeBatch.id);
        const row = db.prepare('SELECT * FROM queue WHERE id = ?').get(fakeBatch.id);
        expect(row).toBeUndefined();
    });
});
  