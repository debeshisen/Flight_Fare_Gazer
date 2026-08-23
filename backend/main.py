import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scraper import scrape_google_flights
from ml_engine import generate_price_forecast

app = FastAPI(title="Fare-Gazer v5: Stacking Ensemble & SerpApi")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ForecastRequest(BaseModel):
    source: str
    destination: str
    flight_date: str

@app.post("/api/forecast")
def forecast(request: ForecastRequest):
    try:
        print(f"[API] Forecast request: {request.source} → {request.destination} on {request.flight_date}")

        # 1. Scrape live price + real history + flight metadata
        scrape_result  = scrape_google_flights(request.source, request.destination, request.flight_date)
        live_price     = scrape_result.get("live_price")
        real_history   = scrape_result.get("real_history", [])
        flight_details = scrape_result.get("flight_details", {})
        hacker_routes  = scrape_result.get("hacker_routes", None)
        price_insights = scrape_result.get("price_insights", {})

        if not live_price:
            raise ValueError("Failed to obtain live_price from SerpApi.")

        # 2. Run Stacking Ensemble ML
        ml_result = generate_price_forecast(live_price, real_history, request.flight_date)

        return {
            "live_price":             live_price,
            "flight_details":         flight_details,
            "hacker_routes":          hacker_routes,
            "price_insights":         price_insights,
            "predicted_future_price": ml_result.get("predicted_future_price"),
            "target_drop_date":       ml_result.get("target_drop_date"),
            "target_date_prediction": ml_result.get("target_date_prediction"),
            "buy_decision":           ml_result.get("buy_decision"),
            "confidence_score":       ml_result.get("confidence_score"),
            "trend":                  ml_result.get("trend"),
            "days_to_holiday":        ml_result.get("days_to_holiday", 30),
            "is_weekend":             ml_result.get("is_weekend", False),
            "price_history":          ml_result.get("price_history", [])
        }

    except Exception as e:
        print(f"[API] ❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
