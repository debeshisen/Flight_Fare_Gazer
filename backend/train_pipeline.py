import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBClassifier
from sklearn.metrics import mean_absolute_error, accuracy_score
import joblib
import os

def main():
    print("Loading data...")
    df = pd.read_csv("data/flights_clean.csv")
    
    print("Engineering features...")
    # Calculate 75th percentile price per route
    df['route'] = df['source_city'] + "_" + df['destination_city']
    route_75th = df.groupby('route')['price'].transform(lambda x: x.quantile(0.75))
    
    # Engineer buy_now_label
    # 1 (Buy Now) IF (days_left <= 10 AND class == 'Economy') OR (price > 75th percentile for that route). Otherwise 0.
    condition1 = (df['days_left'] <= 10) & (df['class'] == 'Economy')
    condition2 = (df['price'] > route_75th)
    df['buy_now_label'] = np.where(condition1 | condition2, 1, 0)
    
    # Drop temp column
    df.drop(columns=['route'], inplace=True)
    
    print("Preprocessing data...")
    # Target variables
    y_price = df['price']
    y_buy = df['buy_now_label']
    
    # Features
    X_categorical = ['airline', 'source_city', 'destination_city', 'departure_time', 'arrival_time', 'class']
    X_numeric = ['stops', 'duration', 'days_left']
    
    # One-hot encoding
    X = pd.get_dummies(df[X_categorical + X_numeric], columns=X_categorical)
    
    # Export feature names for FastAPI alignment
    feature_columns = list(X.columns)
    os.makedirs("models", exist_ok=True)
    joblib.dump(feature_columns, "models/model_features.pkl")
    
    # Train/Test Split
    X_train, X_test, y_price_train, y_price_test, y_buy_train, y_buy_test = train_test_split(
        X, y_price, y_buy, test_size=0.2, random_state=42
    )
    
    print("Training price predictor...")
    price_predictor = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
    price_predictor.fit(X_train, y_price_train)
    
    price_preds = price_predictor.predict(X_test)
    mae = mean_absolute_error(y_price_test, price_preds)
    print(f"RandomForestRegressor MAE: {mae:.2f}")
    
    print("Training buy_now_label classifier...")
    # Ensure boolean columns in X are handled by xgboost by casting X to float or int, 
    # but XGBoost handles boolean if converted to int
    X_train_xgb = X_train.astype(float)
    X_test_xgb = X_test.astype(float)
    
    buy_classifier = XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42, n_jobs=-1)
    buy_classifier.fit(X_train_xgb, y_buy_train)
    
    buy_preds = buy_classifier.predict(X_test_xgb)
    acc = accuracy_score(y_buy_test, buy_preds)
    print(f"XGBClassifier Accuracy: {acc:.2f}")
    
    print("Exporting models...")
    joblib.dump(price_predictor, "models/price_predictor.pkl")
    joblib.dump(buy_classifier, "models/buy_wait_classifier.pkl")
    print("Models exported successfully.")

if __name__ == "__main__":
    main()
