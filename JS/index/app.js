maptilersdk.config.apiKey = 'IOB0c3pObw5n5M6qkQcE';

async function fetchAllPoi() {
    try {
        const response = await fetch('http://localhost:8000/api/batiments', {
            method: 'GET',
            headers: {
                'Origin': 'http://127.0.0.1:5500',
                'Accept': 'application/json',
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erreur lors de la récupération des POIs:', error);
        throw error;
    }
}

async function fetchVisitedPOI() {
    const userId = getUserIdFromCookie();
    if (!userId) {
        return []; // Tableau vide si l'utilisateur n'est pas connecté
    }
    try {
        const response = await fetch('http://localhost:8000/api/visited/get', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Indique que le body est JSON
                'Accept': 'application/json',
                'Origin': 'http://127.0.0.1:5500',
            },
            body: JSON.stringify({ user_id: userId }), // Corps JSON contenant user_id
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erreur lors de la récupération des POIs visités:', error);
        throw error;
    }
}

async function postVisit(batiment_id, user_id){
    try {
        const response = await fetch('http://localhost:8000/api/visited', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': 'http://127.0.0.1:5500',
            },
            body: JSON.stringify({
                user_id: user_id,
                batiment_id: batiment_id
            })
            
        });
        const data = await response.json();
        if(data)
        {
            return true;
        }
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la visite:', error);
        throw error;
    }
}




// Extraire la valeur de user_id
function getUserIdFromCookie(){
    const cookies = document.cookie; // Récupérer les cookies dans la variable cookies
    const userId = cookies
  .split('; ') // Diviser les cookies en paires clé=valeur
  .find(row => row.startsWith('user_id=')) // Trouver la paire qui commence par "user_id="
  ?.split('=')[1]; // Extraire la valeur après le "="

  return userId
}


async function getPOI() {
    try {
        // Récupérer les POI et les bâtiments visités
        const [allPoiData, visitedPoiData] = await Promise.all([fetchAllPoi(), fetchVisitedPOI()]);

        // Extraire les IDs des bâtiments visités
        const visitedIds = visitedPoiData.map(poi => poi.batiment_id);

        // Générer le GeoJSON avec la propriété 'icon' indiquant le statut de visite
        const geoJson = {
            type: "FeatureCollection",
            features: allPoiData.batiments.map(batiment => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [batiment.longitude, batiment.latitude],
                },
                properties: {
                    id: batiment.id,
                    name: batiment.name,
                    description: batiment.description,
                    created_at: batiment.created_at,
                    updated_at: batiment.updated_at,
                    icon: visitedIds.includes(batiment.id) ? 'visited' : 'unvisited',
                }
            }))
        };

        return geoJson;
    } catch (error) {
        console.error("Erreur lors de la génération du GeoJSON :", error);
        throw error;
    }
}


// Ajouter la logique d'interaction des chapitres
function createBuildingDescription(batiment) {
    const section = document.createElement('section');
    section.id = batiment.id;

    const h3 = document.createElement('h3');
    h3.textContent = batiment.name;
    h3.classList.add('buildingName');

    const p = document.createElement('p');
    p.textContent = batiment.description;
    p.classList.add('buildingDescription');

    // Ajouter les éléments créés dans la section
    section.appendChild(h3);
    section.appendChild(p);

    return section;
}

// Fonction pour peupler la page avec les descriptions des bâtiments
async function populateChapters() {
    const geoJson = await getPOI();
    
    let chapters = {};

    geoJson.features.forEach((feature, index) => {
        const { properties } = feature;
        const { id, name } = properties;

        // Créer un chapitre pour chaque POI, en utilisant l'ID du bâtiment pour la gestion des chapitres
        chapters[id] = {
            bearing: 0,  // L'angle de rotation (à ajuster selon le POI)
            center: feature.geometry.coordinates,  // Coordonnées de chaque POI
            zoom: 16,  // Le niveau de zoom (à ajuster en fonction du besoin)
            pitch: 20, // Inclinaison de la caméra (ajuster au besoin)
        };
    });

    return chapters;
}

// Fonction pour peupler la page avec les descriptions des bâtiments
async function populateBuildingDescriptions() {
    try {
        // Récupérer les POIs (points d'intérêt)
        const geoJson = await getPOI();

        // Sélectionner un conteneur pour ajouter les sections
        const container = document.getElementById("features");

        // Créer les sections pour chaque bâtiment et les ajouter au DOM
        geoJson.features.forEach((feature) => {
            const batiment = feature.properties;
            const descriptionSection = createBuildingDescription(batiment);

            // Ajouter la section au conteneur
            container.appendChild(descriptionSection);
        });
    } catch (error) {
        console.error('Erreur lors de la création des descriptions:', error);
    }
}

