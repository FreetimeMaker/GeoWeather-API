const errorHandler = (err, req, res, next) => {
  // Always log full error for debugging
    console.error('Error Handler:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id
    });

    if (err.status) {
        return res.status(err.status).json({
            message: err.message,
            ...(process.env.NODE_ENV === 'production' && { error: err.message }),
        });
    }

    res.status(500).json({
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'production' && { error: err.message }),
    });
};

module.exports = errorHandler;