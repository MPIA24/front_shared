maptilersdk.config.apiKey = 'IOB0c3pObw5n5M6qkQcE'; // Assurez-vous que cette clé est correcte

//starting the canva of the map
var map = new maptilersdk.Map({
    container: 'map',
    style: maptilersdk.MapStyle.STREETS,
    center: [-0.38, 49.17],
    zoom: 8,
});

/**
 * Decode an encoded polyline string into an array of [longitude, latitude] pairs.
 * @param {string} encoded - The encoded polyline string.
 * @returns {Array} Decoded array of [longitude, latitude] coordinates.
 */
function decodePolyline(encoded) {
    let index = 0, lat = 0, lng = 0;
    const coordinates = [];
    const factor = 1e-5;

    while (index < encoded.length) {
        let b, shift = 0, result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += deltaLat;

        shift = 0;
        result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += deltaLng;

        coordinates.push([lng * factor, lat * factor]);
    }

    return coordinates;
}


// fetching all tours from API
async function fetchTours() {
    try {
        const response = await fetch('http://cestpasunvirus.fr:8001/api/tours', {
            method: 'GET',
            headers: {
                'Origin': 'http://127.0.0.1:5500',
                'Accept': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Erreur lors de la récupération des tours');
        const data = await response.json();
        return data.tours; // Assurez-vous que la structure des données correspond
    } catch (error) {
        console.error('Erreur lors de la récupération des tours:', error);
        throw error;
    }
}
// transform adviced locomotion into sth that ORS will understand
function mapORSTransportMode(advicedLocomotion) {
    switch (advicedLocomotion.toLowerCase()) {
        case 'parcours à vélo':
            return 'cycling-regular';
        case 'parcours à pieds':
            return 'foot-walking';
        case 'parcours en voiture':
            return 'driving-car';
        default:
            return 'driving-car'; // Mode par défaut
    }
}

//getting rout that link the different POI regarding the mobility way 
async function getRoute(tour) {
    const apiKey = '5b3ce3597851110001cf624855add40347314ab7bfa02260e70ecf0f'; 

    // Call a function to format the transport method to fit the request needs
    const transportMode = mapORSTransportMode(tour.adviced_locomotion); 

    // Get the POI coordinates
    const poiCoordinates = tour.batiments.map(b => [b.longitude, b.latitude]);

    if (poiCoordinates.length < 2) {
        console.error('Le tour doit contenir au moins un point d\'origine et une destination.');
        return null;
    }

    try {
        let url, options;

        if (poiCoordinates.length === 2) {
            // Handle case for exactly two POIs using GET
            const origin = poiCoordinates[0].join(',');
            const destination = poiCoordinates[1].join(',');
            url = `https://api.openrouteservice.org/v2/directions/${transportMode}?api_key=${apiKey}&start=${origin}&end=${destination}&format=geojson`;
            options = { method: 'GET' };
        } else {
            // Handle case for more than two POIs using POST
            url = `https://api.openrouteservice.org/v2/directions/${transportMode}`;
            options = {
                method: 'POST',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    coordinates: poiCoordinates,
                 })
            };
        }

        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Erreur lors de la récupération de l\'itinéraire');

        const data = await response.json();

        const encodedGeometry = data.routes?.[0]?.geometry;
        let geometry;
        if (typeof encodedGeometry === 'string') {
            geometry = decodePolyline(encodedGeometry);
        } else {
            geometry = data.features?.[0]?.geometry?.coordinates || null;
        }
        if (!geometry) throw new Error('Aucun itinéraire trouvé dans la réponse');
        return geometry;
    } catch (error) {
        console.error('Erreur dans la requête OpenRouteService API:', error);
        return null;
    }
}

