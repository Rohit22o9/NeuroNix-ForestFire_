
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import json

@dataclass
class Resource:
    """Represents a firefighting resource"""
    id: str
    type: str  # 'firefighter_crew', 'water_tank', 'drone', 'helicopter'
    location: Tuple[float, float]  # lat, lng
    capacity: float  # crew size, water volume, flight time, etc.
    status: str  # 'available', 'deployed', 'maintenance'
    response_time_minutes: int
    operational_cost_per_hour: float
    effectiveness_rating: float  # 0-1 scale

@dataclass
class ResourceRecommendation:
    """Represents a resource deployment recommendation"""
    resource_id: str
    resource_type: str
    priority: str  # 'critical', 'high', 'medium', 'low'
    deployment_location: Tuple[float, float]
    region_name: str
    estimated_arrival_time: int  # minutes
    recommended_duration: int  # hours
    justification: str
    cost_estimate: float
    effectiveness_score: float

class ResourceOptimizationEngine:
    """AI-powered resource optimization engine for forest fire management"""
    
    def __init__(self):
        self.available_resources = self._initialize_resources()
        self.deployment_history = []
        self.efficiency_weights = {
            'response_time': 0.25,
            'effectiveness': 0.30,
            'cost_efficiency': 0.20,
            'resource_availability': 0.25
        }
        
    def _initialize_resources(self) -> List[Resource]:
        """Initialize available firefighting resources"""
        resources = []
        
        # Firefighter Crews
        firefighter_locations = [
            ("Nainital Fire Station", 29.3806, 79.4422),
            ("Almora Fire Station", 29.5833, 79.6667),
            ("Dehradun Fire Station", 30.3165, 78.0322),
            ("Haridwar Fire Station", 29.9458, 78.1642),
            ("Rishikesh Fire Station", 30.0869, 78.2676)
        ]
        
        for i, (name, lat, lng) in enumerate(firefighter_locations):
            resources.append(Resource(
                id=f"crew_{i+1}",
                type="firefighter_crew",
                location=(lat, lng),
                capacity=15,  # crew size
                status="available",
                response_time_minutes=15 + np.random.randint(0, 10),
                operational_cost_per_hour=2500,  # INR per hour
                effectiveness_rating=0.85 + np.random.random() * 0.1
            ))
        
        # Water Tankers
        tanker_locations = [
            (29.4000, 79.4500),  # Near Nainital
            (29.6000, 79.7000),  # Near Almora
            (30.3000, 78.0500),  # Near Dehradun
        ]
        
        for i, (lat, lng) in enumerate(tanker_locations):
            resources.append(Resource(
                id=f"tanker_{i+1}",
                type="water_tank",
                location=(lat, lng),
                capacity=5000,  # liters
                status="available",
                response_time_minutes=20 + np.random.randint(0, 15),
                operational_cost_per_hour=1200,
                effectiveness_rating=0.75 + np.random.random() * 0.15
            ))
        
        # Surveillance Drones
        drone_bases = [
            (29.3500, 79.4000),  # Nainital base
            (30.3200, 78.0200),  # Dehradun base
        ]
        
        for i, (lat, lng) in enumerate(drone_bases):
            resources.append(Resource(
                id=f"drone_{i+1}",
                type="drone",
                location=(lat, lng),
                capacity=4,  # flight hours
                status="available",
                response_time_minutes=5 + np.random.randint(0, 5),
                operational_cost_per_hour=800,
                effectiveness_rating=0.70 + np.random.random() * 0.20
            ))
        
        # Helicopters
        helicopter_bases = [
            (30.1850, 78.0420),  # Dehradun helipad
            (29.3900, 79.4600),  # Nainital helipad
        ]
        
        for i, (lat, lng) in enumerate(helicopter_bases):
            resources.append(Resource(
                id=f"helicopter_{i+1}",
                type="helicopter",
                location=(lat, lng),
                capacity=2000,  # water capacity in liters
                status="available",
                response_time_minutes=10 + np.random.randint(0, 8),
                operational_cost_per_hour=15000,
                effectiveness_rating=0.90 + np.random.random() * 0.05
            ))
        
        return resources
    
    def optimize_resource_deployment(self, predictions: Dict) -> List[ResourceRecommendation]:
        """Generate optimal resource deployment recommendations based on fire predictions"""
        recommendations = []
        
        if not predictions:
            return recommendations
        
        # Process each region's prediction
        regions_data = self._extract_regional_predictions(predictions)
        
        for region_data in regions_data:
            region_recommendations = self._optimize_for_region(region_data)
            recommendations.extend(region_recommendations)
        
        # Sort recommendations by priority and effectiveness
        recommendations.sort(key=lambda x: (
            self._priority_score(x.priority),
            -x.effectiveness_score
        ))
        
        return recommendations[:15]  # Return top 15 recommendations
    
    def _extract_regional_predictions(self, predictions: Dict) -> List[Dict]:
        """Extract and structure regional prediction data"""
        regions_data = []
        
        # Regional coordinates mapping
        region_coords = {
            'Nainital': (29.3806, 79.4422),
            'Almora': (29.5833, 79.6667),
            'Dehradun': (30.3165, 78.0322),
            'Haridwar': (29.9458, 78.1642),
            'Rishikesh': (30.0869, 78.2676)
        }
        
        # Simulate regional risk scores (in a real system, this would come from your ML predictions)
        base_risks = {
            'Nainital': 0.85,
            'Almora': 0.68,
            'Dehradun': 0.42,
            'Haridwar': 0.28,
            'Rishikesh': 0.35
        }
        
        for region, coords in region_coords.items():
            risk_score = base_risks.get(region, 0.5)
            # Add some variation
            risk_score += (np.random.random() - 0.5) * 0.1
            risk_score = max(0, min(1, risk_score))
            
            regions_data.append({
                'region': region,
                'coordinates': coords,
                'risk_score': risk_score,
                'risk_level': self._categorize_risk(risk_score),
                'terrain_difficulty': np.random.choice(['easy', 'moderate', 'difficult']),
                'vegetation_density': np.random.choice(['sparse', 'moderate', 'dense']),
                'wind_speed': 10 + np.random.randint(0, 15),
                'accessibility': np.random.choice(['high', 'medium', 'low'])
            })
        
        return regions_data
    
    def _categorize_risk(self, risk_score: float) -> str:
        """Categorize risk score into risk levels"""
        if risk_score >= 0.8:
            return "very-high"
        elif risk_score >= 0.6:
            return "high"
        elif risk_score >= 0.4:
            return "moderate"
        else:
            return "low"
    
    def _optimize_for_region(self, region_data: Dict) -> List[ResourceRecommendation]:
        """Generate resource recommendations for a specific region"""
        recommendations = []
        region = region_data['region']
        coords = region_data['coordinates']
        risk_score = region_data['risk_score']
        risk_level = region_data['risk_level']
        
        if risk_score < 0.3:
            return recommendations  # No resources needed for very low risk
        
        # Determine resource requirements based on risk level
        resource_requirements = self._calculate_resource_requirements(region_data)
        
        for resource_type, requirement in resource_requirements.items():
            if requirement['quantity'] > 0:
                suitable_resources = self._find_suitable_resources(
                    resource_type, coords, requirement
                )
                
                for resource in suitable_resources[:requirement['quantity']]:
                    recommendation = self._create_recommendation(
                        resource, region_data, requirement
                    )
                    recommendations.append(recommendation)
        
        return recommendations
    
    def _calculate_resource_requirements(self, region_data: Dict) -> Dict:
        """Calculate resource requirements based on regional conditions"""
        risk_score = region_data['risk_score']
        terrain = region_data['terrain_difficulty']
        vegetation = region_data['vegetation_density']
        accessibility = region_data['accessibility']
        
        # Base requirements
        requirements = {
            'firefighter_crew': {'quantity': 0, 'priority': 'medium'},
            'water_tank': {'quantity': 0, 'priority': 'medium'},
            'drone': {'quantity': 0, 'priority': 'low'},
            'helicopter': {'quantity': 0, 'priority': 'low'}
        }
        
        # Adjust based on risk score
        if risk_score >= 0.8:
            requirements['firefighter_crew']['quantity'] = 3
            requirements['firefighter_crew']['priority'] = 'critical'
            requirements['water_tank']['quantity'] = 2
            requirements['water_tank']['priority'] = 'critical'
            requirements['helicopter']['quantity'] = 1
            requirements['helicopter']['priority'] = 'high'
            requirements['drone']['quantity'] = 2
            requirements['drone']['priority'] = 'high'
        elif risk_score >= 0.6:
            requirements['firefighter_crew']['quantity'] = 2
            requirements['firefighter_crew']['priority'] = 'high'
            requirements['water_tank']['quantity'] = 1
            requirements['water_tank']['priority'] = 'high'
            requirements['drone']['quantity'] = 1
            requirements['drone']['priority'] = 'medium'
        elif risk_score >= 0.4:
            requirements['firefighter_crew']['quantity'] = 1
            requirements['firefighter_crew']['priority'] = 'medium'
            requirements['drone']['quantity'] = 1
            requirements['drone']['priority'] = 'medium'
        
        # Adjust for terrain and accessibility
        if terrain == 'difficult' or accessibility == 'low':
            requirements['helicopter']['quantity'] += 1
            requirements['helicopter']['priority'] = self._elevate_priority(
                requirements['helicopter']['priority']
            )
        
        if vegetation == 'dense':
            requirements['water_tank']['quantity'] += 1
        
        return requirements
    
    def _find_suitable_resources(self, resource_type: str, target_coords: Tuple[float, float], requirement: Dict) -> List[Resource]:
        """Find suitable resources for deployment"""
        suitable_resources = []
        
        for resource in self.available_resources:
            if (resource.type == resource_type and 
                resource.status == 'available'):
                
                # Calculate distance and travel time
                distance = self._calculate_distance(resource.location, target_coords)
                travel_time = self._estimate_travel_time(resource, distance)
                
                # Calculate suitability score
                suitability_score = self._calculate_suitability_score(
                    resource, distance, travel_time, requirement
                )
                
                suitable_resources.append((resource, suitability_score, travel_time))
        
        # Sort by suitability score (descending)
        suitable_resources.sort(key=lambda x: x[1], reverse=True)
        
        return [resource for resource, score, time in suitable_resources]
    
    def _calculate_distance(self, coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """Calculate distance between two coordinates in kilometers"""
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        
        # Haversine formula
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = np.radians(lat1)
        lat2_rad = np.radians(lat2)
        delta_lat = np.radians(lat2 - lat1)
        delta_lon = np.radians(lon2 - lon1)
        
        a = (np.sin(delta_lat / 2) ** 2 + 
             np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(delta_lon / 2) ** 2)
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
        
        return R * c
    
    def _estimate_travel_time(self, resource: Resource, distance: float) -> int:
        """Estimate travel time in minutes"""
        speed_kmh = {
            'firefighter_crew': 60,  # road vehicle
            'water_tank': 50,       # heavy vehicle
            'drone': 80,            # direct flight
            'helicopter': 150       # direct flight
        }
        
        base_speed = speed_kmh.get(resource.type, 60)
        travel_time_hours = distance / base_speed
        travel_time_minutes = int(travel_time_hours * 60) + resource.response_time_minutes
        
        return travel_time_minutes
    
    def _calculate_suitability_score(self, resource: Resource, distance: float, travel_time: int, requirement: Dict) -> float:
        """Calculate resource suitability score"""
        # Factors affecting suitability
        distance_score = max(0, 1 - (distance / 100))  # Prefer closer resources
        time_score = max(0, 1 - (travel_time / 180))    # Prefer faster response
        effectiveness_score = resource.effectiveness_rating
        cost_score = max(0, 1 - (resource.operational_cost_per_hour / 20000))  # Prefer cost-effective
        
        # Weighted combination
        suitability_score = (
            distance_score * self.efficiency_weights['response_time'] +
            effectiveness_score * self.efficiency_weights['effectiveness'] +
            cost_score * self.efficiency_weights['cost_efficiency'] +
            time_score * self.efficiency_weights['resource_availability']
        )
        
        return suitability_score
    
    def _create_recommendation(self, resource: Resource, region_data: Dict, requirement: Dict) -> ResourceRecommendation:
        """Create a resource deployment recommendation"""
        coords = region_data['coordinates']
        distance = self._calculate_distance(resource.location, coords)
        travel_time = self._estimate_travel_time(resource, distance)
        
        # Estimate deployment duration based on risk level
        duration_hours = {
            'very-high': 8,
            'high': 6,
            'moderate': 4,
            'low': 2
        }.get(region_data['risk_level'], 4)
        
        cost_estimate = resource.operational_cost_per_hour * duration_hours
        
        # Generate justification
        justification = self._generate_justification(resource, region_data, distance)
        
        # Calculate effectiveness score
        effectiveness_score = (
            resource.effectiveness_rating * 0.4 +
            (1 - distance / 100) * 0.3 +  # Distance factor
            (region_data['risk_score']) * 0.3  # Risk urgency factor
        )
        
        return ResourceRecommendation(
            resource_id=resource.id,
            resource_type=resource.type,
            priority=requirement['priority'],
            deployment_location=coords,
            region_name=region_data['region'],
            estimated_arrival_time=travel_time,
            recommended_duration=duration_hours,
            justification=justification,
            cost_estimate=cost_estimate,
            effectiveness_score=effectiveness_score
        )
    
    def _generate_justification(self, resource: Resource, region_data: Dict, distance: float) -> str:
        """Generate human-readable justification for resource deployment"""
        region = region_data['region']
        risk_level = region_data['risk_level']
        risk_score = region_data['risk_score']
        
        resource_names = {
            'firefighter_crew': 'Firefighter Crew',
            'water_tank': 'Water Tanker',
            'drone': 'Surveillance Drone',
            'helicopter': 'Fire Helicopter'
        }
        
        resource_name = resource_names.get(resource.type, resource.type)
        
        if risk_level == 'very-high':
            return f"Critical deployment needed for {region} due to very high fire risk ({risk_score:.1%}). {resource_name} can reach in {self._estimate_travel_time(resource, distance)} minutes."
        elif risk_level == 'high':
            return f"High priority deployment to {region} for fire risk mitigation ({risk_score:.1%}). {resource_name} provides effective coverage."
        else:
            return f"Preventive deployment to {region} for fire risk monitoring and rapid response capability."
    
    def _priority_score(self, priority: str) -> int:
        """Convert priority to numeric score for sorting"""
        scores = {'critical': 1, 'high': 2, 'medium': 3, 'low': 4}
        return scores.get(priority, 5)
    
    def _elevate_priority(self, current_priority: str) -> str:
        """Elevate priority by one level"""
        elevation_map = {
            'low': 'medium',
            'medium': 'high',
            'high': 'critical',
            'critical': 'critical'
        }
        return elevation_map.get(current_priority, current_priority)
    
    def get_resource_status_summary(self) -> Dict:
        """Get summary of all resources and their current status"""
        summary = {
            'total_resources': len(self.available_resources),
            'available': 0,
            'deployed': 0,
            'maintenance': 0,
            'by_type': {},
            'total_capacity': {},
            'average_response_time': {}
        }
        
        for resource in self.available_resources:
            # Status counts
            summary[resource.status] += 1
            
            # By type
            if resource.type not in summary['by_type']:
                summary['by_type'][resource.type] = {
                    'total': 0, 'available': 0, 'deployed': 0, 'maintenance': 0
                }
            summary['by_type'][resource.type]['total'] += 1
            summary['by_type'][resource.type][resource.status] += 1
            
            # Capacity tracking
            if resource.type not in summary['total_capacity']:
                summary['total_capacity'][resource.type] = 0
                summary['average_response_time'][resource.type] = []
            
            if resource.status == 'available':
                summary['total_capacity'][resource.type] += resource.capacity
                summary['average_response_time'][resource.type].append(resource.response_time_minutes)
        
        # Calculate average response times
        for resource_type in summary['average_response_time']:
            times = summary['average_response_time'][resource_type]
            summary['average_response_time'][resource_type] = sum(times) / len(times) if times else 0
        
        return summary
    
    def update_resource_status(self, resource_id: str, new_status: str, location: Optional[Tuple[float, float]] = None) -> bool:
        """Update resource status and location"""
        for resource in self.available_resources:
            if resource.id == resource_id:
                resource.status = new_status
                if location:
                    resource.location = location
                return True
        return False

# Global resource optimizer instance
resource_optimizer = ResourceOptimizationEngine()

def get_resource_recommendations(predictions: Dict) -> Dict:
    """Get resource deployment recommendations based on fire predictions"""
    recommendations = resource_optimizer.optimize_resource_deployment(predictions)
    
    return {
        'recommendations': [
            {
                'resource_id': rec.resource_id,
                'resource_type': rec.resource_type,
                'priority': rec.priority,
                'region': rec.region_name,
                'deployment_location': rec.deployment_location,
                'arrival_time_minutes': rec.estimated_arrival_time,
                'duration_hours': rec.recommended_duration,
                'justification': rec.justification,
                'cost_estimate': rec.cost_estimate,
                'effectiveness_score': rec.effectiveness_score
            }
            for rec in recommendations
        ],
        'resource_status': resource_optimizer.get_resource_status_summary(),
        'total_cost_estimate': sum(rec.cost_estimate for rec in recommendations),
        'timestamp': datetime.now().isoformat()
    }