// Map initialisation
var map = new maptilersdk.Map({
    container: 'map',
    style: maptilersdk.MapStyle.STREETS,
    center: [-0.38, 49.17],
    zoom: 10,
});
const userId = getUserIdFromCookie();
// Initialisation de la map et des interactions
map.on('load', async function () {
    const chapters = await populateChapters();  // Charger dynamiquement les chapitres depuis les POIs
    var activeChapterId = Object.keys(chapters)[0];  // Le premier POI sera le chapitre actif initialement

    const geoJson = await getPOI(); // Obtenez les données GeoJSON
    
    // Ajouter une source GeoJSON pour les POIs
    map.addSource('pois', {
        type: 'geojson',
        data: geoJson,
    });

    const imageVisited = await map.loadImage('/assets/IMG/visitedPOI.png');
    const imageUnvisited = await map.loadImage('/assets/IMG/unvisitedPOI.png');

    map.addImage('visited', imageVisited.data)
    map.addImage('unvisited', imageUnvisited.data)

    // Ajouter une couche pour afficher les pointeurs sur les POIs
    map.addLayer({
        id: 'poi-markers',
        type: 'symbol',
        source: 'pois',
        layout: {
            'icon-image' : ['get', 'icon'],
            'icon-size' : 0.5,
        },
    });

    // Associer un événement au clic sur les pointeurs
    map.on('click', 'poi-markers', function (e) {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;

        // Défilement vers la section correspondant au POI
        const targetSection = document.getElementById(properties.id);
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth' });
        }

        // Déplacer la vue de la carte vers le POI cliqué
        map.flyTo({
            center: coordinates,
            zoom: 16,
            pitch: 60,
            bearing: 0,
            speed: 1.5,
            curve: 1,
        });

        let popupHTML = `
        <h3>${properties.name}</h3>
        <p class="popupText">${properties.description}</p>
        `;

        // Si l'utilisateur est connecté, ajouter le bouton "Visiter"
        if (userId) {
            popupHTML += `<button id="visitButton">Visiter</button>`;
        }else{
            popupHTML += `<a href="login.html"><p>Connectez-vous pour visiter le batiment.</p></a>`;
        }
        // Ajouter une popup
        new maptilersdk.Popup()
            .setLngLat(coordinates)
            .setHTML(popupHTML)
            .addTo(map);

         setTimeout(() => {
            const visitButton = document.getElementById('visitButton');
            if (visitButton) {
                visitButton.addEventListener('click', async function () {
                    const validate = postVisit(properties.id, userId);
                    if (validate){
                        alert('batiment visité avec succès !', location.reload())
                    }
            });
    }
}, 0); 
            
    });

    
    // Changer le curseur de la souris lorsqu'il survole un pointeur
    map.on('mouseenter', 'poi-markers', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'poi-markers', function () {
        map.getCanvas().style.cursor = '';
    });



    map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
            ],
            'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
        }
    });

    // Logic for changing the map view based on scroll
   
    function setActiveChapter(chapterId) {
        if (chapterId === activeChapterId) return;
        const chapter = chapters[chapterId];
        const randomAngle = Math.random()*180;
        map.flyTo({
            center: chapter.center,
            zoom: chapter.zoom,
            pitch: chapter.pitch,
            bearing: randomAngle,
            speed: 1.5, 
            curve: 1,
        });

        const targetSection = document.getElementById(properties.id)
        if (targetSection) {
            const topOffset = targetSection.getBoundingClientRect().top + window.pageYOffset - 10; // Ajout du décalage
            window.scrollTo({ top: topOffset, behavior: 'smooth' });
        }
    
        activeChapterId = chapterId;
    }

    window.onscroll = function () {
        var chapterIds = Object.keys(chapters);
        for (var i = 0; i < chapterIds.length; i++) {
            var chapterId = chapterIds[i];
            if (isElementOnScreen(chapterId)) {
                setActiveChapter(chapterId);
                break;
            }
        }
    };

    function isElementOnScreen(id) {
        var element = document.getElementById(id);
        if (!element) return false; // Sécuriser l'accès à l'élément
        var bounds = element.getBoundingClientRect();
        return bounds.top < window.innerHeight && bounds.bottom > 0;
    }
});



// Appeler la fonction pour peupler les descriptions au chargement de la page
window.onload = function() {
    populateBuildingDescriptions();
};