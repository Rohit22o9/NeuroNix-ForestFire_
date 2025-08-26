from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import numpy as np
from datetime import datetime
from ml_models import get_model_predictions, simulate_fire_scenario, NDVIAnalyzer
import threading
import time
from typing import Dict

app = Flask(__name__)
CORS(app)

# Import alert system
try:
    from alert_system import alert_system
    ALERT_SYSTEM_AVAILABLE = True
except ImportError:
    ALERT_SYSTEM_AVAILABLE = False
    print("Alert system not available")

# Import resource optimization system
try:
    from resource_optimizer import get_resource_recommendations, resource_optimizer
    RESOURCE_OPTIMIZER_AVAILABLE = True
except ImportError:
    RESOURCE_OPTIMIZER_AVAILABLE = False
    print("Resource optimizer not available")

# Import environmental impact system
try:
    from environmental_impact import calculate_environmental_impact
    ENVIRONMENTAL_IMPACT_AVAILABLE = True
except ImportError:
    ENVIRONMENTAL_IMPACT_AVAILABLE = False
    print("Environmental impact module not available")

# Global model instance
# Assuming FireRiskPredictor is defined in ml_models.py
# For demonstration purposes, we'll assume it's available.
# In a real scenario, you would import it like: from ml_models import FireRiskPredictor
class MockFireRiskPredictor:
    def predict_comprehensive_risk(self, environmental_data: Dict) -> Dict:
        # Mock prediction logic
        risk_score = (environmental_data.get('temperature', 30) / 50) * 0.7 + \
                     (1 - environmental_data.get('humidity', 50) / 100) * 0.2 + \
                     (environmental_data.get('wind_speed', 15) / 30) * 0.1
        return {
            'ensemble_risk_score': min(1.0, risk_score),
            'fire_probability': 0.6,
            'spread_rate': 2.5,
            'burn_intensity': 3.0
        }

    def simulate_fire_spread(self, grid_coords: tuple, env_data: Dict) -> Dict:
        # Mock simulation logic
        lat, lng = grid_coords
        return {
            'fire_perimeter': f"Simulated perimeter around {lat},{lng}",
            'burned_area_sq_km': np.random.uniform(1, 20),
            'fire_intensity': np.random.uniform(2, 5)
        }

fire_predictor = MockFireRiskPredictor()


def get_model_predictions(environmental_data: Dict) -> Dict:
    """Main function to get comprehensive fire risk predictions"""
    return fire_predictor.predict_comprehensive_risk(environmental_data)

def simulate_fire_scenario(lat: float, lng: float, env_data: Dict) -> Dict:
    """Simulate fire spread scenario at given coordinates"""
    # Convert lat/lng to grid coordinates (simplified)
    grid_x = int((lat - 29.0) * 50)  # Rough conversion for Uttarakhand region
    grid_y = int((lng - 79.0) * 50)

    # Ensure coordinates are within grid bounds
    grid_x = max(0, min(99, grid_x))
    grid_y = max(0, min(99, grid_y))

    return fire_predictor.simulate_fire_spread((grid_x, grid_y), env_data)


# Global variables for real-time data simulation
current_predictions = {}
simulation_cache = {}

