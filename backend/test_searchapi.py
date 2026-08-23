import asyncio
import httpx
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

async def fetch_test():
    api_key = os.getenv("SEARCHAPI_KEY")
    date_str = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    return_date_str = (datetime.now() + timedelta(days=37)).strftime("%Y-%m-%d")
    params = {
        "engine": "google_flights",
        "departure_id": "BHO",
        "arrival_id": "IXJ",
        "outbound_date": date_str,
        "return_date": return_date_str,
        "api_key": api_key
    }
    
    print(f"Requesting URL with params: {params}")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("https://www.searchapi.io/api/v1/search", params=params, timeout=15.0)
            print(f"Status: {response.status_code}")
            print(f"Body: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fetch_test())
