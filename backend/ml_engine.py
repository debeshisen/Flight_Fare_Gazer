import pandas as pd
import numpy as np
import xgboost as xgb
import holidays
from datetime import datetime, timedelta
from sklearn.ensemble import StackingRegressor, RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.linear_model import RidgeCV
import logging

logging.getLogger('cmdstanpy').setLevel(logging.WARNING)


def engineer_features(df: pd.DataFrame, target_date: datetime) -> pd.DataFrame:
    """Translates dates into advanced mathematical features for the models."""
    df['ds'] = pd.to_datetime(df['ds'])

    # Cyclical Time Transformations (Sin/Cos)
    df['day_of_year'] = df['ds'].dt.dayofyear
    df['sin_day'] = np.sin(2 * np.pi * df['day_of_year'] / 365.0)
    df['cos_day'] = np.cos(2 * np.pi * df['day_of_year'] / 365.0)

    # Weekday/Weekend Context
    df['day_of_week'] = df['ds'].dt.dayofweek
    df['is_weekend']  = np.where(df['day_of_week'] >= 5, 1, 0)

    # Holiday Proximity (Indian Holidays)
    year_min = int(df['ds'].dt.year.min())
    year_max = int(df['ds'].dt.year.max()) + 1
    in_holidays = holidays.India(years=list(range(year_min, year_max + 1)))

    def days_to_nearest_holiday(date):
        future_hols = [h for h in in_holidays.keys() if h >= date.date()]
        return (min(future_hols) - date.date()).days if future_hols else 30

    df['days_to_holiday'] = df['ds'].apply(days_to_nearest_holiday)

    # Rolling Dynamics
    df['rolling_3d_avg']  = df['y'].rolling(window=3, min_periods=1).mean()
    df['price_momentum']  = df['y'] - df['rolling_3d_avg']

    return df.fillna(0)


FEATURES = ['sin_day', 'cos_day', 'day_of_week', 'is_weekend',
            'days_to_holiday', 'rolling_3d_avg', 'price_momentum']