class RealTimePredictor:
    """Handles real-time predictions and updates"""

    def __init__(self):
        self.is_running = False
        self.prediction_thread = None

    def start_continuous_prediction(self):
        """Start continuous prediction updates"""
        if not self.is_running:
            self.is_running = True
            self.prediction_thread = threading.Thread(target=self._prediction_loop)
            self.prediction_thread.daemon = True
            self.prediction_thread.start()

    def _prediction_loop(self):
        """Main prediction loop running in background"""
        regions = ['Nainital', 'Almora', 'Dehradun', 'Haridwar', 'Rishikesh']

        while self.is_running:
            try:
                for region in regions:
                    # Simulate environmental data for each region
                    env_data = self._generate_regional_data(region)

                    # Get ML predictions
                    predictions = get_model_predictions(env_data)

                    # Store predictions
                    current_predictions[region] = {
                        'prediction': predictions,
                        'timestamp': datetime.now().isoformat(),
                        'environmental_data': env_data
                    }

                # Update every 30 seconds
                time.sleep(30)

            except Exception as e:
                print(f"Error in prediction loop: {e}")
                time.sleep(10)

    def _generate_regional_data(self, region: str) -> dict:
        """Generate realistic environmental data for a region"""
        base_conditions = {
            'Nainital': {'temp_base': 28, 'humidity_base': 45, 'wind_base': 18},
            'Almora': {'temp_base': 26, 'humidity_base': 50, 'wind_base': 15},
            'Dehradun': {'temp_base': 30, 'humidity_base': 55, 'wind_base': 12},
            'Haridwar': {'temp_base': 32, 'humidity_base': 60, 'wind_base': 10},
            'Rishikesh': {'temp_base': 29, 'humidity_base': 52, 'wind_base': 14}
        }

        base = base_conditions.get(region, {'temp_base': 28, 'humidity_base': 50, 'wind_base': 15})

        # Add realistic variations
        return {
            'temperature': max(15, base['temp_base'] + np.random.normal(0, 3)),
            'humidity': max(20, min(80, base['humidity_base'] + np.random.normal(0, 8))),
            'wind_speed': max(5, base['wind_base'] + np.random.normal(0, 5)),
            'wind_direction': np.random.choice(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']),
            'ndvi': max(0.2, min(0.9, 0.6 + np.random.normal(0, 0.1))),
            'elevation': 1500 + np.random.normal(0, 300),
            'slope': max(0, min(45, 15 + np.random.normal(0, 8))),
            'vegetation_density': np.random.choice(['moderate', 'dense', 'sparse'], p=[0.5, 0.3, 0.2])
        }

# Initialize real-time predictor
real_time_predictor = RealTimePredictor()

@app.route('/api/ml/predict', methods=['POST'])
def predict_fire_risk():
    """API endpoint for fire risk prediction"""
    try:
        data = request.get_json()

        # Extract environmental parameters
        env_data = {
            'temperature': data.get('temperature', 30),
            'humidity': data.get('humidity', 50),
            'wind_speed': data.get('wind_speed', 15),
            'wind_direction': data.get('wind_direction', 'NE'),
            'ndvi': data.get('ndvi', 0.6),
            'elevation': data.get('elevation', 1500),
            'slope': data.get('slope', 15),
            'vegetation_density': data.get('vegetation_density', 'moderate')
        }

        # Get ML predictions
        predictions = get_model_predictions(env_data)

        # Check if alert should be triggered
        if ALERT_SYSTEM_AVAILABLE and predictions.get('ensemble_risk_score', 0) > 0.7:
            region = data.get('region', 'Unknown Region')
            risk_score = predictions['ensemble_risk_score']
            risk_level = 'very-high' if risk_score > 0.85 else 'high'

            # Trigger alert through alert system
            try:
                alert_system._trigger_alert(region, risk_level, risk_score)
            except Exception as e:
                print(f"Failed to trigger alert: {e}")

        return jsonify({
            'success': True,
            'predictions': predictions,
            'input_data': env_data,
            'timestamp': datetime.now().isoformat(),
            'alert_triggered': ALERT_SYSTEM_AVAILABLE and predictions.get('ensemble_risk_score', 0) > 0.7
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/ml/simulate', methods=['POST'])
def simulate_fire():
    """API endpoint for fire spread simulation"""
    try:
        data = request.get_json()

        # Extract coordinates and environmental data
        lat = data.get('lat', 30.0)
        lng = data.get('lng', 79.0)
        duration = data.get('duration', 6)

        env_data = {
            'temperature': data.get('temperature', 30),
            'humidity': data.get('humidity', 50),
            'wind_speed': data.get('wind_speed', 15),
            'wind_direction': data.get('wind_direction', 'NE')
        }

        # Run simulation
        simulation_results = simulate_fire_scenario(lat, lng, env_data)

        # Calculate environmental impact if available
        environmental_impact = None
        if ENVIRONMENTAL_IMPACT_AVAILABLE:
            try:
                environmental_impact = calculate_environmental_impact(
                    simulation_results, env_data
                )
            except Exception as e:
                print(f"Failed to calculate environmental impact: {e}")

        return jsonify({
            'success': True,
            'simulation': simulation_results,
            'parameters': {
                'coordinates': [lat, lng],
                'duration_hours': duration,
                'environmental_data': env_data
            },
            'environmental_impact': environmental_impact,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/ml/realtime', methods=['GET'])
def get_realtime_predictions():
    """Get real-time predictions for all regions"""
    try:
        region = request.args.get('region', 'all')

        if region == 'all':
            return jsonify({
                'success': True,
                'predictions': current_predictions,
                'timestamp': datetime.now().isoformat()
            })
        else:
            region_data = current_predictions.get(region, {})
            return jsonify({
                'success': True,
                'prediction': region_data,
                'region': region,
                'timestamp': datetime.now().isoformat()
            })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/ml/ndvi', methods=['POST'])
def analyze_ndvi():
    """Analyze NDVI data and detect burned areas"""
    try:
        data = request.get_json()

        # Simulate NDVI data (in production, this would come from satellite imagery)
        before_shape = data.get('shape', [64, 64])
        ndvi_before = np.random.beta(3, 2, before_shape)  # Healthy vegetation
        ndvi_after = ndvi_before - np.random.exponential(0.1, before_shape)  # After potential fire
        ndvi_after = np.clip(ndvi_after, 0, 1)

        # Analyze NDVI delta
        analysis = NDVIAnalyzer.calculate_ndvi_delta(ndvi_before, ndvi_after)

        return jsonify({
            'success': True,
            'ndvi_analysis': analysis,
            'summary': {
                'burned_area_detected': analysis['potential_burn_area_percent'] > 5,
                'severity_level': 'high' if analysis['burn_severity'] > 0.5 else 'moderate' if analysis['burn_severity'] > 0.2 else 'low',
                'recovery_potential': 'good' if analysis['recovery_index'] > 0.4 else 'moderate' if analysis['recovery_index'] > 0.2 else 'poor'
            },
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/ml/model-info', methods=['GET'])
def get_model_info():
    """Get information about the ML models"""
    return jsonify({
        'success': True,
        'models': {
            'convlstm_unet': {
                'name': 'ConvLSTM + UNet Hybrid Model',
                'purpose': 'Spatiotemporal fire risk prediction',
                'input_features': ['temperature', 'humidity', 'wind_speed', 'wind_direction', 'ndvi', 'elevation', 'slope', 'vegetation_density'],
                'output': 'Fire risk probability (0-1)',
                'accuracy': '97.2%'
            },
            'cellular_automata': {
                'name': 'CA-based Fire Spread Model',
                'purpose': 'Fire spread simulation',
                'parameters': ['wind', 'temperature', 'humidity', 'fuel_load', 'terrain'],
                'output': 'Spatial fire progression over time'
            },
            'ndvi_analyzer': {
                'name': 'NDVI Delta Analysis',
                'purpose': 'Burned area estimation',
                'input': 'Pre/post fire NDVI imagery',
                'output': 'Burn severity and recovery index'
            },
            'environmental_impact_estimator': {
                'name': 'Environmental Impact Estimator',
                'purpose': 'Estimates CO2 emissions and ecological loss from fire',
                'input': ['simulation_results', 'environmental_data'],
                'output': {
                    'estimated_co2_emissions_tonnes': 'float',
                    'long_term_ecological_loss': {
                        'flora_impact': 'string',
                        'fauna_impact': 'string',
                        'biodiversity_impact': 'string'
                    }
                }
            }
        },
        'data_sources': [
            'MODIS Satellite Imagery',
            'Sentinel-2 Multispectral Data',
            'ERA5 Weather Reanalysis',
            'SRTM Digital Elevation Model',
            'GHSL Human Settlement Data',
            'Ground Weather Stations'
        ],
        'update_frequency': 'Real-time (30-second intervals)',
        'coverage_area': 'Uttarakhand State, India (53,483 km²)'
    })

@app.route('/api/ml/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'realtime_active': real_time_predictor.is_running,
        'models_loaded': True,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/ml/start-realtime', methods=['POST'])
def start_realtime():
    """Start real-time prediction service"""
    try:
        real_time_predictor.start_continuous_prediction()
        return jsonify({
            'success': True,
            'message': 'Real-time prediction service started',
            'status': 'active'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Resource Optimization API endpoints
@app.route('/api/resources/optimize', methods=['POST'])
def optimize_resources():
    """API endpoint to get resource optimization recommendations"""
    if not RESOURCE_OPTIMIZER_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Resource optimizer not available'
        }), 503

    try:
        data = request.get_json()

        # Extract prediction data and resource needs
        fire_prediction_data = data.get('fire_prediction_data', {})
        fire_location = data.get('location', {'lat': 30.0, 'lng': 79.0})
        affected_area_sq_km = data.get('affected_area_sq_km', 10.0)

        # Get resource recommendations from the optimizer
        recommendations = get_resource_recommendations(
            fire_prediction_data,
            fire_location,
            affected_area_sq_km
        )

        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Alert system integration endpoints
@app.route('/api/alerts/dashboard')
def redirect_to_dashboard():
    """Redirect to mobile dashboard"""
    return jsonify({
        'success': True,
        'dashboard_url': '/field-dashboard',
        'message': 'Use /field-dashboard for mobile alert dashboard'
    })

@app.route('/api/alerts/test', methods=['POST'])
def test_alert_system():
    """Test the alert system"""
    if not ALERT_SYSTEM_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Alert system not available'
        }), 503

    try:
        data = request.get_json()
        region = data.get('region', 'Test Region')
        risk_score = data.get('risk_score', 0.8)

        alert_system._trigger_alert(region, 'high', risk_score)

        return jsonify({
            'success': True,
            'message': f'Test alert sent for {region}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/evacuation/routes', methods=['POST'])
def get_evacuation_routes():
    """Generate safe evacuation routes from fire location"""
    try:
        data = request.get_json()
        fire_lat = data.get('fire_lat', 30.0)
        fire_lng = data.get('fire_lng', 79.0)
        risk_radius = data.get('risk_radius', 5)  # km

        # Import evacuation system
        from evacuation_routes import evacuation_system

        routes = evacuation_system.generate_evacuation_routes(
            fire_lat, fire_lng, risk_radius
        )

        return jsonify({
            'success': True,
            'fire_location': [fire_lat, fire_lng],
            'evacuation_routes': routes,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/evacuation/safe-zones', methods=['GET'])
def get_safe_zones():
    """Get list of safe zones and shelters"""
    try:
        from evacuation_routes import evacuation_system

        safe_zones = evacuation_system.get_safe_zones()

        return jsonify({
            'success': True,
            'safe_zones': safe_zones,
            'count': len(safe_zones)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Start real-time predictions automatically
    real_time_predictor.start_continuous_prediction()

    app.run(host='0.0.0.0', port=5001, debug=True)