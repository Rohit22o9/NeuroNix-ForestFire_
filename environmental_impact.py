
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import json

class CarbonEmissionCalculator:
    """Calculate CO₂ emissions from forest fires"""
    
    def __init__(self):
        # Emission factors (kg CO₂ per kg biomass burned) by vegetation type
        self.emission_factors = {
            'dense_forest': 1.83,      # Dense tropical/temperate forest
            'moderate_forest': 1.65,   # Moderate forest coverage
            'sparse_forest': 1.45,     # Sparse forest/woodland
            'grassland': 1.25,         # Grassland and shrubs
            'agricultural': 1.15,      # Agricultural residue
            'mixed': 1.55              # Mixed vegetation
        }
        
        # Biomass density (kg/m²) by vegetation type
        self.biomass_density = {
            'dense_forest': 35.0,      # kg/m² (very dense forest)
            'moderate_forest': 25.0,   # kg/m² (moderate forest)
            'sparse_forest': 15.0,     # kg/m² (sparse forest)
            'grassland': 8.0,          # kg/m² (grassland)
            'agricultural': 5.0,       # kg/m² (agricultural)
            'mixed': 20.0              # kg/m² (mixed vegetation)
        }
        
        # Combustion efficiency (fraction of biomass actually burned)
        self.combustion_efficiency = {
            'low_intensity': 0.65,     # Low intensity fire
            'moderate_intensity': 0.80, # Moderate intensity fire
            'high_intensity': 0.95     # High intensity fire
        }

    def calculate_emissions(self, burned_area_hectares: float, vegetation_type: str, 
                          fire_intensity: str, weather_conditions: Dict) -> Dict:
        """Calculate CO₂ emissions from fire parameters"""
        
        # Convert hectares to m²
        burned_area_m2 = burned_area_hectares * 10000
        
        # Get factors
        emission_factor = self.emission_factors.get(vegetation_type, self.emission_factors['mixed'])
        biomass_per_m2 = self.biomass_density.get(vegetation_type, self.biomass_density['mixed'])
        combustion_eff = self.combustion_efficiency.get(fire_intensity, self.combustion_efficiency['moderate_intensity'])
        
        # Weather adjustment factors
        humidity_factor = self._get_humidity_factor(weather_conditions.get('humidity', 50))
        wind_factor = self._get_wind_factor(weather_conditions.get('wind_speed', 15))
        temperature_factor = self._get_temperature_factor(weather_conditions.get('temperature', 30))
        
        # Calculate total biomass burned
        total_biomass = burned_area_m2 * biomass_per_m2 * combustion_eff
        
        # Apply weather adjustments
        adjusted_biomass = total_biomass * humidity_factor * wind_factor * temperature_factor
        
        # Calculate CO₂ emissions (in kg)
        co2_emissions_kg = adjusted_biomass * emission_factor
        
        # Convert to tonnes
        co2_emissions_tonnes = co2_emissions_kg / 1000
        
        # Calculate other greenhouse gases (approximate)
        ch4_emissions = co2_emissions_kg * 0.005  # ~0.5% of CO₂ in CH₄
        n2o_emissions = co2_emissions_kg * 0.001  # ~0.1% of CO₂ in N₂O
        
        return {
            'co2_emissions_kg': round(co2_emissions_kg, 2),
            'co2_emissions_tonnes': round(co2_emissions_tonnes, 2),
            'ch4_emissions_kg': round(ch4_emissions, 2),
            'n2o_emissions_kg': round(n2o_emissions, 2),
            'total_co2_equivalent': round(co2_emissions_kg + (ch4_emissions * 25) + (n2o_emissions * 298), 2),
            'biomass_burned_kg': round(adjusted_biomass, 2),
            'emission_factor_used': emission_factor,
            'combustion_efficiency': combustion_eff
        }
    
    def _get_humidity_factor(self, humidity: float) -> float:
        """Adjust emissions based on humidity (lower humidity = more complete combustion)"""
        if humidity < 30:
            return 1.15  # Dry conditions increase combustion
        elif humidity < 50:
            return 1.0   # Normal conditions
        elif humidity < 70:
            return 0.90  # Moderate humidity reduces combustion
        else:
            return 0.75  # High humidity significantly reduces combustion
    
    def _get_wind_factor(self, wind_speed: float) -> float:
        """Adjust emissions based on wind speed"""
        if wind_speed < 10:
            return 0.95  # Low wind reduces oxygen supply
        elif wind_speed < 25:
            return 1.0   # Optimal wind for combustion
        else:
            return 1.10  # High wind increases combustion intensity
    
    def _get_temperature_factor(self, temperature: float) -> float:
        """Adjust emissions based on temperature"""
        if temperature < 20:
            return 0.85  # Cool conditions
        elif temperature < 35:
            return 1.0   # Normal conditions
        else:
            return 1.15  # Hot conditions increase fire intensity