//get a random color in hexa format
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// formate route from ORS API into proper geoJson data that can be used by map tiller
async function fetchRouteAndFormatInGeoJSONLine(tours) {
    const routesGeoJSON = [];
    for (const tour of tours) {
        const coordinates = await getRoute(tour);

        if (coordinates) {
            // get a random color for easiest display in front
            const randomColor = getRandomColor();

            // Ceate geoJson for the Tour
            const geojson = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates,
                },
                properties: {
                    name: tour.name,
                    id: tour.id,  
                    color: randomColor,
                    adviced_locomotion: tour.adviced_locomotion,
                    poiNames: tour.batiments.map(b => b.name)
                }
            };
            routesGeoJSON.push({ id: `route-${tour.id}`, geojson });
        } else {
            console.error(`Impossible de récupérer l'itinéraire pour le tour ${tour.name}`);
        }
    }

    return routesGeoJSON;
};


//add the name, the adviced mobility and the list of the name of POI on every tour according to their color
function generateLegend(routesGeoJSON) {
    const featuresDiv = document.getElementById('features');
    routesGeoJSON.forEach(({ geojson }) => {
        const { name, color, adviced_locomotion, poiNames } = geojson.properties;
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        const colorCircle = document.createElement('div');
        colorCircle.className = 'color-circle';
        colorCircle.style.backgroundColor = color;
        legendItem.appendChild(colorCircle);
        const nameElement = document.createElement('div');
        nameElement.className = 'legend-name';
        nameElement.textContent = name;
        legendItem.appendChild(nameElement);
        const locomotionElement = document.createElement('div');
        locomotionElement.className = 'legend-locomotion';
        locomotionElement.textContent = `Type de mobilité: ${adviced_locomotion}`;
        legendItem.appendChild(locomotionElement);
        const poiListElement = document.createElement('div');
        poiListElement.className = 'legend-poi-list';
        poiListElement.textContent = `POI: ${poiNames.join(', ')}`;
        legendItem.appendChild(poiListElement);
        featuresDiv.appendChild(legendItem);
    });
}


// initialize map and Tour's routes
function initializeMap() {
    map.on('load', async () => {
        try {
            // getting tours
            const tours = await fetchTours();

            // formate and getting routes
            const routesGeoJSON = await fetchRouteAndFormatInGeoJSONLine(tours);

            // add every route on the map
            routesGeoJSON.forEach(({ id, geojson }) => {
                // Ajouter la source du tour à la carte
                map.addSource(id, {
                    type: 'geojson',
                    data: geojson
                });

                // add the layer to display the routes on map
                map.addLayer({
                    id: id,
                    type: 'line',
                    source: id,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': ['get', 'color'],
                        'line-width': 4,  
                        'line-opacity': 0.8 
                    }
                });

                //get tour's POI location
                const tour = tours.find(t => t.id === geojson.properties.id);
                if (tour) {
                    // create geoJson for those POIs
                    const markersGeoJSON = {
                        type: 'FeatureCollection',
                        features: tour.batiments.map(poi => ({
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [poi.longitude, poi.latitude]
                            },
                            properties: {
                                color: geojson.properties.color  
                            }
                        }))
                    };

                    // then add those POI's to the map
                    map.addSource(`markers-${id}`, {
                        type: 'geojson',
                        data: markersGeoJSON
                    });

                    // and finaly display them
                    map.addLayer({
                        id: `markers-${id}`,
                        type: 'circle',
                        source: `markers-${id}`,
                        paint: {
                            'circle-radius': 5,
                            'circle-color': ['get', 'color'],
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#fff'
                        }
                    });
                }
            });
            // Generate legend
            generateLegend(routesGeoJSON)
        } catch (error) {
            console.error("Erreur lors de l'initialisation de la carte :", error);
        }
    });
}

// call the main function
initializeMap();

//function to check if the user is logged and return his id
function getUserIdFromCookie(){
    const cookies = document.cookie;
    const userId = cookies
  .split('; ') 
  .find(row => row.startsWith('user_id='))
  ?.split('=')[1];

  return userId
}


