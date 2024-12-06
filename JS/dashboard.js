// Initialiser la carte Google
function initMap() {
    const caen = { lat: 49.1856, lng: -0.3553 };
    const map = new google.maps.Map(document.getElementById('google-map'), {
        zoom: 10,
        center: caen
    });

    // Ajouter des marqueurs pour les monuments
    const marker = new google.maps.Marker({
        position: caen,
        map: map,
        title: 'Caen - Guillaume le Conquérant'
    });
}

// Exemple de fonction pour ajouter un événement
function addEvent(title, description) {
    const eventList = document.getElementById('event-list');
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event';
    eventDiv.innerHTML = `<h3>${title}</h3><p>${description}</p>`;
    eventList.appendChild(eventDiv);
}

// Ajouter un événement de démonstration
addEvent('Millénaire de Caen - Guillaume le Conquérant', 'Célébration du millénaire de Caen et de Guillaume le Conquérant.');

// Exemple de fonction pour ajouter un badge
function addBadge(name) {
    const badgeList = document.getElementById('badge-list');
    const badgeDiv = document.createElement('div');
    badgeDiv.className = 'badge';
    badgeDiv.innerText = name;
    badgeList.appendChild(badgeDiv);
}

// Ajouter un badge de démonstration
addBadge('Badge de Caen');
