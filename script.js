// Global variables
let riskMap;
let simulationMap;
let evacuationMap;
let resourceRecommendations = [];
let resourceStatus = {};
let isSimulationRunning = false;
let simulationTime = 0;
let simulationInterval;
let fireSpreadLayers = [];
let evacuationRouteLayers = [];

// ML API endpoints
const ML_API_BASE = window.location.origin.replace(':5000', ':5001');
let mlPredictions = {};
let realTimeUpdates = false;

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeMaps();
    initializeCharts();
    initializeSimulation();

    // Initialize ML components
    initializeMLIntegration();

    // Initialize monitoring stats
    updateMonitoringStats();

    // Initialize fire theme effects
    initializeForestFireTheme();
    initializeFireInteractions();

    startDataUpdates();
});

// Fire theme initialization
function initializeForestFireTheme() {
    // Add fire effect overlay with animated particles
    const fireOverlay = document.createElement('div');
    fireOverlay.id = 'fire-overlay';
    fireOverlay.style.position = 'fixed';
    fireOverlay.style.top = '0';
    fireOverlay.style.left = '0';
    fireOverlay.style.width = '100%';
    fireOverlay.style.height = '100%';
    fireOverlay.style.pointerEvents = 'none';
    fireOverlay.style.zIndex = '1';
    fireOverlay.style.background = `
        radial-gradient(ellipse 400px 200px at 10% 90%, rgba(255, 69, 0, 0.1) 0%, transparent 60%),
        radial-gradient(ellipse 300px 150px at 90% 85%, rgba(255, 140, 0, 0.08) 0%, transparent 70%),
        radial-gradient(ellipse 200px 100px at 60% 80%, rgba(255, 69, 0, 0.06) 0%, transparent 80%)
    `;
    fireOverlay.style.opacity = '0.4';
    fireOverlay.style.animation = 'fireGlow 6s ease-in-out infinite alternate';

    document.body.appendChild(fireOverlay);

    // Create floating embers
    createFloatingEmbers();

    // Simulate dynamic fire intensity
    setInterval(() => {
        const intensity = Math.random() * 0.2 + 0.3; // Vary between 30% and 50% opacity
        fireOverlay.style.opacity = intensity;
    }, 4000);
}

function createFloatingEmbers() {
    setInterval(() => {
        if (Math.random() < 0.3) { // 30% chance to create ember
            const ember = document.createElement('div');
            ember.style.position = 'fixed';
            ember.style.width = '3px';
            ember.style.height = '3px';
            ember.style.background = Math.random() > 0.5 ? '#FF4500' : '#FF8C00';
            ember.style.borderRadius = '50%';
            ember.style.left = Math.random() * window.innerWidth + 'px';
            ember.style.top = window.innerHeight + 'px';
            ember.style.pointerEvents = 'none';
            ember.style.zIndex = '2';
            ember.style.boxShadow = `0 0 6px ${ember.style.background}`;
            ember.style.opacity = '0.8';
            ember.style.animation = 'emberFloat 8s linear forwards';

            document.body.appendChild(ember);

            setTimeout(() => {
                if (document.body.contains(ember)) {
                    document.body.removeChild(ember);
                }
            }, 8000);
        }
    }, 2000);
}

// Fire cursor trail effect
let fireParticles = [];

function initializeFireInteractions() {
    // Initialize fire cursor trail
    document.addEventListener('mousemove', function(e) {
        if (Math.random() < 0.1) { // Only create particles occasionally for performance
            createFireParticle(e.clientX, e.clientY);
        }
    });

    // Initialize fire click effects
    initializeFireClickRipples();
}

function createFireParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'fire-cursor-trail';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.width = '8px';
    particle.style.height = '8px';
    particle.style.background = `radial-gradient(circle, ${Math.random() > 0.5 ? '#FF4500' : '#FF8C00'}, transparent)`;

    document.body.appendChild(particle);

    setTimeout(() => {
        if (document.body.contains(particle)) {
            document.body.removeChild(particle);
        }
    }, 1000);
}

// Fire click ripples
function initializeFireClickRipples() {
    document.addEventListener('click', function(e) {
        const ripple = document.createElement('div');
        ripple.style.position = 'fixed';
        ripple.style.left = e.clientX + 'px';
        ripple.style.top = e.clientY + 'px';
        ripple.style.width = '0px';
        ripple.style.height = '0px';
        ripple.style.background = 'radial-gradient(circle, rgba(255, 69, 0, 0.6), transparent)';
        ripple.style.borderRadius = '50%';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '9998';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.animation = 'fireClickRipple 0.8s ease-out forwards';

        document.body.appendChild(ripple);

        setTimeout(() => {
            if (document.body.contains(ripple)) {
                document.body.removeChild(ripple);
            }
        }, 800);
    });
}

// Navigation functionality
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    // Smooth scroll navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });

                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });

    // Update active nav on scroll
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('.section');
        const scrollPos = window.scrollY + 100;

        sections.forEach(section => {
            const top = section.offsetTop;
            const bottom = top + section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollPos >= top && scrollPos <= bottom) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
}

// Initialize maps
function initializeMaps() {
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        return;
    }

    try {
        // Fire Risk Map
        const riskMapElement = document.getElementById('risk-map');
        if (riskMapElement) {
            riskMap = L.map('risk-map').setView([30.0668, 79.0193], 8);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(riskMap);

            // Add risk zones for Uttarakhand districts
            addRiskZones();
        }

        // Simulation Map
        const simulationMapElement = document.getElementById('simulation-map');
        if (simulationMapElement) {
            simulationMap = L.map('simulation-map').setView([30.0668, 79.0193], 8);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(simulationMap);

            // Add click listener for fire simulation
            simulationMap.on('click', function(e) {
                startFireSimulation(e.latlng);
            });

            // Add forest areas
            addForestAreas();
        }

        // Evacuation Map
        const evacuationMapElement = document.getElementById('evacuation-map');
        if (evacuationMapElement) {
            evacuationMap = L.map('evacuation-map').setView([30.0668, 79.0193], 8);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(evacuationMap);

            // Force map to resize properly
            setTimeout(() => {
                evacuationMap.invalidateSize();
            }, 100);

            // Add safe zones and evacuation routes
            initializeEvacuationMap();
        }

        // Initialize search functionality for maps
        initializeMapSearch();

        console.log('Maps initialized successfully');
    } catch (error) {
        console.error('Error initializing maps:', error);
    }
}

// Add risk zones to the map
function addRiskZones() {
    if (!riskMap) return;

    const riskZones = [
        {
            name: 'Nainital District',
            coords: [[29.2, 79.3], [29.6, 79.3], [29.6, 79.8], [29.2, 79.8]],
            risk: 'very-high',
            color: '#ff4444'
        },
        {
            name: 'Almora District',
            coords: [[29.5, 79.5], [29.9, 79.5], [29.9, 80.0], [29.5, 80.0]],
            risk: 'high',
            color: '#ffa726'
        },
        {
            name: 'Dehradun District',
            coords: [[30.1, 77.8], [30.5, 77.8], [30.5, 78.3], [30.1, 78.3]],
            risk: 'moderate',
            color: '#66bb6a'
        }
    ];

    riskZones.forEach(zone => {
        const polygon = L.polygon(zone.coords, {
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: 0.4
        }).addTo(riskMap);

        polygon.bindPopup(`
            <div>
                <h4>${zone.name}</h4>
                <p>Risk Level: ${zone.risk.replace('-', ' ').toUpperCase()}</p>
            </div>
        `);
    });
}

// Add forest areas to simulation map
function addForestAreas() {
    if (!simulationMap) return;

    const forestAreas = [
        {
            name: 'Jim Corbett National Park',
            coords: [[29.4, 78.7], [29.7, 78.7], [29.7, 79.1], [29.4, 79.1]],
            color: '#2d5a2d'
        },
        {
            name: 'Valley of Flowers',
            coords: [[30.7, 79.5], [30.8, 79.5], [30.8, 79.7], [30.7, 79.7]],
            color: '#2d5a2d'
        }
    ];

    forestAreas.forEach(forest => {
        const polygon = L.polygon(forest.coords, {
            color: forest.color,
            fillColor: forest.color,
            fillOpacity: 0.6
        }).addTo(simulationMap);

        polygon.bindPopup(`<h4>${forest.name}</h4>`);
    });
}

// Initialize charts
function initializeCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library not loaded');
        return;
    }

    try {
        // Performance Chart (Original)
        const performanceCtx = document.getElementById('performanceChart');
        if (performanceCtx) {
            new Chart(performanceCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Accurate Predictions', 'False Positives'],
                    datasets: [{
                        data: [97, 3],
                        backgroundColor: ['#66bb6a', '#ff6b35'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    }
                }
            });
        }

        // Initialize other charts
        initializeTimelineChart();
        initializeFireSpreadChart();
        initializeGaugeCharts();
        initializeAlertStatsChart();

        console.log('Charts initialized successfully');
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

function initializeTimelineChart() {
    const riskTimelineCtx = document.getElementById('riskTimelineChart');
    if (!riskTimelineCtx) return;

    const riskTimelineChart = new Chart(riskTimelineCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM', '3AM'],
            datasets: [
                {
                    label: 'Dehradun',
                    data: [25, 35, 55, 75, 85, 65, 45, 30],
                    borderColor: '#66bb6a',
                    backgroundColor: 'rgba(102, 187, 106, 0.1)',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Nainital',
                    data: [45, 55, 70, 85, 90, 80, 60, 50],
                    borderColor: '#ff4444',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Haridwar',
                    data: [30, 40, 60, 70, 75, 55, 40, 35],
                    borderColor: '#ffa726',
                    backgroundColor: 'rgba(255, 167, 38, 0.1)',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Rishikesh',
                    data: [20, 30, 45, 65, 70, 50, 35, 25],
                    borderColor: '#42a5f5',
                    backgroundColor: 'rgba(66, 165, 245, 0.1)',
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        color: '#ffffff',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });

    // Store chart reference
    if (!window.chartInstances) {
        window.chartInstances = {};
    }
    window.chartInstances.riskTimeline = riskTimelineChart;
}

function initializeFireSpreadChart() {
    const fireSpreadCtx = document.getElementById('fireSpreadChart');
    if (!fireSpreadCtx) return;

    const fireSpreadChart = new Chart(fireSpreadCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['0h', '1h', '2h', '3h', '4h', '5h', '6h'],
            datasets: [{
                label: 'Area Burned (hectares)',
                data: [0, 12, 35, 78, 145, 225, 320],
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255, 107, 53, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return 'Burned: ' + context.parsed.y + ' hectares';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: '#ffffff',
                        callback: function(value) {
                            return value + ' ha';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });

    if (!window.chartInstances) {
        window.chartInstances = {};
    }
    window.chartInstances.fireSpread = fireSpreadChart;
}

function initializeGaugeCharts() {
    // Accuracy Gauge
    const accuracyCtx = document.getElementById('accuracyGauge');
    if (accuracyCtx) {
        new Chart(accuracyCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [97, 3],
                    backgroundColor: ['#66bb6a', 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });
    }

    // Uptime Gauge
    const uptimeCtx = document.getElementById('uptimeGauge');
    if (uptimeCtx) {
        new Chart(uptimeCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [99.8, 0.2],
                    backgroundColor: ['#66bb6a', 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });
    }

    // Speed Gauge
    const speedCtx = document.getElementById('speedGauge');
    if (speedCtx) {
        new Chart(speedCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [85, 15],
                    backgroundColor: ['#ffa726', 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });
    }
}

function initializeAlertStatsChart() {
    const alertStatsCtx = document.getElementById('alertStatsChart');
    if (!alertStatsCtx) return;

    new Chart(alertStatsCtx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Fire Risk Warnings', 'Active Fire Detected', 'Evacuation Alerts', 'All Clear/Safe Zones'],
            datasets: [{
                data: [35, 25, 20, 20],
                backgroundColor: ['#ffa726', '#ff4444', '#ff6b35', '#66bb6a'],
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + percentage + '%';
                        }
                    }
                }
            }
        }
    });
}

