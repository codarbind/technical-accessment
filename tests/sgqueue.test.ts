import Queue from 'bull';
import * as ad from '../src/config/database'
import dataQueue, { QueueData } from '../src/services/messageQueue';
import { processQueueBatch } from '../src/queue/processQueue';

// Mock modules
jest.mock('bull');
//import * as ad from '../src/config/database'
jest.mock('../src/config/database');
jest.mock('../src/queue/processQueue');

// Mock environment variables
const mockEnv = {
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_PASSWORD: 'password123'
};

describe('Queue Module', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockGetJobCounts: jest.Mock;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    // Store original environment and set test environment
    originalEnv = process.env;
    process.env = { ...mockEnv };

    // Reset all mocks
    jest.resetAllMocks();
    jest.useFakeTimers();

    // Mock Queue methods
    mockGetJobCounts = jest.fn();
    (Queue as jest.MockedClass<typeof Queue>).mockImplementation(() => ({
      getJobCounts: mockGetJobCounts,
    } as any));

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Queue Initialization', () => {
    it('should initialize queue with correct Redis configuration', () => {
      require('./queue').default;

      expect(Queue).toHaveBeenCalledWith('dataQueue', {
        redis: {
          port: 6379,
          host: 'localhost',
          password: 'password123'
        }
      });
    });

    it('should exit process if Redis environment variables are missing', () => {
      process.env = {};
      
      require('./queue');

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error: Missing required Redis environment variables.'
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Queue monitoring', () => {
    it('should process batch when queue size reaches threshold', async () => {
      mockGetJobCounts.mockResolvedValue({ waiting: 1000 });

      require('./queue').default;
      
      jest.advanceTimersByTime(5000);
      await Promise.resolve(); // Allow async operations to complete

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Queue size (1000) reached the threshold. Processing batch now.'
      );
      expect(processQueueBatch).toHaveBeenCalled();
    });

    it('should not process batch when queue size is below threshold', async () => {
      mockGetJobCounts.mockResolvedValue({ waiting: 500 });

      require('./queue').default;
      
      jest.advanceTimersByTime(5000);
      await Promise.resolve(); // Allow async operations to complete

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Queue size (500) below threshold. Waiting...'
      );
      expect(processQueueBatch).not.toHaveBeenCalled();
    });

    it('should continue monitoring after error in getJobCounts', async () => {
      mockGetJobCounts
        .mockRejectedValueOnce(new Error('Redis connection failed'))
        .mockResolvedValueOnce({ waiting: 1000 });

      require('./queue').default;
      
      // First interval - error
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      
      // Second interval - success
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(processQueueBatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Queue interface', () => {
    it('should export QueueData interface with correct properties', () => {
      // This is a type check that will be validated at compile time
      const testData: QueueData = {
        msg_id: '123',
        message: 'test',
        user_id: '456',
        timestamp: '2024-01-01T00:00:00Z'
      };

      // Just assert that we can create the object (compile-time check)
      expect(testData).toBeTruthy();
    });
  });
});