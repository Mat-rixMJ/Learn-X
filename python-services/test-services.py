import asyncio
import aiohttp
import json
import sys
import os

class ServiceTester:
    def __init__(self):
        self.services = {
            'ai-notes': 'http://localhost:8003',
            'audio': 'http://localhost:8001', 
            'translation': 'http://localhost:8002',
            'caption': 'http://localhost:8004'
        }
        
    async def test_service_health(self, service_name, url):
        """Test if a service is healthy"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ {service_name} service: {data}")
                        return True
                    else:
                        print(f"❌ {service_name} service: HTTP {response.status}")
                        return False
        except Exception as e:
            print(f"❌ {service_name} service: Connection failed - {e}")
            return False
    
    async def test_ai_notes_integration(self):
        """Test AI notes service integration with other services"""
        try:
            # Test with a sample text (simulating video processing)
            test_data = {
                "video_path": "/test/sample.mp4",
                "title": "Test Video",
                "subject": "Computer Science"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.services['ai-notes']}/process-video",
                    json=test_data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        print("✅ AI Notes integration test passed")
                        print(f"   Services used: {result.get('data', {}).get('metadata', {}).get('services_used', [])}")
                        return True
                    else:
                        print(f"❌ AI Notes integration test failed: HTTP {response.status}")
                        error_text = await response.text()
                        print(f"   Error: {error_text}")
                        return False
        except Exception as e:
            print(f"❌ AI Notes integration test failed: {e}")
            return False
    
    async def run_full_test(self):
        """Run comprehensive service testing"""
        print("🧪 Testing Python Microservices Integration\n")
        
        # Test individual service health
        print("1. Testing Individual Service Health:")
        health_results = {}
        for service_name, url in self.services.items():
            health_results[service_name] = await self.test_service_health(service_name, url)
        
        print(f"\n📊 Health Check Summary:")
        healthy_services = sum(1 for status in health_results.values() if status)
        print(f"   Healthy services: {healthy_services}/{len(self.services)}")
        
        # Test AI Notes integration if it's healthy
        print(f"\n2. Testing AI Notes Service Integration:")
        if health_results.get('ai-notes', False):
            await self.test_ai_notes_integration()
        else:
            print("❌ Skipping integration test - AI Notes service not healthy")
        
        # Summary
        print(f"\n🎯 Test Summary:")
        print(f"   Individual services: {healthy_services}/{len(self.services)} healthy")
        if healthy_services == len(self.services):
            print("   ✅ All services are running correctly!")
            print("   🚀 Ready for production use")
        elif healthy_services > 0:
            print("   ⚠️ Some services are running - partial functionality available")
        else:
            print("   ❌ No services running - please start services first")
        
        return healthy_services

async def main():
    tester = ServiceTester()
    await tester.run_full_test()

if __name__ == "__main__":
    print("Starting Learn-X Python Services Test Suite...\n")
    asyncio.run(main())