// Initialize simulation controls
function initializeSimulation() {
    const playBtn = document.getElementById('play-simulation');
    const pauseBtn = document.getElementById('pause-simulation');
    const resetBtn = document.getElementById('reset-simulation');
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (!isSimulationRunning) {
                startSimulation();
            }
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', pauseSimulation);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetSimulation);
    }

    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', (e) => {
            const speed = e.target.value;
            speedValue.textContent = `${speed}x`;
            updateSimulationSpeed(speed);
        });
    }

    // Toggle prediction button
    const toggleBtn = document.getElementById('toggle-prediction');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', togglePrediction);
    }

    // Initialize simulation monitoring chart
    initializeSimulationMonitoringChart();
}

// Fire simulation functions
async function startFireSimulation(latlng) {
    if (!simulationMap) return;

    // Try ML-powered simulation first
    const mlSimulation = await simulateFireWithML(latlng);

    // Add animated fire origin marker with enhanced visuals
    const fireMarker = L.marker([latlng.lat, latlng.lng], {
        icon: L.divIcon({
            className: 'fire-marker origin-fire',
            html: `
                <div class="fire-icon-container">
                    <i class="fas fa-fire fire-flame"></i>
                    <div class="fire-glow"></div>
                    <div class="fire-sparks"></div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        })
    }).addTo(simulationMap);

    fireSpreadLayers.push(fireMarker);

    // Store ML simulation data if available
    if (mlSimulation) {
        window.currentMLSimulation = mlSimulation;
        showToast('AI-powered simulation active', 'success');
    }

    // Generate evacuation routes for this fire location
    setTimeout(() => {
        generateEvacuationRoutes(latlng.lat, latlng.lng, 3); // 3km risk radius
    }, 2000);


    // Add initial burn circle
    const initialBurn = L.circle([latlng.lat, latlng.lng], {
        color: '#ff6b35',
        fillColor: '#ff4444',
        fillOpacity: 0.7,
        radius: 200,
        className: 'fire-burn-area'
    }).addTo(simulationMap);

    fireSpreadLayers.push(initialBurn);
}

function startSimulation() {
    isSimulationRunning = true;
    const speedSlider = document.getElementById('speed-slider');
    const speed = speedSlider ? parseInt(speedSlider.value) : 1;

    // Limit minimum interval to prevent overwhelming the browser
    const minInterval = 500; // Minimum 500ms between updates
    const interval = Math.max(minInterval, 2000 / speed);

    simulationInterval = setInterval(() => {
        simulationTime += 1;
        updateSimulationTime();

        // Update monitoring stats
        updateMonitoringStats();

        // Use requestAnimationFrame for smoother performance
        requestAnimationFrame(() => {
            simulateFireSpread();
        });
    }, interval);

    // Initial update
    updateMonitoringStats();
}

function pauseSimulation() {
    isSimulationRunning = false;
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }
}

function resetSimulation() {
    pauseSimulation();
    simulationTime = 0;
    updateSimulationTime();

    // Reset monitoring stats
    updateMonitoringStats();

    // Clear fire spread layers
    if (simulationMap) {
        fireSpreadLayers.forEach(layer => {
            try {
                simulationMap.removeLayer(layer);
            } catch (e) {
                // Ignore errors for layers already removed
            }
        });
    }
    fireSpreadLayers = [];
}

function updateSimulationSpeed(speed) {
    if (isSimulationRunning) {
        pauseSimulation();
        startSimulation();
    }
}

function simulateFireSpread() {
    // Optimized fire spread simulation
    if (fireSpreadLayers.length > 0 && simulationMap) {
        // Limit processing to prevent overwhelming the browser
        if (fireSpreadLayers.length > 100) {
            const excessLayers = fireSpreadLayers.splice(0, 20);
            excessLayers.forEach(layer => {
                try {
                    simulationMap.removeLayer(layer);
                } catch (e) {
                    // Ignore errors for layers already removed
                }
            });
        }

        // Get environmental parameters
        const windSpeed = getElementValue('wind-speed', 15);
        const windDirection = getElementText('wind-direction', 'NE');
        const temperature = getElementValue('temperature', 32);
        const humidity = getElementValue('humidity', 45);

        // Convert wind direction to angle
        const windAngles = {
            'N': 0, 'NE': 45, 'E': 90, 'SE': 135,
            'S': 180, 'SW': 225, 'W': 270, 'NW': 315
        };
        const windAngle = (windAngles[windDirection] || 0) * Math.PI / 180;

        // Limit the number of fire sources processed per cycle
        const fireSources = fireSpreadLayers.filter(layer => 
            layer instanceof L.Marker && 
            layer.options.icon && 
            layer.options.icon.options.className && 
            layer.options.icon.options.className.includes('fire-marker')
        ).slice(-10);

        let newSpreadCount = 0;
        const maxNewSpreads = 3;

        fireSources.forEach((fireSource) => {
            if (newSpreadCount >= maxNewSpreads) return;

            if (Math.random() < 0.4) {
                const sourceLatlng = fireSource.getLatLng();

                // Simplified spread calculation
                const baseSpread = 0.005;
                const windFactor = windSpeed / 20;
                const tempFactor = temperature / 35;
                const humidityFactor = (100 - humidity) / 120;

                const spreadDistance = baseSpread * windFactor * tempFactor * humidityFactor;

                // Calculate new position
                const spreadAngle = windAngle + (Math.random() - 0.5) * Math.PI / 3;
                const newLat = sourceLatlng.lat + Math.cos(spreadAngle) * spreadDistance;
                const newLng = sourceLatlng.lng + Math.sin(spreadAngle) * spreadDistance;

                // Create simplified fire marker
                const spreadMarker = L.marker([newLat, newLng], {
                    icon: L.divIcon({
                        className: 'fire-marker spread-fire',
                        html: '<i class="fas fa-fire fire-flame"></i>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(simulationMap);

                // Create smaller burn area
                const burnRadius = 100 + Math.random() * 50;
                const burnArea = L.circle([newLat, newLng], {
                    color: '#ff4444',
                    fillColor: '#cc0000',
                    fillOpacity: 0.3,
                    radius: burnRadius,
                    weight: 1
                }).addTo(simulationMap);

                fireSpreadLayers.push(spreadMarker);
                fireSpreadLayers.push(burnArea);
                newSpreadCount++;
            }
        });
    }
}

function updateSimulationTime() {
    const timeElement = document.getElementById('simulation-time');
    if (timeElement) {
        const hours = Math.floor(simulationTime / 60);
        const minutes = simulationTime % 60;
        timeElement.textContent = 
            hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`;
    }
}

// Helper functions
function getElementValue(id, defaultValue) {
    const element = document.getElementById(id);
    if (element) {
        const value = parseInt(element.textContent);
        return isNaN(value) ? defaultValue : value;
    }
    return defaultValue;
}

function getElementText(id, defaultValue) {
    const element = document.getElementById(id);
    return element ? element.textContent : defaultValue;
}

// Toggle prediction functionality
function togglePrediction() {
    const btn = document.getElementById('toggle-prediction');
    if (!btn) return;

    const isNextDay = btn.textContent.includes('Current');

    if (isNextDay) {
        btn.innerHTML = '<i class="fas fa-clock"></i> Show Next Day Prediction';
        showCurrentDayPrediction();
    } else {
        btn.innerHTML = '<i class="fas fa-calendar"></i> Show Current Day';
        showNextDayPrediction();
    }
}

function showCurrentDayPrediction() {
    updateRiskZones([
        { name: 'Nainital District', risk: 'very-high', percentage: 85 },
        { name: 'Almora District', risk: 'high', percentage: 68 },
        { name: 'Dehradun District', risk: 'moderate', percentage: 42 }
    ]);

    updateMapRiskColors('current');

    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = '2 minutes ago';
    }
}

function showNextDayPrediction() {
    updateRiskZones([
        { name: 'Nainital District', risk: 'very-high', percentage: 92 },
        { name: 'Almora District', risk: 'very-high', percentage: 78 },
        { name: 'Dehradun District', risk: 'high', percentage: 65 }
    ]);

    updateMapRiskColors('predicted');

    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = 'Predicted for tomorrow';
    }
}

function updateRiskZones(zones) {
    const riskContainer = document.querySelector('.risk-zones');
    if (!riskContainer) return;

    riskContainer.innerHTML = '';

    zones.forEach(zone => {
        const riskClass = zone.risk === 'very-high' ? 'high-risk' : 
                         zone.risk === 'high' ? 'moderate-risk' : 'low-risk';

        const riskItem = document.createElement('div');
        riskItem.className = `risk-item ${riskClass}`;
        riskItem.innerHTML = `
            <div class="risk-color"></div>
            <div class="risk-info">
                <span class="risk-level">${zone.risk.replace('-', ' ').toUpperCase()} Risk</span>
                <span class="risk-area">${zone.name}</span>
            </div>
            <div class="risk-percentage">${zone.percentage}%</div>
        `;
        riskContainer.appendChild(riskItem);
    });
}

function updateMapRiskColors(type) {
    if (!riskMap) return;

    // Clear existing polygons
    riskMap.eachLayer(layer => {
        if (layer instanceof L.Polygon) {
            riskMap.removeLayer(layer);
        }
    });

    // Define zones based on prediction type
    const zones = type === 'current' ? [
        {
            name: 'Nainital District',
            coords: [[29.2, 79.3], [29.6, 79.3], [29.6, 79.8], [29.2, 79.8]],
            risk: 'very-high',
            color: '#ff4444'
        },
        {
            name: 'Almora District',
            coords: [[29.5, 79.5], [29.9, 79.5], [29.9, 80.0], [29.5, 80.0]],
            risk: 'high',
            color: '#ffa726'
        },
        {
            name: 'Dehradun District',
            coords: [[30.1, 77.8], [30.5, 77.8], [30.5, 78.3], [30.1, 78.3]],
            risk: 'moderate',
            color: '#66bb6a'
        }
    ] : [
        {
            name: 'Nainital District',
            coords: [[29.2, 79.3], [29.6, 79.3], [29.6, 79.8], [29.2, 79.8]],
            risk: 'very-high',
            color: '#cc0000'
        },
        {
            name: 'Almora District',
            coords: [[29.5, 79.5], [29.9, 79.5], [29.9, 80.0], [29.5, 80.0]],
            risk: 'very-high',
            color: '#ff4444'
        },
        {
            name: 'Dehradun District',
            coords: [[30.1, 77.8], [30.5, 77.8], [30.5, 78.3], [30.1, 78.3]],
            risk: 'high',
            color: '#ffa726'
        }
    ];

    // Add updated zones to map
    zones.forEach(zone => {
        const polygon = L.polygon(zone.coords, {
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: type === 'predicted' ? 0.6 : 0.4,
            weight: type === 'predicted' ? 3 : 2
        }).addTo(riskMap);

        const riskLevel = zone.risk.replace('-', ' ').toUpperCase();
        const prefix = type === 'predicted' ? 'Predicted: ' : '';

        polygon.bindPopup(`
            <div>
                <h4>${zone.name}</h4>
                <p>${prefix}Risk Level: ${riskLevel}</p>
            </div>
        `);
    });
}

// Enhanced Search Functionality
function initializeMapSearch() {
    const searchInput = document.querySelector('.search-input');

    const searchMap = (query, map) => {
        const locations = {
            'nainital': { lat: 29.3806, lng: 79.4422 },
            'almora': { lat: 29.6500, lng: 79.6667 },
            'dehradun': { lat: 30.3165, lng: 78.0322 },
            'haridwar': { lat: 29.9457, lng: 78.1642 },
            'rishikesh': { lat: 30.0869, lng: 78.2676 },
            'uttarakhand': { lat: 30.0668, lng: 79.0193 },
            'jim corbett': { lat: 29.5308, lng: 78.9514 },
            'corbett': { lat: 29.5308, lng: 78.9514 },
            'valley of flowers': { lat: 30.7268, lng: 79.6045 },
            'chamoli': { lat: 30.4000, lng: 79.3200 },
            'pithoragarh': { lat: 29.5833, lng: 80.2167 },
            'tehri': { lat: 30.3900, lng: 78.4800 },
            'pauri': { lat: 30.1500, lng: 78.7800 },
            'rudraprayag': { lat: 30.2800, lng: 78.9800 },
            'bageshwar': { lat: 29.8400, lng: 79.7700 },
            'champawat': { lat: 29.3400, lng: 80.0900 },
            'uttarkashi': { lat: 30.7300, lng: 78.4500 },
            'udham singh nagar': { lat: 28.9750, lng: 79.4000 }
        };

        const lowerCaseQuery = query.toLowerCase();
        if (locations[lowerCaseQuery]) {
            const { lat, lng } = locations[lowerCaseQuery];
            map.setView([lat, lng], 12);
            L.marker([lat, lng]).addTo(map).bindPopup(query.charAt(0).toUpperCase() + query.slice(1)).openPopup();
            showToast(`Navigated to ${query}`, 'success');
            return true;
        } else {
            showToast(`Location "${query}" not found.`, 'error');
            return false;
        }
    };

    const performSearch = (query) => {
        if (query && riskMap && simulationMap) {
            const riskSuccess = searchMap(query, riskMap);
            const simulationSuccess = searchMap(query, simulationMap);

            if (riskSuccess || simulationSuccess) {
                setTimeout(() => {
                    const fireRiskSection = document.getElementById('fire-risk');
                    if (fireRiskSection) {
                        fireRiskSection.scrollIntoView({ 
                            behavior: 'smooth',
                            block: 'start'
                        });

                        const mapContainers = document.querySelectorAll('.map-container');
                        mapContainers.forEach(container => {
                            container.style.boxShadow = '0 0 30px rgba(255, 107, 53, 0.8)';
                            container.style.transform = 'scale(1.01)';
                            container.style.transition = 'all 0.5s ease';
                        });

                        setTimeout(() => {
                            mapContainers.forEach(container => {
                                container.style.boxShadow = '';
                                container.style.transform = '';
                            });
                        }, 2000);
                    }
                }, 500);
            }

            if (searchInput) {
                searchInput.value = '';
            }
        }
    };

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                performSearch(query);
            }
        });
    }
}

