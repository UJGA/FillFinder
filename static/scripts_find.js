let map;
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

            console.log("Map initialized successfully.");
            resolve();
        };

        script.onerror = () => reject("Failed to load the Google Maps script.");
    });
}

function searchPharmacies() {
    const zipCode = document.getElementById("zipCode").value;
    const messageDiv = document.getElementById("message");
    const pharmacyListDiv = document.getElementById("pharmacyList");
    const pharmacyListItems = document.getElementById("pharmacyListItems");
    const mapDiv = document.getElementById("map");

    if (!zipCode || !messageDiv || !pharmacyListDiv || !mapDiv || !pharmacyListItems) {
        console.error("One or more elements are missing in the DOM.");
        return;
    }

    messageDiv.style.display = "none";
    pharmacyListDiv.style.display = "none";
    mapDiv.style.display = "none";
    pharmacyListItems.innerHTML = "";

    clearMarkers();

    fetch(`/get_pharmacies_by_zip?zip=${zipCode}`)
        .then(response => response.json())
        .then(pharmacies => {
            if (pharmacies.error) {
                messageDiv.style.display = "block";
                messageDiv.innerText = pharmacies.error;
            } else {
                pharmacyListDiv.style.display = "block";
                mapDiv.style.display = "block";
                displayPharmacies(pharmacies);
            }
        })
        .catch(error => {
            console.error("Error fetching pharmacies:", error);
            messageDiv.style.display = "block";
            messageDiv.innerText = "An error occurred while fetching pharmacies. Please try again.";
        });
}

function displayPharmacies(pharmacies) {
    const pharmacyListItems = document.getElementById("pharmacyListItems");
    const bounds = new google.maps.LatLngBounds();

    pharmacies.forEach(pharmacy => {
        const card = document.createElement('div');
        card.classList.add('card');
        
        const dateLabel = pharmacy.dates.length > 1 ? "Dates Reported" : "Date Reported";
        const datesHtml = pharmacy.dates.join(", ");
        
        card.innerHTML = `
            <strong>${pharmacy.name}</strong><br>
            Address: ${pharmacy.address}<br>
            ${dateLabel}: ${datesHtml}
        `;
        pharmacyListItems.appendChild(card);

        const position = { lat: parseFloat(pharmacy.lat), lng: parseFloat(pharmacy.lon) };
        const markerView = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: position,
            title: pharmacy.name
        });

        markers.push(markerView);
        bounds.extend(position);
    });

    if (pharmacies.length > 0) {
        map.fitBounds(bounds);
    } else {
        map.setCenter({ lat: 39.8283, lng: -98.5795 });
        map.setZoom(4);
    }
}

function clearMarkers() {
    for (let marker of markers) {
        marker.map = null;
    }
    markers = [];
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