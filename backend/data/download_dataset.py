import os
import zipfile
import subprocess
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

def generate_synthetic_data(output_path="data/flights_clean.csv"):
    print("Generating synthetic dataset...")
    airlines = ["Vistara", "Air India", "Indigo", "GO FIRST", "AirAsia", "SpiceJet"]
    cities = ["Delhi", "Mumbai", "Bangalore", "Kolkata", "Hyderabad", "Chennai"]
    classes = ["Economy", "Business"]
    
    data = []
    
    for _ in range(5000):
        airline = random.choice(airlines)
        source = random.choice(cities)
        dest = random.choice([c for c in cities if c != source])
        
        # Random times
        dept_hour = random.randint(0, 23)
        dept_time = f"{dept_hour:02d}:00"
        arrival_hour = (dept_hour + random.randint(2, 6)) % 24
        arrival_time = f"{arrival_hour:02d}:{random.randint(0, 59):02d}"
        
        stops = random.choice([0, 1, 2])
        flight_class = random.choices(classes, weights=[0.8, 0.2])[0]
        duration = round(random.uniform(2.0, 15.0), 2)
        days_left = random.randint(1, 49)
        
        # Rough pricing logic based on days_left, class, stops, duration
        base_price = 3000 if flight_class == "Economy" else 15000
        price = base_price + (50 - days_left) * 100 + (stops * 1500) + (duration * 200)
        
        # Add some noise
        price = int(price * random.uniform(0.8, 1.2))
        
        data.append({
            "airline": airline,
            "source_city": source,
            "destination_city": dest,
            "departure_time": dept_time,
            "arrival_time": arrival_time,
            "stops": stops,
            "class": flight_class,
            "duration": duration,
            "days_left": days_left,
            "price": price
        })
        
    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    print(f"Synthetic dataset saved to {output_path} with {len(df)} rows.")

def main():
    os.makedirs("data", exist_ok=True)
    generate_synthetic_data()

if __name__ == "__main__":
    main()