// Start real-time data updates
function startDataUpdates() {
    setInterval(updateEnvironmentalData, 30000);
    setInterval(updateAlerts, 60000);
    setInterval(updateTimeStamps, 60000);
    setInterval(updateChartData, 45000);
    setInterval(updateFireSpreadChart, 10000);
    setInterval(updateActivityFeed, 45000);
    setInterval(updateEnvironmentalConditions, 35000);
    setInterval(updateResourceOptimizationData, 120000); // Update every 2 minutes
}

function updateEnvironmentalData() {
    const windSpeed = Math.floor(Math.random() * 20) + 5;
    const temperature = Math.floor(Math.random() * 15) + 25;
    const humidity = Math.floor(Math.random() * 40) + 30;

    updateElementText('wind-speed', `${windSpeed} km/h`);
    updateElementText('temperature', `${temperature}°C`);
    updateElementText('humidity', `${humidity}%`);

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    updateElementText('wind-direction', randomDirection);
}

function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

function updateAlerts() {
    const alertTimes = document.querySelectorAll('.alert-time');
    alertTimes.forEach((timeEl, index) => {
        const baseTime = (index + 1) * 15;
        timeEl.textContent = `${baseTime} minutes ago`;
    });
}

function updateTimeStamps() {
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = 'Just now';
        setTimeout(() => {
            lastUpdateElement.textContent = '1 minute ago';
        }, 5000);
    }
}

function updateChartData() {
    if (window.chartInstances && window.chartInstances.riskTimeline) {
        const chart = window.chartInstances.riskTimeline;
        chart.data.datasets.forEach((dataset) => {
            dataset.data = dataset.data.map(value => {
                const variation = (Math.random() - 0.5) * 10;
                return Math.max(0, Math.min(100, value + variation));
            });
        });
        chart.update('none');
    }

    updateGaugeValues();
    updateAlertStatistics();
}

function updateFireSpreadChart() {
    if (isSimulationRunning && window.chartInstances && window.chartInstances.fireSpread) {
        const chart = window.chartInstances.fireSpread;
        const lastValue = chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1];

        const timeLabel = simulationTime + 'h';
        const newArea = lastValue + Math.random() * 50 + 20;

        if (chart.data.labels.length > 10) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(Math.round(newArea));

        chart.update('none');
    }
}

function updateGaugeValues() {
    const newAccuracy = Math.max(95, Math.min(99, 97 + (Math.random() - 0.5) * 2));
    updateElementText('accuracyValue', newAccuracy.toFixed(1) + '%');

    const newUptime = Math.max(99.5, Math.min(100, 99.8 + (Math.random() - 0.5) * 0.3));
    updateElementText('uptimeValue', newUptime.toFixed(1) + '%');

    const newSpeed = Math.max(70, Math.min(95, 85 + (Math.random() - 0.5) * 10));
    updateElementText('speedValue', Math.round(newSpeed) + '%');
}

function updateAlertStatistics() {
    const totalAlerts = Math.floor(Math.random() * 20) + 130;
    const activeFires = Math.floor(Math.random() * 5) + 5;
    const responseTime = Math.floor(Math.random() * 8) + 8;

    updateElementText('totalAlerts', totalAlerts);
    updateElementText('activeFires', activeFires);
    updateElementText('responseTime', responseTime + ' min');
}

function updateActivityFeed() {
    const activities = [
        {
            icon: 'fas fa-satellite-dish',
            title: 'Satellite Data Updated',
            description: 'New MODIS imagery processed for Nainital region',
            time: '2 minutes ago'
        },
        {
            icon: 'fas fa-exclamation-triangle',
            title: 'Risk Level Updated',
            description: 'Almora District elevated to High Risk status',
            time: '8 minutes ago'
        },
        {
            icon: 'fas fa-cloud-sun',
            title: 'Weather Data Sync',
            description: 'ERA5 meteorological data synchronized',
            time: '15 minutes ago'
        }
    ];

    const activityFeed = document.querySelector('.activity-feed');
    if (activityFeed && Math.random() < 0.1) {
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        const newActivityHtml = `
            <div class="activity-item new">
                <div class="activity-icon">
                    <i class="${randomActivity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${randomActivity.title}</div>
                    <div class="activity-description">${randomActivity.description}</div>
                    <div class="activity-time">Just now</div>
                </div>
            </div>
        `;

        activityFeed.insertAdjacentHTML('afterbegin', newActivityHtml);

        const activityItems = activityFeed.querySelectorAll('.activity-item');
        if (activityItems.length > 5) {
            activityItems[activityItems.length - 1].remove();
        }

        activityItems.forEach((item, index) => {
            if (index > 0) {
                item.classList.remove('new');
            }
        });
    }
}

