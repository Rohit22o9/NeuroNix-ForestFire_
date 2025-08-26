
import requests
import json
import numpy as np
from typing import List, Dict, Tuple
from dataclasses import dataclass
import math
from datetime import datetime

@dataclass
class SafeZone:
    name: str
    lat: float
    lng: float
    capacity: int
    type: str  # 'school', 'hospital', 'government', 'community_center'
    facilities: List[str]

@dataclass
class EvacuationRoute:
    route_id: str
    start_point: Tuple[float, float]
    end_point: Tuple[float, float]
    waypoints: List[Tuple[float, float]]
    distance_km: float
    estimated_time_minutes: int
    safety_score: float
    route_type: str  # 'primary', 'secondary', 'emergency'
    instructions: List[str]

class EvacuationRouteMapper:
    def __init__(self):
        # Safe zones in Uttarakhand (schools, hospitals, government buildings)
        self.safe_zones = [
            SafeZone("Nainital District Hospital", 29.3919, 79.4542, 500, "hospital", ["medical", "emergency"]),
            SafeZone("Government Inter College Nainital", 29.3806, 79.4422, 1000, "school", ["shelter", "food"]),
            SafeZone("Collectorate Nainital", 29.3833, 79.4500, 300, "government", ["coordination", "communication"]),
            SafeZone("Almora District Hospital", 29.5967, 79.6653, 400, "hospital", ["medical", "emergency"]),
            SafeZone("Government Degree College Almora", 29.5833, 79.6667, 800, "school", ["shelter", "food"]),
            SafeZone("Dehradun Medical College", 30.3256, 78.0436, 1200, "hospital", ["medical", "emergency"]),
            SafeZone("Forest Research Institute", 30.3356, 78.0436, 2000, "government", ["large_shelter", "research"]),
            SafeZone("Haridwar Railway Station", 29.9458, 78.1642, 5000, "transport", ["evacuation_hub", "transport"]),
            SafeZone("AIIMS Rishikesh", 30.0869, 78.2676, 1000, "hospital", ["medical", "emergency"]),
            SafeZone("Uttarakhand Police Headquarters", 30.3165, 78.0322, 500, "government", ["coordination", "security"])
        ]
        
        # Major road networks and highways in Uttarakhand
        self.major_roads = [
            {"name": "NH-109 (Nainital-Haldwani)", "points": [(29.3806, 79.4422), (29.2183, 79.5130)]},
            {"name": "NH-87 (Dehradun-Rishikesh)", "points": [(30.3165, 78.0322), (30.0869, 78.2676)]},
            {"name": "NH-7 (Haridwar Highway)", "points": [(29.9458, 78.1642), (30.3165, 78.0322)]},
            {"name": "Almora-Nainital Road", "points": [(29.5833, 79.6667), (29.3806, 79.4422)]},
            {"name": "Hill Station Connect Road", "points": [(30.0869, 78.2676), (29.3806, 79.4422)]}
        ]
        
        # OpenStreetMap Overpass API endpoint
        self.overpass_url = "https://overpass-api.de/api/interpreter"
        
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def find_nearest_safe_zones(self, fire_lat: float, fire_lng: float, 
                               risk_radius: float, max_zones: int = 5) -> List[SafeZone]:
        """Find nearest safe zones outside the risk radius"""
        safe_zones_with_distance = []
        
        for zone in self.safe_zones:
            distance = self.calculate_distance(fire_lat, fire_lng, zone.lat, zone.lng)
            
            # Only consider zones outside the risk radius
            if distance > risk_radius:
                safe_zones_with_distance.append((zone, distance))
        
        # Sort by distance and return closest ones
        safe_zones_with_distance.sort(key=lambda x: x[1])
        return [zone for zone, _ in safe_zones_with_distance[:max_zones]]
    
    def generate_route_via_osm(self, start_lat: float, start_lng: float, 
                              end_lat: float, end_lng: float) -> Dict:
        """Generate route using OpenStreetMap routing (fallback method)"""
        try:
            # Use OSRM demo server for routing
            osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}"
            params = {
                'overview': 'full',
                'geometries': 'geojson',
                'steps': 'true'
            }
            
            response = requests.get(osrm_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('routes'):
                    route = data['routes'][0]
                    return {
                        'success': True,
                        'geometry': route['geometry']['coordinates'],
                        'distance': route['distance'] / 1000,  # Convert to km
                        'duration': route['duration'] / 60,    # Convert to minutes
                        'steps': [step['maneuver']['instruction'] for step in route['legs'][0]['steps']]
                    }
            
            # Fallback to direct route
            return self.generate_direct_route(start_lat, start_lng, end_lat, end_lng)
            
        except Exception as e:
            print(f"OSM routing failed: {e}")
            return self.generate_direct_route(start_lat, start_lng, end_lat, end_lng)
    
    def generate_direct_route(self, start_lat: float, start_lng: float, 
                             end_lat: float, end_lng: float) -> Dict:
        """Generate direct route when API is unavailable"""
        distance = self.calculate_distance(start_lat, start_lng, end_lat, end_lng)
        
        # Create waypoints for a more realistic path using major roads
        waypoints = self.find_road_waypoints(start_lat, start_lng, end_lat, end_lng)
        
        return {
            'success': True,
            'geometry': [[start_lng, start_lat]] + waypoints + [[end_lng, end_lat]],
            'distance': distance,
            'duration': distance * 1.5,  # Assume 40 km/h average speed
            'steps': [
                "Head towards nearest major road",
                f"Follow evacuation route for {distance:.1f} km",
                "Arrive at safe zone"
            ]
        }
    
    def find_road_waypoints(self, start_lat: float, start_lng: float, 
                           end_lat: float, end_lng: float) -> List[List[float]]:
        """Find intermediate waypoints using major roads"""
        waypoints = []
        
        # Find the closest major road to start point
        min_start_dist = float('inf')
        closest_start_road = None
        
        for road in self.major_roads:
            for point in road['points']:
                dist = self.calculate_distance(start_lat, start_lng, point[0], point[1])
                if dist < min_start_dist:
                    min_start_dist = dist
                    closest_start_road = point
        
        # Find the closest major road to end point
        min_end_dist = float('inf')
        closest_end_road = None
        
        for road in self.major_roads:
            for point in road['points']:
                dist = self.calculate_distance(end_lat, end_lng, point[0], point[1])
                if dist < min_end_dist:
                    min_end_dist = dist
                    closest_end_road = point
        
        # Add waypoints if roads are found
        if closest_start_road and min_start_dist < 20:  # Within 20km
            waypoints.append([closest_start_road[1], closest_start_road[0]])
        
        if closest_end_road and min_end_dist < 20:  # Within 20km
            waypoints.append([closest_end_road[1], closest_end_road[0]])
        
        return waypoints
    
    def calculate_safety_score(self, route_geometry: List, fire_lat: float, 
                              fire_lng: float, risk_radius: float) -> float:
        """Calculate safety score based on distance from fire and terrain"""
        if not route_geometry:
            return 0.5
        
        # Check how much of the route is outside the risk zone
        safe_points = 0
        total_points = len(route_geometry)
        
        for point in route_geometry:
            point_distance = self.calculate_distance(fire_lat, fire_lng, point[1], point[0])
            if point_distance > risk_radius:
                safe_points += 1
        
        base_safety = safe_points / total_points if total_points > 0 else 0
        
        # Add bonus for routes that quickly exit risk zone
        if len(route_geometry) > 2:
            early_exit_dist = self.calculate_distance(
                fire_lat, fire_lng, 
                route_geometry[len(route_geometry)//4][1], 
                route_geometry[len(route_geometry)//4][0]
            )
            if early_exit_dist > risk_radius:
                base_safety += 0.2
        
        return min(1.0, base_safety)
    
    def generate_evacuation_routes(self, fire_lat: float, fire_lng: float, 
                                  risk_radius: float) -> List[Dict]:
        """Generate multiple evacuation routes from fire location"""
        safe_zones = self.find_nearest_safe_zones(fire_lat, fire_lng, risk_radius)
        
        if not safe_zones:
            return []
        
        evacuation_routes = []
        
        for i, zone in enumerate(safe_zones):
            # Generate route to this safe zone
            route_data = self.generate_route_via_osm(fire_lat, fire_lng, zone.lat, zone.lng)
            
            if route_data['success']:
                safety_score = self.calculate_safety_score(
                    route_data['geometry'], fire_lat, fire_lng, risk_radius
                )
                
                route_type = 'primary' if i == 0 else 'secondary' if i < 3 else 'emergency'
                
                evacuation_route = {
                    'route_id': f"evac_route_{i+1}",
                    'destination': {
                        'name': zone.name,
                        'type': zone.type,
                        'capacity': zone.capacity,
                        'facilities': zone.facilities,
                        'coordinates': [zone.lat, zone.lng]
                    },
                    'geometry': route_data['geometry'],
                    'distance_km': round(route_data['distance'], 2),
                    'estimated_time_minutes': round(route_data['duration'], 0),
                    'safety_score': round(safety_score, 2),
                    'route_type': route_type,
                    'instructions': route_data['steps'],
                    'color': self.get_route_color(route_type),
                    'priority': i + 1
                }
                
                evacuation_routes.append(evacuation_route)
        
        return evacuation_routes
    
    def get_route_color(self, route_type: str) -> str:
        """Get color code for route visualization"""
        colors = {
            'primary': '#10b981',    # Green
            'secondary': '#f59e0b',  # Yellow
            'emergency': '#ef4444'   # Red
        }
        return colors.get(route_type, '#6b7280')
    
    def get_safe_zones(self) -> List[Dict]:
        """Get all available safe zones"""
        return [
            {
                'name': zone.name,
                'coordinates': [zone.lat, zone.lng],
                'capacity': zone.capacity,
                'type': zone.type,
                'facilities': zone.facilities
            }
            for zone in self.safe_zones
        ]

# Global evacuation system instance
evacuation_system = EvacuationRouteMapper()
