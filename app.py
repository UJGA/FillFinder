from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from datetime import datetime
import sqlite3
import requests
import os

app = Flask(__name__, static_folder='static')
CORS(app)


# Load the Google Maps API key
try:
    from config import GOOGLE_MAPS_API_KEY
except ImportError:
    GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY')

if not GOOGLE_MAPS_API_KEY:
    raise ValueError("Google Maps API key is not set. Please set it in config.py or as an environment variable.")

# Serve the homepage
@app.route('/')
def home():
    return render_template('index.html')

# Serve the "Locate a Pharmacy" page
@app.route('/locate_pharmacy')
def locate_pharmacy():
    return send_from_directory(app.static_folder, 'locate_pharmacy.html')

# Serve the "Add a Pharmacy" page
@app.route('/add_pharmacy')
def add_pharmacy_page():
    return send_from_directory(app.static_folder, 'add_pharmacy.html')

# API to add a new pharmacy
@app.route('/add_pharmacy', methods=['POST'])
def add_pharmacy():
    data = request.json
    name = data.get('name')
    address = data.get('address')
    lat = data.get('lat')
    lon = data.get('lon')
    date = data.get('date')
    zip_code = data.get('zip_code')
    
    conn = sqlite3.connect('pharmacies.db')
    c = conn.cursor()
    c.execute('INSERT INTO pharmacies (name, address, lat, lon, date, zip_code) VALUES (?, ?, ?, ?, ?, ?)', 
              (name, address, lat, lon, date, zip_code))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Pharmacy added successfully"}), 201

# API to get nearby pharmacies
@app.route('/get_pharmacies_by_zip', methods=['GET'])
def get_pharmacies_by_zip():
    try:
        zip_code = request.args.get('zip')
        if not zip_code:
            return jsonify({"error": "ZIP code is required"}), 400
        
        app.logger.info(f"Searching for pharmacies in zip code: {zip_code}")
        
        conn = sqlite3.connect('pharmacies.db')
        c = conn.cursor()

        c.execute('SELECT name, address, lat, lon, date FROM pharmacies WHERE zip_code=?', (zip_code,))
        pharmacies = c.fetchall()

        app.logger.info(f"Found {len(pharmacies)} pharmacies")

        if not pharmacies:
            return jsonify({"error": "No pharmacies found for the given ZIP code"}), 404
        
        grouped_pharmacies = {}
        for pharmacy in pharmacies:
            name, address, lat, lon, date = pharmacy
            key = (name, address, lat, lon)
            if key not in grouped_pharmacies:
                grouped_pharmacies[key] = {"name": name, "address": address, "lat": lat, "lon": lon, "dates": []}
            try:
                # Convert date string to datetime object, then format it
                date_obj = datetime.strptime(date, '%Y-%m-%d')
                formatted_date = date_obj.strftime('%m-%d-%y')
                grouped_pharmacies[key]["dates"].append(formatted_date)
            except ValueError as e:
                app.logger.error(f"Error parsing date {date}: {str(e)}")
                # If date parsing fails, add the original date string
                grouped_pharmacies[key]["dates"].append(date)

        nearby_pharmacies = list(grouped_pharmacies.values())
        for pharmacy in nearby_pharmacies:
            pharmacy["dates"] = sorted(set(pharmacy["dates"]), reverse=True)

        app.logger.info(f"Returning {len(nearby_pharmacies)} grouped pharmacies")
        return jsonify(nearby_pharmacies), 200
    
    except sqlite3.OperationalError as e:
        app.logger.error(f"SQLite error: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    
    except Exception as e:
        app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
    finally:
        if conn:
            conn.close()



# API to get Google Maps API key
@app.route('/get_maps_key', methods=['GET'])
def get_maps_key():
    return jsonify({"key": GOOGLE_MAPS_API_KEY}), 200

@app.route('/report_pharmacy')
def report_pharmacy():
    place_id = request.args.get('place_id')
    if not place_id:
        return "No pharmacy selected", 400

    # Fetch place details from Google Places API
    url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=name,formatted_address,geometry&key={GOOGLE_MAPS_API_KEY}"
    response = requests.get(url)
    if response.status_code != 200:
        return "Error fetching pharmacy details", 500

    place_details = response.json()['result']
    
    return render_template('report_pharmacy.html', 
                           name=place_details['name'],
                           address=place_details['formatted_address'],
                           lat=place_details['geometry']['location']['lat'],
                           lng=place_details['geometry']['location']['lng'],
                           place_id=place_id)


@app.route('/submit_report', methods=['POST'])
def submit_report():
    data = request.json
    name = data.get('name')
    address = data.get('address')
    lat = data.get('lat')
    lon = data.get('lon')
    date = data.get('date')
    zip_code = data.get('zip_code')
    
    conn = sqlite3.connect('pharmacies.db')
    c = conn.cursor()
    c.execute('INSERT INTO pharmacies (name, address, lat, lon, date, zip_code) VALUES (?, ?, ?, ?, ?, ?)', 
              (name, address, lat, lon, date, zip_code))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Pharmacy added successfully"}), 201

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/adderall_info')
def adderall_info():
    return render_template('adderall_info.html')


if __name__ == '__main__':
    app.run(debug=True)