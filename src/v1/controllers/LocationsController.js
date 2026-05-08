const Locations = require('../models/Locations');
const Subscription = require('../models/Subscription');
const { generateUUID } = require('../utils/helpers');

const LocationsController = {
    async create(req, res) {
        try {
        const { name, latitude, longitude } = req.body;
        let userId = req.user.userId;

        // Anonymous user handling
        if (req.isAnonymous) {
            userId = 'anon_' + generateUUID().slice(0,8);
            req.user.userId = userId; // Persist for session
        }

        if (!name || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ 
            message: 'Name, Latitude and Longitude required' 
            });
        }

        // Check subscription limits (free for anon)
        const tier = req.isAnonymous ? Subscription.TIERS.FREE : (await Subscription.getSubscription(userId))?.tier || Subscription.TIERS.FREE;
        const maxLocations = Subscription.FEATURES[tier].maxLocations;

        const userLocations = await Locations.findByUserId(userId);
        if (userLocations.length >= maxLocations) {
            return res.status(403).json({ 
            message: `Maximum number of Locations (${maxLocations}) reached` 
            });
        }

        const location = await Locations.create(userId, name, latitude, longitude);

        res.status(201).json({
            message: 'Location created successfully',
            location,
        });
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    },

    async getAll(req, res) {
        try {
        const userId = req.user.userId;
        const locations = await Locations.findByUserId(userId);

        res.status(200).json({
            message: 'Locations retrieved',
            count: locations.length,
            locations,
        });
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    },

    async getById(req, res) {
        try {
        const { id } = req.params;
        const userId = req.user.userId;

        const location = await Locations.findById(id);
        if (!location || location.user_id !== userId) {
            return res.status(404).json({ message: 'Location not found' });
        }

        res.status(200).json(location);
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    },

    async update(req, res) {
        try {
        const { id } = req.params;
        const userId = req.user.userId;
        const { name, latitude, longitude } = req.body;

        const location = await Locations.findById(id);
        if (!location || location.user_id !== userId) {
            return res.status(404).json({ message: 'Location not found' });
        }

        const updatedLocation = await Locations.update(id, userId, {
            name,
            latitude,
            longitude,
        });

        res.status(200).json({
            message: 'Location updated',
            location: updatedLocation,
        });
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    },

    async delete(req, res) {
        try {
        const { id } = req.params;
        const userId = req.user.userId;

        const location = await Locations.findById(id);
        if (!location || location.user_id !== userId) {
            return res.status(404).json({ message: 'Location not found' });
        }

        await Locations.delete(id, userId);

        res.status(200).json({ message: 'Location deleted' });
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    },

    async sync(req, res) {
        try {
        const userId = req.user.userId;
        const { locations } = req.body;

        if (!Array.isArray(locations)) {
            return res.status(400).json({ 
            message: 'Locations must be an array' 
            });
        }

        const syncedLocations = await Locations.sync(userId, locations);

        res.status(200).json({
            message: 'Locations synchronized',
            locations: syncedLocations,
        });
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    },
};

module.exports = LocationsController;