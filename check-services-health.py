#!/usr/bin/env python3
"""
Learn-X AI Services Health Checker
Checks the status of all Python microservices and AI components
"""

import asyncio
import aiohttp
import json
from datetime import datetime
import sys
import os

# Service configurations
SERVICES = {
    'AI Notes Service': {
        'url': 'http://localhost:8003/health',
        'status_url': 'http://localhost:8003/status',
        'port': 8003,
        'required': True
    },
    'Caption Service': {
        'url': 'http://localhost:8001/health',
        'port': 8001,
        'required': False
    },
    'Translation Service': {
        'url': 'http://localhost:8002/health', 
        'port': 8002,
        'required': False
    },
    'Audio Service': {
        'url': 'http://localhost:8004/health',
        'port': 8004,
        'required': False
    }
}

async def check_service_health(session, name, config):
    """Check the health of a single service"""
    try:
        timeout = aiohttp.ClientTimeout(total=5)
        async with session.get(config['url'], timeout=timeout) as response:
            if response.status == 200:
                data = await response.json()
                status = {
                    'name': name,
                    'status': '✅ Healthy',
                    'port': config['port'],
                    'response_time': f"{response.headers.get('X-Response-Time', 'N/A')}",
                    'data': data
                }
                
                # Get additional status info if available
                if 'status_url' in config:
                    try:
                        async with session.get(config['status_url'], timeout=timeout) as status_response:
                            if status_response.status == 200:
                                status_data = await status_response.json()
                                status['additional_info'] = status_data
                    except:
                        pass
                
                return status
            else:
                return {
                    'name': name,
                    'status': f'❌ Unhealthy (HTTP {response.status})',
                    'port': config['port'],
                    'data': None
                }
                
    except aiohttp.ClientConnectorError:
        return {
            'name': name,
            'status': '🔴 Not Running',
            'port': config['port'],
            'data': None
        }
    except asyncio.TimeoutError:
        return {
            'name': name,
            'status': '⏱️ Timeout',
            'port': config['port'], 
            'data': None
        }
    except Exception as e:
        return {
            'name': name,
            'status': f'❌ Error: {str(e)}',
            'port': config['port'],
            'data': None
        }

async def check_all_services():
    """Check all services concurrently"""
    print("🔍 Checking Learn-X AI Services Health...")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        
        for name, config in SERVICES.items():
            task = check_service_health(session, name, config)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        # Display results
        healthy_count = 0
        required_healthy = 0
        required_total = 0
        
        for result in results:
            name = result['name']
            status = result['status']
            port = result['port']
            
            print(f"\n📋 {name}")
            print(f"   Port: {port}")
            print(f"   Status: {status}")
            
            if result['data']:
                data = result['data']
                if 'service' in data:
                    print(f"   Service: {data['service']}")
                if 'timestamp' in data:
                    print(f"   Timestamp: {data['timestamp']}")
                if 'device' in data:
                    print(f"   Device: {data['device']}")
                if 'models_loaded' in data:
                    print(f"   Models: {data['models_loaded']}")
            
            # Check if additional info is available
            if 'additional_info' in result:
                info = result['additional_info']
                if 'models_loaded' in info:
                    print(f"   AI Models: {', '.join(info['models_loaded'])}")
                if 'capabilities' in info:
                    print(f"   Capabilities: {', '.join(info['capabilities'])}")
            
            # Count healthy services
            if '✅' in status:
                healthy_count += 1
                
            # Count required services
            service_config = SERVICES[name]
            if service_config.get('required', False):
                required_total += 1
                if '✅' in status:
                    required_healthy += 1
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 HEALTH CHECK SUMMARY")
        print("=" * 60)
        print(f"Total Services: {len(SERVICES)}")
        print(f"Healthy Services: {healthy_count}")
        print(f"Required Services: {required_total}")
        print(f"Required Healthy: {required_healthy}")
        
        if required_healthy == required_total:
            print("\n✅ All required services are healthy!")
            print("🚀 Learn-X AI system is ready for use")
            return True
        else:
            print(f"\n❌ {required_total - required_healthy} required service(s) are down")
            print("🔧 Please start the missing services before proceeding")
            
            # Provide startup instructions
            print("\n💡 TO START SERVICES:")
            for name, config in SERVICES.items():
                if config.get('required', False):
                    service_result = next(r for r in results if r['name'] == name)
                    if '✅' not in service_result['status']:
                        if name == 'AI Notes Service':
                            print(f"   • {name}: Run 'start-ai-notes-service.bat' (Windows) or 'start-ai-notes-service.sh' (Linux/Mac)")
            
            return False

def check_system_requirements():
    """Check system requirements"""
    print("🔧 Checking System Requirements...")
    print("-" * 40)
    
    # Check Python version
    python_version = sys.version_info
    print(f"Python Version: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    if python_version < (3, 8):
        print("❌ Python 3.8+ is required")
        return False
    else:
        print("✅ Python version is compatible")
    
    # Check key packages
    required_packages = [
        'aiohttp',
        'asyncio'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package} is available")
        except ImportError:
            print(f"❌ {package} is missing")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n💡 Install missing packages: pip install {' '.join(missing_packages)}")
        return False
    
    return True

async def main():
    """Main entry point"""
    print("🤖 Learn-X AI Services Health Checker")
    print(f"📅 Check Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Check system requirements
    if not check_system_requirements():
        print("\n❌ System requirements not met")
        return 1
    
    print()
    
    # Check services
    all_healthy = await check_all_services()
    
    return 0 if all_healthy else 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n🛑 Health check interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Health check failed: {e}")
        sys.exit(1)