const supabase = require('../config/database');

describe('Database Connection', () => {
  test('should connect to database', async () => {
    try {
      const { error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });
      
      expect(error).toBeNull();
    } catch (error) {
      console.error('Database test failed:', error.message);
      throw error;
    }
  });
});

