
from flask import Flask, render_template_string, jsonify, request
from flask_cors import CORS
import json
import requests
from datetime import datetime, timedelta
from threading import Thread
import time
from dataclasses import dataclass
from typing import List, Dict, Optional
import os

# Twilio integration (you'll need to install twilio: pip install twilio)
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    print("Warning: Twilio not installed. SMS alerts will be simulated.")

@dataclass
class Alert:
    id: str
    timestamp: datetime
    region: str
    risk_level: str
    risk_score: float
    message: str
    status: str  # 'active', 'acknowledged', 'resolved'
    recipients: List[str]
    alert_type: str  # 'sms', 'whatsapp', 'dashboard'

class EarlyWarningSystem:
    def __init__(self):
        # Twilio configuration (set these as environment variables)
        self.twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID', 'demo_sid')
        self.twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN', 'demo_token')
        self.twilio_phone_number = os.getenv('TWILIO_PHONE_NUMBER', '+1234567890')
        self.twilio_whatsapp_number = os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
        
        # Initialize Twilio client
        if TWILIO_AVAILABLE and self.twilio_account_sid != 'demo_sid':
            self.twilio_client = Client(self.twilio_account_sid, self.twilio_auth_token)
        else:
            self.twilio_client = None
            print("Using demo mode for alerts (no actual SMS/WhatsApp sent)")
        
        # Alert storage
        self.active_alerts = []
        self.alert_history = []
        self.field_officers = [
            {
                'name': 'Officer Raj Singh',
                'phone': '+919876543210',
                'region': 'Nainital',
                'role': 'District Fire Officer'
            },
            {
                'name': 'Officer Priya Sharma',
                'phone': '+919876543211',
                'region': 'Almora',
                'role': 'Forest Range Officer'
            },
            {
                'name': 'Officer Vikram Kumar',
                'phone': '+919876543212',
                'region': 'Dehradun',
                'role': 'Emergency Response Coordinator'
            }
        ]
        
        # Risk thresholds
        self.high_risk_threshold = 0.7
        self.very_high_risk_threshold = 0.85
        
        # Start monitoring thread
        self.monitoring_active = True
        self.monitoring_thread = Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
    
    def _monitoring_loop(self):
        """Continuous monitoring loop for risk assessment"""
        while self.monitoring_active:
            try:
                # Check current predictions from ML API
                self._check_risk_levels()
                time.sleep(60)  # Check every minute
            except Exception as e:
                print(f"Error in monitoring loop: {e}")
                time.sleep(30)
    
    def _check_risk_levels(self):
        """Check current risk levels and trigger alerts if necessary"""
        try:
            # Get current predictions from ML API
            regions = ['Nainital', 'Almora', 'Dehradun', 'Haridwar', 'Rishikesh']
            
            for region in regions:
                # Simulate getting regional risk data
                risk_score = self._get_regional_risk(region)
                
                if risk_score >= self.very_high_risk_threshold:
                    self._trigger_alert(region, 'very-high', risk_score)
                elif risk_score >= self.high_risk_threshold:
                    self._trigger_alert(region, 'high', risk_score)
                    
        except Exception as e:
            print(f"Error checking risk levels: {e}")
    
    def _get_regional_risk(self, region):
        """Get risk score for a specific region"""
        # This would normally call your ML API
        # For demo purposes, we'll simulate varying risk levels
        import random
        base_risks = {
            'Nainital': 0.75,
            'Almora': 0.65,
            'Dehradun': 0.45,
            'Haridwar': 0.35,
            'Rishikesh': 0.40
        }
        
        base_risk = base_risks.get(region, 0.5)
        # Add some variation
        variation = (random.random() - 0.5) * 0.2
        return max(0, min(1, base_risk + variation))
    
    def _trigger_alert(self, region, risk_level, risk_score):
        """Trigger an alert for high risk conditions"""
        # Check if we already have an active alert for this region
        existing_alert = None
        for alert in self.active_alerts:
            if alert.region == region and alert.status == 'active':
                existing_alert = alert
                break
        
        # Only create new alert if risk level has increased or no active alert exists
        if not existing_alert or (existing_alert and self._is_risk_escalated(existing_alert.risk_level, risk_level)):
            alert_id = f"{region}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            message = self._generate_alert_message(region, risk_level, risk_score)
            recipients = self._get_recipients_for_region(region)
            
            alert = Alert(
                id=alert_id,
                timestamp=datetime.now(),
                region=region,
                risk_level=risk_level,
                risk_score=risk_score,
                message=message,
                status='active',
                recipients=recipients,
                alert_type='multi'
            )
            
            # Generate evacuation routes for high risk alerts
            if risk_level in ['high', 'very-high']:
                alert.evacuation_routes = self._generate_evacuation_info(region, risk_score)
            
            # Add to active alerts
            self.active_alerts.append(alert)
            
            # Send notifications
            self._send_sms_alert(alert)
            self._send_whatsapp_alert(alert)
            
            print(f"Alert triggered for {region}: {risk_level} risk ({risk_score:.2f})")
    
    def _is_risk_escalated(self, current_level, new_level):
        """Check if risk level has escalated"""
        risk_hierarchy = ['low', 'moderate', 'high', 'very-high']
        current_index = risk_hierarchy.index(current_level) if current_level in risk_hierarchy else 0
        new_index = risk_hierarchy.index(new_level) if new_level in risk_hierarchy else 0
        return new_index > current_index
    
    def _generate_alert_message(self, region, risk_level, risk_score):
        """Generate alert message based on risk level"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        if risk_level == 'very-high':
            message = f"🚨 CRITICAL FIRE ALERT 🚨\n\nRegion: {region}\nRisk Level: VERY HIGH ({risk_score:.1%})\nTime: {timestamp}\n\nIMMEDIATE ACTION REQUIRED:\n• Deploy fire crews\n• Initiate evacuation protocols\n• Contact emergency services\n• Follow evacuation routes to safe zones\n\nEvacuation routes have been generated and are available on the dashboard.\n\nNeuroNix Fire Intelligence"
        else:
            message = f"⚠️ HIGH FIRE RISK ALERT ⚠️\n\nRegion: {region}\nRisk Level: HIGH ({risk_score:.1%})\nTime: {timestamp}\n\nRECOMMENDED ACTIONS:\n• Increase patrol frequency\n• Prepare response teams\n• Monitor conditions closely\n• Review evacuation plans\n\nEvacuation routes available if needed.\n\nNeuroNix Fire Intelligence"
        
        return message
    
    def _generate_evacuation_info(self, region, risk_score):
        """Generate evacuation route information for alerts"""
        # Region coordinates (simplified mapping)
        region_coords = {
            'Nainital': (29.3806, 79.4422),
            'Almora': (29.5833, 79.6667),
            'Dehradun': (30.3165, 78.0322),
            'Haridwar': (29.9458, 78.1642),
            'Rishikesh': (30.0869, 78.2676)
        }
        
        coords = region_coords.get(region, (30.0, 79.0))
        
        try:
            # Try to get evacuation routes from the evacuation system
            from evacuation_routes import evacuation_system
            routes = evacuation_system.generate_evacuation_routes(coords[0], coords[1], 5)
            
            return {
                'available': True,
                'route_count': len(routes),
                'primary_destination': routes[0]['destination']['name'] if routes else 'Multiple safe zones',
                'estimated_time': routes[0]['estimated_time_minutes'] if routes else 'Variable',
                'fire_location': coords
            }
        except:
            return {
                'available': False,
                'message': 'Evacuation routes will be generated when needed'
            }
    
    def _get_recipients_for_region(self, region):
        """Get phone numbers of officers responsible for a region"""
        recipients = []
        for officer in self.field_officers:
            if officer['region'] == region:
                recipients.append(officer['phone'])
        
        # Add central emergency number
        recipients.append('+919876543200')  # Central emergency coordination
        return recipients
    
    def _send_sms_alert(self, alert):
        """Send SMS alert using Twilio"""
        if not self.twilio_client:
            print(f"[DEMO SMS] Alert sent to {len(alert.recipients)} recipients for {alert.region}")
            return
        
        for recipient in alert.recipients:
            try:
                message = self.twilio_client.messages.create(
                    body=alert.message,
                    from_=self.twilio_phone_number,
                    to=recipient
                )
                print(f"SMS sent to {recipient}: {message.sid}")
            except Exception as e:
                print(f"Failed to send SMS to {recipient}: {e}")
    
    def _send_whatsapp_alert(self, alert):
        """Send WhatsApp alert using Twilio"""
        if not self.twilio_client:
            print(f"[DEMO WhatsApp] Alert sent to {len(alert.recipients)} recipients for {alert.region}")
            return
        
        for recipient in alert.recipients:
            try:
                message = self.twilio_client.messages.create(
                    body=alert.message,
                    from_=self.twilio_whatsapp_number,
                    to=f'whatsapp:{recipient}'
                )
                print(f"WhatsApp sent to {recipient}: {message.sid}")
            except Exception as e:
                print(f"Failed to send WhatsApp to {recipient}: {e}")
    
    def acknowledge_alert(self, alert_id, officer_name):
        """Mark an alert as acknowledged"""
        for alert in self.active_alerts:
            if alert.id == alert_id:
                alert.status = 'acknowledged'
                print(f"Alert {alert_id} acknowledged by {officer_name}")
                return True
        return False
    
    def resolve_alert(self, alert_id, officer_name):
        """Mark an alert as resolved and move to history"""
        for i, alert in enumerate(self.active_alerts):
            if alert.id == alert_id:
                alert.status = 'resolved'
                self.alert_history.append(alert)
                del self.active_alerts[i]
                print(f"Alert {alert_id} resolved by {officer_name}")
                return True
        return False
    
    def get_active_alerts(self):
        """Get all active alerts"""
        return [
            {
                'id': alert.id,
                'timestamp': alert.timestamp.isoformat(),
                'region': alert.region,
                'risk_level': alert.risk_level,
                'risk_score': alert.risk_score,
                'message': alert.message,
                'status': alert.status,
                'recipients_count': len(alert.recipients)
            }
            for alert in self.active_alerts
        ]
    
    def get_alert_history(self, limit=50):
        """Get alert history"""
        return [
            {
                'id': alert.id,
                'timestamp': alert.timestamp.isoformat(),
                'region': alert.region,
                'risk_level': alert.risk_level,
                'risk_score': alert.risk_score,
                'message': alert.message,
                'status': alert.status,
                'recipients_count': len(alert.recipients)
            }
            for alert in sorted(self.alert_history, key=lambda x: x.timestamp, reverse=True)[:limit]
        ]

# Global alert system instance
alert_system = EarlyWarningSystem()

# Mobile Dashboard HTML Template
MOBILE_DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NeuroNix Field Officer Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #ffffff;
            min-height: 100vh;
            padding: 10px;
        }
        
        .header {
            background: rgba(255, 107, 53, 0.1);
            border: 1px solid rgba(255, 107, 53, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .header h1 {
            color: #ff6b35;
            margin-bottom: 8px;
            font-size: 1.5rem;
        }
        
        .header p {
            color: #94A3B8;
            font-size: 0.9rem;
        }
        
        .status-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .status-item {
            text-align: center;
            flex: 1;
        }
        
        .status-number {
            font-size: 1.2rem;
            font-weight: bold;
            color: #ff6b35;
        }
        
        .status-label {
            font-size: 0.8rem;
            color: #94A3B8;
            margin-top: 2px;
        }
        
        .alerts-section {
            margin-bottom: 20px;
        }
        
        .section-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .alert-card {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            border-left: 4px solid;
        }
        
        .alert-card.very-high {
            border-left-color: #dc2626;
            background: rgba(220, 38, 38, 0.1);
        }
        
        .alert-card.high {
            border-left-color: #f59e0b;
            background: rgba(245, 158, 11, 0.1);
        }
        
        .alert-card.moderate {
            border-left-color: #10b981;
            background: rgba(16, 185, 129, 0.1);
        }
        
        .alert-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .alert-region {
            font-weight: 600;
            font-size: 1rem;
        }
        
        .alert-time {
            font-size: 0.8rem;
            color: #94A3B8;
        }
        
        .alert-risk {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            margin: 8px 0;
        }
        
        .alert-risk.very-high {
            background: #dc2626;
            color: white;
        }
        
        .alert-risk.high {
            background: #f59e0b;
            color: white;
        }
        
        .alert-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-acknowledge {
            background: #3b82f6;
            color: white;
        }
        
        .btn-resolve {
            background: #10b981;
            color: white;
        }
        
        .btn:active {
            transform: scale(0.98);
        }
        
        .refresh-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            background: #ff6b35;
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
        }
        
        .refresh-btn:active {
            transform: scale(0.95);
        }
        
        .no-alerts {
            text-align: center;
            padding: 40px 20px;
            color: #94A3B8;
        }
        
        .no-alerts i {
            font-size: 3rem;
            margin-bottom: 16px;
            color: #10b981;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            color: #94A3B8;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1><i class="fas fa-fire"></i> NeuroNix Field Dashboard</h1>
        <p>Early Warning & Alert System</p>
    </div>
    
    <div class="status-bar">
        <div class="status-item">
            <div class="status-number" id="activeAlertsCount">-</div>
            <div class="status-label">Active Alerts</div>
        </div>
        <div class="status-item">
            <div class="status-number" id="lastUpdateTime">-</div>
            <div class="status-label">Last Update</div>
        </div>
        <div class="status-item">
            <div class="status-number" id="systemStatus">Online</div>
            <div class="status-label">System Status</div>
        </div>
    </div>
    
    <div class="alerts-section">
        <div class="section-title">
            <i class="fas fa-exclamation-triangle"></i>
            Active Alerts
        </div>
        <div id="alertsContainer" class="loading">
            <div class="pulse">Loading alerts...</div>
        </div>
    </div>
    
    <button class="refresh-btn" onclick="loadAlerts()">
        <i class="fas fa-sync-alt"></i>
    </button>
    
    <script>
        let officerName = 'Field Officer'; // This could be set based on login
        
        async function loadAlerts() {
            try {
                const response = await fetch('/api/alerts/active');
                const data = await response.json();
                
                if (data.success) {
                    displayAlerts(data.alerts);
                    updateStatusBar(data.alerts);
                } else {
                    showError('Failed to load alerts');
                }
            } catch (error) {
                showError('Connection error. Please check your network.');
            }
        }
        
        function displayAlerts(alerts) {
            const container = document.getElementById('alertsContainer');
            
            if (alerts.length === 0) {
                container.innerHTML = `
                    <div class="no-alerts">
                        <i class="fas fa-check-circle"></i>
                        <h3>All Clear</h3>
                        <p>No active fire risk alerts</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = alerts.map(alert => `
                <div class="alert-card ${alert.risk_level}">
                    <div class="alert-header">
                        <div>
                            <div class="alert-region">${alert.region}</div>
                            <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="alert-risk ${alert.risk_level}">${alert.risk_level.replace('-', ' ')} Risk</div>
                    <div class="alert-score">Risk Score: ${(alert.risk_score * 100).toFixed(1)}%</div>
                    <div class="alert-actions">
                        ${alert.status === 'active' ? `
                            <button class="btn btn-acknowledge" onclick="acknowledgeAlert('${alert.id}')">
                                <i class="fas fa-eye"></i> Acknowledge
                            </button>
                            <button class="btn btn-resolve" onclick="resolveAlert('${alert.id}')">
                                <i class="fas fa-check"></i> Resolve
                            </button>
                        ` : `
                            <span style="color: #10b981; font-size: 0.8rem;">
                                <i class="fas fa-check"></i> ${alert.status.toUpperCase()}
                            </span>
                        `}
                    </div>
                </div>
            `).join('');
        }
        
        function updateStatusBar(alerts) {
            document.getElementById('activeAlertsCount').textContent = alerts.length;
            document.getElementById('lastUpdateTime').textContent = new Date().toLocaleTimeString();
        }
        
        async function acknowledgeAlert(alertId) {
            try {
                const response = await fetch('/api/alerts/acknowledge', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        alert_id: alertId,
                        officer_name: officerName
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    loadAlerts(); // Refresh alerts
                } else {
                    showError('Failed to acknowledge alert');
                }
            } catch (error) {
                showError('Connection error');
            }
        }
        
        async function resolveAlert(alertId) {
            if (confirm('Are you sure you want to resolve this alert?')) {
                try {
                    const response = await fetch('/api/alerts/resolve', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            alert_id: alertId,
                            officer_name: officerName
                        })
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        loadAlerts(); // Refresh alerts
                    } else {
                        showError('Failed to resolve alert');
                    }
                } catch (error) {
                    showError('Connection error');
                }
            }
        }
        
        function showError(message) {
            const container = document.getElementById('alertsContainer');
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
        
        // Auto-refresh every 30 seconds
        setInterval(loadAlerts, 30000);
        
        // Initial load
        loadAlerts();
    </script>
</body>
</html>
"""

