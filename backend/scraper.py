from serpapi import GoogleSearch
from datetime import datetime

SERPAPI_KEY = "eec2f68086cc1d0b1786c584cc771155f9cbad3efd459899a4d6b1f5524dfe23"



def _extract_leg_meta(flight: dict) -> dict:
    """Extract airline, hub, price, duration from a SerpApi flight object."""
    legs     = flight.get("flights", [])
    layovers = flight.get("layovers", [])
    price    = flight.get("price")
    duration = flight.get("total_duration")  # minutes

    airline   = legs[0].get("airline", "Unknown") if legs else "Unknown"
    dep_apt   = legs[0].get("departure_airport", {}) if legs else {}
    dep_time  = legs[0].get("departure_time", "") if legs else ""
    departure = f"{dep_apt.get('name', '')} {dep_time}".strip() or "N/A"

    # Layover hub = arrival airport code of first leg
    hub = None
    if legs:
        arr_apt = legs[0].get("arrival_airport", {})
        hub = arr_apt.get("id") or arr_apt.get("name", "?")

    # Human-readable duration
    if duration:
        h, m  = divmod(int(duration), 60)
        dur_str = f"{h}h {m}m" if m else f"{h}h"
    else:
        dur_str = "N/A"

    return {
        "price":     price,
        "airline":   airline,
        "departure": departure,
        "hub":       hub or "N/A",
        "duration":  dur_str,
        "duration_mins": duration or 9999,
        "is_direct": len(layovers) == 0
    }


def scrape_google_flights(src: str, dest: str, date: str) -> dict:
    """
    Fetches live flight data, real historical prices, and Hacker Route options via SerpApi.
    Returns cheapest direct, cheapest connecting, and fastest connecting as separate options.
    """
    params = {
        "engine":        "google_flights",
        "departure_id":  src,
        "arrival_id":    dest,
        "outbound_date": date,
        "currency":      "INR",
        "hl":            "en",
        "type":          "2",
        "api_key":       SERPAPI_KEY
    }

    try:
        print(f"[SerpApi] Querying: {src} → {dest} on {date}")
        search  = GoogleSearch(params)
        results = search.get_dict()

        insights    = results.get("price_insights", {})
        all_flights = results.get("best_flights", []) + results.get("other_flights", [])

        # Extract price insights metadata
        price_level    = insights.get("price_level", "typical")   # "high" | "typical" | "low"
        typical_range  = insights.get("typical_price_range", [])  # e.g. [5100, 5500]
        price_insights = {"level": price_level, "typical_range": typical_range}

        # Parse every flight
        parsed = [_extract_leg_meta(f) for f in all_flights if f.get("price")]

        direct_flights     = [f for f in parsed if f["is_direct"]]
        connecting_flights = [f for f in parsed if not f["is_direct"]]

        print(f"[SerpApi] Found {len(direct_flights)} direct, {len(connecting_flights)} connecting flights")

        # ── Live price ────────────────────────────────────────────────────────
        live_price = insights.get("lowest_price")
        if not live_price and direct_flights:
            live_price = min(f["price"] for f in direct_flights)
        if not live_price and parsed:
            live_price = min(f["price"] for f in parsed)
        if not live_price:
            raise ValueError("No pricing data found in SerpApi response.")

        # ── Best direct flight metadata ──────────────────────────────────────
        best_direct    = min(direct_flights, key=lambda f: f["price"]) if direct_flights else (min(parsed, key=lambda f: f["price"]) if parsed else None)
        is_smart_route = False
        if best_direct and connecting_flights:
            cheapest_conn = min(connecting_flights, key=lambda f: f["price"])
            if cheapest_conn["price"] < best_direct["price"] * 0.90:
                is_smart_route = True

        flight_details = {
            "airline":        best_direct["airline"]   if best_direct else "Unknown",
            "departure":      best_direct["departure"] if best_direct else "N/A",
            "routing_type":   "Non-stop"               if (best_direct and best_direct["is_direct"]) else "Connecting",
            "is_smart_route": is_smart_route
        }

        # ── Hacker Routes: cheapest + fastest connecting (must beat live price) ─
        hacker_routes = None
        if connecting_flights:
            safe_live = int(live_price)

            # Sort candidates
            cheapest_conn = min(connecting_flights, key=lambda f: int(f["price"]))
            fastest_conn  = min(connecting_flights, key=lambda f: f["duration_mins"])

            # Deduplicate fastest vs cheapest
            if (int(fastest_conn["price"]) == int(cheapest_conn["price"]) and
                    fastest_conn["hub"] == cheapest_conn["hub"]):
                sorted_by_speed = sorted(connecting_flights, key=lambda f: f["duration_mins"])
                fastest_conn = sorted_by_speed[1] if len(sorted_by_speed) > 1 else None

            # Only include if they actually beat the direct live price
            valid_cheapest = None
            valid_fastest  = None

            if int(cheapest_conn["price"]) < safe_live:
                valid_cheapest = {
                    "price":    int(cheapest_conn["price"]),
                    "hub":      cheapest_conn["hub"],
                    "duration": cheapest_conn["duration"],
                    "airline":  cheapest_conn["airline"]
                }

            if fastest_conn and int(fastest_conn["price"]) < safe_live:
                valid_fastest = {
                    "price":    int(fastest_conn["price"]),
                    "hub":      fastest_conn["hub"],
                    "duration": fastest_conn["duration"],
                    "airline":  fastest_conn["airline"]
                }

            # Only set hacker_routes if at least one valid option exists
            if valid_cheapest or valid_fastest:
                hacker_routes = {"cheapest": valid_cheapest, "fastest": valid_fastest}

        # ── Real Historical Price Data ─────────────────────────────────────────
        raw_history = insights.get("price_history", [])
        formatted_history = [
            {"date": datetime.fromtimestamp(item[0]).strftime('%Y-%m-%d'), "price": item[1]}
            for item in raw_history
        ]

        print(f"[SerpApi] ✅ Live: ₹{live_price} | {len(formatted_history)} history pts")

        return {
            "live_price":     int(live_price),
            "real_history":   formatted_history,
            "flight_details": flight_details,
            "hacker_routes":  hacker_routes,
            "price_insights": price_insights
        }

    except Exception as e:
        print(f"⚠️ SerpApi Error: {e}")
        return {
            "live_price":     5500,
            "real_history":   [],
            "flight_details": {"airline": "Unknown", "departure": "N/A", "routing_type": "N/A", "is_smart_route": False},
            "hacker_routes":  None,
            "price_insights": {}
        }