def generate_price_forecast(live_price: int, real_history: list, flight_date: str) -> dict:
    """
    Stacking Ensemble (XGBoost + RandomForest + HistGradientBoosting → RidgeCV)
    trained on SerpApi real price history.
    """
    df = pd.DataFrame(real_history)
    if df.empty or len(df) < 5:
        print("[ML Engine] ⚠️ Insufficient data — returning live_price as forecast.")
        return {
            "predicted_future_price": live_price,
            "target_drop_date":       "N/A",
            "trend":                  "UNKNOWN",
            "buy_decision":           0,
            "confidence_score":       50,
            "price_history":          []
        }

    df.rename(columns={'date': 'ds', 'price': 'y'}, inplace=True)
    target_dt = datetime.strptime(flight_date, '%Y-%m-%d')
    today     = datetime.now()

    # Flexible departure window: -60 days to +30 days around target
    theoretical_start = target_dt - timedelta(days=60)
    start_date = max(today, theoretical_start)  # can't predict past dates
    end_date   = target_dt + timedelta(days=30)
    days_span  = (end_date - start_date).days

    # Safety: if target is in the past, fall back to 30-day forward window
    if days_span <= 0:
        start_date = today
        days_span  = 30

    df = engineer_features(df, target_dt)
    X, y = df[FEATURES], df['y']

    # ── Stacking Ensemble ─────────────────────────────────────────────────────
    print("[ML Engine] Training Stacking Ensemble (XGBoost + RF + HGB → RidgeCV)...")
    estimators = [
        ('xgb', xgb.XGBRegressor(n_estimators=100, learning_rate=0.05,
                                  max_depth=4, random_state=42, verbosity=0)),
        ('rf',  RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)),
        ('hgb', HistGradientBoostingRegressor(max_iter=100, learning_rate=0.05, random_state=42))
    ]
    stacking = StackingRegressor(estimators=estimators, final_estimator=RidgeCV(), cv=3)
    stacking.fit(X, y)

    # ── Flexible Departure Window Timeline ───────────────────────────────────
    future_dates = [start_date + timedelta(days=i) for i in range(days_span + 1)]
    future_df    = pd.DataFrame({'ds': pd.to_datetime(future_dates), 'y': df['rolling_3d_avg'].iloc[-1]})

    last_rolling   = float(df['rolling_3d_avg'].iloc[-1])
    last_momentum  = float(df['price_momentum'].iloc[-1])

    future_df = engineer_features(future_df, target_dt)
    future_df['rolling_3d_avg'] = last_rolling
    future_df['price_momentum'] = last_momentum

    X_future           = future_df[FEATURES]
    raw_preds          = stacking.predict(X_future)
    clipped_preds      = np.clip(raw_preds, live_price * 0.4, live_price * 1.6)
    future_df['predicted_price'] = clipped_preds

    # ── ±3 Day Clamp: only suggest a date shift within a realistic window ─────
    target_dt_pandas = pd.to_datetime(target_dt)
    realistic_window = future_df[
        (future_df['ds'] >= target_dt_pandas - timedelta(days=3)) &
        (future_df['ds'] <= target_dt_pandas + timedelta(days=3))
    ]
    if realistic_window.empty:
        realistic_window = future_df  # graceful fallback

    min_idx           = int(realistic_window['predicted_price'].idxmin())
    best_future_price = int(realistic_window.loc[min_idx, 'predicted_price'])
    best_future_date  = realistic_window.loc[min_idx, 'ds'].strftime('%b %d')

    # 7. Decision Engine (3-State System)
    historical_avg = df['y'].mean() if not df.empty else live_price

    if best_future_price < live_price - 150:
        trend        = "FALLING"
        buy_decision = 0  # WAIT
    elif live_price > (historical_avg * 1.15):  # live price is 15%+ above historical norm
        trend        = "INFLATED"
        buy_decision = 2  # POOR VALUE
    else:
        trend             = "STABLE/RISING"
        buy_decision      = 1  # BUY NOW
        best_future_price = live_price  # selected date IS the best

    # ── Extract target-date XAI features ──────────────────────────────────────
    target_dt_pandas = pd.to_datetime(target_dt)
    target_row_xai   = future_df[future_df['ds'] == target_dt_pandas]

    # 1. Foolproof Holiday Detection — bypass Pandas, scan ±7 days with the holidays lib
    in_hols_xai            = holidays.India(years=[target_dt.year])
    target_days_to_holiday = 30  # safe default
    for i in range(8):
        if (target_dt.date() + timedelta(days=i)) in in_hols_xai or \
           (target_dt.date() - timedelta(days=i)) in in_hols_xai:
            target_days_to_holiday = i
            break

    # 2. Foolproof Weekend Detection — weekday() is 5=Sat, 6=Sun; no Pandas needed
    target_is_weekend = 1 if target_dt.weekday() >= 5 else 0

    # 1. Holiday Penalty — airlines surge within 7 days of a holiday
    holiday_penalty = 10 if target_days_to_holiday <= 7 else 0

    # 2. Weekend Penalty — weekend flights are inherently more volatile
    weekend_penalty = 5 if target_is_weekend == 1 else 0

    # 3. Existing Penalties
    days_until_flight = max(1, (target_dt - today).days)
    time_penalty      = min(25, days_until_flight * 0.4)
    historical_volatility = (
        df['y'].std() / df['y'].mean()
        if not df.empty and df['y'].mean() > 0 else 0
    )
    volatility_penalty = min(15, historical_volatility * 100)

    base_confidence  = 95
    confidence_score = int(max(45, min(96,
        base_confidence - time_penalty - volatility_penalty - holiday_penalty - weekend_penalty
    )))

    print(
        f"[ML Engine] ✅ Stacking forecast: best ₹{best_future_price} around {best_future_date} "
        f"| {trend} | Decision={buy_decision} | Confidence {confidence_score}% "
        f"(holiday_pen={holiday_penalty}, weekend_pen={weekend_penalty})"
    )

    # ── Build price_history with bridge point for Recharts continuity ────────
    price_history = []
    today_str = today.strftime('%Y-%m-%d')

    for _, row in df.iterrows():
        price_history.append({
            "date":       row['ds'].strftime('%Y-%m-%d'),
            "past_price": int(row['y'])
        })

    # THE BRIDGE POINT: shared coordinate where solid line ends & dashed begins
    price_history.append({"date": today_str, "past_price": live_price, "future_price": live_price})

    for _, row in future_df.iterrows():
        d_str = row['ds'].strftime('%Y-%m-%d')
        if d_str != today_str:  # avoid duplicate bridge
            price_history.append({
                "date":         d_str,
                "future_price": int(row['predicted_price'])
            })


    # ── Extract raw ML prediction for the target date ─────────────────────────
    target_row             = future_df[future_df['ds'].dt.date == target_dt_pandas.date()]
    target_date_prediction = int(target_row['predicted_price'].iloc[0]) if not target_row.empty else live_price

    return {
        "predicted_future_price":  best_future_price,
        "target_drop_date":        best_future_date,
        "target_date_prediction":  target_date_prediction,
        "trend":                   trend,
        "buy_decision":            buy_decision,
        "confidence_score":        confidence_score,
        "days_to_holiday":         target_days_to_holiday,
        "is_weekend":              bool(target_is_weekend),
        "price_history":           price_history
    }
