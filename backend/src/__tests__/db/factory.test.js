describe('Database Factory', () => {
  const originalEnv = process.env.DB_TYPE;

  afterEach(() => {
    process.env.DB_TYPE = originalEnv;
    // Clear module cache to force re-evaluation of the factory
    delete require.cache[require.resolve('../../db/index')];
    delete require.cache[require.resolve('../../db/sqlite')];
    delete require.cache[require.resolve('../../db/postgres')];
  });

  if (!process.env.DB_TYPE || process.env.DB_TYPE === 'sqlite') {
    it('should load SQLite adapter when DB_TYPE=sqlite', () => {
      process.env.DB_TYPE = 'sqlite';
      const db = require('../../db/index');
      // Check for a characteristic property of the sqlite adapter
      expect(db.db).toBeDefined(); 
    });
  }

  if (process.env.DB_TYPE === 'postgres') {
    it('should load PostgreSQL adapter when DB_TYPE=postgres', () => {
      process.env.DB_TYPE = 'postgres';
      const db = require('../../db/index');
      // Check for a characteristic property of the postgres adapter
      expect(db.pool).toBeDefined();
    });

    it('should throw error in sqlite adapter if accessed while in postgres mode', () => {
      process.env.DB_TYPE = 'postgres';
      const sqlite = require('../../db/sqlite');
      expect(() => sqlite.db).toThrow('Attempted to initialize SQLite DB when DB_TYPE is postgres');
    });
  }
});
