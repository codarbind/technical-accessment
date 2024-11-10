import { processBatch } from '../src/queue/processBatch';
import pool from '../src/config/database';

const mockpool = jest.mock('../src/config/database');

describe('processBatch', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('processes a batch of data successfully', async () => {
    const dataBatch = [
      {
        msg_id: '1',
        message: 'Hello, world!',
        user_id: 'user1',
        timestamp: '2023-04-01T12:00:00Z',
      },
      {
        msg_id: '2',
        message: 'Goodbye, world!',
        user_id: 'user2',
        timestamp: '2023-04-02T12:00:00Z',
      },
    ];

await processBatch(dataBatch);

   // expect(mockpool).toHaveBeenCalledTimes(1);
    expect((await pool.getConnection()).query).toHaveBeenCalledTimes(2);
    expect((await pool.getConnection()).query).toHaveBeenCalledWith(
      'CREATE TABLE IF NOT EXISTS messages (msg_id VARCHAR(255) PRIMARY KEY, message TEXT, user_id VARCHAR(255), timestamp TIMESTAMP)'
    );
    expect((await pool.getConnection()).query).toHaveBeenCalledWith(
      'INSERT INTO messages (msg_id, message, user_id, timestamp) VALUES ? ON DUPLICATE KEY UPDATE msg_id=VALUES(msg_id)',
      [
        ['1', 'Hello, world!', 'user1', '2023-04-01 12:00:00'],
        ['2', 'Goodbye, world!', 'user2', '2023-04-02 12:00:00'],
      ]
    );
    expect((await pool.getConnection()).release()).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith('2 records successfully processed.');
  });

});