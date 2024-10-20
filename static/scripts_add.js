let map;
let placesService;
let markers = [];

function loadGoogleMaps(apiKey) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        window.initMap = function() {
            if (typeof google === 'undefined') {
                reject("Google Maps API is not available.");
                return;
            }

            map = new google.maps.Map(document.getElementById("map"), {
                center: { lat: 39.8283, lng: -98.5795 },
                zoom: 4,
                mapId: '68414575730b17c0'
            });

            placesService = new google.maps.places.PlacesService(map);
            console.log("Map initialized successfully.");
            resolve();
        };

        script.onerror = () => reject("Failed to load the Google Maps script.");
    });
}

function searchPharmacies() {
    const searchInput = document.getElementById("searchInput");
    const messageDiv = document.getElementById("message");
    const pharmacyListDiv = document.getElementById("pharmacyList");
    const mapDiv = document.getElementById("map");

    if (!searchInput || !messageDiv || !pharmacyListDiv || !mapDiv) {
        console.error("One or more elements are missing in the DOM.");
        return;
    }

    messageDiv.style.display = "none";
    pharmacyListDiv.style.display = "none";
    mapDiv.style.display = "none";
    pharmacyListDiv.innerHTML = "";

    clearMarkers();

    const request = {
        query: searchInput.value + " pharmacy",
        type: 'pharmacy',
        fields: ['name', 'formatted_address', 'geometry', 'place_id']
    };

    placesService.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            pharmacyListDiv.style.display = "block";
            mapDiv.style.display = "block";
            displayPharmacies(results);
        } else {
            messageDiv.style.display = "block";
            messageDiv.innerText = "No pharmacies found. Please try a different search.";
        }
    });
}

function displayPharmacies(pharmacies) {
    const pharmacyListDiv = document.getElementById("pharmacyList");
    const bounds = new google.maps.LatLngBounds();

    pharmacies.forEach(pharmacy => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.innerHTML = `
            <strong>${pharmacy.name}</strong><br>
            Address: ${pharmacy.formatted_address}<br>
            <button onclick="selectPharmacy('${pharmacy.place_id}')">Select</button>
        `;
        pharmacyListDiv.appendChild(card);

        const markerView = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: pharmacy.geometry.location,
            title: pharmacy.name
        });

        markers.push(markerView);
        bounds.extend(pharmacy.geometry.location);
    });

    map.fitBounds(bounds);
}

function clearMarkers() {
    for (let marker of markers) {
        marker.map = null;
    }
    markers = [];
}

function selectPharmacy(placeId) {
    window.location.href = `/report_pharmacy?place_id=${placeId}`;
}

// Ensure Google Maps is loaded when the page loads
window.onload = function() {
    fetch('/get_maps_key')
        .then(response => response.json())
        .then(data => {
            const googleMapsApiKey = data.key;
            if (googleMapsApiKey) {
                return loadGoogleMaps(googleMapsApiKey);
            } else {
                throw new Error("API key not found.");
            }
        })
        .then(() => {
            console.log("Google Maps loaded successfully.");
        })
        .catch(error => {
            console.error("Error loading Google Maps:", error);
        });
};