class EcologicalImpactPredictor:
    """Predict long-term ecological impact of forest fires"""
    
    def __init__(self):
        # Recovery time estimates (years) by ecosystem type
        self.recovery_times = {
            'canopy_cover': {
                'dense_forest': 25,
                'moderate_forest': 15,
                'sparse_forest': 10,
                'grassland': 3,
                'mixed': 12
            },
            'biodiversity': {
                'dense_forest': 30,
                'moderate_forest': 20,
                'sparse_forest': 12,
                'grassland': 5,
                'mixed': 15
            },
            'soil_organic_matter': {
                'dense_forest': 20,
                'moderate_forest': 15,
                'sparse_forest': 10,
                'grassland': 8,
                'mixed': 12
            }
        }
        
        # Species vulnerability factors
        self.species_vulnerability = {
            'mammals': 0.3,      # 30% species highly vulnerable
            'birds': 0.25,       # 25% species highly vulnerable
            'reptiles': 0.4,     # 40% species highly vulnerable
            'amphibians': 0.5,   # 50% species highly vulnerable
            'insects': 0.6,      # 60% species highly vulnerable
            'plants': 0.35       # 35% species highly vulnerable
        }

    def predict_ecological_impact(self, burned_area_hectares: float, vegetation_type: str,
                                fire_intensity: str, ecosystem_data: Dict) -> Dict:
        """Predict comprehensive ecological impact"""
        
        # Base impact calculations
        flora_impact = self._calculate_flora_impact(burned_area_hectares, vegetation_type, fire_intensity)
        fauna_impact = self._calculate_fauna_impact(burned_area_hectares, vegetation_type, fire_intensity)
        biodiversity_impact = self._calculate_biodiversity_impact(burned_area_hectares, vegetation_type, fire_intensity)
        soil_impact = self._calculate_soil_impact(burned_area_hectares, fire_intensity)
        water_impact = self._calculate_water_impact(burned_area_hectares, vegetation_type)
        
        # Recovery timeline
        recovery_timeline = self._estimate_recovery_timeline(vegetation_type, fire_intensity)
        
        # Economic valuation of ecosystem services lost
        economic_impact = self._calculate_economic_impact(burned_area_hectares, vegetation_type)
        
        return {
            'flora_impact': flora_impact,
            'fauna_impact': fauna_impact,
            'biodiversity_impact': biodiversity_impact,
            'soil_impact': soil_impact,
            'water_impact': water_impact,
            'recovery_timeline': recovery_timeline,
            'economic_impact': economic_impact,
            'overall_severity': self._calculate_overall_severity(flora_impact, fauna_impact, biodiversity_impact)
        }
    
    def _calculate_flora_impact(self, area: float, vegetation_type: str, intensity: str) -> Dict:
        """Calculate impact on plant life"""
        base_mortality = {
            'low_intensity': 0.25,
            'moderate_intensity': 0.60,
            'high_intensity': 0.85
        }
        
        vegetation_factor = {
            'dense_forest': 1.2,
            'moderate_forest': 1.0,
            'sparse_forest': 0.8,
            'grassland': 0.6,
            'mixed': 0.9
        }
        
        mortality_rate = base_mortality.get(intensity, 0.60) * vegetation_factor.get(vegetation_type, 1.0)
        mortality_rate = min(mortality_rate, 0.95)  # Cap at 95%
        
        trees_lost = area * 100 * mortality_rate  # Approximate trees per hectare
        
        return {
            'vegetation_mortality_rate': round(mortality_rate * 100, 1),
            'estimated_trees_lost': round(trees_lost),
            'canopy_cover_loss_percent': round(mortality_rate * 90, 1),
            'rare_species_risk': 'high' if mortality_rate > 0.7 else 'moderate' if mortality_rate > 0.4 else 'low'
        }
    
    def _calculate_fauna_impact(self, area: float, vegetation_type: str, intensity: str) -> Dict:
        """Calculate impact on animal life"""
        # Habitat loss factor
        habitat_loss = min(area * 0.15, 100)  # Percentage habitat loss
        
        # Species displacement
        displacement_factor = {
            'low_intensity': 0.4,
            'moderate_intensity': 0.7,
            'high_intensity': 0.9
        }
        
        displacement = displacement_factor.get(intensity, 0.7)
        
        # Estimate wildlife casualties
        wildlife_density = {
            'dense_forest': 50,    # animals per hectare
            'moderate_forest': 35,
            'sparse_forest': 20,
            'grassland': 15,
            'mixed': 30
        }
        
        density = wildlife_density.get(vegetation_type, 30)
        casualties = area * density * (displacement * 0.3)  # 30% of displaced animals may not survive
        
        return {
            'habitat_loss_percent': round(habitat_loss, 1),
            'wildlife_displacement_rate': round(displacement * 100, 1),
            'estimated_wildlife_casualties': round(casualties),
            'endangered_species_risk': 'critical' if area > 100 else 'high' if area > 50 else 'moderate'
        }
    
    def _calculate_biodiversity_impact(self, area: float, vegetation_type: str, intensity: str) -> Dict:
        """Calculate biodiversity impact"""
        # Biodiversity loss calculation
        base_loss = {
            'low_intensity': 0.15,
            'moderate_intensity': 0.35,
            'high_intensity': 0.60
        }
        
        ecosystem_factor = {
            'dense_forest': 1.5,   # High biodiversity ecosystems
            'moderate_forest': 1.2,
            'sparse_forest': 0.9,
            'grassland': 0.7,
            'mixed': 1.0
        }
        
        biodiversity_loss = base_loss.get(intensity, 0.35) * ecosystem_factor.get(vegetation_type, 1.0)
        biodiversity_loss = min(biodiversity_loss, 0.80)  # Cap at 80%
        
        # Species richness impact
        species_loss = biodiversity_loss * 0.8  # Species loss is typically less than overall biodiversity loss
        
        return {
            'biodiversity_loss_percent': round(biodiversity_loss * 100, 1),
            'species_richness_reduction': round(species_loss * 100, 1),
            'ecosystem_fragmentation': 'severe' if area > 200 else 'moderate' if area > 50 else 'low',
            'genetic_diversity_impact': 'high' if biodiversity_loss > 0.5 else 'moderate'
        }
    
    def _calculate_soil_impact(self, area: float, intensity: str) -> Dict:
        """Calculate soil and erosion impact"""
        erosion_factor = {
            'low_intensity': 1.5,
            'moderate_intensity': 3.0,
            'high_intensity': 5.0
        }
        
        factor = erosion_factor.get(intensity, 3.0)
        soil_loss_tonnes = area * factor * 10  # tonnes of soil lost per hectare
        
        return {
            'soil_erosion_increase_factor': factor,
            'estimated_soil_loss_tonnes': round(soil_loss_tonnes),
            'organic_matter_loss_percent': round(factor * 15, 1),
            'recovery_difficulty': 'high' if factor > 4 else 'moderate'
        }
    
    def _calculate_water_impact(self, area: float, vegetation_type: str) -> Dict:
        """Calculate water cycle and watershed impact"""
        # Water regulation capacity loss
        regulation_loss = area * 0.8  # 80% of area loses water regulation capacity
        
        # Runoff increase
        runoff_increase = {
            'dense_forest': 3.0,
            'moderate_forest': 2.5,
            'sparse_forest': 2.0,
            'grassland': 1.5,
            'mixed': 2.2
        }
        
        increase_factor = runoff_increase.get(vegetation_type, 2.2)
        
        return {
            'water_regulation_loss_hectares': round(regulation_loss, 1),
            'surface_runoff_increase_factor': increase_factor,
            'flood_risk_increase': 'high' if increase_factor > 2.5 else 'moderate',
            'water_quality_impact': 'significant' if area > 100 else 'moderate'
        }
    
    def _estimate_recovery_timeline(self, vegetation_type: str, intensity: str) -> Dict:
        """Estimate ecosystem recovery timeline"""
        base_times = self.recovery_times
        
        # Intensity adjustment
        intensity_multiplier = {
            'low_intensity': 0.8,
            'moderate_intensity': 1.0,
            'high_intensity': 1.4
        }
        
        multiplier = intensity_multiplier.get(intensity, 1.0)
        
        recovery = {}
        for aspect, times in base_times.items():
            base_time = times.get(vegetation_type, times['mixed'])
            recovery[aspect] = round(base_time * multiplier, 1)
        
        return recovery
    
    def _calculate_economic_impact(self, area: float, vegetation_type: str) -> Dict:
        """Calculate economic value of ecosystem services lost"""
        # Ecosystem service values (USD per hectare per year)
        service_values = {
            'carbon_sequestration': 150,
            'water_regulation': 200,
            'biodiversity_conservation': 300,
            'soil_formation': 100,
            'recreation_tourism': 250,
            'timber_value': 500
        }
        
        vegetation_multiplier = {
            'dense_forest': 1.5,
            'moderate_forest': 1.2,
            'sparse_forest': 0.8,
            'grassland': 0.6,
            'mixed': 1.0
        }
        
        multiplier = vegetation_multiplier.get(vegetation_type, 1.0)
        
        annual_loss = {}
        total_annual = 0
        
        for service, value in service_values.items():
            annual_value = area * value * multiplier
            annual_loss[service] = round(annual_value)
            total_annual += annual_value
        
        # 20-year impact (typical recovery period)
        twenty_year_impact = total_annual * 20
        
        return {
            'annual_ecosystem_service_loss_usd': round(total_annual),
            'twenty_year_impact_usd': round(twenty_year_impact),
            'service_breakdown': annual_loss,
            'per_hectare_annual_loss': round(total_annual / area if area > 0 else 0)
        }
    
    def _calculate_overall_severity(self, flora: Dict, fauna: Dict, biodiversity: Dict) -> str:
        """Calculate overall impact severity"""
        flora_severity = flora['vegetation_mortality_rate']
        fauna_severity = fauna['wildlife_displacement_rate']
        bio_severity = biodiversity['biodiversity_loss_percent']
        
        average_severity = (flora_severity + fauna_severity + bio_severity) / 3
        
        if average_severity > 70:
            return 'catastrophic'
        elif average_severity > 50:
            return 'severe'
        elif average_severity > 30:
            return 'moderate'
        else:
            return 'low'

