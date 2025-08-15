jest.mock('ali-oss', () => {
  return jest.fn().mockImplementation(() => ({
    put: jest.fn(),
    get: jest.fn(),
  }));
});