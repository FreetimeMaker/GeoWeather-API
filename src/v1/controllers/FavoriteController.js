const Favorite = require('../models/Favorite');
const Subscription = require('../models/Subscription');

const FavoriteController = {
  async create(req, res) {
    try {
      const { name, latitude, longitude } = req.body;
      const userId = req.user.userId;

      if (!name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ 
          message: 'Name, Latitude and Longitude required' 
        });
      }

      // Check subscription limits
      const subscription = await Subscription.getSubscription(userId);
      const tier = subscription?.tier || Subscription.TIERS.FREE;
      const maxFavorites = Subscription.FEATURES[tier].maxFavorites;

      const userFavorites = await Favorite.findByUserId(userId);
      if (userFavorites.length >= maxFavorites) {
        return res.status(403).json({ 
          message: `Maximum number of favorites (${maxFavorites}) reached` 
        });
      }

      const favorite = await Favorite.create(userId, name, latitude, longitude);

      res.status(201).json({
        message: 'Favorite successfully created',
        favorite,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getAll(req, res) {
    try {
      const userId = req.user.userId;
      const favorites = await Favorite.findByUserId(userId);

      res.status(200).json({
        message: 'Favorites retrieved',
        count: favorites.length,
        favorites,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const favorite = await Favorite.findById(id);
      if (!favorite || favorite.user_id !== userId) {
        return res.status(404).json({ message: 'Favorite not found' });
      }

      res.status(200).json(favorite);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { name, latitude, longitude } = req.body;

      const favorite = await Favorite.findById(id);
      if (!favorite || favorite.user_id !== userId) {
        return res.status(404).json({ message: 'Favorite not found' });
      }

      const updatedFavorite = await Favorite.update(id, userId, {
        name,
        latitude,
        longitude,
      });

      res.status(200).json({
        message: 'Favorite updated',
        favorite: updatedFavorite,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const favorite = await Favorite.findById(id);
      if (!favorite || favorite.user_id !== userId) {
        return res.status(404).json({ message: 'Favorite not found' });
      }

      await Favorite.delete(id, userId);

      res.status(200).json({ message: 'Favorite deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async sync(req, res) {
    // Cross-device synchronization
    try {
      const userId = req.user.userId;
      const { favorites } = req.body;

      if (!Array.isArray(favorites)) {
        return res.status(400).json({ 
          message: 'Favorites must be an array' 
        });
      }

      const syncedFavorites = await Favorite.sync(userId, favorites);

      res.status(200).json({
        message: 'Favorites synchronized',
        favorites: syncedFavorites,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = FavoriteController;