class EnvironmentalImpactSystem:
    """Main system for environmental impact calculations"""
    
    def __init__(self):
        self.carbon_calculator = CarbonEmissionCalculator()
        self.ecological_predictor = EcologicalImpactPredictor()
    
    def calculate_comprehensive_impact(self, fire_data: Dict) -> Dict:
        """Calculate comprehensive environmental impact"""
        
        # Extract fire parameters
        burned_area = fire_data.get('burned_area_hectares', 10)
        vegetation_type = fire_data.get('vegetation_type', 'mixed')
        fire_intensity = fire_data.get('fire_intensity', 'moderate_intensity')
        weather_conditions = fire_data.get('weather_conditions', {})
        ecosystem_data = fire_data.get('ecosystem_data', {})
        
        # Calculate carbon emissions
        carbon_emissions = self.carbon_calculator.calculate_emissions(
            burned_area, vegetation_type, fire_intensity, weather_conditions
        )
        
        # Predict ecological impact
        ecological_impact = self.ecological_predictor.predict_ecological_impact(
            burned_area, vegetation_type, fire_intensity, ecosystem_data
        )
        
        # Combine results
        return {
            'carbon_emissions': carbon_emissions,
            'ecological_impact': ecological_impact,
            'summary': self._generate_impact_summary(carbon_emissions, ecological_impact),
            'calculation_timestamp': datetime.now().isoformat(),
            'input_parameters': fire_data
        }
    
    def _generate_impact_summary(self, carbon: Dict, ecological: Dict) -> Dict:
        """Generate a summary of the environmental impact"""
        return {
            'total_co2_tonnes': carbon['co2_emissions_tonnes'],
            'equivalent_car_emissions_years': round(carbon['co2_emissions_tonnes'] / 4.6, 1),  # Average car emits 4.6 tonnes CO₂/year
            'trees_needed_to_offset': round(carbon['co2_emissions_tonnes'] * 40),  # One tree absorbs ~25kg CO₂/year
            'overall_ecological_severity': ecological['overall_severity'],
            'recovery_time_estimate_years': ecological['recovery_timeline']['biodiversity'],
            'economic_impact_20_years': ecological['economic_impact']['twenty_year_impact_usd']
        }

# Global instance
environmental_impact_system = EnvironmentalImpactSystem()

def calculate_environmental_impact(fire_data: Dict) -> Dict:
    """Main function to calculate environmental impact"""
    return environmental_impact_system.calculate_comprehensive_impact(fire_data)