# Flask app for mobile dashboard
def create_alert_app():
    app = Flask(__name__)
    CORS(app)
    
    @app.route('/field-dashboard')
    def mobile_dashboard():
        """Mobile-friendly dashboard for field officers"""
        return render_template_string(MOBILE_DASHBOARD_TEMPLATE)
    
    @app.route('/api/alerts/active')
    def get_active_alerts():
        """API endpoint to get active alerts"""
        try:
            alerts = alert_system.get_active_alerts()
            return jsonify({
                'success': True,
                'alerts': alerts,
                'count': len(alerts)
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/alerts/history')
    def get_alert_history():
        """API endpoint to get alert history"""
        try:
            limit = request.args.get('limit', 50, type=int)
            history = alert_system.get_alert_history(limit)
            return jsonify({
                'success': True,
                'alerts': history,
                'count': len(history)
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/alerts/acknowledge', methods=['POST'])
    def acknowledge_alert():
        """API endpoint to acknowledge an alert"""
        try:
            data = request.get_json()
            alert_id = data.get('alert_id')
            officer_name = data.get('officer_name', 'Unknown Officer')
            
            success = alert_system.acknowledge_alert(alert_id, officer_name)
            
            return jsonify({
                'success': success,
                'message': 'Alert acknowledged' if success else 'Alert not found'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/alerts/resolve', methods=['POST'])
    def resolve_alert():
        """API endpoint to resolve an alert"""
        try:
            data = request.get_json()
            alert_id = data.get('alert_id')
            officer_name = data.get('officer_name', 'Unknown Officer')
            
            success = alert_system.resolve_alert(alert_id, officer_name)
            
            return jsonify({
                'success': success,
                'message': 'Alert resolved' if success else 'Alert not found'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/alerts/trigger', methods=['POST'])
    def manual_trigger_alert():
        """API endpoint to manually trigger an alert (for testing)"""
        try:
            data = request.get_json()
            region = data.get('region', 'Test Region')
            risk_level = data.get('risk_level', 'high')
            risk_score = data.get('risk_score', 0.8)
            
            alert_system._trigger_alert(region, risk_level, risk_score)
            
            return jsonify({
                'success': True,
                'message': f'Alert triggered for {region}'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/alerts/status')
    def system_status():
        """API endpoint to get system status"""
        return jsonify({
            'success': True,
            'status': {
                'monitoring_active': alert_system.monitoring_active,
                'twilio_available': TWILIO_AVAILABLE,
                'active_alerts_count': len(alert_system.active_alerts),
                'field_officers_count': len(alert_system.field_officers),
                'last_check': datetime.now().isoformat()
            }
        })
    
    return app

if __name__ == '__main__':
    # Create and run the alert system app
    app = create_alert_app()
    app.run(host='0.0.0.0', port=5002, debug=True)
