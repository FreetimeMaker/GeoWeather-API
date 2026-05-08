const app = require('./src/index.js');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`GeoWeather API running on port ${PORT}`);
});