function updateEnvironmentalConditions() {
    const temperatureEl = document.querySelector('.condition-card.temperature .condition-value');
    const humidityEl = document.querySelector('.condition-card.humidity .condition-value');
    const windEl = document.querySelector('.condition-card.wind .condition-value');

    if (temperatureEl) {
        const newTemp = Math.floor(Math.random() * 8) + 28;
        temperatureEl.textContent = newTemp + '°C';
    }

    if (humidityEl) {
        const newHumidity = Math.floor(Math.random() * 30) + 35;
        humidityEl.textContent = newHumidity + '%';
    }

    if (windEl) {
        const newWind = Math.floor(Math.random() * 15) + 8;
        windEl.textContent = newWind + ' km/h';
    }

    if (Math.random() < 0.3) {
        updateMLPredictions();
    }
}

function updateResourceOptimizationData() {
    // Simulate resource status changes
    const resources = ['availableResources', 'deployedResources', 'maintenanceResources'];
    
    resources.forEach(resourceId => {
        const element = document.getElementById(resourceId);
        if (element) {
            const currentValue = parseInt(element.textContent) || 0;
            const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            const newValue = Math.max(0, currentValue + variation);
            element.textContent = newValue;
        }
    });
    
    // Update efficiency scores occasionally
    if (Math.random() < 0.4) {
        const efficiencyScores = ['responseTimeScore', 'resourceCoverage', 'riskMitigation'];
        efficiencyScores.forEach(scoreId => {
            const element = document.getElementById(scoreId);
            if (element) {
                const baseScore = parseInt(element.textContent) || 85;
                const newScore = Math.max(70, Math.min(98, baseScore + (Math.random() * 6 - 3)));
                element.textContent = Math.round(newScore) + '%';
            }
        });
    }
}

// ML Integration Functions
function initializeMLIntegration() {
    startMLRealTimeUpdates();
    loadMLModelInfo();
    setInterval(updateMLPredictions, 60000);
    showToast('AI/ML models initialized successfully', 'success');
}

async function startMLRealTimeUpdates() {
    try {
        const response = await fetch(`${ML_API_BASE}/api/ml/start-realtime`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            realTimeUpdates = true;
            showToast('Real-time AI predictions activated', 'success');
        }
    } catch (error) {
        console.warn('ML API not available, using fallback predictions');
        showToast('Using local AI predictions', 'warning');
    }
}

async function updateMLPredictions() {
    try {
        const envData = getCurrentEnvironmentalData();
        const response = await fetch(`${ML_API_BASE}/api/ml/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(envData)
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                mlPredictions = result.predictions;
                updateDashboardWithMLPredictions(result.predictions);
            }
        }
    } catch (error) {
        const envData = getCurrentEnvironmentalData();
        mlPredictions = generateFallbackPredictions(envData);
        updateDashboardWithMLPredictions(mlPredictions);
    }
}

function getCurrentEnvironmentalData() {
    const temperature = getElementValue('temperature', 32);
    const humidity = getElementValue('humidity', 45);
    const windSpeed = getElementValue('wind-speed', 15);
    const windDirection = getElementText('wind-direction', 'NE');

    return {
        temperature,
        humidity,
        wind_speed: windSpeed,
        wind_direction: windDirection,
        ndvi: 0.6 + (Math.random() - 0.5) * 0.2,
        elevation: 1500 + Math.random() * 500,
        slope: 10 + Math.random() * 20,
        vegetation_density: 'moderate'
    };
}

function updateDashboardWithMLPredictions(predictions) {
    if (predictions.ensemble_risk_score) {
        const accuracyEl = document.getElementById('accuracyValue');
        if (accuracyEl && predictions.confidence_interval) {
            const confidence = (predictions.confidence_interval.confidence_level * 100).toFixed(1);
            accuracyEl.textContent = confidence + '%';
        }
    }
}

function generateFallbackPredictions(envData) {
    const tempFactor = Math.min(envData.temperature / 40, 1);
    const humidityFactor = Math.max(0, (100 - envData.humidity) / 100);
    const windFactor = Math.min(envData.wind_speed / 30, 1);

    const baseRisk = (tempFactor * 0.4 + humidityFactor * 0.4 + windFactor * 0.2);
    const ensemble_risk = Math.min(baseRisk + Math.random() * 0.1, 1);

    return {
        ensemble_risk_score: ensemble_risk,
        ml_prediction: {
            overall_risk: ensemble_risk,
            confidence: 0.85,
            risk_category: ensemble_risk > 0.7 ? 'high' : ensemble_risk > 0.4 ? 'moderate' : 'low'
        },
        confidence_interval: {
            confidence_level: 0.85,
            lower_bound: Math.max(0, ensemble_risk - 0.1),
            upper_bound: Math.min(1, ensemble_risk + 0.1)
        }
    };
}

async function simulateFireWithML(latlng) {
    try {
        const envData = getCurrentEnvironmentalData();
        const response = await fetch(`${ML_API_BASE}/api/ml/simulate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lat: latlng.lat,
                lng: latlng.lng,
                duration: 6,
                ...envData
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showToast('AI-powered fire simulation completed', 'success');
                return result.simulation;
            }
        }
    } catch (error) {
        console.warn('ML simulation failed, using fallback');
        showToast('Using simplified fire simulation', 'warning');
    }

    return null;
}

async function loadMLModelInfo() {
    try {
        const response = await fetch(`${ML_API_BASE}/api/ml/model-info`);
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                const accuracyEl = document.getElementById('accuracyValue');
                if (accuracyEl && result.models.convlstm_unet.accuracy) {
                    accuracyEl.textContent = result.models.convlstm_unet.accuracy;
                }
                window.mlModelInfo = result.models;
            }
        }
    } catch (error) {
        console.warn('ML model info unavailable');
    }
}

// Initialize simulation monitoring chart
function initializeSimulationMonitoringChart() {
    const ctx = document.getElementById('simulationMonitoringChart');
    if (!ctx) return;

    const simulationMonitoringChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['0m'],
            datasets: [
                {
                    label: 'Area Burned (ha)',
                    data: [0],
                    borderColor: '#ff6b35',
                    backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Fire Perimeter (km)',
                    data: [0],
                    borderColor: '#ffa726',
                    backgroundColor: 'rgba(255, 167, 38, 0.1)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#ffffff',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        color: '#ffffff',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Area (ha)',
                        color: '#ff6b35',
                        font: {
                            size: 10
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: {
                        color: '#ffffff',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    title: {
                        display: true,
                        text: 'Perimeter (km)',
                        color: '#ffa726',
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });

    if (!window.chartInstances) {
        window.chartInstances = {};
    }
    window.chartInstances.simulationMonitoring = simulationMonitoringChart;
}

// Update monitoring stats
function updateMonitoringStats() {
    if (isSimulationRunning) {
        const timeInHours = simulationTime / 60;
        const baseArea = Math.pow(timeInHours, 1.5) * 25;
        const burnedArea = baseArea + (Math.random() * 20 - 10);
        const firePerimeter = Math.sqrt(burnedArea * 4 * Math.PI);
        const spreadRate = timeInHours > 0 ? burnedArea / timeInHours : 0;
        const activeCount = Math.min(Math.floor(burnedArea / 50) + 1, 15);

        updateElementText('totalBurnedArea', Math.max(0, burnedArea).toFixed(0) + ' ha');
        updateElementText('firePerimeter', Math.max(0, firePerimeter).toFixed(1) + ' km');
        updateElementText('spreadRate', Math.max(0, spreadRate).toFixed(1) + ' ha/hr');
        updateElementText('activeFireSources', activeCount);

        updateSimulationMonitoringChart(burnedArea, firePerimeter);
    } else {
        updateElementText('totalBurnedArea', '0 ha');
        updateElementText('firePerimeter', '0 km');
        updateElementText('spreadRate', '0 ha/hr');
        updateElementText('activeFireSources', '0');

        if (window.chartInstances && window.chartInstances.simulationMonitoring) {
            const chart = window.chartInstances.simulationMonitoring;
            chart.data.labels = ['0m'];
            chart.data.datasets[0].data = [0];
            chart.data.datasets[1].data = [0];
            chart.update('none');
        }
    }
}

function updateSimulationMonitoringChart(burnedArea, firePerimeter) {
    if (window.chartInstances && window.chartInstances.simulationMonitoring) {
        const chart = window.chartInstances.simulationMonitoring;

        const timeLabel = simulationTime > 60 ? 
            Math.floor(simulationTime / 60) + 'h' + (simulationTime % 60 > 0 ? (simulationTime % 60) + 'm' : '') :
            simulationTime + 'm';

        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
            chart.data.datasets[1].data.shift();
        }

        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(Math.max(0, burnedArea));
        chart.data.datasets[1].data.push(Math.max(0, firePerimeter));

        chart.update('none');
    }
}

// Toast Notifications
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Modal Functions
function openModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Close modal on overlay click
const modalOverlay = document.getElementById('modal-overlay');
if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// Scroll to section function
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
        showToast(`Navigating to ${sectionId.replace('-', ' ')} section`, 'processing', 1500);
    }
}

// Download report function
function downloadReport() {
    showToast('Generating daily risk report...', 'processing', 2000);

    setTimeout(() => {
        showToast('Daily risk report downloaded successfully!', 'success');

        const link = document.createElement('a');
        link.href = 'data:text/plain;charset=utf-8,NeuroNix Daily Fire Risk Report\n\nGenerated: ' + new Date().toLocaleString() + '\n\nOverall Risk Level: High\nTotal Monitored Area: 53,483 km²\nActive Sensors: 247\nPrediction Accuracy: 97.2%';
        link.download = 'neuronix-daily-report-' + new Date().toISOString().split('T')[0] + '.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, 2000);
}

// Alert System Functions
function sendTestAlert() {
    showToast('Sending test alert to all field officers...', 'processing', 2000);
    
    setTimeout(() => {
        showToast('Test alert sent successfully to 23 field officers!', 'success');
        
        // Update alert count
        const smsCount = document.querySelector('.status-item:nth-child(2) .status-value');
        if (smsCount) {
            const currentCount = parseInt(smsCount.textContent) || 147;
            smsCount.textContent = currentCount + 1;
        }
    }, 2000);
}

function sendEvacuationAlert(region) {
    showToast(`Generating evacuation routes for ${region.charAt(0).toUpperCase() + region.slice(1)}...`, 'processing', 2000);
    
    setTimeout(() => {
        showToast(`Evacuation alert sent! Safe routes displayed on map.`, 'success');
        
        // Simulate generating evacuation routes on the map
        if (simulationMap && region === 'nainital') {
            generateEvacuationRoutes(29.3806, 79.4422, 5); // Nainital coordinates
        } else if (simulationMap && region === 'corbett') {
            generateEvacuationRoutes(29.5308, 78.9514, 3); // Jim Corbett coordinates
        } else if (simulationMap && region === 'almora') {
            generateEvacuationRoutes(29.6500, 79.6667, 4); // Almora coordinates
        }
        
        // Switch to simulation section to show the routes
        setTimeout(() => {
            scrollToSection('fire-simulation');
        }, 1000);
    }, 2000);
}

function trackEvacuation(region) {
    showToast(`Tracking evacuation progress in ${region.charAt(0).toUpperCase() + region.slice(1)}...`, 'processing', 1500);
    
    setTimeout(() => {
        showToast('Evacuation progress: 78% completed. 156 people safely evacuated.', 'success');
    }, 1500);
}

// Initialize evacuation map with safe zones and routes
function initializeEvacuationMap() {
    if (!evacuationMap) return;
    
    // Add safe zones (hospitals, schools, government buildings)
    const safeZones = [
        { name: 'Nainital District Hospital', lat: 29.3919, lng: 79.4542, type: 'hospital' },
        { name: 'Government Inter College Nainital', lat: 29.3806, lng: 79.4422, type: 'school' },
        { name: 'Almora District Hospital', lat: 29.5967, lng: 79.6653, type: 'hospital' },
        { name: 'Forest Research Institute Dehradun', lat: 30.3356, lng: 78.0436, type: 'government' },
        { name: 'AIIMS Rishikesh', lat: 30.0869, lng: 78.2676, type: 'hospital' },
        { name: 'Haridwar Railway Station', lat: 29.9458, lng: 78.1642, type: 'transport' }
    ];
    
    safeZones.forEach(zone => {
        const iconClass = {
            'hospital': 'fas fa-hospital',
            'school': 'fas fa-school',
            'government': 'fas fa-landmark',
            'transport': 'fas fa-train'
        };
        
        const iconColor = {
            'hospital': '#ef4444',
            'school': '#3b82f6',
            'government': '#10b981',
            'transport': '#f59e0b'
        };
        
        const marker = L.marker([zone.lat, zone.lng], {
            icon: L.divIcon({
                className: 'safe-zone-marker',
                html: `<i class="${iconClass[zone.type]}" style="color: ${iconColor[zone.type]}; font-size: 16px;"></i>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(evacuationMap);
        
        marker.bindPopup(`
            <div class="evacuation-popup">
                <h4><i class="${iconClass[zone.type]}"></i> ${zone.name}</h4>
                <p><strong>Type:</strong> ${zone.type.charAt(0).toUpperCase() + zone.type.slice(1)}</p>
                <p><strong>Status:</strong> Available</p>
            </div>
        `);
    });
    
    // Initially show sample evacuation routes
    showSampleEvacuationRoutes();
}

function showSampleEvacuationRoutes() {
    if (!evacuationMap) return;
    
    // Clear existing routes first
    clearEvacuationRoutes();
    
    // Sample evacuation routes
    const sampleRoutes = [
        {
            name: 'Nainital → Bhowali Emergency Route',
            coordinates: [[29.3806, 79.4422], [29.3767, 79.4160], [29.3650, 79.3980]],
            color: '#10b981',
            type: 'primary'
        },
        {
            name: 'Almora → Ranikhet Evacuation',
            coordinates: [[29.6500, 79.6667], [29.6400, 79.5500], [29.6400, 79.4100]],
            color: '#f59e0b',
            type: 'secondary'
        },
        {
            name: 'Dehradun → Mussoorie Safe Route',
            coordinates: [[30.3165, 78.0322], [30.3800, 78.0500], [30.4571, 78.0654]],
            color: '#3b82f6',
            type: 'backup'
        }
    ];
    
    sampleRoutes.forEach(route => {
        const routeLine = L.polyline(route.coordinates, {
            color: route.color,
            weight: 4,
            opacity: 0.8,
            dashArray: route.type === 'primary' ? null : '10, 5'
        }).addTo(evacuationMap);
        
        routeLine.bindPopup(`
            <div class="evacuation-popup">
                <h4><i class="fas fa-route"></i> ${route.name}</h4>
                <p><strong>Type:</strong> ${route.type.charAt(0).toUpperCase() + route.type.slice(1)} Route</p>
                <p><strong>Status:</strong> Active</p>
                <p><strong>Distance:</strong> ${(Math.random() * 3 + 2).toFixed(1)} km</p>
            </div>
        `);
        
        evacuationRouteLayers.push(routeLine);
    });
    
    // Fit map to show all routes
    if (evacuationRouteLayers.length > 0) {
        const group = new L.featureGroup(evacuationRouteLayers);
        evacuationMap.fitBounds(group.getBounds().pad(0.1));
    }
    
    showToast('Sample evacuation routes displayed on map', 'success');
}

function showAllEvacuationRoutesOnMap() {
    if (!evacuationMap) {
        showToast('Evacuation map not available', 'error');
        return;
    }
    
    showToast('Loading evacuation routes...', 'processing', 1500);
    
    setTimeout(() => {
        // Clear existing routes
        clearEvacuationRoutes();
        
        // Add comprehensive evacuation routes
        const allRoutes = [
            {
                name: 'Nainital Emergency Evacuation',
                coordinates: [[29.3806, 79.4422], [29.3767, 79.4160], [29.3650, 79.3980], [29.3500, 79.3800]],
                color: '#10b981',
                type: 'primary'
            },
            {
                name: 'Almora to Safety Zone',
                coordinates: [[29.6500, 79.6667], [29.6400, 79.5500], [29.6300, 79.4800], [29.6400, 79.4100]],
                color: '#f59e0b',
                type: 'secondary'
            },
            {
                name: 'Dehradun Quick Escape',
                coordinates: [[30.3165, 78.0322], [30.3400, 78.0400], [30.3800, 78.0500], [30.4571, 78.0654]],
                color: '#3b82f6',
                type: 'backup'
            },
            {
                name: 'Haridwar Emergency Route',
                coordinates: [[29.9457, 78.1642], [29.9600, 78.1500], [29.9800, 78.1300]],
                color: '#ef4444',
                type: 'emergency'
            },
            {
                name: 'Rishikesh Evacuation Path',
                coordinates: [[30.0869, 78.2676], [30.1000, 78.2500], [30.1200, 78.2300]],
                color: '#8b5cf6',
                type: 'alternate'
            }
        ];
        
        const routeGroup = [];
        
        allRoutes.forEach(route => {
            const routeLine = L.polyline(route.coordinates, {
                color: route.color,
                weight: 4,
                opacity: 0.8,
                dashArray: route.type === 'primary' ? null : '8, 4'
            }).addTo(evacuationMap);
            
            routeLine.bindPopup(`
                <div class="evacuation-popup">
                    <h4><i class="fas fa-route"></i> ${route.name}</h4>
                    <p><strong>Route Type:</strong> ${route.type.charAt(0).toUpperCase() + route.type.slice(1)}</p>
                    <p><strong>Status:</strong> Active & Clear</p>
                    <p><strong>Distance:</strong> ${(Math.random() * 4 + 2).toFixed(1)} km</p>
                    <p><strong>Travel Time:</strong> ${Math.floor(Math.random() * 20 + 10)} min</p>
                </div>
            `);
            
            evacuationRouteLayers.push(routeLine);
            routeGroup.push(routeLine);
        });
        
        // Fit map to show all routes
        if (routeGroup.length > 0) {
            const group = new L.featureGroup(routeGroup);
            evacuationMap.fitBounds(group.getBounds().pad(0.1));
        }
        
        // Update route statistics
        updateEvacuationStats();
        showToast('All evacuation routes displayed successfully', 'success');
    }, 1500);
}

function clearEvacuationRoutes() {
    if (evacuationMap && evacuationRouteLayers.length > 0) {
        evacuationRouteLayers.forEach(layer => {
            evacuationMap.removeLayer(layer);
        });
        evacuationRouteLayers = [];
        showToast('Evacuation routes cleared', 'processing', 1000);
    }
}

function updateEvacuationStats() {
    // Update the route statistics in the UI
    const routeStats = document.querySelectorAll('.evacuation-stat .evacuation-value');
    if (routeStats.length >= 3) {
        routeStats[0].textContent = evacuationRouteLayers.length + ' Active';
        routeStats[1].textContent = '12 Available';
        routeStats[2].textContent = (3.8 + (Math.random() - 0.5)).toFixed(1) + ' km';
    }
}

function exportEvacuationData() {
    showToast('Exporting evacuation routes data...', 'processing', 2000);
    
    setTimeout(() => {
        const evacuationData = {
            timestamp: new Date().toISOString(),
            routes: evacuationRouteLayers.length,
            safeZones: 12,
            status: 'active',
            coverage: '85% of Uttarakhand districts'
        };
        
        const dataStr = JSON.stringify(evacuationData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `evacuation-routes-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Evacuation data exported successfully!', 'success');
    }, 2000);
}

function showAllEvacuationRoutes() {
    // This function now just calls the dedicated map function
    showAllEvacuationRoutesOnMap();
}

function generateNewRoutes() {
    showToast('Updating evacuation routes with latest traffic and road conditions...', 'processing', 2500);
    
    setTimeout(() => {
        // Update the route statistics
        const routeStats = document.querySelectorAll('.evacuation-stat .evacuation-value');
        if (routeStats.length >= 3) {
            routeStats[0].textContent = (12 + Math.floor(Math.random() * 3)) + ' Active';
            routeStats[1].textContent = (8 + Math.floor(Math.random() * 2)) + ' Available';
            routeStats[2].textContent = (4.2 + (Math.random() - 0.5)).toFixed(1) + ' km';
        }
        
        showToast('Evacuation routes updated successfully!', 'success');
    }, 2500);
}

// Enhanced evacuation route display function
function showEvacuationRoutes() {
    showToast('Loading safe evacuation route mapping...', 'processing', 1500);
    
    setTimeout(() => {
        scrollToSection('alerts');
        showToast('Evacuation route system activated. Click alerts to generate routes.', 'success');
    }, 1500);
}

// Open field dashboard function
function openFieldDashboard() {
    showToast('Opening Field Officer Dashboard...', 'processing', 1500);

    setTimeout(() => {
        window.open('/field-dashboard', '_blank');
        showToast('Field dashboard opened in new tab', 'success');
    }, 1500);
}

// Resource Optimization Functions
async function optimizeResources() {
    showToast('Optimizing resource deployment...', 'processing', 2000);
    
    try {
        const response = await fetch(`${ML_API_BASE}/api/resources/recommendations`);
        const data = await response.json();
        
        if (data.success) {
            resourceRecommendations = data.resource_optimization.recommendations;
            resourceStatus = data.resource_optimization.resource_status;
            
            updateResourceRecommendationsTable();
            updateResourceStatusSummary();
            updateResourceAnalytics(data.resource_optimization);
            
            showToast('Resource optimization completed successfully!', 'success');
        } else {
            showToast('Failed to optimize resources', 'error');
        }
    } catch (error) {
        console.error('Error optimizing resources:', error);
        showToast('Resource optimization service unavailable', 'warning');
        
        // Use fallback data for demo
        generateFallbackResourceRecommendations();
    }
}

function generateFallbackResourceRecommendations() {
    // Generate demo resource recommendations
    const regions = ['Nainital', 'Almora', 'Dehradun', 'Haridwar'];
    const resourceTypes = [
        { type: 'firefighter_crew', icon: 'fas fa-users', name: 'Firefighter Crew' },
        { type: 'water_tank', icon: 'fas fa-truck', name: 'Water Tanker' },
        { type: 'drone', icon: 'fas fa-drone', name: 'Surveillance Drone' },
        { type: 'helicopter', icon: 'fas fa-helicopter', name: 'Fire Helicopter' }
    ];
    
    resourceRecommendations = [];
    
    for (let i = 0; i < 12; i++) {
        const region = regions[Math.floor(Math.random() * regions.length)];
        const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        const priority = ['critical', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)];
        
        resourceRecommendations.push({
            resource_id: `${resourceType.type}_${i + 1}`,
            resource_type: resourceType.type,
            resource_name: resourceType.name,
            resource_icon: resourceType.icon,
            priority: priority,
            region: region,
            arrival_time_minutes: 15 + Math.floor(Math.random() * 45),
            duration_hours: 4 + Math.floor(Math.random() * 6),
            cost_estimate: 2000 + Math.floor(Math.random() * 8000),
            effectiveness_score: 0.6 + Math.random() * 0.4,
            justification: `${priority.charAt(0).toUpperCase() + priority.slice(1)} priority deployment needed for ${region} region.`
        });
    }
    
    // Sort by priority
    const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    resourceRecommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    updateResourceRecommendationsTable();
    updateResourceStatusSummary();
    updateResourceAnalyticsFallback();
}

function updateResourceRecommendationsTable() {
    const tbody = document.getElementById('recommendationsTableBody');
    if (!tbody) return;
    
    if (resourceRecommendations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">
                    <i class="fas fa-info-circle"></i>
                    No resource recommendations available. Click "Optimize" to generate recommendations.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = resourceRecommendations.map(rec => `
        <tr>
            <td>
                <span class="priority-badge ${rec.priority}">${rec.priority}</span>
            </td>
            <td>
                <div class="resource-type-badge">
                    <i class="${rec.resource_icon || 'fas fa-cog'}"></i>
                    ${rec.resource_name || rec.resource_type.replace('_', ' ').toUpperCase()}
                </div>
            </td>
            <td><strong>${rec.region}</strong></td>
            <td>${rec.arrival_time_minutes} min</td>
            <td>${rec.duration_hours} hrs</td>
            <td>₹${rec.cost_estimate.toLocaleString()}</td>
            <td>
                <div class="effectiveness-bar">
                    <div class="effectiveness-fill" style="width: ${(rec.effectiveness_score * 100)}%"></div>
                </div>
                <small>${(rec.effectiveness_score * 100).toFixed(0)}%</small>
            </td>
            <td>
                <button class="deploy-btn" onclick="deployResource('${rec.resource_id}', '${rec.region}')" 
                        title="${rec.justification}">
                    <i class="fas fa-play"></i> Deploy
                </button>
            </td>
        </tr>
    `).join('');
}

function updateResourceStatusSummary() {
    // Update resource status numbers
    const updates = {
        'totalFirefighters': resourceStatus.by_type?.firefighter_crew?.total || 5,
        'totalTankers': resourceStatus.by_type?.water_tank?.total || 3,
        'totalDrones': resourceStatus.by_type?.drone?.total || 2,
        'totalHelicopters': resourceStatus.by_type?.helicopter?.total || 2
    };
    
    Object.entries(updates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Update availability summary
    if (resourceStatus.total_resources) {
        updateElementText('availableResources', resourceStatus.available || 8);
        updateElementText('deployedResources', resourceStatus.deployed || 3);
        updateElementText('maintenanceResources', resourceStatus.maintenance || 1);
    }
}

function updateResourceAnalytics(optimizationData) {
    // Update cost analysis
    const totalCost = optimizationData.total_cost_estimate || 0;
    updateElementText('totalDeploymentCost', `₹${totalCost.toLocaleString()}`);
    
    const avgDuration = resourceRecommendations.reduce((sum, rec) => sum + rec.duration_hours, 0) / resourceRecommendations.length;
    updateElementText('costPerHour', `₹${Math.round(totalCost / (avgDuration || 1)).toLocaleString()}`);
    
    // Update efficiency metrics
    const avgEffectiveness = resourceRecommendations.reduce((sum, rec) => sum + rec.effectiveness_score, 0) / resourceRecommendations.length;
    updateElementText('overallEfficiencyValue', `${Math.round(avgEffectiveness * 100)}%`);
    
    // Update response time score (based on average arrival time)
    const avgResponseTime = resourceRecommendations.reduce((sum, rec) => sum + rec.arrival_time_minutes, 0) / resourceRecommendations.length;
    const responseScore = Math.max(60, 100 - avgResponseTime);
    updateElementText('responseTimeScore', `${Math.round(responseScore)}%`);
    
    // Update charts
    updateResourceCharts(optimizationData);
}

function updateResourceAnalyticsFallback() {
    // Fallback analytics update with demo data
    const totalCost = resourceRecommendations.reduce((sum, rec) => sum + rec.cost_estimate, 0);
    updateElementText('totalDeploymentCost', `₹${totalCost.toLocaleString()}`);
    
    const avgDuration = resourceRecommendations.reduce((sum, rec) => sum + rec.duration_hours, 0) / resourceRecommendations.length;
    updateElementText('costPerHour', `₹${Math.round(totalCost / avgDuration).toLocaleString()}`);
    
    const avgEffectiveness = resourceRecommendations.reduce((sum, rec) => sum + rec.effectiveness_score, 0) / resourceRecommendations.length;
    updateElementText('overallEfficiencyValue', `${Math.round(avgEffectiveness * 100)}%`);
    
    updateElementText('costEfficiencyScore', 'A-');
    updateElementText('resourceCoverage', '88%');
    updateElementText('riskMitigation', '94%');
    
    // Initialize demo charts
    initializeResourceCharts();
}

function updateResourceCharts(optimizationData) {
    initializeCostBreakdownChart();
    initializeDeploymentEfficiencyGauge();
    initializeResourceAvailabilityChart();
}

function initializeResourceCharts() {
    initializeCostBreakdownChart();
    initializeDeploymentEfficiencyGauge();
    initializeResourceAvailabilityChart();
}

function initializeCostBreakdownChart() {
    const ctx = document.getElementById('costBreakdownChart');
    if (!ctx) return;
    
    // Calculate cost breakdown by resource type
    const costByType = {};
    resourceRecommendations.forEach(rec => {
        const type = rec.resource_name || rec.resource_type;
        costByType[type] = (costByType[type] || 0) + rec.cost_estimate;
    });
    
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(costByType),
            datasets: [{
                data: Object.values(costByType),
                backgroundColor: ['#ff6b35', '#ffa726', '#66bb6a', '#42a5f5', '#ab47bc'],
                borderWidth: 2,
                borderColor: '#1a1a2e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 10,
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ₹' + context.parsed.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function initializeDeploymentEfficiencyGauge() {
    const ctx = document.getElementById('deploymentEfficiencyGauge');
    if (!ctx) return;
    
    const avgEffectiveness = resourceRecommendations.length > 0 
        ? resourceRecommendations.reduce((sum, rec) => sum + rec.effectiveness_score, 0) / resourceRecommendations.length
        : 0.85;
    
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [avgEffectiveness * 100, (1 - avgEffectiveness) * 100],
                backgroundColor: ['#10b981', 'rgba(255, 255, 255, 0.1)'],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

function initializeResourceAvailabilityChart() {
    const ctx = document.getElementById('resourceAvailabilityChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Firefighters', 'Tankers', 'Drones', 'Helicopters'],
            datasets: [
                {
                    label: 'Available',
                    data: [4, 2, 2, 1],
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Deployed',
                    data: [1, 1, 0, 1],
                    backgroundColor: '#f59e0b'
                },
                {
                    label: 'Maintenance',
                    data: [0, 0, 0, 0],
                    backgroundColor: '#ef4444'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#ffffff', font: { size: 10 } }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: '#ffffff', font: { size: 10 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    ticks: { color: '#ffffff', font: { size: 10 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

async function deployResource(resourceId, region) {
    showToast(`Deploying ${resourceId} to ${region}...`, 'processing', 2000);
    
    try {
        // Get region coordinates
        const regionCoords = {
            'Nainital': [29.3806, 79.4422],
            'Almora': [29.5833, 79.6667],
            'Dehradun': [30.3165, 78.0322],
            'Haridwar': [29.9458, 78.1642],
            'Rishikesh': [30.0869, 78.2676]
        };
        
        const location = regionCoords[region] || [30.0, 79.0];
        
        const response = await fetch(`${ML_API_BASE}/api/resources/deploy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resource_id: resourceId,
                location: location
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`${resourceId} successfully deployed to ${region}!`, 'success');
            
            // Remove from recommendations table
            resourceRecommendations = resourceRecommendations.filter(rec => rec.resource_id !== resourceId);
            updateResourceRecommendationsTable();
            
            // Update status counts
            const deployedElement = document.getElementById('deployedResources');
            const availableElement = document.getElementById('availableResources');
            if (deployedElement && availableElement) {
                const deployed = parseInt(deployedElement.textContent) + 1;
                const available = parseInt(availableElement.textContent) - 1;
                deployedElement.textContent = deployed;
                availableElement.textContent = Math.max(0, available);
            }
        } else {
            showToast('Failed to deploy resource', 'error');
        }
    } catch (error) {
        console.error('Error deploying resource:', error);
        showToast('Deployment service unavailable - simulating deployment', 'warning');
        
        // Simulate successful deployment
        setTimeout(() => {
            showToast(`${resourceId} deployed to ${region} (simulated)`, 'success');
            resourceRecommendations = resourceRecommendations.filter(rec => rec.resource_id !== resourceId);
            updateResourceRecommendationsTable();
        }, 1000);
    }
}

async function refreshResourceRecommendations() {
    showToast('Refreshing recommendations...', 'processing', 1500);
    
    setTimeout(() => {
        optimizeResources();
    }, 1500);
}

// Initialize resource optimization when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add existing initialization code here
    
    // Initialize resource optimization after a delay
    setTimeout(() => {
        generateFallbackResourceRecommendations();
    }, 2000);
});

// Environmental Impact Calculation Functions
let environmentalImpactData = {};

async function calculateCarbonEmissions() {
    showToast('Calculating carbon emissions...', 'processing', 2000);
    
    try {
        // Get current environmental data and fire parameters
        const fireData = {
            burned_area_hectares: 25.5, // Example data - in real implementation, get from simulation
            vegetation_type: 'mixed',
            fire_intensity: 'moderate_intensity',
            temperature: getElementValue('temperature', 32),
            humidity: getElementValue('humidity', 45),
            wind_speed: getElementValue('wind-speed', 15)
        };
        
        const response = await fetch(`${ML_API_BASE}/api/environmental/carbon-calculator`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fireData)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateCarbonEmissionsDisplay(result.carbon_emissions);
                showToast('Carbon emissions calculated successfully!', 'success');
            }
        } else {
            throw new Error('API request failed');
        }
    } catch (error) {
        console.warn('Carbon emissions API not available, using fallback calculations');
        const fallbackEmissions = calculateFallbackCarbonEmissions();
        updateCarbonEmissionsDisplay(fallbackEmissions);
        showToast('Carbon emissions calculated (simulated data)', 'warning');
    }
}

async function calculateEcologicalImpact() {
    showToast('Assessing ecological impact...', 'processing', 2000);
    
    try {
        const fireData = {
            burned_area_hectares: 25.5,
            vegetation_type: 'mixed',
            fire_intensity: 'moderate_intensity',
            ecosystem_data: {}
        };
        
        const response = await fetch(`${ML_API_BASE}/api/environmental/ecological-impact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fireData)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateEcologicalImpactDisplay(result.ecological_impact);
                showToast('Ecological impact assessment completed!', 'success');
            }
        } else {
            throw new Error('API request failed');
        }
    } catch (error) {
        console.warn('Ecological impact API not available, using fallback calculations');
        const fallbackImpact = calculateFallbackEcologicalImpact();
        updateEcologicalImpactDisplay(fallbackImpact);
        showToast('Ecological impact assessed (simulated data)', 'warning');
    }
}

async function calculateComprehensiveEnvironmentalImpact() {
    showToast('Calculating comprehensive environmental impact...', 'processing', 3000);
    
    try {
        const fireData = {
            burned_area_hectares: 25.5,
            vegetation_type: 'mixed',
            fire_intensity: 'moderate_intensity',
            temperature: getElementValue('temperature', 32),
            humidity: getElementValue('humidity', 45),
            wind_speed: getElementValue('wind-speed', 15),
            ecosystem_data: {}
        };
        
        const response = await fetch(`${ML_API_BASE}/api/environmental/impact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fireData)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                environmentalImpactData = result.environmental_impact;
                updateComprehensiveEnvironmentalDisplay(result.environmental_impact);
                showToast('Comprehensive environmental impact calculated!', 'success');
            }
        } else {
            throw new Error('API request failed');
        }
    } catch (error) {
        console.warn('Environmental impact API not available, using fallback calculations');
        const fallbackData = calculateFallbackComprehensiveImpact();
        environmentalImpactData = fallbackData;
        updateComprehensiveEnvironmentalDisplay(fallbackData);
        showToast('Environmental impact calculated (simulated data)', 'warning');
    }
}

function calculateFallbackCarbonEmissions() {
    const burnedArea = 25.5;
    const co2Tonnes = burnedArea * 39.5; // Approximate emission factor
    
    return {
        co2_emissions_kg: co2Tonnes * 1000,
        co2_emissions_tonnes: co2Tonnes,
        ch4_emissions_kg: co2Tonnes * 5,
        n2o_emissions_kg: co2Tonnes * 1,
        total_co2_equivalent: co2Tonnes * 1000 * 1.1,
        biomass_burned_kg: burnedArea * 25000
    };
}

function calculateFallbackEcologicalImpact() {
    return {
        flora_impact: {
            vegetation_mortality_rate: 65.2,
            estimated_trees_lost: 1632,
            canopy_cover_loss_percent: 58.7,
            rare_species_risk: 'moderate'
        },
        fauna_impact: {
            habitat_loss_percent: 42.3,
            wildlife_displacement_rate: 78.5,
            estimated_wildlife_casualties: 387,
            endangered_species_risk: 'high'
        },
        biodiversity_impact: {
            biodiversity_loss_percent: 35.8,
            species_richness_reduction: 28.6,
            ecosystem_fragmentation: 'moderate',
            genetic_diversity_impact: 'moderate'
        },
        recovery_timeline: {
            canopy_cover: 15.2,
            biodiversity: 18.7,
            soil_organic_matter: 12.4
        },
        economic_impact: {
            annual_ecosystem_service_loss_usd: 127500,
            twenty_year_impact_usd: 2550000,
            service_breakdown: {
                carbon_sequestration: 19125,
                water_regulation: 25500,
                biodiversity_conservation: 38250,
                recreation_tourism: 31875,
                timber_value: 12750
            }
        },
        overall_severity: 'moderate'
    };
}

function calculateFallbackComprehensiveImpact() {
    const carbonEmissions = calculateFallbackCarbonEmissions();
    const ecologicalImpact = calculateFallbackEcologicalImpact();
    
    return {
        carbon_emissions: carbonEmissions,
        ecological_impact: ecologicalImpact,
        summary: {
            total_co2_tonnes: carbonEmissions.co2_emissions_tonnes,
            equivalent_car_emissions_years: Math.round(carbonEmissions.co2_emissions_tonnes / 4.6),
            trees_needed_to_offset: Math.round(carbonEmissions.co2_emissions_tonnes * 40),
            overall_ecological_severity: ecologicalImpact.overall_severity,
            recovery_time_estimate_years: ecologicalImpact.recovery_timeline.biodiversity,
            economic_impact_20_years: ecologicalImpact.economic_impact.twenty_year_impact_usd
        }
    };
}

function updateCarbonEmissionsDisplay(emissions) {
    // Update main carbon emissions stats
    updateElementText('totalCO2Emissions', emissions.co2_emissions_tonnes.toFixed(1));
    updateElementText('carEquivalent', Math.round(emissions.co2_emissions_tonnes / 4.6));
    updateElementText('treesNeeded', Math.round(emissions.co2_emissions_tonnes * 40).toLocaleString());
    
    // Update breakdown
    updateElementText('co2Breakdown', emissions.co2_emissions_kg.toLocaleString() + ' kg');
    updateElementText('ch4Breakdown', emissions.ch4_emissions_kg.toFixed(1) + ' kg');
    updateElementText('n2oBreakdown', emissions.n2o_emissions_kg.toFixed(1) + ' kg');
    updateElementText('co2Equivalent', emissions.total_co2_equivalent.toLocaleString() + ' kg');
    
    // Initialize emissions chart
    initializeEmissionsChart(emissions);
}

function updateEcologicalImpactDisplay(impact) {
    // Flora impact
    updateElementText('vegetationMortality', impact.flora_impact.vegetation_mortality_rate + '%');
    updateElementText('treesLost', impact.flora_impact.estimated_trees_lost.toLocaleString());
    updateElementText('canopyLoss', impact.flora_impact.canopy_cover_loss_percent + '%');
    
    // Fauna impact
    updateElementText('habitatLoss', impact.fauna_impact.habitat_loss_percent + '%');
    updateElementText('wildlifeDisplacement', impact.fauna_impact.wildlife_displacement_rate + '%');
    updateElementText('wildlifeCasualties', impact.fauna_impact.estimated_wildlife_casualties.toLocaleString());
    
    // Biodiversity impact
    updateElementText('biodiversityLoss', impact.biodiversity_impact.biodiversity_loss_percent + '%');
    updateElementText('speciesReduction', impact.biodiversity_impact.species_richness_reduction + '%');
    updateElementText('fragmentationLevel', impact.biodiversity_impact.ecosystem_fragmentation);
    
    // Recovery timeline
    updateElementText('canopyRecovery', impact.recovery_timeline.canopy_cover + ' years');
    updateElementText('biodiversityRecovery', impact.recovery_timeline.biodiversity + ' years');
    updateElementText('soilRecovery', impact.recovery_timeline.soil_organic_matter + ' years');
    
    // Economic impact
    updateElementText('annualEconomicLoss', '$' + impact.economic_impact.annual_ecosystem_service_loss_usd.toLocaleString());
    updateElementText('twentyYearImpact', '$' + impact.economic_impact.twenty_year_impact_usd.toLocaleString());
    
    // Service breakdown
    const services = impact.economic_impact.service_breakdown;
    updateElementText('carbonSequestrationLoss', '$' + services.carbon_sequestration.toLocaleString());
    updateElementText('waterRegulationLoss', '$' + services.water_regulation.toLocaleString());
    updateElementText('biodiversityConservationLoss', '$' + services.biodiversity_conservation.toLocaleString());
    updateElementText('recreationLoss', '$' + services.recreation_tourism.toLocaleString());
    
    // Initialize charts
    initializeRecoveryTimelineChart(impact.recovery_timeline);
    initializeImpactSeverityGauge(impact);
}

function updateComprehensiveEnvironmentalDisplay(data) {
    updateCarbonEmissionsDisplay(data.carbon_emissions);
    updateEcologicalImpactDisplay(data.ecological_impact);
    
    // Update severity level
    const severity = data.ecological_impact.overall_severity;
    updateElementText('severityLevel', severity.charAt(0).toUpperCase() + severity.slice(1));
    
    const descriptions = {
        'low': 'Minimal long-term ecological impact expected',
        'moderate': 'Significant but recoverable ecological impact',
        'severe': 'Major ecological damage with extended recovery period',
        'catastrophic': 'Devastating ecological impact requiring intensive restoration'
    };
    
    updateElementText('severityDescription', descriptions[severity] || 'Impact assessment completed');
}

function initializeEmissionsChart(emissions) {
    const ctx = document.getElementById('emissionsChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['CO₂', 'CH₄ (CO₂ eq)', 'N₂O (CO₂ eq)', 'Other'],
            datasets: [{
                data: [
                    emissions.co2_emissions_kg,
                    emissions.ch4_emissions_kg * 25, // CH₄ global warming potential
                    emissions.n2o_emissions_kg * 298, // N₂O global warming potential
                    emissions.total_co2_equivalent - emissions.co2_emissions_kg - (emissions.ch4_emissions_kg * 25) - (emissions.n2o_emissions_kg * 298)
                ],
                backgroundColor: ['#ff6b35', '#ffa726', '#66bb6a', '#42a5f5'],
                borderWidth: 2,
                borderColor: '#1a1a2e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 10,
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + (context.parsed / 1000).toFixed(1) + ' tonnes CO₂ eq';
                        }
                    }
                }
            }
        }
    });
}

function initializeRecoveryTimelineChart(timeline) {
    const ctx = document.getElementById('recoveryTimelineChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Canopy Cover', 'Biodiversity', 'Soil Health'],
            datasets: [{
                label: 'Recovery Time (Years)',
                data: [timeline.canopy_cover, timeline.biodiversity, timeline.soil_organic_matter],
                backgroundColor: ['#66bb6a', '#42a5f5', '#ffa726'],
                borderColor: ['#4caf50', '#2196f3', '#ff9800'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#ffffff', font: { size: 10 } }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#ffffff', font: { size: 10 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { 
                        color: '#ffffff', 
                        font: { size: 10 },
                        callback: function(value) {
                            return value + ' years';
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

function initializeImpactSeverityGauge(impact) {
    const ctx = document.getElementById('impactSeverityGauge');
    if (!ctx) return;
    
    const severityScore = (
        impact.flora_impact.vegetation_mortality_rate +
        impact.fauna_impact.wildlife_displacement_rate +
        impact.biodiversity_impact.biodiversity_loss_percent
    ) / 3;
    
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [severityScore, 100 - severityScore],
                backgroundColor: [
                    severityScore > 70 ? '#ef4444' : severityScore > 50 ? '#ffa726' : severityScore > 30 ? '#66bb6a' : '#10b981',
                    'rgba(255, 255, 255, 0.1)'
                ],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
    
    // Update severity factor bars
    updateElementStyle('floraImpactBar', 'width', impact.flora_impact.vegetation_mortality_rate + '%');
    updateElementStyle('faunaImpactBar', 'width', impact.fauna_impact.wildlife_displacement_rate + '%');
    updateElementStyle('biodiversityImpactBar', 'width', impact.biodiversity_impact.biodiversity_loss_percent + '%');
}

function updateElementStyle(id, property, value) {
    const element = document.getElementById(id);
    if (element) {
        element.style[property] = value;
    }
}

// Automatically calculate environmental impact when simulation starts
document.addEventListener('DOMContentLoaded', function() {
    // Add existing initialization code here
    
    // Initialize environmental impact calculations after a delay
    setTimeout(() => {
        calculateComprehensiveEnvironmentalImpact();
    }, 3000);
});

// Enhanced keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.focus();
            showToast('Search activated', 'processing', 1000);
        }
    }

    if (e.key === 'Escape') {
        closeModal();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        downloadReport();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        calculateComprehensiveEnvironmentalImpact();
    }
});

// --- Evacuation Route Mapping Feature ---

let evacuationRouteLayer = null;

// Function to generate safe evacuation routes using OpenStreetMap API (Nominatim for geocoding, OSRM for routing)
async function generateEvacuationRoutes(fireLat, fireLng, radiusKm) {
    if (!simulationMap) {
        console.error("Simulation map not initialized.");
        return;
    }

    // 1. Find nearby settlements (simplified: using predefined locations for demonstration)
    const nearbySettlements = await findNearbySettlements(fireLat, fireLng, radiusKm);

    if (nearbySettlements.length === 0) {
        console.log("No nearby settlements found for evacuation.");
        showToast("No safe evacuation routes could be determined. No nearby settlements found.", "warning");
        return;
    }

    // 2. Determine the safest route to the nearest suitable settlement
    // For simplicity, we'll pick the closest settlement as the target.
    // In a real-world scenario, you'd consider factors like road availability, terrain, etc.
    const targetSettlement = nearbySettlements[0]; // Closest settlement

    // 3. Get routing information from OSRM (Open Source Routing Machine)
    // We'll use a public OSRM instance for demonstration.
    // Note: Public instances may have rate limits.
    const routingUrl = `https://router.project-osrm.org/route/v1/driving/${fireLng},${fireLat};${targetSettlement.lon},${targetSettlement.lat}?geometries=geojson`;

    try {
        const response = await fetch(routingUrl);
        if (!response.ok) {
            throw new Error(`OSRM routing failed with status ${response.status}`);
        }
        const routeData = await response.json();

        if (routeData.routes && routeData.routes.length > 0) {
            const routeGeometry = routeData.routes[0].geometry;

            // 4. Display the route on the map
            if (evacuationRouteLayer) {
                simulationMap.removeLayer(evacuationRouteLayer);
            }

            evacuationRouteLayer = L.geoJSON({
                type: "Feature",
                geometry: routeGeometry,
                properties: {
                    name: `Safe Route to ${targetSettlement.name}`
                }
            }, {
                style: {
                    color: '#007bff', // Blue for evacuation routes
                    weight: 5,
                    opacity: 0.7
                }
            }).addTo(simulationMap);

            // Add a popup to the route
            evacuationRouteLayer.bindPopup(`
                <b>Safe Evacuation Route</b><br>
                To: ${targetSettlement.name}<br>
                Distance: ${(routeData.routes[0].distance / 1000).toFixed(2)} km<br>
                Duration: ${(routeData.routes[0].duration / 60).toFixed(1)} minutes
            `).openPopup();

            // Highlight the fire origin and target settlement
            L.circleMarker([fireLat, fireLng], {
                color: 'red',
                fillColor: '#ff4444',
                radius: 8,
                weight: 2
            }).addTo(simulationMap).bindPopup("Current Fire Location").openPopup();

            L.circleMarker([targetSettlement.lat, targetSettlement.lng], {
                color: 'green',
                fillColor: '#28a745',
                radius: 8,
                weight: 2
            }).addTo(simulationMap).bindPopup(`Evacuation Point: ${targetSettlement.name}`).openPopup();

            // Zoom to the route
            simulationMap.fitBounds(evacuationRouteLayer.getBounds());

            showToast(`Safe evacuation route to ${targetSettlement.name} displayed.`, 'success');

        } else {
            console.log("No route found by OSRM.");
            showToast("Could not find a routing path.", "warning");
        }
    } catch (error) {
        console.error("Error fetching evacuation route:", error);
        showToast("Failed to generate evacuation route.", "error");
    }
}

// Function to find nearby settlements (placeholder - replace with actual geocoding/database lookup)
async function findNearbySettlements(fireLat, fireLng, radiusKm) {
    // In a real application, you would query a database or use a geocoding service
    // to find settlements within a given radius.
    // For this example, we'll use a predefined list of settlements and filter them.

    const allSettlements = [
        { name: 'Nainital', lat: 29.3806, lon: 79.4422, population: 45000 },
        { name: 'Bhowali', lat: 29.3767, lon: 79.4160, population: 10000 },
        { name: 'Bhimtal', lat: 29.3500, lon: 79.5500, population: 15000 },
        { name: 'Almora', lat: 29.6500, lon: 79.6667, population: 35000 },
        { name: 'Ranikhet', lat: 29.6400, lon: 79.4100, population: 19000 },
        { name: 'Dehradun', lat: 30.3165, lon: 78.0322, population: 700000 },
        { name: 'Mussoorie', lat: 30.4571, lon: 78.0654, population: 30000 },
        { name: 'Rishikesh', lat: 30.0869, lon: 78.2676, population: 100000 },
        { name: 'Haridwar', lat: 29.9457, lon: 78.1642, population: 220000 },
    ];

    const settlementsWithinRadius = allSettlements.filter(settlement => {
        const distance = getDistance(fireLat, fireLng, settlement.lat, settlement.lon);
        return distance <= radiusKm;
    });

    // Sort by distance (closest first)
    settlementsWithinRadius.sort((a, b) => {
        const distA = getDistance(fireLat, fireLng, a.lat, a.lon);
        const distB = getDistance(fireLat, fireLng, b.lat, b.lon);
        return distA - distB;
    });

    // Prioritize settlements based on population (optional, for better evacuation planning)
    // For now, just return the closest ones.

    return settlementsWithinRadius;
}

// Helper function to calculate distance between two lat/lng points (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}

// Helper function to convert degrees to radians
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}